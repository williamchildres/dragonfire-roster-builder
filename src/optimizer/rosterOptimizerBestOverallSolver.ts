import {
  flexiblePowerAwareObjectiveForCandidates,
} from './rosterOptimizerObjective';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  RosterOptimizerCancelledError,
  type BestOverallScoreBreakdown,
  type BestOverallStepTelemetry,
  type FlexiblePowerAwareOptimizerSolverResult,
  type OptimizerFormationCandidate,
} from './rosterOptimizerTypes';

export function roundHalfUpRatio(
  numerator: number,
  denominator: number,
): number {
  if (
    !Number.isSafeInteger(numerator) ||
    numerator < 0 ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  ) {
    throw new Error('Best Overall rounding requires non-negative safe-integer values.');
  }
  const doubledNumerator = BigInt(numerator) * 2n;
  const doubledDenominator = BigInt(denominator) * 2n;
  const rounded = (doubledNumerator + BigInt(denominator)) / doubledDenominator;
  const value = Number(rounded);
  if (!Number.isSafeInteger(value)) {
    throw new Error('Best Overall rounded value exceeded the safe-integer range.');
  }
  return value;
}

export function bestOverallScoreBreakdown(
  candidate: OptimizerFormationCandidate,
  maxRemainingPowerUnits: number,
): BestOverallScoreBreakdown {
  const estimatedPowerUnits = requiredPowerUnits(candidate);
  if (!Number.isSafeInteger(maxRemainingPowerUnits) || maxRemainingPowerUnits <= 0) {
    throw new Error('Best Overall requires a positive maximum remaining power.');
  }
  if (!Number.isSafeInteger(candidate.rating) || candidate.rating < 0 || candidate.rating > 100) {
    throw new Error(`Candidate ${candidate.stableCandidateKey} has an invalid Formation Rating.`);
  }
  const powerIndexBasisPoints = roundHalfUpRatio(
    estimatedPowerUnits * BEST_OVERALL_NORMALIZATION_SCALE,
    maxRemainingPowerUnits,
  );
  const ratingIndexBasisPoints = candidate.rating * 100;
  const powerContributionUnits = powerIndexBasisPoints * BEST_OVERALL_POWER_WEIGHT;
  const ratingContributionUnits = ratingIndexBasisPoints * BEST_OVERALL_RATING_WEIGHT;
  const overallScoreUnits = powerContributionUnits + ratingContributionUnits;
  return {
    scoringVersion: BEST_OVERALL_SCORING_VERSION,
    powerWeight: BEST_OVERALL_POWER_WEIGHT,
    formationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
    normalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
    maxRemainingPowerUnits,
    estimatedPowerUnits,
    powerIndexBasisPoints,
    ratingIndexBasisPoints,
    powerContributionUnits,
    ratingContributionUnits,
    overallScoreUnits,
    overallScore: overallScoreUnits / BEST_OVERALL_NORMALIZATION_SCALE,
  };
}

/** Negative means `left` is preferred, matching Array#sort. */
export function compareBestOverallCandidates(
  left: OptimizerFormationCandidate,
  leftScore: BestOverallScoreBreakdown,
  right: OptimizerFormationCandidate,
  rightScore: BestOverallScoreBreakdown,
): number {
  return (
    rightScore.overallScoreUnits - leftScore.overallScoreUnits ||
    requiredPowerUnits(right) - requiredPowerUnits(left) ||
    right.rating - left.rating ||
    right.adjustedRelationshipValueUnits - left.adjustedRelationshipValueUnits ||
    right.activeRelationshipCount - left.activeRelationshipCount ||
    left.stableCandidateKey.localeCompare(right.stableCandidateKey)
  );
}

export function solveBestOverallFirst(
  candidatesInput: readonly OptimizerFormationCandidate[],
  formationCount: number,
  shouldCancel?: () => boolean,
): FlexiblePowerAwareOptimizerSolverResult {
  const candidates = [...candidatesInput].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  const selectedCandidates: OptimizerFormationCandidate[] = [];
  const bestOverallScoreBreakdowns: BestOverallScoreBreakdown[] = [];
  const bestOverallSteps: BestOverallStepTelemetry[] = [];
  let unavailableMask = 0n;
  let nodesVisited = 0;
  let branchesPruned = 0;

  for (let armyIndex = 0; armyIndex < formationCount; armyIndex += 1) {
    const stepStartedAt = performance.now();
    let maxRemainingPowerUnits = 0;
    let candidatesRejectedForOverlap = 0;
    for (let index = 0; index < candidates.length; index += 1) {
      if ((index & 63) === 0) checkCancelled(shouldCancel);
      const candidate = candidates[index]!;
      if ((candidate.dragonMask & unavailableMask) !== 0n) {
        candidatesRejectedForOverlap += 1;
        continue;
      }
      maxRemainingPowerUnits = Math.max(
        maxRemainingPowerUnits,
        requiredPowerUnits(candidate),
      );
    }

    let selected: OptimizerFormationCandidate | null = null;
    let selectedScore: BestOverallScoreBreakdown | null = null;
    let scoreCalculations = 0;
    for (let index = 0; index < candidates.length; index += 1) {
      if ((index & 63) === 0) checkCancelled(shouldCancel);
      const candidate = candidates[index]!;
      if ((candidate.dragonMask & unavailableMask) !== 0n) continue;
      const score = bestOverallScoreBreakdown(candidate, maxRemainingPowerUnits);
      scoreCalculations += 1;
      if (
        !selected ||
        !selectedScore ||
        compareBestOverallCandidates(candidate, score, selected, selectedScore) < 0
      ) {
        selected = candidate;
        selectedScore = score;
      }
    }
    checkCancelled(shouldCancel);
    if (!selected || !selectedScore) {
      throw new Error(
        `Best Overall First could only build ${selectedCandidates.length} of ${formationCount} armies.`,
      );
    }

    selectedCandidates.push(selected);
    bestOverallScoreBreakdowns.push(selectedScore);
    unavailableMask |= selected.dragonMask;
    nodesVisited += scoreCalculations;
    branchesPruned += candidatesRejectedForOverlap;
    bestOverallSteps.push({
      armyRank: armyIndex + 1,
      candidatesExamined: candidates.length,
      candidatesRejectedForOverlap,
      scoreCalculations,
      maxRemainingPowerUnits,
      elapsedMs: performance.now() - stepStartedAt,
    });
  }

  return {
    optimal: true,
    selectedCandidates,
    objective: flexiblePowerAwareObjectiveForCandidates(
      selectedCandidates,
      'best-overall-first',
      bestOverallScoreBreakdowns,
    ),
    nodesVisited,
    branchesPruned,
    cacheEntries: 0,
    solverPasses: formationCount,
    bestOverallScoreBreakdowns,
    bestOverallSteps,
    performanceProfile: {
      modelBuilds: 0,
      modelConstructionMs: 0,
      certificationPasses: 0,
      skippedPhases: 0,
      prunedVariables: branchesPruned,
      phases: bestOverallSteps.map((step) => ({
        stage: `Army ${step.armyRank} exact Best Overall selection`,
        category: 'overall-score',
        solverPass: step.armyRank,
        elapsedMs: step.elapsedMs,
        variableCount: 0,
        constraintCount: (step.armyRank - 1) * 3,
        certification: false,
        exactSearchNodes: step.scoreCalculations,
      })),
    },
  };
}

function checkCancelled(shouldCancel?: () => boolean): void {
  if (shouldCancel?.()) throw new RosterOptimizerCancelledError();
}

function requiredPowerUnits(candidate: OptimizerFormationCandidate): number {
  if (!Number.isSafeInteger(candidate.estimatedPowerUnits) || candidate.estimatedPowerUnits! <= 0) {
    throw new Error(`Candidate ${candidate.stableCandidateKey} is missing Estimated Power units.`);
  }
  return candidate.estimatedPowerUnits!;
}
