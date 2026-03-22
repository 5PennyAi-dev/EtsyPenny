import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAI } from '../../lib/ai/provider-router.js';
import { extractJson } from '../../lib/ai/extract-json.js';

// Verbatim from server.mjs lines 64-123
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

// Verbatim from server.mjs lines 126-144
interface TaxonomyItem {
  name: string;
  description?: string;
  origin?: string;
}

function formatTaxonomyLists(themes: TaxonomyItem[], niches: TaxonomyItem[]): string {
  const filterByOrigin = (items: TaxonomyItem[]) => {
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

// Verbatim from server.mjs lines 146-157
function mergeAnalysisResults(listingId: string, visualData: Record<string, unknown>, taxonomyData: unknown) {
  const taxonomy = Array.isArray(taxonomyData) ? taxonomyData[0] : taxonomyData as Record<string, string>;
  return {
    listing_id: listingId,
    visual_analysis: {
      ...visualData,
      theme: taxonomy?.theme || null,
      niche: taxonomy?.niche || null,
      "sub-niche": taxonomy?.sub_niche || null,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      listing_id,
      user_id,
      mockup_url,
      product_type = '',
      client_description = '',
    } = req.body;

    if (!listing_id || !mockup_url || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: listing_id, user_id, and mockup_url' });
    }

    console.info(`[analyze-image] listing=${listing_id}`);

    // Step 2: Visual DNA Extraction (Gemini Vision)
    const visualPrompt = PROMPT_VISUAL_ANALYST
      .replace('{{productType}}', product_type)
      .replace('{{description}}', client_description);

    const { text: visualRaw } = await runAI('vision_analysis', visualPrompt, { imageUrl: mockup_url });
    const visualData = JSON.parse(extractJson(visualRaw));
    const visualAnalysis = visualData.visual_analysis;

    // Step 3: Taxonomy Retrieval (Supabase)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const [themesResult, nichesResult] = await Promise.all([
      supabaseAdmin.from('v_combined_themes').select('*'),
      supabaseAdmin.from('v_combined_niches').select('*'),
    ]);

    if (themesResult.error) throw new Error(`Themes: ${themesResult.error.message}`);
    if (nichesResult.error) throw new Error(`Niches: ${nichesResult.error.message}`);

    const formattedTaxonomy = formatTaxonomyLists(themesResult.data, nichesResult.data);

    // Step 4: Taxonomy Mapping (Gemini Text)
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

    const { text: taxonomyRaw } = await runAI('taxonomy_mapping', taxonomyPrompt);
    const taxonomyMapping = JSON.parse(extractJson(taxonomyRaw));
    console.info(`[analyze-image] theme=${taxonomyMapping.theme} niche=${taxonomyMapping.niche}`);

    // Step 5: Merge & Save via Edge Function
    const finalAnalysis = mergeAnalysisResults(listing_id, visualAnalysis, taxonomyMapping);

    const edgeFnUrl = `${supabaseUrl}/functions/v1/save-image-analysis`;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
    const saveResponse = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'x-api-key': n8nSecret || '',
      },
      body: JSON.stringify(finalAnalysis),
    });

    if (!saveResponse.ok) {
      const errText = await saveResponse.text();
      throw new Error(`Edge function failed (${saveResponse.status}): ${errText}`);
    }

    console.info(`[analyze-image] complete listing=${listing_id}`);
    return res.json(finalAnalysis);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [analyze-image] Error:', message);
    return res.status(500).json({ error: 'Failed to analyze image.', details: message });
  }
}
