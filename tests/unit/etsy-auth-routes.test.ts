import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_HOLDER_KEY = '__etsy_auth_test_supabase__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, {
    get(_target, property) {
      const client = (globalThis as Record<string, unknown>)[SUPABASE_HOLDER_KEY] as Record<string, unknown> | undefined;
      if (!client) throw new Error('Supabase test client not configured');
      return client[property as string];
    },
  }),
}));

vi.mock('../../lib/etsy/get-connection.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/etsy/get-connection.js')>()),
  getActiveConnection: vi.fn(),
}));

vi.mock('../../lib/etsy/etsy-client.js', () => ({
  fetchShopListings: vi.fn(),
  fetchListingsByIds: vi.fn(),
  getSellerTaxonomyNodes: vi.fn(),
  updateEtsyListing: vi.fn(),
}));

vi.mock('../../lib/etsy/prepare-etsy-image.js', () => ({ downloadAndUploadEtsyImage: vi.fn() }));
vi.mock('../../lib/etsy/match-product-type.js', () => ({ matchProductType: vi.fn() }));
vi.mock('../../lib/etsy/score-etsy-listing.js', () => ({ scoreEtsyListing: vi.fn() }));
vi.mock('../../lib/tokens/token-middleware.js', () => ({
  checkTokenBalance: vi.fn(),
  deductTokens: vi.fn(),
}));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));

import shopListings from '../../api/etsy/shop-listings.js';
import importListings from '../../api/etsy/import-listings.js';
import scoreListings from '../../api/etsy/score-listings.js';
import prepareListing from '../../api/etsy/prepare-listing.js';
import exportListings from '../../api/etsy/export-listings.js';
import { getActiveConnection } from '../../lib/etsy/get-connection.js';
import { fetchShopListings, updateEtsyListing } from '../../lib/etsy/etsy-client.js';
import { checkTokenBalance } from '../../lib/tokens/token-middleware.js';
import { downloadAndUploadEtsyImage } from '../../lib/etsy/prepare-etsy-image.js';

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function setSupabase(client: unknown) {
  (globalThis as Record<string, unknown>)[SUPABASE_HOLDER_KEY] = client;
}

function makeSupabase(options: { user?: string | null; invalidToken?: boolean } = {}) {
  const ownershipChecks: Array<{ table: string; field: string; value: unknown }> = [];
  const from = vi.fn((table: string) => {
    const filters: Array<{ field: string; value: unknown }> = [];
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((field: string, value: unknown) => {
        filters.push({ field, value });
        ownershipChecks.push({ table, field, value });
        return chain;
      }),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      update: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => {
        const id = filters.find(({ field }) => field === 'id')?.value;
        const userId = filters.find(({ field }) => field === 'user_id')?.value;
        if (table === 'etsy_listings' && id === 'owned-etsy-row' && userId === 'owner') {
          return { data: {
            id: 'owned-etsy-row', etsy_listing_id: 123, listing_id: 'owned-listing',
            original_title: 'Title', original_description: 'Description', original_image_url: null,
            original_tags: [], user_id: 'owner', etsy_category: null,
          }, error: null };
        }
        if (table === 'listings' && id === 'owned-listing' && userId === 'owner') {
          return { data: { generated_title: 'Optimized title', generated_description: 'Optimized description' }, error: null };
        }
        return { data: null, error: null };
      }),
    };
    return chain;
  });

  return {
    ownershipChecks,
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: options.invalidToken ? null : options.user === undefined ? { id: 'owner', email: null } : options.user ? { id: options.user, email: null } : null },
          error: options.invalidToken ? new Error('invalid token') : null,
        })),
      },
      from,
    },
  };
}

const routes = [
  ['shop listings', shopListings, { method: 'GET', query: {} }],
  ['import listings', importListings, { method: 'POST', query: {}, body: { etsy_listing_ids: [1] } }],
  ['score listings', scoreListings, { method: 'POST', query: {}, body: { etsy_listing_ids: ['owned-etsy-row'] } }],
  ['prepare listing', prepareListing, { method: 'POST', query: {}, body: { etsy_listing_id: 'owned-etsy-row' } }],
  ['export listings', exportListings, { method: 'POST', query: {}, body: { listings: [{ etsy_listing_id: 123, listing_id: 'owned-listing', fields: ['title'] }] } }],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  setSupabase(makeSupabase().client);
});

describe('Etsy authenticated routes', () => {
  it.each(routes)('refuses %s without a bearer token before any Etsy action', async (_name, handler, request) => {
    const res = response();
    await handler({ ...request, headers: {} } as any, res as any);
    expect(res.statusCode).toBe(401);
    expect(getActiveConnection).not.toHaveBeenCalled();
    expect(fetchShopListings).not.toHaveBeenCalled();
    expect(updateEtsyListing).not.toHaveBeenCalled();
  });

  it.each(routes)('refuses %s with an invalid bearer token', async (_name, handler, request) => {
    setSupabase(makeSupabase({ invalidToken: true }).client);
    const res = response();
    await handler({ ...request, headers: { authorization: 'Bearer invalid-token' } } as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('uses the JWT owner for a shop request despite a third-party user_id query value', async () => {
    const { client } = makeSupabase();
    setSupabase(client);
    vi.mocked(getActiveConnection).mockResolvedValueOnce({ id: 'connection-owner' } as any);
    vi.mocked(fetchShopListings).mockResolvedValueOnce({ count: 0, results: [] });
    const res = response();

    await shopListings({ method: 'GET', headers: { authorization: 'Bearer valid-token' }, query: { user_id: 'other-user' } } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(getActiveConnection).toHaveBeenCalledWith('owner', expect.anything());
  });

  it('refuses another user’s listing before image work or a token charge', async () => {
    const { client, ownershipChecks } = makeSupabase();
    setSupabase(client);
    const res = response();

    await prepareListing({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: { user_id: 'other-user', etsy_listing_id: 'other-etsy-row' } } as any, res as any);

    expect(res.statusCode).toBe(404);
    expect(ownershipChecks).toContainEqual({ table: 'etsy_listings', field: 'user_id', value: 'owner' });
    expect(downloadAndUploadEtsyImage).not.toHaveBeenCalled();
    expect(checkTokenBalance).not.toHaveBeenCalled();
  });

  it('allows an owned shop resource and keeps external Etsy work scoped to its connection', async () => {
    const { client } = makeSupabase();
    setSupabase(client);
    vi.mocked(getActiveConnection).mockResolvedValueOnce({ id: 'connection-owner' } as any);
    vi.mocked(fetchShopListings).mockResolvedValueOnce({ count: 0, results: [] });
    const res = response();

    await shopListings({ method: 'GET', headers: { authorization: 'Bearer valid-token' }, query: {} } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(fetchShopListings).toHaveBeenCalledWith({ id: 'connection-owner' }, expect.anything());
  });
});
