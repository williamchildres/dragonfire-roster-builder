import { describe, expect, it, vi } from 'vitest';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { applyOwnedDragonPatch } from '../services/habitLevels';
import { createEmptyRoster } from '../services/rosterStorage';
import {
  createEmptySavedFormationLibrary,
  generateSavedFormationId,
  parseSavedFormationLibrary,
} from '../savedFormations/contract';
import {
  createSavedFormation,
  deleteSavedFormation,
  duplicateSavedFormation,
  findExactSavedFormationDuplicate,
  moveSavedFormation,
  renameSavedFormation,
  updateSavedFormation,
} from '../savedFormations/crud';
import { evaluateSavedFormation } from '../savedFormations/evaluation';
import {
  mergeSavedFormationImport,
  previewSavedFormationMerge,
  replaceSavedFormationImport,
  previewSavedFormationReplace,
  serializeSavedFormationExport,
  validateSavedFormationImport,
} from '../savedFormations/importExport';
import { compareSavedFormationProgression } from '../savedFormations/progression';
import { loadSavedFormationLibrary, saveSavedFormationLibrary, serializeSavedFormationLibrary } from '../savedFormations/storage';
import {
  canReserveFormation,
  getReservedDragonIds,
  getReservationConflicts,
  groupReservationConflictsByFormation,
  SavedFormationReservationClearanceError,
  SavedFormationReservationConflictError,
  setFormationReserved,
} from '../savedFormations/reservations';
import { savedFormationLibraryFingerprint } from '../cloud/savedFormationContract';
import {
  MAX_SAVED_FORMATIONS,
  SAVED_FORMATIONS_STORAGE_KEY,
  type SavedFormationLibrary,
  type SavedFormationRecord,
} from '../savedFormations/types';
import {
  EXPECTED_HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY,
  EXPECTED_SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY,
  EXPECTED_SAVED_FORMATION_RESERVATION_AUDIT_IDENTITY,
  HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY,
  SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY,
  SAVED_FORMATION_RESERVATION_AUDIT_IDENTITY,
} from '../savedFormations/auditIdentity';

const arrangement = {
  'left-flank': dragons[0]!.id,
  vanguard: dragons[1]!.id,
  'right-flank': dragons[2]!.id,
};
const rearranged = {
  'left-flank': dragons[1]!.id,
  vanguard: dragons[0]!.id,
  'right-flank': dragons[2]!.id,
};

describe('Saved Formation Library contract and storage', () => {
  it('locks the separate Saved Formation Library contract identity', () => {
    expect(SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY).toBe(EXPECTED_SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY);
    expect(SAVED_FORMATION_RESERVATION_AUDIT_IDENTITY).toBe(EXPECTED_SAVED_FORMATION_RESERVATION_AUDIT_IDENTITY);
    expect(HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY).toBe(EXPECTED_HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY);
    expect(HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY).toBe('fnv1a64:1e1f6e4c02946489');
  });
  it('creates and round-trips an empty versioned library', () => {
    const library = createEmptySavedFormationLibrary('2026-08-01T00:00:00.000Z');
    expect(library).toMatchObject({ format: 'dragonfire-lab-saved-formations', schemaVersion: 2, formations: [] });
    expect(parseSavedFormationLibrary(JSON.parse(serializeSavedFormationLibrary(library))).library).toEqual(library);
  });

  it('migrates schema 1 without changing semantic formation identity or timestamps', () => {
    const current = oneLibrary();
    const legacyRecord = withoutReserved(current.formations[0]!);
    const legacy = { ...current, schemaVersion: 1, formations: [legacyRecord] };
    const migrated = parseSavedFormationLibrary(legacy).library;
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.formations[0]).toEqual({ ...current.formations[0], reserved: false });
    expect(migrated.updatedAt).toBe(current.updatedAt);
    expect(savedFormationLibraryFingerprint(migrated)).toBe(savedFormationLibraryFingerprint(current));
    const storage = memoryStorage(JSON.stringify(legacy));
    expect(loadSavedFormationLibrary(storage).library).toEqual(migrated);
    expect(storage.values.get(SAVED_FORMATIONS_STORAGE_KEY)).toBe(JSON.stringify(legacy));
    saveSavedFormationLibrary(storage, renameSavedFormation(migrated, migrated.formations[0]!.id, 'Edited', '2026-08-03T00:00:00.000Z'));
    const persisted = JSON.parse(storage.values.get(SAVED_FORMATIONS_STORAGE_KEY)!) as { schemaVersion: number };
    expect(persisted.schemaVersion).toBe(2);
  });

  it('round-trips valid local data deterministically', () => {
    const library = oneLibrary();
    const storage = memoryStorage();
    expect(saveSavedFormationLibrary(storage, library)).toEqual({ ok: true });
    expect(loadSavedFormationLibrary(storage).library).toEqual(library);
    expect(serializeSavedFormationLibrary(library)).toBe(serializeSavedFormationLibrary(library));
    expect(storage.values.get(SAVED_FORMATIONS_STORAGE_KEY)).not.toContain('rating');
  });

  it('handles malformed JSON and unsupported schemas without touching roster data', () => {
    const malformed = memoryStorage('{');
    const rosterValue = '{"safe":true}';
    malformed.values.set('dragonfire-roster-lab:roster', rosterValue);
    expect(loadSavedFormationLibrary(malformed).warnings[0]).toMatch(/malformed/i);
    expect(malformed.values.get('dragonfire-roster-lab:roster')).toBe(rosterValue);
    const unsupported = parseSavedFormationLibrary({ format: 'dragonfire-lab-saved-formations', schemaVersion: 99, updatedAt: '2026-08-01T00:00:00.000Z', formations: [] });
    expect(unsupported.warnings[0]).toMatch(/schema/i);
  });

  it('isolates invalid records and rejects duplicate or unknown dragons', () => {
    const library = oneLibrary();
    const good = library.formations[0]!;
    const duplicateDragons = { ...good, id: generateSavedFormationId(), arrangement: { ...good.arrangement, vanguard: good.arrangement['left-flank'] } };
    const unknownDragon = { ...good, id: generateSavedFormationId(), arrangement: { ...good.arrangement, vanguard: 'unknown-dragon' } };
    const parsed = parseSavedFormationLibrary({ ...library, formations: [good, duplicateDragons, unknownDragon] });
    expect(parsed.library.formations).toEqual([good]);
    expect(parsed.rejectedRecordCount).toBe(2);
    expect(parsed.warnings).toHaveLength(2);
  });

  it('enforces name, timestamp, collection size, and write-failure validation', () => {
    const library = oneLibrary();
    const record = library.formations[0]!;
    expect(parseSavedFormationLibrary({ ...library, formations: [{ ...record, name: ' '.repeat(2) }] }).rejectedRecordCount).toBe(1);
    expect(parseSavedFormationLibrary({ ...library, formations: [{ ...record, updatedAt: 'not-a-time' }] }).rejectedRecordCount).toBe(1);
    const many = { ...library, formations: Array.from({ length: 55 }, (_, index) => ({ ...record, id: deterministicId(index) })) };
    expect(parseSavedFormationLibrary(many).library.formations).toHaveLength(MAX_SAVED_FORMATIONS);
    expect(saveSavedFormationLibrary({ setItem: () => { throw new Error('quota'); } }, library)).toMatchObject({ ok: false });
  });

  it('generates valid unique fallback IDs', () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', undefined);
    const first = generateSavedFormationId();
    const second = generateSavedFormationId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
    vi.stubGlobal('crypto', originalCrypto);
  });
});

describe('Saved Formation CRUD and evaluation', () => {
  it('enforces whole-formation reservations and deterministic conflicts', () => {
    const roster = progressedRoster();
    let library = oneLibrary(roster);
    const firstId = library.formations[0]!.id;
    library = setFormationReserved(library, firstId, true, '2026-08-01T00:02:00.000Z');
    expect(getReservedDragonIds(library)).toEqual([...Object.values(arrangement)].sort());
    expect(canReserveFormation(library, firstId)).toBe(true);
    library = createSavedFormation(library, { name: 'Overlap', arrangement: {
      'left-flank': arrangement['left-flank'], vanguard: dragons[3]!.id, 'right-flank': dragons[4]!.id,
    }, evaluationMode: 'current-roster', source: 'formation-builder', roster, id: deterministicId(22), now: '2026-08-01T00:03:00.000Z' });
    expect(() => setFormationReserved(library, deterministicId(22), true)).toThrow(SavedFormationReservationConflictError);
    expect(library.formations[1]!.reserved).toBe(false);
    expect(getReservationConflicts(library)).toEqual([]);
    expect(duplicateSavedFormation(library, firstId, '2026-08-01T00:04:00.000Z', deterministicId(23)).formations[1]!.reserved).toBe(false);
    expect(setFormationReserved(library, firstId, false).formations[0]!.reserved).toBe(false);
  });

  it('allows reservation updates at the 50-record limit', () => {
    const base = oneLibrary();
    const record = base.formations[0]!;
    const full = { ...base, formations: Array.from({ length: 50 }, (_value, index) => ({ ...record, id: deterministicId(index) })) };
    const reserved = setFormationReserved(full, deterministicId(0), true);
    expect(reserved.formations).toHaveLength(50);
    expect(reserved.formations[0]!.reserved).toBe(true);
  });

  it('blocks conflicting reserved edits and requires confirmation before planning conversion', () => {
    const roster = progressedRoster();
    let library = setFormationReserved(oneLibrary(roster), deterministicId(0), true);
    library = createSavedFormation(library, { name: 'Other', arrangement: {
      'left-flank': dragons[3]!.id, vanguard: dragons[4]!.id, 'right-flank': dragons[5]!.id,
    }, evaluationMode: 'current-roster', source: 'formation-builder', roster, id: deterministicId(24) });
    library = setFormationReserved(library, deterministicId(24), true);
    const before = library;
    expect(() => updateSavedFormation(library, deterministicId(0), { name: 'Alpha', arrangement: {
      ...arrangement, 'left-flank': dragons[3]!.id,
    }, evaluationMode: 'current-roster', roster })).toThrow(SavedFormationReservationConflictError);
    expect(library).toBe(before);
    expect(() => updateSavedFormation(library, deterministicId(0), { name: 'Plan', arrangement, evaluationMode: 'planning', roster })).toThrow(SavedFormationReservationClearanceError);
    const planning = updateSavedFormation(library, deterministicId(0), { name: 'Plan', arrangement, evaluationMode: 'planning', roster, clearReservation: true });
    expect(planning.formations[0]).toMatchObject({ reserved: false, evaluationMode: 'planning' });
  });

  it('reports every reserved-arrangement update conflict in display order without mutating the prior record', () => {
    const roster = progressedRoster();
    let library = createSavedFormation(createEmptySavedFormationLibrary(), {
      name: 'Fire Vanguard', arrangement: { 'left-flank': dragons[0]!.id, vanguard: dragons[1]!.id, 'right-flank': dragons[2]!.id },
      evaluationMode: 'current-roster', source: 'formation-builder', roster, id: deterministicId(40),
    });
    library = setFormationReserved(library, deterministicId(40), true);
    library = createSavedFormation(library, {
      name: 'Royal Flames', arrangement: { 'left-flank': dragons[3]!.id, vanguard: dragons[4]!.id, 'right-flank': dragons[5]!.id },
      evaluationMode: 'current-roster', source: 'formation-builder', roster, id: deterministicId(41),
    });
    library = setFormationReserved(library, deterministicId(41), true);
    library = createSavedFormation(library, {
      name: 'Reserved target', arrangement: { 'left-flank': dragons[6]!.id, vanguard: dragons[7]!.id, 'right-flank': dragons[8]!.id },
      evaluationMode: 'current-roster', source: 'formation-builder', roster, id: deterministicId(42),
    });
    library = setFormationReserved(library, deterministicId(42), true);
    const priorRecord = library.formations[2]!;
    let error: SavedFormationReservationConflictError | null = null;

    try {
      updateSavedFormation(library, deterministicId(42), {
        name: 'Conflicting update',
        arrangement: { 'left-flank': dragons[3]!.id, vanguard: dragons[1]!.id, 'right-flank': dragons[0]!.id },
        evaluationMode: 'current-roster',
        roster,
      });
    } catch (caught) {
      if (caught instanceof SavedFormationReservationConflictError) error = caught;
      else throw caught;
    }

    expect(error).not.toBeNull();
    expect(groupReservationConflictsByFormation(library, error!.conflicts)).toEqual([
      { conflictingFormationId: deterministicId(40), conflictingFormationName: 'Fire Vanguard', dragonIds: [dragons[0]!.id, dragons[1]!.id].sort() },
      { conflictingFormationId: deterministicId(41), conflictingFormationName: 'Royal Flames', dragonIds: [dragons[3]!.id] },
    ]);
    expect(library.formations[2]).toBe(priorRecord);
    expect(library.formations[2]).toMatchObject({ name: 'Reserved target', reserved: true, arrangement: {
      'left-flank': dragons[6]!.id, vanguard: dragons[7]!.id, 'right-flank': dragons[8]!.id,
    } });
  });
  it('saves, updates, saves as new, renames, duplicates, reorders, and deletes', () => {
    const roster = progressedRoster();
    let library = createEmptySavedFormationLibrary('2026-08-01T00:00:00.000Z');
    library = createSavedFormation(library, { name: ' First ', arrangement, evaluationMode: 'current-roster', source: 'formation-builder', roster, now: '2026-08-01T00:01:00.000Z', id: deterministicId(1) });
    const created = library.formations[0]!;
    expect(created.name).toBe('First');
    library = updateSavedFormation(library, created.id, { name: 'Updated', arrangement: rearranged, evaluationMode: 'planning', roster, now: '2026-08-01T00:02:00.000Z' });
    expect(library.formations[0]).toMatchObject({ id: created.id, createdAt: created.createdAt, arrangement: rearranged, name: 'Updated' });
    library = createSavedFormation(library, { name: 'New copy', arrangement, evaluationMode: 'current-roster', source: 'formation-builder', roster, insertAfterId: created.id, now: '2026-08-01T00:03:00.000Z', id: deterministicId(2) });
    library = renameSavedFormation(library, deterministicId(2), 'Renamed', '2026-08-01T00:04:00.000Z');
    library = duplicateSavedFormation(library, deterministicId(2), '2026-08-01T00:05:00.000Z', deterministicId(3));
    expect(library.formations[2]!.name).toBe('Renamed — Copy');
    library = moveSavedFormation(library, deterministicId(3), 'up', '2026-08-01T00:06:00.000Z');
    expect(library.formations[1]!.id).toBe(deterministicId(3));
    library = deleteSavedFormation(library, deterministicId(3), '2026-08-01T00:07:00.000Z');
    expect(library.formations.map((record) => record.id)).not.toContain(deterministicId(3));
  });

  it('detects exact duplicates but allows the same trio in a different arrangement', () => {
    const library = oneLibrary();
    expect(findExactSavedFormationDuplicate(library, arrangement, 'current-roster')?.name).toBe('Alpha');
    expect(findExactSavedFormationDuplicate(library, rearranged, 'current-roster')).toBeNull();
    expect(findExactSavedFormationDuplicate(library, arrangement, 'planning')).toBeNull();
  });

  it('recalculates current-roster values and reports exact progression changes', () => {
    const roster = progressedRoster();
    const record = oneLibrary(roster).formations[0]!;
    const first = evaluateSavedFormation({ record, roster });
    expect(first.rating.score).not.toBeNull();
    expect(first.estimatedPower).not.toBeNull();
    expect(first.progression.status).toBe('unchanged');
    const dragon = dragons[0]!;
    const changed = { ...roster, [dragon.id]: { ...roster[dragon.id]!, starRank: 9, reignLevel: 51, habitLevels: { ...roster[dragon.id]!.habitLevels, [dragon.habits[0]!.id]: 5 as const } } };
    const comparison = compareSavedFormationProgression({ record, roster: changed });
    expect(comparison.status).toBe('changed');
    expect(comparison.changes.map((change) => change.field)).toEqual(expect.arrayContaining(['starRank', 'dragonLevel', 'habitLevel']));
  });

  it('marks removed ownership and incomplete progression unavailable without deleting the record', () => {
    const roster = progressedRoster();
    const record = oneLibrary(roster).formations[0]!;
    const unavailable = { ...roster, [dragons[1]!.id]: { ...roster[dragons[1]!.id]!, owned: false, starRank: null } };
    const result = evaluateSavedFormation({ record, roster: unavailable });
    expect(result.status).toBe('unavailable');
    expect(result.estimatedPower).toBeNull();
    expect(result.progression.unavailableDragonIds).toContain(dragons[1]!.id);
    expect(record.arrangement).toEqual(arrangement);
  });

  it('uses planning semantics without silently converting to current-roster mode', () => {
    const roster = progressedRoster();
    const library = createSavedFormation(createEmptySavedFormationLibrary(), { name: 'Plan', arrangement, evaluationMode: 'planning', source: 'formation-builder', roster, id: deterministicId(9) });
    const result = evaluateSavedFormation({ record: library.formations[0]!, roster });
    expect(result.record.evaluationMode).toBe('planning');
    expect(Object.values(result.record.savedProgressionByDragonId).every((entry) => entry.starRank === 10 && Object.values(entry.activeHabitLevels).every((level) => level === 5))).toBe(true);
  });
});

describe('Saved Formation import and export', () => {
  it('round-trips exports without privacy fields', () => {
    const json = serializeSavedFormationExport(oneLibrary(), '2026-08-01T12:00:00.000Z');
    const parsed = validateSavedFormationImport(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.formations).toHaveLength(1);
    expect(json).not.toMatch(/email|userId|user_id/);
  });

  it('imports schema 1 unreserved and round-trips schema 2 reservations', () => {
    const library = oneLibrary();
    const legacyRecord = withoutReserved(library.formations[0]!);
    const legacyJson = JSON.stringify({ format: library.format, schemaVersion: 1, exportedAt: library.updatedAt, formations: [legacyRecord] });
    expect(validateSavedFormationImport(legacyJson).formations?.[0]!.reserved).toBe(false);
    const reserved = setFormationReserved(library, library.formations[0]!.id, true);
    const roundTrip = validateSavedFormationImport(serializeSavedFormationExport(reserved));
    expect(roundTrip.formations?.[0]!.reserved).toBe(true);
  });

  it('requires explicit merge and replace decisions for reservation conflicts', () => {
    const roster = progressedRoster();
    const existing = setFormationReserved(oneLibrary(roster), deterministicId(0), true);
    let importedLibrary = createSavedFormation(createEmptySavedFormationLibrary(), {
      name: 'Imported overlap', arrangement: { 'left-flank': arrangement['left-flank'], vanguard: dragons[3]!.id, 'right-flank': dragons[4]!.id },
      evaluationMode: 'current-roster', source: 'formation-builder', roster, id: deterministicId(30),
    });
    importedLibrary = setFormationReserved(importedLibrary, deterministicId(30), true);
    const preview = previewSavedFormationMerge(existing, importedLibrary.formations);
    expect(preview.reservationConflicts[0]).toMatchObject({ imported: { name: 'Imported overlap' }, existing: { name: 'Alpha' } });
    expect(preview.reservationConflicts[0]!.conflictingDragonIds).toEqual([arrangement['left-flank']]);
    expect(() => mergeSavedFormationImport(existing, preview, false)).toThrow(/choose/i);
    expect(mergeSavedFormationImport(existing, preview, false, new Date().toISOString(), { [deterministicId(30)]: 'unreserved' }).formations[1]!.reserved).toBe(false);
    expect(mergeSavedFormationImport(existing, preview, false, new Date().toISOString(), { [deterministicId(30)]: 'skip' }).formations).toHaveLength(1);

    const overlappingLater = { ...importedLibrary.formations[0]!, id: deterministicId(31), name: 'Later overlap' };
    const replacement = [importedLibrary.formations[0]!, overlappingLater];
    expect(previewSavedFormationReplace(replacement)).toHaveLength(1);
    expect(() => replaceSavedFormationImport(existing, replacement)).toThrow(/resolve/i);
    expect(replaceSavedFormationImport(existing, replacement, new Date().toISOString(), { [deterministicId(31)]: 'unreserved' }).formations[1]!.reserved).toBe(false);
  });

  it('previews merge collisions and exact duplicates before committing', () => {
    const library = oneLibrary();
    const source = library.formations[0]!;
    const identical = { ...source };
    const collision = { ...source, name: 'Different content' };
    const exact = { ...source, id: deterministicId(12), name: 'Exact placement copy' };
    const preview = previewSavedFormationMerge(library, [identical, collision, exact]);
    expect(preview.unchangedIdCount).toBe(1);
    expect(preview.idCollisionCount).toBe(1);
    expect(preview.exactDuplicates).toHaveLength(2);
    expect(mergeSavedFormationImport(library, preview, false).formations).toHaveLength(1);
    expect(mergeSavedFormationImport(library, preview, true).formations).toHaveLength(3);
  });

  it('replaces only after explicit service selection and rejects maximum overflow', () => {
    const library = oneLibrary();
    expect(replaceSavedFormationImport(library, []).formations).toHaveLength(0);
    const tooMany = Array.from({ length: 51 }, (_, index) => ({ ...library.formations[0]!, id: deterministicId(index) }));
    expect(() => replaceSavedFormationImport(library, tooMany)).toThrow(/50/);
  });
});

function oneLibrary(roster = progressedRoster()): SavedFormationLibrary {
  return createSavedFormation(createEmptySavedFormationLibrary('2026-08-01T00:00:00.000Z'), {
    name: 'Alpha', arrangement, evaluationMode: 'current-roster', source: 'formation-builder', roster,
    now: '2026-08-01T00:01:00.000Z', id: deterministicId(0),
  });
}

function progressedRoster(): Record<string, OwnedDragon> {
  const roster = createEmptyRoster(dragons);
  for (const dragon of dragons.slice(0, 3)) {
    const entry = applyOwnedDragonPatch(dragon, roster[dragon.id]!, { owned: true, starRank: 10, reignLevel: 50 });
    for (const habit of dragon.habits) entry.habitLevels[habit.id] = 3;
    roster[dragon.id] = entry;
  }
  return roster;
}

function deterministicId(index: number) {
  return `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

function withoutReserved(record: SavedFormationRecord): Omit<SavedFormationRecord, 'reserved'> {
  const clone: Partial<SavedFormationRecord> = { ...record };
  delete clone.reserved;
  return clone as Omit<SavedFormationRecord, 'reserved'>;
}

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(SAVED_FORMATIONS_STORAGE_KEY, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}
