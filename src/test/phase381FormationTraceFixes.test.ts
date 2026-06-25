import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { defaultSynergyRules } from '../data/synergyRules';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormation } from '../services/synergyEngine';
import {
  analyzeFormationTraces,
  frameworkTraceReportData,
  isNormalSynergyTrace,
  phase381ReviewFormations,
} from '../services/synergyTrace';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';

const preview = { previewMaxRankInteractions: true };

function tracesFor(formation: FormationAnalysisInput, usePreview = true): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, usePreview ? preview : {});
}

function findTrace(
  traces: SynergyTrace[],
  partial: Partial<Pick<SynergyTrace, 'sourceDragonId' | 'recipientDragonId' | 'sourceAbilityId' | 'recipientAbilityId' | 'matchKind' | 'channel'>>,
) {
  return traces.find((trace) =>
    Object.entries(partial).every(([key, value]) => trace[key as keyof SynergyTrace] === value),
  );
}

describe('Phase 3.8.1 trace pipeline reconciliation', () => {
  it('uses the same trace generator for framework report formations and Formation Analysis', () => {
    const report = frameworkTraceReportData(dragons, preview);

    expect(report.databaseVersion).toBe('0.5.1');
    for (const [name, formation] of Object.entries(phase381ReviewFormations)) {
      expect(report.traces[name]!.map((trace) => trace.id)).toEqual(
        analyzeFormationTraces(formation, dragons, preview).map((trace) => trace.id),
      );
    }
  });

  it('shows partial analysis instead of the old unavailable banner when structured traces exist', () => {
    const result = analyzeFormation(phase381ReviewFormations.C, dragons, defaultSynergyRules, preview);

    expect(result.score).toBeNull();
    expect(result.warnings).toContain(
      'Partial analysis generated. Some interactions depend on locked abilities, chance, target selection, or unresolved formulas.',
    );
    expect(result.warnings.join(' ')).not.toContain('Synergy analysis is unavailable');
  });

  it('deduplicates normal unresolved assumptions while retaining per-trace debug links', () => {
    const result = analyzeFormation(phase381ReviewFormations.C, dragons, defaultSynergyRules, preview);
    const traces = analyzeFormationTraces(phase381ReviewFormations.C, dragons, preview);

    expect(result.unresolvedAssumptions).toHaveLength(new Set(result.unresolvedAssumptions).size);
    expect(traces.filter((trace) => trace.unresolvedQuestions.length > 0).length).toBeGreaterThan(1);
  });
});

describe('Phase 3.8.1 required Syrax and Caraxes formations', () => {
  it('surfaces Syrax First-Strike to Caraxes Infernal Burst in all required formations as conditional', () => {
    for (const formation of Object.values(phase381ReviewFormations)) {
      const trace = findTrace(tracesFor(formation), {
        matchKind: 'status-condition-enablement',
        sourceDragonId: 'syrax',
        sourceAbilityId: 'syrax-blazing-fury',
        recipientDragonId: 'caraxes',
        recipientAbilityId: 'caraxes-infernal-burst',
      });

      expect(trace).toBeDefined();
      expect(trace?.status).toBe('potential');
      expect(trace?.explanation).toContain('Infernal Burst deals 1.5x damage');
      expect(trace?.assumptions.join(' ')).toMatch(/Activation|target/i);
    }
  });

  it('surfaces Slow to Strategic Revival only when unlocked or max-rank preview is enabled', () => {
    const formation = phase381ReviewFormations.A;
    const currentModeTrace = findTrace(tracesFor(formation, false), {
      matchKind: 'status-condition-enablement',
      sourceDragonId: 'caraxes',
      sourceAbilityId: 'caraxes-crippling-inferno',
      recipientDragonId: 'syrax',
      recipientAbilityId: 'syrax-strategic-revival',
    });
    const previewTrace = findTrace(tracesFor(formation), {
      matchKind: 'status-condition-enablement',
      sourceDragonId: 'caraxes',
      sourceAbilityId: 'caraxes-crippling-inferno',
      recipientDragonId: 'syrax',
      recipientAbilityId: 'syrax-strategic-revival',
    });
    const roster = createEmptyRoster(dragons);
    roster.syrax!.starRank = 6;
    roster.syrax!.habitLevels['syrax-strategic-revival'] = 1;
    roster.caraxes!.starRank = 6;
    roster.caraxes!.habitLevels['caraxes-crippling-inferno'] = 1;
    const unlockedTrace = findTrace(analyzeFormationTraces(formation, dragons, { roster }), {
      matchKind: 'status-condition-enablement',
      sourceDragonId: 'caraxes',
      sourceAbilityId: 'caraxes-crippling-inferno',
      recipientDragonId: 'syrax',
      recipientAbilityId: 'syrax-strategic-revival',
    });

    expect(currentModeTrace).toBeUndefined();
    expect(previewTrace).toMatchObject({ status: 'potential' });
    expect(unlockedTrace).toBeDefined();
  });

  it("surfaces Hunter's Wrath Right Flank stat support and no Left Flank application", () => {
    const formationA = tracesFor(phase381ReviewFormations.A);
    const formationD = tracesFor(phase381ReviewFormations.D);

    expect(formationA.find((trace) =>
      trace.sourceDragonId === 'caraxes' &&
      trace.sourceAbilityId === 'caraxes-hunters-wrath' &&
      trace.recipientDragonId === 'syrax' &&
      trace.matchKind === 'stat-scaling-support' &&
      trace.effects.join(' ').includes('Initiative'),
    )).toBeDefined();
    expect(formationD.some((trace) =>
      trace.sourceAbilityId === 'caraxes-hunters-wrath' &&
      trace.recipientDragonId === 'syrax' &&
      trace.status === 'active',
    )).toBe(false);
  });

  it("surfaces Sentinel's Wit Left Flank stat support and Malachite Instinct scaling", () => {
    const formationC = tracesFor(phase381ReviewFormations.C);
    const directSupport = formationC.filter(
      (trace) =>
        trace.ruleId === 'direct-stat-support' &&
        trace.sourceAbilityId === 'syrax-sentinels-wit' &&
        trace.recipientDragonId === 'malachite',
    );
    const scaling = formationC.find(
      (trace) =>
        trace.matchKind === 'stat-scaling-support' &&
        trace.sourceAbilityId === 'syrax-sentinels-wit' &&
        trace.recipientDragonId === 'malachite' &&
        trace.title === 'Instinct Scaling Support',
    );

    expect(directSupport.map((trace) => trace.effects.join(' '))).toEqual(
      expect.arrayContaining([expect.stringContaining('Instinct'), expect.stringContaining('Initiative')]),
    );
    expect(scaling?.matchedFacts.join(' ')).toContain("Warden's Rally scales with Instinct");
    expect(scaling?.effects.join(' ')).toContain('Tactical Damage');
    expect(scaling?.effects.join(' ')).toContain('Recovery');
  });

  it('surfaces Tactical Inferno Right Flank Caraxes preview support', () => {
    const trace = findTrace(tracesFor(phase381ReviewFormations.C), {
      matchKind: 'outgoing-effect-amplification',
      sourceDragonId: 'syrax',
      sourceAbilityId: 'syrax-tactical-inferno',
      recipientDragonId: 'caraxes',
      channel: 'fire-damage',
    });

    expect(trace).toMatchObject({ status: 'potential' });
    expect(trace?.explanation).toContain('flank preference');
    expect(trace?.matchedOutputCapabilityIds?.join(' ')).toContain('infernal-burst');
    expect(trace?.matchedOutputCapabilityIds?.join(' ')).toContain('crippling-inferno-burn');
  });

  it("keeps Warden's Rally self-inclusion out of normal active synergies but confirmed in debug", () => {
    const result = analyzeFormation(phase381ReviewFormations.C, dragons, defaultSynergyRules, preview);
    const trace = analyzeFormationTraces(phase381ReviewFormations.C, dragons, preview).find(
      (item) => item.id === 'malachite-wardens-rally-three-allies-self',
    );

    expect(result.positives.some((item) => item.ruleId === 'three-allies-includes-caster')).toBe(false);
    expect(result.traces.filter((item) => item.status === 'active' && isNormalSynergyTrace(item)).some((item) => item.ruleId === 'three-allies-includes-caster')).toBe(false);
    expect(trace).toMatchObject({
      status: 'not-applicable',
      confidence: 'confirmed',
      combatLogConfirmed: true,
    });
  });
});
