import { beforeEach, describe, expect, it, vi } from 'vitest';

const createCompletion = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

import { callOpenAI } from '../../lib/ai/adapters/openai-adapter.js';
import { DRAFT_GENERATION_STRUCTURED_OUTPUT } from '../../lib/ai/draft-generation.js';

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  createCompletion.mockReset();
  createCompletion.mockResolvedValue({
    choices: [{ message: { content: '{"title":"Title","description":"Description"}' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 5, completion_tokens: 7 },
  });
});

describe('OpenAI draft structured output', () => {
  it('sends the strict draft schema with configured model parameters', async () => {
    await callOpenAI({
      model: 'gpt-4o-mini',
      prompt: 'Write a draft',
      temperature: 0.9,
      maxTokens: 2048,
      structuredOutput: DRAFT_GENERATION_STRUCTURED_OUTPUT,
    });

    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      max_completion_tokens: 2048,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'draft_generation',
          strict: true,
          schema: DRAFT_GENERATION_STRUCTURED_OUTPUT.schema,
        },
      },
    }));
  });
});
