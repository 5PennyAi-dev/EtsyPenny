import { describe, expect, it, vi } from 'vitest';
import {
  EtsyExportValidationError,
  getOwnedLinkedEtsyListingForExport,
} from '../../lib/etsy/validate-export-listing.js';

const args = {
  userId: 'user-1',
  etsyListingId: 123,
  listingId: 'listing-1',
  connectionId: 'connection-1',
};

function makeDb(row: unknown, error: unknown = null) {
  const filters: Array<[string, unknown]> = [];
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: unknown) => {
      filters.push([field, value]);
      return chain;
    }),
    single: vi.fn(async () => ({ data: row, error })),
  };

  return {
    db: { from: vi.fn(() => chain) } as any,
    filters,
  };
}

function linkedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'etsy-row-1',
    connection_id: 'connection-1',
    listing_id: 'listing-1',
    etsy_listing_id: 123,
    original_title: 'Original title',
    original_description: 'Original description',
    original_tags: ['tag'],
    ...overrides,
  };
}

describe('getOwnedLinkedEtsyListingForExport', () => {
  it('returns only the Etsy import linked to the requested PennySEO listing and active connection', async () => {
    const { db, filters } = makeDb(linkedRow());

    await expect(getOwnedLinkedEtsyListingForExport({ db, ...args })).resolves.toMatchObject({
      id: 'etsy-row-1',
      listing_id: 'listing-1',
      connection_id: 'connection-1',
    });

    expect(filters).toContainEqual(['etsy_listing_id', 123]);
    expect(filters).toContainEqual(['user_id', 'user-1']);
  });

  it('rejects an owned PennySEO listing that is not linked to the requested Etsy listing', async () => {
    const { db } = makeDb(linkedRow({ listing_id: 'other-listing' }));

    await expect(getOwnedLinkedEtsyListingForExport({ db, ...args }))
      .rejects.toEqual(expect.objectContaining<EtsyExportValidationError>({
        name: 'EtsyExportValidationError',
        message: 'PennySEO listing is not linked to this Etsy listing',
      }));
  });

  it('rejects a listing imported from a different shop connection', async () => {
    const { db } = makeDb(linkedRow({ connection_id: 'old-connection' }));

    await expect(getOwnedLinkedEtsyListingForExport({ db, ...args }))
      .rejects.toEqual(expect.objectContaining<EtsyExportValidationError>({
        name: 'EtsyExportValidationError',
        message: 'Etsy listing is not linked to the active shop connection',
      }));
  });

  it('preserves the existing ownership failure when no owned Etsy import is found', async () => {
    const { db } = makeDb(null);

    await expect(getOwnedLinkedEtsyListingForExport({ db, ...args }))
      .rejects.toEqual(expect.objectContaining<EtsyExportValidationError>({
        message: 'Etsy listing not found or not owned by this user',
      }));
  });
});
