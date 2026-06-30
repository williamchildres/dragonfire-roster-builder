import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

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

function exportTraces() {
  const traces = currentTraces();
  const exportData = createSynergyAuditExport(formation, traces, pass14Roster());
  return exportData.traces;
}

function findTrace(traces: SynergyTrace[], predicate: (trace: SynergyTrace) => boolean): SynergyTrace {
  const trace = traces.find(predicate);
  expect(trace).toBeDefined();
  return trace!;
}

describe('Resilient Bond technical-analysis reasons pass 14C', () => {
  it('keeps the adjacent-ally selection deterministic without activation wording', () => {
    const traces = exportTraces();
    const statusTrace = findTrace(traces, (trace) =>
      trace.id.startsWith('defensive-target-selection-feskar-resilient-bond-resilient-bond-adjacent-stack') &&
      trace.exactResultUnknownReason?.includes('selected ally identity') === true,
    );

    expect(statusTrace.status).toBe('active');
    expect(statusTrace.sourceAbilityId).toBe('feskar-resilient-bond');
    expect(traceText(statusTrace)).toContain('At Start of combat, exactly one eligible adjacent ally is selected; the selected ally identity is unresolved.');
    expect(traceText(statusTrace)).toContain('resilient-bond-persistent-ally');
    expect(traceText(statusTrace)).toContain('Grants 1 Resilient Bond stack.');
    expect(traceText(statusTrace)).not.toMatch(/activation success|support uptime/i);
    expect(statusTrace.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because the selected ally identity, maximum stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
  });

  it('keeps the initial Feskar stack deterministic and bounded to end of combat', () => {
    const traces = exportTraces();
    const statusTrace = findTrace(traces, (trace) =>
      trace.id.startsWith('defensive-ally-support-feskar-resilient-bond-resilient-bond-self-stack') &&
      trace.exactResultUnknownReason?.includes('maximum stack count, stack-combination behavior, and the final mitigation formula') === true,
    );

    expect(statusTrace.status).toBe('active');
    expect(statusTrace.sourceAbilityId).toBe('feskar-resilient-bond');
    expect(traceText(statusTrace)).toContain('Timing: Start of combat.');
    expect(traceText(statusTrace)).toContain('Grants 1 Resilient Bond stack.');
    expect(traceText(statusTrace)).toContain('Physical Damage Received decrease 6.5% at effective Habit Level 1.');
    expect(traceText(statusTrace)).toContain('Duration: until end of combat.');
    expect(traceText(statusTrace)).toContain('Maximum stack count is not verified.');
    expect(statusTrace.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because maximum stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
    expect(traceText(statusTrace)).not.toMatch(/activation success|modifier uptime|support uptime/i);
  });

  it('keeps the retreat-triggered stack conditional without inventing uptime language', () => {
    const traces = exportTraces();
    const statusTrace = findTrace(traces, (trace) =>
      trace.id.startsWith('defensive-ally-support-feskar-resilient-bond-resilient-bond-self-retreat-stack') &&
      trace.exactResultUnknownReason?.includes('tracked ally identity, whether that ally retreated during the previous round') === true,
    );

    expect(statusTrace.status).toBe('potential');
    expect(statusTrace.sourceAbilityId).toBe('feskar-resilient-bond');
    expect(traceText(statusTrace)).toContain('Timing: Each round.');
    expect(traceText(statusTrace)).toContain('The same adjacent ally selected at start of combat retreated in the previous round.');
    expect(traceText(statusTrace)).toContain('Grants 1 additional Resilient Bond stack.');
    expect(traceText(statusTrace)).toContain('Duration: until end of combat.');
    expect(traceText(statusTrace)).toContain('resilient-bond-adjacent-stack');
    expect(statusTrace.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
    expect(traceText(statusTrace)).not.toMatch(/activation success|modifier uptime|support uptime/i);
  });

  it('preserves the final technical-analysis trace counts and identities', () => {
    const traces = currentTraces();

    expect(traces).toHaveLength(54);
    expect(traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {})).toMatchObject({ active: 26, potential: 20, inactive: 7, blocked: 1 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });
});
