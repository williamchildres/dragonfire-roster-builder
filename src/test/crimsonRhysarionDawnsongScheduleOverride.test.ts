import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { deriveStatusOutputCapabilities } from '../services/effectCapabilities';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces } from '../services/synergyTrace';

const formation = {
  'left-flank': 'daemoros',
  vanguard: 'rhysarion',
  'right-flank': 'crimson',
} as const satisfies FormationAnalysisInput;

function currentRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['daemoros', 'rhysarion', 'crimson']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
    for (const habitId of Object.keys(entry.habitLevels)) {
      entry.habitLevels[habitId] = 1;
    }
  }
  return roster;
}

function currentAnalysis() {
  const roster = currentRoster();
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { daemoros: 26, rhysarion: 26, crimson: 26 },
    previewMaxRankInteractions: false,
  });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, {
    roster,
    previewEnabled: false,
  });
  return { traces, presentation };
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

describe('Crimson Vermin\'s Bane partial Stun override feeding Dawnsong', () => {
  it('derives one Round 1 replacement Stun and retains the other odd-round base Stun attempts', () => {
    const stunOutputs = deriveStatusOutputCapabilities(dragons)
      .filter((output) => output.dragonId === 'crimson' && output.abilityId === 'crimson-bloodscale-terror' && output.statusId === 'stun');

    const roundOne = stunOutputs.filter((output) => output.sourceEffectId === 'bloodscale-terror-stun-round-one');
    const baseOdd = stunOutputs.filter((output) => output.sourceEffectId === 'bloodscale-terror-stun');

    expect(roundOne).toHaveLength(1);
    expect(baseOdd).toHaveLength(1);
    expect(roundOne[0]?.chanceFixed).toBeNull();
    expect(roundOne[0]?.chanceByHabitLevel.find((value) => value.level === 1)?.value).toBe(40);
    expect(roundOne[0]?.effectiveOverrideSourceAbilityId).toBe('crimson-vermins-bane');
    expect(baseOdd[0]?.chanceFixed).toBe(20);
    expect(baseOdd[0]?.effectiveOverrideSourceAbilityId).toBeNull();
    expect(stunOutputs.filter((output) => output.sourceEffectId === 'bloodscale-terror-stun-round-one' && output.chanceFixed === 20)).toHaveLength(0);
  });

  it('keeps complete Stun-to-Dawnsong timing and aggregates the visible Crimson card', () => {
    const { traces, presentation } = currentAnalysis();
    const stunTraces = traces.filter((trace) =>
      trace.sourceDragonId === 'crimson' &&
      trace.recipientDragonId === 'rhysarion' &&
      trace.recipientAbilityId === 'rhysarion-dawnsong' &&
      trace.title === 'Stun enables Dawnsong'
    );

    expect(stunTraces.length).toBeGreaterThanOrEqual(1);
    const stunText = stunTraces.map(traceText).join(' ');
    expect(stunText).toContain('Stun is a verified member of Control.');
    expect(stunText).toContain('Round 2 after a successful Round 1 application');
    expect(stunText).toContain('Round 5 from a successful Round 5 application only if Bloodscale Terror resolves before Dawnsong that round');
    expect(stunText).toContain('Round 8 after a successful Round 7 application');
    expect(stunText).toContain('The supplied status and dependent damage output must involve the same enemy.');
    expect(stunText).toContain('Action order within same-round overlap is unresolved.');
    expect(stunText).toContain('Supplier schedule: Start of Round 1.');
    expect(stunText).toContain('Supplier schedule: Rounds 3, 5, 7, and 9.');
    expect(stunText).not.toMatch(/Panic is a verified member of Control|Burn is a verified member of Control/i);

    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    const stunTraceIds = stunTraces.map((trace) => trace.id);
    const stunCards = rhysarion.receives.filter((item) =>
      item.sourceDragonId === 'crimson' &&
      item.recipientDragonId === 'rhysarion' &&
      item.effectTitle === 'Bloodscale Terror - Stun enhances Dawnsong damage rate'
    );
    expect(stunCards).toHaveLength(1);
    expect(stunTraceIds.every((traceId) => stunCards[0]!.traceIds.includes(traceId))).toBe(true);
    const cardText = [
      ...stunCards[0]!.summaryLines,
      ...stunCards[0]!.details,
      ...stunCards[0]!.effects,
    ].join(' ');
    expect(cardText).toContain('Effective Vermin\'s Bane Habit Level: 1');
    expect(cardText).toContain('Start of Round 1');
    expect(cardText).toContain('Rounds 3, 5, 7, and 9');
    expect(cardText).toContain('40%');
    expect(cardText).toContain('20%');
    expect(cardText).toContain('Round 2 after a successful Round 1 application');
    expect(cardText).toContain('Round 5 from a successful Round 5 application only if Bloodscale Terror resolves before Dawnsong that round');
    expect(cardText).toContain('Round 8 after a successful Round 7 application');

    const confusion = traces.find((trace) =>
      trace.sourceDragonId === 'daemoros' &&
      trace.recipientDragonId === 'rhysarion' &&
      trace.title === 'Confusion enables Dawnsong'
    );
    expect(confusion).toBeDefined();
    const confusionText = traceText(confusion!);
    expect(confusionText).toContain('Round 2 after a successful Round 1 application');
    expect(confusionText).toContain('Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round');
    expect(confusionText).toContain('Round 8 after a successful Round 7 application');

    expect(traces.some((trace) => trace.title === 'Panic enables Dawnsong')).toBe(false);
    expect(traces.some((trace) => trace.title === 'Burn enables Dawnsong')).toBe(false);
    expect(traces.some((trace) =>
      trace.sourceDragonId === 'crimson' &&
      trace.recipientDragonId === 'crimson' &&
      /Taunt/i.test(trace.title) &&
      trace.recipientAbilityId === 'crimson-bloodscale-fury'
    )).toBe(false);
  });
});
