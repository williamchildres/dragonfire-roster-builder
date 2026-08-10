import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { estimateDragonPower } from '../power/estimatedDragonPower';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { addMissingDragonsToRoster } from '../services/rosterOwnership';
import { defaultFilters, filterDragons } from '../services/rosterFilters';
import { normalizeRoster } from '../services/rosterStorage';
import { createFormationShareHash, parseSharedFormation } from '../services/teamShare';

const sunfyre = dragons.find((dragon) => dragon.id === 'sunfyre')!;
const tairax = dragons.find((dragon) => dragon.id === 'tairax')!;
const abilities = (dragon: typeof sunfyre) => [dragon.command, dragon.trait, ...dragon.habits];
const signals = (dragonId: string) => {
  const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === dragonId)!;
  return [...profile.outputs, ...profile.supports, ...profile.benefitsFrom];
};

describe('Sunfyre and Tairax canonical data', () => {
  it('adds the exact canonical identities, rarity totals, affinities, and null private stats', () => {
    expect(dragons).toHaveLength(34);
    expect(dragons.filter((dragon) => dragon.rarity === 'Legendary')).toHaveLength(11);
    expect(dragons.filter((dragon) => dragon.rarity === 'Epic')).toHaveLength(11);
    expect(dragons.filter((dragon) => dragon.rarity === 'Rare')).toHaveLength(12);
    expect(sunfyre).toMatchObject({ name: 'Sunfyre', rarity: 'Legendary', breed: 'Sentinel', firstObservedInGame: '2026-07-22', officialProfileUrl: null, isNew: true });
    expect(tairax).toMatchObject({ name: 'Tairax', rarity: 'Epic', breed: 'Hunter', firstObservedInGame: '2026-07-22', officialProfileUrl: null, isNew: true });
    expect(sunfyre.affinities).toEqual({ Cavalry: 'positive', Shieldbearers: 'unknown', Archers: 'unknown', Spearmen: 'positive', Siege: 'unknown' });
    expect(tairax.affinities).toEqual({ Cavalry: 'positive', Shieldbearers: 'positive', Archers: 'unknown', Spearmen: 'unknown', Siege: 'positive' });
    expect(Object.values(sunfyre.stats).every((value) => value === null)).toBe(true);
    expect(Object.values(tairax.stats).every((value) => value === null)).toBe(true);
    expect(JSON.stringify([sunfyre.stats, tairax.stats])).not.toMatch(/111\.7|154\.3|142\.3|123\.5|110\.1|69\.1|122\.9|90\.0|4192|17620|13540/);
  });

  it('stores all 14 screenshot-backed abilities once with exact unlocks', () => {
    const expected = [
      ['sunfyre-golden-wrath', 'command', null, null, null],
      ['sunfyre-sentinels-wit', 'trait', 1, 16, 'vanguard'],
      ['sunfyre-radiant-majesty', 'habit', 2, null, null],
      ['sunfyre-extinguish', 'habit', 4, null, null],
      ['sunfyre-the-kings-ire', 'habit', 6, null, null],
      ['sunfyre-unbroken-splendor', 'habit', 8, null, null],
      ['sunfyre-adaptive-glory', 'habit', 10, null, null],
      ['tairax-burning-ward', 'command', null, null, null],
      ['tairax-hunters-wrath', 'trait', 1, 16, 'vanguard'],
      ['tairax-whisper-of-ash', 'habit', 2, null, null],
      ['tairax-sunder', 'habit', 4, null, null],
      ['tairax-gleamstrike', 'habit', 6, null, null],
      ['tairax-gift-of-fire', 'habit', 8, null, null],
      ['tairax-moonlit-hunt', 'habit', 10, null, null],
    ] as const;
    const actual = [...abilities(sunfyre), ...abilities(tairax)];
    expect(actual).toHaveLength(14);
    expect(new Set(actual.map((ability) => ability.id))).toHaveLength(14);
    for (const [id, kind, unlockStarRank, minimumDragonLevel, positionRequirement] of expected) {
      expect(actual.filter((ability) => ability.id === id)).toHaveLength(1);
      expect(actual.find((ability) => ability.id === id)).toMatchObject({ kind, unlockStarRank, minimumDragonLevel, positionRequirement });
    }
    expect(dragons.flatMap((dragon) => [dragon.command, dragon.trait, ...dragon.habits])).toHaveLength(238);
  });

  it('preserves every progression and rounded-summary discrepancy from the screenshots', () => {
    expect(sunfyre.habits.find((habit) => habit.id === 'sunfyre-radiant-majesty')?.rawDescription).toContain('+5%, +6%, +7%, +8.5%, +10%');
    expect(sunfyre.habits.find((habit) => habit.id === 'sunfyre-extinguish')?.rawDescription).toMatch(/summary displays -13%;.*-13\.5%, -16\.2%, -18\.9%, -22\.95%, -27%/s);
    expect(sunfyre.habits.find((habit) => habit.id === 'sunfyre-unbroken-splendor')?.rawDescription).toMatch(/summary displays -7%.*-7\.5%, -9%, -10\.5%, -12\.75%, -15%/s);
    expect(sunfyre.habits.find((habit) => habit.id === 'sunfyre-adaptive-glory')?.rawDescription).toMatch(/30%, 39%, 48%, 60%, 75%.*12%, 15\.6%, 19\.2%, 24%, 30%.*-12%, -15\.6%, -19\.2%, -24%, -30%/s);
    expect(tairax.habits.find((habit) => habit.id === 'tairax-whisper-of-ash')?.rawDescription).toContain('16%, 19.2%, 22.4%, 27.2%, 32%');
    expect(tairax.habits.find((habit) => habit.id === 'tairax-gleamstrike')?.rawDescription).toMatch(/summary displays a 38%.*37\.5%, 40%, 42\.5%, 46\.25%, 50%/s);
    expect(tairax.habits.find((habit) => habit.id === 'tairax-gift-of-fire')?.rawDescription).toMatch(/summary displays an 18%.*17\.5%, 21%, 24\.5%, 29\.75%, 35%/s);
    expect(tairax.habits.find((habit) => habit.id === 'tairax-moonlit-hunt')?.rawDescription).toContain('340, 790, 1400, 2100, 3100');
  });

  it('records screenshot verification metadata and evidence without committing image paths', () => {
    const records = evidenceSources.filter((source) => source.id.startsWith('sunfyre-') || source.id.startsWith('tairax-'));
    expect(records).toHaveLength(21);
    expect(records.every((source) => source.type === 'in-game-screenshot' && source.capturedAt === '2026-07-22' && source.gameVersion === null && source.reviewedManually === true && source.url === null)).toBe(true);
    expect([...abilities(sunfyre), ...abilities(tairax)].every((ability) => ability.verification.status === 'screenshot-verified' && ability.verification.reviewedManually && ability.verification.gameVersion === null)).toBe(true);
    expect(JSON.stringify(records)).not.toMatch(/[A-Z]:\\|Pictures\\DragonFire/i);
  });

  it('adds exactly the requested 15 curated signals and 14 audit dispositions', () => {
    expect(simpleSynergyProfiles).toHaveLength(34);
    expect(simpleSynergyProfiles.flatMap((profile) => [...profile.outputs, ...profile.supports, ...profile.benefitsFrom])).toHaveLength(256);
    expect(signals('sunfyre')).toHaveLength(6);
    expect(signals('tairax')).toHaveLength(9);
    expect(simpleSynergyAbilityReviews).toHaveLength(238);
    expect(simpleSynergyAbilityReviews.filter((review) => ['sunfyre', 'tairax'].includes(review.dragonId))).toHaveLength(14);
    expect(signals('tairax').filter((signal) => signal.tag === 'status:stagger')).toHaveLength(1);
    expect(signals('tairax').filter((signal) => signal.tag === 'status:control')).toHaveLength(1);
    expect(signals('tairax').some((signal) => signal.tag === 'status:vulnerable')).toBe(false);
  });

  it('keeps exact Estimated Power observations and model identities unchanged', () => {
    expect(estimateDragonPower({ rarity: 'Legendary', starRank: 2, dragonLevel: 25 })).toMatchObject({ power: 17620, confidence: 'observed' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 2, dragonLevel: 25 })).toMatchObject({ power: 13540, confidence: 'observed' });
    expect(ESTIMATED_POWER_OBSERVATION_HASH).toBe('fnv1a64:26bfe615f0d9bdd5');
    expect(ESTIMATED_POWER_MODEL_HASH).toBe('fnv1a64:efa6081babb4e520');
    expect(ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT).toBe('fnv1a64:1acab49e4408602b');
  });
});

describe('Sunfyre and Tairax roster and relationship behavior', () => {
  it('reconciles existing rosters as unowned/null and Add All starts both at Star 1 / Level 1', () => {
    const legacy = dragons.filter((dragon) => !['sunfyre', 'tairax'].includes(dragon.id)).map((dragon, index) => ({
      dragonId: dragon.id,
      owned: index === 0,
      starRank: index === 0 ? 7 : null,
      reignLevel: index === 0 ? 12 : null,
      notes: index === 0 ? 'preserved' : '',
      habitLevels: {},
    }));
    const reconciled = normalizeRoster(dragons, legacy);
    expect(reconciled.sunfyre).toMatchObject({ owned: false, starRank: null, reignLevel: null, habitLevels: {} });
    expect(reconciled.tairax).toMatchObject({ owned: false, starRank: null, reignLevel: null, habitLevels: {} });
    expect(Object.values(reconciled).find((entry) => entry.notes === 'preserved')).toMatchObject({ owned: true, starRank: 7, reignLevel: 12 });
    const added = addMissingDragonsToRoster(dragons, reconciled);
    expect(added.roster.sunfyre).toMatchObject({ owned: true, starRank: 1, reignLevel: 1, habitLevels: {} });
    expect(added.roster.tairax).toMatchObject({ owned: true, starRank: 1, reignLevel: 1, habitLevels: {} });
  });

  it('finds both in roster filters and accepts both IDs in formation shares', () => {
    const roster = normalizeRoster(dragons);
    expect(filterDragons(dragons, roster, { ...defaultFilters, search: 'sunfyre' }).map((dragon) => dragon.id)).toEqual(['sunfyre']);
    expect(filterDragons(dragons, roster, { ...defaultFilters, search: 'tairax' }).map((dragon) => dragon.id)).toEqual(['tairax']);
    const formation = { 'left-flank': 'sunfyre', vanguard: 'tairax', 'right-flank': 'syrax' } as const;
    expect(parseSharedFormation(createFormationShareHash(formation), dragons)).toEqual(formation);
  });

  it('activates the directional traits only from Vanguard at Level 16+', () => {
    const progression = {
      sunfyre: { starRank: 2, dragonLevel: 25 },
      tairax: { starRank: 2, dragonLevel: 25 },
      syrax: { starRank: 10, dragonLevel: 16 },
      thunderstrike: { starRank: 10, dragonLevel: 16 },
    };
    const sunfyreResults = evaluateFormation({ formation: { 'left-flank': 'syrax', vanguard: 'sunfyre', 'right-flank': 'tairax' }, progression, profiles: simpleSynergyProfiles }).results;
    expect(sunfyreResults.some((result) => result.kind === 'amplifier-output' && result.dragonIds.join('>') === 'sunfyre>syrax' && result.tag === 'stat:instinct')).toBe(true);
    const sunfyreFlank = evaluateFormation({ formation: { 'left-flank': 'sunfyre', vanguard: 'syrax', 'right-flank': 'tairax' }, progression, profiles: simpleSynergyProfiles }).results;
    expect(sunfyreFlank.some((result) => result.kind === 'amplifier-output' && result.dragonIds[0] === 'sunfyre' && result.tag === 'stat:instinct')).toBe(false);
    const tairaxResults = evaluateFormation({ formation: { 'left-flank': 'sunfyre', vanguard: 'tairax', 'right-flank': 'thunderstrike' }, progression, profiles: simpleSynergyProfiles }).results;
    expect(tairaxResults.some((result) => result.kind === 'amplifier-output' && result.dragonIds.join('>') === 'tairax>thunderstrike' && result.tag === 'stat:strength')).toBe(true);
  });

  it('keeps conditional outputs visible once and suppresses self relationships', () => {
    const sunfyreSignals = signals('sunfyre');
    expect(sunfyreSignals.find((signal) => signal.id === 'sunfyre-golden-wrath-tactical')).toMatchObject({ tag: 'damage:tactical' });
    expect(sunfyreSignals.find((signal) => signal.id === 'sunfyre-golden-wrath-fire')?.description).toContain('below 50%');
    expect(sunfyreSignals.find((signal) => signal.id === 'sunfyre-golden-wrath-burn')?.description).toContain('below-50%');
    expect(signals('tairax').filter((signal) => signal.id.includes('stagger'))).toHaveLength(1);
    const results = evaluateFormation({
      formation: { 'left-flank': 'sunfyre', vanguard: 'tairax', 'right-flank': 'arulix' },
      progression: { sunfyre: { starRank: 10, dragonLevel: 16 }, tairax: { starRank: 10, dragonLevel: 16 }, arulix: { starRank: 10, dragonLevel: 16 } },
      profiles: simpleSynergyProfiles,
    }).results;
    expect(results.every((result) => new Set(result.dragonIds).size === result.dragonIds.length)).toBe(true);
    expect(results.filter((result) => result.kind === 'setup-payoff' && result.dragonIds.at(-1) === 'tairax' && result.tag === 'status:control')).toHaveLength(1);
    expect(results.filter((result) => result.kind === 'setup-payoff' && result.dragonIds.at(-1) === 'tairax' && result.tag === 'status:burn')).toHaveLength(1);
  });
});
