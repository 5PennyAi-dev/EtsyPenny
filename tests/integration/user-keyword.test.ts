import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient, mockSupabaseResponse, resetSupabaseMocks } from '../mocks/supabase.js';

// ── Hoisted mock variables (available before vi.mock factories run) ──
const { enrichKeywordsMock, scoreKeywordsMock, checkQuotaMock, incrementQuotaMock } = vi.hoisted(() => ({
  enrichKeywordsMock: vi.fn(async (kws: string[]) => kws.map(k => ({
    keyword: k, search_volume: 5000, competition: 0.45, cpc: 0.85,
    volume_history: [5000, 4800, 4600, 4400, 4200, 4000, 3800, 3600, 3400, 3200, 3000, 2800],
    fromCache: false,
  }))),
  scoreKeywordsMock: vi.fn(async (stats: any[]) => stats.map((s: any) => ({
    ...s, niche_score: 7, transactional_score: 7, is_selection_ia: false, is_user_added: false, is_pinned: false,
  }))),
  checkQuotaMock: vi.fn(async () => ({ allowed: true })),
  incrementQuotaMock: vi.fn(async () => {}),
}));

// ── Module mocks (hoisted by Vitest) ─────────────────────
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabaseClient) }));
vi.mock('../../lib/seo/persist-strength.ts', () => ({ persistStrength: vi.fn(async () => {}) }));
vi.mock('../../lib/seo/persist-seo.ts', () => ({ persistSeo: vi.fn(async () => ({})) }));
vi.mock('../../lib/seo/enrich-keywords.ts', () => ({ enrichKeywords: enrichKeywordsMock }));
vi.mock('../../lib/seo/score-keywords.ts', () => ({ scoreKeywords: scoreKeywordsMock }));
vi.mock('../../lib/tokens/token-middleware.ts', () => ({
  checkQuota: checkQuotaMock,
  incrementQuota: incrementQuotaMock,
  checkTokenBalance: vi.fn(async () => ({ allowed: true, balance: 100 })),
  deductTokens: vi.fn(async () => ({ success: true })),
}));

vi.mock('../../lib/ai/provider-router.ts', () => ({ runAI: vi.fn(async () => ({ text: '{}', usage: { input_tokens: 0, output_tokens: 0 }, model: 'test', provider: 'test' })) }));
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
vi.mock('../../lib/ai/extract-json.ts', () => ({ extractJson: vi.fn((text: string) => text) }));
vi.mock('../../lib/logic/analyse-image-logic.ts', () => ({ PROMPT_VISUAL_ANALYST: '', formatTaxonomyLists: vi.fn(() => ''), buildVisualAnalysisContext: vi.fn(() => ''), buildTaxonomyPrompt: vi.fn(() => ''), mergeAnalysisResults: vi.fn(() => ({})) }));

import { app } from '../../server.mjs';
import request from 'supertest';
import { LISTING_ID, USER_ID, PRODUCT_TYPE_ID, makeListing, makeKeywords } from './_mock-setup.js';

function setupDefaultMocks() {
  mockSupabaseResponse('listings', [makeListing()]);
  mockSupabaseResponse('v_combined_product_types', [{ name: 'Ceramic Mug' }]);
  mockSupabaseResponse('v_user_seo_active_settings', [{}]);
  mockSupabaseResponse('listing_seo_stats', makeKeywords(10));
  mockSupabaseResponse('listings_global_eval', []);
}

describe('POST /api/seo/user-keyword', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    checkQuotaMock.mockResolvedValue({ allowed: true });
  });

  it('returns 400 if listing_id is missing', async () => {
    const res = await request(app).post('/api/seo/user-keyword').send({ user_id: USER_ID, keyword: 'test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing listing_id, user_id, or keyword');
  });

  it('returns 400 if user_id is missing', async () => {
    const res = await request(app).post('/api/seo/user-keyword').send({ listing_id: LISTING_ID, keyword: 'test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing listing_id, user_id, or keyword');
  });

  it('returns 400 if keyword is missing', async () => {
    const res = await request(app).post('/api/seo/user-keyword').send({ listing_id: LISTING_ID, user_id: USER_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing listing_id, user_id, or keyword');
  });

  it('returns 200 with valid payload', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/user-keyword').send({
      listing_id: LISTING_ID,
      user_id: USER_ID,
      keyword: 'handmade pottery mug',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('response keyword has correct flags', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/user-keyword').send({
      listing_id: LISTING_ID,
      user_id: USER_ID,
      keyword: 'handmade pottery mug',
    });
    const kw = res.body.keyword;
    expect(kw.is_user_added).toBe(true);
    expect(kw.is_pinned).toBe(false);
    expect(kw.is_selection_ia).toBe(false);
  });

  it('enrichKeywords is called (DataForSEO enrichment)', async () => {
    setupDefaultMocks();
    await request(app).post('/api/seo/user-keyword').send({
      listing_id: LISTING_ID,
      user_id: USER_ID,
      keyword: 'handmade pottery mug',
    });
    expect(enrichKeywordsMock).toHaveBeenCalledOnce();
    expect(enrichKeywordsMock).toHaveBeenCalledWith(['handmade pottery mug']);
  });

  it('scoreKeywords is called (AI scoring)', async () => {
    setupDefaultMocks();
    await request(app).post('/api/seo/user-keyword').send({
      listing_id: LISTING_ID,
      user_id: USER_ID,
      keyword: 'handmade pottery mug',
    });
    expect(scoreKeywordsMock).toHaveBeenCalled();
  });

  it('returns 402 when quota exceeded', async () => {
    checkQuotaMock.mockResolvedValue({ allowed: false, reason: 'Quota exceeded', used: 10, limit: 10 });
    const res = await request(app).post('/api/seo/user-keyword').send({
      listing_id: LISTING_ID,
      user_id: USER_ID,
      keyword: 'test',
    });
    expect(res.status).toBe(402);
    expect(res.body.error).toBe('Quota exceeded');
  });

  it('response includes listing_strength as a number', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/user-keyword').send({
      listing_id: LISTING_ID,
      user_id: USER_ID,
      keyword: 'handmade pottery mug',
    });
    expect(typeof res.body.listing_strength).toBe('number');
  });
});
