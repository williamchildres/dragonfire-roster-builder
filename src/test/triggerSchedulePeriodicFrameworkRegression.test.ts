import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

function reviewRoster(ids: string[]) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ids) {
    const entry = roster[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = 10;
    entry!.reignLevel = 26;
  }
  return roster;
}

function reviewTraces(formation: FormationAnalysisInput) {
  const ids = Object.values(formation).filter((id): id is string => Boolean(id));
  return analyzeFormationTraces(formation, dragons, {
    roster: reviewRoster(ids),
    dragonLevels: Object.fromEntries(ids.map((id) => [id, 26])),
    previewMaxRankInteractions: false,
  });
}

function reviewPresentation(formation: FormationAnalysisInput, traces: SynergyTrace[]) {
  const ids = Object.values(formation).filter((id): id is string => Boolean(id));
  return buildFormationCardPresentation(formation, dragons, traces, {
    previewEnabled: false,
    roster: reviewRoster(ids),
  });
}

function traceCounts(traces: SynergyTrace[]) {
  return traces.reduce<Record<TraceStatus, number>>((counts, trace) => {
    counts[trace.status] += 1;
    return counts;
  }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
}

function traceText(trace: SynergyTrace | undefined) {
  return trace
    ? [trace.title, trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions, ...trace.unresolvedQuestions].join(' ')
    : '';
}

function allCardText(result: ReturnType<typeof reviewPresentation>) {
  return result.cards
    .flatMap((card) => [...card.provides, ...card.receives])
    .flatMap((item) => [item.abilityName, item.effectTitle, item.title, item.summary, item.detail, ...item.summaryLines, ...item.details, ...item.effects])
    .join(' ');
}

const malachiteFormation: FormationAnalysisInput = {
  'left-flank': 'malachite',
  vanguard: 'venator',
  'right-flank': 'vermax',
};

const kalspireFormation: FormationAnalysisInput = {
  'left-flank': 'kalspire',
  vanguard: 'venator',
  'right-flank': 'vermax',
};

describe('trigger, schedule override, periodic damage framework regression', () => {
  it('repairs Malachite, Venator, and Vermax trigger and presentation traces', () => {
    const traces = reviewTraces(malachiteFormation);
    const counts = traceCounts(traces);
    const presentation = reviewPresentation(malachiteFormation, traces);
    const cardText = allCardText(presentation);

    expect(traces).toHaveLength(59);
    expect(counts).toMatchObject({ active: 21, potential: 27, inactive: 8, blocked: 1, unknown: 1, 'not-applicable': 1 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const override = traces.find((trace) => trace.ruleId === 'schedule-override' && trace.sourceAbilityId === 'venator-feral-strike');
    const overrideText = traceText(override);
    expect(overrideText).toContain('Double-Strike');
    expect(overrideText).toContain('Rounds 4, 6, and 8');
    expect(overrideText).toContain('40%');
    expect(overrideText).toContain('The replaced base roll is suppressed.');
    expect(overrideText).not.toMatch(/Round 1|Stun|odd-numbered/i);

    const doubleStrikeSource = traces.find((trace) =>
      trace.ruleId === 'self-status-output' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      /Double-Strike/.test(trace.title)
    );
    const doubleStrikeText = traceText(doubleStrikeSource);
    expect(doubleStrikeText).toContain('Resolved');
    expect(doubleStrikeText).toContain('Venator');
    expect(doubleStrikeText).toContain('Rounds 4, 6, and 8');
    expect(doubleStrikeText).toContain('40%');
    expect(doubleStrikeText).toContain('Duration: 2 rounds.');

    const feralTrigger = traces.find((trace) =>
      trace.matchKind === 'extra-basic-attack-trigger' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      trace.recipientAbilityId === 'venator-feral-strike'
    );
    const feralTriggerText = traceText(feralTrigger);
    expect(feralTriggerText).toContain("A second Basic Attack can trigger Feral Strike's after-Basic-Attack Physical Damage effects again.");
    expect(feralTriggerText).toContain('Excluded scheduled or non-event effect IDs: feral-strike-double-strike.');
    expect(feralTriggerText).toContain('Scheduled grant rolls do not repeat');
    expect(feralTriggerText).not.toContain('Target selection may choose another eligible recipient.');

    const precisionTrigger = traces.find((trace) =>
      trace.matchKind === 'extra-basic-attack-trigger' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      trace.recipientAbilityId === 'venator-feral-precision'
    );
    expect(traceText(precisionTrigger)).toContain("A second Basic Attack can trigger Feral Precision's added after-Basic-Attack Physical Damage again.");

    const allLightningTitles = traces.filter((trace) => trace.sourceAbilityId === 'malachite-lightning-strike').map((trace) => `${trace.ruleId}:${trace.title}`);
    expect(allLightningTitles.length).toBeGreaterThan(0);
    const lightningSources = traces.filter((trace) => trace.ruleId === 'status-source-output' && trace.sourceAbilityId === 'malachite-lightning-strike');
    expect(lightningSources.map((trace) => trace.title).sort()).toEqual(expect.arrayContaining([
      'Lightning Strike - First-Strike source',
      'Lightning Strike - Double-Strike source',
    ]));
    const lightningFirst = lightningSources.find((trace) => /First-Strike/.test(trace.title));
    const lightningDouble = lightningSources.find((trace) => /Double-Strike/.test(trace.title));
    const lightningStrength = traces.find((trace) => trace.sourceAbilityId === 'malachite-lightning-strike' && traceText(trace).includes('Strength'));
    for (const trace of [lightningFirst, lightningDouble]) {
      const text = traceText(trace);
      expect(text).toContain('Venator');
      expect(text).toContain('40%');
      expect(text).toContain('lightning-strike-round-one-shared-activation');
    }
    expect(traceText(lightningStrength)).toContain('Venator');
    expect(traceText(lightningStrength)).toContain('Strength');

    const reactiveVenator = traces.filter((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.recipientDragonId === 'venator'
    );
    expect(reactiveVenator.every((trace) => trace.status !== 'active')).toBe(true);

    expect(cardText).not.toContain('Rallying Flame self Physical');
    expect(cardText).not.toContain('Unyielding Resolve - Control cleanse');
    const armorBreakCards = presentation.cards.flatMap((card) => card.provides)
      .filter((item) => item.abilityName === 'Armor Break' && /Enemy Physical Damage vulnerability/.test(item.effectTitle));
    expect(armorBreakCards).toHaveLength(1);
  });

  it('repairs Kalspire, Venator, and Vermax periodic matching and target references', () => {
    const traces = reviewTraces(kalspireFormation);
    const counts = traceCounts(traces);
    const presentation = reviewPresentation(kalspireFormation, traces);
    const cardText = allCardText(presentation);

    expect(traces).toHaveLength(56);
    expect(counts).toMatchObject({ active: 22, potential: 22, inactive: 10, blocked: 1, unknown: 1, 'not-applicable': 0 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const overrideText = traceText(traces.find((trace) => trace.ruleId === 'schedule-override' && trace.sourceAbilityId === 'venator-feral-strike'));
    expect(overrideText).toContain('Double-Strike');
    expect(overrideText).toContain('Rounds 4, 6, and 8');
    expect(overrideText).toContain('40%');
    expect(overrideText).not.toMatch(/Round 1|Stun|odd-numbered/i);

    expect(traces.some((trace) =>
      trace.ruleId === 'self-status-output' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      /Double-Strike/.test(trace.title)
    )).toBe(true);

    const bleedSourceText = traceText(traces.find((trace) => trace.ruleId === 'status-source-output' && trace.sourceAbilityId === 'kalspire-tactical-strike' && /Bleed/.test(trace.title)));
    const bleedPeriodicText = traceText(traces.find((trace) => trace.ruleId === 'periodic-status-damage' && trace.sourceAbilityId === 'kalspire-tactical-strike' && trace.channel === 'physical-damage'));
    for (const text of [bleedSourceText, bleedPeriodicText]) {
      expect(text).toContain('original Basic Attack target');
      expect(text).toContain('other enemy within adjacency');
      expect(text).toContain('Independent per-target checks: 2.');
      expect(text).toContain('Bleed checks are separate for each target.');
    }

    const panicSourceText = traceText(traces.find((trace) => trace.ruleId === 'status-source-output' && trace.sourceAbilityId === 'kalspire-tactical-assault' && /Panic/.test(trace.title)));
    const panicPeriodicText = traceText(traces.find((trace) => trace.ruleId === 'periodic-status-damage' && trace.sourceAbilityId === 'kalspire-tactical-assault' && trace.channel === 'tactical-damage'));
    for (const text of [panicSourceText, panicPeriodicText]) {
      expect(text).toContain('Physical Damage target');
      expect(text).toContain('another distinct adjacent enemy');
      expect(text).toContain('Independent per-target checks: 2.');
      expect(text).toContain('Panic checks are separate for each target.');
      expect(text).not.toContain('Burn stacking');
    }

    const battleCunningText = traces
      .filter((trace) => trace.sourceAbilityId === 'kalspire-battle-cunning' && trace.matchKind === 'enemy-mitigation-reduction')
      .map(traceText)
      .join(' ');
    const huntersBaneText = traces
      .filter((trace) => trace.sourceAbilityId === 'venator-hunters-bane' && trace.matchKind === 'enemy-mitigation-reduction')
      .map(traceText)
      .join(' ');
    expect(battleCunningText).toContain('Panic periodic Tactical Damage');
    expect(huntersBaneText).toContain('Panic periodic Tactical Damage');

    const armorBreakText = traces
      .filter((trace) => trace.sourceAbilityId === 'venator-armor-break' && trace.matchKind === 'enemy-damage-received-increase')
      .map(traceText)
      .join(' ');
    expect(armorBreakText).toContain('Bleed periodic Physical Damage');
    const armorBreakCards = presentation.cards.flatMap((card) => card.provides)
      .filter((item) => item.abilityName === 'Armor Break' && /Enemy Physical Damage vulnerability/.test(item.effectTitle));
    expect(armorBreakCards).toHaveLength(1);
    expect(cardText).not.toContain('Rallying Flame self Physical');
    expect(cardText).not.toContain('Unyielding Resolve - Control cleanse');
  });
});
