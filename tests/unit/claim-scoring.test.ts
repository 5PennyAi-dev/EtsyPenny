import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_HOLDER_KEY = '__claim_scoring_supabase__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, {
    get(_target, property) {
      const client = (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY];
      if (!client) throw new Error('Supabase test client not configured');
      return client[property as string];
    },
  }),
}));

import { claimPendingEtsyListingsForScoring } from '../../lib/etsy/claim-scoring.js';

describe('claimPendingEtsyListingsForScoring', () => {
  const operations: Array<{ name: string; value?: unknown }> = [];

  beforeEach(() => {
    operations.length = 0;
    const chain: any = {
      in: vi.fn((field, value) => { operations.push({ name: `in:${field}`, value }); return chain; }),
      eq: vi.fn((field, value) => { operations.push({ name: `eq:${field}`, value }); return chain; }),
      select: vi.fn(() => Promise.resolve({ data: [{ id: 'etsy-row', scoring_status: 'scoring' }], error: null })),
    };
    (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY] = {
      from: vi.fn(() => ({
        update: vi.fn((value) => { operations.push({ name: 'update', value }); return chain; }),
      })),
    };
  });

  it('claims only rows that are still pending in the UPDATE predicate', async () => {
    await expect(claimPendingEtsyListingsForScoring('owner', ['etsy-row']))
      .resolves.toEqual([{ id: 'etsy-row', scoring_status: 'scoring' }]);

    expect(operations).toContainEqual({ name: 'update', value: { scoring_status: 'scoring' } });
    expect(operations).toContainEqual({ name: 'eq:user_id', value: 'owner' });
    expect(operations).toContainEqual({ name: 'eq:scoring_status', value: 'pending' });
  });

  it('does not query when there is nothing to claim', async () => {
    await expect(claimPendingEtsyListingsForScoring('owner', [])).resolves.toEqual([]);
    expect(operations).toEqual([]);
  });
});
