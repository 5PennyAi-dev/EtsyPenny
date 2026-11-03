import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_HOLDER_KEY = '__prepare_listing_concurrency_supabase__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, {
    get(_target, property) {
      const client = (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY];
      if (!client) throw new Error('Supabase test client not configured');
      return client[property as string];
    },
  }),
}));
vi.mock('../../lib/auth/verify-request-user.js', () => ({
  verifyRequestUser: vi.fn(async () => ({ id: 'owner' })),
  AuthError: class AuthError extends Error { status = 401; },
}));
vi.mock('../../lib/etsy/preparation-state.js', () => ({
  claimEtsyListingForPreparation: vi.fn(),
  completeEtsyListingPreparation: vi.fn(),
  failEtsyListingPreparation: vi.fn(),
  preparationUserMessage: vi.fn(() => 'We could not prepare this listing. Please try again.'),
  PreparationClaimLostError: class PreparationClaimLostError extends Error { code = 'PREPARATION_CLAIM_LOST'; },
}));
vi.mock('../../lib/etsy/prepare-etsy-image.js', () => ({ downloadAndUploadEtsyImage: vi.fn() }));
vi.mock('../../lib/etsy/match-product-type.js', () => ({ matchProductType: vi.fn() }));
vi.mock('../../lib/etsy/get-or-create-canonical-listing.js', () => ({ getOrCreateCanonicalEtsyListing: vi.fn() }));
vi.mock('../../lib/sentry.js', () => ({ initSentry: vi.fn(), Sentry: { captureException: vi.fn() } }));

import prepareListing from '../../api/etsy/prepare-listing.js';
import { claimEtsyListingForPreparation, completeEtsyListingPreparation, failEtsyListingPreparation } from '../../lib/etsy/preparation-state.js';
import { downloadAndUploadEtsyImage } from '../../lib/etsy/prepare-etsy-image.js';
import { getOrCreateCanonicalEtsyListing } from '../../lib/etsy/get-or-create-canonical-listing.js';

const etsyRow = {
  id: 'etsy-row', etsy_listing_id: 123, listing_id: null, original_title: 'Otter Shirt',
  original_description: '', original_image_url: null, user_id: 'owner', etsy_category: null, preparation_status: 'pending',
};

function response() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function setSupabase(row = etsyRow, existingListing: any = null) {
  const etsyChain: any = {
    eq: vi.fn(() => etsyChain),
    single: vi.fn(async () => ({ data: row, error: null })),
  };
  const listingChain: any = {
    eq: vi.fn(() => listingChain),
    single: vi.fn(async () => ({ data: existingListing, error: null })),
  };
  (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY] = {
    from: vi.fn((table: string) => ({ select: vi.fn(() => (table === 'etsy_listings' ? etsyChain : listingChain)) })),
  };
}

describe('prepare-listing concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSupabase();
  });

  it('refuses a lost claim before image or canonical-listing work', async () => {
    vi.mocked(claimEtsyListingForPreparation).mockResolvedValueOnce(null);
    const res = response();

    await prepareListing({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_id: 'etsy-row' } } as any, res as any);

    expect(res.statusCode).toBe(409);
    expect(downloadAndUploadEtsyImage).not.toHaveBeenCalled();
    expect(getOrCreateCanonicalEtsyListing).not.toHaveBeenCalled();
  });

  it('finalizes only the claimed attempt after the canonical listing is ready', async () => {
    vi.mocked(claimEtsyListingForPreparation).mockResolvedValueOnce({ attemptId: 'attempt-1', expiresAt: '2026-11-03T12:10:00.000Z' });
    vi.mocked(getOrCreateCanonicalEtsyListing).mockResolvedValueOnce({ listingId: 'canonical-listing', imageUrl: null, created: true });
    const res = response();

    await prepareListing({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_id: 'etsy-row' } } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(completeEtsyListingPreparation).toHaveBeenCalledWith('owner', 'etsy-row', 'attempt-1');
    expect(res.body).toEqual({ listing_id: 'canonical-listing', image_url: null });
  });

  it('uses the same endpoint to complete a retry after an expired claim', async () => {
    setSupabase({
      ...etsyRow,
      preparation_status: 'preparing',
      preparation_claim_expires_at: '2026-11-03T11:50:00.000Z',
    });
    vi.mocked(claimEtsyListingForPreparation).mockResolvedValueOnce({ attemptId: 'replacement-attempt', expiresAt: '2026-11-03T12:10:00.000Z' });
    vi.mocked(getOrCreateCanonicalEtsyListing).mockResolvedValueOnce({ listingId: 'canonical-listing', imageUrl: null, created: true });
    const res = response();

    await prepareListing({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_id: 'etsy-row' } } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(completeEtsyListingPreparation).toHaveBeenCalledWith('owner', 'etsy-row', 'replacement-attempt');
  });

  it('persists only a safe error for a failed claimed attempt', async () => {
    vi.mocked(claimEtsyListingForPreparation).mockResolvedValueOnce({ attemptId: 'attempt-1', expiresAt: '2026-11-03T12:10:00.000Z' });
    vi.mocked(getOrCreateCanonicalEtsyListing).mockRejectedValueOnce(new Error('internal storage detail'));
    const res = response();

    await prepareListing({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_id: 'etsy-row' } } as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(failEtsyListingPreparation).toHaveBeenCalledWith('owner', 'etsy-row', 'attempt-1', 'We could not prepare this listing. Please try again.');
    expect(res.body).toEqual({ error: 'We could not prepare this listing. Please try again.' });
  });

  it('is idempotent for an already prepared canonical listing', async () => {
    setSupabase({ ...etsyRow, listing_id: 'canonical-listing', preparation_status: 'prepared' }, { id: 'canonical-listing', image_url: 'https://storage/image.jpg' });
    const res = response();

    await prepareListing({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { etsy_listing_id: 'etsy-row' } } as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ listing_id: 'canonical-listing', image_url: 'https://storage/image.jpg' });
    expect(claimEtsyListingForPreparation).not.toHaveBeenCalled();
    expect(getOrCreateCanonicalEtsyListing).not.toHaveBeenCalled();
  });
});
