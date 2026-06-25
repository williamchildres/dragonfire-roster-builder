import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { statusGlossary } from '../data/statusGlossary';
import { defaultSynergyRules } from '../data/synergyRules';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { analyzeFormation } from '../services/synergyEngine';
import {
  analyzeFormationTraces,
  assertSelectedFormationTraceInvariant,
  isNormalSynergyTrace,
} from '../services/synergyTrace';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';

const preview = { previewMaxRankInteractions: true };

const formations: Record<string, FormationAnalysisInput> = {
  '1': { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
  '2': { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  '3': { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
  '4': { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '5': { 'left-flank': 'caraxes', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  '6': { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
  '7': { 'left-flank': 'syrax', vanguard: 'vermax', 'right-flank': 'caraxes' },
  '8': { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
};

function currentTraces(formationId: string): SynergyTrace[] {
  return analyzeFormationTraces(formations[formationId]!, dragons);
}

function previewTraces(formationId: string): SynergyTrace[] {
  return analyzeFormationTraces(formations[formationId]!, dragons, preview);
}

function traceKey(trace: SynergyTrace): string {
  return [
    trace.matchKind ?? trace.ruleId,
    trace.sourceDragonId,
    trace.sourceAbilityId ?? '',
    trace.recipientDragonId ?? '',
    trace.recipientAbilityId ?? '',
    trace.modifierCapabilityId ?? '',
    trace.channel ?? '',
    [...(trace.matchedOutputCapabilityIds ?? [])].sort().join(','),
  ].join('|');
}

describe('formation analysis repair invariants', () => {
  it('keeps every friendly trace reference inside the selected formation for all reviewed cases', () => {
    for (const formation of Object.values(formations)) {
      for (const traces of [analyzeFormationTraces(formation, dragons), analyzeFormationTraces(formation, dragons, preview)]) {
        const invariant = assertSelectedFormationTraceInvariant(formation, traces);
        expect(invariant).toMatchObject({ passed: true, violations: [] });
      }
    }
  });

  it('keeps Sheepstealer out of Formation 7 traces and normal summaries', () => {
    const traces = previewTraces('7');
    const result = analyzeFormation(formations['7']!, dragons, defaultSynergyRules, preview);

    expect(JSON.stringify(traces)).not.toContain('sheepstealer');
    expect(JSON.stringify(result.positives)).not.toContain('sheepstealer');
  });

  it('does not show hard-failed traces as active or potential', () => {
    for (const traces of Object.keys(formations).flatMap((id) => [currentTraces(id), previewTraces(id)])) {
      const badTrace = traces.find(
        (trace) =>
          ['active', 'potential'].includes(trace.status) &&
          trace.requirements.some(
            (requirement) =>
              requirement.satisfied === false &&
              /provider position|required source position|required target position|position compatibility|source-scope compatibility|provider targeting|status targeting|adjacency/i.test(
                `${requirement.id} ${requirement.label}`,
              ),
          ),
      );
      expect(badTrace).toBeUndefined();
    }
  });

  it('deduplicates normal parent traces and requirement rows', () => {
    for (const traces of Object.keys(formations).flatMap((id) => [currentTraces(id), previewTraces(id)])) {
      const normalKeys = traces.filter(isNormalSynergyTrace).map(traceKey);
      expect(normalKeys).toHaveLength(new Set(normalKeys).size);
      for (const trace of traces) {
        const requirementKeys = trace.requirements.map(
          (requirement) =>
            `${requirement.id}|${requirement.label}|${requirement.expected}|${requirement.actual ?? ''}|${String(requirement.satisfied)}`,
        );
        expect(requirementKeys).toHaveLength(new Set(requirementKeys).size);
      }
    }
  });
});

describe("Champion's Brilliance defensive support", () => {
  it('derives a damage-received ally-support modifier distinct from Resistance', () => {
    const modifier = deriveModifierCapabilities(dragons).find(
      (capability) => capability.id === 'seasmoke-champions-brilliance-seasmoke-right-flank-dr-down-damage-received-received-modifier',
    );

    expect(modifier).toMatchObject({
      role: 'ally-support',
      channel: 'damage-received',
      operation: 'decrease',
      value: 8,
      unit: 'percent',
      dragonId: 'seasmoke',
      abilityId: 'seasmoke-champions-brilliance',
      directlyVerified: true,
    });
    const resistance = statusGlossary.find((status) => status.id === 'resistance');
    expect(resistance?.verification).toBe('verified');
    expect(resistance?.definition).toContain('Damage Received');
  });

  it('applies only to the Right Flank recipient in Formations 4 and 5 without requiring an output', () => {
    for (const formationId of ['4', '5']) {
      const traces = currentTraces(formationId);
      const defensive = traces.filter(
        (trace) =>
          trace.matchKind === 'defensive-ally-support' &&
          trace.sourceAbilityId === 'seasmoke-champions-brilliance',
      );

      const rightFlankSupport = defensive.find((trace) => trace.recipientDragonId === 'sheepstealer');
      expect(rightFlankSupport).toMatchObject({
        sourceDragonId: 'seasmoke',
        sourceAbilityId: 'seasmoke-champions-brilliance',
        recipientDragonId: 'sheepstealer',
        channel: 'damage-received',
      });
      expect(['active', 'potential', 'unknown']).toContain(rightFlankSupport?.status);
      expect(rightFlankSupport?.matchedOutputCapabilityIds ?? []).toEqual([]);
      expect(defensive.some((trace) =>
        trace.status !== 'inactive' &&
        trace.recipientDragonId === formations[formationId]!['left-flank'],
      )).toBe(false);
    }
  });
});

describe('aggregation and target selection presentation', () => {
  it("groups Warden's Rally outputs under one Instinct scaling trace", () => {
    const trace = previewTraces('3').find(
      (item) =>
        item.matchKind === 'stat-scaling-support' &&
        item.sourceAbilityId === 'vermax-warriors-zeal' &&
        item.recipientDragonId === 'malachite' &&
        item.title === 'Instinct Scaling Support',
    );

    expect(trace?.explanation).toContain("Warden's Rally: Tactical Damage and Recovery");
    expect(trace?.explanation).not.toContain("Warden's Rally, Warden's Rally");
  });

  it('groups Blazing Fury as one single-target selection when Caraxes and Sheepstealer both qualify', () => {
    const traces = currentTraces('8');
    const grouped = traces.find(
      (trace) =>
        trace.sourceAbilityId === 'syrax-blazing-fury' &&
        trace.channel === 'fire-damage' &&
        trace.targetSelectionGroup,
    );

    expect(grouped?.targetSelectionGroup).toEqual({
      targetCount: 1,
      eligibleRecipientDragonIds: ['caraxes', 'sheepstealer'],
      selectionUncertain: true,
    });
    expect(grouped?.explanation).toContain('The selected recipient is not guaranteed');
    expect(traces.filter((trace) =>
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.sourceAbilityId === 'syrax-blazing-fury' &&
      trace.channel === 'fire-damage' &&
      trace.recipientDragonId,
    )).toHaveLength(0);
  });

  it('does not group Cunning Ferocity when two adjacent allies are valid targets', () => {
    const traces = previewTraces('5').filter(
      (trace) => trace.sourceAbilityId === 'seasmoke-cunning-ferocity' && trace.channel === 'fire-damage',
    );

    expect(traces.some((trace) => trace.targetSelectionGroup)).toBe(false);
    expect(traces.map((trace) => trace.recipientDragonId)).toEqual(expect.arrayContaining(['caraxes', 'sheepstealer']));
  });

  it('keeps Burn as one normal Fire support interaction with periodic metadata in debug', () => {
    const traces = previewTraces('7');
    const normalFire = traces.filter(
      (trace) =>
        isNormalSynergyTrace(trace) &&
        trace.matchKind === 'outgoing-effect-amplification' &&
        trace.sourceAbilityId === 'syrax-blazing-fury' &&
        trace.recipientDragonId === 'caraxes' &&
        trace.channel === 'fire-damage',
    );
    const periodic = traces.find(
      (trace) =>
        trace.matchKind === 'periodic-damage-amplification' &&
        trace.recipientAbilityId === 'caraxes-crippling-inferno',
    );

    expect(normalFire).toHaveLength(1);
    expect(normalFire[0]?.matchedOutputCapabilityIds?.join(' ')).toContain('crippling-inferno-burn');
    expect(periodic).toBeDefined();
    expect(isNormalSynergyTrace(periodic!)).toBe(false);
  });
});

describe('normal presentation cleanup', () => {
  it('keeps PvE Stolen Flock warnings out of normal formation warnings and leaves score null', () => {
    const result = analyzeFormation(formations['1']!, dragons, defaultSynergyRules);

    expect(result.score).toBeNull();
    expect(result.warnings.join(' ')).not.toContain('Stolen Flock');
  });
});
