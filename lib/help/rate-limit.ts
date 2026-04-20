import { supabaseAdmin } from '../supabase/server.js';

/** Max user messages allowed per rolling 24h window. Exported for UI use. */
export const HELP_DAILY_LIMIT = 20;

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult = {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: Date;
};

/**
 * Counts a user's chat messages in the last 24 hours. Returns the allow/deny
 * verdict plus the timestamp at which the oldest in-window message will age
 * out — that's the earliest point at which the limit eases.
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from('help_messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[rate-limit] query failed:', error.message);
    // Fail open — don't block legitimate users because of a transient DB error.
    return {
      allowed: true,
      used: 0,
      limit: HELP_DAILY_LIMIT,
      resetAt: new Date(Date.now() + WINDOW_MS),
    };
  }

  const rows = data ?? [];
  const used = rows.length;
  const allowed = used < HELP_DAILY_LIMIT;

  const oldestInWindow = rows[0]?.created_at
    ? new Date(rows[0].created_at as string).getTime()
    : Date.now();
  const resetAt = new Date(oldestInWindow + WINDOW_MS);

  return { allowed, used, limit: HELP_DAILY_LIMIT, resetAt };
}
