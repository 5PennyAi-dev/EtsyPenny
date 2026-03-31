import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { scoreEtsyListing } from '../../lib/etsy/score-etsy-listing.js';
import { checkTokenBalance, deductTokens } from '../../lib/tokens/token-middleware.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, etsy_listing_ids } = req.body;

    if (!user_id || !Array.isArray(etsy_listing_ids) || etsy_listing_ids.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: user_id, etsy_listing_ids (non-empty array)' });
    }

    if (etsy_listing_ids.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 listings per scoring request' });
    }

    console.info(`[score-listings] user=${user_id} requested=${etsy_listing_ids.length}`);

    // ── 1. Fetch and validate listings ────────────────
    const { data: listings, error: fetchErr } = await supabaseAdmin
      .from('etsy_listings')
      .select('*')
      .in('id', etsy_listing_ids)
      .eq('user_id', user_id)
      .eq('scoring_status', 'pending');

    if (fetchErr) throw fetchErr;

    if (!listings || listings.length === 0) {
      return res.status(400).json({ error: 'No valid pending listings found for scoring' });
    }

    // ── 2. Token check ────────────────────────────────
    const totalCost = listings.length * 3;
    const tokenCheck = await checkTokenBalance(user_id, 'etsy_score');
    if (!tokenCheck.allowed || tokenCheck.balance < totalCost) {
      return res.status(402).json({
        error: 'Insufficient tokens for scoring',
        required: totalCost,
        balance: tokenCheck.balance,
      });
    }

    // ── 3. Set scoring status ─────────────────────────
    await supabaseAdmin
      .from('etsy_listings')
      .update({ scoring_status: 'scoring' })
      .in('id', listings.map((l: any) => l.id));

    // ── 4. Fetch user settings ────────────────────────
    const { data: settings } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    // ── 5. Process sequentially ───────────────────────
    const results = [];
    let successCount = 0;

    for (const listing of listings) {
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

    console.info(`[score-listings] Done: scored=${successCount} failed=${listings.length - successCount} tokens=${tokensDeducted}`);

    return res.json({
      scored: successCount,
      failed: listings.length - successCount,
      results,
      tokens_deducted: tokensDeducted,
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [score-listings] Error:', message);
    return res.status(500).json({ error: 'Failed to score listings', details: message });
  }
}
