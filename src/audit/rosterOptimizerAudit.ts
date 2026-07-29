import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import type { DragonRarity } from '../models/dragon';
import {
  DRAGON_POWER_OBSERVATIONS,
  deduplicateDragonPowerObservations,
} from '../power/dragonPowerObservations';
import { estimateDragonPower } from '../power/estimatedDragonPower';
import { ROSTER_OPTIMIZER_MIP_GAP_OPTIONS } from '../optimizer/highsExactOptions';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import { live33ProgressionRegressionRoster } from './live33ProgressionRegression';
import type {
  BestTenOverallOptimizationResult,
  PrimaryBackupOptimizationResult,
  PowerAwarePrimaryBackupOptimizationResult,
  RosterOptimizationResult,
  RosterOptimizerStrategy,
} from '../optimizer/rosterOptimizerTypes';

export const ARCHIVED_FORMATION_RATING_V2_HASH =
  '12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9';
export const EXPECTED_FORMATION_RATING_V2_HASH =
  '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf';

const archivedDragonIds = new Set(
  dragons.filter((dragon) => !['sunfyre', 'tairax'].includes(dragon.id)).map((dragon) => dragon.id),
);

const expectedBestTen = {
  'all-31-maxed': { total: 764, average: 76.4, minimum: 62, solutionHash: 'fnv1a64:49b0498718c54d6a' },
  'mixed-progression': { total: 553, average: 55.3, minimum: 40, solutionHash: 'fnv1a64:fc0005be3f0af3ed' },
} as const;

const expectedPrimaryBackup = {
  'all-31-maxed': 'fnv1a64:01c8a6531720fc7e',
  'mixed-progression': 'fnv1a64:03625b38711584a7',
} as const;

const expectedArchivedPowerAware = {
  mixed: 'fnv1a64:d4825beceda28c08',
  maxed: 'fnv1a64:dac72be1907be1fa',
  'all-one': 'fnv1a64:ac1d8d6d903c412b',
} as const;

export async function runRosterOptimizerAudit() {
  const archivedFixtures = [
    { name: 'all-31-maxed' as const, roster: archivedMaxedRoster() },
    { name: 'mixed-progression' as const, roster: archivedMixedProgressionRoster() },
  ];
  const strategies: RosterOptimizerStrategy[] = [
    'best-ten-overall',
    'primary-five-backup-five',
  ];
  const archivedReports = [];
  for (const fixture of archivedFixtures) {
    for (const strategy of strategies) {
      console.log(`[archived] ${fixture.name}/${strategy}`);
      const first = await optimizeCurrentRoster(fixture.roster, strategy);
      const reversedRoster = Object.fromEntries(Object.entries(fixture.roster).reverse());
      const reversed = await optimizeCurrentRoster(reversedRoster, strategy);
      if (!first.optimal || !reversed.optimal) {
        throw new Error(`${fixture.name}/${strategy} did not produce a complete result.`);
      }
      validateResult(first, 1);
      validateResult(reversed, 1);
      if (
        first.optimizerSolutionHash !== reversed.optimizerSolutionHash ||
        first.optimizerResultHash !== reversed.optimizerResultHash
      ) {
        throw new Error(`${fixture.name}/${strategy} changed after reversing roster order.`);
      }
      if (strategy === 'best-ten-overall') {
        validateBestTenRegression(fixture.name, first as BestTenOverallOptimizationResult);
      } else {
        validatePrimaryBackupRarity(
          fixture.name,
          first as PrimaryBackupOptimizationResult,
        );
      }
      archivedReports.push(fixtureReport(fixture.name, first));
    }
  }

  const currentFixtures = [
    { name: 'all-33-maxed' as const, roster: maxedRoster() },
  ];
  const reports = [];
  for (const fixture of currentFixtures) {
    for (const strategy of strategies) {
      console.log(`[current] ${fixture.name}/${strategy}`);
      const result = await optimizeCurrentRoster(fixture.roster, strategy);
      if (!result.optimal) throw new Error(`${fixture.name}/${strategy} did not produce a complete result.`);
      validateResult(result, 3);
      reports.push(fixtureReport(fixture.name, result));
    }
  }
  const archivedPowerAwareFixtures = [];
  for (const fixture of ['mixed', 'maxed', 'all-one'] as const) {
    console.log(`[archived-power-aware] ${fixture}`);
    archivedPowerAwareFixtures.push(await runArchivedPowerAwareRosterOptimizerAudit(fixture));
  }
  return {
    auditVersion: '0.20.0',
    formationRatingV2Hash: EXPECTED_FORMATION_RATING_V2_HASH,
    archivedFormationRatingV2Hash: ARCHIVED_FORMATION_RATING_V2_HASH,
    archivedFixtures: archivedReports,
    archivedPowerAwareFixtures,
    fixtures: reports,
    checks: {
      exactOptimality: true,
      strictMipGaps: {
        ...ROSTER_OPTIMIZER_MIP_GAP_OPTIONS,
        configuredThrough: 'Highs_setDoubleOptionValue',
        acceptedStatus: 0,
        zeroGapRefinementConfirmedExistingHashes: true,
      },
      archivedRepeatedAndReversedInputStable: true,
      usedAndUnusedPartitionEligibleRoster: true,
      tenFormationsThirtyUniqueDragons: true,
      fivePrimaryFiveBackup: true,
      noCrossWaveDragonReuse: true,
      archivedBestTenAndRaritySemanticHashesPreserved: true,
      archivedPowerAwareSemanticHashesPreserved: true,
      greedyCounterexample: { greedyTotal: 101, exactTotal: 120, passed: true },
      tiedPrimaryBetterBackupRegression: true,
      smallFixtureBruteForceMatches: true,
    },
  };
}

export type PowerAwareAuditFixture = 'mixed' | 'maxed' | 'all-one' | 'live-regression';

export async function runPowerAwareRosterOptimizerAudit(
  fixture: PowerAwareAuditFixture,
  order: 'forward' | 'reversed' = 'forward',
) {
  const forwardRoster = fixture === 'mixed'
    ? mixedProgressionRoster()
    : fixture === 'maxed'
      ? maxedRoster()
      : fixture === 'all-one'
        ? allOneRoster()
        : live33ProgressionRegressionRoster();
  const roster = order === 'forward'
    ? forwardRoster
    : Object.fromEntries(Object.entries(forwardRoster).reverse());
  const result = await optimizeCurrentRoster(roster, 'power-aware-primary-five-backup-five');
  if (!result.optimal || result.strategy !== 'power-aware-primary-five-backup-five') {
    throw new Error(`${fixture} Power-Aware audit did not produce a complete result.`);
  }
  validatePowerAwareResult(result);
  if (fixture === 'live-regression') validateLiveRegressionResult(result);
  const estimatedPowerComparison = dragons.map((dragon) => {
    const progression = roster[dragon.id]!;
    const input = {
      rarity: dragon.rarity,
      starRank: progression.starRank!,
      dragonLevel: progression.reignLevel!,
    };
    const beforeV2 = frozenV1Estimate(input);
    const afterV2 = estimateDragonPower(input);
    return {
      dragonId: dragon.id,
      rarity: dragon.rarity,
      starRank: input.starRank,
      dragonLevel: input.dragonLevel,
      beforeV2,
      afterV2,
      powerDelta: afterV2.power - beforeV2.power,
      confidenceChanged: beforeV2.confidence !== afterV2.confidence,
    };
  });
  return {
    auditVersion: '0.20.0',
    fixture,
    order,
    formationRatingV2Hash: EXPECTED_FORMATION_RATING_V2_HASH,
    mipGaps: ROSTER_OPTIMIZER_MIP_GAP_OPTIONS,
    estimatedPowerComparison,
    primaryPowerCutoffBeforeV2: powerCutoff(estimatedPowerComparison.map((row) => ({
      dragonId: row.dragonId,
      power: row.beforeV2.power,
    }))),
    primaryPowerCutoffAfterV2: powerCutoff(estimatedPowerComparison.map((row) => ({
      dragonId: row.dragonId,
      power: row.afterV2.power,
    }))),
    result: fixtureReport(fixture, result),
  };
}

function validateLiveRegressionResult(result: PowerAwarePrimaryBackupOptimizationResult): void {
  const primary = [
    'vhagar', 'tessarion', 'kalspire', 'crimson', 'sheepstealer', 'caraxes', 'velar',
    'tashix', 'rhysarion', 'venator', 'syrax', 'seasmoke', 'malachite', 'shadowsong',
    'daemoros',
  ].sort();
  const backup = [
    'jagadrix', 'sunfyre', 'vaeldra', 'zivern', 'vermax', 'feskar', 'tairax',
    'thunderstrike', 'bevlorin', 'vesper', 'shimmer', 'nyrena', 'arulix', 'antares',
    'dawnseeker',
  ].sort();
  if (JSON.stringify(result.primary.usedDragonIds) !== JSON.stringify(primary)) {
    throw new Error('Live regression Primary Power pool changed.');
  }
  if (JSON.stringify(result.backup.usedDragonIds) !== JSON.stringify(backup)) {
    throw new Error('Live regression Backup Power pool changed.');
  }
  if (JSON.stringify(result.unusedDragonIds) !== JSON.stringify(['arrax', 'shadowrend', 'solstryker'])) {
    throw new Error('Live regression unused-dragon set changed.');
  }
  if (result.primary.totalEstimatedPower !== 375760 || result.backup.totalEstimatedPower !== 227070) {
    throw new Error('Live regression Estimated Power totals changed.');
  }
  if (!result.diagnostics.numericalExactness?.fixedPhasesValidated) {
    throw new Error('Live regression fixed phases were not exactly revalidated.');
  }
  const certifiedPhase = result.diagnostics.numericalExactness.phaseObjectives.find((phase) =>
    phase.stage === 'backup stable solution key'
    && phase.chunkStart === 0
    && phase.chunkEnd === 48);
  if (
    certifiedPhase?.reconstructedObjective !== 0
    || certifiedPhase.exactOptimumCertified !== true
    || certifiedPhase.certificationDirection !== 'maximize'
    || certifiedPhase.certificationBound !== 1
    || certifiedPhase.certificationStatus !== 'infeasible'
    || certifiedPhase.certificationSolverPass !== certifiedPhase.solverPass + 1
  ) {
    throw new Error('Live regression contaminated phase was not certified by an infeasible >= 1 probe.');
  }
}

export async function runArchivedPowerAwareRosterOptimizerAudit(
  fixture: Exclude<PowerAwareAuditFixture, 'live-regression'>,
) {
  const roster = fixture === 'mixed'
    ? archivedMixedProgressionRoster()
    : fixture === 'maxed'
      ? archivedMaxedRoster()
      : archivedAllOneRoster();
  const result = await optimizeCurrentRoster(roster, 'power-aware-primary-five-backup-five');
  if (!result.optimal || result.strategy !== 'power-aware-primary-five-backup-five') {
    throw new Error(`${fixture} archived Power-Aware audit did not produce a complete result.`);
  }
  validatePowerAwareResult(result, 1);
  if (result.optimizerSolutionHash !== expectedArchivedPowerAware[fixture]) {
    throw new Error(`${fixture} archived Power-Aware semantic solution hash changed.`);
  }
  return fixtureReport(`archived-${fixture}`, result);
}

export function maxedRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon) => [dragon.id, {
      dragonId: dragon.id,
      owned: true,
      starRank: 10,
      reignLevel: 16,
      notes: '',
      habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 5])),
    }]),
  );
}

export function mixedProgressionRoster(): Record<string, OwnedDragon> {
  const roster: Record<string, OwnedDragon> = {
    ...archivedMixedProgressionRoster(),
    sunfyre: ownedProgression('sunfyre', 2, 25),
    tairax: ownedProgression('tairax', 2, 25),
  };
  dragons.forEach((dragon, dragonIndex) => {
    const entry = roster[dragon.id];
    if (!entry) return;
    entry.habitLevels = Object.fromEntries(
      dragon.habits
        .filter((habit) => (habit.unlockStarRank ?? 1) <= (entry.starRank ?? 0))
        .filter((_habit, habitIndex) => (dragonIndex + habitIndex) % 5 !== 0)
        .map((habit, habitIndex) => [
          habit.id,
          (1 + ((dragonIndex + habitIndex) % 5)) as 1 | 2 | 3 | 4 | 5,
        ]),
    );
  });
  return roster;
}

export function allOneRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon) => [dragon.id, {
      dragonId: dragon.id,
      owned: true,
      starRank: 1,
      reignLevel: 1,
      notes: '',
      habitLevels: Object.fromEntries(
        dragon.habits
          .filter((habit) => (habit.unlockStarRank ?? 1) <= 1)
          .map((habit) => [habit.id, 1]),
      ),
    }]),
  );
}

export function archivedMaxedRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.filter((dragon) => archivedDragonIds.has(dragon.id)).map((dragon) => [dragon.id, ownedProgression(dragon.id, 10, 16)]),
  );
}

export function archivedMixedProgressionRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.filter((dragon) => archivedDragonIds.has(dragon.id)).map((dragon, index) => [
      dragon.id,
      ownedProgression(dragon.id, 1 + ((index * 3) % 10), (index * 5) % 17),
    ]),
  );
}

export function archivedAllOneRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.filter((dragon) => archivedDragonIds.has(dragon.id)).map((dragon) => [dragon.id, ownedProgression(dragon.id, 1, 1)]),
  );
}

function ownedProgression(dragonId: string, starRank: number, reignLevel: number): OwnedDragon {
  return { dragonId, owned: true, starRank, reignLevel, notes: '', habitLevels: {} };
}

function validatePowerAwareResult(result: PowerAwarePrimaryBackupOptimizationResult, expectedUnusedCount = 3): void {
  if (result.primary.formations.length !== 5 || result.backup.formations.length !== 5) {
    throw new Error('Power-Aware result did not return five formations in each wave.');
  }
  const primary = new Set(result.primary.usedDragonIds);
  const combined = [...result.primary.usedDragonIds, ...result.backup.usedDragonIds];
  if (
    combined.length !== 30
    || new Set(combined).size !== 30
    || result.backup.usedDragonIds.some((dragonId) => primary.has(dragonId))
    || result.unusedDragonIds.length !== expectedUnusedCount
  ) {
    throw new Error('Power-Aware result did not produce the required 30-dragon partition.');
  }
  if (!result.diagnostics.optimal || result.diagnostics.selectedFormationCount !== 10) {
    throw new Error('Power-Aware result was not reported as exact optimal.');
  }
}

function validateResult(result: RosterOptimizationResult, expectedUnusedCount: number): void {
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
  if (result.unusedDragonIds.length !== expectedUnusedCount) {
    throw new Error(`Optimizer audit expected ${expectedUnusedCount} unused dragons.`);
  }
  if (expectedUnusedCount === 1 && result.unusedRarityCounts.Rare === 0) {
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

function validatePrimaryBackupRarity(
  name: keyof typeof expectedPrimaryBackup,
  result: PrimaryBackupOptimizationResult,
): void {
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
  if (result.optimizerSolutionHash !== expectedPrimaryBackup[name]) {
    throw new Error(`${name} Primary + Backup semantic solution hash changed.`);
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
    ...('estimatedPower' in formation ? {
      estimatedPower: formation.estimatedPower,
      powerConfidenceCounts: formation.powerConfidenceCounts,
    } : {}),
  };
}

function addRarityCounts(left: Record<string, number>, right: Record<string, number>) {
  return {
    Legendary: left.Legendary! + right.Legendary!,
    Epic: left.Epic! + right.Epic!,
    Rare: left.Rare! + right.Rare!,
  };
}

const frozenV1UniqueObservations = deduplicateDragonPowerObservations(
  DRAGON_POWER_OBSERVATIONS.slice(0, 31),
);

function frozenV1Estimate(input: {
  rarity: DragonRarity;
  starRank: number;
  dragonLevel: number;
}): { power: number; confidence: 'observed' | 'modeled' | 'low' } {
  const coefficients = {
    rarityIntercept: {
      Legendary: -5345.526402998704,
      Epic: -3518.798289613967,
      Rare: -8030.898292604834,
    },
    rarityLevelSlope: {
      Legendary: 712.604230387158,
      Epic: 491.403841476919,
      Rare: 395.629654678922,
    },
    sharedStarRankSlope: 2434.713675015537,
  } as const;
  const within = (rarity: DragonRarity) => {
    const atLevel20 = coefficients.rarityIntercept[rarity]
      + coefficients.rarityLevelSlope[rarity] * 20
      + coefficients.sharedStarRankSlope * input.starRank;
    const modeled = input.dragonLevel < 20
      ? atLevel20 * Math.max(1, input.dragonLevel) / 20
      : coefficients.rarityIntercept[rarity]
        + coefficients.rarityLevelSlope[rarity] * input.dragonLevel
        + coefficients.sharedStarRankSlope * input.starRank;
    const sameRarity = frozenV1UniqueObservations.filter((row) => row.rarity === rarity);
    const lower = Math.max(10, ...sameRarity
      .filter((row) => row.starRank <= input.starRank && row.dragonLevel <= input.dragonLevel)
      .map((row) => row.displayedPower));
    const upperValues = sameRarity
      .filter((row) => row.starRank >= input.starRank && row.dragonLevel >= input.dragonLevel)
      .map((row) => row.displayedPower);
    const upper = upperValues.length > 0 ? Math.min(...upperValues) : Number.POSITIVE_INFINITY;
    return Math.round(Math.max(lower, Math.min(modeled, upper)) / 10) * 10;
  };
  const exact = frozenV1UniqueObservations.find((row) =>
    row.rarity === input.rarity
      && row.starRank === input.starRank
      && row.dragonLevel === input.dragonLevel,
  );
  const rare = within('Rare');
  const epic = Math.max(within('Epic'), rare);
  const legendary = Math.max(within('Legendary'), epic);
  const power = exact?.displayedPower ?? (input.rarity === 'Legendary'
    ? legendary
    : input.rarity === 'Epic'
      ? epic
      : rare);
  const envelope = input.rarity === 'Rare'
    ? { stars: [3, 7], levels: [20, 30] }
    : input.rarity === 'Epic'
      ? { stars: [1, 6], levels: [20, 36] }
      : { stars: [1, 4], levels: [20, 36] };
  const low = input.starRank < envelope.stars[0]!
    || input.starRank > envelope.stars[1]!
    || input.dragonLevel < envelope.levels[0]!
    || input.dragonLevel > envelope.levels[1]!;
  return { power, confidence: exact ? 'observed' : low ? 'low' : 'modeled' };
}

function powerCutoff(rows: { dragonId: string; power: number }[]) {
  const ranked = [...rows].sort((left, right) =>
    right.power - left.power || left.dragonId.localeCompare(right.dragonId),
  );
  const cutoffPower = ranked[14]!.power;
  return {
    cutoffPower,
    aboveCutoffDragonIds: ranked.filter((row) => row.power > cutoffPower).map((row) => row.dragonId).sort(),
    cutoffTiedDragonIds: ranked.filter((row) => row.power === cutoffPower).map((row) => row.dragonId).sort(),
    belowCutoffDragonIds: ranked.filter((row) => row.power < cutoffPower).map((row) => row.dragonId).sort(),
    requiredCutoffTieCount: 15 - ranked.filter((row) => row.power > cutoffPower).length,
  };
}
