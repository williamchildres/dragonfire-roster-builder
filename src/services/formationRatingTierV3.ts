import type { FormationRatingTier } from './formationRating';

export const FORMATION_RATING_V3_TIER_THRESHOLDS = {
  Excellent: 66,
  Strong: 53,
  Solid: 34,
  Developing: 5,
} as const;

export function tierForFormationRatingV3(score: number): FormationRatingTier {
  if (score >= FORMATION_RATING_V3_TIER_THRESHOLDS.Excellent) return 'Excellent';
  if (score >= FORMATION_RATING_V3_TIER_THRESHOLDS.Strong) return 'Strong';
  if (score >= FORMATION_RATING_V3_TIER_THRESHOLDS.Solid) return 'Solid';
  if (score >= FORMATION_RATING_V3_TIER_THRESHOLDS.Developing) return 'Developing';
  return 'Weak';
}
