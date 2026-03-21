/**
 * Local Express API server for EtsyPenny.
 * Serves /api/seo/analyze-image (and future routes).
 * Run: node --env-file=.env server.mjs
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// ─── SHARED LIB IMPORTS (same modules used by Vercel api/) ──
import { extractJson } from './lib/ai/extract-json.ts';
import { runVisionModel, runTextModel } from './lib/ai/gemini.ts';
import { generateKeywordPool } from './lib/seo/generate-keyword-pool.ts';
import { enrichKeywords } from './lib/seo/enrich-keywords.ts';
import { scoreKeywords } from './lib/seo/score-keywords.ts';
import { selectAndScore } from './lib/seo/select-and-score.ts';
import { persistSeo } from './lib/seo/persist-seo.ts';
import { persistStrength } from './lib/seo/persist-strength.ts';
import { applySEOFilter } from './lib/seo/filter-logic.ts';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.API_PORT || 3001;

// ─── ENV VALIDATION ───────────────────────────────────────
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_SECRET           = process.env.N8N_WEBHOOK_SECRET;

for (const [name, val] of Object.entries({
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  SUPABASE_URL, SUPABASE_SERVICE_KEY, N8N_SECRET,
  DATAFORSEO_LOGIN: process.env.DATAFORSEO_LOGIN,
})) {
  if (!val) { console.error(`❌ Missing env var: ${name}`); process.exit(1); }
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

// ─── GENERATE-KEYWORDS HELPERS (imported from lib/) ───────

// Note: getEtsyVolume, KEYWORD_SEGMENTS, generateKeywordPool, enrichKeywords,
// scoreKeywords, selectAndScore, persistSeo — all imported from lib/ above

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

// Note: applySEOFilter and persistStrength imported from lib/ above

// ─── API ROUTE: POST /api/seo/reset-pool ──────────────────
app.post('/api/seo/reset-pool', async (req, res) => {
  try {
    const { listing_id } = req.body;
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

    // 6. Calculate new listing strength and persist
    // Capture correct selections from applySEOFilter BEFORE selectAndScore mutates them
    const correctSelectedTags = filteredKeywords.filter(k => k.is_selection_ia).map(k => k.tag);
    const { strength } = selectAndScore(filteredKeywords, finalParams);

    if (strength) {
      await persistStrength(listing_id, strength, correctSelectedTags, finalParams);
    }

    console.log(`   ✅ Pool reset complete for ${listing_id}`);
    return res.json({ success: true, processed: filteredKeywords.length, top_selections: filteredKeywords.filter(k => k.is_selection_ia).length, strength });

  } catch (error) {
    console.error('❌ [reset-pool] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to reset pool.', details: error.message || 'Unknown error' });
  }
});

// ─── API ROUTE: POST /api/seo/recalculate-scores ──────────
app.post('/api/seo/recalculate-scores', async (req, res) => {
  try {
    const { listing_id, selected_keywords } = req.body;
    if (!listing_id || !selected_keywords?.length) {
      return res.status(400).json({ error: 'Missing listing_id or selected_keywords' });
    }

    console.log(`\n📊 [recalculate-scores] Starting for listing ${listing_id} (${selected_keywords.length} keywords)`);

    // 1. Fetch listing owner
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw listingError || new Error('Listing not found');

    // 2. Fetch user settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw settingsError || new Error('Settings not found');

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.15,
      Transaction: settings.param_transaction ?? 0.35,
      Niche: settings.param_niche ?? 0.25,
      CPC: settings.param_cpc ?? 0,
      ai_selection_count: selected_keywords.length // treat ALL passed keywords as selected
    };

    // 3. Calculate strength from user-selected keywords
    const { strength } = selectAndScore(selected_keywords, params);

    if (!strength) {
      return res.status(400).json({ error: 'Could not calculate strength from provided keywords' });
    }

    // 4. Persist to DB
    const selectedTags = selected_keywords.map(k => k.keyword);
    await persistStrength(listing_id, strength, selectedTags, params);

    console.log(`   ✅ Recalculate complete for ${listing_id} — LSI: ${strength.listing_strength}`);
    return res.json({ success: true, strength });

  } catch (error) {
    console.error('❌ [recalculate-scores] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to recalculate scores.', details: error.message || 'Unknown error' });
  }
});

// ─── API ROUTE: POST /api/seo/generate-draft ──────────
const STATUS_COMPLETE = '28a11ca0-bcfc-42e0-971d-efc320f78424';

app.post('/api/seo/generate-draft', async (req, res) => {
  try {
    const { listing_id, keywords, image_url, visual_analysis, categorization, product_details, shop_context } = req.body;

    if (!listing_id || !keywords?.length) {
      return res.status(400).json({ error: 'Missing listing_id or keywords' });
    }

    console.log(`\n✍️  [generate-draft] Starting for listing ${listing_id} (${keywords.length} keywords)`);

    // Step A: Build SEO brief from keywords (replicates n8n "Prepare SEO brief" node)
    const seoBrief = keywords.map(item => {
      const badges = [];
      if (item.status?.promising) badges.push('Promising 💎');
      if (item.status?.trending) badges.push('Trending 🔥');
      if (item.status?.evergreen) badges.push('Evergreen 🌲');
      const badgeText = badges.length > 0 ? badges.join(' + ') : 'Standard';
      return `- Keyword: "${item.keyword}" | Status: ${badgeText} | Volume: ${item.avg_volume} | Comp: ${item.competition}`;
    }).join('\n');

    const nicheInfo = [categorization?.theme, categorization?.niche, categorization?.sub_niche].filter(Boolean).join(' > ');

    // Step B: Build the full prompt (ported from n8n workflow)
    const prompt = `# Role
You are an expert Etsy Copywriter acting as the voice of **${shop_context?.shop_name || 'the shop'}**.
Your goal is to write a product listing that feels authentic to the brand's identity, speaks directly to its target audience, and maintains high SEO performance.

# Brand Identity (Context)
- **Shop Bio/Mission:** ${shop_context?.shop_bio || 'N/A'}
- **Brand Tone:** ${shop_context?.brand_tone || 'Engaging'}
- **Target Audience:** ${shop_context?.target_audience || 'General'}
- **Brand Keywords:** ${Array.isArray(shop_context?.brand_keywords) ? shop_context.brand_keywords.join(', ') : (shop_context?.brand_keywords || 'N/A')}

# Input Data
- **Strategic SEO Brief:**
${seoBrief}

- **Product Details:**
- **Product Type:** ${product_details?.product_type || 'Product'}
- **Theme:** ${categorization?.theme || 'N/A'}
- **Niche:** ${categorization?.niche || 'N/A'}
- **Sub-Niche:** ${categorization?.sub_niche || 'N/A'}
- **Product Description:** ${product_details?.client_description || categorization?.user_description || 'N/A'}

# 2. Visual & Marketing Data (Input from Image Analysis)
- **Aesthetic/Style:** ${visual_analysis?.aesthetic || 'N/A'}
- **Typography:** ${visual_analysis?.typography || 'N/A'}
- **Graphic Elements:** ${visual_analysis?.graphics || 'N/A'}
- **Color Palette:** ${visual_analysis?.colors || 'N/A'}
- **Target Audience:** ${visual_analysis?.target_audience || 'N/A'}
- **Overall_vibe:** ${visual_analysis?.overall_vibe || 'N/A'}

# Task 1: Strategic Etsy Title (140 chars max)
- **Structure Logic:** 1. **Primary Hook:** Start immediately with the [Product Type] + [Main Subject] (e.g., "Funny Math T-Shirt" or "Grumpy Cat Teacher Shirt").
    2. **High-Value Keywords:** Follow with the most "Promising" keywords provided.
    3. **Target Audience/Occasion:** Include who it's for or the event (e.g., "Gift for Math Teacher", "Back to School").
    4. **Specific Details:** End with "Trending" keywords or specific visual elements (e.g., "Cat with Pencil").

- **Content Rules:**
    - The first 40 characters MUST clearly define the product type and main theme.
    - Avoid "artistic" descriptions (like "Playful Academic") unless they are proven high-volume search terms.
    - Use variations of the product type (e.g., use both "T-Shirt" and "Shirt" if space permits).
    - Avoid repeating the exact same word more than twice.

- **Formatting (CRITICAL):** - Use ONLY plain text.
    - NO bolding, NO italics, NO Markdown in the output string.
    - NO emojis.
    - Use " | " as separators with a space before and after the bar.

- **Goal:** A high-conversion title where the most searchable terms are in the first 60 characters.

# Task 2: Natural "Story & Specs" Description
Write a description tailored for **${shop_context?.target_audience || 'the target audience'}** using a **${shop_context?.brand_tone || 'Engaging'}** tone.

1. **The Emotional Hook (The Story):**
   - **ANTI-AI RULE:** Do NOT use clichés like "Let's face it," "Look no further," "In a world where," or "Introducing...".
   - **OPENING VARIETY:** Randomly select ONE of these styles for your first sentence:
     - *The Direct Question:* (e.g., "Searching for a [Sub-niche] that actually feels like you?")
     - *The Sensory Approach:* (e.g., "There's a certain [Brand Tone] charm in the way this [Visual Aesthetic] design comes together.")
     - *The Occasion Hook:* (e.g., "Whether you're gearing up for [Target Audience Occasion] or just treating yourself...")
     - *The Relatable Vibe:* (e.g., "Finding a [Product Type] that matches your exact style shouldn't be a struggle.")
   - Write 2-3 fluid sentences describing the product.
   - **VISUAL PROOF:** Mention at least one specific detail from the 'Visual & Marketing Data' (specific color, texture, or font vibe).
   - **SEO INTEGRATION:** Naturally weave in 4-6 tags (prioritize Trending and Promising).
   - **NO FORMATTING:** Under NO circumstances use bold (**keyword**) or italics for keywords in this narrative section.
   - **NATURAL FLOW:** Keywords must fit so perfectly into the grammar that a reader wouldn't know they are SEO tags.

2. **The "Why You'll Love It" Section (The Specs):**
   - **DYNAMIC HEADING:** Vary the title of this section (e.g., "Why It's a Must-Have," "The Details You'll Adore," "Fresh Finds & Features").
   - Use a bulleted list to highlight quality.
   - Integrate "Evergreen 🌲" tags here.
   - Use all parameters to explain why the person will love it.

3. **Brand Signature (Call to Action):**
   - Strictly end the listing with this exact text: "${shop_context?.signature_text || ''}"

# Constraints
- **Tone Consistency:** Strictly adhere to the **${shop_context?.brand_tone || 'Engaging'}** brand voice.
- **Format:** Strictly JSON output.
- **Formatting:** Use Markdown only for the description (headings/bullets), but NEVER for keywords in the story.

IMPORTANT: **DO NOT** use bold text (keyword) for SEO tags.

Self-validation: Review the output against the instructions. If it fails any condition, correct it before responding.

# Output Format
{
  "title": "...",
  "description": "..."
}`;

    // Step C: Call Gemini
    const rawResponse = await runTextModel(prompt);

    // Step D: Parse response
    const parsed = JSON.parse(extractJson(rawResponse));
    const { title, description } = parsed;

    if (!title) {
      throw new Error('Gemini returned no title');
    }

    // Step E: Persist to DB
    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        generated_title: title,
        generated_description: description,
        status_id: STATUS_COMPLETE
      })
      .eq('id', listing_id);

    if (updateError) {
      console.error('   ⚠️ DB update failed:', updateError.message);
    }

    console.log(`   ✅ Draft generated for ${listing_id} — title: "${title.substring(0, 50)}..."`);
    return res.json({ success: true, title, description });

  } catch (error) {
    console.error('❌ [generate-draft] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to generate draft.', details: error.message || 'Unknown error' });
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

    // Resolve product type name from v_combined_product_types
    let productTypeName = '';
    if (listing.product_type_id) {
      const { data: ptRow } = await supabaseAdmin
        .from('v_combined_product_types')
        .select('name')
        .eq('id', listing.product_type_id)
        .single();
      if (ptRow?.name) productTypeName = ptRow.name;
    }

    const ctx = {
      product_type: productTypeName,
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
      is_selection_ia: false,
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

    // 7. Update Listing Strength (scores persisted to listings_global_eval only)
    const { strength } = selectAndScore(processedPool, params);

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

// ─── API ROUTE: POST /api/seo/add-from-favorite ───────────
app.post('/api/seo/add-from-favorite', async (req, res) => {
  const t0 = Date.now();
  const { listing_id, keywords: incomingKeywords } = req.body;

  console.log(`\n⭐ [add-from-favorite] Request for listing: ${listing_id} (${incomingKeywords?.length || 0} keywords)`);

  // ── Step 1: Validation ───────────────────────────────────
  if (!listing_id || !incomingKeywords || !Array.isArray(incomingKeywords) || incomingKeywords.length === 0) {
    return res.status(400).json({ error: 'Missing listing_id or keywords array' });
  }

  try {
    // Normalize: accept both string[] and object[] for keywords
    const normalizedKeywords = incomingKeywords.map(kw => {
      if (typeof kw === 'string') {
        return { keyword: kw.trim().toLowerCase(), search_volume: 0, competition: 0.5, cpc: 0, volume_history: [] };
      }
      // Object format — map from favorites bank field names
      const tag = (kw.keyword || kw.tag || kw.name || '').trim().toLowerCase();
      return {
        keyword: tag,
        search_volume: kw.search_volume ?? kw.last_volume ?? 0,
        competition: kw.competition ?? kw.last_competition ?? 0.5,
        cpc: kw.cpc ?? kw.last_cpc ?? 0,
        volume_history: kw.volume_history ?? [],
      };
    }).filter(kw => kw.keyword.length > 0);

    if (normalizedKeywords.length === 0) {
      return res.status(400).json({ error: 'No valid keywords found after normalization' });
    }

    // ── Step 2: Fetch listing context ──────────────────────
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw new Error('Listing not found');

    // Resolve product type name from v_combined_product_types
    let productTypeName = '';
    if (listing.product_type_id) {
      const { data: ptRow } = await supabaseAdmin
        .from('v_combined_product_types')
        .select('name')
        .eq('id', listing.product_type_id)
        .single();
      if (ptRow?.name) productTypeName = ptRow.name;
    }

    const ctx = {
      product_type: productTypeName,
      theme: listing.theme || '',
      niche: listing.niche || '',
      sub_niche: listing.sub_niche || '',
      visual_aesthetic: listing.visual_aesthetic || '',
      visual_target_audience: listing.visual_target_audience || '',
      visual_overall_vibe: listing.visual_overall_vibe || '',
    };

    // ── Step 3: Fetch user SEO settings ────────────────────
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw new Error('User settings not found');

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
      concept_diversity_limit: settings.concept_diversity_limit || 5,
    };

    // Override with any incoming parameters
    const finalParams = { ...params, ...(req.body.parameters || {}) };

    // ── Step 4: AI Scoring (niche + transactional in parallel)
    console.log(`   🧠 Scoring ${normalizedKeywords.length} keywords...`);
    const statsForScoring = normalizedKeywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      competition: kw.competition,
      cpc: kw.cpc,
      volume_history: kw.volume_history,
      fromCache: true, // Already have stats
    }));

    const scoredKeywords = await scoreKeywords(statsForScoring, ctx);
    console.log(`   ✅ Scoring complete (${Date.now() - t0}ms)`);

    // ── Step 5: Bulk Upsert with is_pinned: true ───────────
    console.log(`   💾 Upserting ${scoredKeywords.length} keywords...`);
    const upsertPayloads = scoredKeywords.map((scored, i) => {
      const original = normalizedKeywords[i];
      return {
        listing_id,
        tag: scored.keyword,
        search_volume: original.search_volume,
        competition: (original.competition ?? 0.5).toString(),
        cpc: original.cpc,
        volume_history: original.volume_history,
        niche_score: scored.niche_score,
        transactional_score: scored.transactional_score,
        is_user_added: true,
        is_pinned: false,
        is_current_pool: true,
        is_selection_ia: false,
        is_current_eval: true,
      };
    });

    const { error: upsertError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(upsertPayloads, { onConflict: 'listing_id,tag', ignoreDuplicates: true });

    // For any keywords that already existed in the pool, ensure is_current_eval is marked as true
    // (so they appear selected) WITHOUT touching is_selection_ia.
    const tagList = normalizedKeywords.map(k => k.keyword);
    await supabaseAdmin
      .from('listing_seo_stats')
      .update({ is_current_eval: true, is_current_pool: true })
      .eq('listing_id', listing_id)
      .in('tag', tagList);

    if (upsertError) throw upsertError;

    // ── Step 6: Pool Re-ranking ────────────────────────────
    console.log('   🔄 Re-ranking pool...');
    const { data: pool, error: poolError } = await supabaseAdmin
      .from('listing_seo_stats')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('is_current_pool', true);

    if (poolError) throw poolError;

    const processedPool = applySEOFilter(pool, finalParams);

    // Update scores/statuses only (preserve is_selection_ia until explicit Apply Strategy)
    const updates = processedPool.map(kw => ({
      id: kw.id,
      listing_id: kw.listing_id,
      tag: kw.tag,
      opportunity_score: kw.opportunity_score,
      is_trending: kw.status.trending,
      is_evergreen: kw.status.evergreen,
      is_promising: kw.status.promising,
      is_current_pool: kw.is_current_pool,
      is_pinned: kw.is_pinned,
    }));

    const { error: batchUpdateError } = await supabaseAdmin
      .from('listing_seo_stats')
      .upsert(updates, { onConflict: 'id' });

    if (batchUpdateError) throw batchUpdateError;

    // ── Step 7: Listing Strength Update (scores persisted to listings_global_eval only)
    const { strength } = selectAndScore(processedPool, finalParams);

    // ── Build response ─────────────────────────────────────
    const addedTags = new Set(normalizedKeywords.map(k => k.keyword));
    const responseKeywords = processedPool
      .filter(kw => addedTags.has(kw.tag))
      .map(kw => ({
        tag: kw.tag,
        is_pinned: false,
        is_user_added: true,
        search_volume: kw.search_volume,
        competition: kw.competition,
        cpc: kw.cpc,
        niche_score: kw.niche_score,
        transactional_score: kw.transactional_score,
        opportunity_score: kw.opportunity_score,
        is_selection_ia: kw.is_selection_ia ?? false,
        is_current_eval: kw.is_current_eval ?? true,
        is_trending: kw.status?.trending || kw.is_trending || false,
        is_evergreen: kw.status?.evergreen || kw.is_evergreen || false,
        is_promising: kw.status?.promising || kw.is_promising || false,
      }));

    console.log(`   ✅ Added ${responseKeywords.length} keywords | LSI: ${strength?.listing_strength ?? 'N/A'} (${Date.now() - t0}ms)\n`);

    return res.json({
      success: true,
      added_count: responseKeywords.length,
      listing_strength: strength?.listing_strength || 0,
      keywords: responseKeywords,
    });

  } catch (error) {
    console.error('❌ [add-from-favorite] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to add keywords from favorites.', details: error.message || 'Unknown error' });
  }
});

// ─── START ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 EtsyPenny API server running on http://localhost:${PORT}`);
  console.log(`   POST /api/seo/analyze-image`);
  console.log(`   POST /api/seo/generate-keywords`);
  console.log(`   POST /api/seo/reset-pool`);
  console.log(`   POST /api/seo/recalculate-scores`);
  console.log(`   POST /api/seo/generate-draft`);
  console.log(`   POST /api/seo/user-keyword`);
  console.log(`   POST /api/seo/add-from-favorite`);
  console.log(`   GET  /api/health\n`);
});
