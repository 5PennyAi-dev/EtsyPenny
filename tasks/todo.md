# Task: Unified Creatable Search & Niche Selection

## 1. Data Fetching
- [x] **Fetch Logic**: Query `unified_niche_search` view with fuzzy search and user filter.

## 2. UI Component (SmartNicheAutocomplete)
- [x] **SmartNicheAutocomplete.jsx**: Implement searchable autocomplete.
- [x] **Display**: Show `name`, `parent_context`, and badges (Theme/Niche/Sub/Custom).
- [x] **Creatable**: Allow creating custom niches if no match found.

## 3. Insertion Logic
- [x] **Custom Creation**: Insert new niche into `user_custom_niches`.
- [x] **State Update**: Select the newly created niche.
- [x] **RLS**: Added SELECT, INSERT, DELETE policies on `user_custom_niches`.

## 4. Integration
- [x] **OptimizationForm**: Uses `SmartNicheAutocomplete` (was already integrated).
- [x] **Hydration**: Handles reload from history via `initialValues`.

---

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

---

# Task: Implement Inline "Add Keyword" Functionality

## Context
Implement a way for users to manually add their own keywords directly into the keyword table without using a modal.

## Execution Plan

### 1. UI Updates in `ResultsDisplay.jsx`
- [x] **State Management**: Add local states: `isAddingRow` (boolean) to toggle the input row, and `newKeywordInput` (string) for the input value.
- [x] **Trigger Button**: Add a "+ Add Custom Keyword" button directly below the primary keyword table (inside the `<tbody>` or immediately after it but within the table structure to keep alignment).
- [x] **Inline Entry Row**: When `isAddingRow` is true, render a new row `<tr>` at the bottom of the table.
    - Column 1-2: A text input spanning the "Tag" column.
    - Other Columns: Empty or showing a skeleton/spinner if loading.
- [x] **Auto-Focus**: Add a `useRef` to the input and a `useEffect` to focus it when `isAddingRow` becomes true.
- [x] **Submission Handling**: Add `onKeyDown` to detect `Enter`. Add `onBlur` to trigger submission. If input is empty, reset `isAddingRow` to false.

### 2. Logic Updates in `ProductStudio.jsx`
- [x] **API Call (`handleAddCustomKeyword`)**: Create a new handler function `handleAddCustomKeyword(keyword)` in `ProductStudio.jsx`.
    - Check for duplicates in the current `results.analytics`. If exists, maybe just select it and show a toast, returning early.
    - Set local loading state (`isAddingKeyword` or pass a flag down).
    - Send POST request to the webhook with payload `{"action": "userKeyword", "keyword": "..."}`.
- [x] **Data Integration**:
    - Once n8n returns data (Volume, Competition, Scores), structure the keyword object.
    - Set `is_selection_ia: true` to ensure it's automatically selected.
    - Set `is_user_added: true` as this is a custom keyword.
    - Insert the new keyword into the `listing_seo_stats` table in Supabase.
    - Update `setResults` (and `allSeoStats`/`globalEvals` if using Strategy Switcher) by appending/updating the new keyword.

### 3. Review & Cleanup
- [x] Ensure table styling consistency for the input row.
- [x] Add graceful error handling (e.g. invalid keyword, timeout).
- [x] Test unresponsive/mobile view scaling for the new row.
- [x] Update `docs/context.md` with the new feature.

## Review (Session 6)
- **Implemented**: Inline custom keyword row with Enter/Blur submission.
- **Hardened**: Fixed multiple crash vectors in `ResultsDisplay.jsx` related to null volumes and undefined history during sorting.
- **Improved**: Expanded `userKeyword` payload to provide full context to AI, and updated parsing to support multi-mode results automatically.
- **Verified**: Confirmed `is_user_added` hydration persists across page reloads and mode toggles.
