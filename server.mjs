/**
 * Local Express API server for EtsyPenny.
 * Serves /api/seo/analyze-image (and future routes).
 * Run: node --env-file=.env server.mjs
 */
import express from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.API_PORT || 3001;

// ─── ENV VALIDATION ───────────────────────────────────────
const GOOGLE_API_KEY       = process.env.GOOGLE_API_KEY;
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_SECRET           = process.env.N8N_WEBHOOK_SECRET;
const DATAFORSEO_LOGIN     = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD  = process.env.DATAFORSEO_PASSWORD;

for (const [name, val] of Object.entries({ GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, N8N_SECRET })) {
  if (!val) { console.error(`❌ Missing env var: ${name}`); process.exit(1); }
}

// ─── GEMINI SETUP ─────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const generationConfig = {
  temperature: 0.7, topP: 1, topK: 1, maxOutputTokens: 8192,
  responseMimeType: 'application/json',
};
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function extractJson(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

async function runVisionModel(prompt, imageUrl) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig, safetySettings });
  const res = await fetch(imageUrl);
  const buf = await res.arrayBuffer();
  const imagePart = { inlineData: { data: Buffer.from(buf).toString('base64'), mimeType: 'image/jpeg' } };
  const result = await model.generateContent([prompt, imagePart]);
  return result.response.text();
}

async function runTextModel(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig, safetySettings });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── SUPABASE CLIENT ──────────────────────────────────────
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── PROMPTS ──────────────────────────────────────────────
const PROMPT_VISUAL_ANALYST = `
# Role
You are a Senior Visual Trend Analyst. Your goal is to extract the complete visual DNA of an e-commerce product.

# Task
Analyze the provided mockup and the context provided:
- Product type: {{productType}}
- Product details: {{description}}

Focus on the product being displayed and not on the background or decor if there is one. 

1. **Aesthetic/Style:** Identify the specific trend (e.g., Cottagecore, Y2K, Minimalist).
2. **Typography:** Personality, era, and emotional tone of the fonts. If there is not text, ignore.
3. **Graphic Elements:** Key illustrations, icons, textures, and composition.
4. **Color Palette:** Dominant colors and the psychological mood they evoke.
6. **Target Audience (Personas):** Identify 3 to 5 distinct ideal buyer profiles.
   - **Constraint 1:** Focus strictly on the **identity** and **persona** of the buyer.
   - **Constraint 2:** ABSOLUTELY NO mention of products, "gifts", or "apparel" (e.g., avoid "gift for mom" or "shirt lover").
   - **Constraint 3:** Format as a comma-separated list of short, searchable personas.
   - **Max Length:** 3 words per persona.

7. **Overall Vibe:** Summarize the emotional and commercial impression in one concise sentence.

# Output Format (JSON)
{
  "visual_analysis": {
    "aesthetic_style": "...",
    "typography_details": "...",
    "graphic_elements": "...",
    "color_palette": "...",
    "target_audience": "...",
    "overall_vibe": "..."
  }
}
`;

const PROMPT_TAXONOMY_MAPPING = `
# Role
You are an E-commerce Database Architect. Your goal is to map visual data into a specific store taxonomy.

# Task
Based on the visual analysis provided and product details, you MUST assign the most accurate Theme and Niche from the lists provided. You MUST always return a theme and a niche. Give priority to the user's themes and niches if you find one that corresponds, otherwise use PennySEO's themes and niches. If no theme or niche corresponds, you MUST select 'Others'. Then, create a high-potential Sub-niche.

# Visual analysis:
{{visualAnalysis}}

{{formattedTaxonomyReport}}

1. **Theme Selection:** Pick exactly ONE from the "USER'S THEMES" (priority) or "PennySEO THEMES" list. Use the name only.
2. **Niche Selection:** Pick exactly ONE from the "USER'S NICHES" (priority or) "PennySEO NICHES" list. Choose the one that best fits the target audience and visual style.
3. **Sub-niche Creation:** Generate a micro-segment (2-3 words) that is a logical descendant of the selected Niche for low-competition SEO.

# Output Format (JSON)
{
  "theme": "Exact Name from System List",
  "niche": "Exact Name from System List",
  "sub_niche": "Creative micro-segment",
  "final_positioning": "How this sub-niche dominates the chosen theme"
}
`;

// ─── HELPER FUNCTIONS ─────────────────────────────────────
function formatTaxonomyLists(themes, niches) {
  const filterByOrigin = (items) => {
    const user = items.filter(i => i.origin === 'custom').map(i => `* **${i.name}**: ${i.description || 'No description'}`);
    const system = items.filter(i => i.origin !== 'custom').map(i => `* **${i.name}**: ${i.description || 'No description'}`);
    return { user, system };
  };
  const t = filterByOrigin(themes);
  const n = filterByOrigin(niches);
  return `# Available Themes and Niches
### USER'S THEMES
${t.user.join('\n')}
### PennySEO THEMES
${t.system.join('\n')}
---
### USER'S NICHES
${n.user.join('\n')}
### PennySEO NICHES
${n.system.join('\n')}`;
}

function mergeAnalysisResults(listingId, visualData, taxonomyData) {
  const taxonomy = Array.isArray(taxonomyData) ? taxonomyData[0] : taxonomyData;
  console.log("Taxonomy Data in mergeAnalysisResults:", taxonomy);
  return {
    listing_id: listingId,
    visual_analysis: {
      ...visualData,
      theme: taxonomy?.theme || null,
      niche: taxonomy?.niche || null,
      "sub-niche": taxonomy?.sub_niche || null
    }
  };
}

// ─── API ROUTE: POST /api/seo/analyze-image ───────────────
app.post('/api/seo/analyze-image', async (req, res) => {
  try {
    const {
      listing_id,
      user_id,
      mockup_url,
      product_type = '',
      client_description = '',
    } = req.body;

    // Step 1: Validation
    if (!listing_id || !mockup_url || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id, user_id, and mockup_url' });
    }

    console.log(`\n🔍 [analyze-image] Starting for listing ${listing_id}`);

    // Step 2: Visual DNA Extraction (Gemini Vision)
    console.log('   Step 2: Running Gemini Vision...');
    const visualPrompt = PROMPT_VISUAL_ANALYST
      .replace('{{productType}}', product_type)
      .replace('{{description}}', client_description);

    const visualRaw = await runVisionModel(visualPrompt, mockup_url);
    const visualData = JSON.parse(extractJson(visualRaw));
    const visualAnalysis = visualData.visual_analysis;
    console.log('   ✅ Visual analysis done');

    // Step 3: Taxonomy Retrieval (Supabase)
    console.log('   Step 3: Fetching taxonomy...');
    const [themesResult, nichesResult] = await Promise.all([
      supabaseAdmin.from('v_combined_themes').select('*'),
      supabaseAdmin.from('v_combined_niches').select('*'),
    ]);

    if (themesResult.error) throw new Error(`Themes: ${themesResult.error.message}`);
    if (nichesResult.error) throw new Error(`Niches: ${nichesResult.error.message}`);

    const formattedTaxonomy = formatTaxonomyLists(themesResult.data, nichesResult.data);
    console.log(`   ✅ Got ${themesResult.data.length} themes, ${nichesResult.data.length} niches`);

    // Step 4: Taxonomy Mapping (Gemini Text)
    console.log('   Step 4: Running Gemini Taxonomy mapping...');
    const visualAnalysisContext = `
Aesthetic style: ${visualAnalysis.aesthetic_style}
Typography details: ${visualAnalysis.typography_details}
Graphic elements: ${visualAnalysis.graphic_elements}
Color palette: ${visualAnalysis.color_palette}
Target audience: ${visualAnalysis.target_audience}
Overall Vibe: ${visualAnalysis.overall_vibe}
`;

    const productDetailsContext = `
#Product details:
Product type: ${product_type}
Product details: ${client_description}
`;

    const taxonomyPrompt = PROMPT_TAXONOMY_MAPPING
        .replace('{{visualAnalysis}}', visualAnalysisContext)
        .replace('{{formattedTaxonomyReport}}', formattedTaxonomy)
        .replace('# Visual analysis:', `${productDetailsContext}\n# Visual analysis:`);

    console.log("Taxonomy Prompt:", taxonomyPrompt);

    const taxonomyRaw = await runTextModel(taxonomyPrompt);
    const taxonomyMapping = JSON.parse(extractJson(taxonomyRaw));
    console.log("Taxonomy Mapping Output:", taxonomyMapping);
    console.log(`   ✅ Theme: ${taxonomyMapping.theme}, Niche: ${taxonomyMapping.niche}`);

    // Step 5: Merge & Save via Edge Function
    console.log('   Step 5: Saving via edge function...');
    const finalAnalysis = mergeAnalysisResults(listing_id, visualAnalysis, taxonomyMapping);

    console.log("Final Analysis Payload:", JSON.stringify(finalAnalysis, null, 2));

    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/save-image-analysis`;
    const saveResponse = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'x-api-key': N8N_SECRET,
      },
      body: JSON.stringify(finalAnalysis),
    });

    if (!saveResponse.ok) {
      const errText = await saveResponse.text();
      throw new Error(`Edge function failed (${saveResponse.status}): ${errText}`);
    }

    console.log('   ✅ Saved successfully!\n');
    return res.json(finalAnalysis);

  } catch (error) {
    console.error('❌ [analyze-image] Error:', error.message || error);
    return res.status(500).json({
      error: 'Failed to analyze image.',
      details: error.message || 'An unknown error occurred',
    });
  }
});

// ─── GENERATE-KEYWORDS HELPERS ────────────────────────────
const scoringConfig = { ...generationConfig, temperature: 0.1 };

function getEtsyVolume(webVol) {
  if (!webVol || webVol <= 0) return 0;
  return Math.round(22 * Math.pow(webVol, 0.9));
}

const KEYWORD_SEGMENTS = [
  { name: 'Broad & High Volume', description: 'High-level niche terms and general gift categories. Focus on high search volume.' },
  { name: 'Balanced & Descriptive', description: 'Mid-range keywords combining the niche with specific themes and graphics from the visual analysis.' },
  { name: 'Audience & Gift Scenarios', description: "Target specific buyers (e.g., 'Gift for Coworker') and occasions (Birthday, Christmas, etc.)." },
  { name: 'Sniper & Long-Tail', description: 'Ultra-specific, low-competition terms and cultural sub-niches related to the design.' },
  { name: 'Aesthetic & Vibe', description: "Focus on the look, mood, and specific art style (e.g., 'Kawaii Aesthetic', 'Cyberpunk Vibe')." },
];

// Step A: Generate keyword pool (5 parallel Gemini calls)
async function generateKeywordPool(ctx) {
  const results = await Promise.allSettled(
    KEYWORD_SEGMENTS.map(async (seg) => {
      const prompt = `# Role\nYou are an expert Etsy SEO Specialist.\n\n# Task\nGenerate 50 high-intent keywords for: ${seg.name}\n${seg.name}: ${seg.description}\n\n# Context\n- Product Type: ${ctx.product_type}\n- Theme: ${ctx.theme}\n- Niche: ${ctx.niche}\n- Sub-niche: ${ctx.sub_niche}\n- Description: ${ctx.client_description}\n\n# Visual & Marketing Data\n- Aesthetic/Style: ${ctx.visual_aesthetic}\n- Target Audience: ${ctx.visual_target_audience}\n- Overall Vibe: ${ctx.visual_overall_vibe}\n\n# Rules\n- Max 20 characters per keyword (CRITICAL for Etsy tags).\n- Max 3 words per phrase.\n- No duplicates, no trademarks, lowercase only.\n- Include product type in keywords at least 75% of the time.\n- Format: JSON object {"keywords": ["keyword1", "keyword2", ...]}`;
      const raw = await runTextModel(prompt);
      const parsed = JSON.parse(extractJson(raw));
      const kws = parsed.keywords ?? parsed.output?.keywords ?? [];
      return kws.filter(k => typeof k === 'string' && k.length > 0).map(k => k.toLowerCase().trim()).filter(k => k.length <= 20);
    })
  );
  const pool = [];
  for (const r of results) {
    if (r.status === 'fulfilled') pool.push(...r.value);
    else console.warn(`   ⚠️ Segment FAILED: ${r.reason?.message}`);
  }
  return [...new Set(pool)];
}

// Step B: Enrich with cache + DataForSEO
async function enrichKeywords(keywords) {
  // B1: Cache check
  let cached = [];
  try {
    const cacheRes = await fetch(`${SUPABASE_URL}/functions/v1/check-keyword-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'x-api-key': N8N_SECRET },
      body: JSON.stringify({ keywords }),
    });
    if (cacheRes.ok) { const d = await cacheRes.json(); cached = d.cachedKeywords || []; }
  } catch (e) { console.warn('   ⚠️ Cache check failed:', e.message); }

  const cachedTags = new Set(cached.map(c => c.tag));
  const fromCache = cached.map(c => ({ keyword: c.tag, search_volume: c.search_volume || 0, competition: c.competition ?? 0.5, cpc: c.cpc || 0, volume_history: c.volume_history || [], fromCache: true }));

  // B2: DataForSEO for uncached
  const uncached = keywords.filter(kw => !cachedTags.has(kw));
  let fromAPI = [];
  if (uncached.length > 0 && DATAFORSEO_LOGIN && !DATAFORSEO_LOGIN.startsWith('your_')) {
    try {
      const dfsRes = await fetch('https://api.dataforseo.com/v3/keywords_data/google/search_volume/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64') },
        body: JSON.stringify([{ keywords: uncached, location_name: 'United States', language_name: 'English' }]),
      });
      if (dfsRes.ok) {
        const dfsData = await dfsRes.json();
        const items = dfsData?.tasks?.[0]?.result || [];
        fromAPI = items.map(item => ({
          keyword: item.keyword,
          search_volume: getEtsyVolume(item.search_volume || 0),
          competition: item.competition ?? 0.5,
          cpc: item.cpc || 0,
          volume_history: item.monthly_searches ? item.monthly_searches.map(m => getEtsyVolume(m.search_volume || 0)).reverse() : new Array(12).fill(0),
          fromCache: false,
        }));
      }
    } catch (e) { console.warn('   ⚠️ DataForSEO failed:', e.message); }
  }

  // B3: Zero-fill missing
  const known = new Set([...fromCache.map(k => k.keyword), ...fromAPI.map(k => k.keyword)]);
  const missing = keywords.filter(kw => !known.has(kw)).map(kw => ({ keyword: kw, search_volume: 0, competition: 0.5, cpc: 0, volume_history: new Array(12).fill(0), fromCache: false }));
  console.log(`   📊 Enriched: ${fromCache.length} cached + ${fromAPI.length} API + ${missing.length} zero-fill = ${fromCache.length + fromAPI.length + missing.length}`);
  return [...fromCache, ...fromAPI, ...missing];
}

// Step C: Score keywords (niche + transactional)
async function scoreKeywords(stats, ctx) {
  const kws = stats.map(s => s.keyword);
  const nicheSystem = `# Role\nYou are a Senior Etsy SEO Specialist evaluating tags on niche precision.\n\n# Product context:\n- Theme: ${ctx.theme} | Niche: ${ctx.niche} | Sub-niche: ${ctx.sub_niche}\n- Product Type: ${ctx.product_type}\n- Aesthetic/Style: ${ctx.visual_aesthetic} | Target Audience: ${ctx.visual_target_audience} | Vibe: ${ctx.visual_overall_vibe}\n\n# Scoring: Use ONLY 10, 7, 4, or 1.\n- 10 = Niche-Specific (Style + Subject + Product alignment)\n- 7 = Strong (High relevance but less unique)\n- 4 = Neutral (Broadly descriptive or niche+filler combo)\n- 1 = Broad (Generic filler: "gift for her", "personalized")\n\nReturn ONLY: {"keywords": [{"keyword": "...", "niche_score": N}]}`;
  const transSystem = `# Role\nYou are a Senior Etsy SEO Specialist evaluating tags on purchase intent.\n\n# Context: Product Type: ${ctx.product_type} | Theme: ${ctx.theme} | Niche: ${ctx.niche}\n\n# Scoring: Use ONLY 10, 7, 4, or 1.\n- 10 = High-Conversion (Product Noun + Purchase Trigger + Recipient/Occasion)\n- 7 = Product-Focused (Product Noun + Style, no recipient)\n- 4 = Browsing (Style/vibe, missing product noun)\n- 1 = Informational (DIY, ideas, tutorials)\n\nReturn ONLY: {"keywords": [{"keyword": "...", "transactional_score": N}]}`;

  const BATCH = 25;
  const batches = [];
  for (let i = 0; i < kws.length; i += BATCH) batches.push(kws.slice(i, i + BATCH));

  const runScoring = async (systemPrompt, batchList) => {
    const results = [];
    for (const batch of batchList) {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: scoringConfig, safetySettings, systemInstruction: systemPrompt });
      const raw = await model.generateContent(`# Keywords to Analyze:\n${JSON.stringify(batch)}`);
      const text = raw.response.text().replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const parsed = JSON.parse(text);
      results.push(...(parsed.keywords ?? []));
    }
    return results;
  };

  const [nicheResults, transResults] = await Promise.all([
    runScoring(nicheSystem, batches),
    runScoring(transSystem, batches),
  ]);

  const VALID = new Set([10, 7, 4, 1]);
  const nicheMap = new Map(nicheResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.niche_score) ? r.niche_score : 1]));
  const transMap = new Map(transResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.transactional_score) ? r.transactional_score : 1]));

  return stats.map(s => ({
    keyword: s.keyword, search_volume: s.search_volume, competition: s.competition, cpc: s.cpc,
    volume_history: s.volume_history,
    niche_score: nicheMap.get(s.keyword) ?? null,
    transactional_score: transMap.get(s.keyword) ?? null,
    is_selection_ia: false, is_user_added: false, is_pinned: false, fromCache: s.fromCache,
  }));
}

// Step D: Select top keywords + calculate LSI
function selectAndScore(keywords, params) {
  const volW = (params.Volume ?? 5) / 5;
  const compW = (params.Competition ?? 5) / 5;
  const transW = (params.Transaction ?? 5) / 5;
  const nicheW = (params.Niche ?? 5) / 5;
  const cpcW = (params.CPC ?? 5) / 5;

  const scored = keywords.map(kw => {
    const nS = (kw.niche_score ?? 5) / 10;
    const tS = (kw.transactional_score ?? 5) / 10;
    const volNorm = Math.log10(Math.max(1, kw.search_volume + 1)) / 7;
    const compPenalty = kw.competition ?? 0.5;
    const cpcNorm = Math.min(1, (kw.cpc || 0) / 2.5);
    const composite = nS * nicheW + tS * transW + volNorm * volW - compPenalty * compW + cpcNorm * cpcW;
    return { kw, composite };
  });
  scored.sort((a, b) => b.composite - a.composite);

  const N = params.ai_selection_count ?? 13;
  scored.forEach((item, idx) => { item.kw.is_selection_ia = idx < N; });
  const finalKws = scored.map(s => s.kw);
  const selected = finalKws.filter(kw => kw.is_selection_ia);

  let strength = null;
  if (selected.length > 0) {
    let totalMarketReach = 0, totalPowerIndex = 0;
    selected.forEach(kw => {
      const vol = Math.min(1000000, kw.search_volume || 0);
      const nS = kw.niche_score ?? 5;
      const tS = kw.transactional_score ?? 5;
      const dw = 0.8 + (nS / 20) + (tS / 20);
      totalMarketReach += vol * dw;
      totalPowerIndex += Math.sqrt(vol) * dw;
    });
    const ceil = 10000000;
    const visibility = Math.min(100, Math.round((Math.log10(Math.max(1, totalMarketReach)) / Math.log10(ceil)) * 100));
    const avgTrans = selected.reduce((a, k) => a + (Number(k.transactional_score) || 5), 0) / selected.length;
    const avgCPC = selected.reduce((a, k) => a + (Number(k.cpc) || 0), 0) / selected.length;
    const cpcS = Math.min(10, (avgCPC / 2.5) * 10);
    const conversion = (avgTrans * 5) + (cpcS * 5);
    const avgNiche = selected.reduce((a, k) => a + (Number(k.niche_score) || 5), 0) / selected.length;
    const relevance = avgNiche * 10;
    const sorted = [...selected].sort((a, b) => (Number(a.competition) || 1) - (Number(b.competition) || 1));
    const top5 = sorted.slice(0, 5);
    const avgBestComp = top5.reduce((a, k) => a + (Number(k.competition) || 0.9), 0) / top5.length;
    const competition = Math.round(Math.pow(1 - Math.min(0.99, avgBestComp), 0.3) * 100);
    const cpcAll = Math.min(100, (avgCPC / 2.5) * 100);
    const transS = avgTrans * 10;
    const profit = Math.round((visibility * 0.35) + (cpcAll * 0.40) + (transS * 0.25));
    const lsi = Math.round((visibility * 0.25) + (conversion * 0.35) + (relevance * 0.25) + (competition * 0.15));

    strength = {
      listing_strength: lsi,
      breakdown: { visibility, conversion: Math.round(conversion), relevance: Math.round(relevance), competition, profit },
      stats: {
        total_keywords: selected.length,
        avg_cpc: parseFloat(avgCPC.toFixed(2)),
        avg_competition_all: parseFloat((selected.reduce((a, k) => a + (Number(k.competition) || 0.8), 0) / selected.length).toFixed(2)),
        best_opportunity_comp: parseFloat(avgBestComp.toFixed(2)),
        raw_visibility_index: Math.round(totalPowerIndex),
        est_market_reach: Math.round(totalMarketReach),
      },
    };
  }
  return { keywords: finalKws, strength };
}

// Step E: Persist via save-seo edge function
async function persistSeo(listingId, keywords, strength, params) {
  const payload = {
    listing_id: listingId,
    results: {
      balanced: {
        listing_strength: strength?.listing_strength ?? 0,
        breakdown: strength?.breakdown ?? {},
        stats: strength?.stats ?? {},
        seo_parameters: params,
        keywords: keywords.map(kw => ({
          keyword: kw.keyword, search_volume: kw.search_volume, competition: kw.competition, cpc: kw.cpc,
          volume_history: kw.volume_history, niche_score: kw.niche_score, transactional_score: kw.transactional_score,
          is_selection_ia: kw.is_selection_ia, is_user_added: kw.is_user_added, is_pinned: kw.is_pinned,
          is_current_pool: true, is_current_eval: false,
        })),
      },
    },
    trigger_reset_pool: true,
  };

  const saveRes = await fetch(`${SUPABASE_URL}/functions/v1/save-seo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'x-api-key': N8N_SECRET },
    body: JSON.stringify(payload),
  });
  if (!saveRes.ok) {
    const errText = await saveRes.text();
    throw new Error(`save-seo failed (${saveRes.status}): ${errText}`);
  }
  return await saveRes.json();
}

// ─── API ROUTE: POST /api/seo/generate-keywords ──────────
app.post('/api/seo/generate-keywords', async (req, res) => {
  const t0 = Date.now();
  try {
    const {
      listing_id, user_id, product_type = '', theme = '', niche = '', sub_niche = '',
      client_description = '', visual_aesthetic = '', visual_target_audience = '', visual_overall_vibe = '',
      parameters = {},
    } = req.body;

    if (!listing_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id and user_id' });
    }

    const ctx = { product_type, theme, niche, sub_niche, client_description, visual_aesthetic, visual_target_audience, visual_overall_vibe };
    const params = { Volume: 5, Competition: 5, Transaction: 5, Niche: 5, CPC: 5, ai_selection_count: 13, ...parameters };

    console.log(`\n🔍 [generate-keywords] Starting for listing ${listing_id}`);
    console.log(`   Product: ${product_type} | ${theme} > ${niche} > ${sub_niche}`);

    // Step A
    console.log('   Step A: Generating keyword pool...');
    const uniqueKeywords = await generateKeywordPool(ctx);
    console.log(`   ✅ ${uniqueKeywords.length} unique keywords (${Date.now() - t0}ms)`);
    if (uniqueKeywords.length === 0) return res.status(500).json({ error: 'No keywords generated' });

    // Step B
    console.log('   Step B: Enriching keywords...');
    const enriched = await enrichKeywords(uniqueKeywords);

    // Step C
    console.log('   Step C: Scoring keywords...');
    const scored = await scoreKeywords(enriched, ctx);
    console.log(`   ✅ Scored ${scored.length} keywords (${Date.now() - t0}ms)`);

    // Step D
    console.log('   Step D: Selecting + calculating LSI...');
    const { keywords: finalKeywords, strength } = selectAndScore(scored, params);
    const selected = finalKeywords.filter(kw => kw.is_selection_ia);
    console.log(`   ✅ Selected ${selected.length} / ${finalKeywords.length} | LSI = ${strength?.listing_strength ?? 'N/A'}`);

    // Step E
    console.log('   Step E: Saving via save-seo...');
    await persistSeo(listing_id, finalKeywords, strength, params);
    console.log('   ✅ Saved!');

    // Update listing flags: SEO done, no longer generating
    const STATUS_SEO_DONE = '35660e24-94bb-4586-aa5a-a5027546b4a1';
    await supabaseAdmin.from('listings').update({
      is_generating_seo: false,
      status_id: STATUS_SEO_DONE,
      updated_at: new Date().toISOString(),
    }).eq('id', listing_id);

    console.log(`   🎉 Pipeline complete in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

    return res.json({
      success: true,
      listing_id,
      pool_size: finalKeywords.length,
      selected_count: selected.length,
      listing_strength: strength?.listing_strength ?? null,
      breakdown: strength?.breakdown ?? null,
      stats: strength?.stats ?? null,
      elapsed_ms: Date.now() - t0,
    });

  } catch (error) {
    console.error('❌ [generate-keywords] Error:', error.message || error);
    // Try to reset is_generating_seo on failure
    try {
      const { listing_id } = req.body || {};
      if (listing_id) {
        await supabaseAdmin.from('listings').update({ is_generating_seo: false }).eq('id', listing_id);
      }
    } catch (_) {}
    return res.status(500).json({ error: 'Failed to generate keywords.', details: error.message || 'Unknown error' });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── HELPER: APPLY SEO FILTER (from PennySEO Filter node) ─
export function applySEOFilter(keywords, params) {
  if (!keywords || keywords.length === 0) return [];

  const maxRefCPC = 2.5;
  const maxVol = Math.max(...keywords.map(k => k.search_volume || k.volume || 0), 100);

  const MIN_TRANSACTIONAL = 5;
  const MIN_NICHE = 2;

  const processed = keywords.map(item => {
    const vol = item.search_volume || item.volume || 0;
    const rawComp = (item.competition !== null && item.competition !== undefined) ? Number(item.competition) : 0.5;
    const txScore = item.transactional_score || 5;
    const nicheScore = item.niche_score || 5;
    const rawCPC = item.cpc || 0;

    // Hard Filters (Bypass for user-added keywords)
    if (!item.is_user_added && (txScore < MIN_TRANSACTIONAL || nicheScore < MIN_NICHE)) return null;

    const V = Math.log(vol + 1) / Math.log(maxVol + 1);
    const C = 1 - rawComp;
    const T = Math.pow(txScore / 10, 2);
    const N = Math.pow(nicheScore / 10, 2);
    const E = Math.min(1, rawCPC / maxRefCPC);

    let finalScore = 100 * (
      Math.pow(V || 0.01, params.Volume) *
      Math.pow(C || 0.01, params.Competition) *
      Math.pow(T || 0.01, params.Transaction) *
      Math.pow(N || 0.01, params.Niche) *
      Math.pow(E || 0.01, params.CPC)
    );

    const wordCount = (item.keyword || item.tag || '').split(' ').filter(w => w.length > 0).length;
    if (wordCount >= 3) finalScore *= 1.1;

    const history = [...(item.volume_history || [])];
    while (history.length < 12) history.push(0);

    const currentMonth = history[0];
    const recentAvg = (history[0] + history[1] + history[2]) / 3;
    const pastMonths = history.slice(3, 12);
    const historicalAvg = pastMonths.reduce((a, b) => a + b, 0) / (pastMonths.length || 1) || 1;

    const isDropping = currentMonth < (history[1] * params.trending_dropping_threshold);
    const isTrending = !isDropping && (recentAvg > historicalAvg * params.trending_growth_factor) && currentMonth > params.trending_current_month_min_volume;

    const nonZeroHistory = history.filter(v => v > 0);
    const minVol = nonZeroHistory.length > 0 ? Math.min(...nonZeroHistory) : 0;
    const maxVolInHistory = Math.max(...history, 0);
    const stabilityRatio = maxVolInHistory / (minVol || 1);

    const isEvergreen = !isTrending &&
                        vol > params.evergreen_avg_volume &&
                        stabilityRatio < params.evergreen_stability_ratio &&
                        minVol > (vol * params.evergreen_minimum_volume);

    const isPromising = finalScore > params.promising_min_score && rawComp < params.promising_competition;

    return {
      ...item,
      opportunity_score: Math.round(finalScore),
      status: { trending: isTrending, evergreen: isEvergreen, promising: isPromising },
      is_pinned: item.is_pinned || false
    };
  }).filter(i => i !== null);

  processed.sort((a, b) => {
    // 1. Pinned keywords always first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    // 2. Then by opportunity score descending
    return b.opportunity_score - a.opportunity_score;
  });

  const selectedTags = [];
  const conceptTracker = {};
  const TAG_COUNT = 200;

  for (const item of processed) {
    if (selectedTags.length >= TAG_COUNT) break;
    const rawKeyword = (item.keyword || item.tag || '').toLowerCase();
    const concept = rawKeyword
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ');
    
    conceptTracker[concept] = (conceptTracker[concept] || 0) + 1;
    if (item.is_user_added || conceptTracker[concept] <= params.concept_diversity_limit) {
      selectedTags.push(item);
    }
  }

  let aiCount = 0;
  let poolCount = 0;
  const WORKING_POOL_LIMIT = params.working_pool_count || 40;

  return selectedTags.map((item, index) => {
    const isUserAdded = item.is_user_added === true || item.is_user_added === 'true';
    let isInTopSelection = false;

    // 1. AI Selection Quota (13 limit)
    if (item.is_pinned) {
        aiCount++; // Pinned explicitly consumes a slot
    } else if (aiCount < (params.ai_selection_count || 13)) {
        isInTopSelection = true;
        aiCount++;
    }

    // 2. Visibility Pool (40 limit)
    // Always show user-added/pinned keywords, even if their score pushes them beyond index 40
    let isInPool = false;
    if (isUserAdded || item.is_pinned) {
        isInPool = true;
    } else if (poolCount < WORKING_POOL_LIMIT) {
        isInPool = true;
        poolCount++;
    }

    return {
      ...item,
      is_selection_ia: isInTopSelection,
      is_current_eval: isInTopSelection ? true : null,
      is_current_pool: isInPool,
    };
  });
}

// ─── API ROUTE: POST /api/seo/reset-pool ──────────────────
app.post('/api/seo/reset-pool', async (req, res) => {
  try {
    const { listing_id, seo_mode = 'balanced' } = req.body;
    if (!listing_id) {
      return res.status(400).json({ error: 'Missing listing_id' });
    }

    console.log(`\n🔄 [reset-pool] Starting for listing ${listing_id}`);

    // 1. Fetch keywords for the listing
    const { data: keywords, error: kwError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id);

    if (kwError) throw kwError;
    if (!keywords || keywords.length === 0) {
      return res.status(404).json({ error: 'No keywords found for this listing' });
    }

    // 2. Fetch the listing owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw listingError || new Error("Listing not found");

    // 3. Fetch user settings from view
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw settingsError || new Error("Settings not found");

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.15,
      Transaction: settings.param_transaction ?? 0.35,
      Niche: settings.param_niche ?? 0.25,
      CPC: settings.param_cpc ?? 0,
      evergreen_stability_ratio: settings.evergreen_stability_ratio ?? 4,
      evergreen_minimum_volume: settings.evergreen_minimum_volume ?? 0.3,
      evergreen_avg_volume: settings.evergreen_avg_volume ?? 50,
      trending_dropping_threshold: settings.trending_dropping_threshold ?? 0.8,
      trending_current_month_min_volume: settings.trending_current_month_min_volume ?? 150,
      trending_growth_factor: settings.trending_growth_factor ?? 1.5,
      promising_min_score: settings.promising_min_score ?? 55,
      promising_competition: settings.promising_competition ?? settings.promosing_competition ?? 0.4,
      ai_selection_count: settings.ai_selection_count || 13,
      working_pool_count: settings.working_pool_count || 40,
      concept_diversity_limit: settings.concept_diversity_limit || 5
    };

    // Override with incoming parameters
    const finalParams = { ...params, ...(req.body.parameters || {}) };

    // 4. Apply filter
    const filteredKeywords = applySEOFilter(keywords, finalParams);

    // 4.5 Reset flags for all keywords before applying the new ones
    await supabaseAdmin
      .from('listing_seo_stats')
      .update({
        is_selection_ia: false,
        is_current_eval: false,
        is_current_pool: false
      })
      .eq('listing_id', listing_id)
      .eq('is_competition', false);

    // 5. Update keywords in DB
    const updates = filteredKeywords.map(kw => ({
      id: kw.id,
      listing_id: kw.listing_id,
      tag: kw.tag,
      opportunity_score: kw.opportunity_score,
      is_trending: kw.status.trending,
      is_evergreen: kw.status.evergreen,
      is_promising: kw.status.promising,
      is_selection_ia: kw.is_selection_ia,
      is_current_eval: kw.is_current_eval,
      is_current_pool: kw.is_current_pool,
      is_pinned: kw.is_pinned
    }));

    const { error: updateError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) throw updateError;

    // 6. Calculate new listing strength using selectAndScore logic as fallback
    const { strength } = selectAndScore(filteredKeywords, finalParams);
    
    if (strength) {
      await supabaseAdmin
        .from('listings')
        .update({
           listing_strength: strength.listing_strength,
           visibility_score: strength.breakdown.visibility,
           relevance_score: strength.breakdown.relevance,
           conversion_score: strength.breakdown.conversion,
           competition_score: strength.breakdown.competition,
           profit_score: strength.breakdown.profit,
           est_market_reach: strength.stats.est_market_reach
        })
        .eq('id', listing_id);

      // Check if global eval exists for this mode
      const { data: existingEvalRows } = await supabaseAdmin
        .from('listings_global_eval')
        .select('id')
        .eq('listing_id', listing_id)
        .eq('seo_mode', seo_mode);

      const evalPayload = {
        listing_id,
        seo_mode,
        listing_strength: strength.listing_strength,
        listing_visibility: strength.breakdown.visibility,
        listing_conversion: strength.breakdown.conversion,
        listing_relevance: Math.round(strength.breakdown.relevance),
        listing_competition: strength.breakdown.competition,
        listing_profit: strength.breakdown.profit,
        listing_est_market_reach: strength.stats.est_market_reach,
        param_Volume: finalParams.Volume,
        param_Competition: finalParams.Competition,
        param_Transaction: finalParams.Transaction,
        param_Niche: finalParams.Niche,
        param_cpc: finalParams.CPC,
        updated_at: new Date().toISOString()
      };

      if (existingEvalRows?.length > 0) {
        await supabaseAdmin
          .from('listings_global_eval')
          .update(evalPayload)
          .eq('id', existingEvalRows[0].id);
      } else {
        await supabaseAdmin
          .from('listings_global_eval')
          .insert(evalPayload);
      }
    }

    console.log(`   ✅ Pool reset complete for ${listing_id}`);
    return res.json({ success: true, processed: filteredKeywords.length, top_selections: filteredKeywords.filter(k => k.is_selection_ia).length, strength });

  } catch (error) {
    console.error('❌ [reset-pool] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to reset pool.', details: error.message || 'Unknown error' });
  }
});

// ─── API ROUTE: POST /api/seo/user-keyword ────────────
app.post('/api/seo/user-keyword', async (req, res) => {
  const t0 = Date.now();
  console.log(`\n📥 [user-keyword] Request for listing: ${req.body.listing_id}`);
  const { listing_id, keyword } = req.body;

  if (!listing_id || !keyword) {
    return res.status(400).json({ error: 'Missing listing_id or keyword' });
  }

  try {
    const cleanKeyword = keyword.trim().toLowerCase();

    // 1. Fetch listing context
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw new Error("Listing not found");

    const ctx = {
      product_type: listing.product_type || listing.product_type_text,
      theme: listing.theme,
      niche: listing.niche,
      sub_niche: listing.sub_niche,
      visual_aesthetic: listing.visual_aesthetic,
      visual_target_audience: listing.visual_target_audience,
      visual_overall_vibe: listing.visual_overall_vibe
    };

    // 2. Fetch SEO settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw new Error("Settings not found");

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.15,
      Transaction: settings.param_transaction ?? 0.35,
      Niche: settings.param_niche ?? 0.25,
      CPC: settings.param_cpc ?? 0,
      evergreen_stability_ratio: settings.evergreen_stability_ratio ?? 4,
      evergreen_minimum_volume: settings.evergreen_minimum_volume ?? 0.3,
      evergreen_avg_volume: settings.evergreen_avg_volume ?? 50,
      trending_dropping_threshold: settings.trending_dropping_threshold ?? 0.8,
      trending_current_month_min_volume: settings.trending_current_month_min_volume ?? 150,
      trending_growth_factor: settings.trending_growth_factor ?? 1.5,
      promising_min_score: settings.promising_min_score ?? 55,
      promising_competition: settings.promising_competition ?? 0.4,
      ai_selection_count: settings.ai_selection_count || 13,
      working_pool_count: settings.working_pool_count || 40,
      concept_diversity_limit: settings.concept_diversity_limit || 5
    };

    // 3. Enrich + Score the single keyword
    console.log(`   🔍 Enriching & Scoring: "${cleanKeyword}"`);
    const stats = await enrichKeywords([cleanKeyword]);
    const scored = await scoreKeywords(stats, ctx);
    const newKw = scored[0];

    // 4. Initial Upsert
    const upsertPayload = {
      listing_id,
      tag: cleanKeyword,
      search_volume: newKw.search_volume,
      competition: (newKw.competition ?? 0.5).toString(),
      cpc: newKw.cpc,
      volume_history: newKw.volume_history,
      niche_score: newKw.niche_score,
      transactional_score: newKw.transactional_score,
      is_user_added: true,
      is_pinned: false,
      is_current_pool: true,
      is_selection_ia: true,
      is_current_eval: true
    };

    const { error: initialUpsertError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(upsertPayload, { onConflict: 'listing_id,tag' });
    
    if (initialUpsertError) throw initialUpsertError;

    // 5. Fetch full pool and Re-rank
    const { data: pool, error: poolError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('is_current_pool', true);

    if (poolError) throw poolError;

    const processedPool = applySEOFilter(pool, params);

    // 6. Sync Pool Updates
    const updates = processedPool.map(kw => ({
      id: kw.id,
      listing_id: kw.listing_id,
      tag: kw.tag,
      opportunity_score: kw.opportunity_score,
      is_trending: kw.status.trending,
      is_evergreen: kw.status.evergreen,
      is_promising: kw.status.promising,
      // Omit `is_selection_ia` and `is_current_eval` to preserve the current AI selections
      // until the user explicitly applies a new strategy (which will enforce the strict 13 limit).
      is_current_pool: kw.is_current_pool,
      is_pinned: kw.is_pinned
    }));

    const { error: batchUpdateError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(updates, { onConflict: 'id' });
    
    if (batchUpdateError) throw batchUpdateError;

    // 7. Update Listing Strength
    const { strength } = selectAndScore(processedPool, params);
    if (strength) {
      await supabaseAdmin
        .from('listings')
        .update({
           listing_strength: strength.listing_strength,
           visibility_score: strength.breakdown.visibility,
           relevance_score: strength.breakdown.relevance,
           conversion_score: strength.breakdown.conversion,
           competition_score: strength.breakdown.competition,
           profit_score: strength.breakdown.profit,
           est_market_reach: strength.stats.est_market_reach
        })
        .eq('id', listing_id);
    }

    const finalKw = processedPool.find(k => k.tag === cleanKeyword) || newKw;
    
    console.log(`   ✅ User keyword added: ${cleanKeyword} (${Date.now() - t0}ms)`);
    return res.json({
      success: true,
      listing_strength: strength?.listing_strength || 0,
      keyword: {
        tag: finalKw.tag || cleanKeyword,
        is_user_added: true,
        is_pinned: false,
        search_volume: finalKw.search_volume,
        competition: finalKw.competition,
        cpc: finalKw.cpc,
        niche_score: finalKw.niche_score,
        transactional_score: finalKw.transactional_score,
        opportunity_score: finalKw.opportunity_score,
        is_selection_ia: false,
        is_current_eval: null,
        is_trending: finalKw.status?.trending || false,
        is_evergreen: finalKw.status?.evergreen || false,
        is_promising: finalKw.status?.promising || false
      }
    });

  } catch (error) {
    console.error('❌ [user-keyword] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to add user keyword.', details: error.message || 'Unknown error' });
  }
});

// ─── START ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 EtsyPenny API server running on http://localhost:${PORT}`);
  console.log(`   POST /api/seo/analyze-image`);
  console.log(`   POST /api/seo/generate-keywords`);
  console.log(`   POST /api/seo/reset-pool`);
  console.log(`   GET  /api/health\n`);
});
