import {
  MAX_SAVED_FORMATIONS,
  MAX_SAVED_FORMATION_NAME_LENGTH,
  SAVED_FORMATIONS_STORAGE_KEY,
  SAVED_FORMATION_LIBRARY_FORMAT,
  SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
} from './types';

export const HISTORICAL_SAVED_FORMATION_SCHEMA_1_CONTRACT_DESCRIPTOR = JSON.stringify({
  format: SAVED_FORMATION_LIBRARY_FORMAT,
  schemaVersion: 1,
  storageKey: SAVED_FORMATIONS_STORAGE_KEY,
  maximumRecords: MAX_SAVED_FORMATIONS,
  maximumNameLength: MAX_SAVED_FORMATION_NAME_LENGTH,
  arrangementPositions: ['left-flank', 'vanguard', 'right-flank'],
  evaluationModes: ['current-roster', 'planning'],
  sources: ['formation-builder', 'optimizer'],
  semanticOrder: true,
  derivedValuesPersisted: false,
});

export const HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY = fnv1a64(HISTORICAL_SAVED_FORMATION_SCHEMA_1_CONTRACT_DESCRIPTOR);
export const EXPECTED_HISTORICAL_SAVED_FORMATION_SCHEMA_1_AUDIT_IDENTITY = 'fnv1a64:1e1f6e4c02946489' as const;

export const SAVED_FORMATION_LIBRARY_CONTRACT_DESCRIPTOR = JSON.stringify({
  format: SAVED_FORMATION_LIBRARY_FORMAT,
  schemaVersion: SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
  storageKey: SAVED_FORMATIONS_STORAGE_KEY,
  maximumRecords: MAX_SAVED_FORMATIONS,
  maximumNameLength: MAX_SAVED_FORMATION_NAME_LENGTH,
  arrangementPositions: ['left-flank', 'vanguard', 'right-flank'],
  evaluationModes: ['current-roster', 'planning'],
  sources: ['formation-builder', 'optimizer'],
  reservationState: 'formation-record-boolean',
  reservationScope: 'all-three-arrangement-dragons',
  semanticOrder: true,
  derivedValuesPersisted: false,
});

export const SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY = fnv1a64(SAVED_FORMATION_LIBRARY_CONTRACT_DESCRIPTOR);
export const EXPECTED_SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY = 'fnv1a64:3253fbb091d67237' as const;

export const SAVED_FORMATION_RESERVATION_INVARIANT_DESCRIPTOR = JSON.stringify({
  version: 'saved-formation-reservations-v1',
  reservableEvaluationMode: 'current-roster',
  reservedDragonScope: 'all-three-exact-arrangement-identities',
  maximumReservedOwnersPerDragon: 1,
  reservationSurvivesOwnershipLoss: true,
  duplicateDefaultsReserved: false,
  optimizerSavedDefaultsReserved: false,
  canonicalDragonIdOrder: true,
});
export const SAVED_FORMATION_RESERVATION_AUDIT_IDENTITY = fnv1a64(SAVED_FORMATION_RESERVATION_INVARIANT_DESCRIPTOR);
export const EXPECTED_SAVED_FORMATION_RESERVATION_AUDIT_IDENTITY = 'fnv1a64:0afe66181d1e7fe3' as const;

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
