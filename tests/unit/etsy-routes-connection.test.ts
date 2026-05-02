import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const SUPABASE_HOLDER_KEY = '__test_supabase_admin_routes_conn__';

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

vi.mock('../../lib/etsy/get-connection.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/etsy/get-connection.js')>();
  return {
    ...actual,
    getActiveConnection: vi.fn(),
  };
});

vi.mock('../../lib/etsy/etsy-client.js', () => ({
  fetchShopListings: vi.fn(),
  fetchListingsByIds: vi.fn(),
  updateEtsyListing: vi.fn(),
  getSellerTaxonomyNodes: vi.fn(),
}));

import {
  getActiveConnection as mockedGetConnection,
  EtsyConnectionError,
} from '../../lib/etsy/get-connection.js';
import {
  fetchShopListings as mockedFetchShop,
  fetchListingsByIds as mockedFetchByIds,
  updateEtsyListing as mockedUpdateListing,
  getSellerTaxonomyNodes as mockedTaxonomy,
} from '../../lib/etsy/etsy-client.js';

import shopListingsHandler from '../../api/etsy/shop-listings.js';
import importListingsHandler from '../../api/etsy/import-listings.js';
import exportListingsHandler from '../../api/etsy/export-listings.js';

// ─── Test helpers ──────────────────────────────────────────────────────────

function setSupabase(client: any) {
  (globalThis as any)[SUPABASE_HOLDER_KEY] = client;
}

interface MockRes {
  statusCode: number;
  body: any;
  status: (n: number) => MockRes;
  json: (b: any) => MockRes;
}
function makeRes(): MockRes {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(n: number) {
      this.statusCode = n;
      return this;
    },
    json(b: any) {
      this.body = b;
      return this;
    },
  };
  return res;
}

function makeConnectionObj() {
  return {
    id: 'conn-real',
    userId: 'user-1',
    etsyShopId: 12345,
    shopName: 'Shop',
    shopUrl: 'https://etsy.com/shop',
    accessToken: 'AT',
    refreshToken: 'RT',
    tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

/** Minimal supabase mock for routes that touch other tables. */
function makeMinimalSupabase() {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  const insertMock = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [{ id: 'el-1' }], error: null }),
  });
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { etsy_import_limit: 100, subscription_plan: 'free' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: updateMock,
    insert: insertMock,
  };
  // For the count head:true select call.
  (chain.select as any).mockImplementation(() => {
    return Object.assign(Promise.resolve({ count: 0, data: [], error: null }), chain);
  });
  return {
    from: vi.fn(() => chain),
  };
}

beforeEach(() => {
  vi.mocked(mockedGetConnection).mockReset();
  vi.mocked(mockedFetchShop).mockReset();
  vi.mocked(mockedFetchByIds).mockReset();
  vi.mocked(mockedUpdateListing).mockReset();
  vi.mocked(mockedTaxonomy).mockReset();
  setSupabase(makeMinimalSupabase());
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ─── shop-listings ─────────────────────────────────────────────────────────

describe('GET /api/etsy/shop-listings — connection branches', () => {
  function makeReq() {
    return { method: 'GET', query: { user_id: 'user-1', limit: '5' }, headers: {} } as any;
  }

  it('returns 409 NO_ETSY_CONNECTION when no connection exists', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('no row', 'NO_CONNECTION'),
    );
    const res = makeRes();
    await shopListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'NO_ETSY_CONNECTION' });
  });

  it('returns 401 ETSY_REFRESH_FAILED when refresh fails', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('refresh boom', 'REFRESH_FAILED'),
    );
    const res = makeRes();
    await shopListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: 'ETSY_REFRESH_FAILED' });
  });

  it('returns 500 on DB_ERROR', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('db down', 'DB_ERROR'),
    );
    const res = makeRes();
    await shopListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(500);
  });

  it('happy path: forwards the connection to fetchShopListings', async () => {
    const conn = makeConnectionObj();
    vi.mocked(mockedGetConnection).mockResolvedValueOnce(conn);
    vi.mocked(mockedFetchShop).mockResolvedValueOnce({ count: 0, results: [] });

    const res = makeRes();
    await shopListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(200);
    expect(mockedFetchShop).toHaveBeenCalledWith(conn, expect.objectContaining({ limit: 5 }));
  });
});

// ─── import-listings ───────────────────────────────────────────────────────

describe('POST /api/etsy/import-listings — connection branches', () => {
  function makeReq() {
    return {
      method: 'POST',
      query: {},
      headers: {},
      body: { user_id: 'user-1', etsy_listing_ids: [101] },
    } as any;
  }

  it('returns 409 NO_ETSY_CONNECTION', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('no row', 'NO_CONNECTION'),
    );
    const res = makeRes();
    await importListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'NO_ETSY_CONNECTION' });
  });

  it('returns 401 ETSY_REFRESH_FAILED', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('refresh boom', 'REFRESH_FAILED'),
    );
    const res = makeRes();
    await importListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: 'ETSY_REFRESH_FAILED' });
  });

  it('returns 500 on DB_ERROR', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('db down', 'DB_ERROR'),
    );
    const res = makeRes();
    await importListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(500);
  });
});

// ─── export-listings ───────────────────────────────────────────────────────

describe('POST /api/etsy/export-listings — connection branches', () => {
  function makeReq() {
    return {
      method: 'POST',
      query: {},
      headers: {},
      body: {
        user_id: 'user-1',
        listings: [{ etsy_listing_id: 1, listing_id: 'pl-1', fields: ['title'] }],
      },
    } as any;
  }

  it('returns 409 NO_ETSY_CONNECTION', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('no row', 'NO_CONNECTION'),
    );
    const res = makeRes();
    await exportListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'NO_ETSY_CONNECTION' });
  });

  it('returns 401 ETSY_REFRESH_FAILED', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('refresh boom', 'REFRESH_FAILED'),
    );
    const res = makeRes();
    await exportListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: 'ETSY_REFRESH_FAILED' });
  });

  it('returns 500 on DB_ERROR', async () => {
    vi.mocked(mockedGetConnection).mockRejectedValueOnce(
      new EtsyConnectionError('db down', 'DB_ERROR'),
    );
    const res = makeRes();
    await exportListingsHandler(makeReq(), res as any);
    expect(res.statusCode).toBe(500);
  });
});
