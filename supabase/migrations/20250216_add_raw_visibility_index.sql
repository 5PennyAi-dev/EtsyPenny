-- Add missing column for raw visibility index
ALTER TABLE public.listings_global_eval 
ADD COLUMN IF NOT EXISTS listing_raw_visibility_index INTEGER;
