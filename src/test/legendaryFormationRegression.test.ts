import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
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
});
