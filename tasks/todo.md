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

- [/] Phase 4: N8N Integration & Polish
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
    - [x] Implement "Export to PDF" feature (Studio & History).
        - [x] Polish PDF Report (Layout, Icons, Legend).
    - [ ] Polish Login/Signup UI.
    - [ ] Build Landing Page.
- [x] Phase 5: Brand Profile
    - [x] Update Database Schema
    - [x] Create BrandProfilePage
    - [x] Update App Routing
    - [x] Integrate with ProductStudio

- [x] Feature: Shop Analysis Webhook
    - [x] Add Env Variables (VITE_N8N_WEBHOOK_URL_PROD, VITE_N8N_WEBHOOK_URL_TEST)
    - [x] Integrate N8N Response Data

- [x] Fix: SEO Webhook Call
    - [x] Replace hardcoded URLs in `ProductStudio.jsx`
    - [x] Add error logging

- [x] Feature: Relaunch Capabilities
    - [x] Implement `handleRelaunchSEO` in `ProductStudio.jsx`
    - [x] Add "Regenerate Draft" logic in `ProductStudio.jsx`
    - [x] Add "Relaunch" buttons in `ResultsDisplay.jsx`
    - [x] UI: Make Relaunch buttons more obvious (Labels + Styling)
    - [x] Bugfix: Relaunch button inactivity (missing prop)
    - [x] Bugfix: Image validation, Modal UI, and Draft logic fixes
    
- [x] Feature: Form Data Persistence
    - [x] Refactor `OptimizationForm.jsx` (initialValues + reset logic)
    - [x] Integrate with `ProductStudio.jsx`

- [x] UI Refinements (Text Fields)
    - [x] Auto-expand text inputs (bio, audience, signature)

- [x] UI Refinements (Brand Tone)
    - [x] Change `brand_tone` to text input

- [x] Feature: Verify Shop Context in Payloads
    - [x] Confirm `generate_seo` payload includes `shop_context`
    - [x] Confirm `drafting_seo` payload includes `shop_context`

- [x] UI Refinements (Brand Profile)
    - [x] Disable Save Button when clean
    - [x] Update Save Button Color (Indigo)
    - [x] Replace Alert with Toast

- [x] Hotfixes
    - [x] Fix Missing Dependency (sonner)

- [x] Phase 6: Save Listing Feature & Schema Cleanup
    - [x] Database: Migrate to `status_id` (UUID) and drop legacy `status` column.
    - [x] Database: Update Views (`view_listing_scores`, `view_listing_dashboard`, `view_dashboard_summary`) to use `listing_statuses`.
    - [x] Feature: "Save Draft" in Product Studio (Save without running SEO).
    - [x] UI: Update Dashboard Listing Badges to reflect new status names.
    - [x] Code: Refactor `ProductStudio` and `Dashboard` to use status UUIDs.

## Review for Phase 6
- **Schema Refactor**: The `listings.status` text column has been successfully dropped. All views now join with `listing_statuses` to retrieve the status name. This ensures data consistency with the UUID foreign key.
- **Save Draft**: Users can now save a draft with an image and basic details without consuming credits or running the full analysis. Status is set to 'New'.
- **Dashboard**: Badges now correctly display 'New', 'SEO analysis completed', and 'Listing completed'.

