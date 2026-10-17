import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261017_secure_etsy_shop_connection_permissions.sql'),
  'utf8',
);

describe('Etsy connection permission migration', () => {
  it('revokes table and column privileges from every browser-facing role', () => {
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.etsy_shop_connections\s+FROM PUBLIC, anon, authenticated;/s);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES \([\s\S]*access_token[\s\S]*refresh_token[\s\S]*\) ON TABLE public\.etsy_shop_connections\s+FROM PUBLIC, anon, authenticated;/);
  });

  it('grants authenticated users only the metadata My Shop and Settings read', () => {
    expect(migration).toMatch(/GRANT SELECT \([\s\S]*id,[\s\S]*user_id,[\s\S]*etsy_shop_id,[\s\S]*shop_name,[\s\S]*shop_url,[\s\S]*is_active,[\s\S]*connected_at,[\s\S]*last_synced_at[\s\S]*\) ON TABLE public\.etsy_shop_connections\s+TO authenticated;/);
    expect(migration).not.toMatch(/GRANT SELECT \([\s\S]*access_token[\s\S]*\) ON TABLE public\.etsy_shop_connections\s+TO authenticated;/);
    expect(migration).not.toMatch(/GRANT SELECT \([\s\S]*refresh_token[\s\S]*\) ON TABLE public\.etsy_shop_connections\s+TO authenticated;/);
  });

  it('keeps server access and asserts the resulting effective privileges and RLS', () => {
    expect(migration).toContain('GRANT ALL PRIVILEGES ON TABLE public.etsy_shop_connections TO service_role;');
    expect(migration).toContain("FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP");
    expect(migration).toContain("has_table_privilege(browser_role, 'public.etsy_shop_connections', 'DELETE')");
    expect(migration).toContain("has_column_privilege(browser_role, 'public.etsy_shop_connections', column_name, 'UPDATE')");
    expect(migration).toContain("has_column_privilege(browser_role, 'public.etsy_shop_connections', 'access_token', 'SELECT')");
    expect(migration).toContain("has_column_privilege('anon', 'public.etsy_shop_connections', column_name, 'SELECT')");
    expect(migration).toContain("policyname = 'Users can view their own shop connections'");
    expect(migration).toContain("RAISE EXCEPTION 'RLS is not enabled on public.etsy_shop_connections'");
    expect(migration).toContain('information_schema.view_column_usage AS vcu');
    expect(migration).toContain("vcu.table_schema = 'public'");
    expect(migration).toContain("vcu.table_name = 'etsy_shop_connections'");
    expect(migration).toContain("vcu.column_name IN ('access_token', 'refresh_token')");
    expect(migration).toContain('pg_get_functiondef(p.oid)');
  });
});
