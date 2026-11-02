import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261101120000_explicit_etsy_tag_proposals.sql'),
  'utf8',
);

describe('Phase 2C-3A explicit proposal migration', () => {
  it('defaults legacy recommendation and proposal state to not publishable', () => {
    expect(migration).toContain('is_proposal_selected boolean NOT NULL DEFAULT false');
    expect(migration).toContain("etsy_proposal_fields jsonb NOT NULL DEFAULT '{}'::jsonb");
    expect(migration).toContain('Do not use supabase db push');
  });
});
