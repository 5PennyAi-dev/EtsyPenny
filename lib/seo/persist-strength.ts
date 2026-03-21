/**
 * Persists strength scores to listing_seo_stats and listings_global_eval.
 * Score data lives in listings_global_eval only (not duplicated to listings).
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

  // 2. Upsert listings_global_eval (single source of truth for scores)
  const { data: existingEvalRows } = await supabaseAdmin
    .from('listings_global_eval')
    .select('id')
    .eq('listing_id', listing_id);

  const evalPayload = {
    listing_id,
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
