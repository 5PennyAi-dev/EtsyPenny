/**
 * SOURCE DE VÉRITÉ : ANALYSE IMAGE (PennySEO)
 * Ce fichier contient les prompts, types et fonctions de transformation
 * extraits du workflow n8n "EstyPenny (8).json".
 */
import type { VisualAnalysis, TaxonomyMapping, FinalAnalysisOutput, TaxonomyItem } from '@/types/definitions';

// --- 2. META-PROMPTS (IA) ---

/**
 * Prompt du nœud "Image analysis"
 * Rôle : Senior Visual Trend Analyst
 */
export const PROMPT_VISUAL_ANALYST = `
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

/**
 * Prompt du nœud "Theme/niche analysis"
 * Rôle : E-commerce Database Architect
 */
export const PROMPT_TAXONOMY_MAPPING = `
# Role
You are an E-commerce Database Architect. Your goal is to map visual data into a specific store taxonomy.

# Task
Based on the visual analysis provided and product details, assign the most accurate Theme and Niche from lists provided. Give priority the user's themes and niches if you find one that corresponds, otherwise use PennySEO's themes and niches. If you are not sure or no theme or niche quite corresponds, select 'Others'. Then, create a high-potential Sub-niche.

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

// --- 3. LOGIQUE DE TRANSFORMATION (FONCTIONS) ---

/**
 * Recrée la logique du nœud "format theme/niche listes"
 */
export function formatTaxonomyLists(themes: TaxonomyItem[], niches: TaxonomyItem[]): string {
  const filterByOrigin = (items: TaxonomyItem[]) => {
    const user = items.filter(i => i.origin === 'custom').map(i => `* **${i.name}**: ${i.description || 'No description'}`);
    const system = items.filter(i => i.origin !== 'custom').map(i => `* **${i.name}**: ${i.description || 'No description'}`);
    return { user, system };
  };

  const t = filterByOrigin(themes);
  const n = filterByOrigin(niches);

  return `
# Available Themes and Niches
### USER'S THEMES
${t.user.join("\\n")}
### PennySEO THEMES
${t.system.join("\\n")}
---
### USER'S NICHES
${n.user.join("\\n")}
### PennySEO NICHES
${n.system.join("\\n")}
  `.trim();
}

/**
 * Recrée la fusion finale du nœud "Code in JavaScript12"
 */
export function mergeAnalysisResults(
  listingId: string, 
  visualData: VisualAnalysis, 
  taxonomyData: TaxonomyMapping
): FinalAnalysisOutput {
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
