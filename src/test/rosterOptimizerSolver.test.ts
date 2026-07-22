import { describe, expect, it } from 'vitest';
import type { DragonRarity } from '../models/dragon';
import {
  compareRarityPriority,
  compareRosterOptimizerObjectives,
  objectiveForCandidates,
} from '../optimizer/rosterOptimizerObjective';
import { solveRosterOptimizerCandidates } from '../optimizer/rosterOptimizerSolver';
import {
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type RosterOptimizerObjective,
} from '../optimizer/rosterOptimizerTypes';

const ids = 'abcdefghijklmnopqrstuvwxyzABCDEFG'.split('');

describe('exact roster optimizer solver', () => {
  it.each([
    [6, 2],
    [9, 3],
    [12, 4],
    [30, 10],
  ])('selects %i dragons as %i complete disjoint formations', (dragonCount, formationCount) => {
    const dragons = makeDragons(dragonCount);
    const candidates = Array.from({ length: formationCount }, (_, index) =>
      candidate(ids.slice(index * 3, index * 3 + 3) as [string, string, string], 50 + index),
    );
    const result = solveRosterOptimizerCandidates(candidates, dragons, {
      targetFormationCount: formationCount,
    });
    expect(result?.optimal).toBe(true);
    expect(result?.selectedCandidates).toHaveLength(formationCount);
    const used = result!.selectedCandidates.flatMap((entry) => entry.dragonIds);
    expect(new Set(used).size).toBe(dragonCount);
  });

  it('selects 30 of 33 dragons and leaves three Rare dragons unused', () => {
    const dragons = makeDragons(33, (index) => index < 10 ? 'Legendary' : index < 21 ? 'Epic' : 'Rare');
    const candidates = Array.from({ length: 10 }, (_, index) =>
      candidate(ids.slice(index * 3, index * 3 + 3) as [string, string, string], 70),
    );
    const result = solveRosterOptimizerCandidates(candidates, dragons);
    const used = new Set(result!.selectedCandidates.flatMap((entry) => entry.dragonIds));
    const unused = dragons.filter((dragon) => !used.has(dragon.dragonId));
    expect(unused).toHaveLength(3);
    expect(unused.every((dragon) => dragon.rarity === 'Rare')).toBe(true);
    expect(used.size).toBe(30);
  });

  it('partitions used and unused IDs without duplicate dragons', () => {
    const dragons = makeDragons(7);
    const candidates = [
      candidate(['a', 'b', 'c'], 30),
      candidate(['d', 'e', 'f'], 30),
      candidate(['a', 'd', 'g'], 90),
      candidate(['b', 'e', 'f'], 20),
    ];
    const result = solveRosterOptimizerCandidates(candidates, dragons, { targetFormationCount: 2 })!;
    const used = result.selectedCandidates.flatMap((entry) => entry.dragonIds);
    const unused = dragons.map((dragon) => dragon.dragonId).filter((id) => !used.includes(id));
    expect(new Set(used).size).toBe(6);
    expect([...used, ...unused].sort()).toEqual(dragons.map((dragon) => dragon.dragonId));
  });

  it('beats greedy allocation with a globally optimal counterexample', () => {
    const dragons = makeDragons(6);
    const candidates = [
      candidate(['a', 'b', 'c'], 100),
      candidate(['d', 'e', 'f'], 1),
      candidate(['a', 'b', 'd'], 60),
      candidate(['c', 'e', 'f'], 60),
    ];
    const result = solveRosterOptimizerCandidates(candidates, dragons, { targetFormationCount: 2 })!;
    expect(result.objective.totalRating).toBe(120);
    expect(result.selectedCandidates.map((entry) => entry.stableCandidateKey).sort()).toEqual([
      'abd',
      'cef',
    ]);
    expect(100 + 1).toBeLessThan(result.objective.totalRating);
  });

  it('uses minimum rating and then the full ascending vector after equal totals', () => {
    const dragons = makeDragons(9);
    const candidates = [
      candidate(['a', 'b', 'c'], 90),
      candidate(['d', 'e', 'f'], 50),
      candidate(['g', 'h', 'i'], 40),
      candidate(['a', 'd', 'g'], 70),
      candidate(['b', 'e', 'h'], 60),
      candidate(['c', 'f', 'i'], 50),
      candidate(['a', 'e', 'i'], 70),
      candidate(['b', 'f', 'g'], 55),
      candidate(['c', 'd', 'h'], 55),
    ];
    const result = solveRosterOptimizerCandidates(candidates, dragons, { targetFormationCount: 3 })!;
    expect(result.objective.totalRating).toBe(180);
    expect(result.objective.ascendingRatingVector).toEqual([55, 55, 70]);
  });

  it('applies relationship value, count, and stable key tie-breaks', () => {
    const base = objective({ relationshipValue: 20, relationships: 2, key: 'b' });
    expect(compareRosterOptimizerObjectives(
      objective({ relationshipValue: 21, relationships: 1, key: 'z' }),
      base,
    )).toBeGreaterThan(0);
    expect(compareRosterOptimizerObjectives(
      objective({ relationshipValue: 20, relationships: 3, key: 'z' }),
      base,
    )).toBeGreaterThan(0);
    expect(compareRosterOptimizerObjectives(
      objective({ relationshipValue: 20, relationships: 2, key: 'a' }),
      base,
    )).toBeGreaterThan(0);
  });

  it('keeps strict rarity priority instead of an additive rarity score', () => {
    expect(compareRarityPriority(
      { legendaryCount: 1, epicCount: 0, rareCount: 0 },
      { legendaryCount: 0, epicCount: 30, rareCount: 0 },
    )).toBeGreaterThan(0);
    expect(compareRarityPriority(
      { legendaryCount: 1, epicCount: 1, rareCount: 28 },
      { legendaryCount: 1, epicCount: 0, rareCount: 29 },
    )).toBeGreaterThan(0);
  });

  it('is stable after reversing candidate and dragon input order', () => {
    const dragons = makeDragons(6);
    const candidates = allTriples(dragons.map((dragon) => dragon.dragonId));
    const forward = solveRosterOptimizerCandidates(candidates, dragons, { targetFormationCount: 2 })!;
    const reversed = solveRosterOptimizerCandidates(
      [...candidates].reverse(),
      [...dragons].reverse(),
      { targetFormationCount: 2 },
    )!;
    expect(reversed.objective).toEqual(forward.objective);
    expect(reversed.selectedCandidates.map((entry) => entry.stableCandidateKey).sort()).toEqual(
      forward.selectedCandidates.map((entry) => entry.stableCandidateKey).sort(),
    );
  });

  it('matches brute-force enumeration on small fixtures with and without pruning', () => {
    const dragons = makeDragons(9, (index) => index < 2 ? 'Legendary' : index < 5 ? 'Epic' : 'Rare');
    const candidates = allTriples(dragons.map((dragon) => dragon.dragonId));
    const rarityById = new Map(dragons.map((dragon) => [dragon.dragonId, dragon.rarity]));
    const bruteForce = bruteForceBest(candidates, 3, rarityById)!;
    const pruned = solveRosterOptimizerCandidates(candidates, dragons, { targetFormationCount: 3 })!;
    const unpruned = solveRosterOptimizerCandidates(candidates, dragons, {
      targetFormationCount: 3,
      useSafePruning: false,
    })!;
    expect(pruned.objective).toEqual(bruteForce);
    expect(unpruned.objective).toEqual(bruteForce);
  });

  it('cancellation cannot return a partial result marked optimal', () => {
    expect(() => solveRosterOptimizerCandidates(
      allTriples(ids.slice(0, 9)),
      makeDragons(9),
      { targetFormationCount: 3, shouldCancel: () => true },
    )).toThrow(RosterOptimizerCancelledError);
  });
});

function makeDragons(
  count: number,
  rarityForIndex: (index: number) => DragonRarity = () => 'Rare',
): OptimizerRosterDragon[] {
  return ids.slice(0, count).map((dragonId, index) => ({
    dragonId,
    rarity: rarityForIndex(index),
    starRank: 10,
    dragonLevel: 16,
  }));
}

function candidate(
  dragonIds: [string, string, string],
  rating: number,
  relationshipValue = rating,
  relationshipCount = 1,
): OptimizerFormationCandidate {
  return {
    stableCandidateKey: [...dragonIds].sort().join(''),
    dragonIds,
    dragonMask: 0n,
    arrangement: { 'left-flank': dragonIds[0], vanguard: dragonIds[1], 'right-flank': dragonIds[2] },
    tiedBestArrangements: [],
    rating,
    tier: 'Solid',
    activeSynergyScore: Math.max(0, rating - 20),
    placementScore: 20,
    activeRelationshipValue: relationshipValue,
    activeRelationshipCount: relationshipCount,
    participatingDragonCount: 3,
    relationships: [],
    strengths: [],
    gaps: [],
    progressionSnapshot: {},
  };
}

function allTriples(dragonIds: string[]): OptimizerFormationCandidate[] {
  const candidates: OptimizerFormationCandidate[] = [];
  for (let first = 0; first < dragonIds.length - 2; first += 1) {
    for (let second = first + 1; second < dragonIds.length - 1; second += 1) {
      for (let third = second + 1; third < dragonIds.length; third += 1) {
        const trio = [dragonIds[first]!, dragonIds[second]!, dragonIds[third]!] as [string, string, string];
        const keyValue = trio.reduce((total, id) => total + id.charCodeAt(0), 0);
        candidates.push(candidate(trio, 20 + keyValue % 17, keyValue % 23, keyValue % 5));
      }
    }
  }
  return candidates;
}

function bruteForceBest(
  candidates: OptimizerFormationCandidate[],
  target: number,
  rarityById: ReadonlyMap<string, DragonRarity>,
): RosterOptimizerObjective | null {
  let best: RosterOptimizerObjective | null = null;
  const visit = (start: number, selected: OptimizerFormationCandidate[], used: Set<string>) => {
    if (selected.length === target) {
      const current = objectiveForCandidates(selected, rarityById);
      if (!best || compareRosterOptimizerObjectives(current, best) > 0) best = current;
      return;
    }
    for (let index = start; index < candidates.length; index += 1) {
      const next = candidates[index]!;
      if (next.dragonIds.some((dragonId) => used.has(dragonId))) continue;
      next.dragonIds.forEach((dragonId) => used.add(dragonId));
      visit(index + 1, [...selected, next], used);
      next.dragonIds.forEach((dragonId) => used.delete(dragonId));
    }
  };
  visit(0, [], new Set());
  return best;
}

function objective({
  relationshipValue,
  relationships,
  key,
}: {
  relationshipValue: number;
  relationships: number;
  key: string;
}): RosterOptimizerObjective {
  return {
    rarityPriority: { legendaryCount: 1, epicCount: 1, rareCount: 1 },
    totalRating: 100,
    minimumRating: 40,
    ascendingRatingVector: [40, 60],
    totalRelationshipValue: relationshipValue,
    totalActiveRelationships: relationships,
    stableSolutionKey: key,
  };
}
