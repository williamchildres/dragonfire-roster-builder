import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { TROOP_TYPES } from '../models/dragon';
import { simpleSynergyProfiles } from '../synergy/profiles';

const canonicalAffinities = {
  syrax: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'positive', Siege: 'negative' },
  vhagar: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'positive', Spearmen: 'neutral', Siege: 'positive' },
  caraxes: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  seasmoke: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'negative' },
  crimson: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'positive', Siege: 'positive' },
  kalspire: { Cavalry: 'positive', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  malachite: { Cavalry: 'positive', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'negative' },
  venator: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  daemoros: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'neutral' },
  feskar: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'negative' },
  rhysarion: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'positive', Siege: 'positive' },
  shadowsong: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  tashix: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'negative' },
  vaeldra: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  velar: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  zivern: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'positive' },
  tessarion: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'positive' },
  sheepstealer: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'neutral' },
  vermax: { Cavalry: 'positive', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  antares: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'negative' },
  arrax: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'positive', Spearmen: 'neutral', Siege: 'neutral' },
  arulix: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  bevlorin: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  dawnseeker: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'negative' },
  jagadrix: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  nyrena: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  shadowrend: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  shimmer: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  solstryker: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'neutral' },
  thunderstrike: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  vesper: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'negative' },
} as const;

describe('canonical dragon affinities', () => {
  it('stores the exact complete controller-confirmed map and leaves other dragon affinity maps unchanged', () => {
    const targetIds = new Set(Object.keys(canonicalAffinities));
    expect(targetIds.size).toBe(31);

    for (const [dragonId, expected] of Object.entries(canonicalAffinities)) {
      const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
      expect(Object.keys(dragon.affinities).sort()).toEqual([...TROOP_TYPES].sort());
      expect(dragon.affinities).toEqual(expected);
      expect(Object.values(dragon.affinities)).not.toContain('unknown');
      expect(dragon.fieldVerification.affinities?.reviewedManually).toBe(true);
    }

    expect(dragons.every((dragon) => (Object.values(dragon.affinities) as string[]).every((value) => value !== 'unknown'))).toBe(true);
  });

  it('removes obsolete affinity caveats while preserving independent canonical note content', () => {
    const targetIds = new Set(Object.keys(canonicalAffinities));
    const obsoleteAffinityLanguage = /affinit(?:y|ies)(?: icons?)?.*(?:unknown|unverified|not text-verified|partially verified)/i;

    for (const dragon of dragons.filter((candidate) => targetIds.has(candidate.id))) {
      expect(dragon.notes ?? '').not.toMatch(obsoleteAffinityLanguage);
    }

    expect(dragons.find((dragon) => dragon.id === 'antares')?.notes).toBeNull();
    expect(dragons.find((dragon) => dragon.id === 'jagadrix')?.notes).toBe('Adult life stage was shown.');
    expect(dragons.find((dragon) => dragon.id === 'bevlorin')?.notes).toBe(
      "Nature's Reckoning's incorrect in-game Fire Damage Received heading is retained as an evidence discrepancy; the verified body and summary establish Fire Damage Dealt suppression.",
    );
    expect(dragons.find((dragon) => dragon.id === 'shadowrend')?.notes).toBe(
      'Fueled by Darkness recipient selection and the exact meaning of Advantage +10% remain unresolved.',
    );
    expect(dragons.find((dragon) => dragon.id === 'thunderstrike')?.notes).toBe(
      "Armor Break's opposing-enemy selection remains unresolved enemy-targeting language.",
    );

    const whelpNote = 'The supplied screen shows the Whelp life stage. Account progression and combat stats are not canonical.';
    for (const dragonId of ['vesper', 'nyrena', 'dawnseeker']) {
      expect(dragons.find((dragon) => dragon.id === dragonId)?.notes).toBe(whelpNote);
    }
  });

  it('keeps the corrected Trait unlocks and source wording without changing their curated relationships', () => {
    for (const dragonId of ['dawnseeker', 'nyrena', 'vesper']) {
      const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
      expect(dragon.trait).toMatchObject({ unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard' });
      const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === dragonId)!;
      const traitSignals = [...profile.supports, ...profile.positionClaims].filter((signal) => signal.abilityId === dragon.trait?.id);
      expect(traitSignals).toHaveLength(2);
      expect(traitSignals.every((signal) => signal.unlock?.minimumStarRank === 1 && signal.unlock?.minimumDragonLevel === 16)).toBe(true);
    }

    const venator = dragons.find((dragon) => dragon.id === 'venator')!;
    const armorBreak = venator.habits.find((habit) => habit.id === 'venator-armor-break')!;
    expect(armorBreak.rawDescription).toContain('opposing Enemy');
    expect(armorBreak.rawDescription).not.toContain('same-lane');
    expect(simpleSynergyProfiles.find((profile) => profile.dragonId === 'venator')?.supports.find((signal) => signal.id === 'venator-armor-break-physical')).toMatchObject({ friendlyScope: 'formation', tag: 'damage:physical' });

    const vermax = dragons.find((dragon) => dragon.id === 'vermax')!;
    expect(vermax.habits.find((habit) => habit.id === 'vermax-unyielding-resolve')?.rawDescription).toContain('Weakened');
    expect(vermax.habits.find((habit) => habit.id === 'vermax-unyielding-resolve')?.rawDescription).not.toContain('Weakend');
    expect(dragons.find((dragon) => dragon.id === 'kalspire')?.command?.rawDescription).toContain("increased by Kalspire's Strength");
  });
});
