import { describe, expect, it } from 'vitest';
import { filterSeoListings, getSeoListingPresentation, SEO_STATUS_LABELS } from '../../src/lib/seo-listings-utils.js';

const etsyListing = (overrides = {}) => ({ listing_id: 'listing-etsy', ...overrides });
const studioListing = (overrides = {}) => ({ id: 'listing-etsy', source: 'etsy', computed_status: 'NEW', title: 'Etsy mug', ...overrides });

describe('SEO Listings presentation', () => {
  it('exposes the five validated labels without recalculating the SQL status', () => {
    expect(SEO_STATUS_LABELS).toEqual({
      NEW: 'To Analyze', ANALYZED: 'To Generate', SEO_READY: 'Keywords Available',
      DRAFT_READY: 'Ready to Draft', OPTIMIZED: 'Content Generated',
    });
  });

  it('renders a canonically linked Etsy listing and its persisted notices', () => {
    expect(getSeoListingPresentation(studioListing(), etsyListing({ preparation_status: 'preparing' })))
      .toMatchObject({ origin: 'etsy', originLabel: 'Etsy', isEtsyLinked: true, etsyNotice: { label: 'Preparation in progress' } });
    expect(getSeoListingPresentation(studioListing(), etsyListing({ scoring_status: 'error' })))
      .toMatchObject({ etsyNotice: { label: 'Scoring needs retry in My Shop', tone: 'attention' } });
    expect(getSeoListingPresentation(studioListing(), etsyListing({ export_status: 'published_unverified' })))
      .toMatchObject({ etsyNotice: { label: 'Publication needs verification' } });
    expect(getSeoListingPresentation(studioListing(), etsyListing({ export_status: 'exported' })))
      .toMatchObject({ etsyNotice: { label: 'Published', tone: 'success' } });
  });

  it('exposes an expired preparation claim as attention', () => {
    const presentation = getSeoListingPresentation(studioListing(), etsyListing({
      preparation_status: 'preparing', preparation_claim_expires_at: '2026-11-04T12:00:00.000Z',
    }), { now: Date.parse('2026-11-04T12:00:01.000Z') });
    expect(presentation.etsyNotice).toMatchObject({ label: 'Preparation needs retry in My Shop' });
  });

  it('keeps manual and historical listings manual without Etsy notices', () => {
    expect(getSeoListingPresentation({ id: 'manual', source: 'manual' })).toMatchObject({ origin: 'manual', originLabel: 'Manual', etsyNotice: null });
    expect(getSeoListingPresentation({ id: 'historical', source: null })).toMatchObject({ origin: 'manual', originLabel: 'Manual', etsyNotice: null });
  });

  it('shows confirmed mismatches but does not mistake an unavailable read for one', () => {
    expect(getSeoListingPresentation(studioListing(), null)).toMatchObject({ origin: 'unknown', originLabel: 'Verify Origin' });
    expect(getSeoListingPresentation({ id: 'manual', source: 'manual' }, etsyListing({ listing_id: 'manual' })))
      .toMatchObject({ origin: 'unknown', originLabel: 'Verify Origin' });
    expect(getSeoListingPresentation(studioListing(), null, { etsyMetadataAvailable: false }))
      .toMatchObject({ origin: 'etsy', originLabel: 'Etsy', etsyNotice: null });
  });

  it('combines origin, status and search filters', () => {
    const rows = [
      { listing: studioListing({ computed_status: 'SEO_READY', title: 'Etsy mug' }), presentation: { origin: 'etsy' } },
      { listing: { id: 'manual', source: 'manual', computed_status: 'SEO_READY', title: 'Manual mug' }, presentation: { origin: 'manual' } },
      { listing: { id: 'draft', source: 'manual', computed_status: 'DRAFT_READY', title: 'Manual poster' }, presentation: { origin: 'manual' } },
    ];
    expect(filterSeoListings(rows, { origin: 'manual', status: 'SEO_READY', search: 'mug' }).map(({ listing }) => listing.id)).toEqual(['manual']);
    expect(filterSeoListings(rows, { origin: 'etsy', status: 'SEO_READY' }).map(({ listing }) => listing.id)).toEqual(['listing-etsy']);
    expect(filterSeoListings(rows, { origin: 'all', status: 'OPTIMIZED' })).toEqual([]);
  });
});
