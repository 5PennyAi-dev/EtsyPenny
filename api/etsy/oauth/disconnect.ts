import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../../lib/supabase/server.js';
import { initSentry, Sentry } from '../../../lib/sentry.js';
import { verifyRequestUser, AuthError } from '../../../lib/auth/verify-request-user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    const { data, error } = await supabaseAdmin
      .from('etsy_shop_connections')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select('id');

    if (error) {
      Sentry.captureException(error);
      console.error('[etsy-oauth-disconnect] Update failed:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const deactivated = data?.length ?? 0;
    console.log(`[etsy-oauth-disconnect] user=${user.id} deactivated=${deactivated}`);
    return res.status(200).json({ success: true, deactivated });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[etsy-oauth-disconnect] Unexpected error:', message);
    return res.status(500).json({ error: 'Failed to disconnect' });
  }
}
