import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261103120000_etsy_preparation_state.sql'),
  'utf8',
);

describe('Etsy preparation-state migration', () => {
  it('adds durable preparation state and preserves valid historical canonical links without inventing dates', () => {
    expect(migration).toContain("preparation_status IN ('pending', 'preparing', 'prepared', 'error')");
    expect(migration).toContain('preparation_error');
    expect(migration).toContain('preparation_failed_at');
    expect(migration).toContain('prepared_at');
    expect(migration).toContain("THEN 'prepared'");
    expect(migration).not.toMatch(/SET prepared_at\s*=\s*(now\(\)|CURRENT_TIMESTAMP)/i);
  });

  it('makes preparation state server-written while retaining owner-scoped reads', () => {
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE public.etsy_listings FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('GRANT SELECT ON TABLE public.etsy_listings TO authenticated');
    expect(migration).toContain('GRANT ALL PRIVILEGES ON TABLE public.etsy_listings TO service_role');
    expect(migration).toContain('DROP POLICY IF EXISTS "Users can update their own etsy listings"');
  });
});
