import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { SynergyTrace } from '../models/synergy';
import { deriveOutputCapabilities, derivePeriodicDamageDefinitions, deriveStatusOutputCapabilities, periodicDamageOutputCapabilities } from '../services/effectCapabilities';
import { createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { pass17Analysis, pass17Formation, traceText } from './pass17Helpers';

function traceByTitle(traces: SynergyTrace[], title: string): SynergyTrace {
  const matches = traces.filter((trace) => trace.title === title);
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

describe('Daemoros/Rhysarion/Vaeldra chained Control pass 17', () => {
  it('adds exactly one typed Lure prerequisite trace without changing direct Dawnsong Control traces', () => {
    const { roster, traces } = pass17Analysis();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(73);
    expect(counts).toMatchObject({ active: 31, potential: 33, inactive: 8, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const confusion = traceByTitle(traces, 'Confusion enables Dawnsong');
    const stagger = traceByTitle(traces, 'Stagger enables Dawnsong');
    expect(confusion.status).toBe('potential');
    expect(stagger.status).toBe('potential');
    expect(confusion.sourceDragonId).toBe('daemoros');
    expect(confusion.sourceAbilityId).toBe('daemoros-shroud-of-shadows');
    expect(stagger.sourceDragonId).toBe('vaeldra');
    expect(stagger.sourceAbilityId).toBe('vaeldra-sirens-call');
    expect(traceText(confusion)).toContain('Confusion is a verified member of Control.');
    expect(traceText(stagger)).toContain('Stagger is a verified member of Control.');
    expect(traceText(confusion)).toContain('Round 2 after a successful Round 1 application');
    expect(traceText(confusion)).toContain('Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round');
    expect(traceText(confusion)).toContain('Round 8 after a successful Round 7 application');
    expect(traceText(stagger)).toContain('Schedule overlap: Round 2 only.');
    expect(traceText(stagger)).toContain('Stagger does not carry this interaction to Rounds 5 and 8.');
    expect(traceText(stagger)).toContain('it must resolve before Dawnsong');
    expect(JSON.stringify(traces)).not.toMatch(/Taunt is a verified member of Control|Burn is a verified member of Control|Panic is a verified member of Control/i);

    const prerequisite = traceByTitle(traces, "Taunt enables Siren's Call Stagger branch");
    expect(prerequisite).toMatchObject({
      status: 'potential',
      sourceDragonId: 'vaeldra',
      sourceAbilityId: 'vaeldra-lure',
      recipientDragonId: 'vaeldra',
      recipientAbilityId: 'vaeldra-sirens-call',
      channel: 'status',
      matchKind: 'status-condition-enablement',
      interactionScope: 'internal',
      targetSelectorSummary: 'enemy; any-lane; any; 3 targets; caster eligibility unknown',
    });
    expect(prerequisite.id).toContain('vaeldra-lure-lure-taunt-taunt-status-output');
    expect(traceText(prerequisite)).toContain('Parent source effect ID: sirens-call-taunt-or-stagger.');
    expect(traceText(prerequisite)).toContain('Receiving source effect ID: sirens-call-stagger.');
    expect(traceText(prerequisite)).toContain('Lure has a 25% chance each round to apply Taunt to 3 enemies in any lane.');
    expect(traceText(prerequisite)).toContain('Taunt lasts 2 rounds.');
    expect(traceText(prerequisite)).toContain('Dependent schedule: Rounds 1, 2, and 3.');
    expect(traceText(prerequisite)).toContain('same enemy');
    expect(traceText(prerequisite)).toContain('Round 2 after a successful Round 1 application');
    expect(traceText(prerequisite)).toContain('only if Lure resolves before Siren');
    expect(traceText(prerequisite)).toContain('Activation scope is unresolved');
    expect(traceText(prerequisite)).toContain('same-target overlap');
    expect(traceText(prerequisite)).toContain('Conditional Stagger: Taunt');
    expect(traceText(prerequisite)).not.toMatch(/Taunt is a verified member of Control|Stagger triggers Tempting Distraction/i);

    expect(traces.filter((trace) => /Lure enables Dawnsong|Taunt enables Dawnsong/i.test(trace.title))).toHaveLength(0);

    const exportText = JSON.stringify(createSynergyAuditExport(pass17Formation, traces, roster));
    expect(exportText).toContain("Taunt enables Siren's Call Stagger branch");
    expect(exportText).toContain('vaeldra-lure-lure-taunt-taunt-status-output');
    expect(exportText).toContain('vaeldra-sirens-call-sirens-call-stagger-stagger-status-output');

    const rhysarion = pass17Analysis().presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    expect(rhysarion.receives).toHaveLength(4);
    expect(rhysarion.receives.filter((card) => card.effectTitle === 'Control enhances Dawnsong damage rate')).toHaveLength(1);
  });

  it('keeps periodic output capabilities and Tempting Distraction branch filtering stable', () => {
    const statusOutputs = deriveStatusOutputCapabilities(dragons);
    const periodicOutputs = periodicDamageOutputCapabilities(dragons, derivePeriodicDamageDefinitions(dragons), statusOutputs);
    const allOutputIds = [...deriveOutputCapabilities(dragons), ...periodicOutputs].map((output) => output.id);
    expect(new Set(allOutputIds).has('periodic-daemoros-instill-fear-instill-fear-panic-panic-output')).toBe(true);
    expect(new Set(allOutputIds).has('periodic-daemoros-darkening-fear-darkening-fear-panic-panic-output')).toBe(true);

    const { traces } = pass17Analysis();
    const tempting = traces.filter((trace) => traceText(trace).includes('Tempting Distraction'));
    expect(tempting).toHaveLength(2);
    expect(tempting.every((trace) => trace.sourceAbilityId === 'vaeldra-tempting-distraction')).toBe(true);
    const temptingText = tempting.map(traceText).join(' ');
    expect(temptingText).toContain('Lure');
    expect(temptingText).toContain("Siren's Call");
    expect(temptingText).toMatch(/successful Taunt/i);
    expect(temptingText).not.toMatch(/Stagger triggers|successful Stagger/i);
  });
});
