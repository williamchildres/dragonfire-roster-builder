import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, traceStatusReason } from '../services/synergyTrace';

export const pass17Formation = {
  'left-flank': 'daemoros',
  vanguard: 'rhysarion',
  'right-flank': 'vaeldra',
} as const satisfies FormationAnalysisInput;

export function pass17Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['daemoros', 'rhysarion', 'vaeldra']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

export function pass17Analysis() {
  const roster = pass17Roster();
  const traces = analyzeFormationTraces(pass17Formation, dragons, {
    roster,
    dragonLevels: { daemoros: 26, rhysarion: 26, vaeldra: 26 },
  });
  const presentation = buildFormationCardPresentation(pass17Formation, dragons, traces, { roster, previewEnabled: false });
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
