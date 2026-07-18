import { describe, expect, it } from 'vitest';
import {
  buildFormationFilterOptions,
  buildFormationSignalChips,
  currentProgressionVisibleChips,
  type FormationSignalChip,
} from '../app/formationCardPresentation';
import { emptyFormation, type Formation } from '../services/teamShare';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { SimpleProgressionByDragonId } from '../synergy/types';

const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));
const unlockedProgression: SimpleProgressionByDragonId = Object.fromEntries(
  simpleSynergyProfiles.map((profile) => [profile.dragonId, { starRank: 10, dragonLevel: 26 }]),
);

function formation(left: string | null, vanguard: string | null, right: string | null): Formation {
  return {
    'left-flank': left,
    vanguard,
    'right-flank': right,
  };
}

function chipsFor(
  dragonId: string,
  position: keyof Formation,
  selectedFormation: Formation,
  progression: SimpleProgressionByDragonId = unlockedProgression,
) {
  return buildFormationSignalChips({
    profile: profilesById.get(dragonId),
    position,
    formation: selectedFormation,
    profiles: simpleSynergyProfiles,
    progression,
  });
}

function chip(chips: FormationSignalChip[], label: string): FormationSignalChip {
  const match = chips.find((candidate) => candidate.label === label);
  expect(match, label).toBeDefined();
  return match!;
}

describe('Formation Builder signal presentation helpers', () => {
  it('audits current damage, provides, and benefits filter categories', () => {
    const options = buildFormationFilterOptions(simpleSynergyProfiles);

    expect(options.damageProfile).toEqual(['Physical Damage', 'Fire Damage', 'Tactical Damage']);
    expect(options.provides).toEqual(
      expect.arrayContaining([
        'Fire Damage support',
        'Physical Damage support',
        'Tactical Damage support',
        'Strength support',
        'Instinct support',
        'Initiative support',
        'Intelligence support',
        'Recovery',
        'First-Strike',
        'Taunt',
        'Burn',
        'Slow',
        'Stun',
        'Stagger',
        'Applies Panic',
        'Vulnerable',
        'Control',
        'Overwhelm',
        'Confusion',
        'Weakened',
        'Grants Resistance',
        'Applies Overwhelm',
        'Applies Weakened',
        'Provides Recovery',
        'Grants First-Strike',
        'Non-Basic Physical support (prioritizes Left Flank)',
        'Tactical support (prioritizes Right Flank)',
      ]),
    );
    expect(options.provides).not.toEqual(
      expect.arrayContaining(['Fire Damage', 'Physical Damage', 'Tactical Damage']),
    );
    expect(options.benefitsFrom).toEqual(
      expect.arrayContaining([
        'Burn',
        'Recovery',
        'Initiative support',
        'Intelligence support',
        'Vulnerable',
        'First-Strike',
        'Control',
        'Slow',
        'Panic',
        'Bleed',
        'Benefits from Vulnerable',
        'Resistance doubles Recovery',
        'Deals double damage to enemies with Panic',
      ]),
    );
  });

  it('derives Damage Profile from active damage outputs and marks supported versus available', () => {
    const selected = formation('malachite', 'sheepstealer', 'caraxes');

    const caraxes = chipsFor('caraxes', 'right-flank', selected);
    expect(chip(caraxes.damageProfile, 'Fire Damage')).toMatchObject({ state: 'supported' });

    const malachite = chipsFor('malachite', 'left-flank', selected);
    expect(chip(malachite.damageProfile, 'Tactical Damage')).toMatchObject({ state: 'available' });
  });

  it('keeps unused Malachite Physical and Tactical support neutral in the reviewed formation', () => {
    const selected = formation('malachite', 'sheepstealer', 'caraxes');
    const malachite = chipsFor('malachite', 'left-flank', selected);

    expect(chip(malachite.provides, 'Physical Damage support')).toMatchObject({ state: 'available' });
    expect(chip(malachite.provides, 'Tactical Damage support')).toMatchObject({ state: 'available' });
    expect(chip(malachite.provides, 'Fire Damage support')).toMatchObject({ state: 'used' });
    expect(chip(malachite.provides, 'Recovery')).toMatchObject({ state: 'used' });
  });

  it('marks Syrax, Vhagar, and Caraxes setup benefits as satisfied where current providers exist', () => {
    const selected = formation('syrax', 'vhagar', 'caraxes');

    const vhagar = chipsFor('vhagar', 'vanguard', selected);
    expect(chip(vhagar.benefitsFrom, 'Burn')).toMatchObject({ state: 'satisfied' });

    const caraxes = chipsFor('caraxes', 'right-flank', selected);
    expect(chip(caraxes.benefitsFrom, 'First-Strike')).toMatchObject({ state: 'satisfied' });
    expect(chip(caraxes.provides, 'Slow')).toMatchObject({ state: 'used' });
    expect(caraxes.provides.find((signal) => signal.label === 'Control')).toBeUndefined();
  });

  it('keeps progression locking independent from position causes without changing canonical collections', () => {
    const selected = formation(null, null, 'caraxes');
    const lockedCaraxesOutsideVanguard = chipsFor('caraxes', 'right-flank', selected, {
      caraxes: { starRank: 10, dragonLevel: 15 },
    });

    expect(chip(lockedCaraxesOutsideVanguard.provides, 'Strength support')).toMatchObject({
      state: 'inactive',
      inactiveCause: 'position',
      inactiveCauses: ['position', 'dragon-level'],
      progressionLocked: true,
    });
    expect(currentProgressionVisibleChips(lockedCaraxesOutsideVanguard.provides)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Strength support' }),
    ]));

    const lockedCaraxes = chipsFor('caraxes', 'vanguard', formation(null, 'caraxes', null), {
      caraxes: { starRank: 10, dragonLevel: 15 },
    });
    expect(chip(lockedCaraxes.provides, 'Strength support')).toMatchObject({
      state: 'inactive',
      inactiveCause: 'dragon-level',
      inactiveCauses: ['dragon-level'],
      progressionLocked: true,
    });
    expect(currentProgressionVisibleChips(lockedCaraxes.provides)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Strength support' }),
    ]));

    const unlockedCaraxesOutsideVanguard = chipsFor('caraxes', 'right-flank', selected, {
      caraxes: { starRank: 10, dragonLevel: 16 },
    });
    expect(chip(unlockedCaraxesOutsideVanguard.provides, 'Strength support')).toMatchObject({
      state: 'inactive',
      inactiveCause: 'position',
      inactiveCauses: ['position'],
      progressionLocked: false,
    });
    expect(currentProgressionVisibleChips(unlockedCaraxesOutsideVanguard.provides)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Strength support', progressionLocked: false }),
    ]));

    const everyInitiativeSourceLocked = chipsFor('syrax', 'left-flank', formation('syrax', null, null), {
      syrax: { starRank: 1, dragonLevel: 15 },
    });
    expect(chip(everyInitiativeSourceLocked.provides, 'Initiative support')).toMatchObject({
      inactiveCause: 'position',
      inactiveCauses: ['position', 'dragon-level'],
      progressionLocked: true,
    });
    expect(currentProgressionVisibleChips(everyInitiativeSourceLocked.provides)).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Initiative support' }),
    ]));

    const positionBlockedInitiativeSource = chipsFor('syrax', 'left-flank', formation('syrax', null, null), {
      syrax: { starRank: 1, dragonLevel: 16 },
    });
    expect(chip(positionBlockedInitiativeSource.provides, 'Initiative support')).toMatchObject({
      state: 'inactive',
      inactiveCause: 'position',
      progressionLocked: false,
    });
    expect(chip(positionBlockedInitiativeSource.provides, 'Initiative support').reason).toContain('requires Vanguard');
    expect(currentProgressionVisibleChips(positionBlockedInitiativeSource.provides)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Initiative support', progressionLocked: false }),
    ]));

    const activeInitiativeSource = chipsFor('syrax', 'left-flank', formation('syrax', null, null), {
      syrax: { starRank: 4, dragonLevel: 16 },
    });
    expect(chip(activeInitiativeSource.provides, 'Initiative support')).toMatchObject({
      state: 'available',
      progressionLocked: false,
    });
    expect(currentProgressionVisibleChips(activeInitiativeSource.provides)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Initiative support', state: 'available' }),
    ]));
  });

  it('returns no signals for metadata-only dragons without inventing tags', () => {
    expect(
      buildFormationSignalChips({
        profile: undefined,
        position: 'left-flank',
        formation: emptyFormation(),
        profiles: simpleSynergyProfiles,
        progression: {},
      }),
    ).toEqual({ damageProfile: [], provides: [], benefitsFrom: [] });
  });
});
