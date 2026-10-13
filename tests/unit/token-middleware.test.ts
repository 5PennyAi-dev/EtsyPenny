import { beforeEach, describe, expect, it, vi } from 'vitest';

const CLIENT_KEY = '__token_middleware_client__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, { get: (_target, property) => (globalThis as any)[CLIENT_KEY][property] }),
}));

import { deductTokens, TokenDeductionError } from '../../lib/tokens/token-middleware.js';

type Outcome = { data?: unknown; error?: Error | null };

function setClient({ update = {}, transaction = {} }: { update?: Outcome; transaction?: Outcome } = {}) {
  const profileRead: any = {
    select: vi.fn(() => profileRead),
    eq: vi.fn(() => profileRead),
    single: vi.fn(async () => ({ data: { tokens_monthly_balance: 3, tokens_bonus_balance: 2 }, error: null })),
  };
  const profileUpdate: any = {
    update: vi.fn(() => profileUpdate),
    eq: vi.fn(() => profileUpdate),
    select: vi.fn(() => profileUpdate),
    maybeSingle: vi.fn(async () => ({
      data: Object.prototype.hasOwnProperty.call(update, 'data') ? update.data : { id: 'user-1' },
      error: update.error ?? null,
    })),
  };
  const transactions = {
    insert: vi.fn(async () => ({ data: null, error: transaction.error ?? null })),
  };
  let profileCalls = 0;
  (globalThis as any)[CLIENT_KEY] = {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return profileCalls++ === 0 ? profileRead : profileUpdate;
      if (table === 'token_transactions') return transactions;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  return { profileUpdate, transactions };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deductTokens', () => {
  it('confirms the profile update and records one successful transaction', async () => {
    const client = setClient();

    await expect(deductTokens('user-1', 'generate_draft', 1, 'listing-1')).resolves.toBeUndefined();

    expect(client.profileUpdate.update).toHaveBeenCalledWith({
      tokens_monthly_balance: 2,
      tokens_bonus_balance: 2,
    });
    expect(client.profileUpdate.maybeSingle).toHaveBeenCalledOnce();
    expect(client.transactions.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'generate_draft', amount: -1, listing_id: 'listing-1', balance_after: 4,
    }));
  });

  it.each([
    ['a Supabase update error', { error: new Error('profile write failed') }],
    ['a zero-row balance update', { data: null }],
  ])('throws for %s and does not create a transaction', async (_label, update) => {
    const client = setClient({ update });

    await expect(deductTokens('user-1', 'generate_draft', 1, 'listing-1')).rejects.toBeInstanceOf(TokenDeductionError);

    expect(client.transactions.insert).not.toHaveBeenCalled();
  });

  it('throws when the transaction insert returns a Supabase error after the balance update', async () => {
    const client = setClient({ transaction: { error: new Error('ledger write failed') } });

    await expect(deductTokens('user-1', 'generate_draft', 1, 'listing-1')).rejects.toBeInstanceOf(TokenDeductionError);

    expect(client.transactions.insert).toHaveBeenCalledOnce();
  });
});
