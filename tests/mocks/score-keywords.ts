/**
 * Mock for lib/seo/score-keywords.ts (scoreKeywords function).
 */
import { vi } from 'vitest';

export function setupScoreKeywordsMock() {
  vi.mock('../../lib/seo/score-keywords.ts', () => ({
    scoreKeywords: vi.fn(async (stats: Array<{ keyword: string; search_volume: number; competition: number; cpc: number; volume_history: number[] }>) =>
      stats.map(kw => ({
        ...kw,
        niche_score: 7,
        transactional_score: 7,
        is_selection_ia: false,
        is_user_added: false,
        is_pinned: false,
      }))
    ),
  }));
}
