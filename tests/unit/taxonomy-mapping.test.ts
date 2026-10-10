import { describe, expect, it } from 'vitest';
import {
  parseTaxonomyMappingResponse,
  TAXONOMY_MAPPING_STRUCTURED_OUTPUT,
} from '../../lib/ai/taxonomy-mapping.js';

const themes = [
  { id: 'theme-1', name: 'Vintage & Retro', description: null, origin: 'pennyseo' as const },
  { id: 'theme-2', name: 'My Exact Theme', description: null, origin: 'custom' as const },
];
const niches = [
  { id: 'niche-1', name: 'Music Lovers', description: null, origin: 'pennyseo' as const },
  { id: 'niche-2', name: 'My Exact Niche', description: null, origin: 'custom' as const },
];

const validResponse = JSON.stringify({
  theme: 'My Exact Theme',
  niche: 'My Exact Niche',
  sub_niche: 'Retro Music Apparel',
});

describe('taxonomy mapping contract', () => {
  it('defines the existing strict OpenAI output shape', () => {
    expect(TAXONOMY_MAPPING_STRUCTURED_OUTPUT).toEqual({
      name: 'taxonomy_mapping',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['theme', 'niche', 'sub_niche'],
        properties: {
          theme: { type: 'string' },
          niche: { type: 'string' },
          sub_niche: { type: 'string' },
        },
      },
    });
  });

  it('accepts exact configured labels and preserves them', () => {
    expect(parseTaxonomyMappingResponse(validResponse, themes, niches)).toEqual({
      theme: 'My Exact Theme',
      niche: 'My Exact Niche',
      sub_niche: 'Retro Music Apparel',
    });
  });

  it.each([
    ['invalid JSON', '{'],
    ['array', '[]'],
    ['missing field', JSON.stringify({ theme: 'My Exact Theme', niche: 'My Exact Niche' })],
    ['empty field', JSON.stringify({ theme: 'My Exact Theme', niche: 'My Exact Niche', sub_niche: '   ' })],
    ['unexpected field', JSON.stringify({ theme: 'My Exact Theme', niche: 'My Exact Niche', sub_niche: 'Retro Music Apparel', extra: true })],
    ['unknown theme', JSON.stringify({ theme: 'my exact theme', niche: 'My Exact Niche', sub_niche: 'Retro Music Apparel' })],
    ['unknown niche', JSON.stringify({ theme: 'My Exact Theme', niche: 'music lovers', sub_niche: 'Retro Music Apparel' })],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseTaxonomyMappingResponse(raw, themes, niches)).toThrow();
  });
});
