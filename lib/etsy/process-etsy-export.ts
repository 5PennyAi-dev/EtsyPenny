import { fetchListingsByIds, updateEtsyListing } from './etsy-client.js';
import { getOwnedLinkedEtsyListingForExport } from './validate-export-listing.js';
import {
  compareEtsyExportFields,
  snapshotFromEtsyListing,
  type EtsyExportField,
  type EtsyExportSnapshot,
} from './export-conflicts.js';
import { getExportBaseline, updateExportBaseline } from './export-baselines.js';
import type { ExportBaseline } from './export-baselines.js';
import { readFieldProposalState, snapshotsMatch, type FieldProposalState } from './proposals.js';

export interface ExportRequestItem {
  etsy_listing_id: number;
  listing_id: string;
  fields: EtsyExportField[];
  confirmed_fields?: EtsyExportField[];
}

export type ExportMode = 'preflight' | 'execute';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

interface SavedProposal {
  snapshot: EtsyExportSnapshot;
  versions: FieldProposalState;
}

async function getProposal(db: any, userId: string, listingId: string, fields: EtsyExportField[], etsyListing: any, baseline: ExportBaseline): Promise<SavedProposal> {
  const { data: pennyListing, error: listingError } = await db
    .from('listings')
    .select('generated_title, generated_description, etsy_proposal_fields')
    .eq('id', listingId)
    .eq('user_id', userId)
    .single();
  if (listingError || !pennyListing) throw new Error('PennySEO listing not found');
  if (etsyListing.scoring_status !== 'scored') throw new Error('SEO scoring must be completed before publishing to Etsy');
  const versions = readFieldProposalState(pennyListing.etsy_proposal_fields);
  if (fields.some((field) => !versions[field])) throw new Error('No current saved SEO proposal for every selected field — save changes in Studio first');

  const proposal: EtsyExportSnapshot = {};
  if (fields.includes('title')) {
    if (!pennyListing.generated_title) throw new Error('No saved title proposal found — save a title change in Studio first');
    proposal.title = pennyListing.generated_title.slice(0, 140);
  }
  if (fields.includes('description')) {
    if (!pennyListing.generated_description) throw new Error('No saved description proposal found — save a description change in Studio first');
    proposal.description = pennyListing.generated_description;
  }
  if (fields.includes('tags')) {
    const { data: tagRows, error: tagError } = await db
      .from('listing_seo_stats')
      .select('tag')
      .eq('listing_id', listingId)
      .eq('is_proposal_selected', true)
      .order('opportunity_score', { ascending: false })
      .limit(13);
    if (tagError) throw tagError;
    const tags = (tagRows ?? [])
      .map((row: { tag: string }) => row.tag.trim())
      .filter((tag: string) => tag.length > 0 && tag.length <= 20)
      .slice(0, 13);
    if (tags.length === 0) throw new Error('No saved tag proposal found — save tags in SEO Studio first');
    proposal.tags = tags;
  }
  for (const field of fields) {
    if (baseline.trusted_fields.includes(field) && snapshotsMatch(field, proposal, baseline.baseline_snapshot)) {
      throw new Error(`No changed ${field} proposal — it matches the last verified Etsy value`);
    }
  }
  return { snapshot: proposal, versions };
}

async function clearVerifiedProposalFields(db: any, userId: string, listingId: string, versions: FieldProposalState, fields: EtsyExportField[]): Promise<void> {
  if (fields.length === 0) return;
  const { data: listing, error } = await db.from('listings')
    .select('etsy_proposal_fields').eq('id', listingId).eq('user_id', userId).single();
  if (error || !listing) throw error || new Error('PennySEO listing not found');
  const current = readFieldProposalState(listing.etsy_proposal_fields);
  let changed = false;
  for (const field of fields) {
    if (current[field]?.version === versions[field]?.version) {
      delete current[field];
      changed = true;
    }
  }
  if (changed) {
    const { error: updateError } = await db.from('listings')
      .update({ etsy_proposal_fields: current })
      .eq('id', listingId)
      .eq('user_id', userId);
    if (updateError) throw updateError;
  }
}

async function logAttempt(db: any, args: {
  userId: string;
  item: ExportRequestItem;
  status: 'success' | 'error' | 'conflict' | 'partial' | 'published_unverified';
  baseline: EtsyExportSnapshot;
  remote: EtsyExportSnapshot;
  proposal: EtsyExportSnapshot;
  fieldResults: Record<string, unknown>;
  fieldsExported?: EtsyExportField[];
  confirmedFields?: EtsyExportField[];
  errorMessage?: string;
}): Promise<void> {
  await db.from('etsy_export_logs').insert({
    user_id: args.userId,
    etsy_listing_id: args.item.etsy_listing_id,
    listing_id: args.item.listing_id,
    fields_requested: args.item.fields,
    fields_exported: args.fieldsExported ?? [],
    snapshot_before: args.remote,
    snapshot_after: args.proposal,
    baseline_snapshot: args.baseline,
    remote_snapshot: args.remote,
    field_results: args.fieldResults,
    confirmed_fields: args.confirmedFields ?? [],
    preflighted_at: new Date().toISOString(),
    status: args.status,
    error_message: args.errorMessage ?? null,
  });
}

/** Server-only preflight and publication with an immediate Etsy re-read. */
export async function processEtsyExportItem(args: {
  db: any;
  connection: any;
  userId: string;
  item: ExportRequestItem;
  mode: ExportMode;
  allowPartial: boolean;
  confirmed: boolean;
}) {
  const { db, connection, userId, item } = args;
  if (!item.etsy_listing_id || !item.listing_id || !Array.isArray(item.fields) || item.fields.length === 0) {
    throw new Error('Invalid listing entry: requires etsy_listing_id, listing_id, and non-empty fields array');
  }
  const invalidField = item.fields.find((field) => !['tags', 'title', 'description'].includes(field));
  if (invalidField) throw new Error(`Invalid field: "${invalidField}". Allowed: tags, title, description`);

  const etsyListing = await getOwnedLinkedEtsyListingForExport({
    db,
    userId,
    etsyListingId: item.etsy_listing_id,
    listingId: item.listing_id,
    connectionId: connection.id,
  });
  const baseline = await getExportBaseline(db, { etsyListingRowId: etsyListing.id, userId, connectionId: connection.id });
  const [proposal, remoteRows] = await Promise.all([
    getProposal(db, userId, item.listing_id, item.fields, etsyListing, baseline),
    fetchListingsByIds(connection, [item.etsy_listing_id]),
  ]);
  const remoteListing = remoteRows.find((listing) => listing.listing_id === item.etsy_listing_id);
  if (!remoteListing) throw new Error('Etsy listing is no longer available from the active shop connection');
  const remote = snapshotFromEtsyListing(remoteListing);
  const fieldResults = compareEtsyExportFields({
    fields: item.fields,
    baseline: baseline.baseline_snapshot,
    trustedFields: baseline.trusted_fields,
    remote,
    proposed: proposal.snapshot,
  });

  const blockedFields = item.fields.filter((field) => ['conflict', 'baseline_unknown'].includes(fieldResults[field].status));
  if (args.mode === 'preflight') {
    if (blockedFields.length > 0) {
      await logAttempt(db, {
        userId, item, status: 'conflict', baseline: baseline.baseline_snapshot, remote, proposal: proposal.snapshot, fieldResults,
        errorMessage: 'Etsy changes require explicit confirmation before publication',
      });
    }
    return {
      etsy_listing_id: item.etsy_listing_id,
      status: blockedFields.length > 0 ? 'conflict' : 'ready',
      fields: fieldResults,
      fields_to_publish: item.fields.filter((field) => fieldResults[field].status === 'safe'),
    };
  }

  if (!args.confirmed) throw new Error('Explicit confirmation is required before publishing to Etsy');
  const confirmedFields = new Set(item.confirmed_fields ?? []);
  const unconfirmedBlocked = blockedFields.filter((field) => !confirmedFields.has(field));
  if (unconfirmedBlocked.length > 0 && !args.allowPartial) {
    await logAttempt(db, {
      userId, item, status: 'conflict', baseline: baseline.baseline_snapshot, remote, proposal: proposal.snapshot, fieldResults,
      errorMessage: 'Conflicting Etsy fields were not explicitly confirmed',
      confirmedFields: Array.from(confirmedFields),
    });
    return { etsy_listing_id: item.etsy_listing_id, status: 'blocked', fields: fieldResults, fields_to_publish: [] };
  }

  const fieldsToPatch = item.fields.filter((field) => {
    const status = fieldResults[field].status;
    return status === 'safe' || ((status === 'conflict' || status === 'baseline_unknown') && confirmedFields.has(field));
  });
  if (fieldsToPatch.length === 0) {
    if (unconfirmedBlocked.length === 0) {
      await logAttempt(db, {
        userId, item, status: 'success', baseline: baseline.baseline_snapshot, remote, proposal: proposal.snapshot, fieldResults,
        fieldsExported: [], confirmedFields: Array.from(confirmedFields),
      });
      const unchangedFields = item.fields.filter((field) => fieldResults[field].status === 'unchanged');
      if (unchangedFields.length > 0) {
        await updateExportBaseline(db, {
          etsyListingRowId: etsyListing.id, userId, connectionId: connection.id, etsyListingId: item.etsy_listing_id,
          existing: baseline, acceptedSnapshot: remote, acceptedFields: unchangedFields, source: 'post_export',
        });
        await clearVerifiedProposalFields(db, userId, item.listing_id, proposal.versions, unchangedFields);
      }
      return { etsy_listing_id: item.etsy_listing_id, status: 'success', fields: fieldResults, fields_to_publish: [] };
    }
    await logAttempt(db, {
      userId, item, status: 'conflict', baseline: baseline.baseline_snapshot, remote, proposal: proposal.snapshot, fieldResults,
      errorMessage: 'No selected field was eligible for publication',
      confirmedFields: Array.from(confirmedFields),
    });
    return { etsy_listing_id: item.etsy_listing_id, status: 'blocked', fields: fieldResults, fields_to_publish: [] };
  }

  const patchPayload: EtsyExportSnapshot = {};
  for (const field of fieldsToPatch) {
    if (field === 'tags') patchPayload.tags = proposal.snapshot.tags;
    else if (field === 'title') patchPayload.title = proposal.snapshot.title;
    else patchPayload.description = proposal.snapshot.description;
  }
  let patchResult;
  try {
    patchResult = await updateEtsyListing(connection, item.etsy_listing_id, patchPayload);
  } catch (error) {
    await logAttempt(db, {
      userId, item, status: 'error', baseline: baseline.baseline_snapshot, remote, proposal: proposal.snapshot, fieldResults,
      fieldsExported: [], confirmedFields: Array.from(confirmedFields), errorMessage: toErrorMessage(error),
    });
    throw error;
  }
  if (!patchResult.success) {
    const error = new Error(patchResult.error ?? 'Etsy API call failed');
    await logAttempt(db, {
      userId, item, status: 'error', baseline: baseline.baseline_snapshot, remote, proposal: proposal.snapshot, fieldResults,
      fieldsExported: [], confirmedFields: Array.from(confirmedFields), errorMessage: error.message,
    });
    throw error;
  }

  let verifiedRemote: EtsyExportSnapshot | null = null;
  try {
    const verifyRows = await fetchListingsByIds(connection, [item.etsy_listing_id]);
    const verifiedListing = verifyRows.find((listing) => listing.listing_id === item.etsy_listing_id);
    if (verifiedListing) verifiedRemote = snapshotFromEtsyListing(verifiedListing);
  } catch {
    // The PATCH may have succeeded, but do not advance the trusted baseline.
  }

  const verifiedFields = verifiedRemote
    ? fieldsToPatch.filter((field) => snapshotsMatch(field, verifiedRemote ?? {}, proposal.snapshot))
    : [];
  const finalStatus = verifiedFields.length === fieldsToPatch.length
    ? (unconfirmedBlocked.length > 0 ? 'partial' : 'success')
    : 'published_unverified';
  await logAttempt(db, {
    userId, item, status: finalStatus, baseline: baseline.baseline_snapshot, remote: verifiedRemote ?? remote,
    proposal: proposal.snapshot, fieldResults, fieldsExported: fieldsToPatch, confirmedFields: Array.from(confirmedFields),
    errorMessage: finalStatus === 'published_unverified' ? 'Etsy PATCH succeeded but the post-publication read could not verify every field' : undefined,
  });

  if (verifiedRemote && verifiedFields.length > 0) {
    await updateExportBaseline(db, {
      etsyListingRowId: etsyListing.id, userId, connectionId: connection.id, etsyListingId: item.etsy_listing_id,
      existing: baseline, acceptedSnapshot: verifiedRemote, acceptedFields: verifiedFields,
      source: blockedFields.some((field) => confirmedFields.has(field)) ? 'user_confirmed' : 'post_export',
    });
    await clearVerifiedProposalFields(db, userId, item.listing_id, proposal.versions, verifiedFields);
  }
  await db.from('etsy_listings').update({
    export_status: finalStatus === 'success' ? 'exported' : finalStatus,
    last_exported_at: new Date().toISOString(),
  }).eq('id', etsyListing.id);

  return {
    etsy_listing_id: item.etsy_listing_id,
    status: finalStatus,
    fields: fieldResults,
    fields_to_publish: fieldsToPatch,
  };
}

export { toErrorMessage };
