/**
 * Local Express API server for EtsyPenny.
 * Serves /api/seo/analyze-image (and future routes).
 * Run: node --env-file=.env server.mjs
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// ─── SHARED LIB IMPORTS (same modules used by Vercel api/) ──
import { extractJson } from './lib/ai/extract-json.ts';
import { runAI } from './lib/ai/provider-router.ts';
import {
  PROMPT_VISUAL_ANALYST,
  formatTaxonomyLists,
  buildVisualAnalysisContext,
  buildTaxonomyPrompt,
  mergeAnalysisResults,
} from './lib/logic/analyse-image-logic.ts';
import { generateKeywordPool } from './lib/seo/generate-keyword-pool.ts';
import { enrichKeywords } from './lib/seo/enrich-keywords.ts';
import { scoreKeywords } from './lib/seo/score-keywords.ts';
import { selectAndScore } from './lib/seo/select-and-score.ts';
import { persistSeo } from './lib/seo/persist-seo.ts';
import { persistStrength } from './lib/seo/persist-strength.ts';
import { applySEOFilter } from './lib/seo/filter-logic.ts';
import { extractProductTypeWords } from './lib/seo/concept-diversity.ts';
import { checkTokenBalance, deductTokens, checkQuota, incrementQuota } from './lib/tokens/token-middleware.ts';
import { getStripe, PRICE_TO_PLAN, PRICE_TO_PACK, PLAN_TOKENS } from './lib/stripe/client.ts';

const app = express();
// JSON body parser for all routes EXCEPT Stripe webhook (needs raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') return next();
  express.json({ limit: '10mb' })(req, res, next);
});

const PORT = process.env.API_PORT || 3001;

// ─── ENV VALIDATION ───────────────────────────────────────
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_SECRET           = process.env.N8N_WEBHOOK_SECRET;

for (const [name, val] of Object.entries({
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  SUPABASE_URL, SUPABASE_SERVICE_KEY, N8N_SECRET,
  DATAFORSEO_LOGIN: process.env.DATAFORSEO_LOGIN,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
})) {
  if (!val) { console.error(`❌ Missing env var: ${name}`); process.exit(1); }
}

// ─── SUPABASE CLIENT ──────────────────────────────────────
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    // Token check
    const tokenCheck = await checkTokenBalance(user_id, 'analyze_image');
    if (!tokenCheck.allowed) {
      return res.status(402).json({ error: tokenCheck.reason, balance: tokenCheck.balance, required: tokenCheck.required });
    }

    // Step 2: Visual DNA Extraction (Gemini Vision)
    console.log('   Step 2: Running Gemini Vision...');
    const visualPrompt = PROMPT_VISUAL_ANALYST
      .replace('{{productType}}', product_type)
      .replace('{{description}}', client_description);

    console.log("Visual Prompt:", visualPrompt);

    const { text: visualRaw } = await runAI('vision_analysis', visualPrompt, { imageUrl: mockup_url });
    const visualData = JSON.parse(extractJson(visualRaw));
    const visualAnalysis = visualData.visual_analysis;
    console.log('   ✅ Visual analysis done');
    // TEMPORARY — remove after validating new prompt outputs
    console.log('[analyze-image] Visual analysis result:', JSON.stringify(visualAnalysis, null, 2));

    // Step 3: Taxonomy Retrieval (Supabase)
    console.log('   Step 3: Fetching taxonomy...');
    const [themesResult, nichesResult] = await Promise.all([
      supabaseAdmin.from('v_combined_themes').select('*'),
      supabaseAdmin.from('v_combined_niches').select('*'),
    ]);

    if (themesResult.error) throw new Error(`Themes: ${themesResult.error.message}`);
    if (nichesResult.error) throw new Error(`Niches: ${nichesResult.error.message}`);

    const { userThemes, systemThemes, userNiches, systemNiches } = formatTaxonomyLists(themesResult.data, nichesResult.data);
    console.log(`   ✅ Got ${themesResult.data.length} themes, ${nichesResult.data.length} niches`);

    // Step 4: Taxonomy Mapping (AI Text)
    console.log('   Step 4: Running taxonomy mapping...');
    const taxonomyPrompt = buildTaxonomyPrompt({
      productType: product_type,
      userDescription: client_description,
      visualAnalysis: buildVisualAnalysisContext(visualAnalysis),
      userThemes,
      systemThemes,
      userNiches,
      systemNiches,
    });

    console.log("Taxonomy Prompt:", taxonomyPrompt);

    const { text: taxonomyRaw } = await runAI('taxonomy_mapping', taxonomyPrompt);
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

    // Deduct token after successful processing
    await deductTokens(user_id, 'analyze_image', tokenCheck.required, listing_id);

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
      visual_colors = '', visual_graphics = '',
      parameters = {},
    } = req.body;

    if (!listing_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id and user_id' });
    }

    // Token check (generate_keywords vs rerun_keywords cost determined inside)
    const tokenCheck = await checkTokenBalance(user_id, 'generate_keywords', listing_id);
    if (!tokenCheck.allowed) {
      return res.status(402).json({ error: tokenCheck.reason, balance: tokenCheck.balance, required: tokenCheck.required });
    }

    const ctx = { product_type, theme, niche, sub_niche, client_description, visual_aesthetic, visual_target_audience, visual_overall_vibe, visual_colors, visual_graphics };

    // Fetch user settings (same pattern as reset-pool / recalculate-scores)
    const { data: settings } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const params = {
      Volume: settings?.param_volume ?? 0.25,
      Competition: settings?.param_competition ?? 0.10,
      Transaction: settings?.param_transaction ?? 0.25,
      Niche: settings?.param_niche ?? 0.20,
      CPC: settings?.param_cpc ?? 0.20,
      ai_selection_count: settings?.ai_selection_count || 13,
      ...parameters,
    };

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

    // Deduct tokens after successful processing
    const deductAction = tokenCheck.required === 4 ? 'rerun_keywords' : 'generate_keywords';
    await deductTokens(user_id, deductAction, tokenCheck.required, listing_id);

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

    // 2. Fetch the listing owner and product type
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('user_id, product_type_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) throw listingError || new Error("Listing not found");

    // Resolve product type name for concept diversity
    let productTypeName = '';
    if (listing.product_type_id) {
      const { data: pt } = await supabaseAdmin
        .from('v_combined_product_types')
        .select('name')
        .eq('id', listing.product_type_id)
        .single();
      productTypeName = pt?.name || '';
    }

    // 3. Fetch user settings from view
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('v_user_seo_active_settings')
      .select('*')
      .eq('user_id', listing.user_id)
      .single();

    if (settingsError || !settings) throw settingsError || new Error("Settings not found");

    const params = {
      Volume: settings.param_volume ?? 0.25,
      Competition: settings.param_competition ?? 0.10,
      Transaction: settings.param_transaction ?? 0.25,
      Niche: settings.param_niche ?? 0.20,
      CPC: settings.param_cpc ?? 0.20,
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
      concept_diversity_limit: settings.concept_diversity_limit || 2,
      productTypeWords: extractProductTypeWords(productTypeName),
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
      Competition: settings.param_competition ?? 0.10,
      Transaction: settings.param_transaction ?? 0.25,
      Niche: settings.param_niche ?? 0.20,
      CPC: settings.param_cpc ?? 0.20,
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
    const { listing_id, user_id, keywords, image_url, visual_analysis, categorization, product_details, shop_context } = req.body;

    if (!listing_id || !keywords?.length || !user_id) {
      return res.status(400).json({ error: 'Missing listing_id, user_id, or keywords' });
    }

    // Token check
    const tokenCheck = await checkTokenBalance(user_id, 'generate_draft');
    if (!tokenCheck.allowed) {
      return res.status(402).json({ error: tokenCheck.reason, balance: tokenCheck.balance, required: tokenCheck.required });
    }

    console.log(`\n✍️  [generate-draft] Starting for listing ${listing_id} (${keywords.length} keywords)`);

    // Step A: Build clean SEO brief from keywords (no emoji, capped at 13)
    const statusClean = (item) => {
      if (item.status?.promising) return 'Promising';
      if (item.status?.trending) return 'Trending';
      if (item.status?.evergreen) return 'Evergreen';
      return 'Standard';
    };

    const briefLines = keywords
      .slice(0, 13)
      .map(item => `- "${item.keyword}" [${statusClean(item)}] vol:${item.avg_volume || 0} comp:${item.competition || 'N/A'}`)
      .join('\n');

    // Rotate opening style server-side for variety
    const openingStyles = ['question', 'sensory', 'occasion', 'relatable'];
    const openingStyle = openingStyles[Date.now() % openingStyles.length];

    // Step B: Build the prompt
    const prompt = `You are an Etsy listing copywriter. Write a title and description for this product.

# PRODUCT CONTEXT (primary — use this for tone and audience)
- Product type: ${product_details?.product_type || 'Product'}
- Theme: ${categorization?.theme || 'N/A'}
- Niche: ${categorization?.niche || 'N/A'}
- Sub-niche: ${categorization?.sub_niche || ''}
- Seller's notes: ${product_details?.client_description || categorization?.user_description || ''}

# VISUAL DETAILS (from AI image analysis)
- Style: ${visual_analysis?.aesthetic || 'N/A'}
- Colors: ${visual_analysis?.colors || 'N/A'}
- Graphics: ${visual_analysis?.graphics || 'N/A'}
- Typography: ${visual_analysis?.typography || 'N/A'}
- Target buyers: ${visual_analysis?.target_audience || 'N/A'}
- Vibe: ${visual_analysis?.overall_vibe || 'N/A'}

# SEO KEYWORDS (ranked by priority — use as many as possible)
${briefLines}
${shop_context?.shop_name ? `
# SHOP IDENTITY (secondary — use for sign-off only, NOT for tone)
- Shop: ${shop_context.shop_name}${shop_context?.brand_tone ? `\n- Brand tone: ${shop_context.brand_tone}` : ''}${shop_context?.signature_text ? `\n- Sign-off: ${shop_context.signature_text}` : ''}` : ''}

---

# TASK 1: TITLE (max 140 characters)

Write a search-optimized Etsy title.

Rules:
- First 40 chars: product type + main theme (what a buyer sees in search results)
- Pack in as many SEO keywords as possible without sounding robotic
- Use " | " as separator between keyword groups
- Plain text only — no bold, no italics, no emoji, no markdown
- Don't repeat the exact same word more than twice
- On Etsy, word ORDER doesn't affect search ranking — focus on including the right words, not their position

Good examples:
- "Cyberpunk Gamer iPhone Case | Neon Sci-Fi Phone Cover | Gaming Gift for Him"
- "Funny Math Teacher Shirt | Pi Day T-Shirt Gift | Nerdy School Tee for Her"
- "Personalized Dog Mom Mug | Custom Pet Name Coffee Cup | Birthday Gift for Dog Lover"

Bad examples:
- "Durable Iphone Case Gamer Iphone Case Gaming Iphone Case Neon" (keyword stuffing, no flow)
- "The Ultimate Cyberpunk Gaming Experience Phone Case" (wastes chars on filler words)
- "Beautiful Handmade Premium Quality Case" (generic, no searchable terms)

# TASK 2: DESCRIPTION (150-200 words)

Write a 2-section description.

## Section 1: Product story (1 short paragraph, 3-4 sentences)
- Opening style for this listing: "${openingStyle}"
  - "question" → Start with a direct question to the buyer
  - "sensory" → Start by describing the look/feel of the design
  - "occasion" → Start with a use case or gifting scenario
  - "relatable" → Start with a relatable statement about finding the right product
- Mention at least ONE specific visual detail (a color, graphic element, or design feature)
- Weave in 4-6 SEO keywords naturally — they must read as normal English, not forced insertions
- Do NOT bold or italicize any keywords
- Do NOT use clichés: "Let's face it", "Look no further", "In a world where", "Introducing", "Say hello to", "Meet your new favorite"

## Section 2: Key features (bulleted list, 4-6 bullets)
- Use a heading like "Why you'll love it" or "The details" (vary it)
- Format: markdown bullets (- or •)
- Include product quality, material, design details, and who it's perfect for
- Weave in remaining SEO keywords here
${shop_context?.signature_text ? `
## Sign-off
End with exactly: "${shop_context.signature_text}"` : ''}

# OUTPUT FORMAT
Respond with ONLY this JSON, no other text:
{
  "title": "your title here",
  "description": "your description here with markdown bullets"
}`;

    // Log the interpolated prompt for debugging
    console.log('\n========== GENERATE-DRAFT PROMPT ==========\n');
    console.log(prompt);
    console.log('\n========== END PROMPT ==========\n');

    // Step C: Call AI
    const { text: rawResponse } = await runAI('draft_generation', prompt);

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

    // Deduct token after successful processing
    await deductTokens(user_id, 'generate_draft', tokenCheck.required, listing_id);

    console.log(`   ✅ Draft generated for ${listing_id} — title: "${title.substring(0, 50)}..."`);
    return res.json({ success: true, title, description });

  } catch (error) {
    console.error('❌ [generate-draft] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to generate draft.', details: error.message || 'Unknown error' });
  }
});

// ─── API ROUTE: POST /api/seo/refresh-keyword-bank ────────────
app.post('/api/seo/refresh-keyword-bank', async (req, res) => {
  try {
    const { keyword_bank_ids, tags } = req.body;
    if (!tags?.length) return res.status(400).json({ error: 'tags array required' });
    if (tags.length > 50) return res.status(400).json({ error: 'Max 50 keywords' });

    console.log(`\n📥 [refresh-keyword-bank] Refreshing ${tags.length} keywords`);
    const enriched = await enrichKeywords(tags);

    const results = [];
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const bankId = keyword_bank_ids?.[i];
      const data = enriched.find(e => e.tag === tag || e.keyword === tag);

      if (data && bankId) {
        const payload = {
          last_volume: data.search_volume || 0,
          last_competition: data.competition || 0,
          last_cpc: data.cpc || 0,
          volume_history: data.volume_history || [],
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('user_keyword_bank').update(payload).eq('id', bankId);
        results.push({ tag, ...payload });
      } else {
        results.push({ tag, error: 'No data found' });
      }
    }

    console.log(`   ✅ Refreshed ${results.filter(r => !r.error).length}/${tags.length} keywords`);
    res.json({ success: true, results, refreshed_count: results.filter(r => !r.error).length });
  } catch (err) {
    console.error('[refresh-keyword-bank] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── API ROUTE: POST /api/seo/user-keyword ────────────
app.post('/api/seo/user-keyword', async (req, res) => {
  const t0 = Date.now();
  console.log(`\n📥 [user-keyword] Request for listing: ${req.body.listing_id}`);
  const { listing_id, keyword, user_id } = req.body;

  if (!listing_id || !keyword || !user_id) {
    return res.status(400).json({ error: 'Missing listing_id, user_id, or keyword' });
  }

  try {
    // Quota check
    const quotaCheck = await checkQuota(user_id, 'add_custom');
    if (!quotaCheck.allowed) {
      return res.status(402).json({ error: quotaCheck.reason, used: quotaCheck.used, limit: quotaCheck.limit });
    }

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
      Competition: settings.param_competition ?? 0.10,
      Transaction: settings.param_transaction ?? 0.25,
      Niche: settings.param_niche ?? 0.20,
      CPC: settings.param_cpc ?? 0.20,
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
      concept_diversity_limit: settings.concept_diversity_limit || 2,
      productTypeWords: extractProductTypeWords(productTypeName),
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
    
    // Increment quota after success
    await incrementQuota(user_id, 'add_custom');

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
  const { listing_id, user_id, keywords: incomingKeywords } = req.body;

  console.log(`\n⭐ [add-from-favorite] Request for listing: ${listing_id} (${incomingKeywords?.length || 0} keywords)`);

  // ── Step 1: Validation ───────────────────────────────────
  if (!listing_id || !user_id || !incomingKeywords || !Array.isArray(incomingKeywords) || incomingKeywords.length === 0) {
    return res.status(400).json({ error: 'Missing listing_id, user_id, or keywords array' });
  }

  try {
    // Quota check
    const quotaCheck = await checkQuota(user_id, 'add_favorite');
    if (!quotaCheck.allowed) {
      return res.status(402).json({ error: quotaCheck.reason, used: quotaCheck.used, limit: quotaCheck.limit });
    }

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
      Competition: settings.param_competition ?? 0.10,
      Transaction: settings.param_transaction ?? 0.25,
      Niche: settings.param_niche ?? 0.20,
      CPC: settings.param_cpc ?? 0.20,
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
      concept_diversity_limit: settings.concept_diversity_limit || 2,
      productTypeWords: extractProductTypeWords(productTypeName),
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

    // Increment quota after success
    await incrementQuota(user_id, 'add_favorite');

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

// ─── API ROUTE: POST /api/stripe/webhook ──────────────────
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`\n💳 [stripe-webhook] event=${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: session.customer })
          .eq('id', userId);

        if (session.mode === 'subscription') {
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_id: session.subscription })
            .eq('id', userId);
        }

        if (session.mode === 'payment') {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          const tokenAmount = PRICE_TO_PACK[priceId ?? ''];
          if (tokenAmount) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('tokens_bonus_balance')
              .eq('id', userId)
              .single();

            const newBonus = (profile?.tokens_bonus_balance ?? 0) + tokenAmount;
            await supabaseAdmin
              .from('profiles')
              .update({ tokens_bonus_balance: newBonus })
              .eq('id', userId);

            await supabaseAdmin.from('token_transactions').insert({
              user_id: userId,
              type: 'pack_purchase',
              amount: tokenAmount,
              balance_after: newBonus,
              description: `Token pack purchase: ${tokenAmount} tokens`,
            });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const planId = PRICE_TO_PLAN[priceId ?? ''];
        if (!planId) break;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (!profile) break;

        const userId = profile.id;
        const newTokens = PLAN_TOKENS[planId];
        const resetAt = new Date();
        resetAt.setMonth(resetAt.getMonth() + 1);

        await supabaseAdmin.from('profiles').update({
          subscription_plan: planId,
          subscription_status: 'active',
          tokens_monthly_balance: newTokens,
          tokens_reset_at: resetAt.toISOString(),
          add_custom_used: 0,
          add_favorite_used: 0,
          counters_reset_at: resetAt.toISOString(),
          subscription_end_at: new Date(invoice.lines?.data?.[0]?.period?.end * 1000).toISOString(),
        }).eq('id', userId);

        await supabaseAdmin.from('token_transactions').insert({
          user_id: userId,
          type: 'subscription_credit',
          amount: newTokens,
          balance_after: newTokens,
          description: `Monthly reset — ${planId} plan (${newTokens} tokens)`,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single();
        if (!profile) break;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', profile.id);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planId = PRICE_TO_PLAN[priceId ?? ''];
        if (!planId) break;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, subscription_plan')
          .eq('stripe_customer_id', sub.customer)
          .single();
        if (!profile) break;

        await supabaseAdmin.from('profiles').update({
          subscription_plan: planId,
          subscription_status: sub.status,
          subscription_id: sub.id,
        }).eq('id', profile.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .single();
        if (!profile) break;

        await supabaseAdmin.from('profiles').update({
          subscription_plan: 'free',
          subscription_status: 'canceled',
          subscription_id: null,
          tokens_monthly_balance: PLAN_TOKENS['free'],
          add_custom_used: 0,
          add_favorite_used: 0,
        }).eq('id', profile.id);
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }

  return res.json({ received: true });
});

// ─── API ROUTE: POST /api/stripe/create-checkout ──────────
app.post('/api/stripe/create-checkout', async (req, res) => {
  try {
    const { priceId, userId, mode } = req.body;
    if (!priceId || !userId || !mode) {
      return res.status(400).json({ error: 'Missing priceId, userId, or mode' });
    }

    const stripe = getStripe();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      metadata: { user_id: userId },
    });

    console.log(`   ✅ [create-checkout] session=${session.id} user=${userId} mode=${mode}`);
    return res.json({ url: session.url });

  } catch (error) {
    console.error('[create-checkout] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// ─── API ROUTE: POST /api/stripe/create-portal ────────────
app.post('/api/stripe/create-portal', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const stripe = getStripe();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    console.log(`   ✅ [create-portal] user=${userId}`);
    return res.json({ url: session.url });

  } catch (error) {
    console.error('[create-portal] Error:', error.message || error);
    return res.status(500).json({ error: 'Failed to create portal session', details: error.message });
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
  console.log(`   POST /api/seo/refresh-keyword-bank`);
  console.log(`   POST /api/seo/user-keyword`);
  console.log(`   POST /api/seo/add-from-favorite`);
  console.log(`   POST /api/stripe/webhook`);
  console.log(`   POST /api/stripe/create-checkout`);
  console.log(`   POST /api/stripe/create-portal`);
  console.log(`   GET  /api/health\n`);
});
