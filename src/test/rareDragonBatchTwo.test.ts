import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { summarizeAbility, summarizeAbilityForProgression } from '../app/dragonDetailPresentation';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { ROSTER_SCHEMA_VERSION } from '../services/rosterStorage';
import type { Formation } from '../services/teamShare';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { metadataOnlyDragonIds } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { signalTargetsRecipient } from '../synergy/recipientSelectors';
import { tagSatisfies } from '../synergy/tags';
import type { SimpleProgressionByDragonId, SynergySignal } from '../synergy/types';

const rareIds = ['solstryker', 'shimmer', 'jagadrix'] as const;
const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));

function formation(left: string | null, vanguard: string | null, right: string | null): Formation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function evaluate(selected: Formation, progression: SimpleProgressionByDragonId) {
  return evaluateFormation({ formation: selected, progression, profiles: simpleSynergyProfiles }).results;
}

function allSignals(dragonId: string): SynergySignal[] {
  const profile = profilesById.get(dragonId)!;
  return [...profile.outputs, ...profile.supports, ...profile.benefitsFrom];
}

function chipsFor(dragonId: string, starRank: number, selected = formation(null, dragonId, null)) {
  return buildFormationSignalChips({
    profile: profilesById.get(dragonId),
    position: 'vanguard',
    formation: selected,
    profiles: simpleSynergyProfiles,
    progression: { [dragonId]: { starRank, dragonLevel: 16 } },
  });
}

describe('second Rare dragon batch', () => {
  it('upgrades exactly one canonical record for each requested Rare and advances coverage/version only', () => {
    expect(dragons).toHaveLength(31);
    expect(dragons.filter((dragon) => dragon.command)).toHaveLength(28);
    expect(simpleSynergyProfiles).toHaveLength(28);
    expect(metadataOnlyDragonIds).toHaveLength(3);
    expect(dragons.filter((dragon) => dragon.rarity === 'Rare' && dragon.command)).toHaveLength(9);
    expect(databaseMetadata).toMatchObject({ databaseVersion: '0.6.7', schemaVersion: 13 });
    expect(ROSTER_SCHEMA_VERSION).toBe(4);

    const breeds = { solstryker: 'Champion', shimmer: 'Sentinel', jagadrix: 'Hunter' } as const;
    for (const dragonId of rareIds) {
      const matches = dragons.filter((dragon) => dragon.id === dragonId);
      expect(matches, dragonId).toHaveLength(1);
      expect(matches[0]).toMatchObject({ rarity: 'Rare', breed: breeds[dragonId], dataStatus: 'community-verified' });
      expect(matches[0]!.command).not.toBeNull();
      expect(matches[0]!.trait).not.toBeNull();
      expect(matches[0]!.habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);
      expect(Object.values(matches[0]!.affinities).every((affinity) => affinity === 'unknown')).toBe(true);
      expect(Object.values(matches[0]!.stats).every((stat) => stat === null)).toBe(true);
    }
  });

  it('keeps Solstryker base damage and Vulnerable payoff active while unlocking one Overwhelm/Control path at 6 Stars', () => {
    const profile = profilesById.get('solstryker')!;
    expect(profile.outputs.filter((signal) => signal.tag === 'damage:physical')).toHaveLength(1);
    expect(profile.outputs.filter((signal) => signal.tag === 'damage:tactical')).toHaveLength(1);
    expect(profile.benefitsFrom).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: 'status:vulnerable' }),
      expect.objectContaining({ tag: 'stat:strength' }),
      expect.objectContaining({ tag: 'stat:instinct' }),
    ]));
    expect(chipsFor('solstryker', 5).provides).toContainEqual(expect.objectContaining({ label: 'Applies Overwhelm', state: 'inactive' }));
    expect(chipsFor('solstryker', 6).provides).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Applies Overwhelm', state: 'available' }),
      expect.objectContaining({ label: 'Control', state: 'available' }),
    ]));
    expect(tagSatisfies('status:overwhelm', 'status:control')).toBe(true);

    const withControlPayoff = evaluate(formation('solstryker', 'rhysarion', null), {
      solstryker: { starRank: 6, dragonLevel: 16 },
      rhysarion: { starRank: 10, dragonLevel: 16 },
    });
    expect(withControlPayoff.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:control')).toHaveLength(1);

    const solstryker = dragons.find((dragon) => dragon.id === 'solstryker')!;
    expect(summarizeAbility(solstryker.command!).plainSummary).toContain('Benefits from Vulnerable');
    expect(summarizeAbility(solstryker.command!).plainSummary).not.toContain('Applies Weakened');
    expect(solstryker.habits.find((habit) => habit.id === 'solstryker-steady-erosion')?.rawDescription).toContain('up to 10 stacks');
    expect(allSignals('solstryker').map((signal) => signal.abilityId)).not.toEqual(
      expect.arrayContaining(['solstryker-steady-erosion', 'solstryker-energy-drain', 'solstryker-robust-insight', 'solstryker-amplified-drain']),
    );
  });

  it('resolves Shimmer paired highest-Strength effects to one unique other ally and leaves ties unresolved', () => {
    const profile = profilesById.get('shimmer')!;
    const paired = [
      profile.supports.find((signal) => signal.id === 'shimmer-unbreakable-loyalty-stats')!,
      profile.supports.find((signal) => signal.id === 'shimmer-sneak-attack-physical')!,
      profile.outputs.find((signal) => signal.id === 'shimmer-sneak-attack-first-strike')!,
    ];
    const selected = [
      { dragonId: 'shimmer', position: 'vanguard' as const },
      { dragonId: 'arrax', position: 'left-flank' as const },
      { dragonId: 'caraxes', position: 'right-flank' as const },
    ];
    const progression = {
      shimmer: { combatStats: { strength: 999 } },
      arrax: { combatStats: { strength: 200 } },
      caraxes: { combatStats: { strength: 100 } },
    };

    for (const signal of paired) {
      expect(signalTargetsRecipient({ provider: selected[0]!, signal, recipient: selected[1]!, selected, progression })).toBe(true);
      expect(signalTargetsRecipient({ provider: selected[0]!, signal, recipient: selected[2]!, selected, progression })).toBe(false);
      expect(signalTargetsRecipient({ provider: selected[0]!, signal, recipient: selected[0]!, selected, progression })).toBe(false);
    }

    const tied = { ...progression, caraxes: { combatStats: { strength: 200 } } };
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: paired[0]!, recipient: selected[1]!, selected, progression: tied })).toBe(false);
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: paired[0]!, recipient: selected[2]!, selected, progression: tied })).toBe(false);
  });

  it('keeps Crushing Force priority branches scoped, independent, and free of self relationships', () => {
    const atVanguard = evaluate(formation('arrax', 'shimmer', 'arulix'), {
      shimmer: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
      arulix: { starRank: 10, dragonLevel: 16 },
    });
    expect(atVanguard).toContainEqual(expect.objectContaining({
      id: 'amplifier-output:shimmer:damage:physical:arrax',
    }));
    expect(atVanguard).toContainEqual(expect.objectContaining({
      id: 'amplifier-output:shimmer:damage:tactical:arulix',
    }));

    const atLeft = evaluate(formation('shimmer', 'arrax', 'arulix'), {
      shimmer: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
      arulix: { starRank: 10, dragonLevel: 16 },
    });
    expect(atLeft.filter((result) => result.id === 'amplifier-output:shimmer:damage:physical:arrax')).toHaveLength(0);
    expect(atLeft).toContainEqual(expect.objectContaining({ id: 'amplifier-output:shimmer:damage:tactical:arulix' }));

    const crushingPhysical = profilesById.get('shimmer')!.supports.find((signal) => signal.id === 'shimmer-crushing-force-physical')!;
    expect(crushingPhysical).toMatchObject({
      damageScope: 'non-basic-attack',
      recipientSelector: { kind: 'position-priority', preferredPosition: 'left-flank', allowSelf: true },
    });
    const unrestricted = evaluate(formation('vhagar', 'shimmer', 'arulix'), {
      shimmer: { starRank: 10, dragonLevel: 16 },
      vhagar: { starRank: 10, dragonLevel: 16 },
      arulix: { starRank: 10, dragonLevel: 16 },
    });
    expect(unrestricted.filter((result) => result.id === 'amplifier-output:shimmer:damage:physical:vhagar')).toHaveLength(0);
  });

  it('activates Shimmer Recovery/Resistance, Recovery support, and Sneak Attack at exact progression boundaries', () => {
    const shimmer = dragons.find((dragon) => dragon.id === 'shimmer')!;
    const outputs = profilesById.get('shimmer')!.outputs;
    const atFive = summarizeAbilityForProgression(shimmer.command!, outputs, { starRank: 5 });
    const atSix = summarizeAbilityForProgression(shimmer.command!, outputs, { starRank: 6 });
    expect(atFive.plainSummary).not.toContain('Provides Recovery');
    expect(atFive.plainSummary).not.toContain('Resistance doubles Recovery');
    expect(atFive.plainSummary).toContain('gains Recovery and its Resistance payoff at 6★');
    expect(atSix.plainSummary).toContain('Provides Recovery');
    expect(atSix.plainSummary).toContain('Resistance doubles Recovery');

    expect(chipsFor('shimmer', 7).provides).toContainEqual(expect.objectContaining({ label: 'Recovery support to both other allies', state: 'inactive' }));
    expect(chipsFor('shimmer', 8).provides).toContainEqual(expect.objectContaining({ label: 'Recovery support to both other allies', state: 'available' }));
    expect(chipsFor('shimmer', 9).provides).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Grants First-Strike', state: 'inactive' }),
      expect.objectContaining({ label: 'Physical support to highest-Strength other ally', state: 'inactive' }),
    ]));
    expect(chipsFor('shimmer', 10).provides).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Grants First-Strike', state: 'available' }),
      expect.objectContaining({ label: 'Physical support to highest-Strength other ally', state: 'available' }),
    ]));

    const withResistance = evaluate(formation('syrax', 'shimmer', null), {
      syrax: { starRank: 6, dragonLevel: 16 },
      shimmer: { starRank: 6, dragonLevel: 16 },
    });
    expect(withResistance.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:resistance')).toHaveLength(1);
    expect(withResistance.find((result) => result.tag === 'status:resistance')?.explanation).toContain('grants Resistance');
  });

  it('keeps Jagadrix Fire-only and gates Weakened and the single Echoes/Panic path correctly', () => {
    const profile = profilesById.get('jagadrix')!;
    expect(profile.outputs.filter((signal) => signal.tag === 'damage:fire')).toHaveLength(2);
    expect(profile.outputs.some((signal) => signal.tag === 'damage:tactical')).toBe(false);
    expect(tagSatisfies('status:weakened', 'status:control')).toBe(false);
    expect(chipsFor('jagadrix', 5).provides).toContainEqual(expect.objectContaining({ label: 'Applies Weakened', state: 'inactive' }));
    expect(chipsFor('jagadrix', 6).provides).toContainEqual(expect.objectContaining({ label: 'Applies Weakened', state: 'available' }));
    expect(chipsFor('jagadrix', 6).provides.map((chip) => chip.label)).not.toContain('Control');

    const jagadrix = dragons.find((dragon) => dragon.id === 'jagadrix')!;
    const atNine = summarizeAbilityForProgression(jagadrix.command!, profile.outputs, { starRank: 9 });
    const atTen = summarizeAbilityForProgression(jagadrix.command!, profile.outputs, { starRank: 10 });
    expect(atNine.plainSummary).not.toContain('enemies with Panic');
    expect(atNine.plainSummary).toContain('gains an additional Fire attack and Panic payoff at 10★');
    expect(atTen.plainSummary).toContain('Deals double damage to enemies with Panic');
    expect(atTen.plainSummary).not.toContain('Deals Tactical Damage');

    const withPanic = evaluate(formation('kalspire', 'jagadrix', null), {
      kalspire: { starRank: 6, dragonLevel: 16 },
      jagadrix: { starRank: 10, dragonLevel: 16 },
    });
    expect(withPanic.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:panic')).toHaveLength(1);
    expect(withPanic.find((result) => result.tag === 'status:panic')?.explanation).toContain('deal double damage');

    const secondWind = jagadrix.habits.find((habit) => habit.id === 'jagadrix-second-wind')!;
    expect(secondWind.rawDescription).toMatch(/apply Recovery.*then \(3\) apply Nullify Recovery/s);
    expect(allSignals('jagadrix').map((signal) => signal.abilityId)).not.toEqual(
      expect.arrayContaining(['jagadrix-enervate', 'jagadrix-second-wind', 'jagadrix-quick-witted']),
    );
  });

  it('exposes only explicit named Resistance/Panic providers and does not invent generic defense providers', () => {
    const resistanceProviders = simpleSynergyProfiles
      .filter((profile) => profile.outputs.some((signal) => signal.tag === 'status:resistance'))
      .map((profile) => profile.dragonId)
      .sort();
    const panicProviders = simpleSynergyProfiles
      .filter((profile) => profile.outputs.some((signal) => signal.tag === 'status:panic'))
      .map((profile) => profile.dragonId)
      .sort();
    expect(resistanceProviders).toEqual(['rhysarion', 'seasmoke', 'syrax']);
    expect(panicProviders).toEqual(['daemoros', 'kalspire', 'shadowrend', 'zivern']);
    expect(resistanceProviders).not.toEqual(expect.arrayContaining(['vhagar', 'vermax']));
  });
});
