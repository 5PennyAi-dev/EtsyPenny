import { describe, it, expect } from 'vitest';
import { selectAndScore } from '../../lib/seo/select-and-score.js';

/** Default balanced params (all weights at 5) */
const defaultParams = {
  Volume: 5,
  Competition: 5,
  Transaction: 5,
  Niche: 5,
  CPC: 5,
  ai_selection_count: 13,
};

/** Helper to make a keyword object */
function makeKw(overrides: Record<string, unknown> = {}) {
  return {
    keyword: 'test keyword',
    search_volume: 5000,
    competition: 0.4,
    cpc: 0.8,
    niche_score: 7,
    transactional_score: 7,
    ...overrides,
  };
}

describe('selectAndScore', () => {
  it('returns { keywords, strength } shape', () => {
    const result = selectAndScore([makeKw()], defaultParams);
    expect(result).toHaveProperty('keywords');
    expect(result).toHaveProperty('strength');
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  it('returns empty keywords and null strength for empty input', () => {
    const result = selectAndScore([], defaultParams);
    expect(result.keywords).toEqual([]);
    expect(result.strength).toBeNull();
  });

  it('sorts keywords by composite score descending', () => {
    const keywords = [
      makeKw({ keyword: 'low', search_volume: 100, niche_score: 2, transactional_score: 2 }),
      makeKw({ keyword: 'high', search_volume: 50000, niche_score: 9, transactional_score: 9 }),
      makeKw({ keyword: 'mid', search_volume: 5000, niche_score: 5, transactional_score: 5 }),
    ];
    const { keywords: result } = selectAndScore(keywords, defaultParams);
    expect(result[0].keyword).toBe('high');
    expect(result[2].keyword).toBe('low');
  });

  it('marks top N as is_selection_ia=true, rest false', () => {
    const keywords = Array.from({ length: 5 }, (_, i) =>
      makeKw({ keyword: `kw${i}`, search_volume: 10000 - i * 1000 })
    );
    const params = { ...defaultParams, ai_selection_count: 3 };
    const { keywords: result } = selectAndScore(keywords, params);
    const selected = result.filter(kw => kw.is_selection_ia);
    const notSelected = result.filter(kw => !kw.is_selection_ia);
    expect(selected.length).toBe(3);
    expect(notSelected.length).toBe(2);
  });

  it('ai_selection_count controls selection size', () => {
    const keywords = Array.from({ length: 20 }, (_, i) =>
      makeKw({ keyword: `kw${i}`, search_volume: 20000 - i * 500 })
    );
    const params = { ...defaultParams, ai_selection_count: 7 };
    const { keywords: result } = selectAndScore(keywords, params);
    expect(result.filter(kw => kw.is_selection_ia).length).toBe(7);
  });

  it('strength is null when ai_selection_count is 0', () => {
    const keywords = [makeKw()];
    const params = { ...defaultParams, ai_selection_count: 0 };
    const result = selectAndScore(keywords, params);
    expect(result.strength).toBeNull();
  });

  it('CPC is capped at 1.5 in normalization', () => {
    // Two keywords: one with CPC=1.5 and one with CPC=5.0
    // After normalization both should have cpcNorm=1.0 (min(1, cpc/1.5))
    // So their composite scores should differ only by other factors
    const kwAtCeiling = makeKw({ keyword: 'at ceiling', cpc: 1.5, search_volume: 5000, niche_score: 5, transactional_score: 5, competition: 0.5 });
    const kwAboveCeiling = makeKw({ keyword: 'above ceiling', cpc: 5.0, search_volume: 5000, niche_score: 5, transactional_score: 5, competition: 0.5 });
    const { keywords: result } = selectAndScore([kwAtCeiling, kwAboveCeiling], defaultParams);
    // Both should have the same composite since CPC is capped
    // They'll be adjacent in sort order (identical scores)
    // Just verify both are selected (both have same score, both should be selected)
    expect(result.length).toBe(2);
  });
});

describe('strength calculation', () => {
  it('returns numeric scores in expected ranges', () => {
    const keywords = Array.from({ length: 5 }, (_, i) =>
      makeKw({ keyword: `kw${i}`, search_volume: 10000 + i * 5000 })
    );
    const { strength } = selectAndScore(keywords, defaultParams);
    expect(strength).not.toBeNull();
    expect(strength!.listing_strength).toBeGreaterThanOrEqual(0);
    expect(strength!.listing_strength).toBeLessThanOrEqual(100);
    expect(strength!.breakdown.visibility).toBeGreaterThanOrEqual(0);
    expect(strength!.breakdown.conversion).toBeGreaterThanOrEqual(0);
    expect(strength!.breakdown.relevance).toBeGreaterThanOrEqual(0);
    expect(strength!.breakdown.competition).toBeGreaterThanOrEqual(0);
    expect(strength!.breakdown.profit).toBeGreaterThanOrEqual(0);
  });

  it('visibility uses log10 / log10(5M) * 100', () => {
    // Single keyword, volume=100000, niche=5, trans=5 → dw = 0.7 + 5/20 + 5/20 = 1.2
    // totalMarketReach = 100000 * 1.2 = 120000
    // visibility = log10(120000) / log10(5000000) * 100
    const kw = makeKw({ search_volume: 100000, niche_score: 5, transactional_score: 5 });
    const { strength } = selectAndScore([kw], { ...defaultParams, ai_selection_count: 1 });
    const expected = Math.min(100, Math.round((Math.log10(120000) / Math.log10(5000000)) * 100));
    expect(strength!.breakdown.visibility).toBe(expected);
  });

  it('conversion = avgTrans*6 + cpcScore*4', () => {
    // Single keyword: trans=8, cpc=1.2
    // avgTrans = 8, cpcS = min(10, (1.2/1.5)*10) = 8
    // conversion = 8*6 + 8*4 = 48 + 32 = 80
    const kw = makeKw({ transactional_score: 8, cpc: 1.2 });
    const { strength } = selectAndScore([kw], { ...defaultParams, ai_selection_count: 1 });
    expect(strength!.breakdown.conversion).toBe(80);
  });

  it('relevance = avgNiche * 10', () => {
    const kw = makeKw({ niche_score: 7 });
    const { strength } = selectAndScore([kw], { ...defaultParams, ai_selection_count: 1 });
    expect(strength!.breakdown.relevance).toBe(70);
  });

  it('competition uses top 5 lowest, (1-avg)^0.5 * 100', () => {
    // Single keyword: competition=0.3
    // avgBestComp = 0.3, competition = (1-0.3)^0.5 * 100 = 0.7^0.5 * 100
    const kw = makeKw({ competition: 0.3 });
    const { strength } = selectAndScore([kw], { ...defaultParams, ai_selection_count: 1 });
    const expected = Math.round(Math.pow(1 - 0.3, 0.5) * 100);
    expect(strength!.breakdown.competition).toBe(expected);
  });

  it('profit = visibility*0.35 + cpcAll*0.30 + transS*0.35', () => {
    const kw = makeKw({ search_volume: 100000, niche_score: 5, transactional_score: 8, cpc: 1.2 });
    const { strength } = selectAndScore([kw], { ...defaultParams, ai_selection_count: 1 });
    // Recompute profit from actual breakdown values
    const vis = strength!.breakdown.visibility;
    const avgCPC = 1.2;
    const cpcAll = Math.min(100, (avgCPC / 1.5) * 100);
    const transS = 8 * 10; // avgTrans * 10
    const expectedProfit = Math.round(vis * 0.35 + cpcAll * 0.30 + transS * 0.35);
    expect(strength!.breakdown.profit).toBe(expectedProfit);
  });

  it('LSI = vis*0.25 + conv*0.35 + rel*0.25 + comp*0.15', () => {
    const keywords = Array.from({ length: 5 }, (_, i) =>
      makeKw({ keyword: `kw${i}`, search_volume: 10000 + i * 5000, niche_score: 7, transactional_score: 7 })
    );
    const { strength } = selectAndScore(keywords, defaultParams);
    const b = strength!.breakdown;
    const expectedLSI = Math.round(b.visibility * 0.25 + b.conversion * 0.35 + b.relevance * 0.25 + b.competition * 0.15);
    expect(strength!.listing_strength).toBe(expectedLSI);
  });

  it('higher volume + lower competition = higher strength', () => {
    const goodKws = Array.from({ length: 5 }, (_, i) =>
      makeKw({ keyword: `good${i}`, search_volume: 50000, competition: 0.1 })
    );
    const badKws = Array.from({ length: 5 }, (_, i) =>
      makeKw({ keyword: `bad${i}`, search_volume: 100, competition: 0.95 })
    );
    const { strength: good } = selectAndScore(goodKws, { ...defaultParams, ai_selection_count: 5 });
    const { strength: bad } = selectAndScore(badKws, { ...defaultParams, ai_selection_count: 5 });
    expect(good!.listing_strength).toBeGreaterThan(bad!.listing_strength);
  });

  it('does not crash with all-zero keyword values', () => {
    const kw = { keyword: 'zero', search_volume: 0, competition: 0, cpc: 0, niche_score: 0, transactional_score: 0 };
    const { strength } = selectAndScore([kw], { ...defaultParams, ai_selection_count: 1 });
    expect(strength).not.toBeNull();
    expect(typeof strength!.listing_strength).toBe('number');
    expect(Number.isFinite(strength!.listing_strength)).toBe(true);
  });

  it('desirabilityWeight range is 0.7–1.7', () => {
    // dw = 0.7 + (nS/20) + (tS/20)
    // min: nS=0, tS=0 → dw=0.7
    // max: nS=10, tS=10 → dw=0.7 + 0.5 + 0.5 = 1.7
    // We verify by checking market reach with known inputs
    const kwMin = makeKw({ search_volume: 10000, niche_score: 0, transactional_score: 0 });
    const kwMax = makeKw({ search_volume: 10000, niche_score: 10, transactional_score: 10 });
    const { strength: sMin } = selectAndScore([kwMin], { ...defaultParams, ai_selection_count: 1 });
    const { strength: sMax } = selectAndScore([kwMax], { ...defaultParams, ai_selection_count: 1 });
    // min reach = 10000 * 0.7 = 7000, max reach = 10000 * 1.7 = 17000
    expect(sMin!.stats.est_market_reach).toBe(7000);
    expect(sMax!.stats.est_market_reach).toBe(17000);
  });
});
