# Tasks: SEOLab Keyword Pagination

## 1. Setup Pagination State
- [x] Add `currentPage` (default 1) and `pageSize` (default 10) state in `SEOLab.jsx`.
- [x] Add options for user to select 10, 25, or 50 items per page.

## 2. Implement Data Slicing
- [x] Apply slicing to the `filtered` keywords array (which is already filtered by search and sorted) before rendering.
- [x] Ensure that when `searchQuery` or `sortField` or `sortDirection` changes, `currentPage` is reset to 1 to prevent empty page states.

## 3. UI: Pagination Controls
- [x] Modify the table footer for "Individual Keywords" to include:
  - "Row per page" dropdown (10, 25, 50).
  - Page navigation controls (Previous / Next buttons or `<` and `>`).
  - Text indicating "Showing X to Y of Z keywords".
- [x] Ensure the controls follow the existing UI aesthetic (slate/indigo accents, crisp typography).
