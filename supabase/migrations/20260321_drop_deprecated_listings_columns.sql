-- Drop deprecated columns from listings table.
-- Score data now lives exclusively in listings_global_eval.
-- Taxonomy uses text columns (theme, niche, sub_niche) not ID references.

-- Drop foreign key constraints first (theme_id, niche_id, sub_niche_id reference other tables)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_theme_id_fkey;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_niche_id_fkey;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_sub_niche_id_fkey;

-- Drop deprecated columns
ALTER TABLE listings
  DROP COLUMN IF EXISTS product_type_text,
  DROP COLUMN IF EXISTS theme_id,
  DROP COLUMN IF EXISTS niche_id,
  DROP COLUMN IF EXISTS sub_niche_id,
  DROP COLUMN IF EXISTS strategic_verdict,
  DROP COLUMN IF EXISTS improvement_priority,
  DROP COLUMN IF EXISTS score_explanation,
  DROP COLUMN IF EXISTS competitor_seed,
  DROP COLUMN IF EXISTS listing_strength,
  DROP COLUMN IF EXISTS listing_visibility,
  DROP COLUMN IF EXISTS listing_conversion,
  DROP COLUMN IF EXISTS listing_relevance,
  DROP COLUMN IF EXISTS listing_raw_visibility_index;

-- Also drop the score columns that persist-strength.ts used to write
-- (these are the backend column names for the same data)
ALTER TABLE listings
  DROP COLUMN IF EXISTS visibility_score,
  DROP COLUMN IF EXISTS relevance_score,
  DROP COLUMN IF EXISTS conversion_score,
  DROP COLUMN IF EXISTS competition_score,
  DROP COLUMN IF EXISTS profit_score,
  DROP COLUMN IF EXISTS est_market_reach;
