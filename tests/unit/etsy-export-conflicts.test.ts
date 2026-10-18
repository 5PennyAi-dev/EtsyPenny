import { describe, expect, it } from 'vitest';
import { compareEtsyExportFields } from '../../lib/etsy/export-conflicts.js';

describe('compareEtsyExportFields', () => {
  it('allows a PennySEO change when Etsy still matches the trusted baseline', () => {
    const result = compareEtsyExportFields({
      fields: ['title'],
      baseline: { title: 'Imported' },
      trustedFields: ['title'],
      remote: { title: 'Imported' },
      proposed: { title: 'Optimized' },
    });
    expect(result.title.status).toBe('safe');
  });

  it('blocks an external Etsy change that differs from the proposal', () => {
    const result = compareEtsyExportFields({
      fields: ['description'],
      baseline: { description: 'Imported' },
      trustedFields: ['description'],
      remote: { description: 'Edited on Etsy' },
      proposed: { description: 'PennySEO draft' },
    });
    expect(result.description.status).toBe('conflict');
  });

  it('does not patch a field whose proposal already equals Etsy', () => {
    const result = compareEtsyExportFields({
      fields: ['tags'],
      baseline: {},
      trustedFields: [],
      remote: { tags: ['Current tag'] },
      proposed: { tags: ['current tag'] },
    });
    expect(result.tags.status).toBe('unchanged');
  });

  it('blocks historical fields without a trusted baseline', () => {
    const result = compareEtsyExportFields({
      fields: ['title'],
      baseline: {},
      trustedFields: [],
      remote: { title: 'Current Etsy title' },
      proposed: { title: 'PennySEO title' },
    });
    expect(result.title.status).toBe('baseline_unknown');
  });
});
