export const SEO_STATUS_LABELS = {
  NEW: 'À analyser',
  ANALYZED: 'À générer',
  SEO_READY: 'Mots-clés disponibles',
  DRAFT_READY: 'Prêt à rédiger',
  OPTIMIZED: 'Contenu généré',
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
      originLabel: declaredEtsy ? 'Etsy' : 'Manuel',
      isEtsyLinked: false,
      etsyNotice: null,
    };
  }

  // A failed metadata read must not be rendered as a broken canonical link.
  const originMismatch = (declaredEtsy && !hasEtsyLink) || (!declaredEtsy && hasEtsyLink);

  if (originMismatch) {
    return {
      origin: 'unknown',
      originLabel: 'Origine à vérifier',
      isEtsyLinked: false,
      etsyNotice: null,
    };
  }

  const isEtsyLinked = declaredEtsy && hasEtsyLink;
  const presentation = {
    origin: isEtsyLinked ? 'etsy' : 'manual',
    originLabel: isEtsyLinked ? 'Etsy' : 'Manuel',
    isEtsyLinked,
    etsyNotice: null,
  };

  if (!isEtsyLinked) return presentation;

  if (etsyListing.preparation_status === 'error' || isPreparationClaimExpired(etsyListing, now)) {
    return { ...presentation, etsyNotice: { tone: 'attention', label: 'Préparation à réessayer dans My Shop' } };
  }
  if (etsyListing.preparation_status === 'preparing') {
    return { ...presentation, etsyNotice: { tone: 'progress', label: 'Préparation en cours' } };
  }
  if (etsyListing.scoring_status === 'error') {
    return { ...presentation, etsyNotice: { tone: 'attention', label: 'Scoring à réessayer dans My Shop' } };
  }
  if (etsyListing.scoring_status === 'scoring') {
    return { ...presentation, etsyNotice: { tone: 'progress', label: 'Scoring en cours' } };
  }

  if (['error', 'partial', 'conflict', 'published_unverified'].includes(etsyListing.export_status)) {
    return { ...presentation, etsyNotice: { tone: 'attention', label: 'Publication à vérifier' } };
  }
  if (etsyListing.export_status === 'exported') {
    return { ...presentation, etsyNotice: { tone: 'success', label: 'Publié' } };
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
