# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Rules
Follow all rules defined in `.agent/rules/rules.md` — read this file at the start of every session.

## Project Context
Read `docs/context.md` at the start of every session to understand the full project history, architecture decisions, and current state.

## Project Overview

**PennySEO** (formerly EtsyPenny / 5PennyAi) is an AI-powered SEO SaaS for Etsy sellers. Users upload product mockup images, the app analyzes them via Gemini Vision AI, generates optimized titles/descriptions/tags, and provides SEO scoring with configurable strategy weighting. The frontend is a React (Vite) SPA deployed on Vercel; the AI/SEO pipeline runs through Vercel serverless functions in production (`api/`) and a local Express server (`server.mjs`) for development; data persists in Supabase.

## Commands

```bash
npm run dev       # Start Express API + Vite dev server concurrently
npm run dev:api   # Express API server only (port 3001)
npm run dev:vite  # Vite frontend only
npm run build     # Production build (vite build)
npm run lint      # ESLint (js,jsx, --max-warnings 0)
npm run preview   # Preview production build
```

## Architecture

### Tech Stack
- **React 19** + **Vite 5** (JSX, no TypeScript in components)
- **Tailwind CSS 3** with shadcn/ui-style HSL CSS variables
- **Supabase** for auth, database, storage (mockups_bucket), and realtime subscriptions
- **Vercel Serverless Functions** (`api/`) — production backend for all SEO operations
- **Local Express API** (`server.mjs`, port 3001) — dev-only mirror of Vercel functions, used via Vite proxy
- **n8n** webhook — only used for `analyseShop` (currently hidden — pending Etsy API license)
- **Resend** for transactional emails (welcome, subscription, token pack) via raw fetch API
- **Sentry** for error monitoring (`@sentry/react` frontend, `@sentry/node` backend)
- **Multi-provider AI** (Gemini, Anthropic, OpenAI) via configurable provider router — admin assigns any model to any task at runtime via `system_ai_config` table
- **DataForSEO** API for keyword enrichment (search volume, competition, CPC, volume history)
- **Framer Motion** for animations
- **Sonner** for toast notifications
- **Axios** for API calls
- **Lucide React** for all icons (never use other icon libraries)

### Path Alias
`@` maps to `./src` (configured in vite.config.js)

### Key Directories
- `src/pages/` — Full page components (ProductStudio, Dashboard, HistoryPage, BrandProfilePage, LoginPage, AdminSystemPage, UserSettings, SEOLab, LandingPage)
- `src/components/studio/` — SEO Listings sub-components (OptimizationForm, ResultsDisplay, ImageUpload, StrategyTuner, FavoritesPickerModal, CreatePresetModal, SeoBadge, ProductTypeCombobox, etc.)
- `src/components/dashboard/` — Dashboard widgets (QuickStats, PipelineBar, NextActions, ShopHealth, KeywordBankStats, ListingsTable, TrendingKeywords, RadialGauge)
- `src/lib/listingStatuses.js` — Listing status config (LISTING_STATUSES, STATUS_PIPELINE, getStatusAction)
- `src/components/admin/` — Admin panel components (TaxonomyManagement, ProductTypeManagement, AIModelConfig)
- `src/components/settings/` — User settings components (UserTaxonomyManagement — custom themes/niches CRUD)
- `src/components/ui/` — Reusable UI primitives (Accordion, ConfirmationModal)
- `src/components/pdf/` — PDF export (ListingPDFDocument using @react-pdf/renderer)
- `src/context/AuthContext.jsx` — Auth provider wrapping the app (provides user, profile, isAdmin, signOut, loading)
- `src/context/BulkProgressContext.jsx` — Bulk action progress state (persists across navigation, shown in Sidebar)
- `src/lib/supabase.js` — Supabase client singleton
- `api/` — Vercel serverless functions (production backend): `analyze-image`, `generate-keywords`, `reset-pool`, `recalculate-scores`, `generate-draft`, `user-keyword`, `add-from-favorite`, `health`, `feedback`, `emails/welcome`, `stripe/webhook`, `stripe/create-checkout`, `stripe/create-portal`
- `lib/email/` — Email sending: `send-email.ts` (Resend HTTP wrapper), `templates/` (welcome, subscription-confirmation, token-pack-confirmation, layout)
- `lib/sentry.ts` — Shared Sentry init helper for backend (lazy, Vercel-only)
- `server.mjs` — Local Express dev server (mirrors Vercel functions for local development)
- `vercel.json` — Vercel deployment config (rewrites `/api/*` to serverless functions)
- `lib/seo/` — Shared backend logic imported by both `server.mjs` and `api/`: `score-keywords.ts`, `generate-keyword-pool.ts`, `filter-logic.ts`, `enrich-keywords.ts`, `select-and-score.ts`, `persist-seo.ts`, `persist-strength.ts`
- `lib/ai/` — AI abstraction layer: `provider-router.ts` (main `runAI()` entry point), `types.ts`, `adapters/` (gemini, anthropic, openai)
- `lib/ai/gemini.ts` — Legacy Gemini wrapper (only used by test files)
- `lib/supabase/server.ts` — Server-side Supabase admin client
- `supabase/functions/save-seo/` — Deno edge function to persist SEO results
- `supabase/functions/save-image-analysis/` — Deno edge function to persist image analysis
- `supabase/functions/check-keyword-cache/` — Deno edge function for keyword cache lookup
- `supabase/migrations/` — SQL migration files
- `tasks/` — Task tracking (`todo.md`) and migration scripts
- `docs/styleguide.md` — Visual design spec (in French)
- `docs/context.md` — Living project history and session handover document
- `.agent/personas.md` — AI assistant persona definitions for this project
- `types/definitions.ts` — TypeScript interfaces for API payloads and data structures

### Backend: Dual Dev/Production Architecture

**Production**: Vercel serverless functions in `api/seo/*.ts` — each route is a standalone function importing shared logic from `lib/`.

**Local dev**: Express server (`server.mjs`, port 3001) — mirrors the same routes. Vite proxies `/api/*` requests to it automatically. Both backends share `lib/seo/`, `lib/ai/`, and `lib/supabase/`.

**Active routes:**
| Route | Purpose |
|-------|---------|
| `POST /api/seo/analyze-image` | Gemini Vision analysis → taxonomy mapping → save-image-analysis edge function |
| `POST /api/seo/generate-keywords` | 5-segment keyword generation → DataForSEO enrichment → AI scoring → save-seo edge function |
| `POST /api/seo/reset-pool` | Re-rank keywords based on strategy selections + smart badge thresholds |
| `POST /api/seo/recalculate-scores` | Recalculate listing strength from user-selected keywords (no re-filter) |
| `POST /api/seo/generate-draft` | Generate Etsy title + description from selected keywords via Gemini |
| `POST /api/seo/user-keyword` | Add single custom keyword with live DataForSEO enrichment + AI scoring |
| `POST /api/seo/add-from-favorite` | Batch-add keywords from Favorites bank (skips DataForSEO, uses cached metrics) |
| `GET /api/health` | Health check |

**Key shared modules (in `lib/`):**
- `lib/ai/provider-router.ts` — `runAI(taskKey, prompt, options)` — reads task→model config from `system_ai_config` (60s cache), routes to correct adapter
- `lib/seo/generate-keyword-pool.ts` — 5 parallel AI calls to generate keyword pool
- `lib/seo/enrich-keywords.ts` — Cache check + DataForSEO API enrichment
- `lib/seo/score-keywords.ts` — Batch niche + transactional scoring via AI
- `lib/seo/select-and-score.ts` — Composite scoring, top-N selection, strength breakdown
- `lib/seo/persist-strength.ts` — Shared DB persistence for strength scores
- `lib/seo/filter-logic.ts` — Opportunity scores, trending/evergreen flags, pool ranking

### n8n Webhook (Hidden — Pending Etsy API License)

The `analyseShop` feature in `BrandProfilePage.jsx` is hidden via `{false && ...}`. The "My Shop" sidebar item is also commented out. Both have `// TODO: re-enable when Etsy API license is approved` comments.

### Admin Access Control

- `profiles.role` column (`'user'` | `'admin'`, default `'user'`)
- `AuthContext` exposes `isAdmin` boolean from `profile.role`
- `AdminRoute` component in `App.jsx` redirects non-admins to `/dashboard`
- Sidebar Admin link only visible when `isAdmin === true`

### Data Flow
1. **Image Upload**: User uploads mockup → stored in Supabase `mockups_bucket` → listing row created in `listings` table
2. **Visual Analysis**: Frontend POSTs to `/api/seo/analyze-image` → Gemini Vision extracts visual DNA → Gemini Text maps to taxonomy (theme/niche) → `save-image-analysis` edge function persists results
3. **SEO Generation**: Frontend POSTs to `/api/seo/generate-keywords` → 5 parallel Gemini calls generate keywords → DataForSEO enriches with metrics → AI scores each keyword → `save-seo` edge function persists to `listings_global_eval` + `listing_seo_stats` → sets status to `SEO_DONE`
4. **Pool Reset**: After SEO generation, `/api/seo/reset-pool` re-ranks keywords using user strategy weights + smart badge thresholds
5. **Data Hydration**: `handleLoadListing` in ProductStudio fetches listing + keywords + evaluations from DB when a listing is selected
6. **Manual Overrides**: Conv. Intent and Relevance overrides via interactive `SeoBadge` dropdowns → `handleScoreUpdate` syncs to `listing_seo_stats`
7. **Component Communication**: `ProductStudio.jsx` passes state and callbacks to `ResultsDisplay.jsx` as props
8. **Realtime Updates**: ProductStudio subscribes to Supabase realtime on `listings` table to detect when image analysis completes
9. **Display**: ResultsDisplay shows SEO scores, keywords, and strategy analysis
10. **Smart Badges**: User settings from `UserSettings.jsx` feed all API payloads via `v_user_seo_active_settings`

### Supabase Tables & Views
- **`listings`** — Core table: image_url, generated_title, generated_description, visual analysis fields, status_id, theme, niche, sub_niche, is_generating_seo, is_image_analysed
- **`listings_global_eval`** — SEO evaluation scores (listing_strength, visibility, relevance, conversion, competition, profit) keyed by listing_id
- **`listing_seo_stats`** — Individual keyword metrics (tag, search_volume, competition, cpc, opportunity_score, niche_score, transactional_score, is_selection_ia, is_current_pool, is_current_eval, is_pinned, is_user_added, is_competition, volume_history)
- **`user_keyword_bank`** — User's saved favorite keywords with cached metrics
- **`keyword_presets`** — Named keyword groupings (keyword_ids[] referencing user_keyword_bank)
- **`user_settings`** — User preferences including Smart Badge thresholds and gem settings
- **`system_seo_constants`** — System-wide SEO constants and labels
- **`system_ai_models`** — Catalog of available AI models (id, provider, display_name, supports_vision, cost_tier)
- **`system_ai_config`** — Task→model assignments (task_key, provider, model_id, temperature, max_tokens, is_vision)
- **`system_themes`** / **`system_niches`** — Global taxonomy (admin-managed)
- **`user_custom_themes`** / **`user_custom_niches`** — Per-user custom taxonomy (RLS enabled)
- **`user_custom_product_types`** — Per-user custom product types (RLS enabled)
- **`profiles`** — User profiles (fetched in AuthContext)
- **`product_types`** — System product categorization lookup
- **`v_combined_product_types`** — Union view of system + user custom product types
- **`v_combined_themes`** / **`v_combined_niches`** — Union views of system + user taxonomy
- **`listings_global_info`** — View joining listings, statuses, and evaluations (used by HistoryPage)
- **`view_user_performance_stats`** — Aggregated user-level performance metrics (legacy, kept for safety)
- **`v_listing_status`** — Computed listing status (NEW/ANALYZED/SEO_READY/DRAFT_READY/OPTIMIZED) from actual data
- **`v_dashboard_status_counts`** — Aggregated status counts per user (used by Dashboard)
- **`v_dashboard_listings`** — Individual listings with computed status and action priority (used by Dashboard)
- **`v_dashboard_trending`** — Trending/promising keywords across user's listings (used by Dashboard)
- **`v_user_seo_active_settings`** — View returning resolved user settings for API payloads

### Listing Status Flow
Listings progress through statuses tracked by UUID:
- `NEW` (ac083a90...) → `SEO_DONE` (35660e24...) → `COMPLETE` (28a11ca0...)

### Environment Variables
```
# Frontend (VITE_ prefix — exposed to browser)
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anonymous key
VITE_N8N_WEBHOOK_URL_TEST  # n8n webhook endpoint (for remaining n8n actions)

# Server-side only (used by server.mjs and edge functions)
SUPABASE_SERVICE_ROLE_KEY  # Admin Supabase key (bypasses RLS)
GOOGLE_API_KEY             # Gemini API key (required)
ANTHROPIC_API_KEY          # Anthropic API key (optional — needed if tasks assigned to Anthropic)
OPENAI_API_KEY             # OpenAI API key (optional — needed if tasks assigned to OpenAI)
DATAFORSEO_LOGIN           # DataForSEO API login
DATAFORSEO_PASSWORD        # DataForSEO API password
N8N_WEBHOOK_SECRET         # Shared secret for edge function auth (x-api-key header)
RESEND_API_KEY             # Resend API key (transactional emails)
VITE_SENTRY_DSN            # Sentry DSN (frontend + backend error monitoring)
API_PORT                   # Express server port (defaults to 3001)
```

## Style Guide

- **Primary color**: Indigo 600 (`#4f46e5`)
- **Background**: Slate 50 (`#f8fafc`), cards are white with `border-slate-200`
- **SEO color coding**: Green (low competition / high score), Amber (medium), Rose (high competition / low score)
- **Icons**: Lucide React only, `stroke-width={2}`, default color `text-slate-500`. (e.g., Star for Favorite, Pin for pinning, Award for Promising, Flame for Trending, Leaf for Evergreen, Target for Sniper)
- **Spacing**: Generous padding (`p-8`, `gap-6`), SaaS premium feel
- **Buttons**: `rounded-lg` or `rounded-xl`
- **Inputs**: `bg-white` with `ring-2 ring-indigo-500` on focus
- Dark mode is configured (`darkMode: ["class"]`) but not actively used
- Layout uses a fixed 256px left sidebar (`w-64`, `ml-64` for main content)

## Conventions

- All components are JSX (not TSX); `types/definitions.ts` exists for shared TypeScript interfaces used by backend code
- Pages import `Layout` which provides Sidebar + main content area
- Protected routes wrap content with `ProtectedRoute` (redirects to `/login` if unauthenticated)
- Supabase queries are made directly in page components (no abstraction layer)
- Frontend calls `/api/seo/*` endpoints — in dev these are proxied to Express via Vite; in production they hit Vercel serverless functions directly
- n8n webhook URL accessed via `import.meta.env.VITE_N8N_WEBHOOK_URL_TEST` — `analyseShop` in BrandProfilePage (currently hidden)
- Node polyfills are enabled for buffer/process/util/stream (needed by @react-pdf/renderer)
- The style guide document (`docs/styleguide.md`) is written in French
- `tests/` contains test files; `pennyseo-audit.mjs` at root runs the codebase audit
