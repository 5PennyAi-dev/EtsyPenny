-- Ensure unique index exists for UPSERT compatibility
CREATE UNIQUE INDEX IF NOT EXISTS listings_global_eval_listing_id_seo_mode_idx 
ON public.listings_global_eval (listing_id, seo_mode);

-- Enable RLS
ALTER TABLE public.listings_global_eval ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy
CREATE POLICY "Enable read access for users based on listing ownership" ON "public"."listings_global_eval"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.listings 
    where listings.id = listings_global_eval.listing_id 
    and listings.user_id = auth.uid()
  )
);

-- 2. INSERT Policy
CREATE POLICY "Enable insert for users based on listing ownership" ON "public"."listings_global_eval"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  exists (
    select 1 from public.listings 
    where listings.id = listings_global_eval.listing_id 
    and listings.user_id = auth.uid()
  )
);

-- 3. UPDATE Policy
CREATE POLICY "Enable update for users based on listing ownership" ON "public"."listings_global_eval"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (
  exists (
    select 1 from public.listings 
    where listings.id = listings_global_eval.listing_id 
    and listings.user_id = auth.uid()
  )
)
WITH CHECK (
  exists (
    select 1 from public.listings 
    where listings.id = listings_global_eval.listing_id 
    and listings.user_id = auth.uid()
  )
);

-- 4. DELETE Policy
CREATE POLICY "Enable delete for users based on listing ownership" ON "public"."listings_global_eval"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  exists (
    select 1 from public.listings 
    where listings.id = listings_global_eval.listing_id 
    and listings.user_id = auth.uid()
  )
);

-- Grant permissions (just in case)
GRANT ALL ON TABLE public.listings_global_eval TO authenticated;
GRANT ALL ON TABLE public.listings_global_eval TO service_role;
