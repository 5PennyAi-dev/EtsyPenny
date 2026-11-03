import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../supabase/server.js';

export const PREPARATION_CLAIM_MS = 10 * 60 * 1000;

export class PreparationInProgressError extends Error {
  code = 'PREPARATION_IN_PROGRESS';

  constructor() {
    super('Preparation is already in progress for this listing');
  }
}

export class PreparationClaimLostError extends Error {
  code = 'PREPARATION_CLAIM_LOST';

  constructor() {
    super('Preparation claim was superseded by a newer attempt');
  }
}

export interface PreparationClaim {
  attemptId: string;
  expiresAt: string;
}

function nowIso(now: Date) {
  return now.toISOString();
}

/**
 * Claims one Etsy row before any external image work. The predicate belongs to
 * the UPDATE, so a concurrent caller cannot start work after losing the claim.
 * An expired claim is safely reclaimed with a new attempt identifier.
 */
export async function claimEtsyListingForPreparation(
  userId: string,
  etsyListingRowId: string,
  now = new Date(),
): Promise<PreparationClaim | null> {
  const attemptId = randomUUID();
  const claimedAt = nowIso(now);
  const expiresAt = new Date(now.getTime() + PREPARATION_CLAIM_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from('etsy_listings')
    .update({
      preparation_status: 'preparing',
      preparation_attempt_id: attemptId,
      preparation_claim_expires_at: expiresAt,
    })
    .eq('id', etsyListingRowId)
    .eq('user_id', userId)
    .or(`preparation_status.in.(pending,error),and(preparation_status.eq.preparing,preparation_claim_expires_at.lt.${claimedAt})`)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data ? { attemptId, expiresAt } : null;
}

export async function completeEtsyListingPreparation(
  userId: string,
  etsyListingRowId: string,
  attemptId: string,
  preparedAt = new Date().toISOString(),
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('etsy_listings')
    .update({
      preparation_status: 'prepared',
      prepared_at: preparedAt,
      preparation_error: null,
      preparation_failed_at: null,
      preparation_attempt_id: null,
      preparation_claim_expires_at: null,
    })
    .eq('id', etsyListingRowId)
    .eq('user_id', userId)
    .eq('preparation_status', 'preparing')
    .eq('preparation_attempt_id', attemptId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PreparationClaimLostError();
}

export async function failEtsyListingPreparation(
  userId: string,
  etsyListingRowId: string,
  attemptId: string,
  message: string,
  failedAt = new Date().toISOString(),
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('etsy_listings')
    .update({
      preparation_status: 'error',
      preparation_error: message,
      preparation_failed_at: failedAt,
      preparation_attempt_id: null,
      preparation_claim_expires_at: null,
    })
    .eq('id', etsyListingRowId)
    .eq('user_id', userId)
    .eq('preparation_status', 'preparing')
    .eq('preparation_attempt_id', attemptId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PreparationClaimLostError();
}

export function preparationUserMessage(): string {
  return 'We could not prepare this listing. Please try again.';
}
