import { z } from 'zod';

// ── Lead Status ──────────────────────────────────────────────────────────────
export const LeadStatus = z.enum([
  'new',
  'saved',
  'contacted',
  'follow_up',
  'replied',
  'qualified',
  'won',
  'lost',
  'do_not_contact',
]);
export type LeadStatus = z.infer<typeof LeadStatus>;

// ── Search Job Status ─────────────────────────────────────────────────────────
export const SearchJobStatus = z.enum([
  'queued',
  'searching',
  'enriching',
  'analyzing',
  'saving',
  'completed',
  'failed',
]);
export type SearchJobStatus = z.infer<typeof SearchJobStatus>;

// ── Service Types ─────────────────────────────────────────────────────────────
export const ServiceType = z.enum([
  'social_media_design',
  'web_development',
  'seo',
  'photography',
  'video_editing',
  'marketing',
  'branding',
  'advertising',
  'other',
]);
export type ServiceType = z.infer<typeof ServiceType>;

// ── Outreach Channel ──────────────────────────────────────────────────────────
export const OutreachChannel = z.enum([
  'whatsapp',
  'instagram_dm',
  'email',
  'call_script',
]);
export type OutreachChannel = z.infer<typeof OutreachChannel>;

// ── Outreach Tone ─────────────────────────────────────────────────────────────
export const OutreachTone = z.enum([
  'professional',
  'friendly',
  'short',
  'sales_focused',
  'formal',
]);
export type OutreachTone = z.infer<typeof OutreachTone>;

// ── Score Breakdown ───────────────────────────────────────────────────────────
export const ScoreBreakdownSchema = z.object({
  noSocialPresence: z.number().default(0),
  weakSocialPresence: z.number().default(0),
  publicPhone: z.number().default(0),
  publicEmail: z.number().default(0),
  hasWebsite: z.number().default(0),
  recentActivity: z.number().default(0),
  strongCategory: z.number().default(0),
  promotionSuitable: z.number().default(0),
  total: z.number().default(0),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

// ── Business Lead Candidate ───────────────────────────────────────────────────
export interface BusinessLeadCandidate {
  externalId: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  openingStatus?: string;
  source: string;
}

// ── Enriched Lead ─────────────────────────────────────────────────────────────
export interface EnrichedLead extends BusinessLeadCandidate {
  email?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  emailConfidence?: 'high' | 'medium' | 'low';
  phoneConfidence?: 'high' | 'medium' | 'low';
}

// ── Scored Lead ───────────────────────────────────────────────────────────────
export interface ScoredLead extends EnrichedLead {
  leadScore: number;
  scoreBreakdown: ScoreBreakdown;
  opportunitySummary?: string;
}

// ── Database Lead ─────────────────────────────────────────────────────────────
export interface Lead {
  id: string;
  userId: string;
  externalId?: string;
  source: string;
  name: string;
  normalizedName?: string;
  category: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  whatsappUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  rating?: number;
  reviewCount?: number;
  openingStatus?: string;
  leadScore: number;
  scoreBreakdown?: ScoreBreakdown;
  opportunitySummary?: string;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ── Campaign ──────────────────────────────────────────────────────────────────
export interface Campaign {
  id: string;
  userId: string;
  name: string;
  serviceType: ServiceType;
  targetCategory?: string;
  targetLocation?: string;
  offerName?: string;
  offerPrice?: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ── Search Job ────────────────────────────────────────────────────────────────
export interface SearchJob {
  id: string;
  userId: string;
  location: string;
  category: string;
  requestedCount: number;
  status: SearchJobStatus;
  progressStage?: string;
  resultsFound: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  businessName?: string;
  role?: string;
  services?: ServiceType[];
  targetIndustries?: string[];
  defaultCountry?: string;
  defaultState?: string;
  defaultCity?: string;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Lead Activity ─────────────────────────────────────────────────────────────
export interface LeadActivity {
  id: string;
  userId: string;
  leadId?: string;
  activityType: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ── API Usage ─────────────────────────────────────────────────────────────────
export interface ApiUsage {
  id: string;
  userId: string;
  service: string;
  endpoint?: string;
  tokensUsed?: number;
  createdAt: string;
}
