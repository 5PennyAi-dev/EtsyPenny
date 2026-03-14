-- Migration: Add unique constraint on (listing_id, tag) in listing_seo_stats
-- Since only one mode ('balanced') exists now, a keyword should appear only once per listing.

-- Step 1: Remove duplicates, keeping the most recently created row per (listing_id, tag)
DELETE FROM listing_seo_stats
WHERE id NOT IN (
    SELECT DISTINCT ON (listing_id, tag) id
    FROM listing_seo_stats
    ORDER BY listing_id, tag, created_at DESC NULLS LAST, id DESC
);

-- Step 2: Add unique constraint
ALTER TABLE listing_seo_stats
ADD CONSTRAINT uq_listing_seo_stats_listing_tag UNIQUE (listing_id, tag);
