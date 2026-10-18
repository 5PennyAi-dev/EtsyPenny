import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/etsy/etsy-client.js', () => ({
  fetchListingsByIds: vi.fn(),
  updateEtsyListing: vi.fn(),
}));
vi.mock('../../lib/etsy/validate-export-listing.js', () => ({
  getOwnedLinkedEtsyListingForExport: vi.fn(),
}));

import { fetchListingsByIds, updateEtsyListing } from '../../lib/etsy/etsy-client.js';
import { getOwnedLinkedEtsyListingForExport } from '../../lib/etsy/validate-export-listing.js';
import { processEtsyExportItem } from '../../lib/etsy/process-etsy-export.js';

function createDb() {
  const logs: unknown[] = [];
  const baseline = { baseline_snapshot: { title: 'Imported title' }, trusted_fields: ['title'] };
  const from = vi.fn((table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      update: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => table === 'etsy_listing_export_baselines'
        ? { data: baseline, error: null }
        : { data: null, error: null }),
      single: vi.fn(async () => table === 'listings'
        ? { data: { generated_title: 'PennySEO title' }, error: null }
        : { data: null, error: null }),
      insert: vi.fn(async (value: unknown) => { logs.push(value); return { error: null }; }),
      upsert: vi.fn(async () => ({ error: null })),
    };
    return chain;
  });
  return { from, logs };
}

describe('processEtsyExportItem', () => {
  const item = { etsy_listing_id: 123, listing_id: 'listing-1', fields: ['title'] as Array<'title'> };
  const connection = { id: 'connection-1' };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOwnedLinkedEtsyListingForExport).mockResolvedValue({
      id: 'etsy-row-1', connection_id: 'connection-1', listing_id: 'listing-1', etsy_listing_id: 123,
      original_title: 'Imported title', original_description: null, original_tags: null,
    });
  });

  it('blocks a changed Etsy field during preflight without PATCHing it', async () => {
    vi.mocked(fetchListingsByIds).mockResolvedValue([{ listing_id: 123, title: 'Edited on Etsy', description: '', tags: [] }] as any);
    const db = createDb();

    const result = await processEtsyExportItem({ db, connection, userId: 'user-1', item, mode: 'preflight', allowPartial: false, confirmed: false });

    expect(result.status).toBe('conflict');
    expect(result.fields.title.status).toBe('conflict');
    expect(updateEtsyListing).not.toHaveBeenCalled();
    expect(db.logs).toHaveLength(1);
  });

  it('re-reads Etsy and PATCHes only an explicitly confirmed conflicted field', async () => {
    vi.mocked(fetchListingsByIds)
      .mockResolvedValueOnce([{ listing_id: 123, title: 'Edited on Etsy', description: '', tags: [] }] as any)
      .mockResolvedValueOnce([{ listing_id: 123, title: 'PennySEO title', description: '', tags: [] }] as any);
    vi.mocked(updateEtsyListing).mockResolvedValue({ success: true } as any);
    const db = createDb();

    const result = await processEtsyExportItem({
      db, connection, userId: 'user-1', item: { ...item, confirmed_fields: ['title'] },
      mode: 'execute', allowPartial: false, confirmed: true,
    });

    expect(updateEtsyListing).toHaveBeenCalledWith(connection, 123, { title: 'PennySEO title' });
    expect(fetchListingsByIds).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('success');
  });
});
