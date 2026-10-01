import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { env } from '../config/env.js';

export type ServiceStatus =
  | 'ok'
  | 'missing'
  | 'invalid'
  | 'unauthorized'
  | 'unreachable'
  | 'not_configured';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    supabase: ServiceStatus;
    groq: ServiceStatus;
    overpass: ServiceStatus;
    googlePlaces: ServiceStatus;
    hunter: ServiceStatus;
  };
}

export async function checkSystemHealth(): Promise<HealthCheckResult> {
  const services: HealthCheckResult['services'] = {
    supabase: 'missing',
    groq: 'missing',
    overpass: 'missing',
    googlePlaces: 'not_configured',
    hunter: 'not_configured',
  };

  // 1. Check Supabase
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    services.supabase = 'missing';
  } else {
    try {
      const url = new URL(env.SUPABASE_URL);
      if (!url.hostname.includes('.supabase.co')) {
        services.supabase = 'invalid';
      } else {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false },
        });
        // Safe ping (auth session or rest endpoint)
        const restRes = await supabase.from('profiles').select('id').limit(1);
        if (restRes.error) {
          if (
            restRes.error.code === '42P01' ||
            restRes.error.code === 'PGRST204' ||
            restRes.error.code === 'PGRST116' ||
            restRes.error.message.includes('does not exist') ||
            restRes.error.message.includes('schema cache')
          ) {
            // Schema/tables not created yet, but connection & auth worked
            services.supabase = 'ok';
          } else if (restRes.status === 401 || restRes.status === 403) {
            services.supabase = 'unauthorized';
          } else {
            services.supabase = 'ok';
          }
        } else {
          services.supabase = 'ok';
        }
      }
    } catch {
      services.supabase = 'unreachable';
    }
  }

  // 2. Check Groq
  if (!env.GROQ_API_KEY) {
    services.groq = 'missing';
  } else {
    try {
      const groq = new Groq({ apiKey: env.GROQ_API_KEY });
      const models = await groq.models.list();
      if (models && models.data) {
        services.groq = 'ok';
      } else {
        services.groq = 'unreachable';
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        services.groq = 'unauthorized';
      } else {
        services.groq = 'unreachable';
      }
    }
  }

  // 3. Check Overpass
  const overpassUrl = env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
  try {
    const query = '[out:json][timeout:10];node["amenity"="cafe"](10.3,77.9,10.4,78.0);out 1;';
    const resp = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'BizScoutAI/1.0 (healthcheck@bizscout.ai)',
      },
      body: 'data=' + encodeURIComponent(query),
    });

    if (resp.ok) {
      services.overpass = 'ok';
    } else if (resp.status === 429) {
      services.overpass = 'unreachable'; // Rate limited
    } else {
      services.overpass = 'invalid';
    }
  } catch {
    services.overpass = 'unreachable';
  }

  // 4. Google Places (not configured)
  services.googlePlaces = env.GOOGLE_PLACES_API_KEY ? 'ok' : 'not_configured';

  // 5. Hunter (not configured)
  services.hunter = env.HUNTER_API_KEY ? 'ok' : 'not_configured';

  const isHealthy =
    (services.supabase === 'ok' || services.supabase === 'missing') &&
    (services.groq === 'ok' || services.groq === 'missing') &&
    services.overpass === 'ok';

  return {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services,
  };
}
