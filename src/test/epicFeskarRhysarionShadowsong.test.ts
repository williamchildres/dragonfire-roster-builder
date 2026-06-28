import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
import { defaultSynergyRules } from '../data/synergyRules';
import type { FormationAnalysisInput, TraceStatus } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import {
  analyzeCapabilityAmplifications,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
  formatScheduleDescription,
  scheduleDurationOverlapWindows,
  scheduleRoundsForOverlap,
  sourceScopesCompatible,
} from '../services/effectCapabilities';
import { resolveAllyTargets } from '../services/formationRules';
import { resolveEffectiveHabitLevel } from '../services/habitLevels';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormation } from '../services/synergyEngine';
import { analyzeFormationTraces, createSynergyAuditExport, isNormalSynergyTrace, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

function dragon(id: string) {
  const found = dragons.find((item) => item.id === id);
  expect(found).toBeDefined();
  return found!;
}

function habit(dragonId: string, abilityId: string) {
  const found = dragon(dragonId).habits.find((item) => item.id === abilityId);
  expect(found).toBeDefined();
  return found!;
}

function ownedRoster(dragonIds: string[], starRank = 10, habitLevel: 0 | 1 | 2 | 3 | 4 | 5 | null | undefined = 5) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of dragonIds) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.reignLevel = 30;
    entry.starRank = starRank;
    if (habitLevel !== undefined) {
      for (const habitId of Object.keys(entry.habitLevels)) {
        entry.habitLevels[habitId] = habitLevel;
      }
    }
  }
  return roster;
}

describe('Feskar, Rhysarion, and Shadowsong Epic profiles', () => {
  it('normalizes recipient interaction scope centrally while preserving semantic non-recipient scopes', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'daemoros', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['daemoros', 'rhysarion', 'shadowsong'], 10, 0);
    for (const dragonId of ['daemoros', 'rhysarion', 'shadowsong']) {
      roster[dragonId]!.reignLevel = 26;
    }
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { daemoros: 26, rhysarion: 26, shadowsong: 26 },
      previewMaxRankInteractions: false,
    });

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceDragonId: 'rhysarion', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'rhysarion', matchKind: 'outgoing-effect-amplification', channel: 'recovery', interactionScope: 'internal' }),
      expect.objectContaining({ sourceDragonId: 'rhysarion', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'rhysarion', matchKind: 'friendly-impairment', channel: 'damage-dealt', interactionScope: 'internal' }),
      expect.objectContaining({ sourceDragonId: 'rhysarion', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'daemoros', matchKind: 'outgoing-effect-amplification', channel: 'recovery', interactionScope: 'cross-dragon' }),
      expect.objectContaining({ sourceAbilityId: 'shadowsong-blazing-onslaught', recipientDragonId: null, matchKind: 'enemy-damage-received-increase', interactionScope: 'enemy-side' }),
      expect.objectContaining({ recipientDragonId: null, interactionScope: 'targeting-fact' }),
    ]));
  });

  it('derives generic duration overlap windows for carryover and same-round order dependence', () => {
    const instillSchedule = habit('daemoros', 'daemoros-instill-fear').schedules[0]!;
    const darkeningSchedule = habit('daemoros', 'daemoros-darkening-fear').schedules[0]!;
    const shroudSchedule = habit('daemoros', 'daemoros-shroud-of-shadows').schedules[0]!;
    const breathSchedule = dragon('shadowsong').command!.schedules.find((schedule) => schedule.id === 'breath-of-fire-base-rounds')!;
    const dependentRounds = scheduleRoundsForOverlap(breathSchedule)!;
    const maxDependentRound = Math.max(...dependentRounds);

    for (const supplierSchedule of [instillSchedule, darkeningSchedule]) {
      const supplierRounds = scheduleRoundsForOverlap(supplierSchedule, maxDependentRound)!;
      const windows = scheduleDurationOverlapWindows(supplierRounds, dependentRounds, 2);
      expect(windows.filter((window) => window.kind === 'carryover')).toEqual([
        { dependentRound: 2, supplierRound: 1, sameRound: false, kind: 'carryover' },
        { dependentRound: 5, supplierRound: 4, sameRound: false, kind: 'carryover' },
        { dependentRound: 8, supplierRound: 7, sameRound: false, kind: 'carryover' },
      ]);
      expect(windows.filter((window) => window.kind === 'same-round-order-dependent')).toEqual([
        { dependentRound: 2, supplierRound: 2, sameRound: true, kind: 'same-round-order-dependent' },
        { dependentRound: 5, supplierRound: 5, sameRound: true, kind: 'same-round-order-dependent' },
        { dependentRound: 8, supplierRound: 8, sameRound: true, kind: 'same-round-order-dependent' },
      ]);
    }

    const shroudRounds = scheduleRoundsForOverlap(shroudSchedule, maxDependentRound)!;
    const shroudWindows = scheduleDurationOverlapWindows(shroudRounds, dependentRounds, 2);
    expect(shroudWindows).toEqual([
      { dependentRound: 2, supplierRound: 1, sameRound: false, kind: 'carryover' },
      { dependentRound: 5, supplierRound: 5, sameRound: true, kind: 'same-round-order-dependent' },
      { dependentRound: 8, supplierRound: 7, sameRound: false, kind: 'carryover' },
    ]);
    expect(shroudWindows.some((window) => window.sameRound && [2, 8].includes(window.dependentRound))).toBe(false);
    expect(scheduleDurationOverlapWindows([1], [2, 3], 2)).toEqual([
      { dependentRound: 2, supplierRound: 1, sameRound: false, kind: 'carryover' },
    ]);
  });

  it('renders structured schedule descriptions before falling back to unresolved wording', () => {
    const instillSchedule = habit('daemoros', 'daemoros-instill-fear').schedules[0]!;
    const shroudSchedule = habit('daemoros', 'daemoros-shroud-of-shadows').schedules[0]!;
    const breathSchedule = dragon('shadowsong').command!.schedules.find((schedule) => schedule.id === 'breath-of-fire-base-rounds')!;
    const evenSchedule = dragon('vhagar').command!.schedules.find((schedule) => schedule.id === 'fiery-bonds-even-physical')!;
    const startRoundSchedule = habit('rhysarion', 'rhysarion-ebbing-fury').schedules.find((schedule) => schedule.id === 'ebbing-fury-round-four-recovery')!;

    expect(formatScheduleDescription(shroudSchedule, { style: 'inline' })).toBe('odd-numbered rounds');
    expect(formatScheduleDescription(evenSchedule, { style: 'inline' })).toBe('even-numbered rounds');
    expect(formatScheduleDescription(instillSchedule, { style: 'inline' })).toBe('each round');
    expect(formatScheduleDescription(breathSchedule, { style: 'sentence' })).toBe('Rounds 2, 5, and 8');
    expect(formatScheduleDescription(startRoundSchedule, { style: 'sentence' })).toBe('Start of Round 4');
    expect(formatScheduleDescription({ ...breathSchedule, rounds: [], roundSelector: null }, { fallback: 'unresolved schedule' })).toBe('unresolved schedule');
  });

  it('stores metadata, affinities, observations, commands, traits, habits, and screenshot evidence', () => {
    expect(dragon('feskar')).toMatchObject({ rarity: 'Epic', breed: 'Champion', affinities: { Cavalry: 'positive', Siege: 'negative' } });
    expect(dragon('rhysarion')).toMatchObject({ rarity: 'Epic', breed: 'Champion', affinities: { Spearmen: 'positive', Shieldbearers: 'positive', Siege: 'positive' } });
    expect(dragon('shadowsong')).toMatchObject({ rarity: 'Epic', breed: 'Hunter', affinities: { Cavalry: 'positive' } });
    expect(dragon('feskar').command?.name).toBe('Calculated Assault');
    expect(dragon('rhysarion').command?.name).toBe('Dawnsong');
    expect(dragon('shadowsong').command?.name).toBe('Breath of Fire');
    expect(dragon('feskar').habits).toHaveLength(5);
    expect(dragon('rhysarion').habits).toHaveLength(5);
    expect(dragon('shadowsong').habits).toHaveLength(5);
    expect(Object.values(dragon('feskar').stats).every((value) => value === null)).toBe(true);
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'feskar')).toMatchObject({ dragonLevel: 30, starRank: 1, canonical: false, combatStats: { strength: 61.0, instinct: 102.8, intelligence: 102.8, initiative: 102.8 } });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'rhysarion')).toMatchObject({ dragonLevel: 25, starRank: 1, canonical: false });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'shadowsong')).toMatchObject({ dragonLevel: 29, starRank: 1, canonical: false });
  });

  it('models Feskar selectors, Emerald Inferno eligibility, Burn multiplier, and Resilient Bond persistent ally reference', () => {
    const command = dragon('feskar').command!;
    const highestStrength = command.schedules[0]!.effects[0]!;
    const leastTroops = command.schedules[1]!.effects[0]!;
    const emerald = habit('feskar', 'feskar-emerald-inferno').schedules[0]!.effects[0]!;
    const resilient = habit('feskar', 'feskar-resilient-bond');
    const adjacentStack = resilient.schedules[0]!.effects[1]!;
    const retreatStack = resilient.schedules[1]!.effects[0]!;

    expect(highestStrength.targetSelection).toMatchObject({ comparisonStat: 'strength', comparisonDirection: 'highest', tieBehavior: 'candidate-group' });
    expect(highestStrength.excludes).toContain('Physical Basic Attacks');
    expect(leastTroops.targetSelection).toMatchObject({ comparisonStat: 'current-troops', comparisonDirection: 'lowest', tieBehavior: 'candidate-group' });
    expect(emerald.conditions?.[0]).toMatchObject({ kind: 'target-has-output-capability', qualifyingOutput: { channel: 'physical-damage', sourceScope: 'non-basic-attacks' } });
    expect(emerald.conditionalMultipliers?.[0]?.multiplier).toBe(1.5);
    expect(emerald.conditionalMultipliers?.[0]?.directlyVerifiedValues).toEqual(expect.arrayContaining([expect.objectContaining({ level: 1, value: 60 })]));
    expect(adjacentStack.targetSelection?.references[0]).toMatchObject({ kind: 'persistent-selected-target' });
    expect(retreatStack.targetSelection?.references[0]).toMatchObject({ kind: 'persistent-selected-target', referencedEffectId: 'resilient-bond-adjacent-stack' });
    expect(retreatStack.stack?.maximumStacks).toBeNull();
    expect(adjacentStack.sourceScope).toBe('non-basic-attacks');
  });

  it('shows Emerald Inferno current base and Burn-enhanced values without normal-card progression', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 1, 0);
    roster.feskar!.starRank = 6;
    roster.shadowsong!.starRank = 10;
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const feskarCommand = cards.cards.find((card) => card.dragonId === 'feskar')?.command;
    const commandSummaryText = feskarCommand?.summaryLines.join(' ') ?? '';
    const commandDetailText = feskarCommand?.detail ?? '';
    const burnTrace = traces.find((trace) =>
      trace.sourceDragonId === 'shadowsong' &&
      trace.recipientDragonId === 'feskar' &&
      trace.matchKind === 'status-condition-enablement' &&
      [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ').includes('Emerald Inferno')
    );
    const burnTraceText = burnTrace ? [
      burnTrace.explanation,
      ...burnTrace.effects,
      ...burnTrace.matchedFacts,
      ...burnTrace.assumptions,
    ].join(' ') : '';

    expect(feskarCommand?.summaryLines).toEqual([
      "Each Round: 20% chance to reduce the highest-Strength enemy's non-Basic Physical Damage Dealt by 12% for 2 rounds.",
      'Rounds 2, 4, 7, and 9: deal Tactical Damage at a 100% rate to the enemy with the least troops.',
      'At 6+ Stars, Rounds 3, 5, 8, and 10: deal Fire Damage at a 40% rate to all enemies capable of non-Basic Physical Damage. Against the same eligible target while it has Burn, the rate increases 1.5x to 60%.',
    ]);
    expect(commandSummaryText).toContain('non-Basic Physical Damage');
    expect(commandSummaryText).not.toContain('L1 40%');
    expect(commandSummaryText).not.toMatch(/\bL[1-5]\b/);
    expect(commandDetailText).toContain('Each Round: 20% chance to reduce Physical Damage Dealt, excluding Basic Attacks, by 12% for the enemy with the highest Strength for 2 rounds.');
    expect(commandDetailText).toContain('At 6+ Stars:');
    expect(commandDetailText).toContain('This damage is increased by 1.5x against targets afflicted with Burn, increasing the Damage Rate to 60%.');

    expect(burnTrace).toBeDefined();
    expect(burnTraceText).toContain('Base current Fire Damage Rate: 40%.');
    expect(burnTraceText).toContain('Enhanced current Fire Damage Rate: 60%.');
    expect(burnTraceText).toContain('Conditional multiplier: 1.5x');
    expect(burnTraceText).toContain('Burn must be active on the same enemy that Emerald Inferno checks for damage output.');
    expect(burnTraceText).toContain('non-Basic Physical Damage output capability');
    expect(burnTraceText).toContain('Target eligibility remains independently required');
    expect(burnTraceText).toContain('Burn application success, enemy identity, same-target overlap, and conditional uptime are unresolved.');

    const upgradedRoster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 1, 0);
    upgradedRoster.feskar!.starRank = 6;
    upgradedRoster.feskar!.habitLevels['feskar-emerald-inferno'] = 3;
    const upgradedTraces = analyzeFormationTraces(formation, dragons, { roster: upgradedRoster });
    const upgradedCards = buildFormationCardPresentation(formation, dragons, upgradedTraces, {
      previewEnabled: false,
      roster: upgradedRoster,
    });
    const upgradedCommand = upgradedCards.cards.find((card) => card.dragonId === 'feskar')?.command;
    const upgradedCommandText = [...(upgradedCommand?.summaryLines ?? []), upgradedCommand?.detail ?? ''].join(' ');
    expect(upgradedCommandText).toContain('Fire Damage at a 56% rate');
    expect(upgradedCommandText).toContain('rate increases 1.5x to 84%');

    const savedPreviewHabitLevel = roster.feskar?.habitLevels['feskar-emerald-inferno'];
    const previewTraces = analyzeFormationTraces(formation, dragons, { roster, previewMaxRankInteractions: true });
    const previewCards = buildFormationCardPresentation(formation, dragons, previewTraces, {
      previewEnabled: true,
      roster,
    });
    const previewCommand = previewCards.cards.find((card) => card.dragonId === 'feskar')?.command;
    const previewCommandText = [...(previewCommand?.summaryLines ?? []), previewCommand?.detail ?? ''].join(' ');
    expect(previewCommandText).toContain('Fire Damage at a 80% rate');
    expect(previewCommandText).toContain('rate increases 1.5x to 120%');
    expect(roster.feskar?.habitLevels['feskar-emerald-inferno']).toBe(savedPreviewHabitLevel);
  });

  it('renders concise command bullets and full command text for Feskar, Rhysarion, and Shadowsong', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, 0);
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const feskarCommand = cards.cards.find((card) => card.dragonId === 'feskar')?.command;
    const rhysarionCommand = cards.cards.find((card) => card.dragonId === 'rhysarion')?.command;
    const shadowsongCommand = cards.cards.find((card) => card.dragonId === 'shadowsong')?.command;

    expect(feskarCommand?.summaryLines).toEqual([
      "Each Round: 20% chance to reduce the highest-Strength enemy's non-Basic Physical Damage Dealt by 12% for 2 rounds.",
      'Rounds 2, 4, 7, and 9: deal Tactical Damage at a 100% rate to the enemy with the least troops.',
      'At 6+ Stars, Rounds 3, 5, 8, and 10: deal Fire Damage at a 40% rate to all enemies capable of non-Basic Physical Damage. Against the same eligible target while it has Burn, the rate increases 1.5x to 60%.',
    ]);
    expect(feskarCommand?.detail).toContain('At 6+ Stars:');
    expect(feskarCommand?.detail).toContain('This damage is increased by 1.5x against targets afflicted with Burn, increasing the Damage Rate to 60%.');

    expect(rhysarionCommand?.summaryLines).toEqual([
      'Rounds 1, 4, and 7: deal Physical Damage at a 70% rate to 2 enemies within adjacency.',
      'Rounds 2, 5, and 8: deal Fire Damage at a 20% rate to 3 enemies in any lane. Against the same target while it has Control, the rate increases 1.5x to 30%.',
      'At 6+ Stars, Rounds 2, 5, and 8: apply Recovery at a 60% rate to 2 other Allies in any lane, enhanced by Intelligence.',
    ]);
    expect(rhysarionCommand?.detail).toContain('Control effects include Stun, Stagger, Overwhelm, and Confusion.');
    expect(rhysarionCommand?.detail).toContain('At 6+ Stars:');

    expect(shadowsongCommand?.summaryLines).toEqual([
      'Rounds 2, 5, and 8: deal Fire Damage at a 100% rate to 2 enemies within adjacency. Against the same target while it has Panic, the rate increases 1.5x to 150%.',
      'At 10 Stars, Rounds 2, 5, and 8: deal Fire Damage at a 60% rate to a first enemy in any lane, with a 40% chance to apply Burn for 2 rounds.',
      'Then deal Fire Damage at a 30% rate to a different enemy in any lane, with a 20% chance to apply Burn for 2 rounds.',
    ]);
    expect(shadowsongCommand?.detail).toContain('Burn deals Fire Damage to the target each round.');
    expect(shadowsongCommand?.detail).toContain('At 10 Stars:');

  });

  it('shows Dawnsong Control-category values and Unyielding Grasp supplier facts', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 1, 0);
    roster.feskar!.starRank = 10;
    roster.feskar!.habitLevels['feskar-unyielding-grasp'] = 0;
    for (const habitId of Object.keys(roster.rhysarion!.habitLevels)) {
      roster.rhysarion!.habitLevels[habitId] = 5;
    }
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const trace = traces.find((item) =>
      item.sourceDragonId === 'feskar' &&
      item.sourceAbilityId === 'feskar-unyielding-grasp' &&
      item.recipientDragonId === 'rhysarion' &&
      item.recipientAbilityId === 'rhysarion-dawnsong' &&
      item.matchKind === 'status-condition-enablement'
    );
    const traceText = trace ? [
      trace.explanation,
      ...trace.matchedFacts,
      ...trace.effects,
      ...trace.assumptions,
      ...trace.unresolvedQuestions,
    ].join(' ') : '';
    const normalText = cards.cards
      .find((card) => card.dragonId === 'feskar')?.provides
      .filter((item) => item.abilityName === 'Unyielding Grasp' && item.recipientDragonId === 'rhysarion')
      .flatMap((item) => [item.state, item.summary, ...item.summaryLines, ...item.details, ...item.effects])
      .join(' ') ?? '';

    expect(trace).toMatchObject({
      status: 'potential',
      sourceAbilityId: 'feskar-unyielding-grasp',
      recipientAbilityId: 'rhysarion-dawnsong',
      matchKind: 'status-condition-enablement',
    });
    expect(traceText).toContain('Receiving source effect ID: dawnsong-fire.');
    expect(traceText).toContain('Supplied status: Stagger.');
    expect(traceText).toContain('Required status category: Control.');
    expect(traceText).toContain('Stagger is a verified member of Control.');
    expect(traceText).toContain('Control category members: Stun, Stagger, Overwhelm and Confusion.');
    expect(traceText).not.toMatch(/Control category members:.*Burn/i);
    expect(traceText).not.toMatch(/Control category members:.*Panic/i);
    expect(traceText).toContain('Timing: Rounds 2, 5, and 8.');
    expect(traceText).toContain('Base Fire Damage Rate: 20%.');
    expect(traceText).toContain('Enhanced Fire Damage Rate: 30%.');
    expect(traceText).toContain('Conditional multiplier: 1.5x');
    expect(traceText).toContain('Required status category: Control.');
    expect(traceText).toContain('Control must be active on the same enemy that Dawnsong checks for damage output.');
    expect(traceText).toContain('Control on one enemy does not enable Dawnsong against a different enemy.');
    expect(traceText).toContain('Control does not alter normal Dawnsong target eligibility.');
    expect(traceText).toContain('Supplier effective Habit Level: 1.');
    expect(traceText).toContain('Activation timing: Each round.');
    expect(traceText).toContain('Status application chance: 10% at effective Habit Level 1.');
    expect(traceText).toContain('Target: one enemy.');
    expect(traceText).toContain('Lane scope: any lane.');
    expect(traceText).toContain('Priority: Warriors are prioritized, not guaranteed.');
    expect(traceText).toContain('Duration: 3 rounds.');
    expect(traceText).toContain('Stagger application success is unresolved.');
    expect(traceText).toContain('Selected enemy identity is unresolved.');

    expect(normalText).toContain('conditional');
    expect(normalText).toContain('Feskar can apply Stagger, which belongs to the Control category.');
    expect(normalText).toContain('On Rounds 2, 5, and 8, Dawnsong deals Fire Damage at a 20% rate to 3 enemies in any lane.');
    expect(normalText).toMatch(/Against the same target while it has Control, the rate increases 1\.5[x×] to 30%\./);
    expect(normalText).toContain('Unyielding Grasp has a 10% chance each round to apply Stagger to one enemy in any lane, prioritizing Warriors. Stagger lasts 3 rounds.');
    expect(normalText).toContain('same-enemy overlap');
    expect(normalText).toContain('Stagger must remain active on the same enemy that Dawnsong checks for damage output');
    expect(normalText).not.toMatch(/\bL[1-5]\b|Ranked progression/i);
  });

  it('shows distinct Panic interactions for Breath of Fire and Scorched Earth', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'daemoros', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['daemoros', 'rhysarion', 'shadowsong'], 10, 0);
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const panicTraces = traces.filter((trace) =>
      trace.sourceDragonId === 'daemoros' &&
      trace.sourceAbilityId === 'daemoros-instill-fear' &&
      trace.recipientDragonId === 'shadowsong' &&
      trace.matchKind === 'status-condition-enablement'
    );
    const breath = panicTraces.find((trace) => trace.recipientAbilityId === 'shadowsong-breath-of-fire');
    const scorched = panicTraces.find((trace) => trace.recipientAbilityId === 'shadowsong-scorched-earth');
    const breathText = breath ? [
      breath.explanation,
      ...breath.matchedFacts,
      ...breath.effects,
      ...breath.assumptions,
    ].join(' ') : '';
    const scorchedText = scorched ? [
      scorched.explanation,
      ...scorched.matchedFacts,
      ...scorched.effects,
      ...scorched.assumptions,
      ...scorched.unresolvedQuestions,
    ].join(' ') : '';
    const daemorosProvides = cards.cards.find((card) => card.dragonId === 'daemoros')?.provides
      .filter((item) => item.abilityName === 'Instill Fear' && item.recipientDragonId === 'shadowsong') ?? [];
    const breathCard = daemorosProvides.find((item) => /Breath of Fire/i.test(item.effectTitle));
    const scorchedCard = daemorosProvides.find((item) => /Scorched Earth chance/i.test(item.effectTitle));
    const breathCardText = breathCard ? [breathCard.effectTitle, breathCard.summary, ...breathCard.summaryLines, ...breathCard.details, ...breathCard.effects].join(' ') : '';
    const scorchedCardText = scorchedCard ? [scorchedCard.effectTitle, scorchedCard.summary, ...scorchedCard.summaryLines, ...scorchedCard.details, ...scorchedCard.effects].join(' ') : '';

    expect(breath).toMatchObject({ status: 'potential', channel: 'fire-damage' });
    expect(breathText).toContain('Receiving source effect ID: breath-of-fire-base-fire.');
    expect(breathText).toContain('Supplied status: Panic.');
    expect(breathText).toContain('Timing: Rounds 2, 5, and 8.');
    expect(breathText).toContain('Target scope: 2 adjacent enemies.');
    expect(breathText).toContain('Base Fire Damage Rate: 100%.');
    expect(breathText).toContain('Enhanced Fire Damage Rate: 150%.');
    expect(breathText).toContain('Conditional multiplier: 1.5x');
    expect(breathText).toContain('Panic must be active on the same enemy that Breath of Fire checks for damage output.');
    expect(breathText).toContain('Panic on one enemy does not enable Breath of Fire against a different enemy.');
    expect(breathText).toContain('Panic does not alter normal Breath of Fire target eligibility.');
    expect(breathText).toContain('Current effective Instill Fear Habit Level: 1.');
    expect(breathText).toContain('Status application chance: 25% at effective Habit Level 1.');
    expect(breathText).toContain('Priority: enemy Right Flank is preferred, not guaranteed.');
    expect(breathText).toContain('Fallback target: another eligible enemy; fallback selection is not guaranteed.');
    expect(breathText).toContain('Duration: 2 rounds.');
    expect(breathText).toContain('Selected-target group: instill-fear-target.');
    expect(breathText).toContain('Instill Fear effect instill-fear-panic uses the same selected target as instill-fear-intelligence.');
    expect(breathText).toContain('One successful activation applies all Instill Fear effects to one selected enemy.');

    expect(scorched).toMatchObject({ status: 'potential', channel: 'status' });
    expect(scorchedText).toContain('Receiving source effect ID: scorched-earth-vulnerable.');
    expect(scorchedText).toContain('Timing: Each round.');
    expect(scorchedText).toContain('Target scope: up to 2 adjacent enemies.');
    expect(scorchedText).toContain('Current effective Scorched Earth Habit Level: 1.');
    expect(scorchedText).toContain('Base current application chance: 10%.');
    expect(scorchedText).toContain('Panic-target application chance: 20%.');
    expect(scorchedText).toContain('Current application chance: 10% -> 20%.');
    expect(scorchedText).toContain('Conditional multiplier: 2x');
    expect(scorchedText).toContain('The conditional chance modifier is target-specific.');
    expect(scorchedText).toContain('Panic on one enemy does not change the chance for another enemy.');
    expect(scorchedText).toContain('Panic does not alter normal Scorched Earth target eligibility.');
    expect(scorchedText).toContain('Applied effect: Vulnerable.');
    expect(scorchedText).toContain('Vulnerable value: generic Damage Received +15%.');
    expect(scorchedText).toContain('Duration: 2 rounds.');
    expect(scorchedText).toContain('Exact roll sharing, target evaluation order, status check timing, refresh, and stacking remain unresolved.');

    expect(daemorosProvides.filter((item) => /Panic enhances/i.test(item.effectTitle))).toHaveLength(2);
    expect(breathCardText).toContain('Panic enhances Breath of Fire');
    expect(breathCardText).toContain('100%');
    expect(breathCardText).toContain('150%');
    expect(breathCardText).not.toContain('10%');
    expect(breathCardText).not.toContain('20%');
    expect(scorchedCardText).toContain('Panic enhances Scorched Earth chance');
    expect(scorchedCardText).toContain('10%');
    expect(scorchedCardText).toContain('20%');
    expect(scorchedCardText).toContain('Vulnerable');
    expect(scorchedCardText).toContain('Damage Received +15%');
    expect(scorchedCardText).toContain('2 adjacent enemies');
    expect(scorchedCardText).toContain('2 rounds');
    expect(scorchedCardText).toContain('Whether this uses one shared roll or separate per-target rolls is unresolved.');
    expect(scorchedCardText).not.toContain('30%');
    expect(scorchedCardText).not.toMatch(/combined probability|joint probability/i);
    expect(scorchedCardText).not.toMatch(/two rolls|double roll/i);
    expect(scorchedCardText).not.toContain('100%');
    expect(scorchedCardText).not.toContain('150%');
    expect(`${breathCardText} ${scorchedCardText}`).not.toMatch(/\bL[1-5]\b|Ranked progression/i);

    const upgradedRoster = ownedRoster(['daemoros', 'rhysarion', 'shadowsong'], 1, 0);
    upgradedRoster.daemoros!.starRank = 2;
    upgradedRoster.shadowsong!.starRank = 6;
    upgradedRoster.shadowsong!.habitLevels['shadowsong-scorched-earth'] = 3;
    const upgradedScorched = analyzeFormationTraces(formation, dragons, { roster: upgradedRoster })
      .find((trace) => trace.sourceAbilityId === 'daemoros-instill-fear' && trace.recipientAbilityId === 'shadowsong-scorched-earth');
    const upgradedText = upgradedScorched ? [...upgradedScorched.matchedFacts, ...upgradedScorched.effects, upgradedScorched.explanation].join(' ') : '';
    expect(upgradedText).toContain('Base current application chance: 14%.');
    expect(upgradedText).toContain('Panic-target application chance: 28%.');

    const savedPreviewHabitLevel = roster.shadowsong?.habitLevels['shadowsong-scorched-earth'];
    const previewScorched = analyzeFormationTraces(formation, dragons, { roster, previewMaxRankInteractions: true })
      .find((trace) => trace.sourceAbilityId === 'daemoros-instill-fear' && trace.recipientAbilityId === 'shadowsong-scorched-earth');
    const previewText = previewScorched ? [...previewScorched.matchedFacts, ...previewScorched.effects, previewScorched.explanation].join(' ') : '';
    expect(previewText).toContain('Base current application chance: 20%.');
    expect(previewText).toContain('Panic-target application chance: 40%.');
    expect(roster.shadowsong?.habitLevels['shadowsong-scorched-earth']).toBe(savedPreviewHabitLevel);
  });

  it('models Rhysarion Control category, other-ally exclusion, harmful friendly impairment, and shared Inspiring Melody target', () => {
    const fire = dragon('rhysarion').command!.schedules[1]!.effects[0]!;
    const echoing = habit('rhysarion', 'rhysarion-echoing-melody').schedules[0]!.effects[0]!;
    const ebbingAllies = habit('rhysarion', 'rhysarion-ebbing-fury').schedules[0]!.effects[1]!;
    const inspiring = habit('rhysarion', 'rhysarion-inspiring-melody').schedules[0]!.effects;
    const modifiers = deriveModifierCapabilities(dragons);

    expect(fire.conditionalMultipliers?.[0]?.condition).toMatchObject({ kind: 'target-has-status-category', statusCategoryId: 'control' });
    expect(echoing.includesCaster).toBe(false);
    expect(echoing.targetPriority).toBe('other-allies-excluding-self');
    expect(ebbingAllies.includesCaster).toBe(true);
    expect(modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ dragonId: 'rhysarion', abilityId: 'rhysarion-ebbing-fury', sourceEffectId: 'ebbing-fury-ally-damage-dealt-down', role: 'ally-impairment', operation: 'decrease' })]));
    expect(inspiring[0]!.targetSelection?.sharedSelectionGroupId).toBe('inspiring-melody-selected-ally');
    expect(inspiring[1]!.targetSelection?.references[0]).toMatchObject({ kind: 'same-target-as-effect', referencedEffectId: 'inspiring-melody-initiative' });
  });

  it('models Shadowsong Panic multipliers, ordered Blazing Conductor attacks, Burn periodic damage, and Scorched Earth conditional chance', () => {
    const baseFire = dragon('shadowsong').command!.schedules[0]!.effects[0]!;
    const conductorEffects = habit('shadowsong', 'shadowsong-blazing-conductor').schedules[0]!.effects;
    const scorched = habit('shadowsong', 'shadowsong-scorched-earth').schedules[0]!.effects[0]!;
    const periodic = derivePeriodicDamageDefinitions(dragons);

    expect(baseFire.conditionalMultipliers?.[0]?.multiplier).toBe(1.5);
    expect(baseFire.conditionalMultipliers?.[0]?.condition.statusId).toBe('panic');
    expect(conductorEffects.map((effect) => effect.id)).toEqual(['blazing-conductor-first-fire', 'blazing-conductor-first-burn', 'blazing-conductor-second-fire', 'blazing-conductor-second-burn']);
    expect(conductorEffects[2]!.targetSelection?.references[0]).toMatchObject({ kind: 'distinct-from-effect-target', referencedEffectId: 'blazing-conductor-first-fire' });
    expect(conductorEffects[1]!.activationRoll?.chanceByHabitLevel.map((value) => value.value)).toEqual([40, 52, 64, 80, 100]);
    expect(conductorEffects[3]!.activationRoll?.chanceByHabitLevel.map((value) => value.value)).toEqual([20, 26, 32, 40, 50]);
    expect(periodic).toEqual(expect.arrayContaining([expect.objectContaining({ dragonId: 'shadowsong', abilityId: 'shadowsong-blazing-conductor', statusId: 'burn', channel: 'fire-damage', damageRateFixed: null })]));
    expect(scorched.activationRoll?.targetStatusConditionalChances[0]).toMatchObject({ statusId: 'panic', multiplier: 2 });
    expect(scorched.activationRoll?.targetStatusConditionalChances[0]?.chanceByHabitLevel.map((value) => value.value)).toEqual([20, 24, 28, 34, 40]);
  });

  it('derives required interaction traces without assigning enemy effects to friendly recipients', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong']);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceDragonId: 'feskar', recipientDragonId: 'rhysarion', matchKind: 'status-condition-enablement', sourceAbilityId: 'feskar-unyielding-grasp', recipientAbilityId: 'rhysarion-dawnsong' }),
      expect.objectContaining({ sourceDragonId: 'rhysarion', matchKind: 'friendly-impairment', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'rhysarion' }),
      expect.objectContaining({ sourceDragonId: 'rhysarion', matchKind: 'friendly-impairment', sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'feskar' }),
      expect.objectContaining({ sourceDragonId: 'shadowsong', matchKind: 'enemy-damage-received-increase', sourceAbilityId: 'shadowsong-blazing-onslaught', recipientDragonId: null }),
      expect.objectContaining({ sourceDragonId: 'shadowsong', matchKind: 'periodic-status-damage', sourceAbilityId: 'shadowsong-blazing-conductor', recipientDragonId: null }),
    ]));
    expect(cards.cards.find((card) => card.dragonId === 'rhysarion')?.provides.some((item) => /harm/i.test([...item.summaryLines, ...item.details, ...item.effects].join(' ')))).toBe(true);
    expect(cards.cards.flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === 'Ebbing Fury')
      .flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects])
      .join(' ')).not.toContain('Damage Dealt reduction at current effective level');
    expect(cards.cards.some((card) => card.receives.some((item) => /Vulnerable|Burn periodic/i.test(item.title)))).toBe(false);
    expect(cards.cards.flatMap((card) => card.receives)
      .filter((item) => /enemy.*vulnerability/i.test(item.title))
      .every((item) => /can benefit|target overlap/i.test([...item.summaryLines, ...item.details, ...item.effects].join(' ')))).toBe(true);
  });

  it('aggregates Ensnare benefits and projects Blazing Onslaught vulnerabilities to matching outputs', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'daemoros', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['daemoros', 'rhysarion', 'shadowsong'], 1, 0);
    roster.daemoros!.starRank = 2;
    roster.shadowsong!.starRank = 6;
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const shadowsong = cards.cards.find((card) => card.dragonId === 'shadowsong')!;
    const daemoros = cards.cards.find((card) => card.dragonId === 'daemoros')!;
    const rhysarion = cards.cards.find((card) => card.dragonId === 'rhysarion')!;
    const ensnareProvides = shadowsong.provides.filter((item) => item.abilityName === 'Ensnare' && /Enemy mitigation reduction/i.test(item.effectTitle));
    const ensnareText = ensnareProvides.map((item) => [item.targetLabel, item.effectTitle, ...item.summaryLines, ...item.details, ...item.effects].join(' ')).join(' ');

    expect(ensnareProvides).toHaveLength(2);
    expect(ensnareProvides.map((item) => item.targetLabel).sort()).toEqual(['Daemoros and Rhysarion', 'Rhysarion and Shadowsong']);
    expect(ensnareText).toContain('Applies to Daemoros and Rhysarion.');
    expect(ensnareText).toContain('Applies to Rhysarion and Shadowsong.');
    expect(ensnareText.match(/Lowers enemy Initiative, supporting allied Fire Damage\./g)).toHaveLength(1);
    expect(ensnareText.match(/Lowers enemy Instinct, supporting allied Physical Damage\./g)).toHaveLength(1);

    const daemorosEnsnare = daemoros.receives.filter((item) => item.abilityName === 'Ensnare');
    const rhysarionEnsnare = rhysarion.receives.filter((item) => item.abilityName === 'Ensnare');
    expect(daemorosEnsnare.length).toBeGreaterThanOrEqual(1);
    expect(rhysarionEnsnare.length).toBeGreaterThanOrEqual(1);
    expect(daemorosEnsnare[0]?.summaryLines.join(' ')).toMatch(/enemy (Initiative|Instinct)/);
    expect(rhysarionEnsnare[0]?.summaryLines.join(' ')).toMatch(/enemy (Initiative|Instinct)/);

    const vulnerabilityTraces = traces.filter((trace) =>
      trace.sourceAbilityId === 'shadowsong-blazing-onslaught' &&
      trace.matchKind === 'enemy-damage-received-increase'
    );
    const fireProjection = vulnerabilityTraces.filter((trace) => trace.channel === 'fire-damage' && trace.recipientDragonId);
    const physicalProjection = vulnerabilityTraces.filter((trace) => trace.channel === 'physical-damage' && trace.recipientDragonId);
    expect(fireProjection.map((trace) => trace.recipientDragonId).sort()).toEqual(['daemoros', 'rhysarion', 'shadowsong']);
    expect(physicalProjection.map((trace) => trace.recipientDragonId).sort()).toEqual(expect.arrayContaining(['daemoros', 'rhysarion']));
    expect(fireProjection.every((trace) => trace.status === 'potential')).toBe(true);
    expect(physicalProjection.every((trace) => trace.status === 'potential')).toBe(true);
    expect(physicalProjection.some((trace) => trace.matchedOutputCapabilityIds?.some((id) => /basic/i.test(id)))).toBe(false);
    for (const trace of [...fireProjection, ...physicalProjection]) {
      expect(trace.sourceScopeResults?.every((result) => result.sourceScopeCompatible)).toBe(true);
      expect(trace.matchedOutputCapabilityIds?.length).toBeGreaterThan(0);
      expect([...trace.effects, ...trace.assumptions].join(' ')).toMatch(/benefit|target overlap|not guaranteed/i);
    }

    const fireProvides = shadowsong.provides.filter((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle));
    const physicalProvides = shadowsong.provides.filter((item) => /Blazing Onslaught - Enemy Physical Damage vulnerability/i.test(item.effectTitle));
    const fireProjectionCard = fireProvides.find((item) => item.targetLabel === 'Team' && !item.isEnemyFacing);
    const physicalProjectionCard = physicalProvides.find((item) => item.targetLabel === 'Daemoros and Rhysarion' && !item.isEnemyFacing);
    expect(fireProvides).toHaveLength(1);
    expect(physicalProvides).toHaveLength(1);
    expect(fireProjectionCard).toBeDefined();
    expect(fireProjectionCard?.state).toBe('conditional');
    expect(physicalProjectionCard).toBeDefined();
    expect(physicalProjectionCard?.state).toBe('conditional');
    expect(shadowsong.receives.some((item) => item.abilityName === 'Blazing Onslaught')).toBe(false);

    const fireReceives = rhysarion.receives.find((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle));
    const physicalDaemoros = daemoros.receives.find((item) => /Blazing Onslaught - Enemy Physical Damage vulnerability/i.test(item.effectTitle));
    const physicalRhysarion = rhysarion.receives.find((item) => /Blazing Onslaught - Enemy Physical Damage vulnerability/i.test(item.effectTitle));
    expect(fireReceives).toBeDefined();
    expect(physicalDaemoros).toBeDefined();
    expect(physicalRhysarion).toBeDefined();
    const fireText = fireReceives ? [...fireReceives.summaryLines, ...fireReceives.details, ...fireReceives.effects].join(' ') : '';
    const physicalText = physicalDaemoros ? [...physicalDaemoros.summaryLines, ...physicalDaemoros.details, ...physicalDaemoros.effects].join(' ') : '';
    const fireProjectionText = fireProjectionCard ? [...fireProjectionCard.summaryLines, ...fireProjectionCard.details, ...fireProjectionCard.effects].join(' ') : '';
    const physicalProjectionText = physicalProjectionCard ? [...physicalProjectionCard.summaryLines, ...physicalProjectionCard.details, ...physicalProjectionCard.effects].join(' ') : '';
    expect(fireProjectionText).toContain("the formation's qualifying Fire Damage outputs can benefit from +15% Fire Damage Received on the selected enemy.");
    expect(fireProjectionText.match(/can benefit from \+15% Fire Damage Received/g)).toHaveLength(1);
    expect(physicalProjectionText).toContain('qualifying non-Basic Physical Damage outputs can benefit from +15% Physical Damage Received on the selected enemy.');
    expect(physicalProjectionText.match(/can benefit from \+15% Physical Damage Received/g)).toHaveLength(1);
    expect(fireText).toContain("Rhysarion's qualifying Fire Damage can benefit from 15% Fire Damage Received on the selected enemy from Shadowsong's Blazing Onslaught.");
    expect(physicalText).toContain("Daemoros's qualifying non-Basic Physical Damage can benefit from 15% Physical Damage Received on the selected enemy from Shadowsong's Blazing Onslaught.");
    expect(fireText).toContain('Duration: 3 rounds.');
    expect(fireText).toContain('Applies to all qualifying Fire Damage sources.');
    expect(physicalText).toContain('Applies to non-Basic Physical Damage only.');
    expect(`${fireText} ${physicalText}`).toMatch(/target overlap|not guaranteed/i);
    expect((fireText.match(/(?:Fire Damage Received \+15%|\+15% Fire Damage Received)/g) ?? [])).toHaveLength(1);
    expect(fireText).not.toMatch(/Fire Damage Received increase 15%.*Fire Damage Received \+15%/);
    expect((physicalText.match(/(?:Physical Damage Received \+15%|\+15% Physical Damage Received)/g) ?? [])).toHaveLength(1);

    const panicCards = daemoros.provides.filter((item) => /Panic enhances/i.test(item.effectTitle));
    expect(panicCards.map((item) => item.effectTitle).sort()).toEqual([
      'Instill Fear - Panic enhances Breath of Fire chance',
      'Instill Fear - Panic enhances Scorched Earth chance',
    ]);
  });

  it('locks the Daemoros, Rhysarion, and Shadowsong framework review baseline', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'daemoros', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['daemoros', 'rhysarion', 'shadowsong'], 10, 0);
    for (const dragonId of ['daemoros', 'rhysarion', 'shadowsong']) {
      roster[dragonId]!.reignLevel = 26;
    }
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { daemoros: 26, rhysarion: 26, shadowsong: 26 },
      previewMaxRankInteractions: false,
    });
    const counts = traces.reduce<Record<TraceStatus, number>>((acc, trace) => {
      acc[trace.status] += 1;
      return acc;
    }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const daemorosCard = cards.cards.find((card) => card.dragonId === 'daemoros')!;
    const rhysarionCard = cards.cards.find((card) => card.dragonId === 'rhysarion')!;
    const shadowsongCard = cards.cards.find((card) => card.dragonId === 'shadowsong')!;

    expect(traces).toHaveLength(73);
    expect(counts).toMatchObject({ active: 30, potential: 34, inactive: 8, blocked: 1, unknown: 0 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
    expect(traces.filter((trace) => trace.sourceAbilityId === 'shadowsong-blazing-conductor' && trace.matchKind === 'periodic-status-damage')).toHaveLength(2);
    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceAbilityId: 'daemoros-instill-fear', recipientDragonId: 'daemoros', matchKind: 'enemy-mitigation-reduction', channel: 'physical-damage', interactionScope: 'internal' }),
      expect.objectContaining({ sourceAbilityId: 'daemoros-darkening-fear', recipientDragonId: 'daemoros', matchKind: 'enemy-mitigation-reduction', channel: 'physical-damage', interactionScope: 'internal' }),
      expect.objectContaining({ sourceAbilityId: 'shadowsong-ensnare', recipientDragonId: 'shadowsong', matchKind: 'enemy-mitigation-reduction', channel: 'fire-damage', interactionScope: 'internal' }),
      expect.objectContaining({ sourceAbilityId: 'shadowsong-blazing-onslaught', recipientDragonId: 'shadowsong', matchKind: 'enemy-damage-received-increase', channel: 'fire-damage', interactionScope: 'internal' }),
      expect.objectContaining({ sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'rhysarion', matchKind: 'outgoing-effect-amplification', channel: 'recovery', interactionScope: 'internal' }),
      expect.objectContaining({ sourceAbilityId: 'rhysarion-ebbing-fury', recipientDragonId: 'rhysarion', matchKind: 'friendly-impairment', channel: 'damage-dealt', interactionScope: 'internal' }),
    ]));

    const instillBreath = traces.find((trace) =>
      trace.sourceAbilityId === 'daemoros-instill-fear' &&
      trace.recipientAbilityId === 'shadowsong-breath-of-fire' &&
      trace.matchKind === 'status-condition-enablement'
    );
    const darkeningBreath = traces.find((trace) =>
      trace.sourceAbilityId === 'daemoros-darkening-fear' &&
      trace.recipientAbilityId === 'shadowsong-breath-of-fire' &&
      trace.matchKind === 'status-condition-enablement'
    );
    for (const trace of [instillBreath, darkeningBreath]) {
      const text = trace ? [trace.explanation, ...trace.matchedFacts, ...trace.effects, ...trace.assumptions].join(' ') : '';
      expect(text).toContain('Round 2 after a successful Round 1 application');
      expect(text).toContain(`Round 2 from a successful Round 2 application only if ${trace?.sourceAbilityId === 'daemoros-instill-fear' ? 'Instill Fear' : 'Darkening Fear'} resolves before Breath of Fire that round`);
      expect(text).toContain('Round 5 after a successful Round 4 application');
      expect(text).toContain(`Round 5 from a successful Round 5 application only if ${trace?.sourceAbilityId === 'daemoros-instill-fear' ? 'Instill Fear' : 'Darkening Fear'} resolves before Breath of Fire that round`);
      expect(text).toContain('Round 8 after a successful Round 7 application');
      expect(text).toContain(`Round 8 from a successful Round 8 application only if ${trace?.sourceAbilityId === 'daemoros-instill-fear' ? 'Instill Fear' : 'Darkening Fear'} resolves before Breath of Fire that round`);
      expect(text).toContain('Action order within same-round overlap is unresolved.');
      expect(text).not.toContain('same-round overlap is guaranteed');
      expect(text).not.toContain('same-round order is guaranteed');
    }

    const shroud = traces.find((trace) =>
      trace.sourceAbilityId === 'daemoros-shroud-of-shadows' &&
      trace.recipientDragonId === 'rhysarion' &&
      trace.recipientAbilityId === 'rhysarion-dawnsong'
    );
    const shroudText = shroud ? [shroud.explanation, ...shroud.matchedFacts, ...shroud.effects].join(' ') : '';
    expect(shroudText).toContain('Odd-numbered rounds');
    expect(shroudText).toContain('At effective Habit Level 1, Shroud of Shadows has a 15% chance on odd-numbered rounds');
    expect(shroudText).toContain('Round 2 after a successful Round 1 application');
    expect(shroudText).toContain('Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round');
    expect(shroudText).toContain('Round 8 after a successful Round 7 application');
    expect(shroudText).not.toContain('specific rounds');
    expect(shroudText).toContain('same-enemy overlap');

    const phantomTraces = traces.filter((trace) => trace.sourceAbilityId === 'daemoros-phantoms-veil');
    expect(phantomTraces.some((trace) => /Exclusive one-of choice/i.test([...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ')))).toBe(true);
    expect(phantomTraces.filter((trace) => trace.status === 'potential')).toHaveLength(3);
    const normalNames = cards.cards.flatMap((card) => [...card.receives, ...card.provides]).map((item) => item.abilityName).join(' ');
    expect(normalNames).not.toContain("Phantom's Veil");

    expect(rhysarionCard.receives.filter((item) => item.abilityName === 'Instill Fear' && /Enemy mitigation reduction/i.test(item.effectTitle))).toHaveLength(1);
    expect(rhysarionCard.receives.filter((item) => item.abilityName === 'Darkening Fear' && /Enemy mitigation reduction/i.test(item.effectTitle))).toHaveLength(1);
    const ensnareProvides = shadowsongCard.provides.filter((item) => item.abilityName === 'Ensnare' && /Enemy mitigation reduction/i.test(item.effectTitle));
    expect(ensnareProvides.map((item) => item.targetLabel).sort()).toEqual(['Daemoros and Rhysarion', 'Rhysarion and Shadowsong']);
    const onslaughtProvides = shadowsongCard.provides.filter((item) => item.abilityName === 'Blazing Onslaught');
    expect(onslaughtProvides.filter((item) => /Enemy Fire Damage vulnerability/i.test(item.effectTitle))).toHaveLength(1);
    expect(onslaughtProvides.filter((item) => /Enemy Physical Damage vulnerability/i.test(item.effectTitle))).toHaveLength(1);
    expect(onslaughtProvides.every((item) => !item.isEnemyFacing)).toBe(true);
    expect(daemorosCard.receives.some((item) => item.abilityName === 'Phantom\'s Veil')).toBe(false);
  });

  it('applies Ally versus other Ally targeting at full rank and preserves Recovery Received support', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, 0);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const feskarCard = cards.cards.find((card) => card.dragonId === 'feskar')!;
    const rhysarionCard = cards.cards.find((card) => card.dragonId === 'rhysarion')!;
    const shadowsongCard = cards.cards.find((card) => card.dragonId === 'shadowsong')!;
    const insightfulEffect = habit('feskar', 'feskar-insightful-allies').schedules[0]!.effects[0]!;
    const echoingEffect = habit('rhysarion', 'rhysarion-echoing-melody').schedules[0]!.effects[0]!;
    const inspiringEffect = habit('rhysarion', 'rhysarion-inspiring-melody').schedules[0]!.effects[0]!;

    expect(resolveAllyTargets(formation, 'left-flank', insightfulEffect).map((target) => target.dragonId)).toEqual([
      'feskar',
      'rhysarion',
      'shadowsong',
    ]);
    expect(resolveAllyTargets(formation, 'vanguard', echoingEffect).map((target) => target.dragonId)).toEqual([
      'feskar',
      'shadowsong',
    ]);
    expect(resolveAllyTargets(formation, 'vanguard', inspiringEffect).map((target) => target.dragonId)).toEqual([
      'feskar',
      'shadowsong',
    ]);

    const insightfulTraces = traces.filter((trace) =>
      trace.sourceAbilityId === 'feskar-insightful-allies' &&
      trace.matchKind === 'stat-scaling-support' &&
      trace.title === 'Instinct Stat Support'
    );
    expect(insightfulTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    expect(insightfulTraces.find((trace) => trace.recipientDragonId === 'feskar')).toMatchObject({ status: 'active' });
    const insightfulProvides = feskarCard.provides.find((item) => item.abilityName === 'Insightful Allies' && item.targetLabel === 'Team');
    expect(insightfulProvides).toBeDefined();
    const insightfulText = insightfulProvides ? [...insightfulProvides.summaryLines, ...insightfulProvides.details, ...insightfulProvides.effects].join(' ') : '';
    expect(insightfulText).toContain('Applies to Feskar, Rhysarion, and Shadowsong.');
    expect(insightfulText).toContain('Instinct support.');
    expect(insightfulText).toContain('Enhanced by Feskar Instinct');
    expect(insightfulText).toContain('Duration: until end of combat.');
    expect(feskarCard.receives.some((item) => item.abilityName === 'Insightful Allies')).toBe(true);
    expect(rhysarionCard.receives.some((item) => item.abilityName === 'Insightful Allies')).toBe(true);
    expect(shadowsongCard.receives.some((item) => item.abilityName === 'Insightful Allies')).toBe(true);

    const echoingTraces = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.matchKind === 'outgoing-effect-amplification');
    expect(echoingTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'shadowsong']);
    const echoingProvides = rhysarionCard.provides.find((item) => item.abilityName === 'Echoing Melody');
    expect(echoingProvides).toMatchObject({ targetLabel: 'Feskar and Shadowsong' });
    const echoingText = echoingProvides ? [...echoingProvides.summaryLines, ...echoingProvides.details, ...echoingProvides.effects].join(' ') : '';
    expect(echoingText).toContain('Recovery Rate: 60% at effective Habit Level 1.');
    expect(echoingText).toContain('Timing: Rounds 2, 5, and 8.');
    expect(echoingText).toContain('Enhanced by Rhysarion Intelligence.');
    expect(echoingText).toContain('caster is excluded');
    expect(rhysarionCard.receives.some((item) => item.abilityName === 'Echoing Melody')).toBe(false);
    for (const card of [feskarCard, shadowsongCard]) {
      const receives = card.receives.filter((item) => item.abilityName === 'Echoing Melody' && item.sourceDragonId === 'rhysarion');
      const receivesText = receives.map((item) => [...item.summaryLines, ...item.details, ...item.effects].join(' ')).join(' ');
      expect(receives).toHaveLength(1);
      expect(receives[0]?.state).toBe('active');
      expect(receives[0]?.modifierLines).toContain("Amplified by Rhysarion's Unbroken Devotion: Recovery Received +20%.");
      expect(receivesText).toContain('Recovery Rate: 60% at effective Habit Level 1.');
      expect([...receives[0]!.modifierLines, receivesText].join(' ')).not.toMatch(/Calculated Assault|Breath of Fire/);
    }

    const devotionTraces = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-unbroken-devotion');
    expect(devotionTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'shadowsong']);
    expect(devotionTraces.every((trace) => trace.effects.some((effect) => /Recovery Received \+20%/.test(effect)))).toBe(true);
    const incomingDevotion = traces.filter((trace) =>
      trace.matchKind === 'incoming-effect-amplification' &&
      trace.recipientAbilityId === 'rhysarion-unbroken-devotion'
    );
    expect(incomingDevotion.map((trace) => `${trace.sourceAbilityId}:${trace.recipientDragonId}`).sort()).toEqual([
      'rhysarion-ebbing-fury:feskar',
      'rhysarion-ebbing-fury:shadowsong',
      'rhysarion-echoing-melody:feskar',
      'rhysarion-echoing-melody:shadowsong',
    ]);
    expect(incomingDevotion.every((trace) => trace.channel === 'recovery')).toBe(true);
    expect(incomingDevotion.every((trace) => trace.sourceScopeResults?.every((match) => match.sourceScopeCompatible) ?? true)).toBe(true);
    expect(incomingDevotion.some((trace) => trace.recipientDragonId === 'rhysarion')).toBe(false);
    expect(new Set(incomingDevotion.map((trace) => trace.sourceAbilityId))).toEqual(new Set(['rhysarion-ebbing-fury', 'rhysarion-echoing-melody']));
    expect(incomingDevotion.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'feskar' && trace.recipientAbilityId === 'rhysarion-unbroken-devotion')).toHaveLength(1);
    expect(incomingDevotion.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'shadowsong' && trace.recipientAbilityId === 'rhysarion-unbroken-devotion')).toHaveLength(1);
    expect(incomingDevotion.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.recipientDragonId === 'feskar' && trace.recipientAbilityId === 'rhysarion-unbroken-devotion')).toHaveLength(1);
    expect(incomingDevotion.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.recipientDragonId === 'shadowsong' && trace.recipientAbilityId === 'rhysarion-unbroken-devotion')).toHaveLength(1);
    const normalizedIncoming = analyzeFormationTraces(formation, dragons, { roster }).filter((trace) =>
      trace.matchKind === 'incoming-effect-amplification' &&
      trace.recipientAbilityId === 'rhysarion-unbroken-devotion'
    );
    expect(normalizedIncoming.map((trace) => `${trace.sourceAbilityId}:${trace.recipientDragonId}`).sort()).toEqual([
      'rhysarion-ebbing-fury:feskar',
      'rhysarion-ebbing-fury:shadowsong',
      'rhysarion-echoing-melody:feskar',
      'rhysarion-echoing-melody:shadowsong',
    ]);
    const devotionProvides = rhysarionCard.provides.find((item) => item.abilityName === 'Unbroken Devotion');
    expect(devotionProvides).toMatchObject({
      targetLabel: 'Feskar and Shadowsong',
      effectTitle: 'Unbroken Devotion - Recovery Received support',
    });
    const devotionText = devotionProvides ? [...devotionProvides.summaryLines, ...devotionProvides.details, ...devotionProvides.effects].join(' ') : '';
    expect(devotionText).toContain('Recovery Received +20% at effective Habit Level 1.');
    expect(devotionText).toContain('Duration: until end of combat.');
    expect(devotionText).toContain('caster is excluded');
    expect(rhysarionCard.receives.some((item) => item.abilityName === 'Unbroken Devotion')).toBe(false);
    expect(feskarCard.receives.some((item) => item.abilityName === 'Unbroken Devotion')).toBe(true);
    expect(shadowsongCard.receives.some((item) => item.abilityName === 'Unbroken Devotion')).toBe(true);
    expect(rhysarionCard.provides.filter((item) => item.abilityName === 'Echoing Melody' || item.abilityName === 'Unbroken Devotion')).toHaveLength(2);
  });

  it('deduplicates the final Technical Analysis export without merging distinct Recovery traces', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, 0);
    for (const dragonId of ['feskar', 'rhysarion', 'shadowsong']) {
      roster[dragonId]!.reignLevel = 26;
    }
    const result = analyzeFormation(formation, dragons, defaultSynergyRules, {
      roster,
      dragonLevels: { feskar: 26, rhysarion: 26, shadowsong: 26 },
      previewMaxRankInteractions: false,
    });
    const audit = createSynergyAuditExport(formation, result.traces, roster);
    const finalTraces = audit.traces;
    const finalCounts = finalTraces.reduce<Record<TraceStatus, number>>((acc, trace) => {
      acc[trace.status] += 1;
      return acc;
    }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
    const incomingRecovery = finalTraces.filter((trace) =>
      trace.matchKind === 'incoming-effect-amplification' &&
      trace.recipientAbilityId === 'rhysarion-unbroken-devotion' &&
      trace.channel === 'recovery'
    );
    const outgoingRecovery = finalTraces.filter((trace) =>
      trace.matchKind === 'outgoing-effect-amplification' &&
      trace.channel === 'recovery' &&
      ['rhysarion-ebbing-fury', 'rhysarion-echoing-melody'].includes(trace.sourceAbilityId ?? '')
    );
    const finalKey = (trace: typeof finalTraces[number]) =>
      `${trace.matchKind}:${trace.sourceAbilityId}:${trace.recipientDragonId}:${trace.recipientAbilityId}:${trace.channel}:${trace.modifierCapabilityId ?? ''}:${(trace.matchedOutputCapabilityIds ?? []).join(',')}`;

    expect(finalTraces).toHaveLength(64);
    expect(finalCounts).toMatchObject({ active: 35, potential: 18, inactive: 10, blocked: 1, unknown: 0 });
    expect(new Set(finalTraces.map(finalKey)).size).toBe(finalTraces.length);
    expect(incomingRecovery.map((trace) => `${trace.sourceAbilityId}:${trace.recipientDragonId}`).sort()).toEqual([
      'rhysarion-ebbing-fury:feskar',
      'rhysarion-ebbing-fury:shadowsong',
      'rhysarion-echoing-melody:feskar',
      'rhysarion-echoing-melody:shadowsong',
    ]);
    expect(incomingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'feskar')).toHaveLength(1);
    expect(incomingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'shadowsong')).toHaveLength(1);
    expect(incomingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.recipientDragonId === 'feskar')).toHaveLength(1);
    expect(incomingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.recipientDragonId === 'shadowsong')).toHaveLength(1);
    expect(incomingRecovery).toHaveLength(4);

    expect(outgoingRecovery.map((trace) => `${trace.sourceAbilityId}:${trace.recipientDragonId}`).sort()).toEqual([
      'rhysarion-ebbing-fury:feskar',
      'rhysarion-ebbing-fury:rhysarion',
      'rhysarion-ebbing-fury:shadowsong',
      'rhysarion-echoing-melody:feskar',
      'rhysarion-echoing-melody:shadowsong',
    ]);
    expect(outgoingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'feskar')).toHaveLength(1);
    expect(outgoingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'rhysarion')).toHaveLength(1);
    expect(outgoingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.recipientDragonId === 'shadowsong')).toHaveLength(1);
    expect(outgoingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.recipientDragonId === 'feskar')).toHaveLength(1);
    expect(outgoingRecovery.filter((trace) => trace.sourceAbilityId === 'rhysarion-echoing-melody' && trace.recipientDragonId === 'shadowsong')).toHaveLength(1);

    expect(new Set(incomingRecovery.map((trace) => trace.sourceAbilityId))).toEqual(new Set(['rhysarion-ebbing-fury', 'rhysarion-echoing-melody']));
    expect(new Set(incomingRecovery.map((trace) => trace.recipientDragonId))).toEqual(new Set(['feskar', 'shadowsong']));
    expect(outgoingRecovery.every((trace) => trace.matchKind !== 'incoming-effect-amplification')).toBe(true);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.matchKind === 'friendly-impairment')).toHaveLength(3);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.matchKind === 'friendly-impairment')
      .every((trace) => trace.channel === 'damage-dealt')).toBe(true);

    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'rhysarion-champions-vigor')).toHaveLength(7);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'shadowsong-scorched-earth')).toHaveLength(1);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'shadowsong-blazing-conductor')).toHaveLength(3);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'shadowsong-blazing-onslaught')).toHaveLength(6);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'rhysarion-inspiring-melody')).toHaveLength(3);
    expect(finalTraces.filter((trace) => trace.sourceAbilityId === 'feskar-resilient-bond')).toHaveLength(3);
  });

  it('includes Emerald Inferno as full-rank Fire output for Blazing Onslaught projection', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, 0);
    const outputs = deriveOutputCapabilities(dragons);
    const emeraldOutput = outputs.find((output) =>
      output.dragonId === 'feskar' &&
      output.abilityId === 'feskar-emerald-inferno' &&
      output.sourceEffectId === 'emerald-inferno-fire' &&
      output.channel === 'fire-damage'
    );
    expect(emeraldOutput).toBeDefined();
    expect(emeraldOutput).toMatchObject({
      sourceScope: 'habits',
      requiredHabitLevel: 1,
      unlockStarRank: 6,
    });

    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const shadowsong = cards.cards.find((card) => card.dragonId === 'shadowsong')!;
    const feskar = cards.cards.find((card) => card.dragonId === 'feskar')!;
    const rhysarion = cards.cards.find((card) => card.dragonId === 'rhysarion')!;
    const fireProjection = traces.filter((trace) =>
      trace.sourceAbilityId === 'shadowsong-blazing-onslaught' &&
      trace.matchKind === 'enemy-damage-received-increase' &&
      trace.channel === 'fire-damage' &&
      trace.recipientDragonId
    );
    expect(fireProjection.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    expect(fireProjection.find((trace) => trace.recipientDragonId === 'feskar')?.matchedOutputCapabilityIds).toEqual(
      expect.arrayContaining([expect.stringContaining('emerald-inferno-fire-output')]),
    );
    expect(fireProjection.every((trace) => trace.sourceScopeResults?.every((result) => result.sourceScopeCompatible))).toBe(true);
    expect(fireProjection.every((trace) => trace.status === 'potential')).toBe(true);
    expect(fireProjection.every((trace) => [...trace.matchedFacts, ...trace.effects].join(' ').includes('Priority: enemy Left Flank is preferred, not guaranteed.'))).toBe(true);
    expect(fireProjection.every((trace) => [...trace.matchedFacts, ...trace.effects].join(' ').includes('Fallback target: another eligible enemy; fallback selection is not guaranteed.'))).toBe(true);
    expect(fireProjection.every((trace) => [...trace.matchedFacts, ...trace.effects].join(' ').includes('Selected-target group: blazing-onslaught-fire-target.'))).toBe(true);

    const fireProvides = shadowsong.provides.filter((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle));
    const fireProjectionCard = fireProvides.find((item) => item.targetLabel === 'Team' && !item.isEnemyFacing);
    expect(fireProjectionCard).toBeDefined();
    expect(fireProjectionCard?.state).toBe('conditional');
    const fireProjectionText = fireProjectionCard ? [...fireProjectionCard.summaryLines, ...fireProjectionCard.details, ...fireProjectionCard.effects].join(' ') : '';
    expect(fireProjectionText).toContain("the formation's qualifying Fire Damage outputs can benefit from +15% Fire Damage Received on the selected enemy.");
    expect(fireProjectionText).toContain('The allied attack must hit that same vulnerable enemy.');
    expect(fireProjectionText).toContain('Duration: 3 rounds.');
    expect((fireProjectionText.match(/(?:Fire Damage Received \+15%|\+15% Fire Damage Received)/g) ?? [])).toHaveLength(1);
    expect(feskar.receives.some((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle))).toBe(true);
    expect(rhysarion.receives.some((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle))).toBe(true);
    expect(shadowsong.receives.some((item) => /Blazing Onslaught - Enemy Fire Damage vulnerability/i.test(item.effectTitle))).toBe(false);

    const physicalProjectionCard = shadowsong.provides.find((item) =>
      /Blazing Onslaught - Enemy Physical Damage vulnerability/i.test(item.effectTitle) &&
      !item.isEnemyFacing
    );
    expect(physicalProjectionCard?.recipientDragonId).toBe('rhysarion');
    expect(physicalProjectionCard?.targetLabel).not.toBe('Team');
    const physicalProjection = traces.filter((trace) =>
      trace.sourceAbilityId === 'shadowsong-blazing-onslaught' &&
      trace.matchKind === 'enemy-damage-received-increase' &&
      trace.channel === 'physical-damage' &&
      trace.recipientDragonId
    );
    expect(physicalProjection.every((trace) => [...trace.matchedFacts, ...trace.effects].join(' ').includes('Priority: enemy Right Flank is preferred, not guaranteed.'))).toBe(true);
    expect(physicalProjection.every((trace) => [...trace.matchedFacts, ...trace.effects].join(' ').includes('Fallback target: another eligible enemy; fallback selection is not guaranteed.'))).toBe(true);
    expect(physicalProjection.every((trace) => [...trace.matchedFacts, ...trace.effects].join(' ').includes('Selected-target group: blazing-onslaught-physical-target.'))).toBe(true);
    expect(new Set([
      ...fireProjection.map((trace) => trace.modifierCapabilityId),
      ...physicalProjection.map((trace) => trace.modifierCapabilityId),
    ])).toEqual(new Set([
      'shadowsong-blazing-onslaught-blazing-onslaught-fire-fire-damage-received-modifier',
      'shadowsong-blazing-onslaught-blazing-onslaught-physical-physical-damage-received-modifier',
    ]));
  });

  it('derives Panic to Scorched Earth and preserves source-scope regressions', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'daemoros', vanguard: 'shadowsong', 'right-flank': 'feskar' };
    const roster = ownedRoster(['daemoros', 'shadowsong', 'feskar'], 10, 0);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const outputs = deriveOutputCapabilities(dragons);
    const modifiers = deriveModifierCapabilities(dragons);
    const physicalOutput = outputs.find((output) => output.dragonId === 'venator' && output.abilityId === 'venator-feral-precision' && output.channel === 'physical-damage')!;
    const basicOutput = { ...physicalOutput, id: 'synthetic-basic-physical', sourceScope: 'basic-attacks' as const };
    const shadowsongModifiers = modifiers.filter((modifier) => modifier.abilityId === 'shadowsong-blazing-onslaught');
    const temptingPhysical = shadowsongModifiers.find((modifier) => modifier.channel === 'physical-damage')!;

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceDragonId: 'daemoros', recipientDragonId: 'shadowsong', matchKind: 'status-condition-enablement', recipientAbilityId: 'shadowsong-scorched-earth' }),
      expect.objectContaining({ sourceDragonId: 'daemoros', recipientDragonId: 'shadowsong', matchKind: 'status-condition-enablement', recipientAbilityId: 'shadowsong-breath-of-fire' }),
    ]));
    expect(shadowsongModifiers.map((modifier) => [modifier.channel, modifier.sourceScope, modifier.sourceEffectId])).toContainEqual(['physical-damage', 'non-basic-attacks', 'blazing-onslaught-physical']);
    expect(sourceScopesCompatible(temptingPhysical.sourceScope, physicalOutput.sourceScope)).toBe(true);
    expect(sourceScopesCompatible(temptingPhysical.sourceScope, basicOutput.sourceScope)).toBe(false);
    const scorchedTrace = traces.find((trace) =>
      trace.sourceDragonId === 'daemoros' &&
      trace.recipientDragonId === 'shadowsong' &&
      trace.matchKind === 'status-condition-enablement' &&
      trace.recipientAbilityId === 'shadowsong-scorched-earth'
    );
    const scorchedText = scorchedTrace ? [
      scorchedTrace.explanation,
      ...scorchedTrace.matchedFacts,
      ...scorchedTrace.effects,
      ...scorchedTrace.assumptions,
      ...scorchedTrace.unresolvedQuestions,
    ].join(' ') : '';
    expect(scorchedText).toContain('Base current application chance: 10%.');
    expect(scorchedText).toContain('Panic-target application chance: 20%.');
    expect(scorchedText).toContain('Current application chance: 10% -> 20%.');
    expect(scorchedText).toContain('Conditional multiplier: 2x.');
    expect(scorchedText).toContain('The conditional chance modifier is target-specific.');
    expect(scorchedText).toContain('Panic on one enemy does not change the chance for another enemy.');
    expect(scorchedText).toContain('Vulnerable value: generic Damage Received +15%.');
    expect(scorchedText).toContain('Duration: 2 rounds.');
    expect(scorchedText).toContain('Activation scope is unresolved between one shared roll and independent per-target rolls.');
  });

  it('keeps unlocked Habit default Level 1 behavior available for the new batch', () => {
    expect(resolveEffectiveHabitLevel({ unlockStarRank: 2, starRank: 2, savedLevel: undefined })).toBe(1);
    expect(resolveEffectiveHabitLevel({ unlockStarRank: 10, starRank: 1, savedLevel: undefined })).toBeNull();
    expect(resolveEffectiveHabitLevel({ unlockStarRank: 10, starRank: 10, savedLevel: 3 })).toBe(3);
  });

  it('does not create periodic damage traces for non-periodic Control and Resistance statuses', () => {
    const periodic = derivePeriodicDamageDefinitions(dragons);
    const statuses = deriveStatusOutputCapabilities(dragons);

    expect(periodic.some((item) => item.statusId === 'stagger' || item.statusId === 'confusion' || item.statusId === 'resistance')).toBe(false);
    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'feskar', statusId: 'stagger' }),
      expect.objectContaining({ dragonId: 'shadowsong', statusId: 'vulnerable' }),
    ]));
  });

  it('splits Ebbing Fury support from allied impairment and preserves full explanation text', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, null);
    const traces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });
    const recoveryTraces = traces.filter((trace) =>
      trace.sourceAbilityId === 'rhysarion-ebbing-fury' &&
      trace.channel === 'recovery' &&
      trace.matchKind !== 'incoming-effect-amplification'
    );
    const impairmentTraces = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.matchKind === 'friendly-impairment');
    const providerDamageReduction = cards.cards.find((card) => card.dragonId === 'rhysarion')?.provides.filter((item) => item.abilityName === 'Ebbing Fury') ?? [];
    const visibleProviderDamageReduction = providerDamageReduction.filter((item) => !item.isEnemyFacing);
    const enemyFacingProvider = providerDamageReduction.filter((item) => item.isEnemyFacing);
    const enemyReduction = traces.find((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury' && trace.matchKind === 'enemy-damage-dealt-reduction');
    const enemyReductionText = enemyReduction ? [...enemyReduction.matchedFacts, ...enemyReduction.effects, ...enemyReduction.assumptions, enemyReduction.explanation].join(' ') : '';

    expect(habit('rhysarion', 'rhysarion-ebbing-fury').schedules.map((schedule) => schedule.id)).toEqual([
      'ebbing-fury-round-one-debuffs',
      'ebbing-fury-round-four-recovery',
    ]);
    expect(recoveryTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    for (const trace of recoveryTraces) {
      const text = [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ');
      expect(text).toContain('Timing: Start of Round 4.');
      expect(text).toContain('Recovery Rate: 25% at effective Habit Level 1.');
      expect(text).toContain('Ranked progression: L1 25%, L2 30%, L3 35%, L4 42.5%, L5 50%.');
      expect(text).toContain('Enhanced by Rhysarion Strength.');
      expect(text).toContain('Targets exactly 3 Allies; caster is eligible.');
      expect(text).toContain('Final Recovery amount remains unknown.');
    }

    const rhysarionCard = cards.cards.find((card) => card.dragonId === 'rhysarion');
    expect(visibleProviderDamageReduction).toHaveLength(2);
    expect(enemyFacingProvider).toHaveLength(1);
    const providerRecovery = visibleProviderDamageReduction.find((item) => /Recovery support/i.test(item.effectTitle) && item.targetLabel === 'Team');
    const providerImpairment = visibleProviderDamageReduction.find((item) => /Allied Damage Dealt reduction/i.test(item.effectTitle));
    const echoingProvides = rhysarionCard?.provides.filter((item) => item.abilityName === 'Echoing Melody') ?? [];
    expect(providerRecovery).toBeDefined();
    expect(providerImpairment).toBeDefined();
    expect(providerRecovery?.targetLabel).toBe('Team');
    expect(providerImpairment?.targetLabel).toBe('Team');
    expect(providerRecovery?.summary).toContain('Timing: Start of Round 4.');
    expect(providerRecovery?.summary).toContain('Recovery Rate: 25% at effective Habit Level 1.');
    expect(providerRecovery?.summary).toContain('Enhanced by Rhysarion Strength.');
    expect(providerRecovery?.summary).toContain('Recovery support');
    expect(providerRecovery?.summary).toContain('Feskar and Shadowsong receive +20% Recovery Received from Unbroken Devotion; Rhysarion does not receive this modifier.');
    expect(providerRecovery?.modifierLines.join(' ') ?? '').not.toContain("Amplified by Rhysarion's Unbroken Devotion");
    expect(providerRecovery ? providerRecovery.details.join(' ') : '').not.toContain('Damage Dealt');
    expect(providerRecovery?.details.join(' ')).toContain("Rhysarion's Ebbing Fury provides Recovery to Feskar, Rhysarion, and Shadowsong.");
    expect(providerRecovery?.details.join(' ')).toContain('Feskar and Shadowsong each receive +20% Recovery Received from Unbroken Devotion.');
    expect(providerRecovery?.details.join(' ')).toContain('Rhysarion does not receive this modifier because the caster is excluded.');
    expect(providerImpairment?.summary).toContain('Timing: Start of Round 1.');
    expect(providerImpairment?.summary).toContain('Duration: 3 rounds.');
    expect(providerImpairment?.summary).toContain('allied impairment');
    expect(providerImpairment?.summary).toContain('Damage Dealt by 27.5%');
    expect(providerImpairment ? providerImpairment.details.join(' ') : '').not.toContain('Recovery Received +20%');
    expect(visibleProviderDamageReduction.some((item) => item.targetLabel === 'Feskar')).toBe(false);
    expect(echoingProvides).toHaveLength(1);
    expect(echoingProvides[0]?.targetLabel).toBe('Feskar and Shadowsong');
    expect(rhysarionCard?.provides.filter((item) => item.abilityName === 'Ebbing Fury')).toHaveLength(3);
    expect([...(providerRecovery?.details ?? []), ...(providerImpairment?.details ?? [])].join(' ')).not.toMatch(/Target reference|Source effect ID|selected-target group|sharedSelectionGroupId/i);
    expect(rhysarionCard?.receives.some((item) => item.sourceDragonId === 'rhysarion' && item.recipientDragonId === 'rhysarion' && item.abilityName === 'Ebbing Fury')).toBe(false);
    for (const recipientId of ['feskar', 'shadowsong']) {
      const receives = cards.cards.find((card) => card.dragonId === recipientId)?.receives.filter((item) => item.abilityName === 'Ebbing Fury' && item.sourceDragonId === 'rhysarion') ?? [];
      const recovery = receives.find((item) => /Recovery support/i.test(item.effectTitle));
      const impairment = receives.find((item) => /Allied Damage Dealt reduction/i.test(item.effectTitle));
      const text = receives.map((item) => [...item.summaryLines, ...item.details, ...item.effects].join(' ')).join(' ');
      expect(receives).toHaveLength(2);
      expect(recovery?.state).toBe('active');
      expect(recovery?.modifierLines).toContain("Amplified by Rhysarion's Unbroken Devotion: Recovery Received +20%.");
      expect(recovery?.summary).toContain('Recovery Rate: 25% at effective Habit Level 1.');
      expect(recovery?.summary).toContain('Recovery support');
      expect(recovery ? recovery.details.join(' ') : '').not.toContain('Damage Dealt');
      expect(impairment?.state).toBe('active');
      expect(impairment?.summary).toMatch(/Ebbing Fury reduces Damage Dealt for .+ by 27.5%/);
      expect(impairment ? impairment.details.join(' ') : '').not.toContain('Recovery Received +20%');
      expect(text).not.toContain('Damage Dealt reduction at current effective level');
      expect(text).not.toContain('Ranked progression');
      expect(text).not.toMatch(/\bL[1-5]\b/);
      expect([...receives[0]!.modifierLines, text].join(' ')).not.toMatch(/Calculated Assault|Breath of Fire/);
    }

    expect(impairmentTraces.map((trace) => trace.recipientDragonId).sort()).toEqual(['feskar', 'rhysarion', 'shadowsong']);
    for (const trace of impairmentTraces) {
      const text = [...trace.effects, ...trace.matchedFacts, trace.explanation].join(' ');
      expect(text).toContain('Timing: Start of Round 1.');
      expect(text).toContain('Duration: 3 rounds.');
      expect(text).toContain('Friendly Damage Dealt decrease 27.5%');
      expect((text.match(/Friendly Damage Dealt decrease 27.5%/g) ?? [])).toHaveLength(1);
      expect(text).not.toContain('Damage Dealt reduction at current effective level');
      expect(text).toContain('harm');
      expect(text).not.toMatch(/\bbenefit\b|amplification/i);
    }
    expect(enemyReduction).toMatchObject({ recipientDragonId: null, interactionScope: 'enemy-side' });
    const enemyCardText = providerDamageReduction.filter((item) => item.isEnemyFacing)
      .flatMap((item) => [item.summary, ...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');
    expect(enemyCardText).toContain('all enemies');
    expect(enemyCardText).not.toMatch(/matching the source condition|threshold membership|Target not guaranteed|candidate/i);
    expect(enemyReduction?.targetSelectorSummary).toContain('enemy; any-lane; all-matching-condition; all matching enemies');
    expect(enemyReductionText).toContain('Enemy selector: all enemies.');
    expect(enemyReductionText).toContain('All matching enemies are affected; no enemy-side candidate group is created.');
    expect(enemyReductionText).not.toContain('Enemy target count: 3.');
  });

  it('keeps normal Ebbing Fury cards to the current ranked value for upgraded and preview states', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const upgradedRoster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 2, 3);
    const upgradedTraces = analyzeCapabilityAmplifications(formation, dragons, { roster: upgradedRoster });
    const upgradedCards = buildFormationCardPresentation(formation, dragons, upgradedTraces, { previewEnabled: false });
    const upgradedText = upgradedCards.cards
      .flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === 'Ebbing Fury')
      .flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');

    expect(upgradedText).toContain('Recovery Rate: 35% at effective Habit Level 3.');
    expect(upgradedText).toContain('reducing Damage Dealt by 38.5%.');
    expect(upgradedText).not.toContain('Damage Dealt reduction at current effective level');
    expect(upgradedText).not.toContain('Recovery Rate: 25%');
    expect(upgradedText).not.toContain('reducing Damage Dealt by 27.5%.');
    expect(upgradedText).not.toContain('Ranked progression');
    expect(upgradedText).not.toMatch(/\bL[1-5]\b/);

    const previewRoster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 1, 0);
    const savedPreviewHabitLevel = previewRoster.rhysarion?.habitLevels['rhysarion-ebbing-fury'];
    const previewTraces = analyzeCapabilityAmplifications(formation, dragons, {
      roster: previewRoster,
      previewMaxRankInteractions: true,
    });
    const previewCards = buildFormationCardPresentation(formation, dragons, previewTraces, { previewEnabled: true });
    const previewText = previewCards.cards
      .flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === 'Ebbing Fury')
      .flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');

    expect(previewText).toContain('Recovery Rate: 50% at effective Habit Level 5.');
    expect(previewText).toContain('reducing Damage Dealt by 55%.');
    expect(previewText).not.toContain('Damage Dealt reduction at current effective level');
    expect(previewText).not.toContain('Ranked progression');
    expect(previewText).not.toMatch(/\bL[1-5]\b/);
    expect(previewRoster.rhysarion?.habitLevels['rhysarion-ebbing-fury']).toBe(savedPreviewHabitLevel);

    const technicalText = previewTraces
      .filter((trace) => trace.sourceAbilityId === 'rhysarion-ebbing-fury')
      .flatMap((trace) => [...trace.effects, trace.explanation])
      .join(' ');
    expect(technicalText).toContain('Ranked progression: L1 25%, L2 30%, L3 35%, L4 42.5%, L5 50%.');
    expect(technicalText).toContain('Ranked progression: L1 27.5%, L2 33%, L3 38.5%, L4 46.75%, L5 55%.');
    expect(habit('rhysarion', 'rhysarion-ebbing-fury').schedules[1]?.effects[0]?.rankedValues).toHaveLength(5);
  });

  it('surfaces Resilient Bond initial self and adjacent stacks while keeping the retreat trigger conditional', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 2, null);
    const rawTraces = analyzeCapabilityAmplifications(formation, dragons, { roster });
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false });
    const resilient = traces.filter((trace) => trace.sourceAbilityId === 'feskar-resilient-bond');
    const resilientModifiers = deriveModifierCapabilities(dragons)
      .filter((modifier) => modifier.abilityId === 'feskar-resilient-bond')
      .map((modifier) => [modifier.sourceEffectId, modifier.id, modifier.targetSelector.selection, modifier.targetSelector.sharedSelectionGroupId]);
    const initialSelf = resilient.find((trace) => trace.recipientDragonId === 'feskar' && trace.id.includes('resilient-bond-self-stack'));
    const initialAdjacent = resilient.find((trace) => trace.recipientDragonId === 'rhysarion' && trace.id.includes('resilient-bond-adjacent-stack'));
    const retreat = resilient.find((trace) => trace.recipientDragonId === 'feskar' && trace.id.includes('resilient-bond-self-retreat-stack'));
    const active = resilient.filter((trace) => trace.status === 'active');

    expect(resilientModifiers).toEqual(expect.arrayContaining([
      ['resilient-bond-self-stack', 'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier', 'self', null],
      ['resilient-bond-adjacent-stack', 'feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier', 'one-eligible-adjacent', 'resilient-bond-tracked-ally'],
      ['resilient-bond-self-retreat-stack', 'feskar-resilient-bond-resilient-bond-self-retreat-stack-damage-received-received-modifier', 'self', null],
    ]));
    expect(new Set(resilientModifiers.map(([, id]) => id))).toHaveProperty('size', 3);
    expect(rawTraces.filter((trace) => trace.sourceAbilityId === 'feskar-resilient-bond')
      .map((trace) => trace.modifierCapabilityId)).toEqual(expect.arrayContaining([
        'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier',
        'feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier',
        'feskar-resilient-bond-resilient-bond-self-retreat-stack-damage-received-received-modifier',
      ]));
    expect(resilient.some((trace) => trace.assumptions.includes('Structurally duplicate raw traces were collapsed.'))).toBe(false);

    expect(active.map((trace) => trace.modifierCapabilityId).sort()).toEqual([
      'feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier',
      'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier',
    ]);
    expect(initialSelf).toMatchObject({
      status: 'active',
      interactionScope: 'internal',
      modifierCapabilityId: 'feskar-resilient-bond-resilient-bond-self-stack-damage-received-received-modifier',
    });
    expect(initialAdjacent).toMatchObject({ status: 'active', interactionScope: 'cross-dragon' });
    expect(initialAdjacent?.modifierCapabilityId).toBe('feskar-resilient-bond-resilient-bond-adjacent-stack-damage-received-received-modifier');
    expect(resilient.some((trace) => trace.recipientDragonId === 'shadowsong' && trace.status !== 'inactive')).toBe(false);
    expect(retreat).toMatchObject({
      status: 'potential',
      interactionScope: 'internal',
      modifierCapabilityId: 'feskar-resilient-bond-resilient-bond-self-retreat-stack-damage-received-received-modifier',
    });

    const selfText = [...(initialSelf?.matchedFacts ?? []), ...(initialSelf?.effects ?? []), initialSelf?.explanation ?? ''].join(' ');
    const adjacentText = [...(initialAdjacent?.matchedFacts ?? []), ...(initialAdjacent?.effects ?? []), initialAdjacent?.explanation ?? ''].join(' ');
    const retreatText = [...(retreat?.matchedFacts ?? []), ...(retreat?.effects ?? []), ...(retreat?.unresolvedQuestions ?? []), retreat?.explanation ?? ''].join(' ');
    expect(selfText).toContain('Source effect ID: resilient-bond-self-stack.');
    expect(selfText).not.toMatch(/resilient-bond-adjacent-stack|retreated in the previous round|Timing: Each round/i);
    expect(adjacentText).toContain('Source effect ID: resilient-bond-adjacent-stack.');
    expect(adjacentText).toContain('Caster excluded from this target selection.');
    expect(adjacentText).toContain('Shared selected-target group: resilient-bond-tracked-ally.');
    expect(adjacentText).toContain('Resolved selected target in this formation: Rhysarion.');
    expect(adjacentText).not.toMatch(/expected self|retreated in the previous round|Timing: Each round/i);
    expect(retreatText).toContain('Source effect ID: resilient-bond-self-retreat-stack.');
    expect(retreatText).toMatch(/originally selected adjacent ally|retreated in the previous round/i);
    expect(retreatText).toContain('Tracked selected ally in this formation: Rhysarion.');
    expect(retreatText).not.toMatch(/retreat occurred|maximum \d+/i);

    const feskarCard = cards.cards.find((card) => card.dragonId === 'feskar');
    const resilientProvides = feskarCard?.provides.filter((item) => item.abilityName === 'Resilient Bond') ?? [];
    const groupedInitial = resilientProvides.find((item) => item.targetLabel === 'Feskar and Rhysarion');
    const retreatCard = resilientProvides.find((item) => item.traceIds.some((traceId) => traceId.includes('resilient-bond-self-retreat-stack')));
    const groupedText = groupedInitial ? [...groupedInitial.summaryLines, ...groupedInitial.details, ...groupedInitial.effects].join(' ') : '';

    expect(groupedInitial).toMatchObject({
      sourceDragonId: 'feskar',
      recipientDragonId: null,
      recipientName: 'Feskar and Rhysarion',
      effectTitle: 'Resilient Bond - Physical Damage Received support',
    });
    expect(groupedText).toContain('Timing: Start of combat.');
    expect(groupedText).toContain('Feskar and Rhysarion each gain 1 Resilient Bond stack.');
    expect(groupedText).toContain('Each stack reduces Physical Damage Received from non-Basic Attacks by 6.5% at effective Habit Level 1.');
    expect(groupedText).toContain('Duration: until end of combat.');
    expect(groupedText).toContain('Maximum stack count is unknown.');
    expect(groupedText).not.toContain('Ranked progression');
    expect(groupedText).not.toMatch(/\bL[1-5]\b|retreated in the previous round/i);
    expect(retreatCard).toBeDefined();

    const rhysarionReceives = cards.cards.find((card) => card.dragonId === 'rhysarion')?.receives.filter((item) => item.abilityName === 'Resilient Bond') ?? [];
    expect(rhysarionReceives).toHaveLength(1);
    expect(rhysarionReceives[0]?.summary).toContain('Rhysarion');
    expect(feskarCard?.receives.some((item) => item.sourceDragonId === 'feskar' && item.abilityName === 'Resilient Bond')).toBe(false);
    expect(cards.cards.find((card) => card.dragonId === 'shadowsong')?.receives.some((item) => item.abilityName === 'Resilient Bond')).toBe(false);

    const technicalText = resilient.flatMap((trace) => [...trace.effects, ...trace.matchedFacts, trace.explanation]).join(' ');
    expect(technicalText).toContain('Ranked progression: L1 6.5%, L2 7.8%, L3 9.1%, L4 11.05%, L5 13%.');
    expect(technicalText).toContain('Physical Damage Received reduction applies to non-Basic Attacks only.');
  });

  it('preserves ordered targets, internal effects, and technical formatting at full rank', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, 0);
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const allText = traces.flatMap((trace) => [
      trace.explanation,
      ...trace.matchedFacts,
      ...trace.effects,
      ...trace.assumptions,
      ...trace.unresolvedQuestions,
    ]).join(' ');

    const inspiring = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-inspiring-melody');
    const inspiringText = inspiring.flatMap((trace) => [trace.explanation, ...trace.matchedFacts, ...trace.effects]).join(' ');
    expect(inspiringText).toContain('Activation chance: 20% at effective Habit Level 1.');
    expect(inspiringText).toContain('Initiative +20%');
    expect(inspiringText).toContain('Damage Received decrease 15%');
    expect(inspiringText).toContain('Shared activation group: inspiring-melody-each-round-shared-activation.');
    expect(inspiringText).toContain('shared group inspiring-melody-selected-ally');
    expect(inspiringText).toContain('caster excluded');
    expect(inspiringText).toContain('Eligible selected-target candidates: Feskar and Shadowsong.');
    expect(inspiringText).toContain('One candidate is selected when the activation succeeds; the selected target is unresolved.');
    expect(inspiringText).not.toContain('Resolved selected target in this formation: Feskar.');
    expect(inspiringText).not.toContain('Resolved selected target in this formation: Shadowsong.');
    const inspiringCards = cards.cards.find((card) => card.dragonId === 'rhysarion')?.provides
      .filter((item) => item.abilityName === 'Inspiring Melody') ?? [];
    expect(inspiringCards.length).toBeGreaterThan(0);
    expect(inspiringCards.some((item) => /Feskar|Shadowsong/.test(item.targetLabel ?? ''))).toBe(true);
    const inspiringCardText = inspiringCards.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ');
    expect(inspiringCardText).toContain('Initiative +20%');
    expect(inspiringCardText).toContain('Damage Received decrease 15%');
    expect(inspiringCardText).toContain('Activation chance: 20% at effective Habit Level 1.');

    const statusOutputs = deriveStatusOutputCapabilities(dragons).filter((output) => output.abilityId === 'shadowsong-blazing-conductor');
    expect(statusOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-first-burn')?.chanceByHabitLevel[0]?.value).toBe(40);
    expect(statusOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-second-burn')?.chanceByHabitLevel[0]?.value).toBe(20);
    expect(statusOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-first-burn')?.targetSelector.count).toBe(1);
    expect(statusOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-second-burn')?.targetSelector.count).toBe(1);
    const periodic = derivePeriodicDamageDefinitions(dragons).filter((output) => output.abilityId === 'shadowsong-blazing-conductor');
    expect(periodic).toHaveLength(2);
    expect(periodic.every((output) => output.damageRateFixed === null && output.damageRateByHabitLevel.length === 0)).toBe(true);
    const conductorOutputs = deriveOutputCapabilities(dragons).filter((output) => output.abilityId === 'shadowsong-blazing-conductor');
    expect(conductorOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-first-fire')?.id).toContain('first-fire-output');
    expect(conductorOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-second-fire')?.id).toContain('second-fire-output');
    expect(conductorOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-first-fire')?.targetCount).toBe(1);
    expect(conductorOutputs.find((output) => output.sourceEffectId === 'blazing-conductor-second-fire')?.targetCount).toBe(1);
    const conductorText = traces.filter((trace) => trace.sourceAbilityId === 'shadowsong-blazing-conductor')
      .flatMap((trace) => [trace.explanation, ...trace.matchedFacts, ...trace.effects])
      .join(' ');
    expect(conductorText).toContain('Status supplier effect: blazing-conductor-first-burn.');
    expect(conductorText).toContain('Selected-target group: blazing-conductor-first-target.');
    expect(conductorText).toContain('Status supplier effect: blazing-conductor-second-burn.');
    expect(conductorText).toContain('Selected-target group: blazing-conductor-second-target.');
    expect(conductorText).toContain('Second added target must differ from the first added target.');
    expect(conductorText).not.toContain('All Blazing Conductor effects share the same selected target');
    expect(conductorText).not.toContain('in any lane in any lane');
    expect(conductorText).not.toContain('Status application chance: 40% at effective Habit Level 1.');
    expect(conductorText).not.toContain('Status application chance: 20% at effective Habit Level 1.');
    expect(conductorText).not.toContain('Activation chance: 40% at effective Habit Level 1.');
    expect(conductorText).not.toContain('Activation chance: 20% at effective Habit Level 1.');
    expect(conductorText).toContain('Periodic damage rate: unknown/not stated.');
    expect(conductorText).not.toContain('Damage Rate 20%.');
    expect(conductorText).not.toContain('Damage Rate 40%.');
    expect(conductorText).toContain('Duration: 2 rounds.');

    const burnSummary = traces.find((trace) => trace.title === 'Burn enables Emerald Inferno' && trace.recipientAbilityId === 'feskar-emerald-inferno')?.explanation ?? '';
    expect(burnSummary).toContain('40% chance on the first added target and 20% chance on the second added target, which must differ from the first.');
    expect(burnSummary).toContain('Burn lasts 2 rounds.');
    expect(burnSummary).toContain('Burn application and target overlap are not guaranteed.');

    const resilient = traces.filter((trace) => trace.sourceAbilityId === 'feskar-resilient-bond');
    const selfStackRecipients = resilient
      .filter((trace) => trace.modifierCapabilityId?.includes('resilient-bond-self-stack'))
      .map((trace) => trace.recipientDragonId);
    const retreatRecipients = resilient
      .filter((trace) => trace.modifierCapabilityId?.includes('resilient-bond-self-retreat-stack'))
      .map((trace) => trace.recipientDragonId);
    expect(selfStackRecipients).toEqual(['feskar']);
    expect(retreatRecipients).toEqual(['feskar']);
    expect(resilient.some((trace) =>
      trace.recipientDragonId === 'shadowsong' &&
      [...trace.matchedFacts, trace.explanation].join(' ').includes('Resolved selected target in this formation: Shadowsong.')
    )).toBe(false);
    expect(resilient.flatMap((trace) => trace.matchedFacts).join(' ')).toContain('Tracked selected ally in this formation: Rhysarion.');
    expect(cards.cards.find((card) => card.dragonId === 'feskar')?.provides
      .some((item) => item.abilityName === 'Resilient Bond' && item.targetLabel === 'Feskar and Rhysarion')).toBe(true);

    expect(traces.filter((trace) =>
      trace.sourceAbilityId === 'feskar-champions-brilliance' &&
      trace.recipientDragonId === 'feskar' &&
      trace.ruleId === 'internal-self-modifier'
    )).toHaveLength(3);
    expect(traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-champions-vigor' && trace.recipientDragonId === 'rhysarion')).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'active' }),
      expect.objectContaining({ status: 'active' }),
    ]));
    expect(allText).toContain('Recovery Dealt increase 15%.');
    expect(allText).toContain('Initiative +25.');
    expect(allText).toContain('Fire Damage Dealt increase 16%.');
    expect(allText).toContain('quick-witted-intelligence');
    expect(allText).toContain('sharp-resolve-strength');
    expect(allText).toContain('dragons-intellect-damage-received');
    expect(traces.some((trace) => trace.sourceAbilityId === 'feskar-quick-witted' && trace.recipientDragonId !== 'feskar')).toBe(false);
    expect(traces.some((trace) => trace.sourceAbilityId === 'rhysarion-sharp-resolve' && trace.recipientDragonId !== 'rhysarion')).toBe(false);
    expect(traces.some((trace) => trace.sourceAbilityId === 'shadowsong-dragons-intellect' && trace.recipientDragonId !== 'shadowsong')).toBe(false);

    expect(traces.filter((trace) =>
      trace.sourceAbilityId === 'feskar-insightful-allies' &&
      trace.ruleId === 'direct-stat-support'
    ).every((trace) => trace.status === 'active')).toBe(true);
    expect(traces.filter((trace) =>
      trace.sourceAbilityId === 'rhysarion-unbroken-devotion' &&
      trace.ruleId === 'recipient-side-ally-support'
    ).every((trace) => trace.status === 'active')).toBe(true);
    expect(inspiring.every((trace) => trace.status === 'potential')).toBe(true);
    expect(traces.filter((trace) =>
      trace.sourceAbilityId === 'rhysarion-echoing-melody' &&
      trace.matchKind !== 'incoming-effect-amplification'
    ).every((trace) => trace.status === 'active')).toBe(true);

    expect(allText).toContain('Highest-Strength enemy identity');
    expect(allText).toContain('Enemy identities and combat availability are unresolved.');
    expect(allText).toContain('Adjacent enemy identity');
    expect(allText).not.toContain('Damage Dealt Dealt');
    expect(allText).not.toContain('Targets 1 Allies');
    expect(allText).not.toContain('in any lane in any lane');
    expect(allText).toContain('Enemy Instinct reduction');
    expect(allText).toContain('Enemy Initiative reduction');
    expect(allText).not.toContain('Enemy Stat decrease 18%');
  });

  it('resolves Inspiring Melody to one named recipient when only one other adjacent ally is eligible', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'rhysarion', vanguard: 'feskar', 'right-flank': 'shadowsong' };
    const roster = ownedRoster(['feskar', 'rhysarion', 'shadowsong'], 10, 0);
    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const inspiring = traces.filter((trace) => trace.sourceAbilityId === 'rhysarion-inspiring-melody');
    expect(inspiring.map((trace) => trace.recipientDragonId)).toEqual(expect.arrayContaining(['feskar']));
    expect(inspiring.some((trace) => trace.recipientDragonId === 'shadowsong')).toBe(false);
    const cardsForAbility = cards.cards.find((item) => item.dragonId === 'rhysarion')?.provides
      .filter((item) => item.abilityName === 'Inspiring Melody') ?? [];
    expect(cardsForAbility.length).toBeGreaterThan(0);
    const text = cardsForAbility.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ');
    expect(text).toContain("Rhysarion's Inspiring Melody can reduce Feskar's Damage Received by 15%.");
    expect((text.match(/Rhysarion's Inspiring Melody can reduce Feskar's Damage Received by 15%/g) ?? [])).toHaveLength(1);
    expect(text).not.toContain('Target not guaranteed.');
  });

  it('models Vaeldra Tempting Distraction as a per-successful-Taunt same-target trigger in the reviewed formation', () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'vaeldra', 'right-flank': 'rhysarion' };
    const roster = ownedRoster(['feskar', 'vaeldra', 'rhysarion'], 10, 0);
    for (const dragonId of ['feskar', 'vaeldra', 'rhysarion']) {
      roster[dragonId]!.reignLevel = 26;
    }
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { feskar: 26, vaeldra: 26, rhysarion: 26 },
      previewMaxRankInteractions: false,
    });
    const counts = traces.reduce<Record<TraceStatus, number>>((acc, trace) => {
      acc[trace.status] += 1;
      return acc;
    }, { active: 0, potential: 0, inactive: 0, blocked: 0, unknown: 0, 'not-applicable': 0 });
    const tempting = traces.filter((trace) => trace.sourceAbilityId === 'vaeldra-tempting-distraction');
    const physical = tempting.find((trace) => trace.channel === 'physical-damage');
    const fire = tempting.find((trace) => trace.channel === 'fire-damage');
    const physicalText = physical ? [physical.explanation, physical.targetSelectorSummary ?? '', ...physical.matchedFacts, ...physical.effects, ...physical.assumptions].join(' ') : '';
    const fireText = fire ? [fire.explanation, fire.targetSelectorSummary ?? '', ...fire.matchedFacts, ...fire.effects, ...fire.assumptions].join(' ') : '';
    const combinedText = `${physicalText} ${fireText}`;

    expect(traces).toHaveLength(62);
    expect(counts).toMatchObject({ active: 35, potential: 15, inactive: 11, blocked: 1, unknown: 0 });
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
    expect(tempting).toHaveLength(2);
    expect(physical).toMatchObject({
      status: 'potential',
      interactionScope: 'enemy-side',
      modifierRole: 'enemy-debuff',
      recipientDragonId: null,
    });
    expect(fire).toMatchObject({
      status: 'potential',
      interactionScope: 'enemy-side',
      modifierRole: 'enemy-debuff',
      recipientDragonId: null,
    });
    expect(physicalText).toContain('Physical Damage Received +6%.');
    expect(physicalText).toContain('Applies to non-Basic Physical Damage only.');
    expect(physicalText).toContain('Duration: 2 rounds.');
    expect(fireText).toContain('Fire Damage Received +6%.');
    expect(fireText).toContain('Applies to all qualifying Fire Damage sources.');
    expect(fireText).toContain('Duration: 2 rounds.');
    for (const text of [physicalText, fireText]) {
      expect(text).toContain('Trigger cardinality: once per successful Taunt application.');
      expect(text).toContain('Affected target count: dynamic; derived from successful Taunt applications.');
      expect(text).toContain('Result target: same enemy that received the successful Taunt application.');
      expect(text).toContain('Multiple successful Taunt applications can affect multiple enemies.');
      expect(text).toContain('same target as triggering Taunt application; dynamic target count');
      expect(text).toContain('Qualifying Taunt supplier: Lure - lure-taunt.');
      expect(text).toContain("Qualifying Taunt supplier: Siren's Call - sirens-call-taunt.");
      expect(text).toContain('Excluded trigger branch: Siren\'s Call - sirens-call-stagger supplies Stagger, not Taunt.');
      expect(text).toContain('Stagger does not trigger this effect.');
      expect(text).not.toMatch(/for one enemy target/i);
      expect(text).not.toMatch(/fixed target count of 1/i);
      expect(text).not.toContain('Enemy target count: unknown.');
    }
    expect(combinedText).not.toContain('fiery-bonds');
    expect(physical?.matchedFacts.join(' ')).toContain('Qualifying allied outputs: Dawnsong: Physical Damage, Lure: Physical Damage.');
    expect(fire?.matchedFacts.join(' ')).toContain('Qualifying allied outputs: Emerald Inferno: Fire Damage, Dawnsong: Fire Damage.');

    const cards = buildFormationCardPresentation(formation, dragons, traces.filter(isNormalSynergyTrace), { previewEnabled: false, roster });
    const vaeldraProvides = cards.cards.find((card) => card.dragonId === 'vaeldra')?.provides ?? [];
    const temptingCards = vaeldraProvides.filter((item) => item.abilityName === 'Tempting Distraction');
    expect(temptingCards).toHaveLength(2);
    expect(temptingCards.map((item) => item.effectTitle).sort()).toEqual([
      'Tempting Distraction - Enemy Fire Damage vulnerability',
      'Tempting Distraction - Enemy Physical Damage vulnerability',
    ]);
    const cardText = temptingCards.flatMap((item) => [item.summary, ...item.summaryLines, ...item.details, ...item.effects]).join(' ');
    expect(cardText).toContain('For each enemy Vaeldra successfully Taunts');
    expect(cardText).toContain('on that same enemy');
    expect(cardText).not.toMatch(/for one enemy target/i);
    expect(cards.cards.some((card) => card.receives.some((item) => item.abilityName === 'Tempting Distraction'))).toBe(false);
  });

  it("preserves Siren's Call branch predicates and Round 2-only Dawnsong overlap", () => {
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'vaeldra', 'right-flank': 'rhysarion' };
    const roster = ownedRoster(['feskar', 'vaeldra', 'rhysarion'], 10, 0);
    for (const dragonId of ['feskar', 'vaeldra', 'rhysarion']) {
      roster[dragonId]!.reignLevel = 26;
    }
    const traces = analyzeFormationTraces(formation, dragons, {
      roster,
      dragonLevels: { feskar: 26, vaeldra: 26, rhysarion: 26 },
      previewMaxRankInteractions: false,
    });
    const branchTrace = traces.find((trace) =>
      trace.sourceAbilityId === 'vaeldra-sirens-call' &&
      trace.ruleId === 'conditional-branch-status-output'
    );
    const branchText = branchTrace ? [branchTrace.explanation, ...branchTrace.matchedFacts, ...branchTrace.effects, ...branchTrace.assumptions].join(' ') : '';
    const sirenDawnsong = traces.find((trace) =>
      trace.sourceAbilityId === 'vaeldra-sirens-call' &&
      trace.recipientAbilityId === 'rhysarion-dawnsong' &&
      trace.matchKind === 'status-condition-enablement' &&
      trace.id.includes('sirens-call-stagger')
    );
    const sirenText = sirenDawnsong ? [sirenDawnsong.status, sirenDawnsong.explanation, ...sirenDawnsong.matchedFacts, ...sirenDawnsong.effects, ...sirenDawnsong.assumptions, ...sirenDawnsong.unresolvedQuestions].join(' ') : '';
    const feskarDawnsong = traces.find((trace) =>
      trace.sourceAbilityId === 'feskar-unyielding-grasp' &&
      trace.recipientAbilityId === 'rhysarion-dawnsong' &&
      trace.matchKind === 'status-condition-enablement'
    );
    expect(branchTrace).toMatchObject({ status: 'potential', interactionScope: 'enemy-side' });
    expect(branchText).toContain('already-Taunted enemies -> Stagger.');
    expect(branchText).toContain('non-Taunted enemies -> Taunt.');
    expect(branchText).toContain('Exactly one branch applies per enemy.');
    expect(branchText).not.toContain('apply Taunt and Stagger');

    expect(sirenDawnsong).toMatchObject({
      status: 'potential',
      sourceAbilityId: 'vaeldra-sirens-call',
      recipientAbilityId: 'rhysarion-dawnsong',
    });
    expect(sirenText).toContain('Branch condition: Target is already Taunted.');
    expect(sirenText).toContain('Branch target count: dynamic; only enemies already afflicted with Taunt receive Stagger.');
    expect(sirenText).toContain('Enemies without Taunt take the alternate branch instead.');
    expect(sirenText).toContain('Exactly one conditional branch applies per enemy.');
    expect(sirenText).toContain('Supplier schedule: Rounds 1, 2, and 3.');
    expect(sirenText).toContain('Dependent schedule: Rounds 2, 5, and 8.');
    expect(sirenText).toContain('Schedule overlap: Round 2 only.');
    expect(sirenText).toContain('Stagger duration: until end of current round.');
    expect(sirenText).toContain('Stagger does not carry this interaction to Rounds 5 and 8.');
    expect(sirenText).toContain('Action order within the overlapping round is unresolved.');
    expect(sirenText).toContain('The supplied status and dependent damage output must involve the same enemy.');
    expect(sirenText).not.toMatch(/Stagger 3 enemies/i);
    expect(sirenText).not.toMatch(/all Siren's Call targets/i);

    expect(feskarDawnsong).toBeDefined();
    expect(feskarDawnsong?.sourceAbilityId).toBe('feskar-unyielding-grasp');
    expect(feskarDawnsong?.matchedFacts.join(' ')).toContain('Duration: 3 rounds.');
    expect(feskarDawnsong?.matchedFacts.join(' ')).toContain('Priority: Warriors are prioritized, not guaranteed.');
    expect(feskarDawnsong?.matchedFacts.join(' ')).not.toContain("Siren's Call");

    const identities = traces.map(technicalAnalysisTraceIdentity);
    expect(new Set(identities).size).toBe(identities.length);
  });
});
