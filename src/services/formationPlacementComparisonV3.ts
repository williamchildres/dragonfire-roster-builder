import type { FormationPosition } from '../models/dragon';
import {
  evaluateFormationRelationshipsV3,
  type FormationRelationshipV3,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability/scoring';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import {
  allFormationPermutations,
  type FormationArrangement,
} from './formationArrangement';

export interface PlacementCandidateV3 {
  arrangement: FormationArrangement;
  rawBaseRelationshipValue: number;
  adjustedUncappedRelationshipValue: number;
  unquantifiedBasePotential: number;
  placementScore: number;
  relationships: FormationRelationshipV3[];
}

export interface FormationPlacementComparisonV3 {
  current: PlacementCandidateV3;
  best: PlacementCandidateV3;
  candidates: PlacementCandidateV3[];
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

export function compareFormationPlacementsV3({
  formation,
  progression,
  reliabilityProgression,
  profiles,
}: {
  formation: SimpleFormation;
  progression: SimpleProgressionByDragonId;
  reliabilityProgression: ReliabilityProgressionByDragonId;
  profiles: DragonSynergyProfile[];
}): FormationPlacementComparisonV3 | null {
  const arrangement = completeArrangement(formation, profiles);
  if (!arrangement) return null;
  const selectedDragonIds = positionOrder.map((position) => arrangement[position]);
  const candidates = allFormationPermutations(selectedDragonIds).map((candidateArrangement) => {
    const relationships = evaluateFormationRelationshipsV3({
      input: {
        formation: candidateArrangement,
        progression,
        reliabilityProgression,
      },
      profiles,
    });
    return {
      arrangement: candidateArrangement,
      rawBaseRelationshipValue: relationships.reduce(
        (sum, relationship) => sum + relationship.v2ComparableBaseMarginalValue,
        0,
      ),
      adjustedUncappedRelationshipValue: relationships.reduce(
        (sum, relationship) => sum + Math.max(0, relationship.adjustedMarginalValue),
        0,
      ),
      unquantifiedBasePotential: relationships.reduce(
        (sum, relationship) => sum + relationship.unquantifiedBasePotential,
        0,
      ),
      placementScore: 0,
      relationships,
    };
  });
  return buildPlacementComparisonV3(arrangement, candidates);
}

export function buildPlacementComparisonV3(
  arrangement: FormationArrangement,
  candidates: PlacementCandidateV3[],
): FormationPlacementComparisonV3 | null {
  if (candidates.length !== 6) return null;
  const bestValue = Math.max(
    ...candidates.map((candidate) => candidate.adjustedUncappedRelationshipValue),
  );
  const scoredCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      placementScore: placementScoreForV3(
        candidate.adjustedUncappedRelationshipValue,
        bestValue,
      ),
    }))
    .sort((left, right) =>
      arrangementKey(left.arrangement).localeCompare(arrangementKey(right.arrangement)),
    );
  const bestCandidates = scoredCandidates.filter(
    (candidate) => candidate.adjustedUncappedRelationshipValue === bestValue,
  );
  const current = scoredCandidates.find((candidate) =>
    arrangementsEqual(candidate.arrangement, arrangement),
  );
  const best = bestCandidates[0];
  if (!current || !best) return null;
  const { valueDelta, relativeDelta, meaningfulImprovement } = placementDeltaForV3(
    current.adjustedUncappedRelationshipValue,
    bestValue,
  );
  const currentIsBest = current.adjustedUncappedRelationshipValue === bestValue;
  return {
    current,
    best,
    candidates: scoredCandidates,
    tiedBestArrangements: bestCandidates.map((candidate) => candidate.arrangement),
    valueDelta,
    relativeDelta,
    meaningfulImprovement,
    placementScore: current.placementScore,
    status: currentIsBest
      ? bestCandidates.length > 1
        ? 'tied-best'
        : 'best'
      : meaningfulImprovement
        ? 'better-available'
        : 'no-meaningful-gain',
  };
}

export function placementScoreForV3(currentValue: number, bestValue: number): number {
  if (bestValue === 0) return 20;
  const { meaningfulImprovement } = placementDeltaForV3(currentValue, bestValue);
  if (!meaningfulImprovement) return 20;
  return clamp(Math.round((20 * currentValue) / bestValue), 0, 20);
}

function placementDeltaForV3(
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
  return {
    'left-flank': selected[0]!,
    vanguard: selected[1]!,
    'right-flank': selected[2]!,
  };
}

function arrangementKey(arrangement: FormationArrangement): string {
  return positionOrder.map((position) => arrangement[position]).join('/');
}

function arrangementsEqual(
  left: FormationArrangement,
  right: FormationArrangement,
): boolean {
  return arrangementKey(left) === arrangementKey(right);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
