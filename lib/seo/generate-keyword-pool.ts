/**
 * Verbatim extract from server.mjs lines 273-298.
 * 5 parallel Gemini calls to generate keyword pool across segments.
 */

import { runAI } from '../ai/provider-router.js';
import { extractJson } from '../ai/extract-json.js';

const KEYWORD_SEGMENTS = [
  { name: 'Broad & High Volume', description: 'High-level niche terms and general gift categories. Focus on high search volume.' },
  { name: 'Balanced & Descriptive', description: 'Mid-range keywords combining the niche with specific themes and graphics from the visual analysis.' },
  { name: 'Audience & Gift Scenarios', description: "Target specific buyers (e.g., 'Gift for Coworker') and occasions (Birthday, Christmas, etc.)." },
  { name: 'Sniper & Long-Tail', description: 'Ultra-specific, low-competition terms and cultural sub-niches related to the design.' },
  { name: 'Aesthetic & Vibe', description: "Focus on the look, mood, and specific art style (e.g., 'Kawaii Aesthetic', 'Cyberpunk Vibe')." },
];

interface KeywordContext {
  product_type: string;
  theme: string;
  niche: string;
  sub_niche: string;
  client_description: string;
  visual_aesthetic: string;
  visual_target_audience: string;
  visual_overall_vibe: string;
}

export async function generateKeywordPool(ctx: KeywordContext): Promise<string[]> {
  const results = await Promise.allSettled(
    KEYWORD_SEGMENTS.map(async (seg) => {
      const prompt = `# Role\nYou are an expert Etsy SEO Specialist.\n\n# Task\nGenerate 50 high-intent keywords for: ${seg.name}\n${seg.name}: ${seg.description}\n\n# Context\n- Product Type: ${ctx.product_type}\n- Theme: ${ctx.theme}\n- Niche: ${ctx.niche}\n- Sub-niche: ${ctx.sub_niche}\n- Description: ${ctx.client_description}\n\n# Visual & Marketing Data\n- Aesthetic/Style: ${ctx.visual_aesthetic}\n- Target Audience: ${ctx.visual_target_audience}\n- Overall Vibe: ${ctx.visual_overall_vibe}\n\n# Rules\n- Max 20 characters per keyword (CRITICAL for Etsy tags).\n- Max 3 words per phrase.\n- No duplicates, no trademarks, lowercase only.\n- Include product type in keywords at least 75% of the time.\n- Format: JSON object {"keywords": ["keyword1", "keyword2", ...]}`;
      const { text: raw } = await runAI('keyword_generation', prompt);
      const parsed = JSON.parse(extractJson(raw));
      const kws = parsed.keywords ?? parsed.output?.keywords ?? [];
      return (kws as string[]).filter(k => typeof k === 'string' && k.length > 0).map(k => k.toLowerCase().trim()).filter(k => k.length <= 20);
    })
  );
  const pool: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') pool.push(...r.value);
    else console.warn(`   ⚠️ Segment FAILED: ${(r.reason as Error)?.message}`);
  }
  return [...new Set(pool)];
}
