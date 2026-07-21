import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { summarizeAbilityForProgression } from '../app/dragonDetailPresentation';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { ROSTER_SCHEMA_VERSION } from '../services/rosterStorage';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { metadataOnlyDragonIds } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { signalTargetsRecipient } from '../synergy/recipientSelectors';
import { tagSatisfies } from '../synergy/tags';
import type { SimpleFormation, SimpleProgressionByDragonId } from '../synergy/types';

const rareIds = ['bevlorin', 'shadowrend', 'thunderstrike'] as const;
const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));

function formation(left: string | null, vanguard: string | null, right: string | null): SimpleFormation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function evaluate(selected: SimpleFormation, progression: SimpleProgressionByDragonId) {
  return evaluateFormation({ formation: selected, progression, profiles: simpleSynergyProfiles }).results;
}

function chipsFor(dragonId: string, starRank: number) {
  return buildFormationSignalChips({
    profile: profilesById.get(dragonId),
    position: 'vanguard',
    formation: formation(null, dragonId, null),
    profiles: simpleSynergyProfiles,
    progression: { [dragonId]: { starRank, dragonLevel: 16 } },
  });
}

describe('third Rare dragon batch', () => {
  it('upgrades one canonical Rare record each and advances only release coverage metadata', () => {
    expect(dragons).toHaveLength(31);
    expect(dragons.filter((dragon) => dragon.command)).toHaveLength(31);
    expect(simpleSynergyProfiles).toHaveLength(31);
    expect(metadataOnlyDragonIds).toHaveLength(0);
    expect(dragons.filter((dragon) => dragon.rarity === 'Rare' && dragon.command)).toHaveLength(12);
    expect(databaseMetadata).toMatchObject({ databaseVersion: '0.13.0', schemaVersion: 13 });
    expect(ROSTER_SCHEMA_VERSION).toBe(5);

    const breeds = { bevlorin: 'Champion', shadowrend: 'Warrior', thunderstrike: 'Warrior' } as const;
    for (const dragonId of rareIds) {
      const matches = dragons.filter((dragon) => dragon.id === dragonId);
      expect(matches, dragonId).toHaveLength(1);
      expect(matches[0]).toMatchObject({ rarity: 'Rare', breed: breeds[dragonId], dataStatus: 'community-verified' });
      expect(matches[0]!.command).not.toBeNull();
      expect(matches[0]!.trait).not.toBeNull();
      expect(matches[0]!.habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);
      expect(Object.values(matches[0]!.affinities)).not.toContain('unknown');
      expect(Object.values(matches[0]!.stats).every((stat) => stat === null)).toBe(true);
    }
  });

  it('models Bevlorin progression, one generic damaging relationship, and no self relationship', () => {
    const profile = profilesById.get('bevlorin')!;
    const bevlorin = dragons.find((dragon) => dragon.id === 'bevlorin')!;
    expect(profile.outputs.filter((signal) => signal.tag === 'damage:physical')).toHaveLength(1);
    expect(profile.outputs.filter((signal) => signal.tag === 'damage:fire')).toHaveLength(1);
    expect(profile.supports.filter((signal) => signal.tag === 'damage:any')).toHaveLength(1);
    expect(bevlorin.command?.rawDescription).toContain('incorrectly says Fire Damage Received Modifier');
    expect(bevlorin.command?.tags).toContain('FIRE_DAMAGE_DEALT_DOWN');
    expect(bevlorin.command?.tags).not.toContain('WEAKENED');

    const atFive = summarizeAbilityForProgression(bevlorin.command, profile.outputs, { starRank: 5 });
    const atSix = summarizeAbilityForProgression(bevlorin.command, profile.outputs, { starRank: 6 });
    expect(atFive.plainSummary).not.toContain('Provides Recovery');
    expect(atFive.plainSummary).toContain('gains Recovery through Renewal at 6★');
    expect(atSix.plainSummary).toContain('Provides Recovery');
    expect(chipsFor('bevlorin', 9).provides.some((chip) => chip.label.includes('highest-'))).toBe(true);
    expect(chipsFor('bevlorin', 9).provides.filter((chip) => chip.label.includes('highest-')).every((chip) => chip.state === 'inactive')).toBe(true);
    expect(chipsFor('bevlorin', 10).provides.filter((chip) => chip.label.includes('highest-')).every((chip) => chip.state === 'available')).toBe(true);

    const results = evaluate(formation('shadowrend', 'bevlorin', 'tessarion'), {
      bevlorin: { starRank: 10, dragonLevel: 16 },
      shadowrend: { starRank: 10, dragonLevel: 16 },
      tessarion: { starRank: 10, dragonLevel: 16 },
    });
    expect(results.filter((result) => result.id === 'amplifier-output:bevlorin:damage:any:tessarion')).toHaveLength(1);
    expect(results.filter((result) => result.dragonIds[0] === result.dragonIds[1])).toHaveLength(0);
    expect(results.filter((result) => result.id.includes('bevlorin:effect:recovery:tessarion'))).toHaveLength(0);
  });

  it('uses four independent self-eligible Bountiful Gifts selectors and leaves missing/tied values unresolved', () => {
    const supports = profilesById.get('bevlorin')!.supports.filter((signal) => signal.abilityId === 'bevlorin-bountiful-gifts');
    expect(supports).toHaveLength(4);
    expect(new Set(supports.map((signal) => signal.id))).toHaveLength(4);
    expect(supports.map((signal) => signal.recipientSelector)).toEqual(expect.arrayContaining([
      { kind: 'highest-stat', stat: 'strength', excludeSelf: false },
      { kind: 'highest-stat', stat: 'intelligence', excludeSelf: false },
      { kind: 'highest-stat', stat: 'instinct', excludeSelf: false },
      { kind: 'highest-stat', stat: 'initiative', excludeSelf: false },
    ]));

    const selected = [
      { dragonId: 'bevlorin', position: 'vanguard' as const },
      { dragonId: 'arrax', position: 'left-flank' as const },
      { dragonId: 'jagadrix', position: 'right-flank' as const },
    ];
    const strength = supports.find((signal) => signal.tag === 'stat:strength')!;
    const known = { bevlorin: { combatStats: { strength: 300 } }, arrax: { combatStats: { strength: 200 } }, jagadrix: { combatStats: { strength: 100 } } };
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: strength, recipient: selected[0]!, selected, progression: known })).toBe(true);
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: strength, recipient: selected[1]!, selected, progression: known })).toBe(false);
    const tied = { ...known, arrax: { combatStats: { strength: 300 } } };
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: strength, recipient: selected[0]!, selected, progression: tied })).toBe(false);
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: strength, recipient: selected[1]!, selected, progression: tied })).toBe(false);
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: strength, recipient: selected[1]!, selected, progression: {} })).toBe(false);
  });

  it('keeps Shadowrend Panic named, timed support visible, and Advantage recipients unresolved and unscored', () => {
    const profile = profilesById.get('shadowrend')!;
    const panic = profile.outputs.filter((signal) => signal.tag === 'status:panic');
    expect(panic).toHaveLength(1);
    expect(panic[0]?.tags).toBeUndefined();
    expect(profile.outputs.filter((signal) => signal.id === 'shadowrend-eclipse-fervor-tactical')).toHaveLength(1);
    expect(tagSatisfies('status:panic', 'status:control')).toBe(false);
    expect(profile.supports.filter((signal) => signal.abilityId === 'shadowrend-midnight-aura').map((signal) => signal.publicLabel)).toEqual([
      'Strength support (rounds 7–10)',
      'Instinct support (rounds 7–10)',
    ]);
    expect(profile.supports.filter((signal) => signal.abilityId === 'shadowrend-midnight-mastery').every((signal) => signal.publicLabel?.includes('rounds 7–10'))).toBe(true);
    const advantage = profile.outputs.find((signal) => signal.tag === 'status:advantage')!;
    expect(advantage.recipientSelector).toEqual({ kind: 'unresolved-group', recipientCount: 2, includeSelf: true });

    expect(chipsFor('shadowrend', 5).provides).toContainEqual(expect.objectContaining({ label: 'Grants Advantage conditionally (two of three Allies)', state: 'inactive' }));
    expect(chipsFor('shadowrend', 6).provides).toContainEqual(expect.objectContaining({ label: 'Grants Advantage conditionally (two of three Allies)', state: 'available' }));
    const results = evaluate(formation('shadowrend', 'thunderstrike', 'jagadrix'), {
      shadowrend: { starRank: 10, dragonLevel: 16 },
      thunderstrike: { starRank: 10, dragonLevel: 16 },
      jagadrix: { starRank: 10, dragonLevel: 16 },
    });
    expect(results.filter((result) => result.tag === 'status:advantage')).toHaveLength(0);
    expect(results.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:panic')).toHaveLength(1);
  });

  it('keeps Event Horizon additive and progression-aware without duplicating the command augmentation', () => {
    const profile = profilesById.get('shadowrend')!;
    const shadowrend = dragons.find((dragon) => dragon.id === 'shadowrend')!;
    const atNine = summarizeAbilityForProgression(shadowrend.command, profile.outputs, { starRank: 9 });
    const atTen = summarizeAbilityForProgression(shadowrend.command, profile.outputs, { starRank: 10 });
    expect(atNine.plainSummary).toContain('gains the Event Horizon Round 9 dual hit at 10★');
    expect(atTen.plainSummary).toContain('Deals Physical Damage');
    expect(profile.outputs.filter((signal) => signal.abilityId === 'shadowrend-event-horizon')).toHaveLength(2);
    expect(shadowrend.command?.rawDescription).toContain('The base Round 9 Physical attack remains');
    expect(shadowrend.habits.filter((habit) => habit.id === 'shadowrend-event-horizon')).toHaveLength(1);
  });

  it('gates Thunderstrike Bleed, Armor Break, Stagger, and Advantage payoff at exact ranks', () => {
    const profile = profilesById.get('thunderstrike')!;
    const thunderstrike = dragons.find((dragon) => dragon.id === 'thunderstrike')!;
    const atFive = summarizeAbilityForProgression(thunderstrike.command, profile.outputs, { starRank: 5 });
    const atSix = summarizeAbilityForProgression(thunderstrike.command, profile.outputs, { starRank: 6 });
    expect(atFive.plainSummary).not.toContain('Applies Bleed');
    expect(atFive.plainSummary).toContain('gains the Barbed Lash even-round attack and Bleed at 6★');
    expect(atSix.plainSummary).toContain('Applies Bleed');
    expect(chipsFor('thunderstrike', 7).provides).toContainEqual(expect.objectContaining({ label: 'Increases Physical Damage Received', state: 'inactive' }));
    expect(chipsFor('thunderstrike', 8).provides).toContainEqual(expect.objectContaining({ label: 'Increases Physical Damage Received', state: 'available' }));
    expect(chipsFor('thunderstrike', 9).provides).toContainEqual(expect.objectContaining({ label: 'Applies Stagger', state: 'inactive' }));
    expect(chipsFor('thunderstrike', 10).provides).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Applies Stagger', state: 'available' }),
      expect.objectContaining({ label: 'Control', state: 'available' }),
    ]));
    expect(chipsFor('thunderstrike', 10).benefitsFrom).toContainEqual(expect.objectContaining({ label: 'Advantage extends Stagger', state: 'missing' }));
    expect(tagSatisfies('status:bleed', 'status:control')).toBe(false);
    expect(tagSatisfies('status:stagger', 'status:control')).toBe(true);
    expect(thunderstrike.habits.find((habit) => habit.id === 'thunderstrike-armor-break')?.tags).not.toContain('VULNERABLE');
  });

  it('creates one Bleed-to-Arrax relationship and one Stagger-as-Control relationship without aliases duplicating them', () => {
    const withArrax = evaluate(formation('thunderstrike', 'arrax', null), {
      thunderstrike: { starRank: 6, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
    });
    expect(withArrax.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:bleed')).toHaveLength(1);
    expect(withArrax.filter((result) => result.tag === 'status:control')).toHaveLength(0);

    const withControlPayoff = evaluate(formation('thunderstrike', 'rhysarion', null), {
      thunderstrike: { starRank: 10, dragonLevel: 16 },
      rhysarion: { starRank: 10, dragonLevel: 16 },
    });
    expect(withControlPayoff.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:control')).toHaveLength(1);
    expect(withControlPayoff.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:stagger')).toHaveLength(0);
  });
});
