# PennySEO Codebase Audit Report v2
_Generated: 2026-03-21T19:40_
_Active code files: 57 | Legacy files: 0_


━━━ 1. N8N Dead References ━━━

Webhook URL references in active code:

  Legitimate (analyseShop + Edge Function auth):
  ℹ️  src\pages\BrandProfilePage.jsx:144 → const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TEST;
  ℹ️  .env:19 → VITE_N8N_WEBHOOK_URL_TEST=https://n8n.srv840060.hstgr.cloud/webhook/9d856f4f-d5ae-4fce-b2da-72f584288dc2
  ℹ️  .env:28 → N8N_WEBHOOK_SECRET=<REDACTED — Supabase secret key, see .env>

  Dead (should remove):
  ❌ api\seo\analyze-image.ts:182 → const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
  ❌ lib\seo\enrich-keywords.ts:24 → const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
  ❌ lib\seo\persist-seo.ts:37 → const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
  ❌ server.mjs:19 → const N8N_SECRET           = process.env.N8N_WEBHOOK_SECRET;

N8N action strings (excluding analyseShop):

━━━ 2. Multi-Mode Residue (broad/balanced/sniper) ━━━

seo_mode / activeMode references:
  ❌ lib\seo\persist-strength.ts:73 → seo_mode: 'balanced',
  ❌ server.mjs:786 → seo_mode: 'balanced',

Mode string literals:
  ⚠️  lib\seo\persist-strength.ts:73 → seo_mode: 'balanced',
  ⚠️  server.mjs:786 → seo_mode: 'balanced',

Multi-mode state:
  ✅ No multi-mode state arrays

━━━ 3. Unused Lucide Icon Imports ━━━
  ✅ All Lucide imports appear used

━━━ 4. Dead Files & Components ━━━

Legacy Next.js routes (app/api/seo/ — should be deleted):
  ✅ No legacy app/api/ directory found

Orphaned components:

Test files in production tree:
  ⚠️  Test file: tests\test-add-from-favorite.mjs
  ⚠️  Test file: tests\test-analyze-image.mjs
  ⚠️  Test file: tests\test-filter-logic.ts
  ⚠️  Test file: tests\test-generate-keywords.mjs
  ⚠️  Test file: tests\test-reset-pool.mjs
  ⚠️  Test file: tests\test-reset-pool.ts
  ⚠️  Test file: tests\test-seo-scoring.mjs

━━━ 5. Environment Variable Hygiene ━━━

Obsolete env vars (safe to remove):

Commented-out env lines:

Legitimate env vars (keep):
  ℹ️  VITE_N8N_WEBHOOK_URL_TEST — used by BrandProfilePage.jsx (analyseShop)
  ℹ️  N8N_WEBHOOK_SECRET — used by Supabase Edge Functions (save-seo, save-image-analysis)

━━━ 6. Code Hygiene (TODO/HACK/console.log) ━━━

TODO / HACK / FIXME:
  ⚠️  src\pages\AdminSystemPage.jsx:11 → // TODO: Wrap this page with Admin-only Role check. For now, focus on the functionality.

console.log statements:
  ⚠️  51 console.log statements total
     50 × server.mjs (dev-only)
     1 × lib\seo\enrich-keywords.ts 

━━━ 7. File Size Hotspots (>300 lines) ━━━
  ❌ 1944 lines — src\pages\ProductStudio.jsx (CRITICAL — needs splitting)
  ❌ 1554 lines — src\components\studio\ResultsDisplay.jsx (CRITICAL — needs splitting)
  ❌ 1552 lines — server.mjs (CRITICAL — needs splitting)
  ❌ 1505 lines — src\pages\SEOLab.jsx (CRITICAL — needs splitting)
  ⚠️  574 lines — src\components\pdf\ListingPDFDocument.jsx (consider splitting)
  ⚠️  545 lines — src\pages\AdminSystemPage.jsx (consider splitting)
  ⚠️  464 lines — src\components\admin\TaxonomyManagement.jsx
  ⚠️  457 lines — src\components\admin\ProductTypeManagement.jsx
  ⚠️  451 lines — src\pages\HistoryPage.jsx
  ⚠️  444 lines — src\components\settings\UserTaxonomyManagement.jsx
  ⚠️  409 lines — src\pages\UserSettings.jsx
  ⚠️  408 lines — src\components\studio\OptimizationForm.jsx
  ⚠️  402 lines — src\components\studio\FavoritesPickerModal.jsx
  ⚠️  400 lines — src\components\studio\CreatePresetModal.jsx
  ⚠️  351 lines — src\pages\BrandProfilePage.jsx
  ⚠️  341 lines — src\components\studio\SmartNicheAutocomplete.jsx

━━━ 8. Deprecated Database Columns ━━━
  ❌ 'listing_score': src\pages\Dashboard.jsx:163 → ${(listing.listing_score || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
  ❌ 'listing_score': src\pages\Dashboard.jsx:164 → (listing.listing_score || 0) >= 50 ? 'bg-indigo-100 text-indigo-700' :
  ❌ 'listing_score': src\pages\Dashboard.jsx:165 → (listing.listing_score || 0) > 0 ? 'bg-amber-100 text-amber-700' :
  ❌ 'listing_score': src\pages\Dashboard.jsx:167 → {listing.listing_score ? Math.round(listing.listing_score) : 'N/A'}

━━━ 9. Vercel Production Code Quality (api/) ━━━
  ℹ️  8 serverless function files found in api/

Hardcoded local values in prod:
  ✅ No hardcoded localhost references

console.log in prod functions:
  ✅ No console.log in production functions

Missing error handling:

━━━ 10. Code Duplication (server.mjs vs api/) ━━━
  ❌ server.mjs has 7 inline helper functions not imported from lib/ — logic duplication risk
  ℹ️  api/ routes have 27 imports from lib/

━━━ 11. Potentially Unused Dependencies ━━━
  ⚠️  Possibly unused: tailwind-merge
  ⚠️  Possibly unused: zustand
  ⚠️  Possibly unused: autoprefixer
  ⚠️  Possibly unused: eslint-plugin-react
  ⚠️  Possibly unused: eslint-plugin-react-hooks
  ⚠️  Possibly unused: eslint-plugin-react-refresh
  ⚠️  Possibly unused: postcss
  ⚠️  Possibly unused: typescript

━━━ 12. Documentation Sync ━━━
  ⚠️  CLAUDE.md mentions 'sniper' 1× — Multi-mode removed
  ⚠️  docs/context.md is 1065 lines — consider archiving sessions older than 30 days

━━━ AUDIT SUMMARY ━━━

Total issues: 38

Priority:
  1. 🔴 Multi-mode residue — remove seo_mode, broad/balanced/sniper from all active code
  2. 🔴 Legacy files — delete app/api/seo/ (replaced by api/)
  3. 🟡 N8N dead refs — clean .env and server.mjs (keep BrandProfilePage + Edge Function secret)
  4. 🟡 Unused imports & orphaned components — reduce bundle size
  5. 🟡 Code duplication — server.mjs should import from lib/ like api/ does
  6. 🟡 console.log in production — clean api/ functions
  7. 🟡 File size hotspots — split large files
  8. 🟢 Deprecated columns — replace product_type_text, listing_score refs
  9. 🟢 Documentation — update CLAUDE.md to remove stale terms