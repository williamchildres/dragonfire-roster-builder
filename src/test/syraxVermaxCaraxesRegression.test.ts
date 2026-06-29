import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const formation: FormationAnalysisInput = {
  'left-flank': 'syrax',
  vanguard: 'vermax',
  'right-flank': 'caraxes',
};

function reviewRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['syrax', 'vermax', 'caraxes']) {
    const entry = roster[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = 10;
    entry!.reignLevel = 26;
  }
  return roster;
}

function reviewTraces() {
  return analyzeFormationTraces(formation, dragons, {
    roster: reviewRoster(),
    dragonLevels: { syrax: 26, vermax: 26, caraxes: 26 },
    previewMaxRankInteractions: false,
  });
}

function reviewPresentation() {
  const roster = reviewRoster();
  const traces = reviewTraces();
  return buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
}

function traceCounts(traces: SynergyTrace[]) {
  return traces.reduce<Record<SynergyTrace['status'], number>>((counts, trace) => {
    counts[trace.status] += 1;
    return counts;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function traceText(trace: SynergyTrace | undefined) {
  return trace
    ? [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions, ...trace.unresolvedQuestions].join(' ')
    : '';
}

function interactionText(item: {
  summary: string;
  detail: string;
  summaryLines: string[];
  details: string[];
  effects: string[];
}) {
  return [item.summary, item.detail, ...item.summaryLines, ...item.details, ...item.effects].join(' ');
}

describe('Syrax / Vermax / Caraxes coverage and reason repair', () => {
  it('keeps the reviewed counts, status mix, and trace identities stable', () => {
    const traces = reviewTraces();

    expect(traces).toHaveLength(57);
    expect(traceCounts(traces)).toMatchObject({
      active: 28,
      potential: 18,
      inactive: 9,
      blocked: 1,
      unknown: 1,
      'not-applicable': 0,
    });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });

  it('keeps complete-coverage mitigation cards active in the renderer model', () => {
    const traces = reviewTraces();
    const result = reviewPresentation();
    const syrax = result.cards.find((card) => card.dragonId === 'syrax');
    const caraxes = result.cards.find((card) => card.dragonId === 'caraxes');
    const interactions = result.cards.flatMap((card) => [...card.receives, ...card.provides]);
    const battleDreadTrace = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-battle-dread' &&
      trace.matchKind === 'enemy-mitigation-reduction',
    );
    const flightMasteryTrace = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-flight-mastery' &&
      trace.matchKind === 'enemy-mitigation-reduction',
    );

    expect(syrax).toBeDefined();
    expect(caraxes).toBeDefined();
    expect(syrax?.traitStatus?.state).toBe('inactive');
    expect(caraxes?.traitStatus?.state).toBe('inactive');

    const flightMastery = interactions.find((item) => item.abilityName === 'Flight Mastery' && item.effectTitle === 'Flight Mastery - Enemy mitigation reduction');
    const battleDread = interactions.find((item) => item.abilityName === 'Battle Dread' && item.effectTitle === 'Battle Dread - Enemy mitigation reduction');

    expect(flightMasteryTrace?.status).toBe('active');
    expect(battleDreadTrace?.status).toBe('active');
    expect(flightMastery?.state).toBe('active');
    expect(battleDread?.state).toBe('active');

    for (const item of [flightMastery, battleDread]) {
      const text = interactionText(item!);
      expect(text).toContain('All three enemy slots are covered');
      expect(text).toContain('Duration: until end of combat.');
      expect(text).toContain('Enemy Initiative');
      expect(text).not.toMatch(/Target not guaranteed|selection-dependent|enemy identity/i);
    }
  });

  it('keeps deterministic stat-scaling interactions active without inheriting downstream selection uncertainty', () => {
    const traces = reviewTraces();
    const result = reviewPresentation();

    const mindfulSynergy = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-mindful-synergy' &&
      trace.recipientAbilityId === 'caraxes-infernal-burst' &&
      trace.matchKind === 'stat-scaling-support',
    );
    const flightMasteryStrategic = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-flight-mastery' &&
      trace.recipientAbilityId === 'syrax-strategic-revival' &&
      trace.matchKind === 'stat-scaling-support',
    );
    const flightMasteryBloodWyrm = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-flight-mastery' &&
      trace.recipientAbilityId === 'caraxes-blood-wyrm' &&
      trace.matchKind === 'stat-scaling-support',
    );
    const warriorsZealStrategic = traces.find((trace) =>
      trace.sourceAbilityId === 'vermax-warriors-zeal' &&
      trace.recipientAbilityId === 'syrax-strategic-revival' &&
      trace.matchKind === 'stat-scaling-support',
    );

    for (const trace of [mindfulSynergy, flightMasteryStrategic, flightMasteryBloodWyrm, warriorsZealStrategic]) {
      expect(trace?.status).toBe('active');
      expect(trace?.exactResultUnknownReason).toMatch(/final combat formulas and stacking order|final value and stacking order/i);
      expect(trace?.exactResultUnknownReason).not.toMatch(/recipient selection|target selection/i);
    }

    const presentationItems = result.cards.flatMap((card) => [...card.receives, ...card.provides]);
    const mindfulItems = presentationItems.filter((item) => item.abilityName === 'Mindful Synergy');
    const flightItems = presentationItems.filter((item) => item.abilityName === 'Flight Mastery');
    const zealItems = presentationItems.filter((item) => item.abilityName === "Warrior's Zeal");

    expect(mindfulItems.some((item) => item.state === 'active')).toBe(true);
    expect(flightItems.some((item) => item.state === 'active')).toBe(true);
    expect(zealItems.some((item) => item.state === 'active')).toBe(true);
  });

  it('keeps Slow, Burn, First-Strike source, and Burn periodic wording typed', () => {
    const traces = reviewTraces();

    const slowSource = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Crippling Inferno - Slow attempt',
    );
    const burnSource = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Crippling Inferno - Burn attempt',
    );
    const burnPeriodic = traces.find((trace) =>
      trace.sourceAbilityId === 'caraxes-crippling-inferno' &&
      trace.ruleId === 'periodic-status-damage' &&
      trace.channel === 'fire-damage',
    );
    const firstStrikeSource = traces.find((trace) =>
      trace.sourceAbilityId === 'syrax-blazing-fury' &&
      trace.ruleId === 'status-source-output' &&
      trace.title === 'Blazing Fury - First-Strike source',
    );

    expect(slowSource?.exactResultUnknownReason).toBe('Exact status application cannot be calculated because application success, uptime, refresh behavior, and first-tick timing are unresolved.');
    expect(burnSource?.exactResultUnknownReason).toBe('Exact status application cannot be calculated because application success, uptime, refresh behavior, and first-tick timing are unresolved.');
    expect(burnPeriodic?.exactResultUnknownReason).toBe('Exact final periodic damage cannot be calculated because application success on each independently checked enemy, successful-application uptime, first-tick timing, refresh behavior, stacking, mitigation, and final formulas are unresolved.');
    expect(firstStrikeSource?.exactResultUnknownReason).toBe('Caraxes is the resolved recipient if Blazing Fury activates; exact activation and resulting uptime are not calculated.');

    const slowText = traceText(slowSource);
    const burnText = traceText(burnSource);
    const burnPeriodicText = traceText(burnPeriodic);
    const firstStrikeText = traceText(firstStrikeSource);

    expect(slowText).toContain('Independent per-target checks: 3.');
    expect(slowText).not.toMatch(/final formula|target selection|target overlap/i);
    expect(burnText).toContain('Independent per-target checks: 3.');
    expect(burnText).not.toMatch(/final formula|target selection|target overlap/i);
    expect(burnPeriodicText).toContain('Application success on each independently checked enemy');
    expect(burnPeriodicText).not.toMatch(/target selection|target overlap/i);
    expect(firstStrikeText).toContain('Resolved ally recipient: Caraxes.');
    expect(firstStrikeText).toContain('Activation success is unresolved.');
    expect(firstStrikeText).not.toContain('Selected ally recipient is unresolved.');
    expect(firstStrikeText).not.toMatch(/enemy identity|target overlap/i);
  });

  it('keeps Tactical Inferno recipient wording resolved and stack traces uncertain', () => {
    const traces = reviewTraces();
    const result = reviewPresentation();
    const syrax = result.cards.find((card) => card.dragonId === 'syrax');
    const vermax = result.cards.find((card) => card.dragonId === 'vermax');

    const tacticalInferno = syrax?.provides.filter((item) => item.abilityName === 'Tactical Inferno') ?? [];
    expect(tacticalInferno).toHaveLength(1);
    expect(tacticalInferno[0]?.state).toBe('active');
    expect(interactionText(tacticalInferno[0]!)).toContain('resolved by the verified flank preference');
    expect(interactionText(tacticalInferno[0]!)).not.toContain('selection-dependent');
    expect(interactionText(tacticalInferno[0]!)).toContain('18%');
    expect(interactionText(tacticalInferno[0]!)).toContain('Duration: 3 rounds.');

    const spreadingBlaze = vermax?.provides.find((item) => item.abilityName === 'Spreading Blaze');
    const rallyingFlame = vermax?.provides.find((item) => item.abilityName === 'Rallying Flame');
    const rallyingFlameTrace = traces.find((trace) =>
      trace.sourceAbilityId === 'vermax-rallying-flame' &&
      trace.ruleId === 'internal-self-modifier',
    );

    expect(interactionText(spreadingBlaze!)).toContain('Current stack count is unknown.');
    expect(interactionText(rallyingFlame!)).toContain('Current stack count is unknown.');
    expect(interactionText(spreadingBlaze!)).toContain('theoretical +25%');
    expect(traceText(rallyingFlameTrace)).toContain('Physical Damage Dealt +5% per stack');
    expect(traceText(rallyingFlameTrace)).toContain('Maximum theoretical modifier at effective Habit Level 1: 20% Physical Damage Dealt.');

    const blockedConflict = reviewTraces().find((trace) => trace.ruleId === 'verified-vanguard-position-conflict');
    expect(blockedConflict?.status).toBe('blocked');
  });
});
