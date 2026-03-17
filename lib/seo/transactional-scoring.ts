import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface TransactionalScoringInput {
    keywords: string[];
    productType: string;
    theme: string;
    niche: string;
}

export interface TransactionalScoringResult {
    keyword: string;
    transactional_score: number;
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

function buildSystemPrompt(input: TransactionalScoringInput): string {
    return `# Role
You are a Senior Etsy SEO Specialist. Your task is to evaluate tags based on their **Purchase Intent** (how close the user is to buying a physical product).

# Objective
For each keyword provided, assign a **Transactional Score**. This data will be used to determine if a keyword represents a "High-Conversion" intent (Buyer ready to purchase a specific product) or an "Informational" intent (User seeking ideas or browsing).

# Target Context for Calibration
Use the following context to identify the specific product being sold:
- **Product Type:** ${input.productType}
- **Theme/Niche:** ${input.theme} / ${input.niche}

# Scoring Tiers (Assign strictly one of these four)
- **High-Conversion (Score 10):** "The Sniper". Must be a precise, ready-to-buy product search. It MUST include: [Specific Product Noun] + [Premium/Usage Modifier] + [Specific Recipient or Occasion].
- **Product-Focused (Score 7):** Clear descriptive tags. Includes the product noun and a style, but lacks a specific recipient.
- **Browsing (Score 4):** Descriptive/Conceptual. Describes the style or vibe but MISSES the physical product noun.
- **Informational (Score 1):** Educational or DIY intent. User is looking for ideas, history, or how-to, not a product.

# Reference Datasets (20-Character Max):
- **High-Conversion (Score 10):** Gift for New Mom, Nurse Life Shirt, Wedding Photo Frame, Dad Birthday Gift, Custom Name Mug, Teacher Gift Idea, Baby Shower Decor, Pet Memorial Stone, Anniversary Jewelry, Groom Cufflinks

- **Product-Focused (Score 7):** Cotton Graphic Tee, Ceramic Coffee Mug, Gold Layered Ring, Canvas Tote Bag, Leather Wallet Men, Glass Flower Vase, Abstract Wall Art, Wool Winter Beanie, Silver Hoop Earring, Wooden Phone Stand

- **Browsing (Score 4):** Boho Room Decor, Aesthetic Vibe, Retro 70s Look, Minimalist Style, Cottagecore Dream, Goth Fashion Idea, Zen Garden Mood, Coastal Home Vibe, Y2K Outfit Style, Rustic Farmhouse

- **Informational (Score 1):** How to Style Tees, DIY Room Decor, Mug Cleaning Tips, History of Art, Gift Idea List, Outfit Inspiration, Sewing Tutorial, Interior Guide, Photo Edit Tips, Wood Carving DIY

# Scoring Instructions

1- The Strict 10 Rule (The Sniper): To assign a 10, the tag MUST combine a specific product noun with an explicit Purchase Trigger (e.g., "Gift", "Custom", "Set", "Box") AND a Recipient/Occasion (e.g., "Mom", "Teacher", "Wedding", "Birthday"). If one of these three pillars is missing, it cannot be a 10.

2- The Product Noun Requirement: To get a 7 or 10, the tag MUST contain a noun representing the physical object being sold (e.g., "Mug", "Shirt", "Ring").

3- The "Style-Only" Cap (Score 7): Tags that describe a product + a style/material but lack a specific recipient or gift intent are capped at 7. (e.g., "Ceramic Coffee Mug", "Gold Hoop Earring").

4- The Aesthetic Trap (Score 4): Tags describing a lifestyle, a party theme, or a visual vibe (e.g., "Coquette Tea Party", "Boho Decor", "Y2K Aesthetic") are capped at 4, even if they contain a vague noun. They represent browsing, not buying.

5- The DIY & Info Penalty (Score 1): Any tag indicating a search for knowledge, ideas, or tutorials (e.g., "How to", "DIY", "Ideas", "Tips", "Recipe") must be a 1.

6- No Nuance: You must choose exactly 10, 7, 4, or 1. Any hesitation between two scores must result in the lower score to maintain the "Strict Sniper" philosophy.

# Output Requirement
- Return ONLY a valid JSON object.
- NO introductory text, NO markdown code blocks (no \`\`\`json), NO conclusion.
- Ensure the JSON structure matches exactly: {"keywords": [{"keyword": "string", "transactional_score": number}]}`;
}

// ─── Batch Processing ──────────────────────────────────────────────────────────

async function scoreBatch(
    keywordsBatch: string[],
    systemPrompt: string
): Promise<TransactionalScoringResult[]> {
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
    const keywords: TransactionalScoringResult[] = parsed.keywords ?? parsed.output?.keywords ?? [];

    // Validate and enforce strict tiers
    const VALID_SCORES = new Set([10, 7, 4, 1]);
    return keywords.map((kw: any) => ({
        keyword: String(kw.keyword),
        transactional_score: VALID_SCORES.has(kw.transactional_score) ? kw.transactional_score : 1,
    }));
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export async function scoreTransactional(input: TransactionalScoringInput): Promise<TransactionalScoringResult[]> {
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
    const combined: TransactionalScoringResult[] = [];
    for (const batchResult of batchResults) {
        combined.push(...batchResult);
    }

    return combined;
}
