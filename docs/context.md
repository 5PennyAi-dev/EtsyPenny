# 🧠 Project Context: EtsyPenny (5PennyAi)
*Dernière mise à jour : 2026-02-09*

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

## 5. Next Steps (Action Items)
- Polish the Login/Signup UI.
- Implement the comprehensive Landing Page.
- Build the Stripe Payment Integration (Credits & Subscriptions).
