import { HiGHS } from '@bubblyworld/highs-ts';
import { describe, expect, it } from 'vitest';
import {
  applyHiGHSDoubleOption,
  applyRosterOptimizerExactGapOptions,
  ROSTER_OPTIMIZER_MIP_GAP_OPTIONS,
} from '../optimizer/highsExactOptions';
import {
  compareRosterOptimizerObjectives,
  objectiveForCandidates,
} from '../optimizer/rosterOptimizerObjective';
import { solveRosterOptimizerMip } from '../optimizer/rosterOptimizerMipSolver';
import { solveRosterOptimizerCandidates } from '../optimizer/rosterOptimizerSolver';
import type {
  OptimizerFormationCandidate,
  OptimizerRosterDragon,
  RosterOptimizerObjective,
} from '../optimizer/rosterOptimizerTypes';

describe('production exact MILP optimizer', () => {
  it('applies both zero-gap options through the accepted HiGHS double-option API', async () => {
    const highs = await HiGHS.create();
    try {
      const applied = applyRosterOptimizerExactGapOptions(highs);
      expect(applied).toEqual([
        { name: 'mip_rel_gap', value: 0, status: 0 },
        { name: 'mip_abs_gap', value: 0, status: 0 },
      ]);
      expect(ROSTER_OPTIMIZER_MIP_GAP_OPTIONS).toEqual({
        mip_rel_gap: 0,
        mip_abs_gap: 0,
      });
      expect(() => applyHiGHSDoubleOption(highs, 'not_a_highs_option', 0)).toThrow(
        /rejected exact option/,
      );
    } finally {
      highs.free();
    }
  });

  it('matches the independent exact solver on the greedy counterexample', async () => {
    const fixture = fixtureFromCandidates(
      rareDragons('abcdef'),
      [
        candidate(['a', 'b', 'c'], 100),
        candidate(['d', 'e', 'f'], 1),
        candidate(['a', 'b', 'd'], 60),
        candidate(['c', 'e', 'f'], 60),
      ],
      2,
    );
    const objective = await expectAllExactSolversMatch(fixture);
    expect(objective.totalRating).toBe(120);
  });

  it('uses minimum rating after equal rarity and total rating', async () => {
    const fixture = twoCoverFixture({
      firstRatings: [9, 11],
      secondRatings: [10, 10],
    });
    const objective = await expectAllExactSolversMatch(fixture);
    expect(objective.totalRating).toBe(20);
    expect(objective.ascendingRatingVector).toEqual([10, 10]);
  });

  it('uses the complete ascending vector after equal total and minimum', async () => {
    const dragons = rareDragons('abcdefghi');
    const fixture = fixtureFromCandidates(
      dragons,
      [
        candidate(['a', 'b', 'c'], 5),
        candidate(['d', 'e', 'f'], 7),
        candidate(['g', 'h', 'i'], 12),
        candidate(['a', 'b', 'd'], 5),
        candidate(['c', 'e', 'g'], 8),
        candidate(['f', 'h', 'i'], 11),
      ],
      3,
    );
    const objective = await expectAllExactSolversMatch(fixture);
    expect(objective.totalRating).toBe(24);
    expect(objective.minimumRating).toBe(5);
    expect(objective.ascendingRatingVector).toEqual([5, 8, 11]);
  });

  it('resolves a one-unit difference in the lowest-weight base-11 digit', async () => {
    const fixture = lowHistogramDigitFixture();
    const objective = await expectAllExactSolversMatch(fixture);
    const base11ChunkMagnitude = 11 ** 7;
    expect(1 / base11ChunkMagnitude).toBeLessThan(1e-4);
    expect(objective.ascendingRatingVector).toEqual([0, 8, 12]);
  });

  it('uses a half-point relationship-value difference after integer doubling', async () => {
    const fixture = twoCoverFixture({
      firstRatings: [10, 10],
      secondRatings: [10, 10],
      firstRelationshipValues: [5, 5],
      secondRelationshipValues: [5, 5.5],
    });
    const objective = await expectAllExactSolversMatch(fixture);
    expect(objective.totalRelationshipValue).toBe(10.5);
  });

  it('uses active relationship count after equal relationship value', async () => {
    const fixture = twoCoverFixture({
      firstRatings: [10, 10],
      secondRatings: [10, 10],
      firstRelationshipValues: [5, 5],
      secondRelationshipValues: [5, 5],
      firstRelationshipCounts: [1, 1],
      secondRelationshipCounts: [1, 2],
    });
    const objective = await expectAllExactSolversMatch(fixture);
    expect(objective.totalRelationshipValue).toBe(10);
    expect(objective.totalActiveRelationships).toBe(3);
  });

  it('resolves equal numeric objectives in a late stable-key chunk', async () => {
    const coreDragons = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'].map(
      (dragonId): OptimizerRosterDragon => ({
        dragonId,
        rarity: 'Legendary',
        starRank: 10,
        dragonLevel: 16,
      }),
    );
    const decoyDragons = Array.from({ length: 8 }, (_, index): OptimizerRosterDragon => ({
      dragonId: `a${index}`,
      rarity: 'Rare',
      starRank: 10,
      dragonLevel: 16,
    }));
    const decoys: OptimizerFormationCandidate[] = [];
    for (let left = 0; left < decoyDragons.length && decoys.length < 49; left += 1) {
      for (let middle = left + 1; middle < decoyDragons.length && decoys.length < 49; middle += 1) {
        for (
          let right = middle + 1;
          right < decoyDragons.length && decoys.length < 49;
          right += 1
        ) {
          decoys.push(
            candidate(
              [
                decoyDragons[left]!.dragonId,
                decoyDragons[middle]!.dragonId,
                decoyDragons[right]!.dragonId,
              ],
              10,
            ),
          );
        }
      }
    }
    expect(decoys).toHaveLength(49);
    const fixture = fixtureFromCandidates(
      [...decoyDragons, ...coreDragons],
      [
        ...decoys,
        candidate(['z1', 'z2', 'z3'], 10),
        candidate(['z4', 'z5', 'z6'], 10),
        candidate(['z1', 'z2', 'z4'], 10),
        candidate(['z3', 'z5', 'z6'], 10),
      ],
      2,
    );
    const objective = await expectAllExactSolversMatch(fixture);
    expect(objective.stableSolutionKey).toBe(
      [stableKey(['z1', 'z2', 'z3']), stableKey(['z4', 'z5', 'z6'])].sort().join('||'),
    );
  });

  it('matches production, independent exact, and brute-force objectives on randomized fixtures', async () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const fixture = randomizedFixture(seed);
      await expectAllExactSolversMatch(fixture);
    }
  }, 120_000);
});

interface ExactFixture {
  candidates: OptimizerFormationCandidate[];
  dragons: OptimizerRosterDragon[];
  targetFormationCount: number;
}

async function expectAllExactSolversMatch(
  fixture: ExactFixture,
): Promise<RosterOptimizerObjective> {
  const independent = solveRosterOptimizerCandidates(fixture.candidates, fixture.dragons, {
    targetFormationCount: fixture.targetFormationCount,
  });
  const brute = bruteForceObjective(fixture);
  const production = await solveRosterOptimizerMip(
    fixture.candidates,
    fixture.dragons,
    fixture.targetFormationCount,
  );
  const reversed = await solveRosterOptimizerMip(
    [...fixture.candidates].reverse(),
    [...fixture.dragons].reverse(),
    fixture.targetFormationCount,
  );
  expect(independent?.objective).toEqual(brute);
  expect(production.objective).toEqual(brute);
  expect(reversed.objective).toEqual(brute);
  expect(production.optimal).toBe(true);
  return production.objective;
}

function bruteForceObjective(fixture: ExactFixture): RosterOptimizerObjective {
  const rarityByDragonId = new Map(
    fixture.dragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
  );
  let best: RosterOptimizerObjective | null = null;
  const selected: OptimizerFormationCandidate[] = [];
  const used = new Set<string>();

  const visit = (start: number): void => {
    if (selected.length === fixture.targetFormationCount) {
      const objective = objectiveForCandidates(selected, rarityByDragonId);
      if (!best || compareRosterOptimizerObjectives(objective, best) > 0) best = objective;
      return;
    }
    for (let index = start; index < fixture.candidates.length; index += 1) {
      const next = fixture.candidates[index]!;
      if (next.dragonIds.some((dragonId) => used.has(dragonId))) continue;
      next.dragonIds.forEach((dragonId) => used.add(dragonId));
      selected.push(next);
      visit(index + 1);
      selected.pop();
      next.dragonIds.forEach((dragonId) => used.delete(dragonId));
    }
  };
  visit(0);
  if (!best) throw new Error('Brute-force fixture has no complete allocation.');
  return best;
}

function lowHistogramDigitFixture(): ExactFixture {
  return fixtureFromCandidates(
    rareDragons('abcdefmno'),
    [
      candidate(['m', 'n', 'o'], 0),
      candidate(['a', 'b', 'c'], 7),
      candidate(['d', 'e', 'f'], 13),
      candidate(['a', 'b', 'd'], 8),
      candidate(['c', 'e', 'f'], 12),
    ],
    3,
  );
}

function twoCoverFixture(options: {
  firstRatings: [number, number];
  secondRatings: [number, number];
  firstRelationshipValues?: [number, number];
  secondRelationshipValues?: [number, number];
  firstRelationshipCounts?: [number, number];
  secondRelationshipCounts?: [number, number];
}): ExactFixture {
  return fixtureFromCandidates(
    rareDragons('abcdef'),
    [
      candidate(['a', 'b', 'c'], options.firstRatings[0], {
        relationshipValue: options.firstRelationshipValues?.[0],
        relationshipCount: options.firstRelationshipCounts?.[0],
      }),
      candidate(['d', 'e', 'f'], options.firstRatings[1], {
        relationshipValue: options.firstRelationshipValues?.[1],
        relationshipCount: options.firstRelationshipCounts?.[1],
      }),
      candidate(['a', 'b', 'd'], options.secondRatings[0], {
        relationshipValue: options.secondRelationshipValues?.[0],
        relationshipCount: options.secondRelationshipCounts?.[0],
      }),
      candidate(['c', 'e', 'f'], options.secondRatings[1], {
        relationshipValue: options.secondRelationshipValues?.[1],
        relationshipCount: options.secondRelationshipCounts?.[1],
      }),
    ],
    2,
  );
}

function randomizedFixture(seed: number): ExactFixture {
  let state = seed >>> 0;
  const next = (maximum: number): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state % maximum;
  };
  const dragons: OptimizerRosterDragon[] = [];
  const candidates: OptimizerFormationCandidate[] = [];
  for (let gadget = 0; gadget < 2; gadget += 1) {
    const ids = Array.from({ length: 6 }, (_, index) => `s${seed}g${gadget}d${index}`);
    dragons.push(
      ...ids.map((dragonId): OptimizerRosterDragon => ({
        dragonId,
        rarity: 'Rare',
        starRank: 1 + next(10),
        dragonLevel: next(17),
      })),
    );
    const specs: Array<[string, string, string]> = [
      [ids[0]!, ids[1]!, ids[2]!],
      [ids[3]!, ids[4]!, ids[5]!],
      [ids[0]!, ids[1]!, ids[3]!],
      [ids[2]!, ids[4]!, ids[5]!],
    ];
    candidates.push(
      ...specs.map((dragonIds) =>
        candidate(dragonIds, 10 + next(21), {
          relationshipValue: next(21) / 2,
          relationshipCount: next(8),
        }),
      ),
    );
  }
  return fixtureFromCandidates(dragons, candidates, 4);
}

function fixtureFromCandidates(
  dragons: OptimizerRosterDragon[],
  candidates: OptimizerFormationCandidate[],
  targetFormationCount: number,
): ExactFixture {
  return { dragons, candidates, targetFormationCount };
}

function rareDragons(ids: string): OptimizerRosterDragon[] {
  return [...ids].map((dragonId): OptimizerRosterDragon => ({
    dragonId,
    rarity: 'Rare',
    starRank: 10,
    dragonLevel: 16,
  }));
}

function stableKey(dragonIds: [string, string, string]): string {
  return [...dragonIds].sort().join(':');
}

function candidate(
  dragonIds: [string, string, string],
  rating: number,
  options: { relationshipValue?: number; relationshipCount?: number } = {},
): OptimizerFormationCandidate {
  return {
    stableCandidateKey: stableKey(dragonIds),
    dragonIds,
    dragonMask: 0n,
    arrangement: {
      'left-flank': dragonIds[0],
      vanguard: dragonIds[1],
      'right-flank': dragonIds[2],
    },
    tiedBestArrangements: [],
    rating,
    tier: 'Solid',
    activeSynergyScore: Math.max(0, rating - 20),
    placementScore: 20,
    activeRelationshipValue: options.relationshipValue ?? rating,
    activeRelationshipCount: options.relationshipCount ?? 1,
    participatingDragonCount: 3,
    relationships: [],
    strengths: [],
    gaps: [],
    progressionSnapshot: {},
  };
}
