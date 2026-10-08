import { describe, expect, it } from 'vitest';
import { PROMPT_VISUAL_ANALYST, buildVisualAnalysisContext } from '../../lib/logic/analyse-image-logic.js';

describe('visual analysis prompt contract', () => {
  it('keeps the input placeholders and evidence boundaries required by the vision pipeline', () => {
    expect(PROMPT_VISUAL_ANALYST).toContain('{{productType}}');
    expect(PROMPT_VISUAL_ANALYST).toContain('{{description}}');
    expect(PROMPT_VISUAL_ANALYST).toContain('product being sold');
    expect(PROMPT_VISUAL_ANALYST).toContain('mockup or staging');
    expect(PROMPT_VISUAL_ANALYST).toContain('context, not visual proof');
    expect(PROMPT_VISUAL_ANALYST).toContain('No visible text');
    expect(PROMPT_VISUAL_ANALYST).toContain('Text present but illegible');
    expect(PROMPT_VISUAL_ANALYST).toContain('never permits truncation');
  });

  it('passes every existing visual field to taxonomy without changing the contract', () => {
    const context = buildVisualAnalysisContext({
      aesthetic_style: 'Retro poster',
      typography_details: 'No visible text',
      graphic_elements: 'orange sun, hills',
      color_palette: 'orange, cream — warm',
      target_audience: 'Retro Decor Lovers',
      overall_vibe: 'A warm retro print for colorful interiors.',
    });

    expect(context).toContain('Aesthetic style: Retro poster');
    expect(context).toContain('Typography details: No visible text');
    expect(context).toContain('Graphic elements: orange sun, hills');
    expect(context).toContain('Color palette: orange, cream — warm');
    expect(context).toContain('Target audience: Retro Decor Lovers');
    expect(context).toContain('Overall vibe: A warm retro print for colorful interiors.');
  });
});
