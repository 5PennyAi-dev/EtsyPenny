/**
 * Canonical concept key for keyword diversity checking.
 * Handles permutations, synonyms, and product-type flooding.
 */

export const ETSY_SYNONYM_MAP: Record<string, string> = {
  // Face/body
  'facial': 'face',

  // Personalization
  'personalized': 'custom',
  'personalised': 'custom',
  'customized': 'custom',
  'customised': 'custom',
  'monogrammed': 'custom',

  // Clothing
  'tee': 'shirt',
  'tshirt': 'shirt',

  // Occasions
  'xmas': 'christmas',
  'bday': 'birthday',

  // Materials
  'wooden': 'wood',

  // Sizing
  'oversized': 'oversize',
};

/**
 * Split and normalize a product type name into its constituent words.
 */
export function extractProductTypeWords(productTypeName: string): string[] {
  return (productTypeName || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => ETSY_SYNONYM_MAP[w] || w);
}

/**
 * Compute a canonical concept key for diversity checking.
 *
 * 1. Normalize synonyms (facial→face, personalized→custom, etc.)
 * 2. Remove product type words (they appear in every keyword)
 * 3. Sort remaining qualifier words alphabetically
 * 4. Take first 2 as concept key
 *
 * If no qualifiers remain after removing product type words,
 * fall back to the full sorted+normalized tag.
 */
export function getCanonicalConcept(tag: string, productTypeWords: string[]): string {
  const words = tag.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

  // Apply synonym normalization
  const normalized = words.map(w => ETSY_SYNONYM_MAP[w] || w);

  // Remove product type words
  const qualifiers = normalized.filter(w => !productTypeWords.includes(w));

  // If no qualifiers remain, use full sorted tag
  if (qualifiers.length === 0) {
    return [...normalized].sort().join(' ');
  }

  // Sort qualifiers alphabetically, take up to 2
  return [...qualifiers].sort().slice(0, 2).join(' ');
}
