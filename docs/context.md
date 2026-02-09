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
- [Initialisation] Project structure scaffolded.
- [Initialisation] Tech stack dependencies installed (React, Tailwind, Supabase).
- [Initialisation] Agent rules and personas defined in `.agent/`.
- [Initialisation] Tailwind theme configured with the 5PennyAi palette.

## 5. Next Steps (Action Items)
- Implement the Landing Page (based on the approved mockups).
- Setup the Supabase connection and Auth provider.
- Create the main Dashboard layout for authenticated users.
