import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { applySEOFilter } from '../../lib/seo/filter-logic.js';
import { selectAndScore } from '../../lib/seo/select-and-score.js';
import { persistStrength } from '../../lib/seo/persist-strength.js';
import { extractProductTypeWords } from '../../lib/seo/concept-diversity.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { listing_id } = req.body;
    if (!listing_id) {
      return res.status(400).json({ error: 'Missing listing_id' });
    }

    console.info(`[reset-pool] listing=${listing_id}`);

    // 1. Fetch keywords for the listing
    const { data: keywords, error: kwError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id);

    if (kwError) throw kwError;
    if (!keywords || keywords.length === 0) {
      return res.status(404).json({ error: 'No keywords found for this listing' });
    }

    // 2. Fetch the listing owner and product type
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id, product_type_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw listingError || new Error('Listing not found');

    // Resolve product type name for concept diversity
    let productTypeName = '';
    if (listing.product_type_id) {
      const { data: pt } = await supabaseAdmin
        .from('v_combined_product_types')
        .select('name')
        .eq('id', listing.product_type_id)
        .single();
      productTypeName = pt?.name || '';
    }

    // 3. Fetch user settings from view
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw settingsError || new Error('Settings not found');

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.10,
      Transaction: settings.param_transaction ?? 0.25,
      Niche: settings.param_niche ?? 0.20,
      CPC: settings.param_cpc ?? 0.20,
      evergreen_stability_ratio: settings.evergreen_stability_ratio ?? 4,
      evergreen_minimum_volume: settings.evergreen_minimum_volume ?? 0.3,
      evergreen_avg_volume: settings.evergreen_avg_volume ?? 50,
      trending_dropping_threshold: settings.trending_dropping_threshold ?? 0.8,
      trending_current_month_min_volume: settings.trending_current_month_min_volume ?? 150,
      trending_growth_factor: settings.trending_growth_factor ?? 1.5,
      promising_min_score: settings.promising_min_score ?? 55,
      promising_competition: settings.promising_competition ?? settings.promosing_competition ?? 0.4,
      ai_selection_count: settings.ai_selection_count || 13,
      working_pool_count: settings.working_pool_count || 40,
      concept_diversity_limit: settings.concept_diversity_limit || 2,
      productTypeWords: extractProductTypeWords(productTypeName),
    };

    // Override with incoming parameters
    const finalParams = { ...params, ...(req.body.parameters || {}) };

    // 4. Apply filter
    const filteredKeywords = applySEOFilter(keywords, finalParams);

    // 4.5 Reset flags for all keywords before applying the new ones
    await supabaseAdmin
      .from('listing_seo_stats')
      .update({
        is_selection_ia: false,
        is_current_eval: false,
        is_current_pool: false,
      })
      .eq('listing_id', listing_id)
      .eq('is_competition', false);

    // 5. Update keywords in DB
    const updates = filteredKeywords.map(kw => ({
      id: kw.id,
      listing_id: kw.listing_id,
      tag: kw.tag,
      opportunity_score: kw.opportunity_score,
      is_trending: kw.status.trending,
      is_evergreen: kw.status.evergreen,
      is_promising: kw.status.promising,
      is_selection_ia: kw.is_selection_ia,
      is_current_eval: kw.is_current_eval,
      is_current_pool: kw.is_current_pool,
      is_pinned: kw.is_pinned,
    }));

    const { error: updateError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) throw updateError;

    // 6. Calculate new listing strength and persist
    // Capture correct selections from applySEOFilter BEFORE selectAndScore mutates them
    const correctSelectedTags = filteredKeywords.filter(k => k.is_selection_ia).map(k => k.tag);
    const { strength } = selectAndScore(filteredKeywords, finalParams);

    if (strength) {
      await persistStrength(listing_id, strength, correctSelectedTags, finalParams);
    }

    console.info(`[reset-pool] complete listing=${listing_id} processed=${filteredKeywords.length}`);
    return res.json({
      success: true,
      processed: filteredKeywords.length,
      top_selections: filteredKeywords.filter(k => k.is_selection_ia).length,
      strength,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [reset-pool] Error:', message);
    return res.status(500).json({ error: 'Failed to reset pool.', details: message });
  }
}
