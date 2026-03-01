# Tasks: Create Supabase Edge Function `check-keyword-cache`

[x] 1. **Setup Edge Function Directory**
    - Create directory `supabase/functions/check-keyword-cache/`.
    - Create `index.ts` in the new directory.

[x] 2. **Implement Edge Function Logic (`index.ts`)**
    - Set up Deno HTTP server using `serve` from `std/http/server.ts`.
    - Implement standard CORS headers (allowing GET/POST/OPTIONS).
    - Parse JSON request body to extract the `keywords` array.
    - Initialize Supabase Admin Client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

[x] 3. **Implement Database Query & Filtering**
    - Query `public.keyword_cache` using `.in('tag', keywords)`.
    - Filter results to ensure `last_sync_at` is greater than `NOW() - 30 days` (freshness check).
    - Handle query errors and missing data gracefully.

[x] 4. **Return Results & Error Handling**
    - Return a JSON object with `{ "cachedKeywords": [...] }`.
    - Wrap the entire logic in a `try...catch` block.
    - Return appropriate HTTP status codes (200 for success, 400 for bad request, 500 for internal error).

[x] 5. **Documentation Update**
    - Update `docs/context.md` at the end of the session to reflect the new caching architecture and edge function.

# Additional Task: UI Refinement

[x] 1. **Keyword Performance Table Styling**
    - Changed percentage widths for metric columns to allocate more room (approx 15% to 25% adjusted) to the `Tag / Keyword` col.
    - Updated typography for `Avg. Vol` column to match the rest of the table but un-bolded.
