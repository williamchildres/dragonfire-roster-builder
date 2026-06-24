import type { Dragon, DragonBreed, DragonRarity, OwnedDragon, VerificationStatus } from '../models/dragon';

export type OwnedFilter = 'all' | 'owned' | 'unowned';
export type DragonSort = 'name' | 'rarity' | 'breed' | 'starRank';

export interface DragonFilters {
  search: string;
  rarity: DragonRarity | 'all';
  breed: DragonBreed | 'all';
  owned: OwnedFilter;
  status: VerificationStatus | 'all';
}

const rarityWeight: Record<DragonRarity, number> = {
  Legendary: 0,
  Epic: 1,
  Rare: 2,
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export const defaultFilters: DragonFilters = {
  search: '',
  rarity: 'all',
  breed: 'all',
  owned: 'all',
  status: 'all',
};

export function filterDragons(
  dragons: Dragon[],
  roster: Record<string, OwnedDragon>,
  filters: DragonFilters,
): Dragon[] {
  const search = normalize(filters.search);

  return dragons.filter((dragon) => {
    const entry = roster[dragon.id];
    const owned = entry?.owned === true;

    return (
      (search === '' || normalize(dragon.name).includes(search)) &&
      (filters.rarity === 'all' || dragon.rarity === filters.rarity) &&
      (filters.breed === 'all' || dragon.breed === filters.breed) &&
      (filters.status === 'all' || dragon.dataStatus === filters.status) &&
      (filters.owned === 'all' ||
        (filters.owned === 'owned' && owned) ||
        (filters.owned === 'unowned' && !owned))
    );
  });
}

export function sortDragons(
  dragons: Dragon[],
  roster: Record<string, OwnedDragon>,
  sortBy: DragonSort,
): Dragon[] {
  return [...dragons].sort((a, b) => {
    if (sortBy === 'rarity') {
      return rarityWeight[a.rarity] - rarityWeight[b.rarity] || a.name.localeCompare(b.name);
    }

    if (sortBy === 'breed') {
      return a.breed.localeCompare(b.breed) || a.name.localeCompare(b.name);
    }

    if (sortBy === 'starRank') {
      const rankA = roster[a.id]?.starRank ?? -1;
      const rankB = roster[b.id]?.starRank ?? -1;
      return rankB - rankA || a.name.localeCompare(b.name);
    }

    return a.name.localeCompare(b.name);
  });
}

export function countBy<T extends string>(items: Dragon[], key: (dragon: Dragon) => T): Record<T, number> {
  return items.reduce<Record<T, number>>(
    (counts, dragon) => {
      const value = key(dragon);
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}
