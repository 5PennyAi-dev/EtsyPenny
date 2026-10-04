import { describe, expect, it } from 'vitest';
import {
  getSupabaseEdgeHeaders,
  getSupabaseServerConfig,
} from '../../lib/supabase/config.js';
import { authenticateSecretKeyRequest } from '../../supabase/functions/_shared/server-auth.js';
import { resolveSupabaseSecretKey } from '../../supabase/functions/_shared/supabase-secret.js';

describe('Supabase server configuration', () => {
  it('fails when the new secret key is missing and does not use the legacy variable', () => {
    expect(() => getSupabaseServerConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-key-must-not-be-used',
    })).toThrow('Missing environment variable SUPABASE_SECRET_KEY');
  });

  it('builds Edge headers without using a Bearer credential', () => {
    const headers = getSupabaseEdgeHeaders({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: 'test-secret-key',
    });

    expect(headers.apikey).toBe('test-secret-key');
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers).not.toHaveProperty('x-api-key');
  });

  it('resolves the selected key from the Edge runtime key map', () => {
    expect(resolveSupabaseSecretKey(JSON.stringify({ edge_functions: 'test-secret-key' }), 'edge_functions'))
      .toBe('test-secret-key');
  });
});

describe('Edge Function server authentication', () => {
  const endpoint = 'https://example.invalid/functions/v1/test';
  const vercelCredential = 'expected-vercel-test-secret-key';
  const secretKeys = JSON.stringify({
    vercel: vercelCredential,
    edge_functions: 'edge-functions-test-secret-key',
  });

  it('rejects a request when authentication is not configured', async () => {
    const response = await authenticateSecretKeyRequest(new Request(endpoint), undefined, 'vercel');
    expect(response?.status).toBe(500);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await authenticateSecretKeyRequest(new Request(endpoint), secretKeys, 'vercel');
    expect(response?.status).toBe(401);
  });

  it('rejects an invalid credential', async () => {
    const request = new Request(endpoint, { headers: { apikey: 'wrong-test-secret-key' } });
    const response = await authenticateSecretKeyRequest(request, secretKeys, 'vercel');
    expect(response?.status).toBe(401);
  });

  it('rejects the Edge Function database key as a backend caller credential', async () => {
    const request = new Request(endpoint, { headers: { apikey: 'edge-functions-test-secret-key' } });
    const response = await authenticateSecretKeyRequest(request, secretKeys, 'vercel');
    expect(response?.status).toBe(401);
  });

  it('allows a request with the configured credential', async () => {
    const request = new Request(endpoint, { headers: { apikey: vercelCredential } });
    await expect(authenticateSecretKeyRequest(request, secretKeys, 'vercel')).resolves.toBeNull();
  });
});
