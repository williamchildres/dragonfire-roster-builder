import type { Dragon } from '../models/dragon';
import {
  evaluateFormationRelationshipsV3,
  FORMATION_RATING_V3_CONTRACT,
  type FormationRelationshipV3,
  type ReliabilityCoverage,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability/scoring';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import {
  assessFormationConfidence,
  tierForScore,
  type FormationAnalysisConfidence,
  type FormationRatingBreakdownItem,
  type FormationRatingTier,
} from './formationRating';
import {
  compareFormationPlacementsV3,
  type FormationPlacementComparisonV3,
} from './formationPlacementComparisonV3';

export interface ActiveSynergyScoreDetailV3 {
  score: number;
  conditionalUncappedSubtotal: number;
  amplificationUncappedSubtotal: number;
  statSupportUncappedSubtotal: number;
  conditionalCappedSubtotal: number;
  amplificationCappedSubtotal: number;
  statSupportCappedSubtotal: number;
  participationBonus: number;
  participatingDragonIds: string[];
  rawBaseRelationshipValue: number;
  adjustedUncappedRelationshipValue: number;
  unquantifiedBasePotential: number;
  quantifiedRelationshipCount: number;
  unquantifiedRelationshipCount: number;
}

export interface FormationRatingV3Result {
  contract: typeof FORMATION_RATING_V3_CONTRACT;
  score: number | null;
  tier: FormationRatingTier;
  summary: string;
  breakdown: FormationRatingBreakdownItem[];
  activeSynergy: ActiveSynergyScoreDetailV3;
  placementComparison: FormationPlacementComparisonV3 | null;
  placementScore: number;
  rawBaseRelationshipValue: number;
  adjustedUncappedRelationshipValue: number;
  unquantifiedBasePotential: number;
  activeRelationshipCount: number;
  quantifiedRelationshipCount: number;
  unquantifiedRelationshipCount: number;
  participatingDragonIds: string[];
  reliabilityCoverage: ReliabilityCoverage;
  confidence: FormationAnalysisConfidence;
  relationships: FormationRelationshipV3[];
}

const classCaps = {
  'conditional-payoff': 30,
  'output-amplification': 30,
  'stat-support': 15,
} as const;

export function rateFormationV3({
  formation,
  dragons,
  profiles,
  progression,
  reliabilityProgression,
}: {
  formation: SimpleFormation;
  dragons: Dragon[];
  profiles: DragonSynergyProfile[];
  progression: SimpleProgressionByDragonId;
  reliabilityProgression: ReliabilityProgressionByDragonId;
}): FormationRatingV3Result {
  const relationships = evaluateFormationRelationshipsV3({
    input: { formation, progression, reliabilityProgression },
    profiles,
  });
  const placementComparison = compareFormationPlacementsV3({
    formation,
    progression,
    reliabilityProgression,
    profiles,
  });
  const confidence = assessFormationConfidence(formation, dragons, profiles);
  const active = scoreActiveSynergyV3(relationships);
  const quantifiedRelationshipCount = relationships.filter(
    (relationship) => relationship.quantification.status === 'quantified',
  ).length;
  const unquantifiedRelationshipCount = relationships.length - quantifiedRelationshipCount;
  const reliabilityCoverage = coverageFor(
    quantifiedRelationshipCount,
    unquantifiedRelationshipCount,
  );
  const placementScore = placementComparison?.placementScore ?? 0;
  const complete = confidence.status === 'complete' && placementComparison !== null;
  const score = complete ? clamp(active.score + placementScore, 0, 100) : null;
  const tier = score === null ? 'Incomplete' : tierForScore(score);
  return {
    contract: FORMATION_RATING_V3_CONTRACT,
    score,
    tier,
    summary:
      score === null
        ? confidence.issues[0] ?? 'Complete all three positions to receive a Formation Rating.'
        : `${reliabilityCoverage}; ${active.adjustedUncappedRelationshipValue.toFixed(6)} adjusted uncapped relationship value.`,
    breakdown:
      score === null
        ? []
        : [
            {
              label: 'Active Synergy',
              score: active.score,
              max: 80,
              explanation: `${active.quantifiedRelationshipCount} quantified and ${active.unquantifiedRelationshipCount} unquantified relationships.`,
            },
            {
              label: 'Placement Effectiveness',
              score: placementScore,
              max: 20,
              explanation: placementComparison
                ? `${placementComparison.current.adjustedUncappedRelationshipValue.toFixed(6)} current versus ${placementComparison.best.adjustedUncappedRelationshipValue.toFixed(6)} best adjusted value.`
                : 'Placement comparison unavailable.',
            },
          ],
    activeSynergy: active,
    placementComparison,
    placementScore,
    rawBaseRelationshipValue: active.rawBaseRelationshipValue,
    adjustedUncappedRelationshipValue: active.adjustedUncappedRelationshipValue,
    unquantifiedBasePotential: active.unquantifiedBasePotential,
    activeRelationshipCount: relationships.filter(
      (relationship) => relationship.adjustedMarginalValue > 0,
    ).length,
    quantifiedRelationshipCount,
    unquantifiedRelationshipCount,
    participatingDragonIds: active.participatingDragonIds,
    reliabilityCoverage,
    confidence,
    relationships,
  };
}

export function scoreActiveSynergyV3(
  relationships: FormationRelationshipV3[],
): ActiveSynergyScoreDetailV3 {
  const positive = relationships.filter(
    (relationship) => relationship.adjustedMarginalValue > 0,
  );
  const subtotal = (relationshipClass: FormationRelationshipV3['relationshipClass']) =>
    positive
      .filter((relationship) => relationship.relationshipClass === relationshipClass)
      .reduce((sum, relationship) => sum + relationship.adjustedMarginalValue, 0);
  const conditionalUncappedSubtotal = subtotal('conditional-payoff');
  const amplificationUncappedSubtotal = subtotal('output-amplification');
  const statSupportUncappedSubtotal = subtotal('stat-support');
  const conditionalCappedSubtotal = Math.min(
    conditionalUncappedSubtotal,
    classCaps['conditional-payoff'],
  );
  const amplificationCappedSubtotal = Math.min(
    amplificationUncappedSubtotal,
    classCaps['output-amplification'],
  );
  const statSupportCappedSubtotal = Math.min(
    statSupportUncappedSubtotal,
    classCaps['stat-support'],
  );
  const participatingDragonIds = [
    ...new Set(
      positive.flatMap((relationship) => [
        relationship.providerDragonId,
        relationship.beneficiaryDragonId,
      ]),
    ),
  ].sort();
  const participationBonus =
    participatingDragonIds.length >= 3
      ? 5
      : participatingDragonIds.length === 2
        ? 2
        : 0;
  const score = Math.round(
    Math.min(
      80,
      conditionalCappedSubtotal +
        amplificationCappedSubtotal +
        statSupportCappedSubtotal +
        participationBonus,
    ),
  );
  return {
    score,
    conditionalUncappedSubtotal,
    amplificationUncappedSubtotal,
    statSupportUncappedSubtotal,
    conditionalCappedSubtotal,
    amplificationCappedSubtotal,
    statSupportCappedSubtotal,
    participationBonus,
    participatingDragonIds,
    rawBaseRelationshipValue: relationships.reduce(
      (sum, relationship) => sum + relationship.v2ComparableBaseMarginalValue,
      0,
    ),
    adjustedUncappedRelationshipValue: positive.reduce(
      (sum, relationship) => sum + relationship.adjustedMarginalValue,
      0,
    ),
    unquantifiedBasePotential: relationships.reduce(
      (sum, relationship) => sum + relationship.unquantifiedBasePotential,
      0,
    ),
    quantifiedRelationshipCount: relationships.filter(
      (relationship) => relationship.quantification.status === 'quantified',
    ).length,
    unquantifiedRelationshipCount: relationships.filter(
      (relationship) => relationship.quantification.status === 'unquantified',
    ).length,
  };
}

function coverageFor(
  quantifiedCount: number,
  unquantifiedCount: number,
): ReliabilityCoverage {
  if (quantifiedCount === 0) return 'none-quantified';
  return unquantifiedCount === 0 ? 'all-quantified' : 'partially-quantified';
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
