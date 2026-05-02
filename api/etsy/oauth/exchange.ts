import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../lib/supabase/server.js';
import { initSentry, Sentry } from '../../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../../lib/auth/verify-request-user.js';
import { exchangeCodeForTokens } from '../../../lib/etsy/oauth.js';

const ETSY_API_BASE = 'https://openapi.etsy.com/v3/application';
const REQUEST_TIMEOUT_MS = 15_000;

interface ShopInfo {
  shop_id: number;
  shop_name: string | null;
  url: string | null;
}

function parseEtsyUserId(accessToken: string): number | null {
  const dotIdx = accessToken.indexOf('.');
  if (dotIdx <= 0) return null;
  const prefix = accessToken.slice(0, dotIdx);
  if (!/^\d+$/.test(prefix)) return null;
  const n = Number(prefix);
  return Number.isFinite(n) ? n : null;
}

async function fetchEtsyShop(
  etsyUserId: number,
  accessToken: string,
  clientId: string,
): Promise<ShopInfo | null> {
  const url = `${ETSY_API_BASE}/users/${etsyUserId}/shops`;
  const res = await fetch(url, {
    headers: {
      'x-api-key': `${clientId}:${process.env.ETSY_SHARED_SECRET ?? ''}`,
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Etsy shops fetch failed (${res.status}): ${body}`);
  }

  const data = await res.json() as
    | { shop_id?: number; shop_name?: string; url?: string }
    | { count?: number; results?: Array<{ shop_id: number; shop_name: string; url: string }> };

  if ('results' in data && Array.isArray(data.results)) {
    const first = data.results[0];
    if (!first) return null;
    return { shop_id: first.shop_id, shop_name: first.shop_name ?? null, url: first.url ?? null };
  }
  if ('shop_id' in data && typeof data.shop_id === 'number') {
    return { shop_id: data.shop_id, shop_name: data.shop_name ?? null, url: data.url ?? null };
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    const body = (req.body ?? {}) as { code?: unknown; state?: unknown };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim() : '';
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required fields: code, state' });
    }

    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = process.env.ETSY_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      console.error('[etsy-oauth-exchange] Missing ETSY_API_KEY or ETSY_OAUTH_REDIRECT_URI');
      return res.status(500).json({ error: 'Etsy OAuth not configured' });
    }

    // 1. Look up state row
    const { data: stateRow, error: stateErr } = await supabaseAdmin
      .from('etsy_oauth_states')
      .select('id, user_id, code_verifier, expires_at')
      .eq('state', state)
      .maybeSingle();

    if (stateErr) {
      Sentry.captureException(stateErr);
      console.error('[etsy-oauth-exchange] State lookup failed:', stateErr.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!stateRow) {
      return res.status(400).json({ error: 'Invalid or already used state' });
    }
    if (stateRow.user_id !== user.id) {
      return res.status(403).json({ error: 'State does not belong to this user' });
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'State expired' });
    }

    // 2. Consume state row (single-use)
    const { error: deleteErr } = await supabaseAdmin
      .from('etsy_oauth_states')
      .delete()
      .eq('id', stateRow.id);
    if (deleteErr) {
      console.warn('[etsy-oauth-exchange] State delete soft-failed:', deleteErr.message);
    }

    // 3. Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens({
        code,
        codeVerifier: stateRow.code_verifier,
        redirectUri,
        clientId,
      });
    } catch (err: unknown) {
      Sentry.captureException(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[etsy-oauth-exchange] Token exchange failed:', msg);
      return res.status(502).json({ error: 'Etsy token exchange failed', details: msg });
    }

    // 4. Parse Etsy user id from access token
    const etsyUserId = parseEtsyUserId(tokens.accessToken);
    if (etsyUserId === null) {
      console.error('[etsy-oauth-exchange] Failed to parse Etsy user id from access token');
      return res.status(502).json({ error: 'Unexpected token format from Etsy' });
    }

    // 5. Fetch shop
    let shop: ShopInfo | null;
    try {
      shop = await fetchEtsyShop(etsyUserId, tokens.accessToken, clientId);
    } catch (err: unknown) {
      Sentry.captureException(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[etsy-oauth-exchange] Shop fetch failed:', msg);
      return res.status(502).json({ error: 'Failed to fetch Etsy shop', details: msg });
    }
    if (!shop) {
      return res.status(422).json({
        error: 'This Etsy account has no shop. PennySEO requires a seller shop to connect.',
      });
    }

    // 6. Persist connection
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();

    const { error: deactivateErr } = await supabaseAdmin
      .from('etsy_shop_connections')
      .update({ is_active: false })
      .eq('user_id', user.id);
    if (deactivateErr) {
      Sentry.captureException(deactivateErr);
      console.error('[etsy-oauth-exchange] Deactivate failed:', deactivateErr.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('etsy_shop_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('etsy_shop_id', shop.shop_id)
      .maybeSingle();
    if (existingErr) {
      Sentry.captureException(existingErr);
      console.error('[etsy-oauth-exchange] Existing lookup failed:', existingErr.message);
      return res.status(500).json({ error: 'Database error' });
    }

    let connectionId: string;
    if (existing) {
      connectionId = existing.id;
      const { error: updateErr } = await supabaseAdmin
        .from('etsy_shop_connections')
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: tokenExpiresAt,
          shop_name: shop.shop_name,
          shop_url: shop.url,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateErr) {
        Sentry.captureException(updateErr);
        console.error('[etsy-oauth-exchange] Update failed:', updateErr.message);
        return res.status(500).json({ error: 'Database error' });
      }
    } else {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('etsy_shop_connections')
        .insert({
          user_id: user.id,
          etsy_shop_id: shop.shop_id,
          shop_name: shop.shop_name,
          shop_url: shop.url,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (insertErr || !inserted) {
        Sentry.captureException(insertErr);
        console.error('[etsy-oauth-exchange] Insert failed:', insertErr?.message);
        return res.status(500).json({ error: 'Database error' });
      }
      connectionId = inserted.id;
    }

    console.log(
      `[etsy-oauth-exchange] user=${user.id} shopId=${shop.shop_id} shopName=${shop.shop_name ?? '(none)'}`,
    );

    return res.status(200).json({
      success: true,
      shop: {
        id: connectionId,
        etsyShopId: shop.shop_id,
        shopName: shop.shop_name,
        shopUrl: shop.url,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[etsy-oauth-exchange] Unexpected error:', message);
    return res.status(500).json({ error: 'OAuth exchange failed' });
  }
}
