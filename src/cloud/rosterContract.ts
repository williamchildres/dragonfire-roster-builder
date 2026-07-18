import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import {
  isValidHabitLevel,
  isValidReignLevel,
  isValidStarRank,
  MAX_NOTES_LENGTH,
  normalizeRoster,
  ROSTER_SCHEMA_VERSION,
} from '../services/rosterStorage';
import {
  InvalidCloudRosterError,
  type CloudRosterRecord,
  UnsupportedRosterSchemaError,
} from './types';

type CloudRosterRow = {
  user_id: unknown;
  roster_schema_version: unknown;
  roster: unknown;
  client_updated_at: unknown;
  updated_at: unknown;
};

export function parseCloudRosterRow(value: unknown): CloudRosterRecord {
  if (!isRecord(value)) {
    throw new InvalidCloudRosterError();
  }

  const row = value as CloudRosterRow;
  if (!Number.isInteger(row.roster_schema_version)) {
    throw new InvalidCloudRosterError();
  }
  const schemaVersion = Number(row.roster_schema_version);
  if (schemaVersion !== 4 && schemaVersion !== ROSTER_SCHEMA_VERSION) {
    throw new UnsupportedRosterSchemaError(schemaVersion);
  }
  if (
    typeof row.user_id !== 'string' ||
    !Array.isArray(row.roster) ||
    !isTimestamp(row.updated_at) ||
    !(row.client_updated_at === null || isTimestamp(row.client_updated_at))
  ) {
    throw new InvalidCloudRosterError();
  }

  const knownDragonIds = new Set(dragons.map((dragon) => dragon.id));
  const entries: Record<string, unknown>[] = [];
  for (const entry of row.roster) {
    if (!isRecord(entry) || typeof entry.dragonId !== 'string') {
      throw new InvalidCloudRosterError();
    }
    if (knownDragonIds.has(entry.dragonId)) {
      entries.push(entry);
    }
  }

  if (!entries.every((entry) => isValidRosterEntry(entry, schemaVersion))) {
    throw new InvalidCloudRosterError();
  }

  return {
    userId: row.user_id,
    rosterSchemaVersion: schemaVersion,
    roster: normalizeRoster(dragons, entries),
    clientUpdatedAt: row.client_updated_at,
    updatedAt: row.updated_at,
  };
}

export function serializeCloudRoster(roster: Record<string, OwnedDragon>): OwnedDragon[] {
  return Object.values(normalizeRoster(dragons, Object.values(roster)));
}

export function rosterFingerprint(roster: Record<string, OwnedDragon>): string {
  return JSON.stringify(serializeCloudRoster(roster));
}

export function hasMeaningfulRosterData(roster: Record<string, OwnedDragon>): boolean {
  return Object.values(roster).some(
    (entry) =>
      entry.owned ||
      entry.starRank !== null ||
      entry.reignLevel !== null ||
      entry.notes.trim().length > 0 ||
      Object.keys(entry.habitLevels).length > 0,
  );
}

export function summarizeRoster(roster: Record<string, OwnedDragon>) {
  const entries = Object.values(roster);
  return {
    owned: entries.filter((entry) => entry.owned).length,
    starRanks: entries.filter((entry) => entry.starRank !== null).length,
    dragonLevels: entries.filter((entry) => entry.reignLevel !== null).length,
    habitLevels: entries.reduce(
      (total, entry) => total + Object.keys(entry.habitLevels).length,
      0,
    ),
  };
}

function isValidRosterEntry(value: Record<string, unknown>, schemaVersion: number): boolean {
  return (
    typeof value.dragonId === 'string' &&
    typeof value.owned === 'boolean' &&
    isValidStarRank(value.starRank) &&
    isValidReignLevel(value.reignLevel) &&
    typeof value.notes === 'string' &&
    value.notes.length <= MAX_NOTES_LENGTH &&
    isRecord(value.habitLevels) &&
    Object.values(value.habitLevels).every((level) => schemaVersion === ROSTER_SCHEMA_VERSION
      ? isValidHabitLevel(level)
      : level === null || (Number.isInteger(level) && Number(level) >= 0 && Number(level) <= 5))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
