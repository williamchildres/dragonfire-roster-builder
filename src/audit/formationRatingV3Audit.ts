import { createHash } from 'node:crypto';

import { dragons } from '../data/dragons';
import type { Dragon, OwnedDragon } from '../models/dragon';
import {
  rateFormation,
  tierForScore,
} from '../services/formationRating';
import {
  buildPlacementComparison,
  compareFormationPlacements,
  type PlacementCandidate,
} from '../services/formationPlacementComparison';
import {
  buildPlacementComparisonV3,
  compareFormationPlacementsV3,
  type PlacementCandidateV3,
} from '../services/formationPlacementComparisonV3';
import { scoreActiveSynergyV3 } from '../services/formationRatingV3';
import {
  FORMATION_RATING_V3_TIER_THRESHOLDS,
  tierForFormationRatingV3,
} from '../services/formationRatingTierV3';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  FORMATION_RATING_V3_CONTRACT,
  reliabilityProgressionFromOwnedDragon,
  type FormationRelationshipV3,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability';
import type {
  DragonProgression,
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import { runFormationReliabilityAudit } from './formationReliabilityAudit';
import { runFormationReliabilityRegistryAudit } from './formationReliabilityRegistryAudit';
import {
  calibrateFormationRatingV3Tiers,
  FORMATION_RATING_V3_TIER_TARGETS,
} from './formationRatingV3TierCalibration';

export const FORMATION_RATING_V3_AUDIT_VERSION = 'formation-rating-v3-audit-v1' as const;
export const EXPECTED_FORMATION_RATING_V2_HASH =
  '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf';
export const EXPECTED_FORMATION_RELIABILITY_REGISTRY_HASH =
  '246bbef69594d91df916378e5a92755392108caff8b659b8ea977c1535480d6e';
export const EXPECTED_FORMATION_RELIABILITY_RESEARCH_HASH =
  '332856d0d08eaf8922b589d28c8c521c2a2ba3d1e329881ee9137667bdf11ba0';
export const EXPECTED_FORMATION_RATING_V3_NUMERIC_HASH =
  '939b488ea17aac779b16c1313f6759f0bea76e0a7d9182c09f2fe32f3e9d5f86';
export const EXPECTED_FORMATION_RATING_V3_HASH =
  '9ea93aaaac6edaf830410d59f23d88f473b30a4e41ce032a7decb260592ad01a';
export const EXPECTED_FORMATION_RATING_V3_AUDIT_HASH =
  'abaf4ebab4ef6da6796183578f005983082343f93577e0d4b211ef422cd82efd';

interface CompactFormationComparison {
  formation: [string, string, string];
  v2Score: number;
  v3Score: number;
  delta: number;
  v2ActiveSynergy: number;
  v3ActiveSynergy: number;
  v2Placement: number;
  v3Placement: number;
  adjustedUncappedValue: number;
  unquantifiedBasePotential: number;
  explanation: string[];
}

export function runFormationRatingV3Audit() {
  const registryAudit = runFormationReliabilityRegistryAudit();
  const researchAudit = runFormationReliabilityAudit();
  const v2CandidatesByTrio = new Map<string, PlacementCandidate[]>();
  const v3CandidatesByTrio = new Map<string, PlacementCandidateV3[]>();
  const trioBestChanges = new Set<string>();
  const v3Hash = createHash('sha256');
  const v3Scores: number[] = [];
  const activeSynergyDistribution: Record<string, number> = {};
  const placementDistribution: Record<string, number> = {};
  const tierCounts: Record<string, number> = {};
  const preCalibrationTierCounts: Record<string, number> = {};
  const tierTransitions: Record<string, number> = {};
  const scoreDeltaDistribution: Record<string, number> = {};
  const quantificationMethodCounts: Record<string, number> = {};
  const unquantifiedReasonCounts: Record<string, number> = {};
  const perDragonDelta = new Map<string, { total: number; count: number }>();
  const comparisons: CompactFormationComparison[] = [];
  const invariantFailures: string[] = [];
  let orderedFormations = 0;
  let formationsWhoseBestArrangementChanges = 0;
  let quantifiedRelationshipCount = 0;
  let unquantifiedRelationshipCount = 0;
  let quantifiedBaseValue = 0;
  let unquantifiedBasePotential = 0;
  let fullRelationshipCount = 0;
  let directOneOpportunityRelationshipCount = 0;
  let confirmedCumulativeRelationshipCount = 0;
  let conditionalOpportunityRelationshipCount = 0;
  let unresolvedJointChanceRelationshipCount = 0;
  let adjustedRedundancyOrderDifferenceCount = 0;

  for (const left of dragons) {
    for (const vanguard of dragons) {
      if (vanguard.id === left.id) continue;
      for (const right of dragons) {
        if (right.id === left.id || right.id === vanguard.id) continue;
        const formation: SimpleFormation = {
          'left-flank': left.id,
          vanguard: vanguard.id,
          'right-flank': right.id,
        };
        const trioKey = [left.id, vanguard.id, right.id].sort().join('/');
        const progression = maxSimpleProgression(formation);
        const reliabilityProgression = maxReliabilityProgression(formation);
        let v2Candidates = v2CandidatesByTrio.get(trioKey);
        if (!v2Candidates) {
          v2Candidates = compareFormationPlacements({
            formation,
            progression,
            profiles: simpleSynergyProfiles,
          })!.candidates;
          v2CandidatesByTrio.set(trioKey, v2Candidates);
        }
        let v3Candidates = v3CandidatesByTrio.get(trioKey);
        if (!v3Candidates) {
          v3Candidates = compareFormationPlacementsV3({
            formation,
            progression,
            reliabilityProgression,
            profiles: simpleSynergyProfiles,
          })!.candidates;
          v3CandidatesByTrio.set(trioKey, v3Candidates);
          if (bestArrangementKeysV2(v2Candidates) !== bestArrangementKeysV3(v3Candidates)) {
            trioBestChanges.add(trioKey);
          }
        }
        const arrangement = {
          'left-flank': left.id,
          vanguard: vanguard.id,
          'right-flank': right.id,
        } as const;
        const v2Placement = buildPlacementComparison(arrangement, v2Candidates)!;
        const v3Placement = buildPlacementComparisonV3(arrangement, v3Candidates)!;
        const v2Relationships = v2Placement.current.relationships;
        const v3Relationships = v3Placement.current.relationships;
        const v2Rating = rateFormation({
          formation,
          dragons,
          profiles: simpleSynergyProfiles,
          relationships: v2Relationships,
          placementComparison: v2Placement,
        });
        const activeV3 = scoreActiveSynergyV3(v3Relationships);
        const v3Score = activeV3.score + v3Placement.placementScore;
        const preCalibrationV3Tier = tierForScore(v3Score);
        const v3Tier = tierForFormationRatingV3(v3Score);
        const v2Score = v2Rating.score!;
        const delta = v3Score - v2Score;
        const bestChanged =
          bestArrangementKeysV2(v2Candidates) !== bestArrangementKeysV3(v3Candidates);
        if (bestChanged) formationsWhoseBestArrangementChanges += 1;
        orderedFormations += 1;
        v3Scores.push(v3Score);
        increment(activeSynergyDistribution, String(activeV3.score));
        increment(placementDistribution, String(v3Placement.placementScore));
        increment(tierCounts, v3Tier);
        increment(preCalibrationTierCounts, preCalibrationV3Tier);
        increment(tierTransitions, `${v2Rating.tier}->${v3Tier}`);
        increment(scoreDeltaDistribution, String(delta));
        for (const dragonId of [left.id, vanguard.id, right.id]) {
          const aggregate = perDragonDelta.get(dragonId) ?? { total: 0, count: 0 };
          aggregate.total += delta;
          aggregate.count += 1;
          perDragonDelta.set(dragonId, aggregate);
        }
        if (redundancyOrderDiffers(v3Relationships)) {
          adjustedRedundancyOrderDifferenceCount += 1;
        }
        for (const relationship of v3Relationships) {
          if (relationship.quantification.status === 'quantified') {
            quantifiedRelationshipCount += 1;
            quantifiedBaseValue += relationship.baseValue;
            increment(quantificationMethodCounts, relationship.quantification.method);
            if (relationship.quantification.reliability === 1) fullRelationshipCount += 1;
            if (relationship.quantification.method === 'one-supported-opportunity') {
              directOneOpportunityRelationshipCount += 1;
            }
            if (relationship.quantification.method === 'confirmed-cumulative') {
              confirmedCumulativeRelationshipCount += 1;
            }
          } else {
            unquantifiedRelationshipCount += 1;
            unquantifiedBasePotential += relationship.baseValue;
            increment(unquantifiedReasonCounts, relationship.quantification.reason);
            if (relationship.quantification.reason === 'conditional-opportunity') {
              conditionalOpportunityRelationshipCount += 1;
            }
            if (relationship.quantification.reason === 'joint-chance-behavior-unresolved') {
              unresolvedJointChanceRelationshipCount += 1;
            }
          }
        }
        const compact: CompactFormationComparison = {
          formation: [left.id, vanguard.id, right.id],
          v2Score,
          v3Score,
          delta,
          v2ActiveSynergy:
            v2Rating.breakdown.find((item) => item.label === 'Active Synergy')?.score ?? 0,
          v3ActiveSynergy: activeV3.score,
          v2Placement: v2Placement.placementScore,
          v3Placement: v3Placement.placementScore,
          adjustedUncappedValue: round(activeV3.adjustedUncappedRelationshipValue, 12),
          unquantifiedBasePotential: activeV3.unquantifiedBasePotential,
          explanation: changeExplanation(v2Rating.breakdown[0]?.score ?? 0, activeV3, v2Placement.placementScore, v3Placement.placementScore),
        };
        comparisons.push(compact);
        v3Hash.update(`${stableStringify(hashRow(compact, v3Relationships))}\n`);

        const violations = formationViolations(
          compact,
          v3Relationships,
          v3Placement.candidates.length,
        );
        if (violations.length > 0) {
          invariantFailures.push(`${compact.formation.join('/')}:${violations.join('+')}`);
        }
      }
    }
  }

  v3Scores.sort((left, right) => left - right);
  const tierCalibration = calibrateFormationRatingV3Tiers(v3Scores);
  const deterministicV3NumericHash = v3Hash.digest('hex');
  const deterministicV3Hash = createHash('sha256')
    .update(
      stableStringify({
        contract: FORMATION_RATING_V3_CONTRACT,
        numericScoringHash: deterministicV3NumericHash,
        tierThresholds: FORMATION_RATING_V3_TIER_THRESHOLDS,
      }),
    )
    .digest('hex');
  const sortedComparisons = [...comparisons].sort(
    (left, right) =>
      left.delta - right.delta ||
      left.formation.join('/').localeCompare(right.formation.join('/')),
  );
  const scoreIncreases = sortedComparisons
    .filter((comparison) => comparison.delta > 0)
    .sort(
      (left, right) =>
        right.delta - left.delta ||
        left.formation.join('/').localeCompare(right.formation.join('/')),
    );
  const perDragonAverageDelta = Object.fromEntries(
    [...perDragonDelta.entries()]
      .map(([dragonId, aggregate]) => [
        dragonId,
        round(aggregate.total / aggregate.count, 6),
      ] as const)
      .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0])),
  );
  const reportWithoutHash = {
    auditVersion: FORMATION_RATING_V3_AUDIT_VERSION,
    contracts: {
      v2: 'formation-rating-v2',
      v3: FORMATION_RATING_V3_CONTRACT,
    },
    sourceHashes: {
      registry: registryAudit.deterministicRegistryHash,
      research: researchAudit.deterministicHash,
      v2: EXPECTED_FORMATION_RATING_V2_HASH,
      v3: deterministicV3Hash,
      v3Numeric: deterministicV3NumericHash,
    },
    coverage: {
      dragons: dragons.length,
      unorderedTrios: v3CandidatesByTrio.size,
      orderedFormations,
      failedChecks: invariantFailures.length,
      failedCheckExamples: invariantFailures.slice(0, 20),
    },
    scoreStatistics: {
      minimum: v3Scores[0] ?? 0,
      maximum: v3Scores.at(-1) ?? 0,
      mean: round(v3Scores.reduce((sum, score) => sum + score, 0) / v3Scores.length, 6),
      median: percentile(v3Scores, 0.5),
      activeSynergyDistribution: numericRecord(activeSynergyDistribution),
      placementEffectivenessDistribution: numericRecord(placementDistribution),
      tierCounts: sortedRecord(tierCounts),
      tierTransitions: sortedRecord(tierTransitions),
      scoreDeltaDistribution: numericRecord(scoreDeltaDistribution),
    },
    tierCalibration: {
      oldThresholds: {
        Excellent: 80,
        Strong: 67,
        Solid: 49,
        Developing: 25,
      },
      targetCounts: FORMATION_RATING_V3_TIER_TARGETS,
      selectedThresholds: FORMATION_RATING_V3_TIER_THRESHOLDS,
      derivedThresholds: tierCalibration.thresholds,
      preCalibrationCounts: sortedRecord(preCalibrationTierCounts),
      postCalibrationCounts: tierCalibration.counts,
      individualDeviations: Object.fromEntries(
        Object.entries(tierCalibration.counts).map(([tier, count]) => {
          const target =
            FORMATION_RATING_V3_TIER_TARGETS.individual[
              tier as keyof typeof tierCalibration.counts
            ];
          return [
            tier,
            {
              count: count - target,
              percentage: round(((count - target) / target) * 100, 6),
            },
          ];
        }),
      ),
      cumulativeCounts: tierCalibration.cumulativeCounts,
      cumulativeDeviations: Object.fromEntries(
        Object.entries(tierCalibration.cumulativeCounts).map(([tier, count]) => {
          const target =
            FORMATION_RATING_V3_TIER_TARGETS.cumulative[
              tier as keyof typeof tierCalibration.cumulativeCounts
            ];
          return [
            tier,
            {
              count: count - target,
              percentage: round(((count - target) / target) * 100, 6),
            },
          ];
        }),
      ),
      objective: tierCalibration.objective,
    },
    placementChanges: {
      orderedFormations: formationsWhoseBestArrangementChanges,
      unorderedTrios: trioBestChanges.size,
    },
    reliabilitySummary: {
      quantifiedRelationshipCount,
      unquantifiedRelationshipCount,
      quantifiedBaseValue,
      unquantifiedBasePotential,
      fullRelationshipCount,
      directOneOpportunityRelationshipCount,
      confirmedCumulativeRelationshipCount,
      conditionalOpportunityRelationshipCount,
      unresolvedJointChanceRelationshipCount,
      adjustedRedundancyOrderDifferenceCount,
      quantificationMethodCounts: sortedRecord(quantificationMethodCounts),
      unquantifiedReasonCounts: sortedRecord(unquantifiedReasonCounts),
    },
    behaviorAnalysis: {
      perDragonAverageDelta,
      scoreDistributionCollapsed:
        Object.keys(tierCounts).length < 3 || (tierCounts.Weak ?? 0) / orderedFormations > 0.9,
      scoreIncreaseCount: scoreIncreases.length,
      allIncreasesExplainable: scoreIncreases.every(
        (comparison) => comparison.explanation.length > 0,
      ),
      increasesCausedSolelyByAdjustedRedundancy: scoreIncreases.filter(
        (comparison) =>
          comparison.v3Placement === comparison.v2Placement &&
          comparison.v3ActiveSynergy > comparison.v2ActiveSynergy,
      ).length,
      largestAverageDragonChanges: perDragonAverageDelta,
    },
    largestScoreDecreases: sortedComparisons.slice(0, 20),
    scoreIncreases: scoreIncreases.slice(0, 20),
    representativeVelarCases: [
      summarizeTrio('caraxes/syrax/velar', v2CandidatesByTrio, v3CandidatesByTrio),
      summarizeTrio('sheepstealer/syrax/velar', v2CandidatesByTrio, v3CandidatesByTrio),
      summarizeTrio('kalspire/velar/venator', v2CandidatesByTrio, v3CandidatesByTrio),
    ],
    representativeNonVelarCases: [
      ...sortedComparisons.filter((entry) => !entry.formation.includes('velar')).slice(0, 3),
      ...scoreIncreases.filter((entry) => !entry.formation.includes('velar')).slice(0, 3),
    ],
    reviewConcerns: [
      'Unquantified opportunity and joint-event potential is intentionally visible but not scored.',
      'V3 tier labels are separately calibrated without changing the numeric scoring engine.',
      'The live Formation Builder and all optimizer strategies consume Formation Rating v3 together.',
    ],
  };
  const deterministicAuditHash = createHash('sha256')
    .update(stableStringify(reportWithoutHash))
    .digest('hex');
  return {
    ...reportWithoutHash,
    deterministicAuditHash,
  };
}

function maxSimpleProgression(formation: SimpleFormation): SimpleProgressionByDragonId {
  return Object.fromEntries(
    Object.values(formation)
      .filter((dragonId): dragonId is string => dragonId !== null)
      .map((dragonId) => {
        const dragon = dragonById(dragonId);
        return [
          dragonId,
          {
            starRank: 10,
            dragonLevel: 16,
            combatStats: dragon.stats,
          } satisfies DragonProgression,
        ];
      }),
  );
}

function maxReliabilityProgression(
  formation: SimpleFormation,
): ReliabilityProgressionByDragonId {
  return Object.fromEntries(
    Object.values(formation)
      .filter((dragonId): dragonId is string => dragonId !== null)
      .map((dragonId) => {
        const dragon = dragonById(dragonId);
        const entry: OwnedDragon = {
          dragonId,
          owned: true,
          starRank: 10,
          reignLevel: 16,
          notes: '',
          habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 5])),
        };
        return [dragonId, reliabilityProgressionFromOwnedDragon(dragon, entry)];
      }),
  );
}

function dragonById(dragonId: string): Dragon {
  const dragon = dragons.find((candidate) => candidate.id === dragonId);
  if (!dragon) throw new Error(`Unknown dragon "${dragonId}".`);
  return dragon;
}

function hashRow(
  comparison: CompactFormationComparison,
  relationships: readonly FormationRelationshipV3[],
) {
  return {
    ...comparison,
    adjustedUncappedValue: comparison.adjustedUncappedValue.toFixed(12),
    relationships: relationships.map((relationship) => ({
      id: relationship.id,
      class: relationship.relationshipClass,
      providerSignalId: relationship.selectedProviderSignalId,
      beneficiarySignalId: relationship.selectedBeneficiarySignalId,
      status: relationship.quantification.status,
      method:
        relationship.quantification.status === 'quantified'
          ? relationship.quantification.method
          : null,
      reason:
        relationship.quantification.status === 'unquantified'
          ? relationship.quantification.reason
          : null,
      reliability:
        relationship.quantification.status === 'quantified'
          ? relationship.quantification.reliability.toFixed(12)
          : null,
      adjustedBaseValue: relationship.adjustedBaseValue.toFixed(12),
      adjustedMarginalValue: relationship.adjustedMarginalValue.toFixed(12),
      redundancyRank: relationship.redundancyRank,
      componentIds: relationship.componentIds,
      eventIds: relationship.eventIds,
      probabilityVariantIds: relationship.probabilityVariantIds,
    })),
  };
}

function formationViolations(
  comparison: CompactFormationComparison,
  relationships: readonly FormationRelationshipV3[],
  candidateCount: number,
): string[] {
  return [
    !Number.isFinite(comparison.v3Score) ||
    comparison.v3Score < 0 ||
    comparison.v3Score > 100
      ? 'score-bounds'
      : null,
    candidateCount !== 6 ? 'placement-count' : null,
    relationships.some(
      (relationship) =>
        !Number.isFinite(relationship.adjustedBaseValue) ||
        !Number.isFinite(relationship.adjustedMarginalValue) ||
        relationship.adjustedBaseValue < 0 ||
        relationship.adjustedMarginalValue < 0,
    )
      ? 'adjusted-value-invalid'
      : null,
    relationships.some((relationship) =>
      relationship.candidateTraces.some(
        (trace) =>
          trace.provider.quantification.status === 'unquantified' &&
          trace.provider.quantification.reason === 'no-supported-path' ||
          trace.beneficiary.quantification.status === 'unquantified' &&
          trace.beneficiary.quantification.reason === 'no-supported-path',
      ),
    )
      ? 'active-signal-without-binding'
      : null,
  ].filter((issue): issue is string => issue !== null);
}

function redundancyOrderDiffers(relationships: readonly FormationRelationshipV3[]): boolean {
  return relationships.some((relationship) => {
    const v2Rank = relationship.v2ComparableBaseMarginalValue === relationship.baseValue
      ? 1
      : relationship.v2ComparableBaseMarginalValue === relationship.baseValue / 2
        ? 2
        : 3;
    return relationship.redundancyRank !== v2Rank &&
      !(relationship.redundancyRank >= 3 && v2Rank >= 3);
  });
}

function changeExplanation(
  v2Active: number,
  activeV3: ReturnType<typeof scoreActiveSynergyV3>,
  v2Placement: number,
  v3Placement: number,
): string[] {
  const reasons: string[] = [];
  if (activeV3.score !== v2Active) reasons.push('reliability-adjusted-active-synergy');
  if (v3Placement !== v2Placement) reasons.push('reliability-adjusted-placement');
  if (activeV3.unquantifiedBasePotential > 0) reasons.push('unquantified-potential-excluded');
  if (reasons.length === 0) reasons.push('integer-score-unchanged');
  return reasons;
}

function bestArrangementKeysV2(candidates: readonly PlacementCandidate[]): string {
  const best = Math.max(...candidates.map((candidate) => candidate.activeRelationshipValue));
  return candidates
    .filter((candidate) => candidate.activeRelationshipValue === best)
    .map((candidate) => arrangementKey(candidate.arrangement))
    .sort()
    .join('|');
}

function bestArrangementKeysV3(candidates: readonly PlacementCandidateV3[]): string {
  const best = Math.max(
    ...candidates.map((candidate) => candidate.adjustedUncappedRelationshipValue),
  );
  return candidates
    .filter((candidate) => candidate.adjustedUncappedRelationshipValue === best)
    .map((candidate) => arrangementKey(candidate.arrangement))
    .sort()
    .join('|');
}

function summarizeTrio(
  trioKey: string,
  v2ByTrio: ReadonlyMap<string, PlacementCandidate[]>,
  v3ByTrio: ReadonlyMap<string, PlacementCandidateV3[]>,
) {
  const v2 = v2ByTrio.get(trioKey) ?? [];
  const v3 = v3ByTrio.get(trioKey) ?? [];
  const bestV2 = bestArrangementKeysV2(v2);
  const bestV3 = bestArrangementKeysV3(v3);
  return {
    trio: trioKey.split('/'),
    v2BestArrangements: bestV2.split('|'),
    v3BestArrangements: bestV3.split('|'),
    bestArrangementChanged: bestV2 !== bestV3,
    placements: v3.map((candidate) => {
      const matchingV2 = v2.find(
        (entry) => arrangementKey(entry.arrangement) === arrangementKey(candidate.arrangement),
      );
      const v2Comparison = buildPlacementComparison(candidate.arrangement, [...v2])!;
      const v2Rating = rateFormation({
        formation: candidate.arrangement,
        dragons,
        profiles: simpleSynergyProfiles,
        relationships: matchingV2?.relationships ?? [],
        placementComparison: v2Comparison,
      });
      const comparison = buildPlacementComparisonV3(candidate.arrangement, [...v3])!;
      const active = scoreActiveSynergyV3(candidate.relationships);
      const score = active.score + comparison.placementScore;
      return {
        arrangement: arrangementKey(candidate.arrangement),
        v2BaseRelationshipValue: matchingV2?.activeRelationshipValue ?? null,
        v2ActiveSynergy:
          v2Rating.breakdown.find((item) => item.label === 'Active Synergy')?.score ?? null,
        v2Placement: v2Comparison.placementScore,
        v2Score: v2Rating.score,
        v2Tier: v2Rating.tier,
        v3AdjustedRelationshipValue: round(
          candidate.adjustedUncappedRelationshipValue,
          6,
        ),
        v3ActiveSynergy: active.score,
        v3Placement: comparison.placementScore,
        v3Score: score,
        v3Tier: tierForFormationRatingV3(score),
        unquantifiedBasePotential: candidate.unquantifiedBasePotential,
        selectedContributions: candidate.relationships
          .filter((relationship) => relationship.adjustedMarginalValue > 0)
          .map((relationship) => ({
            id: relationship.id,
            value: round(relationship.adjustedMarginalValue, 6),
          })),
        unquantifiedRelationships: candidate.relationships
          .filter((relationship) => relationship.quantification.status === 'unquantified')
          .map((relationship) => ({
            id: relationship.id,
            reason:
              relationship.quantification.status === 'unquantified'
                ? relationship.quantification.reason
                : null,
          })),
      };
    }),
  };
}

function arrangementKey(arrangement: {
  'left-flank': string;
  vanguard: string;
  'right-flank': string;
}): string {
  return `${arrangement['left-flank']}/${arrangement.vanguard}/${arrangement['right-flank']}`;
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function sortedRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function numericRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => Number(left) - Number(right)),
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortKeys(entry)]),
  );
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
