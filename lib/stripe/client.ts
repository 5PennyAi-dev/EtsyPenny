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

// Price ID → plan ID mapping
export const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TF0cxGxl45RKlyAP21opNxV': 'starter', // monthly
  'price_1TF0dqGxl45RKlyALp605XNZ': 'starter', // yearly
  'price_1TF0ePGxl45RKlyA8F1P5Xo0': 'growth',  // monthly
  'price_1TF0eiGxl45RKlyAPKRgNgxg': 'growth',  // yearly
  'price_1TF0fjGxl45RKlyARuGw7Qi0': 'pro',     // monthly
  'price_1TF0fSGxl45RKlyAJOSBzYrV': 'pro',     // yearly
};

// Price ID → token pack amount mapping
export const PRICE_TO_PACK: Record<string, number> = {
  'price_1TF0gQGxl45RKlyAsXzyORjo': 50,
  'price_1TF0gvGxl45RKlyAQqgFwnRW': 150,
  'price_1TF0iEGxl45RKlyAsANZkvst': 500,
};

export const PLAN_TOKENS: Record<string, number> = {
  free: 30,
  starter: 100,
  growth: 250,
  pro: 700,
};
