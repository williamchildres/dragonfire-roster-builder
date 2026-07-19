import { describe, expect, it } from 'vitest';
import {
  allFormationPermutations,
  buildPlacementComparison,
  compareFormationPlacements,
  placementScoreFor,
  type FormationArrangement,
  type PlacementCandidate,
} from '../services/formationPlacementComparison';
import { buildFormationRecommendation } from '../services/formationRecommendation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { SemanticRelationship } from '../synergy/semanticRelationships';
import type { SynergyTag } from '../synergy/tags';

const current: FormationArrangement = {
  'left-flank': 'a',
  vanguard: 'b',
  'right-flank': 'c',
};

describe('six-permutation placement comparison', () => {
  it('generates six stable unique assignments for one trio', () => {
    const permutations = allFormationPermutations(['a', 'b', 'c']);
    expect(permutations).toHaveLength(6);
    expect(new Set(permutations.map(key)).size).toBe(6);
    expect(allFormationPermutations(['a', 'a', 'c'])).toEqual([]);
  });

  it('awards 20 when current is uniquely best, tied best, or every value is zero', () => {
    const unique = comparison([20, 15, 10, 8, 5, 0]);
    const tied = comparison([20, 20, 10, 8, 5, 0]);
    const zero = comparison([0, 0, 0, 0, 0, 0]);

    expect(unique).toMatchObject({ placementScore: 20, status: 'best', valueDelta: 0 });
    expect(tied).toMatchObject({ placementScore: 20, status: 'tied-best', valueDelta: 0 });
    expect(tied?.tiedBestArrangements).toHaveLength(2);
    expect(zero).toMatchObject({ placementScore: 20, status: 'tied-best', relativeDelta: 0 });
  });

  it('requires both an absolute +5 and relative 10% gain before lowering placement', () => {
    const absoluteBelow = comparison([46, 50, 0, 0, 0, 0]);
    const relativeBelow = comparison([95, 100, 0, 0, 0, 0]);
    const meaningful = comparison([45, 50, 0, 0, 0, 0]);

    expect(absoluteBelow).toMatchObject({
      meaningfulImprovement: false,
      placementScore: 20,
      current: { activeRelationshipValue: 46, placementScore: 20 },
      best: { activeRelationshipValue: 50, placementScore: 20 },
      status: 'no-meaningful-gain',
    });
    expect(relativeBelow).toMatchObject({
      meaningfulImprovement: false,
      placementScore: 20,
      current: { activeRelationshipValue: 95, placementScore: 20 },
      best: { activeRelationshipValue: 100, placementScore: 20 },
      status: 'no-meaningful-gain',
    });
    expect(meaningful).toMatchObject({
      meaningfulImprovement: true,
      placementScore: 18,
      current: { activeRelationshipValue: 45, placementScore: 18 },
      best: { activeRelationshipValue: 50, placementScore: 20 },
      status: 'better-available',
    });
    expect(placementScoreFor(46, 50)).toBe(20);
    expect(placementScoreFor(95, 100)).toBe(20);
    expect(placementScoreFor(45, 50)).toBe(18);
    expect(placementScoreFor(3, 10)).toBe(6);
    expect(placementScoreFor(0, 0)).toBe(20);
  });

  it('uses the exact scored candidate as current and remains stable when candidate input is reversed', () => {
    const candidates = placementCandidates([46, 50, 20, 10, 5, 0]);
    const forward = buildPlacementComparison(current, candidates)!;
    const reversed = buildPlacementComparison(current, [...candidates].reverse())!;
    const matchingCandidate = forward.candidates.find(
      (candidate) => key(candidate.arrangement) === key(current),
    );

    expect(forward.current).toBe(matchingCandidate);
    expect(forward.current.placementScore).toBe(forward.placementScore);
    expect(forward.best.placementScore).toBe(20);
    expect(forward).toEqual(reversed);
  });

  it('states the conjunctive meaningful-improvement threshold accurately in public scoring copy', async () => {
    const readme = await import('../../README.md?raw').then((module) => module.default);

    expect(readme).toContain(
      'A placement improvement is meaningful only when it reaches both +5 relationship value and a 10% relative gain; otherwise Placement Effectiveness remains 20.',
    );
    expect(readme).not.toContain('below both +5 absolute and 10% relative');
  });

  it('reports exact gained and lost marginal relationships for a meaningful swap', () => {
    const permutations = allFormationPermutations(['a', 'b', 'c']);
    const currentRelationship = relationship('current-edge', 'a', 'b', 'status:burn', 10);
    const gainedOne = relationship('gained-one', 'b', 'c', 'status:slow', 10);
    const gainedTwo = relationship('gained-two', 'c', 'a', 'damage:fire', 6);
    const candidates = permutations.map((arrangement, index): PlacementCandidate => ({
      arrangement,
      activeRelationshipValue: index === 0 ? 10 : index === 1 ? 16 : 0,
      placementScore: 0,
      relationships: index === 0 ? [currentRelationship] : index === 1 ? [gainedOne, gainedTwo] : [],
    }));
    const placement = buildPlacementComparison(current, candidates)!;
    const recommendation = buildFormationRecommendation({
      comparison: placement,
      progression: { a: { starRank: 10 }, b: { starRank: 10 }, c: { starRank: 10 } },
      dragonNamesById: new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Gamma']]),
    });

    expect(recommendation.action).toMatchObject({ kind: 'swap', scope: 'selected-trio' });
    expect(recommendation.valueDelta).toBe(6);
    expect(recommendation.gainedRelationships.map((edge) => edge.relationshipId)).toEqual([
      'gained-one',
      'gained-two',
    ]);
    expect(recommendation.lostRelationships.map((edge) => edge.relationshipId)).toEqual(['current-edge']);
    expect(recommendation.netSummary).toContain('gains 2 active relationships and loses 1 active relationship, for a net +6');
  });

  it('suppresses a below-threshold swap and reports the reason', () => {
    const placement = comparison([46, 50, 0, 0, 0, 0])!;
    const recommendation = buildFormationRecommendation({
      comparison: placement,
      progression: {},
      dragonNamesById: new Map(),
    });

    expect(recommendation).toMatchObject({
      action: null,
      suppressionReason: 'below-meaningful-threshold',
      valueDelta: 4,
      placementScoreDelta: 0,
    });
  });

  it('identifies Antares, Rhysarion, and Feskar current placement as uniquely best', () => {
    const progression = Object.fromEntries(
      simpleSynergyProfiles.map((profile) => [profile.dragonId, { starRank: 10, dragonLevel: 16 }]),
    );
    const placement = compareFormationPlacements({
      formation: { 'left-flank': 'antares', vanguard: 'rhysarion', 'right-flank': 'feskar' },
      progression,
      profiles: simpleSynergyProfiles,
    });

    expect(placement).toMatchObject({
      status: 'best',
      placementScore: 20,
      valueDelta: 0,
      current: { activeRelationshipValue: 31 },
      best: { activeRelationshipValue: 31 },
    });
    expect(placement?.candidates).toHaveLength(6);
  });
});

function comparison(values: number[]) {
  return buildPlacementComparison(current, placementCandidates(values));
}

function placementCandidates(values: number[]): PlacementCandidate[] {
  return allFormationPermutations(['a', 'b', 'c']).map((arrangement, index): PlacementCandidate => ({
    arrangement,
    activeRelationshipValue: values[index]!,
    placementScore: 0,
    relationships: [],
  }));
}

function relationship(
  id: string,
  providerDragonId: string,
  beneficiaryDragonId: string,
  semanticTag: SynergyTag,
  marginalValue: number,
): SemanticRelationship {
  return {
    id,
    relationshipClass: semanticTag.startsWith('status:') ? 'conditional-payoff' : 'output-amplification',
    providerDragonId,
    beneficiaryDragonId,
    semanticTag,
    abilityIds: [`${id}-ability`],
    sourceResultIds: [`${id}-result`],
    sourceKinds: [semanticTag.startsWith('status:') ? 'setup-payoff' : 'amplifier-output'],
    baseValue: marginalValue,
    marginalValue,
    redundancyRank: 1,
    summary: `${providerDragonId} supports ${beneficiaryDragonId}.`,
    evidenceDetails: [],
  };
}

function key(arrangement: FormationArrangement): string {
  return `${arrangement['left-flank']}/${arrangement.vanguard}/${arrangement['right-flank']}`;
}
