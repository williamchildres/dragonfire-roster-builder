import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { createEmptyRoster } from '../services/rosterStorage';

const formation = {
  'left-flank': 'shadowsong',
  vanguard: 'feskar',
  'right-flank': 'vaeldra',
} as const satisfies FormationAnalysisInput;

function pass14Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['shadowsong', 'feskar', 'vaeldra']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function currentTraces(): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, {
    roster: pass14Roster(),
    dragonLevels: { shadowsong: 26, feskar: 26, vaeldra: 26 },
  });
}

function exportTraces() {
  const traces = currentTraces();
  const exportData = createSynergyAuditExport(formation, traces, pass14Roster());
  return exportData.traces;
}

describe('Resilient Bond retreat technical-analysis pass 14E', () => {
  it('keeps the retreat trace conditional lead and a single exact-result reason', () => {
    const traces = exportTraces();
    const retreatTraces = traces.filter((trace) => trace.id.includes('resilient-bond-self-retreat-stack'));
    expect(retreatTraces).toHaveLength(1);
    expect(retreatTraces[0]!.status).toBe('potential');
    expect(retreatTraces[0]!.modifier?.sourceEffectId).toBe('resilient-bond-self-retreat-stack');
    expect(retreatTraces[0]!.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');

    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(57);
    expect(traces).toHaveLength(57);
  }, 10000);
});
