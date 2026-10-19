-- Phase 1: atomically establish the single PennySEO listing for an imported Etsy row.
-- The Supabase migration history is not yet reconciled. Apply this migration
-- manually in the SQL Editor; do not use `supabase db push`.

-- Do not silently resolve historical duplicate mappings. Stop before creating
-- the guard index so those rows can be reviewed and repaired explicitly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.etsy_listings
    WHERE listing_id IS NOT NULL
    GROUP BY listing_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create the unique Etsy/PennySEO listing guard: historical duplicate listing_id mappings require review';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS etsy_listings_listing_id_unique
  ON public.etsy_listings (listing_id)
  WHERE listing_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_or_create_etsy_canonical_listing(
  p_etsy_listing_row_id uuid,
  p_user_id uuid,
  p_title text,
  p_image_url text DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL
)
RETURNS TABLE (listing_id uuid, image_url text, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_etsy_listing public.etsy_listings%ROWTYPE;
  v_listing public.listings%ROWTYPE;
BEGIN
  -- This lock is intentionally limited to database work. Callers must complete
  -- image, Etsy, and AI work before or after this function, never while locked.
  SELECT *
  INTO v_etsy_listing
  FROM public.etsy_listings AS etsy_listing
  WHERE etsy_listing.id = p_etsy_listing_row_id
    AND etsy_listing.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etsy listing % was not found for the authenticated user', p_etsy_listing_row_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_etsy_listing.listing_id IS NOT NULL THEN
    SELECT *
    INTO v_listing
    FROM public.listings AS listing
    WHERE listing.id = v_etsy_listing.listing_id
      AND listing.user_id = p_user_id;

    IF FOUND THEN
      RETURN QUERY SELECT v_listing.id, v_listing.image_url::text, false;
      RETURN;
    END IF;

    -- Do not silently replace a historical association that is dangling or
    -- belongs to another user. It requires the separately reviewed repair
    -- procedure, preserving export logs and Phase 0C baselines.
    RAISE EXCEPTION 'Existing Etsy/PennySEO listing association % requires targeted repair', v_etsy_listing.listing_id
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.listings (
    user_id,
    title,
    user_description,
    image_url,
    status_id,
    is_image_analysed,
    source,
    product_type_id
  )
  VALUES (
    p_user_id,
    p_title,
    NULL,
    p_image_url,
    'ac083a90-43fa-4ff5-a62d-5cd6bb5edbcc',
    false,
    'etsy',
    p_product_type_id
  )
  RETURNING * INTO v_listing;

  UPDATE public.etsy_listings AS etsy_listing
  SET listing_id = v_listing.id
  WHERE etsy_listing.id = v_etsy_listing.id;

  RETURN QUERY SELECT v_listing.id, v_listing.image_url::text, true;
END;
$$;

-- RPC functions are executable by PUBLIC by default. The application invokes
-- this only through its service-role server client after JWT ownership checks.
REVOKE ALL ON FUNCTION public.get_or_create_etsy_canonical_listing(uuid, uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_etsy_canonical_listing(uuid, uuid, text, text, uuid)
  TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon',
    'public.get_or_create_etsy_canonical_listing(uuid, uuid, text, text, uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated',
      'public.get_or_create_etsy_canonical_listing(uuid, uuid, text, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected client EXECUTE privilege on get_or_create_etsy_canonical_listing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS proc
    CROSS JOIN LATERAL aclexplode(COALESCE(proc.proacl, acldefault('f', proc.proowner))) AS acl
    WHERE proc.oid = 'public.get_or_create_etsy_canonical_listing(uuid, uuid, text, text, uuid)'::regprocedure
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Unexpected PUBLIC EXECUTE privilege on get_or_create_etsy_canonical_listing';
  END IF;

  IF NOT has_function_privilege('service_role',
    'public.get_or_create_etsy_canonical_listing(uuid, uuid, text, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute get_or_create_etsy_canonical_listing';
  END IF;
END $$;
