export const MY_SHOP_TABS = [
  'to_optimize', 'in_progress', 'ready_to_publish', 'needs_attention', 'published', 'all',
];

export function mergeEtsyListings(existing = [], incoming = []) {
  const incomingById = new Map(incoming.map((listing) => [listing.etsy_listing_id, listing]));
  const existingIds = new Set(existing.map((listing) => listing.etsy_listing_id));

  return [
    ...existing.map((listing) => incomingById.get(listing.etsy_listing_id) || listing),
    ...incoming.filter((listing) => !existingIds.has(listing.etsy_listing_id)),
  ];
}

export function isScoreableEtsyListing(listing) {
  return Boolean(listing?.listing_id)
    && listing?.preparation_status !== 'preparing'
    && (listing?.scoring_status === 'pending' || listing?.scoring_status === 'error');
}

/** Returns a valid preparation-claim expiry only for an active preparation. */
export function getPreparationClaimExpiry(listing) {
  if (listing?.preparation_status !== 'preparing') return null;
  const expiresAt = Date.parse(listing?.preparation_claim_expires_at || '');
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

/** The browser may present a retry after expiry; the server remains authoritative. */
export function isPreparationClaimExpired(listing, now = Date.now()) {
  const expiresAt = getPreparationClaimExpiry(listing);
  return expiresAt !== null && expiresAt <= now;
}

/** Finds the next valid active claim expiry for one lightweight UI refresh. */
export function getNextPreparationClaimExpiry(listings = [], now = Date.now()) {
  return listings.reduce((nextExpiry, listing) => {
    const expiresAt = getPreparationClaimExpiry(listing);
    if (expiresAt === null || expiresAt <= now) return nextExpiry;
    return nextExpiry === null || expiresAt < nextExpiry ? expiresAt : nextExpiry;
  }, null);
}

function hasPublishableProposal(listing) {
  const pennyListing = listing?.listings;
  const fields = pennyListing?.etsy_proposal_fields;
  if (!fields || typeof fields !== 'object') return false;
  return Boolean(fields.title || fields.description || fields.tags);
}

/** Maps persisted workflow state, plus a short-lived local loading indicator, to one work tab. */
export function getMyShopUxState(listing, { isPreparing = false, now = Date.now() } = {}) {
  if (!listing) {
    return { category: 'to_optimize', progress: 'Not started', progressKey: 'not_started', publication: 'Not imported', publicationKey: 'not_ready', action: 'optimize', secondaryActions: ['view_etsy'] };
  }

  const exportStatus = listing.export_status || 'pending';
  if (['error', 'partial', 'conflict', 'published_unverified'].includes(exportStatus)) {
    const labels = { error: 'Publication failed', partial: 'Publication partial', conflict: 'Review required', published_unverified: 'Publication needs verification' };
    return { category: 'needs_attention', progress: 'SEO proposal available', progressKey: 'proposal', publication: labels[exportStatus], publicationKey: 'attention', action: exportStatus === 'published_unverified' ? 'verify' : 'review', secondaryActions: ['open_studio', 'view_etsy'] };
  }
  if (listing.preparation_status === 'error') {
    return {
      category: 'needs_attention', progress: 'Preparation needs retry', progressKey: 'error', publication: 'Not ready', publicationKey: 'not_ready', action: 'retry_preparation', secondaryActions: ['view_etsy'],
      error: listing.preparation_error || 'We could not prepare this listing. Please try again.',
    };
  }
  if (isPreparationClaimExpired(listing, now)) {
    return {
      category: 'needs_attention', progress: 'Preparation needs retry', progressKey: 'error', publication: 'Not ready', publicationKey: 'not_ready', action: 'retry_preparation', secondaryActions: ['view_etsy'],
      error: 'The previous preparation appears to have stopped. You can retry safely.',
    };
  }
  if (isPreparing || listing.preparation_status === 'preparing') {
    return { category: 'in_progress', progress: 'Preparing for Studio', progressKey: 'preparing', publication: 'Not ready', publicationKey: 'not_ready', action: 'working', secondaryActions: ['view_etsy'] };
  }
  if (listing.scoring_status === 'error') {
    return { category: 'needs_attention', progress: 'Scoring failed', progressKey: 'error', publication: 'Not ready', publicationKey: 'not_ready', action: 'retry_score', secondaryActions: ['open_studio', 'view_etsy'] };
  }
  if (listing.scoring_status === 'scoring') {
    return { category: 'in_progress', progress: 'Scoring in progress', progressKey: 'scoring', publication: 'Not ready', publicationKey: 'not_ready', action: 'working', secondaryActions: ['open_studio', 'view_etsy'] };
  }
  const hasCurrentProposal = hasPublishableProposal(listing);
  // A verified historical export stays published until an explicitly saved,
  // newer proposal exists. Scoring recommendations alone never change it.
  if (exportStatus === 'exported' && !hasCurrentProposal) {
    return { category: 'published', progress: 'Last optimization published', progressKey: 'published', publication: 'Published (verified)', publicationKey: 'published', action: 'view', secondaryActions: ['open_studio', 'view_etsy'] };
  }
  if (listing.scoring_status === 'scored' && hasCurrentProposal) {
    return { category: 'ready_to_publish', progress: 'SEO proposal ready', progressKey: 'proposal', publication: 'Ready to review', publicationKey: 'ready', action: 'review', secondaryActions: ['open_studio', 'view_etsy'] };
  }
  if (listing.scoring_status === 'scored') {
    return { category: 'in_progress', progress: 'Continue in Studio', progressKey: 'studio', publication: 'Not ready', publicationKey: 'not_ready', action: 'continue', secondaryActions: ['view_etsy'] };
  }
  if (!listing.listing_id) {
    return { category: 'to_optimize', progress: 'Preparation required', progressKey: 'preparation_required', publication: 'Not ready', publicationKey: 'not_ready', action: 'prepare', secondaryActions: ['view_etsy'] };
  }
  return { category: 'to_optimize', progress: 'Ready to score', progressKey: 'ready_to_score', publication: 'Not ready', publicationKey: 'not_ready', action: 'score', secondaryActions: ['open_studio', 'view_etsy'] };
}

export function isReviewableListing(listing) {
  return Boolean(listing?.listing_id && listing.scoring_status === 'scored' && hasPublishableProposal(listing));
}

/**
 * A selection is intentionally state-neutral. Each batch button only receives
 * the rows whose persisted preconditions match its operation.
 */
export function getMyShopBulkActionPlan(rows = []) {
  const plan = { importIds: [], scoreIds: [], reviewIds: [], skippedIds: [] };

  rows.forEach(({ etsyListing, imported }) => {
    const etsyId = etsyListing?.etsy_listing_id;
    if (etsyId == null) return;
    if (!imported) {
      plan.importIds.push(etsyId);
    } else if (isScoreableEtsyListing(imported)) {
      plan.scoreIds.push(etsyId);
    } else if (isReviewableListing(imported)) {
      plan.reviewIds.push(etsyId);
    } else {
      plan.skippedIds.push(etsyId);
    }
  });

  return plan;
}

export function isMyShopBulkSelectable(row) {
  const plan = getMyShopBulkActionPlan([row]);
  return plan.importIds.length + plan.scoreIds.length + plan.reviewIds.length === 1;
}

export function filterAndSortMyShopListings({
  etsyListings = [], importedListings = [], tab = 'all', search = '', progress = 'all', publication = 'all', sort = 'activity', preparingListingId = null, now = Date.now(),
}) {
  const importedByEtsyId = new Map(importedListings.map((listing) => [listing.etsy_listing_id, listing]));
  const query = search.trim().toLowerCase();
  const rows = etsyListings.map((etsyListing) => {
    const imported = importedByEtsyId.get(etsyListing.etsy_listing_id);
    const ux = getMyShopUxState(imported, {
      isPreparing: preparingListingId === etsyListing.etsy_listing_id,
      now,
    });
    return { etsyListing, imported, ux };
  }).filter((row) => (
    (tab === 'all' || row.ux.category === tab)
    && (progress === 'all' || row.ux.progressKey === progress)
    && (publication === 'all' || row.ux.publicationKey === publication)
    && (!query || row.etsyListing.title?.toLowerCase().includes(query))
  ));

  return rows.sort((a, b) => {
    if (sort === 'title') return (a.etsyListing.title || '').localeCompare(b.etsyListing.title || '');
    if (sort === 'score') {
      const aScore = a.imported?.listings?.listings_global_eval?.[0]?.listing_strength ?? a.imported?.original_score ?? -1;
      const bScore = b.imported?.listings?.listings_global_eval?.[0]?.listing_strength ?? b.imported?.original_score ?? -1;
      return bScore - aScore;
    }
    const aDate = a.imported?.last_exported_at || a.imported?.scored_at || a.imported?.imported_at || '';
    const bDate = b.imported?.last_exported_at || b.imported?.scored_at || b.imported?.imported_at || '';
    return String(bDate).localeCompare(String(aDate));
  });
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
