/**
 * TypeScript definitions for the analyse-image API route.
 */

export interface VisualAnalysis {
  aesthetic_style: string;
  typography_details: string;
  graphic_elements: string;
  color_palette: string;
  target_audience: string;
  overall_vibe: string;
}

export interface TaxonomyMapping {
  theme: string;
  niche: string;
  sub_niche: string;
  final_positioning: string;
}

export interface FinalAnalysisOutput {
  listing_id: string;
  output: {
    visual_analysis: VisualAnalysis & {
      theme: string;
      niche: string;
      "sub-niche": string;
    };
  };
}

export interface AnalyzeImagePayload {
    listing_id: string;
    user_id: string;
    mockup_url: string;
    product_type: string;
    client_description: string;
}

export interface TaxonomyItem {
    id: string;
    name: string;
    description: string | null;
    origin: 'custom' | 'pennyseo';
}

// ─── generate-keywords route types ─────────────────────────────────────────────

export interface GenerateKeywordsPayload {
    listing_id: string;
    user_id: string;
    product_type: string;
    theme: string;
    niche: string;
    sub_niche?: string;
    custom_niche?: string;
    client_description?: string;
    visual_aesthetic?: string;
    visual_typography?: string;
    visual_graphics?: string;
    visual_colors?: string;
    visual_target_audience?: string;
    visual_overall_vibe?: string;
    parameters?: SEOParameters;
}

export interface SEOParameters {
    Volume?: number;
    Competition?: number;
    Transaction?: number;
    Niche?: number;
    CPC?: number;
    ai_selection_count?: number;
    working_pool_count?: number;
    concept_diversity_limit?: number;
    evergreen_stability_ratio?: number;
    evergreen_minimum_volume?: number;
    evergreen_avg_volume?: number;
    trending_dropping_threshold?: number;
    trending_current_month_min_volume?: number;
    trending_growth_factor?: number;
    promising_min_score?: number;
    promising_competition?: number;
}

export interface EnrichedKeyword {
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
    fromCache: boolean;
}

export interface ListingStrengthResult {
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
