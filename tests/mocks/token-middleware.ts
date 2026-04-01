/**
 * Mock for lib/tokens/token-middleware.ts.
 */
import { vi } from 'vitest';

let _quotaAllowed = true;
let _quotaUsed = 0;
let _quotaLimit = 100;

export function mockQuotaExceeded(used = 10, limit = 10) {
  _quotaAllowed = false;
  _quotaUsed = used;
  _quotaLimit = limit;
}

export function mockQuotaAllowed() {
  _quotaAllowed = true;
  _quotaUsed = 0;
  _quotaLimit = 100;
}

export function setupTokenMock() {
  vi.mock('../../lib/tokens/token-middleware.ts', () => ({
    checkQuota: vi.fn(async () => {
      if (_quotaAllowed) return { allowed: true };
      return { allowed: false, reason: 'Quota exceeded', used: _quotaUsed, limit: _quotaLimit };
    }),
    incrementQuota: vi.fn(async () => {}),
    checkTokenBalance: vi.fn(async () => ({ allowed: true, balance: 100 })),
    deductTokens: vi.fn(async () => ({ success: true })),
  }));
}
