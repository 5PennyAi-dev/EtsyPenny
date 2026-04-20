/**
 * Verbatim extract from server.mjs lines 499-529.
 * Persists SEO results via the save-seo edge function.
 */

interface Keyword {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
  volume_history: number[];
  niche_score: number | null;
  transactional_score: number | null;
  is_selection_ia: boolean;
  is_user_added: boolean;
  is_pinned: boolean;
}

interface Strength {
  listing_strength: number;
  breakdown: Record<string, number>;
  stats: Record<string, number>;
}

interface Params {
  [key: string]: unknown;
}

export async function persistSeo(
  listingId: string,
  keywords: Keyword[],
  strength: Strength | null,
  params: Params
): Promise<unknown> {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';

  const payload = {
    listing_id: listingId,
    results: {
      balanced: {
        listing_strength: strength?.listing_strength ?? 0,
        breakdown: strength?.breakdown ?? {},
        stats: strength?.stats ?? {},
        seo_parameters: params,
        keywords: keywords.map(kw => ({
          keyword: kw.keyword, search_volume: kw.search_volume, competition: kw.competition, cpc: kw.cpc,
          volume_history: kw.volume_history, niche_score: kw.niche_score, transactional_score: kw.transactional_score,
          is_selection_ia: kw.is_selection_ia, is_user_added: kw.is_user_added, is_pinned: kw.is_pinned,
          is_current_pool: true, is_current_eval: kw.is_selection_ia,
        })),
      },
    },
    // Tells the edge function to SKIP the status_id=SEO_DONE / is_generating_seo=false
    // update on the listings row. The caller is expected to await runResetPool() and
    // then set the final status itself — this prevents the realtime subscription on
    // listings from firing before the 25-keyword pool is finalized.
    trigger_reset_pool: true,
    parameters: params,
  };

  const saveRes = await fetch(`${SUPABASE_URL}/functions/v1/save-seo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'x-api-key': N8N_SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!saveRes.ok) {
    const errText = await saveRes.text();
    throw new Error(`save-seo failed (${saveRes.status}): ${errText}`);
  }
  return await saveRes.json();
}
