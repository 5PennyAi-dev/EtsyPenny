-- Phase 2C-3C.2A: durable, server-controlled Etsy preparation state.
-- Apply manually only after reviewing the target database. Do not use db push.

ALTER TABLE public.etsy_listings
  ADD COLUMN IF NOT EXISTS preparation_status text,
  ADD COLUMN IF NOT EXISTS preparation_error text,
  ADD COLUMN IF NOT EXISTS preparation_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS preparation_attempt_id uuid,
  ADD COLUMN IF NOT EXISTS preparation_claim_expires_at timestamptz;

-- Historical rows that already have a valid, owned canonical listing were
-- prepared before this state existed. Preserve that fact without inventing a
-- preparation timestamp. Dangling/cross-user links remain pending so the
-- existing canonical-listing guard can fail closed and request targeted repair.
UPDATE public.etsy_listings AS etsy_listing
SET preparation_status = CASE
  WHEN etsy_listing.listing_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.listings AS listing
      WHERE listing.id = etsy_listing.listing_id
        AND listing.user_id = etsy_listing.user_id
    ) THEN 'prepared'
  ELSE 'pending'
END
WHERE etsy_listing.preparation_status IS NULL;

ALTER TABLE public.etsy_listings
  ALTER COLUMN preparation_status SET DEFAULT 'pending',
  ALTER COLUMN preparation_status SET NOT NULL;

ALTER TABLE public.etsy_listings
  DROP CONSTRAINT IF EXISTS etsy_listings_preparation_status_check,
  ADD CONSTRAINT etsy_listings_preparation_status_check
    CHECK (preparation_status IN ('pending', 'preparing', 'prepared', 'error')),
  DROP CONSTRAINT IF EXISTS etsy_listings_preparation_claim_check,
  ADD CONSTRAINT etsy_listings_preparation_claim_check
    CHECK (
      (preparation_attempt_id IS NULL AND preparation_claim_expires_at IS NULL)
      OR (preparation_attempt_id IS NOT NULL AND preparation_claim_expires_at IS NOT NULL)
    ),
  DROP CONSTRAINT IF EXISTS etsy_listings_preparing_claim_required_check,
  ADD CONSTRAINT etsy_listings_preparing_claim_required_check
    CHECK (
      preparation_status <> 'preparing'
      OR (preparation_attempt_id IS NOT NULL AND preparation_claim_expires_at IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_etsy_listings_preparation_claim_expiry
  ON public.etsy_listings (preparation_claim_expires_at)
  WHERE preparation_status = 'preparing';

-- Preparation mutates a business workflow state. Browser clients may continue
-- to read only their RLS-scoped Etsy rows, but only server code using the
-- service role can claim, finish, or clear a preparation attempt.
REVOKE ALL PRIVILEGES ON TABLE public.etsy_listings FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES (
  id, user_id, connection_id, listing_id, etsy_listing_id,
  original_title, original_description, original_tags, original_image_url,
  thumbnail_url, etsy_url, etsy_state, tag_count, original_score,
  scoring_status, scored_at, imported_at, last_synced_at,
  preparation_status, preparation_error, preparation_failed_at, prepared_at,
  preparation_attempt_id, preparation_claim_expires_at
) ON TABLE public.etsy_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.etsy_listings TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.etsy_listings TO service_role;

DROP POLICY IF EXISTS "Users can insert their own etsy listings" ON public.etsy_listings;
DROP POLICY IF EXISTS "Users can update their own etsy listings" ON public.etsy_listings;

DO $$
DECLARE
  role_name text;
  column_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.etsy_listings'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on public.etsy_listings';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'etsy_listings'
      AND cmd = 'SELECT'
      AND qual LIKE '%auth.uid()%user_id%'
  ) THEN
    RAISE EXCEPTION 'Expected owner SELECT RLS policy is missing on etsy_listings';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(role_name, 'public.etsy_listings',
      'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
      RAISE EXCEPTION 'Unexpected table write privilege for role % on etsy_listings', role_name;
    END IF;

    FOREACH column_name IN ARRAY ARRAY[
      'preparation_status', 'preparation_error', 'preparation_failed_at',
      'prepared_at', 'preparation_attempt_id', 'preparation_claim_expires_at'
    ] LOOP
      IF has_column_privilege(role_name, 'public.etsy_listings', column_name, 'INSERT')
         OR has_column_privilege(role_name, 'public.etsy_listings', column_name, 'UPDATE') THEN
        RAISE EXCEPTION 'Unexpected client write privilege for etsy_listings.%', column_name;
      END IF;
    END LOOP;
  END LOOP;

  IF NOT has_table_privilege('service_role', 'public.etsy_listings', 'SELECT, INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'service_role lacks required access to etsy_listings';
  END IF;
END $$;
