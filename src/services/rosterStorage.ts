import { dragons as canonicalDragons } from '../data/dragons';
import type { Dragon, OwnedDragon } from '../models/dragon';
import { isHabitLevel, reconcileHabitLevels } from './habitLevels';

export const STORAGE_KEY = 'dragonfire-roster-lab:roster';
export const TEAM_STORAGE_KEY = 'dragonfire-roster-lab:last-team';
export const FORMATION_STORAGE_KEY = 'dragonfire-roster-lab:last-formation';
export const ROSTER_SCHEMA_VERSION = 5;
export const MAX_NOTES_LENGTH = 1000;
const SUPPORTED_ROSTER_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, ROSTER_SCHEMA_VERSION]);

export interface StoredRoster {
  format: 'dragonfire-roster-lab-local';
  schemaVersion: number;
  updatedAt: string;
  roster: OwnedDragon[];
}

export interface StoredRosterSnapshot {
  roster: Record<string, OwnedDragon>;
  updatedAt: string | null;
}

export interface RosterExport {
  format: 'dragonfire-roster-lab';
  schemaVersion: number;
  exportedAt: string;
  roster: OwnedDragon[];
}

export interface ImportResult {
  ok: boolean;
  roster?: Record<string, OwnedDragon>;
  errors: string[];
}

type LegacyCollectionState = 'not-collected' | 'not-hatched' | 'hatched';
type LegacyCollectionProgress = {
  state?: unknown;
  shardsCurrent?: unknown;
  shardsRequired?: unknown;
};
type RosterImportEntry = Partial<OwnedDragon> & {
  collection?: LegacyCollectionProgress;
};

const clampText = (value: string) => value.slice(0, MAX_NOTES_LENGTH);

export function createEmptyRoster(dragons: Dragon[]): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon) => [
      dragon.id,
      {
        dragonId: dragon.id,
        owned: false,
        starRank: null,
        reignLevel: null,
        notes: '',
        habitLevels: {},
      },
    ]),
  );
}

export function normalizeRoster(
  dragons: Dragon[],
  partial: RosterImportEntry[] = [],
): Record<string, OwnedDragon> {
  const next = createEmptyRoster(dragons);
  const validIds = new Set(dragons.map((dragon) => dragon.id));

  for (const entry of partial) {
    if (typeof entry.dragonId !== 'string' || !validIds.has(entry.dragonId)) {
      continue;
    }

    const dragon = dragons.find((candidate) => candidate.id === entry.dragonId)!;
    next[entry.dragonId] = reconcileHabitLevels(dragon, {
      dragonId: entry.dragonId,
      owned: normalizeOwnedState(entry),
      starRank: isValidStarRank(entry.starRank) ? entry.starRank : null,
      reignLevel: isValidReignLevel(entry.reignLevel) ? entry.reignLevel : null,
      notes: typeof entry.notes === 'string' ? clampText(entry.notes) : '',
      habitLevels: entry.habitLevels,
    });
  }

  return next;
}

export function loadRoster(storage: Storage, dragons: Dragon[]): Record<string, OwnedDragon> {
  return loadStoredRosterSnapshot(storage, dragons).roster;
}

export function loadStoredRosterSnapshot(
  storage: Storage,
  dragons: Dragon[],
): StoredRosterSnapshot {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return { roster: createEmptyRoster(dragons), updatedAt: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredRoster>;
    if (parsed.format !== 'dragonfire-roster-lab-local' || !Array.isArray(parsed.roster)) {
      return { roster: createEmptyRoster(dragons), updatedAt: null };
    }

    if (!SUPPORTED_ROSTER_SCHEMA_VERSIONS.has(parsed.schemaVersion ?? 0)) {
      return { roster: createEmptyRoster(dragons), updatedAt: null };
    }

    return {
      roster: normalizeRoster(dragons, parsed.roster),
      updatedAt: isValidTimestamp(parsed.updatedAt) ? parsed.updatedAt : null,
    };
  } catch {
    return { roster: createEmptyRoster(dragons), updatedAt: null };
  }
}

export function saveRoster(storage: Storage, roster: Record<string, OwnedDragon>): void {
  saveRosterSnapshot(storage, roster, new Date().toISOString());
}

export function saveRosterSnapshot(
  storage: Storage,
  roster: Record<string, OwnedDragon>,
  updatedAt: string,
): void {
  const payload: StoredRoster = {
    format: 'dragonfire-roster-lab-local',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    updatedAt,
    roster: Object.values(normalizeRoster(canonicalDragons, Object.values(roster))),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function serializeRosterExport(roster: Record<string, OwnedDragon>): string {
  const payload: RosterExport = {
    format: 'dragonfire-roster-lab',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    roster: Object.values(normalizeRoster(canonicalDragons, Object.values(roster))),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function validateRosterImport(json: string, dragons: Dragon[]): ImportResult {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['The selected file is not valid JSON.'] };
  }

  if (!isRecord(parsed)) {
    return { ok: false, errors: ['The import must be a JSON object.'] };
  }

  if (parsed.format !== 'dragonfire-roster-lab') {
    errors.push('Unsupported roster format.');
  }

  const schemaVersion = Number(parsed.schemaVersion);
  if (!SUPPORTED_ROSTER_SCHEMA_VERSIONS.has(schemaVersion)) {
    errors.push('Unsupported roster schema version.');
  }

  if (!Array.isArray(parsed.roster)) {
    errors.push('Roster must be an array.');
  }

  if (errors.length > 0 || !Array.isArray(parsed.roster)) {
    return { ok: false, errors };
  }

  const validIds = new Set(dragons.map((dragon) => dragon.id));
  const imported: RosterImportEntry[] = [];

  parsed.roster.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`Roster entry ${index + 1} must be an object.`);
      return;
    }

    const dragonId = entry.dragonId;
    if (typeof dragonId !== 'string' || !validIds.has(dragonId)) {
      errors.push(`Roster entry ${index + 1} has an unknown dragon ID.`);
      return;
    }

    if (entry.owned !== undefined && typeof entry.owned !== 'boolean') {
      errors.push(`${dragonId}: owned must be true or false.`);
    }

    if (!isLegacyCollection(entry.collection)) {
      errors.push(`${dragonId}: collection must contain a valid state when provided.`);
    }

    if (entry.starRank !== undefined && !isValidStarRank(entry.starRank)) {
      errors.push(`${dragonId}: starRank must be null or an integer from 1 through 10.`);
    }

    if (entry.reignLevel !== undefined && !isValidReignLevel(entry.reignLevel)) {
      errors.push(`${dragonId}: reignLevel must be null or a nonnegative integer.`);
    }

    if (entry.notes !== undefined && typeof entry.notes !== 'string') {
      errors.push(`${dragonId}: notes must be text.`);
    } else if (typeof entry.notes === 'string' && entry.notes.length > MAX_NOTES_LENGTH) {
      errors.push(`${dragonId}: notes must be ${MAX_NOTES_LENGTH} characters or fewer.`);
    }

    if (!isValidHabitLevelRecord(entry.habitLevels, schemaVersion)) {
      errors.push(schemaVersion === ROSTER_SCHEMA_VERSION
        ? `${dragonId}: habitLevels values must be integers from 1 through 5.`
        : `${dragonId}: legacy habitLevels values must be null or integers from 0 through 5.`);
    }

    if (errors.length === 0) {
      imported.push({
        dragonId,
        owned: entry.owned as boolean | undefined,
        collection: entry.collection as LegacyCollectionProgress | undefined,
        starRank: entry.starRank as number | null | undefined,
        reignLevel: entry.reignLevel as number | null | undefined,
        notes: entry.notes as string | undefined,
        habitLevels: entry.habitLevels as OwnedDragon['habitLevels'] | undefined,
      });
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, roster: normalizeRoster(dragons, imported), errors: [] };
}

export function isValidStarRank(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 10);
}

export function isValidReignLevel(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function normalizeOwnedState(entry: RosterImportEntry): boolean {
  if (entry.owned === true) {
    return true;
  }

  return getLegacyCollectionState(entry.collection) === 'hatched';
}

function getLegacyCollectionState(value: unknown): LegacyCollectionState | null {
  if (!isRecord(value)) {
    return null;
  }

  return value.state === 'not-collected' || value.state === 'not-hatched' || value.state === 'hatched'
    ? value.state
    : null;
}

function isLegacyCollection(value: unknown): value is LegacyCollectionProgress | undefined {
  if (!isRecord(value)) {
    return value === undefined;
  }

  return getLegacyCollectionState(value) !== null;
}

export function isValidHabitLevel(value: unknown): value is OwnedDragon['habitLevels'][string] {
  return isHabitLevel(value);
}

function isValidHabitLevelRecord(value: unknown, schemaVersion: number): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.values(value).every((level) => schemaVersion === ROSTER_SCHEMA_VERSION
    ? isHabitLevel(level)
    : level === null || (Number.isInteger(level) && Number(level) >= 0 && Number(level) <= 5));
}
