/**
 * Test script for Niche Scoring & Transactional Scoring services.
 * Run: node --env-file=.env test-seo-scoring.mjs
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ─── ENV CHECK ────────────────────────────────────────────
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) { console.error('❌ Missing env var: GOOGLE_API_KEY'); process.exit(1); }
console.log('✅ GOOGLE_API_KEY present\n');

// ─── GEMINI SETUP ─────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
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

// ─── TEST DATA (from n8n pinned examples) ─────────────────

const NICHE_TEST = {
  keywords: [
    'canvas wall art', 'whimsical art print', 'framed art print', 'modern farmhouse art',
    'boho nursery decor', 'gender neutral baby gift', 'sunflower burp cloth',
    'organic muslin diaper', 'gift for her', 'best seller etsy', 'personalized gift',
    'cute baby shower', 'eco conscious parent gift', 'minimalist nursery art',
    'cottagecore baby blanket',
  ],
  theme: 'Botanical & Floral',
  niche: 'Boho Baby',
  subNiche: 'Gender Neutral Nursery',
  productType: 'Diaper',
  aesthetic: 'Organic Boho, Scandi-Baby, Neutral Minimalist',
  targetAudience: 'Boho aesthetic lover, Eco-conscious parent, Minimalist mom, Nesting expectant mother',
  vibe: 'Earthy, organic softness designed for the modern, aesthetically conscious nursery.',
};

const TRANSACTIONAL_TEST = {
  keywords: [
    'Goth belt', 'Y2K goth belt', 'Studded leather belt', 'Belt for men',
    'Girlfriend gift belt', 'Birthday gift belt', 'Dark academia belt',
    'Grunge aesthetic', 'How to style belts', 'Fashion belt', 'Punk leather belt',
    'Goth accessory gift', 'Vampire goth belt', 'Cool belt', 'DIY jewelry tutor',
  ],
  productType: 'Belt',
  theme: 'Dark Academia & Gothic',
  niche: 'Alternative Fashion',
};

// ─── NICHE SCORING PROMPT ─────────────────────────────────

function buildNichePrompt(input) {
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

// ─── TRANSACTIONAL SCORING PROMPT ─────────────────────────

function buildTransactionalPrompt(input) {
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

// ─── SCORING RUNNER ───────────────────────────────────────

async function runScoring(systemPrompt, keywords) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig,
    safetySettings,
    systemInstruction: systemPrompt,
  });

  const userMessage = `# Keywords to Analyze:\n${JSON.stringify(keywords)}`;
  const result = await model.generateContent(userMessage);
  const rawText = result.response.text();

  // Strip markdown fences if present
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const parsed = JSON.parse(cleaned);

  return parsed.keywords ?? parsed.output?.keywords ?? [];
}

// ─── DISPLAY HELPERS ──────────────────────────────────────

const TIER_LABELS = { 10: '🎯 Niche-Specific', 7: '🟢 Strong', 4: '🟡 Neutral', 1: '🔴 Broad' };
const TRANS_LABELS = { 10: '🎯 High-Conversion', 7: '🟢 Product-Focused', 4: '🟡 Browsing', 1: '🔴 Informational' };

function printTable(results, scoreKey, labels) {
  const maxKw = Math.max(...results.map(r => r.keyword.length), 25);
  console.log(`   ${'Keyword'.padEnd(maxKw)}  Score  Tier`);
  console.log(`   ${'─'.repeat(maxKw)}  ─────  ${'─'.repeat(20)}`);
  for (const r of results) {
    const score = r[scoreKey];
    const label = labels[score] || `⚪ Unknown (${score})`;
    console.log(`   ${r.keyword.padEnd(maxKw)}  ${String(score).padStart(4)}   ${label}`);
  }
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  const totalStart = Date.now();

  // ── Step 1: Niche Scoring ──
  console.log('═══════════════════════════════════════');
  console.log('🎯 TEST 1: NICHE SCORING');
  console.log('═══════════════════════════════════════');
  console.log(`   Context: ${NICHE_TEST.theme} > ${NICHE_TEST.niche} > ${NICHE_TEST.subNiche}`);
  console.log(`   Product: ${NICHE_TEST.productType}`);
  console.log(`   Keywords: ${NICHE_TEST.keywords.length}`);
  console.log();

  const nicheStart = Date.now();
  const nichePrompt = buildNichePrompt(NICHE_TEST);
  const nicheResults = await runScoring(nichePrompt, NICHE_TEST.keywords);
  const nicheMs = Date.now() - nicheStart;

  console.log(`   ✅ Niche scoring complete (${nicheMs}ms)\n`);
  printTable(nicheResults, 'niche_score', TIER_LABELS);

  // Validate strict tiers
  const VALID = new Set([10, 7, 4, 1]);
  const invalidNiche = nicheResults.filter(r => !VALID.has(r.niche_score));
  if (invalidNiche.length > 0) {
    console.log(`\n   ⚠️  ${invalidNiche.length} keywords returned non-standard scores:`);
    invalidNiche.forEach(r => console.log(`      "${r.keyword}" → ${r.niche_score}`));
  } else {
    console.log(`\n   ✅ All ${nicheResults.length} scores are valid (10, 7, 4, or 1)`);
  }

  // Score distribution
  const nicheDist = { 10: 0, 7: 0, 4: 0, 1: 0 };
  nicheResults.forEach(r => { if (nicheDist[r.niche_score] !== undefined) nicheDist[r.niche_score]++; });
  console.log(`   📊 Distribution: 10=${nicheDist[10]}, 7=${nicheDist[7]}, 4=${nicheDist[4]}, 1=${nicheDist[1]}`);

  // Spot-check: "gift for her" and "best seller etsy" should be 1
  const fluffCheck = nicheResults.filter(r =>
    ['gift for her', 'best seller etsy', 'personalized gift'].includes(r.keyword.toLowerCase())
  );
  console.log(`   🔍 Fluff check (should all be 1):`);
  fluffCheck.forEach(r => {
    const pass = r.niche_score === 1 ? '✅' : '❌';
    console.log(`      ${pass} "${r.keyword}" → ${r.niche_score}`);
  });

  console.log('\n');

  // ── Step 2: Transactional Scoring ──
  console.log('═══════════════════════════════════════');
  console.log('🛒 TEST 2: TRANSACTIONAL SCORING');
  console.log('═══════════════════════════════════════');
  console.log(`   Context: ${TRANSACTIONAL_TEST.theme} / ${TRANSACTIONAL_TEST.niche}`);
  console.log(`   Product: ${TRANSACTIONAL_TEST.productType}`);
  console.log(`   Keywords: ${TRANSACTIONAL_TEST.keywords.length}`);
  console.log();

  const transStart = Date.now();
  const transPrompt = buildTransactionalPrompt(TRANSACTIONAL_TEST);
  const transResults = await runScoring(transPrompt, TRANSACTIONAL_TEST.keywords);
  const transMs = Date.now() - transStart;

  console.log(`   ✅ Transactional scoring complete (${transMs}ms)\n`);
  printTable(transResults, 'transactional_score', TRANS_LABELS);

  const invalidTrans = transResults.filter(r => !VALID.has(r.transactional_score));
  if (invalidTrans.length > 0) {
    console.log(`\n   ⚠️  ${invalidTrans.length} keywords returned non-standard scores:`);
    invalidTrans.forEach(r => console.log(`      "${r.keyword}" → ${r.transactional_score}`));
  } else {
    console.log(`\n   ✅ All ${transResults.length} scores are valid (10, 7, 4, or 1)`);
  }

  // Score distribution
  const transDist = { 10: 0, 7: 0, 4: 0, 1: 0 };
  transResults.forEach(r => { if (transDist[r.transactional_score] !== undefined) transDist[r.transactional_score]++; });
  console.log(`   📊 Distribution: 10=${transDist[10]}, 7=${transDist[7]}, 4=${transDist[4]}, 1=${transDist[1]}`);

  // Spot-checks
  console.log(`   🔍 Spot checks:`);
  const spotChecks = [
    { kw: 'How to style belts', expected: 1, label: 'should be 1 (DIY Penalty)' },
    { kw: 'DIY jewelry tutor', expected: 1, label: 'should be 1 (Info Penalty)' },
    { kw: 'Birthday gift belt', expected: 10, label: 'should be 10 (Product + Trigger + Occasion)' },
    { kw: 'Grunge aesthetic', expected: 4, label: 'should be 4 (Aesthetic Trap)' },
    { kw: 'Punk leather belt', expected: 7, label: 'should be 7 (Product + Style, no recipient)' },
  ];
  for (const check of spotChecks) {
    const found = transResults.find(r => r.keyword.toLowerCase() === check.kw.toLowerCase());
    if (found) {
      const pass = found.transactional_score === check.expected ? '✅' : '⚠️';
      console.log(`      ${pass} "${found.keyword}" → ${found.transactional_score} (${check.label})`);
    } else {
      console.log(`      ❓ "${check.kw}" not found in results`);
    }
  }

  // ── Summary ──
  const totalMs = Date.now() - totalStart;
  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log('🎉 ALL TESTS COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`   Niche:         ${nicheResults.length} keywords scored in ${nicheMs}ms`);
  console.log(`   Transactional: ${transResults.length} keywords scored in ${transMs}ms`);
  console.log(`   Total time:    ${totalMs}ms`);
  console.log();
}

main().catch(err => {
  console.error('\n💥 FATAL ERROR:', err.message || err);
  process.exit(1);
});
