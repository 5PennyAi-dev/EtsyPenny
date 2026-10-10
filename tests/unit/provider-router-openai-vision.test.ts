import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectConfig = vi.hoisted(() => vi.fn());
const callGemini = vi.hoisted(() => vi.fn());
const callOpenAI = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ select: selectConfig })) },
}));
vi.mock('../../lib/ai/adapters/gemini-adapter.js', () => ({
  callGemini,
  callGeminiStream: vi.fn(),
}));
vi.mock('../../lib/ai/adapters/anthropic-adapter.js', () => ({ callAnthropic: vi.fn() }));
vi.mock('../../lib/ai/adapters/openai-adapter.js', () => ({ callOpenAI }));

import { clearAIConfigCache, runAI } from '../../lib/ai/provider-router.js';

beforeEach(() => {
  clearAIConfigCache();
  callGemini.mockReset();
  callOpenAI.mockReset();
});

describe('runAI vision_analysis with OpenAI', () => {
  it('does not fall back to Gemini when the selected OpenAI call fails', async () => {
    selectConfig.mockResolvedValue({
      data: [{
        task_key: 'vision_analysis',
        provider: 'openai',
        model_id: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 1024,
      }],
      error: null,
    });
    callOpenAI.mockRejectedValue(Object.assign(new Error('OpenAI unavailable'), { status: 503 }));

    await expect(runAI('vision_analysis', 'prompt', { imageUrl: 'https://images.example/product.jpg' }))
      .rejects.toThrow('OpenAI unavailable');

    expect(callOpenAI).toHaveBeenCalledTimes(3);
    expect(callGemini).not.toHaveBeenCalled();
    expect(callOpenAI).toHaveBeenLastCalledWith(expect.objectContaining({
      model: 'gpt-4o',
      structuredOutput: expect.objectContaining({ name: 'visual_analysis' }),
    }));
  });
});

describe('runAI taxonomy_mapping with OpenAI', () => {
  it('uses the taxonomy schema and does not fall back to Gemini', async () => {
    selectConfig.mockResolvedValue({
      data: [{
        task_key: 'taxonomy_mapping',
        provider: 'openai',
        model_id: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 1024,
      }],
      error: null,
    });
    callOpenAI.mockRejectedValue(Object.assign(new Error('OpenAI unavailable'), { status: 503 }));

    await expect(runAI('taxonomy_mapping', 'prompt')).rejects.toThrow('OpenAI unavailable');

    expect(callOpenAI).toHaveBeenCalledTimes(3);
    expect(callGemini).not.toHaveBeenCalled();
    expect(callOpenAI).toHaveBeenLastCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      imageUrl: undefined,
      imageBase64: undefined,
      structuredOutput: expect.objectContaining({ name: 'taxonomy_mapping' }),
    }));
  });
});
