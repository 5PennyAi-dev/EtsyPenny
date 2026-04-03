import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// Price ID → plan ID mapping (reads from STRIPE_PRICE_* env vars)
export const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'starter',
  [process.env.STRIPE_PRICE_STARTER_YEARLY!]:  'starter',
  [process.env.STRIPE_PRICE_GROWTH_MONTHLY!]:  'growth',
  [process.env.STRIPE_PRICE_GROWTH_YEARLY!]:   'growth',
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]:     'pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY!]:      'pro',
};

// Price ID → token pack amount mapping (reads from STRIPE_PRICE_* env vars)
export const PRICE_TO_PACK: Record<string, number> = {
  [process.env.STRIPE_PRICE_PACK_50!]:  50,
  [process.env.STRIPE_PRICE_PACK_150!]: 150,
  [process.env.STRIPE_PRICE_PACK_500!]: 500,
};

export const PLAN_TOKENS: Record<string, number> = {
  free: 30,
  starter: 100,
  growth: 250,
  pro: 700,
};
