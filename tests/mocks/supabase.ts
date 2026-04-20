/**
 * Chainable Supabase mock client for integration tests.
 *
 * Usage in test files:
 *   const { mockSupabaseClient, helpers } = vi.hoisted(() => import('../mocks/supabase.ts'));
 *   vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabaseClient) }));
 *
 * Then in beforeEach:
 *   helpers.then(h => h.resetSupabaseMocks());
 */
import { vi } from 'vitest';

// ── Response Registry ────────────────────────────────────
type ResponseEntry = { data: unknown; error: unknown };
const _responses = new Map<string, ResponseEntry>();

/** Configure a mock response for a specific table. */
export function mockSupabaseResponse(table: string, data: unknown, error: unknown = null) {
  _responses.set(table, { data, error });
}

/** Reset all mock responses. */
export function resetSupabaseMocks() {
  _responses.clear();
}

function getResponse(table: string): ResponseEntry {
  return _responses.get(table) || { data: [], error: null };
}

/** Creates a chainable query builder mock for a given table. */
function createQueryBuilder(table: string) {
  const chainable = (): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};

    const methods = ['select', 'eq', 'neq', 'in', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'is', 'order', 'limit', 'range'];
    for (const m of methods) {
      builder[m] = vi.fn(() => builder);
    }

    builder.single = vi.fn(() => {
      const resp = getResponse(table);
      const data = Array.isArray(resp.data) ? resp.data[0] ?? null : resp.data;
      return Promise.resolve({ data, error: resp.error });
    });

    builder.maybeSingle = vi.fn(() => {
      const resp = getResponse(table);
      const data = Array.isArray(resp.data) ? resp.data[0] ?? null : resp.data;
      return Promise.resolve({ data, error: null });
    });

    builder.insert = vi.fn(() => {
      const b = chainable();
      (b as any).then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(res, rej);
      return b;
    });

    builder.upsert = vi.fn(() => {
      const b = chainable();
      (b as any).then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(res, rej);
      return b;
    });

    builder.update = vi.fn(() => {
      const b = chainable();
      (b as any).then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(res, rej);
      return b;
    });

    builder.delete = vi.fn(() => Promise.resolve({ data: null, error: null }));

    // Make builder thenable for terminal chains without .single()/.maybeSingle()
    (builder as any).then = (res: (v: unknown) => void, rej?: (e: unknown) => void) => {
      const resp = getResponse(table);
      return Promise.resolve({ data: resp.data, error: resp.error }).then(res, rej);
    };

    return builder;
  };

  return chainable();
}

/** The mock Supabase client — exported for vi.mock() factory. */
export const mockSupabaseClient = {
  from: vi.fn((table: string) => createQueryBuilder(table)),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
};
