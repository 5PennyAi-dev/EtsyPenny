# 🧠 Project Context: EtsyPenny (PennySEO)
*Dernière mise à jour : 2026-03-29*

## 1. Project Overview
- **Goal**: AI-powered visual SEO optimization SaaS for Etsy sellers.
- **Value Prop**: Transforming product images into high-ranking Etsy listings using Vision AI.
- **Brand Identity**: 5PennyAi (Accessibility, Intelligence, Efficiency).

## 2. Tech Stack (Source of Truth)
- **Frontend**: React 19 (Vite), Tailwind CSS, Shadcn/UI, Lucide-React.
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **API Server**: Local Express (`server.mjs`, port 3001) for dev; Vercel serverless functions (`api/`) for production.
- **Automation**: n8n (legacy, only `analyseShop` remains).
- **Payment**: Stripe (Hybrid Model: Subscriptions + Credit Packs).
- **AI**: Multi-provider (Gemini, Anthropic, OpenAI) via configurable provider router. Default: Gemini 2.5 Flash. Admin can reassign any model to any task at runtime.
- **SEO Data**: DataForSEO API (keyword metrics: search volume, competition, CPC, volume history).

## 3. UI & Style Guidelines (Ref: styleguide.md)
- **Primary Color**: Indigo-600 (#4f46e5).
- **Background**: Slate-50 (#f8fafc).
- **Design System**: Minimalist B2B, high whitespace, clean data tables.
- **Components**: Shadcn/UI for professional SaaS aesthetics.

## 4. Latest Developments
- [Completed] Authentication System implemented (Login, SignUp, AuthContext).
- [Completed] Protected Routes logic and redirection (`/studio`, `/login`).
- [Completed] Database Schema: `public.profiles` table linked to `auth.users`.
- [Fix] Admin User: Manually repaired via SQL (Identity inserted, NULL tokens cleared).
- [Fix] **Auth Hang Resolved**: Implemented race-condition safety in `AuthContext` to prevent infinite loading spinners.
- [Fix] **Database Schema**: Added missing `status` and `title` columns to `listings` table.
- [Live] `ProductStudio` is now fully integrated with real user data (Credits/ID).
- [Live] **End-to-End Analysis Flow**: Successful image upload, database insertion, and N8N webhook trigger confirmed.
- [Live] **Real-time SEO Results**: `ProductStudio.jsx` now listens to database changes and displays live analysis results.
- [UI] **Main + Sidebar Layout**: Refactored `ResultsDisplay.jsx` into a 66/33 (8/4 col) grid. Main column for visual context & full data table; Sticky sidebar for "Magic Draft" listing generation.
- [Logic] **State Management**: Implemented `handleGenerateDraft` in `ProductStudio` to manage the transition from "Analysis Ready" to "Drafting" to "Editor" states. Added `analysisContext` to persist form data (Tone, Sub-niche).
- [Live] **N8N Drafting Integration**: "Magic Draft" workflow implemented. Consolidated Analysis and Drafting to one webhook endpoint to fix CORS. Standardized payload schema (nested `payload`) and handled array response format.
- [UI] **UX Refinements**: Auto-expanding description textarea using `useLayoutEffect`, compacted table design, and full tag visibility.
- [Feature] **History System**: Created `HistoryPage` with search/filter/pagination and `RecentOptimizations` component.
- [Feature] **PDF Export**: Implemented `ListingPDFDocument` with `@react-pdf/renderer` for generating branded SEO reports. Added export buttons to Studio and History.
- [Feature] **PDF Refinement**: Professional layout upgrade (Full-width, Stacked), status icons (Trending/Evergreen/Promising), and comprehensive legend.


- [Feature] **Brand Profile**: Implemented `/shop` (BrandProfilePage) to store shop identity (Name, Bio, Tone, Target Audience). Integrated with `ProductStudio` via N8N payload (`shop_context`) for personalized AI generation.
- [Feature] **Shop Analysis**: Added "Analyze My Shop" webhook to auto-fill brand profile from an Etsy shop URL.
- [Feature] **Relaunch Capabilities**: Added "Refresh Data" (re-analyze existing image) and "Regenerate Draft" buttons to `ResultsDisplay`.
- [Feature] **Form Persistence**: `OptimizationForm` now remembers settings (Theme, Niche, Tone) when loading a listing or after analysis, allowing for easy iteration.
- [UX] **Smart Inputs**: Auto-expanding text areas for Bio/Audience/Signature. Converted Brand Tone to text input for flexibility.
- [Fix] **Relaunch Logic**: Implemented `ConfirmationModal` for credit checks, fixed `handleAnalyze` image validation bugs, and resolved `onRelaunchSEO` prop issues.
- [Fix] **Image Persistence**: `ImageUpload` now correctly displays existing images when modifying settings or relaunching.
- [Feature] **Dashboard**: Implemented comprehensive dashboard with Credits management, Status tracking (New/SEO done/Complete), and detailed listings table. Uses optimized Supabase views.
- [Feature] **Visual Analysis** (2026-02-11): New 2-column grid layout in Product Studio — compact image upload (left 1/3) + 6 Visual Analysis fields (right 2/3): Aesthetic Style, Typography, Graphics, Color Palette, Target Audience, Overall Vibe. Fields auto-populated via `analyseImage` n8n webhook (AI vision), auto-resize to fit content.
- [Feature] **Visual Analysis → SEO Pipeline**: Visual fields saved to `listings` table (`visual_aesthetic`, `visual_typography`, `visual_graphics`, `visual_colors`, `visual_target_audience`, `visual_overall_vibe`) and included in `generate_seo` and `drafting_seo` payloads for richer AI context.
- [Fix] **Listing Reload from History**: Added `sub_niches(name)` join to Supabase query. Removed hardcoded `"Loaded from history"` / `"Unknown"` fallbacks — empty values now sent as `null`. Visual Analysis fields hydrated on reload.
- [Fix] **Payload Cleanup**: `niche`, `sub_niche` in categorization payloads now default to `null` instead of `"General"` or `"Unknown"`.
- [UX] **Default Product Type**: `OptimizationForm` now defaults to T-Shirt instead of first alphabetical product type.
- [UI] **ImageUpload Compact Mode**: `ImageUpload.jsx` supports a `compact` prop for smaller rendering in the 1/3 column.
- [Feature] **Product Type Combobox** (2026-02-11): Replaced flat `<select>` with a searchable, grouped combobox (`ProductTypeCombobox.jsx`). Types fetched via `product_categories` → `product_types` join and displayed under category headers (Apparel, Drinkware, etc.). Supports custom types ("Use 'X' as custom type"). Keyboard navigation (arrows, Enter, Escape). Migration: `product_type_id` made nullable in `listings` to support custom types without a DB row.
- [Layout] **OptimizationForm Structure**: Product Type combobox placed above "Categorization" section for SEO context prominence. Product Type select removed from "Details" section. Theme/Niche/Sub-niche remain on a single 3-column row.
- [UI] **Advanced SEO Settings** (2026-02-11): Moved Tone and Max Tags out of the main form into a collapsible "⚙️ Advanced SEO Settings" section. Tone uses hardcoded options (Auto-detect, Professional, Funny, Sarcastic, Minimalist, Emotional) instead of DB `tones` table. Max Tags uses a range slider hard-capped at 13 with a 🔒 "Standard Plan" badge and upgrade hint. Section collapsed by default for a cleaner UI.
- [Feature] **Keyword Insights & is_top** (2026-02-12): Integrated new `insight` (string) and `is_top` (boolean) fields from n8n `generate_seo` response. Keywords with AI-generated insights now display a `Lightbulb` icon (green=Top performer, amber=Risky/Bottom, gray=Neutral) with a dark tooltip showing the insight text on hover. Data persisted to `listing_seo_stats` table and correctly rehydrated on history reload. Legend updated with Insight icon.
- [PDF] **PDF Report Upgrade** (2026-02-12): Competition column shows numeric values (0.12, 0.74) with color-coded badges. Status icons replaced with Lucide-style SVGs (Flame/Leaf/Star). Trend column now shows SVG sparkline mini-graphs (green=positive, red=negative) with percentage below. New "Strategic Insights" section displays up to 5 keywords with AI insights and Lightbulb icons. Both Studio and History PDF exports pass full data including `volume_history`, `insight`, and `is_top`.
- [Feature] **Global Listing Strength** (2026-02-12): New `global_strength` INTEGER column in `listings` table. Extracted from n8n `global_listing_strength` response field. Animated SVG circular gauge (`StrengthGauge` component) displayed above keyword table: Green 80-100 ("Strong Listing"), Amber 50-79 ("Good Foundation"), Rose <50 ("Needs Work"). PDF header shows score badge circle + strategic summary sentence. Both Studio and History PDF exports pass `global_strength`.
- [Feature] **Global Listing Intelligence** (2026-02-12): Upgraded `StrengthGauge` → `AuditHeader` component. Now extracts `global_status_label`, `global_strategic_verdict`, and `improvement_priority` from n8n response. Saved to `listings` table (`status_label`, `strategic_verdict`, `improvement_priority`). UI shows dynamic executive summary (API label + verdict) and amber "Priority Action" banner. PDF updated to display API labels with fallbacks. History reload hydrates all audit fields.
- [Feature] **SEO Sniper** (2026-02-13): New `handleSEOSniper` handler in `ProductStudio.jsx`. Sends full context (all current keywords with volumes/competition/insights, visual analysis, global audit fields, shop context, categorization) to n8n `seo_sniper` webhook. Returns a new set of sniper-optimized keywords that completely replace existing `listing_seo_stats` in DB and UI. Keywords marked with `is_sniper_seo: true` flag — displayed with a `Target` icon in the keyword table. Sniper legend entry added to table header.
- [Feature] **Auto-Generate Insight Pipeline** (2026-02-13): New `handleGenerateInsight` function auto-triggered after `generate_seo` completes. Sends keywords + full context to n8n `generateInsight` webhook. Returns updated global audit fields (`global_listing_strength`, `global_status_label`, `global_strategic_verdict`, `improvement_priority`) and per-keyword `insight` + `is_top`. Updates both `listings` and `listing_seo_stats` tables, then refreshes UI state live. Also auto-triggered after SEO Sniper completes to recalculate scores with new sniper keywords.
- [UI] **Two-Phase Skeleton Loading** (2026-02-13): New `isInsightLoading` state (`false` | `'seo'` | `'insight'`). Full-screen `InsightSkeleton` component in `ResultsDisplay.jsx` covers both main + sidebar columns with animated spinner and phase-aware messaging ("Generating SEO Tags..." → "Generating Insights..."). Skeleton shown immediately on analyze click — results data appears as soon as `generate_seo` returns, then skeleton transitions to insight phase until `generateInsight` completes.
- [UI] **SEO Sniper Button in AuditHeader** (2026-02-13): `AuditHeader` component now accepts `onSEOSniper` and `isSniperLoading` props. Solid indigo button with `Target` icon integrated next to the gauge. Loading state shows spinner + "Analyse en cours...". Disabled while sniper is running.
- [Architecture] **Analysis Flow Refactor** (2026-02-13): `handleAnalyze` no longer waits for insights — it sets results immediately after `generate_seo` returns, switches skeleton to insight phase, and fires `handleGenerateInsight` asynchronously. This gives users instant keyword visibility while insights load in the background. The `isLoading` state is cleared early (skeleton takes over), removing the old full-screen spinner for the analysis phase.
- [UI] **Competition Column Numeric Scores** (2026-02-13): Keyword table competition column now displays numeric values (e.g. `0.12`, `0.74`) with color-coded badges (green <0.3, amber 0.3-0.7, rose >0.7) instead of text labels. Handles both numeric and legacy string values gracefully.
- [UI] **SEO Sniper UX: No Skeleton + Atomic Swap** (2026-02-13): SEO Sniper no longer shows full-screen skeleton. Instead, old results remain visible while sniper runs. `isSniperLoading` state now supports phases (`'sniper'` | `'insight'`): button shows "Generating keywords..." then "Generating Insights..." with spinner. Results swap atomically only when `generateInsight` completes — preventing flash of incomplete data. This gives a seamless transition from old → new keywords + insights.
- [PDF] **PDF Score & Legend Fix** (2026-02-13): Fixed score label text overlapping the circular gauge in PDF header — score now renders inside the circle with proper font sizing. Added keyword legend (Trending/Evergreen/Promising/Sniper icons with labels) before the data table. Sniper keywords display a `Target` crosshair SVG icon in the table. Competition column shows numeric values with color-coded text.
- [Feature] **Score Explanation** (2026-02-13): New `score_explanation` TEXT field in `listings` table. Extracted from `generateInsight` n8n response (`unwrapped.score_explanation`). Saved to DB alongside other global audit fields. Passed through UI state (`results.score_explanation`) and hydrated on history reload. `AuditHeader` component displays an info (ℹ) icon with circular background next to "Listing Strength" label — on hover shows tooltip with score breakdown text. Fallback message shown when field is not yet populated.
- [Layout] **Full-Width Edge-to-Edge Layout** (2026-02-14): Removed `max-w-7xl mx-auto` constraint from `ProductStudio.jsx` main wrapper — content now spans full available width with `p-8` side padding. `ResultsDisplay.jsx` refactored from `grid-cols-12` (8/4 split) to **flexbox**: main content column is `flex-1 min-w-0` (~66% fluid), sidebar is `lg:w-1/3 lg:flex-shrink-0` (33%). Table container now has `overflow-x-auto` for horizontal scrolling stability. `InsightSkeleton` updated to match same flex layout. Keyword Performance table maximizes horizontal space on wide screens.
- [Feature] **Competition Analysis** (2026-02-14): New `handleCompetitionAnalysis` handler in `ProductStudio.jsx`. Sends same payload as `generateInsight` but with action `competitionAnalysis` to n8n webhook. Updates global audit fields and per-keyword data (insight, is_top, competition scores) in both DB and UI. Button added to `ResultsDisplay.jsx` keyword table header next to the legend with loading spinner state. `isCompetitionLoading` state manages button disabled/loading UX.
- [Feature] **Competition Keywords Separation** (2026-02-14): New `is_competition` BOOLEAN column (default `false`) in `listing_seo_stats` table. `handleCompetitionAnalysis` now parses `unwrapped.selectedTags` (or `unwrapped.keywords` fallback) as competitor keywords and INSERTs them with `is_competition: true` (primary keywords untouched). Also extracts `competitor_seed` from response and saves to `listings` table. `ResultsDisplay.jsx` splits analytics into `primaryAnalytics` and `competitionAnalytics` via `useMemo`. Main "Keyword Performance" table renders only primary keywords. New orange-themed "Competitors Keywords" read-only table (no checkboxes, no selection) appears below when competition data exists. Competition table header includes an info (ℹ) tooltip showing: "Based on the first ten Etsy listings returned by Google search with keywords [competitor_seed]". Competition keywords excluded from Magic Draft selection. `handleLoadListing` hydrates both `is_competition` flag and `competitor_seed` from DB.
- [UI] **Table Alignment & Standardization** (2026-02-14): Harmonized "Keyword Performance" and "Competitors Keywords" tables. Both now use identical column widths (Vol/Trend/Comp: 14%, Score: 10%, Status: 8%, Action: 6%) for perfect vertical alignment. Added a disabled "Delete" (Minus) button column to the primary table to match the competitor table's structure.
- [Fix] **Copy Tooltip Positioning** (2026-02-14): Fixed "Copy" button tooltip in `ResultsDisplay.jsx` to display *below* the icon (`top-full`) instead of above, preventing it from being cut off by the container boundary.
- [Fix] **Missing Icon Import** (2026-02-14): Resolved `ReferenceError` by importing `Minus` icon from `lucide-react`.
- [Feature] **Unified Creatable Search** (2026-02-14): Upgraded `SmartNicheAutocomplete.jsx` to support custom niche creation. When no search match is found, user can click "+ Use 'X' as custom" to insert a new entry into `user_custom_niches` table. Component fetches from `unified_niche_search` view with user-specific filtering (`user_id.is.null OR user_id.eq.CURRENT_USER`). New entry is optimistically added to local state. RLS policies added to `user_custom_niches` (SELECT/INSERT/DELETE for own rows). `OptimizationForm.getFormData` now passes the custom niche DB ID as `sub_niche_id`.
- [Fix] **Custom Niche Save Race Condition** (2026-02-14): Fixed bug where clicking "Use as custom" button silently failed to insert into `user_custom_niches`. Root cause: the `onClick` handler relied on React `search` state, but the outside-click listener (`mousedown`) could clear it before `onClick` (`mouseup`) fired. Fix: search term is now frozen into the click handler via `_searchTerm` property, bypassing stale state.


- [Fix] **Insight Section Visibility** (2026-02-15): Resolved issue where the "Insight" section (AuditHeader) disappeared after SEO regeneration. `ResultsDisplay.jsx` now always renders the header if `results` exist (defaults to 0 score if missing). `ProductStudio.jsx` logic for `is_sniper_seo` corrected to dynamically use `fromSniper` flag.
- [UI] **Competitor Analysis Refactor** (2026-02-15): Moved "Analyse Competition" button to the "Competitors Keywords" table header for better context. Updated "Competitors Keywords" info tooltip to conditionally prompt "Launch competition..." when no analysis exists.
- [Fix] **Data Preservation on Refresh** (2026-02-15): Modified `handleAnalyze` and `handleSEOSniper` to preserve existing `generated_title`, `generated_description`, and `competitor_seed`/`competitorAnalytics` during re-analysis. Prevents data loss when refreshing SEO keywords.
- [UX] **Skeleton Refinement** (2026-02-15): "Refresh Data" no longer clears the entire results state (`setResults(null)` removed). Competitor Keywords table now remains visible and populated during the refresh, while only the active Keyword Performance table shows a loading skeleton.

- [Feature] **Relevance Metrics** (2026-02-15): Integrated `niche_score` ("Relevance") and `relevance_label` ("Placement") into `ResultsDisplay.jsx`.
    - **Relevance:** Shows `niche_score`/10 with conditional formatting (Green + Target icon 🎯 for 8-10, Dark/Light Grey for lower).
    - **UI**: Keyword Performance table reordered to: Tag/Keyword → Score → Conv. Intent. → Relevance → Placement → Avg. Vol → Trend → Comp → Status.

- [Feature] **Text-Based Niche Selection** (2026-02-15): Migrated `OptimizationForm.jsx` from `SmartNicheAutocomplete` (rigid ID-based dropdown) to 3 flexible text inputs: Theme, Niche, Sub-niche.
    - **Frontend**: Users can now type any value freely. Visual analysis still pre-fills via text.
    - **Data Flow**: `ProductStudio.jsx` updated to send plain text `theme`, `niche`, `sub_niche` in `generate_seo` and `drafting_seo` payloads. Legacy ID fields sent as `null`.
    - **Database**: `listings` table columns `theme`, `niche`, `sub_niche` (TEXT) used for storage.

    - **Visual Analysis JSON**: Updated `ProductStudio.jsx` to parse and save `theme`, `niche`, and `sub-niche` from the new n8n visual analysis response structure. These values now auto-fill the text-based categorization form.

    - **Bug Fix**: Resolved issue where visual analysis data wasn't saving and image disappeared. Added logic to INSERT new listing if missing and persist `imageUrl` in React state during form updates.
    - **New SEO Metrics**: Integrated `listing_strength`, `listing_visibility`, `listing_conversion`, `listing_relevance`, and `listing_raw_visibility_index` into the database and frontend logic.
    - **New Listing Workflow**: Fixed "New Listing" button in Product Studio to clear visual analysis fields. Updated Dashboard button to "New Listing" and ensured it activates the form in Product Studio.
    - **UX Improvement**: Removed default "T-shirt" product type to force explicit user selection.
    - **Bug Fix**: Fixed issue where Product Type was erased after visual analysis by preventing unnecessary form remounting.
    - **Form Persistence**: Updated Visual Analysis to save manually entered Product Type and Instructions to the database alongside AI results.
    - **Insight Payload Update** (2026-02-16): Updated `generateInsight` to include `listing_strength`, `listing_visibility`, `listing_conversion`, `listing_relevance`, and `listing_raw_visibility_index` in both the outgoing `global_audit` payload (for n8n context) and the incoming response handling (saved to DB and local state).
    - **Compact UI** (2026-02-16): Refined `ProductStudio` layout to fit within 1080px vertical height. Reduced padding/margins in `OptimizationForm`, compacted `SEOStrategySelector` (smaller icons, tight spacing), and organized Visual Analysis fields into a dense 2-column grid.
    - **SEO Strategy Selector** (2026-02-16): Implemented new `SEOStrategySelector` component with "Broad", "Balanced", and "Sniper" modes. Visualized with icons and badges. State managed in `OptimizationForm` and passed to `generate_seo` payload.
    - **Save Button Relocation** (2026-02-16): Moved "Save Listing" button from the bottom action bar to the `ProductStudio` header (top-right). Styled as a ghost button with `Save` icon. Removed old button from `OptimizationForm`. logic updated to use `ref` for form state access.
    - **Global Strength Gauge Fix** (2026-02-16): Updated `ResultsDisplay` to use `listing_strength` from the database/response for the main circular gauge, falling back to `global_strength` only if missing. Ensures the gauge reflects the most accurate score.
    - **Bug Fixes** (2026-02-16): Restored missing `Zap` and `ChevronRight` icons in `ProductStudio` imports. Fixed "Save" button visibility logic (now always visible for new listings) and `testRef` error.
    - **Database Robustness** (2026-02-16): Implemented manual "check-then-write" upsert logic in `ProductStudio.jsx` to correctly save `listings_global_eval` data, bypassing unique index issues. double-writing legacy/new column names (`status_label`/`global_status_label`) for schema compatibility.
    - **Data Parsing Fix** (2026-02-16): Updated `handleAnalyze` and `handleGenerateInsight` to correctly parse nested JSON fields (`breakdown.visibility`, `stats.raw_visibility_index`) from n8n response, ensuring all metrics are saved.
    - **Schema Migration** (2026-02-16): Added missing `listing_raw_visibility_index` column    - **Config Fix**: Updated `.env` to use production webhook URL, resolving 404/CORS errors during insight generation.
- **Strategy Switcher Implementation** (2026-02-17): Implemented a segmented control to toggle between "Broad", "Balanced", and "Sniper" SEO modes.
    - **UI Component**: Created `StrategySwitcher.jsx` with Radar, Scale, and Target icons.
    - **Logic Refactor**: Updated `ProductStudio.jsx` to fetch *all* global evaluations and seo stats upfront. Implemented `activeMode` state and `handleModeChange` to dynamically filter displayed results without re-fetching.
    - **State Sync**: Enhanced `handleAnalyze` and `handleGenerateInsight` to keep local state arrays (`globalEvals`, `allSeoStats`) in sync with database writes, ensuring instant UI updates after analysis.
    - **Critical Fixes**: 
        - Resolved a syntax error in `ProductStudio.jsx` where helper functions were defined inside the JSX return block.
        - Fixed `ReferenceError: useMemo is not defined` by adding the missing import.
        - Added missing `isSniperLoading` state to prevent runtime errors during sniper analysis.
        - Corrected JSX syntax for rendering `MemoizedResultsDisplay` to fix "Objects are not valid as a React child" error.

- **Multi-Mode SEO Generation** (2026-02-19):
    - **Response Format Change**: The n8n `generateSEO` webhook now returns three mode stacks in one response: `broad`, `balanced`, and `sniper` — each with their own `listing_strength`, `breakdown`, `stats`, and `keywords`.
    - **Data Storage**: `handleAnalyze` loops through these modes and upserts into `listings_global_eval` (one row per mode) and inserts into `listing_seo_stats` (linked via `evaluation_id`). Both multi-mode and legacy single-mode formats are supported.
    - **Bug Fix — Validation Gate**: The original validation block threw an error before the multi-mode check could execute (`Invalid response structure`). Refactored to detect multi-mode first, then apply legacy validation only as a fallback.
    - **Default Mode**: UI and `handleGenerateInsight` default to `'balanced'` immediately after analysis.
    - **Strategy Switcher**: Works correctly — local state (`globalEvals`, `allSeoStats`) holds all three mode's data; `handleModeChange` filters live without re-fetching.

- **AI Keyword Selection** (2026-02-20):
    - **New Field**: `is_selection_ia` (boolean) column in `listing_seo_stats` already existed in DB.
    - **Parsing**: `handleAnalyze` now extracts `is_selection_ia` from each keyword and persists it to the DB in both multi-mode and legacy paths.
    - **UI Behavior**: `ResultsDisplay.jsx` now reads `is_selection_ia` on load. If any keyword has `is_selection_ia: true`, only those are selected by default. Falls back to selecting all if none are flagged (legacy data).
- **Inline Custom Keyword** (2026-02-20):
    - **Feature**: Users can now add custom keywords directly into the performance table via an inline input row, without modals.
    - **UI**: Clicking "+ Add Custom Keyword" reveals a new row. Pressing Enter triggers an analysis.
    - **Logic**: Calls `userKeyword` webhook with full listing context (matching `generate_seo`). Handles nested multi-mode response arrays.
    - **Visuals**: Markers like the `User` icon (from `lucide-react`) distinguish these keywords.
    - **Hardening**: Implemented safety checks for sorting and numeric formatting (`toLocaleString`) to prevent crashes on null/undefined search data.
    - **Persistence**: Fixed hydration logic in `ProductStudio.jsx` to ensure `is_user_added` and `is_selection_ia` flags persist after page reloads and strategy swaps.

- **Custom Product Type Persistence** (2026-02-21):
    - **Problem**: Custom product types (entered via "Use as custom type" in combobox) were lost — `product_type_id` saved as `null`, no text stored.
    - **DB Migration**: Added `product_type_text` TEXT column to `listings` table. Inserted sentinel "Custom type" row in `product_types` for FK integrity.
    - **Frontend**: `OptimizationForm.jsx` now outputs `product_type_text` in form data (set to typed name when custom, `null` when standard type). `ProductStudio.jsx` fetches sentinel "Custom type" ID at mount via `customTypeIdRef`. All save handlers (`handleAnalyze`, `handleSaveDraft`, `handleAnalyzeDesign`) use sentinel ID + `product_type_text`. `handleLoadListing` hydrates custom type name from `product_type_text` on reload.
    - **Webhook Payloads**: All 5 n8n webhook payloads (`generate_seo`, `drafting_seo`, `userKeyword`, `generateInsight`, `competitionAnalysis`) now use `product_type_text || product_type_name` for the `product_type` field, ensuring n8n always receives the actual typed name (e.g. "Leather Journal"), never the sentinel "Custom type" label.

- **SEO Saving Backend Migration** (2026-02-21):
    - **Problem**: Heavy database upserts and inserts for SEO multi-mode data were handled in the React frontend (`ProductStudio.jsx`). If a user closed the page during the n8n webhook process, data would be lost.
    - **Architecture Decision**: Implemented a Supabase Edge Function (`save-seo`) to take over this logic asynchronously, as Next.js API routes are incompatible with the current Vite SPA structure.
    - **Backend Action**: The edge function exposes an endpoint protected by an `x-api-key` header matching `N8N_WEBHOOK_SECRET`. It loops over the `broad`, `balanced`, and `sniper` results and performs atomic inserts/updates using the Supabase Service Role Key to bypass RLS, setting `status_id` to `SEO_DONE`.
    - **Frontend Action**: Modified `handleAnalyze` and `handleSEOSniper` in `ProductStudio.jsx` to be "fire and forget". Replaced the heavy `axios.post` waiting and data parsing block with a realtime `supabase.channel` listener on the `listings` table. When `status_id` changes to `SEO_DONE`, it auto-reloads and notifies the user.
    - **N8n Webhook Architecture Fix**: Ensured the global n8n Webhook node remains on "Using 'Respond to Webhook' Node". Only the `generate_seo` branch immediately returns a status using a local Respond node, preserving synchronous data return for other actions (`analyseImage`, etc.).
    - **Resilience**: Users can now safely close the tab after pressing "Analyze". The workflow completes in n8n, which triggers the Edge Function, which writes to Supabase.

- **UI Redesign: Horizontal AuditHeader** (2026-02-21):
    - **Problem**: The keyword evaluation results were too bulky and slow because of AI-generated text insights.
    - **Solution**: Redesigned the `AuditHeader` component into a compact, horizontal dashboard strip.
    - **UI Enhancements**: 
        - Replaced text descriptions with a minimalist numeric layout (Listing Strength, Visibility, Relevance, Conversion).
        - Added numeric micro-gauges for every metric to allow quick scanning.
        - Applied conditional color coding (Green > 80, Amber 50-79, Rose < 50) using the styleguide.
        - Removed action center UI and removed textual justification to prioritize layout compactness.

- **Recalculate Scores Feature & CPC Integration** (2026-02-22):
    - **Goal**: Allow users to dynamically recalculate their global listing scores based only on the keywords they have *selected* in the Keyword Performance table, and display standard CPC values.
    - **Implementation**: 
        - Added `cpc` float column to `listing_seo_stats` and mapped it through `handleAnalyze`, `handleLoadListing`, `handleRecalculateScores`, and `handleAddCustomKeyword`.
        - Replaced "Placement" column with "CPC" in `ResultsDisplay.jsx` table, applying color logic (Green > $1.50, Amber $0.60-$1.49, Gray < $0.60).
        - Added a `Recalculate Scores` button featuring a Zap icon adjacent to the `Refresh Data` button in the `ResultsDisplay` component header.
        - `handleRecalculateScores` gathers an array of objects derived from `results.analytics` (filtered by `selectedTags`) and immediately handles the synchronous webhook response. The outgoing payload now explicitly includes the `competition` and `cpc` values.
        - Fixed a bug where adding a Custom Keyword failed to map the backend `cpc` value to the UI/DB.
        - Parsed new JSON metrics (`avg_cpc` mapped to `listing_avg_cpc`, `best_opportunity_comp` mapped to `listing_avg_comp`) from the `recalculateScore` response, saving them to the UI state and Supabase DB.

- **UI Redesign: Verdict + Proof Audit Header** (2026-02-23):
    - **Goal**: Reorganize the top banner of the `ResultsDisplay` into three distinct sections to create visual hierarchy and present the global scores effectively.
    - **Implementation**: 
        - **Verdict (Left)**: Featured "Listing Strength" score using a new, oversized SVG `<RadialGauge />` to act as the primary KPI.
        - **Technical Analysis (Center)**: Grouped "Visibility", "Relevance", "Conversion", and "Competition" into a compact 2x2 grid using slim horizontal progress micro-gauges as "Evidence".
        - **Business Potential (Right)**: Isolated "Profitability" logic. Built a custom indicator system using five `DollarSign` icons (`lucide-react`) representing financial potential (1-5 filled based on 0-100 score).
        - **Cleanup**: Removed the unused "SEO Strategy" selector block from the form and the "Mode Switcher" from the evaluation results.

- **Smart Sorting & Selection** (2026-02-23):
    - **Goal**: "Pin & Sort" logic — selected keywords always pinned to top, smooth animations on toggle, expandable table.
    - **Implementation**:
        - **Dual-Level Sort**: `sortedAnalytics` useMemo applies primary sort by `isSelected` (checked items first), secondary sort by active column header (Score, Volume, etc.). `selectedTags` in dependency array triggers visual reorder only (no score recalculation).
        - **Show More/Less Toggle**: `showAll` state + `visibleAnalytics` slice. Collapsed view shows `max(13, selectedCount)` rows — always shows all selected keywords. "Show All (N)" / "Show Less" button in footer next to "Add Custom Keyword".
        - **Visual Divider**: "Suggestions & Discovery" horizontal label row injected between selected and unselected groups.
        - **Row Styling**: Selected rows: `bg-indigo-50/40`, Unselected: `opacity-60`.
        - **Animation**: `framer-motion` `motion.tr` with `layout` + `AnimatePresence` for smooth row repositioning on checkbox toggle.

- **UI Cleanup: Refresh Data & Competitors Table** (2026-02-23):
    - Removed "Refresh Data" button and entire "Competitors Keywords" table accordion from `ResultsDisplay.jsx`. Cleaned up related state, useMemo, useEffect, and props (~175 lines removed).

- **Keyword Pool Filtering (`is_current_pool`)** (2026-02-24):
    - Added `.eq('is_current_pool', true)` filter to keyword loading queries in `ProductStudio.jsx` (`handleLoadListing`) and `HistoryPage.jsx` (`handleExportPDF`). Only keywords flagged as current pool are now loaded into the Keyword Performance table and exported to PDF.

- **Reset Keywords Button** (2026-02-24):
    - Added "Reset Keywords" button (amber theme) next to "Recalculate Scores" in `ResultsDisplay.jsx`. Calls n8n webhook with `{ action: 'resetPool', listing_id }`, then reloads the listing.

- **Custom Keyword `is_current_pool` Fix** (2026-02-24):
    - `handleAddCustomKeyword` now saves `is_current_pool` from the n8n response (defaults to `true`), ensuring custom keywords persist after reload.

- **Recalculate Scores DB Fix** (2026-02-24):
    - Fixed `handleRecalculateScores`: renamed `listing_avg_comp` → `listing_avg_competition` to match the actual DB column. Added `updated_at` timestamp, flat-key fallbacks for n8n response, and stripped `undefined` values from the update payload.

- **Advanced SEO Strategy Tuner** (2026-02-24):
    - New `StrategyTuner.jsx` component in `src/components/studio/`. Renders as a collapsible accordion between AuditHeader and Keyword Performance table in `ResultsDisplay.jsx`.
    - 5 segmented range sliders (Market Reach, Ranking Ease, Buyer Intent, Niche Specificity, Market Value), each with 4 discrete levels (Low / Regular / High / Aggressive) mapped to numeric coefficients.
    - Parameter keys in payload use readable names: `Volume`, `Competition`, `Transaction`, `Niche`, `CPC`.
    - State lifted to `ProductStudio.jsx` — `StrategyTuner` is a controlled component via `selections`/`onSelectionsChange` props.
    - "Apply New Strategy" button sends `{ action: 'resetPool', listing_id, parameters }` to n8n webhook.
    - `generate_seo` payload also includes `parameters` at the top level so n8n receives strategy weights on initial analysis too.
    - Exported helpers: `PARAMETERS`, `DEFAULT_STRATEGY_SELECTIONS`, `getStrategyValues()`.

- **PennySEO Rebrand** (2026-02-24):
    - Renamed app from "5PennyAi" / "EtsyPenny" to **PennySEO** across all surfaces.
    - Logo image at `src/assets/pennyseo-logo.png`, rendered in `Sidebar.jsx` (full width) and `LoginPage.jsx` (inverted for dark background).
    - Updated `index.html` page title and `ListingPDFDocument.jsx` PDF footer.

- **Strategy Tuner Slider Hydration** (2026-02-25):
    - **Problem**: After applying a custom SEO strategy (via the Advanced SEO Strategy Tuner), reloading the page reset all sliders back to "Regular" default, losing the user's chosen settings.
    - **Solution**: Added `getSelectionsFromValues()` reverse-lookup helper in `StrategyTuner.jsx` — takes saved numeric `param_*` values from `listings_global_eval` and maps each back to the closest slider index using minimum-distance matching.
    - **Hydration Points**: `handleLoadListing` and `handleModeChange` in `ProductStudio.jsx` now read `param_Volume`, `param_Competition`, `param_Transaction`, `param_Niche`, `param_cpc` from the active eval data and call `setStrategySelections()`. Falls back to `DEFAULT_STRATEGY_SELECTIONS` if no params are saved.

- **Instructions/Details Field Hydration Fix** (2026-02-25):
    - **Bug**: The "Instructions / Details" textarea was blank on page reload despite the value being saved in the `listings.user_description` column.
    - **Root Cause**: `handleLoadListing` read the context from `listing.custom_listing` JSON (which never contained the `context` key — only theme/niche/sub_niche). The actual value was saved to `listings.user_description`.
    - **Fix**: Changed hydration in `handleLoadListing` to `listing.user_description || parsedCustom.context || ""`, reading from the correct DB column first.

- **Auto-Load Most Recent Listing** (2026-02-25):
    - **Behavior**: When navigating to Product Studio via the sidebar (no `location.state`), it now auto-fetches the user's most recent listing (by `updated_at DESC`) and loads it via `handleLoadListing`. Falls back gracefully to empty form if no listings exist.

- **Realtime SEO Completion Listener** (2026-02-25):
    - **Problem**: The Supabase Realtime listener for `SEO_DONE` had stale-closure bugs and didn't stop the spinner on completion. Also, re-analysis on an existing listing (already `SEO_DONE`) caused immediate false-positive detection.
    - **Solution**: Dual-mechanism approach: Realtime subscription + 5-second polling fallback. Uses `isWaitingForSeoRef` + `seoTriggeredAtRef` timestamp refs to avoid stale closures. Both mechanisms compare `listings.updated_at > seoTriggeredAtRef` to ensure only *new* completions are detected. Channel depends only on `[listingId]`.
    - **Edge Function**: Added `updated_at: new Date().toISOString()` to the `save-seo` edge function's listing update payload (must be redeployed via Supabase dashboard).

- **Listing Info Clearing on New Listing** (2026-02-25):
    - **Bug**: Title and description text persisted in the sidebar when clicking "New Listing".
    - **Fix**: Added `else` branch in `ResultsDisplay.jsx`'s `useEffect` for `results` — now clears `displayedTitle` and `displayedDescription` when `results` becomes `null`.

- **Custom Keyword Add Button** (2026-02-25):
    - Replaced passive "Return ↵" text with an actionable "Add" button in the custom keyword inline row (`ResultsDisplay.jsx`). Button calls `handleAddSubmission` on click, disabled when input is empty. Enter key still works.

- **Visibility Index Badge** (2026-02-25):
    - Added `listing_raw_visibility_index` as an inline indigo pill badge next to the Visibility label in the AuditHeader (`ResultsDisplay.jsx`). Uses `bg-indigo-50` / `border-indigo-100` / `text-indigo-700` design. Only renders when value is non-null.

- **Drafting SEO Payload Fix & Theme/Niche Deprecation** (2026-02-25):
    - **Problem**: `drafting_seo` payload sent null for theme, niche, sub_niche, and user_description. Root causes: (1) `analysisContext` state was stale after `handleLoadListing` overwrites, (2) text columns `listings.theme`/`niche`/`sub_niche` were never saved — only FK IDs were persisted.
    - **Fix**: `handleGenerateDraft` now fetches categorization data fresh from the DB at draft time (no dependency on `analysisContext`). Both save paths in `handleAnalyze` and `handleSaveDraft` now write `theme`, `niche`, `sub_niche` text columns directly.
    - **Deprecation**: Removed `theme_id`, `niche_id`, `sub_niche_id` FK columns from all save paths and from `OptimizationForm.jsx` return object. These FK columns are no longer used.

- **Dashboard Shop Health & Market Insights** (2026-02-26):
    - **Dashboard Redesign**: Replaced old disparate metric cards with a unified, data-driven view powered by the `view_user_performance_stats` SQL view.
    - **RadialGauge Component**: Created `src/components/dashboard/RadialGauge.jsx` — a standalone, animated SVG circular progress gauge supporting dual color-tier logic (`getTier` for standard 0-100 metrics, `getTierInverted` for competition where lower is better).
    - **PerformanceCard (Shop Health)**: Displays a hero gauge for "Global Strength" separated from 4 secondary gauges (Visibility, Relevance, Conversion, Competition). Includes a conditional amber warning banner if any listings require immediate SEO optimization (`listings_needing_fix > 0`).
    - **MarketInsights**: Added a 3-card horizontal grid below Shop Health displaying external market data:
        1. **Market Reach**: Raw visibility index.
        2. **Market Value Index**: Hero card merging Avg CPC and Profit Potential into a single 0-100 score, with the raw `$Avg CPC` displayed as supporting data. Includes an info tooltip explaining the benchmark methodology.
        3. **Market Strategy**: A split-layout card comparing global "Market Saturation" (% saturation, visually red if >80%) versus targeted "Entry Barrier" (difficulty ratio, visually green if <0.5) using dual horizontal progress bars.
    - **Data Fetching optimization**: `Dashboard.jsx` fetches the `view_user_performance_stats` record once and passes it down as props to both `PerformanceCard` and `MarketInsights` to avoid duplicate network requests.

### March X Xth, 2026 - Image Analysis Payload Enrichment & Auto-Save
- **Bug Fix / Feature**: The `analyseImage` webhook trigger in `ProductStudio.jsx` now correctly includes the user's selected `product_type` and `user_description` form data in its payload, nested under `product_details` for backend compatibility. 
- **Auto-Save**: Clicking "Analyse Design" now automatically saves the current form state (product type, instructions, theme, etc.) to the `listings` table *before* triggering the AI. This ensures the visual analysis is firmly attached to the user's intended product context even if they haven't explicitly clicked "Save".
- **State Preservation Fix**: Resolved a React state hydration bug in `ProductStudio.jsx` where the AI's response would overwrite the active `analysisContext`, erasing the `user_description` textarea immediately after analysis completed. The state update now explicitly preserves the user's manual inputs alongside the newly fetched AI categories.

- **History Page Data Source Migration** (2026-02-27):
    - **Problem**: `HistoryPage.jsx` fetched from the old `view_listing_scores` view which used legacy FK-joined niche names and `listing_score`/`performance_score` fields.
    - **Solution**: Migrated to the new `listings_global_info` Supabase view which joins `listings`, `listing_statuses`, and `listings_global_eval` directly.
    - **Column Changes**:
        - "Niche" column renamed to **"Theme"** — now displays `theme > niche` from the `listings` text columns.
        - **Score** column now shows `listing_strength` from `listings_global_eval` (was `listing_score`/`performance_score`).
        - **Status** uses `status_name` from `listing_statuses` (was raw `status` field).
        - **Title** uses `original_title` (was `display_title`).
        - **Date** uses `listing_created_at`.
    - **Cleanup**: Removed 5 unused icon imports. Updated search/filter logic and PDF export to match new field names.

- **History Page Metric Columns & Layout** (2026-02-27):
    - Added 6 new columns to the History table: **Visibility** (`listing_visibility`), **Visibility Index** (`listing_raw_visibility_index`), **Relevance** (`listing_relevance`), **Conversion** (`listing_conversion`), **Competition** (`listing_competition`, inverted color logic), **Market Index** (`listing_profit`).
    - Created reusable `MetricCell` component with color-coded numeric display (green ≥80, amber 50-79, gray <50; inverted for competition where lower is better).
    - Table now has 13 columns with compact spacing. Page is full-width (removed `max-w-7xl`). Default pagination increased to 20 rows.

- **Keyword Bank & Favorites System** (2026-02-28):
    - **Keyword Bank (Star Toggle)**: Each keyword row in the Performance table now has a Star (★) icon button. Clicking it toggles the keyword in/out of the user's personal `user_keyword_bank` Supabase table. Starred keywords are visually highlighted with a filled amber star. Cached metrics (volume, competition, CPC, volume_history) and listing context (product_type, theme, niche, sub_niche) are saved alongside each bank entry.
    - **Favorites Picker Modal** (`FavoritesPickerModal.jsx`): New modal accessible via "★ Add from Favorites" button in the keyword table footer. Features: real-time text search, filter pills ("All", "Suggested" for theme/niche match, "Gems" for user-defined quality thresholds), multi-select checkboxes, duplicate detection (grayed out "Added" badge for keywords already in listing), compact volume/competition metrics display.
    - **Gem Thresholds**: Gem filter reads user-configurable thresholds from `user_settings` table (`gem_min_volume`, `gem_max_competition`, `gem_min_cpc`). Defaults: volume ≥ 1000, competition ≤ 0.40, CPC ≥ $1.00.
    - **Batch Keyword Addition**: When adding multiple keywords from favorites, all are sent in a **single webhook call** with `keywords: ["kw1", "kw2", ...]` (array) instead of one call per keyword. The `handleAddBatchKeywords` handler in `ProductStudio.jsx` processes the array response, batch-inserts all results to `listing_seo_stats`, and updates local state atomically.
    - **n8n Impact**: The `userKeyword` action now receives either `keyword` (string, single) or `keywords` (array, batch). The n8n workflow should handle both formats — iterate over the array and return results for all keywords in one response.

- **Collapsed Form Header UI Update** (2026-02-28):
    - **UI Redesign**: Refactored `getContextString` in `ProductStudio.jsx` to display a cleaner hierarchy (`Theme > Niche > Sub-niche`) using `ChevronRight` icons.
    - **Badges**: Emphasized the `product_type_name` by extracting it into a styled Indigo pill badge (`#e0e7ff` bg, `#4338ca` text).
    - **Cleanup**: Removed the unused "Tone" property from the breadcrumbs to reduce clutter and maintain a streamlined hierarchy path, per user request.

- **Keyword Performance Delete Feature** (2026-02-28):
    - **UI Activation**: Enabled the previously inactive "Minus" (delete) button in the `ResultsDisplay.jsx` keyword table, adding hover states (`text-rose-600`, `bg-rose-50`) to indicate a destructive action.
    - **Database Soft Delete**: Created `handleDeleteKeyword` in `ProductStudio.jsx` which updates the database to set `is_current_pool = false` in `listing_seo_stats` for the specified keyword.
    - **Optimistic UI**: Implemented immediate local state filtering for `results.analytics` and `allSeoStats` to immediately remove the deleted keyword from the table without requiring a server refetch, ensuring a snappy user experience.
    - **Selection Bugfix**: Ensured the selected keyword counter decrements accurately by auto-unselecting deleted tags from the `selectedTags` array locally.

- **Removed Obsolete UI** (2026-02-28):
    - Pruned the "Reset Keywords" functionality from `ResultsDisplay.jsx` and its accompanying handler logic (`handleResetPool`, `isResettingPool`) from `ProductStudio.jsx` per user request to simplify the interface.

- **13 Keyword Selection Enforcement** (2026-02-28):
    - **Visual Feedback**: The selected keywords counter in the `ResultsDisplay.jsx` table header now dynamically turns red (`text-rose-600`, `bg-rose-50`) if the selected count is not exactly 13, guiding the user to select the optimal number.
    - **Action Guard**: The "Recalculate Scores" button is now disabled unless exactly 13 keywords are selected, enforcing the required calculation criteria. A tooltip is displayed when disabled to explain the requirement ("You must have 13 keywords selected to calculate the score").

- **Keyword Pinning** (2026-03-01):
    - **UI Toggle**: Added a "Pin" icon (`Pin` from `lucide-react`) to the left side of the table header, between the Favorite (Star) icon and the Checkbox, in `ResultsDisplay.jsx`. Clicking it toggles the `is_pinned` property for that keyword row visually.
    - **Database Sync**: Hooked up `handleTogglePin` in `ProductStudio.jsx` to perform real-time `is_pinned` status updates directly to the `listing_seo_stats` table in Supabase.
    - **Prioritization Logic**: Pinned keywords bypass standard AI selection logic and are always inserted at the top of the initial 13 selected tags, ordered by their score implicitly (if multiple are pinned).
    - **Constraint Enforcement**: Pinned keywords cannot be manually deselected by the user via the UI checkbox. The checkbox disables with `opacity-50` and `cursor-not-allowed` styles, and the `toggleTag` function includes an early return and warning toast (`Pinned keywords cannot be deselected. Unpin it first.`).
    - **Webhook Payload**: The `resetPool` webhook action inside `handleApplyStrategy` now includes a `pinned_count` integer payload, indicating to the n8n backend how many pinned keywords currently exist.

- **Keyword Performance Table UI Polish & Fixes** (2026-03-01):
    - **Iconography Update**: Replaced the Star icon with the `Award` icon for `is_promising` keywords across the table.
    - **Detailed Tooltips**: Added rich, descriptive tooltips to the top headers for the performance indicators.
    - **Optimized Column Widths**: Reduced the rigid percentage widths of the metric columns to give the Tag/Keyword column approximately 15% more horizontal space.
    - **Typography Fix**: Removed the monospaced font from the `Avg. Vol` column to match the `Score` column.
    - **Webhook Payload Alignment**: Fixed an issue where adding a single custom keyword passed `keyword: "..."` as a string instead of `keywords: ["..."]`, aligning the payload schema with the batch addition logic for the n8n `userKeyword` webhook.
    - **Custom Keyword Auto-Selection**: Keywords added manually or via the Favorites Bank are now automatically added to the `selectedTags` state, ensuring they immediately float to the top section of the Keyword Performance table.
    - **Null Value Database Fix**: Fixed an issue where adding a custom keyword that returned `null` for `competition` would throw a Supabase `invalid input syntax for type real: "null"` error. The fallback logic now correctly assigns `"0"` instead of stringifying the word `"null"`.

- **Keyword Optimization Caching Edge Function** (2026-03-01):
    - **Goal**: Optimize DataForSEO API costs by filtering keywords against a local database cache before analysis.
    - **Implementation**: Created the `check-keyword-cache` Supabase Edge Function using Deno.
    - **Logic**: Accepts a POST request with an array of `keywords`. Queries the `public.keyword_cache` table using the Supabase Service Role Key (bypassing RLS) and filters out stale entries (`last_sync_at < NOW() - 30 days`).
    - **Output**: Returns a JSON array (`cachedKeywords`) of fresh, matching keywords containing `search_volume`, `competition`, `cpc`, and `volume_history`. n8n will use this response to skip fetching live data for these cached terms.

- **Async Image Analysis Edge Function** (2026-03-01):
    - **Goal**: Move image analysis from a synchronous frontend block to a "fire and forget" model to prevent UI timeouts during the 1-minute AI vision generation step.
    - **Implementation**: Created the `save-image-analysis` Supabase Edge Function in Deno.
    - **Logic**: Secured by `x-api-key` header matching `N8N_WEBHOOK_SECRET`. Parses complex n8n payload arrays, extracting `listing_id` and `visual_analysis` objects. Maps parsed fields (`aesthetic_style`, `typography_details`, etc.) to the respective `public.listings` columns (`visual_aesthetic`, `visual_typography`, etc.) and sets `is_image_analysed: true`. Uses Supabase Service Role Key to execute the `.update()`.

- **Realtime UI Updates for Image Analysis** (2026-03-01):
    - **Goal**: Automatically stop the spinner and render results when the new `save-image-analysis` edge function completes, without requiring the user to manually refresh `#ProductStudio`.
    - **Implementation**: Refactored `handleAnalyzeDesign` in `ProductStudio.jsx` to be strictly asynchronous/fire-and-forget, maintaining `isAnalyzingDesign(true)`. Added a dual-mechanism realtime listener (Supabase Channel + 5s polling fallback) targeting `is_image_analysed === true` to detect completion.
    - **Result**: `handleImageAnalysisDone` populates `visualAnalysis` state and stops the spinner automatically.

- **Image Analysis Auto-Resume & Sync Fixes** (2026-03-01):
    - **Bug**: The image analysis spinner would either instantly complete on re-runs (due to Supabase read-replica replication lag on the `is_image_analysed` flag) or would completely fail to resume when reloading the page.
    - **Replication Lag Fix**: Implemented strict chronological bounding in `handleLoadListing` and `handleAnalyzeDesign`. We now store the exact server `updated_at` time when starting analysis (`imageAnalysisTriggeredAtRef`). The real-time listener and poller will strictly ignore any `is_image_analysed: true` responses unless their `updated_at` is strictly newer than the trigger time.
    - **Silent Database Error Fix**: During form auto-save, the `handleAnalyzeDesign` and `handleSaveDraft` functions were attempting to push `seo_mode` into the `listings` table update payload. Since `seo_mode` was removed from the schema, this caused a silent `PGRST204` failure that prevented `is_image_analysed: false` from saving to the DB. Removed all `seo_mode` references from the listings update payloads, restoring resilient auto-resume capabilities.

- **SEO System Admin Dashboard** (2026-03-02):
    - **Feature**: Created an internal `/admin/system` route and `AdminSystemPage.jsx` for managing core mathematical constants.
    - **Data Source**: Fetches live configuration values from the `public.system_seo_constants` table.
    - **UI Layout**: Uses a clean, data-heavy dashboard aesthetic. Constants are visually separated into two distinct cards: "SEO Strategy Weights" (tunable multipliers) and "Intelligence Thresholds" (hard limits for badge assignment).
    - **Collapsible Elements**: Wrapped the "SEO Strategy Weights" and "Intelligence Thresholds" tables using the existing `Accordion.jsx` component to allow users to easily expand or collapse the sections, minimizing visual clutter.
    - **Inline Editing**: Administrators can click "Edit" on any parameter to toggle a numeric input field. Clicking "Save" instantly performs an atomic update to Supabase (`.update({ value: X }).eq('id', id)`) and updates the local UI optimistically without requiring a full page reload.
    - **Navigation**: Inserted an "Admin" link with a `Settings` icon directly into the main `Sidebar` navigation menu.
    - **Security Placeholder**: Added a `// TODO` note reminding to wrap the layout with an Admin-only Role check in the future.
- **Personal SEO Optimizer (User Settings)** (2026-03-02):
    - **Feature**: Created `/settings` route and `UserSettings.jsx` allowing users to tune their AI algorithms.
    - **Data Source**: Reconciles the `system_seo_constants` catalog with the user's saved relationships in `user_settings`.
    - **UI Layout**: Segmented controls for Strategy Weights (Volume, Competition, Transactional, Niche, CPC) and Smart Badge Sensitivity (Evergreen, Trending, Promising).
    - **Premium Section**: Added numeric bounds controls for AI Selection Count, Working Pool Size, and Concept Diversity.
    - **Live Values Preview**: Implemented a sticky right-hand sidebar that queries `v_user_seo_active_settings` to immediately display the resolved mathematical values (floats/integers) behind the user's label choices.

- **Navigation & Branding Polish** (2026-03-02):
    - **Sidebar Update**: Renamed "Product Studio" to "SEO Listings" and changed its icon to a `Shirt`.
    - **Admin Isolation**: Moved the "Admin" link to the bottom of the sidebar, separated from primary user tools, and assigned it the `ShieldAlert` icon.
    - **Logo Scaling**: Replaced Tailwind padding classes with explicit CSS pixel widths and negative margins (`w-[240px]`) to force the PennySEO logo to properly fill the sidebar header, overcoming intrinsic transparent padding in the PNG file.

- **Expanded Keyword Limits and UI Guards** (2026-03-03):
    - Removed the strict `[...tags].slice(0, 13)` enforcement across `ResultsDisplay.jsx` when explicitly adding a keyword (from Favorites picker, or "Add Keyword" text input), enabling users to select > 13 tags simultaneously.
    - Implemented a dynamic visual cutoff divider (rendered in `bg-rose-50/50`) underneath the 13th selected keyword natively inside the interactive Keyword Performance table.
    - Disabled the "Recalculate Scores" button when `selectedTags.length > 13` or `selectedTags.length === 0`.
    - Added a `text-rose-600` styling boundary warning directly within the Accordion title component counting `x / y selected` words.

- **Chronological Sparkline Volume Bug Fix** (2026-03-03):
    - The `volume_history` API from n8n passes data from most recent (index 0) to least recent, causing the `<Sparkline>` and Math logic across the app to display trend lines backward.
    - Added an explicit `[...data].reverse()` inside `ResultsDisplay.jsx` and `SEOLab.jsx`'s `Sparkline` component, as well as `ListingPDFDocument.jsx`'s `SparklineSVG`, to force chronological left-to-right drawing and fix the `percentChange` bounds calculating math visually.
    - Cleaned up percentage math `const first = / const last =` inside `HistoryPage.jsx` and PDF payloads for the same reason.

- **UI Polish: REACH Tooltip** (2026-03-04):
    - Updated the tooltip text for the Reach index in the Audit Header (`ResultsDisplay.jsx`) to explicitly describe the AI-weighted probability based on niche relevance and buyer intent, instead of raw volume.

- **UI Fix: Audit Header Thumbnail** (2026-03-04):
    - Removed `flex-1` from the thumbnail image container in the Audit Header (`ResultsDisplay.jsx`) to prevent the image from being deformed (squished into a tall rectangle) on narrower screen sizes, ensuring it remains a fixed 24x24 square.

- **UI Fix: Audit Header Breakpoints & Overlap** (2026-03-04):
    - Shifted the horizontal layout of the Audit Header from `md:` (768px) to `lg:` (1024px) breakpoints. The 3 sections (Overall Score, Technical Analysis, Est. Value) now stack vertically on tablets and smaller screens to entirely eliminate text/gauge overlapping.
    - Updated flexbox assignments on desktop sizes: changed rigid percentage widths (`w-1/4`, `w-1/2`) to fully dynamic layout logic (`lg:w-auto lg:flex-shrink-0` on sides, `lg:flex-1 min-w-0` in middle) to allow section boundaries to adapt fluidly to their contents. Removed all `xl:w-1/4` classes that were artificially squeezing content.
    - Added `min-w-max` to the Listing Overall Score inner container to ensure the SVG `RadialGauge` and its label respect intrinsic width.
- **Bug Fix: Missing Reach Index** (2026-03-04):
    - Fixed an issue where the Reach index (`est_market_reach`) would disappear from the Audit Header after generating a new analysis or applying a new Custom Strategy. 
    - The root cause was that `handleLoadListing` in `ProductStudio.jsx` was successfully fetching the value from `listings_global_eval`, but was failing to map it into the `constructedResults` state object passed down to `<ResultsDisplay />`. Added `listing_est_market_reach` to the hydration mapping.

- **UI Polish: Conv. Intent & Relevance Badges** (2026-03-04):
    - Replaced the raw numeric scores (e.g., "7/10") for "Conv. Intent" and "Relevance" in the Keyword Performance table (`ResultsDisplay.jsx`) with visual badges (`SeoBadge.jsx`).
    - Implemented a 4-tier discrete scale (10, 7, 4, 1) mapping to unified professional labels (Very High, High, Moderate, Low).
    - Added color-coded Tailwind pills (**Indigo** for Very High, **Emerald** for High, **Amber** for Moderate, **Slate** for Low) and specific educational tooltips tailored for Relevance or Intent on hover to explain the "Why" behind each score, reducing cognitive load.
    - **Interactive Score Editing**: Developed a custom single-click dropdown menu for the `SeoBadge` component, replacing the native `<select>`. Users can manually override AI-generated scores. Changes immediately reflect in the UI and are synced to Supabase (`listing_seo_stats` table).



## 6. Session Handover (2026-03-05)
### Summary of Achievements
- **SEO Parameter Sync**: Unified the flow for SEO parameters. `generate_seo` now pulls from user defaults (`v_user_seo_active_settings`), while `resetPool` respects listing-specific strategic overrides.
- **Admin System Power-Up**: Transformed the Admin page into a full-featured management console with CRUD (Add/Edit Keywords/Delete) and multi-column sorting.
- **Bug Squashing**: Resolved a casing mismatch in `UserSettings.jsx` that was preventing "Current Live Values" from rendering correctly.
- **Smart Badge Settings Integrity**: Updated `UserSettings.jsx` to support multi-parameter grouped saves. Selecting a master threshold (e.g. Evergreen Stability) now automatically resolves and batch-saves all related sub-parameters (`evergreen_stability_ratio_id`, etc.) to the `user_settings` table by parsing identical label keys within the constants catalog.
- **Smart Badge Render Fix**: Modified `UserSettings.jsx` to render the segmented controls based on active child parameters (e.g. `evergreen_stability_ratio`) rather than legacy master keys, restoring the UI options that disappeared after database schema pruning.
- **n8n Webhook Payload Sync**: Updated `ProductStudio.jsx` to extract 7 Smart Badge threshold parameters from the user's `v_user_seo_active_settings` view and bundle them into the `parameters` payload sent during both `generate_seo` and `resetPool` actions, ensuring the backend AI respects user sensitivity configurations.
- **Form State Preservation**: Updated `ProductStudio.jsx` to capture the current state of the 'Description/Info' textarea using a ref before updating the `analysisContext` with new AI data, preventing user-typed instructions from disappearing when image analysis completes.
- **History Page Delete Flow**: Replaced the native browser `confirm()` dialogue in `HistoryPage.jsx` with the custom `<ConfirmationModal>` component for a more premium feel, and renamed the 'Supprimer' button to 'Delete'.
- **SEO Lab UI Enhancements** (2026-03-06): 
    - Added a sortable "Last Updated" column to `SEOLab.jsx` (formatted as YYYY-MM-DD). Widened the "Tag" column and styled the keywords as clean, rounded pills with hover effects to match the main Keyword Performance table aesthetic.
    - Adjusted the `Context` column width in the Presets table to prevent text truncation.
    - Implemented a fully interactive Pagination footer for the Individual Keywords bank, allowing users to select 10 (default), 25, or 50 rows per page. Includes dynamic `Chevron` page hopping and automatic page reset on search or sort.
- **Feature: Keyword Presets** (2026-03-06):
    - Added "Keyword Presets" to the SEO Lab, allowing users to bundle up to 10 keywords into one-click strategies.
    - Implemented client-side aggregate calculations for Total Volume, Avg Competition, and Avg CPC without writing complex backend RPCs.
    - Added a `CreatePresetModal` component with dynamic keyword searching and selection limits.
    - Reused the existing `<EditableCell />` component to allow users to inline-edit a preset's Title, Theme, Niche, and Sub-niche directly from the table.
    - Added a "Trash" icon to individual keywords inside a preset's expanded sub-table, allowing users to remove keywords from a preset dynamically (instantly recalculating the preset's aggregate stats).
    - Added a `Plus` button on the main preset row to launch an `EditPresetKeywordsModal`, enabling users to seamlessly search and append new keywords from their bank to a pre-existing preset.
- **Advanced Keyword Filtering** (2026-03-06):
    - Implemented a dynamic filtering system for the SEO Lab Individual Keywords bank.
    - Added a "Filter" toggle button next to the search bar. When active, it expands an inline panel with dropdowns for Theme, Niche, and Sub-niche.
    - The filter options are automatically derived and populated from the existing unique values in the user's keyword bank.
    - The dropdowns cascade dynamically (e.g., selecting a Theme narrows down the available Niches to only those associated with that Theme).
    - Includes a subtle "active filter" ping indicator on the main button and a "Clear Filters" mechanism.
    - Cloned the exact same rigorous filtering capability directly inside the `Create Preset` and `Edit Keywords` modals, permitting users to surgically sift their banks when assembling presets.
- **SEO Lab UI Polish** (2026-03-06):
    - Renamed the "Individual Keywords" tab to **"Favorite Tags"** across the tab label and pagination footer for clearer branding.
    - Applied pill-style rendering (`rounded-full`, `bg-slate-100/80`, hover effect) to keyword tags inside the Preset expanded sub-tables, matching the style already used in the main Favorite Tags table.
- **Add From Favorites Payload Restructure** (2026-03-06):
    - Changed the Favorites Bank "Add Selected Keywords" flow from action `userKeyword` to `addFromFavorites`.
    - `FavoritesPickerModal.jsx` now passes full keyword bank objects (with `last_volume`, `last_competition`, `last_cpc`, `volume_history`) instead of plain tag strings.
    - `handleAddBatchKeywords` in `ProductStudio.jsx` builds the n8n-compatible `tasks[].result[]` payload structure, mapping bank fields to DataForSEO schema (`search_volume`, `competition`, `cpc`, `monthly_searches` with `year`/`month`/`search_volume` objects). This eliminates redundant API lookups for cached keywords.
- **Pin Auto-Select & Divider Fix** (2026-03-06):
    - Pinning a keyword now auto-selects it (checkbox + counter sync).
    - Batch-added keywords from Favorites are now properly auto-selected using `kw.tag` mapping.
    - "Suggestions & Discovery" divider now always appears after the 13th row (fixed position). Unselected keywords in the top 13 show in pale rose as "empty slots."
- **Save as Preset from Keyword Performance** (2026-03-07):
    - Extracted `CreatePresetModal` from `SEOLab.jsx` into shared `src/components/studio/CreatePresetModal.jsx`.
    - Dual-mode component: **"performance mode"** (from ResultsDisplay) shows only the selected Performance table keywords as selectable items; **"bank mode"** (from SEOLab) shows the full favorites bank.
    - In performance mode, top 10 by volume are pre-selected. On save, non-favorite keywords are auto-inserted into `user_keyword_bank`. Filter UI is hidden in this mode.
    - `initialTheme/Niche/SubNiche` props pre-fill from listing context.
    - "Save as Preset" button added to the Keyword Performance table header in `ResultsDisplay.jsx`.
- **Webhook Parameters Alignment** (2026-03-07):
    - Added the full `parameters` block (Volume, Competition, Transaction, Niche, CPC + smart badge thresholds) to both `userKeyword` and `addFromFavorites` payloads in `ProductStudio.jsx`, matching the same structure as `generate_seo`.
- **Presets Tab in Favorites Modal** (2026-03-07):
    - Added a two-tab system to `FavoritesPickerModal.jsx`: **Favorite Tags** (existing) and **Presets** (new).
    - Presets tab fetches `keyword_presets`, resolves `keyword_ids` to bank objects, displays each preset with name, theme breadcrumb, tag count, and total volume.
    - Single-select (radio-style). On submit, resolved keywords pass through the same `onAddBatchKeywords` flow as individual favorites.

- **Global Taxonomy Management** (2026-03-08):
    - **Feature**: New `TaxonomyManagement.jsx` component (`src/components/admin/TaxonomyManagement.jsx`) for managing `system_themes` (23 rows) and `system_niches` (28 rows) Supabase tables.
    - **UI**: Tabbed interface ("System Themes" / "System Niches") with framer-motion animated tab indicator and content transitions. Blue icon accent for themes, orange for niches.
    - **Table**: Columns — Name, Description (Hints), Status (toggle switch), Actions (Edit/Delete). Inline editing for name and description. Custom `ToggleSwitch` component for `is_active` with optimistic updates.
    - **Features**: Real-time search filtering, inline "Add" row, duplicate name detection (Supabase unique constraint → toast error), delete with confirmation, loading states.
    - **Integration**: Added as the third `<Accordion>` section ("Global Taxonomy" with emerald Globe icon) in `AdminSystemPage.jsx`, below "Intelligence Thresholds". No DB migration needed — tables already existed with the correct schema.

- **Settings Page Accordion Refactor** (2026-03-08):
    - **Refactor**: Rewrote `UserSettings.jsx` from flat multi-column layout + sticky sidebar to a clean 4-accordion design matching the Admin panel.
    - **Removed**: "Current Live Values" sidebar (`liveValues` state, `fetchLiveValues()` function) — freed horizontal space.
    - **Accordion 1**: "SEO Strategy Weights" (Sliders icon, indigo) — 5 segmented controls in 2-col grid.
    - **Accordion 2**: "Smart Badge Sensitivity" (Zap icon, amber) — 3 segmented controls.
    - **Accordion 3**: "Analysis Constraints" (BarChart3 icon, amber + Premium badge) — 3 numeric inputs.
    - **Accordion 4**: "My Shop Identity" (Tags icon, emerald) — Uses `UserTaxonomyManagement.jsx` component (`src/components/settings/UserTaxonomyManagement.jsx`) mirroring the Admin's `TaxonomyManagement` pattern: tabbed table layout (My Themes / My Niches), search bar, inline editing, favorite star (★) toggle, add/delete rows. Operates on `user_custom_themes` and `user_custom_niches` tables scoped to the current user.
    - **Preserved**: All existing settings state management, `handleSave`, `handleMultiSettingChange`, `renderSegmentedControl`.

- **RLS Policies for Custom Taxonomy** (2026-03-08):
    - **Fix**: `is_favorite` toggle on custom niches was not persisting because RLS was enabled on `user_custom_niches` table without proper policies.
    - **Migration**: `add_rls_policies_user_custom_taxonomy` — added full CRUD policies (SELECT, INSERT, UPDATE, DELETE) scoped to `auth.uid() = user_id` on both `user_custom_niches` and `user_custom_themes`.

- **Taxonomy Form Dropdowns** (2026-03-10):
    - **Feature**: Replaced the plain text `<input>` fields for "Theme" and "Niche" in `OptimizationForm.jsx` with `<select>` dropdowns.
    - **Data**: These dropdowns are now dynamically populated on load by concurrently fetching active rows from the `system_themes` and `system_niches` Supabase tables alongside product categories.
    - **Graceful Fallback**: The UI natively supports legacy text values (e.g. from history rehydration) by rendering a custom `<option>` when the string does not belong to the active system taxonomy, ensuring zero data loss during the transition.
    
- **Unified Product Types** (2026-03-10):
    - **Feature**: Transitioned from plain text `product_type_text` storage to a unified UUID-based system via `v_combined_product_types` view, blending `product_types` and `user_custom_product_types`.
    - **Frontend**: `ProductTypeCombobox.jsx` fetches and groups a flat list into System vs Custom categories. Custom types visually distinguished.
    - **Integration**: `ProductStudio.jsx` introduces `ensureProductType` helper to intercept custom strings, INSERT them into `user_custom_product_types`, handle conflicts, and return the `product_type_id` before saving to `listings`.
    - **Cleanup**: Removed all legacy `product_type_text` usage across `HistoryPage`, `CreatePresetModal`, `ResultsDisplay`, and Webhook payloads. Flow relies entirely on explicit UUID-linked names or text fallbacks where appropriate.
    - **Fix (RLS)**: Applied missing RLS policies (`auth.uid() = user_id`) to the `user_custom_product_types` table to resolve silent INSERT failures when users attempted to save a custom product type.
    - **Fix (Trigger)**: Fixed a database trigger `check_if_product_type_exists_in_system` that was causing `relation "public.system_product_types" does not exist` errors when saving new custom types, by correcting the referenced table to `public.product_types`.
    - **Fix (Constraint)**: Dropped the stale `listings_product_type_id_fkey` constraint on the `listings` table, allowing `product_type_id` to legally accept UUIDs generated from the `user_custom_product_types` table.
    - **Fix (Loading)**: Removed an outdated implicit `product_types(name)` join from `handleLoadListing` in `ProductStudio.jsx` which was causing a `PGRST200` relation error after the foreign key was successfully dropped.
    - **Fix (Hydration)**: Replaced rendering of the deprecated `product_type_text` column with a dynamic fetch from the `v_combined_product_types` view using the `product_type_id` during listing load to ensure custom and system product types appear correctly after refresh.

- **Minor Polish** (2026-03-11):
    - **App Icon**: Updated `index.html` to point to the correct `favicon.ico` asset instead of the default Vite boilerplate SVG.

### March 12th, 2026 - Landing Page & UI Polish
- **Feature**: Built and integrated a new "Coming Soon" Landing Page component for PennySEO (`LandingPage.jsx`).
    - **UI Design**: A clean, 2-column Hero section on desktop featuring dynamic waitlist email capture and a preview image of the PennySEO dashboard (`dashboard_preview.jpg`).
    - **Visuals**: Employs a SaaS aesthetic utilizing a `slate-50` background with striking Indigo and Orange accents.
    - **Branding**: Integrated PennySEO logo and 5PennyAi company logo ("Powered by 5PennyAi") in the navigation.
- **UI Refinement**: Optimized the "Keyword Performance" table in `ResultsDisplay.jsx`.
    - Widened "Conv. Intent." and "Relevance" columns to 10% each.
    - Added `whitespace-nowrap` to headers and badges to ensure "VERY HIGH" pills never wrap onto two lines.
- **Routing Integration**: Configured the React Router in `App.jsx` to natively display the Landing Page at the absolute root URL (`/`), migrating the protected application gateway functionally down to `/dashboard`.

- **Analysis Constraints in Webhook Payloads** (2026-03-12):
    - Added `ai_selection_count`, `working_pool_count`, and `concept_diversity_limit` to all 5 webhook `parameters` blocks in `ProductStudio.jsx`: `generate_seo`, `userKeyword`, `addFromFavorites`, and both `resetPool` calls (handleResetPool + handleApplyStrategy).
    - Values sourced from `userDefaults` (fetched from `v_user_seo_active_settings` view at mount). Defaults: 13, 40, 3 respectively.
    - These fields allow the n8n backend to respect per-user analysis constraints for AI keyword selection count, working pool size, and concept diversity limits.

- **Competition Badge Threshold Update** (2026-03-12):
    - Updated the color thresholds for the Competition column badge in the Keyword Performance table (`ResultsDisplay.jsx`).
    - **Old values**: Green `< 0.3`, Amber `0.3–0.7`, Rose `≥ 0.7`.
    - **New values**: Green `< 0.5` (Real opportunity), Amber `0.5–0.9` (Standard/active niche), Rose `≥ 0.9` (Saturated market).

- **Trending Growth Factor Parameter** (2026-03-13):
    - **Problem**: The new `trending_growth_factor_id` column in `user_settings` was not being saved when modifying the Trending Growth threshold in the Settings page, and was not being sent to n8n webhooks.
    - **Fix (UserSettings.jsx)**: Added `trending_growth_factor_id: null` to the initial settings state. Added `'trending_growth_factor'` to the `subKeyMap.trending` array in `handleMultiSettingChange`, so selecting a Trending Growth level now auto-resolves and saves the matching `trending_growth_factor` constant ID alongside the existing `trending_dropping_id` and `trending_current_month_min_id`.
    - **Fix (ProductStudio.jsx)**: Added `trending_growth_factor: userDefaults.trending_growth_factor` to the `getSmartBadgePayload()` helper function, which feeds all 5 n8n webhook payloads (`generate_seo`, `userKeyword`, `addFromFavorites`, and both `resetPool` calls).

### March 14th, 2026 - Add Custom Keyword Stale State Fix

- **Critical Bug Fix: "Add Custom Keyword" / "Add from Favorites" Not Working After Fresh Analysis**
    - **Symptom**: After running a fresh SEO analysis (without page refresh), clicking "Add Custom Keyword" or "Add from Favorites" would silently fail — no webhook fired, no toast, no error. After a manual page refresh, the same buttons worked perfectly.
    - **Root Cause (Diagnosed via Toast Diagnostics)**: 
        - `handleAnalyzeDesign` sets `results = { imageUrl: "..." }` (partial object, **no `analytics` property**) before SEO analysis begins.
        - After SEO completes, `handleLoadListing` sets proper `results` with `analytics`. However, the `handleAddCustomKeyword` closure still held the partial `results` from the earlier render.
        - Guard check `if (!freshResults.analytics)` silently returned because `analytics` was `undefined` on the partial object.
        - Both closure variables AND `latestRef.current` captured the same stale value — the ref pattern didn't help because both were updated from the same React render cycle.
    - **Fix (ProductStudio.jsx)**:
        - **Removed `useMemo` wrapper** from `MemoizedResultsDisplay` — now renders `<ResultsDisplay>` directly, ensuring all callback props are always fresh on every render.
        - **Eliminated `results.analytics` dependency** in `handleAddCustomKeyword` — duplicate check now **queries Supabase directly** (`listing_seo_stats` table) instead of reading from potentially stale `results.analytics`.
        - **Direct closure variables** used for webhook payload (`userDefaults`, `strategySelections`, `visualAnalysis`) with `latestRef` as fallback for `imageUrl`.
        - Added `latestRef` pattern (always-fresh ref updated every render) as safety net for async handlers.
    - **Fix (Accordion.jsx)**: Added `useEffect` to auto-open accordion when `defaultOpen` transitions from `false` to `true` (previously only checked on mount).
    - **Fix (handleAddBatchKeywords)**: Updated payload to use `freshResults` and `freshVisualAnalysis` from `latestRef` instead of stale closure variables.
    - **Database Migration**: Added unique constraint on `listing_seo_stats(listing_id, tag)` to support upsert operations (`20260314_unique_listing_tag_constraint.sql`).

- **SEO Analysis Parent Accordion** (2026-03-14):
    - **Goal**: Reduce visual clutter in the main content area by wrapping the entire SEO results section (AuditHeader + StrategyTuner + Keyword Performance table) inside a single collapsible parent `<Accordion>` in `ResultsDisplay.jsx`.
    - **Header**: Displays "SEO Analysis" label with `BarChart3` icon, a color-coded score badge (emerald ≥80, amber 50-79, rose <50), and a loading spinner when insight generation is in progress.
    - **Controlled State**: `isSeoAnalysisOpen` state lifted to `ProductStudio.jsx` and passed down as `seoAnalysisOpen` / `onSeoAnalysisOpenChange` props. Auto-opens on analysis completion (`handleAnalyze`) and listing load (`handleLoadListing`). Auto-closes on "New Listing" click for a clean slate.

- **Post-SEO Flow Optimization** (2026-03-14):
    - **Problem**: After `save-seo` edge function completed, the `postSeoTrigger` effect would first call `handleLoadListing` (fetching full data), then immediately call `handleApplyStrategy` (which also calls `handleLoadListing` internally), resulting in a redundant double-load.
    - **Fix**: When `shouldAutoResetPoolRef.current` is true, the post-SEO flow now skips the intermediate `handleLoadListing` and goes directly to `handleApplyStrategy`, which performs its own single final load. Toast message updated to "Optimizing keyword pool..." for the auto-reset path.

- **Backend resetPool Orchestration** (2026-03-15):
    - **Problem**: If the user navigated away before `generateSEO` completed, the client-side `resetPool` call would never fire.
    - **Fix**: Moved `resetPool` trigger logic entirely to the `save-seo` Supabase Edge Function. The `save-seo` function now reads a `trigger_reset_pool` flag from the n8n payload. If `true`, it fetches user settings from `v_user_seo_active_settings`, constructs the `resetPool` payload, and fires the n8n webhook server-side as a fire-and-forget.
    - **Loop Prevention**: When `trigger_reset_pool` is true, the listing is NOT set to `SEO_DONE` by that call. The subsequent `resetPool` action calls `save-seo` again WITHOUT this flag, which then sets `SEO_DONE` and `is_generating_seo = false`.
    - **Payload Parsing Fix**: Corrected array-unwrapping for n8n bodies (both top-level and `results` are unwrapped with `Array.isArray` checks).
    - **Webhook URL Fix**: Changed from hardcoded test URL to `N8N_WEBHOOK_URL_RESET_POOL` env var — test webhook only works when n8n is in test mode; production requires the activation URL.
    - **Frontend Cleanup**: Removed `shouldAutoResetPoolRef` and its `useEffect` from `ProductStudio.jsx`.

- **Keyword Table: Data Normalization for Low-Volume Keywords** (2026-03-15):
    - **Goal**: Avoid displaying misleading "0", aggressive red trend lines, or meaningless competition scores for keywords below the API's measurement threshold.
    - **Implementation**: Added an `isLowVolume` flag (`volume < 10`) computed per row in `ResultsDisplay.jsx`.
    - **Volume column**: Shows `"< 10"` (slate-400) instead of "0".
    - **Trend column**: Hides the `Sparkline` and shows a neutral `—` dash (slate-300) for low-volume rows.
    - **Competition column**: Shows `"N/A"` (slate-300) for low-volume rows, overriding the colored badge.
    - **CPC column**: Changed the empty state from "N/A" text to a `—` dash (slate-300) for all rows.
    - **Row opacity**: Low-volume rows that are selected get `opacity-60`; unselected low-volume rows get `opacity-40` (stacked on existing `opacity-60`).

### Immediate Next Steps
1.  Add `N8N_WEBHOOK_URL_RESET_POOL` to Supabase Edge Function secrets (production webhook URL for the resetPool n8n workflow).
2.  Redeploy the `save-seo` edge function with the latest changes.
3.  Test the end-to-end `generateSEO → save-seo → resetPool` flow by closing the browser mid-generation and verifying `resetPool` is triggered from the backend.
4.  Update n8n `generate_seo` workflow to include `"trigger_reset_pool": true` in the payload sent to `save-seo`.

---

### March 17th, 2026 — Local API Server: Analyse Design Migrated Off n8n

- **Architecture Change: `analyseImage` no longer uses n8n webhook.**
  - The "Analyse Design" button in `ProductStudio.jsx` (`handleAnalyzeDesign`) previously fired a fire-and-forget POST to the n8n webhook with `action: "analyseImage"`.
  - It now calls a **local Express API server** at `/api/seo/analyze-image` instead.

- **New file: `server.mjs`** — Standalone Express server on port `3001`.
  - Full pipeline inline: Gemini Vision → Supabase taxonomy fetch → Gemini taxonomy mapping → `save-image-analysis` Edge Function.
  - Visual analysis context is **injected into the taxonomy prompt** (prepended as `# Visual Analysis Input`) to fix `theme: undefined` / `niche: undefined` mapping failures.
  - Uses `gemini-2.0-flash` for both vision and text models.
  - All secrets (`GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_SECRET`) are loaded server-side only via `--env-file=.env` — **never exposed to the frontend**.

- **`vite.config.js` updated** — Added `server.proxy` block: `/api` → `http://localhost:3001`. Frontend calls `/api/seo/analyze-image` and Vite transparently forwards it to Express, eliminating CORS issues.

- **`package.json` scripts updated**:
  - `npm run dev` → runs **both** Express API + Vite concurrently (via `concurrently`).
  - `npm run dev:api` → Express API only.
  - `npm run dev:vite` → Vite frontend only.

- **New dependencies**: `express` (runtime), `concurrently` (runtime, used in dev script).

- **Tech Stack update**: AI vision route is now served locally (Node.js/Express), removing dependency on n8n for the `analyseImage` action. n8n is still used for `generate_seo`, `drafting_seo`, `userKeyword`, `addFromFavorites`, `generateInsight`, `competitionAnalysis`, `resetPool`.

- **Keyword Table: High-Volume Outlier Cap** (2026-03-15):
    - **Goal**: Prevent display of statistically implausible volumes (e.g. "17,342,342") that erode tool credibility.
    - **Implementation**: Added `isHighVolume` flag (`volume >= 1,000,000`) per row in `ResultsDisplay.jsx`.
    - **Volume column**: Shows `"> 1M"` in bold indigo text for keywords at peak saturation — sorting remains accurate since `row.volume` is unchanged.
    - **Reasoning**: For Etsy sellers, 1M and 17M are strategically identical (unrankable main terms); capping avoids implying false precision.

- **SEO Lab Preset Pill Removal** (2026-03-15):
    - Removed the redundant `Preset` pill badge from each row in the My Presets tab in `SEOLab.jsx`. It was uninformative since every row in that tab is already a preset by definition.

---

### March 17th, 2026 — SEO Generation Migrated to Local API Server

- **Architecture Change: `generate_seo` no longer uses n8n webhook.**
    - The "Analyse" button in `ProductStudio.jsx` (`handleAnalyze`) previously fired a fire-and-forget POST to the n8n webhook with `action: "generate_seo"`, then relied on a Supabase Realtime listener + 5s polling fallback to detect `SEO_DONE`.
    - It now calls a **local Express API server** at `/api/seo/generate-keywords` (synchronous, ~30s) and `await`s the response directly.
    - After the call returns, a **1.5s delay** is inserted (`await new Promise(r => setTimeout(r, 1500))`) to allow the `save-seo` edge function's pool reset (`is_current_pool` DB writes) to fully commit before `handleLoadListing` reads the results — eliminating a race condition where all keywords (not just `is_current_pool = true`) were displayed immediately after generation.

- **New file: `app/api/seo/generate-keywords/route.ts`** — Full SEO keyword pipeline:
    1. Gemini generates keyword ideas from product context + visual analysis.
    2. DataForSEO enriches with real search volume, competition, CPC, and 12-month history.
    3. Niche scoring (`lib/seo/niche-scoring.ts`) and transactional scoring (`lib/seo/transactional-scoring.ts`) applied per keyword.
    4. LSI (Latent Semantic Indexing) relevance score calculated.
    5. Results persisted via the `save-seo` Supabase Edge Function (which handles pool reset, multi-mode upserts, and sets `is_generating_seo = false` + `status_id = SEO_DONE`).

- **`server.mjs` updated** — Added `POST /api/seo/generate-keywords` Express route, loading and executing `app/api/seo/generate-keywords/route.ts` via `tsx`.

- **`ProductStudio.jsx` — `handleAnalyze` updated**:
    - Replaced the N8N fire-and-forget + Realtime listener pattern with a single `await axios.post('/api/seo/generate-keywords', payload)`.
    - After response, waits 1.5s then calls `handleLoadListing` directly to render final results.
    - The Realtime subscription and polling fallback remain in the codebase for `is_image_analysed` image analysis events — they are no longer used for the SEO generation flow.

- **n8n still used for**: `drafting_seo`, `userKeyword`, `addFromFavorites`, `generateInsight`, `competitionAnalysis`, `resetPool`.

- **New support files**:
    - `lib/seo/niche-scoring.ts` — Niche relevance scoring logic.
    - `lib/seo/transactional-scoring.ts` — Buyer intent / transactional scoring logic.
    - `test-generate-keywords.mjs` — End-to-end test script for the new route.
    - `docs/generate-seo-logic.ts` — Reference doc for the full pipeline logic.

- **Operational note**: Both Express routes (`analyze-image` and `generate-keywords`) now run on `http://localhost:3001`. The server must be restarted (`node --env-file=.env server.mjs`) whenever `server.mjs` changes. Use `npx nodemon --env-file=.env server.mjs` for auto-reload during development.

### March 18th, 2026 — Image Analysis Fixes
- **Fix**: The `analyseImage` local API was failing to return a `theme` and `niche` consistently.
    - **Root Cause**: The second AI call (`PROMPT_TAXONOMY_MAPPING`) was not receiving the visual analysis context from the first AI call.
    - **Fix**: Injected the visual analysis results and product details into the taxonomy prompt.
    - **Hardening**: Made the prompt more explicit to ensure the AI *always* returns a `theme` and `niche`, even if it has to select "Others".
    - **Data Structure**: Corrected the `mergeAnalysisResults` function to handle cases where the AI returns a single-element array instead of a plain object.
- **Dev Experience**:
    - **`nodemon`**: Installed `nodemon` and updated the `dev` script. The local Express server now auto-restarts on file changes, eliminating the need for manual server restarts.

- [Sync] Committed and pushed latest architectural changes (local API migration for analyze-image, generate-keywords, and reset-pool).
- [Architecture] Unified the keyword filtering and analysis logic into the local server (`server.mjs`), reducing dependency on untracked cloud workflows.
- [QA] Added test scripts (`test-filter-logic.ts`, `test-reset-pool.ts`) and database documentation for the new local SEO pipeline.
- [Sync] Staged and committed core untracked logic in `lib/seo/filter-logic.ts` to ensure repository integrity.

## 6. Session Handover (2026-03-19)
### Summary of Achievements
- **Local API Transition**: Successfully transitioned `analyseImage`, `generate-keywords`, and `reset-pool` actions to a local Express server.
- **Data Integrity**: Capped keyword volumes (`> 1M`, `< 10`) to maintain tool credibility and normalized trend displays.
    - **Features**: Real-time search filtering, inline "Add" row, duplicate name detection (Supabase unique constraint → toast error), delete with confirmation, loading states.
    - **Integration**: Added as the third `<Accordion>` section ("Global Taxonomy" with emerald Globe icon) in `AdminSystemPage.jsx`, below "Intelligence Thresholds". No DB migration needed — tables already existed with the correct schema.

- **Settings Page Accordion Refactor** (2026-03-08):
    - **Refactor**: Rewrote `UserSettings.jsx` from flat multi-column layout + sticky sidebar to a clean 4-accordion design matching the Admin panel.
    - **Removed**: "Current Live Values" sidebar (`liveValues` state, `fetchLiveValues()` function) — freed horizontal space.
    - **Accordion 1**: "SEO Strategy Weights" (Sliders icon, indigo) — 5 segmented controls in 2-col grid.
    - **Accordion 2**: "Smart Badge Sensitivity" (Zap icon, amber) — 3 segmented controls.
    - **Accordion 3**: "Analysis Constraints" (BarChart3 icon, amber + Premium badge) — 3 numeric inputs.
    - **Accordion 4**: "My Shop Identity" (Tags icon, emerald) — Uses `UserTaxonomyManagement.jsx` component (`src/components/settings/UserTaxonomyManagement.jsx`) mirroring the Admin's `TaxonomyManagement` pattern: tabbed table layout (My Themes / My Niches), search bar, inline editing, favorite star (★) toggle, add/delete rows. Operates on `user_custom_themes` and `user_custom_niches` tables scoped to the current user.
    - **Preserved**: All existing settings state management, `handleSave`, `handleMultiSettingChange`, `renderSegmentedControl`.

- **RLS Policies for Custom Taxonomy** (2026-03-08):
    - **Fix**: `is_favorite` toggle on custom niches was not persisting because RLS was enabled on `user_custom_niches` table without proper policies.
    - **Migration**: `add_rls_policies_user_custom_taxonomy` — added full CRUD policies (SELECT, INSERT, UPDATE, DELETE) scoped to `auth.uid() = user_id` on both `user_custom_niches` and `user_custom_themes`.

- **Taxonomy Form Dropdowns** (2026-03-10):
    - **Feature**: Replaced the plain text `<input>` fields for "Theme" and "Niche" in `OptimizationForm.jsx` with `<select>` dropdowns.
    - **Data**: These dropdowns are now dynamically populated on load by concurrently fetching active rows from the `system_themes` and `system_niches` Supabase tables alongside product categories.
    - **Graceful Fallback**: The UI natively supports legacy text values (e.g. from history rehydration) by rendering a custom `<option>` when the string does not belong to the active system taxonomy, ensuring zero data loss during the transition.
    
- **Unified Product Types** (2026-03-10):
    - **Feature**: Transitioned from plain text `product_type_text` storage to a unified UUID-based system via `v_combined_product_types` view, blending `product_types` and `user_custom_product_types`.
    - **Frontend**: `ProductTypeCombobox.jsx` fetches and groups a flat list into System vs Custom categories. Custom types visually distinguished.
    - **Integration**: `ProductStudio.jsx` introduces `ensureProductType` helper to intercept custom strings, INSERT them into `user_custom_product_types`, handle conflicts, and return the `product_type_id` before saving to `listings`.
    - **Cleanup**: Removed all legacy `product_type_text` usage across `HistoryPage`, `CreatePresetModal`, `ResultsDisplay`, and Webhook payloads. Flow relies entirely on explicit UUID-linked names or text fallbacks where appropriate.
    - **Fix (RLS)**: Applied missing RLS policies (`auth.uid() = user_id`) to the `user_custom_product_types` table to resolve silent INSERT failures when users attempted to save a custom product type.
    - **Fix (Trigger)**: Fixed a database trigger `check_if_product_type_exists_in_system` that was causing `relation "public.system_product_types" does not exist` errors when saving new custom types, by correcting the referenced table to `public.product_types`.
    - **Fix (Constraint)**: Dropped the stale `listings_product_type_id_fkey` constraint on the `listings` table, allowing `product_type_id` to legally accept UUIDs generated from the `user_custom_product_types` table.
    - **Fix (Loading)**: Removed an outdated implicit `product_types(name)` join from `handleLoadListing` in `ProductStudio.jsx` which was causing a `PGRST200` relation error after the foreign key was successfully dropped.
    - **Fix (Hydration)**: Replaced rendering of the deprecated `product_type_text` column with a dynamic fetch from the `v_combined_product_types` view using the `product_type_id` during listing load to ensure custom and system product types appear correctly after refresh.

- **Minor Polish** (2026-03-11):
    - **App Icon**: Updated `index.html` to point to the correct `favicon.ico` asset instead of the default Vite boilerplate SVG.

### March 12th, 2026 - Landing Page & UI Polish
- **Feature**: Built and integrated a new "Coming Soon" Landing Page component for PennySEO (`LandingPage.jsx`).
    - **UI Design**: A clean, 2-column Hero section on desktop featuring dynamic waitlist email capture and a preview image of the PennySEO dashboard (`dashboard_preview.jpg`).
    - **Visuals**: Employs a SaaS aesthetic utilizing a `slate-50` background with striking Indigo and Orange accents.
    - **Branding**: Integrated PennySEO logo and 5PennyAi company logo ("Powered by 5PennyAi") in the navigation.
- **UI Refinement**: Optimized the "Keyword Performance" table in `ResultsDisplay.jsx`.
    - Widened "Conv. Intent." and "Relevance" columns to 10% each.
    - Added `whitespace-nowrap` to headers and badges to ensure "VERY HIGH" pills never wrap onto two lines.
- **Routing Integration**: Configured the React Router in `App.jsx` to natively display the Landing Page at the absolute root URL (`/`), migrating the protected application gateway functionally down to `/dashboard`.

- **Analysis Constraints in Webhook Payloads** (2026-03-12):
    - Added `ai_selection_count`, `working_pool_count`, and `concept_diversity_limit` to all 5 webhook `parameters` blocks in `ProductStudio.jsx`: `generate_seo`, `userKeyword`, `addFromFavorites`, and both `resetPool` calls (handleResetPool + handleApplyStrategy).
    - Values sourced from `userDefaults` (fetched from `v_user_seo_active_settings` view at mount). Defaults: 13, 40, 3 respectively.
    - These fields allow the n8n backend to respect per-user analysis constraints for AI keyword selection count, working pool size, and concept diversity limits.

- **Competition Badge Threshold Update** (2026-03-12):
    - Updated the color thresholds for the Competition column badge in the Keyword Performance table (`ResultsDisplay.jsx`).
    - **Old values**: Green `< 0.3`, Amber `0.3–0.7`, Rose `≥ 0.7`.
    - **New values**: Green `< 0.5` (Real opportunity), Amber `0.5–0.9` (Standard/active niche), Rose `≥ 0.9` (Saturated market).

- **Trending Growth Factor Parameter** (2026-03-13):
    - **Problem**: The new `trending_growth_factor_id` column in `user_settings` was not being saved when modifying the Trending Growth threshold in the Settings page, and was not being sent to n8n webhooks.
    - **Fix (UserSettings.jsx)**: Added `trending_growth_factor_id: null` to the initial settings state. Added `'trending_growth_factor'` to the `subKeyMap.trending` array in `handleMultiSettingChange`, so selecting a Trending Growth level now auto-resolves and saves the matching `trending_growth_factor` constant ID alongside the existing `trending_dropping_id` and `trending_current_month_min_id`.
    - **Fix (ProductStudio.jsx)**: Added `trending_growth_factor: userDefaults.trending_growth_factor` to the `getSmartBadgePayload()` helper function, which feeds all 5 n8n webhook payloads (`generate_seo`, `userKeyword`, `addFromFavorites`, and both `resetPool` calls).

### March 14th, 2026 - Add Custom Keyword Stale State Fix

- **Critical Bug Fix: "Add Custom Keyword" / "Add from Favorites" Not Working After Fresh Analysis**
    - **Symptom**: After running a fresh SEO analysis (without page refresh), clicking "Add Custom Keyword" or "Add from Favorites" would silently fail — no webhook fired, no toast, no error. After a manual page refresh, the same buttons worked perfectly.
    - **Root Cause (Diagnosed via Toast Diagnostics)**: 
        - `handleAnalyzeDesign` sets `results = { imageUrl: "..." }` (partial object, **no `analytics` property**) before SEO analysis begins.
        - After SEO completes, `handleLoadListing` sets proper `results` with `analytics`. However, the `handleAddCustomKeyword` closure still held the partial `results` from the earlier render.
        - Guard check `if (!freshResults.analytics)` silently returned because `analytics` was `undefined` on the partial object.
        - Both closure variables AND `latestRef.current` captured the same stale value — the ref pattern didn't help because both were updated from the same React render cycle.
    - **Fix (ProductStudio.jsx)**:
        - **Removed `useMemo` wrapper** from `MemoizedResultsDisplay` — now renders `<ResultsDisplay>` directly, ensuring all callback props are always fresh on every render.
        - **Eliminated `results.analytics` dependency** in `handleAddCustomKeyword` — duplicate check now **queries Supabase directly** (`listing_seo_stats` table) instead of reading from potentially stale `results.analytics`.
        - **Direct closure variables** used for webhook payload (`userDefaults`, `strategySelections`, `visualAnalysis`) with `latestRef` as fallback for `imageUrl`.
        - Added `latestRef` pattern (always-fresh ref updated every render) as safety net for async handlers.
    - **Fix (Accordion.jsx)**: Added `useEffect` to auto-open accordion when `defaultOpen` transitions from `false` to `true` (previously only checked on mount).
    - **Fix (handleAddBatchKeywords)**: Updated payload to use `freshResults` and `freshVisualAnalysis` from `latestRef` instead of stale closure variables.
    - **Database Migration**: Added unique constraint on `listing_seo_stats(listing_id, tag)` to support upsert operations (`20260314_unique_listing_tag_constraint.sql`).

- **SEO Analysis Parent Accordion** (2026-03-14):
    - **Goal**: Reduce visual clutter in the main content area by wrapping the entire SEO results section (AuditHeader + StrategyTuner + Keyword Performance table) inside a single collapsible parent `<Accordion>` in `ResultsDisplay.jsx`.
    - **Header**: Displays "SEO Analysis" label with `BarChart3` icon, a color-coded score badge (emerald ≥80, amber 50-79, rose <50), and a loading spinner when insight generation is in progress.
    - **Controlled State**: `isSeoAnalysisOpen` state lifted to `ProductStudio.jsx` and passed down as `seoAnalysisOpen` / `onSeoAnalysisOpenChange` props. Auto-opens on analysis completion (`handleAnalyze`) and listing load (`handleLoadListing`). Auto-closes on "New Listing" click for a clean slate.

- **Post-SEO Flow Optimization** (2026-03-14):
    - **Problem**: After `save-seo` edge function completed, the `postSeoTrigger` effect would first call `handleLoadListing` (fetching full data), then immediately call `handleApplyStrategy` (which also calls `handleLoadListing` internally), resulting in a redundant double-load.
    - **Fix**: When `shouldAutoResetPoolRef.current` is true, the post-SEO flow now skips the intermediate `handleLoadListing` and goes directly to `handleApplyStrategy`, which performs its own single final load. Toast message updated to "Optimizing keyword pool..." for the auto-reset path.

- **Backend resetPool Orchestration** (2026-03-15):
    - **Problem**: If the user navigated away before `generateSEO` completed, the client-side `resetPool` call would never fire.
    - **Fix**: Moved `resetPool` trigger logic entirely to the `save-seo` Supabase Edge Function. The `save-seo` function now reads a `trigger_reset_pool` flag from the n8n payload. If `true`, it fetches user settings from `v_user_seo_active_settings`, constructs the `resetPool` payload, and fires the n8n webhook server-side as a fire-and-forget.
    - **Loop Prevention**: When `trigger_reset_pool` is true, the listing is NOT set to `SEO_DONE` by that call. The subsequent `resetPool` action calls `save-seo` again WITHOUT this flag, which then sets `SEO_DONE` and `is_generating_seo = false`.
    - **Payload Parsing Fix**: Corrected array-unwrapping for n8n bodies (both top-level and `results` are unwrapped with `Array.isArray` checks).
    - **Webhook URL Fix**: Changed from hardcoded test URL to `N8N_WEBHOOK_URL_RESET_POOL` env var — test webhook only works when n8n is in test mode; production requires the activation URL.
    - **Frontend Cleanup**: Removed `shouldAutoResetPoolRef` and its `useEffect` from `ProductStudio.jsx`.

- **Keyword Table: Data Normalization for Low-Volume Keywords** (2026-03-15):
    - **Goal**: Avoid displaying misleading "0", aggressive red trend lines, or meaningless competition scores for keywords below the API's measurement threshold.
    - **Implementation**: Added an `isLowVolume` flag (`volume < 10`) computed per row in `ResultsDisplay.jsx`.
    - **Volume column**: Shows `"< 10"` (slate-400) instead of "0".
    - **Trend column**: Hides the `Sparkline` and shows a neutral `—` dash (slate-300) for low-volume rows.
    - **Competition column**: Shows `"N/A"` (slate-300) for low-volume rows, overriding the colored badge.
    - **CPC column**: Changed the empty state from "N/A" text to a `—` dash (slate-300) for all rows.
    - **Row opacity**: Low-volume rows that are selected get `opacity-60`; unselected low-volume rows get `opacity-40` (stacked on existing `opacity-60`).

### Immediate Next Steps
1.  Add `N8N_WEBHOOK_URL_RESET_POOL` to Supabase Edge Function secrets (production webhook URL for the resetPool n8n workflow).
2.  Redeploy the `save-seo` edge function with the latest changes.
3.  Test the end-to-end `generateSEO → save-seo → resetPool` flow by closing the browser mid-generation and verifying `resetPool` is triggered from the backend.
4.  Update n8n `generate_seo` workflow to include `"trigger_reset_pool": true` in the payload sent to `save-seo`.

---

### March 17th, 2026 — Local API Server: Analyse Design Migrated Off n8n

- **Architecture Change: `analyseImage` no longer uses n8n webhook.**
  - The "Analyse Design" button in `ProductStudio.jsx` (`handleAnalyzeDesign`) previously fired a fire-and-forget POST to the n8n webhook with `action: "analyseImage"`.
  - It now calls a **local Express API server** at `/api/seo/analyze-image` instead.

- **New file: `server.mjs`** — Standalone Express server on port `3001`.
  - Full pipeline inline: Gemini Vision → Supabase taxonomy fetch → Gemini taxonomy mapping → `save-image-analysis` Edge Function.
  - Visual analysis context is **injected into the taxonomy prompt** (prepended as `# Visual Analysis Input`) to fix `theme: undefined` / `niche: undefined` mapping failures.
  - Uses `gemini-2.0-flash` for both vision and text models.
  - All secrets (`GOOGLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_SECRET`) are loaded server-side only via `--env-file=.env` — **never exposed to the frontend**.

- **`vite.config.js` updated** — Added `server.proxy` block: `/api` → `http://localhost:3001`. Frontend calls `/api/seo/analyze-image` and Vite transparently forwards it to Express, eliminating CORS issues.

- **`package.json` scripts updated**:
  - `npm run dev` → runs **both** Express API + Vite concurrently (via `concurrently`).
  - `npm run dev:api` → Express API only.
  - `npm run dev:vite` → Vite frontend only.

- **New dependencies**: `express` (runtime), `concurrently` (runtime, used in dev script).

- **Tech Stack update**: AI vision route is now served locally (Node.js/Express), removing dependency on n8n for the `analyseImage` action. n8n is still used for `generate_seo`, `drafting_seo`, `userKeyword`, `addFromFavorites`, `generateInsight`, `competitionAnalysis`, `resetPool`.

- **Keyword Table: High-Volume Outlier Cap** (2026-03-15):
    - **Goal**: Prevent display of statistically implausible volumes (e.g. "17,342,342") that erode tool credibility.
    - **Implementation**: Added `isHighVolume` flag (`volume >= 1,000,000`) per row in `ResultsDisplay.jsx`.
    - **Volume column**: Shows `"> 1M"` in bold indigo text for keywords at peak saturation — sorting remains accurate since `row.volume` is unchanged.
    - **Reasoning**: For Etsy sellers, 1M and 17M are strategically identical (unrankable main terms); capping avoids implying false precision.

- **SEO Lab Preset Pill Removal** (2026-03-15):
    - Removed the redundant `Preset` pill badge from each row in the My Presets tab in `SEOLab.jsx`. It was uninformative since every row in that tab is already a preset by definition.

---

### March 17th, 2026 — SEO Generation Migrated to Local API Server

- **Architecture Change: `generate_seo` no longer uses n8n webhook.**
    - The "Analyse" button in `ProductStudio.jsx` (`handleAnalyze`) previously fired a fire-and-forget POST to the n8n webhook with `action: "generate_seo"`, then relied on a Supabase Realtime listener + 5s polling fallback to detect `SEO_DONE`.
    - It now calls a **local Express API server** at `/api/seo/generate-keywords` (synchronous, ~30s) and `await`s the response directly.
    - After the call returns, a **1.5s delay** is inserted (`await new Promise(r => setTimeout(r, 1500))`) to allow the `save-seo` edge function's pool reset (`is_current_pool` DB writes) to fully commit before `handleLoadListing` reads the results — eliminating a race condition where all keywords (not just `is_current_pool = true`) were displayed immediately after generation.

- **New file: `app/api/seo/generate-keywords/route.ts`** — Full SEO keyword pipeline:
    1. Gemini generates keyword ideas from product context + visual analysis.
    2. DataForSEO enriches with real search volume, competition, CPC, and 12-month history.
    3. Niche scoring (`lib/seo/niche-scoring.ts`) and transactional scoring (`lib/seo/transactional-scoring.ts`) applied per keyword.
    4. LSI (Latent Semantic Indexing) relevance score calculated.
    5. Results persisted via the `save-seo` Supabase Edge Function (which handles pool reset, multi-mode upserts, and sets `is_generating_seo = false` + `status_id = SEO_DONE`).

- **`server.mjs` updated** — Added `POST /api/seo/generate-keywords` Express route, loading and executing `app/api/seo/generate-keywords/route.ts` via `tsx`.

- **`ProductStudio.jsx` — `handleAnalyze` updated**:
    - Replaced the N8N fire-and-forget + Realtime listener pattern with a single `await axios.post('/api/seo/generate-keywords', payload)`.
    - After response, waits 1.5s then calls `handleLoadListing` directly to render final results.
    - The Realtime subscription and polling fallback remain in the codebase for `is_image_analysed` image analysis events — they are no longer used for the SEO generation flow.

- **n8n still used for**: `drafting_seo`, `userKeyword`, `addFromFavorites`, `generateInsight`, `competitionAnalysis`, `resetPool`.

- **New support files**:
    - `lib/seo/niche-scoring.ts` — Niche relevance scoring logic.
    - `lib/seo/transactional-scoring.ts` — Buyer intent / transactional scoring logic.
    - `test-generate-keywords.mjs` — End-to-end test script for the new route.
    - `docs/generate-seo-logic.ts` — Reference doc for the full pipeline logic.

- **Operational note**: Both Express routes (`analyze-image` and `generate-keywords`) now run on `http://localhost:3001`. The server must be restarted (`node --env-file=.env server.mjs`) whenever `server.mjs` changes. Use `npx nodemon --env-file=.env server.mjs` for auto-reload during development.

### March 18th, 2026 — Image Analysis Fixes
- **Fix**: The `analyseImage` local API was failing to return a `theme` and `niche` consistently.
    - **Root Cause**: The second AI call (`PROMPT_TAXONOMY_MAPPING`) was not receiving the visual analysis context from the first AI call.
    - **Fix**: Injected the visual analysis results and product details into the taxonomy prompt.
    - **Hardening**: Made the prompt more explicit to ensure the AI *always* returns a `theme` and `niche`, even if it has to select "Others".
    - **Data Structure**: Corrected the `mergeAnalysisResults` function to handle cases where the AI returns a single-element array instead of a plain object.
- **Dev Experience**:
    - **`nodemon`**: Installed `nodemon` and updated the `dev` script. The local Express server now auto-restarts on file changes, eliminating the need for manual server restarts.

- [Sync] Committed and pushed latest architectural changes (local API migration for analyze-image, generate-keywords, and reset-pool).
- [Architecture] Unified the keyword filtering and analysis logic into the local server (`server.mjs`), reducing dependency on untracked cloud workflows.
- [QA] Added test scripts (`test-filter-logic.ts`, `test-reset-pool.ts`) and database documentation for the new local SEO pipeline.
- [Sync] Staged and committed core untracked logic in `lib/seo/filter-logic.ts` to ensure repository integrity.

## 6. Session Handover (2026-03-19)
### Summary of Achievements
- **Local API Transition**: Successfully transitioned `analyseImage`, `generate-keywords`, and `reset-pool` actions to a local Express server.
- **Data Integrity**: Capped keyword volumes (`> 1M`, `< 10`) to maintain tool credibility and normalized trend displays.
- **Repository Health**: Staged and tracked critical SEO logic previously missing from version control and synced with the `imageAnalysis` branch.
- **State Preservation**: Fixed form hydration bugs where user-typed instructions were cleared during AI analysis.

### Latest Developments
- **2026-03-19: User-Keyword API Integration & Testing**
  - **New Feature**: Implemented `POST /api/seo/user-keyword` in `server.mjs`.
  - **Functionality**: Manual keyword addition with live DataForSEO enrichment, AI scoring, and pool re-ranking.
  - **Frontend**: Integrated `handleAddCustomKeyword` to call the local API instead of n8n.
  - **Visibility Fix**: Relaxed `evaluation_id` filter in `ProductStudio.jsx` to ensure user-added keywords are always visible.
  - **Default Pinning Fix**: Set `is_pinned: false` as the default for user-added keywords.
  - **Selection Flag Fix**: Explicitly set `is_selection_ia: false` and `is_current_eval: null` for user-added keywords in both the `applySEOFilter` logic and the `/api/seo/user-keyword` route response. This ensures they are not misidentified as AI recommendations.
  - **Verification**: Confirmed with `test-user-keyword.ts` that user keywords return `is_selection_ia: false`.
  - **Verification**: Confirmed with `test-user-keyword.ts` that user-added keywords return `is_selection_ia: false`.
  - **Opportunity Score Fix**: Modified local `applySEOFilter` in `server.mjs` to bypass hard filters and diversity limits for user-added keywords, ensuring they always get a score and stay in the pool.
  - **Verification**: Confirmed with `test-user-keyword.ts` that user keywords return non-null `opportunity_score`.
  - **AI Selection Count Fix**: Modified `applySEOFilter` (in `server.mjs` and `filter-logic.ts`) so both user-added custom keywords and pinned keywords explicitly consume the `ai_selection_count` quota alongside AI-sele  - **Concept Diversity Processing Fix**: `concept_diversity_limit` now correctly strips punctuation and splits by any whitespace when tallying phrase frequencies (e.g., standardizing "tea set," and "tea  set" to "tea set"). This reliably enforces the limit bounds on the generated backend keyword pool even if generated text holds formatting inconsistencies.
  - **Preserving AI Selections on User Keyword Add**: Intentionally excluded `is_selection_ia` overwrites in `/api/seo/user-keyword`. This retains the exact 13 AI selections when adding user keywords (making the total visual selection temporarily 14), rather than strictly un-selecting 1 AI keyword prematurely before the next "Apply Strategy" phase.
  - **Correcting Unpinned User Keyword Selection Flow**: Migrated the "auto-select custom keyword" behavior entirely to the backend (`/api/seo/user-keyword` now natively sets `is_current_eval: true` for the single new insertion). I explicitly removed the permanent frontend `is_user_added` forced-selection hack from `ResultsDisplay.jsx`. Now, newly added manual keywords appear selected initially, but if the user generates a new strategy and the keyword scores poorly and isn't pinned, it is successfully unselected.
  - **Fixing AI Quota Stealing**: Revised sorting logic securely decouples unpinned custom keywords from hijacking the 13 `ai_selection_count` quota slots. They now compete naturally via opportunity score but actively bypass the `working_pool` length limit (40) ensuring they maintain permanent table visibility.
  - **Zero Volume Investigation**: Verified that keywords showing 0 volume were simply not present in the DataForSEO index (long-tail/niche phrases). Confirmed logic correctly handles zero-fill and ranking for these keywords without data loss.

### Session Handover
- **Summary**: This session focused on enterprise-grade stability for the keyword selection engine. We resolved several sophisticated edge cases regarding the 13-keyword AI selection quota, ensuring pinned and user-added keywords consume the quota correctly without "stealing" slots from high-performers. We also implemented a robust concept diversity filter and fixed the selection persistence bug for manual keywords.
- **Achievements**:
  - Implemented the `/api/seo/user-keyword` route with full scoring and enrichment.
  - Fixed strict 13-keyword Selection Limit (Pinned/User-Added/AI).
  - Implemented robust Concept Diversity Normalization.
  - Fixed selection hijacking where unpinned user keywords consumed AI quota.
  - Investigated and dismissed the "Zero Volume" bug (verified as data unavailability).

### Next Immediate Steps
1. **ESLint Configuration**: Initialize a standard ESLint configuration to resolve the `npm run lint` failure.
2. **Environment Sync**: Update Supabase Edge Function secrets with the production `N8N_WEBHOOK_URL_RESET_POOL` if not already done.
3. **Deployment**: Redeploy the `save-seo` Edge Function to ensure the backend-triggered pool reset flow is active.
4. **Listing Generation Migration**: Finalize the migration of listing generation logic (title/description) from n8n to `server.mjs`.

---

### March 20th, 2026 — Add-From-Favorite API Route

- **New Route: `POST /api/seo/add-from-favorite`** in `server.mjs`.
  - **Purpose**: Batch-add keywords from a user's Favorites bank or a Preset into a specific listing's SEO pool.
  - **Key Design**: Keywords from Favorites already carry search stats (`last_volume`, `last_competition`, `last_cpc`, `volume_history`) from the DB, so this route **skips DataForSEO enrichment** — going straight to AI scoring and pool re-ranking.
  - **Execution Flow**:
    1. Validation & input normalization (accepts `string[]` or `object[]`).
    2. Fetch listing context (`theme`, `niche`, `visual_*`) + resolve `product_type` name from `v_combined_product_types`.
    3. Fetch user SEO settings from `v_user_seo_active_settings`.
    4. AI Scoring: `scoreKeywords()` runs niche + transactional scoring in parallel via Gemini.
    5. Bulk upsert into `listing_seo_stats` with `is_pinned: false`, `is_user_added: true`.
    6. Pool re-ranking via `applySEOFilter()` — updates `opportunity_score` and statuses for the entire pool.
    7. Listing strength recalculation via `selectAndScore()`.
  - **Final Keyword Flags** (after all iterations within the session):
    - `is_pinned: false` — keywords from Favorites are selected but not pinned
    - `is_selection_ia: false` — does NOT consume an AI quota slot (13 slots belong to Apply Strategy only)
    - `is_current_eval: true` — appears **checked/selected** in the Keyword Performance table
    - `is_current_pool: true` — visible in the pool
    - `is_user_added: true` — marked as user-added in the UI
  - **Response**: Returns `success`, `added_count`, `listing_strength`, and the processed keyword array.
- **Frontend Wiring**: Replaced `handleAddBatchKeywords` in `ProductStudio.jsx` — removed ~200 lines of n8n webhook payload assembly + manual DB upserts. Now a clean ~20-line call to `POST /api/seo/add-from-favorite`, followed by `handleLoadListing()` for a full UI refresh.
- **Niche Scoring Bug Fixed** (applies to both `user-keyword` and `add-from-favorite`):
  - **Root cause**: `listing.product_type` was `undefined` — the actual column is `product_type_id` (a UUID). Gemini received no product type context and rated all keywords as generic (niche score = 1).
  - **Fix**: After fetching the listing, do a separate lookup: `supabaseAdmin.from('v_combined_product_types').select('name').eq('id', listing.product_type_id)`. Pass the resolved name (e.g. "iphone case") to `scoreKeywords()`.
  - **Result**: Keywords now score contextually — e.g. `iphone case` scores niche=4 against a phone case listing, while `mens leather belt` correctly scores 1.
- **Test Script**: `test-add-from-favorite.mjs` — pre-filled with real listing/keyword data; updated to use the "Phone case" listing for meaningful niche score validation.
- **Startup Log**: Updated `server.mjs` startup to list all 5 routes including `user-keyword` and `add-from-favorite`.

### Next Immediate Steps
1. Wire the "Add from Preset" flow to the same `POST /api/seo/add-from-favorite` route (if it uses a different handler than Favorites).
2. Consider whether `is_current_eval: true` on user-added keywords should be capped when total selected count exceeds the `ai_selection_count` limit — currently they can push past 13.
3. **ESLint Configuration**: Initialize a standard ESLint configuration to resolve the `npm run lint` failure.
4. **Listing Generation Migration**: Finalize migration of title/description generation from n8n to `server.mjs`.

---

### March 20th, 2026 — Keyword Selection Flag Fixes & Niche Scoring Quality

#### `add-from-favorite` Selection Flag Regression Fix

- **Bug**: The `POST /api/seo/add-from-favorite` upsert used `onConflict: 'listing_id,tag'` without `ignoreDuplicates`, so if a keyword already existed in the pool (e.g. with `is_selection_ia: true` set by AI), the upsert silently overwrote those flags.
- **Fix**: Changed to `ignoreDuplicates: true` on the initial upsert (preserving existing AI selection flags), followed by a targeted `update({ is_current_eval: true, is_current_pool: true })` scoped to only the incoming tag list. This gives newly-added favorites the "selected" appearance without touching the AI quota slots of existing keywords.
- **Response Fix**: Changed the response fallback `is_selection_ia ?? true` to `?? false` so keywords are never misrepresented as AI-selected in the frontend.

#### Niche Scoring Quality Fix (Low Relevance for User-Added Keywords)

- **Root Cause**: `scoreKeywords()` in `server.mjs` (used by both `/api/seo/user-keyword` and `/api/seo/add-from-favorite`) used a minimal 4-line prompt with no calibration examples. The AI scored almost all keywords as `1` (Broad/Low) due to lack of context.
- **Fix**: Upgraded the niche scoring system prompt in `server.mjs` to match the production-quality prompt in `lib/seo/niche-scoring.ts`, including:
  - Full objective description with scoring tier definitions
  - **100 calibration reference examples** across all 4 tiers (Very High/High/Moderate/Low)
  - Fluff ceiling rules and context-match instructions
- **Result**: User-added keywords now score with the same quality as keywords from the main `generate-keywords` flow.

#### Favorites Star (⭐) Display Fix — Favorites and Presets

- **Bug**: Keywords added from the Favorites Picker or a Preset did not show the filled golden star in the Keyword Performance table, even though they originated from `user_keyword_bank`.
- **Root Cause**: `favoriteTags` (a `Set` in `ResultsDisplay`) was fetched once on mount (`[user?.id]`). After `handleAddBatchKeywords` triggered a full `handleLoadListing` reload, the `favoriteTags` Set was stale.
- **Fix Part 1 — Optimistic update** (`ResultsDisplay.jsx`): When the `FavoritesPickerModal` confirms an add, the incoming keyword tags are immediately added to `favoriteTags` state before awaiting the server response. Works for individual favorites.
- **Fix Part 2 — Reliable re-fetch** (for presets): Introduced a `refreshFavoritesKey` counter in `ProductStudio.jsx`. It increments after every successful `handleAddBatchKeywords` call (both favorites and presets). `ResultsDisplay` now depends on `[user?.id, refreshFavoritesKey]` for the `favoriteTags` fetch useEffect — guaranteeing a re-sync after any batch add, regardless of keyword count changes.

### Session Handover
- **Summary**: This session focused on stabilising the `add-from-favorite` server route and fixing the full keyword flow for user-added keywords (from favorites or presets). All three root causes were traced and fixed: (1) selection flag overwrite on upsert, (2) low-quality AI scoring prompt, (3) stale `favoriteTags` state after reload.
- **Achievements**:
  - Fixed `add-from-favorite` upsert to use `ignoreDuplicates: true` + scoped update.
  - Upgraded `scoreKeywords` prompt to use 100 calibration examples.
  - Fixed favorites star display for both "Add from Favorites" and "Add from Preset" flows.
  - Introduced `refreshFavoritesKey` counter pattern for reliable post-add state sync.

---

## Session: 2026-03-20 — Complete n8n Migration + Cleanup

### n8n → Local Express API Migration

All remaining n8n webhook actions (except `analyseShop`) have been migrated to local Express API routes in `server.mjs`:

- **`recalculateScore` → `POST /api/seo/recalculate-scores`**: Takes user-selected keywords (1-13) from the frontend, calls existing `selectAndScore()` to compute listing strength, and persists via shared `persistStrength()` helper. Frontend simplified from ~175 lines (n8n parsing + DB writes) to ~50 lines (clean API call + state update).

- **`drafting_seo` → `POST /api/seo/generate-draft`**: Builds SEO brief from keywords with status badges, sends the full Etsy copywriter prompt (ported verbatim from n8n) to Gemini via `runTextModel()`, parses `{ title, description }` response, persists to `listings` table with `status_id = COMPLETE`. Frontend simplified similarly.

- **Shared `persistStrength()` helper**: Extracted DB persistence logic (update `listing_seo_stats` `is_current_eval` flags, update `listings` table, upsert `listings_global_eval`) into a shared function used by both `reset-pool` and `recalculate-scores` routes. Single source of truth for strength persistence.

### Abandoned Features Removed

- **`generateInsight`**: Entire handler (~300 lines) removed from `ProductStudio.jsx`. Was an n8n webhook that analyzed keywords for trends/insights — no longer needed.
- **`competitionAnalysis`**: Entire handler (~200 lines) removed. Same n8n-based pattern.
- **`isInsightLoading` state**: Replaced with simpler `isSeoLoading` (boolean). Was a tri-state (`false | 'seo' | 'insight'`), now only tracks SEO generation loading. Updated in both `ProductStudio.jsx` and `ResultsDisplay.jsx`.
- **`isCompetitionLoading` state**: Removed entirely.

### Architecture State

- **Local Express API** (`server.mjs`): Now handles 7 routes — analyze-image, generate-keywords, reset-pool, recalculate-scores, generate-draft, user-keyword, add-from-favorite.
- **n8n**: Only `analyseShop` remains (blocked by Etsy scraping issues).
- **CLAUDE.md**: Updated to reflect current route table, helper functions, and n8n status.

---

## Session: Vercel Serverless Migration (2026-03-21)

### What Was Done

Migrated all 8 Express API routes from `server.mjs` to Vercel serverless functions in `api/`. Each route was extracted one at a time, tested on Vercel preview, then moved to the next. `server.mjs` remains for local development (unchanged).

### New Files Created

| File | Purpose |
|------|---------|
| `api/health.ts` | Health check endpoint |
| `api/seo/recalculate-scores.ts` | Recalculate listing strength from selected keywords |
| `api/seo/generate-draft.ts` | Generate Etsy title + description via Gemini |
| `api/seo/reset-pool.ts` | Re-rank keywords with strategy weights + badges |
| `api/seo/analyze-image.ts` | Gemini Vision analysis + taxonomy mapping |
| `api/seo/user-keyword.ts` | Add single keyword with DataForSEO + AI scoring |
| `api/seo/add-from-favorite.ts` | Batch-add favorites with AI scoring (no DataForSEO) |
| `api/seo/generate-keywords.ts` | Full pipeline: generate → enrich → score → persist |
| `lib/seo/select-and-score.ts` | Composite scoring + strength calculation |
| `lib/seo/persist-strength.ts` | DB persistence for strength scores |
| `lib/ai/extract-json.ts` | Strip markdown fences from Gemini JSON |
| `lib/seo/enrich-keywords.ts` | Cache check + DataForSEO enrichment |
| `lib/seo/score-keywords.ts` | Gemini niche + transactional scoring (replaces niche-scoring.ts + transactional-scoring.ts) |
| `lib/seo/generate-keyword-pool.ts` | 5 parallel Gemini calls for keyword generation |
| `lib/seo/persist-seo.ts` | Persist SEO results via save-seo edge function |
| `vercel.json` | Vite framework + SPA fallback rewrites |
| `tsconfig.server.json` | TypeScript config for api/ and lib/ |

### Infrastructure Changes

- `lib/supabase/server.ts`: Refactored to lazy-init (Proxy pattern) to avoid import-time crashes in serverless
- `lib/ai/gemini.ts`: Same lazy-init pattern for GoogleGenerativeAI client
- `lib/seo/filter-logic.ts`: Added `volume`/`tag` field fallbacks to match server.mjs
- `@vercel/node` and `typescript` added as devDependencies

### Architecture State

- **Local dev**: `npm run dev` → `server.mjs` on port 3001, Vite proxy forwards `/api/*`
- **Vercel production**: `api/*.ts` serverless functions, Vite SPA with fallback rewrites
- **Shared logic**: `lib/seo/` and `lib/ai/` used by both serverless functions and (eventually) server.mjs
- **n8n**: Only `analyseShop` remains

### Known Issues

- **Keyword selection logic**: Pinned and user-added keywords interact incorrectly with concept diversity filtering during pool reset. Reverted to original behavior — needs separate focused session to fix properly.

### Vercel Environment Variables Required

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`, `N8N_WEBHOOK_SECRET`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`

### Next Immediate Steps
1. **Keyword selection fix**: Resolve pinned/user-added priority in `applySEOFilter` with proper test coverage.
2. **Refactor server.mjs**: Import from shared `lib/` helpers to eliminate code duplication.
3. **Edge function cleanup**: Remove `x-api-key` check from Supabase edge functions (n8n auth no longer needed).
4. **ESLint Configuration**: Initialize a standard ESLint config to resolve `npm run lint` failures.
5. **analyseShop**: Consider alternative approach (Etsy API or manual entry) since scraping is blocked.

---

## Session: 2026-03-21 — Codebase Cleanup (6-pass)

### Changes
- Removed all multi-mode (broad/balanced/sniper) residual code from frontend, api/, lib/, and server.mjs
- Deleted abandoned `app/api/seo/` legacy Next.js routes (replaced by `api/seo/`)
- Removed 4 orphaned components (StrategySwitcher, SEOStrategySelector, SemiCircleGauge, SearchableSelect)
- Cleaned 32 unused Lucide icon imports across 5 files
- Removed deprecated `product_type_text` fallbacks from 8 files
- Cleaned production console.log statements in api/ routes (converted to structured console.info)
- Organized 7 test files into `tests/` directory
- Cleaned obsolete n8n env vars from .env (VITE_N8N_WEBHOOK_URL_PROD removed)
- Updated CLAUDE.md to reflect post-cleanup state

### Phase 2 — server.mjs refactor & column cleanup
- Refactored server.mjs: replaced 11 duplicate inline functions with imports from lib/ (-501 lines)
- Added tsx to dev scripts for TypeScript import support in server.mjs
- Removed redundant score writes to `listings` table — scores now live exclusively in `listings_global_eval`
- Removed frontend fallbacks that read dropped columns from `listings` (ProductStudio)
- Migration file created: `20260321_drop_deprecated_listings_columns.sql` (pending view updates)
- Columns to drop from `listings`: product_type_text, theme_id, niche_id, sub_niche_id, strategic_verdict, improvement_priority, score_explanation, competitor_seed, listing_strength, listing_visibility, listing_conversion, listing_relevance, listing_raw_visibility_index, visibility_score, relevance_score, conversion_score, competition_score, profit_score, est_market_reach
- Updated save-seo edge function: removed strategic_verdict/status_label writes to listings, replaced n8n webhook with RESET_POOL_API_URL for reset-pool trigger

### Architecture State
- `seo_mode` column still exists in `listings_global_eval` — save-seo edge function still uses it
- Score data single source of truth: `listings_global_eval` (no longer duplicated to `listings`)
- server.mjs imports all shared logic from lib/ (no more inline duplicates)
- Dev script uses tsx for TypeScript support: `nodemon --env-file=.env --exec tsx server.mjs`
- Strategy Tuner still works — adjusts parameter weights without mode switching
- RESET_POOL_API_URL Supabase secret should point to Vercel production URL

### Next Steps
1. Update Supabase views that reference dropped columns, then run the migration
2. Drop `seo_mode` from `listings_global_eval` (requires updating save-seo edge function first)
3. Clean up save-seo edge function: remove multi-mode loop, simplify to single balanced mode

## Session: 2026-03-22 — Multi-Provider AI Configuration

### Changes
- Implemented multi-provider AI model configuration system (branch: `ai-provider-config`)
- Created `system_ai_models` table (catalog of 7 models: Gemini, Anthropic, OpenAI)
- Created `system_ai_config` table (6 task→model assignments with temperature, max_tokens, is_vision)
- Built provider abstraction layer:
  - `lib/ai/types.ts` — shared `AICallParams` + `AIResponse` interfaces
  - `lib/ai/adapters/gemini-adapter.ts` — preserves safety settings, JSON response mode, systemInstruction, URL-to-base64 vision
  - `lib/ai/adapters/anthropic-adapter.ts` — lazy-init, clear error on missing key
  - `lib/ai/adapters/openai-adapter.ts` — lazy-init, clear error on missing key
  - `lib/ai/provider-router.ts` — `runAI(taskKey, prompt, options)` with 60s in-memory config cache
- Migrated all production AI calls to `runAI()`:
  - `api/seo/analyze-image.ts` → `vision_analysis` + `taxonomy_mapping`
  - `api/seo/generate-draft.ts` → `draft_generation`
  - `lib/seo/generate-keyword-pool.ts` → `keyword_generation`
  - `lib/seo/score-keywords.ts` → `niche_scoring` + `transactional_scoring`
  - `server.mjs` → all three AI call sites
- Deleted dead code: `lib/seo/niche-scoring.ts`, `lib/seo/transactional-scoring.ts` (superseded by `score-keywords.ts`)
- Added Admin UI: `AIModelConfig.jsx` component as 5th accordion in AdminSystemPage
- Installed `@anthropic-ai/sdk` and `openai` SDKs
- All admin accordions now collapsed by default

### Architecture State
- All AI calls route through `runAI()` → reads `system_ai_config` → selects adapter → returns unified `AIResponse`
- Config cached 60s in-memory; `clearAIConfigCache()` available for admin saves
- Gemini works immediately (GOOGLE_API_KEY already configured)
- Anthropic/OpenAI adapters exist but throw helpful errors until API keys are added
- `lib/ai/gemini.ts` still exists for test files but is no longer imported by production code
- Default model for all tasks: `gemini-2.5-flash`

## Session: 2026-03-22 — Dashboard Rebuild (Status-Driven Pipeline)

### Changes
- Complete dashboard rebuild: replaced basic metrics dashboard with action-oriented, status-driven pipeline dashboard (branch: `feat/dashboard-rebuild`)
- Created 4 new Supabase views via migration:
  - `v_listing_status` — computes listing status (NEW/ANALYZED/SEO_READY/DRAFT_READY/OPTIMIZED) dynamically from actual data (not status_id column)
  - `v_dashboard_status_counts` — aggregated status counts + avg scores per user
  - `v_dashboard_listings` — listings with computed status + action priority ordering
  - `v_dashboard_trending` — trending/promising keywords across user's listings
- Created `src/lib/listingStatuses.js` — shared status config (colors, icons, labels, actions, barColors) + STATUS_PIPELINE array
- Created 7 new dashboard components:
  - `QuickStats.jsx` — 4 metric cards (total listings, avg SEO score, fully optimized, credits)
  - `PipelineBar.jsx` — horizontal stacked bar with proportional segments per status
  - `NextActions.jsx` — action queue showing what to do next, with "needs work" warning
  - `ShopHealth.jsx` — RadialGauge + 2x2 sub-metrics (reuses existing RadialGauge)
  - `KeywordBankStats.jsx` — keyword bank summary (saved, presets, gems) + link to SEO Lab
  - `ListingsTable.jsx` — priority-sorted table with thumbnails, score pills, status pills, action buttons
  - `TrendingKeywords.jsx` — trending keyword cards with volume/competition metrics
- Removed old components: `PerformanceCard.jsx`, `MarketInsights.jsx`
- Kept `RadialGauge.jsx` unchanged (reused by ShopHealth)
- Dashboard.jsx features: loading skeleton, empty state for new users, Etsy connection banner placeholder
- Visual polish pass: font-semibold for numbers, uppercase section labels, consistent card styling, score threshold corrections
- All action buttons navigate to Product Studio with listing ID
- Created test user (christian.couillard@gmail.com) with mock data: 30 listings across all 5 pipeline statuses + 48 keyword bank entries + 3 presets
- Created `scripts/seed-dashboard-mock.sql` and `scripts/cleanup-dashboard-mock.sql`

### Architecture State
- Dashboard queries 4 new views + keyword bank counts in parallel via Promise.all
- Computed status logic is view-based (no new columns needed) — derives from: has generated_title+description → OPTIMIZED, has 13+ is_current_eval → DRAFT_READY, has is_current_pool → SEO_READY, is_image_analysed → ANALYZED, else NEW
- Old views (`view_user_performance_stats`, `view_listing_scores`) kept for backward compatibility
- Navigation pattern: `navigate('/studio', { state: { listingId } })` matches existing ProductStudio location.state handling

---

### March 22nd, 2026 — SEO Lab Phases 1-3: Filter Pills, Bulk Actions, Grouped View, Refresh Stale

#### Phase 1: Smart Filter Pills & Data Enrichment
- Replaced 3 static stat cards (Total Keywords, High Potential, Old Data) with 7 interactive filter pills: All, Gems, Trending, High Volume, Low Competition, Unused, Stale
- Filter pills stack with AND logic — multiple pills can be active simultaneously
- Added `v_keyword_usage_count` Supabase view (migration applied) — counts how many active listings use each keyword tag per user, plus aggregated `is_trending`/`is_evergreen` flags from `listing_seo_stats`
- Added "Used In" column showing listing usage count per keyword (indigo pill for 1-2, emerald for 3+)
- Added Trending (Flame icon) and Evergreen (Leaf icon) indicators in the Tag cell
- Tailwind dynamic class purging handled via static `FILTER_COLORS` mapping object

#### Phase 2: Bulk Actions, Column Consolidation, Enriched Actions
- Merged Theme + Niche + Sub-niche → single "Niche" column with breadcrumb display (`Theme › Niche › Sub-niche`) and full path tooltip
- Merged Freshness + Last Updated → single "Freshness" column showing date with Stale pill on hover
- Added checkbox column with per-row and header select-all (operates on current page only, selection persists across pages)
- Sticky bulk action bar with: Add to Preset, Export CSV, Refresh Stale, Delete
- Added `preSelectedIds` prop to `CreatePresetModal` for pre-selecting keywords from bulk action
- Replaced Refresh/Delete action icons with MoreHorizontal dropdown menu: Copy keyword, Add to preset, Refresh data (stale only), Remove from bank
- Table layout: `table-fixed` with explicit column widths, `tabular-nums` for volume alignment

#### Phase 3: Grouped View & Refresh Stale Keywords
- **View Toggle**: List/Grouped segmented toggle next to search bar. Grouped view displays keywords in collapsible accordion sections organized by Theme › Niche
- **Grouped View**: Per-group aggregate stats (avg volume, avg competition, gem count, usage ratio). Groups sorted by keyword count DESC, keywords within by volume DESC. No pagination. Framer Motion collapse/expand animation
- **Refresh Stale Keywords**: New `POST /api/seo/refresh-keyword-bank` endpoint (Vercel serverless + server.mjs mirror). Calls `enrichKeywords()` from `lib/seo/enrich-keywords.ts` for fresh DataForSEO data, updates `user_keyword_bank` rows. Max 50 keywords per request
- **Refresh UI**: Single keyword refresh via action menu, bulk refresh button in bulk bar, "Refresh all N stale" button when Stale filter pill is active. Loading state: row opacity + spinner in volume cell

#### Key Constants & Patterns
- `STALE_DAYS = 21` — single source of truth for stale threshold, used by filter pill and date color
- `FILTER_PILL_CONFIG` + `FILTER_COLORS` — centralized filter pill definitions with static Tailwind classes
- `enrichedKeywords` useMemo — enriches keywords with `_used_in_count`, `_is_trending`, `_is_evergreen` from `v_keyword_usage_count` view
- Score column was added in Phase 1 then removed — opportunity score depends on listing context, not appropriate for context-free keyword bank

#### Files Modified
- `src/pages/SEOLab.jsx` — All 3 phases (filter pills, bulk actions, grouped view, refresh)
- `src/components/studio/CreatePresetModal.jsx` — Added `preSelectedIds` prop
- `api/seo/refresh-keyword-bank.ts` — New Vercel serverless function
- `server.mjs` — Added mirror route for local dev
- Supabase migration: `v_keyword_usage_count` view

### Taxonomy Mapping Prompt Overhaul (2026-03-23)

#### Problem
The taxonomy mapping prompt (used during image analysis to classify products into Theme/Niche/Sub-niche) produced suboptimal classifications:
- AI role was "Database Architect" — primed for categorization, not Etsy buyer behavior
- Classified by message/topic instead of visual aesthetic (theme) and buyer intent (niche)
- No calibration examples, no classification rules
- Wasted tokens on unused `final_positioning` field
- Referenced removed "Others" theme as fallback
- Prompt was duplicated across `server.mjs` and `api/seo/analyze-image.ts`

#### Changes
- **Extracted shared module**: `lib/logic/analyse-image-logic.ts` is now the single source of truth for prompts (`PROMPT_VISUAL_ANALYST`, `PROMPT_TAXONOMY_MAPPING`), formatting helpers (`formatTaxonomyLists`, `buildVisualAnalysisContext`, `buildTaxonomyPrompt`), and merge logic (`mergeAnalysisResults`). Both `server.mjs` and `api/seo/analyze-image.ts` import from it — no more duplication.
- **New taxonomy prompt**: Role = "Etsy search behavior specialist". Theme = visual aesthetic, Niche = target buyer, Sub-niche = real Etsy search phrase. 7 classification rules, 6 calibration examples. Separate sections for user custom vs PennySEO system themes/niches.
- **Removed `final_positioning`**: Ghost field that was parsed from AI but never persisted. Removed from prompt output, `TaxonomyMapping` interface, and docs.
- **`formatTaxonomyLists()` refactored**: Now returns 4 separate strings (`userThemes`, `systemThemes`, `userNiches`, `systemNiches`) with empty-list fallbacks like "(No custom themes defined)".
- **Added DataForSEO diagnostic logging** in `lib/seo/enrich-keywords.ts`: logs uncached count, API response status, and error details when enrichment fails silently.

#### Test Results
- Taxonomy mapping for "CUTERUS" enamel pin correctly returned: Theme = "Sarcastic & Funny", Niche = "Nursing & Healthcare", Sub-niche = "Funny Anatomy Pins" — matching calibration examples.

#### Files Modified
- `lib/logic/analyse-image-logic.ts` — Rewritten as shared module (single source of truth)
- `api/seo/analyze-image.ts` — Imports from shared module, removed inline prompts/helpers
- `server.mjs` — Imports from shared module, removed ~100 lines of duplicated code
- `types/definitions.ts` — Removed `final_positioning` from `TaxonomyMapping`
- `docs/analyse-image-logic.ts` — Removed `final_positioning` from docs copy
- `lib/seo/enrich-keywords.ts` — Added diagnostic logging for DataForSEO enrichment

### SEO Lab Presets Improvements (2026-03-23)

#### Changes
- **Column sorting on presets table**: Sortable headers (Preset Name, Composition, Total Volume, Avg. Competition, Avg. CPC) with ChevronUp/ChevronDown indicators. Pre-computes aggregates in a `sortedPresets` useMemo to avoid recalculation in the sort comparator.
- **Apply to Listing modal**: New `ApplyPresetModal.jsx` — listing picker that fetches from `v_dashboard_listings`, shows thumbnail/title/score/status/breadcrumb, single-select, calls existing `/api/seo/add-from-favorite` endpoint. Activated the previously disabled "Apply to Listing →" button in expanded preset rows.
- **CreatePresetModal enrichment**:
  - Theme/Niche fields converted from free-text inputs to `<select>` dropdowns with `<optgroup>` separation (My Themes / PennySEO Themes). Fetches from `system_themes`, `system_niches`, `user_custom_themes`, `user_custom_niches` on modal open. Backward-compatible: legacy values not in dropdown render as custom `<option>`.
  - Filter pills (All, Gems, High Volume, Low Competition) above keyword grid in bank mode. Reuses same thresholds as Favorite Tags tab. `gemThresholds` passed as prop from SEOLab.
  - "Used in" count (`N×` badge) on keyword chips — enabled by passing `enrichedKeywords` (with `_used_in_count`) instead of raw `keywords` from SEOLab.
  - Live summary stats bar (avg volume, avg competition color-coded, avg CPC) below keyword grid when keywords are selected.
- **Duplicate name protection**: Client-side `isDuplicate` check with inline error + red border on title input, disabled Save button. Server-side `ilike` fallback check in handleSubmit.
- **10-keyword limit tooltip**: Info icon next to subtitle with hover tooltip explaining Etsy's 13-tag limit and why presets cap at 10 for keyword diversity.
- **Visual prompt console logging**: Added `console.log("Visual Prompt:", visualPrompt)` in `server.mjs` for debugging image analysis prompts.

#### Files Created
- `src/components/studio/ApplyPresetModal.jsx` — Listing picker modal for applying preset keywords

#### Files Modified
- `src/pages/SEOLab.jsx` — Preset sorting, apply-to-listing wiring, enrichedKeywords + gemThresholds + existingPresets props passed to CreatePresetModal
- `src/components/studio/CreatePresetModal.jsx` — Taxonomy dropdowns, filter pills, used-in count, summary stats, duplicate protection, tooltip
- `server.mjs` — Added visual prompt console.log

### Session Handover
- **Branch**: `main`
- **Status**: All SEO Lab preset improvements + taxonomy prompt overhaul implemented, build passes
- **Next Steps**:
  1. Test Apply to Listing flow end-to-end (verify keywords appear in listing's keyword pool)
  2. Test refresh stale flow end-to-end with real DataForSEO data
  3. Consider adding keyword bank refresh to a scheduled job
  4. SEO Lab Phase 4 (if planned): keyword suggestions, competitor analysis
  5. ESLint configuration still missing (pre-existing issue)

---

## SEO Pipeline Prompt Overhaul (2026-03-23)

### Summary
Complete overhaul of all AI prompts in the SEO keyword generation and scoring pipeline. Every prompt was rewritten for conciseness, SEO-orientation, and better score differentiation. Scoring batches were parallelized for performance.

### Changes

#### 1. Visual Analysis Prompt (`lib/logic/analyse-image-logic.ts`)
- Replaced verbose "Senior Visual Trend Analyst" prompt with concise "Etsy product listing specialist" prompt
- Added word count constraints per field (2-4 words for aesthetic_style, under 15 words for typography, etc.)
- Added good/bad examples for each field to guide output quality
- JSON output structure unchanged — no downstream parsing changes needed

#### 2. Keyword Generation Segments (`lib/seo/generate-keyword-pool.ts`)
- Replaced 5 near-identical segment prompts with strongly differentiated versions:
  - **Core Product** (40 kw): product type must appear in 100% of keywords
  - **Style & Aesthetic** (30 kw): exploits visual data, ~50% pure style terms
  - **Buyer & Occasion** (30 kw): gift scenarios, recipients, seasonal timing
  - **Niche & Adjacent** (30 kw): adjacent categories, room/location terms
  - **Long-Tail & Specific** (30 kw): micro-niche combinations, low-competition
- Each segment has explicit "What NOT to generate" boundaries to minimize overlap
- Total requested: 160 (down from 250) with similar unique count (~130-140) due to less duplication
- Added `buildSegmentContext()` and `SHARED_RULES` for DRY prompt assembly
- Threaded `visual_colors` and `visual_graphics` through the full pipeline (frontend → API → prompt)

#### 3. Niche Scoring Prompt (`lib/seo/score-keywords.ts`)
- Replaced 100 generic calibration examples (gothic skull planter, etc.) with dynamic product-specific examples via `generateScoringExamples()`
- Added `extractAestheticTerms()` to inject style/color/theme keywords into scoring rules
- New scoring philosophy: Score 10 requires "DOUBLE specificity" (product type + defining characteristic), Score 7 is the expected norm (~50-60%)
- Added explicit distribution guidance: 10-15% Score 10, 50-60% Score 7, 20-25% Score 4, 5-10% Score 1
- Now includes all visual data fields (color palette, graphic elements, description)

#### 4. Transactional Scoring Prompt (`lib/seo/score-keywords.ts`)
- Replaced 7-line mechanical prompt with behavior-based version using dynamic examples via `generateTransactionalExamples()`
- Score 10 requires occasion/recipient/urgency trigger (not just product + attribute)
- Score 7 = product + attribute (the expected norm for well-targeted keywords)
- Score 4 = bare product type or broad category terms
- Added same distribution guidance to prevent flat scoring

#### 5. Scoring Performance (`lib/seo/score-keywords.ts`)
- Parallelized scoring batches: changed sequential `for` loop to `Promise.all` over all 25-keyword batches
- Expected improvement: ~120s → ~20-30s for scoring phase
- Added timing log and missing keyword detection (fills dropped keywords with default score 4)

#### 6. Pipeline Data Flow
- `visual_colors` and `visual_graphics` now threaded from frontend (`ProductStudio.jsx`) through both API routes (`api/seo/generate-keywords.ts`, `server.mjs`) into `KeywordContext` and `ScoringContext`
- Added `nodemon.json` to watch `.ts` files in `lib/` and `api/` for auto-reload during dev

#### Files Modified
- `lib/logic/analyse-image-logic.ts` — Visual analysis prompt rewrite
- `lib/seo/generate-keyword-pool.ts` — 5 differentiated keyword segment prompts
- `lib/seo/score-keywords.ts` — Niche + transactional scoring prompts, parallel batching
- `api/seo/analyze-image.ts` — Temporary validation log
- `api/seo/generate-keywords.ts` — Thread visual_colors/visual_graphics
- `server.mjs` — Thread visual_colors/visual_graphics
- `src/pages/ProductStudio.jsx` — Add visual_colors/visual_graphics to keywordsPayload
- `tests/test-analyze-image.mjs` — Updated hardcoded prompt copy

#### Files Created
- `nodemon.json` — Watch `.ts` files in lib/ and api/ for dev auto-reload

### Product Studio 3-Block Reorganization (2026-03-24)
- **Goal**: Reorganize the Product Studio top section from a confusing 2-column layout into 3 clear blocks with proper information hierarchy: user inputs first, AI outputs second, action last.
- **Implementation**:
  - **Block 1 — Product Setup** (always visible): Image upload + Analyse Design button on left (1/3), Product Type combobox + Description textarea on right (2/3). User-provided data only.
  - **Block 2 — AI Classification** (collapsible Accordion): Theme/Niche/Sub-niche dropdowns + 6 visual analysis fields. Hidden until analysis is performed. Auto-expands on analysis complete or listing load from history. Auto-collapses on "New Listing". Uses controlled `<Accordion>` component with "AI-suggested" badge.
  - **Block 3 — Generate Action** (always visible): The ANALYZE button with same validation (image + product type required). Disabled states show contextual labels.
- **Architecture Change**: `OptimizationForm.jsx` was fully absorbed into `ProductStudio.jsx`. All state (themes, niches, product types, form fields), data-fetching useEffects, hydration logic, and handlers were migrated inline. The component was only used in one place, and the 3-block layout required rendering its fields across 3 separate DOM locations — impossible with a single React component instance.
- **New State**: `classificationOpen` boolean controls Block 2 accordion. Wired to `handleImageAnalysisDone`, `handleLoadListing`, and `handleNewAnalysis`.
- **Removed**: `optimizationFormRef`, `formKey` on OptimizationForm (kept for ImageUpload), `setFormState` setTimeout hack in `handleLoadListing`.

#### Files Modified
- `src/pages/ProductStudio.jsx` — Absorbed OptimizationForm logic, restructured JSX into 3 blocks, new state/handlers/useEffects
#### Files Deleted
- `src/components/studio/OptimizationForm.jsx` — Fully absorbed into ProductStudio

### Etsy API Compliance — Legal Pages & Landing Page (2026-03-24)
- **Goal**: Prepare pennyseo.ai for Etsy API application by adding required legal pages and landing page updates.
- **Implementation**:
  - Created `/privacy` (PrivacyPage.jsx) and `/terms` (TermsPage.jsx) as public routes (no auth required), using LandingPage's nav/footer wrapper.
  - Added "How It Works" 4-step section on LandingPage (Upload → Connect Shop → Get Tags → Publish).
  - Added Etsy trademark disclaimer in footer, links to Privacy/Terms pages.
  - Removed "Etsy" from all prominent headings (H1, badge) per Etsy API Terms of Use.

#### Files Created
- `src/pages/PrivacyPage.jsx`, `src/pages/TermsPage.jsx`
#### Files Modified
- `src/pages/LandingPage.jsx` — How It Works section, footer updates, heading text changes
- `src/App.jsx` — Added `/privacy` and `/terms` public routes

### ResultsDisplay UI Improvements (2026-03-24)
- **Goal**: Improve keyword table readability with contextual guidance, column consolidation, and informational tooltips.
- **Implementation**:
  - **Actionable Insight Banner**: Rule-based banner below Audit Header showing weakest metric (< 60) with specific advice. Amber for visibility/relevance/conversion, rose for competition.
  - **Status badges merged into Tag column**: Trending/Evergreen/Promising icons now render inline after keyword pill. Removed standalone Status column.
  - **Score tooltip**: Info icon on Score header explaining composite score formula.
  - **"13/25 selected" tooltip**: Info icon explaining Etsy's 13-tag limit.
  - **"Profit potential" rename**: EST. VALUE → Profit potential with tooltip explaining CPC-based value.
  - **Column headers renamed**: Conv. Intent → "Buy intent", Relevance → "Product fit" (display only, no code changes).
  - **Table spacing**: Consistent py-3 on all cells, min-width constraints, tabular-nums on volume, gap-1.5 in tag cell.
- **Final column layout (12 cols)**: Star | Pin | Checkbox | Tag (+status) | Score | Buy intent | Product fit | Avg. Vol | Trend | Competition | CPC | Delete

#### Files Modified
- `src/components/studio/ResultsDisplay.jsx` — All UI improvements
- `src/components/studio/SeoBadge.jsx` — Added `compact` prop (available but not currently used)

### SEO Formula Calibration (2026-03-24)
- **Goal**: Fix volume conversion formula and Opportunity Score calibration for Etsy-realistic values.
- **Volume formula** (`lib/seo/enrich-keywords.ts`): Changed `getEtsyVolume()` from `22 × vol^0.9` to `3 × vol^0.75`. Old formula amplified web volumes (100 web → 1,388 Etsy); new formula reduces them realistically (100 web → 95 Etsy). Applied to both current volume and volume_history array.
- **High volume threshold** (`ResultsDisplay.jsx`): Lowered from 1M to 50K, label changed to "> 50K".
- **Opportunity Score** (`lib/seo/filter-logic.ts`):
  - CPC cap: `maxRefCPC` 2.5 → 1.5 (Etsy CPC range is $0.30–$1.50, not Google Ads scale)
  - Removed +10% long-tail boost (redundant — good long-tails score high naturally)
  - Niche filter: `MIN_NICHE` 2 → 5 (now filters out niche scores 1 and 4, matching transactional filter symmetry)
  - `is_user_added` and `is_pinned` bypasses confirmed intact.

#### Files Modified
- `lib/seo/enrich-keywords.ts` — Volume formula
- `lib/seo/filter-logic.ts` — CPC cap, long-tail boost removal, niche filter
- `src/components/studio/ResultsDisplay.jsx` — High volume threshold
- `tests/test-generate-keywords.mjs` — Volume formula sync

### SEO Strength Formula Recalibration (2026-03-24)

Complete recalibration of all listing-level strength formulas in `select-and-score.ts` to match Etsy's data scale (post volume formula change). Also added scoring retry logic and fixed a HistoryPage color bug.

#### 1. Visibility Formula (`lib/seo/select-and-score.ts`)
- **DesirabilityWeight range widened**: `0.8 + nS/20 + tS/20` → `0.4 + nS/10 + tS/10` (range 0.9–1.8 → 0.6–2.6, 4.3× factor). AI quality scores now meaningfully compete with raw volume.
- **Log ceiling lowered**: 10M → 500K. With new volume formula, scores now spread across ~50–95 instead of clustering in 45–65.

#### 2. Conversion Formula
- **Rebalanced 50/50 → 60/40** (transactional/CPC). On Etsy, transactional intent is more predictive than CPC.
- **CPC ceiling**: $2.50 → $1.50 (Etsy range, not Google Ads).

#### 3. Profit Formula
- **Rebalanced 35/40/25 → 35/30/35** (visibility/CPC/transactional). CPC was over-weighted at 40%.
- **CPC ceiling**: $2.50 → $1.50 everywhere (composite scoring, conversion, profit).

#### 4. Competition Formula
- **Exponent**: 0.3 → 0.5. An 80% competition market now scores 45 (red) instead of 62 (amber). Honest feedback about saturated niches.

#### 5. HistoryPage Competition Color Bug Fix
- `MetricCell` for `listing_competition` had `inverted` prop — double-inverting colors (high score = red, wrong). Removed `inverted` so high=green (correct).

#### 6. Scoring Retry Logic (`lib/seo/score-keywords.ts`)
- Added retry (2 attempts) around `JSON.parse` of AI scoring responses. Intermittent malformed JSON from AI models no longer crashes the pipeline.

#### 7. Concept Diversity Overhaul
- **New module**: `lib/seo/concept-diversity.ts` — `getCanonicalConcept()` replaces the old "first two words" logic with synonym normalization (facial→face, personalized→custom, etc.), product-type word removal, and alphabetical sorting. Handles permutations ("dry face brush" = "face dry brush") and product flooding.
- **Upstream dedup** in `generate-keyword-pool.ts` — canonical dedup runs before DataForSEO enrichment, saving API calls on permutation duplicates.
- **Filter logic updated**: `applySEOFilter()` now accepts `productTypeWords` parameter, uses canonical concept keys.
- **All API routes updated**: `reset-pool`, `user-keyword`, `add-from-favorite` (and `server.mjs` mirrors) now resolve product type name and pass `productTypeWords` to filter logic.
- **Unified defaults**: `concept_diversity_limit` fallback standardized to 2 everywhere (was DB=2, Frontend=3, Backend=5).

#### Files Created
- `lib/seo/concept-diversity.ts` — Canonical concept key utility (synonym map, product type extraction, concept computation)

#### Files Modified
- `lib/seo/select-and-score.ts` — Visibility, conversion, profit, competition formulas + CPC ceiling
- `lib/seo/score-keywords.ts` — Retry logic for JSON parse failures
- `lib/seo/filter-logic.ts` — Canonical concept keys, `productTypeWords` param
- `lib/seo/generate-keyword-pool.ts` — Upstream canonical dedup before enrichment
- `api/seo/reset-pool.ts` — Product type resolution, concept diversity, default=2
- `api/seo/user-keyword.ts` — Product type passthrough, default=2
- `api/seo/add-from-favorite.ts` — Product type passthrough, default=2
- `server.mjs` — All 3 route mirrors updated
- `src/pages/HistoryPage.jsx` — Competition color bug fix
- `src/pages/ProductStudio.jsx` — Concept diversity default 3→2
- `src/pages/UserSettings.jsx` — Concept diversity default 3→2
- `tests/test-generate-keywords.mjs` — Formula sync
- `tests/test-reset-pool.ts` — Default sync

### Session Handover
- **Branch**: `main`
- **Status**: All SEO strength formulas recalibrated, concept diversity overhauled, scoring retry added.
- **Next Steps**:
  1. Test full SEO generation end-to-end — verify visibility/conversion/profit/competition scores in realistic ranges
  2. Test concept diversity with different product types — verify permutation dedup and pool quality
  3. Deploy to Vercel and verify all serverless functions
  4. Future: Adjust Smart Badge thresholds for new scoring distribution
  5. Future: Consider adding more synonyms to `ETSY_SYNONYM_MAP` based on real data

## Session: 2026-03-24 — ESM Import Fix + Login Page Redesign

### ESM Import Fix (Vercel Production)
All Vercel serverless API routes were failing with `ERR_MODULE_NOT_FOUND` because relative imports in `lib/ai/` lacked `.js` extensions required by Vercel's ESM runtime. Fixed in:
- `lib/ai/provider-router.ts` — 5 imports (`../supabase/server`, adapters, types)
- `lib/ai/adapters/gemini-adapter.ts`, `anthropic-adapter.ts`, `openai-adapter.ts` — types import

### Login Page Redesign
Replaced the old login page with a new 50/50 split editorial design:
- **Left panel**: Dark indigo gradient background with subtle grid overlay, PennySEO logo (white-inverted PNG), Instrument Serif italic headline with orange gradient text ("Your listings deserve to be found."), 3 animated stat cards (Vision AI, Keywords, Market Data)
- **Right panel**: Clean auth form on slate-50 background — Google OAuth, email/password with visibility toggle, forgot password link, sign-in/sign-up toggle
- **Fonts**: Added DM Sans + Instrument Serif (Google Fonts) to `index.html`
- **Centering fix**: Added `min-height: 100vh` to `html, body, #root` in `index.css` to ensure flex centering propagates correctly
- **No fake testimonials** — replaced with real product value props
- All existing auth logic preserved (Supabase OAuth, email sign-up/sign-in, email confirmation, redirect from `location.state`)

#### Files Modified
- `src/pages/LoginPage.jsx` — Complete redesign
- `src/index.css` — Root `min-height: 100vh` rule
- `index.html` — Google Fonts preload links
- `lib/ai/provider-router.ts` — ESM `.js` extensions
- `lib/ai/adapters/gemini-adapter.ts` — ESM `.js` extension
- `lib/ai/adapters/anthropic-adapter.ts` — ESM `.js` extension
- `lib/ai/adapters/openai-adapter.ts` — ESM `.js` extension

### Session Handover
- **Branch**: `main`
- **Status**: Login page redesigned, Vercel ESM imports fixed, all API routes operational.
- **Next Steps**:
  1. Verify login page centering on different viewport sizes
  2. Test forgot password flow (currently a placeholder `#` link — needs wiring to Supabase `resetPasswordForEmail`)
  3. Consider mobile-only branding (left panel hidden on mobile, only form shown)

## Session: 2026-03-25 — UI Compact Redesign + Draft Prompt Rewrite

### Strategy Tuner Compact Redesign
Compressed the Advanced SEO Strategy Tuner from ~350px to ~140px vertical space:
- **Grid**: 2-column → 3+2 grid (`grid-cols-2 md:grid-cols-3`) with Apply button inline in 6th cell
- **Labels simplified**: Removed parenthetical jargon (e.g. "Market Reach (Volume)" → "Market reach")
- **Level badges removed**: Redundant — the selected segment already shows the level
- **Descriptions → tooltips**: Moved helper text into Info icon hover tooltips (dark `bg-slate-800` style)
- **Segmented buttons**: "Aggressive" abbreviated to "Aggr." for 3-col fit, height reduced (`py-1.5`)
- **Button**: "Apply New Strategy" → "Apply strategy" with Sparkles icon

#### Files Modified
- `src/components/studio/StrategyTuner.jsx` — Complete layout rewrite

### Listing Info Sidebar Redesign
Complete redesign of the right-panel sidebar in ResultsDisplay:
- **Empty state**: Dashed border card with FileText icon and guidance ("Select 13 keywords, then click Optimize with AI")
- **Title quality bar**: Color-coded progress bar (green ≥120 chars, amber 80-119, red <80) with contextual hints
- **Tags pills**: Compact display of selected keywords with expand/collapse (first 5 shown, "+N more" toggle)
- **Etsy search preview**: Mini card showing how listing appears in Etsy search (thumbnail + title + placeholder price/stars)
- **Copy buttons**: On title, description, and tags (reuses existing `CopyButton` component)
- **Save button**: Primary indigo "Save listing" replacing old outline-style "Save Info"
- **PDF export removed**: Removed from sidebar (still available in HistoryPage)

#### Files Modified
- `src/components/studio/ResultsDisplay.jsx` — Sidebar section rewrite, removed PDF imports

### Generate-Draft Prompt Rewrite
Complete replacement of the AI prompt for title/description generation:
- **Product-first context**: Product details and visual analysis are now primary; shop identity is secondary (sign-off only)
- **Clean SEO brief**: Removed emoji status badges (💎🔥🌲) → plain text labels (Promising/Trending/Evergreen)
- **Server-side opening rotation**: `openingStyles[Date.now() % 4]` instead of asking AI to "randomly select"
- **Title rules**: Good/bad examples instead of rigid 4-step structure; added "word order doesn't matter on Etsy"
- **Description limits**: Explicit 150-200 word cap; expanded anti-cliché list (6 examples)
- **Conditional sections**: Shop identity omitted when no shop name; sign-off omitted when no signature
- **Debug logging**: Console.log of interpolated prompt for dev inspection

#### Files Modified
- `api/seo/generate-draft.ts` — New prompt template + preprocessing
- `server.mjs` — Mirror of above for local dev

### Image Analysis Stuck Spinner Fix
Added timeout and recovery mechanisms to prevent listings from getting permanently stuck in "Analyzing..." state:
- **3-minute timeout**: Auto-cancels the spinner with error toast if analysis hasn't completed
- **Stale detection on reload**: Listings with `updated_at` older than 5 minutes no longer resume the spinner (assumes analysis failed)
- **Cancel escape hatch**: "Taking too long? Cancel" link appears after 30 seconds of waiting
- **Polling error logging**: Replaced silent `catch` with `console.warn` for debuggability

#### Files Modified
- `src/pages/ProductStudio.jsx` — Timeout logic in realtime/polling useEffect, stale guard in `handleLoadListing`, cancel UI in spinner overlay

### Smart Badge Formula Fix (Opportunity Score)
Fixed the opportunity score calculation in `applySEOFilter()` that powers the Promising badge:
- **Volume normalization**: Replaced pool-relative `maxVol` with fixed `VOLUME_CEILING = 50,000` — scores are now stable regardless of pool composition
- **Linear T & N scores**: Changed `Math.pow(x/10, 2)` → `x/10` for transactional and niche factors — a 7/10 score now contributes 0.70 instead of 0.49 (quadratic was too punishing for the 4-tier system)
- **CPC ceiling**: Already aligned at $1.50, no change needed

#### Files Modified
- `lib/seo/filter-logic.ts` — Opportunity score formula in `applySEOFilter()`

### Token System & Stripe Billing (2026-03-25)

Implemented a complete token-based billing system with Stripe integration across 5 prompts:

#### Prompt 1 — Token Middleware
- Created `lib/tokens/token-middleware.ts` with 4 functions: `checkTokenBalance`, `deductTokens`, `checkQuota`, `incrementQuota`
- Token costs: analyze_image (1), generate_keywords (8), rerun_keywords (4), generate_draft (1)
- Deduction order: monthly tokens first, then bonus tokens
- Quota enforcement: `add_custom` and `add_favorite` limits per plan from `plans` table
- All 5 API routes updated (analyze-image, generate-keywords, generate-draft, user-keyword, add-from-favorite) — check before, deduct/increment after success
- HTTP 402 returned on insufficient balance/quota
- All changes mirrored in `server.mjs` for local dev
- Frontend updated to send `user_id` in generate-draft, user-keyword, add-from-favorite payloads

#### Prompt 2 — Stripe Webhooks Backend
- Created `lib/stripe/client.ts` — lazy Stripe singleton + price/plan mappings
- Created `api/stripe/webhook.ts` — handles 5 Stripe events (checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted)
- Created `api/stripe/create-checkout.ts` — creates Stripe Checkout sessions (subscriptions + one-time token packs)
- Created `api/stripe/create-portal.ts` — creates Stripe Billing Portal sessions
- All mirrored in `server.mjs` (webhook route uses `express.raw()` with JSON parser exclusion)
- Stripe env vars added: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_APP_URL`

#### Prompt 3 — Pricing Page (`/pricing`)
- Created `src/pages/PricingPage.jsx` — public standalone page (no sidebar)
- Monthly/Yearly toggle with "Save 17%" badge
- 4 plan cards (Free, Starter, Growth with "Most Popular" highlight, Pro)
- Token packs section (50/150/500 tokens, "Never expires" badges)
- FAQ accordion (4 questions)
- Smart CTA buttons (adapts based on auth state and current plan)
- Route added in `App.jsx`, "Pricing" link added to `LandingPage.jsx` nav

#### Prompt 4 — Billing Page (`/billing`)
- Created `src/pages/BillingPage.jsx` — protected page with Layout
- Current Plan card with status badge + "Manage subscription" (Stripe Portal)
- Token Balance card with monthly progress bar + bonus count + "Buy tokens" modal
- Usage stats row (custom keywords / favorites used vs limit)
- Transaction history table (paginated, color-coded amounts)
- Stripe redirect handling (`?success=true` / `?canceled=true` → toast)

#### Prompt 5 — Token UI Integration
- Sidebar: Added "Billing" nav link + token badge with Coins icon and "Low" warning when < 10 tokens
- Created `src/components/billing/InsufficientTokensModal.jsx` — shown on 402 for token actions
- Created `src/components/billing/QuotaExceededModal.jsx` — shown on 402 for quota actions
- ProductStudio: Replaced all 402 toast handlers with modal-based approach
- Token cost badges added: "1 token" on Analyse Design and Generate Draft, "8 tokens" on Generate SEO
- `refreshProfile()` called after successful token-consuming actions to update sidebar badge

#### DB Schema Changes (applied via SQL)
- `plans` table: free/starter/growth/pro with token allocations, quotas, Stripe price IDs
- `token_packs` table: 50/150/500 packs with Stripe price IDs
- `token_transactions` table: audit log with RLS
- `profiles` additions: `subscription_plan`, `subscription_status`, `subscription_id`, `stripe_customer_id`, `subscription_end_at`, `tokens_monthly_balance`, `tokens_bonus_balance`, `tokens_reset_at`, `add_custom_used`, `add_favorite_used`, `counters_reset_at`
- `listings` addition: `seo_generation_count`
- RPC function: `increment_seo_generation_count`

#### Files Created
- `lib/tokens/token-middleware.ts`
- `lib/stripe/client.ts`
- `api/stripe/webhook.ts`, `api/stripe/create-checkout.ts`, `api/stripe/create-portal.ts`
- `src/pages/PricingPage.jsx`, `src/pages/BillingPage.jsx`
- `src/components/billing/InsufficientTokensModal.jsx`, `src/components/billing/QuotaExceededModal.jsx`
- `supabase/migrations/20260325_increment_seo_generation_count.sql`

#### Files Modified
- All `api/seo/*.ts` routes (token checks + quota checks)
- `server.mjs` (mirrored all API changes + Stripe routes)
- `src/App.jsx` (pricing + billing routes)
- `src/components/Sidebar.jsx` (billing link + token badge)
- `src/pages/ProductStudio.jsx` (modals, badges, profile refresh)
- `src/components/studio/ResultsDisplay.jsx` (draft token badge)
- `src/pages/LandingPage.jsx` (pricing link)
- `src/pages/SEOLab.jsx` (user_id in add-from-favorite)
- `.env` (Stripe vars)
- `package.json` (stripe dependency)

### Session Handover
- **Branch**: `main`
- **Status**: Complete token billing system implemented (middleware, Stripe webhooks, pricing page, billing page, UI modals)
- **Next Steps**:
  1. Deploy to Vercel — add Stripe env vars + `VITE_APP_URL` to Vercel dashboard
  2. Add Stripe webhook endpoint URL in Stripe Dashboard → Developers → Webhooks
  3. Test end-to-end: checkout flow, token deduction, webhook events, billing portal
  4. Update old `credits_balance` / `subscription_credits_balance` / `bonus_credits_balance` UI references (Dashboard QuickStats) to use new token fields

## Session: 2026-03-26 — SEO Generation Stuck Spinner Recovery + UX Fixes

### SEO Generation Stuck Spinner Recovery
Mirrored the image analysis recovery pattern for SEO generation — previously had no timeout or recovery mechanism, causing infinite spinners when the backend failed silently.

- **5-minute timeout**: Added `SEO_GENERATION_TIMEOUT_MS` (5 min) and `SEO_CANCEL_VISIBLE_MS` (60s) constants. Auto-cancels stuck SEO generation after 5 minutes, resets DB flag, shows error toast.
- **Cancel escape hatch**: "Taking too long? Cancel" link appears in the `TableSkeleton` loading spinner after 60 seconds of waiting.
- **Age-based stale detection**: When loading a listing with `is_generating_seo: true` and `updated_at` older than 5 minutes, the spinner is skipped, the DB flag is silently reset, and a warning toast is shown.
- **handleSeoDone cleanup**: `showSeoCancelLink` state is cleared on successful SEO completion.
- **LoadingSpinner/TableSkeleton extended**: Both components now accept optional `showCancel`/`onCancel` props for the cancel link.

#### Files Modified
- `src/pages/ProductStudio.jsx` — Constants, state, timeout/cancel in realtime effect, age-based detection in `handleLoadListing`, `handleCancelSeoGeneration` function, new props to ResultsDisplay
- `src/components/studio/ResultsDisplay.jsx` — `LoadingSpinner` and `TableSkeleton` accept cancel props, SEO skeleton passes them through

### Custom Keyword Input Not Closing on 402 Error
When adding a custom keyword with insufficient tokens, dismissing the quota modal left the keyword input row open.
- **Fix**: Added `onSuccess()` call in the `catch` block of `handleAddCustomKeyword` so the inline input row closes on error too.

#### Files Modified
- `src/pages/ProductStudio.jsx` — `handleAddCustomKeyword` catch block

### Generate SEO Button: Dynamic Label & Token Cost
The Generate SEO button now shows context-appropriate label and token cost based on `seo_generation_count` from the `listings` table:
- **First generation** (`seo_generation_count === 0`): "GENERATE SEO" / "8 tokens"
- **Re-generation** (`seo_generation_count > 0`): "RE-GENERATE SEO" / "4 tokens"
- Added `seoGenerationCount` state, hydrated from `listing.seo_generation_count` in `handleLoadListing`, reset to 0 in `handleNewAnalysis`.

### Image Analysis State Detection Fix
Fixed a bug where listings with completed image analysis (visual fields populated, SEO results present) could show the button stuck on "ANALYZE IMAGE FIRST".
- **Root cause**: `isImageAnalyzedState` relied solely on `listing.is_image_analysed` DB flag, which could be `false` for legacy listings.
- **Fix**: Now derives from three sources: `is_image_analysed` flag OR visual data fields populated OR existing SEO results.

#### Files Modified
- `src/pages/ProductStudio.jsx` — `seoGenerationCount` state, `isImageAnalyzedState` derivation, button label logic

## Session: 2026-03-26 — Auth Fix, Token Migration, SEO Pre-render, Legal Pages

### Signup Redirect Fix
The signup handler in `LoginPage.jsx` never called `navigate()` when `supabase.auth.signUp()` returned a session directly (email confirmation disabled), causing an infinite spinner on `/login`.
- **Fix**: If `data.session` exists after signUp, navigate immediately. Falls back to "check email" message if only `data.user` exists.

#### Files Modified
- `src/pages/LoginPage.jsx` — signup handler in `handleEmailAuth`

### Dashboard QuickStats — Token Migration
Migrated the credits card from legacy `credits_balance`/`subscription_credits_balance`/`bonus_credits_balance` fields to the new token-based billing fields.
- **Value**: `tokens_monthly_balance + tokens_bonus_balance`
- **Sub-text**: Shows plan name (e.g. "Starter plan") + bonus indicator if applicable
- **Label**: "Credits" → "Tokens"

#### Files Modified
- `src/components/dashboard/QuickStats.jsx` — props and card config
- `src/pages/Dashboard.jsx` — updated props passed to QuickStats

### SEO Pre-render for Bots (index.html)
Added static HTML content in `index.html` so search engine bots and API reviewers (Etsy) see real content without JavaScript execution.
- **Meta tags**: `description`, Open Graph (`og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`)
- **`<noscript>` block**: Full static content (how it works, features, legal links, Etsy trademark disclaimer)

#### Files Modified
- `index.html` — meta tags in `<head>`, `<noscript>` block in `<body>`

### Legal Pages — Terms of Service + Link Integration
Rewrote `TermsPage.jsx` with 11 sections covering: Acceptance, Description, Token System, Subscriptions & Billing, Acceptable Use, IP, Limitation of Liability, Service Availability, Changes to Terms, Governing Law, Contact (`christian.couillard@5pennyai.com`). Privacy Policy is now hosted on Iubenda.

**Links added/updated across the app:**
- **LandingPage**: Footer links to Iubenda Privacy (new tab), Iubenda Cookie Policy (new tab), internal `/terms`
- **PricingPage**: "By subscribing..." legal line below plan cards; footer Privacy → Iubenda
- **LoginPage**: Privacy → Iubenda; text adapts ("creating an account" vs "continuing")
- **Sidebar**: Legal section (Terms + Privacy) added above user profile
- **PrivacyPage/TermsPage**: Footer Privacy links → Iubenda

#### Files Modified
- `src/pages/TermsPage.jsx` — full rewrite
- `src/pages/LandingPage.jsx` — footer links
- `src/pages/PricingPage.jsx` — legal line + footer link
- `src/pages/LoginPage.jsx` — privacy link
- `src/components/Sidebar.jsx` — legal section + billing/settings reorder
- `src/pages/PrivacyPage.jsx` — footer link

### Sidebar Reorder
Moved "Billing" above "Settings" in the sidebar navigation.

### Session Handover
- Privacy/Cookie policies are on Iubenda — internal `/privacy` page still exists but all links now point to Iubenda
- Token billing system is fully in place: `tokens_monthly_balance`, `tokens_bonus_balance`, `subscription_plan` fields on `profiles`
- `vercel.json` catch-all rewrite already handles SPA routing for `/terms`, `/privacy`, etc.

---

## Session: 2026-03-27 — Dashboard Redesign, Listings by Status, Keyword Pipeline

### Dashboard Recent Listings Redesign
- **ListingsTable.jsx**: Complete rewrite — flexbox → CSS grid (`2fr 1fr 1fr 1fr 60px`) with inline styles. Columns: Image, Product Name (+ keyword count badge), Score, Status, Date, Action. Header row added. Uses `v_dashboard_listings` view with `computed_status`.
- **2-Column Layout**: Dashboard now shows Recent Listings (3fr) + Trending Keywords (2fr) side-by-side via CSS grid. TrendingKeywords changed to `grid-cols-1` vertical stack (was `grid-cols-3`), shows up to 5 keywords.
- **Dashboard query**: Changed from `action_priority` sort to `updated_at DESC` for true recency.

### ProductStudio Recent Listings
- **RecentOptimizations.jsx**: Rewritten with same inline-style layout as Dashboard. Switched data source from `view_listing_scores` to `v_dashboard_listings`. Removed French labels, date-fns dependency. Moved inside sidebar in ResultsDisplay (below Listing Info card).

### Listings by Status Page (`/listings`)
- **New file**: `src/pages/ListingsByStatusPage.jsx` — full page with status tabs (New, Analyzed, SEO Ready, Draft Ready, Complete), checkboxes, bulk action bar, confirm modal, progress bar.
- **Bulk actions**: Analyze Images (limit 10), Generate Keywords (limit 5), Generate Drafts (limit 15). Sequential processing with progress bar and 402 error handling.
- **Route**: Added `/listings` to `App.jsx` with `ProtectedRoute`.
- **NextActions.jsx**: Action buttons now navigate to `/listings?status=X` instead of `/studio`.

### API: Bulk Action Support
- **generate-keywords** (`api/seo/generate-keywords.ts` + `server.mjs`): Added DB fallback — when context fields (theme, niche, visual analysis) not in request body, fetches from `listings` table. Enables bulk keyword generation with minimal `{ listing_id, user_id }` payloads.
- **generate-draft** (`api/seo/generate-draft.ts` + `server.mjs`): Added DB fallback — when keywords not in body, fetches top 13 from `listing_seo_stats`, listing data from `listings`, shop context from `profiles`. Enables bulk draft generation.

### Keyword Pipeline: Segment 6 — Broad Discovery
- **generate-keyword-pool.ts**: Added 6th segment `SEGMENT_BROAD_DISCOVERY` (20 keywords). Targets broad, non-niche product function/format terms. Ignores theme/niche entirely. Pipeline now produces ~180 keywords (was ~160).
- **Segment logging**: Each segment now logs its keyword list for debugging.

### Filter Logic Fix
- **filter-logic.ts**: Set `MIN_NICHE = 1` and `MIN_TRANSACTIONAL = 1` (was 5). Hard floors were excluding broad discovery keywords (niche_score = 4) before opportunity_score could weight them. Now all keywords pass through to scoring — strategy weights handle ranking.

### ProductStudio: Save Validation Fix
- **getFormData()**: Added `{ validate }` option. Save button calls without validation (allows saving with just image/title). Analyze/Generate buttons call with `{ validate: true }` (requires product type + categorization).
- **Removed**: `handleSEOSniper`, `isSniperLoading` state, and related props (dead code).

### Session Handover
- Broad discovery keywords should now appear in pools — verify after next keyword generation
- Bulk actions send minimal payloads; server fetches context from DB
- ListingsTable uses inline styles (not Tailwind) for reliable layout — intentional choice after multiple CSS layout issues

---

## Session: 2026-03-27 — Icon Unification, Feedback System, Token Widget Fix

### Icon & Term Unification (Technical Analysis ↔ Strategy Tuner)
- **ResultsDisplay.jsx**: Renamed "Conversion" → "Buy intent". Changed Competition icon from `Swords` → `BarChart2` with tooltip. Icons now match Strategy Tuner: TrendingUp, Target, ShoppingCart, BarChart2.
- **StrategyTuner.jsx**: Renamed "Market reach" → "Reach". Updated icons: `BarChart3` → `TrendingUp`, `Shield` → `BarChart2`, `Crosshair` → `Target`. Updated Ranking ease description. Display-only change — no scoring logic modified.

### Beta Feedback System (Full Stack)
- **Supabase**: `feedback` table with RLS policies — authenticated insert (user_id match), anonymous insert (user_id IS NULL), admin SELECT/UPDATE via `auth.jwt() ->> 'email'` for both `christian.couillard@5pennyai.com` and `admin@etsypenny.dev`.
- **API**: `api/feedback.ts` (Vercel) + route in `server.mjs` (local dev). POST inserts to `feedback` table + sends email notification via Resend API (`onboarding@resend.dev` → `christian.couillard@5pennyai.com`). Email is non-blocking.
- **FeedbackModal.jsx** (`src/components/feedback/`): Portal modal with type selector (Bug/Suggestion/Question/Other), textarea, success animation. Uses `axios.post('/api/feedback')`.
- **Sidebar.jsx**: "Give feedback" button added above Legal links, opens FeedbackModal.
- **LandingPage.jsx**: "Have a question?" contact form section added before footer. Public (no auth), sends `user_id: null` to `/api/feedback`.
- **AdminSystemPage.jsx**: "Beta Feedback" accordion with purple accent, table (date, type badge, message, page, email, status dropdown). Status updates via Supabase client.
- **Env var**: `RESEND_API_KEY` required for email notifications.

### Token Widget Fix (ProductStudio Header)
- **ProductStudio.jsx**: Replaced legacy `credits_balance` / "5 / 5 Credits" widget with live token display: `{tokens_monthly_balance} tokens + {tokens_bonus_balance} bonus`. Warning state (rose) when total < 10. "Top Up →" is now a working `<Link to="/billing">`. Swapped `Zap` icon for `Coins`.

### Session Handover
- Feedback system is live — Resend test mode only sends to registered account email
- RLS admin policies use JWT email check (not auth.users subquery) — more reliable
- FeedbackModal type pill buttons use dynamic Tailwind classes (`bg-${color}-50`) — may need safelist if colors get purged in production

## Session: 2026-03-28 — Scoring Resilience, Bulk Progress, Admin Roles, Emails, Sentry, Onboarding

### Scoring Resilience (`lib/seo/score-keywords.ts`)
- Increased retries from 2 to 3 for AI scoring batches
- Added JSON cleaning: trailing comma removal, truncated JSON salvaging
- **Graceful fallback**: failed batches assign default score 4 instead of crashing entire pipeline

### Bulk Progress Context (`src/context/BulkProgressContext.jsx`)
- Moved bulk action progress from local state to global React Context
- Sidebar shows compact progress indicator (pulsing dot, counter, progress bar)
- Progress persists when navigating away from ListingsByStatusPage

### ListingsByStatusPage Improvements
- Fixed tab switching bug: replaced `useLocation` + `navigate()` with `useSearchParams` + `setSearchParams()`
- Added "SEO Listings" to sidebar nav with `LayoutList` icon, renamed `/studio` to "SEO Studio"
- Redesigned page header: fixed "SEO Listings" title, removed back button, underline-style tabs

### Volume Display (`src/components/studio/ResultsDisplay.jsx`)
- Replaced flat "> 50K" cap with tiered labels: `> 1M`, `> 500K`, `> 250K`, `> 100K`, `> 50K`, `28K`, `1.5K`
- Display-only change — backend stores real volumes, scoring normalization unchanged

### Admin Role Access Control
- **Migration**: `profiles.role` column (`'user'` | `'admin'`, default `'user'`, CHECK constraint)
- **AuthContext**: `isAdmin` boolean from `profile.role === 'admin'`
- **App.jsx**: `AdminRoute` wrapper redirects non-admins to `/dashboard`
- **Sidebar**: Admin link conditionally rendered with `isAdmin`
- Admin users: `admin@etsypenny.dev`, `christian.couillard@gmail.com`, `christian.couillard@5pennyai.com`

### Sidebar Footer Redesign
- Moved Settings from main nav to footer section
- Removed Terms/Privacy links (available on landing/pricing pages)
- New footer order: Token badge → Bulk progress → Settings/Admin/Feedback → User profile

### Transactional Emails via Resend
- **`lib/email/send-email.ts`**: Shared Resend HTTP wrapper (non-blocking, Vercel-only, logs errors)
- **`lib/email/templates/`**: `layout.ts` (shared HTML), `welcome.ts`, `subscription-confirmation.ts`, `token-pack-confirmation.ts`
- **Welcome email**: Sent after signup via `api/emails/welcome.ts` (called from LoginPage, both confirmation flows)
- **Subscription email**: Sent in `api/stripe/webhook.ts` after `checkout.session.completed` (subscription mode)
- **Token pack email**: Sent in `api/stripe/webhook.ts` after `checkout.session.completed` (payment mode)
- **Feedback sender**: Updated from `onboarding@resend.dev` to `PennySEO <hello@pennyseo.ai>`
- **Key fix**: All webhook emails must be `await`ed — serverless functions kill un-awaited fetches after `res.json()`

### Sentry Error Monitoring
- **Frontend**: `@sentry/react` init in `main.jsx`, error boundary wrapping App in `App.jsx`
- **Backend**: `lib/sentry.ts` (lazy init, Vercel-only), `initSentry()` + `Sentry.captureException()` in all 14 API routes
- Production-only (`import.meta.env.PROD` frontend, `VERCEL_ENV` backend), 10% trace rate, no PII

### Hidden Features (Pending Etsy API License)
- "My Shop" sidebar item commented out
- Magic Sync card on BrandProfilePage wrapped in `{false && ...}`
- Both have `// TODO: re-enable when Etsy API license is approved`

### First-Run Onboarding (Dashboard)
- Name collection step: shows when `profile.full_name` is empty, saves to profiles, skip option
- Welcome screen: personalized greeting, 4-step flow cards (Upload & analyze → Generate SEO → Generate draft → Copy to Etsy)
- Disappears automatically when user creates first listing (`total_listings > 0`)

---

## Session — 2026-03-29

### SEO Studio Section Rename + Step Badges
- Renamed the 3 SEO Studio sections: "SEO LISTING" → "Product Details", "SEO Analysis" → "Keyword Research", "Listing Info" → "Listing Editor"
- Added numbered indigo circle badges (①②③) via new `src/components/ui/StepBadge.jsx` shared component
- Visual-only change — no logic/state modified

### CopyButton Upgrade (Ghost Style with Label)
- Replaced icon-only CopyButton in `ResultsDisplay.jsx` with ghost button showing icon + text label
- Default: `Copy` icon + label in slate-500; Hover: indigo-600 + bg-indigo-50; Copied: green Check + "Copied!" (2s timeout)
- Removed tooltip system (no longer needed with visible label)
- Tags already copied as comma-separated values

### Visibility Score Calibration
- **Log ceiling**: `500,000` → `5,000,000` in `lib/seo/select-and-score.ts` (and test mirror)
- **DesirabilityWeight**: `0.4 + (nS/10) + (tS/10)` → `0.7 + (nS/20) + (tS/20)` — range narrowed from 0.6–2.4 to 0.8–1.7
- Fixes: REACH 186K was scoring Visibility 92 (now ~72), REACH 549K was 100 (now ~88)

### Recalculate Scores — Strategy Tuner Fix
- Bug: "Recalculate Scores" ignored strategy tuner values, used only saved DB defaults
- Fix: Frontend now sends `parameters: getStrategyValues(strategySelections)` in the recalculate payload
- Backend (`server.mjs` + `api/seo/recalculate-scores.ts`): added `finalParams = { ...params, ...(req.body.parameters || {}) }` merge step
- Both Apply Strategy and Recalculate Scores now produce identical results for the same tuner position

### Dashboard — Next Actions Inline Stats
- Added contextual stats to each Next Actions row: token cost for ANALYZED/DRAFT_READY, avg score for SEO_READY, lowest score for low-score row
- Token cost turns amber when it exceeds user's token balance
- Stats positioned at true horizontal center via `absolute left-1/2 -translate-x-1/2`
- New props: `tokenBalance`, `avgScore`, `lowestScore` passed from Dashboard.jsx

### Dashboard — 30-Day Score Evolution Chart (Shop Health)
- Pure SVG area chart in `ShopHealth.jsx` — no new dependencies (consistent with existing Sparkline pattern)
- Indigo gradient fill + stroke, hover tooltip shows date + score, trend badge (↑/↓ X pts)
- Data: queries `listings_global_eval` for last 30 days, groups by day for daily avg
- `preserveAspectRatio="none"` ensures full card width
- Empty state when < 2 data points

### Generate SEO Button — Moved to Keyword Research Header
- Removed standalone full-width indigo "GENERATE SEO" button bar between Product Details and Keyword Research
- Button now lives inside the Keyword Research accordion header (right-aligned, before chevron)
- First run: filled indigo "Generate SEO · 8 tokens"; Re-run: outlined "Re-generate · 4 tokens"
- `e.stopPropagation()` prevents section collapse on click; auto-expands section on generate
- Hidden when `canGenerateSEO` is false (no image analysis or product type)
- New props passed from ProductStudio → ResultsDisplay: `onGenerateSEO`, `isGeneratingSEO`, `canGenerateSEO`, `seoGenerationCount`

### AI Provider Router — Retry + Model Fallback
- Added exponential backoff retry (3 attempts: 1s, 2s, 4s) to `lib/ai/provider-router.ts`
- Retries on transient errors: 429, 500, 503, 504, and network errors
- Fails immediately on non-recoverable errors: 400, 401, 403
- Added Gemini model fallback chains: if primary model exhausts retries, tries next model (e.g. `gemini-2.5-flash` → `gemini-2.5-pro` → `gemini-2.5-flash-lite`)
- Non-Gemini providers: retry only, no cross-model fallback
- Extracted `callWithAdapter()` helper and `GEMINI_FALLBACK_CHAINS` constant
- All existing callers (`server.mjs`, `api/` routes, `lib/seo/`) benefit automatically via `runAI()`

### Score Tooltips — Replace Action Banner
- Removed `getActionableInsight()` function and the amber/rose action banner from ResultsDisplay
- Added `getMetricTooltip(metric, value)` — returns tier-based tooltip text (4 tiers per metric)
- Each metric label in Technical Analysis grid now has a hover tooltip (Visibility, Relevance, Buy intent, Competition)
- Uses existing CSS `group-hover` pattern with named groups (`group/vis`, `group/rel`, `group/buy`, `group/comp`)
- Small `Info` icon (10px) added as hover hint on each label
- Overall score circle also has a tooltip with 4-tier assessment
- Tooltips hidden in pre-analysis state
- Migrated existing "Reach" badge tooltip to named group (`group/reach`) to avoid conflicts

### Login Page Redesign
- Full visual rewrite of `src/pages/LoginPage.jsx` — same auth logic preserved
- 60/40 split layout: dark left panel (marketing) + light right panel (auth form)
- Left panel: PennySEO logo + "Beta — Free to try" badge, headline, subtitle, product screenshot with tilt + bottom fade, 3-column feature grid, trust line
- Right panel: tab switcher (Sign in / Create account), dynamic headers per tab, Google OAuth + email form, contextual bottom link, Terms/Privacy links, reassurance badges (Secure, 30 free tokens, No credit card)
- Mobile: left panel hidden, form full-width with mobile logo
- Screenshot referenced from `public/keyword-performance-preview.png`

### Session Handover
- Scoring pipeline now resilient — won't crash on AI JSON errors (falls back to score 4)
- Transactional emails working — `await` is critical in serverless webhook handlers
- Sentry monitoring live on frontend + all 14 backend routes
- `analyseShop` / My Shop hidden until Etsy API license — code preserved, just hidden from UI
- Admin access control is frontend-only (sufficient for beta) — system tables don't have RLS
- Visibility calibration updated — check new expected ranges if adjusting formula again
- Recalculate Scores now uses tuner values — both score paths are consistent
- AI provider router now has retry + fallback — all AI calls auto-recover from transient failures
- Login page redesigned — screenshot asset must exist at `public/keyword-performance-preview.png`
- Generate SEO button moved into Keyword Research header — cleaner layout, same functionality
