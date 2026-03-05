# Keyword Performance Table UI Upgrade Plan

## 1. Objective
Replace the raw numeric scales (e.g., "7/10") with visual badges (Pills) and educational tooltips to reduce cognitive load and provide immediate expert feedback for the "Conv. Intent" and "Relevance" columns in the Keyword Performance table.

## 2. Analysis
- **Niche Score (Relevance)** and **Transactional Score (Conv. Intent)** currently display as numeric values.
- They map to 4-tier discrete scales: 1, 4, 7, 10.
- `relevance`: 10 (Elite), 7 (Strong), 4 (Neutral), 1 (Broad)
- `intent`: 10 (High), 7 (Direct), 4 (Browsing), 1 (Informational)
- Will create a new Shadcn-compatible `SeoBadge` component or inline it using Tailwind. To perfectly integrate with Shadcn, we can use a custom component `SeoBadge` based on the provided code, but possibly leveraging Radix UI `Tooltip` or an existing tooltip component in the codebase.

## 3. Execution Plan
- [x] Implement `SeoBadge` component (e.g. `src/components/studio/SeoBadge.jsx` or inline in `ResultsDisplay.jsx`)
  - Will verify if `Tooltip` component from Shadcn exists to provide accessible tooltips over the native `title` attribute.
  - Apply the requested color mappings (Indigo, Emerald, Slate, Amber).
- [x] Update `ResultsDisplay.jsx`
  - Locate the rendering of "Conv. Intent" and "Relevance" in the Keyword Performance table.
  - Replace the text rendering with the new `SeoBadge` component.
- [x] Review & Cleanup
  - Keep it simple and consistent with the existing UI.
  - Update `docs/context.md` with the latest developments.

## 4. Interactive Score Editing Implementation Plan
- [x] Refactor `SeoBadge.jsx` to be interactive (`isEditing` state, `<select>` output).
- [x] Implement `handleScoreUpdate` in `ResultsDisplay.jsx` to handle Supabase DB updates.
- [x] Connect `onUpdate` prop on `SeoBadge` components rendering in the table rows.
- [x] Verify optimistic UI updates and backend syncing function as expected.
