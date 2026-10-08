/**
 * Shared analyse-image logic — single source of truth for prompts,
 * formatting helpers, and merge logic used by both server.mjs (dev)
 * and api/seo/analyze-image.ts (production).
 */
import type { VisualAnalysis, TaxonomyMapping, TaxonomyItem } from '../../types/definitions';

// ─── PROMPTS ──────────────────────────────────────────────

export const PROMPT_VISUAL_ANALYST = `
# Role
You are an Etsy visual-search analyst. Extract concise, concrete visual evidence that helps buyers find the listing. Your output feeds taxonomy and keyword generation, so prefer visible subjects, styles, colors, layouts, and readable text over generic praise.

# Product context
**Product type:** {{productType}}
**Seller notes:** {{description}}

# Evidence and scope
Before writing, separate in your reasoning: (1) the product being sold, (2) the design printed, engraved, or displayed on that product, and (3) the mockup or staging around it.

- Describe only the sold product and its visible design. Ignore props, room decor, packaging, hands, models, furniture, frames, backgrounds, and lifestyle accessories unless they are clearly part of the product for sale.
- Product type and seller notes are context, not visual proof. They may help interpret the image, but never state them as visible facts when the image does not support them.
- Do not invent or infer materials, manufacturing method, dimensions, personalization, brand, licensing, age, product features, or use cases that are not clearly visible.
- When a subject, color, style, or product detail is ambiguous, use a neutral description such as "possibly", "appears to", or "unclear". Do not guess.
- Read text exactly only when every transcribed word is legible. Distinguish "No visible text" (there is no text) from "Text present but illegible" (text exists but cannot be read).

Extract these 6 attributes:

1. **aesthetic_style** — Name the specific visible design trend or visual movement in 2-4 Etsy-searchable words. Use "Style unclear" if evidence is insufficient; do not use vague praise.

2. **typography_details** — If legible text is present, quote its complete exact transcription and add a short visual type description when it fits. The 15-word target never permits truncation: if the full transcription alone exceeds it, return the complete quoted text with no type commentary. If no text is visible, return exactly "No visible text". If text is visible but not fully readable, return exactly "Text present but illegible".

3. **graphic_elements** — List the visible subjects, motifs, composition, and design features that distinguish the sold product, in comma-separated descriptors under 25 words. Include concrete subjects and layouts useful for Etsy searches; exclude mockup objects and narrative prose.

4. **color_palette** — State only dominant visible product/design colors and a 2-3 word mood: "[colors] — [mood]", under 15 words. Use "Colors unclear — neutral" if lighting or image quality prevents a reliable palette.

5. **target_audience** — List 1-5 plausible Etsy buyer groups supported by visible subject or style, 2-3 words each and comma-separated. Do not invent niche personas. When the image gives insufficient evidence, return exactly "General Etsy shoppers".

6. **overall_vibe** — Write one factual, buyer-oriented sentence under 25 words describing the visible product/design and its Etsy-search appeal. Do not claim unverified material, construction, utility, or audience certainty.

# Output format
Return ONLY valid JSON. No markdown fences. No commentary before or after.

{
  "visual_analysis": {
    "aesthetic_style": "2-4 word style name",
    "typography_details": "Under 15 words or No visible text",
    "graphic_elements": "Comma-separated descriptors, under 25 words",
    "color_palette": "[colors] — [mood], under 15 words",
    "target_audience": "3-5 personas, 2-3 words each, comma-separated",
    "overall_vibe": "One sentence, under 25 words"
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
