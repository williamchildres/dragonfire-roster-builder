import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { BREEDS, RARITIES, TROOP_TYPES } from '../models/dragon';

describe('seeded dragon data integrity', () => {
  it('contains exactly 30 seeded dragons and keeps unsupported combat data unknown', () => {
    const combatDragonIds = new Set(['syrax', 'vhagar', 'caraxes', 'seasmoke', 'crimson', 'kalspire', 'malachite', 'venator', 'sheepstealer', 'vermax']);

    expect(dragons).toHaveLength(30);
    expect(new Set(dragons.map((dragon) => dragon.id))).toHaveLength(30);
    expect(new Set(dragons.map((dragon) => dragon.slug))).toHaveLength(30);
    expect(new Set(dragons.map((dragon) => dragon.name))).toHaveLength(30);

    for (const dragon of dragons) {
      expect(RARITIES).toContain(dragon.rarity);
      expect(BREEDS).toContain(dragon.breed);
      if (dragon.rosterSourceStatus === 'official-website') {
        expect(dragon.officialProfileUrl).toBe(`https://gotdragonfire.com/dragons/${dragon.slug}/`);
      } else {
        expect(dragon.officialProfileUrl).toBeNull();
      }

      if (combatDragonIds.has(dragon.id)) {
        expect(dragon.command).not.toBeNull();
        continue;
      }

      expect(dragon.dataStatus).toBe('official-metadata-only');
      expect(dragon.rosterSourceStatus).toBe('official-website');
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

    expect(newNames.sort()).toEqual(
      ['Arrax', 'Arulix', 'Dawnseeker', 'Nyrena', 'Sheepstealer', 'Vermax'].sort(),
    );
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

  it('stores Sheepstealer and Vermax as pending official-site in-game dragons', () => {
    const sheepstealer = dragons.find((dragon) => dragon.id === 'sheepstealer');
    const vermax = dragons.find((dragon) => dragon.id === 'vermax');

    expect(sheepstealer).toMatchObject({
      name: 'Sheepstealer',
      rarity: 'Legendary',
      breed: 'Hunter',
      officialProfileUrl: null,
      rosterSourceStatus: 'in-game-verified-pending-official-site',
    });
    expect(vermax).toMatchObject({
      name: 'Vermax',
      rarity: 'Epic',
      breed: 'Warrior',
      officialProfileUrl: null,
      rosterSourceStatus: 'in-game-verified-pending-official-site',
    });
  });
});
