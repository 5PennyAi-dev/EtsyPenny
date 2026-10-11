import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/ai/provider-router.js', () => ({
  runAI: vi.fn(),
}));

import { runAI } from '../../lib/ai/provider-router.js';
import { generateKeywordPool } from '../../lib/seo/generate-keyword-pool.js';

const context = {
  product_type: 'Ceramic Mug',
  theme: 'Vintage & Retro',
  niche: 'Music Lovers',
  sub_niche: 'Retro Music Mug',
  client_description: 'A nostalgic gift.',
  visual_aesthetic: '1970s retro',
  visual_target_audience: 'Music fans',
  visual_overall_vibe: 'Warm and nostalgic.',
  visual_colors: 'orange, brown',
  visual_graphics: 'cassette tape',
};

const historicalSegments = [
  { name: 'Broad & High Volume', description: 'High-level niche terms and general gift categories. Focus on high search volume.' },
  { name: 'Balanced & Descriptive', description: 'Mid-range keywords combining the niche with specific themes and graphics from the visual analysis.' },
  { name: 'Audience & Gift Scenarios', description: "Target specific buyers (e.g., 'Gift for Coworker') and occasions (Birthday, Christmas, etc.)." },
  { name: 'Sniper & Long-Tail', description: 'Ultra-specific, low-competition terms and cultural sub-niches related to the design.' },
  { name: 'Aesthetic & Vibe', description: "Focus on the look, mood, and specific art style (e.g., 'Kawaii Aesthetic', 'Cyberpunk Vibe')." },
];

function buildHistoricalPrompt(segment: typeof historicalSegments[number]): string {
  return `# Role\nYou are an expert Etsy SEO Specialist.\n\n# Task\nGenerate 50 high-intent keywords for: ${segment.name}\n${segment.name}: ${segment.description}\n\n# Context\n- Product Type: ${context.product_type}\n- Theme: ${context.theme}\n- Niche: ${context.niche}\n- Sub-niche: ${context.sub_niche}\n- Description: ${context.client_description}\n\n# Visual & Marketing Data\n- Aesthetic/Style: ${context.visual_aesthetic}\n- Target Audience: ${context.visual_target_audience}\n- Overall Vibe: ${context.visual_overall_vibe}\n\n# Rules\n- Max 20 characters per keyword (CRITICAL for Etsy tags).\n- Max 3 words per phrase.\n- No duplicates, no trademarks, lowercase only.\n- Include product type in keywords at least 75% of the time.\n- Format: JSON object {"keywords": ["keyword1", "keyword2", ...]}`;
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function extractPromptLiteral(source: string): string {
  const match = source.match(/const prompt = `([^`]+)`;/);
  if (!match) throw new Error('Historical keyword prompt literal not found');
  return match[1];
}

describe('historical keyword prompt restoration', () => {
  beforeEach(() => {
    vi.mocked(runAI).mockReset().mockResolvedValue({
      text: JSON.stringify({ keywords: ['Retro Mug', 'retro mug', 'keyword longer than twenty'] }),
      usage: { input_tokens: 0, output_tokens: 0 },
      model: 'test',
      provider: 'test',
    });
  });

  it('uses the five historical segments in their historical order', async () => {
    const keywords = await generateKeywordPool(context);

    expect(vi.mocked(runAI)).toHaveBeenCalledTimes(5);
    expect(vi.mocked(runAI).mock.calls.map(([task, prompt]) => ({ task, prompt }))).toEqual(
      historicalSegments.map(segment => ({ task: 'keyword_generation', prompt: buildHistoricalPrompt(segment) }))
    );
    expect(keywords).toEqual(['retro mug']);
  });

  it('keeps each effective prompt byte-identical to the historical template', async () => {
    await generateKeywordPool(context);

    vi.mocked(runAI).mock.calls.forEach(([, prompt], index) => {
      const historicalPrompt = buildHistoricalPrompt(historicalSegments[index]);
      expect(sha256(prompt as string)).toBe(sha256(historicalPrompt));
      expect(prompt).toBe(historicalPrompt);
    });
  });

  it('keeps the source template literal identical to commit 09e7103', () => {
    const historicalSource = execFileSync(
      'git',
      ['show', '09e7103:lib/seo/generate-keyword-pool.ts'],
      { encoding: 'utf8' }
    );
    const currentSource = readFileSync('lib/seo/generate-keyword-pool.ts', 'utf8');

    const historicalTemplate = extractPromptLiteral(historicalSource);
    const restoredTemplate = extractPromptLiteral(currentSource);
    expect(sha256(restoredTemplate)).toBe(sha256(historicalTemplate));
    expect(restoredTemplate).toBe(historicalTemplate);
  });
});
