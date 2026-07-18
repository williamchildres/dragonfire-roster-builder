import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { summarizeAbility } from '../app/dragonDetailPresentation';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { manualReviewRecords } from '../data/manualReviews';
import { ROSTER_SCHEMA_VERSION } from '../services/rosterStorage';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { metadataOnlyDragonIds } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { signalTargetsRecipient } from '../synergy/recipientSelectors';
import { CONTROL_ALIAS_TAGS, tagSatisfies } from '../synergy/tags';
import type { SimpleFormation, SimpleProgressionByDragonId } from '../synergy/types';

const targetIds = ['vesper', 'nyrena', 'dawnseeker'] as const;
const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));

function formation(left: string | null, vanguard: string | null, right: string | null): SimpleFormation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function evaluate(selected: SimpleFormation, progression: SimpleProgressionByDragonId = {}) {
  return evaluateFormation({ formation: selected, progression, profiles: simpleSynergyProfiles }).results;
}

function chipsFor(dragonId: string, position: keyof SimpleFormation, selected: SimpleFormation, starRank: number) {
  return buildFormationSignalChips({
    profile: profilesById.get(dragonId),
    position,
    formation: selected,
    profiles: simpleSynergyProfiles,
    progression: Object.fromEntries(
      Object.values(selected)
        .filter((id): id is string => Boolean(id))
        .map((id) => [id, { starRank, dragonLevel: 16 }]),
    ),
  });
}

describe('fourth Rare dragon batch', () => {
  it('completes all roster coverage without changing schema contracts', () => {
    expect(dragons).toHaveLength(31);
    expect(dragons.filter((dragon) => dragon.command)).toHaveLength(31);
    expect(simpleSynergyProfiles).toHaveLength(31);
    expect(metadataOnlyDragonIds).toHaveLength(0);
    expect(dragons.filter((dragon) => dragon.rarity === 'Legendary' && dragon.command)).toHaveLength(9);
    expect(dragons.filter((dragon) => dragon.rarity === 'Epic' && dragon.command)).toHaveLength(10);
    expect(dragons.filter((dragon) => dragon.rarity === 'Rare' && dragon.command)).toHaveLength(12);
    expect(databaseMetadata).toMatchObject({ databaseVersion: '0.9.3', schemaVersion: 13 });
    expect(ROSTER_SCHEMA_VERSION).toBe(5);

    for (const dragonId of targetIds) {
      const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
      expect(dragon.dataStatus).toBe('community-verified');
      expect(dragon.habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);
      expect(Object.values(dragon.affinities).every((affinity) => affinity === 'unknown')).toBe(true);
      expect(Object.values(dragon.stats).every((stat) => stat === null)).toBe(true);
      expect(evidenceSources.filter((source) => source.id.startsWith(`${dragonId}-`))).toHaveLength(7);
      expect(manualReviewRecords.filter((review) => review.dragonId === dragonId)).toHaveLength(1);
    }
  });

  it('keeps Vesper Slow specific and outside Control while Confusion satisfies Control once', () => {
    const profile = profilesById.get('vesper')!;
    expect(profile.outputs.filter((signal) => signal.tag === 'status:slow')).toHaveLength(1);
    expect(profile.outputs.filter((signal) => signal.tag === 'status:confusion')).toHaveLength(1);
    expect(CONTROL_ALIAS_TAGS).not.toContain('status:slow');
    expect(tagSatisfies('status:slow', 'status:control')).toBe(false);
    expect(tagSatisfies('status:confusion', 'status:control')).toBe(true);

    for (const beneficiary of ['antares', 'syrax']) {
      const results = evaluate(formation('vesper', beneficiary, null), {
        vesper: { starRank: 10, dragonLevel: 16 },
        [beneficiary]: { starRank: 10, dragonLevel: 16 },
      });
      expect(results.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:slow')).toHaveLength(1);
      expect(results.filter((result) => result.tag === 'status:control')).toHaveLength(0);
    }

    const confusionResults = evaluate(formation('vesper', 'rhysarion', null), {
      vesper: { starRank: 10, dragonLevel: 16 },
      rhysarion: { starRank: 10, dragonLevel: 16 },
    });
    expect(confusionResults.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:control')).toHaveLength(1);
    expect(confusionResults.filter((result) => result.tag === 'status:confusion')).toHaveLength(0);

    const atNine = chipsFor('vesper', 'left-flank', formation('vesper', 'rhysarion', null), 9);
    const atTen = chipsFor('vesper', 'left-flank', formation('vesper', 'rhysarion', null), 10);
    expect(atNine.provides).toContainEqual(expect.objectContaining({ label: 'Applies Confusion', state: 'inactive' }));
    expect(atNine.provides.some((chip) => chip.label === 'Control' && chip.state !== 'inactive')).toBe(false);
    expect(atTen.provides).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Applies Confusion', state: 'used' }),
      expect.objectContaining({ label: 'Control', state: 'used' }),
      expect.objectContaining({ label: 'Applies Slow' }),
    ]));
  });

  it('resolves Vesper priority and adjacent-other recipients without self-synergy or guessed Vanguard targets', () => {
    const profile = profilesById.get('vesper')!;
    const resistance = profile.outputs.find((signal) => signal.id === 'vesper-saviors-waltz-resistance')!;
    const strategic = profile.supports.find((signal) => signal.id === 'vesper-strategic-leader-tactical')!;
    const selected = [
      { dragonId: 'vesper', position: 'left-flank' as const },
      { dragonId: 'shimmer', position: 'vanguard' as const },
      { dragonId: 'antares', position: 'right-flank' as const },
    ];
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: resistance, recipient: selected[1]!, selected, progression: {} })).toBe(true);
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: resistance, recipient: selected[2]!, selected, progression: {} })).toBe(false);
    expect(signalTargetsRecipient({ provider: selected[0]!, signal: strategic, recipient: selected[1]!, selected, progression: {} })).toBe(true);

    const vanguardSelected = [
      { dragonId: 'shimmer', position: 'left-flank' as const },
      { dragonId: 'vesper', position: 'vanguard' as const },
      { dragonId: 'antares', position: 'right-flank' as const },
    ];
    expect(vanguardSelected.filter((recipient) => signalTargetsRecipient({ provider: vanguardSelected[1]!, signal: resistance, recipient, selected: vanguardSelected, progression: {} }))).toHaveLength(0);
    expect(vanguardSelected.filter((recipient) => signalTargetsRecipient({ provider: vanguardSelected[1]!, signal: strategic, recipient, selected: vanguardSelected, progression: {} })).map((recipient) => recipient.dragonId)).toEqual(['vesper']);

    const resistanceResults = evaluate(formation('vesper', 'shimmer', null), {
      vesper: { starRank: 6, dragonLevel: 16 },
      shimmer: { starRank: 10, dragonLevel: 16 },
    });
    expect(resistanceResults.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:resistance')).toHaveLength(1);
    expect(resistanceResults.filter((result) => result.dragonIds[0] === result.dragonIds[1])).toHaveLength(0);
    const vanguardChips = chipsFor('vesper', 'vanguard', formation('shimmer', 'vesper', 'antares'), 10);
    expect(vanguardChips.provides.find((chip) => chip.label.includes('Resistance'))?.scoreable).toBe(false);
    expect(vanguardChips.provides.find((chip) => chip.label.includes('prioritizes Vanguard'))?.scoreable).toBe(false);
  });

  it('gates Vesper formation-wide support at exact Star Ranks', () => {
    const selected = formation('vesper', 'syrax', 'antares');
    expect(chipsFor('vesper', 'left-flank', selected, 1).provides).toContainEqual(expect.objectContaining({ label: 'Tactical support (prioritizes Vanguard)', state: 'inactive' }));
    expect(chipsFor('vesper', 'left-flank', selected, 2).provides).toContainEqual(expect.objectContaining({ label: 'Tactical support (prioritizes Vanguard)', state: 'used' }));
    expect(chipsFor('vesper', 'left-flank', selected, 5).provides).toContainEqual(expect.objectContaining({ label: 'Grants Resistance to one adjacent other ally', state: 'inactive' }));
    expect(chipsFor('vesper', 'left-flank', selected, 6).provides).toContainEqual(expect.objectContaining({ label: 'Grants Resistance to one adjacent other ally', state: 'available' }));
    expect(chipsFor('vesper', 'left-flank', selected, 7).provides).toContainEqual(expect.objectContaining({ label: 'Instinct support to both teammates', state: 'inactive' }));
    expect(chipsFor('vesper', 'left-flank', selected, 8).provides).toContainEqual(expect.objectContaining({ label: 'Instinct support to both teammates', state: 'used' }));
  });

  it('models Nyrena base damage, direct enemy suppression, and no invented Burn output', () => {
    const dragon = dragons.find((candidate) => candidate.id === 'nyrena')!;
    const profile = profilesById.get('nyrena')!;
    expect(profile.outputs.map((signal) => signal.tag)).toEqual(['damage:fire', 'damage:tactical']);
    expect(profile.outputs.some((signal) => signal.tag === 'status:burn')).toBe(false);
    expect(dragon.command?.tags).toContain('PHYSICAL_DAMAGE_DEALT_DOWN');
    expect(dragon.command?.tags).not.toContain('PHYSICAL_DAMAGE');
    expect(dragon.command?.tags).not.toContain('BURN');
    expect(dragon.command?.rawDescription).toContain('detailed body conflicts by saying Physical Damage Received');
    expect(summarizeAbility(dragon.command).plainSummary).toContain('Suppresses enemy Physical Damage');
    expect(summarizeAbility(dragon.command).plainSummary).not.toContain('Deals Physical Damage');
  });

  it('uses one Nyrena paired-stat group, one adjacent-other Fire target, and non-scoring timed defense', () => {
    const profile = profilesById.get('nyrena')!;
    expect(profile.supports.find((signal) => signal.id === 'nyrena-mindful-synergy-stats')?.tags).toEqual(['stat:intelligence', 'stat:instinct']);
    const fire = profile.supports.find((signal) => signal.id === 'nyrena-deepen-the-breach-fire')!;
    expect(fire.recipientSelector).toEqual({ kind: 'adjacent-group', recipientCount: 1, includeSelf: false });
    const flankResults = evaluate(formation('nyrena', 'shadowsong', 'antares'), {
      nyrena: { starRank: 10, dragonLevel: 16 },
      shadowsong: { starRank: 10, dragonLevel: 16 },
      antares: { starRank: 10, dragonLevel: 16 },
    });
    expect(flankResults.filter((result) => result.id === 'amplifier-output:nyrena:damage:fire:shadowsong')).toHaveLength(1);
    const vanguardResults = evaluate(formation('shadowsong', 'nyrena', 'antares'), {
      nyrena: { starRank: 10, dragonLevel: 16 },
      shadowsong: { starRank: 10, dragonLevel: 16 },
      antares: { starRank: 10, dragonLevel: 16 },
    });
    expect(vanguardResults.filter((result) => result.id.startsWith('amplifier-output:nyrena:damage:fire:'))).toHaveLength(0);
    expect(vanguardResults.filter((result) => result.dragonIds[0] === result.dragonIds[1])).toHaveLength(0);

    const atTen = chipsFor('nyrena', 'vanguard', formation('shadowsong', 'nyrena', 'antares'), 10);
    expect(atTen.provides).toContainEqual(expect.objectContaining({ label: 'Physical Damage Received reduction (rounds 6-10)', scoreable: false }));
    expect(atTen.provides.some((chip) => chip.label === 'Physical Damage support')).toBe(false);
  });

  it('gates Nyrena paired stats, timed Fire support, and timed Physical defense', () => {
    const selected = formation('nyrena', 'shadowsong', 'antares');
    expect(chipsFor('nyrena', 'left-flank', selected, 3).provides).toContainEqual(expect.objectContaining({ label: 'Intelligence and Instinct support to both teammates', state: 'inactive' }));
    expect(chipsFor('nyrena', 'left-flank', selected, 4).provides).toContainEqual(expect.objectContaining({ label: 'Intelligence and Instinct support to both teammates', state: 'used' }));
    expect(chipsFor('nyrena', 'left-flank', selected, 5).provides).toContainEqual(expect.objectContaining({ label: 'Fire Damage support to one adjacent other ally (rounds 6-10)', state: 'inactive' }));
    expect(chipsFor('nyrena', 'left-flank', selected, 6).provides).toContainEqual(expect.objectContaining({ label: 'Fire Damage support to one adjacent other ally (rounds 6-10)', state: 'used' }));
    expect(chipsFor('nyrena', 'left-flank', selected, 9).provides).toContainEqual(expect.objectContaining({ label: 'Physical Damage Received reduction (rounds 6-10)', state: 'inactive' }));
    expect(chipsFor('nyrena', 'left-flank', selected, 10).provides).toContainEqual(expect.objectContaining({ label: 'Physical Damage Received reduction (rounds 6-10)', state: 'available', scoreable: false }));
  });

  it('resolves Dawnseeker two-of-adjacent Recovery only when the eligible group is deterministic', () => {
    const recovery = profilesById.get('dawnseeker')!.outputs.find((signal) => signal.id === 'dawnseeker-radiant-wings-recovery')!;
    const flank = [
      { dragonId: 'dawnseeker', position: 'left-flank' as const },
      { dragonId: 'syrax', position: 'vanguard' as const },
      { dragonId: 'antares', position: 'right-flank' as const },
    ];
    expect(flank.filter((recipient) => signalTargetsRecipient({ provider: flank[0]!, signal: recovery, recipient, selected: flank, progression: {} })).map((recipient) => recipient.dragonId)).toEqual(['dawnseeker', 'syrax']);
    const vanguard = [
      { dragonId: 'syrax', position: 'left-flank' as const },
      { dragonId: 'dawnseeker', position: 'vanguard' as const },
      { dragonId: 'antares', position: 'right-flank' as const },
    ];
    expect(vanguard.filter((recipient) => signalTargetsRecipient({ provider: vanguard[1]!, signal: recovery, recipient, selected: vanguard, progression: {} }))).toHaveLength(0);
    expect(chipsFor('dawnseeker', 'vanguard', formation('syrax', 'dawnseeker', 'antares'), 10).provides.find((chip) => chip.label.includes('Recovery to two adjacent'))?.scoreable).toBe(false);
  });

  it('keeps Dawnseeker priority branches independent, Recovery Received distinct, and First-Strike outside Control', () => {
    const profile = profilesById.get('dawnseeker')!;
    const tactical = profile.supports.find((signal) => signal.id === 'dawnseeker-tactical-inferno-tactical')!;
    const fire = profile.supports.find((signal) => signal.id === 'dawnseeker-tactical-inferno-fire')!;
    expect(tactical.recipientSelector).toEqual({ kind: 'position-priority', preferredPosition: 'left-flank', allowSelf: true });
    expect(fire.recipientSelector).toEqual({ kind: 'position-priority', preferredPosition: 'right-flank', allowSelf: true });
    expect(profile.supports.find((signal) => signal.id === 'dawnseeker-unbroken-devotion-recovery-received')).toMatchObject({ tag: 'effect:recovery-received', nonScoring: true });
    expect(profile.outputs.filter((signal) => signal.tag === 'effect:recovery')).toHaveLength(1);
    expect(tagSatisfies('status:first-strike', 'status:control')).toBe(false);

    const selfSelected = evaluate(formation('dawnseeker', 'vesper', 'shadowsong'), {
      dawnseeker: { starRank: 10, dragonLevel: 16 },
      vesper: { starRank: 10, dragonLevel: 16 },
      shadowsong: { starRank: 10, dragonLevel: 16 },
    });
    expect(selfSelected.filter((result) => result.id.startsWith('amplifier-output:dawnseeker:damage:tactical:'))).toHaveLength(0);
    expect(selfSelected.filter((result) => result.id === 'amplifier-output:dawnseeker:damage:fire:shadowsong')).toHaveLength(1);
    expect(selfSelected.filter((result) => result.dragonIds[0] === result.dragonIds[1])).toHaveLength(0);
  });

  it('keeps Sunbreak as one Command augmentation and gates Dawnseeker progression exactly', () => {
    const dragon = dragons.find((candidate) => candidate.id === 'dawnseeker')!;
    const profile = profilesById.get('dawnseeker')!;
    expect(profile.outputs.filter((signal) => signal.abilityId === 'dawnseeker-sunbreak')).toHaveLength(0);
    expect(dragon.command?.rawDescription).toContain('does not create Round 1 Recovery');
    expect(dragon.habits.find((habit) => habit.id === 'dawnseeker-sunbreak')?.rawDescription).toContain('Habit Level 1: +100%; +60%');
    expect(dragon.command?.rawDescription).toContain('base +50% Damage Rate');
    expect(dragon.command?.rawDescription).toContain('base +30% Recovery Rate');

    const selected = formation('dawnseeker', 'nyrena', 'shadowsong');
    expect(chipsFor('dawnseeker', 'left-flank', selected, 1).provides).toContainEqual(expect.objectContaining({ label: 'Tactical support (rounds 1-3, prioritizes Left Flank)', state: 'inactive' }));
    expect(chipsFor('dawnseeker', 'left-flank', selected, 2).provides).toContainEqual(expect.objectContaining({ label: 'Tactical support (rounds 1-3, prioritizes Left Flank)', state: 'available', scoreable: false }));
    expect(chipsFor('dawnseeker', 'left-flank', selected, 3).provides).toContainEqual(expect.objectContaining({ label: 'Recovery Received support to both teammates', state: 'inactive' }));
    expect(chipsFor('dawnseeker', 'left-flank', selected, 4).provides).toContainEqual(expect.objectContaining({ label: 'Recovery Received support to both teammates', state: 'available', scoreable: false }));
    expect(chipsFor('dawnseeker', 'left-flank', selected, 7).provides).toContainEqual(expect.objectContaining({ label: 'Initiative support to both teammates', state: 'inactive' }));
    expect(chipsFor('dawnseeker', 'left-flank', selected, 8).provides).toContainEqual(expect.objectContaining({ label: 'Initiative support to both teammates', state: 'used' }));
    const atNine = chipsFor('dawnseeker', 'left-flank', selected, 9);
    const atTen = chipsFor('dawnseeker', 'left-flank', selected, 10);
    expect(atNine.provides).toContainEqual(expect.objectContaining({ label: 'Grants First-Strike to both teammates (rounds 1-3)', state: 'inactive' }));
    expect(atTen.provides).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Grants First-Strike to both teammates (rounds 1-3)', state: 'available' }),
      expect.objectContaining({ label: 'Intelligence and Instinct support (rounds 1-3)', state: 'used' }),
    ]));
    expect(atTen.provides.some((chip) => chip.label === 'Control')).toBe(false);
  });

  it('preserves previous Rare status relationships without duplicate aliases', () => {
    const bleed = evaluate(formation('thunderstrike', 'arrax', null), {
      thunderstrike: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
    });
    expect(bleed.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:bleed')).toHaveLength(1);
    const panic = evaluate(formation('shadowrend', 'jagadrix', null), {
      shadowrend: { starRank: 10, dragonLevel: 16 },
      jagadrix: { starRank: 10, dragonLevel: 16 },
    });
    expect(panic.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:panic')).toHaveLength(1);
    expect(evaluate(formation('kalspire', 'arrax', null), { kalspire: { starRank: 10 }, arrax: { starRank: 10 } }).filter((result) => result.tag === 'status:bleed')).toHaveLength(1);
  });
});
