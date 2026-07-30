import { describe, expect, it } from 'vitest';
import {
  bestOverallScoreBreakdown,
  compareBestOverallCandidates,
  roundHalfUpRatio,
  solveBestOverallFirst,
} from '../optimizer/rosterOptimizerBestOverallSolver';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
} from '../optimizer/rosterOptimizerTypes';

describe('Best Overall v1 exact scoring', () => {
  it('publishes the fixed 60/40 profile', () => {
    expect(BEST_OVERALL_SCORING_VERSION).toBe('best-overall-v1');
    expect(BEST_OVERALL_POWER_WEIGHT).toBe(60);
    expect(BEST_OVERALL_RATING_WEIGHT).toBe(40);
    expect(BEST_OVERALL_NORMALIZATION_SCALE).toBe(10_000);
  });

  it.each([
    [0, 7, 0],
    [3, 7, 0],
    [4, 7, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 2, 2],
  ])('rounds %i / %i half-up to %i with integer arithmetic', (
    numerator,
    denominator,
    expected,
  ) => {
    expect(roundHalfUpRatio(numerator, denominator)).toBe(expected);
  });

  it('normalizes the strongest candidate to 10,000 and reconstructs every unit', () => {
    const candidate = formation('candidate', ['a', 'b', 'c'], 12_345, 74);
    const score = bestOverallScoreBreakdown(candidate, 12_345);
    expect(score).toEqual({
      scoringVersion: 'best-overall-v1',
      powerWeight: 60,
      formationRatingWeight: 40,
      normalizationScale: 10_000,
      maxRemainingPowerUnits: 12_345,
      estimatedPowerUnits: 12_345,
      powerIndexBasisPoints: 10_000,
      ratingIndexBasisPoints: 7_400,
      powerContributionUnits: 600_000,
      ratingContributionUnits: 296_000,
      overallScoreUnits: 896_000,
      overallScore: 89.6,
    });
  });

  it('rounds an exact normalized half basis point upward', () => {
    const candidate = formation('half-basis-point', ['a', 'b', 'c'], 1, 0);
    expect(bestOverallScoreBreakdown(candidate, 32).powerIndexBasisPoints).toBe(313);
  });

  it('prefers a higher exact Overall Score before raw power', () => {
    const rawPower = formation('raw-power', ['a', 'b', 'c'], 1_000, 0);
    const cohesive = formation('cohesive', ['d', 'e', 'f'], 900, 100);
    const rawScore = bestOverallScoreBreakdown(rawPower, 1_000);
    const cohesiveScore = bestOverallScoreBreakdown(cohesive, 1_000);
    expect(cohesiveScore.overallScoreUnits).toBeGreaterThan(rawScore.overallScoreUnits);
    expect(compareBestOverallCandidates(
      cohesive,
      cohesiveScore,
      rawPower,
      rawScore,
    )).toBeLessThan(0);
  });

  it('rescales power after each earlier army claims its dragons', () => {
    const candidates = [
      formation('first', ['a', 'b', 'c'], 1_000, 70),
      formation('second', ['d', 'e', 'f'], 800, 70),
      formation('third', ['g', 'h', 'i'], 700, 70),
    ];
    const result = solveBestOverallFirst(candidates, 3);
    expect(result.selectedCandidates.map((candidate) => candidate.stableCandidateKey))
      .toEqual(['first', 'second', 'third']);
    expect(result.bestOverallScoreBreakdowns?.map((score) => [
      score.maxRemainingPowerUnits,
      score.powerIndexBasisPoints,
    ])).toEqual([
      [1_000, 10_000],
      [800, 10_000],
      [700, 10_000],
    ]);
  });

  it('matches exhaustive feasible scoring at every sequential step', () => {
    const candidates = [
      formation('abc', ['a', 'b', 'c'], 1_000, 10, 0, 0),
      formation('ade', ['a', 'd', 'e'], 950, 100, 10, 2),
      formation('def', ['d', 'e', 'f'], 800, 70, 5, 1),
      formation('ghi', ['g', 'h', 'i'], 700, 90, 5, 1),
      formation('jkl', ['j', 'k', 'l'], 600, 60, 3, 1),
    ];
    const result = solveBestOverallFirst(candidates, 3);
    let used = 0n;
    const exhaustive: string[] = [];
    for (let step = 0; step < 3; step += 1) {
      const feasible = candidates.filter((candidate) => (candidate.dragonMask & used) === 0n);
      const maxPower = Math.max(...feasible.map((candidate) => candidate.estimatedPowerUnits!));
      const scored = feasible
        .map((candidate) => ({
          candidate,
          score: bestOverallScoreBreakdown(candidate, maxPower),
        }))
        .sort((left, right) => compareBestOverallCandidates(
          left.candidate,
          left.score,
          right.candidate,
          right.score,
        ));
      exhaustive.push(scored[0]!.candidate.stableCandidateKey);
      used |= scored[0]!.candidate.dragonMask;
    }
    expect(result.selectedCandidates.map((candidate) => candidate.stableCandidateKey))
      .toEqual(exhaustive);
    expect(result.performanceProfile.modelBuilds).toBe(0);
    expect(result.performanceProfile.certificationPasses).toBe(0);
    expect(result.bestOverallSteps).toHaveLength(3);
    expect(result.nodesVisited).toBe(
      result.bestOverallSteps!.reduce((sum, step) => sum + step.scoreCalculations, 0),
    );
  });

  it('checks cancellation during the sequential scans', () => {
    const candidates = Array.from({ length: 130 }, (_, index) =>
      formation(
        `candidate-${String(index).padStart(3, '0')}`,
        ['a', 'b', 'c'],
        1_000 - index,
        50,
      ),
    );
    let checks = 0;
    expect(() => solveBestOverallFirst(candidates, 1, () => ++checks >= 2))
      .toThrow(RosterOptimizerCancelledError);
  });
});

function formation(
  key: string,
  dragonIds: [string, string, string],
  powerUnits: number,
  rating: number,
  relationshipUnits = 0,
  activeRelationships = 0,
): OptimizerFormationCandidate {
  const ids = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const dragonMask = dragonIds.reduce(
    (mask, dragonId) => mask | (1n << BigInt(ids.indexOf(dragonId))),
    0n,
  );
  return {
    ratingContract: 'formation-rating-v3',
    stableCandidateKey: key,
    dragonIds,
    dragonMask,
    arrangement: {
      'left-flank': dragonIds[0],
      vanguard: dragonIds[1],
      'right-flank': dragonIds[2],
    },
    tiedBestArrangements: [],
    rating,
    tier: 'Solid',
    activeSynergyScore: Math.max(0, rating - 20),
    placementScore: Math.min(20, rating),
    adjustedRelationshipValue: relationshipUnits / 1_000_000,
    adjustedRelationshipValueUnits: relationshipUnits,
    activeRelationshipCount: activeRelationships,
    quantifiedRelationshipCount: activeRelationships,
    unquantifiedRelationshipCount: 0,
    unquantifiedBasePotential: 0,
    reliabilityCoverage: 'all-quantified',
    participatingDragonCount: 3,
    relationships: [],
    strengths: [],
    gaps: [],
    progressionSnapshot: {},
    estimatedPowerUnits: powerUnits,
  };
}
