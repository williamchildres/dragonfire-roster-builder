import type { Dragon } from '../models/dragon';
import type {
  SemanticRelationship,
  SemanticRelationshipClass,
} from '../synergy/semanticRelationships';
import type { DragonSynergyProfile, SimpleFormation } from '../synergy/types';
import type { FormationPlacementComparison } from './formationPlacementComparison';

export type FormationRatingTier =
  | 'Excellent'
  | 'Strong'
  | 'Solid'
  | 'Developing'
  | 'Weak'
  | 'Incomplete';

export type FormationScoreCategory = 'Active Synergy' | 'Placement Effectiveness';

export interface FormationRatingBreakdownItem {
  label: FormationScoreCategory;
  score: number;
  max: number;
  explanation: string;
}

export interface FormationAnalysisConfidence {
  status: 'complete' | 'limited';
  issues: string[];
}

export interface ActiveSynergyScoreDetail {
  score: number;
  conditionalSubtotal: number;
  amplificationSubtotal: number;
  statSupportSubtotal: number;
  participationBonus: number;
  participatingDragonIds: string[];
}

export interface FormationRatingResult {
  score: number | null;
  tier: FormationRatingTier;
  summary: string;
  breakdown: FormationRatingBreakdownItem[];
  activeRelationshipCount: number;
  participatingDragonCount: number;
  confidence: FormationAnalysisConfidence;
}

export const FORMATION_TIER_THRESHOLDS = {
  excellent: 80,
  strong: 67,
  solid: 49,
  developing: 25,
} as const;

const classCaps: Record<SemanticRelationshipClass, number> = {
  'conditional-payoff': 30,
  'output-amplification': 30,
  'stat-support': 15,
};

export function rateFormation({
  formation,
  dragons,
  profiles,
  relationships,
  placementComparison,
}: {
  formation: SimpleFormation;
  dragons: Dragon[];
  profiles: DragonSynergyProfile[];
  relationships: SemanticRelationship[];
  placementComparison: FormationPlacementComparison | null;
}): FormationRatingResult {
  const confidence = assessFormationConfidence(formation, dragons, profiles);
  const positiveRelationships = relationships.filter((relationship) => relationship.marginalValue > 0);
  const active = scoreActiveSynergy(relationships);

  if (confidence.status === 'limited' || !placementComparison) {
    return {
      score: null,
      tier: 'Incomplete',
      summary: confidence.issues[0] ?? 'Complete all three positions to receive a Formation Rating.',
      breakdown: [],
      activeRelationshipCount: positiveRelationships.length,
      participatingDragonCount: active.participatingDragonIds.length,
      confidence,
    };
  }

  const placementScore = placementComparison.placementScore;
  const score = clamp(active.score + placementScore, 0, 100);
  const tier = tierForScore(score);

  return {
    score,
    tier,
    summary: verdictFor(tier, active, placementComparison),
    breakdown: [
      {
        label: 'Active Synergy',
        score: active.score,
        max: 80,
        explanation: `${positiveRelationships.length} unique active ${positiveRelationships.length === 1 ? 'relationship' : 'relationships'}; ${active.participatingDragonIds.length} participating ${active.participatingDragonIds.length === 1 ? 'dragon' : 'dragons'}.`,
      },
      {
        label: 'Placement Effectiveness',
        score: placementScore,
        max: 20,
        explanation: placementExplanation(placementComparison),
      },
    ],
    activeRelationshipCount: positiveRelationships.length,
    participatingDragonCount: active.participatingDragonIds.length,
    confidence,
  };
}

export function scoreActiveSynergy(
  relationships: SemanticRelationship[],
): ActiveSynergyScoreDetail {
  const positiveRelationships = relationships.filter((relationship) => relationship.marginalValue > 0);
  const subtotal = (relationshipClass: SemanticRelationshipClass) =>
    positiveRelationships
      .filter((relationship) => relationship.relationshipClass === relationshipClass)
      .reduce((total, relationship) => total + relationship.marginalValue, 0);
  const conditionalSubtotal = subtotal('conditional-payoff');
  const amplificationSubtotal = subtotal('output-amplification');
  const statSupportSubtotal = subtotal('stat-support');
  const participatingDragonIds = [
    ...new Set(
      positiveRelationships.flatMap((relationship) => [
        relationship.providerDragonId,
        relationship.beneficiaryDragonId,
      ]),
    ),
  ].sort();
  const participationBonus = participatingDragonIds.length >= 3
    ? 5
    : participatingDragonIds.length === 2
      ? 2
      : 0;
  const score = Math.round(Math.min(
    80,
    Math.min(conditionalSubtotal, classCaps['conditional-payoff']) +
      Math.min(amplificationSubtotal, classCaps['output-amplification']) +
      Math.min(statSupportSubtotal, classCaps['stat-support']) +
      participationBonus,
  ));

  return {
    score,
    conditionalSubtotal,
    amplificationSubtotal,
    statSupportSubtotal,
    participationBonus,
    participatingDragonIds,
  };
}

export function assessFormationConfidence(
  formation: SimpleFormation,
  dragons: Dragon[],
  profiles: DragonSynergyProfile[],
): FormationAnalysisConfidence {
  const issues: string[] = [];
  const selected = Object.values(formation);
  const filled = selected.filter((dragonId): dragonId is string => typeof dragonId === 'string');
  const knownDragonIds = new Set(dragons.map((dragon) => dragon.id));
  const profileIds = new Set(profiles.map((profile) => profile.dragonId));
  const valid = filled.filter((dragonId) => knownDragonIds.has(dragonId));

  if (filled.length < 3) {
    issues.push(`Assign all three positions; ${3 - filled.length} ${filled.length === 2 ? 'position remains' : 'positions remain'} empty.`);
  }
  if (valid.length !== filled.length) {
    issues.push('One or more selected dragons are not present in the current database.');
  }
  if (new Set(valid).size !== valid.length) {
    issues.push('Each position must contain a unique dragon.');
  }
  const unmapped = [...new Set(valid)].filter((dragonId) => !profileIds.has(dragonId));
  if (unmapped.length > 0) {
    issues.push(`${unmapped.length} selected ${unmapped.length === 1 ? 'dragon lacks' : 'dragons lack'} sufficient curated-profile confidence.`);
  }

  return {
    status: issues.length === 0 && valid.length === 3 ? 'complete' : 'limited',
    issues,
  };
}

export function tierForScore(score: number): FormationRatingTier {
  if (score >= FORMATION_TIER_THRESHOLDS.excellent) return 'Excellent';
  if (score >= FORMATION_TIER_THRESHOLDS.strong) return 'Strong';
  if (score >= FORMATION_TIER_THRESHOLDS.solid) return 'Solid';
  if (score >= FORMATION_TIER_THRESHOLDS.developing) return 'Developing';
  return 'Weak';
}

function placementExplanation(comparison: FormationPlacementComparison): string {
  const current = formatValue(comparison.current.activeRelationshipValue);
  const best = formatValue(comparison.best.activeRelationshipValue);
  if (comparison.status === 'best') {
    return `Current placement is best: ${current} of ${best} relationship value.`;
  }
  if (comparison.status === 'tied-best') {
    return `Current placement is tied for best at ${best} relationship value.`;
  }
  if (comparison.status === 'no-meaningful-gain') {
    return `A higher-value arrangement exists, but its +${formatValue(comparison.valueDelta)} gain is below the recommendation threshold.`;
  }
  return `Current placement has ${current} of ${best} best relationship value.`;
}

function verdictFor(
  tier: FormationRatingTier,
  active: ActiveSynergyScoreDetail,
  placement: FormationPlacementComparison,
): string {
  const placementClause = placement.status === 'better-available'
    ? ' A meaningful placement improvement is available.'
    : placement.status === 'tied-best'
      ? ' The current placement is tied for best.'
      : placement.status === 'no-meaningful-gain'
        ? ' No alternative produces a meaningful net gain.'
        : ' The current placement is best for these dragons.';
  if (tier === 'Excellent') {
    return `Exceptional mapped synergy with participation across ${active.participatingDragonIds.length} dragons.${placementClause}`;
  }
  if (tier === 'Strong') {
    return `Clearly above-average mapped synergy with several active payoff paths.${placementClause}`;
  }
  if (tier === 'Solid') {
    return `Functional mapped synergy with useful cross-dragon support.${placementClause}`;
  }
  if (tier === 'Developing') {
    return `Some mapped relationships are active, but important kit opportunities remain unused.${placementClause}`;
  }
  return `Little active cross-dragon value is currently mapped.${placementClause}`;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
