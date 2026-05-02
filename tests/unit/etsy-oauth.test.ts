import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  ETSY_TOKEN_URL,
  ETSY_AUTHORIZATION_URL,
} from '../../lib/etsy/oauth.js';

describe('lib/etsy/oauth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('generatePKCE', () => {
    it('produces a verifier of length >= 43 and a challenge that is SHA-256(verifier)', async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
      const bytes = new Uint8Array(digest);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const expected = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      expect(codeChallenge).toBe(expected);
    });

    it('returns different values on each call', async () => {
      const a = await generatePKCE();
      const b = await generatePKCE();
      expect(a.codeVerifier).not.toBe(b.codeVerifier);
      expect(a.codeChallenge).not.toBe(b.codeChallenge);
    });
  });

  describe('generateState', () => {
    it('returns a non-empty string and is different on each call', () => {
      const a = generateState();
      const b = generateState();
      expect(a.length).toBeGreaterThanOrEqual(43);
      expect(a).not.toBe(b);
      expect(a).not.toMatch(/[+/=]/);
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('includes all required params with code_challenge_method=S256', () => {
      const url = buildAuthorizationUrl({
        clientId: 'abc123',
        redirectUri: 'https://example.com/callback',
        scopes: ['listings_r', 'shops_r'],
        state: 'state-xyz',
        codeChallenge: 'challenge-123',
      });

      expect(url.startsWith(`${ETSY_AUTHORIZATION_URL}?`)).toBe(true);
      const u = new URL(url);
      expect(u.searchParams.get('response_type')).toBe('code');
      expect(u.searchParams.get('client_id')).toBe('abc123');
      expect(u.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
      expect(u.searchParams.get('state')).toBe('state-xyz');
      expect(u.searchParams.get('code_challenge')).toBe('challenge-123');
      expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('URL-encodes the redirect URI and joins scopes with spaces', () => {
      const url = buildAuthorizationUrl({
        clientId: 'cid',
        redirectUri: 'https://example.com/cb?x=1&y=2',
        scopes: ['listings_r', 'listings_w', 'shops_r'],
        state: 's',
        codeChallenge: 'c',
      });

      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcb%3Fx%3D1%26y%3D2');
      expect(url).toContain('scope=listings_r+listings_w+shops_r');

      const u = new URL(url);
      expect(u.searchParams.get('scope')).toBe('listings_r listings_w shops_r');
      expect(u.searchParams.get('redirect_uri')).toBe('https://example.com/cb?x=1&y=2');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('posts the correct body and maps the response', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'AT',
            refresh_token: 'RT',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = await exchangeCodeForTokens({
        code: 'authcode',
        codeVerifier: 'verifier',
        redirectUri: 'https://example.com/cb',
        clientId: 'cid',
      });

      expect(result).toEqual({
        accessToken: 'AT',
        refreshToken: 'RT',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(ETSY_TOKEN_URL);
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const body = init.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('client_id')).toBe('cid');
      expect(body.get('redirect_uri')).toBe('https://example.com/cb');
      expect(body.get('code')).toBe('authcode');
      expect(body.get('code_verifier')).toBe('verifier');
    });

    it('throws with the Etsy error body on a 400 response', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      const errorBody = '{"error":"invalid_grant","error_description":"bad code"}';
      fetchMock.mockResolvedValueOnce(new Response(errorBody, { status: 400 }));

      await expect(
        exchangeCodeForTokens({
          code: 'bad',
          codeVerifier: 'v',
          redirectUri: 'https://example.com/cb',
          clientId: 'cid',
        }),
      ).rejects.toThrow(/invalid_grant/);
    });
  });

  describe('refreshAccessToken', () => {
    it('posts the correct body and returns the rotated refresh token', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'NEW_AT',
            refresh_token: 'NEW_RT',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = await refreshAccessToken({ refreshToken: 'OLD_RT', clientId: 'cid' });

      expect(result.refreshToken).toBe('NEW_RT');
      expect(result.refreshToken).not.toBe('OLD_RT');
      expect(result.accessToken).toBe('NEW_AT');

      const init = fetchMock.mock.calls[0][1];
      const body = init.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('client_id')).toBe('cid');
      expect(body.get('refresh_token')).toBe('OLD_RT');
    });
  });
});
