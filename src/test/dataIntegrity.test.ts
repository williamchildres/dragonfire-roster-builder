import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { BREEDS, RARITIES, TROOP_TYPES } from '../models/dragon';

describe('seeded dragon data integrity', () => {
  it('contains exactly 28 seeded dragons and keeps non-Malachite combat data unknown', () => {
    expect(dragons).toHaveLength(28);
    expect(new Set(dragons.map((dragon) => dragon.id))).toHaveLength(28);
    expect(new Set(dragons.map((dragon) => dragon.slug))).toHaveLength(28);
    expect(new Set(dragons.map((dragon) => dragon.name))).toHaveLength(28);

    for (const dragon of dragons) {
      expect(RARITIES).toContain(dragon.rarity);
      expect(BREEDS).toContain(dragon.breed);
      expect(dragon.officialProfileUrl).toBe(`https://gotdragonfire.com/dragons/${dragon.slug}/`);

      if (dragon.id === 'malachite') {
        continue;
      }

      expect(dragon.dataStatus).toBe('official-metadata-only');
      expect(dragon.command).toBeNull();
      expect(dragon.trait).toBeNull();
      expect(dragon.habits).toEqual([]);
      expect(dragon.tags).toEqual([]);
      expect(Object.values(dragon.stats).every((value) => value === null)).toBe(true);
      expect(TROOP_TYPES.every((troop) => dragon.affinities[troop] === 'unknown')).toBe(true);
    }
  });

  it('marks only the requested new dragons as new', () => {
    const newNames = dragons.filter((dragon) => dragon.isNew).map((dragon) => dragon.name);

    expect(newNames.sort()).toEqual(['Arrax', 'Arulix', 'Dawnseeker', 'Nyrena'].sort());
  });

  it('stores Malachite as a partially verified dragon without canonical base stats', () => {
    const malachite = dragons.find((dragon) => dragon.id === 'malachite');

    expect(malachite).toBeDefined();
    expect(malachite!.name).toBe('Malachite');
    expect(malachite!.rarity).toBe('Legendary');
    expect(malachite!.breed).toBe('Sentinel');
    expect(malachite!.command?.name).toBe("Warden's Rally");
    expect(malachite!.trait?.name).toBe("Sentinel's Presence");
    expect(malachite!.habits).toHaveLength(5);
    expect(Object.values(malachite!.stats).every((value) => value === null)).toBe(true);
  });
});
