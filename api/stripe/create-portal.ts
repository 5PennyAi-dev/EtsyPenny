import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe } from '../../lib/stripe/client.js';
import { supabaseAdmin } from '../../lib/supabase/server.js';
import { verifyRequestUser, AuthError } from '../../lib/auth/verify-request-user.js';
import { initSentry, Sentry } from '../../lib/sentry.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyRequestUser(req.headers.authorization, supabaseAdmin);

    const stripe = getStripe();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    console.info(`[create-portal] user=${user.id}`);
    return res.json({ url: session.url });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[create-portal] Error:', message);
    return res.status(500).json({ error: 'Failed to create portal session', details: message });
  }
}
