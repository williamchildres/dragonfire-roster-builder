import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace, TraceStatus } from '../models/synergy';
import {
  deriveOutputCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
  periodicDamageOutputCapabilities,
} from '../services/effectCapabilities';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity, traceStatusReason } from '../services/synergyTrace';

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

function cardsFor(result: ReturnType<typeof reviewPresentation>, abilityName: string) {
  return result.cards
    .flatMap((card) => [...card.provides, ...card.receives])
    .filter((item) => item.abilityName === abilityName);
}

function interactionText(item: ReturnType<typeof cardsFor>[number]) {
  return [
    item.abilityName,
    item.effectTitle,
    item.title,
    item.summary,
    item.detail,
    ...item.summaryLines,
    ...item.details,
    ...item.effects,
  ].join(' ');
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
  it('classifies status applications separately from direct and periodic damage outputs', () => {
    const outputs = deriveOutputCapabilities(dragons);
    const statusOutputs = deriveStatusOutputCapabilities(dragons);
    const periodicOutputs = periodicDamageOutputCapabilities(dragons, derivePeriodicDamageDefinitions(dragons), statusOutputs);

    expect(outputs.find((output) => output.id === 'kalspire-tactical-strike-tactical-strike-tactical-damage-output')?.outputKind).toBe('direct-damage');
    expect(outputs.find((output) => output.id === 'kalspire-tactical-assault-tactical-assault-panic-output')).toMatchObject({
      outputKind: 'status-application',
      channel: 'tactical-damage',
      statusId: 'panic',
    });
    expect(statusOutputs.find((output) => output.id === 'kalspire-tactical-strike-tactical-strike-bleed-bleed-status-output')).toBeDefined();
    expect(periodicOutputs.find((output) => output.id === 'periodic-kalspire-tactical-strike-tactical-strike-bleed-bleed-output')).toMatchObject({
      outputKind: 'periodic-status-damage',
      channel: 'physical-damage',
      statusId: 'bleed',
    });
    expect(periodicOutputs.find((output) => output.id === 'periodic-kalspire-tactical-assault-tactical-assault-panic-panic-output')).toMatchObject({
      outputKind: 'periodic-status-damage',
      channel: 'tactical-damage',
      statusId: 'panic',
    });
  });

  it('repairs Malachite, Venator, and Vermax trigger and presentation traces', () => {
    const traces = reviewTraces(malachiteFormation);
    const counts = traceCounts(traces);
    const presentation = reviewPresentation(malachiteFormation, traces);
    const cardText = allCardText(presentation);

    expect(traces).toHaveLength(58);
    expect(counts).toMatchObject({ active: 22, potential: 26, inactive: 7, blocked: 1, unknown: 1, 'not-applicable': 1 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const override = traces.find((trace) => trace.ruleId === 'schedule-override' && trace.sourceAbilityId === 'venator-feral-strike');
    const overrideText = traceText(override);
    expect(overrideText).toContain('Double-Strike');
    expect(overrideText).toContain('Rounds 4, 6, and 8');
    expect(overrideText).toContain('40%');
    expect(overrideText).toContain('the original 30% roll is suppressed');
    expect(overrideText).toContain('Double-Strike still targets Self and lasts 2 rounds.');
    expect(override!.matchedFacts).toEqual(expect.arrayContaining([
      'Base source ability: Feral Strike.',
      'Override source ability: Feral Precision.',
      'Effective schedule: Rounds 4, 6, and 8.',
      'Effective chance at Habit Level 1: 40%.',
      'Base chance: 30%.',
      'The original 30% Double-Strike roll is suppressed.',
    ]));
    expect(override!.matchedFacts.filter((fact) => /Effective chance at Habit Level 1/i.test(fact))).toHaveLength(1);
    expect(override!.matchedFacts.filter((fact) => /roll is suppressed|does not also occur|not emitted/i.test(fact))).toHaveLength(1);
    expect(overrideText).not.toMatch(/\.\.|;\./);
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
    expect(doubleStrikeText).toContain('Base source ability: Feral Strike.');
    expect(doubleStrikeText).toContain('Override source ability: Feral Precision.');
    expect(doubleStrikeText).toContain('Effective Feral Precision Habit Level: 1.');
    expect(doubleStrikeText).not.toContain('Current effective Feral Strike Habit Level');

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
    expect(traceStatusReason(feralTrigger!)).not.toMatch(/stack count/i);

    const precisionTrigger = traces.find((trace) =>
      trace.matchKind === 'extra-basic-attack-trigger' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      trace.recipientAbilityId === 'venator-feral-precision'
    );
    expect(traceText(precisionTrigger)).toContain("A second Basic Attack can trigger Feral Precision's added after-Basic-Attack Physical Damage again.");
    expect(traceStatusReason(precisionTrigger!)).not.toMatch(/stack count/i);

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
      expect(trace?.matchKind).toBe('status-condition-enablement');
      expect(text).toContain('Venator');
      expect(text).toContain('40%');
      expect(text).toContain('lightning-strike-round-one-shared-activation');
    }
    expect(traceText(lightningStrength)).toContain('Venator');
    expect(traceText(lightningStrength)).toContain('Strength');
    expect(traceStatusReason(lightningStrength!)).not.toMatch(/stack count/i);

    const reactiveVenator = traces.filter((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.recipientDragonId === 'venator'
    );
    expect(reactiveVenator.every((trace) => trace.status !== 'active')).toBe(true);
    const reactiveMalachite = traces.find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'malachite'
    );
    expect(reactiveMalachite?.status).toBe('active');

    const spreadingBlazeText = traceText(traces.find((trace) => trace.sourceAbilityId === 'vermax-spreading-blaze' && trace.recipientDragonId === 'malachite'));
    const rallyingFlameText = traceText(traces.find((trace) => trace.sourceAbilityId === 'vermax-rallying-flame' && trace.recipientDragonId === 'malachite' && trace.channel === 'tactical-damage'));
    for (const text of [spreadingBlazeText, rallyingFlameText]) {
      expect(text).toContain('Resolved output-qualified recipient: Malachite.');
      expect(text).toContain('Only one ally has qualifying Tactical Damage output for this selector.');
      expect(text).not.toContain('Target choice may not be guaranteed');
    }

    const lightningCardText = cardsFor(presentation, 'Lightning Strike').map((item) => `${item.summary} ${item.detail}`).join(' ');
    expect(lightningCardText).toContain('Strength');
    expect(lightningCardText).toContain('Strength +25%');
    expect(lightningCardText).toContain('First-Strike');
    expect(lightningCardText).toContain('Double-Strike');
    expect(lightningCardText).toContain('40%');
    expect(lightningCardText).toContain('Round 1');
    expect(lightningCardText).toContain('Duration: 3 rounds.');

    const forestsInstinctText = cardsFor(presentation, "Forest's Instinct").map(interactionText).join(' ');
    expect(forestsInstinctText).not.toMatch(/future progression|Future unlock/i);

    const collectiveMightTraces = traces.filter((trace) => trace.sourceAbilityId === 'malachite-collective-might');
    expect(collectiveMightTraces.some((trace) => trace.ruleId === 'direct-stat-support')).toBe(true);
    expect(collectiveMightTraces.some((trace) => trace.ruleId === 'stat-scaling-support')).toBe(true);
    expect(traceStatusReason(collectiveMightTraces.find((trace) => trace.ruleId === 'stat-scaling-support')!)).not.toMatch(/stack count/i);

    const malachiteCard = presentation.cards.find((card) => card.dragonId === 'malachite');
    expect(malachiteCard).toBeDefined();
    const collectiveProvides = malachiteCard!.provides.filter((item) => item.abilityName === 'Collective Might');
    expect(collectiveProvides).toHaveLength(1);
    expect(collectiveProvides[0]).toMatchObject({
      recipientName: 'Team',
      targetLabel: 'Team',
      effectTitle: 'Collective Might - Stat support',
    });
    const collectiveProviderText = interactionText(collectiveProvides[0]!);
    expect(collectiveProviderText).toContain('Applies to Malachite, Venator, and Vermax');
    expect(collectiveProviderText).toContain('Strength +12.5% at effective Habit Level 1.');
    expect(collectiveProviderText).toMatch(/Duration: until end of combat/i);
    expect(collectiveProviderText).toContain('Feral Strike');
    expect(collectiveProviderText).toContain('Feral Precision');
    expect(collectiveProviderText).toContain('Desperate Ambush');
    expect(collectiveProviderText).toContain('Basic Attack');
    expect(collectiveProviderText).toContain('Spreading Blaze');
    expect(collectiveProviderText).not.toContain('One recipient is selected');

    const malachiteCollectiveReceives = malachiteCard!.receives.filter((item) => item.abilityName === 'Collective Might');
    expect(malachiteCollectiveReceives).toHaveLength(1);
    expect(interactionText(malachiteCollectiveReceives[0]!)).toContain('Strength +12.5% at effective Habit Level 1.');
    expect(interactionText(malachiteCollectiveReceives[0]!)).not.toContain('One recipient is selected');
    for (const [dragonId, expectedOutputs] of [
      ['venator', ['Feral Strike', 'Feral Precision', 'Desperate Ambush']],
      ['vermax', ['Basic Attack', 'Spreading Blaze']],
    ] as const) {
      const receiveCards = presentation.cards.find((card) => card.dragonId === dragonId)!.receives
        .filter((item) => item.abilityName === 'Collective Might');
      expect(receiveCards).toHaveLength(1);
      const receiveText = interactionText(receiveCards[0]!);
      expect(receiveCards[0]!.traceIds.length).toBeGreaterThan(1);
      expect(receiveText).toContain('Strength +12.5% at effective Habit Level 1.');
      expect(receiveText).not.toContain('One recipient is selected');
      for (const output of expectedOutputs) {
        expect(receiveText).toContain(output);
      }
    }

    const rallyingFlameTrace = traces.find((trace) =>
      trace.sourceAbilityId === 'vermax-rallying-flame' &&
      trace.ruleId === 'internal-self-modifier'
    );
    expect(traceText(rallyingFlameTrace)).toContain('Physical Damage Dealt +5% per stack');
    expect(traceText(rallyingFlameTrace)).toContain('Maximum theoretical modifier at effective Habit Level 1: 20% Physical Damage Dealt.');

    const warriorsZealCards = cardsFor(presentation, "Warrior's Zeal").filter((item) => item.recipientName === 'Malachite');
    expect(warriorsZealCards.some((item) => item.traceIds.length > 1)).toBe(true);

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

    expect(traces).toHaveLength(53);
    expect(counts).toMatchObject({ active: 23, potential: 19, inactive: 9, blocked: 1, unknown: 1, 'not-applicable': 0 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const overrideText = traceText(traces.find((trace) => trace.ruleId === 'schedule-override' && trace.sourceAbilityId === 'venator-feral-strike'));
    expect(overrideText).toContain('Double-Strike');
    expect(overrideText).toContain('Rounds 4, 6, and 8');
    expect(overrideText).toContain('40%');
    expect(overrideText).toContain('the original 30% roll is suppressed');
    expect(overrideText).not.toMatch(/\.\.|;\./);
    expect(overrideText).not.toMatch(/Round 1|Stun|odd-numbered/i);

    expect(traces.some((trace) =>
      trace.ruleId === 'self-status-output' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      /Double-Strike/.test(trace.title)
    )).toBe(true);
    expect(traceText(traces.find((trace) =>
      trace.ruleId === 'self-status-output' &&
      trace.sourceAbilityId === 'venator-feral-strike' &&
      /Double-Strike/.test(trace.title)
    ))).not.toContain('Current effective Feral Strike Habit Level');

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

    const battleCunningCards = cardsFor(presentation, 'Battle Cunning').map(interactionText).join(' ');
    expect(cardsFor(presentation, 'Battle Cunning').every((item) => item.state === 'active')).toBe(true);
    expect(battleCunningCards).toContain('Enemy Physical Damage Dealt reduction');
    expect(battleCunningCards).toContain('Enemy Fire Damage Dealt reduction');
    expect(battleCunningCards).toContain("Base Enemy Strength -6.5% on 3 enemy targets; final reduction scales with Kalspire's Instinct and remains unresolved.");
    expect(battleCunningCards).toContain("Base Enemy Intelligence -6.5% on 3 enemy targets; final reduction scales with Kalspire's Instinct and remains unresolved.");
    expect(battleCunningCards).toContain('Timing: Start of combat.');
    expect(battleCunningCards).toContain('Duration: until end of combat.');
    expect(battleCunningCards).not.toContain('Target selection and uptime are uncertain.');
    expect(cardsFor(presentation, 'Battle Cunning').flatMap((item) => [...item.details, ...item.effects]).join(' ')).toContain('Base Enemy Intelligence reduction -6.5%');
    const huntersBaneCards = cardsFor(presentation, "Hunter's Bane").map(interactionText).join(' ');
    expect(huntersBaneCards).toContain('Enemy Fire Damage Dealt reduction');
    expect(huntersBaneCards).toContain("Base Enemy Intelligence -30% on 1 enemy target; final reduction scales with Venator's Strength and remains unresolved.");
    expect(huntersBaneCards).toContain('Timing: Start of combat.');
    expect(cardsFor(presentation, "Hunter's Bane").flatMap((item) => [...item.details, ...item.effects]).join(' ')).toContain('Base Enemy Intelligence reduction -30%');
    expect(traceStatusReason(traces.find((trace) => trace.sourceAbilityId === 'venator-hunters-bane' && trace.matchKind === 'enemy-mitigation-reduction')!)).not.toMatch(/activation/i);
    expect(traceStatusReason(traces.find((trace) => trace.sourceAbilityId === 'venator-hunters-bane' && trace.matchKind === 'enemy-mitigation-reduction')!)).not.toMatch(/stack count/i);

    const statusApplicationCards = [
      ...cardsFor(presentation, 'Tactical Strike'),
      ...cardsFor(presentation, 'Tactical Assault'),
    ].map(interactionText).join(' ');
    expect(statusApplicationCards).toContain('independently checks 2 eligible enemy targets');
    expect(statusApplicationCards).toContain('30% each to apply Bleed');
    expect(statusApplicationCards).toContain('15% each to apply Panic');

    const stackSupport = traces.filter((trace) =>
      (trace.sourceAbilityId === 'vermax-spreading-blaze' || trace.sourceAbilityId === 'vermax-rallying-flame') &&
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.recipientDragonId === 'kalspire' &&
      trace.channel === 'tactical-damage'
    );
    expect(stackSupport).toHaveLength(2);
    for (const trace of stackSupport) {
      expect(trace.matchedOutputCapabilityIds).toEqual(expect.arrayContaining([
        'kalspire-tactical-strike-tactical-strike-tactical-damage-output',
        'periodic-kalspire-tactical-assault-tactical-assault-panic-panic-output',
      ]));
      expect(trace.matchedOutputCapabilityIds).not.toContain('kalspire-tactical-assault-tactical-assault-panic-output');
      expect(trace.matchedOutputCapabilityIds?.some((id) => /panic-status-output/.test(id))).toBe(false);
      expect(traceText(trace)).toContain('Resolved output-qualified recipient: Kalspire.');
      expect(traceText(trace)).toContain('Panic periodic Tactical Damage');
      expect(traceText(trace)).not.toContain('Target choice may not be guaranteed');
      expect(traceText(trace)).toContain('Tactical Damage Dealt +2.5% per stack');
      expect(trace.exactResultUnknownReason).toContain('final stack count');
      expect(traceStatusReason(trace)).toMatch(/final stack count/i);
      expect(traceStatusReason(trace)).not.toMatch(/target choice|target selection|future progression/i);
    }
    expect(traces.filter((trace) => trace.matchKind === 'periodic-damage-amplification' && trace.recipientDragonId === 'kalspire')).toHaveLength(0);

    const bleedPeriodicTrace = traces.find((trace) => trace.matchKind === 'periodic-status-damage' && trace.sourceAbilityId === 'kalspire-tactical-strike' && trace.channel === 'physical-damage');
    const panicPeriodicTrace = traces.find((trace) => trace.matchKind === 'periodic-status-damage' && trace.sourceAbilityId === 'kalspire-tactical-assault' && trace.channel === 'tactical-damage');
    for (const trace of [bleedPeriodicTrace, panicPeriodicTrace]) {
      expect(trace).toBeDefined();
      expect(trace?.exactResultUnknownReason).not.toMatch(/stack count/i);
      expect(traceStatusReason(trace!)).not.toMatch(/stack count/i);
    }

    const reactiveKalspire = traces.find((trace) =>
      trace.sourceAbilityId === 'vermax-reactive-instincts' &&
      trace.ruleId === 'stat-scaling-support' &&
      trace.recipientDragonId === 'kalspire'
    );
    expect(reactiveKalspire?.status).toBe('active');
    expect(traceStatusReason(reactiveKalspire!)).toBe('All required source, target, placement, and unlock requirements are satisfied.');

    const radiantStunText = traceText(traces.find((trace) => trace.ruleId === 'self-status-output' && trace.sourceAbilityId === 'kalspire-radiant-conqueror' && /Stun/.test(trace.title)));
    expect(radiantStunText).toContain('Stun application is deterministic');
    expect(radiantStunText).not.toContain('Stun application success is unresolved');

    const radiantCards = cardsFor(presentation, 'Radiant Conqueror');
    expect(radiantCards.map((item) => item.effectTitle)).toEqual(expect.arrayContaining([
      'Radiant Conqueror - Enemy Fire Damage Dealt reduction',
      'Radiant Conqueror - Enemy non-Basic Physical Damage Dealt reduction',
    ]));
    const radiantEnemyCards = radiantCards.filter((item) => /Enemy .*Damage Dealt reduction/i.test(item.effectTitle));
    expect(radiantEnemyCards).toHaveLength(2);
    for (const item of radiantEnemyCards) {
      const text = interactionText(item);
      expect(text).not.toContain('Target selection and uptime are uncertain.');
      expect(text).toContain('Timing: Start of Round 2.');
      expect(text).toContain('Duration: 5 rounds.');
      expect(item.state).toBe('conditional');
    }

    const warriorsZealCardText = cardsFor(presentation, "Warrior's Zeal")
      .filter((item) => item.recipientName === 'Kalspire')
      .map((item) => `${item.summary} ${item.detail} ${item.traceIds.join(' ')}`)
      .join(' ');
    expect(warriorsZealCardText).toContain('Instinct');
    expect(warriorsZealCardText).toContain('Initiative');
    expect(warriorsZealCardText).toContain('Tactical Strike');
    expect(cardsFor(presentation, 'Reactive Instincts').some((item) => item.recipientName === 'Kalspire' && item.state === 'active')).toBe(true);
    const reactiveCardText = cardsFor(presentation, 'Reactive Instincts')
      .filter((item) => item.recipientName === 'Kalspire')
      .map(interactionText)
      .join(' ');
    expect(reactiveCardText).toContain('Instinct +18% at effective Habit Level 1.');
    expect(reactiveCardText).toContain('Initiative +9% at effective Habit Level 1.');

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
