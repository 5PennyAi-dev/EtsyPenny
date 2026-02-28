# History Page: Add Metric Columns

## Implementation
- [x] Add 6 new metric columns: Visibility, Visibility Index, Relevance, Conversion, Competition, Market Index
- [x] Create `MetricCell` helper component with color-coded display (green ≥80, amber 50-79, gray <50; inverted for Competition)
- [x] Update table header with compact column widths
- [x] Update colSpan from 7 to 13
- [x] Verify build compiles

## Review
- [x] Update `docs/context.md`

# History Page: Layout & Sorting Polish (2026-02-27)

## Implementation
- [x] Fixed double scrollbar: outer wrapper is now `h-screen flex flex-col overflow-hidden` — no browser-level scroll
- [x] Pagination footer always visible (anchored at card bottom, never hidden off-screen)
- [x] Sticky `<thead>` so column headers stay visible when scrolling through rows
- [x] Column sorting: `SortableHeader` component with `ChevronUp/Down/ChevronsUpDown` icons
- [x] Atomic sort state (`{ column, direction }`) via single `setSort(prev => ...)` — eliminates stale-closure race condition
- [x] Smart sort defaults: numeric columns default desc (highest first), text/date default asc
- [x] Deduplicate listings by `listing_id` after fetch (view returns one row per SEO mode)
- [x] Width constrained to 85% of available area (`w-[85%] mx-auto`)
- [x] Default page size reduced to 15 rows to avoid table scrolling at typical viewport heights
