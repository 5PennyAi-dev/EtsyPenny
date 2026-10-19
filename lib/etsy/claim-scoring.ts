import { supabaseAdmin } from '../supabase/server.js';

/**
 * Atomically claims still-pending imported listings for one scoring request.
 * PostgreSQL evaluates the status predicate in the UPDATE itself, so a second
 * request for the same row receives no claim and must not start paid work.
 */
export async function claimPendingEtsyListingsForScoring(userId: string, listingIds: string[]) {
  if (listingIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('etsy_listings')
    .update({ scoring_status: 'scoring' })
    .in('id', listingIds)
    .eq('user_id', userId)
    .eq('scoring_status', 'pending')
    .select('*');

  if (error) throw error;
  return data ?? [];
}
