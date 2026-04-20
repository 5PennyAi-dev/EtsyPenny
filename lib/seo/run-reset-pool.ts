/**
 * Shared reset-pool logic used by:
 *   - POST /api/seo/reset-pool (both api/seo/reset-pool.ts and server.mjs)
 *   - POST /api/seo/generate-keywords (after persistSeo, to finalize the 25-keyword pool synchronously)
 *
 * Extracted so generate-keywords can await pool finalization in-process instead of
 * relying on a fire-and-forget chain from the save-seo edge function (the old path
 * caused a race where the frontend loaded all ~50-100 keywords before reset-pool wrote
 * the final is_current_pool flags).
 */

import { supabaseAdmin } from '../supabase/server.js';
import { applySEOFilter } from './filter-logic.js';
import { selectAndScore } from './select-and-score.js';
import { persistStrength } from './persist-strength.js';
import { extractProductTypeWords } from './concept-diversity.js';

export interface ResetPoolResult {
  processed: number;
  top_selections: number;
  strength: unknown;
}

export async function runResetPool(
  listing_id: string,
  overrideParameters: Record<string, unknown> = {}
): Promise<ResetPoolResult> {
  // 1. Fetch keywords for the listing
  const { data: keywords, error: kwError } = await supabaseAdmin
    .from('listing_seo_stats')
    .select('*')
    .eq('listing_id', listing_id);

  if (kwError) throw kwError;
  if (!keywords || keywords.length === 0) {
    throw new Error('No keywords found for this listing');
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
    promising_competition: s.promising_competition ?? s.promosing_competition ?? 0.4,
    ai_selection_count: s.ai_selection_count || 13,
    working_pool_count: s.working_pool_count || 40,
    concept_diversity_limit: s.concept_diversity_limit || 2,
    productTypeWords: extractProductTypeWords(productTypeName),
  };

  const finalParams = { ...params, ...overrideParameters };

  // 4. Apply filter
  const filteredKeywords = applySEOFilter(keywords, finalParams as any);

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
  const updates = filteredKeywords.map((kw: any) => ({
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

  // 6. Calculate new listing strength and persist.
  //
  // IMPORTANT: compute strength from ONLY the keywords applySEOFilter picked
  // (is_selection_ia === true), with ai_selection_count = that count. If we pass
  // the full filtered pool instead, selectAndScore re-ranks by composite score
  // and bases strength on a DIFFERENT top-13 than the one shown in the UI —
  // which desynchronises listings_global_eval.listing_competition from the
  // is_current_eval flags (the reason Recalculate Scores produced a different
  // number than what showed immediately after Generate Keywords).
  const selectedKeywords = filteredKeywords.filter((k: any) => k.is_selection_ia);
  const correctSelectedTags = selectedKeywords.map((k: any) => k.tag);
  const strengthParams = { ...finalParams, ai_selection_count: selectedKeywords.length };
  const { strength } = selectAndScore(selectedKeywords as any, strengthParams as any);

  if (strength) {
    await persistStrength(listing_id, strength as any, correctSelectedTags, finalParams as any);
  }

  return {
    processed: filteredKeywords.length,
    top_selections: filteredKeywords.filter((k: any) => k.is_selection_ia).length,
    strength,
  };
}
