import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  fetchShopListings,
  fetchListingsByIds,
  updateEtsyListing,
  getSellerTaxonomyNodes,
  getXApiKey,
} from '../../lib/etsy/etsy-client.js';
import type { EtsyConnection } from '../../lib/etsy/get-connection.js';

function makeConnection(overrides: Partial<EtsyConnection> = {}): EtsyConnection {
  return {
    id: 'test-conn-id',
    userId: 'test-user',
    etsyShopId: 12345,
    shopName: 'Test Shop',
    shopUrl: 'https://test.etsy.com',
    accessToken: 'test-access',
    refreshToken: 'test-refresh',
    tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('ETSY_API_KEY', 'test-key');
  vi.stubEnv('ETSY_SHARED_SECRET', 'test-secret');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>;
}

function lastFetchCall() {
  const m = fetchMock();
  expect(m).toHaveBeenCalled();
  return m.mock.calls[m.mock.calls.length - 1] as [string, RequestInit];
}

function jsonRes(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── getXApiKey ────────────────────────────────────────────────────────────

describe('getXApiKey', () => {
  it('returns "key:secret" from env', () => {
    expect(getXApiKey()).toBe('test-key:test-secret');
  });

  it('throws when env vars missing', () => {
    vi.stubEnv('ETSY_API_KEY', '');
    expect(() => getXApiKey()).toThrow(/Missing/);
  });
});

// ─── fetchShopListings ─────────────────────────────────────────────────────

describe('fetchShopListings', () => {
  it('happy path: passes shopId, x-api-key, and Bearer token', async () => {
    fetchMock().mockResolvedValueOnce(jsonRes({ count: 0, results: [] }));
    const conn = makeConnection({ etsyShopId: 99887 });

    await fetchShopListings(conn, { limit: 10, offset: 5, state: 'active' });

    const [url, init] = lastFetchCall();
    expect(url).toContain('/shops/99887/listings');
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=5');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key:test-secret');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-access');
  });

  it('throws on 401 with body in message (no retry)', async () => {
    fetchMock().mockResolvedValueOnce(new Response('expired token', { status: 401 }));
    const conn = makeConnection();

    const err = await fetchShopListings(conn, {}).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/401/);
    expect(err.message).toMatch(/expired token/);
    // Single underlying fetch call — proves no retry-with-refresh.
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });
});

// ─── fetchListingsByIds ────────────────────────────────────────────────────

describe('fetchListingsByIds', () => {
  it('returns empty array for empty input without calling fetch', async () => {
    const result = await fetchListingsByIds(makeConnection(), []);
    expect(result).toEqual([]);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('happy path: builds the batch URL with comma-separated IDs', async () => {
    fetchMock().mockResolvedValueOnce(jsonRes({ results: [{ listing_id: 1, title: 'a', description: '', tags: [], url: '', state: 'active' }] }));
    const conn = makeConnection();

    const result = await fetchListingsByIds(conn, [1, 2, 3]);

    const [url, init] = lastFetchCall();
    expect(url).toContain('/listings/batch?listing_ids=1,2,3');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-access');
    expect(result).toHaveLength(1);
  });

  it('throws on 401', async () => {
    fetchMock().mockResolvedValueOnce(new Response('bad token', { status: 401 }));
    await expect(fetchListingsByIds(makeConnection(), [1])).rejects.toThrow(/401/);
  });
});

// ─── updateEtsyListing ─────────────────────────────────────────────────────

describe('updateEtsyListing', () => {
  it('PATCH with form-urlencoded body containing only the requested fields', async () => {
    fetchMock().mockResolvedValueOnce(jsonRes({ ok: true }));
    const conn = makeConnection({ etsyShopId: 555 });

    const result = await updateEtsyListing(conn, 42, { title: 'Hello', tags: ['a', 'b'] });

    expect(result.success).toBe(true);
    const [url, init] = lastFetchCall();
    expect(url).toContain('/shops/555/listings/42');
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-access');

    const body = init.body as URLSearchParams;
    expect(body.get('title')).toBe('Hello');
    expect(body.get('tags')).toBe('a,b');
    expect(body.has('description')).toBe(false);
  });

  it('returns success:false (does not throw) when title exceeds 140 chars', async () => {
    const conn = makeConnection();
    const result = await updateEtsyListing(conn, 1, { title: 'x'.repeat(141) });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Title exceeds/);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('returns success:false on 401 (caller-tolerant: error captured in result)', async () => {
    fetchMock().mockResolvedValueOnce(new Response('boom', { status: 401 }));
    const result = await updateEtsyListing(makeConnection(), 1, { title: 'ok' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/401/);
  });
});

// ─── getSellerTaxonomyNodes ────────────────────────────────────────────────

describe('getSellerTaxonomyNodes', () => {
  it('flattens nested taxonomy nodes into a path map', async () => {
    fetchMock().mockResolvedValueOnce(
      jsonRes({
        count: 2,
        results: [
          {
            id: 1,
            name: 'Home',
            children: [{ id: 2, name: 'Decor', children: [] }],
          },
        ],
      }),
    );
    const conn = makeConnection();
    const map = await getSellerTaxonomyNodes(conn);

    // After this test the 1h cache will hold these entries — that's fine for
    // a single run, but resetting between describe blocks would require a
    // module-level reset which is out of scope.
    expect(map.get(1)).toBe('Home');
    expect(map.get(2)).toBe('Home > Decor');

    const [url, init] = lastFetchCall();
    expect(url).toContain('/seller-taxonomy/nodes');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-access');
  });
});
