import { supabaseAdmin } from '../supabase/server.js';
import { streamAI } from '../ai/provider-router.js';
import { getHelpCorpus } from './corpus.js';
import { buildSystemPrompt } from './system-prompt.js';
import type { AIMessage } from '../ai/types.js';

const MAX_HISTORY_TURNS = 10;
const MAX_MESSAGE_CHARS = 2000;

/**
 * When running locally (no VERCEL_ENV), surface the real error message to
 * the client so the user can see what broke. In production, keep the
 * sanitized message so we don't leak internals to end users.
 */
function errorMessage(prefix: string, err: unknown): string {
  const inDev = !process.env.VERCEL_ENV;
  if (!inDev) return 'Something went wrong. Please try again.';
  const detail = err instanceof Error ? err.message : String(err);
  return `${prefix}: ${detail}`;
}

export type ChatArgs = {
  userId: string;
  conversationId: string | null;
  userMessage: string;
  pageContext: string | null;
  history: AIMessage[];
  signal?: AbortSignal;
};

export type ChatChunk =
  | { type: 'conversation'; conversationId: string }
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      messageId: string;
      tokensInput?: number;
      tokensOutput?: number;
      latencyMs: number;
    }
  | { type: 'error'; message: string };

export class ChatInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatInputError';
  }
}

/**
 * Persists the user message, streams Gemini's reply, and persists the full
 * assistant response once streaming completes.
 *
 * Invariants:
 * - The user message row is inserted BEFORE the Gemini call so rate-limit
 *   counts are accurate even if the stream aborts.
 * - The assistant message row is inserted AFTER the stream completes —
 *   never half-persisted.
 * - On any error we emit a generic error chunk and return; raw errors are
 *   captured by the caller's Sentry handler.
 */
export async function* streamHelpReply(args: ChatArgs): AsyncGenerator<ChatChunk> {
  const { userId, pageContext, signal } = args;
  const userMessage = (args.userMessage ?? '').trim();

  if (!userMessage) {
    throw new ChatInputError('message is required');
  }
  if (userMessage.length > MAX_MESSAGE_CHARS) {
    throw new ChatInputError(`message exceeds ${MAX_MESSAGE_CHARS} characters`);
  }

  // ── 1. Ensure conversation row exists ──────────────────
  let conversationId = args.conversationId;
  if (!conversationId) {
    const title = userMessage.slice(0, 80);
    const { data: convo, error: convoErr } = await supabaseAdmin
      .from('help_conversations')
      .insert({
        user_id: userId,
        title,
        page_context: pageContext ?? null,
      })
      .select('id')
      .single();
    if (convoErr || !convo) {
      throw new Error(`Failed to create conversation: ${convoErr?.message ?? 'unknown'}`);
    }
    conversationId = convo.id as string;
    yield { type: 'conversation', conversationId };
  }

  // ── 2. Persist user message up-front ───────────────────
  const { error: userInsertErr } = await supabaseAdmin
    .from('help_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: userMessage,
    });
  if (userInsertErr) {
    throw new Error(`Failed to persist user message: ${userInsertErr.message}`);
  }

  // ── 3. Stream Gemini reply ─────────────────────────────
  const history: AIMessage[] = Array.isArray(args.history) ? args.history : [];
  const trimmedHistory = history.slice(-MAX_HISTORY_TURNS);
  const messages: AIMessage[] = [
    ...trimmedHistory,
    { role: 'user', content: userMessage },
  ];

  const systemPrompt = buildSystemPrompt({
    corpus: getHelpCorpus(),
    pageContext,
  });

  const startedAt = Date.now();
  let buffer = '';
  let tokensInput: number | undefined;
  let tokensOutput: number | undefined;

  try {
    for await (const chunk of streamAI('help_chat', messages, {
      systemPrompt,
      signal,
    })) {
      if (signal?.aborted) return;

      if (chunk.type === 'delta') {
        buffer += chunk.text;
        yield { type: 'delta', text: chunk.text };
      } else if (chunk.type === 'done') {
        tokensInput = chunk.tokensInput;
        tokensOutput = chunk.tokensOutput;
      } else if (chunk.type === 'error') {
        // Adapter-reported error — bail without persisting assistant row.
        console.error('[chat-service] stream error chunk:', chunk.message);
        yield {
          type: 'error',
          message: errorMessage('Adapter error', new Error(chunk.message || 'unknown')),
        };
        return;
      }
    }
  } catch (err) {
    console.error('[chat-service] stream threw:', err);
    yield { type: 'error', message: errorMessage('Gemini error', err) };
    return;
  }

  if (signal?.aborted) return;

  const latencyMs = Date.now() - startedAt;
  const assistantContent = buffer.trim();

  if (!assistantContent) {
    console.error('[chat-service] stream ended with empty buffer');
    yield { type: 'error', message: 'The assistant returned an empty response. Please try again.' };
    return;
  }

  // ── 4. Persist assistant message ───────────────────────
  const { data: assistantRow, error: assistantErr } = await supabaseAdmin
    .from('help_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: assistantContent,
      tokens_input: tokensInput ?? null,
      tokens_output: tokensOutput ?? null,
      latency_ms: latencyMs,
    })
    .select('id')
    .single();

  if (assistantErr || !assistantRow) {
    console.error('[chat-service] failed to persist assistant msg:', assistantErr?.message);
    yield { type: 'error', message: 'Reply generated but could not be saved. Please try again.' };
    return;
  }

  yield {
    type: 'done',
    messageId: assistantRow.id as string,
    tokensInput,
    tokensOutput,
    latencyMs,
  };
}
