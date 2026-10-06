import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_HOLDER_KEY = '__stripe_auth_test_supabase__';
const STRIPE_HOLDER_KEY = '__stripe_auth_test_stripe__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, {
    get(_target, property) {
      const client = (globalThis as Record<string, unknown>)[SUPABASE_HOLDER_KEY] as Record<string, unknown> | undefined;
      if (!client) throw new Error('Supabase test client not configured');
      return client[property as string];
    },
  }),
}));

vi.mock('../../lib/stripe/client.js', () => ({
  getStripe: () => (globalThis as Record<string, unknown>)[STRIPE_HOLDER_KEY],
}));

vi.mock('../../lib/sentry.js', () => ({
  initSentry: vi.fn(),
  Sentry: { captureException: vi.fn() },
}));

import createCheckout from '../../api/stripe/create-checkout.js';
import createPortal from '../../api/stripe/create-portal.js';

function makeResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };

  return response;
}

function makeSupabaseClient(options: {
  authenticatedUser?: { id: string; email?: string | null } | null;
  authError?: unknown;
  stripeCustomerId?: string | null;
}) {
  const profileIds: string[] = [];
  const profileChain: Record<string, unknown> = {};
  profileChain.eq = vi.fn((_field: string, value: string) => {
    profileIds.push(value);
    return profileChain;
  });
  profileChain.single = vi.fn(async () => ({
    data: options.authenticatedUser ? { stripe_customer_id: options.stripeCustomerId ?? 'cus_authenticated' } : null,
    error: null,
  }));

  const updateChain = {
    eq: vi.fn(async () => ({ data: null, error: null })),
  };

  return {
    profileIds,
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: options.authenticatedUser ?? null },
          error: options.authError ?? null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => profileChain),
        update: vi.fn(() => updateChain),
      })),
    },
  };
}

function makeStripe() {
  return {
    customers: {
      create: vi.fn(async () => ({ id: 'cus_created_for_authenticated_user' })),
    },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ id: 'cs_authenticated', url: 'https://checkout.example.test/session' })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({ url: 'https://billing.example.test/session' })),
      },
    },
  };
}

function setSupabase(client: unknown) {
  (globalThis as Record<string, unknown>)[SUPABASE_HOLDER_KEY] = client;
}

describe('Stripe authenticated routes', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>)[STRIPE_HOLDER_KEY] = makeStripe();
  });

  it('refuses a checkout request without a bearer token', async () => {
    const { client } = makeSupabaseClient({ authenticatedUser: { id: 'authenticated-user' } });
    setSupabase(client);
    const response = makeResponse();

    await createCheckout({ method: 'POST', headers: {}, body: { priceId: 'price_1', mode: 'subscription' } } as any, response as any);

    expect(response.statusCode).toBe(401);
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it('refuses an invalid bearer token before opening the portal', async () => {
    const { client } = makeSupabaseClient({ authError: new Error('invalid token') });
    setSupabase(client);
    const response = makeResponse();

    await createPortal({ method: 'POST', headers: { authorization: 'Bearer invalid-token' }, body: {} } as any, response as any);

    expect(response.statusCode).toBe(401);
    expect((globalThis as Record<string, any>)[STRIPE_HOLDER_KEY].billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('uses the authenticated user for checkout even when a third-party userId is supplied', async () => {
    const { client, profileIds } = makeSupabaseClient({ authenticatedUser: { id: 'authenticated-user' } });
    setSupabase(client);
    const response = makeResponse();
    const stripe = (globalThis as Record<string, any>)[STRIPE_HOLDER_KEY];

    await createCheckout({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { priceId: 'price_1', mode: 'subscription', userId: 'third-party-user' },
    } as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(profileIds).toEqual(['authenticated-user']);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { user_id: 'authenticated-user' },
    }));
  });

  it('uses the authenticated user for an authorized portal request', async () => {
    const { client, profileIds } = makeSupabaseClient({ authenticatedUser: { id: 'authenticated-user' } });
    setSupabase(client);
    const response = makeResponse();
    const stripe = (globalThis as Record<string, any>)[STRIPE_HOLDER_KEY];

    await createPortal({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: { userId: 'third-party-user' },
    } as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(profileIds).toEqual(['authenticated-user']);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_authenticated',
    }));
  });
});
