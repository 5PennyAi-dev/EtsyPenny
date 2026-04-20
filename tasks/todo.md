# Fix keyword pool race condition — synchronous reset-pool

Branch: `feature/help-chatbot`

## Implementation checklist

- [x] Create `lib/seo/run-reset-pool.ts` — shared, pure `runResetPool(listing_id, overrideParameters)` function
- [x] Refactor `api/seo/reset-pool.ts` to be a thin wrapper around `runResetPool`
- [x] Refactor `server.mjs` reset-pool route to be a thin wrapper around `runResetPool`
- [x] Add `await runResetPool(listing_id, parameters)` after `persistSeo` in `api/seo/generate-keywords.ts`
- [x] Add `await runResetPool(listing_id, parameters)` after `persistSeo` in `server.mjs` generate-keywords route
- [x] Add `await runResetPool(listingId, params)` after `persistSeo` in `lib/etsy/score-etsy-listing.ts` (Etsy scoring path also lost the fire-and-forget chain)
- [x] Delete the fire-and-forget block in `supabase/functions/save-seo/index.ts` (lines 217–233 of the old file). Kept `trigger_reset_pool: true` in `persistSeo` payload so the edge function still skips its own `status_id: SEO_DONE` / `is_generating_seo: false` update — callers handle status AFTER `runResetPool`
- [x] Remove the 1.5 s `setTimeout` band-aid in `src/pages/ProductStudio.jsx` (old line 970)
- [x] Full test suite: 98/98 pass

## Review

### Summary
The Studio used to briefly flash all ~50–100 keywords after "Generate Keywords" before narrowing to the intended 25 (13 + 12). The root cause was a fire-and-forget call from the `save-seo` edge function to `/api/seo/reset-pool`, with the frontend "guessing" at a 1.5 s `setTimeout` before fetching keywords. The fix is a durable, deterministic pipeline: reset-pool logic now runs inline inside `generate-keywords` and is awaited before the HTTP response returns and before the listing status flips to `SEO_DONE`. No more guessing.

### Files created (1)
- `lib/seo/run-reset-pool.ts`

### Files modified (7)
- `api/seo/reset-pool.ts` — now a thin wrapper around `runResetPool`
- `api/seo/generate-keywords.ts` — awaits `runResetPool` after `persistSeo`
- `server.mjs` — both `/api/seo/reset-pool` (wrapper) and `/api/seo/generate-keywords` (inline `runResetPool`) updated
- `lib/seo/persist-seo.ts` — clarifying comment on `trigger_reset_pool: true` semantics (edge function skips status update)
- `lib/etsy/score-etsy-listing.ts` — awaits `runResetPool` after `persistSeo` (Etsy scoring was also relying on the fire-and-forget chain)
- `supabase/functions/save-seo/index.ts` — deleted fire-and-forget block; no longer reads `RESET_POOL_API_URL`
- `src/pages/ProductStudio.jsx` — removed the 1.5 s `setTimeout` band-aid in `handleAnalyze`
- `docs/context.md` — 2026-04-20 fix entry

### Why this solution will hold
- **Deterministic**: the pipeline is now one synchronous chain: `generateKeywordPool → enrich → score → selectAndScore → persistSeo → runResetPool → update listings status → respond`. The HTTP response only returns once the DB reflects the final `is_current_pool` / `is_current_eval` / `is_selection_ia` flags.
- **No timing hacks**: the 1.5 s `setTimeout` is gone. The realtime subscription on `listings.status_id` only sees `SEO_DONE` AFTER the pool is finalized.
- **Single source of truth**: `runResetPool` is the ONE implementation of pool-finalization logic. Both HTTP routes and all inline callers (generate-keywords, Etsy scoring) use it. No duplicated filter/selection logic.
- **No new test surface needed**: the existing `reset-pool.test.ts` covers `runResetPool` transitively (the endpoint is unchanged from the caller's perspective), and the 98-test suite passes.

### Deploy order
1. **First**: redeploy `save-seo` edge function — `npx supabase functions deploy save-seo`. It now ignores the fire-and-forget block (removed). Old clients sending `trigger_reset_pool: true` still work (edge function just skips its own status update, same as before).
2. **Then**: deploy Vercel functions + frontend together so `generate-keywords` runs `runResetPool` inline and `ProductStudio.jsx` no longer has the `setTimeout`.

### Visual QA — user needs to verify in the browser
1. [ ] Navigate to Studio → upload a new mockup → wait for image analysis → click **Generate Keywords**.
2. [ ] When the loader clears, the Keyword Performance table shows exactly 25 rows (or `max(ai_selection_count, working_pool_count)` matching user settings — default 13 + 12 = 25). **No initial flash of ~50-100 rows.**
3. [ ] In Supabase: `SELECT COUNT(*) FROM listing_seo_stats WHERE listing_id = '<id>' AND is_current_pool = true;` → 25.
4. [ ] Same query with `is_current_eval = true` → 13 (default).
5. [ ] Click **Apply Strategy** with a different weight — list refreshes to 25 correctly.
6. [ ] Add a custom keyword via **+ Keyword** — appears immediately, pool still sane.
7. [ ] Relaunch SEO on an existing listing — same behavior.
8. [ ] **Magic Draft** — queries `is_current_eval = true` limit 13 — still returns 13 tags.
9. [ ] **Etsy score-listings** flow (import → score) — pool still finalizes to 25 on imported Etsy listings.
10. [ ] **Etsy export** — `is_current_eval = true` still returns the correct tags.

### Technical debt / follow-ups
- Pre-existing `lib/etsy/score-etsy-listing.ts` TS strict-mode errors around `listingId: string | null` remain (not touched — my `runResetPool` call inherits the same type profile as the adjacent pre-existing `persistSeo` call).
- Pre-existing build error in `src/components/docs/MarkdownArticle.jsx` (docs-path resolution) is unrelated and blocks `npm run build` globally — exists on `main` too. Not addressed here.
- The `save-seo` edge function still accepts `trigger_reset_pool` in its payload and uses it to gate its internal `status_id: SEO_DONE` update. This flag is now semantically "let the caller own the status transition" and could be renamed in a future cleanup pass (not worth the cross-cutting deploy coordination for a rename).
