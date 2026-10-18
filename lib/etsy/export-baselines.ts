import type { EtsyExportField, EtsyExportSnapshot } from './export-conflicts.js';

export interface ExportBaseline {
  baseline_snapshot: EtsyExportSnapshot;
  trusted_fields: EtsyExportField[];
}

function copySnapshotField(target: EtsyExportSnapshot, source: EtsyExportSnapshot, field: EtsyExportField): void {
  if (field === 'tags') target.tags = source.tags;
  else if (field === 'title') target.title = source.title;
  else target.description = source.description;
}

export async function getExportBaseline(db: any, args: {
  etsyListingRowId: string;
  userId: string;
  connectionId: string;
}): Promise<ExportBaseline> {
  const { data, error } = await db
    .from('etsy_listing_export_baselines')
    .select('baseline_snapshot, trusted_fields')
    .eq('etsy_listing_row_id', args.etsyListingRowId)
    .eq('user_id', args.userId)
    .eq('connection_id', args.connectionId)
    .maybeSingle();

  if (error) throw error;
  return {
    baseline_snapshot: data?.baseline_snapshot ?? {},
    trusted_fields: data?.trusted_fields ?? [],
  };
}

export async function updateExportBaseline(db: any, args: {
  etsyListingRowId: string;
  userId: string;
  connectionId: string;
  etsyListingId: number;
  existing: ExportBaseline;
  acceptedSnapshot: EtsyExportSnapshot;
  acceptedFields: EtsyExportField[];
  source: 'import' | 'post_export' | 'user_confirmed';
}): Promise<void> {
  const baselineSnapshot = { ...args.existing.baseline_snapshot };
  for (const field of args.acceptedFields) copySnapshotField(baselineSnapshot, args.acceptedSnapshot, field);

  const trustedFields = Array.from(new Set([...args.existing.trusted_fields, ...args.acceptedFields]));
  const { error } = await db.from('etsy_listing_export_baselines').upsert({
    etsy_listing_row_id: args.etsyListingRowId,
    user_id: args.userId,
    connection_id: args.connectionId,
    etsy_listing_id: args.etsyListingId,
    baseline_snapshot: baselineSnapshot,
    trusted_fields: trustedFields,
    source: args.source,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'etsy_listing_row_id' });
  if (error) throw error;
}
