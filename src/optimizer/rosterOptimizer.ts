import { dragons } from '../data/dragons';
import type { DragonRarity, OwnedDragon } from '../models/dragon';
import type { FormationRatingTier } from '../services/formationRating';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
  generateOptimizerFormationCandidates,
  stableHash,
} from './rosterOptimizerCandidates';
import { solveRosterOptimizerMip } from './rosterOptimizerMipSolver';
import { solvePrimaryBackupRosterOptimizerMip } from './rosterOptimizerPrimaryBackupMipSolver';
import {
  OPTIMIZER_DRAGON_COUNT,
  OPTIMIZER_FORMATION_COUNT,
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  RosterOptimizerCancelledError,
  type BestTenOverallOptimizationResult,
  type OptimizedFormation,
  type OptimizerCollectionSummary,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type OptimizerWave,
  type OptimizerWaveResult,
  type PrimaryBackupOptimizationResult,
  type RarityCountRecord,
  type RosterOptimizerResponse,
  type RosterOptimizerStrategy,
  type TierDistribution,
} from './rosterOptimizerTypes';

export async function optimizeCurrentRoster(
  roster: Record<string, OwnedDragon>,
  strategy: RosterOptimizerStrategy,
  shouldCancel?: () => boolean,
): Promise<RosterOptimizerResponse> {
  const totalStartedAt = performance.now();
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const rosterFingerprint = createRosterOptimizerFingerprint(snapshot);
  const requestFingerprint = createRosterOptimizerRequestFingerprint(snapshot, strategy);
  if (snapshot.length < OPTIMIZER_DRAGON_COUNT) {
    return {
      contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
      strategy,
      optimal: false,
      status: 'unavailable',
      reason: 'insufficient-eligible-dragons',
      eligibleDragonCount: snapshot.length,
      requiredDragonCount: OPTIMIZER_DRAGON_COUNT,
      additionalDragonsNeeded: OPTIMIZER_DRAGON_COUNT - snapshot.length,
      rosterFingerprint,
      requestFingerprint,
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
  if (shouldCancel?.()) throw new RosterOptimizerCancelledError();
  return strategy === 'best-ten-overall'
    ? optimizeBestTen({
        candidates,
        snapshot,
        rosterFingerprint,
        requestFingerprint,
        candidateGenerationMs,
        totalStartedAt,
      })
    : optimizePrimaryBackup({
        candidates,
        snapshot,
        rosterFingerprint,
        requestFingerprint,
        candidateGenerationMs,
        totalStartedAt,
      });
}

async function optimizeBestTen({
  candidates,
  snapshot,
  rosterFingerprint,
  requestFingerprint,
  candidateGenerationMs,
  totalStartedAt,
}: OptimizationContext): Promise<BestTenOverallOptimizationResult> {
  const solverStartedAt = performance.now();
  const solver = await solveRosterOptimizerMip(candidates, snapshot);
  const solverMs = performance.now() - solverStartedAt;
  const formations = publicFormations(solver.selectedCandidates);
  const partition = dragonPartition(formations, snapshot);
  const usedRarityCounts = rarityCounts(partition.usedDragonIds, partition.rarityById);
  const unusedRarityCounts = rarityCounts(partition.unusedDragonIds, partition.rarityById);
  const tierDistribution = tierDistributionFor(formations);
  const collection: OptimizerCollectionSummary = {
    totalRating: solver.objective.totalRating,
    averageRating: solver.objective.totalRating / OPTIMIZER_FORMATION_COUNT,
    minimumRating: solver.objective.minimumRating,
    rarityCounts: usedRarityCounts,
    tierDistribution,
    totalRelationshipValue: solver.objective.totalRelationshipValue,
    totalActiveRelationships: solver.objective.totalActiveRelationships,
  };
  // This exact v1-shaped identity intentionally preserves the two published
  // v0.12.0 semantic solution hashes.
  const legacySolutionIdentity = {
    contractVersion: 1,
    rosterFingerprint,
    objective: solver.objective,
    formations: formationIdentity(formations),
    usedDragonIds: partition.usedDragonIds,
    unusedDragonIds: partition.unusedDragonIds,
  };
  const optimizerSolutionHash = stableHash(JSON.stringify(legacySolutionIdentity));
  const resultIdentity = {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    strategy: 'best-ten-overall' as const,
    requestFingerprint,
    optimizerSolutionHash,
  };
  return {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    strategy: 'best-ten-overall',
    optimal: true,
    rosterFingerprint,
    requestFingerprint,
    formations,
    collection,
    usedDragonIds: partition.usedDragonIds,
    unusedDragonIds: partition.unusedDragonIds,
    usedRarityCounts,
    unusedRarityCounts,
    objective: solver.objective,
    averageRating: collection.averageRating,
    minimumRating: collection.minimumRating,
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
    optimizerSolutionHash,
    optimizerResultHash: stableHash(JSON.stringify(resultIdentity)),
  };
}

async function optimizePrimaryBackup({
  candidates,
  snapshot,
  rosterFingerprint,
  requestFingerprint,
  candidateGenerationMs,
  totalStartedAt,
}: OptimizationContext): Promise<PrimaryBackupOptimizationResult> {
  const solverStartedAt = performance.now();
  const solver = await solvePrimaryBackupRosterOptimizerMip(candidates, snapshot);
  const solverMs = performance.now() - solverStartedAt;
  const rarityById = new Map(snapshot.map((dragon) => [dragon.dragonId, dragon.rarity]));
  const primaryFormations = publicFormations(solver.primaryCandidates, 'primary');
  const backupFormations = publicFormations(solver.backupCandidates, 'backup');
  const primary = waveResult('primary', primaryFormations, solver.objective.primary, rarityById);
  const backup = waveResult('backup', backupFormations, solver.objective.backup, rarityById);
  const formations = [...primaryFormations, ...backupFormations];
  const partition = dragonPartition(formations, snapshot);
  const unusedRarityCounts = rarityCounts(partition.unusedDragonIds, rarityById);
  const combinedRarityCounts = rarityCounts(partition.usedDragonIds, rarityById);
  const combined: OptimizerCollectionSummary = {
    totalRating: solver.objective.combinedTotalRating,
    averageRating: solver.objective.combinedTotalRating / OPTIMIZER_FORMATION_COUNT,
    minimumRating: Math.min(primary.minimumRating, backup.minimumRating),
    rarityCounts: combinedRarityCounts,
    tierDistribution: tierDistributionFor(formations),
    totalRelationshipValue: solver.objective.combinedRelationshipValue,
    totalActiveRelationships: solver.objective.combinedActiveRelationships,
  };
  const semanticIdentity = {
    strategy: 'primary-five-backup-five' as const,
    rosterFingerprint,
    primary: formationIdentity(primaryFormations),
    backup: formationIdentity(backupFormations),
    objective: solver.objective,
    unusedDragonIds: partition.unusedDragonIds,
  };
  const optimizerSolutionHash = stableHash(JSON.stringify(semanticIdentity));
  const resultIdentity = {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    strategy: 'primary-five-backup-five' as const,
    requestFingerprint,
    optimizerSolutionHash,
  };
  return {
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    strategy: 'primary-five-backup-five',
    optimal: true,
    rosterFingerprint,
    requestFingerprint,
    primary,
    backup,
    formations,
    usedDragonIds: partition.usedDragonIds,
    unusedDragonIds: partition.unusedDragonIds,
    unusedRarityCounts,
    combined,
    objective: solver.objective,
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
      phaseTimings: solver.phaseTimings,
    },
    optimizerSolutionHash,
    optimizerResultHash: stableHash(JSON.stringify(resultIdentity)),
  };
}

interface OptimizationContext {
  candidates: OptimizerFormationCandidate[];
  snapshot: OptimizerRosterDragon[];
  rosterFingerprint: string;
  requestFingerprint: string;
  candidateGenerationMs: number;
  totalStartedAt: number;
}

function publicFormations(
  candidates: OptimizerFormationCandidate[],
  wave?: OptimizerWave,
): OptimizedFormation[] {
  return [...candidates].sort(displayCandidateOrder).map((candidate, index) => {
    const publicCandidate = { ...candidate };
    delete (publicCandidate as Partial<OptimizerFormationCandidate>).dragonMask;
    return {
      ...publicCandidate,
      rank: index + 1,
      ...(wave ? { wave, waveRank: index + 1 } : {}),
    };
  });
}

function waveResult(
  kind: OptimizerWave,
  formations: OptimizedFormation[],
  objective: PrimaryBackupOptimizationResult['objective']['primary'],
  rarityById: ReadonlyMap<string, DragonRarity>,
): OptimizerWaveResult {
  const usedDragonIds = [...new Set(formations.flatMap((formation) => formation.dragonIds))]
    .sort();
  return {
    kind,
    label: kind === 'primary' ? 'Primary' : 'Backup',
    formations,
    usedDragonIds,
    rarityCounts: rarityCounts(usedDragonIds, rarityById),
    totalRating: objective.totalRating,
    averageRating: objective.totalRating / formations.length,
    minimumRating: objective.minimumRating,
    totalRelationshipValue: objective.totalRelationshipValue,
    totalActiveRelationships: objective.totalActiveRelationships,
    tierDistribution: tierDistributionFor(formations),
    objective,
  };
}

function dragonPartition(
  formations: OptimizedFormation[],
  snapshot: OptimizerRosterDragon[],
) {
  const usedDragonIds = [...new Set(formations.flatMap((formation) => formation.dragonIds))]
    .sort();
  const used = new Set(usedDragonIds);
  return {
    usedDragonIds,
    unusedDragonIds: snapshot
      .map((dragon) => dragon.dragonId)
      .filter((dragonId) => !used.has(dragonId))
      .sort(),
    rarityById: new Map(snapshot.map((dragon) => [dragon.dragonId, dragon.rarity])),
  };
}

function formationIdentity(formations: OptimizedFormation[]) {
  return formations.map((formation) => ({
    dragonIds: formation.dragonIds,
    arrangement: formation.arrangement,
    rating: formation.rating,
    stableCandidateKey: formation.stableCandidateKey,
  }));
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

function tierDistributionFor(formations: OptimizedFormation[]): TierDistribution {
  const distribution: TierDistribution = {
    Excellent: 0,
    Strong: 0,
    Solid: 0,
    Developing: 0,
    Weak: 0,
    Incomplete: 0,
  };
  formations.forEach((formation) => {
    distribution[formation.tier] += 1;
  });
  return distribution;
}

export function emptyTierDistribution(): Record<FormationRatingTier, number> {
  return tierDistributionFor([]);
}
