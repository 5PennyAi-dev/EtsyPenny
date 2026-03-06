# Tasks: Preset Modal Advanced Filtering

## 1. Create a Reusable Filter Component / Logic
- [x] Since the exact same Filtering logic is needed in `CreatePresetModal` and `EditPresetKeywordsModal`, we should ideally extract the filter state and unique options logic. 
- [x] Update `CreatePresetModal` and `EditPresetKeywordsModal` to include `filters` state (`{ theme: '', niche: '', subNiche: '' }`) and `showFilters` boolean.

## 2. Update Modals UI
- [x] Add the `Filter` button next to the search input in the modals, similar to the main SEO Lab page.
- [x] Add the filter dropdowns (Theme, Niche, Sub-niche) inside the modal content area when `showFilters` is true.

## 3. Filtering Logic
- [x] Update `filteredBank` in both modals to check: `search`, `theme`, `niche`, and `sub_niche`.
- [x] Compute `uniqueThemes`, `uniqueNiches`, and `uniqueSubNiches` dynamically based on `userKeywordBank` and the local modal `filters`.

## 4. UI Polish & Tidy Up
- [x] Ensure the Filter UI looks good constrained inside the modals (might need slightly tighter paddings).
- [x] Update `context.md` with the new features.
