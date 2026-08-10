import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { summarizeAbility } from '../app/dragonDetailPresentation';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { ROSTER_SCHEMA_VERSION } from '../services/rosterStorage';
import { emptyFormation, type Formation } from '../services/teamShare';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { metadataOnlyDragonIds } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { tagSatisfies } from '../synergy/tags';
import type { SimpleProgressionByDragonId, SynergySignal } from '../synergy/types';

const rareIds = ['antares', 'arrax', 'arulix'] as const;
const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));

function formation(left: string | null, vanguard: string | null, right: string | null): Formation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function evaluate(selectedFormation: Formation, progression: SimpleProgressionByDragonId) {
  return evaluateFormation({
    formation: selectedFormation,
    progression,
    profiles: simpleSynergyProfiles,
  }).results;
}

function chipsFor(dragonId: string, starRank: number) {
  return buildFormationSignalChips({
    profile: profilesById.get(dragonId),
    position: 'vanguard',
    formation: emptyFormation(),
    profiles: simpleSynergyProfiles,
    progression: { [dragonId]: { starRank, dragonLevel: 16 } },
  });
}

function signalsFor(dragonId: string): SynergySignal[] {
  const profile = profilesById.get(dragonId)!;
  return [...profile.outputs, ...profile.supports, ...profile.benefitsFrom];
}

describe('first Rare dragon batch', () => {
  it('keeps the first Rare batch complete with controller-verified affinities', () => {
    expect(dragons).toHaveLength(34);
    expect(dragons.filter((dragon) => dragon.command !== null)).toHaveLength(34);
    expect(simpleSynergyProfiles).toHaveLength(34);
    expect(metadataOnlyDragonIds).toHaveLength(0);
    expect(dragons.filter((dragon) => dragon.rarity === 'Rare' && dragon.command !== null)).toHaveLength(12);

    const expectedBreeds = { antares: 'Hunter', arrax: 'Warrior', arulix: 'Champion' } as const;
    for (const id of rareIds) {
      const matches = dragons.filter((dragon) => dragon.id === id);
      expect(matches, id).toHaveLength(1);
      const dragon = matches[0]!;
      expect(dragon).toMatchObject({ rarity: 'Rare', breed: expectedBreeds[id], dataStatus: 'community-verified' });
      expect(dragon.command).not.toBeNull();
      expect(dragon.trait).not.toBeNull();
      expect(dragon.habits.map((habit) => habit.unlockStarRank)).toEqual([2, 4, 6, 8, 10]);
      expect([dragon.command, dragon.trait, ...dragon.habits]).toHaveLength(7);
      expect([dragon.command, dragon.trait, ...dragon.habits].every((ability) => ability?.verification.status === 'screenshot-verified')).toBe(true);
      expect(Object.values(dragon.affinities)).not.toContain('unknown');
      expect(Object.values(dragon.stats).every((value) => value === null)).toBe(true);
    }

    expect(databaseMetadata).toMatchObject({ databaseVersion: '0.23.5', schemaVersion: 14 });
    expect(ROSTER_SCHEMA_VERSION).toBe(5);
  });

  it('models Antares progression once and keeps self-only effects out of allied support', () => {
    const profile = profilesById.get('antares')!;
    expect(profile.outputs.filter((signal) => signal.tag === 'damage:fire')).toHaveLength(1);
    expect(profile.outputs.map((signal) => signal.tag)).toContain('status:vulnerable');
    const blazingOnslaughtSupports = profile.supports.filter(
      (signal) => signal.abilityId === 'antares-blazing-onslaught',
    );
    expect(blazingOnslaughtSupports).toEqual([
      expect.objectContaining({ tag: 'damage:fire' }),
      expect.objectContaining({ tag: 'damage:physical', damageScope: 'non-basic-attack' }),
    ]);
    expect(blazingOnslaughtSupports[0]).not.toHaveProperty('damageScope');
    expect(signalsFor('antares').map((signal) => signal.abilityId)).not.toEqual(
      expect.arrayContaining(['antares-dragons-flair', 'antares-dragons-intellect', 'antares-redemption']),
    );

    expect(chipsFor('antares', 5).benefitsFrom).toContainEqual(expect.objectContaining({ label: 'Slow', state: 'inactive' }));
    expect(chipsFor('antares', 6).benefitsFrom).toContainEqual(expect.objectContaining({ label: 'Slow', state: 'missing' }));

    const atFive = evaluate(formation('caraxes', 'antares', null), {
      caraxes: { starRank: 10, dragonLevel: 16 },
      antares: { starRank: 5, dragonLevel: 16 },
    });
    const atSix = evaluate(formation('caraxes', 'antares', null), {
      caraxes: { starRank: 10, dragonLevel: 16 },
      antares: { starRank: 6, dragonLevel: 16 },
    });
    expect(atFive.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:slow')).toHaveLength(0);
    expect(atSix.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:slow')).toHaveLength(1);

    const unrestrictedPhysical = evaluate(formation('antares', 'vhagar', null), {
      antares: { starRank: 10, dragonLevel: 16 },
      vhagar: { starRank: 10, dragonLevel: 16 },
    });
    expect(
      unrestrictedPhysical.filter(
        (result) =>
          result.kind === 'amplifier-output' && result.tag === 'damage:physical' && result.dragonIds[0] === 'antares',
      ),
    ).toHaveLength(0);

    const knownNonBasicPhysical = evaluate(formation('antares', 'arrax', null), {
      antares: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
    });
    expect(
      knownNonBasicPhysical.filter(
        (result) =>
          result.kind === 'amplifier-output' && result.tag === 'damage:physical' && result.dragonIds[0] === 'antares',
      ),
    ).toHaveLength(1);
    expect(
      knownNonBasicPhysical.find(
        (result) =>
          result.kind === 'amplifier-output' && result.tag === 'damage:physical' && result.dragonIds[0] === 'antares',
      )?.explanation,
    ).toContain('non-Basic Physical Damage');
    expect(chipsFor('antares', 10).provides).toContainEqual(
      expect.objectContaining({ label: 'Non-Basic Physical Damage support', state: 'available' }),
    );
  });

  it('keeps Arrax Weakened and Bleed specific and unlocks Turn the Line at Star Rank 10', () => {
    const profile = profilesById.get('arrax')!;
    expect(profile.outputs.map((signal) => signal.tag)).toEqual(expect.arrayContaining(['damage:physical', 'status:weakened']));
    expect(profile.benefitsFrom).toContainEqual(expect.objectContaining({ tag: 'status:bleed' }));
    expect(tagSatisfies('status:weakened', 'status:control')).toBe(false);
    expect(tagSatisfies('status:bleed', 'status:control')).toBe(false);
    expect(tagSatisfies('status:bleed', 'damage:physical')).toBe(false);

    const kalspire = dragons.find((dragon) => dragon.id === 'kalspire')!;
    const arrax = dragons.find((dragon) => dragon.id === 'arrax')!;
    expect(summarizeAbility(kalspire.command).plainSummary).toContain('Applies Bleed');
    expect(summarizeAbility(arrax.command).plainSummary).toContain('Bleed improves Weakened chance');
    expect(summarizeAbility(arrax.command).plainSummary).not.toContain('Applies Bleed');

    const withBleed = evaluate(formation('kalspire', 'arrax', null), {
      kalspire: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
    });
    expect(withBleed.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:bleed')).toHaveLength(1);
    expect(withBleed.filter((result) => result.tag === 'status:control')).toHaveLength(0);
    expect(chipsFor('arrax', 10).benefitsFrom).toEqual([
      expect.objectContaining({ label: 'Bleed', state: 'missing' }),
    ]);

    const atNine = evaluate(formation('vhagar', 'arrax', null), {
      vhagar: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 9, dragonLevel: 16 },
    });
    const atTen = evaluate(formation('vhagar', 'arrax', null), {
      vhagar: { starRank: 10, dragonLevel: 16 },
      arrax: { starRank: 10, dragonLevel: 16 },
    });
    expect(atNine.filter((result) => result.kind === 'amplifier-output' && result.tag === 'damage:physical' && result.dragonIds[0] === 'arrax')).toHaveLength(0);
    expect(atTen.filter((result) => result.kind === 'amplifier-output' && result.tag === 'damage:physical' && result.dragonIds[0] === 'arrax')).toHaveLength(1);
  });

  it('adds Arulix Physical Damage and Strength compatibility only at Star Rank 6', () => {
    const atFive = chipsFor('arulix', 5);
    const atSix = chipsFor('arulix', 6);
    expect(atFive.damageProfile.map((chip) => [chip.label, chip.state])).toEqual([
      ['Physical Damage', 'inactive'],
      ['Tactical Damage', 'available'],
    ]);
    expect(atSix.damageProfile.map((chip) => chip.label)).toEqual(['Physical Damage', 'Tactical Damage']);

    const physicalSignals = profilesById.get('arulix')!.outputs.filter((signal) => signal.tag === 'damage:physical');
    expect(physicalSignals).toHaveLength(1);
    expect(physicalSignals[0]).toMatchObject({ unlock: { minimumStarRank: 6 }, scalesWith: ['stat:strength'] });
    expect(profilesById.get('arulix')!.benefitsFrom).toContainEqual(
      expect.objectContaining({ abilityId: 'arulix-battle-cunning', tag: 'stat:instinct' }),
    );
  });

  it('keeps Overwhelm and Stagger visible while rolling both up to one Control relationship', () => {
    expect(tagSatisfies('status:overwhelm', 'status:control')).toBe(true);
    expect(tagSatisfies('status:stagger', 'status:control')).toBe(true);
    const chips = chipsFor('arulix', 10).provides.map((chip) => chip.label);
    expect(chips).toEqual(expect.arrayContaining(['Overwhelm', 'Stagger', 'Control']));

    const results = evaluate(formation('arulix', 'rhysarion', null), {
      arulix: { starRank: 10, dragonLevel: 16 },
      rhysarion: { starRank: 10, dragonLevel: 16 },
    });
    expect(results.filter((result) => result.kind === 'setup-payoff' && result.tag === 'status:control')).toHaveLength(1);
  });

  it('keeps defensive, troop-gated, battlefield-only, and Mimicry mechanics out of scored simple signals', () => {
    const excludedAbilityIds = [
      'arrax-stone-bulwark',
      'arrax-adaptive-guard',
      'arrax-fire-ward',
      'arulix-iron-shell',
      'arulix-mimicry',
    ];
    const rareSignalAbilityIds = rareIds.flatMap((id) => signalsFor(id).map((signal) => signal.abilityId));
    expect(rareSignalAbilityIds).not.toEqual(expect.arrayContaining(excludedAbilityIds));
    expect(signalsFor('arulix').map((signal) => signal.tag)).not.toEqual(
      expect.arrayContaining(['status:weakened', 'status:vulnerable']),
    );

    const arrax = dragons.find((dragon) => dragon.id === 'arrax')!;
    const arulix = dragons.find((dragon) => dragon.id === 'arulix')!;
    expect(summarizeAbility(arrax.habits.find((habit) => habit.id === 'arrax-stone-bulwark')!).plainSummary).toContain(
      'Reduces Fire Damage Received',
    );
    expect(summarizeAbility(arulix.command).plainSummary).toContain('Suppresses enemy Fire Damage');
    const antares = dragons.find((dragon) => dragon.id === 'antares')!;
    expect(
      summarizeAbility(antares.habits.find((habit) => habit.id === 'antares-blazing-onslaught')!).plainSummary,
    ).toContain('Increases non-Basic Physical Damage Received');
    expect(summarizeAbility(antares.command).plainSummary).not.toContain('Applies Slow');
    expect(summarizeAbility(antares.habits.find((habit) => habit.id === 'antares-redemption')!).plainSummary).toContain(
      'Grants status immunity',
    );
    expect(summarizeAbility(arulix.habits.find((habit) => habit.id === 'arulix-mimicry')!).plainSummary).toBe(
      'Copies conditional statuses.',
    );

    const publicLabels = rareIds.flatMap((id) => {
      const chips = chipsFor(id, 10);
      return [...chips.damageProfile, ...chips.provides, ...chips.benefitsFrom].map((chip) => chip.label);
    });
    expect(publicLabels.some((label) => label.includes(':'))).toBe(false);
  });

  it('retains progression tables, discrepancies, multipliers, and unresolved wording in detailed data', () => {
    const ability = (dragonId: string, abilityId: string): AbilityDefinition => {
      const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
      return [dragon.command, dragon.trait, ...dragon.habits].find((candidate) => candidate?.id === abilityId)!;
    };

    expect(ability('antares', 'antares-blazing-onslaught').rawDescription).toContain('same target is allowed but not required');
    expect(ability('antares', 'antares-redemption').rawDescription).toContain('does not confirm cleansing');
    expect(ability('arrax', 'arrax-stone-bulwark').rawDescription).toMatch(/prose displays -2%;.*table displays -2\.5%/s);
    expect(ability('arrax', 'arrax-adaptive-guard').rawDescription).toContain('no selected troop context');
    expect(ability('arrax', 'arrax-fire-ward').rawDescription).toContain('maximum stack count is not stated');
    expect(ability('arulix', 'arulix-hypnotic-helix').rawDescription).toMatch(/rounded to 13%;.*gives 12\.5%/s);
    expect(ability('arulix', 'arulix-iron-shell').rawDescription).toMatch(/prose displays -2%;.*table displays -2\.5%/s);
    expect(ability('arulix', 'arulix-spiral-surge').rawDescription).toContain('Habit Level 5: +40% (Round 5 +60%; Round 8 +80%)');
    expect(ability('arulix', 'arulix-mimicry').rawDescription).toContain('exact branch resolution order are not stated');
  });
});
