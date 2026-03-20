# Add-From-Favorite API Route

## Implementation
- [x] Add `POST /api/seo/add-from-favorite` route to `server.mjs`
- [x] Update startup log in `server.mjs` to list `POST /api/seo/add-from-favorite`
- [x] Create `test-add-from-favorite.mjs` test script
- [x] Update `docs/context.md` with session handover entry

## Review
### Summary
- **Route**: `POST /api/seo/add-from-favorite` added to `server.mjs` (lines 1032–1244)
- **Pattern**: Follows `user-keyword` architecture — no DataForSEO call, AI scoring in parallel, bulk upsert, pool re-ranking
- **Key flags**: `is_pinned: true`, `is_user_added: true` on all inserted keywords
- **Pool integrity**: `is_selection_ia` preserved on existing keywords (not forcibly overwritten)
- **Files changed**: `server.mjs`, `docs/context.md`
- **Files created**: `test-add-from-favorite.mjs`, `tasks/todo.md`
