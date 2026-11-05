export const SEO_STATUS_LABELS = {
  NEW: 'To Analyze',
  ANALYZED: 'To Generate',
  SEO_READY: 'Keywords Available',
  DRAFT_READY: 'Ready to Draft',
  OPTIMIZED: 'Content Generated',
};

function isPreparationClaimExpired(etsyListing, now) {
  if (etsyListing?.preparation_status !== 'preparing') return false;
  const expiresAt = Date.parse(etsyListing.preparation_claim_expires_at || '');
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

/**
 * Produces display-only metadata for one Studio listing. This does not grant
 * Etsy capabilities: routes remain responsible for ownership and canonical
 * linkage validation.
 */
export function getSeoListingPresentation(listing, etsyListing, {
  etsyMetadataAvailable = true,
  now = Date.now(),
} = {}) {
  const declaredEtsy = listing?.source === 'etsy';
  const hasEtsyLink = Boolean(etsyListing?.listing_id && etsyListing.listing_id === listing?.id);

  if (!etsyMetadataAvailable) {
    return {
      origin: declaredEtsy ? 'etsy' : 'manual',
      originLabel: declaredEtsy ? 'Etsy' : 'Manual',
      isEtsyLinked: false,
      etsyNotice: null,
    };
  }

  // A failed metadata read must not be rendered as a broken canonical link.
  const originMismatch = (declaredEtsy && !hasEtsyLink) || (!declaredEtsy && hasEtsyLink);

  if (originMismatch) {
    return {
      origin: 'unknown',
      originLabel: 'Verify Origin',
      isEtsyLinked: false,
      etsyNotice: null,
    };
  }

  const isEtsyLinked = declaredEtsy && hasEtsyLink;
  const presentation = {
    origin: isEtsyLinked ? 'etsy' : 'manual',
    originLabel: isEtsyLinked ? 'Etsy' : 'Manual',
    isEtsyLinked,
    etsyNotice: null,
  };

  if (!isEtsyLinked) return presentation;

  if (etsyListing.preparation_status === 'error' || isPreparationClaimExpired(etsyListing, now)) {
    return { ...presentation, etsyNotice: { tone: 'attention', label: 'Preparation needs retry in My Shop' } };
  }
  if (etsyListing.preparation_status === 'preparing') {
    return { ...presentation, etsyNotice: { tone: 'progress', label: 'Preparation in progress' } };
  }
  if (etsyListing.scoring_status === 'error') {
    return { ...presentation, etsyNotice: { tone: 'attention', label: 'Scoring needs retry in My Shop' } };
  }
  if (etsyListing.scoring_status === 'scoring') {
    return { ...presentation, etsyNotice: { tone: 'progress', label: 'Scoring in progress' } };
  }

  if (['error', 'partial', 'conflict', 'published_unverified'].includes(etsyListing.export_status)) {
    return { ...presentation, etsyNotice: { tone: 'attention', label: 'Publication needs verification' } };
  }
  if (etsyListing.export_status === 'exported') {
    return { ...presentation, etsyNotice: { tone: 'success', label: 'Published' } };
  }

  return presentation;
}

export function filterSeoListings(listings, { origin = 'all', status, search = '' } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return listings.filter(({ listing, presentation }) => (
    (!status || listing.computed_status === status)
    && (origin === 'all' || presentation.origin === origin)
    && (!query || listing.title?.toLocaleLowerCase().includes(query))
  ));
}
