import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import {
  compareFormationPlacements,
  type FormationArrangement,
  type FormationPlacementComparison,
} from '../services/formationPlacementComparison';
import { rateFormation, scoreActiveSynergy } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  buildSemanticRelationships,
  relationshipValue,
  type SemanticRelationship,
  type SemanticRelationshipClass,
} from '../synergy/semanticRelationships';
import type { SynergyTag } from '../synergy/tags';
import type { SimpleFormation, SimpleProgressionByDragonId } from '../synergy/types';

const unlockedProgression: SimpleProgressionByDragonId = Object.fromEntries(
  simpleSynergyProfiles.map((profile) => [profile.dragonId, { starRank: 10, dragonLevel: 16 }]),
);

describe('Formation Rating v2', () => {
  it('publishes only Active Synergy and Placement Effectiveness', () => {
    const { rating } = ratingFor(formation('syrax', 'vhagar', 'caraxes'));

    expect(rating.score).not.toBeNull();
    expect(rating.breakdown.map((item) => [item.label, item.max])).toEqual([
      ['Active Synergy', 80],
      ['Placement Effectiveness', 20],
    ]);
    expect(rating.score).toBe(rating.breakdown.reduce((total, item) => total + item.score, 0));
    expect(rating.confidence.status).toBe('complete');
  });

  it('withholds a public score for incomplete or duplicate formations', () => {
    const incomplete = ratingFor(formation('syrax', null, null)).rating;
    const duplicate = ratingFor(formation('syrax', 'syrax', 'caraxes')).rating;

    expect(incomplete).toMatchObject({ score: null, tier: 'Incomplete' });
    expect(incomplete.breakdown).toEqual([]);
    expect(incomplete.summary).toContain('Assign all three positions');
    expect(duplicate).toMatchObject({ score: null, tier: 'Incomplete' });
    expect(duplicate.confidence.issues.join(' ')).toContain('unique');
  });

  it('applies class caps and the three-dragon participation bonus', () => {
    const relationships = [
      ...manualRelationships('conditional-payoff', 4, 10),
      ...manualRelationships('output-amplification', 6, 6),
      ...manualRelationships('stat-support', 4, 5),
    ];

    const detail = scoreActiveSynergy(relationships);

    expect(detail).toMatchObject({
      conditionalSubtotal: 40,
      amplificationSubtotal: 36,
      statSupportSubtotal: 20,
      participationBonus: 5,
      score: 80,
    });
  });

  it('awards +2 when exactly two dragons participate and zero for no relationships', () => {
    expect(scoreActiveSynergy([manualRelationship('conditional-payoff', 0, 10)]).participationBonus).toBe(2);
    expect(scoreActiveSynergy([]).participationBonus).toBe(0);
  });

  it('does not use formation-card chips, missing enablers, or future unlocks as score inputs', () => {
    const active = [manualRelationship('conditional-payoff', 0, 10)];
    const placement = fixedBestPlacement(formation('syrax', 'vhagar', 'caraxes') as FormationArrangement, active);
    const first = rateFormation({
      formation: formation('syrax', 'vhagar', 'caraxes'),
      dragons,
      profiles: simpleSynergyProfiles,
      relationships: active,
      placementComparison: placement,
    });
    const second = rateFormation({
      formation: formation('syrax', 'vhagar', 'caraxes'),
      dragons,
      profiles: simpleSynergyProfiles,
      relationships: active.map((relationship) => ({ ...relationship, abilityIds: [...relationship.abilityIds, 'extra-chip-evidence'] })),
      placementComparison: placement,
    });

    expect(first.score).toBe(second.score);
    expect(first.breakdown[0]?.score).toBe(12);
  });

  it('calculates the Antares, Rhysarion, and Feskar regression from five semantic relationships', () => {
    const selected = formation('antares', 'rhysarion', 'feskar');
    const { rating, relationships, placement } = ratingFor(selected);

    expect(relationships).toHaveLength(5);
    expect(relationships.filter((relationship) => relationship.marginalValue > 0)).toHaveLength(5);
    expect(relationships.map((relationship) => relationship.id)).toEqual(expect.arrayContaining([
      'relationship:feskar:status:control:rhysarion',
      'relationship:antares:damage:fire:rhysarion',
      'relationship:antares:damage:fire:feskar',
      'relationship:rhysarion:damage:fire:feskar',
      'relationship:rhysarion:damage:tactical:feskar',
    ]));
    expect(rating.breakdown).toEqual([
      expect.objectContaining({ label: 'Active Synergy', score: 36, max: 80 }),
      expect.objectContaining({ label: 'Placement Effectiveness', score: 20, max: 20 }),
    ]);
    expect(rating.score).toBe(56);
    expect(placement?.status).toBe('best');
    expect(placement?.current.activeRelationshipValue).toBe(31);
    expect(placement?.best.activeRelationshipValue).toBe(31);
  });

  it('keeps complete scores bounded at 100', () => {
    const relationships = [
      ...manualRelationships('conditional-payoff', 4, 10),
      ...manualRelationships('output-amplification', 6, 6),
      ...manualRelationships('stat-support', 4, 5),
    ];
    const selected = formation('syrax', 'vhagar', 'caraxes') as FormationArrangement;
    const rating = rateFormation({
      formation: selected,
      dragons,
      profiles: simpleSynergyProfiles,
      relationships,
      placementComparison: fixedBestPlacement(selected, relationships),
    });

    expect(rating.score).toBe(100);
  });
});

function ratingFor(selectedFormation: SimpleFormation) {
  const results = evaluateFormation({
    formation: selectedFormation,
    progression: unlockedProgression,
    profiles: simpleSynergyProfiles,
  }).results;
  const relationships = buildSemanticRelationships(results, simpleSynergyProfiles);
  const placement = compareFormationPlacements({
    formation: selectedFormation,
    progression: unlockedProgression,
    profiles: simpleSynergyProfiles,
  });
  return {
    relationships,
    placement,
    rating: rateFormation({
      formation: selectedFormation,
      dragons,
      profiles: simpleSynergyProfiles,
      relationships,
      placementComparison: placement,
    }),
  };
}

function formation(left: string | null, vanguard: string | null, right: string | null): SimpleFormation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function manualRelationships(
  relationshipClass: SemanticRelationshipClass,
  count: number,
  value: number,
): SemanticRelationship[] {
  return Array.from({ length: count }, (_, index) => manualRelationship(relationshipClass, index, value));
}

function manualRelationship(
  relationshipClass: SemanticRelationshipClass,
  index: number,
  value: number,
): SemanticRelationship {
  const providers = ['syrax', 'vhagar', 'caraxes'];
  const providerDragonId = providers[index % providers.length]!;
  const beneficiaryDragonId = providers[(index + 1) % providers.length]!;
  const semanticTag = `${relationshipClass === 'stat-support' ? 'stat' : 'status'}:test-${relationshipClass}-${index}` as SynergyTag;
  return {
    id: `relationship:${providerDragonId}:${semanticTag}:${beneficiaryDragonId}`,
    relationshipClass,
    providerDragonId,
    beneficiaryDragonId,
    semanticTag,
    abilityIds: [`ability-${index}`],
    sourceResultIds: [`result-${index}`],
    sourceKinds: relationshipClass === 'conditional-payoff' ? ['setup-payoff'] : ['amplifier-output'],
    baseValue: value,
    marginalValue: value,
    redundancyRank: 1,
    summary: `Relationship ${index}`,
    evidenceDetails: [],
  };
}

function fixedBestPlacement(
  selected: FormationArrangement,
  relationships: SemanticRelationship[],
): FormationPlacementComparison {
  const candidate = {
    arrangement: selected,
    activeRelationshipValue: relationshipValue(relationships),
    placementScore: 20,
    relationships,
  };
  return {
    current: candidate,
    best: candidate,
    candidates: [candidate],
    tiedBestArrangements: [selected],
    valueDelta: 0,
    relativeDelta: 0,
    meaningfulImprovement: false,
    placementScore: 20,
    status: 'best',
  };
}
