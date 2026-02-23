# Implementation Plan: Smart Sorting & Selection Logic

## Objective
Implement "Pin & Sort" logic for the keyword table so selected keywords are pinned to the top, adjusting the pagination to show automatically all selected ones or at least 13.

## Proposed Changes
1. **Sorting Algorithm (`ResultsDisplay.jsx`)**:
   - Update `sortedAnalytics` `useMemo`.
   - First sort by whether the `keyword` is in `selectedTags`.
   - Then sort by the current `sortConfig` (e.g., score, volume).

2. **Expansion Management**:
   - The collapsed view default count should be `Math.max(13, selectedTags.length)`.
   - If `sortedAnalytics.length <= Math.max(13, selectedTags.length)`, the table is effectively fully expanded.

3. **UI/UX Enhancements**:
   - **Visual Distinction**: Improve the row styling. Currently unselected rows are `opacity-50 grayscale`. We might want to remove the harsh grayscale and instead give selected rows a subtle `bg-indigo-50/30` and unselected rows a normal background or slight dimming, providing a "Active Selection" vs "Discovery" feel.
   - **Horizontal Dividers**: When rendering the rows, detect the boundary between selected and unselected items. If there is a transition from selected to unselected, insert a special `<tr>` or visual border that says "Suggestions" or "Discovery Pool".
   - **Animations**: Will check if `framer-motion` is available to use `<motion.tr layout>` for smooth reordering. Otherwise, rely on immediate React rendering.

## Verification
- [x] Test selecting a keyword far down the list to see it pop to the top.
- [x] Test unselecting a keyword to see it drop below the divider.
- [x] Ensure the table shows all selected keywords even if > 13 when collapsed.

## Review (2026-02-23)
- Successfully deployed the `sortedAnalytics` dual-tier "Pin & Sort" hierarchy logic.
- Implemented `framer-motion` layout animations across `<motion.tbody>` and nested `<motion.tr>`.
- Deployed a dynamically positioned "Suggestions & Discovery" visualization boundary inside the mapping loops.
- Overhauled and stabilized trailing syntax mapping `')' expected.` JSX parenthesis errors nested deep inside `ResultsDisplay.jsx` tree layout styling logic.
- Verified successful module mapping via ` Vite ` Native Builds returning `0` syntactical failures.
