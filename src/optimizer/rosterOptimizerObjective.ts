import type { DragonRarity } from '../models/dragon';
import type { EstimatedDragonPower } from '../power/estimatedDragonPower';
import { candidatePowerUnits } from './rosterOptimizerPower';
import type {
  OptimizerFormationCandidate,
  BestOverallScoreBreakdown,
  FlexiblePowerAwareObjective,
  OptimizerAllocationMode,
  PowerAwarePrimaryBackupOptimizerObjective,
  PrimaryBackupOptimizerObjective,
  RosterOptimizerObjective,
  RosterRarityPriority,
} from './rosterOptimizerTypes';

/** Negative means `left` is preferred, matching Array#sort. */
export function compareStrongestFirstCandidates(
  left: OptimizerFormationCandidate,
  right: OptimizerFormationCandidate,
): number {
  return (
    requiredPowerUnits(right) - requiredPowerUnits(left) ||
    right.rating - left.rating ||
    right.adjustedRelationshipValueUnits - left.adjustedRelationshipValueUnits ||
    right.activeRelationshipCount - left.activeRelationshipCount ||
    left.stableCandidateKey.localeCompare(right.stableCandidateKey)
  );
}

/** Positive means `left` is better under the unified v5 objective. */
export function compareFlexiblePowerAwareObjectives(
  left: FlexiblePowerAwareObjective,
  right: FlexiblePowerAwareObjective,
): number {
  return (
    compareNumberVectors(
      left.ascendingEstimatedPowerUnits,
      right.ascendingEstimatedPowerUnits,
    ) ||
    compareNumberVectors(left.ascendingRatingVector, right.ascendingRatingVector) ||
    left.totalRelationshipValueUnits - right.totalRelationshipValueUnits ||
    left.totalActiveRelationships - right.totalActiveRelationships ||
    right.stableSolutionKey.localeCompare(left.stableSolutionKey)
  );
}

export function flexiblePowerAwareObjectiveForCandidates(
  candidates: OptimizerFormationCandidate[],
  allocationMode: OptimizerAllocationMode,
  bestOverallScoreBreakdowns?: readonly BestOverallScoreBreakdown[],
): FlexiblePowerAwareObjective {
  const ascendingEstimatedPowerUnits = candidates
    .map(requiredPowerUnits)
    .sort((left, right) => left - right);
  const ascendingRatingVector = candidates
    .map((candidate) => candidate.rating)
    .sort((left, right) => left - right);
  const totalRelationshipValueUnits = candidates.reduce(
    (total, candidate) => total + candidate.adjustedRelationshipValueUnits,
    0,
  );
  return {
    allocationMode,
    ...(bestOverallScoreBreakdowns
      ? { bestOverallScoreUnits: bestOverallScoreBreakdowns.map((score) => score.overallScoreUnits) }
      : {}),
    ascendingEstimatedPowerUnits,
    ascendingEstimatedPowerVector: ascendingEstimatedPowerUnits.map(
      (powerUnits) => powerUnits * 10,
    ),
    ascendingRatingVector,
    totalRelationshipValue: candidates.reduce(
      (total, candidate) => total + candidate.adjustedRelationshipValue,
      0,
    ),
    totalRelationshipValueUnits,
    totalActiveRelationships: candidates.reduce(
      (total, candidate) => total + candidate.activeRelationshipCount,
      0,
    ),
    stableSolutionKey: candidates
      .map((candidate) => candidate.stableCandidateKey)
      .sort()
      .join('||'),
  };
}

function requiredPowerUnits(candidate: OptimizerFormationCandidate): number {
  if (!Number.isSafeInteger(candidate.estimatedPowerUnits)) {
    throw new Error(`Candidate ${candidate.stableCandidateKey} is missing Estimated Power units.`);
  }
  return candidate.estimatedPowerUnits!;
}

export function compareRarityPriority(
  left: RosterRarityPriority,
  right: RosterRarityPriority,
): number {
  return (
    left.legendaryCount - right.legendaryCount ||
    left.epicCount - right.epicCount
  );
}

/**
 * Positive means `left` is better. Rarity is strictly lexicographic, followed
 * by the complete documented allocation objective. The final canonical key is
 * minimized so exact ties always resolve to the same solution.
 */
export function compareRosterOptimizerObjectives(
  left: RosterOptimizerObjective,
  right: RosterOptimizerObjective,
): number {
  return (
    compareRarityPriority(left.rarityPriority, right.rarityPriority) ||
    left.totalRating - right.totalRating ||
    left.minimumRating - right.minimumRating ||
    compareNumberVectors(left.ascendingRatingVector, right.ascendingRatingVector) ||
    left.totalRelationshipValueUnits - right.totalRelationshipValueUnits ||
    left.totalActiveRelationships - right.totalActiveRelationships ||
    right.stableSolutionKey.localeCompare(left.stableSolutionKey)
  );
}

/**
 * Positive means `left` is better. Primary rarity and quality dominate every
 * Backup value. Stable keys are intentionally deferred until both waves'
 * numeric objectives have been compared.
 */
export function comparePrimaryBackupOptimizerObjectives(
  left: PrimaryBackupOptimizerObjective,
  right: PrimaryBackupOptimizerObjective,
): number {
  return (
    compareRarityPriority(left.primary.rarityPriority, right.primary.rarityPriority) ||
    compareWaveQuality(left.primary, right.primary) ||
    compareRarityPriority(left.backup.rarityPriority, right.backup.rarityPriority) ||
    compareWaveQuality(left.backup, right.backup) ||
    right.primary.stableSolutionKey.localeCompare(left.primary.stableSolutionKey) ||
    right.backup.stableSolutionKey.localeCompare(left.backup.stableSolutionKey) ||
    right.stableSolutionKey.localeCompare(left.stableSolutionKey)
  );
}

/** Positive means `left` is better under the exact Power-Aware hierarchy. */
export function comparePowerAwarePrimaryBackupOptimizerObjectives(
  left: PowerAwarePrimaryBackupOptimizerObjective,
  right: PowerAwarePrimaryBackupOptimizerObjective,
): number {
  return (
    left.primary.totalEstimatedPower - right.primary.totalEstimatedPower ||
    compareWaveQuality(left.primary, right.primary) ||
    left.backup.totalEstimatedPower - right.backup.totalEstimatedPower ||
    compareWaveQuality(left.backup, right.backup) ||
    right.primary.stableSolutionKey.localeCompare(left.primary.stableSolutionKey) ||
    right.backup.stableSolutionKey.localeCompare(left.backup.stableSolutionKey) ||
    right.stableSolutionKey.localeCompare(left.stableSolutionKey)
  );
}

export function primaryBackupObjectiveForCandidates(
  primaryCandidates: OptimizerFormationCandidate[],
  backupCandidates: OptimizerFormationCandidate[],
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): PrimaryBackupOptimizerObjective {
  const primary = objectiveForCandidates(primaryCandidates, rarityByDragonId);
  const backup = objectiveForCandidates(backupCandidates, rarityByDragonId);
  return {
    strategy: 'primary-five-backup-five',
    primary,
    backup,
    combinedTotalRating: primary.totalRating + backup.totalRating,
    combinedRelationshipValue:
      primary.totalRelationshipValue + backup.totalRelationshipValue,
    combinedRelationshipValueUnits:
      primary.totalRelationshipValueUnits + backup.totalRelationshipValueUnits,
    combinedActiveRelationships:
      primary.totalActiveRelationships + backup.totalActiveRelationships,
    stableSolutionKey: `primary:${primary.stableSolutionKey}||backup:${backup.stableSolutionKey}`,
  };
}

export function powerAwarePrimaryBackupObjectiveForCandidates(
  primaryCandidates: OptimizerFormationCandidate[],
  backupCandidates: OptimizerFormationCandidate[],
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>,
): PowerAwarePrimaryBackupOptimizerObjective {
  const primaryBase = objectiveForCandidates(primaryCandidates, rarityByDragonId);
  const backupBase = objectiveForCandidates(backupCandidates, rarityByDragonId);
  const primary = {
    ...primaryBase,
    totalEstimatedPower: primaryCandidates.reduce(
      (total, candidate) => total + candidatePowerUnits(candidate, estimatesByDragonId) * 10,
      0,
    ),
  };
  const backup = {
    ...backupBase,
    totalEstimatedPower: backupCandidates.reduce(
      (total, candidate) => total + candidatePowerUnits(candidate, estimatesByDragonId) * 10,
      0,
    ),
  };
  return {
    strategy: 'power-aware-primary-five-backup-five',
    primary,
    backup,
    combinedTotalRating: primary.totalRating + backup.totalRating,
    combinedEstimatedPower: primary.totalEstimatedPower + backup.totalEstimatedPower,
    combinedRelationshipValue:
      primary.totalRelationshipValue + backup.totalRelationshipValue,
    combinedRelationshipValueUnits:
      primary.totalRelationshipValueUnits + backup.totalRelationshipValueUnits,
    combinedActiveRelationships:
      primary.totalActiveRelationships + backup.totalActiveRelationships,
    stableSolutionKey: `primary:${primary.stableSolutionKey}||backup:${backup.stableSolutionKey}`,
  };
}

export function objectiveForCandidates(
  candidates: OptimizerFormationCandidate[],
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): RosterOptimizerObjective {
  const ratings = candidates.map((candidate) => candidate.rating).sort((a, b) => a - b);
  const dragonIds = [...new Set(candidates.flatMap((candidate) => candidate.dragonIds))];
  const rarityPriority = rarityPriorityForDragonIds(dragonIds, rarityByDragonId);
  return {
    rarityPriority,
    totalRating: ratings.reduce((total, rating) => total + rating, 0),
    minimumRating: ratings[0] ?? 0,
    ascendingRatingVector: ratings,
    totalRelationshipValue: candidates.reduce(
      (total, candidate) => total + candidate.adjustedRelationshipValue,
      0,
    ),
    totalRelationshipValueUnits: candidates.reduce(
      (total, candidate) => total + candidate.adjustedRelationshipValueUnits,
      0,
    ),
    totalActiveRelationships: candidates.reduce(
      (total, candidate) => total + candidate.activeRelationshipCount,
      0,
    ),
    stableSolutionKey: candidates
      .map((candidate) => candidate.stableCandidateKey)
      .sort()
      .join('||'),
  };
}

export function rarityPriorityForDragonIds(
  dragonIds: Iterable<string>,
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): RosterRarityPriority {
  const priority: RosterRarityPriority = {
    legendaryCount: 0,
    epicCount: 0,
    rareCount: 0,
  };
  for (const dragonId of dragonIds) {
    const rarity = rarityByDragonId.get(dragonId);
    if (rarity === 'Legendary') priority.legendaryCount += 1;
    if (rarity === 'Epic') priority.epicCount += 1;
    if (rarity === 'Rare') priority.rareCount += 1;
  }
  return priority;
}

export function compareNumberVectors(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function compareWaveQuality(
  left: RosterOptimizerObjective,
  right: RosterOptimizerObjective,
): number {
  return (
    left.totalRating - right.totalRating ||
    left.minimumRating - right.minimumRating ||
    compareNumberVectors(left.ascendingRatingVector, right.ascendingRatingVector) ||
    left.totalRelationshipValueUnits - right.totalRelationshipValueUnits ||
    left.totalActiveRelationships - right.totalActiveRelationships
  );
}
