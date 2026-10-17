import type { SupabaseClient } from '@supabase/supabase-js';

interface ValidateExportListingArgs {
  db: SupabaseClient;
  userId: string;
  etsyListingId: number;
  listingId: string;
  connectionId: string;
}

export interface ExportEtsyListing {
  id: string;
  connection_id: string;
  listing_id: string | null;
  etsy_listing_id: number;
  original_title: string | null;
  original_description: string | null;
  original_tags: string[] | null;
}

export class EtsyExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EtsyExportValidationError';
  }
}

/**
 * Loads an Etsy import only when it is the exact PennySEO listing and active
 * Etsy connection requested for publication. Ownership remains part of the
 * database query and is never inferred from client input.
 */
export async function getOwnedLinkedEtsyListingForExport({
  db,
  userId,
  etsyListingId,
  listingId,
  connectionId,
}: ValidateExportListingArgs): Promise<ExportEtsyListing> {
  const { data, error } = await db
    .from('etsy_listings')
    .select('id, connection_id, listing_id, etsy_listing_id, original_title, original_description, original_tags')
    .eq('etsy_listing_id', etsyListingId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new EtsyExportValidationError('Etsy listing not found or not owned by this user');
  }

  const etsyListing = data as ExportEtsyListing;
  if (etsyListing.listing_id !== listingId) {
    throw new EtsyExportValidationError('PennySEO listing is not linked to this Etsy listing');
  }

  if (etsyListing.connection_id !== connectionId) {
    throw new EtsyExportValidationError('Etsy listing is not linked to the active shop connection');
  }

  return etsyListing;
}
