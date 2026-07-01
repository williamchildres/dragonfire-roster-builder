import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { deriveOutputCapabilities, derivePeriodicDamageDefinitions, deriveStatusOutputCapabilities, periodicDamageOutputCapabilities } from '../services/effectCapabilities';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const formation = {
  'left-flank': 'shadowsong',
  vanguard: 'feskar',
  'right-flank': 'daemoros',
} as const satisfies FormationAnalysisInput;

const shadowflamePeriodicOutput = 'periodic-daemoros-shadowflame-shadowflame-burn-burn-output';
const shadowflameDirectOutput = 'daemoros-shadowflame-shadowflame-physical-output';
const instillPanicPeriodicOutput = 'periodic-daemoros-instill-fear-instill-fear-panic-panic-output';
const darkeningPanicPeriodicOutput = 'periodic-daemoros-darkening-fear-darkening-fear-panic-panic-output';

function pass15Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['shadowsong', 'feskar', 'daemoros']) {
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
    roster: pass15Roster(),
    dragonLevels: { shadowsong: 26, feskar: 26, daemoros: 26 },
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

function mitigationTrace(traces: SynergyTrace[], sourceAbilityId: string, sourceEffectId: string, channel: string) {
  const matches = traces.filter((trace) =>
    trace.matchKind === 'enemy-mitigation-reduction' &&
    trace.sourceAbilityId === sourceAbilityId &&
    trace.recipientDragonId === 'daemoros' &&
    trace.channel === channel &&
    trace.modifierCapabilityId?.includes(sourceEffectId) === true
  );
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

describe('Shadowsong/Feskar/Daemoros periodic mitigation pass 15', () => {
  it('matches typed periodic damage outputs for enemy mitigation without duplicating capabilities or traces', () => {
    const statusOutputs = deriveStatusOutputCapabilities(dragons);
    const periodicOutputs = periodicDamageOutputCapabilities(dragons, derivePeriodicDamageDefinitions(dragons), statusOutputs);
    const allOutputIds = [...deriveOutputCapabilities(dragons), ...periodicOutputs].map((output) => output.id);
    expect(new Set(allOutputIds).size).toBe(allOutputIds.length);
    expect(periodicOutputs.map((output) => output.id)).toEqual(expect.arrayContaining([
      shadowflamePeriodicOutput,
      instillPanicPeriodicOutput,
      darkeningPanicPeriodicOutput,
    ]));

    const traces = currentTraces();
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const ensnare = mitigationTrace(traces, 'shadowsong-ensnare', 'ensnare-initiative', 'fire-damage');
    expect(ensnare.status).toBe('potential');
    expect(ensnare.matchedOutputCapabilityIds).toContain(shadowflamePeriodicOutput);
    expect(ensnare.matchedOutputCapabilityIds).not.toContain(shadowflameDirectOutput);
    expect(traceText(ensnare)).toContain('Source effect ID: ensnare-initiative.');
    expect(traceText(ensnare)).toContain('Shadowsong Intelligence');
    expect(traceText(ensnare)).toContain('Base Enemy Initiative reduction -18%.');
    expect(traceText(ensnare)).toContain('Timing: Start of Round 1.');
    expect(traceText(ensnare)).toContain('Duration: 3 rounds.');
    expect(ensnare.targetSelectorSummary).toContain('enemy; within-adjacency; adjacent; 2 targets');
    expect(traceText(ensnare)).toMatch(/overlap .*remains unresolved|overlap .*not guaranteed|overlap .*conditional/i);

    const instill = mitigationTrace(traces, 'daemoros-instill-fear', 'instill-fear-intelligence', 'tactical-damage');
    expect(instill.status).toBe('potential');
    expect(instill.matchedOutputCapabilityIds).toEqual(expect.arrayContaining([instillPanicPeriodicOutput, darkeningPanicPeriodicOutput]));
    expect(traceText(instill)).toContain('Base Enemy Intelligence reduction -25%.');
    expect(traceText(instill)).toContain('Daemoros Strength');
    expect(traceText(instill)).toContain('Timing: Each round.');
    expect(traceText(instill)).toContain('Duration: 2 rounds.');
    expect(traceText(instill)).toContain('Instill Fear: Panic periodic Tactical Damage uses the same selected enemy and activation group as this enemy mitigation reduction.');
    expect(traceText(instill)).toContain('Darkening Fear: Panic periodic Tactical Damage is independently targeted for this mitigation source; enemy overlap is conditional and not guaranteed.');

    const darkening = mitigationTrace(traces, 'daemoros-darkening-fear', 'darkening-fear-intelligence', 'tactical-damage');
    expect(darkening.status).toBe('potential');
    expect(darkening.matchedOutputCapabilityIds).toEqual(expect.arrayContaining([instillPanicPeriodicOutput, darkeningPanicPeriodicOutput]));
    expect(traceText(darkening)).toContain('Darkening Fear: Panic periodic Tactical Damage uses the same selected enemy and activation group as this enemy mitigation reduction.');
    expect(traceText(darkening)).toContain('Instill Fear: Panic periodic Tactical Damage is independently targeted for this mitigation source; enemy overlap is conditional and not guaranteed.');
  });

  it('projects dependent selectors and keeps final formation controls stable', () => {
    const traces = currentTraces();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(68);
    expect(counts).toMatchObject({ active: 23, potential: 36, inactive: 8, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const scorchedEarth = traces.filter((trace) =>
      trace.matchKind === 'status-condition-enablement' &&
      trace.recipientAbilityId === 'shadowsong-scorched-earth' &&
      trace.title === 'Panic enables Scorched Earth'
    );
    expect(scorchedEarth).toHaveLength(2);
    for (const trace of scorchedEarth) {
      expect(trace.targetSelectorSummary).toBe('enemy; within-adjacency; adjacent; 2 targets; caster eligibility unknown');
      expect(trace.targetSelectorSummary).not.toContain('any-lane');
      expect(traceText(trace)).toContain('Panic on one enemy does not change the chance for another enemy.');
    }

    expect(traces.filter((trace) => trace.status === 'blocked')).toHaveLength(1);
  });
});
