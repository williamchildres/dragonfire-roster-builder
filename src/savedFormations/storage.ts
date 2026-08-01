import { dragons } from '../data/dragons';
import type { Dragon } from '../models/dragon';
import { createEmptySavedFormationLibrary, normalizeSavedFormationLibrary, parseSavedFormationLibrary } from './contract';
import {
  SAVED_FORMATIONS_STORAGE_KEY,
  type SavedFormationLibrary,
  type SavedFormationLibraryLoadResult,
  type SavedFormationStorageWriteResult,
} from './types';

export function loadSavedFormationLibrary(
  storage: Pick<Storage, 'getItem'>,
  canonicalDragons: readonly Dragon[] = dragons,
): SavedFormationLibraryLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVED_FORMATIONS_STORAGE_KEY);
  } catch {
    return {
      library: createEmptySavedFormationLibrary(),
      warnings: ['Saved Formations could not be read from browser storage.'],
      rejectedRecordCount: 0,
    };
  }
  if (!raw) return { library: createEmptySavedFormationLibrary(), warnings: [], rejectedRecordCount: 0 };
  try {
    return parseSavedFormationLibrary(JSON.parse(raw), canonicalDragons);
  } catch {
    return {
      library: createEmptySavedFormationLibrary(),
      warnings: ['Saved Formations data is malformed. Export or replace it to recover.'],
      rejectedRecordCount: 0,
    };
  }
}

export function serializeSavedFormationLibrary(library: SavedFormationLibrary, pretty = false): string {
  return JSON.stringify(normalizeSavedFormationLibrary(library), null, pretty ? 2 : undefined) + (pretty ? '\n' : '');
}

export function saveSavedFormationLibrary(
  storage: Pick<Storage, 'setItem'>,
  library: SavedFormationLibrary,
): SavedFormationStorageWriteResult {
  try {
    storage.setItem(SAVED_FORMATIONS_STORAGE_KEY, serializeSavedFormationLibrary(library));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Saved Formations could not be written to browser storage. Your last saved browser copy is unchanged.' };
  }
}
