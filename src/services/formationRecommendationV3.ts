import type { FormationPosition } from '../models/dragon';
import type { FormationRelationshipV3 } from '../synergy/reliability';
import type { SimpleProgressionByDragonId } from '../synergy/types';
import type {
  FormationRecommendationResult,
  RecommendationRelationshipDelta,
} from './formationRecommendation';
import type {
  FormationPlacementComparisonV3,
  PlacementCandidateV3,
} from './formationPlacementComparisonV3';
import type { FormationArrangement } from './formationArrangement';

const positionOrder: FormationPosition[] = ['left-flank', 'vanguard', 'right-flank'];
const positionLabels: Record<FormationPosition, string> = {
  'left-flank': 'Left Flank',
  vanguard: 'Vanguard',
  'right-flank': 'Right Flank',
};

export function buildFormationRecommendationV3({
  comparison,
  progression,
  dragonNamesById,
  confidence = 'complete',
}: {
  comparison: FormationPlacementComparisonV3 | null;
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
  if (
    comparison.current.adjustedUncappedRelationshipValue ===
    comparison.best.adjustedUncappedRelationshipValue
  ) {
    const tied = comparison.tiedBestArrangements.length > 1;
    const hasUnquantifiedPotential =
      comparison.current.unquantifiedBasePotential > 0;
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
      netSummary: hasUnquantifiedPotential
        ? 'Keep the current positions. All six arrangements are tied on quantified value; mapped unquantified potential remains visible in relationship details.'
        : currentBestSummary(comparison.current.arrangement, dragonNamesById, tied),
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
      netSummary:
        'A different arrangement changes reliability-adjusted relationships, but the net gain is too small to recommend a swap.',
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
  currentRelationships: readonly FormationRelationshipV3[],
  bestRelationships: readonly FormationRelationshipV3[],
): { gained: RecommendationRelationshipDelta[]; lost: RecommendationRelationshipDelta[] } {
  const currentById = new Map(
    currentRelationships.map((relationship) => [relationship.id, relationship]),
  );
  const bestById = new Map(
    bestRelationships.map((relationship) => [relationship.id, relationship]),
  );
  return {
    gained: bestRelationships.flatMap((relationship) => {
      const gain =
        relationship.adjustedMarginalValue -
        (currentById.get(relationship.id)?.adjustedMarginalValue ?? 0);
      return gain > 0 ? [relationshipDelta(relationship, gain)] : [];
    }),
    lost: currentRelationships.flatMap((relationship) => {
      const loss =
        relationship.adjustedMarginalValue -
        (bestById.get(relationship.id)?.adjustedMarginalValue ?? 0);
      return loss > 0 ? [relationshipDelta(relationship, loss)] : [];
    }),
  };
}

function relationshipDelta(
  relationship: FormationRelationshipV3,
  marginalValue: number,
): RecommendationRelationshipDelta {
  const selected = relationship.candidateTraces.find(
    (trace) => trace.candidate.id === relationship.selectedCandidateId,
  );
  return {
    relationshipId: relationship.id,
    relationshipClass: relationship.relationshipClass,
    providerDragonId: relationship.providerDragonId,
    beneficiaryDragonId: relationship.beneficiaryDragonId,
    semanticTag: relationship.semanticTag,
    marginalValue,
    abilityIds: selected?.candidate.abilityIds ?? [],
    summary: relationship.explanation,
  };
}

function publicCandidate(candidate: PlacementCandidateV3) {
  return {
    arrangement: candidate.arrangement,
    activeRelationshipValue: candidate.adjustedUncappedRelationshipValue,
    placementScore: candidate.placementScore,
  };
}

function currentBestSummary(
  arrangement: FormationArrangement,
  dragonNamesById: Map<string, string>,
  tied: boolean,
): string {
  if (tied) {
    return 'Keep the current positions. This arrangement is tied for best on reliability-adjusted relationship value.';
  }
  const vanguard = dragonNamesById.get(arrangement.vanguard) ?? arrangement.vanguard;
  const right =
    dragonNamesById.get(arrangement['right-flank']) ?? arrangement['right-flank'];
  return `Keep ${vanguard} in Vanguard and ${right} on Right Flank. This is the best of all six reliability-adjusted arrangements.`;
}

function swapSummary(
  current: FormationArrangement,
  best: FormationArrangement,
  gained: readonly RecommendationRelationshipDelta[],
  lost: readonly RecommendationRelationshipDelta[],
  valueDelta: number,
  dragonNamesById: Map<string, string>,
): string {
  const moves = positionOrder
    .filter((position) => current[position] !== best[position])
    .map(
      (position) =>
        `${dragonNamesById.get(best[position]) ?? best[position]} to ${positionLabels[position]}`,
    );
  return `Move ${joinMoves(moves)}. This gains ${countLabel(gained.length, 'relationship contribution')} and loses ${countLabel(lost.length, 'relationship contribution')}, for a net +${formatValue(valueDelta)} reliability-adjusted value.`;
}

function joinMoves(moves: readonly string[]): string {
  if (moves.length <= 1) return moves[0] ?? 'the selected dragons';
  if (moves.length === 2) return `${moves[0]} and ${moves[1]}`;
  return `${moves.slice(0, -1).join(', ')}, and ${moves.at(-1)}`;
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function selectedProgressionSnapshot(
  arrangement: FormationArrangement,
  progression: SimpleProgressionByDragonId,
): FormationRecommendationResult['progressionSnapshot'] {
  return Object.fromEntries(
    [...new Set(positionOrder.map((position) => arrangement[position]))]
      .sort()
      .map((dragonId) => [
        dragonId,
        {
          starRank: progression[dragonId]?.starRank,
          dragonLevel: progression[dragonId]?.dragonLevel,
        },
      ]),
  );
}

function emptyRecommendation(
  suppressionReason: 'incomplete-formation' | 'insufficient-confidence',
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
      Object.entries(progression).map(([dragonId, value]) => [
        dragonId,
        {
          starRank: value?.starRank,
          dragonLevel: value?.dragonLevel,
        },
      ]),
    ),
    confidence,
  };
}
