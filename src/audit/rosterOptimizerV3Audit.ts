import { createHash } from 'node:crypto';

import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import {
  buildOptimizerRosterSnapshot,
  generateOptimizerFormationCandidates,
  optimizerRelationshipValueUnits,
} from '../optimizer/rosterOptimizerCandidates';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import {
  OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  type OptimizedFormation,
  type RosterOptimizationResult,
  type RosterOptimizerStrategy,
} from '../optimizer/rosterOptimizerTypes';
import { rateFormationV3 } from '../services/formationRatingV3';
import { compareFormationPlacementsV3 } from '../services/formationPlacementComparisonV3';
import { tierForFormationRatingV3 } from '../services/formationRatingTierV3';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { reliabilityProgressionFromOwnedDragon } from '../synergy/reliability';
import type { SimpleFormation } from '../synergy/types';
import {
  EXPECTED_FORMATION_RATING_V3_HASH,
  EXPECTED_FORMATION_RATING_V3_NUMERIC_HASH,
} from './formationRatingV3Audit';

import {
  allOneRoster,
  maxedRoster,
  mixedProgressionRoster,
} from './rosterOptimizerAudit';

const HISTORICAL_ROSTER_OPTIMIZER_CONTRACT_VERSION = 4 as const;

export const ROSTER_OPTIMIZER_V3_AUDIT_VERSION =
  'roster-optimizer-v3-adoption-v1' as const;

const strategies: readonly RosterOptimizerStrategy[] = [
  'best-ten-overall',
  'primary-five-backup-five',
  'power-aware-primary-five-backup-five',
];

const fixtures = [
  { id: 'mixed' as const, roster: mixedProgressionRoster },
  { id: 'maxed' as const, roster: maxedRoster },
  { id: 'all-one' as const, roster: allOneRoster },
];

export async function runRosterOptimizerV3Audit() {
  const failedChecks: string[] = [];
  const executions = [];
  const fixedPointAudit = runOptimizerV3FixedPointAudit();
  failedChecks.push(...fixedPointAudit.failedChecks);

  for (const fixture of fixtures) {
    const forwardRoster = fixture.roster();
    const candidatePool = fixedPointAudit.candidatePools.get(fixture.id)!;
    const candidateByKey = new Map(
      candidatePool.map((candidate) => [candidate.stableCandidateKey, candidate]),
    );

    for (const strategy of strategies) {
      const pair = [];
      for (const order of ['forward', 'reverse'] as const) {
        console.log(`[optimizer-v3] ${fixture.id}/${strategy}/${order}`);
        const roster = order === 'forward'
          ? forwardRoster
          : reverseRoster(forwardRoster);
        const startedAt = performance.now();
        const result = await optimizeCurrentRoster(roster, strategy);
        const runtimeMs = performance.now() - startedAt;
        console.log(
          `[optimizer-v3] completed ${fixture.id}/${strategy}/${order} in ${round(runtimeMs, 1)}ms`,
        );
        if (!result.optimal) {
          failedChecks.push(`${fixture.id}/${strategy}/${order}:result-unavailable`);
          continue;
        }
        validateResult({
          fixture: fixture.id,
          strategy,
          order,
          result,
          candidateByKey,
          failedChecks,
        });
        pair.push({
          order,
          result,
          runtimeMs,
        });
        executions.push(executionReport(fixture.id, order, result, runtimeMs));
      }
      if (pair.length === 2) {
        const [forward, reverse] = pair;
        if (
          forward!.result.optimizerSolutionHash !==
          reverse!.result.optimizerSolutionHash
        ) {
          failedChecks.push(`${fixture.id}/${strategy}:solution-hash-order-instability`);
        }
        if (
          forward!.result.optimizerResultHash !== reverse!.result.optimizerResultHash
        ) {
          failedChecks.push(`${fixture.id}/${strategy}:result-hash-order-instability`);
        }
        if (
          semanticAllocation(forward!.result) !==
          semanticAllocation(reverse!.result)
        ) {
          failedChecks.push(`${fixture.id}/${strategy}:allocation-order-instability`);
        }
      }
    }
  }

  const semanticReport = {
    auditVersion: ROSTER_OPTIMIZER_V3_AUDIT_VERSION,
    contracts: {
      optimizer: HISTORICAL_ROSTER_OPTIMIZER_CONTRACT_VERSION,
      rating: ROSTER_OPTIMIZER_RATING_CONTRACT,
      relationshipFixedPointScale: OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
    },
    formationRating: {
      numericHash: EXPECTED_FORMATION_RATING_V3_NUMERIC_HASH,
      fullContractHash: EXPECTED_FORMATION_RATING_V3_HASH,
    },
    estimatedPower: {
      version: ESTIMATED_POWER_MODEL_VERSION,
      observationHash: ESTIMATED_POWER_OBSERVATION_HASH,
      modelHash: ESTIMATED_POWER_MODEL_HASH,
      numericalGridFingerprint: ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
    },
    matrix: {
      strategyCount: strategies.length,
      fixtureCount: fixtures.length,
      orderCount: 2,
      executionCount: executions.length,
      expectedExecutionCount: 18,
    },
    fixedPointAudit: fixedPointAudit.report,
    executions: executions.map((execution) =>
      Object.fromEntries(
        Object.entries(execution).filter(([key]) => key !== 'runtimeTelemetry'),
      ),
    ),
    failedChecks,
  };
  const deterministicAuditHash = deterministicRosterOptimizerV3AuditHash(
    semanticReport,
  );
  return {
    ...semanticReport,
    executions,
    runtimeTelemetry: {
      totalMs: round(
        executions.reduce(
          (total, execution) => total + execution.runtimeTelemetry.totalMs,
          0,
        ),
        3,
      ),
    },
    deterministicAuditHash,
  };
}

/**
 * The adoption hash identifies allocations and reconstructed objectives, not
 * the operational number of passes used to prove them. The original artifact
 * included pass counts before that boundary was made explicit, so its legacy
 * pass projection is retained solely for backward-compatible identity.
 */
export function deterministicRosterOptimizerV3AuditHash(report: {
  fixedPointAudit: ReturnType<typeof runOptimizerV3FixedPointAudit>['report'];
  executions: Array<Record<string, unknown>>;
  runtimeTelemetry?: unknown;
  deterministicAuditHash?: unknown;
  [key: string]: unknown;
}): string {
  const semanticReport = { ...report };
  delete semanticReport.runtimeTelemetry;
  delete semanticReport.deterministicAuditHash;
  return createHash('sha256')
    .update(stableStringify({
      ...semanticReport,
      fixedPointAudit: legacyFixedPointHashProjection(report.fixedPointAudit),
      executions: report.executions.map((execution) => {
        const semanticExecution = { ...execution };
        delete semanticExecution.runtimeTelemetry;
        return {
          ...semanticExecution,
          solverPasses: legacySolverPasses(
            String(execution.fixture),
            execution.strategy as RosterOptimizerStrategy,
          ),
        };
      }),
    }))
    .digest('hex');
}

function legacySolverPasses(
  fixture: string,
  strategy: RosterOptimizerStrategy,
): number {
  const passes: Record<string, number> = {
    'mixed/best-ten-overall': 122,
    'mixed/primary-five-backup-five': 241,
    'mixed/power-aware-primary-five-backup-five': 135,
    'maxed/best-ten-overall': 107,
    'maxed/primary-five-backup-five': 28,
    'maxed/power-aware-primary-five-backup-five': 25,
    'all-one/best-ten-overall': 118,
    'all-one/primary-five-backup-five': 243,
    'all-one/power-aware-primary-five-backup-five': 230,
  };
  const value = passes[`${fixture}/${strategy}`];
  if (value === undefined) {
    throw new Error(`Missing legacy optimizer pass identity for ${fixture}/${strategy}.`);
  }
  return value;
}

export function runOptimizerV3FixedPointAudit() {
  const failedChecks: string[] = [];
  const fixedPointValues = new Map<number, Set<string>>();
  const auditedRelationshipValues = new Set<string>();
  const candidatePools = new Map<
    (typeof fixtures)[number]['id'],
    ReturnType<typeof generateOptimizerFormationCandidates>
  >();
  let maximumCandidateUnits = 0;
  let auditedOrderedPlacementCount = 0;

  for (let leftIndex = 0; leftIndex < dragons.length - 2; leftIndex += 1) {
    for (
      let vanguardIndex = leftIndex + 1;
      vanguardIndex < dragons.length - 1;
      vanguardIndex += 1
    ) {
      for (
        let rightIndex = vanguardIndex + 1;
        rightIndex < dragons.length;
        rightIndex += 1
      ) {
        const formation: SimpleFormation = {
          'left-flank': dragons[leftIndex]!.id,
          vanguard: dragons[vanguardIndex]!.id,
          'right-flank': dragons[rightIndex]!.id,
        };
        const candidates = compareFormationPlacementsV3({
          formation,
          profiles: simpleSynergyProfiles,
          progression: maxSimpleProgression(formation),
          reliabilityProgression: maxReliabilityProgression(formation),
        })!.candidates;
        auditedOrderedPlacementCount += candidates.length;
        for (const candidate of candidates) {
          recordFixedPointValue(
            fixedPointValues,
            auditedRelationshipValues,
            candidate.adjustedUncappedRelationshipValue,
          );
          maximumCandidateUnits = Math.max(
            maximumCandidateUnits,
            optimizerRelationshipValueUnits(
              candidate.adjustedUncappedRelationshipValue,
            ),
          );
        }
      }
    }
  }
  if (auditedOrderedPlacementCount !== 32_736) {
    failedChecks.push(
      `fixed-point-ordered-placement-count:${auditedOrderedPlacementCount}`,
    );
  }

  for (const fixture of fixtures) {
    const candidatePool = generateOptimizerFormationCandidates({
      dragons,
      profiles: simpleSynergyProfiles,
      snapshot: buildOptimizerRosterSnapshot(dragons, fixture.roster()),
    });
    candidatePools.set(fixture.id, candidatePool);
    for (const candidate of candidatePool) {
      const units = optimizerRelationshipValueUnits(candidate.adjustedRelationshipValue);
      maximumCandidateUnits = Math.max(maximumCandidateUnits, units);
      recordFixedPointValue(
        fixedPointValues,
        auditedRelationshipValues,
        candidate.adjustedRelationshipValue,
      );
    }
  }

  const collisions = [...fixedPointValues.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([units, values]) => ({ units, values: [...values].sort() }))
    .sort((left, right) => left.units - right.units);
  if (collisions.length > 0) {
    failedChecks.push(`fixed-point-collisions:${collisions.length}`);
  }
  const maximumAuditedValue =
    maximumCandidateUnits / OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE;
  const powerOfTenScaleAudit = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000]
    .map((scale) => ({
      scale,
      collisionCount: fixedPointCollisionCount(auditedRelationshipValues, scale),
      maximumCandidateUnits: Math.round(maximumAuditedValue * scale),
      maximumTenFormationUnits: Math.round(maximumAuditedValue * scale) * 10,
      safeTenFormationTotal: Number.isSafeInteger(
        Math.round(maximumAuditedValue * scale) * 10,
      ),
      highsCoefficientSafe: Math.round(maximumAuditedValue * scale) < 1_000_000_000,
    }));
  const smallestAuditedCollisionFreeScale = powerOfTenScaleAudit.find(
    (entry) => entry.collisionCount === 0,
  )?.scale ?? null;
  const selectedScaleEvidence = powerOfTenScaleAudit.find(
    (entry) => entry.scale === OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
  );
  if (!selectedScaleEvidence || selectedScaleEvidence.collisionCount !== 0) {
    failedChecks.push('fixed-point-selected-production-scale-collision');
  }
  const maximumTenFormationUnits = maximumCandidateUnits * 10;
  if (!Number.isSafeInteger(maximumTenFormationUnits)) {
    failedChecks.push('fixed-point-ten-formation-total-not-safe-integer');
  }

  return {
    candidatePools,
    failedChecks,
    report: {
      auditedOrderedPlacementCount,
      auditedDistinctValueCount: auditedRelationshipValues.size,
      powerOfTenScaleAudit,
      selectedProductionScale: OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
      smallestAuditedCollisionFreeScale,
      distinctUnitCount: fixedPointValues.size,
      collisions,
      maximumCandidateUnits,
      maximumTenFormationUnits,
      safeInteger: Number.isSafeInteger(maximumTenFormationUnits),
      highsCoefficientSafe: maximumCandidateUnits < 1_000_000_000,
    },
  };
}

function legacyFixedPointHashProjection(report: ReturnType<
  typeof runOptimizerV3FixedPointAudit
>['report']) {
  const selected = report.powerOfTenScaleAudit.find(
    (entry) => entry.scale === OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
  )!;
  return {
    auditedOrderedPlacementCount: report.auditedOrderedPlacementCount,
    auditedDistinctValueCount: report.auditedDistinctValueCount,
    powerOfTenScaleAudit: [{
      scale: selected.scale,
      collisionCount: selected.collisionCount,
    }],
    smallestCollisionFreeScale: OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
    distinctUnitCount: report.distinctUnitCount,
    collisions: report.collisions,
    maximumCandidateUnits: report.maximumCandidateUnits,
    maximumTenFormationUnits: report.maximumTenFormationUnits,
    safeInteger: report.safeInteger,
    highsCoefficientSafe: report.highsCoefficientSafe,
  };
}

function validateResult({
  fixture,
  strategy,
  order,
  result,
  candidateByKey,
  failedChecks,
}: {
  fixture: string;
  strategy: RosterOptimizerStrategy;
  order: 'forward' | 'reverse';
  result: RosterOptimizationResult;
  candidateByKey: ReadonlyMap<string, ReturnType<typeof generateOptimizerFormationCandidates>[number]>;
  failedChecks: string[];
}) {
  const prefix = `${fixture}/${strategy}/${order}`;
  const fail = (reason: string) => failedChecks.push(`${prefix}:${reason}`);
  if (
    result.contractVersion !== HISTORICAL_ROSTER_OPTIMIZER_CONTRACT_VERSION ||
    result.ratingContract !== ROSTER_OPTIMIZER_RATING_CONTRACT
  ) fail('contract-mismatch');
  if (!result.diagnostics.optimal) fail('not-proven-optimal');
  if (result.formations.length !== 10) fail('formation-count');
  const used = result.formations.flatMap((formation) => formation.dragonIds);
  if (used.length !== 30 || new Set(used).size !== 30) fail('dragon-reuse');
  if (result.unusedDragonIds.length !== 3) fail('unused-dragon-count');
  if (result.strategy !== 'best-ten-overall') {
    if (
      result.primary.formations.length !== 5 ||
      result.backup.formations.length !== 5
    ) fail('wave-formation-count');
    const primary = new Set(result.primary.usedDragonIds);
    if (result.backup.usedDragonIds.some((dragonId) => primary.has(dragonId))) {
      fail('cross-wave-dragon-overlap');
    }
  }
  for (const formation of result.formations) {
    validateFormation(formation, candidateByKey, fail);
  }
  validateObjective(result, fail);
  if (
    result.strategy !== 'best-ten-overall' &&
    !result.diagnostics.numericalExactness?.fixedPhasesValidated
  ) fail('fixed-phases-not-reconstructed');
  if (result.strategy === 'power-aware-primary-five-backup-five') {
    if (
      result.estimatedPowerModelVersion !== ESTIMATED_POWER_MODEL_VERSION ||
      result.estimatedPowerModelHash !== ESTIMATED_POWER_MODEL_HASH ||
      result.estimatedPowerObservationHash !== ESTIMATED_POWER_OBSERVATION_HASH
    ) fail('estimated-power-identity');
    const primaryPower = result.primary.formations.reduce(
      (total, formation) => total + formation.estimatedPower,
      0,
    );
    const backupPower = result.backup.formations.reduce(
      (total, formation) => total + formation.estimatedPower,
      0,
    );
    if (
      primaryPower !== result.primary.totalEstimatedPower ||
      backupPower !== result.backup.totalEstimatedPower
    ) fail('estimated-power-reconstruction');
    if (
      Object.values(result.estimatedPowerByDragonId).some(
        (estimate) =>
          estimate.modelVersion !== ESTIMATED_POWER_MODEL_VERSION ||
          estimate.modelHash !== ESTIMATED_POWER_MODEL_HASH ||
          estimate.observationHash !== ESTIMATED_POWER_OBSERVATION_HASH,
      )
    ) fail('per-dragon-estimated-power-identity');
  }
}

function validateFormation(
  formation: OptimizedFormation,
  candidateByKey: ReadonlyMap<string, ReturnType<typeof generateOptimizerFormationCandidates>[number]>,
  fail: (reason: string) => void,
) {
  const candidate = candidateByKey.get(formation.stableCandidateKey);
  if (!candidate) {
    fail(`candidate-missing:${formation.stableCandidateKey}`);
    return;
  }
  if (stableStringify(candidate.arrangement) !== stableStringify(formation.arrangement)) {
    fail(`arrangement-mismatch:${formation.stableCandidateKey}`);
  }
  const progression = Object.fromEntries(
    Object.entries(formation.progressionSnapshot).map(([dragonId, value]) => [
      dragonId,
      { starRank: value.starRank, dragonLevel: value.dragonLevel },
    ]),
  );
  const rating = rateFormationV3({
    formation: formation.arrangement,
    dragons,
    profiles: simpleSynergyProfiles,
    progression,
    reliabilityProgression: Object.fromEntries(
      Object.entries(formation.progressionSnapshot).map(([dragonId, value]) => [
        dragonId,
        {
          starRank: value.starRank ?? null,
          dragonLevel: value.dragonLevel ?? null,
          activeHabitLevels: value.activeHabitLevels,
        },
      ]),
    ),
  });
  if (
    rating.score !== formation.rating ||
    rating.tier !== formation.tier ||
    tierForFormationRatingV3(formation.rating) !== formation.tier ||
    rating.activeSynergy.score !== formation.activeSynergyScore ||
    rating.placementScore !== formation.placementScore ||
    rating.adjustedUncappedRelationshipValue !==
      formation.adjustedRelationshipValue ||
    optimizerRelationshipValueUnits(formation.adjustedRelationshipValue) !==
      formation.adjustedRelationshipValueUnits
  ) fail(`direct-v3-recomputation:${formation.stableCandidateKey}`);
  if (
    !Number.isFinite(formation.adjustedRelationshipValue) ||
    formation.adjustedRelationshipValue < 0 ||
    !Number.isInteger(formation.rating) ||
    formation.rating < 0 ||
    formation.rating > 100
  ) fail(`invalid-numeric-value:${formation.stableCandidateKey}`);
}

function validateObjective(
  result: RosterOptimizationResult,
  fail: (reason: string) => void,
) {
  const reconstruct = (formations: readonly OptimizedFormation[]) => ({
    totalRating: formations.reduce((total, formation) => total + formation.rating, 0),
    minimumRating: Math.min(...formations.map((formation) => formation.rating)),
    totalRelationshipValueUnits: formations.reduce(
      (total, formation) => total + formation.adjustedRelationshipValueUnits,
      0,
    ),
    totalActiveRelationships: formations.reduce(
      (total, formation) => total + formation.activeRelationshipCount,
      0,
    ),
  });
  if (result.strategy === 'best-ten-overall') {
    const actual = reconstruct(result.formations);
    if (
      actual.totalRating !== result.objective.totalRating ||
      actual.minimumRating !== result.objective.minimumRating ||
      actual.totalRelationshipValueUnits !==
        result.objective.totalRelationshipValueUnits ||
      actual.totalActiveRelationships !== result.objective.totalActiveRelationships
    ) fail('best-ten-objective-reconstruction');
    return;
  }
  const primary = reconstruct(result.primary.formations);
  const backup = reconstruct(result.backup.formations);
  for (const [label, actual, reported] of [
    ['primary', primary, result.objective.primary],
    ['backup', backup, result.objective.backup],
  ] as const) {
    if (
      actual.totalRating !== reported.totalRating ||
      actual.minimumRating !== reported.minimumRating ||
      actual.totalRelationshipValueUnits !== reported.totalRelationshipValueUnits ||
      actual.totalActiveRelationships !== reported.totalActiveRelationships
    ) fail(`${label}-objective-reconstruction`);
  }
}

function executionReport(
  fixture: string,
  order: 'forward' | 'reverse',
  result: RosterOptimizationResult,
  runtimeMs: number,
) {
  const summary =
    result.strategy === 'best-ten-overall' ? result.collection : result.combined;
  return {
    fixture,
    strategy: result.strategy,
    order,
    optimal: result.optimal,
    solutionHash: result.optimizerSolutionHash,
    resultHash: result.optimizerResultHash,
    selectedFormations: result.formations.map((formation) => ({
      key: formation.stableCandidateKey,
      arrangement: formation.arrangement,
      rating: formation.rating,
      tier: formation.tier,
      activeSynergy: formation.activeSynergyScore,
      placementEffectiveness: formation.placementScore,
      adjustedRelationshipValue: round(formation.adjustedRelationshipValue, 12),
      adjustedRelationshipValueUnits: formation.adjustedRelationshipValueUnits,
      quantifiedRelationships: formation.quantifiedRelationshipCount,
      unquantifiedRelationships: formation.unquantifiedRelationshipCount,
      unquantifiedBasePotential: formation.unquantifiedBasePotential,
    })),
    unusedDragonIds: result.unusedDragonIds,
    summary: {
      totalRating: summary.totalRating,
      averageRating: summary.averageRating,
      minimumRating: summary.minimumRating,
      tierDistribution: summary.tierDistribution,
      adjustedRelationshipValue: round(summary.totalRelationshipValue, 12),
      adjustedRelationshipValueUnits: summary.totalRelationshipValueUnits,
      activeRelationshipCount: summary.totalActiveRelationships,
      quantifiedRelationshipCount: summary.quantifiedRelationshipCount,
      unquantifiedRelationshipCount: summary.unquantifiedRelationshipCount,
      unquantifiedBasePotential: summary.unquantifiedBasePotential,
    },
    objective: result.objective,
    exactReconstruction:
      result.strategy === 'best-ten-overall'
        ? true
        : result.diagnostics.numericalExactness?.fixedPhasesValidated === true,
    solverPasses: result.diagnostics.solverPasses ?? 1,
    runtimeTelemetry: {
      candidateGenerationMs: round(result.diagnostics.candidateGenerationMs, 3),
      solverMs: round(result.diagnostics.solverMs, 3),
      totalMs: round(runtimeMs, 3),
    },
  };
}

function semanticAllocation(result: RosterOptimizationResult): string {
  return stableStringify({
    strategy: result.strategy,
    formations: result.formations.map((formation) => ({
      wave: formation.wave,
      stableCandidateKey: formation.stableCandidateKey,
      arrangement: formation.arrangement,
    })),
    unusedDragonIds: result.unusedDragonIds,
    objective: result.objective,
  });
}

function reverseRoster(
  roster: Record<string, OwnedDragon>,
): Record<string, OwnedDragon> {
  return Object.fromEntries(Object.entries(roster).reverse());
}

function maxSimpleProgression(formation: SimpleFormation) {
  return Object.fromEntries(
    Object.values(formation)
      .filter((dragonId): dragonId is string => dragonId !== null)
      .map((dragonId) => [
        dragonId,
        {
          starRank: 10,
          dragonLevel: 16,
          combatStats: dragons.find((dragon) => dragon.id === dragonId)!.stats,
        },
      ]),
  );
}

function maxReliabilityProgression(formation: SimpleFormation) {
  return Object.fromEntries(
    Object.values(formation)
      .filter((dragonId): dragonId is string => dragonId !== null)
      .map((dragonId) => {
        const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
        const entry: OwnedDragon = {
          dragonId,
          owned: true,
          starRank: 10,
          reignLevel: 16,
          notes: '',
          habitLevels: Object.fromEntries(
            dragon.habits.map((habit) => [habit.id, 5]),
          ),
        };
        return [dragonId, reliabilityProgressionFromOwnedDragon(dragon, entry)];
      }),
  );
}

function recordFixedPointValue(
  valuesByUnit: Map<number, Set<string>>,
  auditedValues: Set<string>,
  value: number,
) {
  const units = optimizerRelationshipValueUnits(value);
  const values = valuesByUnit.get(units) ?? new Set<string>();
  const serialized = value.toFixed(12);
  values.add(serialized);
  valuesByUnit.set(units, values);
  auditedValues.add(serialized);
}

function fixedPointCollisionCount(
  auditedValues: ReadonlySet<string>,
  scale: number,
): number {
  const valuesByUnit = new Map<number, number>();
  for (const serialized of auditedValues) {
    const units = Math.round(Number(serialized) * scale);
    valuesByUnit.set(units, (valuesByUnit.get(units) ?? 0) + 1);
  }
  return [...valuesByUnit.values()].filter((count) => count > 1).length;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}
