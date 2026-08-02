import type { Dragon, OwnedDragon } from '../models/dragon';
import type { SavedFormationLibrary } from '../savedFormations/types';
import { arrangementDragonIds, getReservedDragonIds, getReservedFormationRecords } from '../savedFormations/reservations';
import { maximumOptimizerFormationCount } from './rosterOptimizerCount';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  stableHash,
} from './rosterOptimizerCandidates';
import type { OptimizerAllocationMode } from './rosterOptimizerTypes';

export const OPTIMIZER_RESERVATION_CONTEXT_VERSION = 'optimizer-reservation-context-v1' as const;

export interface ReservedOptimizerProjection {
  effectiveRoster: Record<string, OwnedDragon>;
  reservedDragonIds: string[];
  resolvedExcludedDragonIds: string[];
  unavailableReservedDragonIds: string[];
  eligibleBeforeExclusions: number;
  eligibleAfterExclusions: number;
  maximumFormationCount: number;
}

export interface OptimizerReservationRunContext {
  version: typeof OPTIMIZER_RESERVATION_CONTEXT_VERSION;
  fingerprint: string;
  exclusionEnabled: boolean;
  reservedFormationCount: number;
  reservedDragonCount: number;
  resolvedExcludedDragonIds: string[];
  unavailableReservedDragonIds: string[];
  eligibleDragonCount: number;
  requestedFormationCount: number;
  generatedFormationCount: number;
  reservations: Array<{
    dragonId: string;
    formationId: string;
    formationName: string;
    eligible: boolean;
  }>;
}

export function projectReservedOptimizerRoster({
  dragons,
  roster,
  library,
  exclusionEnabled,
}: {
  dragons: Dragon[];
  roster: Readonly<Record<string, OwnedDragon>>;
  library: SavedFormationLibrary;
  exclusionEnabled: boolean;
}): ReservedOptimizerProjection {
  const effectiveRoster = Object.fromEntries(Object.entries(roster).map(([dragonId, entry]) => [
    dragonId,
    { ...entry, habitLevels: { ...entry.habitLevels } },
  ]));
  const reservedDragonIds = getReservedDragonIds(library);
  const beforeSnapshot = buildOptimizerRosterSnapshot(dragons, effectiveRoster);
  const eligibleIds = new Set(beforeSnapshot.map((dragon) => dragon.dragonId));
  const eligibleReservedIds = reservedDragonIds.filter((dragonId) => eligibleIds.has(dragonId));
  const resolvedExcludedDragonIds = exclusionEnabled ? eligibleReservedIds : [];
  if (exclusionEnabled) {
    for (const dragonId of resolvedExcludedDragonIds) {
      const entry = effectiveRoster[dragonId];
      if (entry) effectiveRoster[dragonId] = { ...entry, owned: false, habitLevels: { ...entry.habitLevels } };
    }
  }
  const eligibleAfterExclusions = beforeSnapshot.length - resolvedExcludedDragonIds.length;
  return {
    effectiveRoster,
    reservedDragonIds,
    resolvedExcludedDragonIds: [...resolvedExcludedDragonIds].sort((a, b) => a.localeCompare(b)),
    unavailableReservedDragonIds: reservedDragonIds.filter((dragonId) => !eligibleIds.has(dragonId)),
    eligibleBeforeExclusions: beforeSnapshot.length,
    eligibleAfterExclusions,
    maximumFormationCount: maximumOptimizerFormationCount(eligibleAfterExclusions),
  };
}

export function createOptimizerReservationContextFingerprint({
  exclusionEnabled,
  resolvedExcludedDragonIds,
  effectiveRosterFingerprint,
  allocationMode,
  formationCount,
  optimizerRequestFingerprint,
}: {
  exclusionEnabled: boolean;
  resolvedExcludedDragonIds: readonly string[];
  effectiveRosterFingerprint: string;
  allocationMode: OptimizerAllocationMode;
  formationCount: number;
  optimizerRequestFingerprint: string;
}): string {
  return stableHash(JSON.stringify({
    version: OPTIMIZER_RESERVATION_CONTEXT_VERSION,
    exclusionEnabled,
    resolvedExcludedDragonIds: [...resolvedExcludedDragonIds].sort((a, b) => a.localeCompare(b)),
    effectiveRosterFingerprint,
    allocationMode,
    formationCount,
    optimizerRequestFingerprint,
  }));
}

export function buildOptimizerReservationContextFingerprint({
  dragons,
  projection,
  exclusionEnabled,
  allocationMode,
  formationCount,
  optimizerRequestFingerprint,
}: {
  dragons: Dragon[];
  projection: ReservedOptimizerProjection;
  exclusionEnabled: boolean;
  allocationMode: OptimizerAllocationMode;
  formationCount: number;
  optimizerRequestFingerprint: string;
}): string {
  return createOptimizerReservationContextFingerprint({
    exclusionEnabled,
    resolvedExcludedDragonIds: projection.resolvedExcludedDragonIds,
    effectiveRosterFingerprint: createRosterOptimizerFingerprint(
      buildOptimizerRosterSnapshot(dragons, projection.effectiveRoster),
    ),
    allocationMode,
    formationCount,
    optimizerRequestFingerprint,
  });
}

export function reservationPresentationEntries(
  library: SavedFormationLibrary,
  projection: ReservedOptimizerProjection,
): OptimizerReservationRunContext['reservations'] {
  const unavailable = new Set(projection.unavailableReservedDragonIds);
  return getReservedFormationRecords(library).flatMap((record) =>
    arrangementDragonIds(record).map((dragonId) => ({
      dragonId,
      formationId: record.id,
      formationName: record.name,
      eligible: !unavailable.has(dragonId),
    })),
  );
}

export const OPTIMIZER_RESERVATION_CONTEXT_CONTRACT_DESCRIPTOR = JSON.stringify({
  version: OPTIMIZER_RESERVATION_CONTEXT_VERSION,
  inputs: [
    'exclusion-enabled',
    'sorted-resolved-excluded-dragon-ids',
    'effective-eligible-roster-fingerprint',
    'allocation-mode',
    'formation-count',
    'optimizer-v6-request-identity',
  ],
  excludes: ['formation-names', 'formation-order', 'unreserved-formations', 'ui-state', 'sync-state'],
  coreOptimizerContract: 6,
});
export const OPTIMIZER_RESERVATION_CONTEXT_AUDIT_IDENTITY = stableHash(OPTIMIZER_RESERVATION_CONTEXT_CONTRACT_DESCRIPTOR);
export const EXPECTED_OPTIMIZER_RESERVATION_CONTEXT_AUDIT_IDENTITY = 'fnv1a64:1eeea8e535b98658' as const;
