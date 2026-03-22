/**
 * Verbatim extract from server.mjs lines 349-428.
 * Niche + Transactional scoring via Gemini with strict 4-tier scores.
 * Replaces the separate niche-scoring.ts and transactional-scoring.ts.
 */

import { runAI } from '../ai/provider-router.js';

interface ScoringContext {
  product_type: string;
  theme: string;
  niche: string;
  sub_niche?: string;
  visual_aesthetic?: string;
  visual_target_audience?: string;
  visual_overall_vibe?: string;
}

interface EnrichedKeyword {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
  volume_history: number[];
  fromCache: boolean;
}

interface ScoredKeyword extends EnrichedKeyword {
  niche_score: number | null;
  transactional_score: number | null;
  is_selection_ia: boolean;
  is_user_added: boolean;
  is_pinned: boolean;
}

export async function scoreKeywords(stats: EnrichedKeyword[], ctx: ScoringContext): Promise<ScoredKeyword[]> {
  const kws = stats.map(s => s.keyword);

  const nicheSystem = `# Role
You are a Senior Etsy SEO Specialist. Your task is to evaluate tags based on their niche precision.

# Objective
For each keyword provided, assign a **Niche Score**. This ensures the listing reaches qualified buyers by separating "Elite" tags from "Filler" ones. The more the keywords correspond to the product context, the higher the score.

# Product context:
1. Use the following target:
- **Theme:** ${ctx.theme}
- **Niche:** ${ctx.niche}
- **Sub-niche:** ${ctx.sub_niche || ''}
- **Product Type:** ${ctx.product_type}

2. Visual & Marketing Data:
- **Aesthetic/Style:** ${ctx.visual_aesthetic || ''}
- **Target Audience:** ${ctx.visual_target_audience || ''}
- **Overall_vibe:** ${ctx.visual_overall_vibe || ''}

# Scoring Tiers (Assign strictly one of these four)
- **Niche-Specific (Score 10):** Elite tags. Perfect alignment of style + subject + niche. (e.g., "Victorian raccoon oil painting").
- **Strong (Score 7):** High relevance. Clear descriptive tags that target the right audience but are less unique. (e.g., "Dark academia shirt").
- **Neutral (Score 4):** Broadly descriptive. Standard tags that describe the product type without specific style. (e.g., "Raccoon t-shirt").
- **Broad (Score 1):** Filler/Generic. Buzzwords or broad occasions. (e.g., "Gift for her", "Personalized gift").

# Reference Datasets (For Calibration)
- **Niche-Specific (Score 10):** Gothic Skull Planter, Y2K Grunge Jewelry, Sarcastic Office Mug, Witchy Moon Altar, Retro Gamer Apparel, Modern Farmhouse Key, Dainty Bridal Comb, Industrial Desk Lamp, Celestial Sun Tarot, Pastel Kawaii Plush, Viking Rune Pendant, 90s Streetwear Hat, Funny Nurse Shirt, Boho Nursery Decor, Mid Century Planter, Coastal Grandma Tee, Dark Forest Candle, Anatomy Science Mug, Steampunk Gear Ring, Moody Floral Case, Minimalist Dog Tag, Vegan Leather Purse, Wabi Sabi Ceramics, Glitch Core Apparel, Zodiac Crystal Kit

- **Strong (Score 7):** Gothic Black Shirt, Floral Summer Dress, Boho Wall Hanging, Silver Hoop Earring, Modern Coffee Table, Vintage Style Jeans, Minimalist Wallet, Abstract Throw Case, Wooden Picture Frame, Gold Dainty Ring, Leather Travel Bag, Baby Shower Decor, Wedding Guest Book, Celestial Jewelry, Nurse Life Apparel, Witchy Room Decor, Gamer Room Poster, Dog Lover Apparel, Aesthetic Stationery, Farmhouse Kitchen, Zodiac Sign Pendant, Handmade Soy Candle, Retro Sunglasses, Yoga Mat Bag, Industrial Shelf

- **Neutral (Score 4):** Raccoon T-shirt, Cat Coffee Mug, Dog Wall Art, Flower Necklace, Heart Ring, Star Earring, Tree Ornament, Beach Towel, Mountain Print, Bird Sticker, Moon Lamp, Leaf Pillow, Sun Keychain, Bear Hoodie, Elephant Toy, Butterfly Clip, Rose Bracelet, Owl Statue, Fox Patch, Pine Candle

- **Broad (Score 1):** Gift for her, Personalized Gift, Best Seller Etsy, Mothers Day Gift, Custom Clothing, High Quality Tee, Unique Gift Idea, Birthday Present, Handmade with Love, Trending Now Item, Christmas Gift, Women's Fashion, Gift for Him, Special Occasion, Top Rated Item, Anniversary Gift, Holiday Season, Luxury Gift Idea, Great Gift for Mom, New Arrival Item

# Scoring Instructions
1. **No Nuance:** You must choose exactly 10, 7, 4, or 1. Do not use intermediate numbers.
2. **Structure Analysis:** Reward "Style + Subject + Product" with a 10.
3. **Fluff Ceiling:** Tags containing ONLY filler words (gift, best, quality, custom, personalized, shipping) MUST be scored as 1 (Broad). Tags combining a niche keyword WITH a filler word (e.g., "Goth gift", "Punk custom") MUST be capped at a maximum score of 4 (Neutral).
4. **Context Match:** A tag is only "Niche-Specific" if it matches the Theme AND Style provided in the product context.

# Output Requirement
- Return ONLY a valid JSON object.
- NO introductory text, NO markdown code blocks.
- Ensure the JSON structure matches exactly: {"keywords": [{"keyword": "string", "niche_score": number}]}`;

  const transSystem = `# Role\nYou are a Senior Etsy SEO Specialist evaluating tags on purchase intent.\n\n# Context: Product Type: ${ctx.product_type} | Theme: ${ctx.theme} | Niche: ${ctx.niche}\n\n# Scoring: Use ONLY 10, 7, 4, or 1.\n- 10 = High-Conversion (Product Noun + Purchase Trigger + Recipient/Occasion)\n- 7 = Product-Focused (Product Noun + Style, no recipient)\n- 4 = Browsing (Style/vibe, missing product noun)\n- 1 = Informational (DIY, ideas, tutorials)\n\nReturn ONLY: {"keywords": [{"keyword": "...", "transactional_score": N}]}`;

  const BATCH = 25;
  const batches: string[][] = [];
  for (let i = 0; i < kws.length; i += BATCH) batches.push(kws.slice(i, i + BATCH));

  const runScoring = async (taskKey: string, systemPrompt: string, batchList: string[][]) => {
    const results: Array<{ keyword?: string; niche_score?: number; transactional_score?: number }> = [];
    for (const batch of batchList) {
      const { text } = await runAI(taskKey, `# Keywords to Analyze:\n${JSON.stringify(batch)}`, {
        systemPrompt,
      });
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      results.push(...(parsed.keywords ?? []));
    }
    return results;
  };

  const [nicheResults, transResults] = await Promise.all([
    runScoring('niche_scoring', nicheSystem, batches),
    runScoring('transactional_scoring', transSystem, batches),
  ]);

  const VALID = new Set([10, 7, 4, 1]);
  const nicheMap = new Map(nicheResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.niche_score!) ? r.niche_score! : 1]));
  const transMap = new Map(transResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.transactional_score!) ? r.transactional_score! : 1]));

  return stats.map(s => ({
    keyword: s.keyword, search_volume: s.search_volume, competition: s.competition, cpc: s.cpc,
    volume_history: s.volume_history,
    niche_score: nicheMap.get(s.keyword) ?? null,
    transactional_score: transMap.get(s.keyword) ?? null,
    is_selection_ia: false, is_user_added: false, is_pinned: false, fromCache: s.fromCache,
  }));
}
