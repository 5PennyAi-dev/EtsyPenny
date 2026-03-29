/**
 * Verbatim extract from server.mjs lines 431-496.
 * Composite scoring + strength calculation for selected keywords.
 */

interface Keyword {
  keyword?: string;
  tag?: string;
  search_volume?: number | null;
  competition?: number | null;
  cpc?: number | null;
  niche_score?: number | null;
  transactional_score?: number | null;
  is_selection_ia?: boolean;
  [key: string]: unknown;
}

interface Params {
  Volume: number;
  Competition: number;
  Transaction: number;
  Niche: number;
  CPC: number;
  ai_selection_count: number;
}

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
    total_keywords: number;
    avg_cpc: number;
    avg_competition_all: number;
    best_opportunity_comp: number;
    raw_visibility_index: number;
    est_market_reach: number;
  };
}

export function selectAndScore(keywords: Keyword[], params: Params): { keywords: Keyword[]; strength: Strength | null } {
  const volW = (params.Volume ?? 5) / 5;
  const compW = (params.Competition ?? 5) / 5;
  const transW = (params.Transaction ?? 5) / 5;
  const nicheW = (params.Niche ?? 5) / 5;
  const cpcW = (params.CPC ?? 5) / 5;

  const scored = keywords.map(kw => {
    const nS = (kw.niche_score ?? 5) / 10;
    const tS = (kw.transactional_score ?? 5) / 10;
    const volNorm = Math.log10(Math.max(1, (kw.search_volume || 0) + 1)) / 7;
    const compPenalty = kw.competition ?? 0.5;
    const cpcNorm = Math.min(1, (kw.cpc || 0) / 1.5);
    const composite = nS * nicheW + tS * transW + volNorm * volW - compPenalty * compW + cpcNorm * cpcW;
    return { kw, composite };
  });
  scored.sort((a, b) => b.composite - a.composite);

  const N = params.ai_selection_count ?? 13;
  scored.forEach((item, idx) => { item.kw.is_selection_ia = idx < N; });
  const finalKws = scored.map(s => s.kw);
  const selected = finalKws.filter(kw => kw.is_selection_ia);

  let strength: Strength | null = null;
  if (selected.length > 0) {
    let totalMarketReach = 0, totalPowerIndex = 0;
    selected.forEach(kw => {
      const vol = Math.min(1000000, kw.search_volume || 0);
      const nS = kw.niche_score ?? 5;
      const tS = kw.transactional_score ?? 5;
      const dw = 0.7 + (nS / 20) + (tS / 20);
      totalMarketReach += vol * dw;
      totalPowerIndex += Math.sqrt(vol) * dw;
    });
    const ceil = 5000000;
    const visibility = Math.min(100, Math.round((Math.log10(Math.max(1, totalMarketReach)) / Math.log10(ceil)) * 100));
    const avgTrans = selected.reduce((a, k) => a + (Number(k.transactional_score) || 5), 0) / selected.length;
    const avgCPC = selected.reduce((a, k) => a + (Number(k.cpc) || 0), 0) / selected.length;
    const cpcS = Math.min(10, (avgCPC / 1.5) * 10);
    const conversion = (avgTrans * 6) + (cpcS * 4);
    const avgNiche = selected.reduce((a, k) => a + (Number(k.niche_score) || 5), 0) / selected.length;
    const relevance = avgNiche * 10;
    const sorted = [...selected].sort((a, b) => (Number(a.competition) || 1) - (Number(b.competition) || 1));
    const top5 = sorted.slice(0, 5);
    const avgBestComp = top5.reduce((a, k) => a + (Number(k.competition) || 0.9), 0) / top5.length;
    const competition = Math.round(Math.pow(1 - Math.min(0.99, avgBestComp), 0.5) * 100);
    const cpcAll = Math.min(100, (avgCPC / 1.5) * 100);
    const transS = avgTrans * 10;
    const profit = Math.round((visibility * 0.35) + (cpcAll * 0.30) + (transS * 0.35));
    const lsi = Math.round((visibility * 0.25) + (conversion * 0.35) + (relevance * 0.25) + (competition * 0.15));

    strength = {
      listing_strength: lsi,
      breakdown: { visibility, conversion: Math.round(conversion), relevance: Math.round(relevance), competition, profit },
      stats: {
        total_keywords: selected.length,
        avg_cpc: parseFloat(avgCPC.toFixed(2)),
        avg_competition_all: parseFloat((selected.reduce((a, k) => a + (Number(k.competition) || 0.8), 0) / selected.length).toFixed(2)),
        best_opportunity_comp: parseFloat(avgBestComp.toFixed(2)),
        raw_visibility_index: Math.round(totalPowerIndex),
        est_market_reach: Math.round(totalMarketReach),
      },
    };
  }
  return { keywords: finalKws, strength };
}
