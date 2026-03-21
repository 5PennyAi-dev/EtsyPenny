import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { scoreKeywords } from '../../lib/seo/score-keywords.js';
import { applySEOFilter } from '../../lib/seo/filter-logic.js';
import { selectAndScore } from '../../lib/seo/select-and-score.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const t0 = Date.now();
  const { listing_id, keywords: incomingKeywords } = req.body;

  console.info(`[add-from-favorite] listing=${listing_id} keywords=${incomingKeywords?.length || 0}`);

  if (!listing_id || !incomingKeywords || !Array.isArray(incomingKeywords) || incomingKeywords.length === 0) {
    return res.status(400).json({ error: 'Missing listing_id or keywords array' });
  }

  try {
    // Normalize: accept both string[] and object[]
    const normalizedKeywords = incomingKeywords.map((kw: string | Record<string, unknown>) => {
      if (typeof kw === 'string') {
        return { keyword: kw.trim().toLowerCase(), search_volume: 0, competition: 0.5, cpc: 0, volume_history: [] as number[] };
      }
      const tag = ((kw.keyword || kw.tag || kw.name || '') as string).trim().toLowerCase();
      return {
        keyword: tag,
        search_volume: (kw.search_volume ?? kw.last_volume ?? 0) as number,
        competition: (kw.competition ?? kw.last_competition ?? 0.5) as number,
        cpc: (kw.cpc ?? kw.last_cpc ?? 0) as number,
        volume_history: (kw.volume_history ?? []) as number[],
      };
    }).filter(kw => kw.keyword.length > 0);

    if (normalizedKeywords.length === 0) {
      return res.status(400).json({ error: 'No valid keywords found after normalization' });
    }

    // Step 2: Fetch listing context
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
      theme: listing.theme || '',
      niche: listing.niche || '',
      sub_niche: listing.sub_niche || '',
      visual_aesthetic: listing.visual_aesthetic || '',
      visual_target_audience: listing.visual_target_audience || '',
      visual_overall_vibe: listing.visual_overall_vibe || '',
    };

    // Step 3: Fetch user SEO settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw new Error('User settings not found');

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.15,
      Transaction: settings.param_transaction ?? 0.35,
      Niche: settings.param_niche ?? 0.25,
      CPC: settings.param_cpc ?? 0,
      evergreen_stability_ratio: settings.evergreen_stability_ratio ?? 4,
      evergreen_minimum_volume: settings.evergreen_minimum_volume ?? 0.3,
      evergreen_avg_volume: settings.evergreen_avg_volume ?? 50,
      trending_dropping_threshold: settings.trending_dropping_threshold ?? 0.8,
      trending_current_month_min_volume: settings.trending_current_month_min_volume ?? 150,
      trending_growth_factor: settings.trending_growth_factor ?? 1.5,
      promising_min_score: settings.promising_min_score ?? 55,
      promising_competition: settings.promising_competition ?? 0.4,
      ai_selection_count: settings.ai_selection_count || 13,
      working_pool_count: settings.working_pool_count || 40,
      concept_diversity_limit: settings.concept_diversity_limit || 5,
    };

    const finalParams = { ...params, ...(req.body.parameters || {}) };

    // Step 4: AI Scoring (skips DataForSEO — uses cached metrics)
    console.info(`[add-from-favorite] scoring ${normalizedKeywords.length} keywords`);
    const statsForScoring = normalizedKeywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      competition: kw.competition,
      cpc: kw.cpc,
      volume_history: kw.volume_history,
      fromCache: true,
    }));

    const scoredKeywords = await scoreKeywords(statsForScoring, ctx);
    console.info(`[add-from-favorite] scoring complete (${Date.now() - t0}ms)`);

    // Step 5: Bulk Upsert
    console.info(`[add-from-favorite] upserting ${scoredKeywords.length} keywords`);
    const upsertPayloads = scoredKeywords.map((scored, i) => {
      const original = normalizedKeywords[i];
      return {
        listing_id,
        tag: scored.keyword,
        search_volume: original.search_volume,
        competition: (original.competition ?? 0.5).toString(),
        cpc: original.cpc,
        volume_history: original.volume_history,
        niche_score: scored.niche_score,
        transactional_score: scored.transactional_score,
        is_user_added: true,
        is_pinned: false,
        is_current_pool: true,
        is_selection_ia: false,
        is_current_eval: true,
      };
    });

    const { error: upsertError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(upsertPayloads, { onConflict: 'listing_id,tag', ignoreDuplicates: true });

    const tagList = normalizedKeywords.map(k => k.keyword);
    await supabaseAdmin
      .from('listing_seo_stats')
      .update({ is_current_eval: true, is_current_pool: true })
      .eq('listing_id', listing_id)
      .in('tag', tagList);

    if (upsertError) throw upsertError;

    // Step 6: Pool Re-ranking
    console.info('[add-from-favorite] re-ranking pool');
    const { data: pool, error: poolError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('is_current_pool', true);

    if (poolError) throw poolError;

    const processedPool = applySEOFilter(pool || [], finalParams);

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

    // Step 7: Listing Strength Update
    const { strength } = selectAndScore(processedPool, finalParams);
    if (strength) {
      await supabaseAdmin
        .from('listings')
        .update({
          listing_strength: strength.listing_strength,
          visibility_score: strength.breakdown.visibility,
          relevance_score: strength.breakdown.relevance,
          conversion_score: strength.breakdown.conversion,
          competition_score: strength.breakdown.competition,
          profit_score: strength.breakdown.profit,
          est_market_reach: strength.stats.est_market_reach,
        })
        .eq('id', listing_id);
    }

    // Build response
    const addedTags = new Set(normalizedKeywords.map(k => k.keyword));
    const responseKeywords = processedPool
      .filter(kw => addedTags.has(kw.tag))
      .map(kw => ({
        tag: kw.tag,
        is_pinned: false,
        is_user_added: true,
        search_volume: kw.search_volume,
        competition: kw.competition,
        cpc: kw.cpc,
        niche_score: kw.niche_score,
        transactional_score: kw.transactional_score,
        opportunity_score: kw.opportunity_score,
        is_selection_ia: kw.is_selection_ia ?? false,
        is_current_eval: kw.is_current_eval ?? true,
        is_trending: kw.status?.trending || false,
        is_evergreen: kw.status?.evergreen || false,
        is_promising: kw.status?.promising || false,
      }));

    console.info(`[add-from-favorite] complete added=${responseKeywords.length} LSI=${strength?.listing_strength ?? 'N/A'} (${Date.now() - t0}ms)`);

    return res.json({
      success: true,
      added_count: responseKeywords.length,
      listing_strength: strength?.listing_strength || 0,
      keywords: responseKeywords,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [add-from-favorite] Error:', message);
    return res.status(500).json({ error: 'Failed to add keywords from favorites.', details: message });
  }
}
