import type { Dragon, DragonBreed, DragonRarity, OwnedDragon } from '../models/dragon';
import { isHabitUnlocked } from '../services/habitLevels';

export type RosterDetailsFilter = 'all' | 'complete' | 'missing' | 'has-notes' | 'no-notes';
export type RosterWorkspaceSort = 'name' | 'rarity' | 'star-rank' | 'dragon-level';

export interface RosterWorkspaceFilters {
  search: string;
  rarity: DragonRarity | 'all';
  breed: DragonBreed | 'all';
  details: RosterDetailsFilter;
}

export interface RosterSelectionRequest {
  dragonId: string;
  requestId: number;
}

export const defaultRosterWorkspaceFilters: RosterWorkspaceFilters = {
  search: '',
  rarity: 'all',
  breed: 'all',
  details: 'all',
};

const rarityWeight: Record<DragonRarity, number> = {
  Legendary: 0,
  Epic: 1,
  Rare: 2,
};

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase();

export function applicableHabitCount(dragon: Dragon): number {
  return dragon.habits.length;
}

export function unlockedHabitCount(dragon: Dragon, entry: OwnedDragon | undefined): number {
  if (!entry) return 0;
  return dragon.habits.filter((habit) => isHabitUnlocked(habit, entry)).length;
}

export function hasAllProgression(entry: OwnedDragon | undefined): boolean {
  return (
    entry?.starRank !== null &&
    entry?.starRank !== undefined &&
    entry.reignLevel !== null &&
    entry.reignLevel !== undefined
  );
}

export function hasRosterNotes(entry: OwnedDragon | undefined): boolean {
  return (entry?.notes.trim().length ?? 0) > 0;
}

export function filterAndSortRosterDragons(
  allDragons: readonly Dragon[],
  roster: Record<string, OwnedDragon>,
  filters: RosterWorkspaceFilters,
  sortBy: RosterWorkspaceSort,
): Dragon[] {
  const search = normalizeSearch(filters.search);
  const visible = allDragons.filter((dragon) => {
    const entry = roster[dragon.id];
    if (entry?.owned !== true) return false;
    if (search && !normalizeSearch(dragon.name).includes(search)) return false;
    if (filters.rarity !== 'all' && dragon.rarity !== filters.rarity) return false;
    if (filters.breed !== 'all' && dragon.breed !== filters.breed) return false;

    const complete = hasAllProgression(entry);
    const notes = hasRosterNotes(entry);
    if (filters.details === 'complete' && !complete) return false;
    if (filters.details === 'missing' && complete) return false;
    if (filters.details === 'has-notes' && !notes) return false;
    if (filters.details === 'no-notes' && notes) return false;
    return true;
  });

  return visible
    .map((dragon, index) => ({ dragon, index }))
    .sort((left, right) => {
      const a = left.dragon;
      const b = right.dragon;
      let comparison = 0;

      if (sortBy === 'rarity') {
        comparison = rarityWeight[a.rarity] - rarityWeight[b.rarity];
      } else if (sortBy === 'star-rank') {
        comparison = compareNullableProgression(roster[a.id]?.starRank, roster[b.id]?.starRank);
      } else if (sortBy === 'dragon-level') {
        comparison = compareNullableProgression(roster[a.id]?.reignLevel, roster[b.id]?.reignLevel);
      }

      return comparison || compareDragonNames(a, b) || left.index - right.index;
    })
    .map(({ dragon }) => dragon);
}

export function filtersRevealingDragon(
  filters: RosterWorkspaceFilters,
  dragon: Dragon,
  entry: OwnedDragon | undefined,
): RosterWorkspaceFilters {
  const search = normalizeSearch(filters.search);
  const complete = hasAllProgression(entry);
  const notes = hasRosterNotes(entry);
  const detailsMatch =
    filters.details === 'all' ||
    (filters.details === 'complete' && complete) ||
    (filters.details === 'missing' && !complete) ||
    (filters.details === 'has-notes' && notes) ||
    (filters.details === 'no-notes' && !notes);

  return {
    search: search && !normalizeSearch(dragon.name).includes(search) ? '' : filters.search,
    rarity: filters.rarity !== 'all' && filters.rarity !== dragon.rarity ? 'all' : filters.rarity,
    breed: filters.breed !== 'all' && filters.breed !== dragon.breed ? 'all' : filters.breed,
    details: detailsMatch ? filters.details : 'all',
  };
}

export function clearConsumedSelectionRequest(
  current: RosterSelectionRequest | null,
  consumedRequestId: number,
): RosterSelectionRequest | null {
  return current?.requestId === consumedRequestId ? null : current;
}

export function nextSelectionAfterRemoval(visibleIds: readonly string[], removedId: string): string | null {
  const removedIndex = visibleIds.indexOf(removedId);
  if (removedIndex < 0) return visibleIds[0] ?? null;
  return visibleIds[removedIndex + 1] ?? visibleIds[removedIndex - 1] ?? null;
}

export function filtersAreActive(filters: RosterWorkspaceFilters): boolean {
  return (
    normalizeSearch(filters.search) !== '' ||
    filters.rarity !== 'all' ||
    filters.breed !== 'all' ||
    filters.details !== 'all'
  );
}

function compareNullableProgression(left: number | null | undefined, right: number | null | undefined): number {
  if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1;
  if (right === null || right === undefined) return -1;
  return right - left;
}

function compareDragonNames(left: Dragon, right: Dragon): number {
  return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }) || left.id.localeCompare(right.id, 'en');
}
