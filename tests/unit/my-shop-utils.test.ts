import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterAndSortMyShopListings, getMyShopBulkActionPlan, getMyShopListingStatus, getMyShopUxState, getNextPreparationClaimExpiry, isMyShopBulkSelectable, isScoreableEtsyListing, mergeEtsyListings } from '../../src/lib/my-shop-utils.js';

afterEach(() => vi.useRealTimers());

describe('My Shop listing helpers', () => {
  it('appends a later Etsy page without duplicates and refreshes overlapping listings', () => {
    const firstPage = [
      { etsy_listing_id: 'one', title: 'Original' },
      { etsy_listing_id: 'two', title: 'Second' },
    ];
    const nextPage = [
      { etsy_listing_id: 'two', title: 'Second refreshed' },
      { etsy_listing_id: 'three', title: 'Third' },
    ];

    expect(mergeEtsyListings(firstPage, nextPage)).toEqual([
      { etsy_listing_id: 'one', title: 'Original' },
      { etsy_listing_id: 'two', title: 'Second refreshed' },
      { etsy_listing_id: 'three', title: 'Third' },
    ]);
  });

  it('makes failed scoring retryable and visible in the errors filter', () => {
    const listing = { listing_id: 'listing-1', scoring_status: 'error' };
    expect(isScoreableEtsyListing(listing)).toBe(true);
    expect(getMyShopListingStatus(listing)).toBe('error');
    expect(isScoreableEtsyListing({ listing_id: 'listing-1', scoring_status: 'scoring' })).toBe(false);
  });

  it('uses a deterministic priority for attention, progress, proposals, and published listings', () => {
    expect(getMyShopUxState()).toMatchObject({ category: 'to_optimize', action: 'optimize' });
    expect(getMyShopUxState({ scoring_status: 'pending' })).toMatchObject({ action: 'prepare' });
    expect(getMyShopUxState({ listing_id: 'listing-1', scoring_status: 'pending' })).toMatchObject({ action: 'score' });
    expect(getMyShopUxState({ scoring_status: 'scoring' })).toMatchObject({ category: 'in_progress', action: 'working' });
    expect(getMyShopUxState({ scoring_status: 'pending', preparation_status: 'error', preparation_error: 'Safe message' })).toMatchObject({ action: 'retry_preparation', error: 'Safe message' });
    expect(getMyShopUxState({ scoring_status: 'pending', preparation_status: 'preparing' }, { now: Date.parse('2026-11-03T12:00:00.000Z') })).toMatchObject({ category: 'in_progress', action: 'working' });
    expect(getMyShopUxState({ scoring_status: 'error' })).toMatchObject({ category: 'needs_attention', action: 'retry_score' });
    expect(getMyShopUxState({ listing_id: 'listing-1', scoring_status: 'scored' })).toMatchObject({ action: 'continue' });
    expect(getMyShopUxState({ scoring_status: 'scored', selected_keyword_count: 13 })).toMatchObject({ category: 'in_progress', action: 'continue' });
    expect(getMyShopUxState({ scoring_status: 'scored', original_title: 'Old', listings: { generated_title: 'A finished Etsy title', etsy_proposal_fields: { title: { version: 'title-v1', updated_at: '2026-11-01T00:00:00.000Z' } } } })).toMatchObject({
      category: 'ready_to_publish', progress: 'SEO proposal ready',
    });
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'partial', selected_keyword_count: 13 })).toMatchObject({ category: 'needs_attention', publication: 'Publication partial' });
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'published_unverified', selected_keyword_count: 13 })).toMatchObject({ category: 'needs_attention', action: 'verify' });
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'exported', selected_keyword_count: 13 })).toMatchObject({ category: 'published', publication: 'Published (verified)' });
    expect(getMyShopUxState({ listing_id: 'listing-1', scoring_status: 'scored', export_status: 'exported' })).toMatchObject({ action: 'view' });
  });

  it('separates scoring recommendations from explicit current proposals', () => {
    for (const selected_keyword_count of [0, 5, 13]) {
      expect(getMyShopUxState({ scoring_status: 'scored', selected_keyword_count })).toMatchObject({
        category: 'in_progress', action: 'continue',
      });
    }
    expect(getMyShopUxState({ scoring_status: 'scored', proposal_tag_count: 5, listings: { etsy_proposal_fields: { tags: { version: 'tags-v1', updated_at: '2026-11-01T00:00:00.000Z' } } } })).toMatchObject({ category: 'ready_to_publish' });
    expect(getMyShopUxState({ scoring_status: 'scored', original_description: 'Old', listings: { generated_description: 'New', etsy_proposal_fields: { description: { version: 'description-v1', updated_at: '2026-11-01T00:00:00.000Z' } } } })).toMatchObject({ category: 'ready_to_publish' });
    expect(getMyShopUxState({ scoring_status: 'scored', proposal_tag_count: 13 })).toMatchObject({ category: 'in_progress' });
  });

  it('keeps a historical publication published until a newer explicit proposal exists', () => {
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'exported', proposal_tag_count: 5 })).toMatchObject({ category: 'published' });
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'exported', proposal_tag_count: 5, listings: { etsy_proposal_fields: { tags: { version: 'tags-v2', updated_at: '2026-11-02T00:00:00.000Z' } } } })).toMatchObject({ category: 'ready_to_publish' });
  });

  it('filters loaded listings, counts one exclusive category, and sorts locally', () => {
    const rows = filterAndSortMyShopListings({
      etsyListings: [
        { etsy_listing_id: 1, title: 'Zebra print' },
        { etsy_listing_id: 2, title: 'Apple mug' },
        { etsy_listing_id: 3, title: 'Berry card' },
      ],
      importedListings: [
        { etsy_listing_id: 1, scoring_status: 'scored', selected_keyword_count: 13, imported_at: '2026-10-01T00:00:00.000Z' },
        { etsy_listing_id: 2, scoring_status: 'error', imported_at: '2026-10-03T00:00:00.000Z' },
      ],
      tab: 'needs_attention', search: 'apple', sort: 'title',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].etsyListing.etsy_listing_id).toBe(2);
    expect(rows[0].ux.category).toBe('needs_attention');
  });

  it('keeps a mixed selection neutral and plans only compatible bulk actions', () => {
    const rows = [
      { etsyListing: { etsy_listing_id: 'new' }, imported: undefined },
      { etsyListing: { etsy_listing_id: 'score' }, imported: { id: 'score-row', etsy_listing_id: 'score', listing_id: 'listing-score', scoring_status: 'pending' } },
      { etsyListing: { etsy_listing_id: 'review' }, imported: { id: 'review-row', etsy_listing_id: 'review', listing_id: 'listing-1', scoring_status: 'scored', proposal_tag_count: 5, listings: { etsy_proposal_fields: { tags: { version: 'tags-v1', updated_at: '2026-11-01T00:00:00.000Z' } } } } },
      { etsyListing: { etsy_listing_id: 'working' }, imported: { id: 'working-row', etsy_listing_id: 'working', scoring_status: 'scoring' } },
    ];

    expect(getMyShopBulkActionPlan(rows)).toEqual({
      importIds: ['new'], scoreIds: ['score'], reviewIds: ['review'], skippedIds: ['working'],
    });
    expect(isMyShopBulkSelectable(rows[0])).toBe(true);
    expect(isMyShopBulkSelectable(rows[1])).toBe(true);
    expect(isMyShopBulkSelectable(rows[2])).toBe(true);
    expect(isMyShopBulkSelectable(rows[3])).toBe(false);
  });

  it('does not offer scoring while preparation is active or still required', () => {
    expect(isScoreableEtsyListing({ listing_id: 'listing-1', scoring_status: 'pending', preparation_status: 'preparing' })).toBe(false);
    expect(isScoreableEtsyListing({ scoring_status: 'pending', preparation_status: 'pending' })).toBe(false);
    expect(isScoreableEtsyListing({ listing_id: 'listing-1', scoring_status: 'pending', preparation_status: 'prepared' })).toBe(true);
  });

  it('keeps an active claim working, then exposes a retry at its persisted expiry', () => {
    vi.useFakeTimers();
    const expiry = Date.parse('2026-11-03T12:10:00.000Z');
    const activeClaim = {
      listing_id: 'listing-1', scoring_status: 'pending', preparation_status: 'preparing',
      preparation_claim_expires_at: '2026-11-03T12:10:00.000Z',
    };
    vi.setSystemTime(new Date('2026-11-03T12:09:59.000Z'));

    expect(getNextPreparationClaimExpiry([activeClaim])).toBe(expiry);
    expect(getMyShopUxState(activeClaim)).toMatchObject({ category: 'in_progress', action: 'working' });

    vi.setSystemTime(new Date('2026-11-03T12:10:00.000Z'));
    expect(getNextPreparationClaimExpiry([activeClaim])).toBeNull();
    expect(getMyShopUxState(activeClaim)).toMatchObject({
      category: 'needs_attention', action: 'retry_preparation',
      error: 'The previous preparation appears to have stopped. You can retry safely.',
    });
  });

  it('keeps missing or invalid claim expiries conservative and preserves exclusive tab counts', () => {
    const preparingWithoutExpiry = { etsy_listing_id: 'missing', scoring_status: 'pending', preparation_status: 'preparing' };
    const preparingWithInvalidExpiry = { etsy_listing_id: 'invalid', scoring_status: 'pending', preparation_status: 'preparing', preparation_claim_expires_at: 'not-a-date' };
    const expired = { etsy_listing_id: 'expired', scoring_status: 'pending', preparation_status: 'preparing', preparation_claim_expires_at: '2026-11-03T12:00:00.000Z' };
    const now = Date.parse('2026-11-03T12:00:01.000Z');

    expect(getMyShopUxState(preparingWithoutExpiry, { now })).toMatchObject({ category: 'in_progress', action: 'working' });
    expect(getMyShopUxState(preparingWithInvalidExpiry, { now })).toMatchObject({ category: 'in_progress', action: 'working' });
    expect(filterAndSortMyShopListings({
      etsyListings: [
        { etsy_listing_id: 'missing', title: 'Missing' },
        { etsy_listing_id: 'invalid', title: 'Invalid' },
        { etsy_listing_id: 'expired', title: 'Expired' },
      ],
      importedListings: [preparingWithoutExpiry, preparingWithInvalidExpiry, expired], now,
      tab: 'needs_attention',
    }).map((row) => row.etsyListing.etsy_listing_id)).toEqual(['expired']);
  });
});
