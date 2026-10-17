import { beforeEach, describe, expect, it, vi } from 'vitest';

const createCompletion = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

import { callOpenAIStream } from '../../lib/ai/adapters/openai-adapter.js';

const params = (signal?: AbortSignal) => ({
  model: 'gpt-4o-mini',
  temperature: 0.6,
  maxTokens: 1024,
  systemPrompt: 'Answer only from the documentation.',
  messages: [
    { role: 'user' as const, content: 'How do I start?' },
    { role: 'assistant' as const, content: 'Open the Studio.' },
    { role: 'user' as const, content: 'What next?' },
  ],
  signal,
});

async function collect(stream: AsyncGenerator<unknown>) {
  const chunks: unknown[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

async function* streamOf(chunks: unknown[]) {
  for (const chunk of chunks) yield chunk;
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  createCompletion.mockReset();
});

describe('callOpenAIStream', () => {
  it('forwards configured parameters and maps deltas plus final usage', async () => {
    const controller = new AbortController();
    createCompletion.mockResolvedValue(streamOf([
      { choices: [{ delta: { content: 'Hello ' }, finish_reason: null }], usage: null },
      { choices: [{ delta: { content: 'there.' }, finish_reason: 'stop' }], usage: null },
      { choices: [], usage: { prompt_tokens: 31, completion_tokens: 7 } },
    ]));

    const chunks = await collect(callOpenAIStream(params(controller.signal)));

    expect(chunks).toEqual([
      { type: 'delta', text: 'Hello ' },
      { type: 'delta', text: 'there.' },
      { type: 'done', tokensInput: 31, tokensOutput: 7 },
    ]);
    expect(createCompletion).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Answer only from the documentation.' },
        { role: 'user', content: 'How do I start?' },
        { role: 'assistant', content: 'Open the Studio.' },
        { role: 'user', content: 'What next?' },
      ],
      temperature: 0.6,
      max_completion_tokens: 1024,
      stream: true,
      stream_options: { include_usage: true },
    }, { signal: controller.signal });
  });

  it('succeeds without usage when the finish reason is stop', async () => {
    createCompletion.mockResolvedValue(streamOf([
      { choices: [{ delta: { content: 'Complete.' }, finish_reason: 'stop' }], usage: null },
    ]));

    await expect(collect(callOpenAIStream(params()))).resolves.toEqual([
      { type: 'delta', text: 'Complete.' },
      { type: 'done', tokensInput: undefined, tokensOutput: undefined },
    ]);
  });

  it.each(['length', 'content_filter', 'tool_calls'])(
    'does not emit done for finish_reason %s',
    async (finishReason) => {
      createCompletion.mockResolvedValue(streamOf([
        { choices: [{ delta: { content: 'Partial' }, finish_reason: finishReason }], usage: null },
      ]));

      const chunks: unknown[] = [];
      await expect((async () => {
        for await (const chunk of callOpenAIStream(params())) chunks.push(chunk);
      })()).rejects.toThrow(/incomplete/);
      expect(chunks).toEqual([{ type: 'delta', text: 'Partial' }]);
    }
  );

  it('rejects an empty successful stream without emitting done', async () => {
    createCompletion.mockResolvedValue(streamOf([
      { choices: [{ delta: {}, finish_reason: 'stop' }], usage: null },
    ]));

    await expect(collect(callOpenAIStream(params()))).rejects.toThrow(/empty/i);
  });

  it('propagates SDK errors before or during iteration without emitting done', async () => {
    createCompletion.mockRejectedValue(new Error('rate limited'));
    await expect(collect(callOpenAIStream(params()))).rejects.toThrow(/rate limited/);

    async function* brokenStream() {
      yield { choices: [{ delta: { content: 'Partial' }, finish_reason: null }], usage: null };
      throw new Error('connection dropped');
    }
    createCompletion.mockResolvedValue(brokenStream());
    const chunks: unknown[] = [];
    await expect((async () => {
      for await (const chunk of callOpenAIStream(params())) chunks.push(chunk);
    })()).rejects.toThrow(/connection dropped/);
    expect(chunks).toEqual([{ type: 'delta', text: 'Partial' }]);
  });

  it('stops cleanly on cancellation without emitting done', async () => {
    const controller = new AbortController();
    async function* abortingStream() {
      yield { choices: [{ delta: { content: 'First' }, finish_reason: null }], usage: null };
      controller.abort();
      yield { choices: [{ delta: { content: 'Second' }, finish_reason: 'stop' }], usage: null };
    }
    createCompletion.mockResolvedValue(abortingStream());

    await expect(collect(callOpenAIStream(params(controller.signal)))).resolves.toEqual([
      { type: 'delta', text: 'First' },
    ]);
  });
});
