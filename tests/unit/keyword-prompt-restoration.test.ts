import { createHash } from 'node:crypto';
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

const FBB2A69_MODULE_SHA256 = 'cdc9dde0ed56f63a055798137aa3123d8d1d6d35dde5e15ec2b950af139a830a';

const historicalSegments = [
  { name: 'Core Product', volume: 40, sha256: 'b7d373ef4fd7ebea4805220a8dd79774d6addf7aa0c254c893a11559339d14ed' },
  { name: 'Style & Aesthetic', volume: 30, sha256: 'b04264edc6350dcd331c3783687731cdfff6d14f47047515fdc8b943b53cff4e' },
  { name: 'Buyer & Occasion', volume: 30, sha256: '0e76ef18233f9fe712bbef65369e1ad2b7e843ee787c3280a42a27eb60fc3939' },
  { name: 'Niche & Adjacent', volume: 30, sha256: 'e7b7502dc70fab7405e9475dfa6162b05ad123ac57e736275a5a091cbb9546bc' },
  { name: 'Long-Tail & Specific', volume: 30, sha256: '5be02fd0773b0770ae8a5eb3392234b8b6b5ab83ac83e08dcdcbfbcbe933b1ac' },
  { name: 'Broad Discovery', volume: 20, sha256: '70d69ccc6fe684010d04c65f02d34f231b03d3ffbcf1d5d9c9359202efd232ec' },
] as const;

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

describe('fbb2a69 keyword generator restoration', () => {
  beforeEach(() => {
    vi.mocked(runAI).mockReset().mockResolvedValue({
      text: JSON.stringify({
        keywords: ['Custom Ceramic Mug', 'ceramic custom mug', 'keyword longer than twenty'],
      }),
      usage: { input_tokens: 0, output_tokens: 0 },
      model: 'test',
      provider: 'test',
    });
  });

  it('keeps the complete module byte-identical to the documented fbb2a69 reference', () => {
    const source = readFileSync('lib/seo/generate-keyword-pool.ts');
    expect(sha256(source)).toBe(FBB2A69_MODULE_SHA256);
  });

  it('uses the six specialized segments in their historical order and volumes', async () => {
    const keywords = await generateKeywordPool(context);

    expect(vi.mocked(runAI)).toHaveBeenCalledTimes(6);
    expect(vi.mocked(runAI).mock.calls.map(([task]) => task)).toEqual(
      historicalSegments.map(() => 'keyword_generation')
    );

    vi.mocked(runAI).mock.calls.forEach(([, prompt], index) => {
      const segment = historicalSegments[index];
      expect(prompt).toContain(`# Your segment: ${segment.name} Keywords`);
      expect(prompt).toContain(`Generate ${segment.volume} keywords.`);
    });

    expect(keywords).toEqual(['custom ceramic mug']);
  });

  it('keeps each effective prompt at its fbb2a69 reference hash and injects visual data', async () => {
    await generateKeywordPool(context);

    vi.mocked(runAI).mock.calls.forEach(([, prompt], index) => {
      expect(sha256(prompt as string)).toBe(historicalSegments[index].sha256);
      expect(prompt).toContain('- Color palette: orange, brown');
      expect(prompt).toContain('- Graphic elements: cassette tape');
    });
  });
});
