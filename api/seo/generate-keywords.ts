import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { generateKeywordPool } from '../../lib/seo/generate-keyword-pool.js';
import { enrichKeywords } from '../../lib/seo/enrich-keywords.js';
import { scoreKeywords } from '../../lib/seo/score-keywords.js';
import { selectAndScore } from '../../lib/seo/select-and-score.js';
import { persistSeo } from '../../lib/seo/persist-seo.js';
import { checkTokenBalance, deductTokens } from '../../lib/tokens/token-middleware.js';

const STATUS_SEO_DONE = '35660e24-94bb-4586-aa5a-a5027546b4a1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const t0 = Date.now();
  try {
    const {
      listing_id, user_id, product_type = '', theme = '', niche = '', sub_niche = '',
      client_description = '', visual_aesthetic = '', visual_target_audience = '', visual_overall_vibe = '',
      visual_colors = '', visual_graphics = '',
      parameters = {},
    } = req.body;

    if (!listing_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id and user_id' });
    }

    // Token check (generate_keywords vs rerun_keywords cost determined inside)
    const tokenCheck = await checkTokenBalance(user_id, 'generate_keywords', listing_id);
    if (!tokenCheck.allowed) {
      return res.status(402).json({ error: tokenCheck.reason, balance: tokenCheck.balance, required: tokenCheck.required });
    }

    const ctx = { product_type, theme, niche, sub_niche, client_description, visual_aesthetic, visual_target_audience, visual_overall_vibe, visual_colors, visual_graphics };

    // Fetch user settings (same pattern as reset-pool / recalculate-scores)
    const { data: settings } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const params = {
      Volume: settings?.param_volume ?? 0.25,
      Competition: settings?.param_competition ?? 0.10,
      Transaction: settings?.param_transaction ?? 0.25,
      Niche: settings?.param_niche ?? 0.20,
      CPC: settings?.param_cpc ?? 0.20,
      ai_selection_count: settings?.ai_selection_count || 13,
      ...parameters,
    };

    console.info(`[generate-keywords] listing=${listing_id} product=${product_type} taxonomy=${theme}>${niche}>${sub_niche}`);

    // Step A: Generate keyword pool
    const uniqueKeywords = await generateKeywordPool(ctx);
    console.info(`[generate-keywords] pool=${uniqueKeywords.length} keywords (${Date.now() - t0}ms)`);
    if (uniqueKeywords.length === 0) return res.status(500).json({ error: 'No keywords generated' });

    // Step B: Enrich with cache + DataForSEO
    const enriched = await enrichKeywords(uniqueKeywords);

    // Step C: Score keywords (niche + transactional)
    const scored = await scoreKeywords(enriched, ctx);

    // Step D: Select + calculate LSI
    const { keywords: finalKeywords, strength } = selectAndScore(scored as any, params);
    const selected = finalKeywords.filter(kw => kw.is_selection_ia);

    // Step E: Persist via edge function
    await persistSeo(listing_id, finalKeywords as any, strength, params);

    // Update listing flags
    await supabaseAdmin.from('listings').update({
      is_generating_seo: false,
      status_id: STATUS_SEO_DONE,
      updated_at: new Date().toISOString(),
    }).eq('id', listing_id);

    // Deduct tokens after successful processing
    const deductAction = tokenCheck.required === 4 ? 'rerun_keywords' as const : 'generate_keywords' as const;
    await deductTokens(user_id, deductAction, tokenCheck.required, listing_id);

    console.info(`[generate-keywords] complete listing=${listing_id} selected=${selected.length}/${finalKeywords.length} LSI=${strength?.listing_strength ?? 'N/A'} elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`);

    return res.json({
      success: true,
      listing_id,
      pool_size: finalKeywords.length,
      selected_count: selected.length,
      listing_strength: strength?.listing_strength ?? null,
      breakdown: strength?.breakdown ?? null,
      stats: strength?.stats ?? null,
      elapsed_ms: Date.now() - t0,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [generate-keywords] Error:', message);
    try {
      const { listing_id } = req.body || {};
      if (listing_id) {
        await supabaseAdmin.from('listings').update({ is_generating_seo: false }).eq('id', listing_id);
      }
    } catch (_) { /* best effort */ }
    return res.status(500).json({ error: 'Failed to generate keywords.', details: message });
  }
}
