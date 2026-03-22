-- Remove all mock data (placeholder images only)
-- Safe: only deletes listings with placehold.co images
DELETE FROM listing_seo_stats WHERE listing_id IN (
  SELECT id FROM listings WHERE image_url LIKE '%placehold.co%'
);
DELETE FROM listings_global_eval WHERE listing_id IN (
  SELECT id FROM listings WHERE image_url LIKE '%placehold.co%'
);
DELETE FROM listings WHERE image_url LIKE '%placehold.co%';
