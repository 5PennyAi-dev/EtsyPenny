import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface NicheScoringInput {
    keywords: string[];
    theme: string;
    niche: string;
    subNiche?: string;
    productType: string;
    aesthetic?: string;
    targetAudience?: string;
    vibe?: string;
}

export interface NicheScoringResult {
    keyword: string;
    niche_score: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 25;

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    throw new Error('Missing environment variable GOOGLE_API_KEY');
}

const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
    temperature: 0.1,
    topP: 1,
    topK: 1,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ─── System Prompt Builder ─────────────────────────────────────────────────────

function buildSystemPrompt(input: NicheScoringInput): string {
    return `# Role
You are a Senior Etsy SEO Specialist. Your task is to evaluate tags based on their niche precision.

# Objective
For each keyword provided, assign a **Niche Score**. This ensures the listing reaches qualified buyers by separating "Elite" tags from "Filler" ones. The more the keywords correspond to the product context, the higher the score.

# Product context:
1. Use the following target:
- **Theme:** ${input.theme}
- **Niche:** ${input.niche}
- **Sub-niche:** ${input.subNiche || ''}
- **Product Type:** ${input.productType}

2. Visual & Marketing Data:
- **Aesthetic/Style:** ${input.aesthetic || ''}
- **Target Audience:** ${input.targetAudience || ''}
- **Overall_vibe:** ${input.vibe || ''}

# Scoring Tiers (Assign strictly one of these four)
## **Niche-Specific (Score 10):** Elite tags. Perfect alignment of style + subject + niche. (e.g., "Victorian raccoon oil painting").
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
3. **Fluff Ceiling:** Tags containing ONLY filler words (gift, best, quality, custom, personalized, shipping) MUST be scored as 1 (Broad).
Tags combining a niche keyword WITH a filler word (e.g., "Goth gift", "Punk custom") MUST be capped at a maximum score of 4 (Neutral). They can never be Strong (7) or Niche-Specific (10).
4. **Context Match:** A tag is only "Niche-Specific" if it matches the Theme AND Style provided in the product context.

# Output Requirement
- Return ONLY a valid JSON object.
- NO introductory text, NO markdown code blocks (no \`\`\`json), NO conclusion.
- Ensure the JSON structure matches exactly: {"keywords": [{"keyword": "string", "niche_score": number}]}`;
}

// ─── Batch Processing ──────────────────────────────────────────────────────────

async function scoreBatch(
    keywordsBatch: string[],
    systemPrompt: string
): Promise<NicheScoringResult[]> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig,
        safetySettings,
        systemInstruction: systemPrompt,
    });

    const userMessage = `# Keywords to Analyze:\n${JSON.stringify(keywordsBatch)}`;

    const result = await model.generateContent(userMessage);
    const rawText = result.response.text();

    // Strip markdown fences if present (safety net — responseMimeType should prevent this)
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const parsed = JSON.parse(cleaned);

    // Handle both { keywords: [...] } and { output: { keywords: [...] } } formats
    const keywords: NicheScoringResult[] = parsed.keywords ?? parsed.output?.keywords ?? [];

    // Validate and enforce strict tiers
    const VALID_SCORES = new Set([10, 7, 4, 1]);
    return keywords.map((kw: any) => ({
        keyword: String(kw.keyword),
        niche_score: VALID_SCORES.has(kw.niche_score) ? kw.niche_score : 1,
    }));
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export async function scoreNiche(input: NicheScoringInput): Promise<NicheScoringResult[]> {
    const { keywords } = input;

    if (!keywords || keywords.length === 0) {
        return [];
    }

    const systemPrompt = buildSystemPrompt(input);

    // Split keywords into batches of BATCH_SIZE
    const batches: string[][] = [];
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
        batches.push(keywords.slice(i, i + BATCH_SIZE));
    }

    // Fire all batches concurrently
    const batchResults = await Promise.all(
        batches.map((batch) => scoreBatch(batch, systemPrompt))
    );

    // Merge all batch results into a single flat array
    const combined: NicheScoringResult[] = [];
    for (const batchResult of batchResults) {
        combined.push(...batchResult);
    }

    return combined;
}
