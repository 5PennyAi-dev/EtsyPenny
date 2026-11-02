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

function createDb({
  listing = { generated_title: 'PennySEO title', etsy_proposal_fields: { title: { version: 'title-v1', updated_at: '2026-11-01T00:00:00.000Z' } } },
  baseline = { baseline_snapshot: { title: 'Imported title' }, trusted_fields: ['title'] },
}: any = {}) {
  const logs: unknown[] = [];
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
        ? { data: listing, error: null }
        : { data: null, error: null }),
      insert: vi.fn(async (value: unknown) => { logs.push(value); return { error: null }; }),
      upsert: vi.fn(async () => ({ error: null })),
    };
    return chain;
  });
  return { from, logs };
}

function createStatefulDb(listingReads: any[]) {
  const updates: Array<{ table: string; value: unknown }> = [];
  const baseline = { baseline_snapshot: { title: 'Imported title' }, trusted_fields: ['title'] };
  const from = vi.fn((table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => table === 'etsy_listing_export_baselines'
        ? { data: baseline, error: null }
        : { data: null, error: null }),
      single: vi.fn(async () => table === 'listings'
        ? { data: listingReads.shift(), error: null }
        : { data: null, error: null }),
      update: vi.fn((value: unknown) => { updates.push({ table, value }); return chain; }),
      insert: vi.fn(async () => ({ error: null })),
      upsert: vi.fn(async () => ({ error: null })),
    };
    return chain;
  });
  return { from, updates };
}

describe('processEtsyExportItem', () => {
  const item = { etsy_listing_id: 123, listing_id: 'listing-1', fields: ['title'] as Array<'title'> };
  const connection = { id: 'connection-1' };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOwnedLinkedEtsyListingForExport).mockResolvedValue({
      id: 'etsy-row-1', connection_id: 'connection-1', listing_id: 'listing-1', etsy_listing_id: 123,
      original_title: 'Imported title', original_description: null, original_tags: null,
      export_status: 'pending', last_exported_at: null, scoring_status: 'scored',
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

  it('rejects a direct authenticated export when scoring has not completed', async () => {
    vi.mocked(fetchListingsByIds).mockResolvedValue([{ listing_id: 123, title: 'Imported title', description: '', tags: [] }] as any);
    vi.mocked(getOwnedLinkedEtsyListingForExport).mockResolvedValueOnce({
      id: 'etsy-row-1', connection_id: 'connection-1', listing_id: 'listing-1', etsy_listing_id: 123,
      original_title: 'Imported title', original_description: null, original_tags: null,
      export_status: 'pending', last_exported_at: null, scoring_status: 'pending',
    });
    const db = createDb();

    await expect(processEtsyExportItem({ db, connection, userId: 'user-1', item, mode: 'preflight', allowPartial: false, confirmed: false }))
      .rejects.toThrow('SEO scoring must be completed');
    expect(updateEtsyListing).not.toHaveBeenCalled();
  });

  it('rejects a proposal identical to a trusted published baseline', async () => {
    vi.mocked(fetchListingsByIds).mockResolvedValue([{ listing_id: 123, title: 'PennySEO title', description: '', tags: [] }] as any);
    const db = createDb({ baseline: { baseline_snapshot: { title: 'PennySEO title' }, trusted_fields: ['title'] } });

    await expect(processEtsyExportItem({ db, connection, userId: 'user-1', item, mode: 'preflight', allowPartial: false, confirmed: false }))
      .rejects.toThrow('matches the last verified Etsy value');
  });

  it('clears only the verified field and retains a remaining field proposal', async () => {
    vi.mocked(fetchListingsByIds)
      .mockResolvedValueOnce([{ listing_id: 123, title: 'Imported title', description: '', tags: [] }] as any)
      .mockResolvedValueOnce([{ listing_id: 123, title: 'PennySEO title', description: '', tags: [] }] as any);
    vi.mocked(updateEtsyListing).mockResolvedValue({ success: true } as any);
    const versions = {
      title: { version: 'title-v1', updated_at: '2026-11-02T00:00:00.000Z' },
      description: { version: 'description-v1', updated_at: '2026-11-02T00:00:00.000Z' },
    };
    const db = createStatefulDb([
      { generated_title: 'PennySEO title', etsy_proposal_fields: versions },
      { etsy_proposal_fields: versions },
    ]);

    await processEtsyExportItem({ db, connection, userId: 'user-1', item, mode: 'execute', allowPartial: false, confirmed: true });

    expect(db.updates).toContainEqual({ table: 'listings', value: { etsy_proposal_fields: { description: versions.description } } });
  });

  it('does not clear a new Studio version created while the earlier version is publishing', async () => {
    vi.mocked(fetchListingsByIds)
      .mockResolvedValueOnce([{ listing_id: 123, title: 'Imported title', description: '', tags: [] }] as any)
      .mockResolvedValueOnce([{ listing_id: 123, title: 'PennySEO title', description: '', tags: [] }] as any);
    vi.mocked(updateEtsyListing).mockResolvedValue({ success: true } as any);
    const db = createStatefulDb([
      { generated_title: 'PennySEO title', etsy_proposal_fields: { title: { version: 'title-v1', updated_at: '2026-11-02T00:00:00.000Z' } } },
      { etsy_proposal_fields: { title: { version: 'title-v2', updated_at: '2026-11-02T00:01:00.000Z' } } },
    ]);

    await processEtsyExportItem({ db, connection, userId: 'user-1', item, mode: 'execute', allowPartial: false, confirmed: true });

    expect(db.updates.filter((update) => update.table === 'listings')).toEqual([]);
  });

  it('never PATCHes Etsy without explicit execute confirmation', async () => {
    vi.mocked(fetchListingsByIds).mockResolvedValue([{ listing_id: 123, title: 'Imported title', description: '', tags: [] }] as any);
    await expect(processEtsyExportItem({ db: createDb(), connection, userId: 'user-1', item, mode: 'execute', allowPartial: false, confirmed: false }))
      .rejects.toThrow('Explicit confirmation is required');
    expect(updateEtsyListing).not.toHaveBeenCalled();
  });
});
