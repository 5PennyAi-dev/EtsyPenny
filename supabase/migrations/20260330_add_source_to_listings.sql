-- Add source column to track listing origin (manual upload vs Etsy import)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Recreate v_dashboard_listings to include source
DROP VIEW IF EXISTS v_dashboard_listings;

CREATE VIEW v_dashboard_listings AS
  SELECT l.id, l.user_id, l.title, l.image_url, l.theme, l.niche,
         l.created_at, l.updated_at, l.source,
         vs.computed_status,
         ge.listing_strength, ge.listing_visibility, ge.listing_relevance,
         ge.listing_conversion, ge.listing_competition,
         (SELECT count(*) FROM listing_seo_stats s
          WHERE s.listing_id = l.id AND s.is_current_eval = true) AS selected_keywords,
         l.generated_title IS NOT NULL AS has_draft,
         CASE vs.computed_status
           WHEN 'NEW' THEN 1 WHEN 'ANALYZED' THEN 2 WHEN 'SEO_READY' THEN 3
           WHEN 'DRAFT_READY' THEN 4 WHEN 'OPTIMIZED' THEN 5 ELSE NULL
         END AS action_priority
  FROM listings l
  JOIN v_listing_status vs ON vs.id = l.id
  LEFT JOIN listings_global_eval ge ON ge.listing_id = l.id;
