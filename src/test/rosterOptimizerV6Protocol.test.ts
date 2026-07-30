import { describe, expect, it } from 'vitest';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { isRosterOptimizerRequestV6 } from '../optimizer/rosterOptimizerProtocol';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
} from '../optimizer/rosterOptimizerTypes';

const validRequest = {
  contractVersion: 6,
  ratingContract: 'formation-rating-v3',
  estimatedPowerModelVersion: ESTIMATED_POWER_MODEL_VERSION,
  estimatedPowerModelHash: ESTIMATED_POWER_MODEL_HASH,
  estimatedPowerObservationHash: ESTIMATED_POWER_OBSERVATION_HASH,
  bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
  bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
  bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
  bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
  allocationMode: 'best-overall-first',
  formationCount: 11,
} as const;

describe('optimizer contract-v6 protocol', () => {
  it('accepts every v6 allocation mode with the fixed scoring profile', () => {
    for (const allocationMode of [
      'best-overall-first',
      'strongest-first',
      'balanced',
    ]) {
      expect(isRosterOptimizerRequestV6({ ...validRequest, allocationMode })).toBe(true);
    }
  });

  it('rejects contract v5 without interpreting its mode', () => {
    expect(isRosterOptimizerRequestV6({
      ...validRequest,
      contractVersion: 5,
      allocationMode: 'strongest-first',
    })).toBe(false);
  });

  it.each([
    ['bestOverallScoringVersion', 'best-overall-v0'],
    ['bestOverallPowerWeight', 61],
    ['bestOverallFormationRatingWeight', 39],
    ['bestOverallNormalizationScale', 1_000],
    ['allocationMode', 'best-ten-overall'],
    ['formationCount', 1.5],
  ])('rejects a stale or invalid %s', (field, value) => {
    expect(isRosterOptimizerRequestV6({ ...validRequest, [field]: value })).toBe(false);
  });
});
