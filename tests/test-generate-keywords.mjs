/**
 * Test script for the generate-keywords pipeline.
 * Run: node --env-file=.env test-generate-keywords.mjs
 *
 * Tests all 5 steps: A (Gemini keyword gen) → B (cache + DataForSEO) →
 * C (niche + transactional scoring) → D (selection + LSI) → E (save-seo)
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// ─── CONFIG (only listing ID needed — rest comes from Supabase) ────
const LISTING_ID = '8ddad7f2-6aed-4fb8-a84c-5b25b6bdfbeb';

// These will be populated from the database in main()
let USER_ID, PRODUCT_TYPE, THEME, NICHE, SUB_NICHE, DESCRIPTION, AESTHETIC, AUDIENCE, VIBE;

// SEO tuning parameters (1-10 scale, 5 = neutral)
const PARAMS = {
  Volume: 5,
  Competition: 5,
  Transaction: 5,
  Niche: 5,
  CPC: 5,
  ai_selection_count: 13,
};

// Set to false to skip Step E (persistence) for a dry run
const PERSIST = true;

// ─── ENV CHECKS ────────────────────────────────────────────
const GOOGLE_API_KEY       = process.env.GOOGLE_API_KEY;
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_SECRET           = process.env.N8N_WEBHOOK_SECRET;
const DATAFORSEO_LOGIN     = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD  = process.env.DATAFORSEO_PASSWORD;

for (const [name, val] of Object.entries({ GOOGLE_API_KEY, SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_KEY, N8N_SECRET })) {
  if (!val) { console.error(`❌ Missing required env var: ${name}`); process.exit(1); }
}
if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD || DATAFORSEO_LOGIN.startsWith('your_')) {
  console.warn('⚠️  DataForSEO credentials missing/placeholder — Step B will return zero-volume data\n');
}
console.log('✅ Env vars checked\n');

// ─── GEMINI SETUP ──────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const genConfig = {
  temperature: 0.7, topP: 1, topK: 1, maxOutputTokens: 8192,
  responseMimeType: 'application/json',
};
const scoringConfig = { ...genConfig, temperature: 0.1 };
const safety = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function extractJson(raw) {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1].trim() : raw.trim();
}

async function runTextModel(prompt, config = genConfig) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: config, safetySettings: safety });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function getEtsyVolume(webVol) {
  if (!webVol || webVol <= 0) return 0;
  return Math.round(3 * Math.pow(webVol, 0.75));
}

// ─── SEGMENTS ──────────────────────────────────────────────
const SEGMENTS = [
  { name: 'Broad & High Volume', description: 'High-level niche terms and general gift categories. Focus on high search volume.' },
  { name: 'Balanced & Descriptive', description: 'Mid-range keywords combining the niche with specific themes and graphics from the visual analysis.' },
  { name: 'Audience & Gift Scenarios', description: "Target specific buyers (e.g., 'Gift for Coworker') and occasions (Birthday, Christmas, etc.)." },
  { name: 'Sniper & Long-Tail', description: 'Ultra-specific, low-competition terms and cultural sub-niches related to the design.' },
  { name: 'Aesthetic & Vibe', description: "Focus on the look, mood, and specific art style (e.g., 'Kawaii Aesthetic', 'Cyberpunk Vibe')." },
];

// ─── STEP A: Generate keyword pool ─────────────────────────
async function stepA() {
  console.log('🔍 Step A: Generating keyword pool (5 parallel Gemini calls)...');
  const t0 = Date.now();

  const results = await Promise.allSettled(
    SEGMENTS.map(async (seg) => {
      const prompt = `# Role
You are an expert Etsy SEO Specialist and E-commerce Copywriter.

# Task
Generate 50 high-intent keywords for: ${seg.name}
${seg.name}: ${seg.description}

# Context
- Product Type: ${PRODUCT_TYPE}
- Theme: ${THEME}
- Niche: ${NICHE}
- Sub-niche: ${SUB_NICHE}
- Description: ${DESCRIPTION}

# Visual & Marketing Data
- Aesthetic/Style: ${AESTHETIC}
- Target Audience: ${AUDIENCE}
- Overall Vibe: ${VIBE}

# Rules
- Max 20 characters per keyword (CRITICAL for Etsy tags).
- Max 3 words per phrase.
- No duplicates, no trademarks, lowercase only.
- Include product type in keywords at least 75% of the time.
- Format: JSON object {"keywords": ["keyword1", "keyword2", ...]}`;

      const raw = await runTextModel(prompt);
      const parsed = JSON.parse(extractJson(raw));
      const kws = parsed.keywords ?? parsed.output?.keywords ?? [];
      return kws
        .filter(k => typeof k === 'string' && k.length > 0)
        .map(k => k.toLowerCase().trim())
        .filter(k => k.length <= 20);
    })
  );

  const pool = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      pool.push(...r.value);
      console.log(`   ✅ Segment OK: ${r.value.length} keywords`);
    } else {
      console.warn(`   ⚠️  Segment FAILED: ${r.reason?.message || r.reason}`);
    }
  }

  const unique = [...new Set(pool)];
  console.log(`   📊 Total: ${pool.length} raw → ${unique.length} unique (${Date.now() - t0}ms)\n`);
  return unique;
}

// ─── STEP B: Enrich with search data ───────────────────────
async function stepB(keywords) {
  console.log(`🔎 Step B: Enriching ${keywords.length} keywords with search data...`);
  const t0 = Date.now();

  // B1: Check cache
  console.log('   B1: Checking keyword cache...');
  let cached = [];
  try {
    const cacheRes = await fetch(`${SUPABASE_URL}/functions/v1/check-keyword-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'x-api-key': N8N_SECRET,
      },
      body: JSON.stringify({ keywords }),
    });
    if (cacheRes.ok) {
      const cacheData = await cacheRes.json();
      cached = cacheData.cachedKeywords || [];
      console.log(`   ✅ Cache hit: ${cached.length} / ${keywords.length}`);
    } else {
      console.warn(`   ⚠️  Cache check returned ${cacheRes.status}`);
    }
  } catch (err) {
    console.warn(`   ⚠️  Cache check failed: ${err.message}`);
  }

  const cachedTags = new Set(cached.map(c => c.tag));
  const listFromCache = cached.map(c => ({
    keyword: c.tag,
    search_volume: c.search_volume || 0,
    competition: c.competition ?? 0.5,
    cpc: c.cpc || 0,
    volume_history: c.volume_history || [],
    fromCache: true,
  }));

  // B2: DataForSEO for uncached
  const uncached = keywords.filter(kw => !cachedTags.has(kw));
  let listFromAPI = [];

  if (uncached.length > 0 && DATAFORSEO_LOGIN && !DATAFORSEO_LOGIN.startsWith('your_')) {
    console.log(`   B2: Calling DataForSEO for ${uncached.length} uncached keywords...`);
    try {
      const dfsRes = await fetch('https://api.dataforseo.com/v3/keywords_data/google/search_volume/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64'),
        },
        body: JSON.stringify([{ keywords: uncached, location_name: 'United States', language_name: 'English' }]),
      });

      if (dfsRes.ok) {
        const dfsData = await dfsRes.json();
        const items = dfsData?.tasks?.[0]?.result || [];
        listFromAPI = items.map(item => {
          const history = item.monthly_searches
            ? item.monthly_searches.map(m => getEtsyVolume(m.search_volume || 0)).reverse()
            : new Array(12).fill(0);
          return {
            keyword: item.keyword,
            search_volume: getEtsyVolume(item.search_volume || 0),
            competition: item.competition ?? 0.5,
            cpc: item.cpc || 0,
            volume_history: history,
            fromCache: false,
          };
        });
        console.log(`   ✅ DataForSEO returned data for ${listFromAPI.length} keywords`);
      } else {
        console.warn(`   ⚠️  DataForSEO returned ${dfsRes.status}`);
      }
    } catch (err) {
      console.warn(`   ⚠️  DataForSEO failed: ${err.message}`);
    }
  } else {
    console.log(`   B2: Skipping DataForSEO (${uncached.length} uncached, credentials ${DATAFORSEO_LOGIN ? 'placeholder' : 'missing'})`);
  }

  // B3: Fill missing with zero data
  const known = new Set([...listFromCache.map(k => k.keyword), ...listFromAPI.map(k => k.keyword)]);
  const missing = keywords.filter(kw => !known.has(kw)).map(kw => ({
    keyword: kw, search_volume: 0, competition: 0.5, cpc: 0, volume_history: new Array(12).fill(0), fromCache: false,
  }));

  const all = [...listFromCache, ...listFromAPI, ...missing];
  console.log(`   📊 Enriched: ${listFromCache.length} cached + ${listFromAPI.length} API + ${missing.length} zero-fill = ${all.length} total (${Date.now() - t0}ms)\n`);
  return all;
}

// ─── STEP C: Score keywords (niche + transactional) ────────
async function stepC(stats) {
  console.log(`🏷️  Step C: Scoring ${stats.length} keywords (niche + transactional in parallel)...`);
  const t0 = Date.now();
  const kws = stats.map(s => s.keyword);

  // Niche scoring prompt (from lib/seo/niche-scoring.ts)
  const nicheSystemPrompt = `# Role
You are a Senior Etsy SEO Specialist evaluating tags on niche precision.

# Product context:
- Theme: ${THEME} | Niche: ${NICHE} | Sub-niche: ${SUB_NICHE}
- Product Type: ${PRODUCT_TYPE}
- Aesthetic/Style: ${AESTHETIC} | Target Audience: ${AUDIENCE} | Vibe: ${VIBE}

# Scoring: Use ONLY 10, 7, 4, or 1.
- 10 = Niche-Specific (Style + Subject + Product alignment)
- 7 = Strong (High relevance but less unique)
- 4 = Neutral (Broadly descriptive or niche+filler combo)
- 1 = Broad (Generic filler: "gift for her", "personalized")

Return ONLY: {"keywords": [{"keyword": "...", "niche_score": N}]}`;

  // Transactional scoring prompt (from lib/seo/transactional-scoring.ts)
  const transSystemPrompt = `# Role
You are a Senior Etsy SEO Specialist evaluating tags on purchase intent.

# Context: Product Type: ${PRODUCT_TYPE} | Theme: ${THEME} | Niche: ${NICHE}

# Scoring: Use ONLY 10, 7, 4, or 1.
- 10 = High-Conversion (Product Noun + Purchase Trigger + Recipient/Occasion)
- 7 = Product-Focused (Product Noun + Style, no recipient)
- 4 = Browsing (Style/vibe, missing product noun)
- 1 = Informational (DIY, ideas, tutorials)

Return ONLY: {"keywords": [{"keyword": "...", "transactional_score": N}]}`;

  // Batch in groups of 25
  const BATCH = 25;
  const batches = [];
  for (let i = 0; i < kws.length; i += BATCH) batches.push(kws.slice(i, i + BATCH));

  const runScoring = async (systemPrompt, batchList, label) => {
    const results = [];
    for (let i = 0; i < batchList.length; i++) {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: scoringConfig,
        safetySettings: safety,
        systemInstruction: systemPrompt,
      });
      const raw = await model.generateContent(`# Keywords to Analyze:\n${JSON.stringify(batchList[i])}`);
      const text = raw.response.text().replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const parsed = JSON.parse(text);
      const items = parsed.keywords ?? parsed.output?.keywords ?? [];
      results.push(...items);
      console.log(`   ✅ ${label} batch ${i + 1}/${batchList.length}: ${items.length} scored`);
    }
    return results;
  };

  const [nicheResults, transResults] = await Promise.all([
    runScoring(nicheSystemPrompt, batches, 'Niche'),
    runScoring(transSystemPrompt, batches, 'Trans'),
  ]);

  const VALID = new Set([10, 7, 4, 1]);
  const nicheMap = new Map(nicheResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.niche_score) ? r.niche_score : 1]));
  const transMap = new Map(transResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.transactional_score) ? r.transactional_score : 1]));

  const merged = stats.map(s => ({
    keyword: s.keyword,
    search_volume: s.search_volume,
    competition: s.competition,
    cpc: s.cpc,
    volume_history: s.volume_history,
    niche_score: nicheMap.get(s.keyword) ?? null,
    transactional_score: transMap.get(s.keyword) ?? null,
    is_selection_ia: false,
    is_user_added: false,
    is_pinned: false,
    fromCache: s.fromCache,
  }));

  console.log(`   📊 Scored ${merged.length} keywords (${Date.now() - t0}ms)\n`);
  return merged;
}

// ─── STEP D: Select + Calculate Listing Strength ───────────
function stepD(keywords) {
  console.log('📐 Step D: Selecting top keywords + calculating LSI...');

  const volW = (PARAMS.Volume ?? 5) / 5;
  const compW = (PARAMS.Competition ?? 5) / 5;
  const transW = (PARAMS.Transaction ?? 5) / 5;
  const nicheW = (PARAMS.Niche ?? 5) / 5;
  const cpcW = (PARAMS.CPC ?? 5) / 5;

  const scored = keywords.map(kw => {
    const nS = (kw.niche_score ?? 5) / 10;
    const tS = (kw.transactional_score ?? 5) / 10;
    const volNorm = Math.log10(Math.max(1, kw.search_volume + 1)) / 7;
    const compPenalty = kw.competition ?? 0.5;
    const cpcNorm = Math.min(1, (kw.cpc || 0) / 1.5);
    const composite = nS * nicheW + tS * transW + volNorm * volW - compPenalty * compW + cpcNorm * cpcW;
    return { kw, composite };
  });

  scored.sort((a, b) => b.composite - a.composite);
  const N = PARAMS.ai_selection_count ?? 13;
  scored.forEach((item, idx) => { item.kw.is_selection_ia = idx < N; });

  const finalKws = scored.map(s => s.kw);
  const selected = finalKws.filter(kw => kw.is_selection_ia);

  // calculateListingStrength (from docs/generate-seo-logic.ts)
  let strength = null;
  if (selected.length > 0) {
    let totalMarketReach = 0, totalPowerIndex = 0;
    selected.forEach(kw => {
      const vol = Math.min(1000000, kw.search_volume || 0);
      const nS = kw.niche_score ?? 5;
      const tS = kw.transactional_score ?? 5;
      const dw = 0.7 + (nS / 20) + (tS / 20);
      totalMarketReach += vol * dw;
      totalPowerIndex += Math.sqrt(vol) * dw;
    });

    const ceil = 5000000;
    const visibility = Math.min(100, Math.round((Math.log10(Math.max(1, totalMarketReach)) / Math.log10(ceil)) * 100));
    const avgTrans = selected.reduce((a, k) => a + (k.transactional_score || 5), 0) / selected.length;
    const avgCPC = selected.reduce((a, k) => a + (k.cpc || 0), 0) / selected.length;
    const cpcS = Math.min(10, (avgCPC / 1.5) * 10);
    const conversion = (avgTrans * 6) + (cpcS * 4);
    const avgNiche = selected.reduce((a, k) => a + (k.niche_score || 5), 0) / selected.length;
    const relevance = avgNiche * 10;
    const sorted = [...selected].sort((a, b) => (a.competition || 1) - (b.competition || 1));
    const top5 = sorted.slice(0, 5);
    const avgBestComp = top5.reduce((a, k) => a + (k.competition || 0.9), 0) / top5.length;
    const competition = Math.round(Math.pow(1 - Math.min(0.99, avgBestComp), 0.5) * 100);
    const cpcAll = Math.min(100, (avgCPC / 1.5) * 100);
    const transS = avgTrans * 10;
    const profit = Math.round((visibility * 0.35) + (cpcAll * 0.30) + (transS * 0.35));
    const lsi = Math.round((visibility * 0.25) + (conversion * 0.35) + (relevance * 0.25) + (competition * 0.15));

    strength = {
      listing_strength: lsi,
      breakdown: { visibility, conversion: Math.round(conversion), relevance: Math.round(relevance), competition, profit },
      stats: {
        total_keywords: selected.length,
        avg_cpc: parseFloat(avgCPC.toFixed(2)),
        avg_competition_all: parseFloat((selected.reduce((a, k) => a + (k.competition || 0.8), 0) / selected.length).toFixed(2)),
        best_opportunity_comp: parseFloat(avgBestComp.toFixed(2)),
        raw_visibility_index: Math.round(totalPowerIndex),
        est_market_reach: Math.round(totalMarketReach),
      },
    };
  }

  console.log(`   ✅ Selected ${selected.length} / ${finalKws.length} keywords`);
  console.log(`   📊 LSI = ${strength?.listing_strength ?? 'N/A'}`);
  if (strength) {
    console.log(`      Visibility: ${strength.breakdown.visibility} | Conversion: ${strength.breakdown.conversion} | Relevance: ${strength.breakdown.relevance} | Competition: ${strength.breakdown.competition} | Profit: ${strength.breakdown.profit}`);
  }
  console.log();

  return { keywords: finalKws, strength };
}

// ─── STEP E: Persist via save-seo edge function ────────────
async function stepE(keywords, strength) {
  if (!PERSIST) {
    console.log('💾 Step E: SKIPPED (PERSIST = false, dry run)\n');
    return;
  }

  console.log('💾 Step E: Saving via save-seo edge function...');
  const payload = {
    listing_id: LISTING_ID,
    results: {
      balanced: {
        listing_strength: strength?.listing_strength ?? 0,
        breakdown: strength?.breakdown ?? {},
        stats: strength?.stats ?? {},
        seo_parameters: PARAMS,
        keywords: keywords.map(kw => ({
          keyword: kw.keyword,
          search_volume: kw.search_volume,
          competition: kw.competition,
          cpc: kw.cpc,
          volume_history: kw.volume_history,
          niche_score: kw.niche_score,
          transactional_score: kw.transactional_score,
          is_selection_ia: kw.is_selection_ia,
          is_user_added: kw.is_user_added,
          is_pinned: kw.is_pinned,
          is_current_pool: true,
          is_current_eval: false,
        })),
      },
    },
    trigger_reset_pool: true,
  };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/save-seo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'x-api-key': N8N_SECRET,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`   ❌ save-seo failed (${res.status}): ${body}`);
  } else {
    console.log(`   ✅ Saved! Response: ${body}`);
  }
  console.log();
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🧪 test-generate-keywords.mjs — Full Pipeline Test');
  console.log('═══════════════════════════════════════════════════════');

  // ── Step 0: Fetch listing data from Supabase ──
  console.log(`\n📦 Step 0: Fetching listing ${LISTING_ID} from Supabase...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('*')
    .eq('id', LISTING_ID)
    .single();

  if (listingErr || !listing) {
    console.error('❌ Failed to fetch listing:', listingErr?.message || 'Not found');
    process.exit(1);
  }

  // Populate globals from DB
  USER_ID      = listing.user_id;
  DESCRIPTION  = listing.user_description || '';
  AESTHETIC    = listing.visual_aesthetic || '';
  AUDIENCE     = listing.visual_target_audience || '';
  VIBE         = listing.visual_overall_vibe || '';

  // Product type: resolve from product_types table, fallback to product_type_text
  if (listing.product_type_id) {
    const { data: pt } = await supabase
      .from('product_types')
      .select('name')
      .eq('id', listing.product_type_id)
      .single();
    PRODUCT_TYPE = pt?.name || listing.product_type_text || 'Unknown';
  } else {
    PRODUCT_TYPE = listing.product_type_text || 'Unknown';
  }

  // Theme/Niche/Sub-niche: try top-level columns first, then custom_listing JSON
  const custom = typeof listing.custom_listing === 'string'
    ? JSON.parse(listing.custom_listing)
    : listing.custom_listing || {};

  THEME     = listing.theme || custom.theme || 'General';
  NICHE     = listing.niche || custom.niche || 'General';
  SUB_NICHE = listing.sub_niche || custom.sub_niche || '';

  console.log('   ✅ Listing loaded from database:');
  console.log(`      Product Type: ${PRODUCT_TYPE}`);
  console.log(`      Theme: ${THEME} > Niche: ${NICHE} > Sub-niche: ${SUB_NICHE}`);
  console.log(`      Description: ${DESCRIPTION.substring(0, 80)}...`);
  console.log(`      Aesthetic: ${AESTHETIC}`);
  console.log(`      Audience: ${AUDIENCE}`);
  console.log(`      Vibe: ${VIBE}`);
  console.log(`      Persist: ${PERSIST}\n`);

  const totalStart = Date.now();

  // Step A
  const uniqueKeywords = await stepA();
  if (uniqueKeywords.length === 0) {
    console.error('❌ No keywords generated. Aborting.');
    process.exit(1);
  }

  // Step B
  const enriched = await stepB(uniqueKeywords);

  // Step C
  const scored = await stepC(enriched);

  // Step D
  const { keywords: finalKeywords, strength } = stepD(scored);

  // Step E
  await stepE(finalKeywords, strength);

  // Summary
  const selected = finalKeywords.filter(kw => kw.is_selection_ia);
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🎉 PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total time: ${((Date.now() - totalStart) / 1000).toFixed(1)}s`);
  console.log(`  Pool size: ${finalKeywords.length} | Selected: ${selected.length}`);
  console.log(`  LSI: ${strength?.listing_strength ?? 'N/A'}\n`);
  console.log('  Top 13 selected keywords:');
  selected.forEach((kw, i) => {
    console.log(`    ${(i + 1).toString().padStart(2)}. ${kw.keyword.padEnd(22)} vol=${String(kw.search_volume).padStart(6)} niche=${kw.niche_score ?? '?'} trans=${kw.transactional_score ?? '?'} comp=${(kw.competition ?? 0).toFixed(2)} cpc=$${(kw.cpc ?? 0).toFixed(2)}`);
  });
  console.log();
}

main().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message || err);
  console.error(err.stack);
  process.exit(1);
});
