-- Prevent browser clients from reading or changing Etsy OAuth credentials.
-- The backend service role remains the only writer and token reader.

REVOKE ALL PRIVILEGES ON TABLE public.etsy_shop_connections
  FROM PUBLIC, anon, authenticated;

-- A prior deployment may have granted privileges at column level. Revoke
-- those explicitly as table-level REVOKE does not remove column grants.
REVOKE ALL PRIVILEGES (
  id,
  user_id,
  etsy_shop_id,
  shop_name,
  shop_url,
  access_token,
  refresh_token,
  token_expires_at,
  is_active,
  connected_at,
  last_synced_at
) ON TABLE public.etsy_shop_connections
  FROM PUBLIC, anon, authenticated;

-- My Shop and Settings read only this connection metadata from the browser.
GRANT SELECT (
  id,
  user_id,
  etsy_shop_id,
  shop_name,
  shop_url,
  is_active,
  connected_at,
  last_synced_at
) ON TABLE public.etsy_shop_connections
  TO authenticated;

-- OAuth exchange, disconnect, imports, exports, and token refresh use the
-- server-only client. Keep that path available independently of RLS.
GRANT ALL PRIVILEGES ON TABLE public.etsy_shop_connections TO service_role;

-- Browser writes are intentionally server-only. Remove policies that could
-- accidentally become reachable if table privileges are broadened later.
DROP POLICY IF EXISTS "Users can insert their own shop connections"
  ON public.etsy_shop_connections;
DROP POLICY IF EXISTS "Users can update their own shop connections"
  ON public.etsy_shop_connections;

-- Fail the migration rather than silently leaving Etsy credentials exposed.
DO $$
DECLARE
  metadata_columns text[] := ARRAY[
    'id',
    'user_id',
    'etsy_shop_id',
    'shop_name',
    'shop_url',
    'is_active',
    'connected_at',
    'last_synced_at'
  ];
  all_columns text[] := ARRAY[
    'id',
    'user_id',
    'etsy_shop_id',
    'shop_name',
    'shop_url',
    'access_token',
    'refresh_token',
    'token_expires_at',
    'is_active',
    'connected_at',
    'last_synced_at'
  ];
  browser_role text;
  column_name text;
  rls_enabled boolean;
BEGIN
  FOREACH column_name IN ARRAY metadata_columns LOOP
    IF NOT has_column_privilege(
      'authenticated',
      'public.etsy_shop_connections',
      column_name,
      'SELECT'
    ) THEN
      RAISE EXCEPTION 'authenticated cannot read required Etsy connection metadata column %', column_name;
    END IF;

    IF has_column_privilege('anon', 'public.etsy_shop_connections', column_name, 'SELECT') THEN
      RAISE EXCEPTION 'anon can read Etsy connection metadata column %', column_name;
    END IF;
  END LOOP;

  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(browser_role, 'public.etsy_shop_connections', 'INSERT')
       OR has_table_privilege(browser_role, 'public.etsy_shop_connections', 'UPDATE')
       OR has_table_privilege(browser_role, 'public.etsy_shop_connections', 'DELETE') THEN
      RAISE EXCEPTION '% retains a table write privilege on etsy_shop_connections', browser_role;
    END IF;

    FOREACH column_name IN ARRAY all_columns LOOP
      IF has_column_privilege(browser_role, 'public.etsy_shop_connections', column_name, 'INSERT')
         OR has_column_privilege(browser_role, 'public.etsy_shop_connections', column_name, 'UPDATE') THEN
        RAISE EXCEPTION '% retains a column write privilege on etsy_shop_connections.%', browser_role, column_name;
      END IF;
    END LOOP;

    IF has_column_privilege(browser_role, 'public.etsy_shop_connections', 'access_token', 'SELECT')
       OR has_column_privilege(browser_role, 'public.etsy_shop_connections', 'refresh_token', 'SELECT') THEN
      RAISE EXCEPTION '% retains read access to Etsy OAuth token columns', browser_role;
    END IF;
  END LOOP;

  SELECT c.relrowsecurity
    INTO rls_enabled
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'etsy_shop_connections';

  IF NOT COALESCE(rls_enabled, false) THEN
    RAISE EXCEPTION 'RLS is not enabled on public.etsy_shop_connections';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'etsy_shop_connections'
       AND policyname = 'Users can view their own shop connections'
       AND cmd = 'SELECT'
       AND qual LIKE '%auth.uid()%user_id%'
  ) THEN
    RAISE EXCEPTION 'the owner SELECT RLS policy is missing or no longer checks auth.uid() = user_id';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.view_column_usage AS vcu
     WHERE vcu.table_schema = 'public'
       AND vcu.table_name = 'etsy_shop_connections'
       AND vcu.column_name IN ('access_token', 'refresh_token')
  ) THEN
    RAISE EXCEPTION 'a view references an Etsy OAuth token column';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND (
         has_function_privilege('anon', p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
       )
       AND pg_get_functiondef(p.oid) ILIKE '%etsy_shop_connections%'
       AND (
         pg_get_functiondef(p.oid) ILIKE '%access_token%'
         OR pg_get_functiondef(p.oid) ILIKE '%refresh_token%'
       )
  ) THEN
    RAISE EXCEPTION 'a browser-executable function references Etsy OAuth token columns';
  END IF;

  IF NOT has_column_privilege('service_role', 'public.etsy_shop_connections', 'access_token', 'SELECT')
     OR NOT has_column_privilege('service_role', 'public.etsy_shop_connections', 'access_token', 'UPDATE')
     OR NOT has_column_privilege('service_role', 'public.etsy_shop_connections', 'refresh_token', 'SELECT')
     OR NOT has_column_privilege('service_role', 'public.etsy_shop_connections', 'refresh_token', 'UPDATE') THEN
    RAISE EXCEPTION 'service_role lacks required Etsy OAuth token access';
  END IF;
END;
$$;
