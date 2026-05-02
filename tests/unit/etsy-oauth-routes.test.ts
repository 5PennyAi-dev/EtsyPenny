import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted via vi.mock) ─────────────────────────────────────────

// Shared holder so each test can swap the underlying client. The mock factory
// is hoisted, so we read globalThis at access time.
const SUPABASE_HOLDER_KEY = '__test_supabase_admin__';

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

vi.mock('../../lib/etsy/oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/etsy/oauth.js')>();
  return {
    ...actual,
    exchangeCodeForTokens: vi.fn(),
  };
});

import { exchangeCodeForTokens as mockedExchange } from '../../lib/etsy/oauth.js';

import authorizeHandler from '../../api/etsy/oauth/authorize.js';
import exchangeHandler from '../../api/etsy/oauth/exchange.js';
import disconnectHandler from '../../api/etsy/oauth/disconnect.js';

// ─── Test helpers ────────────────────────────────────────────────────────

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

function makeReq(method: string, opts: { authorization?: string; body?: any } = {}) {
  return {
    method,
    headers: opts.authorization ? { authorization: opts.authorization } : {},
    body: opts.body,
  } as any;
}

/**
 * Builds a chainable Supabase mock. `tableConfigs` defines per-table behavior.
 * Supports: select().eq().eq()...maybeSingle() | .single() | .select() awaitable,
 *           insert(...).select().single() | bare insert,
 *           update(...).eq().eq().select() | .eq() awaitable,
 *           delete().eq() awaitable.
 */
type Awaitable<T> = T | Promise<T>;
interface TableHandlers {
  select?: () => Awaitable<{ data: any; error: any }>; // terminal default for select chain
  maybeSingle?: () => Awaitable<{ data: any; error: any }>; // for select -> maybeSingle
  single?: () => Awaitable<{ data: any; error: any }>;
  insert?: (payload: any) => { select?: any; single?: any; result?: Awaitable<{ data: any; error: any }> };
  update?: (payload: any) => Awaitable<{ data: any; error: any }>;
  delete?: () => Awaitable<{ data: any; error: any }>;
  /**
   * Sequence of select calls. Each entry maps a key (e.g. 'state' for the lookup
   * by state, 'existing' for connection lookup) to a result. We pick by call order.
   */
  selectSequence?: Array<{ data: any; error: any }>;
  /** Sequence of update calls in order of invocation. */
  updateSequence?: Array<{ data: any; error: any }>;
  /** Sequence of insert calls in order. */
  insertSequence?: Array<{ data: any; error: any }>;
}

function makeSupabaseClient(tables: Record<string, TableHandlers>) {
  const insertCalls: Array<{ table: string; payload: any }> = [];
  const updateCalls: Array<{ table: string; payload: any }> = [];
  const deleteCalls: Array<{ table: string }> = [];
  const tableCounters: Record<string, { select: number; update: number; insert: number }> = {};

  function bumpCounter(table: string, k: 'select' | 'update' | 'insert') {
    tableCounters[table] = tableCounters[table] ?? { select: 0, update: 0, insert: 0 };
    return tableCounters[table][k]++;
  }

  function buildSelectChain(table: string, handlers: TableHandlers) {
    // The select chain accumulates .eq()/.order()/.limit() calls and resolves
    // either via .maybeSingle(), .single(), or by being awaited directly.
    const idx = bumpCounter(table, 'select');
    const seqResult = handlers.selectSequence?.[idx];

    const chain: any = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn(() => {
      const r = seqResult ?? (handlers.maybeSingle ? handlers.maybeSingle() : { data: null, error: null });
      return Promise.resolve(r);
    });
    chain.single = vi.fn(() => {
      const r = seqResult ?? (handlers.single ? handlers.single() : { data: null, error: null });
      return Promise.resolve(r);
    });
    // Awaitable directly — used by `update(...).eq().select()` shape (we attach `then` lazily on the update chain).
    return chain;
  }

  function buildUpdateChain(table: string, handlers: TableHandlers, payload: any) {
    const idx = bumpCounter(table, 'update');
    const seqResult = handlers.updateSequence?.[idx];
    updateCalls.push({ table, payload });

    const chain: any = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    // Make chain awaitable
    chain.then = (onF: any, onR?: any) => {
      const result = seqResult ?? (handlers.update ? handlers.update(payload) : { data: null, error: null });
      return Promise.resolve(result).then(onF, onR);
    };
    return chain;
  }

  function buildInsertChain(table: string, handlers: TableHandlers, payload: any) {
    const idx = bumpCounter(table, 'insert');
    const seqResult = handlers.insertSequence?.[idx];
    insertCalls.push({ table, payload });

    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn(() => {
      const r = seqResult ?? { data: null, error: null };
      return Promise.resolve(r);
    });
    chain.then = (onF: any, onR?: any) => {
      const r = seqResult ?? { data: null, error: null };
      return Promise.resolve(r).then(onF, onR);
    };
    return chain;
  }

  function buildDeleteChain(table: string, handlers: TableHandlers) {
    deleteCalls.push({ table });
    const chain: any = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.then = (onF: any, onR?: any) => {
      const r = handlers.delete ? handlers.delete() : { data: null, error: null };
      return Promise.resolve(r).then(onF, onR);
    };
    return chain;
  }

  const from = vi.fn((table: string) => {
    const handlers = tables[table] ?? {};
    return {
      select: vi.fn().mockImplementation(() => buildSelectChain(table, handlers)),
      insert: vi.fn().mockImplementation((payload: any) => buildInsertChain(table, handlers, payload)),
      update: vi.fn().mockImplementation((payload: any) => buildUpdateChain(table, handlers, payload)),
      delete: vi.fn().mockImplementation(() => buildDeleteChain(table, handlers)),
    };
  });

  return {
    client: {
      from,
      auth: {
        getUser: vi.fn(),
      },
    } as any,
    insertCalls,
    updateCalls,
    deleteCalls,
  };
}

// ─── authorize ─────────────────────────────────────────────────────────────

describe('POST /api/etsy/oauth/authorize', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'cid';
    process.env.ETSY_OAUTH_REDIRECT_URI = 'https://pennyseo.ai/etsy/callback';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when no Authorization header', async () => {
    const { client } = makeSupabaseClient({});
    setSupabase(client);
    const res = makeRes();
    await authorizeHandler(makeReq('POST'), res as any);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Authorization/i);
  });

  it('returns 401 when JWT verification fails', async () => {
    const { client } = makeSupabaseClient({});
    client.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    setSupabase(client);
    const res = makeRes();
    await authorizeHandler(makeReq('POST', { authorization: 'Bearer bad' }), res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 when ETSY_API_KEY env var is missing', async () => {
    delete process.env.ETSY_API_KEY;
    const { client } = makeSupabaseClient({});
    client.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'e@x' } }, error: null });
    setSupabase(client);
    const res = makeRes();
    await authorizeHandler(makeReq('POST', { authorization: 'Bearer ok' }), res as any);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it('returns 500 when ETSY_OAUTH_REDIRECT_URI env var is missing', async () => {
    delete process.env.ETSY_OAUTH_REDIRECT_URI;
    const { client } = makeSupabaseClient({});
    client.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'e@x' } }, error: null });
    setSupabase(client);
    const res = makeRes();
    await authorizeHandler(makeReq('POST', { authorization: 'Bearer ok' }), res as any);
    expect(res.statusCode).toBe(500);
  });

  it('happy path: returns 200 with auth URL and inserts a state row', async () => {
    const { client, insertCalls } = makeSupabaseClient({
      etsy_oauth_states: {
        insertSequence: [{ data: null, error: null }],
      },
    });
    client.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-abc', email: null } }, error: null });
    setSupabase(client);

    const res = makeRes();
    await authorizeHandler(makeReq('POST', { authorization: 'Bearer ok' }), res as any);

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.url).toBe('string');
    expect(res.body.url.startsWith('https://www.etsy.com/oauth/connect')).toBe(true);

    const u = new URL(res.body.url);
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('scope')).toBe('listings_r listings_w shops_r');
    const state = u.searchParams.get('state');
    expect(state).toBeTruthy();

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe('etsy_oauth_states');
    expect(insertCalls[0].payload.user_id).toBe('user-abc');
    expect(insertCalls[0].payload.state).toBe(state);
    expect(insertCalls[0].payload.scopes).toBe('listings_r listings_w shops_r');
    expect(insertCalls[0].payload.redirect_uri).toBe('https://pennyseo.ai/etsy/callback');
    expect(typeof insertCalls[0].payload.code_verifier).toBe('string');
  });
});

// ─── exchange ──────────────────────────────────────────────────────────────

describe('POST /api/etsy/oauth/exchange', () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = 'cid';
    process.env.ETSY_OAUTH_REDIRECT_URI = 'https://pennyseo.ai/etsy/callback';
    vi.mocked(mockedExchange).mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function authedClient(supabase: any) {
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'e@x' } },
      error: null,
    });
  }

  it('returns 400 if code or state missing', async () => {
    const { client } = makeSupabaseClient({});
    authedClient(client);
    setSupabase(client);
    const res = makeRes();
    await exchangeHandler(makeReq('POST', { authorization: 'Bearer ok', body: {} }), res as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 if state row not found', async () => {
    const { client } = makeSupabaseClient({
      etsy_oauth_states: { selectSequence: [{ data: null, error: null }] },
    });
    authedClient(client);
    setSupabase(client);
    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid or already used state/i);
  });

  it('returns 400 if state row expired', async () => {
    const { client } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'user-1',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() - 1000).toISOString(),
            },
            error: null,
          },
        ],
      },
    });
    authedClient(client);
    setSupabase(client);
    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 403 if state row belongs to different user', async () => {
    const { client } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'other-user',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            },
            error: null,
          },
        ],
      },
    });
    authedClient(client);
    setSupabase(client);
    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );
    expect(res.statusCode).toBe(403);
  });

  it('returns 502 if exchangeCodeForTokens rejects', async () => {
    const { client } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'user-1',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
          },
        ],
        delete: () => ({ data: null, error: null }),
      },
    });
    authedClient(client);
    setSupabase(client);
    vi.mocked(mockedExchange).mockRejectedValueOnce(new Error('etsy down'));

    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toMatch(/token exchange failed/i);
  });

  it('returns 422 if Etsy /users/{id}/shops returns empty', async () => {
    const { client } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'user-1',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
          },
        ],
        delete: () => ({ data: null, error: null }),
      },
    });
    authedClient(client);
    setSupabase(client);
    vi.mocked(mockedExchange).mockResolvedValueOnce({
      accessToken: '12345.tokenstr',
      refreshToken: 'rt',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }),
    );

    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );
    expect(res.statusCode).toBe(422);
  });

  it('happy path (no existing connection): inserts new connection, returns 200', async () => {
    const { client, insertCalls } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'user-1',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
          },
        ],
        delete: () => ({ data: null, error: null }),
      },
      etsy_shop_connections: {
        // 1st update = deactivate-all step (no rows). 2nd update never called in this path.
        updateSequence: [{ data: [], error: null }],
        // 1st select = lookup of existing connection by (user_id, etsy_shop_id) → none
        selectSequence: [{ data: null, error: null }],
        // 1st insert = the new connection row
        insertSequence: [{ data: { id: 'new-conn-id' }, error: null }],
      },
    });
    authedClient(client);
    setSupabase(client);
    vi.mocked(mockedExchange).mockResolvedValueOnce({
      accessToken: '12345.tokenstr',
      refreshToken: 'rt',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          count: 1,
          results: [{ shop_id: 99887, shop_name: 'TestShop', url: 'https://etsy.com/shop/test' }],
        }),
        { status: 200 },
      ),
    );

    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.shop).toEqual({
      id: 'new-conn-id',
      etsyShopId: 99887,
      shopName: 'TestShop',
      shopUrl: 'https://etsy.com/shop/test',
    });

    const connInsert = insertCalls.find((c) => c.table === 'etsy_shop_connections');
    expect(connInsert).toBeTruthy();
    expect(connInsert!.payload.user_id).toBe('user-1');
    expect(connInsert!.payload.etsy_shop_id).toBe(99887);
    expect(connInsert!.payload.is_active).toBe(true);
  });

  it('happy path (existing connection same shop): updates instead of inserts', async () => {
    const { client, insertCalls, updateCalls } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'user-1',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
          },
        ],
        delete: () => ({ data: null, error: null }),
      },
      etsy_shop_connections: {
        // 1st update = deactivate-all. 2nd update = re-activate matching row.
        updateSequence: [
          { data: [{ id: 'old' }], error: null },
          { data: null, error: null },
        ],
        selectSequence: [{ data: { id: 'existing-conn' }, error: null }],
      },
    });
    authedClient(client);
    setSupabase(client);
    vi.mocked(mockedExchange).mockResolvedValueOnce({
      accessToken: '12345.tokenstr',
      refreshToken: 'rt',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ shop_id: 99887, shop_name: 'TestShop', url: 'u' }), { status: 200 }),
    );

    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.shop.id).toBe('existing-conn');

    const connInserts = insertCalls.filter((c) => c.table === 'etsy_shop_connections');
    expect(connInserts).toHaveLength(0);

    const connUpdates = updateCalls.filter((c) => c.table === 'etsy_shop_connections');
    // First = deactivate (is_active:false), second = re-activate w/ tokens.
    expect(connUpdates).toHaveLength(2);
    expect(connUpdates[0].payload).toEqual({ is_active: false });
    expect(connUpdates[1].payload.is_active).toBe(true);
    expect(connUpdates[1].payload.access_token).toBe('12345.tokenstr');
  });

  it('happy path (existing connection different shop): deactivates old, inserts new', async () => {
    const { client, insertCalls, updateCalls } = makeSupabaseClient({
      etsy_oauth_states: {
        selectSequence: [
          {
            data: {
              id: 'sid',
              user_id: 'user-1',
              code_verifier: 'cv',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
          },
        ],
        delete: () => ({ data: null, error: null }),
      },
      etsy_shop_connections: {
        updateSequence: [{ data: [{ id: 'old' }], error: null }],
        selectSequence: [{ data: null, error: null }], // no row for the new shop_id
        insertSequence: [{ data: { id: 'new-conn' }, error: null }],
      },
    });
    authedClient(client);
    setSupabase(client);
    vi.mocked(mockedExchange).mockResolvedValueOnce({
      accessToken: '999.tokenstr',
      refreshToken: 'rt',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ shop_id: 555, shop_name: 'NewShop', url: 'u' }), { status: 200 }),
    );

    const res = makeRes();
    await exchangeHandler(
      makeReq('POST', { authorization: 'Bearer ok', body: { code: 'c', state: 's' } }),
      res as any,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.shop.id).toBe('new-conn');
    expect(res.body.shop.etsyShopId).toBe(555);

    const connUpdates = updateCalls.filter((c) => c.table === 'etsy_shop_connections');
    expect(connUpdates[0].payload).toEqual({ is_active: false });

    const connInserts = insertCalls.filter((c) => c.table === 'etsy_shop_connections');
    expect(connInserts).toHaveLength(1);
    expect(connInserts[0].payload.etsy_shop_id).toBe(555);
  });
});

// ─── disconnect ────────────────────────────────────────────────────────────

describe('POST /api/etsy/oauth/disconnect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 if no auth', async () => {
    const { client } = makeSupabaseClient({});
    setSupabase(client);
    const res = makeRes();
    await disconnectHandler(makeReq('POST'), res as any);
    expect(res.statusCode).toBe(401);
  });

  it('happy path: returns 200 with deactivated count', async () => {
    const { client, updateCalls } = makeSupabaseClient({
      etsy_shop_connections: {
        updateSequence: [{ data: [{ id: 'a' }, { id: 'b' }], error: null }],
      },
    });
    client.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: null } },
      error: null,
    });
    setSupabase(client);

    const res = makeRes();
    await disconnectHandler(makeReq('POST', { authorization: 'Bearer ok' }), res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, deactivated: 2 });
    expect(updateCalls[0].payload).toEqual({ is_active: false });
  });

  it('returns 200 with deactivated:0 when no active connection exists', async () => {
    const { client } = makeSupabaseClient({
      etsy_shop_connections: {
        updateSequence: [{ data: [], error: null }],
      },
    });
    client.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: null } },
      error: null,
    });
    setSupabase(client);

    const res = makeRes();
    await disconnectHandler(makeReq('POST', { authorization: 'Bearer ok' }), res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, deactivated: 0 });
  });
});
