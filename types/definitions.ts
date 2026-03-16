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
