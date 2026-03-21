# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Rules
Follow all rules defined in `.agent/rules/rules.md` — read this file at the start of every session.

## Project Context
Read `docs/context.md` at the start of every session to understand the full project history, architecture decisions, and current state.

## Project Overview

**PennySEO** (formerly EtsyPenny / 5PennyAi) is an AI-powered SEO SaaS for Etsy sellers. Users upload product mockup images, the app analyzes them via Gemini Vision AI, generates optimized titles/descriptions/tags, and provides SEO scoring across multiple strategy modes (broad, balanced, sniper). The frontend is React (Vite); the AI/SEO pipeline runs through a local Express API server; data persists in Supabase.

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
- **Local Express API** (`server.mjs`, port 3001) — primary AI/SEO pipeline using Gemini 2.0 Flash + DataForSEO
- **n8n** webhooks — still used for drafting, score recalculation, insight generation, and shop analysis
- **Google Generative AI** (Gemini 2.0 Flash) for vision analysis and keyword scoring
- **DataForSEO** API for keyword enrichment (search volume, competition, CPC, volume history)
- **Zustand** available but primarily used in PDF component; most state is local React state
- **Framer Motion** for animations
- **Sonner** for toast notifications
- **Axios** for API calls
- **Lucide React** for all icons (never use other icon libraries)

### Path Alias
`@` maps to `./src` (configured in vite.config.js)

### Key Directories
- `src/pages/` — Full page components (ProductStudio, Dashboard, HistoryPage, BrandProfilePage, LoginPage, AdminSystemPage, UserSettings, SEOLab, LandingPage)
- `src/components/studio/` — SEO Listings sub-components (OptimizationForm, ResultsDisplay, ImageUpload, StrategyTuner, FavoritesPickerModal, CreatePresetModal, SeoBadge, ProductTypeCombobox, etc.)
- `src/components/dashboard/` — Dashboard widgets (PerformanceCard, MarketInsights, RadialGauge, SemiCircleGauge)
- `src/components/admin/` — Admin panel components (TaxonomyManagement, ProductTypeManagement)
- `src/components/settings/` — User settings components (UserTaxonomyManagement — custom themes/niches CRUD)
- `src/components/ui/` — Reusable UI primitives (Accordion, ConfirmationModal, SearchableSelect)
- `src/components/pdf/` — PDF export (ListingPDFDocument using @react-pdf/renderer)
- `src/context/AuthContext.jsx` — Auth provider wrapping the app (provides user, profile, signOut, loading)
- `src/lib/supabase.js` — Supabase client singleton
- `server.mjs` — Local Express API server (primary backend)
- `lib/seo/` — Shared backend logic: `niche-scoring.ts`, `transactional-scoring.ts`, `filter-logic.ts`
- `lib/ai/gemini.ts` — Gemini API wrapper
- `lib/supabase/server.ts` — Server-side Supabase admin client
- `app/api/seo/` — Legacy Next.js API routes (being migrated to server.mjs, do not use)
- `supabase/functions/save-seo/` — Deno edge function to persist SEO results
- `supabase/functions/save-image-analysis/` — Deno edge function to persist image analysis
- `supabase/functions/check-keyword-cache/` — Deno edge function for keyword cache lookup
- `supabase/migrations/` — SQL migration files
- `tasks/` — Task tracking (`todo.md`) and migration scripts
- `docs/styleguide.md` — Visual design spec (in French)
- `docs/context.md` — Living project history and session handover document
- `.agent/personas.md` — AI assistant persona definitions for this project
- `types/definitions.ts` — TypeScript interfaces for API payloads and data structures

### Local Express API Server (`server.mjs`)

The primary backend, running on port 3001. Vite proxies `/api/*` requests to it automatically.

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

**Key helper functions in server.mjs:**
- `runVisionModel()` / `runTextModel()` — Gemini API wrappers
- `enrichKeywords()` — Cache check + DataForSEO API enrichment
- `scoreKeywords()` — Batch niche + transactional scoring via Gemini
- `selectAndScore()` — Composite scoring, top-N selection, strength breakdown
- `persistStrength()` — Shared DB persistence for strength scores (used by reset-pool + recalculate-scores)
- `applySEOFilter()` — Opportunity scores, trending/evergreen flags, pool ranking

### n8n Webhooks (Still Active)

This action still uses the n8n webhook (`VITE_N8N_WEBHOOK_URL_TEST`):
- **`analyseShop`** — Auto-fill brand profile from Etsy shop URL

### Data Flow
1. **Image Upload**: User uploads mockup → stored in Supabase `mockups_bucket` → listing row created in `listings` table
2. **Visual Analysis**: Frontend POSTs to `/api/seo/analyze-image` → Gemini Vision extracts visual DNA → Gemini Text maps to taxonomy (theme/niche) → `save-image-analysis` edge function persists results
3. **SEO Generation**: Frontend POSTs to `/api/seo/generate-keywords` → 5 parallel Gemini calls generate keywords → DataForSEO enriches with metrics → AI scores each keyword → `save-seo` edge function persists to `listings_global_eval` + `listing_seo_stats` → sets status to `SEO_DONE`
4. **Pool Reset**: After SEO generation, `/api/seo/reset-pool` re-ranks keywords using user strategy weights + smart badge thresholds
5. **Data Hydration**: `handleLoadListing` in ProductStudio fetches listing + keywords + evaluations from DB when a listing is selected
6. **Manual Overrides**: Conv. Intent and Relevance overrides via interactive `SeoBadge` dropdowns → `handleScoreUpdate` syncs to `listing_seo_stats`
7. **Component Communication**: `ProductStudio.jsx` passes state and callbacks to `ResultsDisplay.jsx` as props
8. **Realtime Updates**: ProductStudio subscribes to Supabase realtime on `listings` table to detect when image analysis completes
9. **Display**: ResultsDisplay shows SEO scores, keywords, and strategy comparisons across broad/balanced/sniper modes
10. **Smart Badges**: User settings from `UserSettings.jsx` feed all API payloads via `v_user_seo_active_settings`

### Supabase Tables & Views
- **`listings`** — Core table: image_url, generated_title, generated_description, visual analysis fields, status_id, theme, niche, sub_niche, is_generating_seo, is_image_analysed
- **`listings_global_eval`** — Per-mode SEO evaluation scores (listing_strength, visibility, relevance, conversion, competition, profit) keyed by listing_id + seo_mode
- **`listing_seo_stats`** — Individual keyword metrics (tag, search_volume, competition, cpc, opportunity_score, niche_score, transactional_score, is_selection_ia, is_current_pool, is_current_eval, is_pinned, is_user_added, is_competition, volume_history)
- **`user_keyword_bank`** — User's saved favorite keywords with cached metrics
- **`keyword_presets`** — Named keyword groupings (keyword_ids[] referencing user_keyword_bank)
- **`user_settings`** — User preferences including Smart Badge thresholds and gem settings
- **`system_seo_constants`** — System-wide SEO constants and labels
- **`system_themes`** / **`system_niches`** — Global taxonomy (admin-managed)
- **`user_custom_themes`** / **`user_custom_niches`** — Per-user custom taxonomy (RLS enabled)
- **`user_custom_product_types`** — Per-user custom product types (RLS enabled)
- **`profiles`** — User profiles (fetched in AuthContext)
- **`product_types`** — System product categorization lookup
- **`v_combined_product_types`** — Union view of system + user custom product types
- **`v_combined_themes`** / **`v_combined_niches`** — Union views of system + user taxonomy
- **`listings_global_info`** — View joining listings, statuses, and evaluations (used by HistoryPage)
- **`view_user_performance_stats`** — Aggregated user-level performance metrics (used by Dashboard)
- **`v_user_seo_active_settings`** — View returning resolved user settings for API payloads

### SEO Modes
The app operates with three strategy modes, each producing its own set of keywords and global evaluation:
- **broad** — Wide reach, high volume keywords
- **balanced** — Default mode, mix of volume and relevance
- **sniper** — Niche-specific, low competition keywords

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
GOOGLE_API_KEY             # Gemini API key
DATAFORSEO_LOGIN           # DataForSEO API login
DATAFORSEO_PASSWORD        # DataForSEO API password
N8N_WEBHOOK_SECRET         # Shared secret for edge function auth (x-api-key header)
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
- Frontend calls local `/api/seo/*` endpoints (proxied to Express via Vite); n8n webhook URL accessed via `import.meta.env.VITE_N8N_WEBHOOK_URL_TEST` for remaining actions
- Node polyfills are enabled for buffer/process/util/stream (needed by @react-pdf/renderer)
- The style guide document (`docs/styleguide.md`) is written in French
- `app/api/seo/` contains legacy Next.js routes — do not use; all active backend logic lives in `server.mjs`
