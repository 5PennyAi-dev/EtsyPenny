import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_HOLDER_KEY = '__score_listings_concurrency_supabase__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, {
    get(_target, property) {
      const client = (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY];
      if (!client) throw new Error('Supabase test client not configured');
      return client[property as string];
    },
  }),
}));
vi.mock('../../lib/auth/verify-request-user.js', () => ({
  verifyRequestUser: vi.fn(async () => ({ id: 'owner' })),
  AuthError: class AuthError extends Error { status = 401; },
}));
vi.mock('../../lib/etsy/claim-scoring.js', () => ({ claimScoreableEtsyListingsForScoring: vi.fn() }));
vi.mock('../../lib/etsy/score-etsy-listing.js', () => ({ scoreEtsyListing: vi.fn() }));
vi.mock('../../lib/tokens/token-middleware.js', () => ({
  checkTokenBalance: vi.fn(), deductTokens: vi.fn(),
}));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));

import scoreListings from '../../api/etsy/score-listings.js';
import { claimScoreableEtsyListingsForScoring } from '../../lib/etsy/claim-scoring.js';
import { scoreEtsyListing } from '../../lib/etsy/score-etsy-listing.js';
import { checkTokenBalance, deductTokens } from '../../lib/tokens/token-middleware.js';

const pendingListing = {
  id: 'etsy-row', scoring_status: 'pending', original_tags: [], original_title: 'Otter Shirt',
};

function response() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function setSupabase() {
  const listingsChain: any = {
    in: vi.fn(() => listingsChain),
    eq: vi.fn(() => listingsChain),
    then: (resolve: any, reject?: any) => Promise.resolve({ data: [pendingListing], error: null }).then(resolve, reject),
  };
  (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY] = {
    from: vi.fn((table: string) => {
      if (table === 'etsy_listings') return { select: vi.fn(() => listingsChain) };
      const settingsChain: any = {
        eq: vi.fn(() => settingsChain),
        maybeSingle: vi.fn(async () => ({ data: {}, error: null })),
      };
      return { select: vi.fn(() => settingsChain) };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setSupabase();
  vi.mocked(checkTokenBalance).mockResolvedValue({ allowed: true, balance: 10 } as any);
});

describe('score-listings concurrency', () => {
  it('rejects a request which lost the atomic claim before scoring or charging credits', async () => {
    vi.mocked(claimScoreableEtsyListingsForScoring).mockResolvedValueOnce([] as any);
    const res = response();

    await scoreListings({
      method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_ids: ['etsy-row'] },
    } as any, res as any);

    expect(res.statusCode).toBe(409);
    expect(scoreEtsyListing).not.toHaveBeenCalled();
    expect(deductTokens).not.toHaveBeenCalled();
  });

  it('charges exactly once after the request owns the scoring claim and succeeds', async () => {
    vi.mocked(claimScoreableEtsyListingsForScoring).mockResolvedValueOnce([pendingListing] as any);
    vi.mocked(scoreEtsyListing).mockResolvedValueOnce({
      listingId: 'canonical-listing', etsyListingId: 'etsy-row', score: 66, tagCount: 3, scoredTags: 3,
    });
    const res = response();

    await scoreListings({
      method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_ids: ['etsy-row'] },
    } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(scoreEtsyListing).toHaveBeenCalledTimes(1);
    expect(deductTokens).toHaveBeenCalledTimes(1);
    expect(res.body.tokens_deducted).toBe(3);
  });

  it('allows a failed listing to be claimed for one explicit retry', async () => {
    const failedListing = { ...pendingListing, scoring_status: 'error' };
    const listingsChain: any = {
      in: vi.fn(() => listingsChain),
      eq: vi.fn(() => listingsChain),
      then: (resolve: any, reject?: any) => Promise.resolve({ data: [failedListing], error: null }).then(resolve, reject),
    };
    (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY] = {
      from: vi.fn((table: string) => {
        if (table === 'etsy_listings') return { select: vi.fn(() => listingsChain) };
        const settingsChain: any = { eq: vi.fn(() => settingsChain), maybeSingle: vi.fn(async () => ({ data: {}, error: null })) };
        return { select: vi.fn(() => settingsChain) };
      }),
    };
    vi.mocked(claimScoreableEtsyListingsForScoring).mockResolvedValueOnce([failedListing] as any);
    vi.mocked(scoreEtsyListing).mockResolvedValueOnce({
      listingId: 'canonical-listing', etsyListingId: 'etsy-row', score: 66, tagCount: 3, scoredTags: 3,
    });
    const res = response();

    await scoreListings({
      method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_ids: ['etsy-row'] },
    } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(claimScoreableEtsyListingsForScoring).toHaveBeenCalledWith('owner', ['etsy-row']);
    expect(deductTokens).toHaveBeenCalledTimes(1);
  });
});
