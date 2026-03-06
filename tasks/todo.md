# Tasks: Advanced Keyword Filtering (Theme, Niche, Sub-niche)

## 1. UI/UX Design: Filter Controls
- [x] Add a `Filter` button next to the Search bar in the "Individual Keywords" tab.
- [x] When clicked, toggle an inline panel below the search bar containing three `select` dropdowns for Theme, Niche, and Sub-niche.
- [x] Ensure the panel has a clean, subtle background (e.g., `bg-slate-50/50`) and animation to slide/fade in.
- [x] Include a "Clear Filters" button to easily reset selections.

## 2. Dynamic Option Generation
- [x] Create derived state/memos to extract unique, non-empty values for Theme, Niche, and Sub-niche directly from the active `keywords` array.
- [x] (Optional UX Polish) If Theme is selected, dynamically narrow down the available Niche options to only those that appear under that Theme. Same for Sub-niche.

## 3. State Management & Filtering Logic
- [x] Add state `filters`: `{ theme: 'All', niche: 'All', subNiche: 'All' }`.
- [x] Modify the existing `filtered` memo (which handles search and Gemini settings) to also apply these three exact-match filters (when a value other than 'All' is selected).
- [x] Ensure changing a filter resets the `currentPage` to 1.
