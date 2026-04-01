import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient, mockSupabaseResponse, resetSupabaseMocks } from '../mocks/supabase.js';

// ── Module mocks (hoisted by Vitest) ─────────────────────
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabaseClient) }));
vi.mock('../../lib/seo/persist-strength.ts', () => ({ persistStrength: vi.fn(async () => {}) }));
vi.mock('../../lib/seo/persist-seo.ts', () => ({ persistSeo: vi.fn(async () => ({})) }));
vi.mock('../../lib/seo/enrich-keywords.ts', () => ({ enrichKeywords: vi.fn(async (kws: string[]) => kws.map(k => ({ keyword: k, search_volume: 5000, competition: 0.4, cpc: 0.8, volume_history: [], fromCache: false }))) }));
vi.mock('../../lib/seo/score-keywords.ts', () => ({ scoreKeywords: vi.fn(async (stats: any[]) => stats.map(s => ({ ...s, niche_score: 7, transactional_score: 7, is_selection_ia: false, is_user_added: false, is_pinned: false }))) }));
vi.mock('../../lib/tokens/token-middleware.ts', () => ({ checkQuota: vi.fn(async () => ({ allowed: true })), incrementQuota: vi.fn(async () => {}), checkTokenBalance: vi.fn(async () => ({ allowed: true, balance: 100 })), deductTokens: vi.fn(async () => ({ success: true })) }));
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
import { LISTING_ID, USER_ID } from './_mock-setup.js';

function makeSelectedKeywords(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    keyword: `selected keyword ${i}`,
    search_volume: 8000 - i * 500,
    competition: 0.3 + i * 0.05,
    cpc: 0.7 + i * 0.1,
    niche_score: 7,
    transactional_score: 7,
  }));
}

describe('POST /api/seo/recalculate-scores', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    // Default mock: listings returns a valid listing with user_id
    mockSupabaseResponse('listings', [{ user_id: USER_ID }]);
    mockSupabaseResponse('v_user_seo_active_settings', [{}]);
    mockSupabaseResponse('listings_global_eval', []);
  });

  it('returns 400 if listing_id is missing', async () => {
    const res = await request(app).post('/api/seo/recalculate-scores').send({ selected_keywords: makeSelectedKeywords() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing listing_id or selected_keywords');
  });

  it('returns 400 if selected_keywords is empty', async () => {
    const res = await request(app).post('/api/seo/recalculate-scores').send({ listing_id: LISTING_ID, selected_keywords: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing listing_id or selected_keywords');
  });

  it('returns 400 if selected_keywords is missing', async () => {
    const res = await request(app).post('/api/seo/recalculate-scores').send({ listing_id: LISTING_ID });
    expect(res.status).toBe(400);
  });

  it('returns 200 with valid payload', async () => {
    const res = await request(app).post('/api/seo/recalculate-scores').send({
      listing_id: LISTING_ID,
      selected_keywords: makeSelectedKeywords(),
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('response includes strength with listing_strength as a number', async () => {
    const res = await request(app).post('/api/seo/recalculate-scores').send({
      listing_id: LISTING_ID,
      selected_keywords: makeSelectedKeywords(),
    });
    expect(res.body.strength).toBeDefined();
    expect(typeof res.body.strength.listing_strength).toBe('number');
    expect(res.body.strength.listing_strength).toBeGreaterThanOrEqual(0);
    expect(res.body.strength.listing_strength).toBeLessThanOrEqual(100);
  });

  it('strength breakdown has all expected scores as numbers', async () => {
    const res = await request(app).post('/api/seo/recalculate-scores').send({
      listing_id: LISTING_ID,
      selected_keywords: makeSelectedKeywords(),
    });
    const b = res.body.strength.breakdown;
    for (const key of ['visibility', 'conversion', 'relevance', 'competition', 'profit']) {
      expect(typeof b[key]).toBe('number');
    }
  });

  it('handles keywords with minimal data gracefully', async () => {
    const minimalKws = [{ keyword: 'minimal test' }];
    const res = await request(app).post('/api/seo/recalculate-scores').send({
      listing_id: LISTING_ID,
      selected_keywords: minimalKws,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
