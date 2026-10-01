import { FastifyRequest, FastifyReply } from 'fastify';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateToken } from '../services/authService.js';
import { AuthError } from '../errors/AppError.js';
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

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AuthError('Missing or invalid authorization header');
  }

  // 1. Try Supabase Auth token validation if Supabase is configured
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (data?.user?.id && !error) {
        (request as { userId?: string }).userId = data.user.id;
        return;
      }
    } catch {
      // Fall through to local session validation
    }
  }

  // 2. Validate token against local session store
  const userId = validateToken(token);
  if (!userId) {
    throw new AuthError('Invalid or expired token');
  }

  // Attach verified userId to request for downstream handlers
  (request as { userId?: string }).userId = userId;
}

export function getUserId(request: FastifyRequest): string {
  const userId = (request as { userId?: string }).userId;
  if (!userId) throw new AuthError('Unauthorized request');
  return userId;
}
