# 🧠 Project Context: EtsyPenny (5PennyAi)
*Dernière mise à jour : 2026-02-14 (Session 3)*

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

## 5. Next Steps (Action Items)
- Clean up debug `console.log` statements from `ProductStudio.jsx` and `ResultsDisplay.jsx`.
- Polish the Login/Signup UI.
- Implement the comprehensive Landing Page.
- Build the Stripe Payment Integration (Credits & Subscriptions).
- Test full SEO Sniper → Insight pipeline end-to-end (sniper → new keywords → auto-insight → updated audit score + score_explanation).
- Test history reload with sniper keywords (`is_sniper_seo` flag hydration).
- Verify `score_explanation` tooltip renders correctly with real AI-generated content.

