import { beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { mockSupabaseClient, mockSupabaseResponse, resetSupabaseMocks } from '../mocks/supabase.js';

const runAI = vi.hoisted(() => vi.fn());
const deductTokens = vi.hoisted(() => vi.fn());
const TokenDeductionError = vi.hoisted(() => class TokenDeductionError extends Error {});

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabaseClient) }));
vi.mock('../../lib/tokens/token-middleware.ts', () => ({
  checkQuota: vi.fn(async () => ({ allowed: true })),
  incrementQuota: vi.fn(async () => {}),
  checkTokenBalance: vi.fn(async () => ({ allowed: true, balance: 100, required: 1 })),
  deductTokens,
  TokenDeductionError,
}));
vi.mock('../../lib/ai/provider-router.ts', () => ({ runAI }));
vi.mock('../../lib/seo/persist-strength.ts', () => ({ persistStrength: vi.fn(async () => {}) }));
vi.mock('../../lib/seo/persist-seo.ts', () => ({ persistSeo: vi.fn(async () => ({})) }));
vi.mock('../../lib/seo/enrich-keywords.ts', () => ({ enrichKeywords: vi.fn(async () => []) }));
vi.mock('../../lib/seo/score-keywords.ts', () => ({ scoreKeywords: vi.fn(async () => []) }));
vi.mock('../../lib/stripe/client.ts', () => ({ getStripe: vi.fn(() => ({})), PRICE_TO_PLAN: {}, PRICE_TO_PACK: {}, PLAN_TOKENS: {} }));
vi.mock('../../lib/email/send-email.ts', () => ({ sendEmail: vi.fn(async () => ({})) }));
vi.mock('../../lib/email/templates/welcome.ts', () => ({ welcomeEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/email/templates/subscription-confirmation.ts', () => ({ subscriptionEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/email/templates/token-pack-confirmation.ts', () => ({ tokenPackEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/etsy/etsy-client.ts', () => ({ fetchShopListings: vi.fn(async () => []), fetchListingsByIds: vi.fn(async () => []), updateEtsyListing: vi.fn(async () => ({})), getSellerTaxonomyNodes: vi.fn(async () => new Map()) }));
vi.mock('../../lib/etsy/score-etsy-listing.ts', () => ({ scoreEtsyListing: vi.fn(async () => ({})) }));
vi.mock('../../lib/etsy/prepare-etsy-image.ts', () => ({ downloadAndUploadEtsyImage: vi.fn(async () => '') }));
vi.mock('../../lib/etsy/match-product-type.ts', () => ({ matchProductType: vi.fn(async () => null) }));
vi.mock('../../lib/seo/generate-keyword-pool.ts', () => ({ generateKeywordPool: vi.fn(async () => []) }));

import { app } from '../../server.mjs';

const LISTING_ID = 'listing-1';
const request = supertest(app);

function payload() {
  return {
    listing_id: LISTING_ID,
    keywords: [{ keyword: 'cassette shirt', avg_volume: 100, competition: 0.4, status: {} }],
    product_details: { product_type: 'T-shirt' },
  };
}

beforeEach(() => {
  resetSupabaseMocks();
  vi.clearAllMocks();
  mockSupabaseResponse('listings', [{ id: LISTING_ID, user_id: 'u1u2u3u4-u5u6-7890-abcd-000000000001' }]);
  deductTokens.mockResolvedValue({ success: true });
  runAI.mockResolvedValue({
    text: JSON.stringify({ title: 'Retro cassette tape shirt', description: 'A valid description.' }),
    provider: 'gemini', model: 'gemini-2.5-flash', usage: { input_tokens: 1, output_tokens: 1 },
  });
});

describe('POST /api/seo/generate-draft (Express)', () => {
  it('uses the shared validator, persists, then deducts exactly one token', async () => {
    const res = await request.post('/api/seo/generate-draft').set('Authorization', 'Bearer test-token').send(payload());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, title: 'Retro cassette tape shirt' });
    expect(deductTokens).toHaveBeenCalledOnce();
    expect(deductTokens).toHaveBeenCalledWith('u1u2u3u4-u5u6-7890-abcd-000000000001', 'generate_draft', 1, LISTING_ID);
  });

  it('returns the same safe validation error and does not deduct for invalid Gemini JSON', async () => {
    runAI.mockResolvedValueOnce({ text: JSON.stringify({ title: 'Only a title' }), provider: 'gemini', model: 'gemini-2.5-flash', usage: { input_tokens: 1, output_tokens: 1 } });

    const res = await request.post('/api/seo/generate-draft').set('Authorization', 'Bearer test-token').send(payload());

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'The AI response could not be used. No credit was deducted.' });
    expect(deductTokens).not.toHaveBeenCalled();
  });

  it('returns a controlled non-success response when billing fails after a confirmed save', async () => {
    deductTokens.mockRejectedValueOnce(new TokenDeductionError('transaction insert failed'));

    const res = await request.post('/api/seo/generate-draft').set('Authorization', 'Bearer test-token').send(payload());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'The draft was saved, but billing could not be confirmed. Please contact support before retrying.' });
  });

  it('does not deduct when the Express listing update confirms no affected row', async () => {
    const ownedListing: any = {
      select: vi.fn(() => ownedListing),
      eq: vi.fn(() => ownedListing),
      maybeSingle: vi.fn(async () => ({ data: { id: LISTING_ID }, error: null })),
    };
    const noRowUpdate: any = {
      update: vi.fn(() => noRowUpdate),
      eq: vi.fn(() => noRowUpdate),
      select: vi.fn(() => noRowUpdate),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    let listingCalls = 0;
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table !== 'listings') throw new Error(`Unexpected table ${table}`);
      return listingCalls++ === 0 ? ownedListing : noRowUpdate;
    });

    const res = await request.post('/api/seo/generate-draft').set('Authorization', 'Bearer test-token').send(payload());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'The draft could not be saved. No credit was deducted.' });
    expect(deductTokens).not.toHaveBeenCalled();
  });
});
