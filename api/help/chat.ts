import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initSentry, Sentry } from '../../lib/sentry.js';
import { checkRateLimit } from '../../lib/help/rate-limit.js';
import { streamHelpReply, ChatInputError } from '../../lib/help/chat-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, message, conversationId, pageContext, history } = req.body ?? {};

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'Missing required field: user_id' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing required field: message' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message exceeds 2000 characters' });
  }
  if (conversationId != null && typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'conversationId must be a string or null' });
  }
  if (history != null && !Array.isArray(history)) {
    return res.status(400).json({ error: 'history must be an array' });
  }

  // ── Rate limit ──────────────────────────────────────────
  try {
    const rl = await checkRateLimit(user_id);
    if (!rl.allowed) {
      return res.status(429).json({
        error: 'rate_limited',
        used: rl.used,
        limit: rl.limit,
        resetAt: rl.resetAt.toISOString(),
      });
    }
  } catch (err) {
    Sentry.captureException(err);
    console.error('[help/chat] rate-limit check failed:', err);
    // fail open — proceed
  }

  // ── SSE headers ─────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as unknown as { flushHeaders?: () => void }).flushHeaders === 'function') {
    (res as unknown as { flushHeaders: () => void }).flushHeaders();
  }

  // ── Abort propagation on client disconnect ──────────────
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  const write = (chunk: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    } catch (err) {
      console.error('[help/chat] write failed:', err);
    }
  };

  try {
    for await (const chunk of streamHelpReply({
      userId: user_id,
      conversationId: conversationId ?? null,
      userMessage: message,
      pageContext: typeof pageContext === 'string' ? pageContext : null,
      history: Array.isArray(history) ? history : [],
      signal: controller.signal,
    })) {
      if (controller.signal.aborted) break;
      write(chunk);
    }
  } catch (err) {
    if (err instanceof ChatInputError) {
      // Headers already sent — write an error chunk instead of 400.
      write({ type: 'error', message: err.message });
    } else {
      Sentry.captureException(err);
      console.error('[help/chat] handler error:', err);
      write({ type: 'error', message: 'Something went wrong. Please try again.' });
    }
  } finally {
    try {
      res.end();
    } catch {
      /* socket already closed */
    }
  }
}
