export interface Listing {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  generated_title: string | null;
  generated_description: string | null;
  product_type_id: string | null;
  status_id: string | null;
  theme: string | null;
  niche: string | null;
  sub_niche: string | null;
  custom_listing: any; // JSONB
  visual_aesthetic: string | null;
  visual_typography: string | null;
  visual_graphics: string | null;
  visual_colors: string | null;
  visual_target_audience: string | null;
  visual_overall_vibe: string | null;
  competitor_seed: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations (often joined)
  seo_stats?: ListingSeoStat[];
  global_evals?: ListingGlobalEval[];
}

export interface ListingGlobalEval {
  id: string;
  listing_id: string;
  seo_mode: 'broad' | 'balanced' | 'sniper';
  global_strength: number | null;
  status_label: string | null;
  strategic_verdict: string | null;
  improvement_priority: string | null;
  score_explanation: string | null;
  
  listing_visibility: number | null;
  listing_relevance: number | null;
  listing_conversion: number | null;
  listing_strength: number | null;
  listing_raw_visibility_index: number | null;
  
  score_justification_visibility: string | null;
  score_justification_relevance: string | null;
  score_justification_conversion: string | null;
  score_justification_strength: string | null;
  
  improvement_plan_remove: string[] | null;
  improvement_plan_add: string[] | null;
  improvement_plan_primary_action: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ListingSeoStat {
  id: string;
  listing_id: string;
  tag: string;
  search_volume: number | null;
  competition: string | null;
  opportunity_score: number | null;
  volume_history: number[] | null;
  is_trending: boolean;
  is_evergreen: boolean;
  is_promising: boolean;
  insight: string | null;
  is_top: boolean | null;
  transactional_score: number | null;
  intent_label: string | null;
  niche_score: number | null;
  relevance_label: string | null;
  is_competition: boolean;
  created_at: string;
}
