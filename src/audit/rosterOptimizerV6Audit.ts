import historicalV5Report from '../../docs/audits/roster-optimizer-v5-0.22.0.json';
import { dragons } from '../data/dragons';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  bestOverallScoreBreakdown,
  compareBestOverallCandidates,
  solveBestOverallFirst,
} from '../optimizer/rosterOptimizerBestOverallSolver';
import { solveBalancedRosterOptimizer } from '../optimizer/rosterOptimizerBalancedSolver';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
  generateOptimizerFormationCandidates,
  stableHash,
} from '../optimizer/rosterOptimizerCandidates';
import { buildFlexibleResult } from '../optimizer/rosterOptimizer';
import { buildEstimatedPowerCache } from '../optimizer/rosterOptimizerPower';
import { solveStrongestFirst } from '../optimizer/rosterOptimizerStrongestFirstSolver';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  type FlexiblePowerAwareOptimizationResult,
  type OptimizerAllocationMode,
  type OptimizerFormationCandidate,
} from '../optimizer/rosterOptimizerTypes';
import {
  allOneRoster,
  maxedRoster,
  mixedProgressionRoster,
} from './rosterOptimizerAudit';
import { normalizeRoster } from '../services/rosterStorage';

const protectedIdentities = {
  formationRatingV3Numeric:
    '958cf36d329a6fb00c732ecf576d8020d10553d3585b136bda0493a7db754724',
  formationRatingV3:
    '215f2c669cee0c96d584b6b3014aa2f075302c644f85ec0801c70b4a6740344f',
  formationRatingV3Audit:
    '0cd7e73c6dffe528dcb738c3eeb1f7a06bf19008c62280aa2bf9a74cdbcaf94a',
  formationRatingV2:
    '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf',
  reliabilityRegistry:
    'e966ccec17027a0c7af761f5aff9b0ca50d6163a25e4e483948559a603f79c4c',
  research:
    'f2984df99ea2d2cbc0b12866287cc3c03248048c86b9f5e3ffed490e0449918f',
  estimatedPowerObservation: ESTIMATED_POWER_OBSERVATION_HASH,
  estimatedPowerModel: ESTIMATED_POWER_MODEL_HASH,
  estimatedPowerGrid: ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  historicalOptimizerV5Audit: 'fnv1a64:e5ac2432442f5cb0',
} as const;

const fixtureDefinitions = [
  {
    id: 'mixed',
    roster: () => normalizeRoster(dragons, Object.values(mixedProgressionRoster())),
  },
  { id: 'maxed', roster: maxedRoster },
  { id: 'all-one', roster: allOneRoster },
] as const;

const modes: readonly OptimizerAllocationMode[] = [
  'best-overall-first',
  'strongest-first',
  'balanced',
];

type HistoricalV5Execution = {
  fixture: string;
  mode: 'strongest-first' | 'balanced';
  count: number;
  inputOrder: 'forward' | 'reverse';
  ascendingPowerVector: number[];
  ascendingRatingVector: number[];
  stableSolutionKey: string;
};

const historicalV5Executions = new Map(
  (historicalV5Report.executions as HistoricalV5Execution[]).map((execution) => [
    historicalKey(execution.fixture, execution.mode, execution.count, execution.inputOrder),
    execution,
  ]),
);

export async function runRosterOptimizerV6Audit(
  onExecution?: (message: string) => void,
  requestedFixtureIds: readonly string[] = fixtureDefinitions.map((fixture) => fixture.id),
) {
  const executions: OptimizerV6AuditExecution[] = [];
  let candidatePoolBuilds = 0;
  let solverExecutions = 0;
  const selectedFixtures = fixtureDefinitions.filter((fixture) =>
    requestedFixtureIds.includes(fixture.id),
  );
  const expectedExecutions = selectedFixtures.length * modes.length * 11 * 2;

  for (const fixture of selectedFixtures) {
    const pools = [];
    for (const inputOrder of ['forward', 'reverse'] as const) {
      const roster = fixture.roster();
      const orderedRoster = inputOrder === 'forward'
        ? roster
        : Object.fromEntries(Object.entries(roster).reverse());
      const snapshot = buildOptimizerRosterSnapshot(dragons, orderedRoster);
      const estimates = buildEstimatedPowerCache(snapshot);
      const startedAt = performance.now();
      const candidates = generateOptimizerFormationCandidates({
        dragons,
        profiles: simpleSynergyProfiles,
        snapshot,
        estimatesByDragonId: estimates,
      });
      candidatePoolBuilds += 1;
      pools.push({
        inputOrder,
        snapshot,
        estimates,
        candidates,
        candidateGenerationMs: performance.now() - startedAt,
        candidateIdentity: stableHash(JSON.stringify(candidates.map((candidate) => [
          candidate.stableCandidateKey,
          candidate.estimatedPowerUnits,
          candidate.rating,
          candidate.adjustedRelationshipValueUnits,
          candidate.activeRelationshipCount,
        ]))),
      });
    }
    if (pools[0]!.candidateIdentity !== pools[1]!.candidateIdentity) {
      throw new Error(`${fixture.id} candidate generation changed under reversed input.`);
    }

    for (const mode of modes) {
      for (let count = 1; count <= 11; count += 1) {
        let forwardResult: FlexiblePowerAwareOptimizationResult | null = null;
        for (const pool of pools) {
          const solveStartedAt = performance.now();
          const solver = mode === 'best-overall-first'
            ? solveBestOverallFirst(pool.candidates, count)
            : mode === 'strongest-first'
              ? solveStrongestFirst(pool.candidates, count)
              : await solveBalancedRosterOptimizer(pool.candidates, pool.snapshot, count);
          solverExecutions += 1;
          const solverMs = performance.now() - solveStartedAt;
          const result = buildFlexibleResult({
            allocationMode: mode,
            formationCount: count,
            solver,
            snapshot: pool.snapshot,
            estimatesByDragonId: pool.estimates,
            rosterFingerprint: createRosterOptimizerFingerprint(pool.snapshot),
            requestFingerprint: createRosterOptimizerRequestFingerprint(
              pool.snapshot,
              mode,
              count,
            ),
            candidateCount: pool.candidates.length,
            candidateGenerationMs: pool.candidateGenerationMs,
            solverMs,
            totalMs: pool.candidateGenerationMs + solverMs,
          });
          validateResult(result, pool.candidates);
          validateHistoricalCompatibility(fixture.id, pool.inputOrder, result);
          if (pool.inputOrder === 'forward') {
            forwardResult = result;
          } else if (
            !forwardResult ||
            result.optimizerSolutionHash !== forwardResult.optimizerSolutionHash ||
            result.optimizerResultHash !== forwardResult.optimizerResultHash
          ) {
            throw new Error(`${fixture.id}/${mode}/${count} forward/reverse hashes differ.`);
          }
          executions.push(executionRecord(fixture.id, pool.inputOrder, result));
          onExecution?.(
            `${executions.length}/${expectedExecutions} ${fixture.id}/${mode}/${count}/${pool.inputOrder}`,
          );
        }
      }
    }
  }

  return createReport(executions, candidatePoolBuilds, solverExecutions);
}

export function combineRosterOptimizerV6AuditReports(
  reports: Array<{
    executions: OptimizerV6AuditExecution[];
    candidatePoolBuilds: number;
    solverExecutions: number;
  }>,
) {
  const executions = reports.flatMap((report) => report.executions).sort(
    (left, right) =>
      fixtureOrder(left.fixture) - fixtureOrder(right.fixture) ||
      modes.indexOf(left.mode) - modes.indexOf(right.mode) ||
      left.count - right.count ||
      left.inputOrder.localeCompare(right.inputOrder),
  );
  return createReport(
    executions,
    reports.reduce((sum, report) => sum + report.candidatePoolBuilds, 0),
    reports.reduce((sum, report) => sum + report.solverExecutions, 0),
  );
}

function createReport(
  executions: OptimizerV6AuditExecution[],
  candidatePoolBuilds: number,
  solverExecutions: number,
) {
  const fixtureCount = new Set(executions.map((execution) => execution.fixture)).size;
  const expectedExecutions = fixtureCount * modes.length * 11 * 2;
  const expectedCandidatePoolBuilds = fixtureCount * 2;
  const failedChecks: string[] = [];
  if (executions.length !== expectedExecutions) {
    failedChecks.push(`expected ${expectedExecutions} records, received ${executions.length}`);
  }
  if (solverExecutions !== expectedExecutions) {
    failedChecks.push(`expected ${expectedExecutions} solves, received ${solverExecutions}`);
  }
  if (candidatePoolBuilds !== expectedCandidatePoolBuilds) {
    failedChecks.push(
      `expected ${expectedCandidatePoolBuilds} candidate pools, received ${candidatePoolBuilds}`,
    );
  }
  if (executions.some((execution) => execution.solverReused)) {
    failedChecks.push('one or more executions reused a solver result');
  }
  if (executions.some((execution) => !execution.noDuplicateDragons)) {
    failedChecks.push('one or more executions duplicated a dragon');
  }
  if (executions.some((execution) => !execution.exactReconstruction)) {
    failedChecks.push('one or more executions failed exact reconstruction');
  }
  if (executions.some((execution) => !execution.historicalV5Compatible)) {
    failedChecks.push('one or more existing-mode executions changed from optimizer v5');
  }
  const forwardReverseEqual = forwardReverseHashesMatch(executions);
  if (!forwardReverseEqual) failedChecks.push('one or more forward/reverse hashes differ');
  if (failedChecks.length > 0) {
    throw new Error(`Optimizer v6 audit assertions failed: ${failedChecks.join('; ')}.`);
  }

  const semanticIdentity = {
    contractVersion: 6,
    ratingContract: 'formation-rating-v3',
    scoringProfile: {
      version: BEST_OVERALL_SCORING_VERSION,
      powerWeight: BEST_OVERALL_POWER_WEIGHT,
      ratingWeight: BEST_OVERALL_RATING_WEIGHT,
      normalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
    },
    estimatedPowerModelVersion: ESTIMATED_POWER_MODEL_VERSION,
    protectedIdentities,
    executions: executions.map((execution) => ({
      fixture: execution.fixture,
      mode: execution.mode,
      count: execution.count,
      inputOrder: execution.inputOrder,
      generatedFormationCount: execution.generatedFormationCount,
      bestOverallScoreUnits: execution.bestOverallScoreUnits,
      ascendingPowerVector: execution.ascendingPowerVector,
      ascendingRatingVector: execution.ascendingRatingVector,
      stableSolutionKey: execution.stableSolutionKey,
      solutionHash: execution.solutionHash,
      resultHash: execution.resultHash,
      noDuplicateDragons: execution.noDuplicateDragons,
      exactReconstruction: execution.exactReconstruction,
      historicalV5Compatible: execution.historicalV5Compatible,
    })),
  };
  return {
    release: '0.22.1',
    contractVersion: 6,
    ratingContract: 'formation-rating-v3',
    generatedAt: new Date().toISOString(),
    executionCount: executions.length,
    candidatePoolBuilds,
    solverExecutions,
    candidatePoolsIndependent: candidatePoolBuilds === expectedCandidatePoolBuilds,
    allSolversIndependent: solverExecutions === executions.length &&
      executions.every((execution) => !execution.solverReused),
    forwardReverseEqual,
    noDuplicateDragons: executions.every((execution) => execution.noDuplicateDragons),
    exactReconstruction: executions.every((execution) => execution.exactReconstruction),
    historicalV5Compatible:
      executions.every((execution) => execution.historicalV5Compatible),
    failedChecks: failedChecks.length,
    protectedIdentities,
    executions,
    deterministicAuditHash: stableHash(JSON.stringify(semanticIdentity)),
  };
}

function validateResult(
  result: FlexiblePowerAwareOptimizationResult,
  candidates: readonly OptimizerFormationCandidate[],
): void {
  const count = result.requestedFormationCount;
  const dragonIds = result.formations.flatMap((formation) => formation.dragonIds);
  const powers = result.formations.map((formation) => formation.estimatedPower)
    .sort((left, right) => left - right);
  const ratings = result.formations.map((formation) => formation.rating)
    .sort((left, right) => left - right);
  const relationshipUnits = result.formations.reduce(
    (sum, formation) => sum + formation.adjustedRelationshipValueUnits,
    0,
  );
  const activeRelationships = result.formations.reduce(
    (sum, formation) => sum + formation.activeRelationshipCount,
    0,
  );
  const stableKey = result.formations.map((formation) => formation.stableCandidateKey)
    .sort().join('||');
  if (
    result.generatedFormationCount !== count ||
    result.formations.length !== count ||
    new Set(dragonIds).size !== count * 3 ||
    JSON.stringify(powers.map((power) => power / 10)) !==
      JSON.stringify(result.objective.ascendingEstimatedPowerUnits) ||
    JSON.stringify(powers) !== JSON.stringify(result.objective.ascendingEstimatedPowerVector) ||
    JSON.stringify(ratings) !== JSON.stringify(result.objective.ascendingRatingVector) ||
    result.collection.totalEstimatedPower !== powers.reduce((sum, value) => sum + value, 0) ||
    result.collection.totalRating !== ratings.reduce((sum, value) => sum + value, 0) ||
    result.collection.totalRelationshipValueUnits !== relationshipUnits ||
    result.objective.totalRelationshipValueUnits !== relationshipUnits ||
    result.collection.totalActiveRelationships !== activeRelationships ||
    result.objective.totalActiveRelationships !== activeRelationships ||
    result.objective.stableSolutionKey !== stableKey
  ) {
    throw new Error('Optimizer v6 exact result reconstruction failed.');
  }
  if (result.allocationMode === 'best-overall-first') {
    validateBestOverall(result, candidates);
  }
}

function validateBestOverall(
  result: FlexiblePowerAwareOptimizationResult,
  candidates: readonly OptimizerFormationCandidate[],
): void {
  let usedMask = 0n;
  const reconstructedScoreUnits: number[] = [];
  for (const formation of result.formations) {
    const feasible = candidates.filter((candidate) => (candidate.dragonMask & usedMask) === 0n);
    const maximumPower = Math.max(...feasible.map((candidate) => candidate.estimatedPowerUnits!));
    const exactBest = feasible.map((candidate) => ({
      candidate,
      score: bestOverallScoreBreakdown(candidate, maximumPower),
    })).sort((left, right) => compareBestOverallCandidates(
      left.candidate,
      left.score,
      right.candidate,
      right.score,
    ))[0]!;
    const recorded = formation.bestOverallScore;
    if (
      exactBest.candidate.stableCandidateKey !== formation.stableCandidateKey ||
      !recorded ||
      JSON.stringify(recorded) !== JSON.stringify(exactBest.score) ||
      recorded.maxRemainingPowerUnits !== maximumPower ||
      recorded.powerIndexBasisPoints * BEST_OVERALL_POWER_WEIGHT !==
        recorded.powerContributionUnits ||
      formation.rating * 100 !== recorded.ratingIndexBasisPoints ||
      recorded.ratingIndexBasisPoints * BEST_OVERALL_RATING_WEIGHT !==
        recorded.ratingContributionUnits ||
      recorded.powerContributionUnits + recorded.ratingContributionUnits !==
        recorded.overallScoreUnits
    ) {
      throw new Error('Best Overall exhaustive step validation failed.');
    }
    reconstructedScoreUnits.push(recorded.overallScoreUnits);
    usedMask |= exactBest.candidate.dragonMask;
  }
  if (
    JSON.stringify(reconstructedScoreUnits) !==
      JSON.stringify(result.objective.bestOverallScoreUnits)
  ) {
    throw new Error('Best Overall objective score vector failed reconstruction.');
  }
}

function validateHistoricalCompatibility(
  fixture: string,
  inputOrder: 'forward' | 'reverse',
  result: FlexiblePowerAwareOptimizationResult,
): void {
  if (result.allocationMode === 'best-overall-first') return;
  const historical = historicalV5Executions.get(historicalKey(
    fixture,
    result.allocationMode,
    result.requestedFormationCount,
    inputOrder,
  ));
  if (
    !historical ||
    historical.stableSolutionKey !== result.objective.stableSolutionKey ||
    JSON.stringify(historical.ascendingPowerVector) !==
      JSON.stringify(result.objective.ascendingEstimatedPowerVector) ||
    JSON.stringify(historical.ascendingRatingVector) !==
      JSON.stringify(result.objective.ascendingRatingVector)
  ) {
    throw new Error(
      `${fixture}/${result.allocationMode}/${result.requestedFormationCount}/${inputOrder} ` +
      'changed from the historical optimizer-v5 selection.',
    );
  }
}

function executionRecord(
  fixture: string,
  inputOrder: 'forward' | 'reverse',
  result: FlexiblePowerAwareOptimizationResult,
): OptimizerV6AuditExecution {
  const profile = result.diagnostics.performanceProfile;
  return {
    fixture,
    mode: result.allocationMode,
    count: result.requestedFormationCount,
    inputOrder,
    solverReused: false,
    generatedFormationCount: result.generatedFormationCount,
    bestOverallScoreUnits: result.objective.bestOverallScoreUnits ?? [],
    ascendingPowerVector: result.objective.ascendingEstimatedPowerVector,
    ascendingRatingVector: result.objective.ascendingRatingVector,
    stableSolutionKey: result.objective.stableSolutionKey,
    solutionHash: result.optimizerSolutionHash,
    resultHash: result.optimizerResultHash,
    noDuplicateDragons:
      new Set(result.formations.flatMap((formation) => formation.dragonIds)).size ===
      result.generatedFormationCount * 3,
    exactReconstruction: true,
    historicalV5Compatible: true,
    telemetry: {
      candidateGenerationMs: round(result.diagnostics.candidateGenerationMs),
      solverMs: round(result.diagnostics.solverMs),
      totalMs: round(result.diagnostics.totalMs),
      solverPasses: result.diagnostics.solverPasses ?? 0,
      exactSearchNodes: result.diagnostics.nodesVisited,
      modelBuilds: profile?.modelBuilds ?? 0,
      maximumVariables: Math.max(
        0,
        ...(profile?.phases.map((phase) => phase.variableCount) ?? []),
      ),
      maximumConstraints: Math.max(
        0,
        ...(profile?.phases.map((phase) => phase.constraintCount) ?? []),
      ),
      skippedPhases: profile?.skippedPhases ?? 0,
      certificationPasses: profile?.certificationPasses ?? 0,
    },
  };
}

function forwardReverseHashesMatch(executions: readonly OptimizerV6AuditExecution[]): boolean {
  const groups = new Map<string, OptimizerV6AuditExecution[]>();
  for (const execution of executions) {
    const key = `${execution.fixture}/${execution.mode}/${execution.count}`;
    groups.set(key, [...(groups.get(key) ?? []), execution]);
  }
  return groups.size * 2 === executions.length && [...groups.values()].every((group) => {
    const forward = group.find((execution) => execution.inputOrder === 'forward');
    const reverse = group.find((execution) => execution.inputOrder === 'reverse');
    return group.length === 2 && forward !== undefined && reverse !== undefined &&
      forward.solutionHash === reverse.solutionHash &&
      forward.resultHash === reverse.resultHash;
  });
}

function historicalKey(
  fixture: string,
  mode: string,
  count: number,
  inputOrder: string,
): string {
  return `${fixture}/${mode}/${count}/${inputOrder}`;
}

function fixtureOrder(fixture: string): number {
  return fixtureDefinitions.findIndex((definition) => definition.id === fixture);
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export interface OptimizerV6AuditExecution {
  fixture: string;
  mode: OptimizerAllocationMode;
  count: number;
  inputOrder: 'forward' | 'reverse';
  solverReused: false;
  generatedFormationCount: number;
  bestOverallScoreUnits: number[];
  ascendingPowerVector: number[];
  ascendingRatingVector: number[];
  stableSolutionKey: string;
  solutionHash: string;
  resultHash: string;
  noDuplicateDragons: boolean;
  exactReconstruction: boolean;
  historicalV5Compatible: boolean;
  telemetry: {
    candidateGenerationMs: number;
    solverMs: number;
    totalMs: number;
    solverPasses: number;
    exactSearchNodes: number;
    modelBuilds: number;
    maximumVariables: number;
    maximumConstraints: number;
    skippedPhases: number;
    certificationPasses: number;
  };
}
