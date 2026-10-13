import { describe, expect, it } from 'vitest';
import {
  DraftGenerationValidationError,
  DRAFT_GENERATION_STRUCTURED_OUTPUT,
  parseDraftGenerationResponse,
} from '../../lib/ai/draft-generation.js';

const validDraft = JSON.stringify({ title: 'Retro cassette tape shirt', description: 'A valid description.' });

describe('draft generation response contract', () => {
  it('declares the strict two-field OpenAI schema', () => {
    expect(DRAFT_GENERATION_STRUCTURED_OUTPUT).toEqual({
      name: 'draft_generation',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description'],
        properties: { title: { type: 'string' }, description: { type: 'string' } },
      },
    });
  });

  it('keeps valid text without rewriting it, including a description outside the prompt word target', () => {
    const description = 'Short but structurally valid.';
    expect(parseDraftGenerationResponse(JSON.stringify({ title: 'Valid Etsy title', description })))
      .toEqual({ title: 'Valid Etsy title', description });
  });

  it.each([
    ['invalid JSON', '{'],
    ['missing description', JSON.stringify({ title: 'A title' })],
    ['unexpected property', JSON.stringify({ title: 'A title', description: 'A description', extra: true })],
    ['non-string title', JSON.stringify({ title: 12, description: 'A description' })],
    ['blank title', JSON.stringify({ title: '   ', description: 'A description' })],
    ['blank description', JSON.stringify({ title: 'A title', description: '\n\t' })],
    ['overlong title', JSON.stringify({ title: 'a'.repeat(141), description: 'A description' })],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseDraftGenerationResponse(raw)).toThrow(DraftGenerationValidationError);
  });

  it('accepts the exact expected object', () => {
    expect(parseDraftGenerationResponse(validDraft)).toEqual({
      title: 'Retro cassette tape shirt',
      description: 'A valid description.',
    });
  });
});
