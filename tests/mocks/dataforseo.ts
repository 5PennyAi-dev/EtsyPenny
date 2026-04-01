/**
 * Mock for lib/seo/enrich-keywords.ts (enrichKeywords function).
 */
import { vi } from 'vitest';

export function setupEnrichKeywordsMock() {
  vi.mock('../../lib/seo/enrich-keywords.ts', () => ({
    enrichKeywords: vi.fn(async (keywords: string[]) =>
      keywords.map(kw => ({
        keyword: kw,
        search_volume: 5000,
        competition: 0.45,
        cpc: 0.85,
        volume_history: [5000, 4800, 4600, 4400, 4200, 4000, 3800, 3600, 3400, 3200, 3000, 2800],
        fromCache: false,
      }))
    ),
  }));
}
