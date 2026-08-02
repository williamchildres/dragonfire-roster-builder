import type { HabitLevel } from '../models/dragon';
import type { FormationArrangement } from '../services/formationArrangement';

export const SAVED_FORMATION_LIBRARY_SCHEMA_VERSION = 1 as const;
export const SAVED_FORMATION_LIBRARY_FORMAT = 'dragonfire-lab-saved-formations' as const;
export const SAVED_FORMATIONS_STORAGE_KEY = 'dragonfire-roster-lab:saved-formations' as const;
export const MAX_SAVED_FORMATIONS = 50 as const;
export const MAX_SAVED_FORMATION_NAME_LENGTH = 80 as const;

export type SavedFormationEvaluationMode = 'current-roster' | 'planning';
export type SavedFormationSource = 'formation-builder' | 'optimizer';

export interface SavedFormationProgressionEntry {
  owned: boolean;
  starRank: number | null;
  dragonLevel: number | null;
  activeHabitLevels: Readonly<Record<string, HabitLevel | null>>;
}

export interface SavedFormationRecord {
  id: string;
  name: string;
  arrangement: FormationArrangement;
  evaluationMode: SavedFormationEvaluationMode;
  source: SavedFormationSource;
  savedProgressionByDragonId: Record<string, SavedFormationProgressionEntry>;
  createdAt: string;
  updatedAt: string;
}

export interface SavedFormationLibrary {
  format: typeof SAVED_FORMATION_LIBRARY_FORMAT;
  schemaVersion: typeof SAVED_FORMATION_LIBRARY_SCHEMA_VERSION;
  updatedAt: string;
  formations: SavedFormationRecord[];
}

export type SavedFormationProgressionStatus = 'unchanged' | 'changed' | 'unavailable';

export interface SavedFormationProgressionChange {
  dragonId: string;
  field: 'owned' | 'starRank' | 'dragonLevel' | 'habitLevel';
  habitId?: string;
  before: boolean | number | null;
  after: boolean | number | null;
}

export interface SavedFormationProgressionComparison {
  status: SavedFormationProgressionStatus;
  changes: SavedFormationProgressionChange[];
  unavailableDragonIds: string[];
  missingDataByDragonId: Record<string, string[]>;
}

export interface SavedFormationLibraryLoadResult {
  library: SavedFormationLibrary;
  warnings: string[];
  rejectedRecordCount: number;
}

export interface SavedFormationStorageWriteResult {
  ok: boolean;
  error?: string;
}

export interface SavedFormationExport {
  format: typeof SAVED_FORMATION_LIBRARY_FORMAT;
  schemaVersion: typeof SAVED_FORMATION_LIBRARY_SCHEMA_VERSION;
  exportedAt: string;
  formations: SavedFormationRecord[];
}
