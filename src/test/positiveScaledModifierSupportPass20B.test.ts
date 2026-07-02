import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity, traceStatusReason } from '../services/synergyTrace';

const formation: FormationAnalysisInput = {
  'left-flank': 'syrax',
  vanguard: 'vermax',
  'right-flank': 'caraxes',
};

const ids = {
  flightUp: 'syrax-flight-mastery-flight-mastery-initiative-up-stat-dealt-modifier',
  flightDown: 'syrax-flight-mastery-flight-mastery-initiative-down-stat-dealt-modifier',
  mindfulIntelligence: 'syrax-mindful-synergy-mindful-synergy-intelligence-stat-dealt-modifier',
  mindfulInstinct: 'syrax-mindful-synergy-mindful-synergy-instinct-stat-dealt-modifier',
  reactiveInstinct: 'vermax-reactive-instincts-reactive-instincts-instinct-stat-dealt-modifier',
  reactiveInitiative: 'vermax-reactive-instincts-reactive-instincts-initiative-stat-dealt-modifier',
  sentinelInstinct: 'syrax-sentinels-wit-sentinels-wit-left-instinct-stat-dealt-modifier',
  sentinelInitiative: 'syrax-sentinels-wit-sentinels-wit-left-initiative-stat-dealt-modifier',
  mindfulInstinctSource: 'syrax-mindful-synergy-mindful-synergy-instinct-stat-dealt-modifier',
  flightInitiativeSource: 'syrax-flight-mastery-flight-mastery-initiative-up-stat-dealt-modifier',
  zealInstinct: 'vermax-warriors-zeal-warriors-zeal-left-instinct-stat-dealt-modifier',
  zealInitiative: 'vermax-warriors-zeal-warriors-zeal-left-initiative-stat-dealt-modifier',
  valorStrength: 'vermax-dragons-valor-dragons-valor-strength-stat-dealt-modifier',
  battleStrength: 'caraxes-battle-dread-battle-dread-strength-down-stat-dealt-modifier',
  battleInitiative: 'caraxes-battle-dread-battle-dread-initiative-down-stat-dealt-modifier',
};

function reviewRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['syrax', 'vermax', 'caraxes']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function buildAnalysis() {
  const roster = reviewRoster();
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { syrax: 26, vermax: 26, caraxes: 26 },
    previewMaxRankInteractions: false,
  });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { traces, presentation };
}

function counts(traces: SynergyTrace[]) {
  return traces.reduce<Record<TraceStatus, number>>((acc, trace) => {
    acc[trace.status] += 1;
    return acc;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function traceText(trace: SynergyTrace): string {
  return [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions, ...trace.unresolvedQuestions, trace.exactResultUnknownReason ?? '', traceStatusReason(trace)].join(' ');
}

function modifier(id: string) {
  const matches = deriveModifierCapabilities(dragons).filter((capability) => capability.id === id);
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

function scalingTrace(traces: SynergyTrace[], sourceAbilityId: string, recipientAbilityId: string, title: string, sourceCapabilityId: string): SynergyTrace {
  const matches = traces.filter((trace) =>
    trace.matchKind === 'stat-scaling-support' &&
    trace.title === title &&
    trace.sourceAbilityId === sourceAbilityId &&
    trace.recipientAbilityId === recipientAbilityId &&
    trace.modifierCapabilityIds?.includes(sourceCapabilityId),
  );
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

function expectMatchedModifiers(trace: SynergyTrace, expected: string[]) {
  expect(trace.matchedModifierCapabilityIds?.sort()).toEqual([...expected].sort());
  for (const id of expected) {
    expect(trace.matchedModifierCapabilityIds?.filter((value) => value === id)).toHaveLength(1);
    expect(trace.matchedOutputCapabilityIds ?? []).not.toContain(id);
  }
}

describe('positive stat-scaled modifier support pass 20B', () => {
  it('exposes positive dependent modifiers with explicit scaling metadata', () => {
    expect(modifier(ids.flightUp).scalingStats).toContain('instinct');
    expect(modifier(ids.flightDown).scalingStats).toContain('instinct');
    expect(modifier(ids.mindfulIntelligence).scalingStats).toContain('initiative');
    expect(modifier(ids.mindfulInstinct).scalingStats).toContain('initiative');
    expect(modifier(ids.reactiveInstinct).scalingStats).toContain('strength');
    expect(modifier(ids.reactiveInitiative).scalingStats).toContain('strength');
  });

  it('enriches existing Flight Mastery traces without duplicating them', () => {
    const { traces } = buildAnalysis();
    const sentinel = scalingTrace(traces, 'syrax-sentinels-wit', 'syrax-flight-mastery', 'Instinct Scaling Support', ids.sentinelInstinct);
    const mindful = scalingTrace(traces, 'syrax-mindful-synergy', 'syrax-flight-mastery', 'Instinct Scaling Support', ids.mindfulInstinctSource);
    const zeal = scalingTrace(traces, 'vermax-warriors-zeal', 'syrax-flight-mastery', 'Instinct Scaling Support', ids.zealInstinct);

    expect(sentinel.status).toBe('inactive');
    expect(traceStatusReason(sentinel)).toContain('Provider position requirement is not satisfied');
    expect(mindful.status).toBe('active');
    expect(zeal.status).toBe('active');
    for (const trace of [sentinel, mindful, zeal]) {
      expectMatchedModifiers(trace, [ids.flightUp, ids.flightDown]);
      expect(traceText(trace)).toContain("Flight Mastery's allied Initiative increase");
      expect(traceText(trace)).toContain("Flight Mastery's Enemy Initiative reduction");
      expect(trace.exactResultUnknownReason).toBe(
        'Exact final Flight Mastery allied Initiative increase and Enemy Initiative reduction cannot be calculated because modifier-combination behavior and the final Instinct-scaling formula remain unresolved.',
      );
    }
    expect(traces.filter((trace) => trace.recipientAbilityId === 'syrax-flight-mastery' && trace.title === 'Instinct Scaling Support' && trace.matchedModifierCapabilityIds?.some((id) => id.startsWith('syrax-flight-mastery-')))).toHaveLength(3);
  });

  it('adds grouped positive Mindful Synergy and Reactive Instincts modifier relationships only', () => {
    const { traces } = buildAnalysis();
    const sentinelMindful = scalingTrace(traces, 'syrax-sentinels-wit', 'syrax-mindful-synergy', 'Initiative Scaling Support', ids.sentinelInitiative);
    const flightMindful = scalingTrace(traces, 'syrax-flight-mastery', 'syrax-mindful-synergy', 'Initiative Scaling Support', ids.flightInitiativeSource);
    const zealMindful = scalingTrace(traces, 'vermax-warriors-zeal', 'syrax-mindful-synergy', 'Initiative Scaling Support', ids.zealInitiative);
    const valorReactive = scalingTrace(traces, 'vermax-dragons-valor', 'vermax-reactive-instincts', 'Strength Scaling Support', ids.valorStrength);

    expect(sentinelMindful.status).toBe('inactive');
    expect(flightMindful.status).toBe('active');
    expect(zealMindful.status).toBe('active');
    expect(valorReactive.status).toBe('active');
    for (const trace of [sentinelMindful, flightMindful, zealMindful]) {
      expectMatchedModifiers(trace, [ids.mindfulIntelligence, ids.mindfulInstinct]);
      expect(trace.recipientDragonId).toBe('syrax');
      expect(traceText(trace)).toContain("Mindful Synergy's allied Intelligence increase");
      expect(traceText(trace)).toContain("Mindful Synergy's allied Instinct increase");
      expect(trace.exactResultUnknownReason).toBe(
        'Exact final Mindful Synergy allied Intelligence increase and allied Instinct increase cannot be calculated because modifier-combination behavior and the final Initiative-scaling formula remain unresolved.',
      );
    }
    expectMatchedModifiers(valorReactive, [ids.reactiveInstinct, ids.reactiveInitiative]);
    expect(valorReactive.recipientDragonId).toBe('vermax');
    expect(traceText(valorReactive)).toContain("Reactive Instincts' allied Instinct increase");
    expect(traceText(valorReactive)).toContain("Reactive Instincts' allied Initiative increase");
    expect(valorReactive.exactResultUnknownReason).toBe(
      "Exact final Reactive Instincts allied Instinct increase and allied Initiative increase cannot be calculated because modifier-combination behavior and the final Strength-scaling formula remain unresolved.",
    );

    expect(traces.filter((trace) => trace.sourceAbilityId === 'syrax-flight-mastery' && trace.recipientAbilityId === 'syrax-mindful-synergy')).toHaveLength(1);
    expect(traces.filter((trace) => trace.sourceAbilityId === 'syrax-mindful-synergy' && trace.recipientAbilityId === 'syrax-flight-mastery')).toHaveLength(1);
    expect(traces.filter((trace) => trace.sourceAbilityId === 'vermax-dragons-valor' && trace.matchedOutputCapabilityIds?.length)).toHaveLength(0);
  });

  it('preserves Battle Dread, counts, card counts, and duplicate protections', () => {
    const { traces, presentation } = buildAnalysis();
    const battleDread = scalingTrace(traces, 'syrax-mindful-synergy', 'caraxes-battle-dread', 'Intelligence Scaling Support', ids.mindfulIntelligence);

    expectMatchedModifiers(battleDread, [ids.battleStrength, ids.battleInitiative]);
    expect(battleDread.status).toBe('active');
    expect(traces).toHaveLength(64);
    expect(counts(traces)).toEqual({ active: 33, potential: 18, inactive: 11, blocked: 1, unknown: 1, 'not-applicable': 0 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    expect(presentation.cards.map((card) => ({ dragonId: card.dragonId, receives: card.receives.length, provides: card.provides.length }))).toEqual([
      { dragonId: 'syrax', receives: 7, provides: 9 },
      { dragonId: 'vermax', receives: 5, provides: 5 },
      { dragonId: 'caraxes', receives: 9, provides: 8 },
    ]);
    const reactiveCard = presentation.cards
      .find((card) => card.dragonId === 'vermax')!
      .receives.find((item) => item.abilityName === 'Reactive Instincts')!;
    expect(reactiveCard.modifierLines.join(' ')).toContain("Dragon's Valor");
    expect(reactiveCard.modifierLines.join(' ')).toContain('Strength support');
    expect(reactiveCard.modifierLines.join(' ')).toContain('Reactive Instincts');
    const duplicateBullets = presentation.cards.flatMap((card) => [...card.receives, ...card.provides]).reduce((total, item) => {
      const lines = [...item.summaryLines, ...item.modifierLines];
      return total + lines.length - new Set(lines).size;
    }, 0);
    expect(duplicateBullets).toBe(0);
  });
});
