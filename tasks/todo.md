# Fix Missing Reach Value
- [x] Determine how `est_market_reach` is populated when the page first loads vs. when a new SEO strategy is applied via "Apply New Strategy".
- [x] Locate the 'Apply New Strategy' logic in `ProductStudio.jsx` and where it fetches/updates the `listing_global_eval` stats.
- [x] Ensure that `est_market_reach` is included in the Supabase query, hydrated to the local state, and properly passed to `<ResultsDisplay />`.
- [x] Update `context.md` with the fix.
- [x] Review and verify.

## Review
The issue occurred because the "Apply New Strategy" button triggers a fresh fetch of the `listings_global_eval` database rows via the `handleLoadListing` method. While the database row itself did contain `listing_est_market_reach`, the `constructedResults` object that Maps the raw database row into the React state was missing `listing_est_market_reach`. I added this property to the mapping object so that `<ResultsDisplay>` receives it correctly on refresh. No technical debt was added.
