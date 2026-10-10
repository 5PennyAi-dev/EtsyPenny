import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createCompletion = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

import { callOpenAI } from '../../lib/ai/adapters/openai-adapter.js';
import { VISUAL_ANALYSIS_STRUCTURED_OUTPUT } from '../../lib/ai/vision-analysis.js';
import { TAXONOMY_MAPPING_STRUCTURED_OUTPUT } from '../../lib/ai/taxonomy-mapping.js';

const originalFetch = globalThis.fetch;

const baseParams = () => ({
  model: 'gpt-4o',
  prompt: 'Analyze this product image.',
  temperature: 0.4,
  maxTokens: 1024,
  imageUrl: 'https://images.example/product.png',
  structuredOutput: VISUAL_ANALYSIS_STRUCTURED_OUTPUT,
});

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  createCompletion.mockReset();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
    status: 200,
    headers: { 'content-type': 'image/png' },
  })));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('callOpenAI visual analysis', () => {
  it('downloads a URL image and requests strict JSON Schema output', async () => {
    createCompletion.mockResolvedValue({
      choices: [{
        finish_reason: 'stop',
        message: { content: JSON.stringify({ visual_analysis: {} }), refusal: null },
      }],
      usage: { prompt_tokens: 12, completion_tokens: 8 },
    });

    const result = await callOpenAI(baseParams());

    expect(result).toMatchObject({ provider: 'openai', model: 'gpt-4o', usage: { input_tokens: 12, output_tokens: 8 } });
    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o',
      temperature: 0.4,
      max_completion_tokens: 1024,
      response_format: expect.objectContaining({
        type: 'json_schema',
        json_schema: expect.objectContaining({ name: 'visual_analysis', strict: true }),
      }),
    }));

    const request = createCompletion.mock.calls[0][0];
    const userMessage = request.messages.find((message: { role: string }) => message.role === 'user');
    expect(userMessage.content[0].image_url.url).toBe('data:image/png;base64,AQID');
    expect(request).not.toHaveProperty('max_tokens');
  });

  it.each([
    [{ finish_reason: 'stop', message: { content: null, refusal: 'I cannot analyze this image.' } }, /refused/i],
    [{ finish_reason: 'length', message: { content: '{', refusal: null } }, /incomplete/i],
  ])('fails explicitly for a refusal or incomplete completion', async (choice, error) => {
    createCompletion.mockResolvedValue({ choices: [choice], usage: {} });

    await expect(callOpenAI(baseParams())).rejects.toThrow(error);
  });

  it('rejects parameters outside the documented GPT-4o range before requesting a completion', async () => {
    await expect(callOpenAI({ ...baseParams(), temperature: 2.1 })).rejects.toThrow('temperature must be between 0 and 2');
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('requests taxonomy Structured Outputs without an image', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ theme: 'Theme', niche: 'Niche', sub_niche: 'Phrase' }), refusal: null } }],
      usage: {},
    });

    await callOpenAI({
      model: 'gpt-4o-mini',
      prompt: 'Classify this listing.',
      temperature: 0.3,
      maxTokens: 1024,
      structuredOutput: TAXONOMY_MAPPING_STRUCTURED_OUTPUT,
    });

    const request = createCompletion.mock.calls[0][0];
    expect(request.response_format.json_schema).toMatchObject({ name: 'taxonomy_mapping', strict: true });
    const userMessage = request.messages.find((message: { role: string }) => message.role === 'user');
    expect(userMessage.content).toEqual([{ type: 'text', text: 'Classify this listing.' }]);
  });

  it.each([
    [{ finish_reason: 'stop', message: { content: null, refusal: 'I cannot classify this listing.' } }, /refused/i],
    [{ finish_reason: 'length', message: { content: '{', refusal: null } }, /incomplete/i],
    [{ finish_reason: 'stop', message: { content: '   ', refusal: null } }, /empty/i],
  ])('rejects a taxonomy refusal, incomplete, or empty response', async (choice, error) => {
    createCompletion.mockResolvedValue({ choices: [choice], usage: {} });

    await expect(callOpenAI({
      model: 'gpt-4o-mini',
      prompt: 'Classify this listing.',
      temperature: 0.3,
      maxTokens: 1024,
      structuredOutput: TAXONOMY_MAPPING_STRUCTURED_OUTPUT,
    })).rejects.toThrow(error);
  });
});
