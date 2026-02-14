# Task: Competition Keywords — Updated Response Format + competitor_seed

## Completed Changes

- [x] **ProductStudio.jsx — handleCompetitionAnalysis**: Updated to parse `unwrapped.selectedTags` (new format) with fallbacks to `unwrapped.keywords` and flat array. Extracts `competitor_seed` and saves to `listings` table. Passes `competitor_seed` to UI state.
- [x] **ProductStudio.jsx — handleLoadListing**: Hydrates `competitor_seed` from `listings` table on history reload.
- [x] **ResultsDisplay.jsx**: Competition table header now includes an info (ℹ) tooltip with orange theme showing: "Based on the first ten Etsy listings returned by Google search with keywords [competitor_seed]".
- [x] **docs/context.md**: Updated with new response format and competitor_seed feature.

## n8n Response Format (Current)
```json
[
  {
    "competitor_seed": "Funny Christian Tee",
    "selectedTags": [
      {
        "keyword": "funny christian shirt",
        "avg_volume": 1300,
        "competition": 1,
        "opportunity_score": 9,
        "volumes_history": [1000, 1000, 1300, ...],
        "is_competion": true,
        "status": { "trending": false, "evergreen": true, "promising": false }
      }
    ]
  }
]
```

## Data Flow
```
Competition Analysis Button Click
  → handleCompetitionAnalysis()
  → POST to n8n (action: 'competitionAnalysis')
  → n8n returns [{ competitor_seed: "...", selectedTags: [...] }]
  → Save competitor_seed to listings table
  → DELETE listing_seo_stats WHERE is_competition = true
  → INSERT competition keywords with is_competition = true
  → UI: setResults({ competitor_seed, analytics: [...primary, ...competition] })
  → ResultsDisplay splits via useMemo → primary table + competition table
  → Competition table shows ℹ tooltip with competitor_seed text
```
