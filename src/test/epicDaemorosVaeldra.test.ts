import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
import { statusGlossary } from '../data/statusGlossary';
import type { FormationAnalysisInput } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import {
  analyzeCapabilityAmplifications,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
  sourceScopesCompatible,
} from '../services/effectCapabilities';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';

function dragon(id: string) {
  const found = dragons.find((item) => item.id === id);
  expect(found).toBeDefined();
  return found!;
}

function habit(dragonId: string, abilityId: string) {
  const found = dragon(dragonId).habits.find((item) => item.id === abilityId);
  expect(found).toBeDefined();
  return found!;
}

function roster(dragonIds: string[], level = 30, starRank = 10) {
  const current = createEmptyRoster(dragons);
  for (const dragonId of dragonIds) {
    const entry = current[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = starRank;
    entry!.reignLevel = level;
    for (const habitId of Object.keys(entry!.habitLevels)) {
      entry!.habitLevels[habitId] = 5;
    }
  }
  return current;
}

const epicFormation: FormationAnalysisInput = {
  'left-flank': 'daemoros',
  vanguard: 'vaeldra',
  'right-flank': 'vermax',
};

describe('Daemoros and Vaeldra Epic profiles', () => {
  it('stores complete Epic profiles without canonical base stats', () => {
    expect(dragon('daemoros')).toMatchObject({
      rarity: 'Epic',
      breed: 'Warrior',
      dataStatus: 'community-verified',
      affinities: { Archers: 'positive' },
    });
    expect(dragon('vaeldra')).toMatchObject({
      rarity: 'Epic',
      breed: 'Warrior',
      dataStatus: 'community-verified',
      affinities: { Spearmen: 'positive' },
    });
    expect(dragon('daemoros').command?.name).toBe('Shadowflame');
    expect(dragon('vaeldra').command?.name).toBe('Lure');
    expect(dragon('daemoros').habits).toHaveLength(5);
    expect(dragon('vaeldra').habits).toHaveLength(5);
    expect(Object.values(dragon('daemoros').stats).every((value) => value === null)).toBe(true);
    expect(Object.values(dragon('vaeldra').stats).every((value) => value === null)).toBe(true);
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'daemoros')).toMatchObject({
      dragonLevel: 30,
      starRank: 1,
      combatStats: { strength: 110.7, instinct: 84.8, intelligence: 73.4, initiative: 98.3 },
      canonical: false,
    });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'vaeldra')).toMatchObject({
      dragonLevel: 32,
      starRank: 1,
      combatStats: { strength: 108.5, instinct: 102.8, intelligence: 81.4, initiative: 89.3 },
      canonical: false,
    });
  });

  it('preserves exclusive and conditional effect structures without flattening Phantom Veil', () => {
    const phantom = habit('daemoros', 'daemoros-phantoms-veil').schedules[0]!.effects[0]!;
    const sirenBranch = habit('vaeldra', 'vaeldra-sirens-call').schedules[1]!.effects[0]!;
    const modifiers = deriveModifierCapabilities(dragons);

    expect(phantom.effectOptions).toMatchObject({
      mode: 'one-of',
      selectorMethod: 'unknown',
    });
    expect(phantom.effectOptions?.options.map((option) => option.id)).toEqual(['physical', 'tactical', 'fire']);
    expect(modifiers.filter((modifier) => modifier.abilityId === 'daemoros-phantoms-veil')).toHaveLength(0);

    expect(sirenBranch.effectOptions).toMatchObject({
      mode: 'conditional-branch',
      selectorMethod: 'condition-per-target',
    });
    expect(sirenBranch.effectOptions?.options.map((option) => option.effect.type).sort()).toEqual(['Stagger', 'Taunt']);
  });

  it('derives outputs, periodic damage, status outputs, source scopes, and successful-Taunt trigger metadata', () => {
    const outputs = deriveOutputCapabilities(dragons);
    const modifiers = deriveModifierCapabilities(dragons);
    const statuses = deriveStatusOutputCapabilities(dragons);
    const periodic = derivePeriodicDamageDefinitions(dragons);

    expect(outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'daemoros', abilityId: 'daemoros-shadowflame', channel: 'physical-damage' }),
      expect.objectContaining({ dragonId: 'vaeldra', abilityId: 'vaeldra-lure', channel: 'physical-damage', targetCount: 2 }),
    ]));
    expect(periodic).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'daemoros', statusId: 'burn', channel: 'fire-damage' }),
      expect.objectContaining({ dragonId: 'daemoros', statusId: 'panic', channel: 'tactical-damage' }),
    ]));
    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'daemoros', statusId: 'confusion' }),
      expect.objectContaining({ dragonId: 'vaeldra', statusId: 'taunt', sourceEffectId: 'sirens-call-taunt' }),
      expect.objectContaining({ dragonId: 'vaeldra', statusId: 'stagger', sourceEffectId: 'sirens-call-stagger' }),
    ]));
    const temptingPhysical = modifiers.find((item) => item.id.includes('tempting-distraction-physical'));
    const temptingFire = modifiers.find((item) => item.id.includes('tempting-distraction-fire'));
    expect(temptingPhysical).toMatchObject({
      role: 'enemy-debuff',
      channel: 'physical-damage',
      sourceScope: 'non-basic-attacks',
      statusId: null,
    });
    expect(temptingPhysical?.conditions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'successful-status-application', subject: 'target', description: 'A Taunt was successfully applied to this target.' }),
    ]));
    expect(temptingFire).toMatchObject({
      role: 'enemy-debuff',
      channel: 'fire-damage',
      sourceScope: 'all-qualifying-sources',
    });
    expect(sourceScopesCompatible('non-basic-attacks', 'basic-attacks')).toBe(false);
    expect(sourceScopesCompatible('non-basic-attacks', 'commands')).toBe(true);
  });

  it('keeps enemy-side debuffs isolated from friendly recipients', () => {
    const traces = analyzeCapabilityAmplifications(epicFormation, dragons, {
      previewMaxRankInteractions: true,
      roster: roster(['daemoros', 'vaeldra', 'vermax']),
    });
    const enemySide = traces.filter((trace) =>
      ['daemoros-instill-fear', 'daemoros-darkening-fear', 'vaeldra-ensnare', 'vaeldra-tempting-distraction'].includes(trace.sourceAbilityId ?? '')
    );

    expect(enemySide.length).toBeGreaterThan(0);
    expect(enemySide.every((trace) => trace.interactionScope === 'enemy-side')).toBe(true);
    expect(enemySide.every((trace) => trace.recipientDragonId === null || trace.matchKind === 'enemy-mitigation-reduction')).toBe(true);
  });

  it('gates Warrior traits and renders normal cards without self-only teammate support', () => {
    const currentRoster = roster(['daemoros', 'vaeldra', 'vermax', 'kalspire'], 30, 1);
    const tacticalRecipientFormation: FormationAnalysisInput = {
      'left-flank': 'kalspire',
      vanguard: 'vaeldra',
      'right-flank': 'daemoros',
    };
    const traces = analyzeFormationTraces(tacticalRecipientFormation, dragons, {
      roster: currentRoster,
      dragonLevels: { daemoros: 30, vaeldra: 30, kalspire: 30 },
      previewMaxRankInteractions: true,
    });
    const normal = traces.filter(isNormalSynergyTrace);
    const presentation = buildFormationCardPresentation(tacticalRecipientFormation, dragons, normal, { previewEnabled: true });
    const vaeldra = presentation.cards.find((card) => card.dragonId === 'vaeldra')!;
    const kalspire = presentation.cards.find((card) => card.dragonId === 'kalspire')!;

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceAbilityId: 'vaeldra-warriors-resilience',
        recipientDragonId: 'kalspire',
        status: 'active',
      }),
    ]));
    expect(vaeldra.traitStatus).toMatchObject({ abilityName: "Warrior's Resilience" });
    expect(vaeldra.provides.some((item) => item.abilityName === "Warrior's Resilience")).toBe(true);
    expect(kalspire.receives.some((item) => item.abilityName === "Warrior's Resilience")).toBe(true);

    const outsideFormation: FormationAnalysisInput = { 'left-flank': 'vaeldra', vanguard: 'vermax', 'right-flank': 'daemoros' };
    const daemorosOutsideVanguard = analyzeFormationTraces(
      outsideFormation,
      dragons,
      { roster: currentRoster, dragonLevels: { daemoros: 30, vaeldra: 30, vermax: 30 } },
    );
    const outsidePresentation = buildFormationCardPresentation(outsideFormation, dragons, daemorosOutsideVanguard, { previewEnabled: false });
    expect(outsidePresentation.cards.find((card) => card.dragonId === 'daemoros')?.traitStatus).toMatchObject({
      abilityName: "Warrior's Zeal",
      state: 'blocked',
    });
  });

  it('keeps new status glossary entries precise', () => {
    expect(statusGlossary.find((entry) => entry.id === 'confusion')?.definition).toContain('50% chance');
    expect(statusGlossary.find((entry) => entry.id === 'stagger')?.definition).toContain('Attack Modifier Commands');
    expect(statusGlossary.find((entry) => entry.id === 'stagger')?.definition).not.toContain('prevents all Commands');
  });
});
