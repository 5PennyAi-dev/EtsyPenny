/**
 * Niche + Transactional scoring via AI with strict 4-tier scores.
 * Niche scoring uses context-aware dynamic examples based on the actual product.
 */

import { runAI } from '../ai/provider-router.js';

// ─── TYPES ───────────────────────────────────────────────

interface ScoringContext {
  product_type: string;
  theme: string;
  niche: string;
  sub_niche?: string;
  client_description?: string;
  visual_aesthetic?: string;
  visual_target_audience?: string;
  visual_overall_vibe?: string;
  visual_colors?: string;
  visual_graphics?: string;
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

// ─── NICHE SCORING HELPERS ───────────────────────────────

function generateScoringExamples(params: {
  productType: string;
  theme: string;
  niche: string;
  subNiche: string;
  aestheticStyle: string;
}): { examples10: string; examples7: string; examples4: string; examples1: string } {
  const pt = params.productType?.toLowerCase() || 'product';
  const sub = params.subNiche?.toLowerCase() || '';
  const style = params.aestheticStyle?.toLowerCase() || '';
  const themeAdj = params.theme?.split('&')[0]?.trim().toLowerCase() || 'themed';

  const examples10 = `Examples for this ${pt}: ` +
    `"${sub}" (exact sub-niche match), ` +
    `"${style} ${pt}" (exact style + product). ` +
    `Key: this keyword could ONLY match this specific product, not 50 other ${pt}s. ` +
    `Only ~10-15% of keywords should score 10.`;

  const examples7 = `Examples for this ${pt}: ` +
    `"${themeAdj} ${pt}" (theme + product), ` +
    `"${pt}" with a single attribute (color, size, basic material). ` +
    `Key: relevant and well-targeted, but could match many similar ${pt}s. ` +
    `This should be the MOST COMMON score (~50-60% of keywords).`;

  const examples4 = `Examples: ` +
    `"${themeAdj} fashion" (style without product), ` +
    `"eco accessories" (adjacent category), ` +
    `"${pt}" alone without qualifiers (too generic). ` +
    `Key: buyer might want this product, or might want something else entirely.`;

  const examples1 = `Examples: "gift for her", "best seller", "trending now", "unique gift". ` +
    `Key: could be any product on Etsy.`;

  return { examples10, examples7, examples4, examples1 };
}

function extractAestheticTerms(params: {
  aestheticStyle: string;
  colorPalette: string;
  graphicElements: string;
  theme: string;
}): string {
  const terms: string[] = [];

  if (params.aestheticStyle) {
    terms.push(...params.aestheticStyle.toLowerCase()
      .split(/[,\s]+/)
      .filter(w => w.length > 2 && !['and', 'the', 'with', 'for'].includes(w))
      .slice(0, 3));
  }

  if (params.colorPalette) {
    const colors = params.colorPalette.toLowerCase()
      .split(/[—,\s]+/)
      .filter(w => w.length > 2 && !['and', 'the', 'with', 'mood', 'warm', 'cool', 'palette'].includes(w))
      .slice(0, 3);
    terms.push(...colors);
  }

  if (params.theme) {
    terms.push(...params.theme.toLowerCase()
      .split(/[&,\s]+/)
      .filter(w => w.length > 2)
      .slice(0, 2));
  }

  const unique = [...new Set(terms)].slice(0, 8);
  return unique.length > 0
    ? `"${unique.join('", "')}"`
    : '"matching the product style"';
}

// ─── NICHE SCORING PROMPT ────────────────────────────────

function buildNicheScoringPrompt(ctx: ScoringContext): string {
  const examples = generateScoringExamples({
    productType: ctx.product_type,
    theme: ctx.theme,
    niche: ctx.niche,
    subNiche: ctx.sub_niche || '',
    aestheticStyle: ctx.visual_aesthetic || '',
  });

  const aestheticTerms = extractAestheticTerms({
    aestheticStyle: ctx.visual_aesthetic || '',
    colorPalette: ctx.visual_colors || '',
    graphicElements: ctx.visual_graphics || '',
    theme: ctx.theme,
  });

  const ptLower = (ctx.product_type || 'product').toLowerCase();

  return `# Role
You are an Etsy search relevance engine. You evaluate how well each keyword matches a specific product listing. Your scores directly determine which keywords appear in the final Etsy tags.

# Product being scored
- **Product type:** ${ctx.product_type || 'Not specified'}
- **Theme:** ${ctx.theme || 'Not specified'}
- **Niche:** ${ctx.niche || 'Not specified'}
- **Sub-niche:** ${ctx.sub_niche || 'Not specified'}
- **Description:** ${ctx.client_description || 'No description'}
- **Aesthetic/Style:** ${ctx.visual_aesthetic || 'Not specified'}
- **Color palette:** ${ctx.visual_colors || 'Not specified'}
- **Graphic elements:** ${ctx.visual_graphics || 'Not specified'}
- **Target audience:** ${ctx.visual_target_audience || 'General buyers'}
- **Overall vibe:** ${ctx.visual_overall_vibe || 'Not specified'}

# Scoring question
For each keyword, ask yourself: "If an Etsy buyer types this exact keyword, how likely is THIS SPECIFIC product to be exactly what they want?"

# Scoring tiers (assign exactly one)

**Score 10 — This keyword was MADE for this product**
The keyword matches the product's SPECIFIC combination of: product type + visual style/theme + target audience. Only a handful of keywords in any set should score 10.
Test: If you searched this keyword on Etsy, would THIS EXACT product be in the top 3 results? Would the buyer immediately say "that's exactly what I was looking for"?
${examples.examples10}

**Score 7 — Strong match, right category**
The keyword clearly matches the product type and general style OR the product type and target audience, but misses some specificity. Many similar products would also match this keyword.
Test: Would this product appear on page 1 of Etsy results, but among 20+ very similar listings?
${examples.examples7}

**Score 4 — Tangential, adjacent category**
The keyword is related but not specific to this product. It might describe the right product type but wrong style, or the right style but wrong product type, or a broader category.
Test: Would the buyer need to scroll past many non-matching results to find this product?
${examples.examples4}

**Score 1 — Generic filler**
The keyword has no meaningful connection to this specific product. It could apply to hundreds of different product types and styles.
Test: Could you put this keyword on literally any Etsy listing?
${examples.examples1}

# Scoring rules

1. **Exact scores only.** Use 10, 7, 4, or 1.

2. **Score 10 requires DOUBLE specificity.** The keyword must match BOTH (a) the product type AND (b) a defining characteristic that distinguishes THIS product from others of the same type. For this product, keywords mentioning ${aestheticTerms} combined with "${ptLower}" are Score 10 candidates.

3. **Score 7 is the expected norm.** Most well-generated keywords should score 7. Product type + one relevant attribute that COULD apply to many similar products = 7. This is not a bad score — it means the keyword is relevant and correctly targeted.

4. **Style/theme WITHOUT product type = 4.** Keywords that describe the aesthetic or values without the product type = Score 4. The buyer might want this product, or a bag, or jewelry.

5. **Mismatched attributes = 4.** If the keyword describes an attribute the product does NOT have, score 4.

6. **Visual style match matters.** Keywords referencing this product's specific visual elements (${aestheticTerms}) score higher than generic terms.

7. **Filler = 1.** Generic terms (gift for her, best seller, trending, unique, personalized) = Score 1 always.

# Expected score distribution
In a well-generated keyword set, the scores should distribute roughly as:
- Score 10: ~10-15% of keywords (only the most precisely targeted)
- Score 7: ~50-60% of keywords (the bulk of good, relevant keywords)
- Score 4: ~20-25% of keywords (tangential and broad terms)
- Score 1: ~5-10% of keywords (filler and generic terms)
If you find yourself scoring more than 25% of keywords as 10, you are being too generous. Score 7 is a GOOD score — it means the keyword is well-targeted. Reserve 10 for truly exceptional matches.

# Output format
Return ONLY valid JSON. No markdown fences. No commentary before or after.

{"keywords": [{"keyword": "exact keyword from input", "niche_score": 10}]}`;
}

// ─── TRANSACTIONAL SCORING HELPERS ───────────────────────

function generateTransactionalExamples(params: {
  productType: string;
  theme: string;
  niche: string;
}): { examples10: string; examples7: string; examples4: string; examples1: string } {
  const pt = params.productType?.toLowerCase() || 'product';
  const themeAdj = params.theme?.split('&')[0]?.trim().toLowerCase() || 'styled';

  const examples10 = `Examples for this ${pt}: ` +
    `"${pt} gift for mom" (product + recipient), ` +
    `"christmas ${pt}" (product + occasion), ` +
    `"wedding guest ${pt}" (product + specific event). ` +
    `Key: there is a SPECIFIC purchase trigger beyond just wanting a ${pt}.`;

  const examples7 = `Examples for this ${pt}: ` +
    `"${themeAdj} ${pt}" (product + style), ` +
    `"blue ${pt}" (product + color), ` +
    `"organic ${pt}" (product + material). ` +
    `Key: the buyer wants a ${pt} and is comparing options with preferences. ` +
    `This is the MOST COMMON score for well-targeted keywords.`;

  const examples4 = `Examples: ` +
    `"${pt}" (product alone, no qualifier), ` +
    `"${themeAdj} accessories" (broad category), ` +
    `"self care essentials" (lifestyle term). ` +
    `Key: too broad to signal active purchasing of this specific ${pt}.`;

  const examples1 = `Examples: ` +
    `"DIY ${pt}", "best seller", "trending now", "unique gift idea". ` +
    `Key: not shopping.`;

  return { examples10, examples7, examples4, examples1 };
}

// ─── TRANSACTIONAL SCORING PROMPT ────────────────────────

function buildTransactionalScoringPrompt(ctx: ScoringContext): string {
  const examples = generateTransactionalExamples({
    productType: ctx.product_type,
    theme: ctx.theme,
    niche: ctx.niche,
  });

  const ptLower = (ctx.product_type || 'product').toLowerCase();
  const themeAdj = ctx.theme?.split('&')[0]?.trim().toLowerCase() || 'styled';

  return `# Role
You are an Etsy conversion specialist. You evaluate how likely a buyer is to PURCHASE after typing each keyword. Your score measures buying intent, not product relevance (that is the niche score's job).

# Product context
- **Product type:** ${ctx.product_type || 'Not specified'}
- **Theme:** ${ctx.theme || 'Not specified'}
- **Niche:** ${ctx.niche || 'Not specified'}
- **Sub-niche:** ${ctx.sub_niche || 'Not specified'}
- **Target audience:** ${ctx.visual_target_audience || 'General buyers'}

# Scoring question
For each keyword, ask: "Is the person typing this keyword on Etsy ready to BUY, or just looking around?"

# Scoring tiers (assign exactly one)

**Score 10 — Urgent, specific purchase**
The buyer describes a PRECISE need — combining the product with a specific occasion, recipient, or time constraint. This person will buy TODAY if they find the right listing.
Signals: product + occasion ("christmas ${ptLower}"), product + recipient ("gift for wife"), product + urgency ("2026 ${ptLower}"), product + specific problem to solve.
Test: Is this person shopping for a SPECIFIC event, person, or deadline?
${examples.examples10}

**Score 7 — Active product shopping**
The buyer is actively shopping for this product type with preferences. They know what category they want and are comparing options. They will probably buy THIS WEEK.
Signals: product type + attribute (material, color, style, size, cut), product type + use context.
Test: Is this person comparing 5-10 listings right now to pick one?
${examples.examples7}

**Score 4 — Category browsing**
The buyer is exploring a broad category or aesthetic. They might buy something but they are not committed to this specific product type yet.
Signals: broad category terms, lifestyle/value terms, aesthetic-only terms, product type alone without any qualifier.
Test: Could this person end up buying a completely different product type?
${examples.examples4}

**Score 1 — No purchase intent**
Informational, DIY, or pure filler terms. Not shopping on Etsy.
Test: Would this person be surprised to see product listings?
${examples.examples1}

# Scoring rules

1. **Exact scores only.** Use 10, 7, 4, or 1.

2. **Occasion/recipient/urgency = 10.** The ONLY path to Score 10 is when the keyword includes a SPECIFIC purchase trigger beyond just wanting the product: an occasion (christmas, birthday, wedding), a recipient (for mom, for wife, for teacher), a deadline (2026, this season), or a specific problem/need.

3. **Product + attribute = 7.** Keywords with the product type plus material, color, style, cut, size, or feature modifiers = Score 7. This is the EXPECTED score for most good keywords. "${themeAdj} ${ptLower}", "blue ${ptLower}", "organic ${ptLower}" all score 7.

4. **Product type alone = 4.** The bare product type without any qualifier ("${ptLower}") = Score 4. The buyer has not narrowed their search at all.

5. **Category/lifestyle without product = 4.** Broad terms like "slow fashion", "wellness tools", "spa accessories", "eco friendly" without the specific product type = Score 4.

6. **Gift WITHOUT product type = 7.** "gift for mom" shows purchase intent but no product specificity. Score 7.

7. **Filler = 1.** Generic terms (trending, best seller, unique, handmade, quality) = Score 1 always.

# Expected score distribution
In a well-generated keyword set, the scores should distribute roughly as:
- Score 10: ~10-15% of keywords (only those with occasion/recipient/urgency triggers)
- Score 7: ~50-60% of keywords (the bulk of good, product-specific keywords)
- Score 4: ~20-25% of keywords (broad category and bare product terms)
- Score 1: ~5-10% of keywords (filler and generic terms)
If you find yourself scoring more than 25% of keywords as 10, you are being too generous. Score 7 is a GOOD score — it means the buyer is actively shopping. Reserve 10 for urgent purchase triggers.

# Output format
Return ONLY valid JSON. No markdown fences. No commentary before or after.

{"keywords": [{"keyword": "exact keyword from input", "transactional_score": 10}]}`;
}

// ─── MAIN EXPORT ─────────────────────────────────────────

export async function scoreKeywords(stats: EnrichedKeyword[], ctx: ScoringContext): Promise<ScoredKeyword[]> {
  const kws = stats.map(s => s.keyword);

  const nicheSystem = buildNicheScoringPrompt(ctx);

  const transSystem = buildTransactionalScoringPrompt(ctx);

  const BATCH = 25;
  const batches: string[][] = [];
  for (let i = 0; i < kws.length; i += BATCH) batches.push(kws.slice(i, i + BATCH));

  // TEMPORARY — remove after validating scoring prompts
  console.info(`[score-keywords] Niche scoring prompt:\n${nicheSystem}\n`);
  console.info(`[score-keywords] Transactional scoring prompt:\n${transSystem}\n`);

  console.info(`[scoring] Scoring ${kws.length} keywords in ${batches.length} parallel batches per scorer`);

  const runScoring = async (taskKey: string, systemPrompt: string, batchList: string[][]) => {
    const batchResults = await Promise.all(
      batchList.map(async (batch) => {
        const { text } = await runAI(taskKey, `# Keywords to Analyze:\n${JSON.stringify(batch)}`, {
          systemPrompt,
        });
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        return (parsed.keywords ?? []) as Array<{ keyword?: string; niche_score?: number; transactional_score?: number }>;
      })
    );
    return batchResults.flat();
  };

  const scoringStart = Date.now();
  const [nicheResults, transResults] = await Promise.all([
    runScoring('niche_scoring', nicheSystem, batches),
    runScoring('transactional_scoring', transSystem, batches),
  ]);
  console.info(`[scoring] Scored ${kws.length} keywords in ${((Date.now() - scoringStart) / 1000).toFixed(1)}s`);

  const VALID = new Set([10, 7, 4, 1]);
  const nicheMap = new Map(nicheResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.niche_score!) ? r.niche_score! : 1]));
  const transMap = new Map(transResults.map(r => [r.keyword?.toLowerCase(), VALID.has(r.transactional_score!) ? r.transactional_score! : 1]));

  // Check for keywords dropped by AI in parallel batches
  const missingNiche = kws.filter(kw => !nicheMap.has(kw));
  const missingTrans = kws.filter(kw => !transMap.has(kw));
  if (missingNiche.length > 0) {
    console.warn(`[scoring] ${missingNiche.length} keywords missing from niche scoring — filling with default score 4`);
    missingNiche.forEach(kw => nicheMap.set(kw, 4));
  }
  if (missingTrans.length > 0) {
    console.warn(`[scoring] ${missingTrans.length} keywords missing from transactional scoring — filling with default score 4`);
    missingTrans.forEach(kw => transMap.set(kw, 4));
  }

  return stats.map(s => ({
    keyword: s.keyword, search_volume: s.search_volume, competition: s.competition, cpc: s.cpc,
    volume_history: s.volume_history,
    niche_score: nicheMap.get(s.keyword) ?? null,
    transactional_score: transMap.get(s.keyword) ?? null,
    is_selection_ia: false, is_user_added: false, is_pinned: false, fromCache: s.fromCache,
  }));
}
