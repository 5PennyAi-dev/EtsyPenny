import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/etsy/oauth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/etsy/oauth.js')>();
  return {
    ...actual,
    refreshAccessToken: vi.fn(),
  };
});

import { refreshAccessToken as mockedRefresh } from '../../lib/etsy/oauth.js';
import {
  getActiveConnection,
  EtsyConnectionError,
} from '../../lib/etsy/get-connection.js';

interface SupabaseMockOptions {
  selectResult?: { data: any; error: any };
  updateResult?: { error: any };
}

function makeSupabaseMock(opts: SupabaseMockOptions) {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(opts.updateResult ?? { error: null }),
  });

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(opts.selectResult ?? { data: null, error: null }),
    update: updateMock,
  };

  const from = vi.fn().mockReturnValue(chain);
  return { client: { from } as any, from, updateMock };
}

function buildRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'conn-1',
    user_id: 'user-1',
    etsy_shop_id: 12345,
    shop_name: 'Test Shop',
    shop_url: 'https://etsy.com/shop/test',
    access_token: 'AT',
    refresh_token: 'RT',
    token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe('lib/etsy/get-connection', () => {
  beforeEach(() => {
    vi.mocked(mockedRefresh).mockReset();
    process.env.ETSY_API_KEY = 'test-client-id';
  });

  it('returns connection unchanged when token expires more than 60s in the future', async () => {
    const row = buildRow();
    const { client } = makeSupabaseMock({ selectResult: { data: row, error: null } });

    const conn = await getActiveConnection('user-1', client);

    expect(conn.id).toBe('conn-1');
    expect(conn.accessToken).toBe('AT');
    expect(conn.refreshToken).toBe('RT');
    expect(mockedRefresh).not.toHaveBeenCalled();
  });

  it('triggers refresh when token expires within 60s, persists new tokens, returns refreshed connection', async () => {
    const row = buildRow({
      token_expires_at: new Date(Date.now() + 10 * 1000).toISOString(),
    });
    const { client, from, updateMock } = makeSupabaseMock({
      selectResult: { data: row, error: null },
      updateResult: { error: null },
    });

    vi.mocked(mockedRefresh).mockResolvedValueOnce({
      accessToken: 'NEW_AT',
      refreshToken: 'NEW_RT',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });

    const conn = await getActiveConnection('user-1', client);

    expect(mockedRefresh).toHaveBeenCalledWith({
      refreshToken: 'RT',
      clientId: 'test-client-id',
    });
    expect(conn.accessToken).toBe('NEW_AT');
    expect(conn.refreshToken).toBe('NEW_RT');
    expect(from).toHaveBeenCalledWith('etsy_shop_connections');
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateMock.mock.calls[0][0];
    expect(updatePayload.access_token).toBe('NEW_AT');
    expect(updatePayload.refresh_token).toBe('NEW_RT');
    expect(typeof updatePayload.token_expires_at).toBe('string');
  });

  it('throws NO_CONNECTION when no active row exists', async () => {
    const { client } = makeSupabaseMock({ selectResult: { data: null, error: null } });

    await expect(getActiveConnection('user-1', client)).rejects.toMatchObject({
      name: 'EtsyConnectionError',
      code: 'NO_CONNECTION',
    });
  });

  it('throws REFRESH_FAILED when refreshAccessToken throws', async () => {
    const row = buildRow({ token_expires_at: new Date(Date.now() + 5 * 1000).toISOString() });
    const { client } = makeSupabaseMock({ selectResult: { data: row, error: null } });

    vi.mocked(mockedRefresh).mockRejectedValueOnce(new Error('boom'));

    const err = await getActiveConnection('user-1', client).catch((e) => e);
    expect(err).toBeInstanceOf(EtsyConnectionError);
    expect(err.code).toBe('REFRESH_FAILED');
    expect(err.message).toContain('boom');
  });

  it('throws DB_ERROR when Supabase returns an error on UPDATE', async () => {
    const row = buildRow({ token_expires_at: new Date(Date.now() + 5 * 1000).toISOString() });
    const { client } = makeSupabaseMock({
      selectResult: { data: row, error: null },
      updateResult: { error: { message: 'update failed' } },
    });

    vi.mocked(mockedRefresh).mockResolvedValueOnce({
      accessToken: 'NEW_AT',
      refreshToken: 'NEW_RT',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });

    const err = await getActiveConnection('user-1', client).catch((e) => e);
    expect(err).toBeInstanceOf(EtsyConnectionError);
    expect(err.code).toBe('DB_ERROR');
    expect(err.message).toContain('update failed');
  });
});
