import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity, traceStatusReason } from '../services/synergyTrace';

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

function findTrace(traces: SynergyTrace[], predicate: (trace: SynergyTrace) => boolean): SynergyTrace {
  const trace = traces.find(predicate);
  expect(trace).toBeDefined();
  return trace!;
}

describe('Resilient Bond retreat technical-analysis pass 14D', () => {
  it('renders the retreat-triggered stack as an additional stack without generic uptime fallback', () => {
    const traces = exportTraces();
    const retreatTraces = traces.filter((trace) => trace.id.includes('resilient-bond-self-retreat-stack'));
    expect(retreatTraces).toHaveLength(1);

    const retreat = retreatTraces[0]!;
    const text = traceText(retreat);

    expect(retreat.status).toBe('potential');
    expect(text).toContain('Source effect ID: resilient-bond-self-retreat-stack.');
    expect(text).toContain('Timing: Each round.');
    expect(text).toContain('The same adjacent ally selected at start of combat retreated in the previous round.');
    expect(text).toContain('Grants 1 additional Resilient Bond stack.');
    expect(text).toContain('Physical Damage Received decrease 6.5% at effective Habit Level 1.');
    expect(text).toContain('Duration: until end of combat.');
    expect(retreat.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
    expect(traceStatusReason(retreat)).toBe(retreat.exactResultUnknownReason);
    expect(text).toMatch(/tracked ally identity/);
    expect(text).toMatch(/whether that ally retreated during the previous round/);
    expect(text).toMatch(/maximum or final stack count/);
    expect(text).toMatch(/stack-combination behavior/);
    expect(text).toMatch(/final mitigation formula/);
    expect(text).not.toMatch(/Activation success|modifier uptime|support uptime|resulting stack duration is unresolved/i);
    expect((text.match(/Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved\./g) ?? [])).toHaveLength(1);
  });

  it('keeps the initial stack and adjacent-selection traces unchanged', () => {
    const traces = exportTraces();
    const initial = findTrace(traces, (trace) => trace.id.includes('resilient-bond-self-stack'));
    const adjacent = findTrace(traces, (trace) => trace.id.includes('resilient-bond-adjacent-stack') && trace.id.includes('defensive-target-selection'));

    expect(initial.status).toBe('active');
    expect(traceText(initial)).toContain('Grants 1 Resilient Bond stack.');
    expect(traceText(initial)).not.toContain('Grants 1 additional Resilient Bond stack.');
    expect(adjacent.status).toBe('active');
    expect(traceText(adjacent)).toContain('At Start of combat, exactly one eligible adjacent ally is selected; the selected ally identity is unresolved.');
    expect(traceText(adjacent)).toContain('resilient-bond-persistent-ally');
  });

  it('preserves the final counts and unique technical-analysis identities', () => {
    const traces = currentTraces();
    expect(traces).toHaveLength(55);
    expect(traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {})).toMatchObject({ active: 26, potential: 21, inactive: 7, blocked: 1 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });
});
