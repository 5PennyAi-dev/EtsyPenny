-- Add new SEO metrics columns to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS listing_strength INTEGER,
ADD COLUMN IF NOT EXISTS listing_visibility INTEGER,
ADD COLUMN IF NOT EXISTS listing_conversion INTEGER,
ADD COLUMN IF NOT EXISTS listing_relevance INTEGER,
ADD COLUMN IF NOT EXISTS listing_raw_visibility_index INTEGER;
