# Smart Sorting & Selection Logic for Keyword Table

## Implementation
- [x] **Sorting Logic**: Refactored `sortedAnalytics` useMemo to apply dual-level sort (selected first, then by active sort column)
- [x] **Show More / Show All**: Added `showAll` state; collapsed = show max(13, selectedCount) rows; expanded = all rows
- [x] **Visual Divider**: Injected "Suggestions & Discovery" label row between selected and unselected groups
- [x] **Visual Distinction**: `bg-indigo-50/40` for selected rows, `opacity-60` for unselected
- [x] **Framer Motion Animations**: Added `motion.tr` with `layout` + `AnimatePresence` for smooth reordering
- [x] **Cleanup**: No dead code. Added missing `React` import for `React.Fragment`.

## Verification
- [x] Build compiles — `vite build` exit code 0, zero errors
- [ ] Load a listing with SEO data — verify selected keywords pin to top
- [ ] Toggle a keyword checkbox — verify it moves to/from the selected group with animation
- [ ] Verify "Show More / Show All" expands and collapses correctly
- [ ] Verify collapsed view always shows all selected keywords (even if > 13)
- [ ] Verify column sorting still works within each group

## Review
- [ ] Update `docs/context.md`
