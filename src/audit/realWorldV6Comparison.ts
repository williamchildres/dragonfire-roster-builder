import { dragons } from '../data/dragons';
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
import type {
  FlexiblePowerAwareOptimizationResult,
  OptimizerAllocationMode,
  OptimizerFormationCandidate,
} from '../optimizer/rosterOptimizerTypes';
import { realWorldRosterV0221 } from './realWorldRosterV0221';

const modes: readonly OptimizerAllocationMode[] = [
  'best-overall-first',
  'strongest-first',
  'balanced',
];

export async function runRealWorldV6Comparison() {
  const snapshot = buildOptimizerRosterSnapshot(dragons, realWorldRosterV0221());
  const estimates = buildEstimatedPowerCache(snapshot);
  const candidateStartedAt = performance.now();
  const candidates = generateOptimizerFormationCandidates({
    dragons,
    profiles: simpleSynergyProfiles,
    snapshot,
    estimatesByDragonId: estimates,
  });
  const candidateGenerationMs = performance.now() - candidateStartedAt;
  const results = new Map<OptimizerAllocationMode, FlexiblePowerAwareOptimizationResult>();

  for (const mode of modes) {
    const solverStartedAt = performance.now();
    const solver = mode === 'best-overall-first'
      ? solveBestOverallFirst(candidates, 11)
      : mode === 'strongest-first'
        ? solveStrongestFirst(candidates, 11)
        : await solveBalancedRosterOptimizer(candidates, snapshot, 11);
    const solverMs = performance.now() - solverStartedAt;
    results.set(mode, buildFlexibleResult({
      allocationMode: mode,
      formationCount: 11,
      solver,
      snapshot,
      estimatesByDragonId: estimates,
      rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
      requestFingerprint: createRosterOptimizerRequestFingerprint(snapshot, mode, 11),
      candidateCount: candidates.length,
      candidateGenerationMs,
      solverMs,
      totalMs: candidateGenerationMs + solverMs,
    }));
  }

  const comparisons = modes.map((mode) => comparisonFor(results.get(mode)!));
  const bestOverall = results.get('best-overall-first')!;
  const rawPower = results.get('strongest-first')!;
  if (
    bestOverall.objective.stableSolutionKey === rawPower.objective.stableSolutionKey ||
    bestOverall.collection.totalRating <= rawPower.collection.totalRating
  ) {
    throw new Error(
      'The real-world fixture did not distinguish Best Overall or improve total rating.',
    );
  }

  const semanticIdentity = {
    fixtureIdentity: stableHash(JSON.stringify(snapshot)),
    candidateIdentity: stableHash(JSON.stringify(candidates.map((candidate) => [
      candidate.stableCandidateKey,
      candidate.estimatedPowerUnits,
      candidate.rating,
      candidate.adjustedRelationshipValueUnits,
      candidate.activeRelationshipCount,
    ]))),
    comparisons: comparisons.map((comparison) => ({
      mode: comparison.mode,
      solutionHash: comparison.solutionHash,
      resultHash: comparison.resultHash,
      formations: comparison.formations,
      summary: comparison.summary,
    })),
    caraxesSyrax: caraxesSyraxDiagnostic(candidates, bestOverall),
  };

  return {
    release: '0.23.5',
    contractVersion: 6,
    fixtureDragonCount: snapshot.length,
    candidatePoolBuilds: 1,
    candidateCount: candidates.length,
    fixtureIdentity: semanticIdentity.fixtureIdentity,
    candidateIdentity: semanticIdentity.candidateIdentity,
    comparisons,
    bestOverallDistinctFromHighestRawPower: true,
    bestOverallTotalRatingGain:
      bestOverall.collection.totalRating - rawPower.collection.totalRating,
    caraxesSyrax: semanticIdentity.caraxesSyrax,
    deterministicComparisonHash: stableHash(JSON.stringify(semanticIdentity)),
  };
}

function comparisonFor(result: FlexiblePowerAwareOptimizationResult) {
  return {
    mode: result.allocationMode,
    solutionHash: result.optimizerSolutionHash,
    resultHash: result.optimizerResultHash,
    formations: result.formations.map((formation) => ({
      rank: formation.rank,
      stableCandidateKey: formation.stableCandidateKey,
      dragonIds: formation.dragonIds,
      arrangement: formation.arrangement,
      estimatedPower: formation.estimatedPower,
      formationRating: formation.rating,
      ...(formation.bestOverallScore
        ? {
            overallScore: formation.bestOverallScore.overallScore,
            overallScoreUnits: formation.bestOverallScore.overallScoreUnits,
          }
        : {}),
    })),
    summary: {
      averageRating: result.collection.averageRating,
      minimumRating: result.collection.minimumRating,
      totalRating: result.collection.totalRating,
      strongestRawPower: result.collection.maximumFormationEstimatedPower,
      weakestRawPower: result.collection.minimumFormationEstimatedPower,
      totalRawPower: result.collection.totalEstimatedPower,
      powerSpread: result.collection.estimatedPowerSpread,
    },
    telemetry: {
      candidateGenerationMs: round(result.diagnostics.candidateGenerationMs),
      solverMs: round(result.diagnostics.solverMs),
      totalMs: round(result.diagnostics.totalMs),
      solverPasses: result.diagnostics.solverPasses ?? 0,
      exactSearchNodes: result.diagnostics.nodesVisited,
      modelBuilds: result.diagnostics.performanceProfile?.modelBuilds ?? 0,
      certificationPasses:
        result.diagnostics.performanceProfile?.certificationPasses ?? 0,
    },
  };
}

function caraxesSyraxDiagnostic(
  candidates: readonly OptimizerFormationCandidate[],
  result: FlexiblePowerAwareOptimizationResult,
) {
  const maximumPower = Math.max(...candidates.map((candidate) => candidate.estimatedPowerUnits!));
  const scored = candidates.map((candidate) => ({
    candidate,
    score: bestOverallScoreBreakdown(candidate, maximumPower),
  })).sort((left, right) => compareBestOverallCandidates(
    left.candidate,
    left.score,
    right.candidate,
    right.score,
  ));
  const winning = scored[0]!;
  const pair = scored.find(({ candidate }) =>
    candidate.dragonIds.includes('caraxes') &&
    candidate.dragonIds.includes('syrax'),
  );
  if (!pair) throw new Error('No Caraxes and Syrax candidate was generated.');
  const selectedRank = result.formations.find(
    (formation) => formation.stableCandidateKey === pair.candidate.stableCandidateKey,
  )?.rank ?? null;
  return {
    earliestAvailableStep: 1,
    thirdDragonId: pair.candidate.dragonIds.find(
      (dragonId) => dragonId !== 'caraxes' && dragonId !== 'syrax',
    )!,
    stableCandidateKey: pair.candidate.stableCandidateKey,
    arrangement: pair.candidate.arrangement,
    estimatedPower: pair.candidate.estimatedPowerUnits! * 10,
    formationRating: pair.candidate.rating,
    overallScore: pair.score.overallScore,
    overallScoreUnits: pair.score.overallScoreUnits,
    activeRelationships: pair.candidate.relationships.map((relationship) => ({
      label: relationship.explanation,
      adjustedValueUnits: Math.round(relationship.adjustedMarginalValue * 1_000_000),
      reliabilityStatus: relationship.quantification.status,
    })),
    activeRelationshipCount: pair.candidate.activeRelationshipCount,
    unquantifiedRelationshipCount: pair.candidate.unquantifiedRelationshipCount,
    unquantifiedRelationshipPotential: pair.candidate.unquantifiedBasePotential,
    missingOrLockedMechanics: pair.candidate.gaps.map((gap) => gap.summary),
    selectedByBestOverall: selectedRank !== null,
    selectedRank,
    winningCandidate: {
      stableCandidateKey: winning.candidate.stableCandidateKey,
      arrangement: winning.candidate.arrangement,
      estimatedPower: winning.candidate.estimatedPowerUnits! * 10,
      formationRating: winning.candidate.rating,
      overallScore: winning.score.overallScore,
      overallScoreUnits: winning.score.overallScoreUnits,
    },
    scoreDifferenceUnits: winning.score.overallScoreUnits - pair.score.overallScoreUnits,
    scoreDifference: (
      winning.score.overallScoreUnits - pair.score.overallScoreUnits
    ) / 10_000,
  };
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
