import { dragons } from '../data/dragons';
import type { DragonRarity, OwnedDragon } from '../models/dragon';
import type { FormationRatingTier } from '../services/formationRating';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import type { EstimatedDragonPower } from '../power/estimatedDragonPower';
import { solveBalancedRosterOptimizer } from './rosterOptimizerBalancedSolver';
import { solveBestOverallFirst } from './rosterOptimizerBestOverallSolver';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
  generateOptimizerFormationCandidates,
  stableHash,
} from './rosterOptimizerCandidates';
import {
  maximumOptimizerFormationCount,
  validateOptimizerFormationCount,
} from './rosterOptimizerCount';
import {
  buildEstimatedPowerCache,
  powerConfidenceCounts,
} from './rosterOptimizerPower';
import { solveStrongestFirst } from './rosterOptimizerStrongestFirstSolver';
import {
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  type FlexiblePowerAwareOptimizationResult,
  type FlexiblePowerAwareOptimizerSolverResult,
  type OptimizerAllocationMode,
  type OptimizedFormation,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type OptimizerRunProgress,
  type PowerAwareOptimizedFormation,
  type RarityCountRecord,
  type RosterOptimizationResult,
  type RosterOptimizerResponse,
  type RosterOptimizerStrategy,
  type TierDistribution,
} from './rosterOptimizerTypes';

/** Historical overload retained only so committed v0.21 audit sources compile. */
export function optimizeCurrentRoster(
  roster: Record<string, OwnedDragon>,
  allocationMode: RosterOptimizerStrategy,
  formationCount?: number,
  shouldCancel?: () => boolean,
  onProgress?: (progress: OptimizerRunProgress) => void,
): Promise<RosterOptimizationResult>;
export function optimizeCurrentRoster(
  roster: Record<string, OwnedDragon>,
  allocationMode: OptimizerAllocationMode,
  formationCount?: number,
  shouldCancel?: () => boolean,
  onProgress?: (progress: OptimizerRunProgress) => void,
): Promise<RosterOptimizerResponse>;
export async function optimizeCurrentRoster(
  roster: Record<string, OwnedDragon>,
  allocationMode: OptimizerAllocationMode | RosterOptimizerStrategy,
  formationCount = 10,
  shouldCancel?: () => boolean,
  onProgress?: (progress: OptimizerRunProgress) => void,
): Promise<RosterOptimizerResponse | RosterOptimizationResult> {
  if (
    allocationMode !== 'best-overall-first' &&
    allocationMode !== 'strongest-first' &&
    allocationMode !== 'balanced'
  ) {
    throw new Error(
      `Optimizer contract v6 does not accept legacy strategy "${allocationMode}".`,
    );
  }
  const totalStartedAt = performance.now();
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const rosterFingerprint = createRosterOptimizerFingerprint(snapshot);
  const requestFingerprint = createRosterOptimizerRequestFingerprint(
    snapshot,
    allocationMode,
    formationCount,
  );
  const maximumFormationCount = maximumOptimizerFormationCount(snapshot.length);
  if (
    snapshot.length < 3 ||
    !Number.isInteger(formationCount) ||
    formationCount < 1 ||
    formationCount > maximumFormationCount
  ) {
    const requiredDragonCount = Math.max(3, formationCount * 3);
    return {
      contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
      ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
      allocationMode,
      requestedFormationCount: formationCount,
      optimal: false,
      status: 'unavailable',
      reason: 'insufficient-eligible-dragons',
      eligibleDragonCount: snapshot.length,
      requiredDragonCount,
      additionalDragonsNeeded: Math.max(0, requiredDragonCount - snapshot.length),
      rosterFingerprint,
      requestFingerprint,
    };
  }
  validateOptimizerFormationCount(formationCount, snapshot.length);

  const estimatesByDragonId = buildEstimatedPowerCache(snapshot);
  onProgress?.({ stage: 'candidate-generation', allocationMode, formationCount });
  const candidateStartedAt = performance.now();
  const candidates = generateOptimizerFormationCandidates({
    dragons,
    profiles: simpleSynergyProfiles,
    snapshot,
    estimatesByDragonId,
    shouldCancel,
  });
  const candidateGenerationMs = performance.now() - candidateStartedAt;
  onProgress?.({ stage: 'exact-solving', allocationMode, formationCount });
  const solverStartedAt = performance.now();
  const solver = allocationMode === 'best-overall-first'
    ? solveBestOverallFirst(candidates, formationCount, shouldCancel)
    : allocationMode === 'strongest-first'
      ? solveStrongestFirst(candidates, formationCount, shouldCancel)
      : await solveBalancedRosterOptimizer(
          candidates,
          snapshot,
          formationCount,
          shouldCancel,
        );
  const solverMs = performance.now() - solverStartedAt;
  return buildFlexibleResult({
    allocationMode,
    formationCount,
    solver,
    snapshot,
    estimatesByDragonId,
    rosterFingerprint,
    requestFingerprint,
    candidateCount: candidates.length,
    candidateGenerationMs,
    solverMs,
    totalMs: performance.now() - totalStartedAt,
  });
}

export function buildFlexibleResult({
  allocationMode,
  formationCount,
  solver,
  snapshot,
  estimatesByDragonId,
  rosterFingerprint,
  requestFingerprint,
  candidateCount,
  candidateGenerationMs,
  solverMs,
  totalMs,
}: {
  allocationMode: OptimizerAllocationMode;
  formationCount: number;
  solver: FlexiblePowerAwareOptimizerSolverResult;
  snapshot: OptimizerRosterDragon[];
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>;
  rosterFingerprint: string;
  requestFingerprint: string;
  candidateCount: number;
  candidateGenerationMs: number;
  solverMs: number;
  totalMs: number;
}): FlexiblePowerAwareOptimizationResult {
  const displayCandidates = allocationMode !== 'balanced'
    ? solver.selectedCandidates
    : [...solver.selectedCandidates].sort(
        (left, right) =>
          requiredPowerUnits(right) - requiredPowerUnits(left) ||
          right.rating - left.rating ||
          left.stableCandidateKey.localeCompare(right.stableCandidateKey),
      );
  const formations = displayCandidates.map((candidate, index) =>
    publicPowerFormation(
      candidate,
      index + 1,
      estimatesByDragonId,
      allocationMode === 'best-overall-first'
        ? solver.bestOverallScoreBreakdowns?.[index]
        : undefined,
    ),
  );
  const usedDragonIds = [...new Set(
    solver.selectedCandidates.flatMap((candidate) => candidate.dragonIds),
  )].sort();
  const used = new Set(usedDragonIds);
  const unusedDragonIds = snapshot
    .map((dragon) => dragon.dragonId)
    .filter((dragonId) => !used.has(dragonId))
    .sort();
  const powers = formations.map((formation) => formation.estimatedPower);
  const ratings = formations.map((formation) => formation.rating);
  const relationshipSummary = relationshipSummaryFor(formations);
  const rarityById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon.rarity]));
  const collection = {
    totalEstimatedPower: powers.reduce((total, power) => total + power, 0),
    averageEstimatedPower:
      powers.reduce((total, power) => total + power, 0) / formationCount,
    minimumFormationEstimatedPower: Math.min(...powers),
    maximumFormationEstimatedPower: Math.max(...powers),
    estimatedPowerSpread: Math.max(...powers) - Math.min(...powers),
    totalRating: ratings.reduce((total, rating) => total + rating, 0),
    averageRating:
      ratings.reduce((total, rating) => total + rating, 0) / formationCount,
    minimumRating: Math.min(...ratings),
    totalRelationshipValue: solver.objective.totalRelationshipValue,
    totalRelationshipValueUnits: solver.objective.totalRelationshipValueUnits,
    totalActiveRelationships: solver.objective.totalActiveRelationships,
    ...relationshipSummary,
    powerConfidenceCounts: powerConfidenceCounts(usedDragonIds, estimatesByDragonId),
    rarityCounts: rarityCounts(usedDragonIds, rarityById),
    tierDistribution: tierDistributionFor(formations),
  };
  const canonicalFormations = canonicalFormationIdentity(
    solver.selectedCandidates,
    allocationMode,
    solver.bestOverallScoreBreakdowns,
  );
  const solutionIdentity = {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
    allocationMode,
    bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
    bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
    bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
    bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
    requestedFormationCount: formationCount,
    formations: canonicalFormations,
    objective: solver.objective,
  };
  const optimizerSolutionHash = stableHash(JSON.stringify(solutionIdentity));
  const optimizerResultHash = stableHash(JSON.stringify({
    ...solutionIdentity,
    rosterFingerprint,
    requestFingerprint,
    usedDragonIds,
    unusedDragonIds,
    collection,
    optimizerSolutionHash,
    estimatedPowerModelVersion: ESTIMATED_POWER_MODEL_VERSION,
    estimatedPowerModelHash: ESTIMATED_POWER_MODEL_HASH,
    estimatedPowerObservationHash: ESTIMATED_POWER_OBSERVATION_HASH,
    bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
    bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
    bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
    bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
  }));
  return {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
    allocationMode,
    optimal: true,
    requestedFormationCount: formationCount,
    generatedFormationCount: formations.length,
    rosterFingerprint,
    requestFingerprint,
    estimatedPowerModelVersion: ESTIMATED_POWER_MODEL_VERSION,
    estimatedPowerModelHash: ESTIMATED_POWER_MODEL_HASH,
    estimatedPowerObservationHash: ESTIMATED_POWER_OBSERVATION_HASH,
    bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
    bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
    bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
    bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
    estimatedPowerByDragonId: Object.fromEntries(estimatesByDragonId),
    formations,
    usedDragonIds,
    unusedDragonIds,
    collection,
    objective: solver.objective,
    diagnostics: {
      optimal: true,
      eligibleDragonCount: snapshot.length,
      candidateCount,
      selectedFormationCount: formations.length,
      nodesVisited: solver.nodesVisited,
      branchesPruned: solver.branchesPruned,
      cacheEntries: solver.cacheEntries,
      solverPasses: solver.solverPasses,
      candidateGenerationMs,
      solverMs,
      totalMs,
      performanceProfile: solver.performanceProfile,
      numericalExactness: solver.numericalExactness,
      bestOverallSteps: solver.bestOverallSteps,
    },
    optimizerSolutionHash,
    optimizerResultHash,
  };
}

function publicPowerFormation(
  candidate: OptimizerFormationCandidate,
  rank: number,
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>,
  bestOverallScore?: PowerAwareOptimizedFormation['bestOverallScore'],
): PowerAwareOptimizedFormation {
  const { dragonMask, ...publicCandidate } = candidate;
  void dragonMask;
  const dragonPowerEstimates = Object.fromEntries(
    candidate.dragonIds.map((dragonId) => [
      dragonId,
      estimatesByDragonId.get(dragonId)!,
    ]),
  );
  return {
    ...publicCandidate,
    rank,
    estimatedPower: requiredPowerUnits(candidate) * 10,
    dragonPowerEstimates,
    powerConfidenceCounts: powerConfidenceCounts(
      candidate.dragonIds,
      estimatesByDragonId,
    ),
    ...(bestOverallScore ? { bestOverallScore } : {}),
  };
}

function canonicalFormationIdentity(
  candidates: readonly OptimizerFormationCandidate[],
  allocationMode: OptimizerAllocationMode,
  bestOverallScoreBreakdowns?: readonly PowerAwareOptimizedFormation['bestOverallScore'][],
) {
  const ordered = allocationMode !== 'balanced'
    ? candidates
    : [...candidates].sort((left, right) =>
        left.stableCandidateKey.localeCompare(right.stableCandidateKey),
      );
  return ordered.map((candidate, index) => ({
    dragonIds: candidate.dragonIds,
    arrangement: candidate.arrangement,
    estimatedPowerUnits: requiredPowerUnits(candidate),
    rating: candidate.rating,
    adjustedRelationshipValueUnits: candidate.adjustedRelationshipValueUnits,
    activeRelationshipCount: candidate.activeRelationshipCount,
    stableCandidateKey: candidate.stableCandidateKey,
    ...(allocationMode === 'best-overall-first'
      ? { bestOverallScore: bestOverallScoreBreakdowns?.[index] }
      : {}),
  }));
}

function requiredPowerUnits(candidate: OptimizerFormationCandidate): number {
  if (!Number.isSafeInteger(candidate.estimatedPowerUnits)) {
    throw new Error(`Candidate ${candidate.stableCandidateKey} has no Estimated Power units.`);
  }
  return candidate.estimatedPowerUnits!;
}

function relationshipSummaryFor(formations: OptimizedFormation[]) {
  return {
    quantifiedRelationshipCount: formations.reduce(
      (total, formation) => total + formation.quantifiedRelationshipCount,
      0,
    ),
    unquantifiedRelationshipCount: formations.reduce(
      (total, formation) => total + formation.unquantifiedRelationshipCount,
      0,
    ),
    unquantifiedBasePotential: formations.reduce(
      (total, formation) => total + formation.unquantifiedBasePotential,
      0,
    ),
  };
}

function rarityCounts(
  dragonIds: string[],
  rarityById: ReadonlyMap<string, DragonRarity>,
): RarityCountRecord {
  const counts: RarityCountRecord = { Legendary: 0, Epic: 0, Rare: 0 };
  dragonIds.forEach((dragonId) => {
    const rarity = rarityById.get(dragonId);
    if (rarity) counts[rarity] += 1;
  });
  return counts;
}

function tierDistributionFor(formations: OptimizedFormation[]): TierDistribution {
  const distribution: TierDistribution = emptyTierDistribution();
  formations.forEach((formation) => {
    distribution[formation.tier] += 1;
  });
  return distribution;
}

export function emptyTierDistribution(): Record<FormationRatingTier, number> {
  return {
    Excellent: 0,
    Strong: 0,
    Solid: 0,
    Developing: 0,
    Weak: 0,
    Incomplete: 0,
  };
}
