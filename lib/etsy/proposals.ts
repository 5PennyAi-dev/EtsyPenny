import type { EtsyExportField, EtsyExportSnapshot } from './export-conflicts.js';
import { randomUUID } from 'node:crypto';

export interface FieldProposalVersion {
  version: string;
  updated_at: string;
}

export type FieldProposalState = Partial<Record<EtsyExportField, FieldProposalVersion>>;

export function readFieldProposalState(value: unknown): FieldProposalState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const state: FieldProposalState = {};
  for (const field of ['title', 'description', 'tags'] as EtsyExportField[]) {
    const entry = (value as Record<string, unknown>)[field];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const version = (entry as Record<string, unknown>).version;
    const updatedAt = (entry as Record<string, unknown>).updated_at;
    if (typeof version === 'string' && typeof updatedAt === 'string') state[field] = { version, updated_at: updatedAt };
  }
  return state;
}

export function withProposalFields(current: unknown, fields: EtsyExportField[], now = new Date().toISOString()): FieldProposalState {
  const next = readFieldProposalState(current);
  for (const field of fields) next[field] = { version: randomUUID(), updated_at: now };
  return next;
}

export function fieldsWithProposal(state: unknown, fields: EtsyExportField[]): EtsyExportField[] {
  const parsed = readFieldProposalState(state);
  return fields.filter((field) => Boolean(parsed[field]));
}

export function normalizeEtsyTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().replace(/\s+/g, ' ').toLocaleLowerCase())
    .filter((tag) => tag.length > 0)))
    .sort((a, b) => a.localeCompare(b));
}

export function snapshotsMatch(field: EtsyExportField, left: EtsyExportSnapshot, right: EtsyExportSnapshot): boolean {
  if (field === 'tags') return JSON.stringify(normalizeEtsyTags(left.tags)) === JSON.stringify(normalizeEtsyTags(right.tags));
  return (left[field] ?? '').trim() === (right[field] ?? '').trim();
}
