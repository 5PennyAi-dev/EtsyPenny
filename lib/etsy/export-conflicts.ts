export const ETSY_EXPORT_FIELDS = ['title', 'description', 'tags'] as const;

export type EtsyExportField = (typeof ETSY_EXPORT_FIELDS)[number];
export type EtsyExportSnapshot = Partial<{
  title: string;
  description: string;
  tags: string[];
}>;
export type ConflictStatus = 'safe' | 'unchanged' | 'conflict' | 'baseline_unknown';

export interface FieldConflictResult {
  status: ConflictStatus;
  baseline: string | string[] | null;
  remote: string | string[] | null;
  proposed: string | string[] | null;
}

function normaliseText(value: unknown): string {
  return String(value ?? '').normalize('NFC').replace(/\r\n/g, '\n');
}

function normaliseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => normaliseText(tag).trim().toLocaleLowerCase());
}

function valuesEqual(field: EtsyExportField, left: unknown, right: unknown): boolean {
  if (field === 'tags') {
    const a = normaliseTags(left);
    const b = normaliseTags(right);
    return a.length === b.length && a.every((tag, index) => tag === b[index]);
  }
  return normaliseText(left) === normaliseText(right);
}

function displayValue(field: EtsyExportField, value: unknown): string | string[] {
  return field === 'tags'
    ? (Array.isArray(value) ? value.map(String) : [])
    : String(value ?? '');
}

/**
 * Three-way comparison: the last accepted Etsy baseline, the Etsy value read
 * immediately before publication, and the PennySEO proposal. Unknown
 * historical baselines intentionally block writes until the user confirms.
 */
export function compareEtsyExportFields(args: {
  fields: EtsyExportField[];
  baseline: EtsyExportSnapshot;
  trustedFields: EtsyExportField[];
  remote: EtsyExportSnapshot;
  proposed: EtsyExportSnapshot;
}): Record<EtsyExportField, FieldConflictResult> {
  const results = {} as Record<EtsyExportField, FieldConflictResult>;

  for (const field of args.fields) {
    const baselineKnown = args.trustedFields.includes(field)
      && Object.prototype.hasOwnProperty.call(args.baseline, field);
    const remote = displayValue(field, args.remote[field]);
    const proposed = displayValue(field, args.proposed[field]);
    const baseline = baselineKnown ? displayValue(field, args.baseline[field]) : null;

    let status: ConflictStatus;
    if (valuesEqual(field, args.remote[field], args.proposed[field])) {
      status = 'unchanged';
    } else if (!baselineKnown) {
      status = 'baseline_unknown';
    } else if (valuesEqual(field, args.remote[field], args.baseline[field])) {
      status = 'safe';
    } else {
      status = 'conflict';
    }

    results[field] = { status, baseline, remote, proposed };
  }

  return results;
}

export function snapshotFromEtsyListing(listing: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
}): EtsyExportSnapshot {
  return {
    title: listing.title ?? '',
    description: listing.description ?? '',
    tags: listing.tags ?? [],
  };
}
