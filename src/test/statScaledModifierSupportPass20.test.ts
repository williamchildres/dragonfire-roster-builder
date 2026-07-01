import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity, traceStatusReason } from '../services/synergyTrace';

const formation: FormationAnalysisInput = {
  'left-flank': 'seasmoke',
  vanguard: 'vhagar',
  'right-flank': 'sheepstealer',
};

const cleverInitiativeId = 'seasmoke-clever-maneuver-clever-maneuver-initiative-stat-dealt-modifier';
const cleverIntelligenceId = 'seasmoke-clever-maneuver-clever-maneuver-intelligence-stat-dealt-modifier';
const windsFavorInitiativeId = 'seasmoke-winds-favor-winds-favor-initiative-stat-dealt-modifier';
const dragonsCunningInstinctDownId = 'sheepstealer-dragons-cunning-dragons-cunning-instinct-down-stat-dealt-modifier';

function buildAnalysis() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['seasmoke', 'vhagar', 'sheepstealer']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
  }
  roster.seasmoke!.reignLevel = 27;
  roster.vhagar!.reignLevel = 26;
  roster.sheepstealer!.reignLevel = 26;
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { seasmoke: 27, vhagar: 26, sheepstealer: 26 },
  });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { roster, traces, presentation };
}

function countByStatus(traces: SynergyTrace[]) {
  return traces.reduce<Record<TraceStatus, number>>((counts, trace) => {
    counts[trace.status] = (counts[trace.status] ?? 0) + 1;
    return counts;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function text(trace: SynergyTrace): string {
  return [
    trace.title,
    trace.explanation,
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
    ...trace.unresolvedQuestions,
    trace.exactResultUnknownReason ?? '',
    traceStatusReason(trace),
  ].join(' ');
}

function statSupportTrace(traces: SynergyTrace[], sourceAbilityId: string, sourceCapabilityId: string): SynergyTrace {
  const matches = traces.filter((trace) =>
    trace.title === 'Initiative Scaling Support' &&
    trace.sourceDragonId === 'seasmoke' &&
    trace.sourceAbilityId === sourceAbilityId &&
    trace.recipientDragonId === 'sheepstealer' &&
    trace.recipientAbilityId === 'sheepstealer-dragons-cunning' &&
    trace.modifierCapabilityIds?.includes(sourceCapabilityId) &&
    trace.matchedModifierCapabilityIds?.includes(dragonsCunningInstinctDownId),
  );
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

describe('stat-scaled modifier support pass 20', () => {
  it("exposes Dragon's Cunning as an explicit Initiative-scaled modifier capability", () => {
    const modifiers = deriveModifierCapabilities(dragons).filter((modifier) => modifier.id === dragonsCunningInstinctDownId);

    expect(modifiers).toHaveLength(1);
    expect(modifiers[0]).toMatchObject({
      role: 'enemy-debuff',
      channel: 'stat',
      operation: 'decrease',
      value: null,
      durationRounds: null,
      sourceEffectId: 'dragons-cunning-instinct-down',
      scalingStats: ['initiative'],
    });
    expect(modifiers[0]!.rankedValues[0]).toMatchObject({ level: 1, value: 12, unit: 'percent' });
    expect(modifiers[0]!.targetSelector.side).toBe('enemy');
    expect(modifiers[0]!.targetSelector.scope).toBe('within-adjacency');
    expect(modifiers[0]!.targetSelector.count).toBe(2);
  });

  it("adds only the two active Initiative Scaling Support traces into Dragon's Cunning", () => {
    const { traces } = buildAnalysis();
    const clever = statSupportTrace(traces, 'seasmoke-clever-maneuver', cleverInitiativeId);
    const wind = statSupportTrace(traces, 'seasmoke-winds-favor', windsFavorInitiativeId);

    for (const trace of [clever, wind]) {
      expect(trace.status).toBe('active');
      expect(trace.status).not.toBe('potential');
      expect(trace.matchedOutputCapabilityIds ?? []).not.toContain(dragonsCunningInstinctDownId);
      expect(trace.matchedModifierCapabilityIds).toEqual([dragonsCunningInstinctDownId]);
      expect(trace.effects.join(' ')).toContain("Initiative support for Dragon's Cunning's Enemy Instinct reduction");
      expect(text(trace)).toContain("Dragon's Cunning's Enemy Instinct reduction scales with Sheepstealer's Initiative.");
      expect(text(trace)).toContain('Initiative +12.5%');
      expect(text(trace)).toContain('Timing: Start of Combat.');
      expect(text(trace)).toContain('Duration: until end of combat.');
      expect(text(trace)).not.toMatch(/Initiative directly creates? .*damage/i);
      expect(trace.exactResultUnknownReason).toBe(
        'Exact final Enemy Instinct reduction cannot be calculated because modifier-combination behavior and the final Initiative-scaling formula remain unresolved.',
      );
    }

    expect(text(clever)).toContain("Clever Maneuver can increase Sheepstealer's Initiative");
    expect(text(wind)).toContain("Wind's Favor can increase Sheepstealer's Initiative");
    expect(traces.filter((trace) => trace.title === 'Initiative Scaling Support' && trace.matchedModifierCapabilityIds?.includes(dragonsCunningInstinctDownId))).toHaveLength(2);
    expect(traces.some((trace) => trace.recipientDragonId === 'seasmoke' && trace.matchedModifierCapabilityIds?.includes(dragonsCunningInstinctDownId))).toBe(false);
    expect(traces.some((trace) => trace.recipientDragonId === 'vhagar' && trace.matchedModifierCapabilityIds?.includes(dragonsCunningInstinctDownId))).toBe(false);
    expect(traces.some((trace) => trace.modifierCapabilityIds?.includes(cleverIntelligenceId) && trace.matchedModifierCapabilityIds?.includes(dragonsCunningInstinctDownId))).toBe(false);
  });

  it('preserves existing Intelligence scaling, downstream Dragon Cunning traces, counts, and card aggregation', () => {
    const { traces, presentation } = buildAnalysis();

    expect(traces).toHaveLength(61);
    expect(countByStatus(traces)).toEqual({
      active: 19,
      potential: 25,
      inactive: 13,
      blocked: 1,
      'not-applicable': 0,
      unknown: 3,
    });
    expect(new Set(traces.map((trace) => technicalAnalysisTraceIdentity(trace))).size).toBe(traces.length);

    const cleverIntelligence = traces.find((trace) =>
      trace.title === 'Intelligence Scaling Support' &&
      trace.sourceAbilityId === 'seasmoke-clever-maneuver' &&
      trace.recipientDragonId === 'sheepstealer' &&
      trace.modifierCapabilityIds?.includes(cleverIntelligenceId),
    );
    expect(cleverIntelligence?.status).toBe('active');
    expect(cleverIntelligence?.matchedOutputCapabilityIds?.join(' ')).toContain('wild-hunt');
    expect(cleverIntelligence?.matchedOutputCapabilityIds?.join(' ')).toContain('savage-claim');
    expect(cleverIntelligence?.matchedModifierCapabilityIds ?? []).toEqual([]);

    const mitigation = traces.filter((trace) => trace.sourceAbilityId === 'sheepstealer-dragons-cunning' && trace.matchKind === 'enemy-mitigation-reduction');
    expect(mitigation.filter((trace) => trace.recipientDragonId === 'seasmoke' && trace.status === 'potential')).toHaveLength(1);
    expect(mitigation.filter((trace) => trace.recipientDragonId === 'vhagar' && trace.status === 'potential')).toHaveLength(1);
    const tacticalDown = traces.find((trace) => trace.sourceAbilityId === 'sheepstealer-dragons-cunning' && trace.matchKind === 'enemy-damage-dealt-reduction' && trace.channel === 'tactical-damage');
    expect(tacticalDown?.status).toBe('active');
    expect(text(tacticalDown!)).toContain('Base Enemy Instinct reduction');
    expect(text(tacticalDown!)).toContain('12%');
    expect(text(tacticalDown!)).toContain('Final scaled Enemy Instinct reduction scales with Sheepstealer');

    const seasmoke = presentation.cards.find((card) => card.dragonId === 'seasmoke')!;
    const vhagar = presentation.cards.find((card) => card.dragonId === 'vhagar')!;
    const sheepstealer = presentation.cards.find((card) => card.dragonId === 'sheepstealer')!;
    expect(seasmoke.receives).toHaveLength(5);
    expect(seasmoke.provides).toHaveLength(7);
    expect(vhagar.receives).toHaveLength(5);
    expect(vhagar.provides).toHaveLength(6);
    expect(sheepstealer.receives).toHaveLength(7);
    expect(sheepstealer.provides).toHaveLength(4);

    const cleverCards = seasmoke.provides.filter((item) => item.recipientDragonId === 'sheepstealer' && item.abilityName === 'Clever Maneuver');
    const windCards = seasmoke.provides.filter((item) => item.abilityName === "Wind's Favor");
    expect(cleverCards).toHaveLength(1);
    expect(windCards).toHaveLength(1);
    expect(cleverCards[0]!.summaryLines.join(' ')).toContain('Intelligence by +22%');
    expect(cleverCards[0]!.summaryLines.join(' ')).toContain('Initiative by +12.5%');
    expect(cleverCards[0]!.summaryLines.join(' ')).toContain('Wild Hunt');
    expect(cleverCards[0]!.summaryLines.join(' ')).toContain('Savage Claim');
    expect(cleverCards[0]!.summaryLines.join(' ')).toContain("Initiative support for Dragon's Cunning's Enemy Instinct reduction");
    expect(windCards[0]!.summaryLines.join(' ')).toContain('Initiative +12.5%');
    expect(windCards[0]!.summaryLines.join(' ')).toContain('Applies to Seasmoke, Vhagar, and Sheepstealer.');
    expect(windCards[0]!.summaryLines.join(' ')).toContain("Initiative support for Dragon's Cunning's Enemy Instinct reduction");
    expect(seasmoke.provides.filter((item) => item.recipientDragonId === 'sheepstealer' && item.abilityName === "Dragon's Cunning")).toHaveLength(0);
  });
});
