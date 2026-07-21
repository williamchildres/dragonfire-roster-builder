import type { DragonRarity } from '../models/dragon';
import type {
  OptimizerFormationCandidate,
  PrimaryBackupOptimizerObjective,
  RosterOptimizerObjective,
  RosterRarityPriority,
} from './rosterOptimizerTypes';

export function compareRarityPriority(
  left: RosterRarityPriority,
  right: RosterRarityPriority,
): number {
  return (
    left.legendaryCount - right.legendaryCount ||
    left.epicCount - right.epicCount
  );
}

/**
 * Positive means `left` is better. Rarity is strictly lexicographic, followed
 * by the complete documented allocation objective. The final canonical key is
 * minimized so exact ties always resolve to the same solution.
 */
export function compareRosterOptimizerObjectives(
  left: RosterOptimizerObjective,
  right: RosterOptimizerObjective,
): number {
  return (
    compareRarityPriority(left.rarityPriority, right.rarityPriority) ||
    left.totalRating - right.totalRating ||
    left.minimumRating - right.minimumRating ||
    compareNumberVectors(left.ascendingRatingVector, right.ascendingRatingVector) ||
    left.totalRelationshipValue - right.totalRelationshipValue ||
    left.totalActiveRelationships - right.totalActiveRelationships ||
    right.stableSolutionKey.localeCompare(left.stableSolutionKey)
  );
}

/**
 * Positive means `left` is better. Primary rarity and quality dominate every
 * Backup value. Stable keys are intentionally deferred until both waves'
 * numeric objectives have been compared.
 */
export function comparePrimaryBackupOptimizerObjectives(
  left: PrimaryBackupOptimizerObjective,
  right: PrimaryBackupOptimizerObjective,
): number {
  return (
    compareRarityPriority(left.primary.rarityPriority, right.primary.rarityPriority) ||
    compareWaveQuality(left.primary, right.primary) ||
    compareRarityPriority(left.backup.rarityPriority, right.backup.rarityPriority) ||
    compareWaveQuality(left.backup, right.backup) ||
    right.primary.stableSolutionKey.localeCompare(left.primary.stableSolutionKey) ||
    right.backup.stableSolutionKey.localeCompare(left.backup.stableSolutionKey) ||
    right.stableSolutionKey.localeCompare(left.stableSolutionKey)
  );
}

export function primaryBackupObjectiveForCandidates(
  primaryCandidates: OptimizerFormationCandidate[],
  backupCandidates: OptimizerFormationCandidate[],
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): PrimaryBackupOptimizerObjective {
  const primary = objectiveForCandidates(primaryCandidates, rarityByDragonId);
  const backup = objectiveForCandidates(backupCandidates, rarityByDragonId);
  return {
    strategy: 'primary-five-backup-five',
    primary,
    backup,
    combinedTotalRating: primary.totalRating + backup.totalRating,
    combinedRelationshipValue:
      primary.totalRelationshipValue + backup.totalRelationshipValue,
    combinedActiveRelationships:
      primary.totalActiveRelationships + backup.totalActiveRelationships,
    stableSolutionKey: `primary:${primary.stableSolutionKey}||backup:${backup.stableSolutionKey}`,
  };
}

export function objectiveForCandidates(
  candidates: OptimizerFormationCandidate[],
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): RosterOptimizerObjective {
  const ratings = candidates.map((candidate) => candidate.rating).sort((a, b) => a - b);
  const dragonIds = [...new Set(candidates.flatMap((candidate) => candidate.dragonIds))];
  const rarityPriority = rarityPriorityForDragonIds(dragonIds, rarityByDragonId);
  return {
    rarityPriority,
    totalRating: ratings.reduce((total, rating) => total + rating, 0),
    minimumRating: ratings[0] ?? 0,
    ascendingRatingVector: ratings,
    totalRelationshipValue: candidates.reduce(
      (total, candidate) => total + candidate.activeRelationshipValue,
      0,
    ),
    totalActiveRelationships: candidates.reduce(
      (total, candidate) => total + candidate.activeRelationshipCount,
      0,
    ),
    stableSolutionKey: candidates
      .map((candidate) => candidate.stableCandidateKey)
      .sort()
      .join('||'),
  };
}

export function rarityPriorityForDragonIds(
  dragonIds: Iterable<string>,
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): RosterRarityPriority {
  const priority: RosterRarityPriority = {
    legendaryCount: 0,
    epicCount: 0,
    rareCount: 0,
  };
  for (const dragonId of dragonIds) {
    const rarity = rarityByDragonId.get(dragonId);
    if (rarity === 'Legendary') priority.legendaryCount += 1;
    if (rarity === 'Epic') priority.epicCount += 1;
    if (rarity === 'Rare') priority.rareCount += 1;
  }
  return priority;
}

export function compareNumberVectors(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function compareWaveQuality(
  left: RosterOptimizerObjective,
  right: RosterOptimizerObjective,
): number {
  return (
    left.totalRating - right.totalRating ||
    left.minimumRating - right.minimumRating ||
    compareNumberVectors(left.ascendingRatingVector, right.ascendingRatingVector) ||
    left.totalRelationshipValue - right.totalRelationshipValue ||
    left.totalActiveRelationships - right.totalActiveRelationships
  );
}
