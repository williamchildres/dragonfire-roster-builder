import historicalV5Report from '../../docs/audits/roster-optimizer-v5-0.22.0.json';
import approvedHistoricalDeltaManifest from './fixtures/optimizerV6ApprovedHistoricalDeltas.0.23.5.json';
import releaseDeltaManifest from './fixtures/optimizerV6ReleaseDeltas.0.23.4-to-0.23.5.json';
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
  previousFormationRatingV3Numeric:
    '958cf36d329a6fb00c732ecf576d8020d10553d3585b136bda0493a7db754724',
  currentFormationRatingV3Numeric:
    'c04d9541a4c4b0c5b202ebc2be703f5832db3b8a5d0b4b77087ac647d5cf0976',
  previousReleaseFormationRatingV3Numeric:
    'c9c93c5a9c89f85c08df958924d3fa61cfbdae555a0c50779c7f3b37d05f9c00',
  previousFormationRatingV3:
    '215f2c669cee0c96d584b6b3014aa2f075302c644f85ec0801c70b4a6740344f',
  currentFormationRatingV3:
    '1e6e021e2bdfb79e83a041866754fef931484c0726d9e5051a62b314c749238f',
  previousReleaseFormationRatingV3:
    'bceda8493e5af3ae4a805fd45dca4861b6a35e2788531699b7e65e707ed6a31a',
  previousFormationRatingV3Audit:
    '0cd7e73c6dffe528dcb738c3eeb1f7a06bf19008c62280aa2bf9a74cdbcaf94a',
  currentFormationRatingV3Audit:
    '9a33851670be326ac05be85b2096ad165b3c0c1c83c4019a5178d9045484292f',
  previousReleaseFormationRatingV3Audit:
    'fc21d2d75740def4a23b9deeb4a8c03712d9b1724522ab05304b109820a67f3f',
  formationRatingV2:
    '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf',
  reliabilityRegistry:
    'c77c5dbe00eeecfc3d8506f47f4c327bccbb52327b413ff5119d91bec9b2334b',
  previousResearch:
    'f2984df99ea2d2cbc0b12866287cc3c03248048c86b9f5e3ffed490e0449918f',
  currentResearch:
    'e01d0e4e99afcc1771dabcaf6289ebd616877ff4ed53cd3e32f4e78ee1fbfcde',
  previousReleaseResearch:
    'f2d2b87abc803494e2f1eadd92dcd5fd79d9bcb8c389254d47b4e5f28471b73d',
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
  solutionHash: string;
  resultHash: string;
};

export const OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY =
  'sha256:b09524e954e3cefad9787f2cb4d97f918139d339a6dea504c47929696865399c' as const;
export const OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_COUNT = 96 as const;
export const OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_REASON =
  'cumulative-formation-rating-v3-corrections-through-0.23.5' as const;
export const OPTIMIZER_V6_RELEASE_DELTA_MANIFEST_IDENTITY =
  'sha256:0a0a1ac9d1429cdf1f7b9c2f82e5d2ee81780e01080f1156ff1daff12c109f5b' as const;
export const OPTIMIZER_V6_RELEASE_DELTA_COUNT = 198 as const;
export const OPTIMIZER_V6_RELEASE_DELTA_REASON =
  'add-legendary-dragon-moondancer' as const;

export interface OptimizerV6ApprovedHistoricalDelta {
  key: string;
  fixtureId: string;
  allocationMode: 'strongest-first' | 'balanced';
  formationCount: number;
  inputOrder: 'forward' | 'reverse';
  historicalStableSolutionKey: string;
  currentStableSolutionKey: string;
  historicalAscendingPowerVector: number[];
  currentAscendingPowerVector: number[];
  historicalAscendingRatingVector: number[];
  currentAscendingRatingVector: number[];
  historicalSolutionHash: string;
  currentSolutionHash: string;
  historicalResultHash: string;
  currentResultHash: string;
  reasonCode:
    | 'syrax-blazing-fury-recipient-correction'
    | 'vhagar-burn-fiery-bonds-reliability-correction'
    | typeof OPTIMIZER_V6_RELEASE_DELTA_REASON;
}

const approvedHistoricalDeltas =
  approvedHistoricalDeltaManifest.deltas as OptimizerV6ApprovedHistoricalDelta[];

if (
  approvedHistoricalDeltaManifest.approvedChangedExecutionCount !==
    OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_COUNT ||
  approvedHistoricalDeltaManifest.deterministicManifestHash !==
    OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY ||
  approvedHistoricalDeltaManifest.reasonCode !==
    OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_REASON
) {
  throw new Error('Optimizer-v6 approved historical-delta manifest metadata changed unexpectedly.');
}

if (
  releaseDeltaManifest.changedExecutionCount !== OPTIMIZER_V6_RELEASE_DELTA_COUNT ||
  releaseDeltaManifest.deterministicManifestHash !==
    OPTIMIZER_V6_RELEASE_DELTA_MANIFEST_IDENTITY ||
  releaseDeltaManifest.reasonCode !== OPTIMIZER_V6_RELEASE_DELTA_REASON
) {
  throw new Error('Optimizer-v6 release-delta manifest metadata changed unexpectedly.');
}

const historicalV5Executions = new Map(
  (historicalV5Report.executions as HistoricalV5Execution[]).map((execution) => [
    historicalKey(execution.fixture, execution.mode, execution.count, execution.inputOrder),
    execution,
  ]),
);
const releaseChangedKeys = new Set(releaseDeltaManifest.deltas.map((delta) => delta.key));

export async function runRosterOptimizerV6Audit(
  onExecution?: (message: string) => void,
  requestedFixtureIds: readonly string[] = fixtureDefinitions.map((fixture) => fixture.id),
  enforceApprovedDeltaContract = true,
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
          const historicalV5Compatible = historicalCompatibility(
            fixture.id,
            pool.inputOrder,
            result,
          );
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
            historicalV5Compatible,
          ));
          onExecution?.(
            `${executions.length}/${expectedExecutions} ${fixture.id}/${mode}/${count}/${pool.inputOrder}`,
          );
        }
      }
    }
  }

  return createReport(
    executions,
    candidatePoolBuilds,
    solverExecutions,
    enforceApprovedDeltaContract,
  );
}

export function combineRosterOptimizerV6AuditReports(
  reports: Array<{
    executions: OptimizerV6AuditExecution[];
    candidatePoolBuilds: number;
    solverExecutions: number;
  }>,
  enforceApprovedDeltaContract = true,
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
    enforceApprovedDeltaContract,
  );
}

function createReport(
  executions: OptimizerV6AuditExecution[],
  candidatePoolBuilds: number,
  solverExecutions: number,
  enforceApprovedDeltaContract = true,
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
  const forwardReverseEqual = forwardReverseHashesMatch(executions);
  if (!forwardReverseEqual) failedChecks.push('one or more forward/reverse hashes differ');
  const historicalDeltaValidation = evaluateApprovedHistoricalDeltas(executions);
  failedChecks.push(...historicalDeltaValidation.failedChecks);
  if (enforceApprovedDeltaContract && failedChecks.length > 0) {
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
    approvedHistoricalDeltaManifestIdentity:
      OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY,
    approvedHistoricalDeltaCount: historicalDeltaValidation.approvedChangedExecutionCount,
    historicalV5DeltaContractValid: historicalDeltaValidation.exactMatch,
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
    release: '0.23.5',
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
    historicalV5Compatible: historicalDeltaValidation.actualChangedExecutionCount === 0,
    historicalV5ChangedExecutionCount: historicalDeltaValidation.actualChangedExecutionCount,
    approvedHistoricalDeltaManifestIdentity:
      OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_MANIFEST_IDENTITY,
    approvedHistoricalDeltaCount: historicalDeltaValidation.approvedChangedExecutionCount,
    historicalV5DeltaContractValid: historicalDeltaValidation.exactMatch,
    releaseDeltaManifestIdentity: OPTIMIZER_V6_RELEASE_DELTA_MANIFEST_IDENTITY,
    releaseDeltaCount: OPTIMIZER_V6_RELEASE_DELTA_COUNT,
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

export interface ApprovedHistoricalDeltaValidation {
  approvedChangedExecutionCount: number;
  actualChangedExecutionCount: number;
  exactMatch: boolean;
  failedChecks: string[];
  actualDeltas: OptimizerV6ApprovedHistoricalDelta[];
}

export function evaluateApprovedHistoricalDeltas(
  executions: readonly OptimizerV6AuditExecution[],
): ApprovedHistoricalDeltaValidation {
  const failedChecks: string[] = [];
  const executionKeys = executions.map((execution) => historicalKey(
    execution.fixture,
    execution.mode,
    execution.count,
    execution.inputOrder,
  ));
  const duplicateExecutionKeys = duplicates(executionKeys);
  if (duplicateExecutionKeys.length > 0) {
    failedChecks.push(`duplicate execution keys: ${duplicateExecutionKeys.join(', ')}`);
  }

  const approvedKeys = approvedHistoricalDeltas.map((delta) => delta.key);
  const duplicateApprovedKeys = duplicates(approvedKeys);
  if (duplicateApprovedKeys.length > 0) {
    failedChecks.push(`duplicate approved delta keys: ${duplicateApprovedKeys.join(', ')}`);
  }
  if (approvedHistoricalDeltas.length !== OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_COUNT) {
    failedChecks.push(
      `approved changed count expected ${OPTIMIZER_V6_APPROVED_HISTORICAL_DELTA_COUNT}, ` +
      `received ${approvedHistoricalDeltas.length}`,
    );
  }
  if (approvedHistoricalDeltas.some((delta) =>
    (delta.allocationMode as OptimizerAllocationMode) === 'best-overall-first'
  )) {
    failedChecks.push('approved manifest contains a Best Overall execution without a v5 baseline');
  }
  const fixtureIds = new Set(executions.map((execution) => execution.fixture));
  const applicableApprovedDeltas = approvedHistoricalDeltas.filter((delta) =>
    fixtureIds.has(delta.fixtureId)
  );

  const actualDeltas: OptimizerV6ApprovedHistoricalDelta[] = [];
  for (const execution of executions) {
    if (execution.mode === 'best-overall-first') continue;
    const historical = historicalV5Executions.get(historicalKey(
      execution.fixture,
      execution.mode,
      execution.count,
      execution.inputOrder,
    ));
    if (!historical) {
      failedChecks.push(
        `historical-compatible execution missing v5 baseline: ` +
        `${execution.fixture}/${execution.mode}/${execution.count}/${execution.inputOrder}`,
      );
      continue;
    }
    if (!historicalExecutionMatches(historical, execution)) {
      actualDeltas.push(historicalDeltaRecord(historical, execution));
      if (execution.historicalV5Compatible) {
        failedChecks.push(
          `changed execution marked compatible: ` +
          `${execution.fixture}/${execution.mode}/${execution.count}/${execution.inputOrder}`,
        );
      }
    } else if (!execution.historicalV5Compatible) {
      failedChecks.push(
        `unchanged execution marked incompatible: ` +
        `${execution.fixture}/${execution.mode}/${execution.count}/${execution.inputOrder}`,
      );
    }
  }
  actualDeltas.sort((left, right) => left.key.localeCompare(right.key));

  const actualByKey = new Map(actualDeltas.map((delta) => [delta.key, delta]));
  const approvedByKey = new Map(applicableApprovedDeltas.map((delta) => [delta.key, delta]));
  for (const actual of actualDeltas) {
    const approved = approvedByKey.get(actual.key);
    if (!approved) {
      failedChecks.push(`unexpected historical delta: ${actual.key}`);
    } else if (JSON.stringify(actual) !== JSON.stringify(approved)) {
      failedChecks.push(`approved historical delta changed differently: ${actual.key}`);
    }
  }
  for (const approved of applicableApprovedDeltas) {
    if (!actualByKey.has(approved.key)) {
      failedChecks.push(`expected historical delta missing: ${approved.key}`);
    }
  }
  if (actualDeltas.length !== applicableApprovedDeltas.length) {
    failedChecks.push(
      `actual changed count expected ${applicableApprovedDeltas.length}, ` +
      `received ${actualDeltas.length}`,
    );
  }

  return {
    approvedChangedExecutionCount: applicableApprovedDeltas.length,
    actualChangedExecutionCount: actualDeltas.length,
    exactMatch: failedChecks.length === 0,
    failedChecks,
    actualDeltas,
  };
}

function historicalDeltaRecord(
  historical: HistoricalV5Execution,
  current: OptimizerV6AuditExecution,
): OptimizerV6ApprovedHistoricalDelta {
  const key = historicalKey(current.fixture, current.mode, current.count, current.inputOrder);
  return {
    key,
    fixtureId: current.fixture,
    allocationMode: current.mode as 'strongest-first' | 'balanced',
    formationCount: current.count,
    inputOrder: current.inputOrder,
    historicalStableSolutionKey: historical.stableSolutionKey,
    currentStableSolutionKey: current.stableSolutionKey,
    historicalAscendingPowerVector: historical.ascendingPowerVector,
    currentAscendingPowerVector: current.ascendingPowerVector,
    historicalAscendingRatingVector: historical.ascendingRatingVector,
    currentAscendingRatingVector: current.ascendingRatingVector,
    historicalSolutionHash: historical.solutionHash,
    currentSolutionHash: current.solutionHash,
    historicalResultHash: historical.resultHash,
    currentResultHash: current.resultHash,
    reasonCode: releaseChangedKeys.has(key)
      ? OPTIMIZER_V6_RELEASE_DELTA_REASON
      : 'syrax-blazing-fury-recipient-correction',
  };
}

function historicalExecutionMatches(
  historical: HistoricalV5Execution,
  current: Pick<
    OptimizerV6AuditExecution,
    'stableSolutionKey' | 'ascendingPowerVector' | 'ascendingRatingVector'
  >,
): boolean {
  return historical.stableSolutionKey === current.stableSolutionKey &&
    JSON.stringify(historical.ascendingPowerVector) ===
      JSON.stringify(current.ascendingPowerVector) &&
    JSON.stringify(historical.ascendingRatingVector) ===
      JSON.stringify(current.ascendingRatingVector);
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated].sort();
}

function historicalCompatibility(
  fixture: string,
  inputOrder: 'forward' | 'reverse',
  result: FlexiblePowerAwareOptimizationResult,
): boolean {
  if (result.allocationMode === 'best-overall-first') return true;
  const historical = historicalV5Executions.get(historicalKey(
    fixture,
    result.allocationMode,
    result.requestedFormationCount,
    inputOrder,
  ));
  return Boolean(historical && historicalExecutionMatches(historical, {
    stableSolutionKey: result.objective.stableSolutionKey,
    ascendingPowerVector: result.objective.ascendingEstimatedPowerVector,
    ascendingRatingVector: result.objective.ascendingRatingVector,
  }));
}

function executionRecord(
  fixture: string,
  inputOrder: 'forward' | 'reverse',
  result: FlexiblePowerAwareOptimizationResult,
  historicalV5Compatible: boolean,
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
    historicalV5Compatible,
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
