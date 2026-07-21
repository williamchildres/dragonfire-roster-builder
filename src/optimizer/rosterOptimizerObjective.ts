import type { DragonRarity } from '../models/dragon';
import type {
  OptimizerFormationCandidate,
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
