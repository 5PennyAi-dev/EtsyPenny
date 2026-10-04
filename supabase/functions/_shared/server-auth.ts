import { resolveSupabaseSecretKey } from './supabase-secret.ts';

const jsonHeaders = { 'Content-Type': 'application/json' };

async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

async function secretsMatch(candidate: string, expected: string): Promise<boolean> {
  const [candidateDigest, expectedDigest] = await Promise.all([
    digest(candidate),
    digest(expected),
  ]);

  let difference = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= candidateDigest[index] ^ expectedDigest[index];
  }
  return difference === 0;
}

export async function authenticateSecretKeyRequest(
  request: Request,
  rawSecretKeys: string | undefined,
  callerKeyName: string,
): Promise<Response | null> {
  let expectedSecret: string;
  try {
    expectedSecret = resolveSupabaseSecretKey(rawSecretKeys, callerKeyName);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Server authentication is not configured' }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const candidate = request.headers.get('apikey');
  if (!candidate || !(await secretsMatch(candidate, expectedSecret))) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: jsonHeaders },
    );
  }

  return null;
}
