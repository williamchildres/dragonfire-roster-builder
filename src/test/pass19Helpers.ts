import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, traceStatusReason } from '../services/synergyTrace';

export const pass19Formation = {
  'left-flank': 'crimson',
  vanguard: 'seasmoke',
  'right-flank': 'daemoros',
} as const satisfies FormationAnalysisInput;

export function pass19Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['crimson', 'seasmoke', 'daemoros']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
  }
  roster.crimson!.reignLevel = 26;
  roster.seasmoke!.reignLevel = 27;
  roster.daemoros!.reignLevel = 26;
  return roster;
}

export function pass19Analysis() {
  const roster = pass19Roster();
  const traces = analyzeFormationTraces(pass19Formation, dragons, {
    roster,
    dragonLevels: { crimson: 26, seasmoke: 27, daemoros: 26 },
  });
  const presentation = buildFormationCardPresentation(pass19Formation, dragons, traces, { roster, previewEnabled: false });
  return { roster, traces, presentation };
}

export function traceText(trace: SynergyTrace): string {
  return [
    trace.title,
    trace.explanation,
    trace.targetSelectorSummary ?? '',
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
    ...trace.unresolvedQuestions,
    trace.exactResultUnknownReason ?? '',
    traceStatusReason(trace),
  ].join(' ');
}

export function countByStatus(traces: SynergyTrace[]) {
  return traces.reduce<Record<string, number>>((counts, trace) => {
    counts[trace.status] = (counts[trace.status] ?? 0) + 1;
    return counts;
  }, {});
}
