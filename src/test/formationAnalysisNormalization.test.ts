import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { defaultSynergyRules } from '../data/synergyRules';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { analyzeFormation } from '../services/synergyEngine';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';

const preview = { previewMaxRankInteractions: true };

const formations: Record<string, FormationAnalysisInput> = {
  '2': { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  '3': { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
  '4': { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '5': { 'left-flank': 'caraxes', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '6': { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
  '7': { 'left-flank': 'syrax', vanguard: 'vermax', 'right-flank': 'caraxes' },
  '8': { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
};

function normalTraces(formationId: string, options = {}): SynergyTrace[] {
  return analyzeFormationTraces(formations[formationId]!, dragons, options).filter(isNormalSynergyTrace);
}

describe('formation analysis normalization', () => {
  it('aggregates sibling direct stat effects without losing child modifier IDs', () => {
    const warrior = normalTraces('7').find((trace) => trace.sourceAbilityId === 'vermax-warriors-zeal' && trace.ruleId === 'direct-stat-support');
    const sentinel = normalTraces('6').find((trace) => trace.sourceAbilityId === 'syrax-sentinels-wit' && trace.ruleId === 'direct-stat-support');
    const hunter = normalTraces('8').find((trace) => trace.sourceAbilityId === 'caraxes-hunters-wrath' && trace.ruleId === 'direct-stat-support');
    const clever = normalTraces('5', preview).find((trace) => trace.sourceAbilityId === 'seasmoke-clever-maneuver' && trace.ruleId === 'direct-stat-support');
    const reactive = normalTraces('7', preview).find((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support');

    expect(warrior?.explanation).toContain('Instinct and Initiative');
    expect(sentinel?.explanation).toContain('Instinct and Initiative');
    expect(hunter?.explanation).toContain('Strength and Initiative');
    expect(clever?.explanation).toContain('Intelligence by +44% and Initiative by +25%');
    expect(reactive?.explanation).toContain('Instinct by +36% and Initiative by +18%');
    expect(reactive?.modifierCapabilityIds).toEqual(expect.arrayContaining([
      'vermax-reactive-instincts-reactive-instincts-instinct-stat-dealt-modifier',
      'vermax-reactive-instincts-reactive-instincts-initiative-stat-dealt-modifier',
    ]));
  });

  it("keeps Champion's Brilliance inactive at observed Seasmoke Level 1 and exposes the failed level requirement", () => {
    for (const formationId of ['4', '5']) {
      const traces = analyzeFormationTraces(formations[formationId]!, dragons, preview);
      const champion = traces.find(
        (trace) => trace.sourceAbilityId === 'seasmoke-champions-brilliance' && trace.recipientDragonId === 'sheepstealer',
      );
      const result = analyzeFormation(formations[formationId]!, dragons, defaultSynergyRules, preview);
      const championRequirements = champion?.requirements ?? [];

      expect(champion?.status).toBe('inactive');
      expect(championRequirements.some((requirement) =>
        requirement.label.includes('Dragon Level requirement') &&
        requirement.actual === 'Level 1' &&
        requirement.expected === 'Level 16+' &&
        requirement.satisfied === false,
      )).toBe(true);
      expect(championRequirements.some((requirement) => requirement.label === 'Provider position requirement' && requirement.satisfied === true)).toBe(true);
      expect(championRequirements.some((requirement) => requirement.label === 'Position compatibility' && requirement.satisfied === true)).toBe(true);
      expect(result.unmetRequirements.map((item) => `${item.title}: ${item.description}`)).toContain(
        "Champion's Brilliance Dragon Level requirement: Seasmoke is Level 1 and requires Level 16.",
      );
    }
  });

  it('preserves defensive damage subtype and Trial by Flame threshold conditions', () => {
    const modifiers = deriveModifierCapabilities(dragons);
    expect(modifiers.find((item) => item.abilityId === 'seasmoke-champions-brilliance' && item.channel === 'damage-received')?.damageScope).toBe('all');
    expect(modifiers.find((item) => item.abilityId === 'malachite-forests-instinct' && item.channel === 'damage-received')?.damageScope).toBe('tactical');
    const trial = modifiers.filter((item) => item.abilityId === 'vermax-trial-by-flame');
    expect(trial.map((item) => item.damageScope)).toEqual(['fire', 'fire', 'fire']);
    expect(trial.map((item) => item.targetSelector.count)).toEqual([null, null, null]);
    expect(trial.map((item) => item.targetSelector.selection)).toEqual(['all-matching-condition', 'all-matching-condition', 'all-matching-condition']);
    expect(trial.flatMap((item) => item.conditions.map((condition) => condition.thresholdPercent))).toEqual([75, 50, 25]);
    expect(trial.flatMap((item) => item.conditions.map((condition) => condition.comparison))).toEqual(['below', 'below', 'below']);

    const previewTrace = normalTraces('7', preview).find((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame');
    expect(previewTrace?.title).toBe('Fire Damage Received Support');
    expect(previewTrace?.explanation).toContain('Threshold applicability depends on each recipient\'s current Troop Capacity');
    expect(previewTrace?.title).not.toBe('Damage Received Support');
  });

  it('resolves Reactive Instincts to one highest-Instinct recipient and keeps scaling selective', () => {
    const traces = normalTraces('7', preview);
    const direct = traces.find((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support');
    const scaling = traces.filter((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'stat-scaling-support');

    expect(direct?.recipientDragonId).toBe('syrax');
    expect(traces.filter((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support')).toHaveLength(1);
    expect(scaling.every((trace) => trace.recipientDragonId === 'syrax')).toBe(true);
  });

  it('groups Lightning Strike as one adjacent target selection when Malachite is Vanguard', () => {
    const grouped = normalTraces('2', preview).find((trace) => trace.sourceAbilityId === 'malachite-lightning-strike' && trace.targetSelectionGroup);

    expect(grouped?.explanation).toBe('Lightning Strike can target one adjacent ally. Eligible recipients: Seasmoke and Sheepstealer. The selected recipient is not guaranteed.');
    expect(grouped?.targetSelectionGroup).toMatchObject({
      targetCount: 1,
      eligibleRecipientDragonIds: ['seasmoke', 'sheepstealer'],
      selectionUncertain: true,
    });
    expect(normalTraces('2', preview).filter((trace) =>
      trace.sourceAbilityId === 'malachite-lightning-strike' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.recipientDragonId,
    )).toHaveLength(0);
  });

  it('keeps source ability identity, internal scope, and canonical display names', () => {
    const formation1 = normalTraces('3', preview);
    expect(formation1.find((trace) => trace.sourceAbilityId === 'vermax-spreading-blaze')?.title).toBe('Spreading Blaze Support');
    expect(formation1.find((trace) => trace.sourceAbilityId === 'vermax-rallying-flame')?.title).toBe('Rallying Flame Support');

    const allPreview = analyzeFormationTraces(formations['8']!, dragons, preview);
    expect(allPreview.some((trace) => trace.interactionScope === 'internal')).toBe(true);
    expect(allPreview.filter(isNormalSynergyTrace).some((trace) => trace.interactionScope === 'internal')).toBe(false);
    expect(JSON.stringify(allPreview.filter(isNormalSynergyTrace))).toContain("Syrax's Blazing Fury");
    expect(JSON.stringify(allPreview.filter(isNormalSynergyTrace))).not.toContain("syrax's Blazing Fury");
  });
});
