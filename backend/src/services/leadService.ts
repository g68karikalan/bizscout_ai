import { v4 as uuidv4 } from 'uuid';
import { BusinessLeadCandidate, EnrichedLead, ScoredLead, Lead, LeadActivity } from '../types/index.js';
import { BusinessDiscoveryProvider, SearchParams } from '../providers/BusinessDiscoveryProvider.js';
import { MockBusinessDiscoveryProvider } from '../providers/MockBusinessDiscoveryProvider.js';
import { GooglePlacesProvider } from '../providers/GooglePlacesProvider.js';
import { OverpassProvider } from '../providers/OverpassProvider.js';
import { enrichBusinessWebsite } from './enrichmentService.js';
import { scoreLead, generateScoreReasoning } from './scoringService.js';
import { env, isMockMode } from '../config/env.js';

// In-memory storage for mock/dev mode (no Supabase required)
const IN_MEMORY_LEADS: Map<string, Map<string, Lead>> = new Map(); // userId -> id -> Lead
const IN_MEMORY_JOBS: Map<string, { id: string; userId: string; location: string; category: string; requestedCount: number; status: string; stage: string; results: Lead[]; error?: string; createdAt: string; completedAt?: string }> = new Map();
const IN_MEMORY_ACTIVITIES: Map<string, LeadActivity[]> = new Map(); // userId -> activities[]

export function getProvider(): BusinessDiscoveryProvider {
  if (isMockMode) {
    return new MockBusinessDiscoveryProvider();
  }
  if (env.OVERPASS_API_URL) {
    return new OverpassProvider(env.OVERPASS_API_URL);
  }
  if (env.GOOGLE_PLACES_API_KEY) {
    return new GooglePlacesProvider(env.GOOGLE_PLACES_API_KEY);
  }
  return new MockBusinessDiscoveryProvider();
}

function normalizeBusinessName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function isDuplicate(candidate: BusinessLeadCandidate, existing: Lead[]): boolean {
  for (const lead of existing) {
    // Check by externalId
    if (candidate.externalId && lead.externalId === candidate.externalId) return true;

    // Check by phone (normalized)
    if (candidate.phone && lead.phone) {
      const p1 = candidate.phone.replace(/\D/g, '');
      const p2 = lead.phone.replace(/\D/g, '');
      if (p1.length >= 10 && p1 === p2) return true;
    }

    // Check by website domain
    if (candidate.website && lead.website) {
      try {
        const d1 = new URL(candidate.website).hostname.replace('www.', '');
        const d2 = new URL(lead.website).hostname.replace('www.', '');
        if (d1 && d1 === d2) return true;
      } catch { /* invalid URL */ }
    }

    // Check by normalized name + city or address
    if (normalizeBusinessName(candidate.name) === normalizeBusinessName(lead.name || '')) {
      if ((candidate.city || '').toLowerCase() === (lead.city || '').toLowerCase()) {
        return true;
      }
      if (candidate.address && lead.address && normalizeBusinessName(candidate.address) === normalizeBusinessName(lead.address)) {
        return true;
      }
    }
  }
  return false;
}

async function runSearchJob(
  jobId: string,
  userId: string,
  params: SearchParams,
  serviceType: string
): Promise<void> {
  const job = IN_MEMORY_JOBS.get(jobId);
  if (!job) return;

  try {
    // Stage 1: Searching
    job.status = 'searching';
    job.stage = 'Searching local businesses...';

    const provider = getProvider();
    const candidates = await provider.searchBusinesses(params);

    // Stage 2: Deduplication
    job.stage = 'Removing duplicates...';
    const userLeads = getUserLeads(userId);
    const unique = candidates.filter((c) => !isDuplicate(c, userLeads));

    // Stage 3: Enrichment
    job.status = 'enriching';
    job.stage = `Enriching websites (0/${unique.length})...`;

    const enriched: EnrichedLead[] = [];
    for (let i = 0; i < unique.length; i++) {
      const candidate = unique[i];
      job.stage = `Enriching websites (${i + 1}/${unique.length})...`;

      let enrichedData: Partial<EnrichedLead> = {};
      if (candidate.website && !isMockMode) {
        try {
          enrichedData = await enrichBusinessWebsite(candidate);
        } catch {
          // One failure doesn't stop others
        }
      } else if (isMockMode) {
        // Provide mock enrichment data
        enrichedData = getMockEnrichment(candidate.externalId);
      }

      enriched.push({ ...candidate, ...enrichedData });
    }

    // Stage 4: Scoring
    job.status = 'analyzing';
    job.stage = 'Scoring and evaluating opportunities...';

    const scored: ScoredLead[] = enriched.map((lead) => {
      const scored = scoreLead(lead, serviceType);
      scored.opportunitySummary = generateScoreReasoning(scored.scoreBreakdown, serviceType);
      return scored;
    });

    // Sort by score descending
    scored.sort((a, b) => b.leadScore - a.leadScore);

    // Stage 5: Saving
    job.status = 'saving';
    job.stage = 'Saving leads...';

    const savedLeads: Lead[] = scored.map((s) => ({
      id: uuidv4(),
      userId,
      externalId: s.externalId,
      source: s.source,
      name: s.name,
      normalizedName: normalizeBusinessName(s.name),
      category: s.category,
      address: s.address,
      city: s.city,
      state: s.state,
      country: s.country,
      latitude: s.latitude,
      longitude: s.longitude,
      phone: s.phone,
      email: s.email,
      website: s.website,
      whatsappUrl: s.whatsappUrl,
      instagramUrl: s.instagramUrl,
      facebookUrl: s.facebookUrl,
      linkedinUrl: s.linkedinUrl,
      youtubeUrl: s.youtubeUrl,
      rating: s.rating,
      reviewCount: s.reviewCount,
      openingStatus: s.openingStatus,
      leadScore: s.leadScore,
      scoreBreakdown: s.scoreBreakdown,
      opportunitySummary: s.opportunitySummary,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Save to memory store
    const userMap = IN_MEMORY_LEADS.get(userId) || new Map<string, Lead>();
    for (const lead of savedLeads) {
      userMap.set(lead.id, lead);
    }
    IN_MEMORY_LEADS.set(userId, userMap);

    job.status = 'completed';
    job.stage = 'Complete!';
    job.results = savedLeads;
    job.completedAt = new Date().toISOString();

    recordActivity(userId, 'search_completed', undefined, {
      location: params.city,
      category: params.category,
      count: savedLeads.length,
    });
  } catch (error) {
    job.status = 'failed';
    job.stage = 'Search failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date().toISOString();
  }
}

function getMockEnrichment(externalId: string): Partial<EnrichedLead> {
  const mockEnrichments: Record<string, Partial<EnrichedLead>> = {
    'mock-001': {
      email: 'priya.bakehouse@example.com',
      instagramUrl: 'https://www.instagram.com/priyabakehouse',
      emailConfidence: 'high',
    },
    'mock-002': { whatsappUrl: 'https://wa.me/919800111002', phoneConfidence: 'high' },
    'mock-003': {
      email: 'fitlife.gym@example.com',
      instagramUrl: 'https://www.instagram.com/fitlifegym',
      facebookUrl: 'https://www.facebook.com/fitlifegym',
      emailConfidence: 'high',
    },
    'mock-004': { whatsappUrl: 'https://wa.me/919800111004', phoneConfidence: 'high' },
    'mock-005': {
      email: 'brightminds@example.com',
      facebookUrl: 'https://www.facebook.com/brightmindstuition',
      emailConfidence: 'medium',
    },
    'mock-009': {
      email: 'stylezone@example.com',
      instagramUrl: 'https://www.instagram.com/stylezonesalon',
      emailConfidence: 'high',
    },
    'mock-015': {
      email: 'goldensweets@example.com',
      instagramUrl: 'https://www.instagram.com/goldensweets',
      facebookUrl: 'https://www.facebook.com/goldensweets',
      emailConfidence: 'high',
    },
    'mock-016': {
      instagramUrl: 'https://www.instagram.com/trendynails',
      whatsappUrl: 'https://wa.me/919800111016',
    },
    'mock-017': {
      email: 'ironsteel.fitness@example.com',
      facebookUrl: 'https://www.facebook.com/ironsteelfitness',
      emailConfidence: 'medium',
    },
    'mock-019': {
      email: 'successpoint@example.com',
      emailConfidence: 'high',
    },
    'mock-020': {
      instagramUrl: 'https://www.instagram.com/vivosamsunghub',
      facebookUrl: 'https://www.facebook.com/vivosamsunghub',
    },
  };

  return mockEnrichments[externalId] || {};
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getUserLeads(userId: string): Lead[] {
  const userMap = IN_MEMORY_LEADS.get(userId);
  if (!userMap) return [];
  return Array.from(userMap.values()).filter((l) => !l.deletedAt);
}

export function getLeadById(userId: string, leadId: string): Lead | undefined {
  const lead = IN_MEMORY_LEADS.get(userId)?.get(leadId);
  if (!lead || lead.deletedAt) return undefined;
  return lead;
}

export function createLead(
  userId: string,
  data: Partial<Lead>,
  serviceType: string = 'social_media_design'
): Lead {
  const id = uuidv4();
  const scored = scoreLead(
    {
      externalId: data.externalId || `manual_${id.slice(0, 8)}`,
      name: data.name || 'Unnamed Business',
      category: data.category || 'General',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || 'India',
      phone: data.phone,
      email: data.email,
      website: data.website,
      whatsappUrl: data.whatsappUrl,
      instagramUrl: data.instagramUrl,
      facebookUrl: data.facebookUrl,
      rating: data.rating,
      reviewCount: data.reviewCount,
      source: data.source || 'manual',
    },
    serviceType
  );

  const now = new Date().toISOString();
  const lead: Lead = {
    id,
    userId, // Enforce authenticated user ownership
    externalId: data.externalId || `manual_${id.slice(0, 8)}`,
    source: data.source || 'manual',
    name: data.name || 'Unnamed Business',
    normalizedName: normalizeBusinessName(data.name || ''),
    category: data.category || 'General',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    country: data.country || 'India',
    latitude: data.latitude,
    longitude: data.longitude,
    phone: data.phone,
    email: data.email,
    website: data.website,
    whatsappUrl: data.whatsappUrl,
    instagramUrl: data.instagramUrl,
    facebookUrl: data.facebookUrl,
    linkedinUrl: data.linkedinUrl,
    youtubeUrl: data.youtubeUrl,
    rating: data.rating,
    reviewCount: data.reviewCount || 0,
    openingStatus: data.openingStatus,
    leadScore: scored.leadScore,
    scoreBreakdown: scored.scoreBreakdown,
    opportunitySummary: generateScoreReasoning(scored.scoreBreakdown, serviceType),
    status: data.status || 'new',
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  const userMap = IN_MEMORY_LEADS.get(userId) || new Map<string, Lead>();
  userMap.set(id, lead);
  IN_MEMORY_LEADS.set(userId, userMap);

  recordActivity(userId, 'lead_created', lead.id, { name: lead.name, category: lead.category });
  return lead;
}

export function updateLead(userId: string, leadId: string, updates: Partial<Lead>): Lead | undefined {
  const userMap = IN_MEMORY_LEADS.get(userId);
  if (!userMap) return undefined;
  const lead = userMap.get(leadId);
  if (!lead || lead.deletedAt) return undefined;

  const previousStatus = lead.status;
  const updated = { ...lead, ...updates, updatedAt: new Date().toISOString() };
  userMap.set(leadId, updated);

  if (updates.status && updates.status !== previousStatus) {
    recordActivity(userId, 'status_changed', leadId, {
      from: previousStatus,
      to: updates.status,
      businessName: lead.name,
    });
  } else {
    recordActivity(userId, 'lead_updated', leadId, { businessName: lead.name });
  }

  return updated;
}

export function softDeleteLead(userId: string, leadId: string): boolean {
  return deleteLead(userId, leadId, false);
}

export function deleteLead(userId: string, leadId: string, permanent: boolean = false): boolean {
  const userMap = IN_MEMORY_LEADS.get(userId);
  if (!userMap) return false;
  const lead = userMap.get(leadId);
  if (!lead) return false;

  if (permanent) {
    userMap.delete(leadId);
  } else {
    userMap.set(leadId, { ...lead, deletedAt: new Date().toISOString() });
  }

  recordActivity(userId, 'lead_deleted', leadId, { businessName: lead.name, permanent });
  return true;
}

export function createSearchJob(
  userId: string,
  location: string = '',
  category: string = '',
  requestedCount: number = 10
): string {
  const jobId = uuidv4();
  IN_MEMORY_JOBS.set(jobId, {
    id: jobId,
    userId,
    location,
    category,
    requestedCount,
    status: 'queued',
    stage: 'Queued...',
    results: [],
    createdAt: new Date().toISOString(),
  });
  return jobId;
}

export function getSearchJob(jobId: string) {
  return IN_MEMORY_JOBS.get(jobId);
}

export function getUserSearchJobs(userId: string) {
  return Array.from(IN_MEMORY_JOBS.values())
    .filter((j) => j.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function startSearchJob(
  jobId: string,
  userId: string,
  params: SearchParams,
  serviceType: string
): void {
  // Fire and forget — the route returns immediately with the job ID
  runSearchJob(jobId, userId, params, serviceType).catch((err) => {
    console.error('[Search Job Error]', err);
  });
}

// ── Lead Activity API ─────────────────────────────────────────────────────────

export function recordActivity(
  userId: string,
  activityType: string,
  leadId?: string,
  metadata?: Record<string, any>
): LeadActivity {
  const activity: LeadActivity = {
    id: uuidv4(),
    userId,
    leadId,
    activityType,
    metadata,
    createdAt: new Date().toISOString(),
  };

  const userActivities = IN_MEMORY_ACTIVITIES.get(userId) || [];
  userActivities.unshift(activity);
  // Cap at 200 items in memory
  if (userActivities.length > 200) userActivities.length = 200;
  IN_MEMORY_ACTIVITIES.set(userId, userActivities);

  return activity;
}

export function getUserActivities(userId: string, limit: number = 20): LeadActivity[] {
  const userActivities = IN_MEMORY_ACTIVITIES.get(userId) || [];
  return userActivities.slice(0, limit);
}

export function getDashboardStats(userId: string) {
  const leads = getUserLeads(userId);
  const total = leads.length;
  const hot = leads.filter((l) => l.leadScore >= 70).length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const contacted = leads.filter((l) => ['contacted', 'follow_up', 'replied', 'qualified', 'won'].includes(l.status)).length;
  const replied = leads.filter((l) => ['replied', 'qualified', 'won'].includes(l.status)).length;
  const won = leads.filter((l) => l.status === 'won').length;
  const conversionRate = contacted > 0 ? Math.round((won / contacted) * 100) : 0;
  const searchJobs = getUserSearchJobs(userId);
  const totalSearches = searchJobs.length;

  // Leads by category
  const byCategory: Record<string, number> = {};
  for (const lead of leads) {
    byCategory[lead.category] = (byCategory[lead.category] || 0) + 1;
  }

  // Leads over time (last 7 days)
  const now = new Date();
  const leadsOverTime = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = leads.filter((l) => l.createdAt.startsWith(dateStr)).length;
    return { date: dateStr, count };
  });

  return {
    total,
    hot,
    newLeads,
    contacted,
    replied,
    won,
    searches: totalSearches,
    conversionRate,
    byCategory,
    leadsOverTime,
    recentLeads: leads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    recentActivities: getUserActivities(userId, 10),
  };
}
