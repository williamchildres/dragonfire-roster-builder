import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
import { statusGlossary } from '../data/statusGlossary';
import type { FormationAnalysisInput } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import {
  analyzeCapabilityAmplifications,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
  sourceScopesCompatible,
} from '../services/effectCapabilities';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';

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

function roster(dragonIds: string[], level = 30, starRank = 10) {
  const current = createEmptyRoster(dragons);
  for (const dragonId of dragonIds) {
    const entry = current[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = starRank;
    entry!.reignLevel = level;
    for (const habitId of Object.keys(entry!.habitLevels)) {
      entry!.habitLevels[habitId] = 5;
    }
  }
  return current;
}

function ownedRoster(dragonIds: string[], level = 26, starRank = 10, allDragons = dragons) {
  const current = createEmptyRoster(allDragons);
  for (const dragonId of dragonIds) {
    const entry = current[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = starRank;
    entry!.reignLevel = level;
  }
  return current;
}

const epicFormation: FormationAnalysisInput = {
  'left-flank': 'daemoros',
  vanguard: 'vaeldra',
  'right-flank': 'vermax',
};

describe('Daemoros and Vaeldra Epic profiles', () => {
  it('preserves legacy targeting and selection integrity for Daemoros, Vaeldra, and Vermax', () => {
    const currentRoster = ownedRoster(['daemoros', 'vaeldra', 'vermax']);
    const traces = analyzeFormationTraces(epicFormation, dragons, {
      roster: currentRoster,
      dragonLevels: { daemoros: 26, vaeldra: 26, vermax: 26 },
      previewMaxRankInteractions: false,
    });

    const infernal = traces.filter((trace) => trace.sourceAbilityId === 'vaeldra-infernal-force');
    const infernalFire = infernal.find((trace) => trace.modifierCapabilityIds?.some((id) => id.includes('infernal-force-fire')));
    const infernalPhysical = infernal.find((trace) => trace.modifierCapabilityIds?.some((id) => id.includes('infernal-force-physical')));
    expect(infernalFire?.recipientDragonId).toBe('daemoros');
    expect(infernalFire?.targetSelectionGroup).toBeUndefined();
    expect(infernalPhysical?.recipientDragonId).toBe('vermax');
    expect(infernalPhysical?.targetSelectionGroup).toBeUndefined();
    expect(infernalFire?.matchedFacts.join(' ')).toContain('Preferred position: Left Flank.');
    expect(infernalPhysical?.matchedFacts.join(' ')).toContain('Preferred position: Right Flank.');
    expect(infernalFire?.effects.join(' ')).toContain('Fire Damage Dealt increase 12% at effective Habit Level 1.');
    expect(infernalPhysical?.effects.join(' ')).toContain('Physical Damage Dealt increase 12% at effective Habit Level 1.');
    expect(infernalPhysical?.effects.join(' ')).toContain('Applies to non-Basic Physical Damage only.');
    expect(infernalFire?.effects.join(' ')).toContain('Duration: 3 rounds.');
    expect(infernalPhysical?.effects.join(' ')).toContain('Duration: 3 rounds.');
    expect(infernal.map((trace) => trace.targetSelectionGroup?.eligibleRecipientDragonIds.join(','))).not.toContain('daemoros,vaeldra,vermax');

    const ensnareText = traces
      .filter((trace) => trace.sourceAbilityId === 'vaeldra-ensnare')
      .map((trace) => [...trace.matchedFacts, ...trace.effects].join(' '))
      .join(' ');
    expect(ensnareText).toContain('Enemy target count: 2.');
    expect(ensnareText).toContain('Target scope: enemies within adjacency.');
    expect(ensnareText).toContain('Shared selected-target group: ensnare-targets.');
    expect(ensnareText).toContain('Duration: 3 rounds.');
    expect(ensnareText).not.toContain('one-eligible-adjacent; 1 target');

    for (const [abilityId, position, group] of [
      ['daemoros-instill-fear', 'Right Flank', 'instill-fear-target'],
      ['daemoros-darkening-fear', 'Left Flank', 'darkening-fear-target'],
    ] as const) {
      const text = traces
        .filter((trace) => trace.sourceAbilityId === abilityId)
        .map((trace) => [...trace.matchedFacts, ...trace.effects].join(' '))
        .join(' ');
      expect(text).toContain('Enemy target count: 1.');
      expect(text).toContain(`Priority: enemy ${position} is preferred, not guaranteed.`);
      expect(text).toContain(`Shared selected-target group: ${group}.`);
      expect(text).toContain('Activation chance: 25% at effective Habit Level 1.');
      expect(text).toContain('Panic deals periodic Tactical Damage each round');
    }

    const trial = traces.filter((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame');
    expect(trial).toHaveLength(3);
    expect(trial.map((trace) => trace.modifierCapabilityIds?.[0]).sort()).toEqual([
      'vermax-trial-by-flame-trial-below-25-fire-reduction-damage-received-received-modifier',
      'vermax-trial-by-flame-trial-below-50-resistance-damage-received-received-modifier',
      'vermax-trial-by-flame-trial-below-75-fire-reduction-damage-received-received-modifier',
    ]);
    for (const trace of trial) {
      const text = [...trace.matchedFacts, ...trace.effects, trace.explanation].join(' ');
      expect(trace.targetSelectionGroup).toMatchObject({
        targetCount: 2,
        eligibleRecipientDragonIds: ['daemoros', 'vaeldra'],
        selection: 'all-matching-condition',
        selectionUncertain: false,
      });
      expect(text).toContain('Caster excluded from this target selection.');
      expect(text).toContain('Each eligible recipient evaluates its own condition; no one ally is selected from the qualifying set.');
      expect(text).not.toContain('Eligible selected-target candidates');
      expect(text).not.toContain('One candidate is selected');
      expect(text).not.toMatch(/threshold\. \./);
    }
    expect(trial.find((trace) => trace.modifierCapabilityIds?.[0]?.includes('below-75'))?.effects.join(' ')).toContain('Fire Damage Received decrease 5% at effective Habit Level 1.');
    expect(trial.find((trace) => trace.modifierCapabilityIds?.[0]?.includes('below-50'))?.effects.join(' ')).toContain('Damage Received decrease 10% at effective Habit Level 1.');
    expect(trial.find((trace) => trace.modifierCapabilityIds?.[0]?.includes('below-50'))?.effects.join(' ')).toContain('Each recipient below 50% Troop Capacity may receive Resistance');
    expect(trial.find((trace) => trace.modifierCapabilityIds?.[0]?.includes('below-25'))?.effects.join(' ')).toContain('Fire Damage Received decrease 15% at effective Habit Level 1.');

    const reactive = traces.find((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support');
    expect(reactive).toMatchObject({ recipientDragonId: 'vaeldra' });
    expect(reactive?.matchedFacts.join(' ')).toContain('Daemoros Instinct: 84.8.');
    expect(reactive?.matchedFacts.join(' ')).toContain('Vaeldra Instinct: 102.8.');
    expect(reactive?.matchedFacts.join(' ')).toContain('Vermax Instinct: 73.7.');
    expect(reactive?.effects.join(' ')).toContain('Instinct +18% at effective Habit Level 1.');
    expect(reactive?.effects.join(' ')).toContain('Initiative +9% at effective Habit Level 1.');
    expect(reactive?.effects.join(' ')).toMatch(/Duration: until end of combat\./i);
  });

  it('keeps Reactive Instincts unresolved for highest-Instinct ties and missing candidate stats', () => {
    const tiedDragons = dragons.map((item) =>
      item.id === 'daemoros' || item.id === 'vaeldra'
        ? { ...item, stats: { ...item.stats, instinct: 100 } }
        : item.id === 'vermax'
          ? { ...item, stats: { ...item.stats, instinct: 73.7 } }
          : item,
    );
    const tied = analyzeFormationTraces(epicFormation, tiedDragons, {
      roster: ownedRoster(['daemoros', 'vaeldra', 'vermax'], 26, 10, tiedDragons),
      dragonLevels: { daemoros: 26, vaeldra: 26, vermax: 26 },
    }).find((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support');
    expect(tied?.recipientDragonId).toBeNull();
    expect(tied?.targetSelectionGroup).toMatchObject({
      targetCount: 1,
      eligibleRecipientDragonIds: ['daemoros', 'vaeldra'],
      selectionUncertain: true,
      selection: 'highest-stat',
      selectionStat: 'instinct',
    });
    expect(tied?.targetSelectionGroup?.eligibleRecipientDragonIds).not.toContain('vermax');

    const unknownDragon = {
      ...dragon('malachite'),
      id: 'unknown-instinct-ally',
      slug: 'unknown-instinct-ally',
      name: 'Unknown Instinct Ally',
      stats: { strength: null, instinct: null, intelligence: null, initiative: null },
    };
    const missingStatDragons = [...dragons, unknownDragon];
    const missingFormation: FormationAnalysisInput = {
      'left-flank': 'unknown-instinct-ally',
      vanguard: 'vaeldra',
      'right-flank': 'vermax',
    };
    const missing = analyzeFormationTraces(missingFormation, missingStatDragons, {
      roster: ownedRoster(['unknown-instinct-ally', 'vaeldra', 'vermax'], 26, 10, missingStatDragons),
      dragonLevels: { 'unknown-instinct-ally': 26, vaeldra: 26, vermax: 26 },
    }).find((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support');
    expect(missing?.recipientDragonId).toBeNull();
    expect(missing?.targetSelectionGroup?.eligibleRecipientDragonIds).toEqual(['unknown-instinct-ally', 'vaeldra', 'vermax']);
    expect(missing?.targetSelectionGroup?.candidateStats).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'unknown-instinct-ally', statId: 'instinct', value: null }),
      expect.objectContaining({ dragonId: 'vaeldra', statId: 'instinct', value: 102.8 }),
      expect.objectContaining({ dragonId: 'vermax', statId: 'instinct', value: 73.7 }),
    ]));
    expect(missing?.matchedFacts.join(' ')).toContain('Unknown Instinct Ally Instinct: unknown.');
  });

  it('keeps Infernal Force fallback candidate groups independent when preferred lanes are ineligible', () => {
    const fallbackFormation: FormationAnalysisInput = {
      'left-flank': 'vaeldra',
      vanguard: 'daemoros',
      'right-flank': 'caraxes',
    };
    const traces = analyzeFormationTraces(fallbackFormation, dragons, {
      roster: ownedRoster(['vaeldra', 'daemoros', 'caraxes']),
      dragonLevels: { vaeldra: 26, daemoros: 26, caraxes: 26 },
      previewMaxRankInteractions: false,
    }).filter((trace) => trace.sourceAbilityId === 'vaeldra-infernal-force');
    const fire = traces.find((trace) => trace.modifierCapabilityIds?.some((id) => id.includes('infernal-force-fire')));
    const physical = traces.find((trace) => trace.modifierCapabilityIds?.some((id) => id.includes('infernal-force-physical')));

    expect(fire?.recipientDragonId).toBeNull();
    expect(fire?.targetSelectionGroup).toMatchObject({
      targetCount: 1,
      selectionUncertain: true,
      eligibleRecipientDragonIds: ['caraxes', 'daemoros'],
    });
    expect(fire?.matchedFacts.join(' ')).toContain('Preferred position Left Flank has no eligible qualifying recipient in this formation; fallback candidates remain eligible.');
    expect(fire?.effects.join(' ')).toContain('Fire Damage Dealt increase 12% at effective Habit Level 1.');

    expect(physical?.recipientDragonId).toBeNull();
    expect(physical?.targetSelectionGroup).toMatchObject({
      targetCount: 1,
      selectionUncertain: true,
      eligibleRecipientDragonIds: ['daemoros', 'vaeldra'],
    });
    expect(physical?.matchedFacts.join(' ')).toContain('Preferred position Right Flank has no eligible qualifying recipient in this formation; fallback candidates remain eligible.');
    expect(physical?.effects.join(' ')).toContain('Physical Damage Dealt increase 12% at effective Habit Level 1.');
    expect(fire?.targetSelectionGroup?.eligibleRecipientDragonIds).not.toEqual(physical?.targetSelectionGroup?.eligibleRecipientDragonIds);
  });

  it('stores complete Epic profiles without canonical base stats', () => {
    expect(dragon('daemoros')).toMatchObject({
      rarity: 'Epic',
      breed: 'Warrior',
      dataStatus: 'community-verified',
      affinities: { Archers: 'positive' },
    });
    expect(dragon('vaeldra')).toMatchObject({
      rarity: 'Epic',
      breed: 'Warrior',
      dataStatus: 'community-verified',
      affinities: { Spearmen: 'positive' },
    });
    expect(dragon('daemoros').command?.name).toBe('Shadowflame');
    expect(dragon('vaeldra').command?.name).toBe('Lure');
    expect(dragon('daemoros').habits).toHaveLength(5);
    expect(dragon('vaeldra').habits).toHaveLength(5);
    expect(Object.values(dragon('daemoros').stats).every((value) => value === null)).toBe(true);
    expect(Object.values(dragon('vaeldra').stats).every((value) => value === null)).toBe(true);
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'daemoros')).toMatchObject({
      dragonLevel: 30,
      starRank: 1,
      combatStats: { strength: 110.7, instinct: 84.8, intelligence: 73.4, initiative: 98.3 },
      canonical: false,
    });
    expect(dragonObservationSnapshots.find((item) => item.dragonId === 'vaeldra')).toMatchObject({
      dragonLevel: 32,
      starRank: 1,
      combatStats: { strength: 108.5, instinct: 102.8, intelligence: 81.4, initiative: 89.3 },
      canonical: false,
    });
  });

  it('preserves exclusive and conditional effect structures without flattening Phantom Veil', () => {
    const phantom = habit('daemoros', 'daemoros-phantoms-veil').schedules[0]!.effects[0]!;
    const sirenBranch = habit('vaeldra', 'vaeldra-sirens-call').schedules[1]!.effects[0]!;
    const modifiers = deriveModifierCapabilities(dragons);
    const statusOutputs = deriveStatusOutputCapabilities(dragons);

    expect(phantom.effectOptions).toMatchObject({
      mode: 'one-of',
      selectorMethod: 'unknown',
    });
    expect(phantom.effectOptions?.options.map((option) => option.id)).toEqual(['physical', 'tactical', 'fire']);
    const phantomModifiers = modifiers.filter((modifier) => modifier.abilityId === 'daemoros-phantoms-veil');
    const phantomParent = phantomModifiers.find((modifier) => modifier.sourceEffectId === 'phantoms-veil-exclusive-defense');
    const phantomOptions = phantomModifiers.filter((modifier) =>
      ['phantoms-veil-physical', 'phantoms-veil-tactical', 'phantoms-veil-fire'].includes(modifier.sourceEffectId ?? ''),
    );
    expect(phantomParent).toMatchObject({
      role: 'self-amplification',
      channel: 'damage-received',
      damageScope: null,
      conditional: false,
    });
    expect(phantomOptions.map((modifier) => modifier.damageScope).sort()).toEqual(['fire', 'physical', 'tactical']);
    expect(phantomOptions.every((modifier) => modifier.conditional)).toBe(true);
    expect(phantomOptions.every((modifier) =>
      modifier.conditions.some((condition) => /exclusive one-of selection/i.test(condition.description)),
    )).toBe(true);
    expect(phantomModifiers.some((modifier) => modifier.damageScope === 'all')).toBe(false);

    expect(sirenBranch.effectOptions).toMatchObject({
      mode: 'conditional-branch',
      selectorMethod: 'condition-per-target',
    });
    expect(sirenBranch.effectOptions?.options.map((option) => option.effect.type).sort()).toEqual(['Stagger', 'Taunt']);
    const sirenStatuses = statusOutputs.filter((status) => status.abilityId === 'vaeldra-sirens-call');
    const sirenTaunt = sirenStatuses.find((status) => status.sourceEffectId === 'sirens-call-taunt');
    const sirenStagger = sirenStatuses.find((status) => status.sourceEffectId === 'sirens-call-stagger');
    expect(sirenTaunt).toMatchObject({ statusId: 'taunt' });
    expect(sirenStagger).toMatchObject({ statusId: 'stagger' });
    expect(sirenTaunt?.activationChanceByHabitLevel?.find((value) => value.level === 1)?.value).toBe(40);
    expect(sirenStagger?.activationChanceByHabitLevel?.find((value) => value.level === 1)?.value).toBe(40);
    expect(sirenTaunt?.conditions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'target-lacks-status', statusId: 'taunt' }),
    ]));
    expect(sirenStagger?.conditions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'target-has-status', statusId: 'taunt' }),
    ]));
  });

  it('derives outputs, periodic damage, status outputs, source scopes, and successful-Taunt trigger metadata', () => {
    const outputs = deriveOutputCapabilities(dragons);
    const modifiers = deriveModifierCapabilities(dragons);
    const statuses = deriveStatusOutputCapabilities(dragons);
    const periodic = derivePeriodicDamageDefinitions(dragons);

    expect(outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'daemoros', abilityId: 'daemoros-shadowflame', channel: 'physical-damage' }),
      expect.objectContaining({ dragonId: 'vaeldra', abilityId: 'vaeldra-lure', channel: 'physical-damage', targetCount: 2 }),
    ]));
    expect(periodic).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'daemoros', statusId: 'burn', channel: 'fire-damage' }),
      expect.objectContaining({ dragonId: 'daemoros', statusId: 'panic', channel: 'tactical-damage' }),
    ]));
    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({ dragonId: 'daemoros', statusId: 'confusion' }),
      expect.objectContaining({ dragonId: 'vaeldra', statusId: 'taunt', sourceEffectId: 'sirens-call-taunt' }),
      expect.objectContaining({ dragonId: 'vaeldra', statusId: 'stagger', sourceEffectId: 'sirens-call-stagger' }),
    ]));
    const temptingPhysical = modifiers.find((item) => item.id.includes('tempting-distraction-physical'));
    const temptingFire = modifiers.find((item) => item.id.includes('tempting-distraction-fire'));
    expect(temptingPhysical).toMatchObject({
      role: 'enemy-debuff',
      channel: 'physical-damage',
      sourceScope: 'non-basic-attacks',
      statusId: null,
    });
    expect(temptingPhysical?.conditions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'successful-status-application', subject: 'target', description: 'A Taunt was successfully applied to this target.' }),
    ]));
    expect(temptingFire).toMatchObject({
      role: 'enemy-debuff',
      channel: 'fire-damage',
      sourceScope: 'all-qualifying-sources',
    });
    expect(sourceScopesCompatible('non-basic-attacks', 'basic-attacks')).toBe(false);
    expect(sourceScopesCompatible('non-basic-attacks', 'commands')).toBe(true);
  });

  it('keeps enemy-side debuffs isolated from friendly recipients', () => {
    const traces = analyzeCapabilityAmplifications(epicFormation, dragons, {
      previewMaxRankInteractions: true,
      roster: roster(['daemoros', 'vaeldra', 'vermax']),
    });
    const enemySide = traces.filter((trace) =>
      ['daemoros-instill-fear', 'daemoros-darkening-fear', 'vaeldra-ensnare', 'vaeldra-tempting-distraction'].includes(trace.sourceAbilityId ?? '')
    );

    expect(enemySide.length).toBeGreaterThan(0);
    expect(enemySide.every((trace) =>
      trace.interactionScope === 'enemy-side' ||
      (
        trace.matchKind === 'enemy-mitigation-reduction' &&
        (trace.interactionScope === 'cross-dragon' || trace.interactionScope === 'internal')
      )
    )).toBe(true);
    expect(enemySide.every((trace) => trace.recipientDragonId === null || trace.matchKind === 'enemy-mitigation-reduction')).toBe(true);
  });

  it('renders Tempting Distraction enemy vulnerability details without assigning friendly recipients', () => {
    const currentRoster = createEmptyRoster(dragons);
    for (const dragonId of ['daemoros', 'vaeldra', 'vermax']) {
      const entry = currentRoster[dragonId];
      expect(entry).toBeDefined();
      entry!.owned = true;
      entry!.collection.state = 'hatched';
      entry!.starRank = dragonId === 'vaeldra' ? 6 : 1;
      entry!.reignLevel = 30;
    }
    const traces = analyzeFormationTraces(epicFormation, dragons, {
      roster: currentRoster,
      dragonLevels: { daemoros: 30, vaeldra: 30, vermax: 30 },
      previewMaxRankInteractions: false,
    });
    const temptingTraces = traces.filter((trace) => trace.sourceAbilityId === 'vaeldra-tempting-distraction');
    const physical = temptingTraces.find((trace) => trace.channel === 'physical-damage');
    const fire = temptingTraces.find((trace) => trace.channel === 'fire-damage');

    expect(temptingTraces).toHaveLength(2);
    expect(physical).toMatchObject({
      status: 'potential',
      recipientDragonId: null,
      interactionScope: 'enemy-side',
      modifierRole: 'enemy-debuff',
    });
    expect(fire).toMatchObject({
      status: 'potential',
      recipientDragonId: null,
      interactionScope: 'enemy-side',
      modifierRole: 'enemy-debuff',
    });
    expect(physical?.effects.join(' ')).toMatch(/Vaeldra must successfully apply Taunt/);
    expect(physical?.effects.join(' ')).toMatch(/same enemy target/);
    expect(physical?.effects.join(' ')).toMatch(/Physical Damage Received \+6%/);
    expect(physical?.effects.join(' ')).toMatch(/non-Basic Physical Damage only/);
    expect(physical?.effects.join(' ')).toMatch(/Duration: 2 rounds/);
    expect(physical?.effects.join(' ')).toMatch(/Stagger does not trigger this effect/);
    expect(physical?.effects.join(' ')).toMatch(/Enemy target overlap remains conditional and is not guaranteed/);
    expect(fire?.effects.join(' ')).toMatch(/Fire Damage Received \+6%/);
    expect(fire?.effects.join(' ')).toMatch(/all qualifying Fire Damage sources/);
    expect(physical?.sourceScopeResults?.length).toBeGreaterThan(0);
    expect(physical?.sourceScopeResults?.every((match) => match.sourceScopeCompatible)).toBe(true);
    expect(fire?.sourceScopeResults?.length).toBeGreaterThan(0);
    expect(fire?.sourceScopeResults?.every((match) => match.sourceScopeCompatible)).toBe(true);

    const presentation = buildFormationCardPresentation(epicFormation, dragons, traces.filter(isNormalSynergyTrace), { previewEnabled: false });
    const vaeldra = presentation.cards.find((card) => card.dragonId === 'vaeldra')!;
    const temptingCards = vaeldra.provides.filter((item) => item.abilityName === 'Tempting Distraction');

    expect(temptingCards).toHaveLength(2);
    expect(temptingCards.every((item) => item.isEnemyFacing)).toBe(true);
    expect(temptingCards.every((item) => item.recipientDragonId === null)).toBe(true);
    expect(presentation.cards.some((card) => card.receives.some((item) => item.abilityName === 'Tempting Distraction'))).toBe(false);
    const physicalCardText = temptingCards
      .filter((item) => item.effectTitle.includes('Physical'))
      .flatMap((item) => [item.summary, ...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');
    const fireCardText = temptingCards
      .filter((item) => item.effectTitle.includes('Fire'))
      .flatMap((item) => [item.summary, ...item.summaryLines, ...item.details, ...item.effects])
      .join(' ');
    expect(physicalCardText).toMatch(/non-Basic Physical Damage only/);
    expect(fireCardText).toMatch(/all qualifying Fire Damage sources/);
  });

  it('surfaces Panic periodic Tactical Damage for Instill Fear and Darkening Fear without replacing Infectious Wrath setup', () => {
    const formation: FormationAnalysisInput = {
      'left-flank': 'daemoros',
      vanguard: 'seasmoke',
      'right-flank': 'vermax',
    };
    const currentRoster = roster(['daemoros', 'seasmoke', 'vermax'], 30, 10);
    const traces = analyzeFormationTraces(formation, dragons, {
      roster: currentRoster,
      dragonLevels: { daemoros: 30, seasmoke: 30, vermax: 30 },
      previewMaxRankInteractions: false,
    });
    const panicDamage = traces.filter((trace) =>
      trace.matchKind === 'periodic-status-damage' &&
      trace.sourceDragonId === 'daemoros' &&
      trace.title.includes('Panic periodic Tactical Damage')
    );
    const instill = panicDamage.find((trace) => trace.sourceAbilityId === 'daemoros-instill-fear');
    const darkening = panicDamage.find((trace) => trace.sourceAbilityId === 'daemoros-darkening-fear');

    expect(panicDamage).toHaveLength(2);
    expect(instill?.effects.join(' ')).toMatch(/Panic deals periodic Tactical Damage each round/);
    expect(instill?.effects.join(' ')).toMatch(/Damage Rate 20%/);
    expect(instill?.effects.join(' ')).toMatch(/Duration: 2 rounds/);
    expect(instill?.effects.join(' ')).toMatch(/Scales with Instinct/);
    expect(instill?.effects.join(' ')).toMatch(/Mitigated by target Intelligence/);
    expect(instill?.effects.join(' ')).toMatch(/Activation, target selection, target overlap, and uptime remain conditional/);
    expect(instill?.effects.join(' ')).toMatch(/Final damage is not calculated/);
    expect(instill?.recipientDragonId).toBeNull();
    expect(darkening?.effects.join(' ')).toMatch(/Panic deals periodic Tactical Damage each round/);
    expect(darkening?.matchedFacts.join(' ')).toMatch(/Darkening Fear has its own activation roll and target selection/);

    expect(traces.some((trace) =>
      trace.matchKind === 'status-condition-enablement' &&
      trace.sourceAbilityId === 'daemoros-instill-fear' &&
      trace.recipientAbilityId === 'seasmoke-infectious-wrath'
    )).toBe(true);
    expect(traces.some((trace) =>
      trace.matchKind === 'status-condition-enablement' &&
      trace.sourceAbilityId === 'daemoros-darkening-fear' &&
      trace.recipientAbilityId === 'seasmoke-infectious-wrath'
    )).toBe(true);

    const presentation = buildFormationCardPresentation(formation, dragons, traces.filter(isNormalSynergyTrace), { previewEnabled: false });
    const daemoros = presentation.cards.find((card) => card.dragonId === 'daemoros')!;
    const panicCards = daemoros.provides.filter((item) =>
      item.effectTitle.includes('Panic periodic damage') &&
      ['Instill Fear', 'Darkening Fear'].includes(item.abilityName)
    );

    expect(panicCards).toHaveLength(2);
    expect(panicCards.every((item) => item.isEnemyFacing)).toBe(true);
    expect(panicCards.every((item) => item.recipientDragonId === null)).toBe(true);
    expect(presentation.cards.some((card) => card.receives.some((item) => item.effectTitle.includes('periodic damage')))).toBe(false);
  });

  it('surfaces Burn periodic Fire Damage through the shared status-damage path', () => {
    const formation: FormationAnalysisInput = {
      'left-flank': 'daemoros',
      vanguard: 'vaeldra',
      'right-flank': 'vermax',
    };
    const traces = analyzeFormationTraces(formation, dragons, {
      roster: roster(['daemoros', 'vaeldra', 'vermax'], 30, 10),
      dragonLevels: { daemoros: 30, vaeldra: 30, vermax: 30 },
      previewMaxRankInteractions: false,
    });
    const burn = traces.find((trace) =>
      trace.matchKind === 'periodic-status-damage' &&
      trace.sourceAbilityId === 'daemoros-shadowflame' &&
      trace.title.includes('Burn periodic Fire Damage')
    );

    expect(burn).toBeDefined();
    expect(burn?.effects.join(' ')).toMatch(/Burn deals periodic Fire Damage each round/);
    expect(burn?.effects.join(' ')).toMatch(/Damage Rate 20%/);
    expect(burn?.effects.join(' ')).toMatch(/Duration: 2 rounds/);
    expect(burn?.effects.join(' ')).toMatch(/Scales with Intelligence/);
    expect(burn?.effects.join(' ')).toMatch(/Mitigated by target Initiative/);
    expect(burn?.recipientDragonId).toBeNull();
  });

  it('does not derive periodic damage traces for non-damaging Control statuses', () => {
    const traces = analyzeFormationTraces(epicFormation, dragons, {
      roster: roster(['daemoros', 'vaeldra', 'vermax'], 30, 10),
      dragonLevels: { daemoros: 30, vaeldra: 30, vermax: 30 },
      previewMaxRankInteractions: true,
    });
    expect(traces.some((trace) =>
      trace.matchKind === 'periodic-status-damage' &&
      /Confusion|Stagger/i.test(`${trace.title} ${trace.effects.join(' ')}`)
    )).toBe(false);
  });

  it('keeps incompatible source scopes non-passing', () => {
    expect(sourceScopesCompatible('non-basic-attacks', 'commands')).toBe(true);
    expect(sourceScopesCompatible('non-basic-attacks', 'basic-attacks')).toBe(false);
    expect(sourceScopesCompatible('unknown', 'commands')).toBe(false);
  });

  it('gates Warrior traits and renders normal cards without self-only teammate support', () => {
    const currentRoster = roster(['daemoros', 'vaeldra', 'vermax', 'kalspire'], 30, 1);
    const tacticalRecipientFormation: FormationAnalysisInput = {
      'left-flank': 'kalspire',
      vanguard: 'vaeldra',
      'right-flank': 'daemoros',
    };
    const traces = analyzeFormationTraces(tacticalRecipientFormation, dragons, {
      roster: currentRoster,
      dragonLevels: { daemoros: 30, vaeldra: 30, kalspire: 30 },
      previewMaxRankInteractions: true,
    });
    const normal = traces.filter(isNormalSynergyTrace);
    const presentation = buildFormationCardPresentation(tacticalRecipientFormation, dragons, normal, { previewEnabled: true });
    const vaeldra = presentation.cards.find((card) => card.dragonId === 'vaeldra')!;
    const kalspire = presentation.cards.find((card) => card.dragonId === 'kalspire')!;

    expect(traces).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceAbilityId: 'vaeldra-warriors-resilience',
        recipientDragonId: 'kalspire',
        status: 'active',
      }),
    ]));
    expect(vaeldra.traitStatus).toMatchObject({ abilityName: "Warrior's Resilience" });
    expect(vaeldra.provides.some((item) => item.abilityName === "Warrior's Resilience")).toBe(true);
    expect(kalspire.receives.some((item) => item.abilityName === "Warrior's Resilience")).toBe(true);

    const outsideFormation: FormationAnalysisInput = { 'left-flank': 'vaeldra', vanguard: 'vermax', 'right-flank': 'daemoros' };
    const daemorosOutsideVanguard = analyzeFormationTraces(
      outsideFormation,
      dragons,
      { roster: currentRoster, dragonLevels: { daemoros: 30, vaeldra: 30, vermax: 30 } },
    );
    const outsidePresentation = buildFormationCardPresentation(outsideFormation, dragons, daemorosOutsideVanguard, { previewEnabled: false });
    expect(outsidePresentation.cards.find((card) => card.dragonId === 'daemoros')?.traitStatus).toMatchObject({
      abilityName: "Warrior's Zeal",
      state: 'blocked',
    });
  });

  it('keeps new status glossary entries precise', () => {
    expect(statusGlossary.find((entry) => entry.id === 'confusion')?.definition).toContain('50% chance');
    expect(statusGlossary.find((entry) => entry.id === 'stagger')?.definition).toContain('Attack Modifier Commands');
    expect(statusGlossary.find((entry) => entry.id === 'stagger')?.definition).not.toContain('prevents all Commands');
  });
});
