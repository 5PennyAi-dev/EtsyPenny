/**
 * Mock for lib/ai/provider-router.ts (runAI function).
 */
import { vi } from 'vitest';

let _responseText = '{}';

/** Set the text response that runAI will return. */
export function mockAIResponse(text: string) {
  _responseText = text;
}

/** Reset to default response. */
export function resetAIMock() {
  _responseText = '{}';
}

export function setupAIMock() {
  vi.mock('../../lib/ai/provider-router.ts', () => ({
    runAI: vi.fn(async () => ({
      text: _responseText,
      usage: { input_tokens: 100, output_tokens: 50 },
      model: 'test-model',
      provider: 'test',
    })),
  }));
}
