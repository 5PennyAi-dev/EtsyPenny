import { describe, expect, it } from 'vitest';
import { filterAndSortMyShopListings, getMyShopListingStatus, getMyShopUxState, isScoreableEtsyListing, mergeEtsyListings } from '../../src/lib/my-shop-utils.js';

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
    const listing = { scoring_status: 'error' };
    expect(isScoreableEtsyListing(listing)).toBe(true);
    expect(getMyShopListingStatus(listing)).toBe('error');
    expect(isScoreableEtsyListing({ scoring_status: 'scoring' })).toBe(false);
  });

  it('uses a deterministic priority for attention, progress, proposals, and published listings', () => {
    expect(getMyShopUxState()).toMatchObject({ category: 'to_optimize', action: 'optimize' });
    expect(getMyShopUxState({ scoring_status: 'scoring' })).toMatchObject({ category: 'in_progress', action: 'working' });
    expect(getMyShopUxState({ scoring_status: 'error' })).toMatchObject({ category: 'needs_attention', action: 'retry_score' });
    expect(getMyShopUxState({ scoring_status: 'scored', selected_keyword_count: 13 })).toMatchObject({ category: 'ready_to_publish', action: 'review' });
    expect(getMyShopUxState({ scoring_status: 'scored', listings: { generated_title: 'A finished Etsy title' } })).toMatchObject({
      category: 'ready_to_publish', progress: 'SEO proposal ready',
    });
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'partial', selected_keyword_count: 13 })).toMatchObject({ category: 'needs_attention', publication: 'Publication partial' });
    expect(getMyShopUxState({ scoring_status: 'scored', export_status: 'exported', selected_keyword_count: 13 })).toMatchObject({ category: 'published', publication: 'Published (verified)' });
  });

  it('does not turn an unknown baseline into a confirmed conflict', () => {
    expect(getMyShopUxState({ scoring_status: 'scored', selected_keyword_count: 13 })).toMatchObject({
      category: 'ready_to_publish', publication: 'Ready to review',
    });
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
});
