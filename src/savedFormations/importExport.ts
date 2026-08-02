import { dragons } from '../data/dragons';
import type { Dragon } from '../models/dragon';
import { generateSavedFormationId, normalizeSavedFormationRecord, parseSavedFormationRecord } from './contract';
import { findExactSavedFormationDuplicate } from './crud';
import { arrangementDragonIds, getReservationConflicts } from './reservations';
import {
  LEGACY_SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
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
  reservationConflicts: SavedFormationImportReservationConflict[];
}

export interface SavedFormationImportReservationConflict {
  imported: SavedFormationRecord;
  conflictingDragonIds: string[];
  existing: SavedFormationRecord;
}

export type SavedFormationImportReservationDecision = 'unreserved' | 'skip';

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
  if (value.schemaVersion !== LEGACY_SAVED_FORMATION_LIBRARY_SCHEMA_VERSION && value.schemaVersion !== SAVED_FORMATION_LIBRARY_SCHEMA_VERSION) return { ok: false, errors: ['Unsupported Saved Formations schema version.'], warnings: [] };
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) return { ok: false, errors: ['The export timestamp is invalid.'], warnings: [] };
  if (!Array.isArray(value.formations)) return { ok: false, errors: ['Formations must be an array.'], warnings: [] };
  if (value.formations.length > MAX_SAVED_FORMATIONS) return { ok: false, errors: [`An import can contain at most ${MAX_SAVED_FORMATIONS} formations.`], warnings: [] };
  const formations: SavedFormationRecord[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < value.formations.length; index += 1) {
    const parsed = parseSavedFormationRecord(value.formations[index], canonicalDragons, value.schemaVersion);
    if (!parsed.ok) return { ok: false, errors: [`Saved formation ${index + 1} is invalid: ${parsed.error}`], warnings: [] };
    if (ids.has(parsed.record.id)) return { ok: false, errors: [`Saved formation ${index + 1} duplicates an earlier ID.`], warnings: [] };
    ids.add(parsed.record.id);
    formations.push(normalizeSavedFormationRecord(parsed.record));
  }
  return { ok: true, formations, errors: [], warnings: [] };
}

export function previewSavedFormationMerge(library: SavedFormationLibrary, imported: readonly SavedFormationRecord[]): SavedFormationMergePreview {
  const additions: SavedFormationRecord[] = [];
  const exactDuplicates: SavedFormationMergePreview['exactDuplicates'] = [];
  let unchangedIdCount = 0;
  let idCollisionCount = 0;
  const staged = { ...library, formations: [...library.formations] };
  const reservationConflicts: SavedFormationImportReservationConflict[] = [];
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
    if (record.reserved) {
      const conflicting = staged.formations.filter((candidate) => candidate.reserved &&
        arrangementDragonIds(candidate).some((dragonId) => arrangementDragonIds(record).includes(dragonId)));
      if (conflicting.length > 0) {
        for (const existing of conflicting) {
          reservationConflicts.push({
            imported: record,
            existing,
            conflictingDragonIds: arrangementDragonIds(record)
              .filter((dragonId) => arrangementDragonIds(existing).includes(dragonId))
              .sort((left, right) => left.localeCompare(right)),
          });
        }
      }
    }
    if (exact) exactDuplicates.push({ imported: record, existing: exact });
    else {
      additions.push(record);
      const hasReservationConflict = reservationConflicts.some((conflict) => conflict.imported.id === record.id);
      if (!record.reserved || !hasReservationConflict) staged.formations.push(record);
    }
  }
  return {
    unchangedIdCount,
    idCollisionCount,
    exactDuplicates,
    additions,
    totalIfDuplicatesIncluded: library.formations.length + additions.length + exactDuplicates.length,
    totalIfDuplicatesSkipped: library.formations.length + additions.length,
    reservationConflicts,
  };
}

export function mergeSavedFormationImport(
  library: SavedFormationLibrary,
  preview: SavedFormationMergePreview,
  includeExactDuplicates: boolean,
  now = new Date().toISOString(),
  reservationDecisions: Readonly<Record<string, SavedFormationImportReservationDecision>> = {},
): SavedFormationLibrary {
  const includedIds = new Set([
    ...preview.additions.map((record) => record.id),
    ...(includeExactDuplicates ? preview.exactDuplicates.map(({ imported }) => imported.id) : []),
  ]);
  const unresolved = preview.reservationConflicts.filter(({ imported }) => includedIds.has(imported.id) && !reservationDecisions[imported.id]);
  if (unresolved.length > 0) throw new Error('Choose whether each conflicting imported reservation should be imported unreserved or skipped.');
  const resolveRecord = (record: SavedFormationRecord) => {
    const decision = reservationDecisions[record.id];
    if (decision === 'skip') return null;
    return decision === 'unreserved' ? { ...record, reserved: false } : record;
  };
  const duplicateCopies = includeExactDuplicates ? preview.exactDuplicates
    .map(({ imported }) => resolveRecord(imported))
    .filter(isFormationRecord)
    .map((record) => ({ ...record, id: generateSavedFormationId() })) : [];
  const additions = preview.additions.map(resolveRecord).filter(isFormationRecord);
  const formations = [...library.formations, ...additions, ...duplicateCopies];
  if (formations.length > MAX_SAVED_FORMATIONS) throw new Error(`Import would exceed the ${MAX_SAVED_FORMATIONS}-formation limit.`);
  const next = { ...library, formations, updatedAt: now };
  if (getReservationConflicts(next).length > 0) throw new Error('Import would reserve a dragon in more than one formation.');
  return next;
}

export function replaceSavedFormationImport(
  library: SavedFormationLibrary,
  imported: readonly SavedFormationRecord[],
  now = new Date().toISOString(),
  reservationDecisions: Readonly<Record<string, SavedFormationImportReservationDecision>> = {},
): SavedFormationLibrary {
  if (imported.length > MAX_SAVED_FORMATIONS) throw new Error(`Import would exceed the ${MAX_SAVED_FORMATIONS}-formation limit.`);
  const formations: SavedFormationRecord[] = [];
  const reservedOwners = new Map<string, SavedFormationRecord>();
  for (const original of imported) {
    let record = normalizeSavedFormationRecord(original);
    const conflicting = record.reserved ? arrangementDragonIds(record).filter((id) => reservedOwners.has(id)) : [];
    if (conflicting.length > 0) {
      const decision = reservationDecisions[record.id];
      if (!decision) throw new Error('Resolve every overlapping imported reservation before replacing the library.');
      if (decision === 'skip') continue;
      record = { ...record, reserved: false };
    }
    formations.push(record);
    if (record.reserved) for (const id of arrangementDragonIds(record)) reservedOwners.set(id, record);
  }
  return { ...library, formations, updatedAt: now };
}

export function previewSavedFormationReplace(imported: readonly SavedFormationRecord[]): SavedFormationImportReservationConflict[] {
  const owners = new Map<string, SavedFormationRecord>();
  const displayOrder = new Map(imported.map((record, index) => [record.id, index]));
  const conflicts: SavedFormationImportReservationConflict[] = [];
  for (const importedRecord of imported) {
    if (!importedRecord.reserved) continue;
    const byExisting = new Map<string, { existing: SavedFormationRecord; dragonIds: string[] }>();
    for (const dragonId of arrangementDragonIds(importedRecord)) {
      const existing = owners.get(dragonId);
      if (!existing) continue;
      const entry = byExisting.get(existing.id) ?? { existing, dragonIds: [] };
      entry.dragonIds.push(dragonId);
      byExisting.set(existing.id, entry);
    }
    const orderedExistingConflicts = [...byExisting.values()].sort((left, right) =>
      (displayOrder.get(left.existing.id) ?? Number.MAX_SAFE_INTEGER) -
        (displayOrder.get(right.existing.id) ?? Number.MAX_SAFE_INTEGER) ||
      left.existing.id.localeCompare(right.existing.id));
    for (const { existing, dragonIds } of orderedExistingConflicts) {
      conflicts.push({ imported: importedRecord, existing, conflictingDragonIds: dragonIds.sort((a, b) => a.localeCompare(b)) });
    }
    if (byExisting.size === 0) for (const dragonId of arrangementDragonIds(importedRecord)) owners.set(dragonId, importedRecord);
  }
  return conflicts;
}

function isFormationRecord(record: SavedFormationRecord | null): record is SavedFormationRecord {
  return record !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
