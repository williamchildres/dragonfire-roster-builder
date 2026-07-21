import {
  comparePrimaryBackupOptimizerObjectives,
  primaryBackupObjectiveForCandidates,
} from './rosterOptimizerObjective';
import {
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type PrimaryBackupOptimizerSolverResult,
} from './rosterOptimizerTypes';

export interface PrimaryBackupExactSolverOptions {
  formationsPerWave?: number;
  shouldCancel?: () => boolean;
}

/**
 * Independent exact oracle for small fixtures. Production rosters use HiGHS;
 * this deliberately simple exhaustive implementation validates the complete
 * hierarchical two-wave comparator without sharing the MILP formulation.
 */
export function solvePrimaryBackupCandidates(
  inputCandidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  options: PrimaryBackupExactSolverOptions = {},
): PrimaryBackupOptimizerSolverResult | null {
  const formationsPerWave = options.formationsPerWave ?? 5;
  const candidates = [...inputCandidates].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  const rarityByDragonId = new Map(
    eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
  );
  const allocations: WaveAllocation[] = [];
  let nodesVisited = 0;
  const selected: OptimizerFormationCandidate[] = [];
  const used = new Set<string>();

  const enumerate = (start: number): void => {
    nodesVisited += 1;
    if (options.shouldCancel?.()) {
      throw new RosterOptimizerCancelledError();
    }
    if (selected.length === formationsPerWave) {
      allocations.push({ candidates: [...selected], dragonIds: new Set(used) });
      return;
    }
    for (let index = start; index < candidates.length; index += 1) {
      const candidate = candidates[index]!;
      if (candidate.dragonIds.some((dragonId) => used.has(dragonId))) continue;
      candidate.dragonIds.forEach((dragonId) => used.add(dragonId));
      selected.push(candidate);
      enumerate(index + 1);
      selected.pop();
      candidate.dragonIds.forEach((dragonId) => used.delete(dragonId));
    }
  };
  enumerate(0);

  let best: {
    primary: OptimizerFormationCandidate[];
    backup: OptimizerFormationCandidate[];
    objective: ReturnType<typeof primaryBackupObjectiveForCandidates>;
  } | null = null;
  for (const primary of allocations) {
    for (const backup of allocations) {
      nodesVisited += 1;
      if (options.shouldCancel?.()) {
        throw new RosterOptimizerCancelledError();
      }
      if ([...backup.dragonIds].some((dragonId) => primary.dragonIds.has(dragonId))) continue;
      const objective = primaryBackupObjectiveForCandidates(
        primary.candidates,
        backup.candidates,
        rarityByDragonId,
      );
      if (!best || comparePrimaryBackupOptimizerObjectives(objective, best.objective) > 0) {
        best = { primary: primary.candidates, backup: backup.candidates, objective };
      }
    }
  }
  if (!best) return null;
  return {
    optimal: true,
    primaryCandidates: best.primary,
    backupCandidates: best.backup,
    objective: best.objective,
    nodesVisited,
    branchesPruned: 0,
    cacheEntries: allocations.length,
    solverPasses: 1,
    phaseTimings: {
      modelConstructionMs: 0,
      primaryRarityMs: 0,
      primaryQualityMs: 0,
      backupRarityMs: 0,
      backupQualityMs: 0,
      stableKeyMs: 0,
    },
  };
}

interface WaveAllocation {
  candidates: OptimizerFormationCandidate[];
  dragonIds: Set<string>;
}
