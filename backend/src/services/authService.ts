import { v4 as uuidv4 } from 'uuid';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '../types/index.js';
import { env } from '../config/env.js';

let supabaseClient: SupabaseClient | null = null;
if (env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY) {
  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// In-memory auth store for mock/fallback mode
const MOCK_USERS: Map<string, { id: string; email: string; passwordHash: string; name: string; createdAt: string }> = new Map();
const MOCK_SESSIONS: Map<string, string> = new Map(); // token -> userId
const MOCK_PROFILES: Map<string, Profile> = new Map(); // userId -> Profile

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export async function signupUser(
  email: string,
  password: string,
  name: string
): Promise<{ token: string; userId: string }> {
  // If Supabase is available, attempt real Supabase Auth signUp
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (!error && data?.user?.id) {
        if (data.session?.access_token) {
          return { token: data.session.access_token, userId: data.user.id };
        }
        // If email confirmation is required or rate-limited on confirmation, issue session
        const token = uuidv4();
        MOCK_SESSIONS.set(token, data.user.id);
        MOCK_USERS.set(data.user.id, {
          id: data.user.id,
          email,
          passwordHash: simpleHash(password),
          name,
          createdAt: new Date().toISOString(),
        });
        return { token, userId: data.user.id };
      }

      if (error && error.message.toLowerCase().includes('already registered')) {
        throw new Error('EMAIL_EXISTS');
      }

      console.warn('[Supabase Auth Warning] Fallback to local session:', error?.message);
    } catch (err: any) {
      if (err.message === 'EMAIL_EXISTS') throw err;
      console.warn('[Supabase Auth Warning] Exception during signup:', err?.message);
    }
  }

  return mockSignup(email, password, name);
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; userId: string; name: string }> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user?.id && data.session?.access_token) {
        const userName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split('@')[0];
        return {
          token: data.session.access_token,
          userId: data.user.id,
          name: userName,
        };
      }

      if (error && error.message.toLowerCase().includes('invalid login credentials')) {
        const localUser = [...MOCK_USERS.values()].find((u) => u.email === email);
        if (!localUser || localUser.passwordHash !== simpleHash(password)) {
          throw new Error('INVALID_CREDENTIALS');
        }
      }
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') throw err;
      console.warn('[Supabase Auth Warning] Exception during signin:', err?.message);
    }
  }

  return mockLogin(email, password);
}

export function mockSignup(email: string, password: string, name: string): { token: string; userId: string } {
  const existing = [...MOCK_USERS.values()].find((u) => u.email === email);
  if (existing) throw new Error('EMAIL_EXISTS');

  const userId = uuidv4();
  MOCK_USERS.set(userId, {
    id: userId,
    email,
    passwordHash: simpleHash(password),
    name,
    createdAt: new Date().toISOString(),
  });

  const token = uuidv4();
  MOCK_SESSIONS.set(token, userId);

  return { token, userId };
}

export function mockLogin(email: string, password: string): { token: string; userId: string; name: string } {
  const user = [...MOCK_USERS.values()].find((u) => u.email === email);
  if (!user || user.passwordHash !== simpleHash(password)) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const token = uuidv4();
  MOCK_SESSIONS.set(token, user.id);
  return { token, userId: user.id, name: user.name };
}

export function validateToken(token: string): string | null {
  return MOCK_SESSIONS.get(token) || null;
}

export function mockLogout(token: string): void {
  MOCK_SESSIONS.delete(token);
}

export function getProfile(userId: string): Profile | undefined {
  return MOCK_PROFILES.get(userId);
}

export function upsertProfile(userId: string, data: Partial<Profile>): Profile {
  const existing = MOCK_PROFILES.get(userId);
  const now = new Date().toISOString();
  const profile: Profile = {
    id: existing?.id || uuidv4(),
    userId,
    fullName: data.fullName || existing?.fullName || '',
    businessName: data.businessName || existing?.businessName,
    role: data.role || existing?.role,
    services: data.services || existing?.services,
    targetIndustries: data.targetIndustries || existing?.targetIndustries,
    defaultCountry: data.defaultCountry || existing?.defaultCountry,
    defaultState: data.defaultState || existing?.defaultState,
    defaultCity: data.defaultCity || existing?.defaultCity,
    onboardingComplete: data.onboardingComplete ?? existing?.onboardingComplete ?? false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  MOCK_PROFILES.set(userId, profile);
  return profile;
}

export function getUserEmail(userId: string): string {
  const user = MOCK_USERS.get(userId);
  return user?.email || '';
}
