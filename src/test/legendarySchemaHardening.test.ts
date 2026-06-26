import { describe, expect, it } from 'vitest';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
import { statusGlossary } from '../data/statusGlossary';
import {
  analyzeCapabilityAmplifications,
  deriveModifierCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
  sourceScopesCompatible,
} from '../services/effectCapabilities';
import { buildProjectContextFiles } from '../services/projectContextExport';

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

describe('legendary schema hardening data', () => {
  it('bumps only the data/database schema and keeps roster totals stable', () => {
    const exportSet = buildProjectContextFiles({
      generatedAt: '2026-06-25T00:00:00.000Z',
      branch: 'feature/legendary-schema-hardening',
      commit: '0123456789abcdef0123456789abcdef01234567',
    });
    const context = JSON.parse(exportSet.files['project-context/dragonfire-project-context.json']!) as {
      source: { databaseVersion: string; dataSchemaVersion: number; localRosterSchemaVersion: number; gameBuild: string };
      rosterSummary: { knownRosterCount: number; detailedCombatDataCount: number; metadataOnlyCount: number; detailedCombatDataDragonIds: string[] };
    };

    expect(databaseMetadata.databaseVersion).toBe('0.6.1');
    expect(databaseMetadata.schemaVersion).toBe(11);
    expect(context.source.localRosterSchemaVersion).toBe(3);
    expect(context.source.gameBuild).toBe('26.6.53509');
    expect(context.rosterSummary).toMatchObject({
      knownRosterCount: 30,
      detailedCombatDataCount: 12,
      metadataOnlyCount: 18,
    });
    expect(context.rosterSummary.detailedCombatDataDragonIds.sort()).toEqual([
      'caraxes',
      'crimson',
      'daemoros',
      'kalspire',
      'malachite',
      'seasmoke',
      'sheepstealer',
      'syrax',
      'vaeldra',
      'venator',
      'vermax',
      'vhagar',
    ]);
  });

  it('preserves account-preview observations without making them canonical stats', () => {
    expect(dragon('crimson').stats.strength).toBeNull();
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'crimson')).toMatchObject({
      displayState: 'Not Discovered',
      combatStats: { strength: 62.2, instinct: 56.1, intelligence: 69.3, initiative: 54 },
      canonical: false,
    });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'kalspire')).toMatchObject({
      collection: { state: 'not-hatched', shardsCurrent: 5, shardsRequired: 15 },
      staminaDisplayText: '250/100',
      canonical: false,
    });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'venator')?.combatStats).toEqual({
      strength: null,
      instinct: null,
      intelligence: null,
      initiative: null,
    });
  });

  it('serializes generalized round selectors and augmentation overrides', () => {
    const crimson = dragon('crimson');
    const bloodscale = crimson.command!;
    const verminsBane = habit('crimson', 'crimson-vermins-bane');
    const venator = dragon('venator');
    const feral = venator.command!;
    const feralPrecision = habit('venator', 'venator-feral-precision');

    expect(bloodscale.schedules.find((schedule) => schedule.id === 'bloodscale-terror-stun-odd')?.roundSelector).toEqual({ kind: 'odd' });
    expect(bloodscale.schedules.find((schedule) => schedule.id === 'bloodscale-terror-fire-rounds')?.roundSelector).toEqual({ kind: 'explicit', rounds: [2, 5, 8] });
    expect(verminsBane.schedules[0]?.roundSelector).toEqual({ kind: 'even' });
    expect(habit('vhagar', 'vhagar-eclipse-cover').schedules[0]?.roundSelector).toEqual({ kind: 'range', startRound: 3, endRound: 7 });
    expect(bloodscale.augmentations[0]?.scheduleOverrides?.[0]).toMatchObject({
      id: 'vermins-bane-round-one-stun-override',
      targetScheduleId: 'bloodscale-terror-stun-odd',
      operation: 'replace-effect-roll',
    });
    expect(feral.schedules.find((schedule) => schedule.id === 'feral-strike-double-strike-rounds')?.triggerChanceFixed).toBe(30);
    expect(feral.augmentations[0]?.scheduleOverrides?.[0]).toMatchObject({
      id: 'feral-precision-double-strike-override',
      targetScheduleId: 'feral-strike-double-strike-rounds',
      operation: 'replace-effect-roll',
    });
    expect(feralPrecision.schedules[0]?.effects[0]?.rankedValues.map((value) => value.value)).toEqual([20, 24, 28, 34, 40]);
  });

  it('preserves roll scope, conditional chances, and target relationships', () => {
    const kalspireBleed = dragon('kalspire').command!.schedules[0]!.effects.find((effect) => effect.id === 'tactical-strike-bleed')!;
    const fieryTaunt = dragon('vhagar').command!.schedules.find((schedule) => schedule.id === 'fiery-bonds-taunt')!;
    const eclipse = habit('vhagar', 'vhagar-eclipse-cover').schedules[0]!;
    const feralInstances = dragon('venator').command!.schedules[0]!.effects[0]!;
    const desperateOverwhelm = habit('venator', 'venator-desperate-ambush').schedules[0]!.effects.find((effect) => effect.type === 'Overwhelm')!;

    expect(kalspireBleed.activationRoll).toMatchObject({ scope: 'independent-per-target', chanceFixed: 30 });
    expect(kalspireBleed.targetSelection?.distinctness).toBe('explicitly-another-target');
    expect(fieryTaunt.activationRoll).toMatchObject({ scope: 'unknown', chanceFixed: 25, unresolved: true });
    expect(fieryTaunt.activationRoll?.targetStatusConditionalChances[0]).toMatchObject({ statusId: 'burn', chanceFixed: 50, multiplier: 2 });
    expect(eclipse.activationRoll?.scope).toBe('schedule-shared');
    expect(feralInstances.targetSelection?.repeatedInstances).toEqual({
      count: 2,
      eachInstanceSelectsSeparately: true,
      sameTargetAllowed: true,
    });
    expect(desperateOverwhelm.targetSelection?.references[0]).toMatchObject({
      kind: 'same-target-as-effect',
      referencedEffectId: 'desperate-ambush-physical',
    });
  });

  it('models stack transitions, opposing-position targeting, and source scopes structurally', () => {
    const skywardDamage = habit('vhagar', 'vhagar-skyward-titan').schedules.find((schedule) => schedule.id === 'skyward-titan-third-stack')!.effects[0]!;
    const armorBreak = habit('venator', 'venator-armor-break').schedules[0]!.effects[0]!;
    const warriorsZeal = dragon('venator').trait!.schedules[0]!.effects.find((effect) => effect.id === 'warriors-zeal-command-habit-physical')!;
    const dragonsMight = habit('venator', 'venator-dragons-might').schedules[0]!.effects[0]!;

    expect(skywardDamage.stackTransitionTrigger).toMatchObject({
      statusId: 'bulwark',
      stackCount: 3,
      transition: 'gaining-nth-stack',
    });
    expect(armorBreak.targetScope).toBe('opposing-position');
    expect(armorBreak.targetSelection?.references[0]?.kind).toBe('opposing-position-enemy');
    expect(warriorsZeal.sourceScope).toBe('commands-and-habits');
    expect(dragonsMight.sourceScope).toBe('non-basic-attacks');
    expect(sourceScopesCompatible('commands-and-habits', 'basic-attacks')).toBe(false);
    expect(sourceScopesCompatible('non-basic-attacks', 'basic-attacks')).toBe(false);
  });

  it('derives statuses, periodic damage, and conservative cleanse interactions', () => {
    const statuses = deriveStatusOutputCapabilities(dragons);
    const periodic = derivePeriodicDamageDefinitions(dragons);
    const statusIds = new Set(statuses.map((status) => status.statusId));

    expect([...statusIds]).toEqual(expect.arrayContaining(['stun', 'taunt', 'weakened', 'bleed', 'panic', 'double-strike', 'overwhelm', 'bulwark']));
    expect(periodic).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'kalspire', statusId: 'bleed', channel: 'physical-damage' }),
      expect.objectContaining({ dragonId: 'kalspire', statusId: 'panic', channel: 'tactical-damage' }),
    ]));

    const traces = analyzeCapabilityAmplifications(
      { 'left-flank': 'syrax', vanguard: 'kalspire', 'right-flank': 'venator' },
      dragons,
      { previewMaxRankInteractions: true },
    );
    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        matchKind: 'status-removal',
        sourceDragonId: 'syrax',
        recipientDragonId: 'kalspire',
        recipientAbilityId: 'kalspire-radiant-conqueror',
      }),
    ]));
  });

  it('records action-denial and status semantics in the glossary', () => {
    expect(statusGlossary.find((entry) => entry.id === 'stun')?.definition).toContain('Basic Attacks');
    expect(statusGlossary.find((entry) => entry.id === 'overwhelm')?.definition).toContain('does not prevent Basic Attacks');
    expect(statusGlossary.find((entry) => entry.id === 'taunt')?.definition).toContain('Basic Attack against the dragon that applied Taunt');
    expect(statusGlossary.find((entry) => entry.id === 'bleed')?.definition).toContain('periodic Physical Damage');
    expect(statusGlossary.find((entry) => entry.id === 'panic')?.definition).toContain('periodic Tactical Damage');
  });

  it('derives expected new support interactions without turning self or enemy effects into teammate support', () => {
    const modifiers = deriveModifierCapabilities(dragons);
    const vhagarResilience = modifiers.find((item) => item.abilityId === 'vhagar-warriors-resilience' && item.role === 'ally-support');
    expect(vhagarResilience).toMatchObject({
      channel: 'tactical-damage',
    });
    expect(vhagarResilience?.targetSelector.position).toBe('left-flank');
    expect(modifiers.find((item) => item.abilityId === 'vhagar-battle-leader')).toMatchObject({
      sourceScope: 'non-basic-attacks',
      role: 'ally-support',
    });
    expect(modifiers.find((item) => item.abilityId === 'venator-warriors-zeal' && item.role === 'self-amplification')).toMatchObject({
      sourceScope: 'commands-and-habits',
    });
    expect(modifiers.find((item) => item.abilityId === 'venator-dragons-might')).toMatchObject({
      sourceScope: 'non-basic-attacks',
      role: 'self-amplification',
    });
    expect(modifiers.find((item) => item.abilityId === 'venator-armor-break')).toMatchObject({
      role: 'enemy-debuff',
      channel: 'physical-damage',
    });
  });
});
