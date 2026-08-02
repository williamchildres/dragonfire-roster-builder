import {
  TROOP_TYPES,
  type AffinityLevel,
  type Dragon,
  type TroopType,
} from '../models/dragon';

export const TROOP_AFFINITY_RECOMMENDATION_VERSION =
  'troop-affinity-recommendation-v1' as const;

export interface TroopAffinityCandidate {
  troopType: TroopType;
  positiveDragonIds: string[];
  neutralDragonIds: string[];
  negativeDragonIds: string[];
  unknownDragonIds: string[];
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  unknownCount: number;
}

export type TroopAffinityRecommendationKind =
  | 'full-positive'
  | 'best-nonnegative-coverage'
  | 'least-negative-tradeoff'
  | 'incomplete';

export interface FormationTroopAffinityRecommendation {
  version: typeof TROOP_AFFINITY_RECOMMENDATION_VERSION;
  kind: TroopAffinityRecommendationKind;
  recommendedTroopTypes: TroopType[];
  candidates: TroopAffinityCandidate[];
  completeAffinityData: boolean;
}

export type TroopAffinityDragon = Pick<Dragon, 'id' | 'affinities'>;

export type TroopAffinityTroopClassification = 'general-combat' | 'objective-specific-siege';

export function troopAffinityTroopClassification(
  troopType: TroopType,
): TroopAffinityTroopClassification {
  return troopType === 'Siege' ? 'objective-specific-siege' : 'general-combat';
}

export function recommendTroopAffinity(
  formationDragons: readonly TroopAffinityDragon[],
): FormationTroopAffinityRecommendation | null {
  if (formationDragons.length !== 3) return null;
  const dragonIds = formationDragons.map((dragon) => dragon.id);
  if (new Set(dragonIds).size !== dragonIds.length) {
    throw new RangeError('Troop-affinity recommendations require three unique dragons.');
  }

  const orderedDragons = [...formationDragons].sort((left, right) =>
    left.id.localeCompare(right.id, 'en'),
  );
  const candidates = TROOP_TYPES.map((troopType) => buildCandidate(troopType, orderedDragons));
  const completeAffinityData = candidates.every((candidate) => candidate.unknownCount === 0);

  const fullPositive = candidates.filter((candidate) =>
    candidate.positiveCount === 3
      && candidate.negativeCount === 0
      && candidate.unknownCount === 0,
  );
  if (fullPositive.length > 0) {
    return recommendation('full-positive', fullPositive, candidates, completeAffinityData);
  }

  const completeNonnegative = candidates.filter((candidate) =>
    candidate.negativeCount === 0 && candidate.unknownCount === 0,
  );
  if (completeNonnegative.length > 0) {
    const maximumPositive = Math.max(...completeNonnegative.map((candidate) => candidate.positiveCount));
    return recommendation(
      'best-nonnegative-coverage',
      completeNonnegative.filter((candidate) => candidate.positiveCount === maximumPositive),
      candidates,
      completeAffinityData,
    );
  }

  const incompleteNonnegative = candidates.filter((candidate) => candidate.negativeCount === 0);
  if (incompleteNonnegative.length > 0) {
    const maximumPositive = Math.max(...incompleteNonnegative.map((candidate) => candidate.positiveCount));
    const bestPositive = incompleteNonnegative.filter((candidate) => candidate.positiveCount === maximumPositive);
    const minimumUnknown = Math.min(...bestPositive.map((candidate) => candidate.unknownCount));
    return recommendation(
      'incomplete',
      bestPositive.filter((candidate) => candidate.unknownCount === minimumUnknown),
      candidates,
      false,
    );
  }

  const minimumNegative = Math.min(...candidates.map((candidate) => candidate.negativeCount));
  const leastNegative = candidates.filter((candidate) => candidate.negativeCount === minimumNegative);
  const maximumPositive = Math.max(...leastNegative.map((candidate) => candidate.positiveCount));
  const bestPositive = leastNegative.filter((candidate) => candidate.positiveCount === maximumPositive);
  const minimumUnknown = Math.min(...bestPositive.map((candidate) => candidate.unknownCount));
  return recommendation(
    'least-negative-tradeoff',
    bestPositive.filter((candidate) => candidate.unknownCount === minimumUnknown),
    candidates,
    completeAffinityData,
  );
}

function buildCandidate(troopType: TroopType, dragons: readonly TroopAffinityDragon[]): TroopAffinityCandidate {
  const idsByAffinity: Record<AffinityLevel, string[]> = {
    positive: [],
    neutral: [],
    negative: [],
    unknown: [],
  };
  for (const dragon of dragons) idsByAffinity[dragon.affinities[troopType]].push(dragon.id);
  return {
    troopType,
    positiveDragonIds: idsByAffinity.positive,
    neutralDragonIds: idsByAffinity.neutral,
    negativeDragonIds: idsByAffinity.negative,
    unknownDragonIds: idsByAffinity.unknown,
    positiveCount: idsByAffinity.positive.length,
    neutralCount: idsByAffinity.neutral.length,
    negativeCount: idsByAffinity.negative.length,
    unknownCount: idsByAffinity.unknown.length,
  };
}

function recommendation(
  kind: TroopAffinityRecommendationKind,
  recommended: readonly TroopAffinityCandidate[],
  candidates: TroopAffinityCandidate[],
  completeAffinityData: boolean,
): FormationTroopAffinityRecommendation {
  return {
    version: TROOP_AFFINITY_RECOMMENDATION_VERSION,
    kind,
    recommendedTroopTypes: recommended.map((candidate) => candidate.troopType),
    candidates,
    completeAffinityData,
  };
}
