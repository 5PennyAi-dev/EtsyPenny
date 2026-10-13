import { beforeEach, describe, expect, it, vi } from 'vitest';

const CLIENT_KEY = '__generate_draft_client__';
const runAI = vi.hoisted(() => vi.fn());
const checkTokenBalance = vi.hoisted(() => vi.fn());
const deductTokens = vi.hoisted(() => vi.fn());
const TokenDeductionError = vi.hoisted(() => class TokenDeductionError extends Error {});

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, { get: (_target, property) => (globalThis as any)[CLIENT_KEY][property] }),
}));
vi.mock('../../lib/ai/provider-router.js', () => ({ runAI }));
vi.mock('../../lib/tokens/token-middleware.js', () => ({ checkTokenBalance, deductTokens, TokenDeductionError }));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));

import handler from '../../api/seo/generate-draft.js';

const validDraft = { title: 'Retro cassette tape shirt', description: 'A valid description.' };

function response() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
}

function setClient(updateResult: { data?: { id: string } | null; error?: Error | null } = {}) {
  const ownedListing: any = {
    select: vi.fn(() => ownedListing),
    eq: vi.fn(() => ownedListing),
    maybeSingle: vi.fn(async () => ({ data: { id: 'listing-1' }, error: null })),
  };
  const persistence: any = {
    update: vi.fn(() => persistence),
    eq: vi.fn(() => persistence),
    select: vi.fn(() => persistence),
    maybeSingle: vi.fn(async () => ({
      data: Object.prototype.hasOwnProperty.call(updateResult, 'data') ? updateResult.data : { id: 'listing-1' },
      error: updateResult.error ?? null,
    })),
  };
  let listingCalls = 0;
  (globalThis as any)[CLIENT_KEY] = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'user@example.test' } }, error: null })) },
    from: vi.fn((table: string) => {
      if (table !== 'listings') throw new Error(`Unexpected table ${table}`);
      listingCalls += 1;
      return listingCalls === 1 ? ownedListing : persistence;
    }),
  };
  return { ownedListing, persistence };
}

function requestBody() {
  return {
    listing_id: 'listing-1',
    keywords: [{ keyword: 'cassette shirt', avg_volume: 100, competition: 0.4, status: {} }],
    product_details: { product_type: 'T-shirt', client_description: 'Seller notes' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setClient();
  checkTokenBalance.mockResolvedValue({ allowed: true, required: 1 });
  deductTokens.mockResolvedValue({ success: true });
  runAI.mockResolvedValue({
    text: JSON.stringify(validDraft), provider: 'openai', model: 'gpt-4o-mini', usage: { input_tokens: 1, output_tokens: 1 },
  });
});

describe('Vercel Magic Draft handler', () => {
  it('persists a valid draft before deducting one token', async () => {
    const client = setClient();
    const res = response();

    await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: requestBody() } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, ...validDraft });
    expect(client.persistence.update).toHaveBeenCalledWith(expect.objectContaining({
      generated_title: validDraft.title,
      generated_description: validDraft.description,
    }));
    expect(deductTokens).toHaveBeenCalledTimes(1);
    expect(deductTokens).toHaveBeenCalledWith('user-1', 'generate_draft', 1, 'listing-1');
  });

  it.each([
    ['invalid JSON', '{'],
    ['missing description', JSON.stringify({ title: 'A title' })],
    ['wrong field type', JSON.stringify({ title: 123, description: 'Description' })],
    ['blank value', JSON.stringify({ title: 'A title', description: '   ' })],
    ['overlong title', JSON.stringify({ title: 'a'.repeat(141), description: 'Description' })],
  ])('does not persist or deduct for %s', async (_label, text) => {
    const client = setClient();
    runAI.mockResolvedValueOnce({ text, provider: 'gemini', model: 'gemini-2.5-flash', usage: { input_tokens: 1, output_tokens: 1 } });
    const res = response();

    await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: requestBody() } as any, res as any);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('The AI response could not be used. No credit was deducted.');
    expect(client.persistence.update).not.toHaveBeenCalled();
    expect(deductTokens).not.toHaveBeenCalled();
  });

  it('does not deduct when Supabase rejects the listing update', async () => {
    const client = setClient({ error: new Error('database unavailable') });
    const res = response();

    await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: requestBody() } as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('The draft could not be saved. No credit was deducted.');
    expect(client.persistence.update).toHaveBeenCalledTimes(1);
    expect(deductTokens).not.toHaveBeenCalled();
  });

  it('does not deduct when the listing update affects no row', async () => {
    const client = setClient({ data: null });
    const res = response();

    await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: requestBody() } as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('The draft could not be saved. No credit was deducted.');
    expect(client.persistence.maybeSingle).toHaveBeenCalledOnce();
    expect(deductTokens).not.toHaveBeenCalled();
  });

  it('does not return success or make an unsafe billing claim when deduction fails after saving', async () => {
    deductTokens.mockRejectedValueOnce(new TokenDeductionError('balance update failed'));
    const res = response();

    await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: requestBody() } as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('The draft was saved, but billing could not be confirmed. Please contact support before retrying.');
    expect(res.body.error).not.toContain('No credit was deducted');
  });

  it('does not deduct for a provider refusal or incomplete response', async () => {
    runAI.mockRejectedValueOnce(new Error('OpenAI completion was incomplete'));
    const res = response();

    await handler({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body: requestBody() } as any, res as any);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('Draft generation is temporarily unavailable. No credit was deducted.');
    expect(deductTokens).not.toHaveBeenCalled();
  });
});
