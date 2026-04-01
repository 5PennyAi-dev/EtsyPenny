/**
 * Mock for lib/seo/persist-strength.ts.
 */
import { vi } from 'vitest';

export function setupPersistStrengthMock() {
  vi.mock('../../lib/seo/persist-strength.ts', () => ({
    persistStrength: vi.fn(async () => {}),
  }));
}
