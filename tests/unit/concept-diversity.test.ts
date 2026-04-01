import { describe, it, expect } from 'vitest';
import {
  getCanonicalConcept,
  extractProductTypeWords,
  ETSY_SYNONYM_MAP,
} from '../../lib/seo/concept-diversity.js';

describe('extractProductTypeWords', () => {
  it('splits and lowercases a product type name', () => {
    expect(extractProductTypeWords('Ceramic Mug')).toEqual(['ceramic', 'mug']);
  });

  it('applies synonym normalization', () => {
    const result = extractProductTypeWords('Wooden Tshirt');
    expect(result).toEqual(['wood', 'shirt']);
  });

  it('strips punctuation', () => {
    const result = extractProductTypeWords('Hand-Made, Mug!');
    expect(result).toEqual(['handmade', 'mug']);
  });

  it('returns empty array for empty string', () => {
    expect(extractProductTypeWords('')).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(extractProductTypeWords(null as any)).toEqual([]);
    expect(extractProductTypeWords(undefined as any)).toEqual([]);
  });
});

describe('getCanonicalConcept', () => {
  const productTypeWords = ['mug', 'cup'];

  it('resolves synonyms via ETSY_SYNONYM_MAP', () => {
    // "personalized" → "custom", "wooden" → "wood"
    const result = getCanonicalConcept('personalized wooden mug', productTypeWords);
    // After synonym: "custom wood mug", remove product type "mug" → ["custom", "wood"], sorted
    expect(result).toBe('custom wood');
  });

  it('excludes product type words from concept key', () => {
    // "ceramic tea cup" → remove "cup" → ["ceramic", "tea"], sorted
    const result = getCanonicalConcept('ceramic tea cup', productTypeWords);
    expect(result).toBe('ceramic tea');
  });

  it('groups synonym pairs to the same concept', () => {
    // "pottery" is NOT in the synonym map, so "ceramic tea cup" and "pottery tea cup" differ
    // But "personalized mug" and "customized mug" should match
    const a = getCanonicalConcept('personalized gift mug', productTypeWords);
    const b = getCanonicalConcept('customized gift mug', productTypeWords);
    expect(a).toBe(b); // both resolve "custom" + "gift"
  });

  it('strips punctuation', () => {
    const result = getCanonicalConcept('hand-made, ceramic! mug', productTypeWords);
    // "handmade ceramic mug" → remove "mug" → ["ceramic", "handmade"], sorted, take 2
    expect(result).toBe('ceramic handmade');
  });

  it('normalizes multiple whitespace', () => {
    const result = getCanonicalConcept('  ceramic   tea   mug  ', productTypeWords);
    expect(result).toBe('ceramic tea');
  });

  it('sorts qualifiers alphabetically and takes max 2', () => {
    // "rustic boho ceramic mug" → remove "mug" → ["rustic", "boho", "ceramic"], sorted → ["boho", "ceramic", "rustic"], take 2
    const result = getCanonicalConcept('rustic boho ceramic mug', productTypeWords);
    expect(result).toBe('boho ceramic');
  });

  it('falls back to full sorted tag when all words are product types', () => {
    // If every word is a product type word, qualifiers is empty → fallback
    const result = getCanonicalConcept('mug cup', productTypeWords);
    // All removed → fallback: full sorted normalized = "cup mug"
    expect(result).toBe('cup mug');
  });

  it('handles single qualifier word', () => {
    const result = getCanonicalConcept('ceramic mug', productTypeWords);
    // remove "mug" → ["ceramic"]
    expect(result).toBe('ceramic');
  });

  it('handles no product type words to exclude', () => {
    const result = getCanonicalConcept('ceramic tea cup', []);
    // No exclusion → ["ceramic", "cup", "tea"], sorted, take 2
    expect(result).toBe('ceramic cup');
  });
});
