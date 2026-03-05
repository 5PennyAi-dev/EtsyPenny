# Add Smart Badges Parameters to Webhooks

## 1. Goal
Add 7 new parameters to the `generate_seo` and `resetPool` payloads in `ProductStudio.jsx` so that n8n can process the new badge algorithms correctly.

### The Parameters:
- `evergreen_stability_ratio`
- `evergreen_minimum_volume`
- `evergreen_avg_volume`
- `trending_dropping_threshold` (mapped from trending_dropping)
- `trending_current_month_min_volume` (mapped from trending_current_month_min)
- `promising_min_score`
- `promising_competition`

## 2. Checklist
- [x] Write Execution Plan
- [x] Update `handleAnalyze` (`generate_seo` action) payload parameters.
- [x] Update `handleResetPool` (`resetPool` action) payload parameters.
- [x] Update `handleApplyStrategy` (`resetPool` action with overrides) payload parameters.
- [x] Create a helper function in `ProductStudio.jsx` to easily extract and format these 7 values from `userDefaults` to avoid repeating the code block three times.
- [x] Document in `context.md`
