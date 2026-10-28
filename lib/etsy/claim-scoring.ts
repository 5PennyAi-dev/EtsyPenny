import { supabaseAdmin } from '../supabase/server.js';

/**
 * Atomically claims imported listings that are pending or retryable after an error.
 * PostgreSQL evaluates the status predicate in the UPDATE itself, so a second
 * request for the same row receives no claim and must not start paid work.
 */
export async function claimScoreableEtsyListingsForScoring(userId: string, listingIds: string[]) {
  if (listingIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('etsy_listings')
    .update({ scoring_status: 'scoring' })
    .in('id', listingIds)
    .eq('user_id', userId)
    .in('scoring_status', ['pending', 'error'])
    .select('*');

  if (error) throw error;
  return data ?? [];
}
