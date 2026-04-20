import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockSupabaseClient, mockSupabaseResponse, resetSupabaseMocks } from '../mocks/supabase.js';

// ── Hoisted mocks ───────────────────────────────────────────
const { streamAIMock, rateLimitMock } = vi.hoisted(() => ({
  streamAIMock: vi.fn(),
  rateLimitMock: vi.fn(async () => ({
    allowed: true,
    used: 0,
    limit: 20,
    resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabaseClient) }));

// Mock unrelated heavy modules server.mjs imports so it boots cleanly.
vi.mock('../../lib/seo/persist-strength.ts', () => ({ persistStrength: vi.fn(async () => {}) }));
vi.mock('../../lib/seo/persist-seo.ts', () => ({ persistSeo: vi.fn(async () => ({})) }));
vi.mock('../../lib/seo/enrich-keywords.ts', () => ({ enrichKeywords: vi.fn(async () => []) }));
vi.mock('../../lib/seo/score-keywords.ts', () => ({ scoreKeywords: vi.fn(async () => []) }));
vi.mock('../../lib/seo/generate-keyword-pool.ts', () => ({ generateKeywordPool: vi.fn(async () => []) }));
vi.mock('../../lib/tokens/token-middleware.ts', () => ({
  checkQuota: vi.fn(async () => ({ allowed: true })),
  incrementQuota: vi.fn(async () => {}),
  checkTokenBalance: vi.fn(async () => ({ allowed: true, balance: 100 })),
  deductTokens: vi.fn(async () => ({ success: true })),
}));
vi.mock('../../lib/stripe/client.ts', () => ({ getStripe: vi.fn(() => ({})), PRICE_TO_PLAN: {}, PRICE_TO_PACK: {}, PLAN_TOKENS: {} }));
vi.mock('../../lib/email/send-email.ts', () => ({ sendEmail: vi.fn(async () => ({})) }));
vi.mock('../../lib/email/templates/welcome.ts', () => ({ welcomeEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/email/templates/subscription-confirmation.ts', () => ({ subscriptionEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/email/templates/token-pack-confirmation.ts', () => ({ tokenPackEmail: vi.fn(() => ({})) }));
vi.mock('../../lib/etsy/etsy-client.ts', () => ({ fetchShopListings: vi.fn(async () => []), fetchListingsByIds: vi.fn(async () => []), updateEtsyListing: vi.fn(async () => ({})), getSellerTaxonomyNodes: vi.fn(async () => new Map()) }));
vi.mock('../../lib/etsy/score-etsy-listing.ts', () => ({ scoreEtsyListing: vi.fn(async () => ({})) }));
vi.mock('../../lib/etsy/prepare-etsy-image.ts', () => ({ downloadAndUploadEtsyImage: vi.fn(async () => '') }));
vi.mock('../../lib/etsy/match-product-type.ts', () => ({ matchProductType: vi.fn(async () => null) }));
vi.mock('../../lib/ai/extract-json.ts', () => ({ extractJson: vi.fn((text: string) => text) }));
vi.mock('../../lib/ai/provider-router.ts', () => ({
  runAI: vi.fn(async () => ({ text: '{}', usage: { input_tokens: 0, output_tokens: 0 }, model: 'test', provider: 'test' })),
  streamAI: streamAIMock,
}));
vi.mock('../../lib/logic/analyse-image-logic.ts', () => ({ PROMPT_VISUAL_ANALYST: '', formatTaxonomyLists: vi.fn(() => ''), buildVisualAnalysisContext: vi.fn(() => ''), buildTaxonomyPrompt: vi.fn(() => ''), mergeAnalysisResults: vi.fn(() => ({})) }));
vi.mock('../../lib/help/rate-limit.ts', () => ({
  HELP_DAILY_LIMIT: 20,
  checkRateLimit: rateLimitMock,
}));

import { app } from '../../server.mjs';
import request from 'supertest';
import { USER_ID } from './_mock-setup.js';

// Parse an SSE response body into chunk objects.
function parseSSE(body: string): unknown[] {
  return body
    .split('\n\n')
    .map((frame) => frame.trim())
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice(6)));
}

function setupConvoMocks() {
  // conversation insert returns {id: 'convo-1'}
  mockSupabaseResponse('help_conversations', [{ id: 'convo-1' }]);
  // assistant-message insert returns {id: 'msg-assistant-1'}
  mockSupabaseResponse('help_messages', [{ id: 'msg-assistant-1' }]);
}

describe('POST /api/help/chat', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    rateLimitMock.mockResolvedValue({
      allowed: true,
      used: 0,
      limit: 20,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  });

  it('returns 400 when message is empty', async () => {
    const res = await request(app)
      .post('/api/help/chat')
      .send({ user_id: USER_ID, message: '', history: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/);
  });

  it('returns 400 when user_id is missing', async () => {
    const res = await request(app)
      .post('/api/help/chat')
      .send({ message: 'hello', history: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user_id/);
  });

  it('returns 429 when rate-limited', async () => {
    const resetAt = new Date(Date.now() + 60 * 60 * 1000);
    rateLimitMock.mockResolvedValue({ allowed: false, used: 20, limit: 20, resetAt });

    const res = await request(app)
      .post('/api/help/chat')
      .send({ user_id: USER_ID, message: 'hello', history: [] });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('rate_limited');
    expect(res.body.used).toBe(20);
    expect(res.body.limit).toBe(20);
    expect(typeof res.body.resetAt).toBe('string');
  });

  it('streams conversation + delta + done on happy path', async () => {
    setupConvoMocks();

    // Scripted stream: two deltas + done.
    streamAIMock.mockImplementation(async function* () {
      yield { type: 'delta', text: 'Hello ' };
      yield { type: 'delta', text: 'world.' };
      yield { type: 'done', tokensInput: 42, tokensOutput: 7 };
    });

    const res = await request(app)
      .post('/api/help/chat')
      .send({ user_id: USER_ID, message: 'How do I generate SEO?', history: [] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const chunks = parseSSE(res.text);
    const types = chunks.map((c) => (c as { type: string }).type);
    expect(types).toEqual(['conversation', 'delta', 'delta', 'done']);

    const doneChunk = chunks.find((c) => (c as { type: string }).type === 'done') as {
      type: 'done';
      messageId: string;
      latencyMs: number;
    };
    expect(doneChunk.messageId).toBe('msg-assistant-1');
    expect(typeof doneChunk.latencyMs).toBe('number');

    // Verify streamAI was called with the user's message appended to history.
    expect(streamAIMock).toHaveBeenCalledTimes(1);
    const [taskKey, messages, opts] = streamAIMock.mock.calls[0];
    expect(taskKey).toBe('help_chat');
    expect(messages[messages.length - 1]).toEqual({
      role: 'user',
      content: 'How do I generate SEO?',
    });
    expect(typeof opts.systemPrompt).toBe('string');
    expect(opts.systemPrompt).toMatch(/PennySEO/);
  });
});

describe('POST /api/help/feedback', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  it('returns 400 on invalid feedback value', async () => {
    const res = await request(app)
      .post('/api/help/feedback')
      .send({ user_id: USER_ID, messageId: 'msg-1', feedback: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/-1 or 1/);
  });

  it('returns 400 on missing messageId', async () => {
    const res = await request(app)
      .post('/api/help/feedback')
      .send({ user_id: USER_ID, feedback: 1 });
    expect(res.status).toBe(400);
  });
});
