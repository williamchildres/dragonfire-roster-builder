import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { traceText } from './pass19Helpers';

const lightningFormation: FormationAnalysisInput = {
  'left-flank': 'malachite',
  vanguard: 'rhysarion',
  'right-flank': 'vaeldra',
};

const reactiveFormation: FormationAnalysisInput = {
  'left-flank': 'malachite',
  vanguard: 'venator',
  'right-flank': 'vermax',
};

const infernalFormation: FormationAnalysisInput = {
  'left-flank': 'rhysarion',
  vanguard: 'malachite',
  'right-flank': 'vaeldra',
};

function buildAnalysis(formation: FormationAnalysisInput) {
  const selectedIds = Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId));
  const roster = createEmptyRoster(dragons);
  for (const dragonId of selectedIds) {
    const entry = roster[dragonId];
    if (!entry) {
      continue;
    }
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  const dragonLevels = Object.fromEntries(selectedIds.map((dragonId) => [dragonId, 26])) as Record<string, number>;
  const traces = analyzeFormationTraces(formation, dragons, { roster, dragonLevels });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { roster, traces, presentation };
}

function countByStatus(traces: SynergyTrace[]) {
  return traces.reduce<Record<TraceStatus, number>>((counts, trace) => {
    counts[trace.status] = (counts[trace.status] ?? 0) + 1;
    return counts;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function traceMatches(trace: SynergyTrace | undefined, expected: Partial<SynergyTrace>) {
  expect(trace).toBeDefined();
  expect(trace).toMatchObject(expected);
  return trace!;
}

describe('Resolved recipient certainty pass 19E', () => {
  it('distinguishes Rhysarion as the resolved Lightning Strike recipient while preserving activation uncertainty', () => {
    const { traces, presentation } = buildAnalysis(lightningFormation);

    expect(traces).toHaveLength(76);
    expect(countByStatus(traces)).toEqual({
      active: 40,
      potential: 24,
      inactive: 10,
      blocked: 1,
      'not-applicable': 1,
      unknown: 0,
    });
    expect(new Set(traces.map((trace) => technicalAnalysisTraceIdentity(trace))).size).toBe(traces.length);

    const malachiteCard = presentation.cards.find((card) => card.dragonId === 'malachite');
    const rhysarionCard = presentation.cards.find((card) => card.dragonId === 'rhysarion');
    const vaeldraCard = presentation.cards.find((card) => card.dragonId === 'vaeldra');
    expect(malachiteCard?.receives.length).toBe(8);
    expect(malachiteCard?.provides.length).toBe(8);
    expect(rhysarionCard?.receives.length).toBe(10);
    expect(rhysarionCard?.provides.length).toBe(9);
    expect(vaeldraCard?.receives.length).toBe(13);
    expect(vaeldraCard?.provides.length).toBe(10);

    const firstStrike = traceMatches(
      traces.find((trace) =>
        trace.sourceAbilityId === 'malachite-lightning-strike' &&
        trace.ruleId === 'status-source-output' &&
        trace.title === 'Lightning Strike - First-Strike source' &&
        trace.recipientDragonId === 'rhysarion',
      ),
      {
        status: 'potential',
        recipientDragonId: 'rhysarion',
        sourceAbilityId: 'malachite-lightning-strike',
      },
    );
    const doubleStrike = traceMatches(
      traces.find((trace) =>
        trace.sourceAbilityId === 'malachite-lightning-strike' &&
        trace.ruleId === 'status-source-output' &&
        trace.title === 'Lightning Strike - Double-Strike source' &&
        trace.recipientDragonId === 'rhysarion',
      ),
      {
        status: 'potential',
        recipientDragonId: 'rhysarion',
        sourceAbilityId: 'malachite-lightning-strike',
      },
    );

    expect(traceText(firstStrike)).toContain('lightning-strike-round-one-shared-activation');
    expect(traceText(doubleStrike)).toContain('lightning-strike-round-one-shared-activation');
    expect(traceText(firstStrike)).toContain('Resolved ally recipient: Rhysarion.');
    expect(traceText(doubleStrike)).toContain('Resolved ally recipient: Rhysarion.');
    expect(traceText(firstStrike)).toContain('Eligible recipient candidate: rhysarion.');
    expect(traceText(doubleStrike)).toContain('Eligible recipient candidate: rhysarion.');
    expect(traceText(firstStrike)).toContain('Status application chance: 40% at effective Habit Level 1.');
    expect(traceText(doubleStrike)).toContain('Status application chance: 40% at effective Habit Level 1.');
    expect(traceText(firstStrike)).toContain('Duration: 3 rounds.');
    expect(traceText(doubleStrike)).toContain('Duration: 3 rounds.');
    expect(traceText(firstStrike)).not.toContain('Selected ally recipient is unresolved.');
    expect(traceText(doubleStrike)).not.toContain('Selected ally recipient is unresolved.');
    expect(firstStrike.exactResultUnknownReason).toBe('Rhysarion is the resolved recipient if Lightning Strike activates; exact activation and resulting uptime are not calculated.');
    expect(doubleStrike.exactResultUnknownReason).toBe('Rhysarion is the resolved recipient if Lightning Strike activates; exact activation and resulting uptime are not calculated.');

    const directStrength = traceMatches(
      traces.find((trace) =>
        trace.sourceAbilityId === 'malachite-lightning-strike' &&
        trace.ruleId === 'direct-stat-support' &&
        trace.title === 'Strength Stat Support' &&
        trace.recipientDragonId === 'rhysarion',
      ),
      {
        status: 'potential',
        recipientDragonId: 'rhysarion',
        modifierCapabilityIds: ['malachite-lightning-strike-lightning-strike-strength-stat-dealt-modifier'],
      },
    );
    expect(directStrength.status).not.toBe('active');
    expect(traceText(directStrength)).toContain('Strength +25%');
    expect(traceText(directStrength)).toContain('Enhanced by Instinct.');
    expect(traceText(directStrength)).toContain('Rhysarion is the resolved recipient if Lightning Strike activates; activation success and the final stat formula remain unresolved.');
    expect(traceText(directStrength)).not.toContain('recipient identity is unresolved');
    expect(traceText(directStrength)).not.toContain('guaranteed');
    expect(directStrength.exactResultUnknownReason).toBe('Rhysarion is the resolved recipient if Lightning Strike activates; activation success and the final stat formula remain unresolved.');

    const scalingStrength = traceMatches(
      traces.find((trace) =>
        trace.sourceAbilityId === 'malachite-lightning-strike' &&
        trace.ruleId === 'stat-scaling-support' &&
        trace.title === 'Strength Scaling Support' &&
        trace.recipientDragonId === 'rhysarion',
      ),
      {
        status: 'potential',
        recipientDragonId: 'rhysarion',
        modifierCapabilityIds: ['malachite-lightning-strike-lightning-strike-strength-stat-dealt-modifier'],
      },
    );
    expect(scalingStrength.status).not.toBe('active');
    expect(scalingStrength.matchedOutputCapabilityIds).toEqual([
      'rhysarion-dawnsong-dawnsong-physical-output',
      'rhysarion-ebbing-fury-ebbing-fury-recovery-output',
    ]);
    expect(traceText(scalingStrength)).toContain('Strength +25%');
    expect(traceText(scalingStrength)).toContain('Enhanced by Instinct.');
    expect(traceText(scalingStrength)).toContain('Rhysarion is the resolved recipient if Lightning Strike activates; activation success and the final output formula remain unresolved.');
    expect(traceText(scalingStrength)).not.toContain('recipient identity is unresolved');
    expect(traceText(scalingStrength)).not.toContain('guaranteed');
    expect(scalingStrength.exactResultUnknownReason).toBe('Rhysarion is the resolved recipient if Lightning Strike activates; activation success and the final output formula remain unresolved.');

    const lightningTraceIds = traces
      .filter((trace) =>
        trace.sourceAbilityId === 'malachite-lightning-strike' &&
        (trace.ruleId === 'status-source-output' || trace.ruleId === 'direct-stat-support' || trace.ruleId === 'stat-scaling-support'),
      )
      .map((trace) => trace.id);
    expect(lightningTraceIds).toHaveLength(4);
  });

  it('keeps Inspiring Melody unresolved between Malachite and Vaeldra in the same formation', () => {
    const { traces } = buildAnalysis(lightningFormation);
    const inspiring = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-inspiring-melody');
    expect(inspiring.length).toBeGreaterThan(0);
    expect(inspiring.every((trace) => trace.status === 'potential')).toBe(true);
    expect(inspiring.every((trace) => trace.targetSelectionGroup?.selectionUncertain === true)).toBe(true);
    expect(inspiring.every((trace) => (trace.targetSelectionGroup?.eligibleRecipientDragonIds ?? []).slice().sort().join(',') === 'malachite,vaeldra')).toBe(true);
    expect(inspiring.every((trace) => trace.recipientDragonId === null)).toBe(true);
    expect(inspiring.flatMap((trace) => trace.matchedFacts).join(' ')).toContain('Eligible ally recipients: Malachite, Vaeldra.');
    expect(inspiring.flatMap((trace) => [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions, ...trace.unresolvedQuestions]).join(' ')).toContain('Selected ally recipient is unresolved.');
    expect(inspiring.flatMap((trace) => [trace.explanation, ...trace.matchedFacts, ...trace.effects]).join(' ')).not.toContain('Resolved ally recipient: Malachite.');
    expect(inspiring.flatMap((trace) => [trace.explanation, ...trace.matchedFacts, ...trace.effects]).join(' ')).not.toContain('Resolved ally recipient: Vaeldra.');
  });

  it('preserves Pass 19D comparison-selector uncertainty and deterministic support controls', () => {
    const reactive = buildAnalysis(reactiveFormation).traces;
    const overall = reactive.find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.title === 'Stat Target Selection',
    );
    expect(overall).toBeDefined();
    expect(overall).toMatchObject({
      status: 'active',
      channel: 'stat',
      targetSelectionGroup: {
        targetCount: 1,
        selection: 'highest-stat',
        selectionStat: 'instinct',
        selectionUncertain: true,
      },
    });
    expect(overall!.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['malachite', 'venator', 'vermax']);
    expect(traceText(overall!)).toContain('selected recipient is not guaranteed');

    const malachiteScaling = reactive.find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'malachite' &&
      trace.title === 'Instinct Scaling Support',
    );
    expect(malachiteScaling).toBeDefined();
    expect(malachiteScaling!.status).toBe('potential');
    expect(malachiteScaling!.exactResultUnknownReason).toContain('selected recipient identity, candidate comparison values, tie resolution, and final stat formula remain unresolved.');
    expect(traceText(malachiteScaling!)).toContain('This consequence applies only if Malachite resolves as the selected highest Instinct ally.');

    const collectiveMight = tracesForAbility(buildAnalysis(lightningFormation).traces, 'malachite-collective-might');
    expect(collectiveMight.some((trace) => trace.ruleId === 'direct-stat-support' && trace.recipientDragonId === 'rhysarion' && trace.status === 'active')).toBe(true);
    const collectiveScaling = collectiveMight.find((trace) =>
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'rhysarion' &&
      trace.matchedOutputCapabilityIds?.includes('rhysarion-dawnsong-dawnsong-physical-output') &&
      trace.matchedOutputCapabilityIds?.includes('rhysarion-ebbing-fury-ebbing-fury-recovery-output'),
    );
    expect(collectiveScaling).toBeDefined();
    expect(collectiveScaling!.status).toBe('active');
    expect(traceText(collectiveScaling!)).toContain('Dawnsong');
    expect(traceText(collectiveScaling!)).toContain('Ebbing Fury');

    const infernal = buildAnalysis(infernalFormation).traces.filter((trace) => trace.sourceAbilityId === 'vaeldra-infernal-force');
    const infernalFire = infernal.find((trace) => trace.modifierCapabilityIds?.some((id) => id.includes('infernal-force-fire')));
    const infernalPhysical = infernal.find((trace) => trace.modifierCapabilityIds?.some((id) => id.includes('infernal-force-physical')));
    expect(infernalFire?.status).toBe('active');
    expect(infernalFire?.recipientDragonId).toBe('rhysarion');
    expect(infernalPhysical?.status).toBe('active');
    expect(infernalPhysical?.recipientDragonId).toBe('vaeldra');
  });

  it('keeps the Lightning Strike formation baseline and aligned card counts intact', () => {
    const { traces, presentation } = buildAnalysis(lightningFormation);
    const cardSummary = presentation.cards.map((card) => ({
      dragonId: card.dragonId,
      receives: card.receives.length,
      provides: card.provides.length,
    }));
    expect(cardSummary).toEqual([
      { dragonId: 'malachite', receives: 8, provides: 8 },
      { dragonId: 'rhysarion', receives: 10, provides: 9 },
      { dragonId: 'vaeldra', receives: 13, provides: 10 },
    ]);
    expect(traces.some((trace) => trace.title === 'Lightning Strike - First-Strike source')).toBe(true);
    expect(traces.some((trace) => trace.title === 'Lightning Strike - Double-Strike source')).toBe(true);
    expect(traces.some((trace) => trace.title === 'Strength Stat Support')).toBe(true);
    expect(traces.some((trace) => trace.title === 'Strength Scaling Support')).toBe(true);
  });
});

function tracesForAbility(traces: SynergyTrace[], sourceAbilityId: string) {
  return traces.filter((trace) => trace.sourceAbilityId === sourceAbilityId);
}
