import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261018120000_etsy_canonical_listing.sql'),
  'utf8',
);

describe('Phase 1 canonical Etsy listing migration', () => {
  it('locks the Etsy row and makes the relationship one-to-one', () => {
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS etsy_listings_listing_id_unique');
    expect(migration).toContain('get_or_create_etsy_canonical_listing');
  });

  it('keeps the function server-only and does not alter Phase 0C baselines or export logs', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path = pg_catalog, pg_temp');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
    expect(migration).not.toContain('etsy_listing_export_baselines');
    expect(migration).not.toContain('etsy_export_logs');
  });
});
