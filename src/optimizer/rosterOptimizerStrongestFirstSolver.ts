import {
  compareStrongestFirstCandidates,
  flexiblePowerAwareObjectiveForCandidates,
} from './rosterOptimizerObjective';
import {
  RosterOptimizerCancelledError,
  type FlexiblePowerAwareOptimizerSolverResult,
  type OptimizerFormationCandidate,
} from './rosterOptimizerTypes';

/**
 * Exact sequential optimizer for Strongest Armies First.
 *
 * At each rank the public objective depends only on one remaining candidate.
 * Sorting the complete shared pool by that exact tuple and taking the first
 * disjoint candidate is therefore identical to exhaustive one-candidate
 * optimization at every sequential step.
 */
export function solveStrongestFirst(
  candidates: readonly OptimizerFormationCandidate[],
  formationCount: number,
  shouldCancel?: () => boolean,
): FlexiblePowerAwareOptimizerSolverResult {
  const startedAt = performance.now();
  const ordered = [...candidates].sort(compareStrongestFirstCandidates);
  const selectedCandidates: OptimizerFormationCandidate[] = [];
  let unavailableMask = 0n;
  let examined = 0;

  for (const candidate of ordered) {
    examined += 1;
    if ((examined & 255) === 0 && shouldCancel?.()) {
      throw new RosterOptimizerCancelledError();
    }
    if ((candidate.dragonMask & unavailableMask) !== 0n) continue;
    selectedCandidates.push(candidate);
    unavailableMask |= candidate.dragonMask;
    if (selectedCandidates.length === formationCount) break;
  }

  if (selectedCandidates.length !== formationCount) {
    throw new Error(
      `Strongest Armies First could only build ${selectedCandidates.length} of ${formationCount} armies.`,
    );
  }
  const elapsedMs = performance.now() - startedAt;
  return {
    optimal: true,
    selectedCandidates,
    objective: flexiblePowerAwareObjectiveForCandidates(
      selectedCandidates,
      'strongest-first',
    ),
    nodesVisited: examined,
    branchesPruned: ordered.length - selectedCandidates.length,
    cacheEntries: 0,
    solverPasses: formationCount,
    performanceProfile: {
      modelBuilds: 0,
      modelConstructionMs: 0,
      certificationPasses: 0,
      skippedPhases: 0,
      prunedVariables: 0,
      phases: selectedCandidates.map((_candidate, index) => ({
        stage: `Army ${index + 1} exact sequential selection`,
        category: 'power',
        solverPass: index + 1,
        elapsedMs: index === selectedCandidates.length - 1 ? elapsedMs : 0,
        variableCount: ordered.length,
        constraintCount: index * 3,
        certification: false,
        exactSearchNodes: examined,
      })),
    },
  };
}
