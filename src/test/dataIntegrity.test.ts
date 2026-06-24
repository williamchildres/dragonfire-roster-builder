import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { BREEDS, RARITIES, TROOP_TYPES } from '../models/dragon';

describe('seeded dragon data integrity', () => {
  it('contains exactly the official metadata-only roster requested for launch', () => {
    expect(dragons).toHaveLength(28);
    expect(new Set(dragons.map((dragon) => dragon.id))).toHaveLength(28);
    expect(new Set(dragons.map((dragon) => dragon.slug))).toHaveLength(28);
    expect(new Set(dragons.map((dragon) => dragon.name))).toHaveLength(28);

    for (const dragon of dragons) {
      expect(RARITIES).toContain(dragon.rarity);
      expect(BREEDS).toContain(dragon.breed);
      expect(dragon.officialProfileUrl).toBe(`https://gotdragonfire.com/dragons/${dragon.slug}/`);
      expect(dragon.dataStatus).toBe('official-metadata-only');
      expect(dragon.command).toBeNull();
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
});
