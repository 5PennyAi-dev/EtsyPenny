import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient, mockSupabaseResponse, resetSupabaseMocks } from '../mocks/supabase.js';

// ── Module mocks (hoisted by Vitest) ─────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));
vi.mock('../../lib/seo/persist-strength.ts', () => ({
  persistStrength: vi.fn(async () => {}),
}));
vi.mock('../../lib/seo/persist-seo.ts', () => ({
  persistSeo: vi.fn(async () => ({})),
}));
vi.mock('../../lib/seo/enrich-keywords.ts', () => ({
  enrichKeywords: vi.fn(async (kws: string[]) => kws.map(k => ({ keyword: k, search_volume: 5000, competition: 0.4, cpc: 0.8, volume_history: [], fromCache: false }))),
}));
vi.mock('../../lib/seo/score-keywords.ts', () => ({
  scoreKeywords: vi.fn(async (stats: any[]) => stats.map(s => ({ ...s, niche_score: 7, transactional_score: 7, is_selection_ia: false, is_user_added: false, is_pinned: false }))),
}));
vi.mock('../../lib/tokens/token-middleware.ts', () => ({
  checkQuota: vi.fn(async () => ({ allowed: true })),
  incrementQuota: vi.fn(async () => {}),
  checkTokenBalance: vi.fn(async () => ({ allowed: true, balance: 100 })),
  deductTokens: vi.fn(async () => ({ success: true })),
}));
vi.mock('../../lib/ai/provider-router.ts', () => ({
  runAI: vi.fn(async () => ({ text: '{}', usage: { input_tokens: 0, output_tokens: 0 }, model: 'test', provider: 'test' })),
}));
vi.mock('../../lib/stripe/client.ts', () => ({
  getStripe: vi.fn(() => ({})),
  PRICE_TO_PLAN: {},
  PRICE_TO_PACK: {},
  PLAN_TOKENS: {},
}));
vi.mock('../../lib/email/send-email.ts', () => ({
  sendEmail: vi.fn(async () => ({})),
}));
vi.mock('../../lib/email/templates/welcome.ts', () => ({ welcomeEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/email/templates/subscription-confirmation.ts', () => ({ subscriptionEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/email/templates/token-pack-confirmation.ts', () => ({ tokenPackEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/etsy/etsy-client.ts', () => ({
  fetchShopListings: vi.fn(async () => []),
  fetchListingsByIds: vi.fn(async () => []),
  updateEtsyListing: vi.fn(async () => ({})),
  getSellerTaxonomyNodes: vi.fn(async () => new Map()),
}));
vi.mock('../../lib/etsy/score-etsy-listing.ts', () => ({ scoreEtsyListing: vi.fn(async () => ({})) }));
vi.mock('../../lib/etsy/prepare-etsy-image.ts', () => ({ downloadAndUploadEtsyImage: vi.fn(async () => '') }));
vi.mock('../../lib/etsy/match-product-type.ts', () => ({ matchProductType: vi.fn(async () => null) }));
vi.mock('../../lib/seo/generate-keyword-pool.ts', () => ({ generateKeywordPool: vi.fn(async () => []) }));
vi.mock('../../lib/ai/extract-json.ts', () => ({ extractJson: vi.fn((text: string) => text) }));
vi.mock('../../lib/logic/analyse-image-logic.ts', () => ({
  PROMPT_VISUAL_ANALYST: '',
  formatTaxonomyLists: vi.fn(() => ''),
  buildVisualAnalysisContext: vi.fn(() => ''),
  buildTaxonomyPrompt: vi.fn(() => ''),
  mergeAnalysisResults: vi.fn(() => ({})),
}));

// ── Import app AFTER mocks ───────────────────────────────
import { app } from '../../server.mjs';
import request from 'supertest';

// ── Test data ────────────────────────────────────────────
const LISTING_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const USER_ID = 'u1u2u3u4-u5u6-7890-abcd-000000000001';
const PRODUCT_TYPE_ID = 'pt-0001-0000-0000-000000000001';

function makeKeywords(count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    id: `kw-${i}`,
    listing_id: LISTING_ID,
    tag: `test keyword ${i}`,
    keyword: `test keyword ${i}`,
    search_volume: 10000 - i * 300,
    competition: (0.2 + i * 0.03).toString(),
    cpc: 0.5 + i * 0.05,
    niche_score: 7,
    transactional_score: 7,
    volume_history: [10000 - i * 300, 9500, 9000, 8500, 8000, 7500, 7000, 6500, 6000, 5500, 5000, 4500],
    is_pinned: i === 0,
    is_user_added: i === 1,
    is_selection_ia: false,
    is_current_pool: true,
    is_current_eval: false,
    is_competition: false,
  }));
}

function setupDefaultMocks() {
  mockSupabaseResponse('listing_seo_stats', makeKeywords());
  mockSupabaseResponse('listings', [{ user_id: USER_ID, product_type_id: PRODUCT_TYPE_ID }]);
  mockSupabaseResponse('v_combined_product_types', [{ name: 'Ceramic Mug' }]);
  mockSupabaseResponse('v_user_seo_active_settings', [{}]); // Use defaults
}

describe('POST /api/seo/reset-pool', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  it('returns 400 if listing_id is missing', async () => {
    const res = await request(app).post('/api/seo/reset-pool').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing listing_id');
  });

  it('returns 404 if no keywords found for listing', async () => {
    mockSupabaseResponse('listing_seo_stats', []);
    const res = await request(app).post('/api/seo/reset-pool').send({ listing_id: LISTING_ID });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No keywords found for this listing');
  });

  it('returns 200 with valid payload', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/reset-pool').send({ listing_id: LISTING_ID });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('response includes processed count and top_selections', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/reset-pool').send({ listing_id: LISTING_ID });
    expect(typeof res.body.processed).toBe('number');
    expect(res.body.processed).toBeGreaterThan(0);
    expect(typeof res.body.top_selections).toBe('number');
  });

  it('response includes strength with listing_strength as a number', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/reset-pool').send({ listing_id: LISTING_ID });
    expect(res.body.strength).toBeDefined();
    expect(typeof res.body.strength.listing_strength).toBe('number');
  });

  it('strength contains breakdown scores', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/reset-pool').send({ listing_id: LISTING_ID });
    const b = res.body.strength.breakdown;
    expect(b).toBeDefined();
    expect(typeof b.visibility).toBe('number');
    expect(typeof b.conversion).toBe('number');
    expect(typeof b.relevance).toBe('number');
    expect(typeof b.competition).toBe('number');
    expect(typeof b.profit).toBe('number');
  });

  it('accepts strategy parameters override', async () => {
    setupDefaultMocks();
    const res = await request(app).post('/api/seo/reset-pool').send({
      listing_id: LISTING_ID,
      parameters: { Volume: 0.5, Competition: 0.3 },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
