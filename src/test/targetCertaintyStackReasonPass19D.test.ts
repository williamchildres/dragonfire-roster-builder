import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { traceStatusReason } from '../services/synergyTrace';
import { pass18Analysis } from './pass18Helpers';
import { pass19Analysis, traceText } from './pass19Helpers';
import { analyzeFormationTraces } from '../services/synergyTrace';

const formation = {
  'left-flank': 'malachite',
  vanguard: 'venator',
  'right-flank': 'vermax',
} as const;

function buildTargetAnalysis() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['malachite', 'venator', 'vermax'] as const) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { malachite: 26, venator: 26, vermax: 26 },
  });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { roster, traces, presentation };
}

function statusCounts(traces: ReturnType<typeof buildTargetAnalysis>['traces']) {
  return traces.reduce<Record<string, number>>((counts, trace) => {
    counts[trace.status] = (counts[trace.status] ?? 0) + 1;
    return counts;
  }, {});
}

describe('Pass 19D highest-stat certainty and stack reason routing', () => {
  it('keeps the overall Reactive Instincts selector active while leaving the Malachite consequence conditional', () => {
    const { traces, presentation } = buildTargetAnalysis();

    const overall = traces.filter((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.title === 'Stat Target Selection',
    );
    expect(overall).toHaveLength(1);
    expect(overall[0]).toMatchObject({
      status: 'active',
      channel: 'stat',
      targetSelectionGroup: {
        targetCount: 1,
        selection: 'highest-stat',
        selectionStat: 'instinct',
        selectionUncertain: true,
      },
    });
    expect(overall[0]!.targetSelectionGroup!.eligibleRecipientDragonIds).toEqual(['malachite', 'venator', 'vermax']);
    expect(overall[0]!.targetSelectionGroup!.candidateStats).toEqual([
      { dragonId: 'malachite', statId: 'instinct', value: 126.5 },
      { dragonId: 'venator', statId: 'instinct', value: null },
      { dragonId: 'vermax', statId: 'instinct', value: 73.7 },
    ]);
    expect(traceText(overall[0]!)).toContain('selected recipient is not guaranteed');

    const malachiteScaling = traces.filter((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'malachite' &&
      trace.title === 'Instinct Scaling Support' &&
      trace.matchedOutputCapabilityIds?.includes('malachite-wardens-rally-wardens-rally-tactical-damage-rate-output') &&
      trace.matchedOutputCapabilityIds?.includes('malachite-wardens-rally-wardens-rally-recovery-rate-output'),
    );
    expect(malachiteScaling).toHaveLength(1);
    expect(malachiteScaling[0]).toMatchObject({
      status: 'potential',
      channel: 'stat',
      modifierCapabilityIds: ['vermax-reactive-instincts-reactive-instincts-instinct-stat-dealt-modifier'],
      matchedOutputCapabilityIds: [
        'malachite-wardens-rally-wardens-rally-tactical-damage-rate-output',
        'malachite-wardens-rally-wardens-rally-recovery-rate-output',
      ],
    });
    expect(traceText(malachiteScaling[0]!)).toContain('This consequence applies only if Malachite resolves as the selected highest Instinct ally.');
    expect(malachiteScaling[0]!.exactResultUnknownReason).toContain('selected recipient identity, candidate comparison values, tie resolution, and final stat formula remain unresolved.');
    expect(traceText(malachiteScaling[0]!)).not.toContain('Malachite resolves as the highest Instinct recipient.');

    const collectiveMight = traces.filter((trace) =>
      trace.sourceAbilityId === 'malachite-collective-might' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'venator' &&
      !(trace.matchedModifierCapabilityIds?.length) &&
      trace.status === 'active',
    );
    expect(collectiveMight).toHaveLength(1);

    expect(presentation.cards.find((card) => card.dragonId === 'malachite')?.receives.length).toBe(8);
    expect(presentation.cards.find((card) => card.dragonId === 'malachite')?.provides.length).toBe(9);
    expect(presentation.cards.find((card) => card.dragonId === 'venator')?.receives.length).toBe(10);
    expect(presentation.cards.find((card) => card.dragonId === 'venator')?.provides.length).toBe(4);
    expect(presentation.cards.find((card) => card.dragonId === 'vermax')?.receives.length).toBe(6);
    expect(presentation.cards.find((card) => card.dragonId === 'vermax')?.provides.length).toBe(5);
  });

  it('routes Rallying Flame stack reasons through damage amplification wording', () => {
    const { traces } = buildTargetAnalysis();
    const rallying = traces.filter((trace) =>
      trace.sourceAbilityId === 'vermax-rallying-flame' &&
      trace.ruleId === 'internal-self-modifier' &&
      trace.title === 'Internal Physical Damage Dealt modifier',
    );
    expect(rallying).toHaveLength(1);
    expect(rallying[0]).toMatchObject({
      status: 'potential',
      modifierCapabilityId: 'vermax-rallying-flame-rallying-flame-stack-physical-damage-stack-modifier',
    });
    expect(rallying[0]!.modifier?.sourceEffectId).toBe('rallying-flame-stack');
    expect(traceText(rallying[0]!)).toContain('Physical Damage Dealt +5% per stack');
    expect(traceText(rallying[0]!)).toContain('maximum theoretical Physical Damage Dealt increase +20%');
    expect(traceText(rallying[0]!)).toContain('Activation chance: 50% at effective Habit Level 1.');
    expect(traceText(rallying[0]!)).toContain('initial and repeated activation success');
    expect(traceText(rallying[0]!)).toContain('enemy match count');
    expect(traceText(rallying[0]!)).toContain('current/final stack count');
    expect(traceText(rallying[0]!)).toContain('stack-combination behavior');
    expect(traceText(rallying[0]!)).toContain('final damage formula');
    expect(traceText(rallying[0]!)).toContain('once-per-match');
    expect(traceText(rallying[0]!)).toContain('Enemy deals Fire Damage');
    expect(traceText(rallying[0]!)).not.toMatch(/mitigation/i);
    expect(traceText(rallying[0]!)).not.toMatch(/incoming damage|received damage/i);
    expect(rallying[0]!.exactResultUnknownReason).toBe('Exact final Physical Damage Dealt increase cannot be calculated because initial and repeated activation success, enemy match count, current/final stack count, stack-combination behavior, and the final damage formula remain unresolved.');
  });

  it('preserves the resolved comparison control and the existing stack and routing regressions', () => {
    const { traces: controlTraces } = pass19Analysis();
    const clever = controlTraces.filter((trace) =>
      trace.sourceAbilityId === 'seasmoke-clever-maneuver' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'daemoros',
    );
    expect(clever).toHaveLength(1);
    expect(clever[0]!.status).toBe('active');
    expect(traceStatusReason(clever[0]!)).toContain('All required source, target, placement, and unlock requirements are satisfied.');
    expect(traceText(clever[0]!)).toContain('Daemoros resolves as the highest Intelligence recipient.');

    const { traces: skywardTraces } = pass18Analysis();
    const skywardStrength = skywardTraces.find((trace) => trace.sourceAbilityId === 'vhagar-skyward-titan' && trace.channel === 'stat');
    const skywardPhysical = skywardTraces.find((trace) => trace.sourceAbilityId === 'vhagar-skyward-titan' && trace.damageScope === 'physical');
    const skywardTactical = skywardTraces.find((trace) => trace.sourceAbilityId === 'vhagar-skyward-titan' && trace.damageScope === 'tactical');

    expect(skywardStrength?.modifierCapabilityId).toBe('vhagar-skyward-titan-skyward-titan-bulwark-stack-strength-stat-stack-modifier');
    expect(traceText(skywardStrength!)).toContain('Strength +5% per stack');
    expect(traceText(skywardPhysical!)).toContain('Physical Damage Received -2.5% per stack');
    expect(traceText(skywardTactical!)).toContain('Tactical Damage Received -2.5% per stack');
    expect(traceText(skywardPhysical!)).toContain('maximum theoretical reduction -12.5%');
    expect(traceText(skywardTactical!)).toContain('maximum theoretical reduction -12.5%');

    const pass19cRoster = createEmptyRoster(dragons);
    for (const dragonId of ['rhysarion', 'malachite', 'vaeldra'] as const) {
      const entry = pass19cRoster[dragonId]!;
      entry.owned = true;
      entry.collection.state = 'hatched';
      entry.starRank = 10;
      entry.reignLevel = 26;
    }
    const pass19cTraces = analyzeFormationTraces({
      'left-flank': 'rhysarion',
      vanguard: 'malachite',
      'right-flank': 'vaeldra',
    }, dragons, {
      roster: pass19cRoster,
      dragonLevels: { rhysarion: 26, malachite: 26, vaeldra: 26 },
    });
    const sentinelsPresence = pass19cTraces.find((trace) => trace.modifier?.sourceEffectId === 'sentinels-presence-recovery-dealt');
    const wiseVigor = pass19cTraces.find((trace) => trace.modifier?.sourceEffectId === 'wise-vigor-recovery');
    expect(sentinelsPresence).toBeDefined();
    expect(wiseVigor).toBeDefined();
    expect(sentinelsPresence!.exactResultUnknownReason).toBe('Exact final Recovery Dealt value cannot be calculated because modifier-combination behavior and the final Recovery formula remain unresolved.');
    expect(wiseVigor!.exactResultUnknownReason).toBe('Exact final Recovery Dealt value cannot be calculated because modifier-combination behavior and the final Recovery formula remain unresolved.');
    expect(traceText(sentinelsPresence!)).toContain('Recovery Dealt');
    expect(traceText(wiseVigor!)).toContain('Recovery Dealt');
    expect(traceText(sentinelsPresence!)).not.toMatch(/mitigated damage|final mitigation formula/i);
    expect(traceText(wiseVigor!)).not.toMatch(/mitigated damage|final mitigation formula/i);

    const currentTraces = buildTargetAnalysis().traces;
    expect(currentTraces.some((trace) => trace.title === "Warrior's Zeal Left Flank support")).toBe(false);
    expect(currentTraces.some((trace) => trace.sourceAbilityId === 'malachite-collective-might' && trace.recipientDragonId === 'venator' && trace.status === 'active')).toBe(true);

    expect(statusCounts(currentTraces)).toMatchObject({
      active: 22,
      potential: 28,
      inactive: 7,
      blocked: 1,
      'not-applicable': 1,
      unknown: 1,
    });
    expect(currentTraces).toHaveLength(60);
  });
});
