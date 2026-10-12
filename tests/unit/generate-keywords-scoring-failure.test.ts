import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scoreKeywords: vi.fn(),
  persistSeo: vi.fn(),
  runResetPool: vi.fn(),
  deductTokens: vi.fn(),
  generateKeywordPool: vi.fn(),
  enrichKeywords: vi.fn(),
}));

const supabase = vi.hoisted(() => ({
  updates: [] as unknown[],
  from: vi.fn((table: string) => {
    const chain: any = {};
    const result = table === 'listings' ? { data: { id: 'listing-1' }, error: null } : { data: {}, error: null };
    for (const method of ['select', 'eq']) chain[method] = vi.fn(() => chain);
    chain.update = vi.fn((payload: unknown) => {
      supabase.updates.push({ table, payload });
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => result);
    chain.single = vi.fn(async () => result);
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  }),
}));

vi.mock('../../lib/supabase/server.js', () => ({ supabaseAdmin: supabase }));
vi.mock('../../lib/seo/generate-keyword-pool.js', () => ({ generateKeywordPool: mocks.generateKeywordPool }));
vi.mock('../../lib/seo/enrich-keywords.js', () => ({ enrichKeywords: mocks.enrichKeywords }));
vi.mock('../../lib/seo/score-keywords.js', () => ({
  scoreKeywords: mocks.scoreKeywords,
  isKeywordScoringError: (error: unknown) => (error as { code?: string })?.code === 'KEYWORD_SCORING_INCOMPLETE',
  KEYWORD_GENERATION_SCORING_FAILURE_MESSAGE: "L'évaluation des mots-clés n'a pas pu être complétée. Aucun crédit n'a été débité. Veuillez réessayer plus tard.",
}));
vi.mock('../../lib/seo/select-and-score.js', () => ({ selectAndScore: vi.fn() }));
vi.mock('../../lib/seo/persist-seo.js', () => ({ persistSeo: mocks.persistSeo }));
vi.mock('../../lib/seo/run-reset-pool.js', () => ({ runResetPool: mocks.runResetPool }));
vi.mock('../../lib/tokens/token-middleware.js', () => ({
  checkTokenBalance: vi.fn(async () => ({ allowed: true, required: 2 })),
  deductTokens: mocks.deductTokens,
}));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));
vi.mock('../../lib/auth/verify-request-user.js', () => ({
  AuthError: class AuthError extends Error { status = 401; },
  verifyRequestUser: vi.fn(async () => ({ id: 'user-1' })),
}));

import handler from '../../api/seo/generate-keywords.js';

function responseDouble() {
  const result: { statusCode?: number; body?: unknown } = {};
  const res = {
    status: vi.fn((statusCode: number) => {
      result.statusCode = statusCode;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      result.body = body;
      return res;
    }),
  };
  return { res, result };
}

describe('generate-keywords scoring failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.updates.length = 0;
    mocks.generateKeywordPool.mockResolvedValue(['coastal mug']);
    mocks.enrichKeywords.mockResolvedValue([{ keyword: 'coastal mug' }]);
    mocks.scoreKeywords.mockRejectedValue(Object.assign(new Error('provider diagnostics must stay private'), {
      code: 'KEYWORD_SCORING_INCOMPLETE',
    }));
  });

  it('does not persist, finalize, mark SEO done, or deduct credits when scoring is incomplete', async () => {
    const { res, result } = responseDouble();

    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer test' },
      body: { listing_id: 'listing-1' },
    } as any, res as any);

    expect(result.statusCode).toBe(502);
    expect(result.body).toEqual({
      error: "L'évaluation des mots-clés n'a pas pu être complétée. Aucun crédit n'a été débité. Veuillez réessayer plus tard.",
    });
    expect(mocks.persistSeo).not.toHaveBeenCalled();
    expect(mocks.runResetPool).not.toHaveBeenCalled();
    expect(mocks.deductTokens).not.toHaveBeenCalled();
    expect(supabase.updates).toEqual([{ table: 'listings', payload: { is_generating_seo: false } }]);
  });
});
