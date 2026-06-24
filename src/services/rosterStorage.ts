import type { Dragon, OwnedDragon } from '../models/dragon';

export const STORAGE_KEY = 'dragonfire-roster-lab:roster';
export const TEAM_STORAGE_KEY = 'dragonfire-roster-lab:last-team';
export const FORMATION_STORAGE_KEY = 'dragonfire-roster-lab:last-formation';
export const ROSTER_SCHEMA_VERSION = 2;
export const MAX_NOTES_LENGTH = 1000;

export interface StoredRoster {
  format: 'dragonfire-roster-lab-local';
  schemaVersion: number;
  updatedAt: string;
  roster: OwnedDragon[];
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

type HabitLevel = OwnedDragon['habitLevels'][string];

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
        habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, null])),
      },
    ]),
  );
}

export function normalizeRoster(
  dragons: Dragon[],
  partial: Partial<OwnedDragon>[] = [],
): Record<string, OwnedDragon> {
  const next = createEmptyRoster(dragons);
  const validIds = new Set(dragons.map((dragon) => dragon.id));

  for (const entry of partial) {
    if (typeof entry.dragonId !== 'string' || !validIds.has(entry.dragonId)) {
      continue;
    }

    next[entry.dragonId] = {
      dragonId: entry.dragonId,
      owned: entry.owned === true,
      starRank: isValidStarRank(entry.starRank) ? entry.starRank : null,
      reignLevel: isValidReignLevel(entry.reignLevel) ? entry.reignLevel : null,
      notes: typeof entry.notes === 'string' ? clampText(entry.notes) : '',
      habitLevels: normalizeHabitLevels(dragonHabitIds(entry.dragonId, dragons), entry.habitLevels),
    };
  }

  return next;
}

export function loadRoster(storage: Storage, dragons: Dragon[]): Record<string, OwnedDragon> {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyRoster(dragons);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredRoster>;
    if (parsed.format !== 'dragonfire-roster-lab-local' || !Array.isArray(parsed.roster)) {
      return createEmptyRoster(dragons);
    }

    if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== ROSTER_SCHEMA_VERSION) {
      return createEmptyRoster(dragons);
    }

    return normalizeRoster(dragons, parsed.roster);
  } catch {
    return createEmptyRoster(dragons);
  }
}

export function saveRoster(storage: Storage, roster: Record<string, OwnedDragon>): void {
  const payload: StoredRoster = {
    format: 'dragonfire-roster-lab-local',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    roster: Object.values(roster),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function serializeRosterExport(roster: Record<string, OwnedDragon>): string {
  const payload: RosterExport = {
    format: 'dragonfire-roster-lab',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    roster: Object.values(roster),
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

  if (parsed.schemaVersion !== ROSTER_SCHEMA_VERSION) {
    errors.push('Unsupported roster schema version.');
  }

  if (!Array.isArray(parsed.roster)) {
    errors.push('Roster must be an array.');
  }

  if (errors.length > 0 || !Array.isArray(parsed.roster)) {
    return { ok: false, errors };
  }

  const validIds = new Set(dragons.map((dragon) => dragon.id));
  const imported: OwnedDragon[] = [];

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

    if (typeof entry.owned !== 'boolean') {
      errors.push(`${dragonId}: owned must be true or false.`);
    }

    if (!isValidStarRank(entry.starRank)) {
      errors.push(`${dragonId}: starRank must be null or an integer from 1 through 10.`);
    }

    if (!isValidReignLevel(entry.reignLevel)) {
      errors.push(`${dragonId}: reignLevel must be null or a nonnegative integer.`);
    }

    if (typeof entry.notes !== 'string') {
      errors.push(`${dragonId}: notes must be text.`);
    } else if (entry.notes.length > MAX_NOTES_LENGTH) {
      errors.push(`${dragonId}: notes must be ${MAX_NOTES_LENGTH} characters or fewer.`);
    }

    if (!isValidHabitLevelRecord(entry.habitLevels, dragonHabitIds(dragonId, dragons))) {
      errors.push(`${dragonId}: habitLevels must contain null or integers from 0 through 5.`);
    }

    if (errors.length === 0) {
      imported.push({
        dragonId,
        owned: entry.owned as boolean,
        starRank: entry.starRank as number | null,
        reignLevel: entry.reignLevel as number | null,
        notes: entry.notes as string,
        habitLevels: normalizeHabitLevels(dragonHabitIds(dragonId, dragons), entry.habitLevels),
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

export function isValidHabitLevel(value: unknown): value is HabitLevel {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5);
}

function dragonHabitIds(dragonId: string, dragons: Dragon[]): string[] {
  return dragons.find((dragon) => dragon.id === dragonId)?.habits.map((habit) => habit.id) ?? [];
}

function normalizeHabitLevels(
  habitIds: string[],
  value: unknown,
): Record<string, 0 | 1 | 2 | 3 | 4 | 5 | null> {
  const provided = isRecord(value) ? value : {};
  return Object.fromEntries(
    habitIds.map((habitId) => {
      const habitLevel = provided[habitId];
      return [habitId, isValidHabitLevel(habitLevel) ? habitLevel : null];
    }),
  );
}

function isValidHabitLevelRecord(value: unknown, habitIds: string[]): boolean {
  if (habitIds.length === 0) {
    return value === undefined || isRecord(value);
  }
  if (!isRecord(value)) {
    return false;
  }
  return habitIds.every((habitId) => isValidHabitLevel(value[habitId]));
}
