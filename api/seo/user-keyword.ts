import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { enrichKeywords } from '../../lib/seo/enrich-keywords.js';
import { scoreKeywords } from '../../lib/seo/score-keywords.js';
import { applySEOFilter } from '../../lib/seo/filter-logic.js';
import { selectAndScore } from '../../lib/seo/select-and-score.js';
import { extractProductTypeWords } from '../../lib/seo/concept-diversity.js';
import { checkQuota, incrementQuota } from '../../lib/tokens/token-middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const t0 = Date.now();
  const { listing_id, keyword, user_id } = req.body;

  if (!listing_id || !keyword || !user_id) {
    return res.status(400).json({ error: 'Missing listing_id, user_id, or keyword' });
  }

  try {
    // Quota check
    const quotaCheck = await checkQuota(user_id, 'add_custom');
    if (!quotaCheck.allowed) {
      return res.status(402).json({ error: quotaCheck.reason, used: (quotaCheck as any).used, limit: (quotaCheck as any).limit });
    }

    const cleanKeyword = keyword.trim().toLowerCase();
    console.info(`[user-keyword] listing=${listing_id}`);

    // 1. Fetch listing context
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw new Error('Listing not found');

    let productTypeName = '';
    if (listing.product_type_id) {
      const { data: ptRow } = await supabaseAdmin
        .from('v_combined_product_types')
        .select('name')
        .eq('id', listing.product_type_id)
        .single();
      if (ptRow?.name) productTypeName = ptRow.name;
    }

    const ctx = {
      product_type: productTypeName,
      theme: listing.theme,
      niche: listing.niche,
      sub_niche: listing.sub_niche,
      visual_aesthetic: listing.visual_aesthetic,
      visual_target_audience: listing.visual_target_audience,
      visual_overall_vibe: listing.visual_overall_vibe,
    };

    // 2. Fetch SEO settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .maybeSingle();

    if (settingsError) throw settingsError;
    const s = settings || {};

    const params = {
      Volume: s.param_volume ?? 0.25,
      Competition: s.param_competition ?? 0.10,
      Transaction: s.param_transaction ?? 0.25,
      Niche: s.param_niche ?? 0.20,
      CPC: s.param_cpc ?? 0.20,
      evergreen_stability_ratio: s.evergreen_stability_ratio ?? 4,
      evergreen_minimum_volume: s.evergreen_minimum_volume ?? 0.3,
      evergreen_avg_volume: s.evergreen_avg_volume ?? 50,
      trending_dropping_threshold: s.trending_dropping_threshold ?? 0.8,
      trending_current_month_min_volume: s.trending_current_month_min_volume ?? 150,
      trending_growth_factor: s.trending_growth_factor ?? 1.5,
      promising_min_score: s.promising_min_score ?? 55,
      promising_competition: s.promising_competition ?? 0.4,
      ai_selection_count: s.ai_selection_count || 13,
      working_pool_count: s.working_pool_count || 40,
      concept_diversity_limit: s.concept_diversity_limit || 2,
      productTypeWords: extractProductTypeWords(productTypeName),
    };

    // 3. Enrich + Score the single keyword
    console.info(`[user-keyword] enriching keyword="${cleanKeyword}"`);
    const stats = await enrichKeywords([cleanKeyword]);
    const scored = await scoreKeywords(stats, ctx);
    const newKw = scored[0];

    // 4. Initial Upsert
    const upsertPayload = {
      listing_id,
      tag: cleanKeyword,
      search_volume: newKw.search_volume,
      competition: (newKw.competition ?? 0.5).toString(),
      cpc: newKw.cpc,
      volume_history: newKw.volume_history,
      niche_score: newKw.niche_score,
      transactional_score: newKw.transactional_score,
      is_user_added: true,
      is_pinned: false,
      is_current_pool: true,
      is_selection_ia: false,
      is_current_eval: true,
    };

    const { error: initialUpsertError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(upsertPayload, { onConflict: 'listing_id,tag' });

    if (initialUpsertError) throw initialUpsertError;

    // 5. Fetch full pool and Re-rank
    const { data: pool, error: poolError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('is_current_pool', true);

    if (poolError) throw poolError;

    const processedPool = applySEOFilter(pool || [], params);

    // 6. Sync Pool Updates
    const updates = processedPool.map(kw => ({
      id: kw.id,
      listing_id: kw.listing_id,
      tag: kw.tag,
      opportunity_score: kw.opportunity_score,
      is_trending: kw.status.trending,
      is_evergreen: kw.status.evergreen,
      is_promising: kw.status.promising,
      is_current_pool: kw.is_current_pool,
      is_pinned: kw.is_pinned,
    }));

    const { error: batchUpdateError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(updates, { onConflict: 'id' });

    if (batchUpdateError) throw batchUpdateError;

    // 7. Update Listing Strength (scores persisted to listings_global_eval only)
    const { strength } = selectAndScore(processedPool, params);

    const finalKw = processedPool.find(k => k.tag === cleanKeyword) || newKw;

    // Increment quota after success
    await incrementQuota(user_id, 'add_custom');

    console.info(`[user-keyword] complete keyword="${cleanKeyword}" (${Date.now() - t0}ms)`);
    return res.json({
      success: true,
      listing_strength: strength?.listing_strength || 0,
      keyword: {
        tag: (finalKw as Record<string, unknown>).tag || cleanKeyword,
        is_user_added: true,
        is_pinned: false,
        search_volume: finalKw.search_volume,
        competition: finalKw.competition,
        cpc: finalKw.cpc,
        niche_score: finalKw.niche_score,
        transactional_score: finalKw.transactional_score,
        opportunity_score: (finalKw as Record<string, unknown>).opportunity_score,
        is_selection_ia: false,
        is_current_eval: null,
        is_trending: (finalKw as Record<string, unknown>).status ? ((finalKw as Record<string, unknown>).status as Record<string, boolean>).trending : false,
        is_evergreen: (finalKw as Record<string, unknown>).status ? ((finalKw as Record<string, unknown>).status as Record<string, boolean>).evergreen : false,
        is_promising: (finalKw as Record<string, unknown>).status ? ((finalKw as Record<string, unknown>).status as Record<string, boolean>).promising : false,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [user-keyword] Error:', message);
    return res.status(500).json({ error: 'Failed to add user keyword.', details: message });
  }
}
