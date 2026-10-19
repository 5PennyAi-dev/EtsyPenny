import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks for all pipeline dependencies ──────────────────────────

const SUPABASE_HOLDER_KEY = '__test_supabase_admin_score_etsy__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy(
    {},
    {
      get(_t, prop) {
        const c = (globalThis as any)[SUPABASE_HOLDER_KEY];
        if (!c) throw new Error('test supabase client not set');
        return c[prop as string];
      },
    },
  ),
}));

vi.mock('../../lib/etsy/prepare-etsy-image.js', () => ({
  downloadAndUploadEtsyImage: vi.fn(),
}));

vi.mock('../../lib/etsy/match-product-type.js', () => ({
  matchProductType: vi.fn().mockResolvedValue('pt-1'),
}));

vi.mock('../../lib/etsy/get-or-create-canonical-listing.js', () => ({
  getOrCreateCanonicalEtsyListing: vi.fn(),
}));

vi.mock('../../lib/ai/provider-router.js', () => ({
  runAI: vi.fn(),
}));

vi.mock('../../lib/ai/extract-json.js', () => ({
  extractJson: vi.fn((s: string) => s),
}));

vi.mock('../../lib/logic/analyse-image-logic.js', () => ({
  PROMPT_VISUAL_ANALYST: '{{productType}} {{description}}',
  formatTaxonomyLists: vi.fn(() => ({
    userThemes: [], systemThemes: [], userNiches: [], systemNiches: [],
  })),
  buildVisualAnalysisContext: vi.fn(() => ''),
  buildTaxonomyPrompt: vi.fn(() => 'taxonomy-prompt'),
  mergeAnalysisResults: vi.fn((listingId: string) => ({ listing_id: listingId })),
}));

vi.mock('../../lib/seo/enrich-keywords.js', () => ({
  enrichKeywords: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/seo/score-keywords.js', () => ({
  scoreKeywords: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../lib/seo/select-and-score.js', () => ({
  selectAndScore: vi.fn(() => ({ keywords: [], strength: { listing_strength: 42 } })),
}));

vi.mock('../../lib/seo/persist-seo.js', () => ({
  persistSeo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/seo/run-reset-pool.js', () => ({
  runResetPool: vi.fn().mockResolvedValue(undefined),
}));

import { downloadAndUploadEtsyImage } from '../../lib/etsy/prepare-etsy-image.js';
import { getOrCreateCanonicalEtsyListing } from '../../lib/etsy/get-or-create-canonical-listing.js';
import { runAI } from '../../lib/ai/provider-router.js';
import { scoreKeywords } from '../../lib/seo/score-keywords.js';
import { persistSeo } from '../../lib/seo/persist-seo.js';
import { scoreEtsyListing } from '../../lib/etsy/score-etsy-listing.js';

// ─── Supabase test double ─────────────────────────────────────────────────

function setSupabase(client: any) {
  (globalThis as any)[SUPABASE_HOLDER_KEY] = client;
}

/**
 * Builds a per-test supabase double that records all from()/update()/insert()
 * calls and serves canned responses keyed on (table, action).
 *
 * `responses` shape:
 *   { 'etsy_listings:select': { data: { id, listing_id }, error: null }, ... }
 */
function makeSupabaseSpy(responses: Record<string, { data: unknown; error: unknown }> = {}) {
  const calls: { table: string; op: string; payload?: unknown }[] = [];

  const respond = (key: string) => responses[key] ?? { data: null, error: null };

  const buildChain = (table: string, op: string, payload?: unknown) => {
    calls.push({ table, op, payload });
    const chain: any = {};
    const passthrough = ['select', 'eq', 'order', 'limit', 'in', 'is'];
    for (const m of passthrough) chain[m] = vi.fn(() => chain);
    chain.single = vi.fn(() => Promise.resolve(respond(`${table}:${op}`)));
    chain.maybeSingle = vi.fn(() => Promise.resolve(respond(`${table}:${op}`)));
    chain.then = (res: any, rej?: any) =>
      Promise.resolve(respond(`${table}:${op}`)).then(res, rej);
    return chain;
  };

  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => buildChain(table, 'select')),
      insert: vi.fn((p: unknown) => buildChain(table, 'insert', p)),
      update: vi.fn((p: unknown) => buildChain(table, 'update', p)),
      delete: vi.fn(() => buildChain(table, 'delete')),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return { client, calls };
}

// ─── Globals for fetch (save-image-analysis edge function) ────────────────

const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(''),
  }) as any;

  // runAI returns vision then taxonomy. JSON-parseable.
  vi.mocked(runAI)
    .mockResolvedValueOnce({ text: JSON.stringify({ visual_analysis: {
      aesthetic_style: 'x',
      typography_details: 'No visible text',
      graphic_elements: 'simple graphic',
      color_palette: 'blue — calm',
      target_audience: 'Home Decor Lover',
      overall_vibe: 'A calm decorative product for modern homes',
    } }) } as any)
    .mockResolvedValueOnce({ text: JSON.stringify({ theme: 'T', niche: 'N', sub_niche: 'Buyer Phrase' }) } as any);

  vi.mocked(downloadAndUploadEtsyImage).mockResolvedValue('https://storage/new-image.jpg');
  vi.mocked(getOrCreateCanonicalEtsyListing).mockResolvedValue({
    listingId: 'new-listing-1',
    imageUrl: 'https://storage/new-image.jpg',
    created: true,
  });

  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'test-supabase-secret-key';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────

const baseInput = () => ({
  etsyListing: {
    id: 'etsy-row-1',
    etsy_listing_id: 999,
    original_title: 'Cute Mug',
    original_description: 'desc',
    original_tags: ['tag1', 'tag2'],
    original_image_url: 'https://etsy.com/img.jpg',
    thumbnail_url: 'https://etsy.com/thumb.jpg',
    etsy_category: 'Home & Living',
  },
  userId: 'user-1',
  userSettings: {},
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('scoreEtsyListing — idempotency', () => {
  it('REUSE path: skips insert + image download when listing_id already set', async () => {
    const { client, calls } = makeSupabaseSpy({
      // Idempotency check returns an etsy_listings row already linked.
      'etsy_listings:select': {
        data: { id: 'etsy-row-1', listing_id: 'existing-listing-1' },
        error: null,
      },
      // Existing listings row found.
      'listings:select': {
        data: { id: 'existing-listing-1', image_url: 'https://storage/existing.jpg' },
        error: null,
      },
      // Taxonomy lookups.
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBe('existing-listing-1');
    expect(downloadAndUploadEtsyImage).not.toHaveBeenCalled();

    // No INSERT into listings should have happened.
    const insertCalls = calls.filter((c) => c.table === 'listings' && c.op === 'insert');
    expect(insertCalls).toHaveLength(0);
  });

  it('does not persist image analysis when taxonomy validation fails', async () => {
    const { client } = makeSupabaseSpy({
      'etsy_listings:select': { data: { id: 'etsy-row-1', listing_id: 'existing-listing-1' }, error: null },
      'listings:select': { data: { id: 'existing-listing-1', image_url: 'https://storage/existing.jpg' }, error: null },
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);
    vi.mocked(runAI).mockReset()
      .mockResolvedValueOnce({ text: JSON.stringify({ visual_analysis: {
        aesthetic_style: 'x', typography_details: 'No visible text', graphic_elements: 'simple graphic',
        color_palette: 'blue — calm', target_audience: 'Home Decor Lover', overall_vibe: 'A calm decorative product for modern homes',
      } }) } as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ theme: 'Unknown', niche: 'N', sub_niche: 'Buyer Phrase' }) } as any);

    const result = await scoreEtsyListing(baseInput());

    expect(result.error).toMatch(/unknown theme/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('uses the atomic canonical-listing function when listing_id is null', async () => {
    const { client, calls } = makeSupabaseSpy({
      'etsy_listings:select': {
        data: { id: 'etsy-row-1', listing_id: null },
        error: null,
      },
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBe('new-listing-1');
    expect(downloadAndUploadEtsyImage).toHaveBeenCalledTimes(1);

    expect(getOrCreateCanonicalEtsyListing).toHaveBeenCalledWith({
      etsyListingRowId: 'etsy-row-1',
      userId: 'user-1',
      title: 'Cute Mug',
      imageUrl: 'https://storage/new-image.jpg',
      productTypeId: 'pt-1',
    });
    expect(calls.some((c) => c.table === 'listings' && c.op === 'insert')).toBe(false);
  });

  it('does not silently replace a stale Etsy/PennySEO association', async () => {
    const { client, calls } = makeSupabaseSpy({
      'etsy_listings:select': {
        data: { id: 'etsy-row-1', listing_id: 'ghost-listing' },
        error: null,
      },
      // No listings row found for the ghost id.
      'listings:select': { data: null, error: null },
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(getOrCreateCanonicalEtsyListing).mockRejectedValueOnce(
      new Error('Existing Etsy/PennySEO listing association ghost-listing requires targeted repair'),
    );

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBeNull();
    expect(result.error).toContain('requires targeted repair');
    expect(downloadAndUploadEtsyImage).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Stale FK'));

    expect(getOrCreateCanonicalEtsyListing).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('REUSE path does not call downloadAndUploadEtsyImage', async () => {
    const { client } = makeSupabaseSpy({
      'etsy_listings:select': {
        data: { id: 'etsy-row-1', listing_id: 'existing-listing-1' },
        error: null,
      },
      'listings:select': {
        data: { id: 'existing-listing-1', image_url: 'https://storage/existing.jpg' },
        error: null,
      },
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);

    await scoreEtsyListing(baseInput());

    expect(downloadAndUploadEtsyImage).not.toHaveBeenCalled();
    expect(getOrCreateCanonicalEtsyListing).not.toHaveBeenCalled();
  });

  it('uses the same canonical identity when preparation and scoring race', async () => {
    const { client } = makeSupabaseSpy({
      'etsy_listings:select': { data: { id: 'etsy-row-1', listing_id: null }, error: null },
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);
    vi.mocked(getOrCreateCanonicalEtsyListing).mockResolvedValue({
      listingId: 'canonical-listing', imageUrl: 'https://storage/canonical.jpg', created: false,
    });

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBe('canonical-listing');
    expect(getOrCreateCanonicalEtsyListing).toHaveBeenCalledTimes(1);
  });

  it('does not persist SEO results when keyword scoring fails', async () => {
    const { client, calls } = makeSupabaseSpy({
      'etsy_listings:select': { data: { id: 'etsy-row-1', listing_id: 'existing-listing-1' }, error: null },
      'listings:select': { data: { id: 'existing-listing-1', image_url: 'https://storage/existing.jpg' }, error: null },
      'v_combined_themes:select': { data: [{ id: 'theme', name: 'T', description: null, origin: 'pennyseo' }], error: null },
      'v_combined_niches:select': { data: [{ id: 'niche', name: 'N', description: null, origin: 'pennyseo' }], error: null },
    });
    setSupabase(client);
    vi.mocked(scoreKeywords).mockRejectedValueOnce(Object.assign(new Error('safe scoring failure'), {
      code: 'KEYWORD_SCORING_INCOMPLETE',
    }));

    const result = await scoreEtsyListing(baseInput());

    expect(result.score).toBeNull();
    expect(result.error).toBe('safe scoring failure');
    expect(persistSeo).not.toHaveBeenCalled();
    expect(calls.some(call => call.table === 'etsy_listings' && call.op === 'update' && (call.payload as any)?.scoring_status === 'error')).toBe(true);
  });
});
