import { describe, expect, it } from 'vitest';
import {
  comparePrimaryBackupOptimizerObjectives,
  primaryBackupObjectiveForCandidates,
} from '../optimizer/rosterOptimizerObjective';
import { solvePrimaryBackupRosterOptimizerMip } from '../optimizer/rosterOptimizerPrimaryBackupMipSolver';
import { solvePrimaryBackupCandidates } from '../optimizer/rosterOptimizerPrimaryBackupSolver';
import {
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type PrimaryBackupOptimizerObjective,
} from '../optimizer/rosterOptimizerTypes';

describe('Primary + Backup exact hierarchy', () => {
  it('selects disjoint waves and uses a tied Primary to unlock the stronger Backup', async () => {
    const fixture = tiedPrimaryBetterBackupFixture();
    const result = await expectProductionOracleAndBruteForceMatch(fixture);
    expect(result.primary.stableSolutionKey).toContain('a:b:d');
    expect(result.backup.totalRating).toBe(20);
    expect(result.backup.stableSolutionKey).toContain('c:e:f');
  });

  it('never weakens Primary total rating for any Backup improvement', async () => {
    const fixture = fixtureOf(
      rosterDragons({
        l1: 'Legendary', l2: 'Legendary', c: 'Rare', d: 'Rare', e: 'Rare', f: 'Rare', g: 'Rare',
      }),
      [
        candidate(['l1', 'l2', 'c'], 400),
        candidate(['d', 'e', 'f'], 350),
        candidate(['l1', 'l2', 'd'], 399),
        candidate(['c', 'e', 'g'], 500),
      ],
    );
    const result = await expectProductionOracleAndBruteForceMatch(fixture);
    expect(result.primary.totalRating).toBe(400);
    expect(result.backup.totalRating).toBe(350);
  });

  it('maximizes Primary Legendary then Epic inclusion before ratings', async () => {
    const dragons = rosterDragons({
      l: 'Legendary', e1: 'Epic', e2: 'Epic', r1: 'Rare', r2: 'Rare', r3: 'Rare', r4: 'Rare',
    });
    const fixture = fixtureOf(dragons, [
      candidate(['l', 'e1', 'e2'], 1),
      candidate(['r1', 'r2', 'r3'], 1),
      candidate(['e1', 'e2', 'r1'], 500),
      candidate(['l', 'r2', 'r3'], 500),
      candidate(['l', 'e1', 'r4'], 2),
      candidate(['e2', 'r2', 'r3'], 2),
    ]);
    const result = await expectProductionOracleAndBruteForceMatch(fixture);
    expect(result.primary.rarityPriority).toEqual({ legendaryCount: 1, epicCount: 2, rareCount: 0 });
    expect(result.primary.totalRating).toBe(1);
  });

  it('applies Backup rarity priority only after every Primary numeric objective', async () => {
    const dragons = rosterDragons({
      l1: 'Legendary', l2: 'Legendary', a: 'Rare', l3: 'Legendary', d: 'Rare', e: 'Rare', f: 'Rare',
    });
    const fixture = fixtureOf(dragons, [
      candidate(['l1', 'l2', 'a'], 100),
      candidate(['l3', 'd', 'e'], 1),
      candidate(['d', 'e', 'f'], 500),
    ]);
    const result = await expectProductionOracleAndBruteForceMatch(fixture);
    expect(result.primary.totalRating).toBe(100);
    expect(result.backup.rarityPriority.legendaryCount).toBe(1);
    expect(result.backup.totalRating).toBe(1);
  });

  it('uses minimum rating after equal totals independently in Primary and Backup', async () => {
    const fixture = fixtureOf(
      rosterDragons({
        a: 'Legendary', b: 'Legendary', c: 'Legendary', d: 'Legendary', e: 'Legendary', f: 'Legendary',
        g: 'Rare', h: 'Rare', i: 'Rare', j: 'Rare', k: 'Rare', l: 'Rare',
      }),
      [
        candidate(['a', 'b', 'c'], 9), candidate(['d', 'e', 'f'], 11),
        candidate(['a', 'b', 'd'], 10), candidate(['c', 'e', 'f'], 10),
        candidate(['g', 'h', 'i'], 9), candidate(['j', 'k', 'l'], 11),
        candidate(['g', 'h', 'j'], 10), candidate(['i', 'k', 'l'], 10),
      ],
      2,
    );
    const result = await expectProductionOracleAndBruteForceMatch(fixture);
    expect(result.primary.ascendingRatingVector).toEqual([10, 10]);
    expect(result.backup.ascendingRatingVector).toEqual([10, 10]);
  });

  it('compares wave minimums, full vectors, relationships, and keys in documented order', () => {
    const baseline = objective({
      primaryRatings: [10, 10, 20],
      backupRatings: [7, 8, 15],
      primaryRelationshipValue: 10,
      backupRelationshipValue: 5,
    });
    expect(comparePrimaryBackupOptimizerObjectives(
      objective({ primaryRatings: [9, 12, 19], backupRatings: [100, 100, 100] }),
      baseline,
    )).toBeLessThan(0);
    expect(comparePrimaryBackupOptimizerObjectives(
      objective({ primaryRatings: [10, 11, 19] }),
      baseline,
    )).toBeGreaterThan(0);
    expect(comparePrimaryBackupOptimizerObjectives(
      objective({ backupRatings: [6, 10, 14] }),
      baseline,
    )).toBeLessThan(0);
    expect(comparePrimaryBackupOptimizerObjectives(
      objective({ primaryRelationshipValue: 11 }),
      baseline,
    )).toBeGreaterThan(0);
    expect(comparePrimaryBackupOptimizerObjectives(
      objective({ backupRelationshipValue: 6 }),
      baseline,
    )).toBeGreaterThan(0);
    expect(comparePrimaryBackupOptimizerObjectives(
      objective({ primaryKey: 'aaa', backupKey: 'zzz' }),
      objective({ primaryKey: 'bbb', backupKey: 'aaa' }),
    )).toBeGreaterThan(0);
  });

  it('is stable when candidate and dragon order are reversed', async () => {
    const fixture = tiedPrimaryBetterBackupFixture();
    const forward = await solvePrimaryBackupRosterOptimizerMip(fixture.candidates, fixture.dragons, 1);
    const reversed = await solvePrimaryBackupRosterOptimizerMip(
      [...fixture.candidates].reverse(),
      [...fixture.dragons].reverse(),
      1,
    );
    expect(reversed.objective).toEqual(forward.objective);
    expect(reversed.primaryCandidates.map((item) => item.stableCandidateKey).sort())
      .toEqual(forward.primaryCandidates.map((item) => item.stableCandidateKey).sort());
    expect(reversed.backupCandidates.map((item) => item.stableCandidateKey).sort())
      .toEqual(forward.backupCandidates.map((item) => item.stableCandidateKey).sort());
  });

  it('cancellation in the independent oracle cannot return a partial optimum', () => {
    const fixture = tiedPrimaryBetterBackupFixture();
    expect(() => solvePrimaryBackupCandidates(fixture.candidates, fixture.dragons, {
      formationsPerWave: 1,
      shouldCancel: () => true,
    })).toThrow(RosterOptimizerCancelledError);
  });
});

interface Fixture {
  candidates: OptimizerFormationCandidate[];
  dragons: OptimizerRosterDragon[];
  formationsPerWave: number;
}

async function expectProductionOracleAndBruteForceMatch(
  fixture: Fixture,
): Promise<PrimaryBackupOptimizerObjective> {
  const production = await solvePrimaryBackupRosterOptimizerMip(
    fixture.candidates,
    fixture.dragons,
    fixture.formationsPerWave,
  );
  const oracle = solvePrimaryBackupCandidates(fixture.candidates, fixture.dragons, {
    formationsPerWave: fixture.formationsPerWave,
  });
  const brute = bruteForce(fixture);
  expect(production.objective).toEqual(brute);
  expect(oracle?.objective).toEqual(brute);
  expect(production.optimal).toBe(true);
  expect(production.primaryCandidates).toHaveLength(fixture.formationsPerWave);
  expect(production.backupCandidates).toHaveLength(fixture.formationsPerWave);
  const primaryDragons = production.primaryCandidates.flatMap((item) => item.dragonIds);
  const backupDragons = production.backupCandidates.flatMap((item) => item.dragonIds);
  expect(new Set([...primaryDragons, ...backupDragons]).size)
    .toBe(fixture.formationsPerWave * 6);
  return production.objective;
}

function bruteForce(fixture: Fixture): PrimaryBackupOptimizerObjective {
  const rarityById = new Map(fixture.dragons.map((dragon) => [dragon.dragonId, dragon.rarity]));
  let best: PrimaryBackupOptimizerObjective | null = null;
  const allocations: OptimizerFormationCandidate[][] = [];
  const selected: OptimizerFormationCandidate[] = [];
  const selectedDragons = new Set<string>();
  const enumerate = (start: number): void => {
    if (selected.length === fixture.formationsPerWave) {
      allocations.push([...selected]);
      return;
    }
    for (let index = start; index < fixture.candidates.length; index += 1) {
      const next = fixture.candidates[index]!;
      if (next.dragonIds.some((dragonId) => selectedDragons.has(dragonId))) continue;
      next.dragonIds.forEach((dragonId) => selectedDragons.add(dragonId));
      selected.push(next);
      enumerate(index + 1);
      selected.pop();
      next.dragonIds.forEach((dragonId) => selectedDragons.delete(dragonId));
    }
  };
  enumerate(0);
  for (const primary of allocations) {
    for (const backup of allocations) {
      const used = new Set(primary.flatMap((item) => item.dragonIds));
      if (backup.flatMap((item) => item.dragonIds).some((dragonId) => used.has(dragonId))) continue;
      const current = primaryBackupObjectiveForCandidates(primary, backup, rarityById);
      if (!best || comparePrimaryBackupOptimizerObjectives(current, best) > 0) best = current;
    }
  }
  if (!best) throw new Error('Fixture has no complete two-wave allocation.');
  return best;
}

function tiedPrimaryBetterBackupFixture(): Fixture {
  return fixtureOf(rareDragons('abcdef'), [
    candidate(['a', 'b', 'c'], 100),
    candidate(['d', 'e', 'f'], 10),
    candidate(['a', 'b', 'd'], 100),
    candidate(['c', 'e', 'f'], 20),
  ]);
}

function fixtureOf(
  dragons: OptimizerRosterDragon[],
  candidates: OptimizerFormationCandidate[],
  formationsPerWave = 1,
): Fixture {
  return { dragons, candidates, formationsPerWave };
}

function rareDragons(ids: string): OptimizerRosterDragon[] {
  return [...ids].map((dragonId) => ({
    dragonId,
    rarity: 'Rare',
    starRank: 10,
    dragonLevel: 16,
  }));
}

function rosterDragons(rarities: Record<string, OptimizerRosterDragon['rarity']>) {
  return Object.entries(rarities).map(([dragonId, rarity]) => ({
    dragonId,
    rarity,
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
    ratingContract: 'formation-rating-v3',
    stableCandidateKey: dragonIds.join(':'),
    dragonIds,
    dragonMask: 0n,
    arrangement: { 'left-flank': dragonIds[0], vanguard: dragonIds[1], 'right-flank': dragonIds[2] },
    tiedBestArrangements: [],
    rating,
    tier: 'Solid',
    activeSynergyScore: Math.max(0, rating - 20),
    placementScore: 20,
    adjustedRelationshipValue: relationshipValue,
    adjustedRelationshipValueUnits: Math.round(relationshipValue * 1_000_000),
    activeRelationshipCount: relationshipCount,
    quantifiedRelationshipCount: relationshipCount,
    unquantifiedRelationshipCount: 0,
    unquantifiedBasePotential: 0,
    reliabilityCoverage: 'all-quantified',
    participatingDragonCount: 3,
    relationships: [], strengths: [], gaps: [], progressionSnapshot: {},
  };
}

function objective(overrides: {
  primaryRatings?: number[];
  backupRatings?: number[];
  primaryRelationshipValue?: number;
  backupRelationshipValue?: number;
  primaryKey?: string;
  backupKey?: string;
} = {}): PrimaryBackupOptimizerObjective {
  const wave = (
    ratings: number[],
    relationshipValue: number,
    key: string,
  ) => ({
    rarityPriority: { legendaryCount: 0, epicCount: 0, rareCount: ratings.length * 3 },
    totalRating: ratings.reduce((total, rating) => total + rating, 0),
    minimumRating: Math.min(...ratings),
    ascendingRatingVector: [...ratings].sort((left, right) => left - right),
    totalRelationshipValue: relationshipValue,
    totalRelationshipValueUnits: Math.round(relationshipValue * 1_000_000),
    totalActiveRelationships: 3,
    stableSolutionKey: key,
  });
  const primary = wave(
    overrides.primaryRatings ?? [10, 10, 20],
    overrides.primaryRelationshipValue ?? 10,
    overrides.primaryKey ?? 'bbb',
  );
  const backup = wave(
    overrides.backupRatings ?? [7, 8, 15],
    overrides.backupRelationshipValue ?? 5,
    overrides.backupKey ?? 'bbb',
  );
  return {
    strategy: 'primary-five-backup-five',
    primary,
    backup,
    combinedTotalRating: primary.totalRating + backup.totalRating,
    combinedRelationshipValue: primary.totalRelationshipValue + backup.totalRelationshipValue,
    combinedRelationshipValueUnits:
      primary.totalRelationshipValueUnits + backup.totalRelationshipValueUnits,
    combinedActiveRelationships: primary.totalActiveRelationships + backup.totalActiveRelationships,
    stableSolutionKey: `primary:${primary.stableSolutionKey}||backup:${backup.stableSolutionKey}`,
  };
}
