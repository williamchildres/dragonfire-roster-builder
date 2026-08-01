import {
  MAX_SAVED_FORMATIONS,
  MAX_SAVED_FORMATION_NAME_LENGTH,
  SAVED_FORMATIONS_STORAGE_KEY,
  SAVED_FORMATION_LIBRARY_FORMAT,
  SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
} from './types';

export const SAVED_FORMATION_LIBRARY_CONTRACT_DESCRIPTOR = JSON.stringify({
  format: SAVED_FORMATION_LIBRARY_FORMAT,
  schemaVersion: SAVED_FORMATION_LIBRARY_SCHEMA_VERSION,
  storageKey: SAVED_FORMATIONS_STORAGE_KEY,
  maximumRecords: MAX_SAVED_FORMATIONS,
  maximumNameLength: MAX_SAVED_FORMATION_NAME_LENGTH,
  arrangementPositions: ['left-flank', 'vanguard', 'right-flank'],
  evaluationModes: ['current-roster', 'planning'],
  sources: ['formation-builder', 'optimizer'],
  semanticOrder: true,
  derivedValuesPersisted: false,
});

export const SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY = fnv1a64(SAVED_FORMATION_LIBRARY_CONTRACT_DESCRIPTOR);
export const EXPECTED_SAVED_FORMATION_LIBRARY_AUDIT_IDENTITY = 'fnv1a64:1e1f6e4c02946489' as const;

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
