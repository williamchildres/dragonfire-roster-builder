import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import {
  deriveOutputCapabilities,
  deriveModifierCapabilities,
  deriveStatusOutputCapabilities,
} from '../services/effectCapabilities';
import { buildProjectContextFiles } from '../services/projectContextExport';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';

const currentLevels = {
  crimson: 16,
  kalspire: 16,
  syrax: 16,
  venator: 16,
  vhagar: 16,
};

const preview = {
  previewMaxRankInteractions: true,
  dragonLevels: currentLevels,
};

function currentRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of Object.keys(currentLevels)) {
    const entry = roster[dragonId];
    if (!entry) {
      continue;
    }
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 1;
    entry.reignLevel = currentLevels[dragonId as keyof typeof currentLevels];
  }
  return roster;
}

function traces(formation: FormationAnalysisInput, usePreview = false): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, usePreview ? { ...preview, roster: currentRoster() } : { dragonLevels: currentLevels, roster: currentRoster() });
}

const legacyFormation: FormationAnalysisInput = { 'left-flank': 'venator', vanguard: 'vhagar', 'right-flank': 'syrax' };

function legacyRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['venator', 'vhagar', 'syrax']) {
    const entry = roster[dragonId];
    if (!entry) {
      continue;
    }
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function legacyTraces(): SynergyTrace[] {
  return analyzeFormationTraces(legacyFormation, dragons, {
    dragonLevels: { venator: 26, vhagar: 26, syrax: 26 },
    roster: legacyRoster(),
  });
}

function legacyPresentation() {
  const previewTraces = legacyTraces().filter(isNormalSynergyTrace);
  return buildFormationCardPresentation(legacyFormation, dragons, previewTraces, { previewEnabled: false });
}

function lockedHabitIds(): Set<string> {
  return new Set(
    dragons.flatMap((dragon) =>
      dragon.habits
        .filter((habit): habit is AbilityDefinition => Boolean(habit) && habit.unlockStarRank !== null && habit.unlockStarRank > 1)
        .map((habit) => habit.id),
    ),
  );
}

function findTrace(allTraces: SynergyTrace[], partial: Partial<SynergyTrace>): SynergyTrace | undefined {
  return allTraces.find((trace) =>
    Object.entries(partial).every(([key, value]) => trace[key as keyof SynergyTrace] === value),
  );
}

function normalTraces(formation: FormationAnalysisInput, usePreview = false): SynergyTrace[] {
  return traces(formation, usePreview).filter(isNormalSynergyTrace);
}

describe('legendary formation analysis regression fixes', () => {
  it('DF-LG-01 keeps damage outputs from acting as tactical support providers', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'kalspire', vanguard: 'vhagar', 'right-flank': 'venator' };
    const current = traces(formation);

    expect(findTrace(current, {
      sourceDragonId: 'vhagar',
      sourceAbilityId: 'vhagar-warriors-resilience',
      recipientDragonId: 'kalspire',
      matchKind: 'outgoing-effect-amplification',
      channel: 'tactical-damage',
      status: 'active',
    })).toBeDefined();

    expect(current).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceDragonId: 'kalspire',
        sourceAbilityId: 'kalspire-tactical-strike',
        matchKind: 'outgoing-effect-amplification',
        channel: 'tactical-damage',
      }),
    ]));
    expect(current).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceDragonId: 'vhagar',
        sourceAbilityId: 'vhagar-warriors-resilience',
        matchKind: 'defensive-ally-support',
        channel: 'damage-received',
      }),
    ]));
    expect(findTrace(current, {
      sourceDragonId: 'kalspire',
      sourceAbilityId: 'kalspire-champions-brilliance',
      ruleId: 'vanguard-trait-requirement',
      status: 'inactive',
    })).toBeDefined();
    expect(findTrace(current, {
      sourceDragonId: 'venator',
      sourceAbilityId: 'venator-warriors-zeal',
      ruleId: 'vanguard-trait-requirement',
      status: 'inactive',
    })).toBeDefined();

    const locked = lockedHabitIds();
    expect(current.filter((trace) => trace.status === 'active').some((trace) =>
      (trace.sourceAbilityId !== null && locked.has(trace.sourceAbilityId)) ||
      (trace.recipientAbilityId !== null && locked.has(trace.recipientAbilityId))
    )).toBe(false);
  });

  it('DF-LG-03 current mode hides preview-only chains and cross-dragon Blood Wyrm recovery matches', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'caraxes' };
    const current = traces(formation);

    expect(current).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ matchKind: 'status-condition-enablement', sourceDragonId: 'caraxes', recipientDragonId: 'vhagar' }),
      expect.objectContaining({ matchKind: 'status-condition-enablement', sourceDragonId: 'vhagar', recipientDragonId: 'crimson' }),
    ]));
    expect(current.some((trace) =>
      trace.sourceDragonId === 'caraxes' &&
      trace.sourceAbilityId === 'caraxes-blood-wyrm' &&
      (trace.recipientDragonId === 'crimson' || trace.recipientDragonId === 'vhagar') &&
      trace.matchKind === 'incoming-effect-amplification' &&
      trace.channel === 'recovery'
    )).toBe(false);
  });

  it('DF-LG-03 preview emits status enablement and typed mitigation channels without Blood Wyrm leakage', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'caraxes' };
    const previewTraces = normalTraces(formation, true);

    const burnTrace = findTrace(previewTraces, {
      sourceDragonId: 'caraxes',
      recipientDragonId: 'vhagar',
      recipientAbilityId: 'vhagar-fiery-bonds',
      matchKind: 'status-condition-enablement',
      channel: 'status',
    });
    expect(burnTrace).toBeDefined();
    expect(burnTrace?.status).toBe('potential');
    expect(burnTrace?.title).toMatch(/Burn enables Fiery Bonds/);
    expect(burnTrace?.matchedFacts.some((fact) => /25% -> 50%/.test(fact))).toBe(true);

    const tauntTrace = findTrace(previewTraces, {
      sourceDragonId: 'vhagar',
      recipientDragonId: 'crimson',
      recipientAbilityId: 'crimson-bloodscale-fury',
      matchKind: 'status-condition-enablement',
      channel: 'status',
    });
    expect(tauntTrace).toBeDefined();
    expect(tauntTrace?.status).toBe('potential');
    expect(tauntTrace?.title).toMatch(/Taunt enables Bloodscale Fury/);
    expect(tauntTrace?.matchedFacts.some((fact) => /doubled|2x/i.test(fact))).toBe(true);

    expect(previewTraces.some((trace) =>
      trace.sourceDragonId === 'caraxes' &&
      trace.sourceAbilityId === 'caraxes-blood-wyrm' &&
      (trace.recipientDragonId === 'crimson' || trace.recipientDragonId === 'vhagar') &&
      trace.matchKind === 'incoming-effect-amplification' &&
      trace.channel === 'recovery'
    )).toBe(false);

    const verminsBane = previewTraces.filter((trace) =>
      trace.sourceDragonId === 'crimson' &&
      trace.sourceAbilityId === 'crimson-vermins-bane' &&
      trace.matchKind === 'enemy-mitigation-reduction'
    );
    expect(verminsBane.map((trace) => trace.channel)).toEqual(expect.arrayContaining(['physical-damage', 'fire-damage']));
    expect(verminsBane.some((trace) => trace.channel === 'stat')).toBe(false);
    expect(verminsBane.find((trace) => trace.channel === 'physical-damage')?.effects.join(' ')).toMatch(/Instinct/);
    expect(verminsBane.find((trace) => trace.channel === 'fire-damage')?.effects.join(' ')).toMatch(/Initiative/);
  });

  it('DF-LG-05 classifies Mother\'s Mercy as potential control cleanse, not stat support', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'kalspire', vanguard: 'syrax', 'right-flank': 'vhagar' };
    const previewTraces = normalTraces(formation, true);

    expect(previewTraces).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceDragonId: 'kalspire',
        sourceAbilityId: 'kalspire-tactical-strike',
        matchKind: 'outgoing-effect-amplification',
      }),
    ]));

    const cleanseTrace = findTrace(previewTraces, {
      sourceDragonId: 'syrax',
      sourceAbilityId: 'syrax-mothers-mercy',
      recipientDragonId: 'kalspire',
      recipientAbilityId: 'kalspire-radiant-conqueror',
      matchKind: 'status-removal',
      channel: 'control',
    });
    expect(cleanseTrace).toBeDefined();
    expect(cleanseTrace?.status).toBe('potential');
    expect(cleanseTrace?.assumptions.some((assumption) => /timing, target selection/i.test(assumption))).toBe(true);

    const presentation = buildFormationCardPresentation(formation, dragons, previewTraces, { previewEnabled: true });
    const syrax = presentation.cards.find((card) => card.dragonId === 'syrax');
    const mothersMercy = syrax?.provides.find((item) => item.abilityName === "Mother's Mercy");
    expect(mothersMercy).toBeDefined();
    expect(mothersMercy?.title).toMatch(/Control cleanse/i);
    expect(mothersMercy?.summary).not.toMatch(/Stat support/i);
  });

  it('maps defensive stat reductions to the verified mitigation channels', () => {
    const crimsonFormation: FormationAnalysisInput = { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'caraxes' };
    const crimsonTraces = normalTraces(crimsonFormation, true);
    expect(crimsonTraces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceAbilityId: 'crimson-vermins-bane',
        matchKind: 'enemy-mitigation-reduction',
        channel: 'physical-damage',
      }),
      expect.objectContaining({
        sourceAbilityId: 'crimson-vermins-bane',
        matchKind: 'enemy-mitigation-reduction',
        channel: 'fire-damage',
      }),
    ]));

    const intelligenceFormation: FormationAnalysisInput = { 'left-flank': 'kalspire', vanguard: 'vhagar', 'right-flank': 'syrax' };
    expect(normalTraces(intelligenceFormation, true)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceAbilityId: 'kalspire-battle-cunning',
        matchKind: 'enemy-mitigation-reduction',
        channel: 'tactical-damage',
      }),
    ]));
  });

  it('keeps Eclipse Cover inactive at Star Rank 1 in current mode', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'kalspire' };
    const current = traces(formation);
    const eclipseTraces = current.filter((trace) => trace.sourceAbilityId === 'vhagar-eclipse-cover');

    expect(eclipseTraces.some((trace) => trace.status === 'active')).toBe(false);
    expect(eclipseTraces.some((trace) =>
      trace.status === 'active' &&
      (
        trace.matchKind === 'outgoing-effect-amplification' ||
        trace.matchKind === 'enemy-damage-dealt-reduction'
      )
    )).toBe(false);
  });

  it('surfaces Eclipse Cover status-derived modifiers and candidate targeting in preview mode', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'kalspire' };
    const previewTraces = normalTraces(formation, true);
    const statusOutputs = deriveStatusOutputCapabilities(dragons).filter((status) => status.abilityId === 'vhagar-eclipse-cover');
    const modifiers = deriveModifierCapabilities(dragons).filter((modifier) => modifier.abilityId === 'vhagar-eclipse-cover');

    expect(previewTraces.some((trace) => trace.sourceAbilityId === 'vhagar-eclipse-cover')).toBe(true);
    expect(statusOutputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ statusId: 'advantage', sourceEffectId: 'eclipse-cover-advantage' }),
      expect.objectContaining({ statusId: 'weakened', sourceEffectId: 'eclipse-cover-weakened' }),
    ]));

    const advantageModifier = modifiers.find((modifier) => modifier.statusId === 'advantage');
    const weakenedModifier = modifiers.find((modifier) => modifier.statusId === 'weakened');
    expect(advantageModifier).toMatchObject({
      channel: 'damage-dealt',
      role: 'ally-support',
      operation: 'increase',
      value: 20,
      sourceEffectId: 'eclipse-cover-advantage',
      activationGroupId: 'eclipse-cover-shared-roll',
      durationRounds: 2,
    });
    expect(advantageModifier?.targetSelector.selection).toBe('highest-resource');
    expect(advantageModifier?.targetSelector.selectionResource).toBe('current-troops');
    expect(advantageModifier?.targetSelector.comparisonDirection).toBe('highest');
    expect(advantageModifier?.targetSelector.comparisonPool).toBe('ally-side');
    expect(advantageModifier?.targetSelector.includesCaster).toBe(true);
    expect(advantageModifier?.targetSelector.tieBehavior).toBe('candidate-group');
    expect(weakenedModifier).toMatchObject({
      channel: 'damage-dealt',
      role: 'enemy-debuff',
      operation: 'decrease',
      value: 20,
      sourceEffectId: 'eclipse-cover-weakened',
      activationGroupId: 'eclipse-cover-shared-roll',
      durationRounds: 2,
    });
    expect(weakenedModifier?.targetSelector.selection).toBe('highest-resource');
    expect(weakenedModifier?.targetSelector.selectionResource).toBe('current-troops');
    expect(weakenedModifier?.targetSelector.comparisonDirection).toBe('highest');
    expect(weakenedModifier?.targetSelector.comparisonPool).toBe('enemy-side');
    expect(weakenedModifier?.targetSelector.tieBehavior).toBe('candidate-group');
    expect(advantageModifier?.activationChanceByHabitLevel?.map((value) => value.value)).toEqual([17.5, 21, 24.5, 29.8, 35]);
    expect(weakenedModifier?.activationGroupId).toBe(advantageModifier?.activationGroupId);

    const advantageTrace = previewTraces.find((trace) =>
      trace.sourceAbilityId === 'vhagar-eclipse-cover' &&
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.channel === 'damage-dealt'
    );
    expect(advantageTrace).toBeDefined();
    expect(advantageTrace?.status).toBe('potential');
    expect(advantageTrace?.recipientDragonId).toBeNull();
    expect(advantageTrace?.targetSelectionGroup).toMatchObject({
      targetCount: 1,
      selectionUncertain: true,
      selection: 'highest-resource',
      selectionResource: 'current-troops',
      comparisonDirection: 'highest',
      comparisonPool: 'ally-side',
    });
    expect(advantageTrace?.targetSelectionGroup?.eligibleRecipientDragonIds.sort()).toEqual(['crimson', 'kalspire', 'vhagar']);
    expect(advantageTrace?.matchedFacts.some((fact) => /Shared activation group: eclipse-cover-shared-roll/.test(fact))).toBe(true);
    expect(advantageTrace?.matchedFacts.some((fact) => /17.5%.*35%/.test(fact))).toBe(true);
    expect(advantageTrace?.assumptions.some((assumption) => /uptime is not calculated/i.test(assumption))).toBe(true);
    expect(advantageTrace?.assumptions.some((assumption) => /Current troop values and tie-breaking are not resolved/i.test(assumption))).toBe(true);

    const weakenedTrace = previewTraces.find((trace) =>
      trace.sourceAbilityId === 'vhagar-eclipse-cover' &&
      trace.matchKind === 'enemy-damage-dealt-reduction' &&
      trace.channel === 'damage-dealt'
    );
    expect(weakenedTrace).toMatchObject({
      status: 'potential',
      recipientDragonId: null,
      interactionScope: 'enemy-side',
      modifierRole: 'enemy-debuff',
    });
    expect(weakenedTrace?.targetSelectorSummary).toContain('selection resource current-troops');
    expect(weakenedTrace?.targetSelectorSummary).toContain('comparison pool enemy-side');
    expect(weakenedTrace?.assumptions.join(' ')).toMatch(/enemy formation members and current troop values are unavailable/i);

    const presentation = buildFormationCardPresentation(formation, dragons, previewTraces, { previewEnabled: true });
    const vhagar = presentation.cards.find((card) => card.dragonId === 'vhagar');
    expect(vhagar?.provides.some((item) => item.abilityName === 'Eclipse Cover' && /Damage Dealt Enemy Reduction/i.test(item.title))).toBe(true);
    expect(vhagar?.provides.some((item) => item.abilityName === 'Eclipse Cover' && /Damage Dealt/i.test(item.title))).toBe(true);
  });

  it('derives status modifiers only for statuses with verified Damage Dealt semantics', () => {
    const statusOutputs = deriveStatusOutputCapabilities(dragons);
    const modifiers = deriveModifierCapabilities(dragons);

    expect(statusOutputs.some((status) => status.statusId === 'advantage' && status.abilityId === 'vhagar-eclipse-cover')).toBe(true);
    expect(statusOutputs.some((status) => status.statusId === 'weakened' && status.abilityId === 'vhagar-eclipse-cover')).toBe(true);
    expect(modifiers.some((modifier) => modifier.statusId === 'advantage' && modifier.role === 'ally-support' && modifier.channel === 'damage-dealt')).toBe(true);
    expect(modifiers.some((modifier) => modifier.statusId === 'weakened' && modifier.role === 'enemy-debuff' && modifier.channel === 'damage-dealt')).toBe(true);
    expect(modifiers.some((modifier) => modifier.statusId === 'taunt' || modifier.statusId === 'burn')).toBe(false);
  });

  it('exports Eclipse Cover shared activation metadata through project context generation', () => {
    const exportSet = buildProjectContextFiles({
      generatedAt: '2026-06-25T00:00:00.000Z',
      branch: 'fix/eclipse-cover-formation-traces',
      commit: '0123456789abcdef0123456789abcdef01234567',
    });
    const vhagar = JSON.parse(exportSet.files['project-context/dragons/vhagar.json']!) as {
      modifierCapabilities: Array<{
        abilityId: string;
        statusId?: string;
        sourceEffectId?: string;
        activationGroupId?: string;
        activationChanceByHabitLevel?: Array<{ value: number }>;
        targetSelector?: {
          selectionResource?: string;
          comparisonPool?: string;
          includesCaster?: boolean | null;
        };
      }>;
      statusOutputs: Array<{ abilityId: string; statusId: string; activationGroupId?: string }>;
    };

    const eclipseModifiers = vhagar.modifierCapabilities.filter((modifier) => modifier.abilityId === 'vhagar-eclipse-cover');
    expect(eclipseModifiers.map((modifier) => modifier.statusId)).toEqual(expect.arrayContaining(['advantage', 'weakened']));
    expect(new Set(eclipseModifiers.map((modifier) => modifier.activationGroupId))).toEqual(new Set(['eclipse-cover-shared-roll']));
    expect(eclipseModifiers[0]?.activationChanceByHabitLevel?.map((value) => value.value)).toEqual([17.5, 21, 24.5, 29.8, 35]);
    expect(eclipseModifiers.find((modifier) => modifier.statusId === 'advantage')?.targetSelector).toMatchObject({
      selectionResource: 'current-troops',
      comparisonPool: 'ally-side',
      includesCaster: true,
    });
    expect(eclipseModifiers.find((modifier) => modifier.statusId === 'weakened')?.targetSelector).toMatchObject({
      selectionResource: 'current-troops',
      comparisonPool: 'enemy-side',
    });
    expect(vhagar.statusOutputs.filter((status) => status.abilityId === 'vhagar-eclipse-cover').map((status) => status.statusId)).toEqual(expect.arrayContaining(['advantage', 'weakened']));
  });

  it('keeps Strategic Revival as shared least-troops candidate Recovery and Resistance', () => {
    const allTraces = legacyTraces();
    const strategic = allTraces.filter((trace) => trace.sourceAbilityId === 'syrax-strategic-revival');
    const candidateGroups = strategic.filter((trace) => trace.targetSelectionGroup?.targetCount === 1);
    const recoveryGroup = candidateGroups.find((trace) => trace.channel === 'recovery');
    const resistanceGroup = candidateGroups.find((trace) => trace.channel === 'damage-received');

    expect(recoveryGroup?.recipientDragonId).toBeNull();
    expect(recoveryGroup?.status).toBe('potential');
    expect(recoveryGroup?.targetSelectionGroup?.targetCount).toBe(1);
    expect(recoveryGroup?.targetSelectionGroup?.selectionUncertain).toBe(true);
    expect(recoveryGroup?.targetSelectionGroup?.selectionResource).toBe('current-troops');
    expect(recoveryGroup?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['venator', 'vhagar', 'syrax']);
    expect(resistanceGroup?.recipientDragonId).toBeNull();
    expect(resistanceGroup?.status).toBe('potential');
    expect(resistanceGroup?.targetSelectionGroup?.targetCount).toBe(1);
    expect(resistanceGroup?.targetSelectionGroup?.selectionUncertain).toBe(true);
    expect(resistanceGroup?.targetSelectionGroup?.selectionResource).toBe('current-troops');
    expect(resistanceGroup?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['venator', 'vhagar', 'syrax']);
    const directStrategic = strategic.filter((trace) => trace.ruleId === 'ally-output-support' || trace.ruleId === 'defensive-ally-support');
    expect(directStrategic.some((trace) => trace.recipientDragonId === 'venator' && trace.targetSelectionGroup === undefined)).toBe(false);
    expect(directStrategic.some((trace) => trace.recipientDragonId === 'vhagar' && trace.targetSelectionGroup === undefined)).toBe(false);
    expect(directStrategic.some((trace) => trace.recipientDragonId === 'syrax' && trace.targetSelectionGroup === undefined)).toBe(false);
  });

  it('keeps Strategic Revival Resistance chance effect-specific', () => {
    const outputs = deriveOutputCapabilities(dragons).filter((item) => item.abilityId === 'syrax-strategic-revival');
    const modifiers = deriveModifierCapabilities(dragons).filter((item) => item.abilityId === 'syrax-strategic-revival');
    const recovery = outputs.find((item) => item.sourceEffectId === 'strategic-revival-recovery');
    const resistance = modifiers.find((item) => item.sourceEffectId === 'strategic-revival-resistance');

    expect(recovery).toMatchObject({ targetCount: 1 });
    expect(recovery?.conditions.map((condition) => condition.description).join(' ')).not.toContain('40%');
    expect(resistance?.durationRounds).toBe(2);
    expect(resistance?.targetSelector.includesCaster).toBe(true);
    expect(resistance?.targetSelector.sharedSelectionGroupId).toBe('strategic-revival-least-troops-ally');
    expect(resistance?.activationChanceByHabitLevel?.map((value) => value.value)).toEqual([40, 52, 64, 80, 100]);
  });

  it('keeps deterministic current Syrax and Vhagar self/team effects active', () => {
    const allTraces = legacyTraces();
    const mindful = allTraces.filter((trace) =>
      trace.sourceAbilityId === 'syrax-mindful-synergy' &&
      trace.ruleId === 'direct-stat-support'
    );
    const flight = allTraces.filter((trace) =>
      trace.sourceAbilityId === 'syrax-flight-mastery' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.channel === 'stat'
    );
    const ancestralPhysical = allTraces.find((trace) => trace.sourceAbilityId === 'vhagar-ancestral-shield' && trace.ruleId === 'internal-self-modifier' && trace.modifierCapabilityId?.includes('ancestral-shield-physical-received'));
    const ancestralTactical = allTraces.find((trace) => trace.sourceAbilityId === 'vhagar-ancestral-shield' && trace.ruleId === 'internal-self-modifier' && trace.modifierCapabilityId?.includes('ancestral-shield-tactical-received'));
    const ancestralRecovery = allTraces.find((trace) => trace.sourceAbilityId === 'vhagar-ancestral-shield' && trace.ruleId === 'internal-self-modifier' && trace.modifierCapabilityId?.includes('ancestral-shield-recovery-received'));

    expect(mindful.length).toBeGreaterThan(0);
    expect(flight.length).toBeGreaterThan(0);
    expect(mindful.every((trace) => trace.status === 'active')).toBe(true);
    expect(flight.every((trace) => trace.status === 'active')).toBe(true);
    expect(ancestralPhysical?.status).toBe('active');
    expect(ancestralTactical?.status).toBe('active');
    expect(ancestralRecovery?.status).toBe('active');
  });

  it('keeps Battle Leader as a Venator or Vhagar candidate group', () => {
    const allTraces = legacyTraces();
    const battleLeader = allTraces.find((trace) =>
      trace.sourceAbilityId === 'vhagar-battle-leader' &&
      trace.targetSelectionGroup?.targetCount === 1
    );

    expect(battleLeader?.recipientDragonId).toBeNull();
    expect(battleLeader?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['venator', 'vhagar']);
    expect(battleLeader?.targetSelectionGroup?.selectionUncertain).toBe(true);
    expect(battleLeader?.matchedOutputCapabilityIds?.some((id) => id.startsWith('vhagar-'))).toBe(true);
    expect(battleLeader?.targetSelectionGroup?.eligibleRecipientDragonIds).not.toContain('syrax');
  });

  it('keeps unresolved projected benefits conditional while source traces remain active', () => {
    const presentation = legacyPresentation();
    const vhagar = presentation.cards.find((card) => card.dragonId === 'vhagar');
    const venator = presentation.cards.find((card) => card.dragonId === 'venator');
    const syrax = presentation.cards.find((card) => card.dragonId === 'syrax');

    const battleLeader = vhagar?.provides.find((item) => item.abilityName === 'Battle Leader');
    const strategic = syrax?.provides.filter((item) => item.abilityName === 'Strategic Revival') ?? [];
    const armorBreak = venator?.provides.find((item) => item.abilityName === 'Armor Break');
    const huntersBane = venator?.provides.find((item) => item.abilityName === "Hunter's Bane");
    const flightMasteryEnemy = syrax?.provides.find((item) => item.abilityName === 'Flight Mastery' && item.isEnemyFacing);
    const eclipseCover = vhagar?.provides.find((item) => item.abilityName === 'Eclipse Cover');

    expect(battleLeader?.state).toBe('conditional');
    expect(battleLeader?.summary).toContain('Target not guaranteed');
    expect(strategic.every((item) => item.state === 'conditional')).toBe(true);
    expect(strategic.every((item) => item.summary.includes('Target not guaranteed'))).toBe(true);
    expect(armorBreak?.state).toBe('conditional');
    expect(huntersBane?.state).toBe('conditional');
    expect(flightMasteryEnemy?.state).toBe('conditional');
    expect(eclipseCover?.state).toBe('conditional');

    const battleLeaderTrace = legacyTraces().find((trace) =>
      trace.sourceAbilityId === 'vhagar-battle-leader' &&
      trace.targetSelectionGroup?.targetCount === 1
    );
    expect(battleLeaderTrace?.status).toBe('active');
  });

  it('does not report Recovery Received source-scope as incompatible for Strategic Revival and Ancestral Shield', () => {
    const allTraces = legacyTraces();
    const amplification = allTraces.find((trace) =>
      trace.matchKind === 'incoming-effect-amplification' &&
      trace.sourceAbilityId === 'syrax-strategic-revival' &&
      trace.recipientAbilityId === 'vhagar-ancestral-shield'
    );

    expect(amplification).toBeDefined();
    expect(amplification?.status).toBe('potential');
    expect(amplification?.sourceScopeResults?.every((match) => match.sourceScopeCompatible)).toBe(true);
  });
});
