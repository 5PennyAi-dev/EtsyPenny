import { supabaseAdmin } from '../supabase/server.js';

export interface CanonicalEtsyListingInput {
  etsyListingRowId: string;
  userId: string;
  title: string;
  imageUrl?: string | null;
  productTypeId?: string | null;
}

export interface CanonicalEtsyListing {
  listingId: string;
  imageUrl: string | null;
  created: boolean;
}

/**
 * Calls the server-only SQL function which locks the Etsy row and either
 * returns its valid canonical listing or creates and links exactly one.
 */
export async function getOrCreateCanonicalEtsyListing(
  input: CanonicalEtsyListingInput,
): Promise<CanonicalEtsyListing> {
  const { data, error } = await supabaseAdmin.rpc('get_or_create_etsy_canonical_listing', {
    p_etsy_listing_row_id: input.etsyListingRowId,
    p_user_id: input.userId,
    p_title: input.title,
    p_image_url: input.imageUrl ?? null,
    p_product_type_id: input.productTypeId ?? null,
  });

  if (error) {
    throw new Error(`Failed to resolve canonical Etsy listing: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.listing_id) {
    throw new Error('Canonical Etsy listing function returned no listing');
  }

  return {
    listingId: row.listing_id,
    imageUrl: row.image_url ?? null,
    created: row.created === true,
  };
}
