-- Phase 2C-3A: scoring recommendations are not Etsy publication proposals.
-- Apply manually after reviewing the deployed schema. Do not use supabase db push
-- while local and remote migration histories are not reconciled.

ALTER TABLE public.listing_seo_stats
  ADD COLUMN IF NOT EXISTS is_proposal_selected boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS etsy_proposal_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Existing selections have no trustworthy explicit-user provenance. Leaving the
-- new default false prevents legacy auto-selected tags from becoming publishable.
COMMENT ON COLUMN public.listing_seo_stats.is_proposal_selected IS
  'True only when tags were explicitly saved as an Etsy optimization proposal in Product Studio.';

COMMENT ON COLUMN public.listings.etsy_proposal_fields IS
  'Explicit Studio proposal versions keyed by title, description, and tags. Legacy and scoring-only data use an empty object.';

CREATE INDEX IF NOT EXISTS idx_listing_seo_stats_proposal_selected
  ON public.listing_seo_stats(listing_id)
  WHERE is_proposal_selected = true;
