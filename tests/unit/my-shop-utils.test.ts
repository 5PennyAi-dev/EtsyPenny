import { describe, expect, it } from 'vitest';
import { getMyShopListingStatus, isScoreableEtsyListing, mergeEtsyListings } from '../../src/lib/my-shop-utils.js';

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
});
