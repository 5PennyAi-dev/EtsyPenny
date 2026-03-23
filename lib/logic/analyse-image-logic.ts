/**
 * Shared analyse-image logic — single source of truth for prompts,
 * formatting helpers, and merge logic used by both server.mjs (dev)
 * and api/seo/analyze-image.ts (production).
 */
import type { VisualAnalysis, TaxonomyMapping, TaxonomyItem } from '../../types/definitions';

// ─── PROMPTS ──────────────────────────────────────────────

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

export const PROMPT_TAXONOMY_MAPPING = `
# Role
You are an Etsy search behavior specialist. You understand how Etsy buyers discover products through search. Your classification drives keyword generation, so you must think like a BUYER searching for this product, not like a curator categorizing it.

# Key definitions
- **Theme** = the VISUAL AESTHETIC of the product (what it looks like, the design style, the artistic movement). Ask: "What design trend does this belong to?"
- **Niche** = the TARGET BUYER (who would purchase this). Ask: "Who is typing in the Etsy search bar to find this?"
- **Sub-niche** = a micro-segment combining product type + buyer intent for long-tail SEO (2-4 words). Ask: "What specific phrase would the buyer search?"

# Product information
**Product type:** {PRODUCT_TYPE}
**Seller notes:** {USER_DESCRIPTION}

# Visual analysis
{VISUAL_ANALYSIS}

# Available themes (pick ONE)

## Seller's custom themes (prefer when clearly matching)
{USER_THEMES}

## PennySEO themes
{SYSTEM_THEMES}

# Available niches (pick ONE)

## Seller's custom niches (prefer when clearly matching)
{USER_NICHES}

## PennySEO niches
{SYSTEM_NICHES}

# Classification rules

1. **Theme = visual style, NOT message.** A product with a political message in a kawaii style is classified by its VISUAL aesthetic (e.g., "Sarcastic & Funny"), not by its message. The message informs the niche, not the theme.

2. **Niche = the buyer, NOT the topic.** Think about who is PURCHASING this on Etsy. A cute uterus pin might be bought by a nurse (Nursing & Healthcare), a feminist friend as a gift (Gift Buyers), or someone who collects quirky pins. Pick the LARGEST likely buyer group.

3. **Sub-niche = a real Etsy search phrase.** It must be something a buyer would actually type into Etsy search. Good: "Funny Medical Pins", "Feminist Humor Gifts". Bad: "Ethereal Moon Vibes", "Empowerment Statement Pieces".

4. **Seller's custom themes/niches take priority ONLY when they clearly match.** Do not force a custom match. If the best fit is a PennySEO system entry, use it.

5. **When torn between two themes** — pick the one that is more SPECIFIC to the visual style. "Sarcastic & Funny" is better than "Feminist & Empowerment" for a humorous design, even if the humor is feminist. More specific = better SEO keywords.

6. **When torn between two niches** — pick the one representing the LARGEST buyer pool on Etsy. "Nursing & Healthcare" is a bigger Etsy buyer pool than "Social Justice" for medical humor products.

7. **Use ONLY names from the lists above.** Never invent a theme or niche. The sub-niche is the only field where you create a new term.

# Calibration examples

Product: Kawaii uterus enamel pin with "CUTERUS" text
→ Theme: "Sarcastic & Funny" (kawaii humor aesthetic, not political poster style)
→ Niche: "Nursing & Healthcare" (medical professionals love anatomical humor pins)
→ Sub-niche: "Funny Anatomy Pins"

Product: Watercolor dog portrait on canvas
→ Theme: "Animals & Wildlife" (animal illustration style)
→ Niche: "Pet Owners" (dog owners wanting their pet's portrait)
→ Sub-niche: "Custom Pet Portraits"

Product: Gold geometric wedding invitation template
→ Theme: "Art Deco & Luxury" (gold, geometric, premium aesthetic)
→ Niche: "Wedding Party" (brides planning weddings)
→ Sub-niche: "Luxury Wedding Stationery"

Product: Retro cassette tape t-shirt with "Awesome Mix" text
→ Theme: "Vintage & Retro" (80s/90s nostalgic visual style)
→ Niche: "Music Lovers" (music fans, vinyl/cassette culture)
→ Sub-niche: "Retro Music Apparel"

Product: "World's Best Teacher" ceramic mug with apple illustration
→ Theme: "Sarcastic & Funny" (lighthearted humorous gift style)
→ Niche: "Teaching & Education" (teachers and people gifting teachers)
→ Sub-niche: "Teacher Appreciation Mugs"

Product: Pressed wildflower resin bookmark
→ Theme: "Botanical & Floral" (real pressed flowers, nature aesthetic)
→ Niche: "Book Lovers" (readers, bookworms)
→ Sub-niche: "Botanical Bookmarks"

# Output format
Return ONLY valid JSON. No markdown fences. No commentary before or after.

{
  "theme": "Exact Theme Name From List",
  "niche": "Exact Niche Name From List",
  "sub_niche": "Specific Buyer Search Phrase"
}
`;

// ─── FORMATTING HELPERS ───────────────────────────────────

/**
 * Formats combined taxonomy lists into separate user/system sections.
 * Items with origin === 'custom' are user items; all others are system.
 */
export function formatTaxonomyLists(themes: TaxonomyItem[], niches: TaxonomyItem[]): {
  userThemes: string;
  systemThemes: string;
  userNiches: string;
  systemNiches: string;
} {
  const formatItems = (items: TaxonomyItem[]) =>
    items.map(i => `* **${i.name}**: ${i.description || 'No description'}`).join('\n');

  const userThemes = themes.filter(i => i.origin === 'custom');
  const systemThemes = themes.filter(i => i.origin !== 'custom');
  const userNiches = niches.filter(i => i.origin === 'custom');
  const systemNiches = niches.filter(i => i.origin !== 'custom');

  return {
    userThemes: userThemes.length > 0 ? formatItems(userThemes) : '(No custom themes defined)',
    systemThemes: formatItems(systemThemes),
    userNiches: userNiches.length > 0 ? formatItems(userNiches) : '(No custom niches defined)',
    systemNiches: formatItems(systemNiches),
  };
}

/**
 * Builds the visual analysis context string from visual data fields.
 */
export function buildVisualAnalysisContext(visualAnalysis: VisualAnalysis): string {
  return [
    visualAnalysis.aesthetic_style && `Aesthetic style: ${visualAnalysis.aesthetic_style}`,
    visualAnalysis.typography_details && `Typography details: ${visualAnalysis.typography_details}`,
    visualAnalysis.graphic_elements && `Graphic elements: ${visualAnalysis.graphic_elements}`,
    visualAnalysis.color_palette && `Color palette: ${visualAnalysis.color_palette}`,
    visualAnalysis.target_audience && `Target audience: ${visualAnalysis.target_audience}`,
    visualAnalysis.overall_vibe && `Overall vibe: ${visualAnalysis.overall_vibe}`,
  ].filter(Boolean).join('\n');
}

/**
 * Assembles the full taxonomy mapping prompt with all variables injected.
 */
export function buildTaxonomyPrompt(params: {
  productType: string;
  userDescription: string;
  visualAnalysis: string;
  userThemes: string;
  systemThemes: string;
  userNiches: string;
  systemNiches: string;
}): string {
  return PROMPT_TAXONOMY_MAPPING
    .replace('{PRODUCT_TYPE}', params.productType || 'Not specified')
    .replace('{USER_DESCRIPTION}', params.userDescription || 'No details provided')
    .replace('{VISUAL_ANALYSIS}', params.visualAnalysis)
    .replace('{USER_THEMES}', params.userThemes)
    .replace('{SYSTEM_THEMES}', params.systemThemes)
    .replace('{USER_NICHES}', params.userNiches)
    .replace('{SYSTEM_NICHES}', params.systemNiches);
}

// ─── MERGE LOGIC ──────────────────────────────────────────

/**
 * Merges visual analysis and taxonomy mapping into the final payload
 * for the save-image-analysis edge function.
 */
export function mergeAnalysisResults(
  listingId: string,
  visualData: VisualAnalysis,
  taxonomyData: TaxonomyMapping | TaxonomyMapping[]
) {
  const taxonomy = Array.isArray(taxonomyData) ? taxonomyData[0] : taxonomyData;
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
