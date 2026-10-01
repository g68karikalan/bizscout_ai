import { describe, it, expect } from 'vitest';
import { scoreLead, generateScoreReasoning } from '../services/scoringService.js';
import { mockSignup, mockLogin, validateToken, upsertProfile, getProfile } from '../services/authService.js';
import { EnrichedLead } from '../types/index.js';

describe('Scoring Service', () => {
  const sampleLead: EnrichedLead = {
    externalId: 'test-1',
    name: 'Artisan Bakery',
    category: 'bakery',
    city: 'Dindigul',
    state: 'Tamil Nadu',
    country: 'India',
    address: 'Main Bazaar, Dindigul',
    phone: '+91 98765 43210',
    email: 'info@artisanbakery.com',
    website: 'https://artisanbakery.com',
    rating: 4.6,
    reviewCount: 65,
    source: 'mock',
  };

  it('calculates score for social media design service', () => {
    const scored = scoreLead(sampleLead, 'social_media_design');
    expect(scored.leadScore).toBeGreaterThan(0);
    expect(scored.leadScore).toBeLessThanOrEqual(100);
    expect(scored.scoreBreakdown).toBeDefined();
    expect(scored.scoreBreakdown?.publicPhone).toBe(15);
    expect(scored.scoreBreakdown?.publicEmail).toBe(10);
    expect(scored.scoreBreakdown?.strongCategory).toBe(15);
  });

  it('calculates score for web development service', () => {
    const scored = scoreLead(sampleLead, 'web_development');
    expect(scored.leadScore).toBeGreaterThan(0);
    expect(scored.scoreBreakdown).toBeDefined();
  });

  it('generates human-readable reasoning from breakdown', () => {
    const scored = scoreLead(sampleLead, 'social_media_design');
    const reasoning = generateScoreReasoning(scored.scoreBreakdown!, 'social_media_design');
    expect(reasoning).toContain('Publicly contactable');
    expect(reasoning).toContain('Active business with review history');
  });
});

describe('Auth Service (Mock Mode)', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPass = 'Password123!';
  const testName = 'Test User';

  it('signs up a new user and returns token and userId', () => {
    const res = mockSignup(testEmail, testPass, testName);
    expect(res.token).toBeDefined();
    expect(res.userId).toBeDefined();
    expect(validateToken(res.token)).toBe(res.userId);
  });

  it('fails to sign up duplicate email', () => {
    expect(() => mockSignup(testEmail, testPass, testName)).toThrow('EMAIL_EXISTS');
  });

  it('logs in successfully with valid credentials', () => {
    const res = mockLogin(testEmail, testPass);
    expect(res.token).toBeDefined();
    expect(res.name).toBe(testName);
  });

  it('fails to log in with invalid password', () => {
    expect(() => mockLogin(testEmail, 'wrong-password')).toThrow('INVALID_CREDENTIALS');
  });

  it('updates and retrieves user profile', () => {
    const { userId } = mockLogin(testEmail, testPass);
    const profile = upsertProfile(userId, {
      fullName: 'Updated Name',
      businessName: 'My Agency',
      defaultCity: 'Chennai',
    });

    expect(profile.businessName).toBe('My Agency');
    expect(profile.defaultCity).toBe('Chennai');

    const fetched = getProfile(userId);
    expect(fetched?.businessName).toBe('My Agency');
  });
});
