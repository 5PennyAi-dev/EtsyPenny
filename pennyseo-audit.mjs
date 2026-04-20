#!/usr/bin/env node
// ============================================================================
// PennySEO Codebase Audit Script v2
// Run from project root: node pennyseo-audit.mjs
//
// Architecture awareness:
//   api/          → Vercel serverless functions (PRODUCTION) — scan for issues
//   app/api/seo/  → Abandoned Next.js routes (LEGACY) — flag for deletion
//   server.mjs    → Express dev-only mirror — scan for issues
//   lib/          → Shared backend logic — scan for issues
// ============================================================================

import fs from 'fs';
import path from 'path';

const TOTAL = { issues: 0 };
const REPORT_LINES = [];

// Helpers
function log(msg) { console.log(msg); REPORT_LINES.push(msg.replace(/\x1b\[[0-9;]*m/g, '')); }
function header(title) { log(`\n━━━ ${title} ━━━`); }
function found(msg) { log(`  ❌ ${msg}`); TOTAL.issues++; }
function warn(msg) { log(`  ⚠️  ${msg}`); TOTAL.issues++; }
function ok(msg) { log(`  ✅ ${msg}`); }
function info(msg) { log(`  ℹ️  ${msg}`); }

// Recursive file finder
function walk(dir, extensions, ignore = ['node_modules', '.git', 'dist', 'build', '.vercel']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, extensions, ignore));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

// Grep helper
function grep(files, pattern) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  const hits = [];
  for (const file of files) {
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((text, i) => {
        if (regex.test(text)) {
          hits.push({ file: path.relative('.', file), lineNum: i + 1, text: text.trim() });
        }
      });
    } catch {}
  }
  return hits;
}

function countInFile(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return (content.match(pattern) || []).length;
  } catch { return 0; }
}

function lineCount(filePath) {
  try { return fs.readFileSync(filePath, 'utf8').split('\n').length; } catch { return 0; }
}

// ============================================================================
// COLLECT FILES BY CATEGORY
// ============================================================================

const SRC_FILES = walk('src', ['.jsx', '.js', '.ts']);

// Production Vercel functions — scan for issues
const VERCEL_API_FILES = walk('api', ['.ts', '.js']);

// Shared backend logic
const LIB_FILES = walk('lib', ['.ts', '.js', '.mjs']);

// Dev-only Express server
const SERVER_FILE = fs.existsSync('server.mjs') ? ['server.mjs'] : [];

// All active code (everything except legacy)
const ALL_ACTIVE_CODE = [...SRC_FILES, ...VERCEL_API_FILES, ...LIB_FILES, ...SERVER_FILE];

// Legacy (should be deleted)
const LEGACY_FILES = walk('app/api', ['.ts', '.js']);

// Env files
const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.development'].filter(f => fs.existsSync(f));

// ============================================================================
// MAIN AUDIT
// ============================================================================

log('# PennySEO Codebase Audit Report v2');
log(`_Generated: ${new Date().toISOString().slice(0, 16)}_`);
log(`_Active code files: ${ALL_ACTIVE_CODE.length} | Legacy files: ${LEGACY_FILES.length}_\n`);

// ── 1. N8N DEAD REFERENCES ──────────────────────────────────────────────────

header('1. N8N Dead References');

log('\nWebhook URL references in active code:');
const n8nUrlHits = grep(ALL_ACTIVE_CODE, /N8N_WEBHOOK|n8n_webhook|VITE_N8N/i);
const n8nEnvHits = grep(ENV_FILES, /N8N_WEBHOOK|VITE_N8N/i);

// Categorize: BrandProfilePage is the only legitimate n8n consumer
const legitimateN8N = [];
const deadN8N = [];
[...n8nUrlHits, ...n8nEnvHits].forEach(h => {
  if (h.file.includes('BrandProfilePage') || 
      (h.file.includes('.env') && h.text.includes('VITE_N8N_WEBHOOK_URL_TEST') && !h.text.startsWith('#'))) {
    legitimateN8N.push(h);
  } else if (h.file.includes('.env') && h.text.includes('N8N_WEBHOOK_SECRET') && !h.text.startsWith('#')) {
    // N8N_WEBHOOK_SECRET is still used by Supabase Edge Functions — keep
    legitimateN8N.push(h);
  } else {
    deadN8N.push(h);
  }
});

if (legitimateN8N.length > 0) {
  log('\n  Legitimate (analyseShop + Edge Function auth):');
  legitimateN8N.forEach(h => info(`${h.file}:${h.lineNum} → ${h.text.slice(0, 120)}`));
}
if (deadN8N.length > 0) {
  log('\n  Dead (should remove):');
  deadN8N.forEach(h => found(`${h.file}:${h.lineNum} → ${h.text.slice(0, 120)}`));
} else {
  ok('No dead n8n references (only legitimate analyseShop + Edge Function auth remain)');
}

log('\nN8N action strings (excluding analyseShop):');
const deadActions = ['drafting_seo', 'recalculateScore', 'generateInsight', 'competitionAnalysis', 'seo_sniper'];
for (const action of deadActions) {
  const hits = grep(ALL_ACTIVE_CODE, new RegExp(`['"]\s*${action}\s*['"]`));
  hits.forEach(h => found(`Dead action '${action}': ${h.file}:${h.lineNum}`));
}

// ── 2. MULTI-MODE RESIDUE ───────────────────────────────────────────────────

header('2. Multi-Mode Residue (broad/balanced/sniper)');

log('\nseo_mode / activeMode references:');
const modeRefs = grep(ALL_ACTIVE_CODE, /seo_mode|seoMode|activeMode|handleModeChange/);
modeRefs.forEach(h => found(`${h.file}:${h.lineNum} → ${h.text.slice(0, 120)}`));
if (modeRefs.length === 0) ok('No seo_mode references');

log('\nMode string literals:');
const modeStrings = grep(ALL_ACTIVE_CODE, /['"](?:broad|balanced|sniper)['"]/);
modeStrings.forEach(h => warn(`${h.file}:${h.lineNum} → ${h.text.slice(0, 120)}`));
if (modeStrings.length === 0) ok('No mode string literals');

log('\nMulti-mode state:');
const multiState = grep(SRC_FILES, /globalEvals|allSeoStats|StrategySwitcher/);
multiState.forEach(h => found(`${h.file}:${h.lineNum} → ${h.text.slice(0, 120)}`));
if (multiState.length === 0) ok('No multi-mode state arrays');

// ── 3. UNUSED LUCIDE IMPORTS ────────────────────────────────────────────────

header('3. Unused Lucide Icon Imports');

const jsxFiles = walk('src', ['.jsx']);
let unusedIcons = 0;
for (const file of jsxFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
    if (!importMatch) continue;
    const icons = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const icon of icons) {
      // Handle "Link as LinkIcon" pattern
      const actualName = icon.includes(' as ') ? icon.split(' as ')[1].trim() : icon;
      const re = new RegExp(`\\b${actualName}\\b`, 'g');
      const count = (content.match(re) || []).length;
      if (count <= 1) {
        warn(`Unused icon '${icon}' in ${path.relative('.', file)}`);
        unusedIcons++;
      }
    }
  } catch {}
}
if (unusedIcons === 0) ok('All Lucide imports appear used');

// ── 4. DEAD FILES & COMPONENTS ──────────────────────────────────────────────

header('4. Dead Files & Components');

log('\nLegacy Next.js routes (app/api/seo/ — should be deleted):');
if (LEGACY_FILES.length > 0) {
  LEGACY_FILES.forEach(f => found(`Delete: ${path.relative('.', f)}`));
} else {
  ok('No legacy app/api/ directory found');
}

log('\nOrphaned components:');
const componentFiles = walk('src/components', ['.jsx']);
for (const file of componentFiles) {
  const basename = path.basename(file, '.jsx');
  if (basename === 'index') continue;
  const importPattern = new RegExp(`['"/]${basename}['"/\\.\\s]|from.*${basename}|import.*${basename}`);
  const usages = SRC_FILES.filter(f => {
    if (f === file) return false;
    try { return importPattern.test(fs.readFileSync(f, 'utf8')); } catch { return false; }
  }).length;
  if (usages === 0) {
    warn(`Possibly orphaned: ${path.relative('.', file)}`);
  }
}

log('\nTest files in production tree:');
const testFiles = walk('.', ['.mjs', '.ts', '.js']).filter(f => path.basename(f).startsWith('test-'));
testFiles.forEach(f => warn(`Test file: ${path.relative('.', f)}`));
if (testFiles.length === 0) ok('No test files in tree');

// ── 5. ENV VARIABLE HYGIENE ─────────────────────────────────────────────────

header('5. Environment Variable Hygiene');

log('\nObsolete env vars (safe to remove):');
const obsoleteVars = ['VITE_N8N_WEBHOOK_URL_PROD', 'N8N_WEBHOOK_URL_RESET_POOL'];
for (const v of obsoleteVars) {
  const hits = [...grep(ALL_ACTIVE_CODE, new RegExp(v)), ...grep(ENV_FILES, new RegExp(v))];
  hits.forEach(h => found(`'${v}': ${h.file}:${h.lineNum}`));
}

log('\nCommented-out env lines:');
for (const envFile of ENV_FILES) {
  try {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.startsWith('#') && (line.includes('N8N') || line.includes('WEBHOOK'))) {
        warn(`Commented-out: ${envFile}:${i + 1} → ${line.slice(0, 100)}`);
      }
    });
  } catch {}
}

log('\nLegitimate env vars (keep):');
info('VITE_N8N_WEBHOOK_URL_TEST — used by BrandProfilePage.jsx (analyseShop)');
info('N8N_WEBHOOK_SECRET — used by Supabase Edge Functions (save-seo, save-image-analysis)');

// ── 6. CODE HYGIENE ─────────────────────────────────────────────────────────

header('6. Code Hygiene (TODO/HACK/console.log)');

log('\nTODO / HACK / FIXME:');
const markers = grep(ALL_ACTIVE_CODE, /\/\/\s*(TODO|HACK|FIXME|XXX|TEMP)\b/);
markers.forEach(h => warn(`${h.file}:${h.lineNum} → ${h.text.slice(0, 120)}`));
if (markers.length === 0) ok('No TODO/HACK markers');

log('\nconsole.log statements:');
const consoleLogs = {};
let totalConsoleLogs = 0;
for (const file of ALL_ACTIVE_CODE) {
  const count = countInFile(file, /console\.log/g);
  if (count > 0) {
    consoleLogs[path.relative('.', file)] = count;
    totalConsoleLogs += count;
  }
}
if (totalConsoleLogs > 0) {
  warn(`${totalConsoleLogs} console.log statements total`);
  const sorted = Object.entries(consoleLogs).sort((a, b) => b[1] - a[1]).slice(0, 15);
  sorted.forEach(([file, count]) => {
    const label = file.startsWith('api') ? '(PROD ⚠️)' : file === 'server.mjs' ? '(dev-only)' : '';
    log(`     ${count} × ${file} ${label}`);
  });
} else {
  ok('No console.log statements');
}

// ── 7. FILE SIZE HOTSPOTS ───────────────────────────────────────────────────

header('7. File Size Hotspots (>300 lines)');

const allSizedFiles = [...SRC_FILES, ...SERVER_FILE, ...VERCEL_API_FILES, ...LIB_FILES];
const bigFiles = allSizedFiles.map(f => ({ file: path.relative('.', f), lines: lineCount(f) }))
  .filter(f => f.lines > 300)
  .sort((a, b) => b.lines - a.lines);

for (const f of bigFiles) {
  if (f.lines > 1000) found(`${f.lines} lines — ${f.file} (CRITICAL — needs splitting)`);
  else if (f.lines > 500) warn(`${f.lines} lines — ${f.file} (consider splitting)`);
  else log(`  ⚠️  ${f.lines} lines — ${f.file}`);
}
if (bigFiles.length === 0) ok('No files over 300 lines');

// ── 8. DEPRECATED DB COLUMNS ────────────────────────────────────────────────

header('8. Deprecated Database Columns');

const deprecated = ['product_type_text', 'listing_score', 'performance_score', 'theme_id', 'niche_id', 'sub_niche_id'];
for (const col of deprecated) {
  const hits = grep(ALL_ACTIVE_CODE, new RegExp(`\\b${col}\\b`));
  hits.forEach(h => found(`'${col}': ${h.file}:${h.lineNum} → ${h.text.slice(0, 100)}`));
}

// ── 9. VERCEL PRODUCTION CODE QUALITY ───────────────────────────────────────

header('9. Vercel Production Code Quality (api/)');

if (VERCEL_API_FILES.length > 0) {
  info(`${VERCEL_API_FILES.length} serverless function files found in api/`);

  log('\nHardcoded local values in prod:');
  const hardcoded = grep(VERCEL_API_FILES, /localhost|127\.0\.0\.1|:3001/);
  hardcoded.forEach(h => found(`Hardcoded local URL: ${h.file}:${h.lineNum} → ${h.text.slice(0, 100)}`));
  if (hardcoded.length === 0) ok('No hardcoded localhost references');

  log('\nconsole.log in prod functions:');
  let prodLogs = 0;
  for (const file of VERCEL_API_FILES) {
    const count = countInFile(file, /console\.log/g);
    if (count > 0) {
      warn(`${count} console.log in ${path.relative('.', file)}`);
      prodLogs += count;
    }
  }
  if (prodLogs === 0) ok('No console.log in production functions');

  log('\nMissing error handling:');
  for (const file of VERCEL_API_FILES) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('try') && !content.includes('catch') && content.includes('async')) {
        warn(`No try/catch in async function: ${path.relative('.', file)}`);
      }
    } catch {}
  }
} else {
  warn('No api/ directory found — Vercel production functions missing!');
}

// ── 10. CODE DUPLICATION (server.mjs vs api/) ───────────────────────────────

header('10. Code Duplication (server.mjs vs api/)');

if (SERVER_FILE.length > 0 && VERCEL_API_FILES.length > 0) {
  const serverContent = fs.readFileSync('server.mjs', 'utf8');

  // Check if server.mjs imports from lib/ (good) or duplicates logic (bad)
  const libImports = (serverContent.match(/from\s+['"]\.\/lib\//g) || []).length;
  const inlineHelpers = (serverContent.match(/(?:function|const)\s+(runVisionModel|runTextModel|enrichKeywords|scoreKeywords|selectAndScore|applySEOFilter|persistStrength)\b/g) || []).length;

  if (inlineHelpers > 0 && libImports === 0) {
    found(`server.mjs has ${inlineHelpers} inline helper functions not imported from lib/ — logic duplication risk`);
  } else if (inlineHelpers > 0 && libImports > 0) {
    warn(`server.mjs has ${inlineHelpers} inline helpers AND ${libImports} lib/ imports — partial duplication`);
  } else {
    ok(`server.mjs imports ${libImports} modules from lib/ — shared code architecture`);
  }

  // Check if api/ routes import from lib/
  let apiLibImports = 0;
  for (const file of VERCEL_API_FILES) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      apiLibImports += (content.match(/from\s+['"].*\/lib\//g) || []).length;
    } catch {}
  }
  info(`api/ routes have ${apiLibImports} imports from lib/`);
} else {
  info('Skipped — need both server.mjs and api/ to compare');
}

// ── 11. DEPENDENCY CHECK ────────────────────────────────────────────────────

header('11. Potentially Unused Dependencies');

if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
  const configFiles = ['vite.config.js', 'vite.config.ts', 'tailwind.config.js', 'tailwind.config.cjs', 'postcss.config.js', 'postcss.config.cjs', 'vercel.json', 'tsconfig.json', 'tsconfig.server.json'].filter(f => fs.existsSync(f));
  const searchFiles = [...ALL_ACTIVE_CODE, ...configFiles];
  const allContent = searchFiles.map(f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');

  // Also check package.json scripts for CLI tools
  const scriptsContent = JSON.stringify(pkg.scripts || {});

  for (const dep of deps) {
    if (dep.startsWith('@types/')) continue;
    const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`from\\s+['"]${escaped}`, 'i'),
      new RegExp(`require\\s*\\(\\s*['"]${escaped}`, 'i'),
      new RegExp(`['"]${escaped}['"]`, 'i'),
    ];
    const isUsedInCode = patterns.some(p => p.test(allContent));
    const isUsedInScripts = scriptsContent.includes(dep);
    if (!isUsedInCode && !isUsedInScripts) warn(`Possibly unused: ${dep}`);
  }
}

// ── 12. DOCUMENTATION SYNC ──────────────────────────────────────────────────

header('12. Documentation Sync');

const docFiles = ['CLAUDE.md', 'docs/context.md', 'context.md'].filter(f => fs.existsSync(f));

// Terms that should NOT appear in CLAUDE.md (active reference doc)
const claudeStaleTerms = {
  'broad': 'Multi-mode removed',
  'balanced': 'Multi-mode removed',
  'sniper': 'Multi-mode removed',
  'seo_mode': 'Multi-mode removed',
  'drafting_seo': 'Migrated to /api/seo/generate-draft',
  'recalculateScore': 'Migrated to /api/seo/recalculate-scores',
  'generateInsight': 'Feature removed',
  'competitionAnalysis': 'Feature removed',
};

for (const doc of docFiles) {
  const content = fs.readFileSync(doc, 'utf8');
  const lines = content.split('\n').length;

  if (doc === 'CLAUDE.md') {
    for (const [term, reason] of Object.entries(claudeStaleTerms)) {
      const re = new RegExp(term, 'gi');
      const count = (content.match(re) || []).length;
      if (count > 0) warn(`${doc} mentions '${term}' ${count}× — ${reason}`);
    }
  }

  // context.md size check only (historical content is expected)
  if (doc.includes('context') && lines > 800) {
    warn(`${doc} is ${lines} lines — consider archiving sessions older than 30 days`);
  }
}

// ── SUMMARY ─────────────────────────────────────────────────────────────────

header('AUDIT SUMMARY');
log(`\nTotal issues: ${TOTAL.issues}`);
log('\nPriority:');
log('  1. 🔴 Multi-mode residue — remove seo_mode, broad/balanced/sniper from all active code');
log('  2. 🔴 Legacy files — delete app/api/seo/ (replaced by api/)');
log('  3. 🟡 N8N dead refs — clean .env and server.mjs (keep BrandProfilePage + Edge Function secret)');
log('  4. 🟡 Unused imports & orphaned components — reduce bundle size');
log('  5. 🟡 Code duplication — server.mjs should import from lib/ like api/ does');
log('  6. 🟡 console.log in production — clean api/ functions');
log('  7. 🟡 File size hotspots — split large files');
log('  8. 🟢 Deprecated columns — replace product_type_text, listing_score refs');
log('  9. 🟢 Documentation — update CLAUDE.md to remove stale terms');

// Save report
const reportFile = `audit-report-${new Date().toISOString().slice(0, 10)}.md`;
fs.writeFileSync(reportFile, REPORT_LINES.join('\n'), 'utf8');
log(`\n📄 Report saved to: ${reportFile}`);
