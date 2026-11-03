import { beforeEach, describe, expect, it, vi } from 'vitest';

const operations: Array<{ name: string; value?: unknown }> = [];
const response = { data: { id: 'etsy-row' }, error: null };

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const chain: any = {};
      for (const name of ['update', 'eq', 'or', 'select']) {
        chain[name] = vi.fn((value?: unknown) => {
          operations.push({ name, value });
          return chain;
        });
      }
      chain.maybeSingle = vi.fn(async () => response);
      return chain;
    }),
  },
}));

import {
  PREPARATION_CLAIM_MS,
  PreparationClaimLostError,
  claimEtsyListingForPreparation,
  completeEtsyListingPreparation,
  failEtsyListingPreparation,
} from '../../lib/etsy/preparation-state.js';

describe('Etsy preparation claims', () => {
  beforeEach(() => {
    operations.length = 0;
    response.data = { id: 'etsy-row' };
    response.error = null;
  });

  it('claims pending/error work atomically and permits recovery only after expiry', async () => {
    const now = new Date('2026-11-03T12:00:00.000Z');
    const claim = await claimEtsyListingForPreparation('owner', 'etsy-row', now);

    expect(claim?.expiresAt).toBe(new Date(now.getTime() + PREPARATION_CLAIM_MS).toISOString());
    expect(operations).toContainEqual({ name: 'or', value: 'preparation_status.in.(pending,error),and(preparation_status.eq.preparing,preparation_claim_expires_at.lt.2026-11-03T12:00:00.000Z)' });
    expect(operations).toContainEqual(expect.objectContaining({ name: 'update', value: expect.objectContaining({ preparation_status: 'preparing' }) }));
  });

  it('does no external work when the atomic claim is refused', async () => {
    response.data = null;
    await expect(claimEtsyListingForPreparation('owner', 'etsy-row')).resolves.toBeNull();
  });

  it('only the owning attempt can finalize success or error', async () => {
    await completeEtsyListingPreparation('owner', 'etsy-row', 'attempt-1', '2026-11-03T12:00:00.000Z');
    expect(operations.filter((operation) => operation.name === 'eq')).toHaveLength(4);
    expect(operations).toContainEqual(expect.objectContaining({ name: 'update', value: expect.objectContaining({ preparation_status: 'prepared', preparation_error: null }) }));

    operations.length = 0;
    await failEtsyListingPreparation('owner', 'etsy-row', 'attempt-1', 'Safe message', '2026-11-03T12:01:00.000Z');
    expect(operations).toContainEqual(expect.objectContaining({ name: 'update', value: expect.objectContaining({ preparation_status: 'error', preparation_error: 'Safe message' }) }));
  });

  it('rejects a late finalization after a newer attempt owns the row', async () => {
    response.data = null;
    await expect(completeEtsyListingPreparation('owner', 'etsy-row', 'old-attempt')).rejects.toBeInstanceOf(PreparationClaimLostError);
    await expect(failEtsyListingPreparation('owner', 'etsy-row', 'old-attempt', 'Safe message')).rejects.toBeInstanceOf(PreparationClaimLostError);
  });
});
