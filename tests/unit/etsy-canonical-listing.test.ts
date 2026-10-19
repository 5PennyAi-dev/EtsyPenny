import { beforeEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_HOLDER_KEY = '__canonical_etsy_listing_supabase__';

vi.mock('../../lib/supabase/server.js', () => ({
  supabaseAdmin: new Proxy({}, {
    get(_target, property) {
      const client = (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY];
      if (!client) throw new Error('Supabase test client not configured');
      return client[property as string];
    },
  }),
}));

import { getOrCreateCanonicalEtsyListing } from '../../lib/etsy/get-or-create-canonical-listing.js';

describe('getOrCreateCanonicalEtsyListing', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as Record<string, any>)[SUPABASE_HOLDER_KEY] = { rpc };
  });

  it('uses only the server-side atomic function and returns its canonical row', async () => {
    rpc.mockResolvedValueOnce({
      data: [{ listing_id: 'canonical-listing', image_url: 'https://storage/image.jpg', created: false }],
      error: null,
    });

    await expect(getOrCreateCanonicalEtsyListing({
      etsyListingRowId: 'etsy-row', userId: 'owner', title: 'Otter Shirt', imageUrl: 'https://upload/image.jpg', productTypeId: 'type-1',
    })).resolves.toEqual({
      listingId: 'canonical-listing', imageUrl: 'https://storage/image.jpg', created: false,
    });

    expect(rpc).toHaveBeenCalledWith('get_or_create_etsy_canonical_listing', {
      p_etsy_listing_row_id: 'etsy-row',
      p_user_id: 'owner',
      p_title: 'Otter Shirt',
      p_image_url: 'https://upload/image.jpg',
      p_product_type_id: 'type-1',
    });
  });

  it('fails closed when the function returns no canonical listing', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });

    await expect(getOrCreateCanonicalEtsyListing({
      etsyListingRowId: 'etsy-row', userId: 'owner', title: 'Otter Shirt',
    })).rejects.toThrow('returned no listing');
  });
});
