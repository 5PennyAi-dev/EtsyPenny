import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261017120000_etsy_export_conflicts.sql'),
  'utf8',
);

describe('Phase 0C export-conflicts migration', () => {
  it('keeps all persisted export statuses accepted by the server', () => {
    for (const status of ['success', 'error', 'conflict', 'partial', 'published_unverified']) {
      expect(migration).toContain(`'${status}'`);
    }
    for (const status of ['pending', 'exported', 'partial', 'error', 'conflict', 'published_unverified']) {
      expect(migration).toContain(`'${status}'`);
    }
  });

  it('makes baselines server-only and export logs read-only for clients', () => {
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE public.etsy_listing_export_baselines FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('REVOKE ALL PRIVILEGES (etsy_listing_row_id, user_id, connection_id, etsy_listing_id');
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE public.etsy_export_logs FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('GRANT SELECT ON TABLE public.etsy_export_logs TO authenticated');
    expect(migration).toContain('DROP POLICY IF EXISTS "Users can insert own export logs"');
    expect(migration).toContain("policy.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')");
  });
});
