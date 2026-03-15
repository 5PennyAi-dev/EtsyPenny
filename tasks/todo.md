
## 📝 Tasks: Backend Reliability & Display Normalization

### Phase 4: Backend Reliability (`save-seo` Edge Function)
- [x] Fix payload array parsing to correctly handle n8n batching format.
- [x] Replace hardcoded test webhook URLs with production environment variable `N8N_WEBHOOK_URL_RESET_POOL`.
- [x] Refactor results validation to allow plain objects (fixing broken `Array.isArray` check).
- [x] Move `resetPool` trigger entirely to the backend to ensure it fires even if the browser is closed.

### Phase 5: UI Display Normalization (`ResultsDisplay.jsx`)
- [x] Implement `< 10` display for low-volume keywords to avoid misleading "0" values.
- [x] Neutralize trend display (show `—`) for keywords with volume < 10 to avoid irrelevant "-100%" red alerts.
- [x] Standardize Competition and CPC columns: show `N/A` or `—` for low-volume or missing data.
- [x] Implement high-volume outlier cap: show `> 1M` for keywords over 1 million searches.
- [x] Apply visual hierarchy: reduced opacity for low-volume rows to emphasize high-value keywords.

### Phase 6: Sync & Polish
- [x] Remove redundant "PRESET" badge from `SEOLab.jsx`.
- [x] Update `docs/context.md` with session developments.
- [/] Commit and Push all changes to the repository.

## Review
- **Unified Selectors**: Themes and Niches now query unified views, displaying user-custom items at the top with grouped categorization.
- **Backend Reliability**: The `save-seo` function now orchestrates the `resetPool` trigger. This guarantees that the keyword pool is refreshed after analysis even if the user navigates away or closes the browser.
- **Data Normalization**: The Keyword Performance table now handles statistical edge cases gracefully. Extremely low-volume keywords are de-emphasized and normalized (capped at `< 10`), while massive outliers are capped at `> 1M` to maintain tool credibility.
- **UI Polish**: Cleaned up the SEO Lab by removing redundant badges and improving table legibility via opacity rules.
- **Tech Stack**: Modifications strictly followed React, Vite, Tailwind, and Supabase standards.

