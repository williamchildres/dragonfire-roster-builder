import { parseSavedFormationLibrary, normalizeSavedFormationLibrary } from '../savedFormations/contract';
import {
  SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
  type SavedFormationLibrary,
} from '../savedFormations/types';
import {
  InvalidCloudSavedFormationError,
  type CloudSavedFormationRecord,
  UnsupportedSavedFormationSchemaError,
} from './types';

type CloudSavedFormationRow = {
  user_id: unknown;
  formations_schema_version: unknown;
  formations: unknown;
  client_updated_at: unknown;
  updated_at: unknown;
};

export function parseCloudSavedFormationRow(value: unknown): CloudSavedFormationRecord {
  if (!isRecord(value)) throw new InvalidCloudSavedFormationError();
  const row = value as CloudSavedFormationRow;
  if (!Number.isInteger(row.formations_schema_version)) throw new InvalidCloudSavedFormationError();
  const schemaVersion = Number(row.formations_schema_version);
  if (schemaVersion !== SAVED_FORMATION_LIBRARY_SCHEMA_VERSION) throw new UnsupportedSavedFormationSchemaError(schemaVersion);
  if (typeof row.user_id !== 'string' || !isTimestamp(row.updated_at) || !(row.client_updated_at === null || isTimestamp(row.client_updated_at))) {
    throw new InvalidCloudSavedFormationError();
  }
  const parsed = parseSavedFormationLibrary(row.formations);
  if (parsed.warnings.length > 0 || parsed.rejectedRecordCount > 0) throw new InvalidCloudSavedFormationError();
  return {
    userId: row.user_id,
    schemaVersion,
    library: parsed.library,
    clientUpdatedAt: row.client_updated_at,
    updatedAt: row.updated_at,
  };
}

export function serializeCloudSavedFormationLibrary(library: SavedFormationLibrary): SavedFormationLibrary {
  return normalizeSavedFormationLibrary(library);
}

export function savedFormationLibraryFingerprint(library: SavedFormationLibrary): string {
  return JSON.stringify(normalizeSavedFormationLibrary(library).formations);
}

export function summarizeSavedFormationLibrary(library: SavedFormationLibrary) {
  return {
    count: library.formations.length,
    names: library.formations.slice(0, 5).map((record) => record.name),
  };
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
