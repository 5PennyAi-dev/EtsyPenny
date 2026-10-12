import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { runAIMock } = vi.hoisted(() => ({ runAIMock: vi.fn() }));

vi.mock('../../lib/ai/provider-router.js', () => ({ runAI: runAIMock }));

import {
  KeywordScoringError,
  scoreKeywords,
} from '../../lib/seo/score-keywords.js';

const context = {
  product_type: 'Ceramic mug',
  theme: 'Coastal',
  niche: 'Beach lovers',
  sub_niche: 'Coastal coffee mug',
};

const makeStats = (count = 2) => Array.from({ length: count }, (_, index) => ({
  keyword: `keyword ${index + 1}`,
  search_volume: 100,
  competition: 0.3,
  cpc: 0.5,
  volume_history: [],
  fromCache: true,
}));

const keywordListFromPrompt = (prompt: string) => JSON.parse(prompt.replace('# Keywords to Analyze:\n', '')) as string[];

const validResponse = (task: string, keywords: string[]) => ({
  text: JSON.stringify({
    keywords: keywords.map((keyword, index) => task === 'niche_scoring'
      ? { keyword, niche_score: [1, 4, 7, 10][index % 4] }
      : { keyword, transactional_score: [10, 7, 4, 1][index % 4] }),
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  runAIMock.mockImplementation(async (task: string, prompt: string) => validResponse(task, keywordListFromPrompt(prompt)));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scoreKeywords', () => {
  it('accepts every allowed score, including a genuine score of 4', async () => {
    const scored = await scoreKeywords(makeStats(4), context);

    expect(scored.map(({ niche_score, transactional_score }) => ({ niche_score, transactional_score }))).toEqual([
      { niche_score: 1, transactional_score: 10 },
      { niche_score: 4, transactional_score: 7 },
      { niche_score: 7, transactional_score: 4 },
      { niche_score: 10, transactional_score: 1 },
    ]);
  });

  it.each(['niche_scoring', 'transactional_scoring'] as const)('fails after retries when %s fails completely', async (failedTask) => {
    runAIMock.mockImplementation(async (task: string, prompt: string) => {
      if (task === failedTask) throw new Error('provider unavailable');
      return validResponse(task, keywordListFromPrompt(prompt));
    });

    await expect(scoreKeywords(makeStats(2), context)).rejects.toMatchObject({
      name: 'KeywordScoringError',
      code: 'KEYWORD_SCORING_INCOMPLETE',
      taskKey: failedTask,
    } satisfies Partial<KeywordScoringError>);
    expect(runAIMock.mock.calls.filter(([task]) => task === failedTask)).toHaveLength(3);
  });

  it('fails instead of scoring a batch with an omitted keyword', async () => {
    runAIMock.mockImplementation(async (task: string, prompt: string) => {
      const keywords = keywordListFromPrompt(prompt);
      return validResponse(task, keywords.slice(0, 1));
    });

    await expect(scoreKeywords(makeStats(2), context)).rejects.toBeInstanceOf(KeywordScoringError);
  });

  it('fails instead of repairing invalid JSON or replacing it with a fallback score', async () => {
    runAIMock.mockImplementation(async (task: string) => task === 'niche_scoring'
      ? { text: '{"keywords": [' }
      : validResponse(task, ['keyword 1', 'keyword 2']));

    await expect(scoreKeywords(makeStats(2), context)).rejects.toMatchObject({ taskKey: 'niche_scoring' });
  });

  it('fails when a scorer returns a score outside the allowed set', async () => {
    runAIMock.mockImplementation(async (task: string, prompt: string) => {
      const keywords = keywordListFromPrompt(prompt);
      if (task === 'niche_scoring') {
        return { text: JSON.stringify({ keywords: keywords.map(keyword => ({ keyword, niche_score: 5 })) }) };
      }
      return validResponse(task, keywords);
    });

    await expect(scoreKeywords(makeStats(2), context)).rejects.toMatchObject({ taskKey: 'niche_scoring' });
  });

  it('fails the whole operation when one parallel batch is incomplete', async () => {
    runAIMock.mockImplementation(async (task: string, prompt: string) => {
      const keywords = keywordListFromPrompt(prompt);
      if (keywords.includes('keyword 26')) {
        return validResponse(task, keywords.slice(0, -1));
      }
      return validResponse(task, keywords);
    });

    await expect(scoreKeywords(makeStats(26), context)).rejects.toBeInstanceOf(KeywordScoringError);
  });
});
