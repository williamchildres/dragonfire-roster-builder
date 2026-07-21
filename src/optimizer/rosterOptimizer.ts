import { dragons } from '../data/dragons';
import type { DragonRarity, OwnedDragon } from '../models/dragon';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  generateOptimizerFormationCandidates,
  stableHash,
} from './rosterOptimizerCandidates';
import { solveRosterOptimizerMip } from './rosterOptimizerMipSolver';
import {
  OPTIMIZER_DRAGON_COUNT,
  OPTIMIZER_FORMATION_COUNT,
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  type OptimizedFormation,
  type OptimizerFormationCandidate,
  type RarityCountRecord,
  type RosterOptimizationResult,
  type RosterOptimizerResponse,
} from './rosterOptimizerTypes';

export async function optimizeCurrentRoster(
  roster: Record<string, OwnedDragon>,
  shouldCancel?: () => boolean,
): Promise<RosterOptimizerResponse> {
  const totalStartedAt = performance.now();
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const rosterFingerprint = createRosterOptimizerFingerprint(snapshot);
  if (snapshot.length < OPTIMIZER_DRAGON_COUNT) {
    return {
      contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
      optimal: false,
      status: 'unavailable',
      reason: 'insufficient-eligible-dragons',
      eligibleDragonCount: snapshot.length,
      requiredDragonCount: OPTIMIZER_DRAGON_COUNT,
      additionalDragonsNeeded: OPTIMIZER_DRAGON_COUNT - snapshot.length,
      rosterFingerprint,
    };
  }

  const candidateStartedAt = performance.now();
  const candidates = generateOptimizerFormationCandidates({
    dragons,
    profiles: simpleSynergyProfiles,
    snapshot,
    shouldCancel,
  });
  const candidateGenerationMs = performance.now() - candidateStartedAt;
  const solverStartedAt = performance.now();
  if (shouldCancel?.()) {
    throw new Error('Roster optimization was cancelled.');
  }
  const solver = await solveRosterOptimizerMip(candidates, snapshot);
  const solverMs = performance.now() - solverStartedAt;
  if (!solver) {
    throw new Error('No complete 10-formation allocation exists for this roster.');
  }

  const displayCandidates = [...solver.selectedCandidates].sort(displayCandidateOrder);
  const formations: OptimizedFormation[] = displayCandidates.map((candidate, index) => {
    const publicCandidate = { ...candidate };
    delete (publicCandidate as Partial<OptimizerFormationCandidate>).dragonMask;
    return { ...publicCandidate, rank: index + 1 };
  });
  const usedDragonIds = [
    ...new Set(formations.flatMap((formation) => formation.dragonIds)),
  ].sort();
  const usedDragonIdSet = new Set(usedDragonIds);
  const unusedDragonIds = snapshot
    .map((dragon) => dragon.dragonId)
    .filter((dragonId) => !usedDragonIdSet.has(dragonId))
    .sort();
  const rarityById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon.rarity]));
  const usedRarityCounts = rarityCounts(usedDragonIds, rarityById);
  const unusedRarityCounts = rarityCounts(unusedDragonIds, rarityById);
  const tierDistribution = {
    Excellent: 0,
    Strong: 0,
    Solid: 0,
    Developing: 0,
    Weak: 0,
    Incomplete: 0,
  } satisfies RosterOptimizationResult['tierDistribution'];
  formations.forEach((formation) => {
    tierDistribution[formation.tier] += 1;
  });
  const resultIdentity = {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    rosterFingerprint,
    objective: solver.objective,
    formations: formations.map((formation) => ({
      dragonIds: formation.dragonIds,
      arrangement: formation.arrangement,
      rating: formation.rating,
      stableCandidateKey: formation.stableCandidateKey,
    })),
    usedDragonIds,
    unusedDragonIds,
  };
  return {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    optimal: true,
    rosterFingerprint,
    formations,
    usedDragonIds,
    unusedDragonIds,
    usedRarityCounts,
    unusedRarityCounts,
    objective: solver.objective,
    averageRating: solver.objective.totalRating / OPTIMIZER_FORMATION_COUNT,
    minimumRating: solver.objective.minimumRating,
    tierDistribution,
    diagnostics: {
      optimal: true,
      eligibleDragonCount: snapshot.length,
      candidateCount: candidates.length,
      selectedFormationCount: formations.length,
      nodesVisited: solver.nodesVisited,
      branchesPruned: solver.branchesPruned,
      cacheEntries: solver.cacheEntries,
      solverPasses: solver.solverPasses,
      candidateGenerationMs,
      solverMs,
      totalMs: performance.now() - totalStartedAt,
    },
    optimizerResultHash: stableHash(JSON.stringify(resultIdentity)),
  };
}

function displayCandidateOrder(
  left: OptimizerFormationCandidate,
  right: OptimizerFormationCandidate,
): number {
  return (
    right.rating - left.rating ||
    right.activeRelationshipValue - left.activeRelationshipValue ||
    left.stableCandidateKey.localeCompare(right.stableCandidateKey)
  );
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
