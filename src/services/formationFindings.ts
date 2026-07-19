import type { FormationPosition } from '../models/dragon';
import type { FormationSignalChip } from '../app/formationCardPresentation';
import type { FormationRatingResult, FormationScoreCategory } from './formationRating';
import type { FormationRecommendationResult } from './formationRecommendation';
import type { SemanticRelationship } from '../synergy/semanticRelationships';
import type {
  DragonProgression,
  DragonSynergyProfile,
  PositionClaim,
  SimpleFormation,
  SimpleProgressionByDragonId,
  SimpleSynergyResult,
} from '../synergy/types';

export type FormationFindingType =
  | 'active-strength'
  | 'missing-enabler'
  | 'unsupported-output'
  | 'unused-support'
  | 'better-placement'
  | 'alternative-vanguard'
  | 'future-unlock'
  | 'confidence-limitation';

export type FormationFindingTone = 'positive' | 'negative' | 'neutral' | 'informational';
export type FormationFindingVisibility = 'primary' | 'secondary';

export interface FormationFinding {
  id: string;
  type: FormationFindingType;
  tone: FormationFindingTone;
  scoreCategory?: FormationScoreCategory;
  dragonIds: string[];
  abilityIds: string[];
  semanticRelationshipId?: string;
  visibility: FormationFindingVisibility;
  summary: string;
  detail?: string;
}

export interface FormationFindingSet {
  findings: FormationFinding[];
  keyStrengths: FormationFinding[];
  keyGaps: FormationFinding[];
  neutralDetails: FormationFinding[];
  participatingDragonIds: string[];
}

export interface FindingSignalChips {
  damageProfile: FormationSignalChip[];
  provides: FormationSignalChip[];
  benefitsFrom: FormationSignalChip[];
}

const positionOrder: FormationPosition[] = ['left-flank', 'vanguard', 'right-flank'];

export function buildFormationFindings({
  formation,
  progression,
  profiles,
  results,
  relationships,
  signalChipsByDragonId,
  recommendation,
  rating,
}: {
  formation: SimpleFormation;
  progression: SimpleProgressionByDragonId;
  profiles: DragonSynergyProfile[];
  results: SimpleSynergyResult[];
  relationships: SemanticRelationship[];
  signalChipsByDragonId: Record<string, FindingSignalChips | undefined>;
  recommendation: FormationRecommendationResult;
  rating: FormationRatingResult;
}): FormationFindingSet {
  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  const dragonNamesById = new Map(profiles.map((profile) => [profile.dragonId, profile.dragonName]));
  const positiveRelationships = relationships.filter((relationship) => relationship.marginalValue > 0);
  const participatingDragonIds = [
    ...new Set(positiveRelationships.flatMap((relationship) => [
      relationship.providerDragonId,
      relationship.beneficiaryDragonId,
    ])),
  ].sort();

  const activeStrengths = [...relationships]
    .filter((relationship) => relationship.marginalValue > 0)
    .sort((left, right) => right.marginalValue - left.marginalValue || left.id.localeCompare(right.id))
    .map((relationship, index): FormationFinding => ({
      id: `finding:active:${relationship.id}`,
      type: 'active-strength',
      tone: 'positive',
      scoreCategory: 'Active Synergy',
      dragonIds: [relationship.providerDragonId, relationship.beneficiaryDragonId],
      abilityIds: relationship.abilityIds,
      semanticRelationshipId: relationship.id,
      visibility: index < 3 ? 'primary' : 'secondary',
      summary: relationship.summary,
      detail: relationship.redundancyRank > 1
        ? `Overlapping provider rank ${relationship.redundancyRank}; marginal value ${formatValue(relationship.marginalValue)} of ${relationship.baseValue}.`
        : `${relationship.relationshipClass}; ${formatValue(relationship.marginalValue)} relationship value.`,
    }));

  const gapCandidates: Array<FormationFinding & { priority: number }> = [];
  for (const result of results.filter((candidate) => candidate.kind === 'missing-enabler')) {
    gapCandidates.push({
      id: `finding:missing:${result.id}`,
      type: 'missing-enabler',
      tone: 'negative',
      dragonIds: result.dragonIds,
      abilityIds: result.abilityIds,
      visibility: 'secondary',
      summary: result.explanation,
      detail: 'Diagnostic only: the unavailable relationship receives no Active Synergy credit and no additional penalty.',
      priority: 1,
    });
  }

  for (const [dragonId, chips] of Object.entries(signalChipsByDragonId)) {
    const dragonName = dragonNamesById.get(dragonId) ?? dragonId;
    for (const chip of chips?.damageProfile ?? []) {
      if (chip.state !== 'available') continue;
      gapCandidates.push({
        id: `finding:unsupported:${dragonId}:${normalize(chip.label)}`,
        type: 'unsupported-output',
        tone: 'negative',
        dragonIds: [dragonId],
        abilityIds: abilityIdsForRole(profilesById.get(dragonId), 'output'),
        visibility: 'secondary',
        summary: `${dragonName}'s ${chip.label} is active but not amplified by the selected allies.`,
        detail: chip.reason,
        priority: 2,
      });
    }
    for (const chip of chips?.provides ?? []) {
      if (chip.state !== 'available' || chip.scoreable === false) continue;
      gapCandidates.push({
        id: `finding:unused:${dragonId}:${normalize(chip.label)}`,
        type: 'unused-support',
        tone: 'informational',
        dragonIds: [dragonId],
        abilityIds: abilityIdsForRole(profilesById.get(dragonId), 'provide'),
        visibility: 'secondary',
        summary: `${dragonName}'s ${chip.label} is active but unused by this formation.`,
        detail: chip.reason,
        priority: 3,
      });
    }
  }

  const sortedGaps = dedupeFindings(gapCandidates)
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
    .map((finding, index): FormationFinding => ({
      id: finding.id,
      type: finding.type,
      tone: finding.tone,
      scoreCategory: finding.scoreCategory,
      dragonIds: finding.dragonIds,
      abilityIds: finding.abilityIds,
      semanticRelationshipId: finding.semanticRelationshipId,
      visibility: index < 2 ? 'primary' : 'secondary',
      summary: finding.summary,
      detail: finding.detail,
    }));

  const swapAction = recommendation.action?.kind === 'swap' ? recommendation.action : null;
  const placementFindings: FormationFinding[] = swapAction
    ? [{
        id: `finding:placement:${arrangementKey(swapAction.to)}`,
        type: 'better-placement',
        tone: 'negative',
        scoreCategory: 'Placement Effectiveness',
        dragonIds: positionOrder.map((position) => swapAction.to[position]),
        abilityIds: [
          ...new Set([
            ...recommendation.gainedRelationships.flatMap((relationship) => relationship.abilityIds),
            ...recommendation.lostRelationships.flatMap((relationship) => relationship.abilityIds),
          ]),
        ].sort(),
        visibility: 'primary',
        summary: recommendation.netSummary,
        detail: `Current ${formatValue(recommendation.current?.activeRelationshipValue ?? 0)}; best ${formatValue(recommendation.best?.activeRelationshipValue ?? 0)} relationship value.`,
      }]
    : [];

  const vanguardFinding = alternativeVanguardFinding(
    formation,
    progression,
    profilesById,
    dragonNamesById,
  );
  const futureFindings = results
    .filter((result) => result.kind === 'progression-locked')
    .map((result): FormationFinding => ({
      id: `finding:future:${result.id}`,
      type: 'future-unlock',
      tone: 'neutral',
      dragonIds: result.dragonIds,
      abilityIds: result.abilityIds,
      visibility: 'secondary',
      summary: result.explanation,
      detail: 'Future unlocks are informational and do not reduce the current rating or Placement Effectiveness.',
    }));
  const confidenceFindings = rating.confidence.issues.map((issue, index): FormationFinding => ({
    id: `finding:confidence:${index}:${normalize(issue)}`,
    type: 'confidence-limitation',
    tone: 'informational',
    dragonIds: Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId)),
    abilityIds: [],
    visibility: 'primary',
    summary: issue,
  }));
  const findings = [
    ...confidenceFindings,
    ...placementFindings,
    ...activeStrengths,
    ...sortedGaps,
    ...(vanguardFinding ? [vanguardFinding] : []),
    ...futureFindings,
  ];

  return {
    findings,
    keyStrengths: activeStrengths.filter((finding) => finding.visibility === 'primary').slice(0, 3),
    keyGaps: sortedGaps.filter((finding) => finding.visibility === 'primary').slice(0, 2),
    neutralDetails: [
      ...sortedGaps.filter((finding) => finding.visibility === 'secondary'),
      ...(vanguardFinding ? [vanguardFinding] : []),
      ...futureFindings,
    ],
    participatingDragonIds,
  };
}

function alternativeVanguardFinding(
  formation: SimpleFormation,
  progression: SimpleProgressionByDragonId,
  profilesById: Map<string, DragonSynergyProfile>,
  dragonNamesById: Map<string, string>,
): FormationFinding | null {
  const claims = positionOrder.flatMap((position) => {
    const dragonId = formation[position];
    const profile = dragonId ? profilesById.get(dragonId) : undefined;
    return profile?.positionClaims
      .filter((claim) => claim.requiredPosition === 'vanguard' && isClaimUnlocked(claim, progression[dragonId!]))
      .map((claim) => ({ dragonId: dragonId!, position, claim })) ?? [];
  });
  if (claims.length < 2) {
    return null;
  }

  const active = claims.find((entry) => entry.position === 'vanguard');
  const alternatives = claims.filter((entry) => entry !== active);
  const activeName = active ? dragonNamesById.get(active.dragonId) ?? active.dragonId : null;
  const alternativeNames = alternatives.map((entry) => dragonNamesById.get(entry.dragonId) ?? entry.dragonId);
  const summary = activeName
    ? `${activeName}'s Vanguard Trait is active. ${joinNames(alternativeNames)} ${alternativeNames.length === 1 ? 'has' : 'have'} alternative Vanguard-only benefits.`
    : `${joinNames(alternativeNames)} have alternative Vanguard-only benefits.`;

  return {
    id: `finding:alternative-vanguard:${claims.map((entry) => entry.dragonId).sort().join(':')}`,
    type: 'alternative-vanguard',
    tone: 'neutral',
    dragonIds: claims.map((entry) => entry.dragonId),
    abilityIds: claims.map((entry) => entry.claim.abilityId).sort(),
    visibility: 'secondary',
    summary,
    detail: 'Only one dragon can occupy Vanguard. These normal alternatives do not create a conflict or rating penalty.',
  };
}

function isClaimUnlocked(claim: PositionClaim, progression: DragonProgression | undefined): boolean {
  if (claim.unlock?.minimumStarRank !== undefined && (progression?.starRank ?? 0) < claim.unlock.minimumStarRank) {
    return false;
  }
  if (claim.unlock?.minimumDragonLevel !== undefined && (progression?.dragonLevel ?? 0) < claim.unlock.minimumDragonLevel) {
    return false;
  }
  return true;
}

function abilityIdsForRole(
  profile: DragonSynergyProfile | undefined,
  role: 'output' | 'provide',
): string[] {
  if (!profile) return [];
  const signals = role === 'output' ? profile.outputs : [...profile.outputs, ...profile.supports];
  return [...new Set(signals.map((signal) => signal.abilityId))].sort();
}

function dedupeFindings<T extends FormationFinding & { priority: number }>(findings: T[]): T[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    if (seen.has(finding.id)) return false;
    seen.add(finding.id);
    return true;
  });
}

function arrangementKey(arrangement: Record<FormationPosition, string>): string {
  return positionOrder.map((position) => arrangement[position]).join(':');
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'Selected dragons';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
