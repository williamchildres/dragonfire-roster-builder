import type { Dragon, OwnedDragon } from '../models/dragon';
import { reconcileHabitLevels } from './habitLevels';
import { isValidReignLevel, isValidStarRank } from './rosterStorage';

/** Transitions a roster entry to owned without discarding retained progress. */
export function markDragonOwned(dragon: Dragon, entry: OwnedDragon | undefined): OwnedDragon {
  const current = entry ?? {
    dragonId: dragon.id,
    owned: false,
    starRank: null,
    reignLevel: null,
    notes: '',
    habitLevels: {},
  };
  const starRank = current.starRank !== null && isValidStarRank(current.starRank)
    ? current.starRank
    : 1;
  const reignLevel = current.reignLevel !== null && isValidReignLevel(current.reignLevel)
    ? current.reignLevel
    : 1;

  return reconcileHabitLevels(dragon, {
    ...current,
    dragonId: dragon.id,
    owned: true,
    starRank,
    reignLevel,
    notes: typeof current.notes === 'string' ? current.notes : '',
  });
}

export interface AddMissingDragonsResult {
  roster: Record<string, OwnedDragon>;
  addedDragonIds: string[];
  restoredProgressionCount: number;
}

/** Adds every missing canonical dragon in one immutable roster transition. */
export function addMissingDragonsToRoster(
  dragons: readonly Dragon[],
  roster: Record<string, OwnedDragon>,
): AddMissingDragonsResult {
  const nextRoster = { ...roster };
  const addedDragonIds: string[] = [];
  let restoredProgressionCount = 0;

  for (const dragon of dragons) {
    const entry = roster[dragon.id];
    if (entry?.owned === true) continue;
    if (
      (entry?.starRank !== null && entry?.starRank !== undefined && isValidStarRank(entry.starRank)) ||
      (entry?.reignLevel !== null && entry?.reignLevel !== undefined && isValidReignLevel(entry.reignLevel))
    ) restoredProgressionCount += 1;
    nextRoster[dragon.id] = markDragonOwned(dragon, entry);
    addedDragonIds.push(dragon.id);
  }

  return { roster: nextRoster, addedDragonIds, restoredProgressionCount };
}
