/**
 * Verbatim extract from server.mjs lines 40-43.
 * Strips markdown code fences from Gemini JSON responses.
 */
export function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}
