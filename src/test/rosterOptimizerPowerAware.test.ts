import { describe, expect, it, vi } from 'vitest';
import type { EstimatedDragonPower, EstimatedPowerConfidence } from '../power/estimatedDragonPower';
import { ROSTER_OPTIMIZER_MIP_GAP_OPTIONS } from '../optimizer/highsExactOptions';
import { createRosterOptimizerRequestFingerprint } from '../optimizer/rosterOptimizerCandidates';
import {
  comparePowerAwarePrimaryBackupOptimizerObjectives,
} from '../optimizer/rosterOptimizerObjective';
import { solvePrimaryBackupRosterOptimizerMip } from '../optimizer/rosterOptimizerPrimaryBackupMipSolver';
import { solvePowerAwarePrimaryBackupCandidates } from '../optimizer/rosterOptimizerPrimaryBackupSolver';
import {
  buildEstimatedPowerCache,
  candidatePowerUnits,
  determinePrimaryPowerCutoff,
  powerConfidenceCounts,
} from '../optimizer/rosterOptimizerPower';
import {
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type PowerAwarePrimaryBackupOptimizerObjective,
} from '../optimizer/rosterOptimizerTypes';

describe('Power-Aware Primary + Backup exact optimizer', () => {
  it('selects exactly five Primary and five Backup formations using 30 unique non-overlapping dragons', async () => {
    const dragons = ids(31).map((dragonId, index) => rosterDragon(dragonId, index < 3 ? 'Epic' : 'Rare'));
    const estimates = estimateMap(dragons.map((dragon, index) => [dragon.dragonId, 10_000 - index * 10]));
    const candidates = Array.from({ length: 10 }, (_, index) => {
      const start = index * 3;
      return poweredCandidate(
        [dragons[start]!.dragonId, dragons[start + 1]!.dragonId, dragons[start + 2]!.dragonId],
        20 + index,
        estimates,
      );
    });
    const cutoff = determinePrimaryPowerCutoff(estimates, 15);
    const result = await solvePrimaryBackupRosterOptimizerMip(candidates, dragons, 5, {
      primaryCutoff: cutoff,
      estimatesByDragonId: estimates,
    });
    const primary = result.primaryCandidates.flatMap((candidate) => candidate.dragonIds);
    const backup = result.backupCandidates.flatMap((candidate) => candidate.dragonIds);
    expect(result.primaryCandidates).toHaveLength(5);
    expect(result.backupCandidates).toHaveLength(5);
    expect(new Set(primary)).toHaveProperty('size', 15);
    expect(new Set(backup)).toHaveProperty('size', 15);
    expect(new Set([...primary, ...backup])).toHaveProperty('size', 30);
    expect(dragons.map((dragon) => dragon.dragonId).filter((id) => !new Set([...primary, ...backup]).has(id)))
      .toEqual(['d30']);
  });

  it('uses mandatory-above, excluded-below, and exact cutoff-tie constraints equivalent to maximum pool power', () => {
    const estimates = estimateMap([
      ['a', 100], ['b', 90], ['c', 80], ['d', 80], ['e', 70], ['f', 60],
    ]);
    const cutoff = determinePrimaryPowerCutoff(estimates, 3);
    expect(cutoff).toMatchObject({
      cutoffPowerUnits: 8,
      aboveCutoffDragonIds: ['a', 'b'],
      cutoffTiedDragonIds: ['c', 'd'],
      belowCutoffDragonIds: ['e', 'f'],
      requiredCutoffTieCount: 1,
      exactPrimaryTotalPowerUnits: 27,
    });
    const combinations = choose([...estimates.keys()], 3);
    const maximum = Math.max(...combinations.map((group) =>
      group.reduce((sum, id) => sum + estimates.get(id)!.power / 10, 0),
    ));
    const constrained = combinations.filter((group) =>
      cutoff.aboveCutoffDragonIds.every((id) => group.includes(id))
      && cutoff.belowCutoffDragonIds.every((id) => !group.includes(id))
      && group.filter((id) => cutoff.cutoffTiedDragonIds.includes(id)).length === 1,
    );
    expect(constrained).toHaveLength(2);
    expect(constrained.every((group) => group.reduce(
      (sum, id) => sum + estimates.get(id)!.power / 10,
      0,
    ) === maximum)).toBe(true);
  });

  it('lets one integer Power unit defeat any Formation Rating advantage', () => {
    const stronger = objective({ primaryPower: 1010, primaryRatings: [1, 1, 1, 1, 1] });
    const prettier = objective({ primaryPower: 1000, primaryRatings: [100, 100, 100, 100, 100] });
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(stronger, prettier)).toBeGreaterThan(0);
  });

  it('resolves equal-power Primary pools by total, minimum, then complete ascending rating vector', () => {
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(
      objective({ primaryRatings: [10, 10, 10, 10, 11] }),
      objective({ primaryRatings: [10, 10, 10, 10, 10] }),
    )).toBeGreaterThan(0);
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(
      objective({ primaryRatings: [9, 10, 10, 10, 11] }),
      objective({ primaryRatings: [8, 10, 10, 11, 11] }),
    )).toBeGreaterThan(0);
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(
      objective({ primaryRatings: [8, 9, 10, 11, 12] }),
      objective({ primaryRatings: [8, 8, 11, 11, 12] }),
    )).toBeGreaterThan(0);
  });

  it('considers Backup Power only after every Primary numeric objective', () => {
    const betterPrimary = objective({
      primaryRatings: [10, 10, 10, 10, 11],
      backupPower: 1,
    });
    const strongerBackup = objective({
      primaryRatings: [10, 10, 10, 10, 10],
      backupPower: 999_000,
    });
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(betterPrimary, strongerBackup))
      .toBeGreaterThan(0);
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(
      objective({ backupPower: 1010 }),
      objective({ backupPower: 1000, backupRatings: [100, 100, 100, 100, 100] }),
    )).toBeGreaterThan(0);
  });

  it('continues through relationship value, relationship count, and existing stable-key order', () => {
    const relationshipValue = objective();
    relationshipValue.primary.totalRelationshipValue = 2;
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(relationshipValue, objective()))
      .toBeGreaterThan(0);
    const relationshipCount = objective();
    relationshipCount.primary.totalActiveRelationships = 2;
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(relationshipCount, objective()))
      .toBeGreaterThan(0);
    const stableFirst = objective();
    stableFirst.primary.stableSolutionKey = 'aaa';
    const stableLater = objective();
    stableLater.primary.stableSolutionKey = 'bbb';
    expect(comparePowerAwarePrimaryBackupOptimizerObjectives(stableFirst, stableLater))
      .toBeGreaterThan(0);
  });

  it('uses Estimated Power instead of rarity, allowing a stronger Epic to replace a weaker Legendary', async () => {
    const dragons = [
      rosterDragon('epic', 'Epic'), rosterDragon('r1', 'Rare'), rosterDragon('r2', 'Rare'),
      rosterDragon('legendary', 'Legendary'), rosterDragon('r3', 'Rare'), rosterDragon('r4', 'Rare'),
    ];
    const estimates = estimateMap([
      ['epic', 1000], ['r1', 900], ['r2', 800], ['legendary', 10], ['r3', 700], ['r4', 600],
    ]);
    const candidates = [
      poweredCandidate(['epic', 'r1', 'r2'], 1, estimates),
      poweredCandidate(['legendary', 'r3', 'r4'], 100, estimates),
    ];
    const result = await solvePrimaryBackupRosterOptimizerMip(candidates, dragons, 1, {
      primaryCutoff: determinePrimaryPowerCutoff(estimates, 3),
      estimatesByDragonId: estimates,
    });
    expect(result.primaryCandidates[0]!.dragonIds).toContain('epic');
    expect(result.primaryCandidates[0]!.dragonIds).not.toContain('legendary');
    expect(result.objective.primary.rarityPriority.legendaryCount).toBe(0);
  });

  it('matches the independent oracle and remains invariant under candidate and dragon reversal', async () => {
    const fixture = parityFixture();
    const cutoff = determinePrimaryPowerCutoff(fixture.estimates, 3);
    const forward = await solvePrimaryBackupRosterOptimizerMip(
      fixture.candidates,
      fixture.dragons,
      1,
      { primaryCutoff: cutoff, estimatesByDragonId: fixture.estimates },
    );
    const reversed = await solvePrimaryBackupRosterOptimizerMip(
      [...fixture.candidates].reverse(),
      [...fixture.dragons].reverse(),
      1,
      { primaryCutoff: cutoff, estimatesByDragonId: fixture.estimates },
    );
    const oracle = solvePowerAwarePrimaryBackupCandidates(
      fixture.candidates,
      fixture.dragons,
      fixture.estimates,
      { formationsPerWave: 1 },
    );
    expect(forward.objective).toEqual(oracle?.objective);
    expect(reversed.objective).toEqual(forward.objective);
    expect(reversed.primaryCandidates.map((candidate) => candidate.stableCandidateKey))
      .toEqual(forward.primaryCandidates.map((candidate) => candidate.stableCandidateKey));
    expect(ROSTER_OPTIMIZER_MIP_GAP_OPTIONS).toEqual({ mip_rel_gap: 0, mip_abs_gap: 0 });
    expect(forward.optimal).toBe(true);
  });

  it('cancellation cannot return a partial Power-Aware oracle optimum', () => {
    const fixture = parityFixture();
    expect(() => solvePowerAwarePrimaryBackupCandidates(
      fixture.candidates,
      fixture.dragons,
      fixture.estimates,
      { formationsPerWave: 1, shouldCancel: () => true },
    )).toThrow(RosterOptimizerCancelledError);
  });

  it('treats low confidence as a warning diagnostic rather than an objective', () => {
    const low = estimateMap([['a', 100]], 'low');
    const observed = estimateMap([['a', 100]], 'observed');
    expect(powerConfidenceCounts(['a'], low)).toEqual({ observed: 0, modeled: 0, low: 1 });
    expect(candidatePowerUnits(candidate(['a', 'b', 'c'], 10), estimateMap([
      ['a', 100], ['b', 100], ['c', 100],
    ], 'low'))).toBe(30);
    expect(low.get('a')!.power).toBe(observed.get('a')!.power);
  });

  it('estimates every eligible dragon once and reuses the ID cache', () => {
    const dragons = [rosterDragon('a', 'Rare'), rosterDragon('b', 'Epic')];
    const estimator = vi.fn(({ rarity }: { rarity: string }) =>
      powerEstimate(rarity === 'Epic' ? 200 : 100),
    );
    const cache = buildEstimatedPowerCache(dragons, estimator);
    expect(estimator).toHaveBeenCalledTimes(2);
    expect(cache.get('a')?.power).toBe(100);
    expect(cache.get('b')?.power).toBe(200);
  });

  it('changes only the Power-Aware request fingerprint when the model hash changes', () => {
    const snapshot = [rosterDragon('a', 'Rare')];
    const first = { version: 'estimated-power-v1', modelHash: 'hash-a', observationHash: 'obs' };
    const second = { ...first, modelHash: 'hash-b' };
    expect(createRosterOptimizerRequestFingerprint(
      snapshot,
      'power-aware-primary-five-backup-five',
      first,
    )).not.toBe(createRosterOptimizerRequestFingerprint(
      snapshot,
      'power-aware-primary-five-backup-five',
      second,
    ));
    expect(createRosterOptimizerRequestFingerprint(snapshot, 'best-ten-overall', first))
      .toBe(createRosterOptimizerRequestFingerprint(snapshot, 'best-ten-overall', second));
  });
});

function parityFixture() {
  const dragons = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => rosterDragon(id, 'Rare'));
  const estimates = estimateMap([
    ['a', 100], ['b', 90], ['c', 80], ['d', 80], ['e', 70], ['f', 60], ['g', 50],
  ]);
  return {
    dragons,
    estimates,
    candidates: [
      poweredCandidate(['a', 'b', 'c'], 10, estimates),
      poweredCandidate(['d', 'e', 'f'], 90, estimates),
      poweredCandidate(['a', 'b', 'd'], 20, estimates),
      poweredCandidate(['c', 'e', 'f'], 1, estimates),
    ],
  };
}

function objective(overrides: {
  primaryPower?: number;
  backupPower?: number;
  primaryRatings?: number[];
  backupRatings?: number[];
} = {}): PowerAwarePrimaryBackupOptimizerObjective {
  const wave = (power: number, ratings: number[], key: string) => ({
    rarityPriority: { legendaryCount: 0, epicCount: 0, rareCount: 15 },
    totalEstimatedPower: power,
    totalRating: ratings.reduce((sum, rating) => sum + rating, 0),
    minimumRating: Math.min(...ratings),
    ascendingRatingVector: [...ratings].sort((left, right) => left - right),
    totalRelationshipValue: 1,
    totalActiveRelationships: 1,
    stableSolutionKey: key,
  });
  const primary = wave(overrides.primaryPower ?? 1000, overrides.primaryRatings ?? [10, 10, 10, 10, 10], 'p');
  const backup = wave(overrides.backupPower ?? 1000, overrides.backupRatings ?? [10, 10, 10, 10, 10], 'b');
  return {
    strategy: 'power-aware-primary-five-backup-five',
    primary,
    backup,
    combinedTotalRating: primary.totalRating + backup.totalRating,
    combinedEstimatedPower: primary.totalEstimatedPower + backup.totalEstimatedPower,
    combinedRelationshipValue: 2,
    combinedActiveRelationships: 2,
    stableSolutionKey: `primary:${primary.stableSolutionKey}||backup:${backup.stableSolutionKey}`,
  };
}

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `d${String(index).padStart(2, '0')}`);
}

function rosterDragon(
  dragonId: string,
  rarity: OptimizerRosterDragon['rarity'],
): OptimizerRosterDragon {
  return { dragonId, rarity, starRank: 1, dragonLevel: 1 };
}

function estimateMap(
  entries: Array<[string, number]>,
  confidence: EstimatedPowerConfidence = 'modeled',
): ReadonlyMap<string, EstimatedDragonPower> {
  return new Map(entries.map(([dragonId, power]) => [dragonId, powerEstimate(power, confidence)]));
}

function powerEstimate(
  power: number,
  confidence: EstimatedPowerConfidence = 'modeled',
): EstimatedDragonPower {
  return {
    power,
    confidence,
    modelVersion: 'estimated-power-v1',
    modelHash: 'model',
    observationHash: 'observations',
    basis: confidence === 'observed' ? 'exact-observation' : confidence === 'low' ? 'extrapolation' : 'interpolation',
  };
}

function poweredCandidate(
  dragonIds: [string, string, string],
  rating: number,
  estimates: ReadonlyMap<string, EstimatedDragonPower>,
): OptimizerFormationCandidate {
  const result = candidate(dragonIds, rating);
  result.estimatedPowerUnits = candidatePowerUnits(result, estimates);
  return result;
}

function candidate(
  dragonIds: [string, string, string],
  rating: number,
): OptimizerFormationCandidate {
  return {
    stableCandidateKey: [...dragonIds].sort().join(':'),
    dragonIds,
    dragonMask: 0n,
    arrangement: { 'left-flank': dragonIds[0], vanguard: dragonIds[1], 'right-flank': dragonIds[2] },
    tiedBestArrangements: [],
    rating,
    tier: 'Solid',
    activeSynergyScore: Math.max(0, rating - 20),
    placementScore: 20,
    activeRelationshipValue: rating,
    activeRelationshipCount: 1,
    participatingDragonCount: 3,
    relationships: [],
    strengths: [],
    gaps: [],
    progressionSnapshot: {},
  };
}

function choose(values: string[], count: number): string[][] {
  const result: string[][] = [];
  const visit = (start: number, selected: string[]) => {
    if (selected.length === count) {
      result.push([...selected]);
      return;
    }
    for (let index = start; index < values.length; index += 1) {
      selected.push(values[index]!);
      visit(index + 1, selected);
      selected.pop();
    }
  };
  visit(0, []);
  return result;
}
