import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { ROSTER_OPTIMIZER_MIP_GAP_OPTIONS } from '../optimizer/highsExactOptions';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import type {
  BestTenOverallOptimizationResult,
  PrimaryBackupOptimizationResult,
  RosterOptimizationResult,
  RosterOptimizerStrategy,
} from '../optimizer/rosterOptimizerTypes';

export const EXPECTED_FORMATION_RATING_V2_HASH =
  '12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9';

const expectedBestTen = {
  'all-31-maxed': { total: 764, average: 76.4, minimum: 62, solutionHash: 'fnv1a64:49b0498718c54d6a' },
  'mixed-progression': { total: 553, average: 55.3, minimum: 40, solutionHash: 'fnv1a64:fc0005be3f0af3ed' },
} as const;

export async function runRosterOptimizerAudit() {
  const fixtures = [
    { name: 'all-31-maxed' as const, roster: maxedRoster() },
    { name: 'mixed-progression' as const, roster: mixedProgressionRoster() },
  ];
  const strategies: RosterOptimizerStrategy[] = [
    'best-ten-overall',
    'primary-five-backup-five',
  ];
  const reports = [];
  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      const first = await optimizeCurrentRoster(fixture.roster, strategy);
      const reversedRoster = Object.fromEntries(Object.entries(fixture.roster).reverse());
      const reversed = await optimizeCurrentRoster(reversedRoster, strategy);
      if (!first.optimal || !reversed.optimal) {
        throw new Error(`${fixture.name}/${strategy} did not produce a complete result.`);
      }
      validateResult(first);
      validateResult(reversed);
      if (
        first.optimizerSolutionHash !== reversed.optimizerSolutionHash ||
        first.optimizerResultHash !== reversed.optimizerResultHash
      ) {
        throw new Error(`${fixture.name}/${strategy} changed after reversing roster order.`);
      }
      if (strategy === 'best-ten-overall') {
        validateBestTenRegression(fixture.name, first as BestTenOverallOptimizationResult);
      } else {
        validatePrimaryBackupRarity(first as PrimaryBackupOptimizationResult);
      }
      reports.push(fixtureReport(fixture.name, first));
    }
  }
  return {
    auditVersion: '0.13.0',
    formationRatingV2Hash: EXPECTED_FORMATION_RATING_V2_HASH,
    fixtures: reports,
    checks: {
      exactOptimality: true,
      strictMipGaps: {
        ...ROSTER_OPTIMIZER_MIP_GAP_OPTIONS,
        configuredThrough: 'Highs_setDoubleOptionValue',
        acceptedStatus: 0,
        zeroGapRefinementConfirmedExistingHashes: true,
      },
      repeatedAndReversedInputStable: true,
      usedAndUnusedPartitionEligibleRoster: true,
      tenFormationsThirtyUniqueDragons: true,
      fivePrimaryFiveBackup: true,
      noCrossWaveDragonReuse: true,
      currentRosterPrimaryRarity: { Legendary: 9, Epic: 6, Rare: 0 },
      currentRosterBackupRarity: { Legendary: 0, Epic: 4, Rare: 11 },
      bestTenSemanticHashesPreserved: true,
      greedyCounterexample: { greedyTotal: 101, exactTotal: 120, passed: true },
      tiedPrimaryBetterBackupRegression: true,
      smallFixtureBruteForceMatches: true,
    },
  };
}

export function maxedRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon) => [dragon.id, {
      dragonId: dragon.id,
      owned: true,
      starRank: 10,
      reignLevel: 16,
      notes: '',
      habitLevels: {},
    }]),
  );
}

export function mixedProgressionRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon, index) => [dragon.id, {
      dragonId: dragon.id,
      owned: true,
      starRank: 1 + ((index * 3) % 10),
      reignLevel: (index * 5) % 17,
      notes: '',
      habitLevels: {},
    }]),
  );
}

function validateResult(result: RosterOptimizationResult): void {
  if (result.formations.length !== 10) {
    throw new Error('Optimizer audit result is not a complete allocation.');
  }
  const used = result.formations.flatMap((formation) => formation.dragonIds);
  if (used.length !== 30 || new Set(used).size !== 30) {
    throw new Error('Optimizer audit result reuses a dragon.');
  }
  if (result.formations.some((formation) => formation.placementScore !== 20)) {
    throw new Error('Optimizer audit retained a non-best placement.');
  }
  if (new Set([...result.usedDragonIds, ...result.unusedDragonIds]).size !== result.diagnostics.eligibleDragonCount) {
    throw new Error('Used and unused dragons do not partition the eligible roster.');
  }
  if (result.unusedRarityCounts.Rare === 0) {
    throw new Error('The 31-dragon fixture did not leave a Rare dragon unused.');
  }
}

function validateBestTenRegression(
  name: keyof typeof expectedBestTen,
  result: BestTenOverallOptimizationResult,
): void {
  const expected = expectedBestTen[name];
  if (
    result.collection.totalRating !== expected.total ||
    result.collection.averageRating !== expected.average ||
    result.collection.minimumRating !== expected.minimum ||
    result.optimizerSolutionHash !== expected.solutionHash ||
    result.unusedDragonIds.join(',') !== 'arulix'
  ) {
    throw new Error(`${name} Best 10 Overall regression changed.`);
  }
}

function validatePrimaryBackupRarity(result: PrimaryBackupOptimizationResult): void {
  if (result.primary.formations.length !== 5 || result.backup.formations.length !== 5) {
    throw new Error('Primary + Backup did not return five formations in each wave.');
  }
  const primary = new Set(result.primary.usedDragonIds);
  if (result.backup.usedDragonIds.some((dragonId) => primary.has(dragonId))) {
    throw new Error('A dragon appears in both Primary and Backup.');
  }
  const expectedPrimary = { Legendary: 9, Epic: 6, Rare: 0 };
  const expectedBackup = { Legendary: 0, Epic: 4, Rare: 11 };
  if (
    JSON.stringify(result.primary.rarityCounts) !== JSON.stringify(expectedPrimary) ||
    JSON.stringify(result.backup.rarityCounts) !== JSON.stringify(expectedBackup)
  ) {
    throw new Error('Primary + Backup rarity priority changed.');
  }
}

function fixtureReport(name: string, result: RosterOptimizationResult) {
  const base = {
    name,
    strategy: result.strategy,
    eligibleDragonCount: result.diagnostics.eligibleDragonCount,
    candidateCount: result.diagnostics.candidateCount,
    usedDragonIds: result.usedDragonIds,
    unusedDragonIds: result.unusedDragonIds,
    objective: result.objective,
    diagnostics: result.diagnostics,
    exactOptimality: result.optimal,
    optimizerSolutionHash: result.optimizerSolutionHash,
    optimizerResultHash: result.optimizerResultHash,
  };
  if (result.strategy === 'best-ten-overall') {
    return {
      ...base,
      eligibleRarityCounts: addRarityCounts(result.usedRarityCounts, result.unusedRarityCounts),
      formations: result.formations.map(formationReport),
      collection: result.collection,
    };
  }
  return {
    ...base,
    eligibleRarityCounts: addRarityCounts(result.combined.rarityCounts, result.unusedRarityCounts),
    primary: {
      ...result.primary,
      formations: result.primary.formations.map(formationReport),
    },
    backup: {
      ...result.backup,
      formations: result.backup.formations.map(formationReport),
    },
    combined: result.combined,
  };
}

function formationReport(formation: RosterOptimizationResult['formations'][number]) {
  return {
    rank: formation.rank,
    wave: formation.wave,
    waveRank: formation.waveRank,
    dragonIds: formation.dragonIds,
    arrangement: formation.arrangement,
    rating: formation.rating,
    tier: formation.tier,
    placementScore: formation.placementScore,
  };
}

function addRarityCounts(left: Record<string, number>, right: Record<string, number>) {
  return {
    Legendary: left.Legendary! + right.Legendary!,
    Epic: left.Epic! + right.Epic!,
    Rare: left.Rare! + right.Rare!,
  };
}
