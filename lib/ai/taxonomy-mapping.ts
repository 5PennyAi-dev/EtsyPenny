import type { TaxonomyItem, TaxonomyMapping } from '../../types/definitions.js';
import type { StructuredOutputDefinition } from './types.js';

const TAXONOMY_MAPPING_FIELDS = ['theme', 'niche', 'sub_niche'] as const satisfies ReadonlyArray<keyof TaxonomyMapping>;

export class TaxonomyMappingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxonomyMappingValidationError';
  }
}

/**
 * OpenAI Structured Outputs schema for the existing taxonomy contract.
 * Membership in the supplied theme and niche lists is intentionally checked
 * in the application: those lists are per-request and must not be embedded
 * in a dynamic JSON Schema.
 */
export const TAXONOMY_MAPPING_STRUCTURED_OUTPUT: StructuredOutputDefinition = {
  name: 'taxonomy_mapping',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [...TAXONOMY_MAPPING_FIELDS],
    properties: {
      theme: { type: 'string' },
      niche: { type: 'string' },
      sub_niche: { type: 'string' },
    },
  },
};

/**
 * Validates a taxonomy response before it can be merged into image analysis
 * or persisted. The exact configured taxonomy labels are preserved; no
 * case-folding, synonym replacement, or automatic correction is performed.
 */
export function parseTaxonomyMappingResponse(
  raw: string,
  themes: TaxonomyItem[],
  niches: TaxonomyItem[],
): TaxonomyMapping {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TaxonomyMappingValidationError('Taxonomy mapping response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TaxonomyMappingValidationError('Taxonomy mapping response must be an object');
  }

  const response = parsed as Record<string, unknown>;
  const unexpectedFields = Object.keys(response).filter((field) => !TAXONOMY_MAPPING_FIELDS.includes(field as keyof TaxonomyMapping));
  if (unexpectedFields.length > 0) {
    throw new TaxonomyMappingValidationError(`Taxonomy mapping response has unexpected field(s): ${unexpectedFields.join(', ')}`);
  }

  const values = {} as TaxonomyMapping;
  for (const field of TAXONOMY_MAPPING_FIELDS) {
    const value = response[field];
    if (typeof value !== 'string' || !value.trim()) {
      throw new TaxonomyMappingValidationError(`Taxonomy mapping response has an invalid ${field}`);
    }
    values[field] = value.trim();
  }

  const allowedThemes = new Set(themes.map((theme) => theme.name));
  if (!allowedThemes.has(values.theme)) {
    throw new TaxonomyMappingValidationError('Taxonomy mapping response has an unknown theme');
  }

  const allowedNiches = new Set(niches.map((niche) => niche.name));
  if (!allowedNiches.has(values.niche)) {
    throw new TaxonomyMappingValidationError('Taxonomy mapping response has an unknown niche');
  }

  return values;
}
