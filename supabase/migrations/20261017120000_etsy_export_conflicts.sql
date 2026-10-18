-- Phase 0C: server-only Etsy export baselines and conflict audit data.
-- The Supabase migration history is not yet reconciled. Apply this migration
-- manually in the SQL Editor, as was done for Phase 0B; do not use db push.

CREATE TABLE IF NOT EXISTS public.etsy_listing_export_baselines (
  etsy_listing_row_id uuid PRIMARY KEY REFERENCES public.etsy_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  connection_id uuid NOT NULL REFERENCES public.etsy_shop_connections(id),
  etsy_listing_id bigint NOT NULL,
  baseline_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  trusted_fields text[] NOT NULL DEFAULT '{}'::text[],
  source text NOT NULL CHECK (source IN ('import', 'post_export', 'user_confirmed')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT etsy_listing_export_baselines_fields_check
    CHECK (trusted_fields <@ ARRAY['title', 'description', 'tags']::text[])
);

CREATE INDEX IF NOT EXISTS idx_etsy_listing_export_baselines_user_connection
  ON public.etsy_listing_export_baselines(user_id, connection_id);

ALTER TABLE public.etsy_listing_export_baselines ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.etsy_listing_export_baselines FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES (etsy_listing_row_id, user_id, connection_id, etsy_listing_id,
  baseline_snapshot, trusted_fields, source, verified_at, created_at, updated_at)
  ON TABLE public.etsy_listing_export_baselines FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.etsy_listing_export_baselines TO service_role;

-- Fail closed if a table- or column-level client grant survives the revocation.
DO $$
DECLARE
  role_name text;
  column_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS cls
    WHERE cls.oid = 'public.etsy_listing_export_baselines'::regclass
      AND cls.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on etsy_listing_export_baselines';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(role_name, 'public.etsy_listing_export_baselines',
      'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
      RAISE EXCEPTION 'Unexpected table privilege for role % on etsy_listing_export_baselines', role_name;
    END IF;

    FOREACH column_name IN ARRAY ARRAY['etsy_listing_row_id', 'user_id', 'connection_id', 'etsy_listing_id',
      'baseline_snapshot', 'trusted_fields', 'source', 'verified_at', 'created_at', 'updated_at'] LOOP
      IF has_column_privilege(role_name, 'public.etsy_listing_export_baselines', column_name, 'SELECT')
        OR has_column_privilege(role_name, 'public.etsy_listing_export_baselines', column_name, 'INSERT')
        OR has_column_privilege(role_name, 'public.etsy_listing_export_baselines', column_name, 'UPDATE')
        OR has_column_privilege(role_name, 'public.etsy_listing_export_baselines', column_name, 'REFERENCES') THEN
        RAISE EXCEPTION 'Unexpected column privilege for role % on etsy_listing_export_baselines.%', role_name, column_name;
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_class AS cls
    CROSS JOIN LATERAL aclexplode(cls.relacl) AS acl
    WHERE cls.oid = 'public.etsy_listing_export_baselines'::regclass
      AND acl.grantee = 0
  ) OR EXISTS (
    SELECT 1
    FROM pg_class AS cls
    JOIN pg_attribute AS attr ON attr.attrelid = cls.oid
    CROSS JOIN LATERAL aclexplode(attr.attacl) AS acl
    WHERE cls.oid = 'public.etsy_listing_export_baselines'::regclass
      AND attr.attnum > 0
      AND NOT attr.attisdropped
      AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'Unexpected PUBLIC privilege on etsy_listing_export_baselines';
  END IF;
END $$;

ALTER TABLE public.etsy_export_logs
  ADD COLUMN IF NOT EXISTS fields_requested text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS baseline_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS remote_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS field_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmed_fields text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preflighted_at timestamptz;

-- Export logs are server-written audit data. Authenticated users retain their
-- existing RLS-scoped read access, but browsers cannot insert, alter or delete
-- log rows. service_role continues to perform application writes.
REVOKE ALL PRIVILEGES ON TABLE public.etsy_export_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES (id, user_id, etsy_listing_id, listing_id, fields_exported,
  snapshot_before, snapshot_after, status, error_message, exported_at, fields_requested,
  baseline_snapshot, remote_snapshot, field_results, confirmed_fields, preflighted_at)
  ON TABLE public.etsy_export_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.etsy_export_logs TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.etsy_export_logs TO service_role;
DROP POLICY IF EXISTS "Users can insert own export logs" ON public.etsy_export_logs;

DO $$
DECLARE
  role_name text;
  column_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS cls
    WHERE cls.oid = 'public.etsy_export_logs'::regclass
      AND cls.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on etsy_export_logs';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'etsy_export_logs'
      AND policy.cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'Expected owner-read RLS policy is missing on etsy_export_logs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'etsy_export_logs'
      AND policy.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) THEN
    RAISE EXCEPTION 'Unexpected client-write RLS policy on etsy_export_logs';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(role_name, 'public.etsy_export_logs',
      'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
      RAISE EXCEPTION 'Unexpected table write privilege for role % on etsy_export_logs', role_name;
    END IF;

    FOR column_name IN
      SELECT attr.attname
      FROM pg_attribute AS attr
      WHERE attr.attrelid = 'public.etsy_export_logs'::regclass
        AND attr.attnum > 0
        AND NOT attr.attisdropped
    LOOP
      IF has_column_privilege(role_name, 'public.etsy_export_logs', column_name, 'INSERT')
        OR has_column_privilege(role_name, 'public.etsy_export_logs', column_name, 'UPDATE')
        OR has_column_privilege(role_name, 'public.etsy_export_logs', column_name, 'REFERENCES') THEN
        RAISE EXCEPTION 'Unexpected column write privilege for role % on etsy_export_logs.%', role_name, column_name;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Constraint names can differ in production because migration history is not
-- reconciled. Remove only CHECK constraints that apply to this status column.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint AS con
    WHERE con.conrelid = 'public.etsy_export_logs'::regclass
      AND con.contype = 'c'
      AND position('status' IN lower(pg_get_constraintdef(con.oid))) > 0
  LOOP
    EXECUTE format('ALTER TABLE public.etsy_export_logs DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;
ALTER TABLE public.etsy_export_logs
  ADD CONSTRAINT etsy_export_logs_status_check
  CHECK (status IN ('success', 'error', 'conflict', 'partial', 'published_unverified'));

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint AS con
    WHERE con.conrelid = 'public.etsy_listings'::regclass
      AND con.contype = 'c'
      AND position('export_status' IN lower(pg_get_constraintdef(con.oid))) > 0
  LOOP
    EXECUTE format('ALTER TABLE public.etsy_listings DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;
ALTER TABLE public.etsy_listings
  ADD CONSTRAINT etsy_listings_export_status_check
  CHECK (export_status IN ('pending', 'exported', 'partial', 'error', 'conflict', 'published_unverified'));

CREATE INDEX IF NOT EXISTS idx_etsy_export_logs_listing_preflight
  ON public.etsy_export_logs(etsy_listing_id, preflighted_at DESC);
