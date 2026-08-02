import { FORMATION_POSITIONS } from '../models/dragon';
import type {
  SavedFormationLibrary,
  SavedFormationRecord,
  SavedFormationReservationConflict,
} from './types';

export class SavedFormationReservationConflictError extends Error {
  constructor(public readonly conflicts: SavedFormationReservationConflict[]) {
    super(conflicts.map((conflict) =>
      `${conflict.dragonId} is already reserved by “${conflict.conflictingFormationName}”.`,
    ).join(' '));
    this.name = 'SavedFormationReservationConflictError';
  }
}

export class SavedFormationReservationModeError extends Error {
  constructor() {
    super('Planning formations cannot reserve roster dragons.');
    this.name = 'SavedFormationReservationModeError';
  }
}

export class SavedFormationReservationClearanceError extends Error {
  constructor() {
    super('Updating this reserved formation to planning mode requires confirmation that its reservation will be removed.');
    this.name = 'SavedFormationReservationClearanceError';
  }
}

export function getReservedFormationRecords(library: SavedFormationLibrary): SavedFormationRecord[] {
  return library.formations.filter((record) => record.reserved);
}

export function getReservedDragonIds(library: SavedFormationLibrary): string[] {
  return [...new Set(getReservedFormationRecords(library).flatMap(arrangementDragonIds))]
    .sort((left, right) => left.localeCompare(right));
}

export function getReservationConflicts(library: SavedFormationLibrary): SavedFormationReservationConflict[] {
  const ownerByDragonId = new Map<string, SavedFormationRecord>();
  const conflicts: SavedFormationReservationConflict[] = [];
  for (const record of getReservedFormationRecords(library)) {
    for (const dragonId of arrangementDragonIds(record)) {
      const existing = ownerByDragonId.get(dragonId);
      if (existing) {
        conflicts.push({
          dragonId,
          formationId: record.id,
          formationName: record.name,
          conflictingFormationId: existing.id,
          conflictingFormationName: existing.name,
        });
      } else {
        ownerByDragonId.set(dragonId, record);
      }
    }
  }
  return conflicts;
}

export function getFormationReservationConflicts(
  library: SavedFormationLibrary,
  formationId: string,
  arrangement?: SavedFormationRecord['arrangement'],
): SavedFormationReservationConflict[] {
  const record = library.formations.find((candidate) => candidate.id === formationId);
  if (!record) throw new Error('Saved formation was not found.');
  const target = arrangement ?? record.arrangement;
  const owners = new Map<string, SavedFormationRecord>();
  for (const candidate of getReservedFormationRecords(library)) {
    if (candidate.id === formationId) continue;
    for (const dragonId of arrangementDragonIds(candidate)) owners.set(dragonId, candidate);
  }
  return FORMATION_POSITIONS.flatMap((position) => {
    const dragonId = target[position];
    const existing = owners.get(dragonId);
    return existing ? [{
      dragonId,
      formationId,
      formationName: record.name,
      conflictingFormationId: existing.id,
      conflictingFormationName: existing.name,
    }] : [];
  });
}

export function canReserveFormation(library: SavedFormationLibrary, formationId: string): boolean {
  const record = library.formations.find((candidate) => candidate.id === formationId);
  return Boolean(record && record.evaluationMode === 'current-roster' &&
    getFormationReservationConflicts(library, formationId).length === 0);
}

export function setFormationReserved(
  library: SavedFormationLibrary,
  formationId: string,
  reserved: boolean,
  now = new Date().toISOString(),
): SavedFormationLibrary {
  const index = library.formations.findIndex((record) => record.id === formationId);
  if (index < 0) throw new Error('Saved formation was not found.');
  const record = library.formations[index]!;
  if (record.reserved === reserved) return library;
  if (reserved && record.evaluationMode !== 'current-roster') throw new SavedFormationReservationModeError();
  if (reserved) {
    const conflicts = getFormationReservationConflicts(library, formationId);
    if (conflicts.length > 0) throw new SavedFormationReservationConflictError(conflicts);
  }
  const formations = [...library.formations];
  formations[index] = { ...record, reserved, updatedAt: now };
  return { ...library, formations, updatedAt: now };
}

export function arrangementDragonIds(record: Pick<SavedFormationRecord, 'arrangement'>): [string, string, string] {
  return FORMATION_POSITIONS.map((position) => record.arrangement[position]) as [string, string, string];
}
