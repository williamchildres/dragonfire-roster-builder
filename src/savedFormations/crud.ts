import type { OwnedDragon } from '../models/dragon';
import type { FormationArrangement } from '../services/formationArrangement';
import { captureSavedFormationProgression } from './progression';
import { generateSavedFormationId } from './contract';
import {
  getFormationReservationConflicts,
  SavedFormationReservationClearanceError,
  SavedFormationReservationConflictError,
} from './reservations';
import {
  MAX_SAVED_FORMATIONS,
  MAX_SAVED_FORMATION_NAME_LENGTH,
  type SavedFormationEvaluationMode,
  type SavedFormationLibrary,
  type SavedFormationRecord,
  type SavedFormationSource,
} from './types';

export interface CreateSavedFormationInput {
  name: string;
  arrangement: FormationArrangement;
  evaluationMode: SavedFormationEvaluationMode;
  source: SavedFormationSource;
  roster: Readonly<Record<string, OwnedDragon | undefined>>;
  now?: string;
  id?: string;
  insertAfterId?: string;
}

export function createSavedFormation(library: SavedFormationLibrary, input: CreateSavedFormationInput): SavedFormationLibrary {
  if (library.formations.length >= MAX_SAVED_FORMATIONS) throw new Error(`You can save up to ${MAX_SAVED_FORMATIONS} formations.`);
  const now = input.now ?? new Date().toISOString();
  const record: SavedFormationRecord = {
    id: input.id ?? generateSavedFormationId(),
    name: validateName(input.name),
    arrangement: { ...input.arrangement },
    evaluationMode: input.evaluationMode,
    source: input.source,
    reserved: false,
    savedProgressionByDragonId: captureSavedFormationProgression(input),
    createdAt: now,
    updatedAt: now,
  };
  const formations = [...library.formations];
  const sourceIndex = input.insertAfterId ? formations.findIndex((item) => item.id === input.insertAfterId) : -1;
  formations.splice(sourceIndex >= 0 ? sourceIndex + 1 : formations.length, 0, record);
  return touch(library, formations, now);
}

export function updateSavedFormation(
  library: SavedFormationLibrary,
  id: string,
  input: Omit<CreateSavedFormationInput, 'id' | 'insertAfterId' | 'source'> & {
    source?: SavedFormationSource;
    clearReservation?: boolean;
  },
): SavedFormationLibrary {
  const now = input.now ?? new Date().toISOString();
  let found = false;
  const formations = library.formations.map((record) => {
    if (record.id !== id) return record;
    found = true;
    if (record.reserved && input.evaluationMode === 'planning' && !input.clearReservation) {
      throw new SavedFormationReservationClearanceError();
    }
    if (record.reserved && input.evaluationMode === 'current-roster') {
      const conflicts = getFormationReservationConflicts(library, id, input.arrangement);
      if (conflicts.length > 0) throw new SavedFormationReservationConflictError(conflicts);
    }
    return {
      ...record,
      name: validateName(input.name),
      arrangement: { ...input.arrangement },
      evaluationMode: input.evaluationMode,
      source: input.source ?? record.source,
      reserved: record.reserved && input.evaluationMode === 'current-roster',
      savedProgressionByDragonId: captureSavedFormationProgression(input),
      updatedAt: now,
    };
  });
  if (!found) throw new Error('Saved formation was not found.');
  return touch(library, formations, now);
}

export function renameSavedFormation(library: SavedFormationLibrary, id: string, name: string, now = new Date().toISOString()): SavedFormationLibrary {
  return mapFound(library, id, (record) => ({ ...record, name: validateName(name), updatedAt: now }), now);
}

export function duplicateSavedFormation(library: SavedFormationLibrary, id: string, now = new Date().toISOString(), newId = generateSavedFormationId()): SavedFormationLibrary {
  if (library.formations.length >= MAX_SAVED_FORMATIONS) throw new Error(`You can save up to ${MAX_SAVED_FORMATIONS} formations.`);
  const index = library.formations.findIndex((record) => record.id === id);
  if (index < 0) throw new Error('Saved formation was not found.');
  const source = library.formations[index]!;
  const copy: SavedFormationRecord = {
    ...source,
    id: newId,
    name: copyName(source.name),
    reserved: false,
    savedProgressionByDragonId: structuredCloneProgression(source.savedProgressionByDragonId),
    createdAt: now,
    updatedAt: now,
  };
  const formations = [...library.formations];
  formations.splice(index + 1, 0, copy);
  return touch(library, formations, now);
}

export function moveSavedFormation(library: SavedFormationLibrary, id: string, direction: 'up' | 'down', now = new Date().toISOString()): SavedFormationLibrary {
  const index = library.formations.findIndex((record) => record.id === id);
  if (index < 0) throw new Error('Saved formation was not found.');
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= library.formations.length) return library;
  const formations = [...library.formations];
  const currentRecord = formations[index]!;
  formations[index] = formations[target]!;
  formations[target] = currentRecord;
  return touch(library, formations, now);
}

export function deleteSavedFormation(library: SavedFormationLibrary, id: string, now = new Date().toISOString()): SavedFormationLibrary {
  const formations = library.formations.filter((record) => record.id !== id);
  if (formations.length === library.formations.length) throw new Error('Saved formation was not found.');
  return touch(library, formations, now);
}

export function findExactSavedFormationDuplicate(
  library: SavedFormationLibrary,
  arrangement: FormationArrangement,
  evaluationMode: SavedFormationEvaluationMode,
  excludeId?: string,
): SavedFormationRecord | null {
  return library.formations.find((record) => record.id !== excludeId && record.evaluationMode === evaluationMode &&
    record.arrangement['left-flank'] === arrangement['left-flank'] &&
    record.arrangement.vanguard === arrangement.vanguard &&
    record.arrangement['right-flank'] === arrangement['right-flank']) ?? null;
}

export function validateName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error('Formation name must contain at least one visible character.');
  if (normalized.length > MAX_SAVED_FORMATION_NAME_LENGTH) throw new Error(`Formation name must be ${MAX_SAVED_FORMATION_NAME_LENGTH} characters or fewer.`);
  return normalized;
}

function copyName(name: string): string {
  const suffix = ' — Copy';
  return `${name.slice(0, MAX_SAVED_FORMATION_NAME_LENGTH - suffix.length)}${suffix}`;
}

function mapFound(library: SavedFormationLibrary, id: string, map: (record: SavedFormationRecord) => SavedFormationRecord, now: string) {
  let found = false;
  const formations = library.formations.map((record) => {
    if (record.id !== id) return record;
    found = true;
    return map(record);
  });
  if (!found) throw new Error('Saved formation was not found.');
  return touch(library, formations, now);
}

function touch(library: SavedFormationLibrary, formations: SavedFormationRecord[], updatedAt: string): SavedFormationLibrary {
  return { ...library, formations, updatedAt };
}

function structuredCloneProgression(value: SavedFormationRecord['savedProgressionByDragonId']) {
  return Object.fromEntries(Object.entries(value).map(([id, entry]) => [id, { ...entry, activeHabitLevels: { ...entry.activeHabitLevels } }]));
}
