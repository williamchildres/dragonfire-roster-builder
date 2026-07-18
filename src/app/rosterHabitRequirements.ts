import type { AbilityDefinition, OwnedDragon } from '../models/dragon';

export function lockedHabitRequirement(
  habit: AbilityDefinition,
  entry: Pick<OwnedDragon, 'starRank' | 'reignLevel'>,
): string {
  const unmetStarRank = habit.unlockStarRank !== null && habit.unlockStarRank > 0 &&
    (entry.starRank === null || entry.starRank < habit.unlockStarRank);
  const unmetDragonLevel = habit.minimumDragonLevel !== null && habit.minimumDragonLevel > 0 &&
    (entry.reignLevel === null || entry.reignLevel < habit.minimumDragonLevel);

  if (unmetStarRank && unmetDragonLevel) {
    return `Requires ${habit.unlockStarRank}★ and Dragon Level ${habit.minimumDragonLevel}`;
  }
  if (unmetStarRank) return `Unlocks at ${habit.unlockStarRank}★`;
  if (unmetDragonLevel) return `Unlocks at Dragon Level ${habit.minimumDragonLevel}`;
  return 'Progression requirement not met';
}
