/**
 * Shared analyse-image logic — single source of truth for prompts,
 * formatting helpers, and merge logic used by both server.mjs (dev)
 * and api/seo/analyze-image.ts (production).
 */
import type { VisualAnalysis, TaxonomyMapping, TaxonomyItem } from '../../types/definitions';

// ─── PROMPTS ──────────────────────────────────────────────

export const PROMPT_VISUAL_ANALYST = `
# Role
You are an Etsy product listing specialist. You analyze product images to extract visual characteristics that drive Etsy search discovery. Every word you write will be used to generate SEO keywords — be precise and buyer-oriented.

# Product context
**Product type:** {{productType}}
**Seller notes:** {{description}}

# Task
Analyze ONLY the product itself in the image. Ignore staging, backgrounds, props, hands, and lifestyle elements. If the product is shown in a mockup scene, describe the product design only.

Extract these 6 attributes:

1. **aesthetic_style** — The specific design trend or visual movement. Use established style names that Etsy buyers search for.
   Good: "70s Retro Typography", "Minimalist Scandinavian", "Cottagecore Watercolor"
   Bad: "Modern and clean" (too vague), "Aesthetically pleasing" (meaningless)
   Keep to 2-4 words.

2. **typography_details** — Describe the font style in buyer-friendly terms. Focus on the visual impression, not technical font analysis.
   Good: "Bold retro block letters, 1970s inspired"
   Bad: "Features a dominant, bold, and blocky sans-serif font for the month, evoking a confident and nostalgic 1970s graphic design feel" (too long)
   If no text is visible, respond "No visible text".
   Keep under 15 words.

3. **graphic_elements** — What makes this product visually distinctive? List the key design elements a buyer would notice first.
   Good: "Minimalist grid layout, large month numbers, retro color blocks"
   Bad: "The design is typography-led with a clean, spacious grid layout" (narrative prose, not useful for keywords)
   Keep under 25 words. Use comma-separated descriptors, not sentences.

4. **color_palette** — List the dominant colors and the mood they create.
   Good: "Brick red, cream, warm neutrals — nostalgic, warm, sophisticated"
   Bad: "A warm and grounded palette featuring a deep, muted brick red against a creamy off-white background" (too wordy)
   Format: "[colors] — [mood in 2-3 words]"
   Keep under 15 words.

5. **target_audience** — List 3-5 Etsy buyer personas who would search for this product.
   Rules:
   - Think "WHO is the buyer", not what the product is about
   - Use terms Etsy buyers identify with
   - No product words (no "gift", "shirt", "mug", "buyer", "collector")
   - No made-up personas (no "Analog Organization Advocate")
   - 2-3 words per persona, comma-separated
   Good: "Retro Design Lover, Home Office Minimalist, Vintage Enthusiast, Planner Devotee"
   Bad: "Typography Appreciator, Analog Organization Advocate" (not real buyer identities)

6. **overall_vibe** — One sentence summarizing the product's commercial appeal on Etsy. This sentence helps an AI understand what kind of listing this would be.
   Good: "A retro-styled wall calendar that appeals to vintage design lovers seeking functional home decor with 70s aesthetic"
   Bad: "A bold and functional piece that merges nostalgic graphic design with modern simplicity for a timeless organizational statement" (sounds like an art review, not an Etsy listing)
   Keep under 25 words.

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
