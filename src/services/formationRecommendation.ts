import type { FormationPosition } from '../models/dragon';
import type {
  FormationArrangement,
  FormationPlacementComparison,
  PlacementCandidate,
} from './formationPlacementComparison';
import type {
  SemanticRelationship,
  SemanticRelationshipClass,
} from '../synergy/semanticRelationships';
import type { SimpleProgressionByDragonId } from '../synergy/types';

export type RecommendationSuppressionReason =
  | 'current-best'
  | 'tied-best'
  | 'below-meaningful-threshold'
  | 'incomplete-formation'
  | 'insufficient-confidence';

export interface RecommendationRelationshipDelta {
  relationshipId: string;
  relationshipClass: SemanticRelationshipClass;
  providerDragonId: string;
  beneficiaryDragonId: string;
  semanticTag: string;
  marginalValue: number;
  abilityIds: string[];
  summary: string;
}

export interface RecommendationCandidate {
  arrangement: FormationArrangement;
  activeRelationshipValue: number;
  placementScore: number;
}

export type FormationRecommendationAction =
  | {
      kind: 'swap';
      scope: 'selected-trio';
      from: FormationArrangement;
      to: FormationArrangement;
    }
  | {
      kind: 'replace';
      scope: 'roster';
      removedDragonId: string;
      addedDragonId: string;
      arrangement: FormationArrangement;
    };

export interface FormationRecommendationResult {
  contractVersion: 1;
  action: FormationRecommendationAction | null;
  suppressionReason?: RecommendationSuppressionReason;
  current: RecommendationCandidate | null;
  best: RecommendationCandidate | null;
  tiedBestArrangements: FormationArrangement[];
  valueDelta: number;
  placementScoreDelta: number;
  gainedRelationships: RecommendationRelationshipDelta[];
  lostRelationships: RecommendationRelationshipDelta[];
  netSummary: string;
  progressionSnapshot: Record<
    string,
    { starRank?: number | null; dragonLevel?: number | null }
  >;
  confidence: 'complete' | 'limited';
}

const positionOrder: FormationPosition[] = ['left-flank', 'vanguard', 'right-flank'];
const positionLabels: Record<FormationPosition, string> = {
  'left-flank': 'Left Flank',
  vanguard: 'Vanguard',
  'right-flank': 'Right Flank',
};

export function buildFormationRecommendation({
  comparison,
  progression,
  dragonNamesById,
  confidence = 'complete',
}: {
  comparison: FormationPlacementComparison | null;
  progression: SimpleProgressionByDragonId;
  dragonNamesById: Map<string, string>;
  confidence?: 'complete' | 'limited';
}): FormationRecommendationResult {
  if (!comparison) {
    return emptyRecommendation(
      confidence === 'limited' ? 'insufficient-confidence' : 'incomplete-formation',
      progression,
      confidence,
      'Complete all three positions with unique curated dragons before comparing placements.',
    );
  }

  const current = publicCandidate(comparison.current);
  const best = publicCandidate(comparison.best);
  const { gained, lost } = relationshipDeltas(
    comparison.current.relationships,
    comparison.best.relationships,
  );
  const progressionSnapshot = selectedProgressionSnapshot(
    comparison.current.arrangement,
    progression,
  );

  if (comparison.current.activeRelationshipValue === comparison.best.activeRelationshipValue) {
    const tied = comparison.tiedBestArrangements.length > 1;
    return {
      contractVersion: 1,
      action: null,
      suppressionReason: tied ? 'tied-best' : 'current-best',
      current,
      best,
      tiedBestArrangements: comparison.tiedBestArrangements,
      valueDelta: 0,
      placementScoreDelta: 0,
      gainedRelationships: [],
      lostRelationships: [],
      netSummary: currentBestSummary(comparison.current.arrangement, dragonNamesById, tied),
      progressionSnapshot,
      confidence,
    };
  }

  if (!comparison.meaningfulImprovement) {
    return {
      contractVersion: 1,
      action: null,
      suppressionReason: 'below-meaningful-threshold',
      current,
      best,
      tiedBestArrangements: comparison.tiedBestArrangements,
      valueDelta: comparison.valueDelta,
      placementScoreDelta: 0,
      gainedRelationships: gained,
      lostRelationships: lost,
      netSummary: 'A different arrangement changes mapped relationships, but the net gain is too small to recommend a swap.',
      progressionSnapshot,
      confidence,
    };
  }

  return {
    contractVersion: 1,
    action: {
      kind: 'swap',
      scope: 'selected-trio',
      from: comparison.current.arrangement,
      to: comparison.best.arrangement,
    },
    current,
    best,
    tiedBestArrangements: comparison.tiedBestArrangements,
    valueDelta: comparison.valueDelta,
    placementScoreDelta: comparison.best.placementScore - comparison.placementScore,
    gainedRelationships: gained,
    lostRelationships: lost,
    netSummary: swapSummary(
      comparison.current.arrangement,
      comparison.best.arrangement,
      gained,
      lost,
      comparison.valueDelta,
      dragonNamesById,
    ),
    progressionSnapshot,
    confidence,
  };
}

function relationshipDeltas(
  currentRelationships: SemanticRelationship[],
  bestRelationships: SemanticRelationship[],
): { gained: RecommendationRelationshipDelta[]; lost: RecommendationRelationshipDelta[] } {
  const currentById = new Map(currentRelationships.map((relationship) => [relationship.id, relationship]));
  const bestById = new Map(bestRelationships.map((relationship) => [relationship.id, relationship]));
  const gained = bestRelationships.flatMap((relationship) => {
    const currentValue = currentById.get(relationship.id)?.marginalValue ?? 0;
    const marginalGain = relationship.marginalValue - currentValue;
    return marginalGain > 0 ? [relationshipDelta(relationship, marginalGain)] : [];
  });
  const lost = currentRelationships.flatMap((relationship) => {
    const bestValue = bestById.get(relationship.id)?.marginalValue ?? 0;
    const marginalLoss = relationship.marginalValue - bestValue;
    return marginalLoss > 0 ? [relationshipDelta(relationship, marginalLoss)] : [];
  });
  return {
    gained: gained.sort(compareRelationshipDeltas),
    lost: lost.sort(compareRelationshipDeltas),
  };
}

function relationshipDelta(
  relationship: SemanticRelationship,
  marginalValue: number,
): RecommendationRelationshipDelta {
  return {
    relationshipId: relationship.id,
    relationshipClass: relationship.relationshipClass,
    providerDragonId: relationship.providerDragonId,
    beneficiaryDragonId: relationship.beneficiaryDragonId,
    semanticTag: relationship.semanticTag,
    marginalValue,
    abilityIds: relationship.abilityIds,
    summary: relationship.summary,
  };
}

function compareRelationshipDeltas(
  left: RecommendationRelationshipDelta,
  right: RecommendationRelationshipDelta,
): number {
  return right.marginalValue - left.marginalValue || left.relationshipId.localeCompare(right.relationshipId);
}

function publicCandidate(candidate: PlacementCandidate): RecommendationCandidate {
  return {
    arrangement: candidate.arrangement,
    activeRelationshipValue: candidate.activeRelationshipValue,
    placementScore: candidate.placementScore,
  };
}

function currentBestSummary(
  arrangement: FormationArrangement,
  dragonNamesById: Map<string, string>,
  tied: boolean,
): string {
  if (tied) {
    return 'Keep the current positions. This arrangement is tied for best for these three dragons at current progression.';
  }
  const vanguard = dragonNamesById.get(arrangement.vanguard) ?? arrangement.vanguard;
  const right = dragonNamesById.get(arrangement['right-flank']) ?? arrangement['right-flank'];
  return `Keep ${vanguard} in Vanguard and ${right} on Right Flank. This is the best of all six arrangements for these dragons at current progression; no swap produces a net gain.`;
}

function swapSummary(
  current: FormationArrangement,
  best: FormationArrangement,
  gained: RecommendationRelationshipDelta[],
  lost: RecommendationRelationshipDelta[],
  valueDelta: number,
  dragonNamesById: Map<string, string>,
): string {
  const moves = positionOrder
    .filter((position) => current[position] !== best[position])
    .map((position) => `${dragonNamesById.get(best[position]) ?? best[position]} to ${positionLabels[position]}`);
  return `Move ${joinMoves(moves)}. This gains ${countLabel(gained.length, 'active relationship')} and loses ${countLabel(lost.length, 'active relationship')}, for a net +${formatValue(valueDelta)} relationship value.`;
}

function joinMoves(moves: string[]): string {
  if (moves.length <= 1) return moves[0] ?? 'the selected dragons';
  if (moves.length === 2) return `${moves[0]} and ${moves[1]}`;
  return `${moves.slice(0, -1).join(', ')}, and ${moves.at(-1)}`;
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function selectedProgressionSnapshot(
  arrangement: FormationArrangement,
  progression: SimpleProgressionByDragonId,
): FormationRecommendationResult['progressionSnapshot'] {
  const snapshot: FormationRecommendationResult['progressionSnapshot'] = {};
  const selectedDragonIds = positionOrder.map((position) => arrangement[position]);
  for (const dragonId of [...new Set(selectedDragonIds)].sort()) {
    snapshot[dragonId] = {
      starRank: progression[dragonId]?.starRank,
      dragonLevel: progression[dragonId]?.dragonLevel,
    };
  }
  return snapshot;
}

function emptyRecommendation(
  suppressionReason: RecommendationSuppressionReason,
  progression: SimpleProgressionByDragonId,
  confidence: 'complete' | 'limited',
  netSummary: string,
): FormationRecommendationResult {
  return {
    contractVersion: 1,
    action: null,
    suppressionReason,
    current: null,
    best: null,
    tiedBestArrangements: [],
    valueDelta: 0,
    placementScoreDelta: 0,
    gainedRelationships: [],
    lostRelationships: [],
    netSummary,
    progressionSnapshot: Object.fromEntries(
      Object.entries(progression).map(([dragonId, value]) => [dragonId, {
        starRank: value?.starRank,
        dragonLevel: value?.dragonLevel,
      }]),
    ),
    confidence,
  };
}
