/**
 * 6 parallel AI calls to generate keyword pool across differentiated segments.
 * Each segment targets a distinct keyword strategy to minimize overlap.
 */

import { runAI } from '../ai/provider-router.js';
import { extractJson } from '../ai/extract-json.js';
import { getCanonicalConcept, extractProductTypeWords } from './concept-diversity.js';

// ─── TYPES ───────────────────────────────────────────────

interface KeywordContext {
  product_type: string;
  theme: string;
  niche: string;
  sub_niche: string;
  client_description: string;
  visual_aesthetic: string;
  visual_target_audience: string;
  visual_overall_vibe: string;
  visual_colors: string;
  visual_graphics: string;
}

// ─── SHARED BLOCKS ───────────────────────────────────────

function buildSegmentContext(ctx: KeywordContext): string {
  let context = `
# Product context
- Product type: ${ctx.product_type}
- Theme: ${ctx.theme}
- Niche: ${ctx.niche}
- Sub-niche: ${ctx.sub_niche}
- Description: ${ctx.client_description}

# Visual data
- Aesthetic/Style: ${ctx.visual_aesthetic}
- Target audience: ${ctx.visual_target_audience}
- Overall vibe: ${ctx.visual_overall_vibe}`;

  if (ctx.visual_colors) context += `\n- Color palette: ${ctx.visual_colors}`;
  if (ctx.visual_graphics) context += `\n- Graphic elements: ${ctx.visual_graphics}`;

  return context.trim();
}

const SHARED_RULES = `
# Universal rules
- Etsy tag limit: max 20 characters per keyword (CRITICAL — any keyword over 20 chars is wasted)
- Lowercase only, no trademarks, no special characters
- No duplicates within your list
- Output format: JSON object {"keywords": ["keyword1", "keyword2", ...]}
- Return ONLY valid JSON. No markdown fences. No commentary.`;

// ─── SEGMENT PROMPTS ─────────────────────────────────────

const SEGMENT_CORE_PRODUCT = `
# Role
You are an Etsy SEO specialist generating core product keywords.

# Your segment: Core Product Keywords
Generate the fundamental keywords a buyer would type when searching for exactly this type of product. These are the high-volume, obvious search terms that MUST be in any good Etsy listing.

{CONTEXT}

# Segment-specific rules
- The product type MUST appear in every keyword (100%)
- Focus on: product name variations, material + product, function + product, year/size + product
- Keywords should be what a buyer types when they KNOW what they want
- Prioritize search volume over specificity

# Examples for a "Retro 2026 Monthly Wall Calendar":
  "2026 wall calendar", "retro calendar", "monthly calendar", "vintage calendar",
  "wall calendar 2026", "large wall calendar", "monthly planner", "yearly calendar",
  "kitchen calendar", "office calendar"

# What NOT to generate (these belong to other segments):
- Style/aesthetic terms without product type (e.g., "retro decor" — that's Segment 2)
- Gift/occasion terms (e.g., "christmas gift" — that's Segment 3)
- Niche-adjacent terms (e.g., "home office decor" — that's Segment 4)

Generate 40 keywords.

{RULES}`;

const SEGMENT_STYLE_AESTHETIC = `
# Role
You are an Etsy SEO specialist generating style and aesthetic keywords.

# Your segment: Style & Aesthetic Keywords
Generate keywords based on the visual design, art style, color mood, and aesthetic trend of this product. These target buyers who search by LOOK rather than by product type.

{CONTEXT}

# Segment-specific rules
- The product type should appear in about 50% of keywords — the other 50% are pure style/decor terms
- Heavily exploit the visual data above: aesthetic style, color palette, graphic elements
- Think about what design-conscious buyers search: style movements, color terms, decor aesthetics
- Include era-specific terms, design movement names, mood descriptors

# Examples for a "Retro 2026 Monthly Wall Calendar" with 70s typography and brick red palette:
  "70s wall decor", "retro typography", "vintage print art", "mid century modern",
  "retro wall art", "70s aesthetic", "vintage home decor", "brick red decor",
  "retro office art", "70s style calendar"

# What NOT to generate (these belong to other segments):
- Plain product terms without style angle (e.g., "2026 calendar" — that's Segment 1)
- Gift/recipient terms (e.g., "gift for designer" — that's Segment 3)
- Generic niche terms (e.g., "office supplies" — that's Segment 4)

Generate 30 keywords.

{RULES}`;

const SEGMENT_BUYER_OCCASION = `
# Role
You are an Etsy SEO specialist generating buyer intent and occasion keywords.

# Your segment: Buyer & Occasion Keywords
Generate keywords that target WHO is buying and WHY. Focus on gift scenarios, occasions, recipients, and seasonal timing. Many Etsy searches are "gift for [person]" or "[occasion] gift".

{CONTEXT}

# Segment-specific rules
- The product type should appear in about 60% of keywords
- Focus on: "gift for [persona]", "[occasion] + product", "[recipient] + product"
- Use the target audience personas as buyer archetypes
- Include seasonal and holiday variations when relevant
- Think about the GIFTER, not just the end user

# Examples for a "Retro 2026 Monthly Wall Calendar" targeting Home Office Organizer, Design Lover:
  "calendar gift", "new year gift", "office gift idea", "gift for designer",
  "housewarming gift", "coworker gift", "stocking stuffer", "christmas calendar",
  "gift for him", "birthday gift idea"

# What NOT to generate (these belong to other segments):
- Pure product terms (e.g., "wall calendar 2026" — that's Segment 1)
- Pure style terms (e.g., "70s aesthetic" — that's Segment 2)
- Niche-adjacent products (e.g., "desk organizer" — that's Segment 4)

Generate 30 keywords.

{RULES}`;

const SEGMENT_NICHE_ADJACENT = `
# Role
You are an Etsy SEO specialist generating niche and adjacent market keywords.

# Your segment: Niche & Adjacent Keywords
Generate keywords from the product's primary niche AND neighboring niches that the same buyer would explore. If someone searches for this product, what ELSE are they browsing? Target the broader shopping journey.

{CONTEXT}

# Segment-specific rules
- The product type should appear in about 50% of keywords
- Explore adjacent categories the same buyer would shop in
- Include room/location terms (kitchen, office, bedroom, dorm)
- Include broader category terms that this product fits under
- Think: "what else is in the same Etsy search results page?"

# Examples for a "Retro 2026 Monthly Wall Calendar" in Home Decorators niche:
  "home office decor", "kitchen wall art", "desk accessories", "dorm room decor",
  "apartment decor", "cubicle decor", "retro office", "wall organization",
  "room aesthetic", "planning supplies"

# What NOT to generate (these belong to other segments):
- Exact product matches (e.g., "retro calendar" — that's Segment 1)
- Pure visual style terms (e.g., "70s typography" — that's Segment 2)
- Gift/occasion terms (e.g., "christmas gift" — that's Segment 3)

Generate 30 keywords.

{RULES}`;

const SEGMENT_LONG_TAIL = `
# Role
You are an Etsy SEO specialist generating long-tail and micro-niche keywords.

# Your segment: Long-Tail & Specific Keywords
Generate ultra-specific, low-competition keyword combinations that larger sellers miss. These target very specific buyer intent — someone who types these knows EXACTLY what they want and is ready to buy.

{CONTEXT}

# Segment-specific rules
- The product type should appear in about 40% of keywords
- Combine unusual but logical attribute pairs: style + room, era + function, audience + format
- Target micro-niches and sub-communities
- These keywords may have lower search volume but much higher conversion
- Be creative but realistic — someone must actually search this on Etsy

# Examples for a "Retro 2026 Monthly Wall Calendar" with 70s typography:
  "analog planner", "retro desk setup", "mid century office", "vinyl aesthetic",
  "70s kitchen decor", "nostalgia wall art", "minimalist planner", "bold type art",
  "grid layout decor", "functional wall art"

# What NOT to generate (these belong to other segments):
- High-volume obvious terms (e.g., "2026 calendar" — that's Segment 1)
- Generic style terms (e.g., "vintage decor" — that's Segment 2)
- Generic gift terms (e.g., "gift idea" — that's Segment 3)
- Broad niche terms (e.g., "home decor" — that's Segment 4)

Generate 30 keywords.

{RULES}`;

const SEGMENT_BROAD_DISCOVERY = `
# Role
You are an Etsy SEO specialist generating broad discovery keywords.

# Your segment: Broad Discovery Keywords
Generate high-volume, non-niche-specific keywords that capture buyers
who are BROWSING rather than searching for something specific. These are
transversal terms that bring in traffic from adjacent searches — buyers
who didn't know they wanted this product until they saw it.

{CONTEXT}

# Segment-specific rules
- The product type should appear in about 70% of keywords
- IGNORE the niche and theme entirely — focus on the product FUNCTION and FORMAT
- Use the broadest possible product category terms
- Include material, size, format, and use-case without style qualifiers
- These keywords overlap with mass-market searches, not niche searches
- Think: "what would someone type if they had never heard of this product
  and searched only by its function or category?"

# Examples for a "Retro 2026 Monthly Wall Calendar":
  "wall calendar", "monthly calendar", "calendar 2026", "calendar planner",
  "wall planner", "yearly planner", "desk calendar", "large calendar",
  "monthly planner", "office calendar"

# What NOT to generate (these belong to other segments):
- Niche-specific terms (e.g., "cat lover gift" — Segment 3)
- Style/aesthetic terms (e.g., "kawaii aesthetic" — Segment 2)
- Long-tail micro-niche (e.g., "anime cat phone grip" — Segment 5)
- Gift/occasion terms (e.g., "birthday gift" — Segment 3)

Generate 20 keywords.

{RULES}`;

// ─── SEGMENT DEFINITIONS ─────────────────────────────────

const SEGMENTS = [
  { key: 'core_product', name: 'Core Product', prompt: SEGMENT_CORE_PRODUCT, count: 40 },
  { key: 'style_aesthetic', name: 'Style & Aesthetic', prompt: SEGMENT_STYLE_AESTHETIC, count: 30 },
  { key: 'buyer_occasion', name: 'Buyer & Occasion', prompt: SEGMENT_BUYER_OCCASION, count: 30 },
  { key: 'niche_adjacent', name: 'Niche & Adjacent', prompt: SEGMENT_NICHE_ADJACENT, count: 30 },
  { key: 'long_tail', name: 'Long-Tail & Specific', prompt: SEGMENT_LONG_TAIL, count: 30 },
  { key: 'broad_discovery', name: 'Broad Discovery', prompt: SEGMENT_BROAD_DISCOVERY, count: 20 },
];

function buildSegmentPrompt(segmentPrompt: string, context: string): string {
  return segmentPrompt
    .replace('{CONTEXT}', context)
    .replace('{RULES}', SHARED_RULES);
}

// ─── MAIN EXPORT ─────────────────────────────────────────

export async function generateKeywordPool(ctx: KeywordContext): Promise<string[]> {
  const context = buildSegmentContext(ctx);

  const results = await Promise.allSettled(
    SEGMENTS.map(async (seg) => {
      const prompt = buildSegmentPrompt(seg.prompt, context);
      // TEMPORARY — remove after validating keyword generation prompts
      console.info(`[generate-keywords] Segment "${seg.name}" prompt:\n${prompt}\n`);
      const { text: raw } = await runAI('keyword_generation', prompt);
      const parsed = JSON.parse(extractJson(raw));
      const kws = parsed.keywords ?? parsed.output?.keywords ?? [];
      const valid = (kws as string[])
        .filter(k => typeof k === 'string' && k.length > 0)
        .map(k => k.toLowerCase().trim())
        .filter(k => k.length <= 20);
      console.info(`[generate-keywords] Segment "${seg.name}": ${valid.length} valid keywords\n   → ${valid.join(', ')}`);
      return valid;
    })
  );

  const pool: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') pool.push(...r.value);
    else console.warn(`   ⚠️ Segment FAILED: ${(r.reason as Error)?.message}`);
  }

  const unique = [...new Set(pool)];

  // Canonical dedup: eliminate permutations and synonym variants before enrichment
  const ptWords = extractProductTypeWords(ctx.product_type);
  const seen = new Map<string, string>();
  const deduped: string[] = [];
  for (const kw of unique) {
    const key = getCanonicalConcept(kw, ptWords);
    if (!seen.has(key)) { seen.set(key, kw); deduped.push(kw); }
  }
  console.info(`[generate-keywords] Total: ${pool.length} → ${unique.length} unique → ${deduped.length} after concept dedup`);
  return deduped;
}
