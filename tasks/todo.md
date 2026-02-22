# Add New Recalculate Score Stats

## Objective
The user wants to handle the newly returned JSON format from the `recalculateScore` n8n webhook action. Specifically:
1. Send the `cpc` field in the webhook request payload inside `selected_keywords`.
2. Extract the newly returned fields `avg_cpc` and `best_opportunity_comp` from the response `stats` block.
3. Save these to the `listings_global_eval` table as `listing_avg_cpc` and `listing_avg_comp`.

## Proposed Changes

1. **`supabase/migrations/*_add_avg_cpc_and_comp.sql`**
    - Create a new migration file to add these fields to `listings_global_eval`:
      ```sql
      ALTER TABLE public.listings_global_eval
      ADD COLUMN listing_avg_cpc numeric,
      ADD COLUMN listing_avg_comp numeric;
      ```

2. **`ProductStudio.jsx` (Webhook Payload)**
    - [x] In `handleRecalculateScores`, modify the `selected_keywords` mapping to include `cpc: k.cpc`.
      ```javascript
      selected_keywords: selectedKeywordsData.map(k => ({
          keyword: k.keyword,
          search_volume: k.volume, 
          intent_label: k.intent_label,
          transactional_score: k.transactional_score,
          niche_score: k.niche_score,
          cpc: k.cpc // NEW
      }))
      ```

3. **`ProductStudio.jsx` (Webhook Response Parsing)**
    - [x] In `handleRecalculateScores`, add the mappings to `updatePayload`:
      ```javascript
      listing_avg_cpc: newScores.stats?.avg_cpc,
      listing_avg_comp: newScores.stats?.best_opportunity_comp,
      ```
    - [x] In `handleGenerateInsight`, do the same for the initial analysis payload mapping (`globalEvalPayload`).
      ```javascript
      const listingAvgCpc = unwrapped?.stats?.avg_cpc;
      const listingAvgComp = unwrapped?.stats?.best_opportunity_comp;
      // ... Add to globalEvalPayload
      ```
    - [x] Map them to the UI local state in `handleLoadListing` and `handleModeChange`:
      ```javascript
      listing_avg_cpc: activeEvalData?.listing_avg_cpc ?? listing.listing_avg_cpc,
      listing_avg_comp: activeEvalData?.listing_avg_comp ?? listing.listing_avg_comp,
      ```

## Verification
- [x] Run local Supabase migration using `npm run supabase db push` or notify user to apply SQL.
- [x] Trigger "Recalculate Scores" with custom keywords.
- [x] Verify `cpc` is passed in the n8n payload.
- [x] Verify the successful processing of the response without DB insertion errors.
