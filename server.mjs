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
Based on the visual analysis provided and product details, assign the most accurate Theme and Niche from lists provided. Give priority the user's themes and niches if you find one that corresponds, otherwise use PennySEO's themes and niches. If you are not sure or no theme or niche quite corresponds, select 'Others'. Then, create a high-potential Sub-niche.

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
  return {
    listing_id: listingId,
    output: {
      visual_analysis: {
        ...visualData,
        theme: taxonomyData.theme,
        niche: taxonomyData.niche,
        "sub-niche": taxonomyData.sub_niche
      }
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
    const taxonomyPrompt = `
# Visual Analysis Input
${JSON.stringify(visualAnalysis, null, 2)}

` + PROMPT_TAXONOMY_MAPPING.replace('{{formattedTaxonomyReport}}', formattedTaxonomy);
    const taxonomyRaw = await runTextModel(taxonomyPrompt);
    const taxonomyMapping = JSON.parse(extractJson(taxonomyRaw));
    console.log(`   ✅ Theme: ${taxonomyMapping.theme}, Niche: ${taxonomyMapping.niche}`);

    // Step 5: Merge & Save via Edge Function
    console.log('   Step 5: Saving via edge function...');
    const finalAnalysis = mergeAnalysisResults(listing_id, visualAnalysis, taxonomyMapping);

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

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── START ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 EtsyPenny API server running on http://localhost:${PORT}`);
  console.log(`   POST /api/seo/analyze-image`);
  console.log(`   GET  /api/health\n`);
});
