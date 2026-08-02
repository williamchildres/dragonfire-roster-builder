import { describe, expect, it } from 'vitest';
import { TROOP_TYPES, type AffinityLevel, type TroopType } from '../models/dragon';
import { allFormationPermutations } from '../services/formationArrangement';
import {
  recommendTroopAffinity,
  troopAffinityTroopClassification,
  TROOP_AFFINITY_RECOMMENDATION_VERSION,
  type TroopAffinityDragon,
} from '../services/troopAffinityRecommendation';

const affinities = (overrides: Partial<Record<TroopType, AffinityLevel>> = {}, fallback: AffinityLevel = 'neutral') =>
  Object.fromEntries(TROOP_TYPES.map((troopType) => [troopType, overrides[troopType] ?? fallback])) as Record<TroopType, AffinityLevel>;
const dragon = (id: string, values: Record<TroopType, AffinityLevel>): TroopAffinityDragon => ({ id, affinities: values });

describe('troop-affinity-recommendation-v1', () => {
  it('returns one full-positive type', () => {
    const result = recommendTroopAffinity([
      dragon('a', affinities({ Cavalry: 'positive' })),
      dragon('b', affinities({ Cavalry: 'positive' })),
      dragon('c', affinities({ Cavalry: 'positive' })),
    ])!;
    expect(result).toMatchObject({ version: TROOP_AFFINITY_RECOMMENDATION_VERSION, kind: 'full-positive', recommendedTroopTypes: ['Cavalry'] });
  });

  it('retains multiple tied full-positive types in canonical order', () => {
    const formation = ['a', 'b', 'c'].map((id) => dragon(id, affinities({ Cavalry: 'positive', Spearmen: 'positive' })));
    expect(recommendTroopAffinity(formation)).toMatchObject({ kind: 'full-positive', recommendedTroopTypes: ['Cavalry', 'Spearmen'] });
  });

  it.each([
    [2, ['a', 'b'], ['c']],
    [1, ['a'], ['b', 'c']],
  ])('returns best complete nonnegative coverage for %i positive dragons', (positiveCount, positiveIds, neutralIds) => {
    const formation = ['a', 'b', 'c'].map((id) => dragon(id, affinities({
      Archers: positiveIds.includes(id) ? 'positive' : 'neutral',
      Cavalry: 'negative',
      Shieldbearers: 'negative',
      Spearmen: 'negative',
      Siege: 'negative',
    })));
    const result = recommendTroopAffinity(formation)!;
    expect(result).toMatchObject({ kind: 'best-nonnegative-coverage', recommendedTroopTypes: ['Archers'] });
    expect(result.candidates.find((candidate) => candidate.troopType === 'Archers')).toMatchObject({ positiveCount, positiveDragonIds: positiveIds, neutralDragonIds: neutralIds });
  });

  it('retains all canonical troop types when all three dragons are neutral', () => {
    const formation = ['a', 'b', 'c'].map((id) => dragon(id, affinities()));
    expect(recommendTroopAffinity(formation)).toMatchObject({ kind: 'best-nonnegative-coverage', recommendedTroopTypes: TROOP_TYPES });
  });

  it('prefers a complete nonnegative candidate over an incomplete candidate with more positives', () => {
    const formation = [
      dragon('a', affinities({ Cavalry: 'positive', Shieldbearers: 'positive' }, 'negative')),
      dragon('b', affinities({ Cavalry: 'positive', Shieldbearers: 'neutral' }, 'negative')),
      dragon('c', affinities({ Cavalry: 'unknown', Shieldbearers: 'neutral' }, 'negative')),
    ];
    const result = recommendTroopAffinity(formation)!;
    expect(result).toMatchObject({ kind: 'best-nonnegative-coverage', recommendedTroopTypes: ['Shieldbearers'], completeAffinityData: false });
    expect(result.candidates.find((candidate) => candidate.troopType === 'Cavalry')).toMatchObject({
      positiveDragonIds: ['a', 'b'],
      unknownDragonIds: ['c'],
      positiveCount: 2,
      unknownCount: 1,
    });
  });

  it('never treats unknown as neutral', () => {
    const formation = [
      dragon('a', affinities({ Cavalry: 'positive' }, 'negative')),
      dragon('b', affinities({ Cavalry: 'positive' }, 'negative')),
      dragon('c', affinities({ Cavalry: 'unknown' }, 'negative')),
    ];
    const result = recommendTroopAffinity(formation)!;
    expect(result).toMatchObject({ kind: 'incomplete', recommendedTroopTypes: ['Cavalry'], completeAffinityData: false });
    expect(result.candidates[0]).toMatchObject({ positiveCount: 2, neutralCount: 0, unknownCount: 1 });
  });

  it('returns least-negative tradeoff when every troop type has a verified negative', () => {
    const formation = [
      dragon('a', affinities({}, 'negative')),
      dragon('b', affinities({ Cavalry: 'positive' }, 'neutral')),
      dragon('c', affinities({ Cavalry: 'positive' }, 'neutral')),
    ];
    expect(recommendTroopAffinity(formation)).toMatchObject({ kind: 'least-negative-tradeoff', recommendedTroopTypes: ['Cavalry'] });
  });

  it('minimizes negative count before maximizing positive count', () => {
    const formation = [
      dragon('a', affinities({}, 'negative')),
      dragon('b', affinities({ Cavalry: 'neutral', Shieldbearers: 'negative' }, 'negative')),
      dragon('c', affinities({ Cavalry: 'neutral', Shieldbearers: 'positive' }, 'negative')),
    ];
    const result = recommendTroopAffinity(formation)!;
    expect(result.recommendedTroopTypes).toEqual(['Cavalry']);
    expect(result.candidates.find((candidate) => candidate.troopType === 'Cavalry')).toMatchObject({ negativeCount: 1, positiveCount: 0 });
    expect(result.candidates.find((candidate) => candidate.troopType === 'Shieldbearers')).toMatchObject({ negativeCount: 2, positiveCount: 1 });
  });

  it('uses canonical troop ordering for output without hiding exact ties', () => {
    const formation = ['a', 'b', 'c'].map((id) => dragon(id, affinities({}, 'negative')));
    expect(recommendTroopAffinity(formation)?.recommendedTroopTypes).toEqual(TROOP_TYPES);
  });

  it('is invariant across all six position permutations', () => {
    const byId = new Map([
      dragon('a', affinities({ Cavalry: 'positive', Archers: 'positive' })),
      dragon('b', affinities({ Cavalry: 'positive', Archers: 'neutral' })),
      dragon('c', affinities({ Cavalry: 'neutral', Archers: 'positive' })),
    ].map((item) => [item.id, item]));
    const expected = recommendTroopAffinity([...byId.values()]);
    for (const arrangement of allFormationPermutations(['a', 'b', 'c'])) {
      expect(recommendTroopAffinity([
        byId.get(arrangement['left-flank'])!,
        byId.get(arrangement.vanguard)!,
        byId.get(arrangement['right-flank'])!,
      ])).toEqual(expected);
    }
  });

  it('rejects duplicate dragons and safely returns no result for incomplete formations', () => {
    const a = dragon('a', affinities());
    expect(() => recommendTroopAffinity([a, a, dragon('b', affinities())])).toThrow(/unique dragons/i);
    expect(recommendTroopAffinity([a, dragon('b', affinities())])).toBeNull();
  });

  it('classifies Siege as objective-specific without inventing a numeric penalty', () => {
    expect(troopAffinityTroopClassification('Siege')).toBe('objective-specific-siege');
    for (const troopType of TROOP_TYPES.filter((candidate) => candidate !== 'Siege')) {
      expect(troopAffinityTroopClassification(troopType)).toBe('general-combat');
    }
  });

  it('emits classifications only, with no Estimated Power or Formation Rating adjustment', () => {
    const serialized = JSON.stringify(recommendTroopAffinity(['a', 'b', 'c'].map((id) => dragon(id, affinities()))));
    expect(serialized).not.toMatch(/estimatedPower|formationRating|adjusted|1\.2|60%/i);
  });
});
