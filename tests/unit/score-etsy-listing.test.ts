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
import { runAI } from '../../lib/ai/provider-router.js';
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
    .mockResolvedValueOnce({ text: JSON.stringify({ visual_analysis: { aesthetic_style: 'x' } }) } as any)
    .mockResolvedValueOnce({ text: JSON.stringify({ theme: 'T', niche: 'N' }) } as any);

  vi.mocked(downloadAndUploadEtsyImage).mockResolvedValue('https://storage/new-image.jpg');

  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk';
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
      'v_combined_themes:select': { data: [], error: null },
      'v_combined_niches:select': { data: [], error: null },
    });
    setSupabase(client);

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBe('existing-listing-1');
    expect(downloadAndUploadEtsyImage).not.toHaveBeenCalled();

    // No INSERT into listings should have happened.
    const insertCalls = calls.filter((c) => c.table === 'listings' && c.op === 'insert');
    expect(insertCalls).toHaveLength(0);
  });

  it('INSERT path: when listing_id is null, inserts a new row AND links etsy_listings.listing_id', async () => {
    const { client, calls } = makeSupabaseSpy({
      'etsy_listings:select': {
        data: { id: 'etsy-row-1', listing_id: null },
        error: null,
      },
      'listings:insert': { data: { id: 'new-listing-1' }, error: null },
      'v_combined_themes:select': { data: [], error: null },
      'v_combined_niches:select': { data: [], error: null },
    });
    setSupabase(client);

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBe('new-listing-1');
    expect(downloadAndUploadEtsyImage).toHaveBeenCalledTimes(1);

    const listingsInserts = calls.filter((c) => c.table === 'listings' && c.op === 'insert');
    expect(listingsInserts).toHaveLength(1);
    expect(listingsInserts[0].payload).toMatchObject({
      source: 'etsy',
      user_description: null,
      is_image_analysed: false,
    });

    // After insert, etsy_listings should be updated with the new listing_id.
    const linkUpdate = calls.find(
      (c) =>
        c.table === 'etsy_listings' &&
        c.op === 'update' &&
        (c.payload as any)?.listing_id === 'new-listing-1' &&
        (c.payload as any)?.scoring_status === undefined, // only the link update, not the final scoring update
    );
    expect(linkUpdate).toBeTruthy();
  });

  it('Stale FK fallback: listing_id set but listings row missing → falls through to INSERT path', async () => {
    const { client, calls } = makeSupabaseSpy({
      'etsy_listings:select': {
        data: { id: 'etsy-row-1', listing_id: 'ghost-listing' },
        error: null,
      },
      // No listings row found for the ghost id.
      'listings:select': { data: null, error: null },
      'listings:insert': { data: { id: 'new-listing-2' }, error: null },
      'v_combined_themes:select': { data: [], error: null },
      'v_combined_niches:select': { data: [], error: null },
    });
    setSupabase(client);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await scoreEtsyListing(baseInput());

    expect(result.listingId).toBe('new-listing-2');
    expect(downloadAndUploadEtsyImage).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Stale FK'));

    const listingsInserts = calls.filter((c) => c.table === 'listings' && c.op === 'insert');
    expect(listingsInserts).toHaveLength(1);

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
      'v_combined_themes:select': { data: [], error: null },
      'v_combined_niches:select': { data: [], error: null },
    });
    setSupabase(client);

    await scoreEtsyListing(baseInput());

    expect(downloadAndUploadEtsyImage).not.toHaveBeenCalled();
  });
});
