export const SEO_GENERATION_FALLBACK_MESSAGE =
  'La génération des mots-clés a échoué. Veuillez réessayer plus tard.';

const SAFE_SEO_GENERATION_MESSAGES = new Set([
  "L'évaluation des mots-clés n'a pas pu être complétée. Aucun crédit n'a été débité. Veuillez réessayer plus tard.",
]);

/** Returns only backend text explicitly approved for presentation in the Studio. */
export function getSeoGenerationErrorMessage(error) {
  const message = error?.response?.data?.error;
  return typeof message === 'string' && SAFE_SEO_GENERATION_MESSAGES.has(message.trim())
    ? message.trim()
    : SEO_GENERATION_FALLBACK_MESSAGE;
}
