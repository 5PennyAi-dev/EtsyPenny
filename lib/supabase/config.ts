export type Environment = Record<string, string | undefined>;

export interface SupabaseServerConfig {
  url: string;
  secretKey: string;
}

function requireEnvironmentVariable(name: string, env: Environment): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function getSupabaseServerConfig(
  env: Environment = process.env,
): SupabaseServerConfig {
  return {
    url: requireEnvironmentVariable('VITE_SUPABASE_URL', env),
    secretKey: requireEnvironmentVariable('SUPABASE_SECRET_KEY', env),
  };
}

export function getSupabaseEdgeHeaders(
  env: Environment = process.env,
): Record<string, string> {
  const { secretKey } = getSupabaseServerConfig(env);

  return {
    'Content-Type': 'application/json',
    apikey: secretKey,
  };
}
