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
import { analyzeFormationTraces } from '../services/synergyTrace';

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
    expect(cards.cards.find((card) => card.dragonId === 'rhysarion')?.provides.some((item) => /Damage Dealt reduction at current effective level: 27\.5%|harm/i.test([...item.summaryLines, ...item.details, ...item.effects].join(' ')))).toBe(true);
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
    const rhysarionProvides = rhysarionCard?.provides.filter((item) => item.abilityName === 'Ebbing Fury') ?? [];
    const groupedFriendly = rhysarionProvides.find((item) => !item.isEnemyFacing && item.targetLabel === 'Team');
    const groupedText = groupedFriendly ? [...groupedFriendly.summaryLines, ...groupedFriendly.details, ...groupedFriendly.effects].join(' ') : '';

    expect(rhysarionProvides.filter((item) => !item.isEnemyFacing)).toHaveLength(1);
    expect(rhysarionProvides.filter((item) => item.isEnemyFacing)).toHaveLength(1);
    expect(groupedFriendly).toMatchObject({
      sourceDragonId: 'rhysarion',
      recipientDragonId: null,
      recipientName: 'Team',
      abilityName: 'Ebbing Fury',
      title: 'Ebbing Fury',
    });
    expect(groupedText).toContain('Applies to Feskar, Rhysarion, and Shadowsong.');
    expect(groupedText).toContain('Timing: Start of Round 4.');
    expect(groupedText).toContain('Recovery Rate: 25% at effective Habit Level 1.');
    expect(groupedText).toContain('Enhanced by Rhysarion Strength.');
    expect(groupedText).not.toContain('Ranked progression');
    expect(groupedText).not.toMatch(/\bL[1-5]\b/);
    expect(groupedText).toContain('Ebbing Fury can harm Feskar, Rhysarion, and Shadowsong by reducing Damage Dealt by 27.5%.');
    expect(groupedText).not.toContain('Damage Dealt reduction at current effective level');
    expect((groupedText.match(/can harm/g) ?? [])).toHaveLength(1);
    expect(groupedText).not.toContain('can harm Feskar by reducing Damage Dealt');
    expect(groupedText).not.toContain('can harm Rhysarion by reducing Damage Dealt');
    expect(groupedText).not.toContain('can harm Shadowsong by reducing Damage Dealt');
    expect(rhysarionCard?.receives.some((item) => item.sourceDragonId === 'rhysarion' && item.recipientDragonId === 'rhysarion' && item.abilityName === 'Ebbing Fury')).toBe(false);
    for (const recipientId of ['feskar', 'shadowsong']) {
      const receives = cards.cards.find((card) => card.dragonId === recipientId)?.receives.filter((item) => item.abilityName === 'Ebbing Fury' && item.sourceDragonId === 'rhysarion') ?? [];
      const text = receives.map((item) => [...item.summaryLines, ...item.details, ...item.effects].join(' ')).join(' ');
      expect(receives).toHaveLength(1);
      expect(text).toContain('Recovery Rate: 25% at effective Habit Level 1.');
      expect(text).toContain('Damage Dealt reduction at current effective level: 27.5%.');
      expect(text).not.toContain('Ranked progression');
      expect(text).not.toMatch(/\bL[1-5]\b/);
    }

    expect(impairmentTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    for (const trace of impairmentTraces) {
      const text = [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ');
      expect(text).toContain('Timing: Start of Round 1.');
      expect(text).toContain('Duration: 3 rounds.');
      expect(text).toContain('Damage Dealt reduction at current effective level: 27.5%.');
      expect(text).toContain('harm');
      expect(text).not.toMatch(/\bbenefit\b|amplification/i);
    }
    expect(groupedText).toContain('Timing: Start of Round 1.');
    expect(groupedText).toContain('Duration: 3 rounds.');
    expect(groupedText).toContain('harm');
    expect(enemyReduction).toMatchObject({ recipientDragonId: null, interactionScope: 'enemy-side' });
  });

  it('keeps normal Ebbing Fury cards to the current ranked value for upgraded and preview states', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const upgradedRoster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 2, 3);
    const upgradedTraces = analyzeCapabilityAmplifications(formation, dragons, { roster: upgradedRoster });
    const upgradedCards = buildFormationCardPresentation(formation, dragons, upgradedTraces, { previewEnabled: false });
    const upgradedText = upgradedCards.cards
      .flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === 'Ebbing Fury')
      .flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');

    expect(upgradedText).toContain('Recovery Rate: 35% at effective Habit Level 3.');
    expect(upgradedText).toContain('Damage Dealt reduction at current effective level: 38.5%.');
    expect(upgradedText).not.toContain('Recovery Rate: 25%');
    expect(upgradedText).not.toContain('Damage Dealt reduction at current effective level: 27.5%.');
    expect(upgradedText).not.toContain('Ranked progression');
    expect(upgradedText).not.toMatch(/\bL[1-5]\b/);

    const previewRoster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 1, 0);
    const savedPreviewHabitLevel = previewRoster.rhysarion?.habitLevels['rhysarion-ebbing-fury'];
    const previewTraces = analyzeCapabilityAmplifications(formation, dragons, {
      roster: previewRoster,
      previewMaxRankInteractions: true,
    });
    const previewCards = buildFormationCardPresentation(formation, dragons, previewTraces, { previewEnabled: true });
    const previewText = previewCards.cards
      .flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === 'Ebbing Fury')
      .flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');

    expect(previewText).toContain('Recovery Rate: 50% at effective Habit Level 5.');
    expect(previewText).toContain('Damage Dealt reduction at current effective level: 55%.');
    expect(previewText).not.toContain('Ranked progression');
    expect(previewText).not.toMatch(/\bL[1-5]\b/);
    expect(previewRoster.rhysarion?.habitLevels['rhysarion-ebbing-fury']).toBe(savedPreviewHabitLevel);

    const technicalText = previewTraces
      .filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury')
      .flatMap((trace) => [...trace.effects, trace.explanation])
      .join(' ');
    expect(technicalText).toContain('Ranked progression: L1 25%, L2 30%, L3 35%, L4 42.5%, L5 50%.');
    expect(technicalText).toContain('Ranked progression: L1 27.5%, L2 33%, L3 38.5%, L4 46.75%, L5 55%.');
    expect(habit('rhysarion', 'rhysarion-ebbing-fury').schedules[1]?.effects[0]?.rankedValues).toHaveLength(5);
  });

  it('surfaces Resilient Bond initial self and adjacent stacks while keeping the retreat trigger conditional', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 2, null);
    const rawTraces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });
    const resilient = traces.filter((trace) => trace.sourceAbilityId === 'feskar-resilient-bond');
    const resilientModifiers = deriveModifierCapabilities(dragons)
      .filter((modifier) => modifier.abilityId === 'feskar-resilient-bond')
      .map((modifier) => [modifier.sourceEffectId, modifier.id, modifier.targetSelector.selection, modifier.targetSelector.sharedSelectionGroupId]);
    const initialSelf = resilient.find((trace) => trace.recipientDragonId === 'feskar' && trace.id.includes('resilient-bond-self-stack'));
    const initialAdjacent = resilient.find((trace) => trace.recipientDragonId === 'rhysarion' && trace.id.includes('resilient-bond-adjacent-stack'));
    const retreat = resilient.find((trace) => trace.recipientDragonId === 'feskar' && trace.id.includes('resilient-bond-self-retreat-stack'));
    const active = resilient.filter((trace) => trace.status === 'active');

    expect(resilientModifiers).toEqual(expect.arrayContaining([
      ['resilient-bond-self-stack', 'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier', 'self', null],
      ['resilient-bond-adjacent-stack', 'feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier', 'one-eligible-adjacent', 'resilient-bond-tracked-ally'],
      ['resilient-bond-self-retreat-stack', 'feskar-resilient-bond-resilient-bond-self-retreat-stack-damage-received-received-modifier', 'self', null],
    ]));
    expect(new Set(resilientModifiers.map(([, id]) => id))).toHaveProperty('size', 3);
    expect(rawTraces.filter((trace) => trace.sourceAbilityId === 'feskar-resilient-bond')
      .map((trace) => trace.modifierCapabilityId)).toEqual(expect.arrayContaining([
        'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier',
        'feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier',
        'feskar-resilient-bond-resilient-bond-self-retreat-stack-damage-received-received-modifier',
      ]));
    expect(resilient.some((trace) => trace.assumptions.includes('Structurally duplicate raw traces were collapsed.'))).toBe(false);

    expect(active.map((trace) => trace.modifierCapabilityId).sort()).toEqual([
      'feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier',
      'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier',
    ]);
    expect(initialSelf).toMatchObject({
      status: 'active',
      interactionScope: 'internal',
      modifierCapabilityId: 'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier',
    });
    expect(initialAdjacent).toMatchObject({ status: 'active', interactionScope: 'cross-dragon' });
    expect(initialAdjacent?.modifierCapabilityId).toBe('feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier');
    expect(resilient.some((trace) => trace.recipientDragonId === 'shadowsong' && trace.status !== 'inactive')).toBe(false);
    expect(retreat).toMatchObject({
      status: 'potential',
      interactionScope: 'internal',
      modifierCapabilityId: 'feskar-resilient-bond-resilient-bond-self-retreat-stack-damage-received-received-modifier',
    });

    const selfText = [...(initialSelf?.matchedFacts ?? []), ...(initialSelf?.effects ?? []), initialSelf?.explanation ?? ''].join(' ');
    const adjacentText = [...(initialAdjacent?.matchedFacts ?? []), ...(initialAdjacent?.effects ?? []), initialAdjacent?.explanation ?? ''].join(' ');
    const retreatText = [...(retreat?.matchedFacts ?? []), ...(retreat?.effects ?? []), ...(retreat?.unresolvedQuestions ?? []), retreat?.explanation ?? ''].join(' ');
    expect(selfText).toContain('Source effect ID: resilient-bond-self-stack.');
    expect(selfText).not.toMatch(/resilient-bond-adjacent-stack|retreated in the previous round|Timing: Each round/i);
    expect(adjacentText).toContain('Source effect ID: resilient-bond-adjacent-stack.');
    expect(adjacentText).toContain('Caster excluded from this target selection.');
    expect(adjacentText).toContain('Shared selected-target group: resilient-bond-tracked-ally.');
    expect(adjacentText).toContain('Resolved selected target in this formation: Rhysarion.');
    expect(adjacentText).not.toMatch(/expected self|retreated in the previous round|Timing: Each round/i);
    expect(retreatText).toContain('Source effect ID: resilient-bond-self-retreat-stack.');
    expect(retreatText).toMatch(/originally selected adjacent ally|retreated in the previous round/i);
    expect(retreatText).toContain('Tracked selected ally in this formation: Rhysarion.');
    expect(retreatText).not.toMatch(/retreat occurred|maximum \d+/i);

    const feskarCard = cards.cards.find((card) => card.dragonId === 'feskar');
    const resilientProvides = feskarCard?.provides.filter((item) => item.abilityName === 'Resilient Bond') ?? [];
    const groupedInitial = resilientProvides.find((item) => item.targetLabel === 'Feskar and Rhysarion');
    const retreatCard = resilientProvides.find((item) => item.traceIds.some((traceId) => traceId.includes('resilient-bond-self-retreat-stack')));
    const groupedText = groupedInitial ? [...groupedInitial.summaryLines, ...groupedInitial.details, ...groupedInitial.effects].join(' ') : '';

    expect(groupedInitial).toMatchObject({
      sourceDragonId: 'feskar',
      recipientDragonId: null,
      recipientName: 'Feskar and Rhysarion',
      effectTitle: 'Resilient Bond',
    });
    expect(groupedText).toContain('Timing: Start of combat.');
    expect(groupedText).toContain('Feskar and Rhysarion each gain 1 Resilient Bond stack.');
    expect(groupedText).toContain('Each stack reduces Physical Damage Received from non-Basic Attacks by 6.5% at effective Habit Level 1.');
    expect(groupedText).toContain('Duration: until end of combat.');
    expect(groupedText).toContain('Maximum stack count is unknown.');
    expect(groupedText).not.toContain('Ranked progression');
    expect(groupedText).not.toMatch(/\bL[1-5]\b|retreated in the previous round/i);
    expect(retreatCard).toBeDefined();

    const rhysarionReceives = cards.cards.find((card) => card.dragonId === 'rhysarion')?.receives.filter((item) => item.abilityName === 'Resilient Bond') ?? [];
    expect(rhysarionReceives).toHaveLength(1);
    expect(rhysarionReceives[0]?.summary).toContain('Rhysarion');
    expect(feskarCard?.receives.some((item) => item.sourceDragonId === 'feskar' && item.abilityName === 'Resilient Bond')).toBe(false);
    expect(cards.cards.find((card) => card.dragonId === 'shadowsong')?.receives.some((item) => item.abilityName === 'Resilient Bond')).toBe(false);

    const technicalText = resilient.flatMap((trace) => [...trace.effects, ...trace.matchedFacts, trace.explanation]).join(' ');
    expect(technicalText).toContain('Ranked progression: L1 6.5%, L2 7.8%, L3 9.1%, L4 11.05%, L5 13%.');
    expect(technicalText).toContain('Physical Damage Received reduction applies to non-Basic Attacks only.');
  });
});
