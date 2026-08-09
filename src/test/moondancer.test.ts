import { describe, expect, it } from 'vitest';

import { conditionalUpliftSummary, conditionalUpliftsForRelationship } from '../app/relationshipReliabilityPresentation';
import { dragons } from '../data/dragons';
import { buildOptimizerRosterSnapshot, generateOptimizerFormationCandidates } from '../optimizer/rosterOptimizerCandidates';
import { buildTargetingResolutionFindings } from '../services/formationFindings';
import { createEmptyRoster, loadRoster, saveRoster } from '../services/rosterStorage';
import { evaluateFormation, evaluateFormationCandidates } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  evaluateBindingReliability,
  evaluateFormationRelationshipsV3,
  formationReliabilityBindings,
  formationReliabilityComponents,
  type ReliabilityProgression,
} from '../synergy/reliability';
import type { SimpleFormation, SimpleProgressionByDragonId } from '../synergy/types';

const components = new Map(formationReliabilityComponents.map((component) => [component.id, component]));
const bindings = new Map(formationReliabilityBindings.map((binding) => [binding.signalId, binding]));
const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));
const moondancer = dragonsById.get('moondancer')!;
const maxProgression: SimpleProgressionByDragonId = Object.fromEntries(
  dragons.map((dragon) => [dragon.id, { starRank: 10, dragonLevel: 16 }]),
);

function formation(left: string, vanguard: string, right: string): SimpleFormation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function profiles(ids: string[]) {
  return simpleSynergyProfiles.filter((profile) => ids.includes(profile.dragonId));
}

function reliabilityProgression(
  ids: string[],
  level: 1 | 2 | 3 | 4 | 5 = 1,
): Record<string, ReliabilityProgression> {
  return Object.fromEntries(ids.map((dragonId) => {
    const dragon = dragonsById.get(dragonId)!;
    return [dragonId, {
      starRank: 10,
      dragonLevel: 16,
      activeHabitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, level])),
    }];
  }));
}

describe('Moondancer screenshot-verified production data', () => {
  it('registers the Legendary Warrior identity, pending-official source state, and five affinities', () => {
    expect(moondancer).toMatchObject({ id: 'moondancer', slug: 'moondancer', name: 'Moondancer', rarity: 'Legendary', breed: 'Warrior', rosterSourceStatus: 'in-game-verified-pending-official-site' });
    expect(moondancer.affinities).toEqual({ Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'positive', Spearmen: 'neutral', Siege: 'negative' });
    expect(moondancer.stats).toEqual({ strength: null, intelligence: null, instinct: null, initiative: null });
    expect([moondancer.command, moondancer.trait, ...moondancer.habits].flatMap((ability) => ability.evidenceIds)).toEqual(expect.arrayContaining([
      'moondancer-crescent-blade-1-2026-08-09', 'moondancer-crescent-blade-2-2026-08-09', 'moondancer-crescent-blade-3-2026-08-09', 'moondancer-crescent-blade-4-2026-08-09', 'moondancer-warriors-zeal-2026-08-09', 'moondancer-new-moon-2026-08-09', 'moondancer-reactive-instincts-2026-08-09', 'moondancer-full-moon-2026-08-09', 'moondancer-blood-moon-2026-08-09', 'moondancer-eclipsing-strike-2026-08-09',
    ]));
  });

  it('preserves Command, Trait, and all five Habit source wording distinctions', () => {
    expect(moondancer.command?.rawDescription).toContain('1 other Ally Sentinel in any lane');
    expect(moondancer.command?.rawDescription).toContain('cannot trigger more than once per round');
    expect(moondancer.command?.rawDescription).toContain('Damage Rate: 75%');
    expect(moondancer.trait).toMatchObject({ unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard' });
    expect(moondancer.habits.map((habit) => habit.id)).toEqual(['moondancer-new-moon', 'moondancer-reactive-instincts', 'moondancer-full-moon', 'moondancer-blood-moon', 'moondancer-eclipsing-strike']);
    expect(moondancer.habits[2]!.rawDescription).toContain('least troops of all combatants');
    expect(moondancer.habits[3]!.rawDescription).toContain('within adjacency');
    expect(moondancer.habits[4]!.rawDescription).toContain('Enemy with the Most Troops');
  });
});

describe('Moondancer friendly recipient selection', () => {
  it('resolves one other Sentinel for Crescent Blade and never selects Moondancer', () => {
    const current = formation('moondancer', 'vesper', 'caraxes');
    const result = evaluateFormation({ formation: current, progression: maxProgression, profiles: profiles(['moondancer', 'vesper', 'caraxes']) });
    const resolution = result.targetingResolutions.find(({ selectionGroupId }) => selectionGroupId === 'moondancer-crescent-blade-sentinel-recipient')!;
    expect(resolution).toMatchObject({ status: 'resolved', selectedRecipientId: 'vesper', priorityRecipientIds: ['vesper'], recipientCount: 1 });
    expect(resolution.eligibleRecipientIds).not.toContain('moondancer');
    const triggers = evaluateFormationCandidates({ formation: current, progression: maxProgression, profiles: profiles(['moondancer', 'vesper', 'caraxes']) }).candidates.filter(({ beneficiarySignalId }) => beneficiarySignalId === 'moondancer-crescent-blade-trigger-payoff');
    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toMatchObject({ providerDragonId: 'vesper', semanticTag: 'trigger:tactical-or-recovery' });
  });

  it('keeps two Sentinels unresolved, preserves both candidates, and awards neither duplicate relationship', () => {
    const current = formation('moondancer', 'vesper', 'dawnseeker');
    const selectedProfiles = profiles(['moondancer', 'vesper', 'dawnseeker']);
    const result = evaluateFormationCandidates({ formation: current, progression: maxProgression, profiles: selectedProfiles });
    const resolution = result.targetingResolutions.find(({ selectionGroupId }) => selectionGroupId === 'moondancer-crescent-blade-sentinel-recipient')!;
    expect(resolution).toMatchObject({ status: 'unresolved', unresolvedReason: 'multiple-eligible-breed-candidates', priorityRecipientIds: ['dawnseeker', 'vesper'] });
    expect(result.candidates.filter(({ beneficiarySignalId }) => beneficiarySignalId === 'moondancer-crescent-blade-trigger-payoff')).toHaveLength(0);
    expect(buildTargetingResolutionFindings([resolution], selectedProfiles)[0]!.summary).toContain('no tie rule is verified');
  });

  it('reports no valid recipient when no other Sentinel exists', () => {
    const current = formation('moondancer', 'caraxes', 'vhagar');
    const result = evaluateFormation({ formation: current, progression: maxProgression, profiles: profiles(['moondancer', 'caraxes', 'vhagar']) });
    const resolution = result.targetingResolutions.find(({ selectionGroupId }) => selectionGroupId === 'moondancer-crescent-blade-sentinel-recipient')!;
    expect(resolution).toMatchObject({ status: 'unresolved', unresolvedReason: 'no-eligible-breed-candidates', priorityRecipientIds: [] });
    expect(buildTargetingResolutionFindings([resolution], profiles(['moondancer', 'caraxes', 'vhagar']))[0]!.summary).toContain('no valid eligible breed recipient');
  });

  it('accepts Tactical Damage or Recovery but not unrelated output, with one shared Crescent recipient', () => {
    const canonical = simpleSynergyProfiles.find((profile) => profile.dragonId === 'vesper')!;
    const current = formation('moondancer', 'vesper', 'caraxes');
    const evaluateWith = (outputs: typeof canonical.outputs) => evaluateFormationCandidates({ formation: current, progression: maxProgression, profiles: [simpleSynergyProfiles.find((profile) => profile.dragonId === 'moondancer')!, { ...canonical, outputs }, simpleSynergyProfiles.find((profile) => profile.dragonId === 'caraxes')!] }).candidates.filter(({ beneficiarySignalId }) => beneficiarySignalId === 'moondancer-crescent-blade-trigger-payoff');
    expect(evaluateWith(canonical.outputs.filter((output) => output.tag === 'damage:tactical'))).toHaveLength(1);
    expect(evaluateWith([{ ...canonical.outputs[0]!, id: 'vesper-test-recovery', tag: 'effect:recovery' }])).toHaveLength(1);
    expect(evaluateWith([{ ...canonical.outputs[0]!, id: 'vesper-test-fire', tag: 'damage:fire' }])).toHaveLength(0);
  });

  it('keeps Crescent Blade and New Moon as independent target-selection groups', () => {
    const result = evaluateFormation({ formation: formation('moondancer', 'vesper', 'caraxes'), progression: maxProgression, profiles: profiles(['moondancer', 'vesper', 'caraxes']) });
    expect(result.targetingResolutions.map(({ selectionGroupId }) => selectionGroupId)).toEqual(expect.arrayContaining(['moondancer-crescent-blade-sentinel-recipient', 'moondancer-new-moon-sentinel-recipient']));
  });

  it('resolves Reactive Instincts only for a unique highest Instinct and preserves a tie', () => {
    const current = formation('moondancer', 'vesper', 'caraxes');
    const selectedProfiles = profiles(['moondancer', 'vesper', 'caraxes']);
    const unique = evaluateFormation({ formation: current, profiles: selectedProfiles, progression: { moondancer: { starRank: 10, dragonLevel: 16, combatStats: { instinct: 100 } }, vesper: { starRank: 10, dragonLevel: 16, combatStats: { instinct: 200 } }, caraxes: { starRank: 10, dragonLevel: 16, combatStats: { instinct: 150 } } } });
    expect(unique.targetingResolutions.find(({ selectionGroupId }) => selectionGroupId === 'moondancer-reactive-instincts-highest-instinct')).toMatchObject({ status: 'resolved', selectedRecipientId: 'vesper' });
    const tied = evaluateFormation({ formation: current, profiles: selectedProfiles, progression: { moondancer: { starRank: 10, dragonLevel: 16, combatStats: { instinct: 200 } }, vesper: { starRank: 10, dragonLevel: 16, combatStats: { instinct: 200 } }, caraxes: { starRank: 10, dragonLevel: 16, combatStats: { instinct: 150 } } } });
    expect(tied.targetingResolutions.find(({ selectionGroupId }) => selectionGroupId === 'moondancer-reactive-instincts-highest-instinct')).toMatchObject({ status: 'unresolved', unresolvedReason: 'highest-stat-tie', priorityRecipientIds: ['moondancer', 'vesper'] });
  });
});

describe('Moondancer reliability and magnitude evidence', () => {
  it('keeps Crescent Blade trigger at 50%, once per round, max 8, and -2% per stack', () => {
    expect(components.get('moondancer-crescent-blade:rising-tide-trigger')).toMatchObject({ reliabilityClass: 'chance', probability: { kind: 'fixed', value: 0.5 }, opportunityPresence: 'conditional', stackFacts: { maximum: 8, perStackDelta: -0.02, thresholds: [4, 6], triggerLimitPerRound: 1 } });
  });

  it.each([
    ['moondancer-new-moon:rising-tide', 'moondancer-new-moon'],
    ['moondancer-full-moon:rising-tide', 'moondancer-full-moon'],
  ] as const)('doubles all five Advantage branches for %s without guaranteeing a stack', (componentId, habitId) => {
    const component = components.get(componentId)!;
    expect(component.reliabilityClass).toBe('chance');
    expect(component.probability).toMatchObject({ kind: 'variants', variants: [{ id: 'ordinary', probability: { kind: 'habit-level', habitAbilityId: habitId, byLevel: { '1': 0.25, '2': 0.3, '3': 0.35, '4': 0.425, '5': 0.5 } } }, { id: 'advantage', probability: { kind: 'habit-level', habitAbilityId: habitId, byLevel: { '1': 0.5, '2': 0.6, '3': 0.7, '4': 0.85, '5': 1 } } }] });
  });

  it('exposes progression-aware Advantage uplift while keeping generic base value unchanged', () => {
    const current = formation('moondancer', 'shadowrend', 'caraxes');
    const selectedProfiles = profiles(['moondancer', 'shadowrend', 'caraxes']);
    const relationship = evaluateFormationRelationshipsV3({ input: { formation: current, progression: maxProgression, reliabilityProgression: reliabilityProgression(['moondancer', 'shadowrend', 'caraxes']) }, profiles: selectedProfiles }).find(({ providerDragonId, beneficiaryDragonId, semanticTag }) => providerDragonId === 'shadowrend' && beneficiaryDragonId === 'moondancer' && semanticTag === 'status:advantage')!;
    expect(relationship.baseValue).toBe(10);
    expect(conditionalUpliftsForRelationship(relationship)).toHaveLength(2);
    expect(conditionalUpliftsForRelationship(relationship)[0]).toMatchObject({ relativeMultiplier: 2, modifier: { kind: 'multiplier', value: 2 }, baseline: { kind: 'habit-level' }, conditioned: { kind: 'habit-level' } });
    expect(conditionalUpliftSummary(relationship, dragonsById)).toContain('Habit Levels 1–5 25%/30%/35%/42.5%/50%');
    expect(conditionalUpliftSummary(relationship, dragonsById)).toContain('resulting activation remains probabilistic');
  });

  it('stores Full Moon replacement/doubling, New Moon 1.5x support, and conditional least-troops facts without uptime', () => {
    expect(components.get('moondancer-crescent-blade:physical-damage')?.conditionalMagnitudeUplifts?.[0]).toMatchObject({ baseline: 0.75, conditioned: { byLevel: { '1': 0.85, '5': 1.2 } } });
    expect(components.get('moondancer-full-moon:four-stack-damage-rate')?.conditionalMagnitudeUplifts?.[0]).toMatchObject({ modifier: { kind: 'multiplier', value: 2 }, conditioned: { byLevel: { '1': 1.7, '5': 2.4 } } });
    expect(components.get('moondancer-new-moon:sentinel-support')?.conditionalMagnitudeUplifts).toHaveLength(2);
    expect(components.get('moondancer-full-moon:least-troops-stack')).toMatchObject({ reliabilityClass: 'conditional-deterministic', researchOnly: true, targetSelectorEvidence: { order: 'lowest', stat: 'troops', tieHandling: 'unresolved' } });
  });

  it('keeps Blood Moon Bleed multi-target roll scope unresolved and doubles all levels at 6+ stacks', () => {
    expect(components.get('moondancer-blood-moon:bleed')).toMatchObject({ reliabilityClass: 'chance', rollScope: 'unresolved', targetFacts: { count: 2 }, durationRounds: 2 });
    expect(components.get('moondancer-blood-moon:six-stack-bleed-uplift')?.conditionalUplift).toMatchObject({ relativeMultiplier: 2, conditioned: { byLevel: { '1': 0.5, '5': 1 } } });
    expect(components.get('moondancer-blood-moon:four-stack-physical-buff')).toMatchObject({ reliabilityClass: 'conditional-deterministic', researchOnly: true });
  });

  it('uses one Eclipsing Strike activation for fixed -18%/-25% effects and unresolved highest-troop ties', () => {
    const component = components.get('moondancer-eclipsing-strike:shared-activation')!;
    expect(component).toMatchObject({ reliabilityClass: 'chance', rollScope: 'shared', targetFacts: { count: 1, separatePerEffect: false }, durationRounds: 2, targetSelectorEvidence: { population: 'enemy', stat: 'troops', order: 'highest', tieHandling: 'unresolved' } });
    expect(component.evidence.reviewNote).toContain('Damage Dealt -18%');
    expect(component.evidence.reviewNote).toContain('Initiative -25%');
    expect(components.get('moondancer-eclipsing-strike:six-stack-uplift')?.conditionalUplift).toMatchObject({ baseline: { byLevel: { '1': 0.2, '5': 0.5 } }, conditioned: { byLevel: { '1': 0.4, '5': 1 } } });
  });

  it('keeps Vhagar fixed uplift byte-for-byte compatible', () => {
    expect(components.get('vhagar-fiery-bonds:burn-taunt-probability-uplift')?.conditionalUplift).toEqual({ kind: 'probability-uplift', conditionLabel: 'Burn', affectedMetricLabel: "Fiery Bonds' Taunt chance", affectedComponentId: 'vhagar-fiery-bonds:taunt', baselineVariantId: 'ordinary-target', conditionedVariantId: 'burn-afflicted-target', baseline: 0.25, conditioned: 0.5, absoluteDelta: 0.25, relativeMultiplier: 2 });
  });

  it('does not activate locked Habit signals early and resolves max-level variants exactly', () => {
    const newMoon = bindings.get('moondancer-advantage-rising-tide-payoff')!;
    expect(evaluateBindingReliability({ binding: newMoon, componentsById: components, progression: { starRank: 1, dragonLevel: 16, activeHabitLevels: {} } }).quantification.status).toBe('unquantified');
    const bleed = bindings.get('moondancer-blood-moon-bleed')!;
    expect(evaluateBindingReliability({ binding: bleed, componentsById: components, progression: { starRank: 10, dragonLevel: 16, activeHabitLevels: { 'moondancer-blood-moon': 5 } }, probabilityContextId: 'six-plus-stacks' }).quantification).toMatchObject({ status: 'quantified', reliability: 1 });
  });
});

describe('Moondancer roster and optimizer compatibility', () => {
  it('loads a legacy 33-dragon roster with Moondancer newly present and unowned', () => {
    const legacyDragons = dragons.filter((dragon) => dragon.id !== 'moondancer');
    const legacy = createEmptyRoster(legacyDragons);
    legacy.syrax!.owned = true;
    saveRoster(window.localStorage, legacy);
    const loaded = loadRoster(window.localStorage, dragons);
    expect(loaded.syrax!.owned).toBe(true);
    expect(loaded.moondancer).toMatchObject({ owned: false, starRank: null, habitLevels: {} });
    expect(Object.keys(loaded)).toHaveLength(34);
  });

  it('includes Moondancer in optimizer candidates only when owned and eligible', () => {
    const roster = createEmptyRoster(dragons);
    for (const id of ['moondancer', 'vesper', 'caraxes']) {
      roster[id] = { ...roster[id]!, owned: true, starRank: 10, reignLevel: 0, habitLevels: Object.fromEntries(dragonsById.get(id)!.habits.map((habit) => [habit.id, 5])) };
    }
    let snapshot = buildOptimizerRosterSnapshot(dragons, roster);
    expect(generateOptimizerFormationCandidates({ dragons, profiles: simpleSynergyProfiles, snapshot })[0]!.dragonIds).toContain('moondancer');
    roster.moondancer!.owned = false;
    snapshot = buildOptimizerRosterSnapshot(dragons, roster);
    expect(snapshot.some(({ dragonId }) => dragonId === 'moondancer')).toBe(false);
  });
});
