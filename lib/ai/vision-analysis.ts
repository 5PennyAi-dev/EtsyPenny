import type { VisualAnalysis } from '../../types/definitions.js';
import type { StructuredOutputDefinition } from './types.js';

const VISUAL_ANALYSIS_FIELDS = [
  'aesthetic_style',
  'typography_details',
  'graphic_elements',
  'color_palette',
  'target_audience',
  'overall_vibe',
] as const satisfies ReadonlyArray<keyof VisualAnalysis>;

export class AIResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIResponseValidationError';
  }
}

const visualAnalysisProperties = Object.fromEntries(
  VISUAL_ANALYSIS_FIELDS.map((field) => [field, { type: 'string' }]),
);

/**
 * OpenAI Structured Outputs schema for the existing visual-analysis contract.
 * The prompt remains the authority for semantic and length requirements; this
 * schema guarantees the object shape before application-level validation.
 */
export const VISUAL_ANALYSIS_STRUCTURED_OUTPUT: StructuredOutputDefinition = {
  name: 'visual_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['visual_analysis'],
    properties: {
      visual_analysis: {
        type: 'object',
        additionalProperties: false,
        required: [...VISUAL_ANALYSIS_FIELDS],
        properties: visualAnalysisProperties,
      },
    },
  },
};

/**
 * Validates the provider response before any taxonomy lookup or persistence.
 * This also protects Gemini responses, whose JSON mode is not a JSON Schema.
 */
export function parseVisualAnalysisResponse(raw: string): VisualAnalysis {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AIResponseValidationError('Visual analysis response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AIResponseValidationError('Visual analysis response must be an object');
  }

  const analysis = (parsed as { visual_analysis?: unknown }).visual_analysis;
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new AIResponseValidationError('Visual analysis response is missing visual_analysis');
  }

  const result = {} as VisualAnalysis;
  for (const field of VISUAL_ANALYSIS_FIELDS) {
    const value = (analysis as Record<string, unknown>)[field];
    if (typeof value !== 'string' || !value.trim()) {
      throw new AIResponseValidationError(`Visual analysis response has an invalid ${field}`);
    }
    result[field] = value.trim();
  }

  return result;
}
