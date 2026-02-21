# Task: Migrate SEO Saving Logic to Backend

## Context
The frontend `ProductStudio.jsx` currently processes a large JSON payload from n8n (containing 3 modes: broad, balanced, sniper) and saves everything to Supabase. If the user closes the page, the save is interrupted. We need to move this logic to a backend API.

## Technical Issue: Vite vs. Next.js
The current project is a **React SPA built with Vite** (`vite.config.js`, no Next.js).
A Next.js API route (`/api/save-seo/route.ts`) requires a Next.js environment to run.

### Options
1. **Supabase Edge Function (Recommended)**: Since we already use Supabase, we can create a Supabase Edge Function (`supabase/functions/save-seo/index.ts`). n8n can call this function directly. It's built for this exact stack.
2. **Standalone Next.js App**: If you are planning to host a separate Next.js server *just* for this API route, we can create it. However, it requires a separate deployment.

## 1. Backend Implementation (Supabase Edge Function / API Route)
- [x] **Create Function File**: Initialize the function/route file.
- [x] **Security check**: Validate the `x-api-key` header to ensure only n8n can trigger this.
- [x] **Data Parsing**: Parse the JSON payload containing the `listing_id` and the 3 modes (`broad`, `balanced`, `sniper`).
- [x] **Database Connection**: Initialize the Supabase client using the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.
- [x] **Atomic Save Sequence**:
  - For each mode, extract `global_strength`, `breakdown`, `stats`, and `keywords`.
  - **Upsert** to `listings_global_eval` to get the `evaluation_id`.
  - **Delete** existing keywords in `listing_seo_stats` for this `evaluation_id` (where `is_competition = false`).
  - **Insert** new keywords into `listing_seo_stats`.
- [x] **Listing Update**: Update the `listings` table to set `status_id` to `SEO_DONE`. Also handle legacy extracted fields like `score_explanation`, `global_status_label`, etc. if provided at the top level.

## 2. Frontend Updates (`ProductStudio.jsx`)
- [x] **Remove DB Logic**: Strip the heavy Supabase insert/update logic for SEO analysis from `handleAnalyze()` and `handleSEOSniper()`.
- [x] **Rely on Realtime (or Optimistic UI)**: The frontend should just trigger n8n and wait. 
