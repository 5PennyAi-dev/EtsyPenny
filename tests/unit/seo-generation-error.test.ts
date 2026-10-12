import { describe, expect, it } from 'vitest';
import {
  getSeoGenerationErrorMessage,
  SEO_GENERATION_FALLBACK_MESSAGE,
} from '../../src/lib/seo-generation-error.js';

describe('getSeoGenerationErrorMessage', () => {
  it('keeps the approved application message returned by a 502 response', () => {
    const message = "L'évaluation des mots-clés n'a pas pu être complétée. Aucun crédit n'a été débité. Veuillez réessayer plus tard.";

    expect(getSeoGenerationErrorMessage({ response: { status: 502, data: { error: message } } })).toBe(message);
  });

  it('uses a generic message when the response has no usable application message', () => {
    expect(getSeoGenerationErrorMessage({ response: { status: 502, data: {} } })).toBe(SEO_GENERATION_FALLBACK_MESSAGE);
  });

  it('does not expose technical provider or Axios messages', () => {
    expect(getSeoGenerationErrorMessage({
      response: { data: { error: 'OpenAIError: rate limit\nstack trace' } },
    })).toBe(SEO_GENERATION_FALLBACK_MESSAGE);
  });

  it('is pure and does not alter the existing error or trigger a retry', () => {
    const error = { response: { data: { error: 'AxiosError: request failed' } } };
    const original = structuredClone(error);

    getSeoGenerationErrorMessage(error);

    expect(error).toEqual(original);
  });
});
