import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import {
  buildPlacementComparisonV3,
  placementScoreForV3,
  type PlacementCandidateV3,
} from '../services/formationPlacementComparisonV3';
import {
  rateFormationV3,
  scoreActiveSynergyV3,
} from '../services/formationRatingV3';
import { evaluateFormationCandidates } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  applyAdjustedRedundancy,
  FORMATION_RATING_V3_CONTRACT,
  formationReliabilityBindings,
  reliabilityProgressionFromOwnedDragon,
  selectRelationshipCandidateV3,
  type FormationRelationshipV3,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability';
import type {
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import {
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
} from '../optimizer/rosterOptimizerTypes';

describe('Formation Rating v3 relationship scoring', () => {
  it('retains exact provider and beneficiary signal identity', () => {
    const formation: SimpleFormation = {
      'left-flank': 'velar',
      vanguard: 'caraxes',
      'right-flank': 'syrax',
    };
    const candidates = evaluateFormationCandidates({
      formation,
      progression: simpleProgression(formation),
      profiles: simpleSynergyProfiles,
    }).candidates;
    const bindingIds = new Set(formationReliabilityBindings.map((binding) => binding.signalId));
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.every(
        (candidate) =>
          bindingIds.has(candidate.providerSignalId) &&
          bindingIds.has(candidate.beneficiarySignalId),
      ),
    ).toBe(true);
    expect(
      candidates.every(
        (candidate) =>
          candidate.id.includes(candidate.providerSignalId) &&
          candidate.id.includes(candidate.beneficiarySignalId),
      ),
    ).toBe(true);
  });

  it('selects full reliability, then the highest adjusted quantified candidate', () => {
    expect(
      selectRelationshipCandidateV3([
        { id: 'large-chance', baseValue: 10, quantification: quantified(0.8) },
        { id: 'full', baseValue: 5, quantification: quantified(1) },
        { id: 'unknown', baseValue: 10, quantification: unquantified() },
      ]),
    ).toBe('full');
    expect(
      selectRelationshipCandidateV3([
        { id: 'six-at-half', baseValue: 6, quantification: quantified(0.5) },
        { id: 'ten-at-half', baseValue: 10, quantification: quantified(0.5) },
      ]),
    ).toBe('ten-at-half');
  });

  it('orders redundancy after reliability and excludes unquantified providers', () => {
    const relationships = [
      relationship('low-provider', 10, quantified(0.2)),
      relationship('high-provider', 10, quantified(0.8)),
      relationship('unknown-provider', 10, unquantified()),
    ];
    applyAdjustedRedundancy(relationships);
    expect(
      relationships.find((relationship) => relationship.id === 'high-provider'),
    ).toMatchObject({ redundancyRank: 1, adjustedMarginalValue: 8 });
    expect(
      relationships.find((relationship) => relationship.id === 'low-provider'),
    ).toMatchObject({ redundancyRank: 2, adjustedMarginalValue: 1 });
    expect(
      relationships.find((relationship) => relationship.id === 'unknown-provider'),
    ).toMatchObject({ redundancyRank: 3, adjustedMarginalValue: 0 });
  });

  it('keeps caps and evidence-backed participation in Active Synergy', () => {
    const relationships = [
      relationship('one', 10, quantified(1), 'conditional-payoff', 'a', 'b'),
      relationship('two', 10, quantified(1), 'conditional-payoff', 'b', 'c'),
      relationship('three', 10, quantified(1), 'conditional-payoff', 'c', 'a'),
      relationship('four', 10, quantified(1), 'conditional-payoff', 'a', 'c'),
      relationship('unknown', 10, unquantified(), 'conditional-payoff', 'x', 'y'),
    ];
    const score = scoreActiveSynergyV3(relationships);
    expect(score.conditionalUncappedSubtotal).toBe(40);
    expect(score.conditionalCappedSubtotal).toBe(30);
    expect(score.participationBonus).toBe(5);
    expect(score.participatingDragonIds).toEqual(['a', 'b', 'c']);
    expect(score.score).toBe(35);
  });
});

describe('Formation Rating v3 placement and engine isolation', () => {
  it('uses fractional adjusted values and gives all-zero ties full placement credit', () => {
    expect(placementScoreForV3(4.9, 10)).toBe(10);
    expect(placementScoreForV3(0, 0)).toBe(20);
    const arrangements = [
      arrangement('a', 'b', 'c'),
      arrangement('a', 'c', 'b'),
      arrangement('b', 'a', 'c'),
      arrangement('b', 'c', 'a'),
      arrangement('c', 'a', 'b'),
      arrangement('c', 'b', 'a'),
    ];
    const candidates: PlacementCandidateV3[] = arrangements.map((entry) => ({
      arrangement: entry,
      rawBaseRelationshipValue: 0,
      adjustedUncappedRelationshipValue: 0,
      unquantifiedBasePotential: 10,
      placementScore: 0,
      relationships: [],
    }));
    const comparison = buildPlacementComparisonV3(arrangements[0]!, candidates);
    expect(comparison?.status).toBe('tied-best');
    expect(comparison?.tiedBestArrangements).toHaveLength(6);
    expect(comparison?.placementScore).toBe(20);
  });

  it.each([
    ['velar', 'caraxes', 'syrax'],
    ['velar', 'sheepstealer', 'syrax'],
    ['velar', 'kalspire', 'venator'],
  ])('evaluates all placements for %s/%s/%s without changing live contracts', (a, b, c) => {
    const formation: SimpleFormation = {
      'left-flank': a,
      vanguard: b,
      'right-flank': c,
    };
    const rating = rateFormationV3({
      formation,
      dragons,
      profiles: simpleSynergyProfiles,
      progression: simpleProgression(formation),
      reliabilityProgression: reliabilityProgression(formation),
    });
    expect(rating.contract).toBe(FORMATION_RATING_V3_CONTRACT);
    expect(rating.score).not.toBeNull();
    expect(rating.score).toBeGreaterThanOrEqual(0);
    expect(rating.score).toBeLessThanOrEqual(100);
    expect(rating.placementComparison?.candidates).toHaveLength(6);
    expect(Number.isFinite(rating.adjustedUncappedRelationshipValue)).toBe(true);
    expect(
      rating.relationships.every(
        (relationship) =>
          relationship.candidateTraces.length > 0 &&
          relationship.selectedProviderSignalId.length > 0 &&
          relationship.selectedBeneficiarySignalId.length > 0,
      ),
    ).toBe(true);
  });

  it('keeps Velar guaranteed alternatives and Recovery at full reliability', () => {
    const formation: SimpleFormation = {
      'left-flank': 'velar',
      vanguard: 'caraxes',
      'right-flank': 'syrax',
    };
    const rating = rateFormationV3({
      formation,
      dragons,
      profiles: simpleSynergyProfiles,
      progression: simpleProgression(formation),
      reliabilityProgression: reliabilityProgression(formation),
    });
    const tactical = rating.relationships.find(
      (relationship) => relationship.id === 'relationship:velar:damage:tactical:syrax',
    );
    expect(tactical).toMatchObject({
      selectedProviderSignalId: 'velar-strategic-leader-tactical',
      quantification: { status: 'quantified', reliability: 1 },
    });
    const recoveryBinding = formationReliabilityBindings.find(
      (binding) => binding.signalId === 'velar-breath-of-renewal-recovery',
    );
    expect(recoveryBinding).toMatchObject({
      status: 'resolved',
      bindingClass: 'guaranteed',
    });
  });

  it('leaves the optimizer explicitly pinned to Formation Rating v2', () => {
    expect(ROSTER_OPTIMIZER_CONTRACT_VERSION).toBe(3);
    expect(ROSTER_OPTIMIZER_RATING_CONTRACT).toBe('formation-rating-v2');
  });
});

function simpleProgression(formation: SimpleFormation): SimpleProgressionByDragonId {
  return Object.fromEntries(
    Object.values(formation)
      .filter((dragonId): dragonId is string => dragonId !== null)
      .map((dragonId) => {
        const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
        return [
          dragonId,
          { starRank: 10, dragonLevel: 16, combatStats: dragon.stats },
        ];
      }),
  );
}

function reliabilityProgression(
  formation: SimpleFormation,
): ReliabilityProgressionByDragonId {
  return Object.fromEntries(
    Object.values(formation)
      .filter((dragonId): dragonId is string => dragonId !== null)
      .map((dragonId) => {
        const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
        const entry: OwnedDragon = {
          dragonId,
          owned: true,
          starRank: 10,
          reignLevel: 16,
          notes: '',
          habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 5])),
        };
        return [dragonId, reliabilityProgressionFromOwnedDragon(dragon, entry)];
      }),
  );
}

function relationship(
  id: string,
  baseValue: number,
  quantification: FormationRelationshipV3['quantification'],
  relationshipClass: FormationRelationshipV3['relationshipClass'] = 'conditional-payoff',
  providerDragonId = id,
  beneficiaryDragonId = 'beneficiary',
): FormationRelationshipV3 {
  const adjustedBaseValue =
    quantification.status === 'quantified'
      ? baseValue * quantification.reliability
      : 0;
  return {
    id,
    relationshipClass,
    providerDragonId,
    beneficiaryDragonId,
    semanticTag: 'status:control',
    selectedProviderSignalId: `${id}-provider`,
    selectedBeneficiarySignalId: `${id}-beneficiary`,
    selectedCandidateId: `${id}-candidate`,
    candidateTraces: [],
    baseValue,
    v2ComparableBaseMarginalValue: baseValue,
    quantification,
    adjustedBaseValue,
    adjustedMarginalValue: adjustedBaseValue,
    redundancyRank: 1,
    unquantifiedBasePotential: quantification.status === 'unquantified' ? baseValue : 0,
    componentIds: [id],
    eventIds: [`${id}-event`],
    probabilityVariantIds: [],
    explanation: id,
  };
}

function quantified(reliability: number): FormationRelationshipV3['quantification'] {
  return {
    status: 'quantified',
    reliability,
    method: reliability === 1 ? 'guaranteed' : 'one-supported-opportunity',
    explanation: 'test',
  };
}

function unquantified(): FormationRelationshipV3['quantification'] {
  return {
    status: 'unquantified',
    reason: 'conditional-opportunity',
    explanation: 'test',
  };
}

function arrangement(
  left: string,
  vanguard: string,
  right: string,
): PlacementCandidateV3['arrangement'] {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}
