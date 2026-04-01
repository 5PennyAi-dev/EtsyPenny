import { describe, it, expect } from 'vitest';
import { applySEOFilter, type KeywordInput, type FilterParameters } from '../../lib/seo/filter-logic.js';
import { sampleKeywords, sampleProductTypeWords } from '../fixtures/sample-keywords.js';

/** Default filter parameters for testing */
const defaultParams: FilterParameters = {
  Volume: 1,
  Competition: 1,
  Transaction: 1,
  Niche: 1,
  CPC: 1,
  evergreen_stability_ratio: 3,
  evergreen_minimum_volume: 0.3,
  evergreen_avg_volume: 500,
  trending_dropping_threshold: 0.8,
  trending_current_month_min_volume: 100,
  trending_growth_factor: 1.5,
  promising_min_score: 5,
  promising_competition: 0.5,
  ai_selection_count: 13,
  working_pool_count: 40,
  concept_diversity_limit: 2,
  productTypeWords: sampleProductTypeWords,
};

describe('applySEOFilter', () => {
  it('returns empty array for empty input', () => {
    expect(applySEOFilter([], defaultParams)).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(applySEOFilter(null as any, defaultParams)).toEqual([]);
    expect(applySEOFilter(undefined as any, defaultParams)).toEqual([]);
  });

  it('returns keywords with opportunity_score assigned', () => {
    const result = applySEOFilter(sampleKeywords, defaultParams);
    expect(result.length).toBeGreaterThan(0);
    for (const kw of result) {
      expect(typeof kw.opportunity_score).toBe('number');
      expect(kw.opportunity_score).toBeGreaterThanOrEqual(0);
    }
  });

  it('assigns status object with trending/evergreen/promising flags', () => {
    const result = applySEOFilter(sampleKeywords, defaultParams);
    for (const kw of result) {
      expect(kw.status).toBeDefined();
      expect(typeof kw.status.trending).toBe('boolean');
      expect(typeof kw.status.evergreen).toBe('boolean');
      expect(typeof kw.status.promising).toBe('boolean');
    }
  });

  it('sorts pinned keywords first', () => {
    const result = applySEOFilter(sampleKeywords, defaultParams);
    const pinnedIndices = result
      .map((kw, i) => (kw.is_pinned ? i : -1))
      .filter(i => i >= 0);
    const firstNonPinnedIndex = result.findIndex(kw => !kw.is_pinned);

    if (pinnedIndices.length > 0 && firstNonPinnedIndex >= 0) {
      // All pinned should come before the first non-pinned
      for (const idx of pinnedIndices) {
        expect(idx).toBeLessThan(firstNonPinnedIndex);
      }
    }
  });

  it('sorts non-pinned keywords by opportunity_score descending', () => {
    const result = applySEOFilter(sampleKeywords, defaultParams);
    const nonPinned = result.filter(kw => !kw.is_pinned);
    for (let i = 1; i < nonPinned.length; i++) {
      expect(nonPinned[i - 1].opportunity_score).toBeGreaterThanOrEqual(
        nonPinned[i].opportunity_score
      );
    }
  });

  it('excludes non-user-added keywords with transactional_score < 1', () => {
    // Note: code uses `item.transactional_score || 5`, so 0/null/undefined → 5 (passes filter).
    // Only a truthy value < 1 (e.g. 0.5) actually triggers the hard filter.
    const keywords: KeywordInput[] = [
      { keyword: 'good keyword', search_volume: 1000, competition: 0.3, cpc: 0.5, niche_score: 5, transactional_score: 5 },
      { keyword: 'bad transactional', search_volume: 1000, competition: 0.3, cpc: 0.5, niche_score: 5, transactional_score: 0.5 },
    ];
    const result = applySEOFilter(keywords, defaultParams);
    const tags = result.map(kw => kw.keyword);
    expect(tags).toContain('good keyword');
    expect(tags).not.toContain('bad transactional');
  });

  it('excludes non-user-added keywords with niche_score < 1', () => {
    const keywords: KeywordInput[] = [
      { keyword: 'good keyword', search_volume: 1000, competition: 0.3, cpc: 0.5, niche_score: 5, transactional_score: 5 },
      { keyword: 'bad niche', search_volume: 1000, competition: 0.3, cpc: 0.5, niche_score: 0.5, transactional_score: 5 },
    ];
    const result = applySEOFilter(keywords, defaultParams);
    const tags = result.map(kw => kw.keyword);
    expect(tags).toContain('good keyword');
    expect(tags).not.toContain('bad niche');
  });

  it('user-added keywords bypass hard filters', () => {
    const keywords: KeywordInput[] = [
      { keyword: 'user added low scores', search_volume: 100, competition: 0.5, cpc: 0.1, niche_score: 0, transactional_score: 0, is_user_added: true },
    ];
    const result = applySEOFilter(keywords, defaultParams);
    expect(result.length).toBe(1);
    expect(result[0].keyword).toBe('user added low scores');
  });

  it('respects concept_diversity_limit=2', () => {
    // Create 5 keywords that share the same canonical concept
    const keywords: KeywordInput[] = Array.from({ length: 5 }, (_, i) => ({
      keyword: `ceramic tea variant${i}`,
      search_volume: 5000 - i * 100,
      competition: 0.3,
      cpc: 0.5,
      niche_score: 7,
      transactional_score: 7,
    }));
    const params = { ...defaultParams, concept_diversity_limit: 2 };
    const result = applySEOFilter(keywords, params);
    // "ceramic tea" is the concept (after removing product type words and sorting)
    // At most 2 should survive concept diversity
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('respects concept_diversity_limit=4 (higher limit)', () => {
    const keywords: KeywordInput[] = Array.from({ length: 6 }, (_, i) => ({
      keyword: `ceramic tea variant${i}`,
      search_volume: 5000 - i * 100,
      competition: 0.3,
      cpc: 0.5,
      niche_score: 7,
      transactional_score: 7,
    }));
    const params = { ...defaultParams, concept_diversity_limit: 4 };
    const result = applySEOFilter(keywords, params);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('user-added keywords bypass concept diversity limit', () => {
    // 2 regular + 1 user-added, all same concept, limit=2
    const keywords: KeywordInput[] = [
      { keyword: 'ceramic tea a', search_volume: 5000, competition: 0.3, cpc: 0.5, niche_score: 7, transactional_score: 7 },
      { keyword: 'ceramic tea b', search_volume: 4000, competition: 0.3, cpc: 0.5, niche_score: 7, transactional_score: 7 },
      { keyword: 'ceramic tea c', search_volume: 3000, competition: 0.3, cpc: 0.5, niche_score: 7, transactional_score: 7, is_user_added: true },
    ];
    const params = { ...defaultParams, concept_diversity_limit: 2 };
    const result = applySEOFilter(keywords, params);
    // 2 regular pass diversity + 1 user-added bypasses = 3 total
    expect(result.length).toBe(3);
    expect(result.some(kw => kw.keyword === 'ceramic tea c')).toBe(true);
  });

  it('ai_selection_count controls how many get is_selection_ia=true', () => {
    // sampleKeywords has 2 pinned keywords which consume AI slots but aren't marked is_selection_ia.
    // With ai_selection_count=5, 2 pinned consume 2 slots → 3 regular get is_selection_ia=true.
    const params = { ...defaultParams, ai_selection_count: 5, concept_diversity_limit: 100 };
    const result = applySEOFilter(sampleKeywords, params);
    const selectedCount = result.filter(kw => kw.is_selection_ia === true).length;
    expect(selectedCount).toBe(3); // 5 slots - 2 pinned = 3 regular marked
  });

  it('pinned keywords consume AI selection slot but are NOT marked is_selection_ia', () => {
    const keywords: KeywordInput[] = [
      { keyword: 'pinned kw', search_volume: 10000, competition: 0.3, cpc: 1.0, niche_score: 8, transactional_score: 8, is_pinned: true },
      { keyword: 'regular a', search_volume: 9000, competition: 0.3, cpc: 1.0, niche_score: 7, transactional_score: 7 },
      { keyword: 'regular b', search_volume: 8000, competition: 0.3, cpc: 1.0, niche_score: 6, transactional_score: 6 },
      { keyword: 'regular c', search_volume: 7000, competition: 0.3, cpc: 1.0, niche_score: 5, transactional_score: 5 },
    ];
    // ai_selection_count=3: pinned takes 1 slot, leaves 2 for regular
    const params = { ...defaultParams, ai_selection_count: 3, concept_diversity_limit: 100 };
    const result = applySEOFilter(keywords, params);

    const pinned = result.find(kw => kw.keyword === 'pinned kw');
    expect(pinned?.is_selection_ia).toBe(false);

    const selected = result.filter(kw => kw.is_selection_ia === true);
    expect(selected.length).toBe(2); // 3 slots - 1 consumed by pinned = 2 regular
  });

  it('working_pool_count limits is_current_pool', () => {
    // Create 10 keywords, set pool limit to 3
    const keywords: KeywordInput[] = Array.from({ length: 10 }, (_, i) => ({
      keyword: `unique keyword ${i}`,
      search_volume: 10000 - i * 500,
      competition: 0.3,
      cpc: 0.5,
      niche_score: 7,
      transactional_score: 7,
    }));
    const params = { ...defaultParams, working_pool_count: 3, concept_diversity_limit: 100 };
    const result = applySEOFilter(keywords, params);
    const inPool = result.filter(kw => kw.is_current_pool === true);
    expect(inPool.length).toBe(3);
  });

  it('user-added and pinned keywords are always in the pool', () => {
    const keywords: KeywordInput[] = [
      { keyword: 'pinned', search_volume: 100, competition: 0.9, cpc: 0.1, niche_score: 2, transactional_score: 2, is_pinned: true },
      { keyword: 'user added', search_volume: 100, competition: 0.9, cpc: 0.1, niche_score: 2, transactional_score: 2, is_user_added: true },
      ...Array.from({ length: 5 }, (_, i) => ({
        keyword: `regular ${i}`,
        search_volume: 10000 - i * 1000,
        competition: 0.3,
        cpc: 0.5,
        niche_score: 7,
        transactional_score: 7,
      })),
    ];
    const params = { ...defaultParams, working_pool_count: 2, concept_diversity_limit: 100 };
    const result = applySEOFilter(keywords, params);

    const pinnedKw = result.find(kw => kw.keyword === 'pinned');
    const userKw = result.find(kw => kw.keyword === 'user added');
    expect(pinnedKw?.is_current_pool).toBe(true);
    expect(userKw?.is_current_pool).toBe(true);

    // 2 regular + pinned + user_added in pool
    const inPool = result.filter(kw => kw.is_current_pool === true);
    expect(inPool.length).toBe(4); // 2 pool slots for regular + pinned + user_added
  });
});
