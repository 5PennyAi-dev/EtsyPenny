# 🧠 Project Context: EtsyPenny (5PennyAi)
*Dernière mise à jour : 2026-02-21 (Session 7)*

## 1. Project Overview
- **Goal**: AI-powered visual SEO optimization SaaS for Etsy sellers.
- **Value Prop**: Transforming product images into high-ranking Etsy listings using Vision AI.
- **Brand Identity**: 5PennyAi (Accessibility, Intelligence, Efficiency).

## 2. Tech Stack (Source of Truth)
- **Frontend**: React 19 (Vite), Tailwind CSS, Shadcn/UI, Lucide-React.
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **Automation**: n8n (Hosted on Hostinger/Docker - Orchestrator for AI & Logic).
- **Payment**: Stripe (Hybrid Model: Subscriptions + Credit Packs).
- **AI**: GPT-4o / Gemini 1.5 Pro (Vision & SEO generation).

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

## 5. Next Steps (Action Items)
- Test Multi-Mode end-to-end: verify all 3 modes save correctly to `listings_global_eval` and `listing_seo_stats`.
- Validate Strategy Switcher toggles display correct per-mode data without refetch.
- Verify `is_selection_ia` pre-selects correct keywords in Keyword Performance table after fresh analysis.
- Clean up debug `console.log` statements from `ProductStudio.jsx` and `ResultsDisplay.jsx`.
- Polish the Login/Signup UI.
- Implement the comprehensive Landing Page.
- Build the Stripe Payment Integration (Credits & Subscriptions).
