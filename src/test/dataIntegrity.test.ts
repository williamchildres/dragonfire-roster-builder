import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { BREEDS, RARITIES, TROOP_TYPES } from '../models/dragon';

describe('seeded dragon data integrity', () => {
  it('contains exactly 31 seeded dragons and keeps unsupported combat data unknown', () => {
    const combatDragonIds = new Set(['syrax', 'vhagar', 'caraxes', 'seasmoke', 'solstryker', 'crimson', 'kalspire', 'malachite', 'venator', 'daemoros', 'vaeldra', 'sheepstealer', 'vermax', 'feskar', 'rhysarion', 'shadowsong', 'tashix', 'velar', 'zivern', 'antares', 'shimmer', 'jagadrix', 'arulix', 'arrax', 'tessarion']);

    expect(dragons).toHaveLength(31);
    expect(new Set(dragons.map((dragon) => dragon.id))).toHaveLength(31);
    expect(new Set(dragons.map((dragon) => dragon.slug))).toHaveLength(31);
    expect(new Set(dragons.map((dragon) => dragon.name))).toHaveLength(31);
    expect(dragons.filter((dragon) => dragon.rarity === 'Epic')).toHaveLength(10);

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
      ['Arrax', 'Arulix', 'Daemoros', 'Dawnseeker', 'Feskar', 'Nyrena', 'Rhysarion', 'Shadowsong', 'Sheepstealer', 'Tessarion', 'Vaeldra', 'Vermax'].sort(),
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

  it('stores pending official-site in-game dragons', () => {
    const sheepstealer = dragons.find((dragon) => dragon.id === 'sheepstealer');
    const vermax = dragons.find((dragon) => dragon.id === 'vermax');
    const daemoros = dragons.find((dragon) => dragon.id === 'daemoros');
    const vaeldra = dragons.find((dragon) => dragon.id === 'vaeldra');

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
    expect(daemoros).toMatchObject({
      name: 'Daemoros',
      rarity: 'Epic',
      breed: 'Warrior',
      officialProfileUrl: null,
      rosterSourceStatus: 'in-game-verified-pending-official-site',
    });
    expect(vaeldra).toMatchObject({
      name: 'Vaeldra',
      rarity: 'Epic',
      breed: 'Warrior',
      officialProfileUrl: null,
      rosterSourceStatus: 'in-game-verified-pending-official-site',
    });
  });

  it('stores Tessarion as a screenshot-verified Epic Champion without account-specific canonical stats', () => {
    const tessarion = dragons.find((dragon) => dragon.id === 'tessarion');
    expect(tessarion).toBeDefined();
    expect(tessarion).toMatchObject({
      name: 'Tessarion',
      rarity: 'Epic',
      breed: 'Champion',
      officialProfileUrl: null,
      rosterSourceStatus: 'in-game-verified-pending-official-site',
      dataStatus: 'community-verified',
    });

    expect(tessarion!.command?.id).toBe('tessarion-cobalt-flame');
    expect(tessarion!.trait?.id).toBe('tessarion-champions-brilliance');
    expect(tessarion!.habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);

    const abilities = ([tessarion!.command, tessarion!.trait, ...tessarion!.habits] as Array<AbilityDefinition | null>).filter(
      (ability): ability is AbilityDefinition => Boolean(ability),
    );
    expect(abilities).toHaveLength(7);
    expect(abilities.every((ability) => ability.id && ability.rawDescription?.trim())).toBe(true);
    expect(abilities.every((ability) => ability.verification.status === 'screenshot-verified')).toBe(true);
    expect(abilities.every((ability) => ability.evidenceIds.length > 0)).toBe(true);

    expect(tessarion!.affinities).toMatchObject({
      Spearmen: 'positive',
      Cavalry: 'positive',
      Siege: 'positive',
      Archers: 'unknown',
      Shieldbearers: 'unknown',
    });
    expect(Object.values(tessarion!.affinities)).not.toContain('negative');
    expect(Object.values(tessarion!.stats).every((value) => value === null)).toBe(true);
    expect(JSON.stringify(tessarion)).not.toMatch(/troopCapacity|dragonPower|playerLevel|shards|starProgress/);
  });
});
