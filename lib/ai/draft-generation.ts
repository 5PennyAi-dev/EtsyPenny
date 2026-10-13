import type { StructuredOutputDefinition } from './types.js';

const DRAFT_GENERATION_FIELDS = ['title', 'description'] as const;
const ETSY_TITLE_MAX_LENGTH = 140;

export type DraftGeneration = Record<(typeof DRAFT_GENERATION_FIELDS)[number], string>;

export class DraftGenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftGenerationValidationError';
  }
}

/** OpenAI Structured Outputs schema for the existing Magic Draft response. */
export const DRAFT_GENERATION_STRUCTURED_OUTPUT: StructuredOutputDefinition = {
  name: 'draft_generation',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [...DRAFT_GENERATION_FIELDS],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
    },
  },
};

/**
 * Validates the provider response before persistence or token deduction.
 * It deliberately does not rewrite text, truncate titles, or enforce the
 * prompt's non-structural description requirements.
 */
export function parseDraftGenerationResponse(raw: string): DraftGeneration {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DraftGenerationValidationError('Draft generation response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DraftGenerationValidationError('Draft generation response must be an object');
  }

  const response = parsed as Record<string, unknown>;
  const fields = Object.keys(response);
  if (fields.length !== DRAFT_GENERATION_FIELDS.length || fields.some((field) => !DRAFT_GENERATION_FIELDS.includes(field as (typeof DRAFT_GENERATION_FIELDS)[number]))) {
    throw new DraftGenerationValidationError('Draft generation response must contain exactly title and description');
  }

  const title = response.title;
  const description = response.description;
  if (typeof title !== 'string' || !title.trim()) {
    throw new DraftGenerationValidationError('Draft generation response has an invalid title');
  }
  if (typeof description !== 'string' || !description.trim()) {
    throw new DraftGenerationValidationError('Draft generation response has an invalid description');
  }
  if (title.length > ETSY_TITLE_MAX_LENGTH) {
    throw new DraftGenerationValidationError(`Draft generation title exceeds ${ETSY_TITLE_MAX_LENGTH} characters`);
  }

  return { title, description };
}
