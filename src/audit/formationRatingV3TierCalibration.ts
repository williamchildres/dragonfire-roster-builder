import type { FormationRatingTier } from '../services/formationRating';

export interface FormationRatingV3TierThresholds {
  Excellent: number;
  Strong: number;
  Solid: number;
  Developing: number;
}

export const FORMATION_RATING_V3_TIER_TARGETS = {
  individual: {
    Excellent: 385,
    Strong: 3_451,
    Solid: 15_805,
    Developing: 13_875,
    Weak: 2_388,
  },
  cumulative: {
    Excellent: 385,
    Strong: 3_836,
    Solid: 19_641,
    Developing: 33_516,
  },
  total: 35_904,
} as const;

export interface FormationRatingV3TierCalibration {
  thresholds: FormationRatingV3TierThresholds;
  counts: Record<Exclude<FormationRatingTier, 'Incomplete'>, number>;
  cumulativeCounts: Record<keyof typeof FORMATION_RATING_V3_TIER_TARGETS.cumulative, number>;
  objective: {
    cumulativeAbsoluteDeviation: number;
    largestCumulativeDeviation: number;
    individualAbsoluteDeviation: number;
  };
}

export function calibrateFormationRatingV3Tiers(
  scores: readonly number[],
): FormationRatingV3TierCalibration {
  if (scores.length !== FORMATION_RATING_V3_TIER_TARGETS.total) {
    throw new Error(
      `Expected ${FORMATION_RATING_V3_TIER_TARGETS.total} v3 scores; received ${scores.length}.`,
    );
  }
  const maximum = Math.max(...scores);
  const cumulativeAtOrAbove = Array.from({ length: maximum + 2 }, () => 0);
  for (let threshold = 0; threshold <= maximum + 1; threshold += 1) {
    cumulativeAtOrAbove[threshold] = scores.filter((score) => score >= threshold).length;
  }

  let best: FormationRatingV3TierCalibration | null = null;
  for (let developing = 1; developing <= maximum - 3; developing += 1) {
    for (let solid = developing + 1; solid <= maximum - 2; solid += 1) {
      for (let strong = solid + 1; strong <= maximum - 1; strong += 1) {
        for (let excellent = strong + 1; excellent <= maximum; excellent += 1) {
          const cumulativeCounts = {
            Excellent: cumulativeAtOrAbove[excellent]!,
            Strong: cumulativeAtOrAbove[strong]!,
            Solid: cumulativeAtOrAbove[solid]!,
            Developing: cumulativeAtOrAbove[developing]!,
          };
          const counts = {
            Excellent: cumulativeCounts.Excellent,
            Strong: cumulativeCounts.Strong - cumulativeCounts.Excellent,
            Solid: cumulativeCounts.Solid - cumulativeCounts.Strong,
            Developing: cumulativeCounts.Developing - cumulativeCounts.Solid,
            Weak: scores.length - cumulativeCounts.Developing,
          };
          if (Object.values(counts).some((count) => count === 0)) continue;
          const cumulativeDeviations = Object.entries(cumulativeCounts).map(
            ([tier, count]) =>
              Math.abs(
                count -
                  FORMATION_RATING_V3_TIER_TARGETS.cumulative[
                    tier as keyof typeof cumulativeCounts
                  ],
              ),
          );
          const individualDeviation = Object.entries(counts).reduce(
            (total, [tier, count]) =>
              total +
              Math.abs(
                count -
                  FORMATION_RATING_V3_TIER_TARGETS.individual[
                    tier as keyof typeof counts
                  ],
              ),
            0,
          );
          const candidate: FormationRatingV3TierCalibration = {
            thresholds: {
              Excellent: excellent,
              Strong: strong,
              Solid: solid,
              Developing: developing,
            },
            counts,
            cumulativeCounts,
            objective: {
              cumulativeAbsoluteDeviation: cumulativeDeviations.reduce(
                (sum, value) => sum + value,
                0,
              ),
              largestCumulativeDeviation: Math.max(...cumulativeDeviations),
              individualAbsoluteDeviation: individualDeviation,
            },
          };
          if (!best || compareCalibrations(candidate, best) < 0) best = candidate;
        }
      }
    }
  }
  if (!best) throw new Error('No valid Formation Rating v3 tier threshold tuple exists.');
  return best;
}

function compareCalibrations(
  left: FormationRatingV3TierCalibration,
  right: FormationRatingV3TierCalibration,
): number {
  return (
    left.objective.cumulativeAbsoluteDeviation -
      right.objective.cumulativeAbsoluteDeviation ||
    left.objective.largestCumulativeDeviation -
      right.objective.largestCumulativeDeviation ||
    left.objective.individualAbsoluteDeviation -
      right.objective.individualAbsoluteDeviation ||
    right.thresholds.Excellent - left.thresholds.Excellent ||
    right.thresholds.Strong - left.thresholds.Strong ||
    right.thresholds.Solid - left.thresholds.Solid ||
    right.thresholds.Developing - left.thresholds.Developing
  );
}
