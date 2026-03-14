# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EtsyPenny (PennySEO)** is an AI-powered SEO SaaS for Etsy sellers. Users upload product mockup images, the app analyzes them via AI, generates optimized titles/descriptions/tags, and provides SEO scoring across multiple strategy modes (broad, balanced, sniper). The frontend is React; the AI/SEO pipeline runs through n8n webhooks; data persists in Supabase.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build (vite build)
npm run lint      # ESLint (js,jsx, --max-warnings 0)
npm run preview   # Preview production build
```

## Architecture

### Tech Stack
- **React 19** + **Vite 5** (JSX, no TypeScript in components)
- **Tailwind CSS 3** with shadcn/ui-style HSL CSS variables
- **Supabase** for auth, database, storage (mockups_bucket), and realtime subscriptions
- **n8n** webhooks for AI pipeline orchestration (image analysis, SEO generation, score recalculation)
- **Zustand** available but primarily used in PDF component; most state is local React state
- **Framer Motion** for animations
- **Sonner** for toast notifications
- **Axios** for n8n webhook calls
- **Lucide React** for all icons (never use other icon libraries)

### Path Alias
`@` maps to `./src` (configured in vite.config.js)

### Key Directories
- `src/pages/` — Full page components (ProductStudio (SEO Listings), Dashboard, HistoryPage, BrandProfilePage, LoginPage, AdminSystemPage, UserSettings)
- `src/components/studio/` — SEO Listings sub-components (OptimizationForm, ResultsDisplay, ImageUpload, StrategyTuner, FavoritesPickerModal, CreatePresetModal, SeoBadge, etc.)
- `src/components/dashboard/` — Dashboard widgets (PerformanceCard, MarketInsights, RadialGauge)
- `src/components/admin/` — Admin panel components (TaxonomyManagement — system themes/niches CRUD)
- `src/components/settings/` — User settings components (UserTaxonomyManagement — custom themes/niches CRUD)
- `src/components/ui/` — Reusable UI primitives (Accordion, ConfirmationModal, SearchableSelect)
- `src/components/pdf/` — PDF export (ListingPDFDocument using @react-pdf/renderer)
- `src/context/AuthContext.jsx` — Auth provider wrapping the app (provides user, profile, signOut, loading)
- `src/lib/supabase.js` — Supabase client singleton
- `supabase/functions/save-seo/` — Deno edge function called by n8n to persist SEO results
- `supabase/functions/check-keyword-cache/` — Deno edge function to check for cached keyword data before calling external APIs
- `supabase/migrations/` — SQL migration files
- `tasks/` — Task tracking and migration scripts
- `docs/styleguide.md` — Visual design spec (in French)
- `.agent/personas.md` — AI assistant persona definitions for this project

### Data Flow
1. **Image Upload**: User uploads mockup -> stored in Supabase `mockups_bucket` -> listing row created in `listings` table
2. **AI Analysis**: Frontend POSTs to n8n webhook (`VITE_N8N_WEBHOOK_URL_TEST`) with listing_id + context. The payload includes Smart Badge thresholds mapped from `v_user_seo_active_settings` -> n8n runs AI pipeline
3. **Results Persistence**: n8n calls Supabase edge function `save-seo` (secured via `x-api-key` header) -> upserts into `listings_global_eval` and `listing_seo_stats`
4. **Data Hydration**: Initial data hydration occurs in `handleLoadListing` when a listing is selected.
5. **Manual Overrides**: Manual user overrides for Conv. Intent and Relevance are handled via the interactive `SeoBadge` dropdowns, which trigger `handleScoreUpdate` to immediately sync with the `listing_seo_stats` database table and update local component state.
6. **Component Communication**: `ProductStudio.jsx` passes state and callbacks to `ResultsDisplay.jsx` as props.
7. **Realtime Updates**: ProductStudio subscribes to Supabase realtime on the `listings` table to detect when n8n processing completes
8. **Display**: ResultsDisplay shows SEO scores, keywords, and strategy comparisons across broad/balanced/sniper modes
9. **Smart Badges**: Users update global settings in `UserSettings.jsx` which multi-saves related IDs from `system_seo_constants` to `user_settings`. These settings feed the n8n webhook via `v_user_seo_active_settings`.

### Supabase Tables & Views
- **`listings`** — Core table: image_url, generated_title, generated_description, visual analysis fields, status_id, product categorization
- **`listings_global_eval`** — Per-mode SEO evaluation scores (visibility, relevance, conversion, strength) keyed by listing_id + seo_mode
- **`listing_seo_stats`** — Individual keyword/tag metrics (search_volume, competition, opportunity_score, trending/evergreen flags)
- **`user_keyword_bank`** — User's saved favorite keywords with cached metrics (tag, last_volume, last_competition, last_cpc, theme, niche)
- **`keyword_presets`** — Named keyword groupings (title, theme, niche, sub_niche, keyword_ids[] referencing user_keyword_bank). Used by CreatePresetModal and FavoritesPickerModal Presets tab.
- **`user_settings`** — User preferences including Smart Badge thresholds (trending_growth_factor_id, trending_dropping_id, trending_current_month_min_id, evergreen_stability_ratio_id, etc.) and gem settings (gem_min_volume, etc.)
- **`system_seo_constants`** — System-wide SEO constants and labels used for rendering UI dropdowns and calculating thresholds
- **`system_themes`** / **`system_niches`** — Global taxonomy (admin-managed). Columns: id, name, is_active, description, created_at
- **`user_custom_themes`** / **`user_custom_niches`** — Per-user custom taxonomy. Columns: id, user_id, name, is_favorite, description, created_at. RLS enabled with user_id-scoped policies.
- **`profiles`** — User profiles (fetched in AuthContext)
- **`product_types`** — Product categorization lookup
- **`view_listing_scores`** — Aggregated view joining listings with their scores
- **`view_user_performance_stats`** — Aggregated user-level performance metrics
- **`v_user_seo_active_settings`** — View returning active user settings mapped to specific target variable names for webhooks

### SEO Modes
The app operates with three strategy modes, each producing its own set of keywords and global evaluation:
- **broad** — Wide reach, high volume keywords
- **balanced** — Default mode, mix of volume and relevance
- **sniper** — Niche-specific, low competition keywords

### Listing Status Flow
Listings progress through statuses tracked by UUID:
- `NEW` (ac083a90...) -> `SEO_DONE` (35660e24...) -> `COMPLETE` (28a11ca0...)

### Environment Variables
```
VITE_SUPABASE_URL        # Supabase project URL
VITE_SUPABASE_ANON_KEY   # Supabase anonymous key
VITE_N8N_WEBHOOK_URL_TEST # n8n webhook endpoint
```

## Style Guide

- **Primary color**: Indigo 600 (`#4f46e5`)
- **Background**: Slate 50 (`#f8fafc`), cards are white with `border-slate-200`
- **SEO color coding**: Green (low competition), Amber (medium), Rose (high)
- **Icons**: Lucide React only, `stroke-width={2}`, default color `text-slate-500`. (e.g., Star for Favorite, Pin for pinning, Award for Promising, Flame for Trending, Leaf for Evergreen)
- **Spacing**: Generous padding (`p-8`, `gap-6`), SaaS premium feel
- **Buttons**: `rounded-lg` or `rounded-xl`
- **Inputs**: `bg-white` with `ring-2 ring-indigo-500` on focus
- Dark mode is configured (`darkMode: ["class"]`) but not actively used
- Layout uses a fixed 256px left sidebar (`w-64`, `ml-64` for main content)

## Conventions

- All components are JSX (not TSX), though `types.ts` exists at root for reference types
- Pages import `Layout` which provides Sidebar + main content area
- Protected routes wrap content with `ProtectedRoute` (redirects to `/login` if unauthenticated)
- Supabase queries are made directly in page components (no abstraction layer)
- n8n webhook URL is accessed via `import.meta.env.VITE_N8N_WEBHOOK_URL_TEST` with hardcoded fallback
- Node polyfills are enabled for buffer/process/util/stream (needed by @react-pdf/renderer)
- The style guide document (`docs/styleguide.md`) is written in French
