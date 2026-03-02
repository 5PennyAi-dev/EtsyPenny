# Tasks: Auto-Resume SEO Loading Skeleton

[x] 1. **Database Schema Update**
    - Add a new boolean column `is_generating_seo` to the `public.listings` table (default: false).
    - This allows the frontend to distinguish between a listing that simply hasn't run SEO yet, and one that is actively being processed by n8n.

[x] 2. **Update Frontend (`ProductStudio.jsx`)**
    - Modify `handleAnalyze` to set `is_generating_seo: true` when sending the SEO payload to the database.
    - Modify `handleLoadListing` to check `if (listing.is_generating_seo)` instead of `if (listing.status_id === STATUS_IDS.NEW)`.
    - Allow the SEO realtime auto-resume hook to faithfully reflect the actual backend state.

[x] 3. **Update Edge Function (`save-seo`)**
    - Modify `supabase/functions/save-seo/index.ts` to set `is_generating_seo: false` when updating the listing status to `SEO_DONE`.
    - Deploy the updated edge function to the `cpzbipqceavfeoiqkenz` (EtsyPenny) environment.

[x] 4. **Testing & Verification**
    - Ensure that creating a new draft doesn't trigger the SEO skeleton.
    - Ensure that running SEO, leaving the page, and returning resumes the SEO skeleton.
    - Ensure the skeleton vanishes when SEO finishes.

---

# Tasks: Admin System Page - SEO Constants

[x] 1. **Create `AdminSystemPage.jsx` Component**
    - Create `src/pages/AdminSystemPage.jsx`.
    - Implement base layout using `<Layout>` wrapper and Tailwind dashboard aesthetic.
    - Add `// TODO: Wrap this page with Admin-only Role check.` comment.

[x] 2. **Implement Data Fetching & State**
    - Use `supabase.from('system_seo_constants').select('*')` to fetch all rows on mount.
    - Store data in local state.
    - Implement a `loading` state for the initial fetch.
    - Group the data logically into "SEO Strategy Weights" and "Intelligence Thresholds" based on the `category` column.
    - Sort data by `category`, `param_key`, then `value` ascending.

[x] 3. **Implement UI & Inline Editing**
    - Render two distinct sections (cards). Use `Settings2` and `Zap` icons from `lucide-react`.
    - Render rows with `param_key` and `label` as read-only.
    - Render `value` as an editable numeric input (float) when in edit mode.
    - Add "Edit", "Save", and "Cancel" buttons.
    - Highlight modified/unsaved rows.

[x] 4. **Implement Update Logic**
    - Create an update handler that uses `supabase.from('system_seo_constants').update({ value }).eq('id', id)`.
    - Show loading spinner during update.
    - Show success/error toast using `sonner`.

[x] 5. **Update Routing**
    - Add `<Route path="/admin/system" element={<ProtectedRoute><AdminSystemPage /></ProtectedRoute>} />` to `src/App.jsx`.

[x] 6. **Review & Finalize**
    - Ensure styling follows `docs/styleguide.md` (Indigo-600 primary, Slate-50 background).
    - Ensure components are clean and simple.
