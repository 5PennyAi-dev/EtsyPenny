# Task: Implement SEO Sniper Trigger & Logic

## Phase 1: State & Handler (ProductStudio.jsx)
- [ ] Add `isSniperLoading` state variable
- [ ] Create `handleSEOSniper` async function (builds payload like `drafting_seo` + visual analysis, POSTs to `VITE_N8N_SNIPER_WEBHOOK_URL`)
- [ ] Pass `handleSEOSniper` and `isSniperLoading` as props to `ResultsDisplay`

## Phase 2: UI Button (ResultsDisplay.jsx)
- [ ] Accept `onSEOSniper` and `isSniperLoading` props
- [ ] Add Sniper button inside the `AuditHeader` section (next to the gauge)
- [ ] Style: Indigo gradient, pulse animation, Target icon
- [ ] Loading state: spinner + "Analyse Sniper en cours..."

## Phase 3: Cleanup & Context
- [ ] Update `docs/context.md` with new feature entry
- [ ] Remove any debug logs

## Review
- [ ] Summary of changes and next steps
