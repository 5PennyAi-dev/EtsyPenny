import { getCanonicalConcept } from './concept-diversity.js';

export interface KeywordInput {
  keyword: string;
  search_volume?: number | null;
  competition?: number | null;
  cpc?: number | null;
  niche_score?: number | null;
  transactional_score?: number | null;
  volume_history?: number[] | null;
  is_pinned?: boolean | null;
  is_user_added?: boolean | null;
  [key: string]: any; // Allow pass-through properties
}

export interface FilterParameters {
  // Weights (powers)
  Volume: number;
  Competition: number;
  Transaction: number;
  Niche: number;
  CPC: number;

  // Evergreen Thresholds
  evergreen_stability_ratio: number;
  evergreen_minimum_volume: number;
  evergreen_avg_volume: number;

  // Trending Thresholds
  trending_dropping_threshold: number;
  trending_current_month_min_volume: number;
  trending_growth_factor: number;

  // Promising Thresholds
  promising_min_score: number;
  promising_competition: number;

  // Limits
  ai_selection_count: number;
  working_pool_count: number;
  concept_diversity_limit: number;

  // Concept diversity — product type words to exclude from concept keys
  productTypeWords?: string[];
}

export interface KeywordOutput extends KeywordInput {
  opportunity_score: number;
  status: {
    trending: boolean;
    evergreen: boolean;
    promising: boolean;
  };
  is_selection_ia: boolean;
  is_current_eval: boolean; // Same as is_selection_ia based on old logic
  is_current_pool: boolean;
  is_pinned: boolean;
}

/**
 * Applies the PennySEO filtering, scoring, status detection, and diversity selection logic
 * to an array of keywords.
 * 
 * @param keywords Array of keyword objects.
 * @param params Filtering weights, thresholds, and limits.
 * @returns Array of processed keywords, selected and marked based on limits.
 */
export function applySEOFilter(keywords: KeywordInput[], params: FilterParameters): KeywordOutput[] {
  if (!keywords || keywords.length === 0) return [];

  const maxRefCPC = 1.5;
  const maxVol = Math.max(...keywords.map(k => k.search_volume || (k as any).volume || 0), 100);

  // Hard filter limits from old logic (could be made dynamic if needed)
  const MIN_TRANSACTIONAL = 5;
  const MIN_NICHE = 5;

  // 1. Processing, Scoring, and Status
  const processed = keywords.map(item => {
    const vol = item.search_volume || (item as any).volume || 0;
    const rawComp = (item.competition !== null && item.competition !== undefined) ? Number(item.competition) : 0.5;
    const txScore = item.transactional_score || 5;
    const nicheScore = item.niche_score || 5;
    const rawCPC = item.cpc || 0;

    // Hard Filters (Bypass for user-added keywords)
    if (!item.is_user_added && (txScore < MIN_TRANSACTIONAL || nicheScore < MIN_NICHE)) return null;

    // A. Normalization & Scoring
    const V = Math.log(vol + 1) / Math.log(maxVol + 1);
    const C = 1 - rawComp;
    const T = Math.pow(txScore / 10, 2);
    const N = Math.pow(nicheScore / 10, 2);
    const E = Math.min(1, rawCPC / maxRefCPC);

    let finalScore = 100 * (
      Math.pow(V || 0.01, params.Volume) *
      Math.pow(C || 0.01, params.Competition) *
      Math.pow(T || 0.01, params.Transaction) *
      Math.pow(N || 0.01, params.Niche) *
      Math.pow(E || 0.01, params.CPC)
    );

    // B. Status Detection (History Analysis)
    const history = [...(item.volume_history || [])];
    while (history.length < 12) history.push(0);

    const currentMonth = history[0];
    const recentAvg = (history[0] + history[1] + history[2]) / 3;
    const pastMonths = history.slice(3, 12);
    const historicalAvg = pastMonths.reduce((a, b) => a + b, 0) / (pastMonths.length || 1) || 1;

    // Trending
    const isDropping = currentMonth < (history[1] * params.trending_dropping_threshold);
    const isTrending = !isDropping && (recentAvg > historicalAvg * params.trending_growth_factor) && currentMonth > params.trending_current_month_min_volume;

    // Evergreen
    // To calculate evergreen, we need safe min/max volumes ignoring zeros if possible (as per old logic)
    const nonZeroHistory = history.filter(v => v > 0);
    const minVol = nonZeroHistory.length > 0 ? Math.min(...nonZeroHistory) : 0;
    const maxVolInHistory = Math.max(...history, 0);
    const stabilityRatio = maxVolInHistory / (minVol || 1);

    const isEvergreen = !isTrending &&
                        vol > params.evergreen_avg_volume &&
                        stabilityRatio < params.evergreen_stability_ratio &&
                        minVol > (vol * params.evergreen_minimum_volume);

    // Promising
    const isPromising = finalScore > params.promising_min_score && rawComp < params.promising_competition;

    return {
      ...item,
      opportunity_score: Math.round(finalScore),
      status: {
        trending: isTrending,
        evergreen: isEvergreen,
        promising: isPromising
      },
      is_pinned: item.is_pinned || false
    };
  }).filter((i): i is NonNullable<typeof i> => i !== null);


  // D. Sorting
  // Sort ONLY by pinned and then by score
  processed.sort((a, b) => {
    // 1. Pinned keywords always first
    if ((a as any).is_pinned && !(b as any).is_pinned) return -1;
    if (!(a as any).is_pinned && (b as any).is_pinned) return 1;

    // 2. Then by opportunity score descending
    return ((b as any).opportunity_score || 0) - ((a as any).opportunity_score || 0);
  });

  // D. Concept Diversity Filtering
  const selectedTags: typeof processed = [];
  const conceptTracker: Record<string, number> = {};
  
  // We limit the total tags output if needed, but the original logic used a generic tag_count = 200.
  // We'll process all of them and just enforce concept limits.
  const TAG_COUNT = 200;

  for (const item of processed) {
    if (selectedTags.length >= TAG_COUNT) break;
    
    const rawKeyword = (item.keyword || (item as any).tag || '').toLowerCase();
    const concept = getCanonicalConcept(rawKeyword, params.productTypeWords || []);
      
    conceptTracker[concept] = (conceptTracker[concept] || 0) + 1;

    if (item.is_user_added || conceptTracker[concept] <= params.concept_diversity_limit) {
      selectedTags.push(item);
    }
  }

  let aiCount = 0;
  let poolCount = 0;
  const WORKING_POOL_LIMIT = params.working_pool_count || 40;

  return selectedTags.map((item, index) => {
    const isUserAdded = (item as any).is_user_added === true || (item as any).is_user_added === 'true';
    let isInTopSelection = false;

    // 1. AI Selection Quota (13 limit)
    if ((item as any).is_pinned) {
        aiCount++; // Pinned explicitly consumes a slot
    } else if (aiCount < (params.ai_selection_count || 13)) {
        isInTopSelection = true;
        aiCount++;
    }

    // 2. Visibility Pool (40 limit)
    // Always show user-added/pinned keywords, even if their score pushes them beyond index 40
    let isInPool = false;
    if (isUserAdded || (item as any).is_pinned) {
        isInPool = true;
    } else if (poolCount < WORKING_POOL_LIMIT) {
        isInPool = true;
        poolCount++;
    }

    return {
      ...(item as any), // Cast to access original properties
      is_selection_ia: isInTopSelection,
      is_current_eval: isInTopSelection ? true : null,
      is_current_pool: isInPool,
    };
  });
}
