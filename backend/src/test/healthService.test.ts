import { describe, it, expect } from 'vitest';
import { checkSystemHealth } from '../services/healthService.js';

describe('Health Service', () => {
  it('returns valid status structure without any credentials or secrets', async () => {
    const health = await checkSystemHealth();

    expect(health).toBeDefined();
    expect(['ok', 'degraded']).toContain(health.status);
    expect(health.timestamp).toBeDefined();
    expect(health.services).toBeDefined();

    // Verify services keys
    const services = health.services;
    const allowedStatuses = ['ok', 'missing', 'invalid', 'unauthorized', 'unreachable', 'not_configured'];

    expect(allowedStatuses).toContain(services.supabase);
    expect(allowedStatuses).toContain(services.groq);
    expect(allowedStatuses).toContain(services.overpass);
    expect(allowedStatuses).toContain(services.googlePlaces);
    expect(allowedStatuses).toContain(services.hunter);

    // Verify Google Places and Hunter are marked not_configured when no keys are provided
    expect(services.googlePlaces).toBe('not_configured');
    expect(services.hunter).toBe('not_configured');

    // STRICT SECURITY TEST: Verify no keys, secrets, or tokens exist in the JSON output
    const jsonStr = JSON.stringify(health);
    expect(jsonStr).not.toContain('gsk_');
    expect(jsonStr).not.toContain('sb_');
    expect(jsonStr).not.toContain('secret');
    expect(jsonStr).not.toContain('password');
  }, 25000);
});
