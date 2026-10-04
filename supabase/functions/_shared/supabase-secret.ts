export function resolveSupabaseSecretKey(
  rawSecretKeys: string | undefined,
  keyName = 'default',
): string {
  if (!rawSecretKeys?.trim()) {
    throw new Error('Missing environment variable SUPABASE_SECRET_KEYS');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawSecretKeys);
  } catch {
    throw new Error('SUPABASE_SECRET_KEYS must be valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('SUPABASE_SECRET_KEYS must be a JSON object');
  }

  const selected = (parsed as Record<string, unknown>)[keyName];
  if (typeof selected !== 'string' || !selected.trim()) {
    throw new Error(`Supabase secret key "${keyName}" is not configured`);
  }

  return selected;
}
