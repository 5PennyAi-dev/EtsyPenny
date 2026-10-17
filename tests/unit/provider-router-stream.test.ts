import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectConfig = vi.hoisted(() => vi.fn());
const callGeminiStream = vi.hoisted(() => vi.fn());
const callOpenAIStream = vi.hoisted(() => vi.fn());
const callGemini = vi.hoisted(() => vi.fn());
const callOpenAI = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ select: selectConfig })) },
}));
vi.mock('../../lib/ai/adapters/gemini-adapter.js', () => ({ callGemini, callGeminiStream }));
vi.mock('../../lib/ai/adapters/anthropic-adapter.js', () => ({ callAnthropic: vi.fn() }));
vi.mock('../../lib/ai/adapters/openai-adapter.js', () => ({ callOpenAI, callOpenAIStream }));

import { clearAIConfigCache, runAI, streamAI } from '../../lib/ai/provider-router.js';

async function collect(stream: AsyncGenerator<unknown>) {
  const chunks: unknown[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

function config(provider: string) {
  selectConfig.mockResolvedValue({
    data: [{
      task_key: 'help_chat',
      provider,
      model_id: provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash',
      temperature: 0.6,
      max_tokens: 1024,
    }],
    error: null,
  });
}

beforeEach(() => {
  clearAIConfigCache();
  vi.clearAllMocks();
});

describe('streamAI provider selection', () => {
  it('selects OpenAI with the configured model and parameters', async () => {
    config('openai');
    callOpenAIStream.mockImplementation(async function* () {
      yield { type: 'delta', text: 'Hello' };
      yield { type: 'done', tokensInput: 4, tokensOutput: 1 };
    });

    await expect(collect(streamAI('help_chat', [{ role: 'user', content: 'Hi' }], {
      systemPrompt: 'Grounded help',
    }))).resolves.toEqual([
      { type: 'delta', text: 'Hello' },
      { type: 'done', tokensInput: 4, tokensOutput: 1 },
    ]);

    expect(callOpenAIStream).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      maxTokens: 1024,
      systemPrompt: 'Grounded help',
    }));
    expect(callGeminiStream).not.toHaveBeenCalled();
  });

  it('preserves Gemini streaming', async () => {
    config('gemini');
    callGeminiStream.mockImplementation(async function* () {
      yield { type: 'done' };
    });

    await expect(collect(streamAI('help_chat', []))).resolves.toEqual([{ type: 'done' }]);
    expect(callGeminiStream).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-flash', temperature: 0.6, maxTokens: 1024,
    }));
    expect(callOpenAIStream).not.toHaveBeenCalled();
  });

  it('does not fall back to Gemini when OpenAI streaming fails', async () => {
    config('openai');
    callOpenAIStream.mockImplementation(async function* () {
      throw Object.assign(new Error('OpenAI unavailable'), { status: 503 });
    });

    await expect(collect(streamAI('help_chat', []))).rejects.toThrow('OpenAI unavailable');
    expect(callGeminiStream).not.toHaveBeenCalled();
  });

  it('fails explicitly for missing or unsupported configuration', async () => {
    selectConfig.mockResolvedValue({ data: [], error: null });
    await expect(collect(streamAI('help_chat', []))).rejects.toThrow('Missing AI configuration');

    clearAIConfigCache();
    config('anthropic');
    await expect(collect(streamAI('help_chat', []))).rejects.toThrow('not supported for provider "anthropic"');
  });

  it('does not change runAI behavior', async () => {
    config('openai');
    callOpenAI.mockResolvedValue({ text: 'ok', usage: { input_tokens: 1, output_tokens: 1 }, model: 'gpt-4o-mini', provider: 'openai' });

    await expect(runAI('help_chat', 'hello')).resolves.toMatchObject({ text: 'ok', provider: 'openai' });
    expect(callOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini', temperature: 0.6, maxTokens: 1024,
    }));
  });
});
