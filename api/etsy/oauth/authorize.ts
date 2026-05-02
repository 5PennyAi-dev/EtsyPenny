import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../lib/supabase/server.js';
import { initSentry, Sentry } from '../../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../../lib/auth/verify-request-user.js';
import {
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
  DEFAULT_SCOPES,
} from '../../../lib/etsy/oauth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = process.env.ETSY_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      console.error('[etsy-oauth-authorize] Missing ETSY_API_KEY or ETSY_OAUTH_REDIRECT_URI');
      return res.status(500).json({ error: 'Etsy OAuth not configured' });
    }

    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();
    const scopes = DEFAULT_SCOPES.join(' ');

    const { error: insertError } = await supabaseAdmin
      .from('etsy_oauth_states')
      .insert({
        user_id: user.id,
        state,
        code_verifier: codeVerifier,
        scopes,
        redirect_uri: redirectUri,
      });

    if (insertError) {
      Sentry.captureException(insertError);
      console.error('[etsy-oauth-authorize] DB insert failed:', insertError.message);
      return res.status(500).json({ error: 'Failed to start OAuth flow' });
    }

    const url = buildAuthorizationUrl({
      clientId,
      redirectUri,
      scopes: DEFAULT_SCOPES,
      state,
      codeChallenge,
    });

    console.log(`[etsy-oauth-authorize] user=${user.id} state created`);
    return res.status(200).json({ url });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[etsy-oauth-authorize] Unexpected error:', message);
    return res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
}
