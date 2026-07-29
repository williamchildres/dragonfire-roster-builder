import { dragons } from '../data/dragons';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { normalizeRoster } from '../services/rosterStorage';
import {
  buildFlexibleResult,
} from '../optimizer/rosterOptimizer';
import { solveBalancedRosterOptimizer } from '../optimizer/rosterOptimizerBalancedSolver';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
  generateOptimizerFormationCandidates,
  stableHash,
} from '../optimizer/rosterOptimizerCandidates';
import {
  compareStrongestFirstCandidates,
} from '../optimizer/rosterOptimizerObjective';
import { buildEstimatedPowerCache } from '../optimizer/rosterOptimizerPower';
import { solveStrongestFirst } from '../optimizer/rosterOptimizerStrongestFirstSolver';
import type {
  FlexiblePowerAwareOptimizationResult,
  FlexiblePowerAwareOptimizerSolverResult,
  OptimizerAllocationMode,
  OptimizerFormationCandidate,
} from '../optimizer/rosterOptimizerTypes';
import {
  allOneRoster,
  maxedRoster,
  mixedProgressionRoster,
} from './rosterOptimizerAudit';

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
} as const;

export function optimizerV5MixedProgressionRoster() {
  const roster = mixedProgressionRoster();
  return normalizeRoster(dragons, Object.values(roster));
}

const fixtureDefinitions = [
  { id: 'mixed', roster: optimizerV5MixedProgressionRoster },
  { id: 'maxed', roster: maxedRoster },
  { id: 'all-one', roster: allOneRoster },
] as const;
const modes: readonly OptimizerAllocationMode[] = ['strongest-first', 'balanced'];

export async function runRosterOptimizerV5Audit(
  onExecution?: (message: string) => void,
  requestedFixtureIds: readonly string[] = fixtureDefinitions.map((fixture) => fixture.id),
) {
  const executions: OptimizerV5AuditExecution[] = [];
  const solverCache = new Map<string, FlexiblePowerAwareOptimizerSolverResult>();
  let candidatePoolBuilds = 0;

  const selectedFixtures = fixtureDefinitions.filter((fixture) =>
    requestedFixtureIds.includes(fixture.id),
  );
  const expectedExecutions = selectedFixtures.length * 2 * 11 * 2;
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
          const cacheKey = `${fixture.id}/${mode}/${count}/${pool.candidateIdentity}`;
          const solveStartedAt = performance.now();
          let solver = solverCache.get(cacheKey);
          const solverReused = solver !== undefined;
          if (!solver) {
            solver = mode === 'strongest-first'
              ? solveStrongestFirst(pool.candidates, count)
              : await solveBalancedRosterOptimizer(
                  pool.candidates,
                  pool.snapshot,
                  count,
                );
            solverCache.set(cacheKey, solver);
          }
          const solverMs = performance.now() - solveStartedAt;
          const rosterFingerprint = createRosterOptimizerFingerprint(pool.snapshot);
          const requestFingerprint = createRosterOptimizerRequestFingerprint(
            pool.snapshot,
            mode,
            count,
          );
          const result = buildFlexibleResult({
            allocationMode: mode,
            formationCount: count,
            solver,
            snapshot: pool.snapshot,
            estimatesByDragonId: pool.estimates,
            rosterFingerprint,
            requestFingerprint,
            candidateCount: pool.candidates.length,
            candidateGenerationMs: pool.candidateGenerationMs,
            solverMs,
            totalMs: pool.candidateGenerationMs + solverMs,
          });
          validateResult(result, pool.candidates);
          if (pool.inputOrder === 'forward') {
            forwardResult = result;
          } else if (
            !forwardResult ||
            result.optimizerSolutionHash !== forwardResult.optimizerSolutionHash ||
            result.optimizerResultHash !== forwardResult.optimizerResultHash
          ) {
            throw new Error(`${fixture.id}/${mode}/${count} forward/reverse hashes differ.`);
          }
          executions.push(executionRecord(
            fixture.id,
            pool.inputOrder,
            result,
            solverReused,
          ));
          onExecution?.(
            `${executions.length}/${expectedExecutions} ${fixture.id}/${mode}/${count}/${pool.inputOrder}`,
          );
        }
      }
    }
  }

  return createReport(executions, candidatePoolBuilds, solverCache.size);
}

export function combineRosterOptimizerV5AuditReports(
  reports: Array<{
    executions: OptimizerV5AuditExecution[];
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
  executions: OptimizerV5AuditExecution[],
  candidatePoolBuilds: number,
  solverExecutions: number,
) {
  const semanticExecutions = executions.map((execution) => ({
    fixture: execution.fixture,
    mode: execution.mode,
    count: execution.count,
    inputOrder: execution.inputOrder,
    generatedFormationCount: execution.generatedFormationCount,
    ascendingPowerVector: execution.ascendingPowerVector,
    ascendingRatingVector: execution.ascendingRatingVector,
    stableSolutionKey: execution.stableSolutionKey,
    solutionHash: execution.solutionHash,
    resultHash: execution.resultHash,
    noDuplicateDragons: execution.noDuplicateDragons,
    exactReconstruction: execution.exactReconstruction,
  }));
  const semanticIdentity = {
    contractVersion: 5,
    ratingContract: 'formation-rating-v3',
    estimatedPowerModelVersion: ESTIMATED_POWER_MODEL_VERSION,
    protectedIdentities,
    executions: semanticExecutions,
  };
  return {
    release: '0.22.0',
    contractVersion: 5,
    ratingContract: 'formation-rating-v3',
    generatedAt: new Date().toISOString(),
    executionCount: executions.length,
    candidatePoolBuilds,
    solverExecutions,
    forwardReverseEqual: true,
    noDuplicateDragons: true,
    failedChecks: 0,
    protectedIdentities,
    executions,
    deterministicAuditHash: stableHash(JSON.stringify(semanticIdentity)),
  };
}

function fixtureOrder(fixture: string): number {
  return fixtureDefinitions.findIndex((definition) => definition.id === fixture);
}

function validateResult(
  result: FlexiblePowerAwareOptimizationResult,
  candidates: readonly OptimizerFormationCandidate[],
): void {
  const count = result.requestedFormationCount;
  const dragonIds = result.formations.flatMap((formation) => formation.dragonIds);
  if (
    result.generatedFormationCount !== count ||
    result.formations.length !== count ||
    new Set(dragonIds).size !== count * 3
  ) {
    throw new Error('Optimizer v5 audit found an invalid formation count or duplicate dragon.');
  }
  const powers = result.formations
    .map((formation) => formation.estimatedPower)
    .sort((left, right) => left - right);
  const ratings = result.formations
    .map((formation) => formation.rating)
    .sort((left, right) => left - right);
  if (
    JSON.stringify(powers) !== JSON.stringify(result.objective.ascendingEstimatedPowerVector) ||
    JSON.stringify(ratings) !== JSON.stringify(result.objective.ascendingRatingVector) ||
    result.collection.totalEstimatedPower !== powers.reduce((sum, value) => sum + value, 0) ||
    result.collection.totalRating !== ratings.reduce((sum, value) => sum + value, 0) ||
    result.collection.totalRelationshipValueUnits !== result.formations.reduce(
      (sum, formation) => sum + formation.adjustedRelationshipValueUnits,
      0,
    )
  ) {
    throw new Error('Optimizer v5 audit reconstruction failed.');
  }
  if (result.allocationMode === 'strongest-first') {
    let usedMask = 0n;
    for (const formation of result.formations) {
      const best = candidates
        .filter((candidate) => (candidate.dragonMask & usedMask) === 0n)
        .sort(compareStrongestFirstCandidates)[0];
      if (best?.stableCandidateKey !== formation.stableCandidateKey) {
        throw new Error('Strongest First audit disagrees with exhaustive remaining candidate.');
      }
      usedMask |= best.dragonMask;
    }
  }
}

function executionRecord(
  fixture: string,
  inputOrder: 'forward' | 'reverse',
  result: FlexiblePowerAwareOptimizationResult,
  solverReused: boolean,
): OptimizerV5AuditExecution {
  const profile = result.diagnostics.performanceProfile;
  return {
    fixture,
    mode: result.allocationMode,
    count: result.requestedFormationCount,
    inputOrder,
    solverReused,
    generatedFormationCount: result.generatedFormationCount,
    ascendingPowerVector: result.objective.ascendingEstimatedPowerVector,
    ascendingRatingVector: result.objective.ascendingRatingVector,
    stableSolutionKey: result.objective.stableSolutionKey,
    solutionHash: result.optimizerSolutionHash,
    resultHash: result.optimizerResultHash,
    noDuplicateDragons:
      new Set(result.formations.flatMap((formation) => formation.dragonIds)).size ===
      result.generatedFormationCount * 3,
    exactReconstruction: true,
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

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export interface OptimizerV5AuditExecution {
  fixture: string;
  mode: OptimizerAllocationMode;
  count: number;
  inputOrder: 'forward' | 'reverse';
  solverReused: boolean;
  generatedFormationCount: number;
  ascendingPowerVector: number[];
  ascendingRatingVector: number[];
  stableSolutionKey: string;
  solutionHash: string;
  resultHash: string;
  noDuplicateDragons: boolean;
  exactReconstruction: boolean;
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
