import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe, PRICE_TO_PLAN, PRICE_TO_PACK, PLAN_TOKENS } from '../../lib/stripe/client.js';
import { supabaseAdmin } from '../../lib/supabase/server.js';

// Disable body parsing so we get the raw body for signature verification
export const config = { api: { bodyParser: false } };

function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  console.info(`[stripe-webhook] event=${event.type} id=${event.id}`);

  try {
    switch (event.type) {

      // ── Subscription created or one-time payment completed ──
      case 'checkout.session.completed': {
        const session = event.data.object as Record<string, any>;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        // Save Stripe customer ID
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: session.customer })
          .eq('id', userId);

        if (session.mode === 'subscription') {
          // Subscription checkout — plan will be handled by invoice.paid
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_id: session.subscription })
            .eq('id', userId);
        }

        if (session.mode === 'payment') {
          // One-time token pack purchase
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          const tokenAmount = PRICE_TO_PACK[priceId ?? ''];
          if (tokenAmount) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('tokens_bonus_balance')
              .eq('id', userId)
              .single();

            const newBonus = (profile?.tokens_bonus_balance ?? 0) + tokenAmount;
            await supabaseAdmin
              .from('profiles')
              .update({ tokens_bonus_balance: newBonus })
              .eq('id', userId);

            await supabaseAdmin.from('token_transactions').insert({
              user_id: userId,
              type: 'pack_purchase',
              amount: tokenAmount,
              balance_after: newBonus,
              description: `Token pack purchase: ${tokenAmount} tokens`,
            });
          }
        }
        break;
      }

      // ── Subscription renewed (monthly/yearly) ──
      case 'invoice.paid': {
        const invoice = event.data.object as Record<string, any>;
        const customerId = invoice.customer;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const planId = PRICE_TO_PLAN[priceId ?? ''];
        if (!planId) break;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (!profile) break;

        const userId = profile.id;
        const newTokens = PLAN_TOKENS[planId];
        const resetAt = new Date();
        resetAt.setMonth(resetAt.getMonth() + 1);

        await supabaseAdmin.from('profiles').update({
          subscription_plan: planId,
          subscription_status: 'active',
          tokens_monthly_balance: newTokens,
          tokens_reset_at: resetAt.toISOString(),
          add_custom_used: 0,
          add_favorite_used: 0,
          counters_reset_at: resetAt.toISOString(),
          subscription_end_at: new Date(invoice.lines?.data?.[0]?.period?.end * 1000).toISOString(),
        }).eq('id', userId);

        await supabaseAdmin.from('token_transactions').insert({
          user_id: userId,
          type: 'subscription_credit',
          amount: newTokens,
          balance_after: newTokens,
          description: `Monthly reset — ${planId} plan (${newTokens} tokens)`,
        });
        break;
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Record<string, any>;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single();
        if (!profile) break;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', profile.id);
        break;
      }

      // ── Subscription updated (upgrade/downgrade via Customer Portal) ──
      case 'customer.subscription.updated': {
        const sub = event.data.object as Record<string, any>;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planId = PRICE_TO_PLAN[priceId ?? ''];
        if (!planId) break;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, subscription_plan')
          .eq('stripe_customer_id', sub.customer)
          .single();
        if (!profile) break;

        // Only update plan — tokens reset happens on next invoice.paid
        await supabaseAdmin.from('profiles').update({
          subscription_plan: planId,
          subscription_status: sub.status,
          subscription_id: sub.id,
        }).eq('id', profile.id);
        break;
      }

      // ── Subscription canceled ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Record<string, any>;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .single();
        if (!profile) break;

        await supabaseAdmin.from('profiles').update({
          subscription_plan: 'free',
          subscription_status: 'canceled',
          subscription_id: null,
          tokens_monthly_balance: PLAN_TOKENS['free'],
          add_custom_used: 0,
          add_favorite_used: 0,
        }).eq('id', profile.id);
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }

  return res.json({ received: true });
}
