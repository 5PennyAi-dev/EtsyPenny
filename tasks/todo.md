# Implementation Plan: Dashboard UI/UX Evolution

## Objective
The overarching goal is to transform the `AuditHeader` inside `ResultsDisplay.jsx` into a "Verdict + Proof" system. Wait, I'll write the detail.

## Proposed Changes
1. **`ResultsDisplay.jsx` - Refactor `<AuditHeader />` Component:**
   - [x] **Section A: The Verdict (Far Left)**
     - Width: Make this section span approximately 1/3 of the width (`md:w-1/3`).
     - Background: Subtle `bg-slate-50/50` to distinguish it.
     - Element: Implement a new `<RadialGauge />` sub-component using SVG circles (`<circle>` for background, `<circle strokeDasharray="..." strokeDashoffset="...">` for the value).
     - Focus: Display "Listing Strength" as a prominent, oversized gauge.
   
   - [x] **Section B: Technical Analysis (Center Grouping)**
     - Width: Span approximately 5/12 of the width (`md:w-5/12`).
     - Layout: Use `grid grid-cols-2 gap-x-6 gap-y-5` to create a compact 2x2 grid.
     - Elements: Use the existing slim `MiniGauge` elements for Visibility, Relevance, Conversion, and Competition to serve as "Proof".

   - [x] **Section C: Business Potential (Far Right)**
     - Width: Span remainder (`md:w-1/4`).
     - Layout: Flex column, centered.
     - Element: Instead of a `MiniGauge`, implement a `<ProfitabilityRating />` using 5 `DollarSign` icons, where the number of active/colored icons corresponds to the score (e.g., score/20). Display the numeric profit score underneath prominently.

## Verification
- [x] Load a listing that has SEO data.
- [x] Verify that standard CSS rendering handles the 3 distinct columns correctly in Desktop mode.
- [x] Verify mobile responsiveness (`flow-root` / `flex-col` handling).
- [x] Verify the radial gauge mathematically represents the correct percentage.
- [x] Review visual aesthetics against the overarching "Premium" requirement of this tool.
