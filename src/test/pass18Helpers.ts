import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, traceStatusReason } from '../services/synergyTrace';

export const pass18Formation = {
  'left-flank': 'kalspire',
  vanguard: 'vhagar',
  'right-flank': 'vermax',
} as const satisfies FormationAnalysisInput;

export function pass18Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['kalspire', 'vhagar', 'vermax']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

export function pass18Analysis() {
  const roster = pass18Roster();
  const traces = analyzeFormationTraces(pass18Formation, dragons, {
    roster,
    dragonLevels: { kalspire: 26, vhagar: 26, vermax: 26 },
  });
  const presentation = buildFormationCardPresentation(pass18Formation, dragons, traces, { roster, previewEnabled: false });
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
