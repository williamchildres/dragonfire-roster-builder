import { dragons } from '../data/dragons';
import { FORMATION_POSITIONS, type Dragon, type HabitLevel } from '../models/dragon';
import { isHabitLevel } from '../services/habitLevels';
import { isValidReignLevel, isValidStarRank } from '../services/rosterStorage';
import type { FormationArrangement } from '../services/formationArrangement';
import {
  MAX_SAVED_FORMATIONS,
  MAX_SAVED_FORMATION_NAME_LENGTH,
  SAVED_FORMATION_LIBRARY_FORMAT,
  SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
  type SavedFormationEvaluationMode,
  type SavedFormationLibrary,
  type SavedFormationLibraryLoadResult,
  type SavedFormationProgressionEntry,
  type SavedFormationRecord,
  type SavedFormationSource,
} from './types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createEmptySavedFormationLibrary(now = new Date().toISOString()): SavedFormationLibrary {
  return {
    format: SAVED_FORMATION_LIBRARY_FORMAT,
    schemaVersion: SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
    updatedAt: now,
    formations: [],
  };
}

export function parseSavedFormationLibrary(
  value: unknown,
  canonicalDragons: readonly Dragon[] = dragons,
): SavedFormationLibraryLoadResult {
  const fallback = createEmptySavedFormationLibrary();
  if (!isRecord(value)) {
    return { library: fallback, warnings: ['Saved Formations data must be a JSON object.'], rejectedRecordCount: 0 };
  }
  if (value.format !== SAVED_FORMATION_LIBRARY_FORMAT) {
    return { library: fallback, warnings: ['Unsupported Saved Formations format.'], rejectedRecordCount: 0 };
  }
  if (value.schemaVersion !== SAVED_FORMATION_LIBRARY_SCHEMA_VERSION) {
    return { library: fallback, warnings: ['Unsupported Saved Formations schema version.'], rejectedRecordCount: 0 };
  }
  if (!isTimestamp(value.updatedAt) || !Array.isArray(value.formations)) {
    return { library: fallback, warnings: ['Saved Formations library metadata is invalid.'], rejectedRecordCount: 0 };
  }

  const warnings: string[] = [];
  const formations: SavedFormationRecord[] = [];
  const seenIds = new Set<string>();
  const input = value.formations.slice(0, MAX_SAVED_FORMATIONS);
  if (value.formations.length > MAX_SAVED_FORMATIONS) {
    warnings.push(`Only the first ${MAX_SAVED_FORMATIONS} saved formations were loaded.`);
  }
  input.forEach((record, index) => {
    const parsed = parseSavedFormationRecord(record, canonicalDragons);
    if (!parsed.ok) {
      warnings.push(`Saved formation ${index + 1} was skipped: ${parsed.error}`);
      return;
    }
    if (seenIds.has(parsed.record.id)) {
      warnings.push(`Saved formation ${index + 1} was skipped because its ID is duplicated.`);
      return;
    }
    seenIds.add(parsed.record.id);
    formations.push(parsed.record);
  });

  return {
    library: normalizeSavedFormationLibrary({
      format: SAVED_FORMATION_LIBRARY_FORMAT,
      schemaVersion: SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
      updatedAt: value.updatedAt,
      formations,
    }),
    warnings,
    rejectedRecordCount: input.length - formations.length,
  };
}

export function parseSavedFormationRecord(
  value: unknown,
  canonicalDragons: readonly Dragon[] = dragons,
): { ok: true; record: SavedFormationRecord } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: 'record must be an object.' };
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!isSavedFormationId(value.id)) return { ok: false, error: 'ID is invalid.' };
  if (!name || name.length > MAX_SAVED_FORMATION_NAME_LENGTH) {
    return { ok: false, error: `name must contain 1–${MAX_SAVED_FORMATION_NAME_LENGTH} characters.` };
  }
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) {
    return { ok: false, error: 'timestamps are invalid.' };
  }
  if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
    return { ok: false, error: 'updatedAt cannot be earlier than createdAt.' };
  }
  if (!isEvaluationMode(value.evaluationMode)) return { ok: false, error: 'evaluation mode is invalid.' };
  if (!isSource(value.source)) return { ok: false, error: 'source is invalid.' };
  const arrangement = parseArrangement(value.arrangement, canonicalDragons);
  if (!arrangement.ok) return arrangement;
  if (!isRecord(value.savedProgressionByDragonId)) {
    return { ok: false, error: 'progression snapshot must be an object.' };
  }
  const progression: Record<string, SavedFormationProgressionEntry> = {};
  for (const dragonId of FORMATION_POSITIONS.map((position) => arrangement.arrangement[position])) {
    const entry = parseProgressionEntry(value.savedProgressionByDragonId[dragonId], canonicalDragons.find((dragon) => dragon.id === dragonId));
    if (!entry.ok) return { ok: false, error: `${dragonId}: ${entry.error}` };
    progression[dragonId] = entry.entry;
  }
  const extraProgressionIds = Object.keys(value.savedProgressionByDragonId).filter((id) => !(id in progression));
  if (extraProgressionIds.length > 0) return { ok: false, error: 'progression snapshot contains dragons outside the arrangement.' };

  return {
    ok: true,
    record: {
      id: value.id,
      name,
      arrangement: arrangement.arrangement,
      evaluationMode: value.evaluationMode,
      source: value.source,
      savedProgressionByDragonId: progression,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    },
  };
}

export function normalizeSavedFormationLibrary(library: SavedFormationLibrary): SavedFormationLibrary {
  return {
    format: SAVED_FORMATION_LIBRARY_FORMAT,
    schemaVersion: SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
    updatedAt: library.updatedAt,
    formations: library.formations.map(normalizeSavedFormationRecord),
  };
}

export function normalizeSavedFormationRecord(record: SavedFormationRecord): SavedFormationRecord {
  const progression = Object.fromEntries(
    FORMATION_POSITIONS.map((position) => {
      const dragonId = record.arrangement[position];
      const entry = record.savedProgressionByDragonId[dragonId];
      if (!entry) throw new Error(`Missing saved progression for ${dragonId}.`);
      return [dragonId, {
        owned: entry.owned,
        starRank: entry.starRank,
        dragonLevel: entry.dragonLevel,
        activeHabitLevels: Object.fromEntries(Object.entries(entry.activeHabitLevels).sort(([a], [b]) => a.localeCompare(b))),
      }];
    }),
  );
  return {
    id: record.id,
    name: record.name.trim().slice(0, MAX_SAVED_FORMATION_NAME_LENGTH),
    arrangement: {
      'left-flank': record.arrangement['left-flank'],
      vanguard: record.arrangement.vanguard,
      'right-flank': record.arrangement['right-flank'],
    },
    evaluationMode: record.evaluationMode,
    source: record.source,
    savedProgressionByDragonId: progression,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function isSavedFormationId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function generateSavedFormationId(randomUUID?: () => string): string {
  const native = randomUUID ?? globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (native) return native();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function parseArrangement(value: unknown, canonicalDragons: readonly Dragon[]): { ok: true; arrangement: FormationArrangement } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: 'arrangement must be an object.' };
  const validIds = new Set(canonicalDragons.map((dragon) => dragon.id));
  const ids: string[] = [];
  for (const position of FORMATION_POSITIONS) {
    const dragonId = value[position];
    if (typeof dragonId !== 'string' || !validIds.has(dragonId)) return { ok: false, error: `${position} has an unknown dragon ID.` };
    ids.push(dragonId);
  }
  if (new Set(ids).size !== 3) return { ok: false, error: 'arrangement must contain three distinct dragons.' };
  if (Object.keys(value).some((key) => !FORMATION_POSITIONS.includes(key as typeof FORMATION_POSITIONS[number]))) {
    return { ok: false, error: 'arrangement contains an unknown position.' };
  }
  return { ok: true, arrangement: {
    'left-flank': value['left-flank'] as string,
    vanguard: value.vanguard as string,
    'right-flank': value['right-flank'] as string,
  } };
}

function parseProgressionEntry(value: unknown, dragon: Dragon | undefined): { ok: true; entry: SavedFormationProgressionEntry } | { ok: false; error: string } {
  if (!dragon || !isRecord(value)) return { ok: false, error: 'progression entry is invalid.' };
  if (typeof value.owned !== 'boolean' || !isValidStarRank(value.starRank) || !isValidReignLevel(value.dragonLevel)) {
    return { ok: false, error: 'ownership, Star Rank, or Dragon Level is invalid.' };
  }
  if (!isRecord(value.activeHabitLevels)) return { ok: false, error: 'active Habit Levels must be an object.' };
  const validHabitIds = new Set(dragon.habits.map((habit) => habit.id));
  const activeHabitLevels: Record<string, HabitLevel | null> = {};
  for (const [habitId, level] of Object.entries(value.activeHabitLevels).sort(([a], [b]) => a.localeCompare(b))) {
    if (!validHabitIds.has(habitId) || !(level === null || isHabitLevel(level))) {
      return { ok: false, error: 'active Habit Levels contain an unknown Habit or invalid level.' };
    }
    activeHabitLevels[habitId] = level;
  }
  return { ok: true, entry: {
    owned: value.owned,
    starRank: value.starRank,
    dragonLevel: value.dragonLevel,
    activeHabitLevels,
  } };
}

function isEvaluationMode(value: unknown): value is SavedFormationEvaluationMode {
  return value === 'current-roster' || value === 'planning';
}

function isSource(value: unknown): value is SavedFormationSource {
  return value === 'formation-builder' || value === 'optimizer';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
