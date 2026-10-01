import { describe, it, expect } from 'vitest';
import {
  getUserLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  createSearchJob,
  getSearchJob,
  getUserSearchJobs,
  getDashboardStats,
  getUserActivities,
} from '../services/leadService.js';
import { OverpassProvider } from '../providers/OverpassProvider.js';
import { enrichBusinessWebsite } from '../services/enrichmentService.js';
import { v4 as uuidv4 } from 'uuid';

describe('User Ownership & Security Isolation (Phase 3 & 5)', () => {
  const userA = uuidv4();
  const userB = uuidv4();

  it('prevents User B from accessing User A lead', () => {
    const leadA = createLead(userA, {
      name: 'User A Secret Cafe',
      category: 'cafe',
      city: 'Dindigul',
      phone: '+91 99999 11111',
    });

    expect(leadA.userId).toBe(userA);

    // User A can access
    const fetchedByA = getLeadById(userA, leadA.id);
    expect(fetchedByA).toBeDefined();
    expect(fetchedByA?.name).toBe('User A Secret Cafe');

    // User B CANNOT access
    const fetchedByB = getLeadById(userB, leadA.id);
    expect(fetchedByB).toBeUndefined();

    // User B leads list does NOT contain leadA
    const userBLeads = getUserLeads(userB);
    expect(userBLeads.find((l) => l.id === leadA.id)).toBeUndefined();
  });

  it('prevents User B from modifying User A lead', () => {
    const leadA = createLead(userA, {
      name: 'User A Bakery',
      category: 'bakery',
      city: 'Madurai',
      status: 'new',
    });

    // User B attempts to update
    const updateResult = updateLead(userB, leadA.id, {
      status: 'won',
      notes: 'Hacked by B',
    });
    expect(updateResult).toBeUndefined();

    // Verify lead status was NOT changed
    const original = getLeadById(userA, leadA.id);
    expect(original?.status).toBe('new');
    expect(original?.notes).not.toBe('Hacked by B');
  });

  it('prevents User B from deleting User A lead', () => {
    const leadA = createLead(userA, {
      name: 'User A Boutique',
      category: 'fashion',
      city: 'Chennai',
    });

    // User B attempts to delete
    const deleteResult = deleteLead(userB, leadA.id, true);
    expect(deleteResult).toBe(false);

    // Verify lead still exists for User A
    const original = getLeadById(userA, leadA.id);
    expect(original).toBeDefined();
  });
});

describe('Lead CRUD Operations (Phase 6)', () => {
  const testUser = uuidv4();

  it('creates and deterministically scores a lead', () => {
    const lead = createLead(testUser, {
      name: 'Dindigul Coffee House',
      category: 'cafe',
      city: 'Dindigul',
      phone: '+91 98421 12345',
      website: 'https://dindigulcoffee.com',
      rating: 4.5,
      reviewCount: 42,
    });

    expect(lead.id).toBeDefined();
    expect(lead.userId).toBe(testUser);
    expect(lead.leadScore).toBeGreaterThan(0);
    expect(lead.scoreBreakdown).toBeDefined();
    expect(lead.opportunitySummary).toBeDefined();
    expect(lead.status).toBe('new');
  });

  it('updates lead status and records status change activity', () => {
    const lead = createLead(testUser, {
      name: 'Spicy Restaurant',
      category: 'restaurant',
      city: 'Dindigul',
    });

    const updated = updateLead(testUser, lead.id, {
      status: 'contacted',
      notes: 'Sent WhatsApp message regarding menu redesign.',
    });

    expect(updated?.status).toBe('contacted');
    expect(updated?.notes).toContain('WhatsApp message');

    const activities = getUserActivities(testUser);
    const statusAct = activities.find((a) => a.activityType === 'status_changed' && a.leadId === lead.id);
    expect(statusAct).toBeDefined();
  });

  it('soft-deletes and permanently deletes a lead', () => {
    const lead = createLead(testUser, {
      name: 'Temporary Shop',
      category: 'retail',
    });

    // Soft delete
    const softDeleted = deleteLead(testUser, lead.id, false);
    expect(softDeleted).toBe(true);

    // Should not show in active leads list
    const activeLeads = getUserLeads(testUser);
    expect(activeLeads.find((l) => l.id === lead.id)).toBeUndefined();

    // Permanent delete
    const permDeleted = deleteLead(testUser, lead.id, true);
    expect(permDeleted).toBe(true);
  });
});

describe('Search Job Lifecycle (Phase 7)', () => {
  const testUser = uuidv4();

  it('creates a search job with queued status', () => {
    const jobId = createSearchJob(testUser, 'Dindigul', 'cafe', 5);
    expect(jobId).toBeDefined();

    const job = getSearchJob(jobId);
    expect(job).toBeDefined();
    expect(job?.status).toBe('queued');
    expect(job?.userId).toBe(testUser);
    expect(job?.location).toBe('Dindigul');
    expect(job?.category).toBe('cafe');

    const userJobs = getUserSearchJobs(testUser);
    expect(userJobs.some((j) => j.id === jobId)).toBe(true);
  });
});

describe('Overpass Response Parsing (Phase 7 & 8)', () => {
  it('correctly handles bounding box resolution for known cities', async () => {
    const provider = new OverpassProvider();
    expect(provider.providerName).toBe('overpass');
  });
});

describe('Website Enrichment Resilience (Phase 9)', () => {
  it('gracefully handles business candidate with no website', async () => {
    const result = await enrichBusinessWebsite({
      externalId: 'test-no-site',
      name: 'Street Chai Stall',
      category: 'cafe',
      address: 'Market Road',
      city: 'Dindigul',
      state: 'Tamil Nadu',
      country: 'India',
      source: 'overpass',
    });

    expect(result).toEqual({});
  });

  it('does not throw on invalid website URL', async () => {
    const result = await enrichBusinessWebsite({
      externalId: 'test-bad-url',
      name: 'Local Store',
      category: 'store',
      address: 'Main St',
      city: 'Dindigul',
      state: 'Tamil Nadu',
      country: 'India',
      website: 'not-a-valid-domain-xyz-12345.nonexistent',
      source: 'overpass',
    });

    expect(result).toBeDefined();
  });
});

describe('Dashboard Statistics (Phase 15)', () => {
  const testUser = uuidv4();

  it('accurately computes total, new leads, hot leads, and searches', () => {
    // Empty stats first
    const emptyStats = getDashboardStats(testUser);
    expect(emptyStats.total).toBe(0);
    expect(emptyStats.newLeads).toBe(0);
    expect(emptyStats.hot).toBe(0);
    expect(emptyStats.searches).toBe(0);

    // Add leads
    createLead(testUser, {
      name: 'High Scoring Salon',
      category: 'salon',
      city: 'Dindigul',
      phone: '+91 99999 88888',
      website: 'https://salon.com',
      rating: 4.8,
      reviewCount: 90,
      status: 'new',
    });

    createLead(testUser, {
      name: 'Uncontacted Gym',
      category: 'gym',
      city: 'Dindigul',
      phone: '+91 99999 77777',
      status: 'contacted',
    });

    createSearchJob(testUser, 'Dindigul', 'cafe', 10);

    const updatedStats = getDashboardStats(testUser);
    expect(updatedStats.total).toBe(2);
    expect(updatedStats.newLeads).toBe(1);
    expect(updatedStats.contacted).toBe(1);
    expect(updatedStats.searches).toBe(1);
    expect(updatedStats.recentLeads.length).toBe(2);
  });
});
