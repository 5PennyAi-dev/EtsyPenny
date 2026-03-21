/**
 * Verbatim extract from server.mjs lines 749-813.
 * Persists strength scores to listings, listing_seo_stats, and listings_global_eval.
 */

import { supabaseAdmin } from '../supabase/server.js';

interface Strength {
  listing_strength: number;
  breakdown: {
    visibility: number;
    conversion: number;
    relevance: number;
    competition: number;
    profit: number;
  };
  stats: {
    est_market_reach: number;
    [key: string]: unknown;
  };
}

interface Params {
  Volume: number;
  Competition: number;
  Transaction: number;
  Niche: number;
  CPC: number;
}

export async function persistStrength(
  listing_id: string,
  seo_mode: string,
  strength: Strength,
  selectedTags: string[],
  params: Params
): Promise<void> {
  // 1. Update is_current_eval flags on listing_seo_stats
  await supabaseAdmin
    .from('listing_seo_stats')
    .update({ is_current_eval: false })
    .eq('listing_id', listing_id);

  if (selectedTags.length > 0) {
    await supabaseAdmin
      .from('listing_seo_stats')
      .update({ is_current_eval: true })
      .eq('listing_id', listing_id)
      .in('tag', selectedTags);
  }

  // 2. Update listings table with strength scores
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

  // 3. Upsert listings_global_eval for this mode
  const { data: existingEvalRows } = await supabaseAdmin
    .from('listings_global_eval')
    .select('id')
    .eq('listing_id', listing_id)
    .eq('seo_mode', seo_mode);

  const evalPayload = {
    listing_id,
    seo_mode,
    listing_strength: strength.listing_strength,
    listing_visibility: strength.breakdown.visibility,
    listing_conversion: strength.breakdown.conversion,
    listing_relevance: Math.round(strength.breakdown.relevance),
    listing_competition: strength.breakdown.competition,
    listing_profit: strength.breakdown.profit,
    listing_est_market_reach: strength.stats.est_market_reach,
    param_Volume: params.Volume,
    param_Competition: params.Competition,
    param_Transaction: params.Transaction,
    param_Niche: params.Niche,
    param_cpc: params.CPC,
    updated_at: new Date().toISOString(),
  };

  if (existingEvalRows?.length) {
    await supabaseAdmin
      .from('listings_global_eval')
      .update(evalPayload)
      .eq('id', existingEvalRows[0].id);
  } else {
    await supabaseAdmin
      .from('listings_global_eval')
      .insert(evalPayload);
  }
}
