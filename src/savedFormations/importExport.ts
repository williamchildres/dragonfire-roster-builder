import { dragons } from '../data/dragons';
import type { Dragon } from '../models/dragon';
import { generateSavedFormationId, normalizeSavedFormationRecord, parseSavedFormationLibrary } from './contract';
import { findExactSavedFormationDuplicate } from './crud';
import {
  MAX_SAVED_FORMATIONS,
  SAVED_FORMATION_LIBRARY_FORMAT,
  SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
  type SavedFormationExport,
  type SavedFormationLibrary,
  type SavedFormationRecord,
} from './types';

export interface SavedFormationImportResult {
  ok: boolean;
  formations?: SavedFormationRecord[];
  errors: string[];
  warnings: string[];
}

export interface SavedFormationMergePreview {
  unchangedIdCount: number;
  idCollisionCount: number;
  exactDuplicates: Array<{ imported: SavedFormationRecord; existing: SavedFormationRecord }>;
  additions: SavedFormationRecord[];
  totalIfDuplicatesIncluded: number;
  totalIfDuplicatesSkipped: number;
}

export function serializeSavedFormationExport(library: SavedFormationLibrary, exportedAt = new Date().toISOString()): string {
  const payload: SavedFormationExport = {
    format: SAVED_FORMATION_LIBRARY_FORMAT,
    schemaVersion: SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
    exportedAt,
    formations: library.formations.map(normalizeSavedFormationRecord),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function validateSavedFormationImport(json: string, canonicalDragons: readonly Dragon[] = dragons): SavedFormationImportResult {
  let value: unknown;
  try { value = JSON.parse(json); } catch { return { ok: false, errors: ['The selected file is not valid JSON.'], warnings: [] }; }
  if (!isRecord(value)) return { ok: false, errors: ['The import must be a JSON object.'], warnings: [] };
  if (value.format !== SAVED_FORMATION_LIBRARY_FORMAT) return { ok: false, errors: ['Unsupported Saved Formations format.'], warnings: [] };
  if (value.schemaVersion !== SAVED_FORMATION_LIBRARY_SCHEMA_VERSION) return { ok: false, errors: ['Unsupported Saved Formations schema version.'], warnings: [] };
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) return { ok: false, errors: ['The export timestamp is invalid.'], warnings: [] };
  if (!Array.isArray(value.formations)) return { ok: false, errors: ['Formations must be an array.'], warnings: [] };
  if (value.formations.length > MAX_SAVED_FORMATIONS) return { ok: false, errors: [`An import can contain at most ${MAX_SAVED_FORMATIONS} formations.`], warnings: [] };
  const parsed = parseSavedFormationLibrary({
    format: value.format,
    schemaVersion: value.schemaVersion,
    updatedAt: value.exportedAt,
    formations: value.formations,
  }, canonicalDragons);
  if (parsed.rejectedRecordCount > 0) return { ok: false, errors: parsed.warnings, warnings: [] };
  return { ok: true, formations: parsed.library.formations, errors: [], warnings: parsed.warnings };
}

export function previewSavedFormationMerge(library: SavedFormationLibrary, imported: readonly SavedFormationRecord[]): SavedFormationMergePreview {
  const additions: SavedFormationRecord[] = [];
  const exactDuplicates: SavedFormationMergePreview['exactDuplicates'] = [];
  let unchangedIdCount = 0;
  let idCollisionCount = 0;
  const staged = { ...library, formations: [...library.formations] };
  for (const original of imported) {
    let record = normalizeSavedFormationRecord(original);
    const sameId = staged.formations.find((candidate) => candidate.id === record.id);
    if (sameId && JSON.stringify(normalizeSavedFormationRecord(sameId)) === JSON.stringify(record)) {
      unchangedIdCount += 1;
      continue;
    }
    if (sameId) {
      idCollisionCount += 1;
      record = { ...record, id: generateSavedFormationId() };
    }
    const exact = findExactSavedFormationDuplicate(staged, record.arrangement, record.evaluationMode);
    if (exact) exactDuplicates.push({ imported: record, existing: exact });
    else {
      additions.push(record);
      staged.formations.push(record);
    }
  }
  return {
    unchangedIdCount,
    idCollisionCount,
    exactDuplicates,
    additions,
    totalIfDuplicatesIncluded: library.formations.length + additions.length + exactDuplicates.length,
    totalIfDuplicatesSkipped: library.formations.length + additions.length,
  };
}

export function mergeSavedFormationImport(
  library: SavedFormationLibrary,
  preview: SavedFormationMergePreview,
  includeExactDuplicates: boolean,
  now = new Date().toISOString(),
): SavedFormationLibrary {
  const duplicateCopies = includeExactDuplicates ? preview.exactDuplicates.map(({ imported }) => ({ ...imported, id: generateSavedFormationId() })) : [];
  const formations = [...library.formations, ...preview.additions, ...duplicateCopies];
  if (formations.length > MAX_SAVED_FORMATIONS) throw new Error(`Import would exceed the ${MAX_SAVED_FORMATIONS}-formation limit.`);
  return { ...library, formations, updatedAt: now };
}

export function replaceSavedFormationImport(
  library: SavedFormationLibrary,
  imported: readonly SavedFormationRecord[],
  now = new Date().toISOString(),
): SavedFormationLibrary {
  if (imported.length > MAX_SAVED_FORMATIONS) throw new Error(`Import would exceed the ${MAX_SAVED_FORMATIONS}-formation limit.`);
  return { ...library, formations: imported.map(normalizeSavedFormationRecord), updatedAt: now };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
