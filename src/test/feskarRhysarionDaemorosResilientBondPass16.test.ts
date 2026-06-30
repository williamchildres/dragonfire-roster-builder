import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
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

function currentTraces() {
  const roster = pass16Roster();
  return analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { feskar: 26, rhysarion: 26, daemoros: 26 },
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

function tracesForSourceEffect(traces: SynergyTrace[], sourceEffectId: string): SynergyTrace[] {
  return traces.filter((trace) => traceText(trace).includes(`Source effect ID: ${sourceEffectId}.`));
}

describe('Feskar/Rhysarion/Daemoros Resilient Bond pass 16', () => {
  it('routes the single adjacent ally stack as deterministic while preserving retreat controls', () => {
    const traces = currentTraces();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(70);
    expect(counts).toMatchObject({ active: 32, potential: 26, inactive: 11, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const adjacentMatches = tracesForSourceEffect(traces, 'resilient-bond-adjacent-stack');
    expect(adjacentMatches).toHaveLength(1);
    const adjacent = adjacentMatches[0]!;
    expect(adjacent.status).toBe('active');
    expect(adjacent.sourceDragonId).toBe('feskar');
    expect(adjacent.sourceAbilityId).toBe('feskar-resilient-bond');
    expect(adjacent.recipientDragonId).toBe('rhysarion');
    expect(adjacent.targetSelectionGroup).toMatchObject({
      targetCount: 1,
      eligibleRecipientDragonIds: ['rhysarion'],
      selectionUncertain: false,
      selection: 'one-eligible-adjacent',
    });
    expect(traceText(adjacent)).toContain('Resolved selected target in this formation: Rhysarion.');
    expect(traceText(adjacent)).toContain('At Start of Combat, Rhysarion gains 1 Resilient Bond stack.');
    expect(traceText(adjacent)).toContain('Each verified stack reduces non-Basic Physical Damage Received by 6.5%');
    expect(traceText(adjacent)).toContain('the stack lasts until end of combat');
    expect(traceText(adjacent)).toContain('Rhysarion remains the tracked ally for later retreat checks.');
    expect(traceText(adjacent)).toContain('Timing: Start of combat.');
    expect(traceText(adjacent)).toContain('Grants 1 Resilient Bond stack.');
    expect(traceText(adjacent)).toContain('Physical Damage Received decrease 6.5% at effective Habit Level 1.');
    expect(traceText(adjacent)).toContain('Physical Damage Received reduction applies to non-Basic Attacks only.');
    expect(traceText(adjacent)).toContain('Duration: until end of combat.');
    expect(traceText(adjacent)).toContain('Target reference resilient-bond-persistent-ally');
    expect(adjacent.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because maximum stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
    expect(traceText(adjacent)).not.toMatch(/activation success|selected ally identity|selected target uncertainty|modifier uptime|support uptime/i);
    expect(adjacent.exactResultUnknownReason ?? '').not.toMatch(/activation success|selected|modifier uptime|support uptime|duration/i);

    const selfMatches = tracesForSourceEffect(traces, 'resilient-bond-self-stack');
    expect(selfMatches).toHaveLength(1);
    expect(selfMatches[0]!.status).toBe('active');
    expect(traceText(selfMatches[0]!)).toContain('Feskar');
    expect(selfMatches[0]!.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because maximum stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');

    const retreatMatches = tracesForSourceEffect(traces, 'resilient-bond-self-retreat-stack');
    expect(retreatMatches).toHaveLength(1);
    const retreat = retreatMatches[0]!;
    expect(retreat.status).toBe('potential');
    expect(traceText(retreat)).toContain('Tracked selected ally in this formation: Rhysarion.');
    expect(traceText(retreat)).toContain('retreated in the previous round');
    expect(traceText(retreat)).toContain('Grants 1 additional Resilient Bond stack.');
    expect(traceText(retreat)).toContain('Physical Damage Received decrease 6.5% at effective Habit Level 1.');
    expect(traceText(retreat)).toContain('Duration: until end of combat.');
    expect(retreat.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because the tracked ally identity, whether that ally retreated during the previous round, maximum or final stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
  });

  it('exports the deterministic adjacent-stack narrative and keeps formation controls stable', () => {
    const roster = pass16Roster();
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { feskar: 26, rhysarion: 26, daemoros: 26 },
    });
    const exportData = createSynergyAuditExport(formation, traces, roster);
    const exportTrace = exportData.traces.find((trace) => traceText(trace).includes('Source effect ID: resilient-bond-adjacent-stack.'));
    expect(exportTrace).toBeDefined();
    expect(traceText(exportTrace!)).toContain('At Start of Combat, Rhysarion gains 1 Resilient Bond stack.');
    expect(exportTrace!.exactResultUnknownReason).toBe('Exact final mitigated damage cannot be calculated because maximum stack count, stack-combination behavior, and the final mitigation formula remain unresolved.');
    expect(JSON.stringify(exportTrace)).not.toMatch(/activation success|modifier uptime|support uptime/i);

    expect(traces.filter((trace) => trace.ruleId === 'verified-vanguard-position-conflict')).toHaveLength(1);
    expect(traces.some((trace) => trace.sourceDragonId === 'rhysarion' && trace.sourceAbilityId === 'rhysarion-champions-vigor' && trace.status === 'active')).toBe(true);
    expect(traces.some((trace) => trace.sourceDragonId === 'feskar' && trace.sourceAbilityId === 'feskar-champions-brilliance' && trace.status === 'inactive')).toBe(true);
    expect(traces.some((trace) => trace.sourceDragonId === 'daemoros' && trace.sourceAbilityId === 'daemoros-warriors-zeal' && trace.status === 'inactive')).toBe(true);
    expect(JSON.stringify(traces)).toContain("Champion's Vigor");
    expect(JSON.stringify(traces)).toContain('Calculated Assault');
  });
});
