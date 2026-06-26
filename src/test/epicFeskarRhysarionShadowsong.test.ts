import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
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
import { resolveEffectiveHabitLevel } from '../services/habitLevels';
import { createEmptyRoster } from '../services/rosterStorage';

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

function ownedRoster(dragonIds: string[], starRank = 10, habitLevel: 0 | 1 | 2 | 3 | 4 | 5 | null | undefined = 5) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of dragonIds) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.reignLevel = 30;
    entry.starRank = starRank;
    if (habitLevel !== undefined) {
      for (const habitId of Object.keys(entry.habitLevels)) {
        entry.habitLevels[habitId] = habitLevel;
      }
    }
  }
  return roster;
}

describe('Feskar, Rhysarion, and Shadowsong Epic profiles', () => {
  it('stores metadata, affinities, observations, commands, traits, habits, and screenshot evidence', () => {
    expect(dragon('feskar')).toMatchObject({ rarity: 'Epic', breed: 'Champion', affinities: { Cavalry: 'positive', Siege: 'negative' } });
    expect(dragon('rhysarion')).toMatchObject({ rarity: 'Epic', breed: 'Champion', affinities: { Spearmen: 'positive', Shieldbearers: 'positive', Siege: 'positive' } });
    expect(dragon('shadowsong')).toMatchObject({ rarity: 'Epic', breed: 'Hunter', affinities: { Cavalry: 'positive' } });
    expect(dragon('feskar').command?.name).toBe('Calculated Assault');
    expect(dragon('rhysarion').command?.name).toBe('Dawnsong');
    expect(dragon('shadowsong').command?.name).toBe('Breath of Fire');
    expect(dragon('feskar').habits).toHaveLength(5);
    expect(dragon('rhysarion').habits).toHaveLength(5);
    expect(dragon('shadowsong').habits).toHaveLength(5);
    expect(Object.values(dragon('feskar').stats).every((value) => value === null)).toBe(true);
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'feskar')).toMatchObject({ dragonLevel: 30, starRank: 1, canonical: false, combatStats: { strength: 61.0, instinct: 102.8, intelligence: 102.8, initiative: 102.8 } });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'rhysarion')).toMatchObject({ dragonLevel: 25, starRank: 1, canonical: false });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'shadowsong')).toMatchObject({ dragonLevel: 29, starRank: 1, canonical: false });
  });

  it('models Feskar selectors, Emerald Inferno eligibility, Burn multiplier, and Resilient Bond persistent ally reference', () => {
    const command = dragon('feskar').command!;
    const highestStrength = command.schedules[0]!.effects[0]!;
    const leastTroops = command.schedules[1]!.effects[0]!;
    const emerald = habit('feskar', 'feskar-emerald-inferno').schedules[0]!.effects[0]!;
    const resilient = habit('feskar', 'feskar-resilient-bond');
    const adjacentStack = resilient.schedules[0]!.effects[1]!;
    const retreatStack = resilient.schedules[1]!.effects[0]!;

    expect(highestStrength.targetSelection).toMatchObject({ comparisonStat: 'strength', comparisonDirection: 'highest', tieBehavior: 'candidate-group' });
    expect(highestStrength.excludes).toContain('Physical Basic Attacks');
    expect(leastTroops.targetSelection).toMatchObject({ comparisonStat: 'current-troops', comparisonDirection: 'lowest', tieBehavior: 'candidate-group' });
    expect(emerald.conditions?.[0]).toMatchObject({ kind: 'target-has-output-capability', qualifyingOutput: { channel: 'physical-damage', sourceScope: 'non-basic-attacks' } });
    expect(emerald.conditionalMultipliers?.[0]?.multiplier).toBe(1.5);
    expect(emerald.conditionalMultipliers?.[0]?.directlyVerifiedValues).toEqual(expect.arrayContaining([expect.objectContaining({ level: 1, value: 60 })]));
    expect(adjacentStack.targetSelection?.references[0]).toMatchObject({ kind: 'persistent-selected-target' });
    expect(retreatStack.targetSelection?.references[0]).toMatchObject({ kind: 'persistent-selected-target', referencedEffectId: 'resilient-bond-adjacent-stack' });
    expect(retreatStack.stack?.maximumStacks).toBeNull();
    expect(adjacentStack.sourceScope).toBe('non-basic-attacks');
  });

  it('models Rhysarion Control category, other-ally exclusion, harmful friendly impairment, and shared Inspiring Melody target', () => {
    const fire = dragon('rhysarion').command!.schedules[1]!.effects[0]!;
    const echoing = habit('rhysarion', 'rhysarion-echoing-melody').schedules[0]!.effects[0]!;
    const ebbingAllies = habit('rhysarion', 'rhysarion-ebbing-fury').schedules[0]!.effects[1]!;
    const inspiring = habit('rhysarion', 'rhysarion-inspiring-melody').schedules[0]!.effects;
    const modifiers = deriveModifierCapabilities(dragons);

    expect(fire.conditionalMultipliers?.[0]?.condition).toMatchObject({ kind: 'target-has-status-category', statusCategoryId: 'control' });
    expect(echoing.includesCaster).toBe(false);
    expect(echoing.targetPriority).toBe('other-allies-excluding-self');
    expect(ebbingAllies.includesCaster).toBe(true);
    expect(modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ dragonId: 'rhysarion', abilityId: 'rhysarion-ebbing-fury', sourceEffectId: 'ebbing-fury-ally-damage-dealt-down', role: 'ally-impairment', operation: 'decrease' })]));
    expect(inspiring[0]!.targetSelection?.sharedSelectionGroupId).toBe('inspiring-melody-selected-ally');
    expect(inspiring[1]!.targetSelection?.references[0]).toMatchObject({ kind: 'same-target-as-effect', referencedEffectId: 'inspiring-melody-initiative' });
  });

  it('models Shadowsong Panic multipliers, ordered Blazing Conductor attacks, Burn periodic damage, and Scorched Earth conditional chance', () => {
    const baseFire = dragon('shadowsong').command!.schedules[0]!.effects[0]!;
    const conductorEffects = habit('shadowsong', 'shadowsong-blazing-conductor').schedules[0]!.effects;
    const scorched = habit('shadowsong', 'shadowsong-scorched-earth').schedules[0]!.effects[0]!;
    const periodic = derivePeriodicDamageDefinitions(dragons);

    expect(baseFire.conditionalMultipliers?.[0]?.multiplier).toBe(1.5);
    expect(baseFire.conditionalMultipliers?.[0]?.condition.statusId).toBe('panic');
    expect(conductorEffects.map((effect) => effect.id)).toEqual(['blazing-conductor-first-fire', 'blazing-conductor-first-burn', 'blazing-conductor-second-fire', 'blazing-conductor-second-burn']);
    expect(conductorEffects[2]!.targetSelection?.references[0]).toMatchObject({ kind: 'distinct-from-effect-target', referencedEffectId: 'blazing-conductor-first-fire' });
    expect(conductorEffects[1]!.activationRoll?.chanceByHabitLevel.map((value) => value.value)).toEqual([40, 52, 64, 80, 100]);
    expect(conductorEffects[3]!.activationRoll?.chanceByHabitLevel.map((value) => value.value)).toEqual([20, 26, 32, 40, 50]);
    expect(periodic).toEqual(expect.arrayContaining([expect.objectContaining({ dragonId: 'shadowsong', abilityId: 'shadowsong-blazing-conductor', statusId: 'burn', channel: 'fire-damage', damageRateFixed: 20 })]));
    expect(scorched.activationRoll?.targetStatusConditionalChances[0]).toMatchObject({ statusId: 'panic', multiplier: 2 });
    expect(scorched.activationRoll?.targetStatusConditionalChances[0]?.chanceByHabitLevel.map((value) => value.value)).toEqual([20, 24, 28, 34, 40]);
  });

  it('derives required interaction traces without assigning enemy effects to friendly recipients', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong']);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceDragonId: 'feskar', recipientDragonId: 'rhysarion', matchKind: 'status-condition-enablement', sourceAbilityId: 'feskar-unyielding-grasp', recipientAbilityId: 'rhysarion-dawnsong' }),
      expect.objectContaining({ sourceDragonId: 'rhysarion', matchKind: 'friendly-impairment', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'rhysarion' }),
      expect.objectContaining({ sourceDragonId: 'rhysarion', matchKind: 'friendly-impairment', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'feskar' }),
      expect.objectContaining({ sourceDragonId: 'shadowsong', matchKind: 'enemy-damage-received-increase', sourceAbilityId: 'shadowsong-blazing-onslaught', recipientDragonId: null }),
      expect.objectContaining({ sourceDragonId: 'shadowsong', matchKind: 'periodic-status-damage', sourceAbilityId: 'shadowsong-blazing-conductor', recipientDragonId: null }),
    ]));
    expect(cards.cards.find((card) => card.dragonId === 'rhysarion')?.provides.some((item) => /friendly impairment/i.test(item.title))).toBe(true);
    expect(cards.cards.some((card) => card.receives.some((item) => /Vulnerable|Burn periodic|enemy.*vulnerability/i.test(item.title)))).toBe(false);
  });

  it('derives Panic to Scorched Earth and preserves source-scope regressions', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'daemoros', vanguard: 'shadowsong', 'right-flank': 'feskar' };
    const roster = ownedRoster(['daemoros', 'shadowsong', 'feskar']);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const outputs = deriveOutputCapabilities(dragons);
    const modifiers = deriveModifierCapabilities(dragons);
    const physicalOutput = outputs.find((output) => output.dragonId === 'venator' && output.abilityId === 'venator-feral-precision' && output.channel === 'physical-damage')!;
    const basicOutput = { ...physicalOutput, id: 'synthetic-basic-physical', sourceScope: 'basic-attacks' as const };
    const shadowsongModifiers = modifiers.filter((modifier) => modifier.abilityId === 'shadowsong-blazing-onslaught');
    const temptingPhysical = shadowsongModifiers.find((modifier) => modifier.channel === 'physical-damage')!;

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceDragonId: 'daemoros', recipientDragonId: 'shadowsong', matchKind: 'status-condition-enablement', recipientAbilityId: 'shadowsong-scorched-earth' }),
      expect.objectContaining({ sourceDragonId: 'daemoros', recipientDragonId: 'shadowsong', matchKind: 'status-condition-enablement', recipientAbilityId: 'shadowsong-breath-of-fire' }),
    ]));
    expect(shadowsongModifiers.map((modifier) => [modifier.channel, modifier.sourceScope, modifier.sourceEffectId])).toContainEqual(['physical-damage', 'non-basic-attacks', 'blazing-onslaught-physical']);
    expect(sourceScopesCompatible(temptingPhysical.sourceScope, physicalOutput.sourceScope)).toBe(true);
    expect(sourceScopesCompatible(temptingPhysical.sourceScope, basicOutput.sourceScope)).toBe(false);
  });

  it('keeps unlocked Habit default Level 1 behavior available for the new batch', () => {
    expect(resolveEffectiveHabitLevel({ unlockStarRank: 2, starRank: 2, savedLevel: undefined })).toBe(1);
    expect(resolveEffectiveHabitLevel({ unlockStarRank: 10, starRank: 1, savedLevel: undefined })).toBeNull();
    expect(resolveEffectiveHabitLevel({ unlockStarRank: 10, starRank: 10, savedLevel: 3 })).toBe(3);
  });

  it('does not create periodic damage traces for non-periodic Control and Resistance statuses', () => {
    const periodic = derivePeriodicDamageDefinitions(dragons);
    const statuses = deriveStatusOutputCapabilities(dragons);

    expect(periodic.some((item) => item.statusId === 'stagger' || item.statusId === 'confusion' || item.statusId === 'resistance')).toBe(false);
    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'feskar', statusId: 'stagger' }),
      expect.objectContaining({ dragonId: 'shadowsong', statusId: 'vulnerable' }),
    ]));
  });

  it('presents Ebbing Fury Round 4 self-Recovery and Round 1 friendly impairment details', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 2, null);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });
    const recoveryTraces = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.channel === 'recovery');
    const impairmentTraces = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.matchKind === 'friendly-impairment');
    const enemyReduction = traces.find((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.matchKind === 'enemy-damage-dealt-reduction');

    expect(habit('rhysarion', 'rhysarion-ebbing-fury').schedules.map((schedule) => schedule.id)).toEqual([
      'ebbing-fury-round-one-debuffs',
      'ebbing-fury-round-four-recovery',
    ]);
    expect(recoveryTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    for (const trace of recoveryTraces) {
      const text = [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ');
      expect(text).toContain('Timing: Start of Round 4.');
      expect(text).toContain('Recovery Rate: 25% at effective Habit Level 1.');
      expect(text).toContain('Ranked progression: L1 25%, L2 30%, L3 35%, L4 42.5%, L5 50%.');
      expect(text).toContain('Enhanced by Rhysarion Strength.');
      expect(text).toContain('Targets exactly 3 Allies; caster is eligible.');
      expect(text).toContain('Final Recovery amount remains unknown.');
    }

    const rhysarionCard = cards.cards.find((card) => card.dragonId === 'rhysarion');
    const selfRecovery = rhysarionCard?.provides.find((item) =>
      item.sourceDragonId === 'rhysarion' &&
      item.recipientDragonId === 'rhysarion' &&
      item.abilityName === 'Ebbing Fury' &&
      /Recovery Rate: 25%/.test([...item.summaryLines, ...item.details, ...item.effects].join(' ')),
    );
    expect(selfRecovery).toBeDefined();
    expect(rhysarionCard?.receives.some((item) => item.sourceDragonId === 'rhysarion' && item.recipientDragonId === 'rhysarion' && item.abilityName === 'Ebbing Fury')).toBe(false);

    expect(impairmentTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    for (const trace of impairmentTraces) {
      const text = [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ');
      expect(text).toContain('Timing: Start of Round 1.');
      expect(text).toContain('Duration: 3 rounds.');
      expect(text).toContain('Damage Dealt reduction at current effective level: 27.5%.');
      expect(text).toContain('harm');
      expect(text).not.toMatch(/\bbenefit\b|amplification/i);
    }
    expect(enemyReduction).toMatchObject({ recipientDragonId: null, interactionScope: 'enemy-side' });
  });
});
