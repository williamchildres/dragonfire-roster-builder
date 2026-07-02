import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { traceText } from './pass19Helpers';

const formation: FormationAnalysisInput = {
  'left-flank': 'malachite',
  vanguard: 'rhysarion',
  'right-flank': 'vaeldra',
};

const reactiveFormation: FormationAnalysisInput = {
  'left-flank': 'malachite',
  vanguard: 'venator',
  'right-flank': 'vermax',
};

function buildAnalysis(targetFormation: FormationAnalysisInput) {
  const selectedIds = Object.values(targetFormation).filter((dragonId): dragonId is string => Boolean(dragonId));
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
  const traces = analyzeFormationTraces(targetFormation, dragons, { roster, dragonLevels });
  const presentation = buildFormationCardPresentation(targetFormation, dragons, traces, { roster, previewEnabled: false });
  return { roster, traces, presentation };
}

function countByStatus(traces: SynergyTrace[]) {
  return traces.reduce<Record<TraceStatus, number>>((counts, trace) => {
    counts[trace.status] = (counts[trace.status] ?? 0) + 1;
    return counts;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function traceByTitle(traces: SynergyTrace[], title: string) {
  return traces.find((trace) => trace.title === title);
}

describe('Unresolved selection reason pass 19F', () => {
  it('keeps Inspiring Melody Stat Target Selection unresolved between Malachite and Vaeldra', () => {
    const { traces, presentation } = buildAnalysis(formation);
    const statTarget = traceByTitle(traces, 'Stat Target Selection');
    expect(statTarget).toBeDefined();
    expect(statTarget).toMatchObject({
      status: 'potential',
      recipientDragonId: null,
      modifierCapabilityIds: ['rhysarion-inspiring-melody-inspiring-melody-initiative-stat-dealt-modifier'],
      targetSelectionGroup: {
        targetCount: 1,
        eligibleRecipientDragonIds: ['malachite', 'vaeldra'],
        selectionUncertain: true,
        selection: 'one-eligible-adjacent',
      },
    });
    expect(traceText(statTarget!)).toContain('Eligible recipients: Malachite and Vaeldra.');
    expect(traceText(statTarget!)).toContain('The selected recipient is not guaranteed.');
    expect(traceText(statTarget!)).toContain('The selected recipient remains unresolved between Malachite and Vaeldra; activation success and the final stat formula remain unresolved.');
    expect(traceText(statTarget!)).not.toContain('Malachite is the resolved recipient');
    expect(traceText(statTarget!)).not.toContain('Vaeldra is the resolved recipient');
    expect(statTarget!.exactResultUnknownReason).toBe('The selected recipient remains unresolved between Malachite and Vaeldra; activation success and the final stat formula remain unresolved.');

    const inspiringProvides = presentation.cards.find((card) => card.dragonId === 'rhysarion')?.provides.filter((item) => item.abilityName === 'Inspiring Melody') ?? [];
    expect(inspiringProvides.length).toBeGreaterThan(0);
    expect(inspiringProvides.some((item) => item.targetLabel === 'Candidate 1 of 2' || item.targetLabel === 'Candidate 2 of 2' || item.targetLabel === 'Feskar' || item.targetLabel === 'Shadowsong')).toBe(false);
  });

  it('keeps Inspiring Melody Resistance source unresolved and shared with the same candidate set', () => {
    const { traces } = buildAnalysis(formation);
    const resistanceSource = traces.find((trace) =>
      trace.sourceAbilityId === 'rhysarion-inspiring-melody' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Inspiring Melody - Resistance source',
    );
    expect(resistanceSource).toBeDefined();
    expect(resistanceSource).toMatchObject({
      status: 'potential',
      recipientDragonId: null,
      modifierCapabilityIds: ['rhysarion-inspiring-melody-inspiring-melody-resistance-resistance-status-output'],
      targetSelectionGroup: {
        targetCount: 1,
        eligibleRecipientDragonIds: ['malachite', 'vaeldra'],
        selectionUncertain: true,
      },
    });
    const text = traceText(resistanceSource!);
    expect(text).toContain('Eligible ally recipients: Malachite, Vaeldra.');
    expect(text).toContain('Selected ally recipient is unresolved.');
    expect(text).not.toContain('Malachite is the resolved recipient');
    expect(text).not.toContain('Vaeldra is the resolved recipient');
  });

  it('keeps Inspiring Melody Damage Received Target Selection unresolved', () => {
    const { traces } = buildAnalysis(formation);
    const damageSelection = traceByTitle(traces, 'Damage Received Target Selection');
    expect(damageSelection).toBeDefined();
    expect(damageSelection).toMatchObject({
      status: 'potential',
      recipientDragonId: null,
      modifierCapabilityIds: ['rhysarion-inspiring-melody-inspiring-melody-resistance-damage-received-received-modifier'],
      targetSelectionGroup: {
        targetCount: 1,
        eligibleRecipientDragonIds: ['malachite', 'vaeldra'],
        selectionUncertain: true,
      },
    });
    const text = traceText(damageSelection!);
    expect(text).toContain('Eligible recipients: Malachite and Vaeldra.');
    expect(text).toContain('The selected recipient is not guaranteed.');
    expect(text).not.toContain('Malachite is the resolved recipient');
    expect(text).not.toContain('Vaeldra is the resolved recipient');
    expect(damageSelection!.exactResultUnknownReason).not.toContain('resolved recipient');
  });

  it('preserves Lightning Strike resolved-recipient and Reactive Instincts comparison uncertainty controls', () => {
    const lightning = buildAnalysis(formation).traces;
    const firstStrike = lightning.find((trace) =>
      trace.sourceAbilityId === 'malachite-lightning-strike' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Lightning Strike - First-Strike source' &&
      trace.recipientDragonId === 'rhysarion',
    );
    const doubleStrike = lightning.find((trace) =>
      trace.sourceAbilityId === 'malachite-lightning-strike' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Lightning Strike - Double-Strike source' &&
      trace.recipientDragonId === 'rhysarion',
    );
    const lightningStrength = lightning.find((trace) =>
      trace.sourceAbilityId === 'malachite-lightning-strike' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.title === 'Strength Stat Support' &&
      trace.recipientDragonId === 'rhysarion',
    );
    const lightningScaling = lightning.find((trace) =>
      trace.sourceAbilityId === 'malachite-lightning-strike' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.title === 'Strength Scaling Support' &&
      trace.recipientDragonId === 'rhysarion',
    );

    expect(firstStrike?.status).toBe('potential');
    expect(doubleStrike?.status).toBe('potential');
    expect(traceText(firstStrike!)).toContain('Rhysarion is the resolved recipient if Lightning Strike activates; exact activation and resulting uptime are not calculated.');
    expect(traceText(doubleStrike!)).toContain('Rhysarion is the resolved recipient if Lightning Strike activates; exact activation and resulting uptime are not calculated.');
    expect(traceText(lightningStrength!)).toContain('Rhysarion is the resolved recipient if Lightning Strike activates; activation success and the final stat formula remain unresolved.');
    expect(traceText(lightningScaling!)).toContain('Rhysarion is the resolved recipient if Lightning Strike activates; activation success and the final output formula remain unresolved.');
    expect(traceText(lightningStrength!)).not.toContain('The selected recipient remains unresolved between Malachite and Vaeldra');
    expect(traceText(lightningScaling!)).not.toContain('The selected recipient remains unresolved between Malachite and Vaeldra');

    const reactive = buildAnalysis(reactiveFormation).traces;
    const overall = reactive.find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'direct-stat-support' &&
      trace.title === 'Stat Target Selection',
    );
    const malachiteScaling = reactive.find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'malachite',
    );
    expect(overall?.status).toBe('active');
    expect(overall?.targetSelectionGroup?.selectionUncertain).toBe(true);
    expect(traceText(overall!)).toContain('selected recipient is not guaranteed');
    expect(malachiteScaling?.status).toBe('potential');
    expect(traceText(malachiteScaling!)).toContain('selected recipient identity, candidate comparison values, tie resolution, and final stat formula remain unresolved.');
  });

  it('keeps the formation technical analysis and card counts unchanged', () => {
    const { traces, presentation } = buildAnalysis(formation);
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
    expect(presentation.cards.find((card) => card.dragonId === 'malachite')?.receives.length).toBe(8);
    expect(presentation.cards.find((card) => card.dragonId === 'malachite')?.provides.length).toBe(8);
    expect(presentation.cards.find((card) => card.dragonId === 'rhysarion')?.receives.length).toBe(10);
    expect(presentation.cards.find((card) => card.dragonId === 'rhysarion')?.provides.length).toBe(9);
    expect(presentation.cards.find((card) => card.dragonId === 'vaeldra')?.receives.length).toBe(13);
    expect(presentation.cards.find((card) => card.dragonId === 'vaeldra')?.provides.length).toBe(10);
  });
});
