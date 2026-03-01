# Tasks

[x] Add a Pin icon next to the Favorite icon in `ResultsDisplay.jsx` table rows.
[x] Toggle `is_pinned` locally in `results.analytics` and in the Supabase database `listing_seo_stats` when clicked.
[x] Ensure pinned keywords always appear at the top of the selected 13 list (ordered by highest score if multiple are pinned).
[x] Update the `is_pinned` property in the `ResultsDisplay.jsx` props.
[x] Ensure that selecting/recalculating scores respects the pinned list (i.e., you can't manually un-select pinned properties unless you unpin them first).
[x] Update Context and commit.
