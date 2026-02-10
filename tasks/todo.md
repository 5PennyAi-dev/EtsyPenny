# EtsyPenny Implementation Plan

- [x] Phase 1: Project Setup
    - [x] Initialize Vite Project Structure
    - [x] Configure Tailwind CSS (Indigo-600 / Slate-50)

- [x] Phase 2: Product Studio UI (Current Focus)
    - [x] **Scaffold Layout Components**
        - Create `Sidebar.jsx`: Navigation & Profile.
        - Create `Layout.jsx`: Combines Sidebar and Main Content area.
    - [x] **Product Studio Page (`/studio`)**
        - Create `ProductStudio.jsx`.
        - Implement Header (Breadcrumbs + Credits).
    - [x] **Input Section (Generator)**
        - Create `ImageUpload.jsx`: Drag & drop zone.
        - Create `OptimizationForm.jsx`: Niche, Type, Tone, Context.
        - **[x] Categorization Update**: Hierarchical Selects (Theme > Niche > Sub-niche) + Custom Input.
    - [x] **Results Section (ResultsDisplay)**
        - Create `ResultsDisplay.jsx`: Mock data visualization.
        - Implement Tags (Chips) and SEO Table.
    - [x] **State Management & Routing**
        - Toggle Results view on "Analyze" click.
        - Update `App.jsx` with routes.

- [x] Phase 3: Authentication & Logic
    - [x] Implementation of `AuthContext` and `useAuth` hook.
    - [x] Create `LoginPage` and SignUp functionality.
    - [x] Protect Routes with `ProtectedRoute` component.
    - [x] Database: `public.profiles` table and `auth.users` trigger.
    - [x] Manual Fix: Admin User Authentication Resolved.

- [x] Phase 3.5: Debugging & Stabilization
    - [x] Fix "White Screen" / Auth Hang (Race Condition in `auth.getSession`).
    - [x] Fix "Image Upload Spinning" (RLS Policies & Schema).
    - [x] Fix Database Schema (Added `status` and `title` columns).
    - [x] Verify End-to-End Analysis Workflow.

- [ ] Phase 4: N8N Integration & Polish
    - [ ] **Handle N8N Webhook Response**:
        - [ ] Create API Endpoint or Edge Function to receive N8N callback (or poll for logic).
        - [x] **Update Database Schema**:
            - [x] Add `volume_history` (int array), `is_top_tag`, `is_trending`, `is_evergreen`, `is_promising` (bools) to `listing_seo_stats`.
        - [x] Update `ProductStudio` to listen for completion.
        - [x] Populate `ResultsDisplay` with real data from DB including new metrics.
    - [x] Refine `ResultsDisplay` UI (Sparklines, Status Icons, 2-Column Layout).
    - [x] Refactor `ResultsDisplay` to Main + Sidebar layout.
    - [x] Implement `ProductStudio` state logic (SEO vs Drafting phases).
    - [x] Update `ResultsDisplay` sidebar states (Ready, Drafting, Editor).
    - [x] Update `OptimizationForm` to include Tone and Sub-niche.
    - [x] Implement `handleGenerateDraft` with real N8N webhook call.
    - [x] Fix CORS issues and standardize N8N payload schema.
    - [ ] Polish Login/Signup UI.
    - [ ] Build Landing Page.
