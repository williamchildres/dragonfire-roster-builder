import { describe, expect, it } from 'vitest';
import { solveBalancedRosterOptimizer } from '../optimizer/rosterOptimizerBalancedSolver';
import {
  clampOptimizerFormationCount,
  defaultOptimizerFormationCount,
  maximumOptimizerFormationCount,
} from '../optimizer/rosterOptimizerCount';
import {
  compareStrongestFirstCandidates,
} from '../optimizer/rosterOptimizerObjective';
import { solveStrongestFirst } from '../optimizer/rosterOptimizerStrongestFirstSolver';
import type {
  OptimizerFormationCandidate,
  OptimizerRosterDragon,
} from '../optimizer/rosterOptimizerTypes';

describe('optimizer v5 dynamic count', () => {
  it.each([
    [0, 0], [2, 0], [3, 1], [5, 1], [15, 5], [30, 10], [33, 11], [60, 11],
  ])('maps %i eligible dragons to a maximum of %i armies', (eligible, maximum) => {
    expect(maximumOptimizerFormationCount(eligible)).toBe(maximum);
  });

  it('defaults to 10 when possible, otherwise the maximum, and clamps roster changes', () => {
    expect(defaultOptimizerFormationCount(33)).toBe(10);
    expect(defaultOptimizerFormationCount(27)).toBe(9);
    expect(clampOptimizerFormationCount(10, 18)).toBe(6);
    expect(clampOptimizerFormationCount(1, 2)).toBe(0);
  });
});

describe('Strongest Armies First', () => {
  it('matches exhaustive one-candidate optimization at every sequential step', () => {
    const candidates = [
      candidate('abc', ['a', 'b', 'c'], 300, 70, 7, 2),
      candidate('ade', ['a', 'd', 'e'], 290, 100, 50, 5),
      candidate('def', ['d', 'e', 'f'], 280, 80, 9, 3),
      candidate('ghi', ['g', 'h', 'i'], 270, 90, 8, 4),
    ];
    const result = solveStrongestFirst(candidates, 3);
    const remaining = [...candidates];
    let used = 0n;
    const exhaustive: OptimizerFormationCandidate[] = [];
    for (let index = 0; index < 3; index += 1) {
      const best = remaining
        .filter((entry) => (entry.dragonMask & used) === 0n)
        .sort(compareStrongestFirstCandidates)[0]!;
      exhaustive.push(best);
      used |= best.dragonMask;
    }
    expect(result.selectedCandidates.map((entry) => entry.stableCandidateKey))
      .toEqual(exhaustive.map((entry) => entry.stableCandidateKey));
    expect(result.selectedCandidates.map((entry) => entry.stableCandidateKey))
      .toEqual(['abc', 'def', 'ghi']);
  });

  it('uses rating, fixed-point relationship value, count, then stable key only after power', () => {
    const ordered = [
      candidate('z', ['a', 'b', 'c'], 100, 90, 1, 1),
      candidate('y', ['d', 'e', 'f'], 100, 91, 0, 0),
      candidate('b', ['g', 'h', 'i'], 100, 91, 2, 1),
      candidate('a', ['j', 'k', 'l'], 100, 91, 2, 1),
    ].sort(compareStrongestFirstCandidates);
    expect(ordered.map((entry) => entry.stableCandidateKey)).toEqual(['a', 'b', 'y', 'z']);
  });
});

describe('Balance All Armies', () => {
  it('maximizes the complete ascending power vector before rating and stable key', async () => {
    const roster = rosterDragons(['a', 'b', 'c', 'd', 'e', 'f']);
    const candidates = [
      candidate('abc', ['a', 'b', 'c'], 100, 100, 10, 5),
      candidate('def', ['d', 'e', 'f'], 300, 100, 10, 5),
      candidate('abd', ['a', 'b', 'd'], 190, 1, 0, 0),
      candidate('cef', ['c', 'e', 'f'], 190, 1, 0, 0),
    ];
    const result = await solveBalancedRosterOptimizer(candidates, roster, 2);
    expect(result.objective.ascendingEstimatedPowerUnits).toEqual([190, 190]);
    expect(result.selectedCandidates.map((entry) => entry.stableCandidateKey).sort())
      .toEqual(['abd', 'cef']);
  });

  it('maximizes ascending ratings, relationship units, count, and stable key on the fixed power face', async () => {
    const roster = rosterDragons(['a', 'b', 'c', 'd', 'e', 'f']);
    const candidates = [
      candidate('z-one', ['a', 'b', 'c'], 100, 10, 10, 1),
      candidate('z-two', ['d', 'e', 'f'], 100, 20, 10, 1),
      candidate('a-one', ['a', 'b', 'd'], 100, 15, 20, 2),
      candidate('a-two', ['c', 'e', 'f'], 100, 15, 20, 2),
    ];
    const result = await solveBalancedRosterOptimizer(candidates, roster, 2);
    expect(result.objective.ascendingRatingVector).toEqual([15, 15]);
    expect(result.objective.totalRelationshipValueUnits).toBe(40);
    expect(result.selectedCandidates.map((entry) => entry.stableCandidateKey).sort())
      .toEqual(['a-one', 'a-two']);
  });

  it('is invariant to forward/reverse candidate and roster order', async () => {
    const roster = rosterDragons(['a', 'b', 'c', 'd', 'e', 'f']);
    const candidates = [
      candidate('abc', ['a', 'b', 'c'], 100, 10, 1, 1),
      candidate('def', ['d', 'e', 'f'], 100, 10, 1, 1),
      candidate('abd', ['a', 'b', 'd'], 100, 10, 1, 1),
      candidate('cef', ['c', 'e', 'f'], 100, 10, 1, 1),
    ];
    const forward = await solveBalancedRosterOptimizer(candidates, roster, 2);
    const reverse = await solveBalancedRosterOptimizer(
      [...candidates].reverse(),
      [...roster].reverse(),
      2,
    );
    expect(forward.objective).toEqual(reverse.objective);
    expect(forward.selectedCandidates.map((entry) => entry.stableCandidateKey).sort())
      .toEqual(reverse.selectedCandidates.map((entry) => entry.stableCandidateKey).sort());
  });
});

function rosterDragons(ids: string[]): OptimizerRosterDragon[] {
  return ids.map((dragonId) => ({
    dragonId,
    rarity: 'Rare',
    starRank: 1,
    dragonLevel: 1,
    activeHabitLevels: {},
  }));
}

function candidate(
  key: string,
  dragonIds: [string, string, string],
  powerUnits: number,
  rating: number,
  relationshipUnits: number,
  activeRelationships: number,
): OptimizerFormationCandidate {
  const allIds = 'abcdefghijklmnop'.split('');
  const mask = dragonIds.reduce(
    (value, dragonId) => value | (1n << BigInt(allIds.indexOf(dragonId))),
    0n,
  );
  return {
    ratingContract: 'formation-rating-v3',
    stableCandidateKey: key,
    dragonIds,
    dragonMask: mask,
    arrangement: {
      'left-flank': dragonIds[0],
      vanguard: dragonIds[1],
      'right-flank': dragonIds[2],
    },
    tiedBestArrangements: [],
    rating,
    tier: 'Solid',
    activeSynergyScore: rating - 20,
    placementScore: 20,
    adjustedRelationshipValue: relationshipUnits / 1_000_000,
    adjustedRelationshipValueUnits: relationshipUnits,
    activeRelationshipCount: activeRelationships,
    quantifiedRelationshipCount: activeRelationships,
    unquantifiedRelationshipCount: 0,
    unquantifiedBasePotential: 0,
    reliabilityCoverage: 'all-quantified',
    participatingDragonCount: 3,
    relationships: [],
    strengths: [],
    gaps: [],
    progressionSnapshot: {},
    estimatedPowerUnits: powerUnits,
  };
}
