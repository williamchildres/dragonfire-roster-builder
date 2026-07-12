import { describe, expect, it } from 'vitest';
import {
  buildFormationFilterOptions,
  buildFormationSignalChips,
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
        'Panic',
        'Vulnerable',
        'Control',
        'Overwhelm',
        'Confusion',
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
    expect(chip(caraxes.provides, 'Control')).toMatchObject({ state: 'used' });
  });

  it('keeps locked and position-blocked Vanguard Trait outputs inactive', () => {
    const selected = formation(null, null, 'caraxes');
    const caraxes = chipsFor('caraxes', 'right-flank', selected, {
      caraxes: { starRank: 10, dragonLevel: 15 },
    });

    expect(chip(caraxes.provides, 'Strength support')).toMatchObject({ state: 'inactive' });
    expect(chip(caraxes.provides, 'Initiative support').reason).toContain('requires Vanguard');
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
