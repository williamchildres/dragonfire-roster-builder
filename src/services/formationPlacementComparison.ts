import type { FormationPosition } from '../models/dragon';
import { evaluateFormation } from '../synergy/evaluateFormation';
import {
  buildSemanticRelationships,
  relationshipValue,
  type SemanticRelationship,
} from '../synergy/semanticRelationships';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import {
  allFormationPermutations,
  type FormationArrangement,
} from './formationArrangement';
export {
  allFormationPermutations,
  type FormationArrangement,
} from './formationArrangement';

export interface PlacementCandidate {
  arrangement: FormationArrangement;
  activeRelationshipValue: number;
  placementScore: number;
  relationships: SemanticRelationship[];
}

export interface FormationPlacementComparison {
  current: PlacementCandidate;
  best: PlacementCandidate;
  candidates: PlacementCandidate[];
  tiedBestArrangements: FormationArrangement[];
  valueDelta: number;
  relativeDelta: number;
  meaningfulImprovement: boolean;
  placementScore: number;
  status: 'best' | 'tied-best' | 'no-meaningful-gain' | 'better-available';
}

const positionOrder: FormationPosition[] = ['left-flank', 'vanguard', 'right-flank'];
const meaningfulAbsoluteDelta = 5;
const meaningfulRelativeDelta = 0.1;

export function compareFormationPlacements({
  formation,
  progression,
  profiles,
}: {
  formation: SimpleFormation;
  progression: SimpleProgressionByDragonId;
  profiles: DragonSynergyProfile[];
}): FormationPlacementComparison | null {
  const arrangement = completeArrangement(formation, profiles);
  if (!arrangement) {
    return null;
  }

  const selectedDragonIds = positionOrder.map((position) => arrangement[position]);
  const candidates = allFormationPermutations(selectedDragonIds).map((candidateArrangement) => {
    const results = evaluateFormation({
      formation: candidateArrangement,
      progression,
      profiles,
    }).results;
    const relationships = buildSemanticRelationships(results, profiles);
    return {
      arrangement: candidateArrangement,
      activeRelationshipValue: relationshipValue(relationships),
      placementScore: 0,
      relationships,
    };
  });
  return buildPlacementComparison(arrangement, candidates);
}

export function buildPlacementComparison(
  arrangement: FormationArrangement,
  candidates: PlacementCandidate[],
): FormationPlacementComparison | null {
  if (candidates.length !== 6) {
    return null;
  }
  const bestValue = Math.max(...candidates.map((candidate) => candidate.activeRelationshipValue));
  const scoredCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      placementScore: placementScoreFor(candidate.activeRelationshipValue, bestValue),
    }))
    .sort((left, right) => arrangementKey(left.arrangement).localeCompare(arrangementKey(right.arrangement)));
  const bestCandidates = scoredCandidates
    .filter((candidate) => candidate.activeRelationshipValue === bestValue)
    .sort((left, right) => arrangementKey(left.arrangement).localeCompare(arrangementKey(right.arrangement)));
  const current = scoredCandidates.find((candidate) => arrangementsEqual(candidate.arrangement, arrangement));
  const best = bestCandidates[0];
  if (!current || !best) {
    return null;
  }

  const { valueDelta, relativeDelta, meaningfulImprovement } = placementDeltaFor(
    current.activeRelationshipValue,
    bestValue,
  );
  const currentIsBest = current.activeRelationshipValue === bestValue;
  const currentTied = currentIsBest && bestCandidates.length > 1;
  const placementScore = current.placementScore;

  return {
    current,
    best,
    candidates: scoredCandidates,
    tiedBestArrangements: bestCandidates.map((candidate) => candidate.arrangement),
    valueDelta,
    relativeDelta,
    meaningfulImprovement,
    placementScore,
    status: currentIsBest
      ? (currentTied ? 'tied-best' : 'best')
      : meaningfulImprovement
        ? 'better-available'
        : 'no-meaningful-gain',
  };
}

export function placementScoreFor(currentValue: number, bestValue: number): number {
  const { meaningfulImprovement } = placementDeltaFor(currentValue, bestValue);
  if (!meaningfulImprovement) {
    return 20;
  }
  return clamp(Math.round(20 * currentValue / bestValue), 0, 20);
}

function placementDeltaFor(
  currentValue: number,
  bestValue: number,
): {
  valueDelta: number;
  relativeDelta: number;
  meaningfulImprovement: boolean;
} {
  const valueDelta = bestValue - currentValue;
  const relativeDelta = bestValue === 0 ? 0 : valueDelta / bestValue;
  return {
    valueDelta,
    relativeDelta,
    meaningfulImprovement:
      valueDelta >= meaningfulAbsoluteDelta && relativeDelta >= meaningfulRelativeDelta,
  };
}

function completeArrangement(
  formation: SimpleFormation,
  profiles: DragonSynergyProfile[],
): FormationArrangement | null {
  const knownIds = new Set(profiles.map((profile) => profile.dragonId));
  const selected = positionOrder.map((position) => formation[position]);
  if (
    selected.some((dragonId) => !dragonId || !knownIds.has(dragonId)) ||
    new Set(selected).size !== 3
  ) {
    return null;
  }
  return arrangementOf(selected[0]!, selected[1]!, selected[2]!);
}

function arrangementOf(left: string, vanguard: string, right: string): FormationArrangement {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function arrangementKey(arrangement: FormationArrangement): string {
  return positionOrder.map((position) => arrangement[position]).join('/');
}

function arrangementsEqual(left: FormationArrangement, right: FormationArrangement): boolean {
  return arrangementKey(left) === arrangementKey(right);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
