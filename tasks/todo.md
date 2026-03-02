# 📝 Project Tasks & Execution Plan

## Goal
Build the `UserSettings.jsx` page (Personal SEO Optimizer) to allow users to customize their SEO scoring weights, badge thresholds, and general pool parameters.

## Plan

- [x] **1. Create `src/pages/UserSettings.jsx` Component**
  - Implement layout with a main content area (forms) and a sidebar ("Current Live Values").
  - Fetch `system_seo_constants`, `user_settings`, and `v_user_seo_active_settings` on mount.
  - Implement **A. Strategy Weights** section with Segmented Controls for Market Reach (Volume), Ranking Ease (Competition), Buyer Intent (Transaction), Niche Specificity (Niche), and Market Value (CPC).
  - Implement **B. Smart Badge Sensitivity** section with Segmented Controls for Evergreen Stability, Trending Growth, and Promising Ratio.
  - Implement **C. General Analysis Settings** section with numeric inputs for AI Selection Count, Working Pool Size, and Concept Diversity. Add "Premium" styling/Crown icon.
  - Create the `handleSave` function to update the user's choices into the `user_settings` table.
  - Wire up the Sidebar to display live values from `v_user_seo_active_settings`.

- [x] **2. Register Route in `src/App.jsx`**
  - Import the new `UserSettings` page component.
  - Add the `/settings` route wrapped in the `<ProtectedRoute>`. (The Sidebar already has the link pointing to `/settings`).

- [x] **3. Review and Cleanup**
  - Ensure the styling matches the B2B SaaS aesthetics (Indigo-600, Slate-50, Lucide icons).
  - Test the state updates and saving logic.
  - Check responsive behavior.

## Review (Pending)
- [x] Add summary of changes here once complete.

**Summary**: 
- Created `UserSettings.jsx` allowing users to configure their SEO Weights, Smart Badge Thresholds, and General Analysis bounds. 
- Mapped segmented buttons to `system_seo_constants` and numeric inputs to the premium `user_settings` fields. 
- Integrated the `/settings` route into `App.jsx`.
- Styled according to the strict Indigo/Slate design language using Shadcn-inspired Tailwind.
