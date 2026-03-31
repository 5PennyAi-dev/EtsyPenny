-- Etsy Category Import: store taxonomy_id and resolved category path
ALTER TABLE public.etsy_listings
  ADD COLUMN IF NOT EXISTS taxonomy_id bigint,
  ADD COLUMN IF NOT EXISTS etsy_category text;
