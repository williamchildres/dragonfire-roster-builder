import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { pass17Analysis } from './pass17Helpers';
import { pass18Analysis } from './pass18Helpers';
import { pass19Analysis } from './pass19Helpers';

const recoveryDealtReason = 'Exact final Recovery Dealt value cannot be calculated because modifier-combination behavior and the final Recovery formula remain unresolved.';
const recoveryReceivedReason = 'Exact final Recovery Received value cannot be calculated because modifier-combination behavior and the final received-effect formula remain unresolved.';
const statReason = 'Exact final stat value cannot be calculated because modifier-combination behavior, stacking order, and the final stat formula remain unresolved.';
const damageDealtReason = 'Exact final amplified damage cannot be calculated because modifier-combination behavior and the final damage formula remain unresolved.';
const damageReceivedReason = 'Exact final mitigated damage cannot be calculated because incoming damage, modifier-combination behavior, and the final mitigation formula remain unresolved.';

const pass19cFormation = {
  'left-flank': 'daemoros',
  vanguard: 'rhysarion',
  'right-flank': 'vaeldra',
} as const satisfies FormationAnalysisInput;

const malachiteAuditFormation = {
  'left-flank': 'rhysarion',
  vanguard: 'malachite',
  'right-flank': 'vaeldra',
} as const satisfies FormationAnalysisInput;

function buildRoster(formation: FormationAnalysisInput, dragonLevels: Record<string, number>) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of Object.values(formation)) {
    if (!dragonId) {
      continue;
    }
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = dragonLevels[dragonId] ?? 26;
  }
  return roster;
}

function analyzeFormation(
  formation: FormationAnalysisInput,
  dragonLevels: Record<string, number>,
) {
  const roster = buildRoster(formation, dragonLevels);
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels,
  });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { roster, traces, presentation };
}

function traceText(trace: SynergyTrace): string {
  return [
    trace.title,
    trace.explanation,
    trace.targetSelectorSummary ?? '',
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
    ...trace.unresolvedQuestions,
    trace.exactResultUnknownReason ?? '',
  ].join(' ');
}

function traceBySourceEffect(traces: SynergyTrace[], sourceEffectId: string): SynergyTrace {
  const matches = traces.filter((trace) => trace.modifier?.sourceEffectId === sourceEffectId);
  expect(matches, sourceEffectId).toHaveLength(1);
  return matches[0]!;
}

function countByStatus(traces: SynergyTrace[]) {
  return traces.reduce<Record<string, number>>((counts, trace) => {
    counts[trace.status] = (counts[trace.status] ?? 0) + 1;
    return counts;
  }, {});
}

describe('Pass 19C recovery-dealt reason routing', () => {
  it('keeps Recovery Dealt exact reasons separate from amplified damage for all structured Recovery Dealt modifiers', () => {
    const recoveryDealtCapabilities = deriveModifierCapabilities(dragons).filter(
      (modifier) => modifier.channel === 'recovery' && modifier.direction === 'dealt',
    );
    expect(recoveryDealtCapabilities.map((modifier) => modifier.sourceEffectId).sort()).toEqual([
      'champions-vigor-recovery-dealt',
      'sentinels-presence-recovery-dealt',
      'wise-vigor-recovery',
    ]);

    const { traces: pass19cTraces, presentation } = analyzeFormation(pass19cFormation, {
      daemoros: 26,
      rhysarion: 26,
      vaeldra: 26,
    });
    const counts = countByStatus(pass19cTraces);
    expect(pass19cTraces).toHaveLength(77);
    expect(counts.active).toBe(31);
    expect(counts.potential).toBe(36);
    expect(counts.inactive).toBe(9);
    expect(counts.blocked).toBe(1);
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(pass19cTraces.map(technicalAnalysisTraceIdentity)).size).toBe(pass19cTraces.length);

    const champion = traceBySourceEffect(pass19cTraces, 'champions-vigor-recovery-dealt');
    expect(champion).toMatchObject({
      status: 'active',
      sourceDragonId: 'rhysarion',
      sourceAbilityId: 'rhysarion-champions-vigor',
      recipientDragonId: 'rhysarion',
      recipientAbilityId: null,
      channel: 'recovery',
      modifierCapabilityIds: ['rhysarion-champions-vigor-champions-vigor-recovery-dealt-recovery-dealt-modifier'],
    });
    expect(champion.modifier?.direction).toBe('dealt');
    expect(champion.modifier?.channel).toBe('recovery');
    expect(champion.modifier?.sourceEffectId).toBe('champions-vigor-recovery-dealt');
    expect(champion.modifier?.id).toBe('rhysarion-champions-vigor-champions-vigor-recovery-dealt-recovery-dealt-modifier');
    expect(champion.effects.join(' ')).toContain('Recovery Dealt increase 15%.');
    expect(champion.exactResultUnknownReason).toBe(recoveryDealtReason);
    expect(traceText(champion)).toContain('modifier-combination behavior');
    expect(traceText(champion)).toContain('final Recovery formula');
    expect(traceText(champion)).not.toMatch(/amplified damage|final damage formula|mitigated damage|incoming damage|Recovery Received|activation success|uptime/i);

    const malachiteAudit = analyzeFormation(malachiteAuditFormation, {
      rhysarion: 26,
      malachite: 26,
      vaeldra: 26,
    });
    const sentinelsPresence = traceBySourceEffect(malachiteAudit.traces, 'sentinels-presence-recovery-dealt');
    const wiseVigor = traceBySourceEffect(malachiteAudit.traces, 'wise-vigor-recovery');

    expect(sentinelsPresence).toMatchObject({
      status: 'active',
      sourceDragonId: 'malachite',
      sourceAbilityId: 'malachite-sentinels-presence',
      recipientDragonId: 'malachite',
      recipientAbilityId: null,
      channel: 'recovery',
      modifierCapabilityIds: ['malachite-sentinels-presence-sentinels-presence-recovery-dealt-recovery-dealt-modifier'],
    });
    expect(sentinelsPresence.modifier?.direction).toBe('dealt');
    expect(sentinelsPresence.modifier?.channel).toBe('recovery');
    expect(sentinelsPresence.modifier?.sourceEffectId).toBe('sentinels-presence-recovery-dealt');
    expect(sentinelsPresence.modifier?.id).toBe('malachite-sentinels-presence-sentinels-presence-recovery-dealt-recovery-dealt-modifier');
    expect(sentinelsPresence.exactResultUnknownReason).toBe(recoveryDealtReason);
    expect(traceText(sentinelsPresence)).toContain('Recovery Dealt');
    expect(traceText(sentinelsPresence)).not.toMatch(/amplified damage|final damage formula/i);

    expect(wiseVigor).toMatchObject({
      status: 'active',
      sourceDragonId: 'malachite',
      sourceAbilityId: 'malachite-wise-vigor',
      recipientDragonId: 'malachite',
      recipientAbilityId: null,
      channel: 'recovery',
      modifierCapabilityIds: ['malachite-wise-vigor-wise-vigor-recovery-recovery-dealt-modifier'],
    });
    expect(wiseVigor.modifier?.direction).toBe('dealt');
    expect(wiseVigor.modifier?.channel).toBe('recovery');
    expect(wiseVigor.modifier?.sourceEffectId).toBe('wise-vigor-recovery');
    expect(wiseVigor.modifier?.id).toBe('malachite-wise-vigor-wise-vigor-recovery-recovery-dealt-modifier');
    expect(wiseVigor.effects.join(' ')).toContain('Recovery Dealt increase 20% at effective Habit Level 1.');
    expect(wiseVigor.exactResultUnknownReason).toBe(recoveryDealtReason);
    expect(traceText(wiseVigor)).toContain('Recovery Dealt');
    expect(traceText(wiseVigor)).not.toMatch(/amplified damage|final damage formula/i);

    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    const vaeldra = presentation.cards.find((card) => card.dragonId === 'vaeldra')!;
    const daemoros = presentation.cards.find((card) => card.dragonId === 'daemoros')!;
    expect(rhysarion.receives).toHaveLength(4);
    expect(rhysarion.provides).toHaveLength(9);
    expect(vaeldra.receives).toHaveLength(10);
    expect(vaeldra.provides).toHaveLength(10);
    expect(daemoros.receives).toHaveLength(9);
    expect(daemoros.provides).toHaveLength(12);
  });

  it('keeps typed routing controls on the existing Pass 17, Pass 18, and Pass 19 surfaces', () => {
    const { traces: pass17Traces, presentation: pass17Presentation } = pass17Analysis();
    const { traces: pass19cTraces } = analyzeFormation(pass19cFormation, {
      daemoros: 26,
      rhysarion: 26,
      vaeldra: 26,
    });
    const controlTrace = pass17Traces.find((trace) => trace.title === 'Confusion enables Dawnsong');
    expect(controlTrace).toBeDefined();
    expect(controlTrace!.status).toBe('potential');
    expect(traceText(controlTrace!)).toContain('Control category members: Stun, Stagger, Overwhelm and Confusion.');
    expect(traceText(controlTrace!)).toContain('Enhanced Fire Damage Rate: 30%.');
    expect(traceText(controlTrace!)).not.toContain('Taunt directly enhances Dawnsong');
    expect(pass17Presentation.cards.find((card) => card.dragonId === 'rhysarion')?.receives.some((item) => item.effectTitle === 'Control enhances Dawnsong damage rate')).toBe(true);

    const { traces: pass18Traces } = pass18Analysis();
    const warriorPhysical = pass18Traces.find(
      (trace) =>
        trace.sourceAbilityId === 'vermax-warriors-zeal' &&
        trace.recipientDragonId === 'vermax' &&
        trace.channel === 'physical-damage',
    );
    expect(warriorPhysical).toBeDefined();
    expect(warriorPhysical!.status).toBe('inactive');
    expect(traceText(warriorPhysical!)).toContain('Physical Damage Dealt increase 16%.');
    expect(warriorPhysical!.exactResultUnknownReason).toBe(damageDealtReason);
    expect(traceText(warriorPhysical!)).toContain('modifier-combination behavior');
    expect(traceText(warriorPhysical!)).toContain('final damage formula');

    const damageReceivedTrace = pass19cTraces.find(
      (trace) =>
        trace.sourceAbilityId === 'daemoros-phantoms-veil' &&
        trace.modifierCapabilityIds?.includes('daemoros-phantoms-veil-phantoms-veil-exclusive-defense-damage-received-received-exclusive-choice-modifier'),
    );
    expect(damageReceivedTrace).toBeDefined();
    expect(damageReceivedTrace!.exactResultUnknownReason).toBe(damageReceivedReason);
    expect(traceText(damageReceivedTrace!)).toContain('incoming damage');
    expect(traceText(damageReceivedTrace!)).toContain('final mitigation formula');

    const recoveryReceivedFormation: FormationAnalysisInput = {
      'left-flank': 'feskar',
      vanguard: 'rhysarion',
      'right-flank': 'shadowsong',
    };
    const { traces: recoveryReceivedTraces } = analyzeFormation(recoveryReceivedFormation, {
      feskar: 26,
      rhysarion: 26,
      shadowsong: 26,
    });
    const recoveryReceivedTrace = recoveryReceivedTraces.find(
      (trace) =>
        trace.matchKind === 'incoming-effect-amplification' &&
        trace.recipientAbilityId === 'rhysarion-unbroken-devotion' &&
        trace.channel === 'recovery',
    );
    expect(recoveryReceivedTrace).toBeDefined();
    expect(recoveryReceivedTrace!.exactResultUnknownReason).toBe(recoveryReceivedReason);
    expect(traceText(recoveryReceivedTrace!)).toContain('Recovery Received');
    expect(traceText(recoveryReceivedTrace!)).toContain('received-effect formula');

    const statTrace = pass19Analysis().traces.find(
      (trace) =>
        trace.modifier?.sourceEffectId === 'seasmoke-strength-flat',
    );
    expect(statTrace).toBeDefined();
    expect(statTrace!.exactResultUnknownReason).toBe(statReason);
    expect(traceText(statTrace!)).toContain('final stat formula');
    expect(traceText(statTrace!)).not.toMatch(/amplified damage|final damage formula|mitigated damage|Recovery Received/i);

    const warriorSupport = pass19cTraces.find(
      (trace) =>
        trace.sourceAbilityId === 'daemoros-warriors-zeal' &&
        trace.title === 'Instinct Scaling Support',
    );
    expect(warriorSupport).toBeDefined();
    expect(warriorSupport!.status).toBe('inactive');
    expect(traceText(warriorSupport!)).toContain('Instinct Scaling Support');
  });

  it('preserves the required Pass 19C baseline counts and formation builder counts', () => {
    const { traces, presentation } = analyzeFormation(pass19cFormation, {
      daemoros: 26,
      rhysarion: 26,
      vaeldra: 26,
    });
    const counts = countByStatus(traces);

    expect(traces).toHaveLength(77);
    expect(counts.active).toBe(31);
    expect(counts.potential).toBe(36);
    expect(counts.inactive).toBe(9);
    expect(counts.blocked).toBe(1);
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    expect(presentation.cards.find((card) => card.dragonId === 'daemoros')?.receives).toHaveLength(9);
    expect(presentation.cards.find((card) => card.dragonId === 'daemoros')?.provides).toHaveLength(12);
    expect(presentation.cards.find((card) => card.dragonId === 'rhysarion')?.receives).toHaveLength(4);
    expect(presentation.cards.find((card) => card.dragonId === 'rhysarion')?.provides).toHaveLength(9);
    expect(presentation.cards.find((card) => card.dragonId === 'vaeldra')?.receives).toHaveLength(10);
    expect(presentation.cards.find((card) => card.dragonId === 'vaeldra')?.provides).toHaveLength(10);
    expect(traces.some((trace) => trace.title === 'Confusion enables Dawnsong')).toBe(true);
    expect(traces.some((trace) => trace.title === 'Stagger enables Dawnsong')).toBe(true);
    expect(traces.some((trace) => /Lure enables Dawnsong/i.test(trace.title))).toBe(false);
    expect(traces.some((trace) => /Taunt enables Dawnsong/i.test(trace.title))).toBe(false);
  });
});
