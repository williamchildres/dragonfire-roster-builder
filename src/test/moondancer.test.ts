import { describe, expect, it } from 'vitest';

import { conditionalUpliftSummary, conditionalUpliftsForRelationship } from '../app/relationshipReliabilityPresentation';
import catalogDelta from '../audit/fixtures/formationRatingV3CatalogDeltas.0.23.4-to-0.23.5.json';
import correctionDelta from '../audit/fixtures/formationRatingV3MoondancerCorrectionDeltas.0.23.5.json';
import { dragons } from '../data/dragons';
import { buildOptimizerRosterSnapshot, generateOptimizerFormationCandidates } from '../optimizer/rosterOptimizerCandidates';
import { buildTargetingResolutionFindings } from '../services/formationFindings';
import { createEmptyRoster, loadRoster, saveRoster } from '../services/rosterStorage';
import { evaluateFormation, evaluateFormationCandidates } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { signalTargetsRecipient } from '../synergy/recipientSelectors';
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
  starRanks: Readonly<Record<string, number>> = {},
): Record<string, ReliabilityProgression> {
  return Object.fromEntries(ids.map((dragonId) => {
    const dragon = dragonsById.get(dragonId)!;
    const starRank = starRanks[dragonId] ?? 10;
    return [dragonId, {
      starRank,
      dragonLevel: 16,
      activeHabitLevels: Object.fromEntries(
        dragon.habits
          .filter((habit) => habit.unlockStarRank == null || habit.unlockStarRank <= starRank)
          .map((habit) => [habit.id, level]),
      ),
    }];
  }));
}

function simpleProgression(
  ids: string[],
  starRanks: Readonly<Record<string, number>> = {},
): SimpleProgressionByDragonId {
  return Object.fromEntries(ids.map((dragonId) => [
    dragonId,
    { starRank: starRanks[dragonId] ?? 10, dragonLevel: 16 },
  ]));
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
  it('caps successful Crescent Blade triggers without inventing a once-per-round attempt cap', () => {
    const component = components.get('moondancer-crescent-blade:rising-tide-trigger')!;
    expect(component).toMatchObject({
      reliabilityClass: 'chance',
      probability: { kind: 'fixed', value: 0.5 },
      opportunityPresence: 'conditional',
      opportunityCount: { kind: 'unresolved' },
      stackFacts: {
        maximum: 8,
        perStackDelta: -0.02,
        thresholds: [4, 6],
        successfulTriggerLimitPerRound: 1,
      },
    });
    expect(component.opportunityCount).not.toMatchObject({ kind: 'exact', value: 1 });
    expect(component.evidence.unresolvedQuestions.join(' ')).toContain('failed qualifying event');
  });

  it.each([
    ['moondancer-new-moon:rising-tide', 'moondancer-new-moon'],
    ['moondancer-full-moon:rising-tide', 'moondancer-full-moon'],
  ] as const)('doubles all five Advantage branches for %s without guaranteeing a stack', (componentId, habitId) => {
    const component = components.get(componentId)!;
    expect(component.reliabilityClass).toBe('chance');
    expect(component.probability).toMatchObject({ kind: 'variants', variants: [{ id: 'ordinary', probability: { kind: 'habit-level', habitAbilityId: habitId, byLevel: { '1': 0.25, '2': 0.3, '3': 0.35, '4': 0.425, '5': 0.5 } } }, { id: 'advantage', probability: { kind: 'habit-level', habitAbilityId: habitId, byLevel: { '1': 0.5, '2': 0.6, '3': 0.7, '4': 0.85, '5': 1 } } }] });
  });

  it('gates Full Moon Advantage evidence at 6 Stars while scoring one relationship', () => {
    const current = formation('moondancer', 'shadowrend', 'caraxes');
    const selectedProfiles = profiles(['moondancer', 'shadowrend', 'caraxes']);
    const relationshipAt = (starRank: number) => {
      const progression = simpleProgression(
        ['moondancer', 'shadowrend', 'caraxes'],
        { moondancer: starRank },
      );
      const relationship = evaluateFormationRelationshipsV3({
        input: {
          formation: current,
          progression,
          reliabilityProgression: reliabilityProgression(
            ['moondancer', 'shadowrend', 'caraxes'],
            1,
            { moondancer: starRank },
          ),
        },
        profiles: selectedProfiles,
      }).filter(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
        providerDragonId === 'shadowrend' &&
        beneficiaryDragonId === 'moondancer' &&
        semanticTag === 'status:advantage',
      );
      return { progression, relationship };
    };

    for (const starRank of [2, 4, 5]) {
      const { progression, relationship } = relationshipAt(starRank);
      expect(relationship).toHaveLength(1);
      expect(relationship[0]!.baseValue).toBe(10);
      expect(conditionalUpliftsForRelationship(relationship[0]!, progression)).toHaveLength(1);
      const summary = conditionalUpliftSummary(relationship[0]!, dragonsById, progression)!;
      expect(summary).toContain("New Moon's Rising Tide chance");
      expect(summary).not.toContain("Full Moon's Rising Tide chance");
    }

    const atSix = relationshipAt(6);
    expect(atSix.relationship).toHaveLength(1);
    expect(conditionalUpliftsForRelationship(atSix.relationship[0]!, atSix.progression)).toHaveLength(2);
    const summaryAtSix = conditionalUpliftSummary(
      atSix.relationship[0]!,
      dragonsById,
      atSix.progression,
    )!;
    expect(summaryAtSix).toContain("New Moon's Rising Tide chance");
    expect(summaryAtSix).toContain("Full Moon's Rising Tide chance");
    expect(summaryAtSix).toContain('resulting activation remains probabilistic');
  });

  it('keeps Full Moon uplift values and provenance on the Full Moon component', () => {
    const newMoonUplift = components.get('moondancer-new-moon:advantage-uplift')!;
    const fullMoonUplift = components.get('moondancer-full-moon:advantage-uplift')!;
    expect(newMoonUplift.conditionalUplifts).toBeUndefined();
    expect(newMoonUplift.additionalConditionalUpliftComponentIds).toEqual([
      'moondancer-full-moon:advantage-uplift',
    ]);
    expect(newMoonUplift.evidence.evidenceIds).toEqual(['moondancer-new-moon-2026-08-09']);
    expect(fullMoonUplift.evidence.evidenceIds).toEqual(['moondancer-full-moon-2026-08-09']);
    expect(fullMoonUplift.conditionalUplift).toMatchObject({
      affectedMetricLabel: "Full Moon's Rising Tide chance",
      baseline: { habitAbilityId: 'moondancer-full-moon' },
      conditioned: { habitAbilityId: 'moondancer-full-moon' },
    });
  });

  it('requires another Sentinel for the 2-Star New Moon Initiative payoff', () => {
    const current = formation('vhagar', 'caraxes', 'moondancer');
    const selectedProfiles = profiles(['moondancer', 'vhagar', 'caraxes']);
    const progression = simpleProgression(
      ['moondancer', 'vhagar', 'caraxes'],
      { moondancer: 2 },
    );
    const evaluated = evaluateFormationCandidates({
      formation: current,
      progression,
      profiles: selectedProfiles,
    });
    const caraxes = selectedProfiles.find(({ dragonId }) => dragonId === 'caraxes')!;
    const initiativeSupport = caraxes.supports.find(
      ({ id }) => id === 'caraxes-hunters-wrath-right-stats',
    )!;
    expect(signalTargetsRecipient({
      provider: { dragonId: 'caraxes', position: 'vanguard' },
      signal: initiativeSupport,
      recipient: { dragonId: 'moondancer', position: 'right-flank' },
      selected: [
        { dragonId: 'vhagar', position: 'left-flank' },
        { dragonId: 'caraxes', position: 'vanguard' },
        { dragonId: 'moondancer', position: 'right-flank' },
      ],
      progression,
    })).toBe(true);
    expect(evaluated.targetingResolutions.find(
      ({ selectionGroupId }) => selectionGroupId === 'moondancer-new-moon-sentinel-recipient',
    )).toMatchObject({
      status: 'unresolved',
      unresolvedReason: 'no-eligible-breed-candidates',
      priorityRecipientIds: [],
    });
    expect(evaluated.candidates.some(({ beneficiarySignalId }) =>
      beneficiarySignalId === 'moondancer-new-moon-initiative-payoff'
    )).toBe(false);
    expect(evaluateFormationRelationshipsV3({
      input: {
        formation: current,
        progression,
        reliabilityProgression: reliabilityProgression(
          ['moondancer', 'vhagar', 'caraxes'],
          1,
          { moondancer: 2 },
        ),
      },
      profiles: selectedProfiles,
    }).filter(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
      providerDragonId === 'caraxes' &&
      beneficiaryDragonId === 'moondancer' &&
      semanticTag === 'stat:initiative'
    )).toHaveLength(0);
  });

  it('activates New Moon Initiative with one Sentinel from 2 Stars', () => {
    const current = formation('vesper', 'caraxes', 'moondancer');
    const selectedProfiles = profiles(['moondancer', 'vesper', 'caraxes']);
    const relationship = evaluateFormationRelationshipsV3({
      input: {
        formation: current,
        progression: simpleProgression(
          ['moondancer', 'vesper', 'caraxes'],
          { moondancer: 2 },
        ),
        reliabilityProgression: reliabilityProgression(
          ['moondancer', 'vesper', 'caraxes'],
          1,
          { moondancer: 2 },
        ),
      },
      profiles: selectedProfiles,
    }).filter(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
      providerDragonId === 'caraxes' &&
      beneficiaryDragonId === 'moondancer' &&
      semanticTag === 'stat:initiative',
    )[0]!;
    expect(relationship.candidateTraces).toHaveLength(1);
    expect(relationship.candidateTraces[0]!.candidate.beneficiarySignalId).toBe(
      'moondancer-new-moon-initiative-payoff',
    );
    expect(relationship.quantification).toMatchObject({ status: 'quantified', reliability: 1 });
  });

  it('keeps New Moon Initiative active with two unresolved Sentinel recipients', () => {
    const current = formation('vesper', 'dawnseeker', 'moondancer');
    const selectedProfiles = profiles(['moondancer', 'vesper', 'dawnseeker']);
    const progression = simpleProgression(
      ['moondancer', 'vesper', 'dawnseeker'],
      { moondancer: 2 },
    );
    const evaluated = evaluateFormationCandidates({
      formation: current,
      progression,
      profiles: selectedProfiles,
    });
    expect(evaluated.targetingResolutions.find(
      ({ selectionGroupId }) => selectionGroupId === 'moondancer-new-moon-sentinel-recipient',
    )).toMatchObject({
      status: 'unresolved',
      unresolvedReason: 'multiple-eligible-breed-candidates',
      priorityRecipientIds: ['dawnseeker', 'vesper'],
    });
    const relationships = evaluateFormationRelationshipsV3({
      input: {
        formation: current,
        progression,
        reliabilityProgression: reliabilityProgression(
          ['moondancer', 'vesper', 'dawnseeker'],
          1,
          { moondancer: 2 },
        ),
      },
      profiles: selectedProfiles,
    }).filter(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
      providerDragonId === 'dawnseeker' &&
      beneficiaryDragonId === 'moondancer' &&
      semanticTag === 'stat:initiative'
    );
    expect(relationships).toHaveLength(1);
    expect(relationships[0]!.selectedBeneficiarySignalId).toBe(
      'moondancer-new-moon-initiative-payoff',
    );
    expect(relationships[0]!.quantification).toMatchObject({ status: 'quantified', reliability: 1 });
  });

  it('uses only Eclipsing Strike at 10 Stars when no Sentinel is present', () => {
    const current = formation('vhagar', 'caraxes', 'moondancer');
    const selectedProfiles = profiles(['moondancer', 'vhagar', 'caraxes']);
    const relationship = evaluateFormationRelationshipsV3({
      input: {
        formation: current,
        progression: simpleProgression(['moondancer', 'vhagar', 'caraxes']),
        reliabilityProgression: reliabilityProgression(
          ['moondancer', 'vhagar', 'caraxes'],
        ),
      },
      profiles: selectedProfiles,
    }).find(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
      providerDragonId === 'caraxes' &&
      beneficiaryDragonId === 'moondancer' &&
      semanticTag === 'stat:initiative'
    )!;
    expect(relationship.candidateTraces.map(
      (trace) => trace.candidate.beneficiarySignalId,
    )).toEqual(['moondancer-eclipsing-strike-initiative-payoff']);
    expect(relationship.selectedBeneficiarySignalId).toBe(
      'moondancer-eclipsing-strike-initiative-payoff',
    );
    expect(relationship.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'probability-context-unresolved',
      conditionalProbabilities: [0.2, 0.4],
    });
  });

  it('deduplicates New Moon and Eclipsing Strike at 10 Stars when a Sentinel is present', () => {
    const current = formation('vesper', 'caraxes', 'moondancer');
    const selectedProfiles = profiles(['moondancer', 'vesper', 'caraxes']);
    const relationship = evaluateFormationRelationshipsV3({
      input: {
        formation: current,
        progression: simpleProgression(['moondancer', 'vesper', 'caraxes']),
        reliabilityProgression: reliabilityProgression(['moondancer', 'vesper', 'caraxes']),
      },
      profiles: selectedProfiles,
    }).filter(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
      providerDragonId === 'caraxes' &&
      beneficiaryDragonId === 'moondancer' &&
      semanticTag === 'stat:initiative'
    );

    expect(relationship).toHaveLength(1);
    expect(relationship[0]!.candidateTraces.map((trace) => trace.candidate.beneficiarySignalId)).toEqual(
      expect.arrayContaining([
        'moondancer-new-moon-initiative-payoff',
        'moondancer-eclipsing-strike-initiative-payoff',
      ]),
    );
    expect(relationship[0]!.selectedBeneficiarySignalId).toBe(
      'moondancer-new-moon-initiative-payoff',
    );
    expect(relationship[0]!.quantification).toMatchObject({ status: 'quantified', reliability: 1 });
  });

  it('keeps one Strength relationship while acknowledging Reactive Instincts', () => {
    const profile = simpleSynergyProfiles.find(({ dragonId }) => dragonId === 'moondancer')!;
    const strengthSignal = profile.benefitsFrom.filter(({ tag }) => tag === 'stat:strength');
    expect(strengthSignal).toHaveLength(1);
    expect(strengthSignal[0]!.description).toContain('Reactive Instincts');

    const current = formation('vesper', 'caraxes', 'moondancer');
    const relationships = evaluateFormationRelationshipsV3({
      input: {
        formation: current,
        progression: simpleProgression(['moondancer', 'vesper', 'caraxes']),
        reliabilityProgression: reliabilityProgression(['moondancer', 'vesper', 'caraxes']),
      },
      profiles: profiles(['moondancer', 'vesper', 'caraxes']),
    }).filter(({ providerDragonId, beneficiaryDragonId, semanticTag }) =>
      providerDragonId === 'caraxes' &&
      beneficiaryDragonId === 'moondancer' &&
      semanticTag === 'stat:strength',
    );
    expect(relationships).toHaveLength(1);
  });

  it('stores Full Moon replacement/doubling, New Moon 1.5x support, and conditional least-troops facts without uptime', () => {
    expect(components.get('moondancer-crescent-blade:physical-damage')?.conditionalMagnitudeUplifts?.[0]).toMatchObject({ baseline: 0.75, conditioned: { byLevel: { '1': 0.85, '5': 1.2 } } });
    expect(components.get('moondancer-full-moon:four-stack-damage-rate')?.conditionalMagnitudeUplifts?.[0]).toMatchObject({ modifier: { kind: 'multiplier', value: 2 }, conditioned: { byLevel: { '1': 1.7, '5': 2.4 } } });
    expect(components.get('moondancer-new-moon:sentinel-support')?.conditionalMagnitudeUplifts).toHaveLength(2);
    expect(components.get('moondancer-full-moon:least-troops-stack')).toMatchObject({
      reliabilityClass: 'conditional-deterministic',
      researchOnly: true,
      battleStateComparisonEvidence: {
        subject: 'self',
        metric: 'troops',
        comparison: 'minimum',
        population: 'all-combatants',
        tieHandling: 'unresolved',
      },
    });
    expect(components.get('moondancer-full-moon:least-troops-stack')?.targetSelectorEvidence).toBeUndefined();
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
  it('isolates the correction to Moondancer placements and preserves every existing placement', () => {
    expect(catalogDelta).toMatchObject({
      existingChangedPlacementCount: 0,
      introducedMoondancerPlacementCount: 3_168,
      currentSnapshotIdentity: correctionDelta.currentSnapshotIdentity,
    });
    expect(correctionDelta).toMatchObject({
      placementCount: 35_904,
      changedPlacementCount: 1_593,
      moondancerChangedPlacementCount: 1_593,
      existing33ChangedPlacementCount: 0,
      noSentinelInitiativeSuppressionPlacementCount: 1_095,
      noSentinelExisting33ChangedPlacementCount: 0,
    });
  });

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
