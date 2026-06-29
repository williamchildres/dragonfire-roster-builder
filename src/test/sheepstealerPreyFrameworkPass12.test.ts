import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import {
  analyzeFormationTraces,
  isNormalSynergyTrace,
  technicalAnalysisTraceIdentity,
  traceStatusReason,
} from '../services/synergyTrace';
import type { SynergyTrace } from '../models/synergy';

const formation = {
  'left-flank': 'seasmoke',
  vanguard: 'malachite',
  'right-flank': 'sheepstealer',
} as const;

function pass12Roster() {
  const roster = createEmptyRoster(dragons);
  for (const [dragonId, level] of Object.entries({ seasmoke: 27, malachite: 26, sheepstealer: 26 })) {
    const entry = roster[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = 10;
    entry!.reignLevel = level;
  }
  return roster;
}

function currentTraces(): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, {
    roster: pass12Roster(),
    dragonLevels: { seasmoke: 27, malachite: 26, sheepstealer: 26 },
  });
}

function traceById(traces: SynergyTrace[], id: string): SynergyTrace {
  const trace = traces.find((item) => item.id === id);
  expect(trace).toBeDefined();
  return trace!;
}

function traceText(trace: SynergyTrace): string {
  return [
    trace.title,
    trace.explanation,
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
    ...trace.unresolvedQuestions,
    trace.exactResultUnknownReason ?? '',
    traceStatusReason(trace),
  ].join(' ');
}

function countOccurrences(text: string, pattern: string): number {
  return (text.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}

function abilityText(traces: SynergyTrace[], abilityId: string, predicate: (trace: SynergyTrace) => boolean): string {
  return traces
    .filter((trace) => trace.sourceAbilityId === abilityId && predicate(trace))
    .map(traceText)
    .join(' ');
}

describe('Sheepstealer Prey framework pass 12', () => {
  it('keeps the final Technical Analysis counts and trace identities stable except for the three Prey traces', () => {
    const traces = currentTraces();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(61);
    expect(counts).toMatchObject({
      active: 22,
      potential: 20,
      inactive: 14,
      blocked: 1,
      'not-applicable': 1,
      unknown: 3,
    });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });

  it("normalizes Dragon's Cunning to two adjacent enemy targets with unresolved Initiative scaling", () => {
    const traces = currentTraces();
    const direct = traceById(traces, 'enemy-damage-dealt-reduction-sheepstealer-dragons-cunning-dragons-cunning-instinct-down-stat-dealt-modifier');
    const mitigation = traceById(traces, 'enemy-mitigation-sheepstealer-dragons-cunning-dragons-cunning-instinct-down-stat-dealt-modifier-seasmoke-instinct');
    const directText = traceText(direct);
    const mitigationText = traceText(mitigation);

    expect(direct.status).toBe('active');
    expect(mitigation.status).toBe('potential');
    expect(direct.targetSelectorSummary).toContain('adjacent; 2 targets');
    expect(mitigation.targetSelectorSummary).toContain('adjacent; 2 targets');
    expect(directText).toContain('Timing: Start of Combat.');
    expect(directText).toContain('Duration: until end of combat.');
    expect(directText).toContain('Base Enemy Instinct reduction -12% at effective Habit Level 1.');
    expect(mitigationText).toContain('Base Enemy Instinct reduction -12%.');
    expect(mitigationText).toContain('Final scaled Enemy Instinct reduction is unresolved.');
    expect(directText).toContain('Scaling stat: Initiative.');
    expect(directText).toContain('Final scaled Enemy Instinct reduction is unresolved.');
    expect(directText).not.toContain('1 target');
    expect(mitigationText).toContain('Infectious Wrath is mitigated by target Instinct.');
    expect(mitigationText).toContain('affected-enemy overlap with the Physical Damage target');
    expect(mitigationText).toContain('final Initiative scaling or mitigation formula');

    const cards = buildFormationCardPresentation(formation, dragons, traces);
    const dragonCunningCards = cards.cards.flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === "Dragon's Cunning");
    expect(dragonCunningCards.some((item) => /Base Enemy Instinct -12% on 2 adjacent enemy targets/i.test(item.summary))).toBe(true);
    expect(dragonCunningCards.some((item) => /Initiative/i.test([item.summary, item.detail, ...item.effects].join(' ')))).toBe(true);
    expect(dragonCunningCards.some((item) => /unresolved/i.test([item.summary, item.detail, ...item.effects].join(' ')))).toBe(true);
    expect(dragonCunningCards.some((item) => /2 .*enemy targets/i.test([item.summary, ...item.effects].join(' ')))).toBe(true);
    expect(dragonCunningCards.every((item) => !/1 enemy target/i.test([item.summary, ...item.effects].join(' ')))).toBe(true);
  });

  it('repairs the persistent Prey reference lifecycle trace without downstream runtime facts', () => {
    const prey = traceById(currentTraces(), 'persistent-marked-target-sheepstealer-prey');
    const text = traceText(prey);

    expect(prey.status).toBe('potential');
    expect(text).toContain('Wild Hunt checks each round');
    expect(text).toContain('establishes Prey only when none currently exists');
    expect(text).toContain('Establishment chance: 40%.');
    expect(text).toContain('sheepstealer-current-prey');
    expect(text).toContain('Stolen Flock, Baited Kill, Wary Beast and Savage Claim refer to that same marked enemy.');
    expect(text).toContain('Whether a current Prey already exists is unresolved.');
    expect(text).toContain('Marked-target duration, removal, transfer, and replacement behavior remain unresolved');
    expect(traceStatusReason(prey)).toContain('Current marked-target existence, establishment success, marked enemy identity, and lifecycle behavior remain unresolved.');
    expect(text).not.toMatch(/threshold tiers|overlapping tiers|final combat formula|stacking order|Current Prey is above 50%|Prey received Recovery during the previous round/i);
  });

  it('adds the three structured Prey-dependent Potential traces', () => {
    const traces = currentTraces();
    const wary = traceById(traces, 'self-status-output-sheepstealer-wary-beast-wary-beast-evade-effect-evade-status-output');
    const vulnerable = traceById(traces, 'enemy-status-output-sheepstealer-baited-kill-baited-kill-vulnerable-effect-vulnerable-status-output');
    const cleanse = traceById(traces, 'self-status-removal-sheepstealer-baited-kill-baited-kill-cleanse-effect');

    expect(wary.status).toBe('potential');
    expect(traceText(wary)).toContain('Persistent condition reference: sheepstealer-current-prey.');
    expect(traceText(wary)).toContain('Runtime condition: Current Prey is above 50% Troop Capacity.');
    expect(traceText(wary)).toContain('Target: Sheepstealer.');
    expect(traceText(wary)).toContain('Status source: Evade.');
    expect(traceText(wary)).toContain('Duration: until end of the current round.');
    expect(traceStatusReason(wary)).toBe('Current Prey existence, marked enemy identity, above-50% threshold applicability, and current-round applicability remain unresolved.');
    expect(countOccurrences(traceText(wary), 'Duration: until end of the current round.')).toBe(1);
    expect((traceText(wary).match(/effective Habit Level 1/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(isNormalSynergyTrace(wary)).toBe(false);
    expect(traceText(wary)).not.toMatch(/final formula|stack count/i);

    expect(vulnerable.status).toBe('potential');
    expect(vulnerable.targetSelectorSummary).toContain('persistent-target-reference');
    expect(vulnerable.targetSelectorSummary).toContain('sheepstealer-current-prey');
    expect(vulnerable.targetSelectorSummary).toContain('1 target');
    expect(vulnerable.targetSelectorSummary).not.toMatch(/\bany\b|unknown count|dynamic target count/i);
    expect(traceText(vulnerable)).toContain('Target count: 1.');
    expect(traceText(vulnerable)).toContain('Persistent target reference: sheepstealer-current-prey.');
    expect(traceText(vulnerable)).toContain('Current marked-target identity is unresolved.');
    expect(traceText(vulnerable)).toContain('Status application chance: 25% at effective Habit Level 1.');
    expect(traceText(vulnerable)).toContain('Conditional chance multiplier: 2x when prey received Recovery during the previous round.');
    expect(traceText(vulnerable)).toContain('Resulting activation chance under that condition: 50% at effective Habit Level 1.');
    expect(traceStatusReason(vulnerable)).toBe('Current Prey existence and identity, previous-round Recovery state, activation-chance branch selection, application success, and status refresh behavior remain unresolved.');
    expect(vulnerable.exactResultUnknownReason).toBe('Vulnerable application remains conditional because current Prey existence and identity, whether the Prey received Recovery during the previous round, which known activation-chance branch applies, application success, and Vulnerable uptime or refresh behavior remain unresolved.');
    expect(traceText(vulnerable)).not.toMatch(/Branch target count: dynamic|Exactly one conditional branch applies per enemy|independently checked enemies|arbitrary any-enemy|unknown count/i);
    expect(traceText(vulnerable)).not.toMatch(/unresolved target selection among|final damage formula|stack count/i);

    expect(cleanse.status).toBe('potential');
    expect(cleanse.matchKind).toBe('status-removal');
    expect(traceStatusReason(cleanse)).toBe('Current Prey existence, marked enemy identity, above-50% threshold applicability, qualifying self negative-effect state, activation success, and removed-effect identity remain unresolved.');
    expect(cleanse.exactResultUnknownReason).toContain('activation success at the known 50% chance');
    expect(traceText(cleanse)).toContain('Persistent condition reference: sheepstealer-current-prey.');
    expect(traceText(cleanse)).toContain('Runtime condition: Current Prey is above 50% Troop Capacity.');
    expect(traceText(cleanse)).toContain('Runtime condition: Negative effect was applied by an enemy and reduces Sheepstealer Damage Dealt.');
    expect(traceText(cleanse)).toContain('Activation chance: 50% at effective Habit Level 1.');
    expect(traceText(cleanse)).toContain('Which qualifying negative effect is removed is unresolved.');
    expect(traceText(cleanse)).not.toContain('Target is Sheepstealer Prey.');
    expect(isNormalSynergyTrace(cleanse)).toBe(false);
    expect(traceText(cleanse)).not.toMatch(/status application|final damage|Recovery formula|stacking/i);
  });

  it('uses non-stack Advantage wording while preserving real Stolen Flock stack mechanics', () => {
    const traces = currentTraces();
    const advantageText = [
      abilityText(traces, 'seasmoke-loyal-bond', (trace) => trace.ruleId === 'outgoing-effect-amplification'),
      abilityText(traces, 'malachite-thunderous-roar', (trace) => trace.ruleId === 'outgoing-effect-amplification'),
    ].join(' ');
    const stolenFlockText = abilityText(traces, 'sheepstealer-stolen-flock', () => true);

    expect(advantageText).toContain('Damage Dealt increase 20%.');
    expect(advantageText).toContain('Activation chance: 10% at effective Habit Level 1.');
    expect(advantageText).toContain('Duration: 2 rounds.');
    expect(advantageText).not.toMatch(/\bstack\b|\bstacks\b|per stack|final stack count/i);
    expect(abilityText(traces, 'malachite-thunderous-roar', () => true)).not.toMatch(/threshold|overlapping tiers/i);

    expect(stolenFlockText).toContain('Shared stack pool: stolen-flock.');
    expect(stolenFlockText).toContain('Maximum stacks: 10.');
    expect(stolenFlockText).toContain('Value per stack at effective Habit Level 1: 3% Fire Damage Dealt.');
    expect(stolenFlockText).toContain('Maximum theoretical modifier at effective Habit Level 1: 30% Fire Damage Dealt.');
  });

  it('deduplicates Loyal Bond Resistance facts and uses defensive modifier terminology', () => {
    const traces = currentTraces();
    const resistance = traces.filter((trace) =>
      trace.sourceAbilityId === 'seasmoke-loyal-bond' &&
      trace.ruleId === 'defensive-ally-support'
    );
    expect(resistance.map((trace) => trace.recipientDragonId).sort()).toEqual(['malachite', 'sheepstealer']);
    for (const trace of resistance) {
      const semantic = 'Resistance reduces Damage Received by 20%.';
      expect(trace.effects.filter((effect) => effect === semantic)).toHaveLength(1);
      expect(trace.matchedFacts.filter((fact) => fact === semantic)).toHaveLength(0);
      expect(traceText(trace)).not.toMatch(/Damage Received decrease 20%|Each recipient below 50% Troop Capacity may receive Resistance/i);
      expect(traceText(trace)).not.toMatch(/unresolved recipient selection|overlapping tiers|status application to an enemy/i);
      expect(traceStatusReason(trace)).toContain('Threshold branch applicability');
      expect(traceStatusReason(trace)).toContain('exact boundary behavior');
      expect(traceStatusReason(trace)).toContain('activation success');
      expect(traceStatusReason(trace)).toContain('modifier uptime');
      expect(traceStatusReason(trace)).toContain('final formula');
    }

    const forest = traces.filter((trace) =>
      trace.sourceAbilityId === 'malachite-forests-instinct' &&
      trace.ruleId === 'defensive-ally-support'
    );
    expect(forest.map((trace) => trace.recipientDragonId).sort()).toEqual(['seasmoke', 'sheepstealer']);
    for (const trace of forest) {
      expect(traceText(trace)).toContain('Tactical Damage Received decrease 8% at effective Habit Level 1.');
      expect(traceText(trace)).toContain('Activation chance: 35%.');
      expect(traceText(trace)).toContain('Duration: 2 rounds.');
      expect(traceStatusReason(trace)).toContain('Activation success');
      expect(traceStatusReason(trace)).toContain('support uptime');
      expect(traceStatusReason(trace)).not.toMatch(/status application|status uptime/i);
    }
  });

  it('keeps Wary Beast Recovery reduction active with all-three-enemy coverage and no false uncertainty', () => {
    const trace = traceById(currentTraces(), 'enemy-received-reduction-sheepstealer-wary-beast-wary-beast-recovery-received-down-recovery-received-modifier');
    const text = traceText(trace);

    expect(trace.status).toBe('active');
    expect(trace.targetSelectorSummary).toContain('3 targets');
    expect(text).toContain('Recovery Received decrease 10% at effective Habit Level 1.');
    expect(text).toContain('Timing: Start of Combat.');
    expect(text).toContain('Duration: until end of combat.');
    expect(text).toContain('Exact final Recovery calculation or modifier-combination formula remains unresolved.');
    expect(text).not.toMatch(/activation.*unresolved|coverage.*unresolved|target state|uptime|stacking/i);
  });
});
