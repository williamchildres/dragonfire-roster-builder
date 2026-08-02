import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerRequestFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import {
  buildOptimizerReservationContextFingerprint,
  EXPECTED_OPTIMIZER_RESERVATION_CONTEXT_AUDIT_IDENTITY,
  OPTIMIZER_RESERVATION_CONTEXT_AUDIT_IDENTITY,
  projectReservedOptimizerRoster,
} from '../optimizer/reservedOptimizerProjection';
import type { OptimizerAllocationMode } from '../optimizer/rosterOptimizerTypes';
import { createEmptySavedFormationLibrary } from '../savedFormations/contract';
import { createSavedFormation, moveSavedFormation, renameSavedFormation } from '../savedFormations/crud';
import { setFormationReserved } from '../savedFormations/reservations';
import { createEmptyRoster } from '../services/rosterStorage';

describe('reserved optimizer eligibility projection', () => {
  it('locks the separate optimizer reservation-context identity', () => {
    expect(OPTIMIZER_RESERVATION_CONTEXT_AUDIT_IDENTITY).toBe(EXPECTED_OPTIMIZER_RESERVATION_CONTEXT_AUDIT_IDENTITY);
  });

  it('projects exactly the eligible reserved IDs without mutating the source roster', () => {
    const roster = ownedRoster(6);
    const source = structuredClone(roster);
    const library = reservedLibrary(roster);
    const projection = projectReservedOptimizerRoster({ dragons, roster, library, exclusionEnabled: true });
    expect(projection.reservedDragonIds).toEqual(dragonIds(0, 3).sort());
    expect(projection.resolvedExcludedDragonIds).toEqual(dragonIds(0, 3).sort());
    expect(projection.unavailableReservedDragonIds).toEqual([]);
    expect(projection.eligibleBeforeExclusions).toBe(6);
    expect(projection.eligibleAfterExclusions).toBe(3);
    expect(projection.maximumFormationCount).toBe(1);
    expect(projection.effectiveRoster).not.toBe(roster);
    expect(roster).toEqual(source);
    expect(buildOptimizerRosterSnapshot(dragons, projection.effectiveRoster).map((entry) => entry.dragonId)).toEqual(dragonIds(3, 6).sort());
  });

  it('passes original roster semantics through when exclusions are disabled or reservations are empty', () => {
    const roster = ownedRoster(6);
    const reserved = projectReservedOptimizerRoster({ dragons, roster, library: reservedLibrary(roster), exclusionEnabled: false });
    const empty = projectReservedOptimizerRoster({ dragons, roster, library: createEmptySavedFormationLibrary(), exclusionEnabled: true });
    const originalSnapshot = buildOptimizerRosterSnapshot(dragons, roster);
    expect(buildOptimizerRosterSnapshot(dragons, reserved.effectiveRoster)).toEqual(originalSnapshot);
    expect(buildOptimizerRosterSnapshot(dragons, empty.effectiveRoster)).toEqual(originalSnapshot);
    expect(reserved.resolvedExcludedDragonIds).toEqual([]);
    expect(empty.resolvedExcludedDragonIds).toEqual([]);
  });

  it('does not count unowned reserved dragons as excluded', () => {
    const roster = ownedRoster(6);
    roster[dragons[1]!.id]!.owned = false;
    const projection = projectReservedOptimizerRoster({ dragons, roster, library: reservedLibrary(roster), exclusionEnabled: true });
    expect(projection.resolvedExcludedDragonIds).toEqual([dragons[0]!.id, dragons[2]!.id].sort());
    expect(projection.unavailableReservedDragonIds).toEqual([dragons[1]!.id]);
    expect(projection.eligibleAfterExclusions).toBe(3);
  });

  it('keeps context stable for rename/reorder and changes it for exclusions or arrangement inputs', () => {
    const roster = ownedRoster(9);
    let library = reservedLibrary(roster);
    library = createSavedFormation(library, { name: 'Unreserved', arrangement: arrangement(3), evaluationMode: 'current-roster', source: 'formation-builder', roster, id: id(2) });
    const baseline = contextFingerprint(roster, library, true);
    expect(contextFingerprint(roster, renameSavedFormation(library, id(1), 'Renamed'), true)).toBe(baseline);
    expect(contextFingerprint(roster, moveSavedFormation(library, id(2), 'up'), true)).toBe(baseline);
    expect(contextFingerprint(roster, library, false)).not.toBe(baseline);
  });

  for (const mode of ['best-overall-first', 'strongest-first', 'balanced'] as OptimizerAllocationMode[]) {
    it(`${mode} never selects an excluded reserved dragon`, async () => {
      const roster = ownedRoster(6);
      const projection = projectReservedOptimizerRoster({ dragons, roster, library: reservedLibrary(roster), exclusionEnabled: true });
      const first = await optimizeCurrentRoster(projection.effectiveRoster, mode, 1);
      const second = await optimizeCurrentRoster(projection.effectiveRoster, mode, 1);
      expect(first.optimal).toBe(true);
      expect(second.optimal).toBe(true);
      if (!first.optimal) return;
      if (!second.optimal) return;
      expect(second.formations).toEqual(first.formations);
      expect(second.objective).toEqual(first.objective);
      expect(second.optimizerSolutionHash).toBe(first.optimizerSolutionHash);
      expect(second.optimizerResultHash).toBe(first.optimizerResultHash);
      expect(first.usedDragonIds.some((dragonId) => projection.resolvedExcludedDragonIds.includes(dragonId))).toBe(false);
      expect(new Set(first.usedDragonIds).size).toBe(first.usedDragonIds.length);
      expect(first.diagnostics.eligibleDragonCount).toBe(3);
    });
  }
});

function contextFingerprint(roster: Record<string, OwnedDragon>, library: ReturnType<typeof reservedLibrary>, exclusionEnabled: boolean) {
  const projection = projectReservedOptimizerRoster({ dragons, roster, library, exclusionEnabled });
  const snapshot = buildOptimizerRosterSnapshot(dragons, projection.effectiveRoster);
  const request = createRosterOptimizerRequestFingerprint(snapshot, 'best-overall-first', 1);
  return buildOptimizerReservationContextFingerprint({ dragons, projection, exclusionEnabled, allocationMode: 'best-overall-first', formationCount: 1, optimizerRequestFingerprint: request });
}

function reservedLibrary(roster: Record<string, OwnedDragon>) {
  const library = createSavedFormation(createEmptySavedFormationLibrary('2026-08-01T00:00:00.000Z'), {
    name: 'Reserved', arrangement: arrangement(0), evaluationMode: 'current-roster', source: 'formation-builder', roster, id: id(1), now: '2026-08-01T00:01:00.000Z',
  });
  return setFormationReserved(library, id(1), true, '2026-08-01T00:02:00.000Z');
}

function ownedRoster(count: number) {
  const roster = createEmptyRoster(dragons);
  dragons.slice(0, count).forEach((dragon) => {
    roster[dragon.id] = { ...roster[dragon.id]!, owned: true, starRank: 10, reignLevel: 50, habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 3])) };
  });
  return roster;
}

function arrangement(start: number) {
  return { 'left-flank': dragons[start]!.id, vanguard: dragons[start + 1]!.id, 'right-flank': dragons[start + 2]!.id };
}
function dragonIds(start: number, end: number) { return dragons.slice(start, end).map((dragon) => dragon.id); }
function id(value: number) { return `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`; }
