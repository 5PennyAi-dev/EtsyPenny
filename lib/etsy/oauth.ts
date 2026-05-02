/**
 * Etsy OAuth primitives.
 *
 * Pure module: PKCE generation, authorization URL building, and token
 * exchange/refresh against Etsy's OAuth2 endpoints. No database access,
 * no Supabase client — callers are responsible for persistence.
 *
 * Works in both Node 20+ and the Vercel Edge runtime (Web Crypto API).
 */

export const ETSY_AUTHORIZATION_URL = 'https://www.etsy.com/oauth/connect';
export const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
export const DEFAULT_SCOPES = ['listings_r', 'listings_w', 'shops_r'] as const;

const REQUEST_TIMEOUT_MS = 15_000;

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: string; // always 'Bearer' from Etsy
}

export interface AuthorizationParams {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  codeChallenge: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in Node 20+ and Edge.
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function generatePKCE(): Promise<PKCEPair> {
  const verifierBytes = new Uint8Array(64);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64UrlEncode(verifierBytes);

  const verifierUtf8 = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', verifierUtf8);
  const codeChallenge = base64UrlEncode(new Uint8Array(digest));

  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function buildAuthorizationUrl(params: AuthorizationParams): string {
  const qs = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scopes.join(' '),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${ETSY_AUTHORIZATION_URL}?${qs.toString()}`;
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

async function postToken(body: URLSearchParams, op: string): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown network error';
    throw new Error(`[etsy-oauth] ${op} request failed: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[etsy-oauth] ${op} failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as RawTokenResponse;
  if (!data.access_token || !data.refresh_token || typeof data.expires_in !== 'number') {
    throw new Error(`[etsy-oauth] ${op} returned malformed token response`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type ?? 'Bearer',
  };
}

export async function exchangeCodeForTokens(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    code: args.code,
    code_verifier: args.codeVerifier,
  });
  return postToken(body, 'exchangeCodeForTokens');
}

export async function refreshAccessToken(args: {
  refreshToken: string;
  clientId: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: args.clientId,
    refresh_token: args.refreshToken,
  });
  return postToken(body, 'refreshAccessToken');
}
