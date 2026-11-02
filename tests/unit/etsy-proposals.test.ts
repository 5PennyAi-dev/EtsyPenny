import { describe, expect, it } from 'vitest';
import { fieldsWithProposal, normalizeEtsyTags, readFieldProposalState, snapshotsMatch } from '../../lib/etsy/proposals.js';

describe('explicit Etsy field proposals', () => {
  it('keeps only valid independently versioned fields', () => {
    const state = readFieldProposalState({
      title: { version: 'title-v1', updated_at: '2026-11-02T00:00:00.000Z' },
      description: { version: 1 },
      tags: { version: 'tags-v1', updated_at: '2026-11-02T00:00:00.000Z' },
    });
    expect(fieldsWithProposal(state, ['title', 'description', 'tags'])).toEqual(['title', 'tags']);
  });

  it('compares Etsy tags as normalized unordered values while retaining text elsewhere', () => {
    expect(normalizeEtsyTags([' Blue   Mug ', 'gift idea', 'blue mug'])).toEqual(['blue mug', 'gift idea']);
    expect(snapshotsMatch('tags', { tags: ['Blue Mug', 'Gift idea'] }, { tags: [' gift idea ', 'blue   mug'] })).toBe(true);
    expect(snapshotsMatch('tags', { tags: ['Blue Mug'] }, { tags: ['Gift idea'] })).toBe(false);
  });
});
