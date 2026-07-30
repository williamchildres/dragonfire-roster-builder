import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
} from './rosterOptimizerTypes';

export function isRosterOptimizerRequestV6(request: {
  contractVersion?: unknown;
  ratingContract?: unknown;
  estimatedPowerModelVersion?: unknown;
  estimatedPowerModelHash?: unknown;
  estimatedPowerObservationHash?: unknown;
  bestOverallScoringVersion?: unknown;
  bestOverallPowerWeight?: unknown;
  bestOverallFormationRatingWeight?: unknown;
  bestOverallNormalizationScale?: unknown;
  allocationMode?: unknown;
  formationCount?: unknown;
}): boolean {
  return request.contractVersion === ROSTER_OPTIMIZER_CONTRACT_VERSION &&
    request.ratingContract === ROSTER_OPTIMIZER_RATING_CONTRACT &&
    request.estimatedPowerModelVersion === ESTIMATED_POWER_MODEL_VERSION &&
    request.estimatedPowerModelHash === ESTIMATED_POWER_MODEL_HASH &&
    request.estimatedPowerObservationHash === ESTIMATED_POWER_OBSERVATION_HASH &&
    request.bestOverallScoringVersion === BEST_OVERALL_SCORING_VERSION &&
    request.bestOverallPowerWeight === BEST_OVERALL_POWER_WEIGHT &&
    request.bestOverallFormationRatingWeight === BEST_OVERALL_RATING_WEIGHT &&
    request.bestOverallNormalizationScale === BEST_OVERALL_NORMALIZATION_SCALE &&
    (
      request.allocationMode === 'best-overall-first' ||
      request.allocationMode === 'strongest-first' ||
      request.allocationMode === 'balanced'
    ) &&
    Number.isInteger(request.formationCount);
}
