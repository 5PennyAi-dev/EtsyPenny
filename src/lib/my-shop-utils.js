export function mergeEtsyListings(existing = [], incoming = []) {
  const incomingById = new Map(incoming.map((listing) => [listing.etsy_listing_id, listing]));
  const existingIds = new Set(existing.map((listing) => listing.etsy_listing_id));

  return [
    ...existing.map((listing) => incomingById.get(listing.etsy_listing_id) || listing),
    ...incoming.filter((listing) => !existingIds.has(listing.etsy_listing_id)),
  ];
}

export function isScoreableEtsyListing(listing) {
  return listing?.scoring_status === 'pending' || listing?.scoring_status === 'error';
}

export function getMyShopListingStatus(listing) {
  if (!listing) return 'not_imported';
  if (listing.scoring_status === 'error') return 'error';
  if (listing.scoring_status !== 'scored') return 'imported';
  if (listing.export_status === 'exported') return 'exported';

  const pennySeo = listing.listings?.listings_global_eval?.[0]?.listing_strength ?? null;
  if (pennySeo != null && pennySeo !== listing.original_score) return 'optimized';
  return 'scored';
}
