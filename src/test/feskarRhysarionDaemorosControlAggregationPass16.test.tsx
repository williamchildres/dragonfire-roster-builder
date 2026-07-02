import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const formation = {
  'left-flank': 'feskar',
  vanguard: 'rhysarion',
  'right-flank': 'daemoros',
} as const satisfies FormationAnalysisInput;

function pass16Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['feskar', 'rhysarion', 'daemoros']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function currentAnalysis() {
  const roster = pass16Roster();
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { feskar: 26, rhysarion: 26, daemoros: 26 },
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

function matchingTrace(traces: SynergyTrace[], sourceDragonId: string, title: string): SynergyTrace {
  const matches = traces.filter((trace) =>
    trace.sourceDragonId === sourceDragonId &&
    trace.title === title &&
    trace.recipientDragonId === 'rhysarion' &&
    trace.recipientAbilityId === 'rhysarion-dawnsong'
  );
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

describe('Feskar/Rhysarion/Daemoros Control aggregation pass 16', () => {
  it('keeps Control dependency traces separate while collapsing the final normal card', () => {
    const { roster, traces, presentation } = currentAnalysis();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(76);
    expect(counts).toMatchObject({ active: 33, potential: 29, inactive: 13, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const stagger = matchingTrace(traces, 'feskar', 'Stagger enables Dawnsong');
    const confusion = matchingTrace(traces, 'daemoros', 'Confusion enables Dawnsong');
    expect(stagger.status).toBe('potential');
    expect(confusion.status).toBe('potential');
    expect(stagger.sourceAbilityId).toBe('feskar-unyielding-grasp');
    expect(confusion.sourceAbilityId).toBe('daemoros-shroud-of-shadows');
    expect(traceText(stagger)).toContain('Supplied status: Stagger.');
    expect(traceText(confusion)).toContain('Supplied status: Confusion.');
    expect(traceText(stagger)).toContain('Stagger is a verified member of Control.');
    expect(traceText(confusion)).toContain('Confusion is a verified member of Control.');
    expect(stagger.id).toContain('unyielding-grasp-stagger');
    expect(confusion.id).toContain('shroud-of-shadows-confusion');
    expect(traceText(stagger)).toContain('Target: one enemy.');
    expect(traceText(stagger)).toContain('Lane scope: any lane.');
    expect(traceText(confusion)).toContain('Target: one enemy.');
    expect(traceText(confusion)).toContain('Lane scope: within adjacency.');
    expect(JSON.stringify(traces)).not.toMatch(/Burn is a verified member of Control|Panic is a verified member of Control/i);

    const exportText = JSON.stringify(createSynergyAuditExport(formation, traces, roster));
    for (const windowText of [
      'Round 2 after a successful Round 1 application',
      'Round 2 from a successful Round 2 application only if Unyielding Grasp resolves before Dawnsong that round',
      'Round 5 after a successful Round 4 application',
      'Round 5 from a successful Round 5 application only if Unyielding Grasp resolves before Dawnsong that round',
      'Round 8 after a successful Round 7 application',
      'Round 8 from a successful Round 8 application only if Unyielding Grasp resolves before Dawnsong that round',
      'Round 2 after a successful Round 1 application',
      'Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round',
      'Round 8 after a successful Round 7 application',
    ]) {
      expect(exportText).toContain(windowText);
    }

    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    expect(rhysarion.receives).toHaveLength(5);
    const cards = rhysarion.receives.filter((item) => item.effectTitle === 'Control enhances Dawnsong damage rate');
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.sourceName).toBe('Feskar and Daemoros');
    expect(card.sourceName).not.toBe('Team');
    expect(card.effectTitle).not.toMatch(/^Stagger|^Confusion|chance/i);
    expect(card.summaryLines).toEqual([
      'Unyielding Grasp checks each round: 10% chance to apply Stagger to one enemy in any lane, prioritizing Warriors; Stagger lasts 3 rounds.',
      'Shroud of Shadows checks odd-numbered rounds: 15% chance to apply Confusion to one enemy within adjacency; Confusion lasts 2 rounds.',
      'Against the same otherwise-eligible enemy with Control, Dawnsong Fire Damage Rate increases from 20% to 30%; prior-round Control may carry over, and same-round overlap requires the relevant supplier to resolve before Dawnsong.',
      'Supplier application success, eligible enemy identity, same-target overlap, and same-round action order remain unresolved.',
    ]);
    expect(card.traceIds.sort()).toEqual([stagger.id, confusion.id].sort());

    expect(card.details.join(' ')).toContain('Round 2 from a successful Round 2 application only if Unyielding Grasp resolves before Dawnsong that round');
    expect(card.details.join(' ')).toContain('Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round');
  });
});
