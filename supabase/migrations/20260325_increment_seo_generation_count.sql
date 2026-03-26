CREATE OR REPLACE FUNCTION increment_seo_generation_count(listing_id uuid)
RETURNS void AS $$
  UPDATE public.listings
  SET seo_generation_count = COALESCE(seo_generation_count, 0) + 1
  WHERE id = listing_id;
$$ LANGUAGE sql SECURITY DEFINER;
