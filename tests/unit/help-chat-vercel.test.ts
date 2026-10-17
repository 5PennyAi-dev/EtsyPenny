import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { streamHelpReply, verifyRequestUser, checkRateLimit, AuthErrorMock } = vi.hoisted(() => ({
  streamHelpReply: vi.fn(),
  verifyRequestUser: vi.fn(),
  checkRateLimit: vi.fn(),
  AuthErrorMock: class AuthError extends Error {
    status = 401;
  },
}));

vi.mock('../../lib/help/chat-service.js', () => ({
  streamHelpReply,
  ChatInputError: class ChatInputError extends Error {},
}));
vi.mock('../../lib/help/rate-limit.js', () => ({ checkRateLimit }));
vi.mock('../../lib/supabase/server.js', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../../lib/auth/verify-request-user.js', () => ({
  verifyRequestUser,
  AuthError: AuthErrorMock,
}));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));

import handler from '../../api/help/chat.js';

function makeRequest(body: Record<string, unknown>, authorization = 'Bearer test-token') {
  const req = new EventEmitter() as EventEmitter & { method: string; body: Record<string, unknown>; headers: Record<string, string> };
  req.method = 'POST';
  req.body = body;
  req.headers = { authorization };
  return req;
}

function makeResponse() {
  const writes: string[] = [];
  const res: Record<string, any> = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    setHeader: vi.fn(),
    write: vi.fn((value: string) => writes.push(value)),
    end: vi.fn(),
  };
  return { res, writes };
}

function parseSse(writes: string[]) {
  return writes.map((write) => JSON.parse(write.slice('data: '.length).trim()));
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyRequestUser.mockResolvedValue({ id: 'user-1' });
  checkRateLimit.mockResolvedValue({ allowed: true, used: 0, limit: 20, resetAt: new Date() });
});

describe('Vercel help chat handler', () => {
  it('preserves the provider-neutral SSE contract', async () => {
    streamHelpReply.mockImplementation(async function* () {
      yield { type: 'conversation', conversationId: 'conversation-1' };
      yield { type: 'delta', text: 'Hello ' };
      yield { type: 'delta', text: 'there.' };
      yield { type: 'done', messageId: 'message-1', latencyMs: 12 };
    });
    const req = makeRequest({ message: 'Help me', history: [] });
    const { res, writes } = makeResponse();

    await handler(req as any, res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(parseSse(writes)).toEqual([
      { type: 'conversation', conversationId: 'conversation-1' },
      { type: 'delta', text: 'Hello ' },
      { type: 'delta', text: 'there.' },
      { type: 'done', messageId: 'message-1', latencyMs: 12 },
    ]);
    expect(streamHelpReply).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', userMessage: 'Help me', history: [],
    }));
  });

  it('returns an SSE error without a misleading done chunk when streaming fails', async () => {
    streamHelpReply.mockImplementation(async function* () {
      yield { type: 'delta', text: 'Partial' };
      throw new Error('provider failed');
    });
    const { res, writes } = makeResponse();

    await handler(makeRequest({ message: 'Help me', history: [] }) as any, res as any);

    const chunks = parseSse(writes) as Array<{ type: string; message?: string }>;
    expect(chunks.map((chunk) => chunk.type)).toEqual(['delta', 'error']);
    expect(chunks.some((chunk) => chunk.type === 'done')).toBe(false);
    expect(chunks[1].message).toBe('Something went wrong. Please try again.');
  });

  it('rejects unauthenticated requests before opening an SSE response', async () => {
    verifyRequestUser.mockRejectedValue(new AuthErrorMock('Unauthorized'));
    const { res } = makeResponse();

    await handler(makeRequest({ message: 'Help me', history: [] }) as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});
