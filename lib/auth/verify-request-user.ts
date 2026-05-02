/**
 * Verifies a Supabase JWT from a request's Authorization header and returns
 * the authenticated user. Standard helper for routes that need proper
 * user-level auth (replacing the legacy "user_id in body" pattern).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export class AuthError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyRequestUser(
  authHeader: string | undefined,
  supabaseAdmin: SupabaseClient,
): Promise<AuthenticatedUser> {
  
  console.log('[verify] authHeader present:', !!authHeader);
  console.log('[verify] authHeader prefix:', authHeader?.substring(0, 20));

  if (!authHeader || !/^bearer\s+/i.test(authHeader)) {
    throw new AuthError('Missing or malformed Authorization header', 401);
  }
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  if (!token) {
    throw new AuthError('Missing or malformed Authorization header', 401);
  }

  console.log('[verify] token length:', token.length);
  console.log('[verify] token prefix:', token.substring(0, 30));

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new AuthError('Invalid or expired session', 401);
  }
  
  console.log('[verify] supabase result - error:', error?.message);
  console.log('[verify] supabase result - user id:', data?.user?.id);

  return { id: data.user.id, email: data.user.email ?? null };
}
