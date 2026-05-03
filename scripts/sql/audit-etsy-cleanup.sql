-- ================================================================
-- Etsy DB Cleanup Audit
-- Created: 2026-05-02
-- READ-ONLY — no mutations
-- All seven queries below return independent result sets; run top-to-bottom in the Supabase SQL Editor.
-- ================================================================


-- ============ 1. etsy_shop_connections — every row ============
SELECT
  id,
  user_id,
  etsy_shop_id,
  shop_name,
  shop_url,
  is_active,
  connected_at,
  last_synced_at,
  token_expires_at,
  LEFT(access_token, 30) AS access_token_preview,
  LEFT(refresh_token, 30) AS refresh_token_preview
FROM etsy_shop_connections
ORDER BY connected_at ASC;


-- ============ 2. Imported listings count, by connection ============
SELECT
  esc.id AS connection_id,
  esc.user_id,
  esc.shop_name,
  esc.connected_at,
  COUNT(el.id) AS imported_listings_count,
  COUNT(el.id) FILTER (WHERE el.listing_id IS NOT NULL) AS prepared_listings_count,
  COUNT(el.id) FILTER (WHERE el.scoring_status = 'scored') AS scored_count,
  COUNT(el.id) FILTER (WHERE el.export_status = 'exported') AS exported_count
FROM etsy_shop_connections esc
LEFT JOIN etsy_listings el ON el.connection_id = esc.id
GROUP BY esc.id, esc.user_id, esc.shop_name, esc.connected_at
ORDER BY esc.connected_at ASC;


-- ============ 3. Cascade into listings ============
SELECT
  esc.id AS connection_id,
  esc.user_id,
  esc.shop_name,
  esc.connected_at,
  COUNT(DISTINCT l.id) AS linked_listings_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_image_analysed = true) AS analyzed_count,
  COUNT(DISTINCT lse.listing_id) AS with_seo_stats_count,
  COUNT(DISTINCT lge.listing_id) AS with_global_eval_count
FROM etsy_shop_connections esc
LEFT JOIN etsy_listings el ON el.connection_id = esc.id
LEFT JOIN listings l ON l.id = el.listing_id
LEFT JOIN listing_seo_stats lse ON lse.listing_id = l.id
LEFT JOIN listings_global_eval lge ON lge.listing_id = l.id
GROUP BY esc.id, esc.user_id, esc.shop_name, esc.connected_at
ORDER BY esc.connected_at ASC;


-- ============ 4. Export logs by connection ============
SELECT
  esc.id AS connection_id,
  esc.user_id,
  esc.shop_name,
  esc.connected_at,
  COUNT(eel.id) AS export_logs_count,
  COUNT(eel.id) FILTER (WHERE eel.status = 'success') AS successful_exports,
  COUNT(eel.id) FILTER (WHERE eel.status = 'error') AS failed_exports,
  MIN(eel.exported_at) AS first_export,
  MAX(eel.exported_at) AS last_export
FROM etsy_shop_connections esc
LEFT JOIN etsy_listings el ON el.connection_id = esc.id
LEFT JOIN etsy_export_logs eel
  ON eel.etsy_listing_id = el.etsy_listing_id
 AND eel.user_id = esc.user_id
GROUP BY esc.id, esc.user_id, esc.shop_name, esc.connected_at
ORDER BY esc.connected_at ASC;


-- ============ 5. Orphan listings with source='etsy' but no etsy_listings parent ============

-- 5a. Count
SELECT
  COUNT(*) AS orphan_count
FROM listings l
WHERE l.source = 'etsy'
  AND NOT EXISTS (
    SELECT 1 FROM etsy_listings el WHERE el.listing_id = l.id
  );

-- 5b. Sample (up to 10)
SELECT
  l.id,
  l.user_id,
  l.created_at,
  l.title,
  l.is_image_analysed
FROM listings l
WHERE l.source = 'etsy'
  AND NOT EXISTS (
    SELECT 1 FROM etsy_listings el WHERE el.listing_id = l.id
  )
ORDER BY l.created_at ASC
LIMIT 10;


-- ============ 6. etsy_oauth_states summary ============
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE expires_at < now()) AS expired_rows,
  COUNT(*) FILTER (WHERE expires_at >= now()) AS active_rows,
  MIN(created_at) AS oldest_created_at,
  MAX(created_at) AS newest_created_at
FROM etsy_oauth_states;


-- ============ 7. etsy_oauth_states — sample of expired rows ============
SELECT
  id,
  user_id,
  created_at,
  expires_at
FROM etsy_oauth_states
WHERE expires_at < now()
ORDER BY created_at ASC
LIMIT 20;
