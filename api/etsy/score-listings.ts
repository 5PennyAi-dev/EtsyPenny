import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { scoreEtsyListing } from '../../lib/etsy/score-etsy-listing.js';
import { claimScoreableEtsyListingsForScoring } from '../../lib/etsy/claim-scoring.js';
import { checkTokenBalance, deductTokens } from '../../lib/tokens/token-middleware.js';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { etsy_listing_ids } = req.body;
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);
    const user_id = user.id;

    if (!Array.isArray(etsy_listing_ids) || etsy_listing_ids.length === 0) {
      return res.status(400).json({ error: 'Missing required field: etsy_listing_ids (non-empty array)' });
    }

    if (etsy_listing_ids.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 listings per scoring request' });
    }
    if (new Set(etsy_listing_ids).size !== etsy_listing_ids.length) {
      return res.status(400).json({ error: 'Duplicate Etsy listing IDs are not allowed' });
    }

    console.info(`[score-listings] user=${user_id} requested=${etsy_listing_ids.length}`);

    // ── 1. Fetch and validate ownership ───────────────
    const { data: listings, error: fetchErr } = await supabaseAdmin
      .from('etsy_listings')
      .select('*')
      .in('id', etsy_listing_ids)
      .eq('user_id', user_id);

    if (fetchErr) throw fetchErr;

    if (!listings || listings.length !== etsy_listing_ids.length) {
      return res.status(404).json({ error: 'One or more Etsy listings were not found' });
    }

    const scoreableListings = listings.filter((listing: any) => (
      listing.scoring_status === 'pending' || listing.scoring_status === 'error'
    ));
    if (scoreableListings.length === 0) {
      const inProgress = listings.filter((listing: any) => listing.scoring_status === 'scoring');
      if (inProgress.length > 0) {
        return res.status(409).json({
          error: 'One or more listings are already being scored',
          in_progress: inProgress.map((listing: any) => listing.id),
        });
      }
      return res.status(400).json({ error: 'No pending or failed listings found for scoring' });
    }

    // ── 2. Token check ────────────────────────────────
    const totalCost = scoreableListings.length * 3;
    const tokenCheck = await checkTokenBalance(user_id, 'etsy_score');
    if (!tokenCheck.allowed || tokenCheck.balance < totalCost) {
      return res.status(402).json({
        error: 'Insufficient tokens for scoring',
        required: totalCost,
        balance: tokenCheck.balance,
      });
    }

    // ── 3. Atomically claim still-scoreable rows ───────
    // Do this immediately before external work. A concurrent request receives
    // no claimed rows and therefore cannot call paid providers or deduct tokens.
    const claimedListings = await claimScoreableEtsyListingsForScoring(
      user_id,
      scoreableListings.map((listing: any) => listing.id),
    );

    if (claimedListings.length === 0) {
      return res.status(409).json({
        error: 'One or more listings are already being scored',
        in_progress: scoreableListings.map((listing: any) => listing.id),
      });
    }

    const claimedIds = new Set(claimedListings.map((listing: any) => listing.id));
    const skipped = listings
      .filter((listing: any) => !claimedIds.has(listing.id))
      .map((listing: any) => ({ id: listing.id, scoring_status: listing.scoring_status }));

    // ── 4. Fetch user settings ────────────────────────
    const { data: settings } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    // ── 5. Process sequentially ───────────────────────
    const results = [];
    let successCount = 0;

    for (const listing of claimedListings) {
      const result = await scoreEtsyListing({
        etsyListing: listing,
        userId: user_id,
        userSettings: settings || {},
      });
      results.push(result);
      if (result.score !== null) successCount++;
    }

    // ── 6. Deduct tokens for successful scorings ──────
    let tokensDeducted = 0;
    for (let i = 0; i < successCount; i++) {
      await deductTokens(user_id, 'etsy_score', 3);
      tokensDeducted += 3;
    }

    console.info(`[score-listings] Done: scored=${successCount} failed=${claimedListings.length - successCount} skipped=${skipped.length} tokens=${tokensDeducted}`);

    return res.json({
      scored: successCount,
      failed: claimedListings.length - successCount,
      skipped,
      results,
      tokens_deducted: tokensDeducted,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [score-listings] Error:', message);
    return res.status(500).json({ error: 'Failed to score listings', details: message });
  }
}
