import type { DragonRarity } from '../models/dragon';
import type {
  OptimizerFormationCandidate,
  FlexiblePowerAwareObjective,
  OptimizerRosterDragon,
  RosterOptimizerObjective,
} from './rosterOptimizerTypes';

export interface FlexibleStableFaceResult {
  selectedIndices: number[];
  nodesVisited: number;
}

/**
 * Enumerates the already-proven balanced numeric optimal face in stable-key
 * order. The first feasible exact reconstruction minimizes the sorted
 * stable-candidate-key sequence without exposing large radix coefficients to
 * floating-point MILP objective reporting.
 */
export function solveFlexibleStableFace({
  candidates,
  target,
  formationCount,
  shouldCancel,
}: {
  candidates: readonly OptimizerFormationCandidate[];
  target: FlexiblePowerAwareObjective;
  formationCount: number;
  shouldCancel?: () => boolean;
}): FlexibleStableFaceResult | null {
  const powerCounts = countValues(target.ascendingEstimatedPowerUnits);
  const ratingCounts = countValues(target.ascendingRatingVector);
  const selected: number[] = [];
  let nodesVisited = 0;

  const visit = (
    start: number,
    usedMask: bigint,
    powersRemaining: Map<number, number>,
    ratingsRemaining: Map<number, number>,
    relationshipRemaining: number,
    relationshipCountRemaining: number,
  ): boolean => {
    nodesVisited += 1;
    if ((nodesVisited & 1023) === 0 && shouldCancel?.()) return false;
    const slots = formationCount - selected.length;
    if (slots === 0) {
      return (
        relationshipRemaining === 0 &&
        relationshipCountRemaining === 0 &&
        [...powersRemaining.values()].every((count) => count === 0) &&
        [...ratingsRemaining.values()].every((count) => count === 0)
      );
    }
    for (let index = start; index <= candidates.length - slots; index += 1) {
      const candidate = candidates[index]!;
      if ((candidate.dragonMask & usedMask) !== 0n) continue;
      const powerUnits = candidate.estimatedPowerUnits;
      if (!Number.isSafeInteger(powerUnits)) continue;
      const powerCount = powersRemaining.get(powerUnits!) ?? 0;
      const ratingCount = ratingsRemaining.get(candidate.rating) ?? 0;
      if (powerCount === 0 || ratingCount === 0) continue;
      if (candidate.adjustedRelationshipValueUnits > relationshipRemaining) continue;
      if (candidate.activeRelationshipCount > relationshipCountRemaining) continue;

      const nextPowers = new Map(powersRemaining);
      nextPowers.set(powerUnits!, powerCount - 1);
      const nextRatings = new Map(ratingsRemaining);
      nextRatings.set(candidate.rating, ratingCount - 1);
      selected.push(index);
      if (visit(
        index + 1,
        usedMask | candidate.dragonMask,
        nextPowers,
        nextRatings,
        relationshipRemaining - candidate.adjustedRelationshipValueUnits,
        relationshipCountRemaining - candidate.activeRelationshipCount,
      )) {
        return true;
      }
      selected.pop();
    }
    return false;
  };

  return visit(
    0,
    0n,
    powerCounts,
    ratingCounts,
    target.totalRelationshipValueUnits,
    target.totalActiveRelationships,
  )
    ? { selectedIndices: [...selected], nodesVisited }
    : null;
}
import type { PrimaryPowerCutoff } from './rosterOptimizerPower';

export interface PrimaryBackupStableFaceResult {
  primaryIndices: number[];
  backupIndices: number[];
  nodesVisited: number;
}

interface WaveTarget {
  objective: RosterOptimizerObjective;
  totalPowerUnits?: number;
  requireRarity: boolean;
  cutoff?: PrimaryPowerCutoff;
}

/**
 * Exact lexicographic solver on a numeric-optimal Primary/Backup face.
 *
 * The MILP has already proven every numeric objective. This search enumerates
 * candidate sets in stable-key order, accepts only exact reconstructions of
 * those fixed objectives, and returns the first jointly feasible pair.
 */
export function solvePrimaryBackupStableFace({
  candidates,
  eligibleDragons,
  primaryTarget,
  backupTarget,
  formationsPerWave,
  primaryPowerUnits,
  backupPowerUnits,
  primaryCutoff,
}: {
  candidates: readonly OptimizerFormationCandidate[];
  eligibleDragons: readonly OptimizerRosterDragon[];
  primaryTarget: RosterOptimizerObjective;
  backupTarget: RosterOptimizerObjective;
  formationsPerWave: number;
  primaryPowerUnits?: number;
  backupPowerUnits?: number;
  primaryCutoff?: PrimaryPowerCutoff;
}): PrimaryBackupStableFaceResult | null {
  const rarityByDragonId = new Map(
    eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
  );
  const bitByDragonId = new Map(
    [...new Set(eligibleDragons.map((dragon) => dragon.dragonId))]
      .sort()
      .map((dragonId, index) => [dragonId, 1n << BigInt(index)]),
  );
  const candidateMasks = candidates.map((candidate) =>
    candidate.dragonIds.reduce(
      (mask, dragonId) => mask | (bitByDragonId.get(dragonId) ?? 0n),
      0n,
    ),
  );
  const rarityCounts = candidates.map((candidate) =>
    candidateRarityCounts(candidate, rarityByDragonId),
  );
  let nodesVisited = 0;
  let answer: PrimaryBackupStableFaceResult | null = null;

  searchWave({
    candidates,
    candidateMasks,
    rarityCounts,
    formationsPerWave,
    excludedMask: 0n,
    target: {
      objective: primaryTarget,
      totalPowerUnits: primaryPowerUnits,
      requireRarity: primaryPowerUnits === undefined,
      cutoff: primaryCutoff,
    },
    onMatch: (primaryIndices, primaryMask) => {
      const backupIndices = searchWave({
        candidates,
        candidateMasks,
        rarityCounts,
        formationsPerWave,
        excludedMask: primaryMask,
        target: {
          objective: backupTarget,
          totalPowerUnits: backupPowerUnits,
          requireRarity: backupPowerUnits === undefined,
        },
        onMatch: (indices) => {
          answer = {
            primaryIndices: [...primaryIndices],
            backupIndices: [...indices],
            nodesVisited,
          };
          return true;
        },
        onNode: () => {
          nodesVisited += 1;
        },
      });
      return backupIndices || answer !== null;
    },
    onNode: () => {
      nodesVisited += 1;
    },
  });
  return answer;
}

function searchWave({
  candidates,
  candidateMasks,
  rarityCounts,
  formationsPerWave,
  excludedMask,
  target,
  onMatch,
  onNode,
}: {
  candidates: readonly OptimizerFormationCandidate[];
  candidateMasks: readonly bigint[];
  rarityCounts: readonly RarityCounts[];
  formationsPerWave: number;
  excludedMask: bigint;
  target: WaveTarget;
  onMatch: (indices: readonly number[], mask: bigint) => boolean;
  onNode: () => void;
}): boolean {
  const selected: number[] = [];
  const ratingCounts = countValues(target.objective.ascendingRatingVector);
  const requiredDragonIds = new Set(target.cutoff?.aboveCutoffDragonIds ?? []);
  const forbiddenDragonIds = new Set(target.cutoff?.belowCutoffDragonIds ?? []);
  const tiedDragonIds = new Set(target.cutoff?.cutoffTiedDragonIds ?? []);

  const visit = (
    start: number,
    usedMask: bigint,
    ratingsRemaining: Map<number, number>,
    legendaryRemaining: number,
    epicRemaining: number,
    rareRemaining: number,
    powerRemaining: number | undefined,
    relationshipRemaining: number,
    relationshipCountRemaining: number,
  ): boolean => {
    onNode();
    const slots = formationsPerWave - selected.length;
    if (slots === 0) {
      if (
        [...ratingsRemaining.values()].some((count) => count !== 0) ||
        relationshipRemaining !== 0 ||
        relationshipCountRemaining !== 0 ||
        (target.requireRarity &&
          (legendaryRemaining !== 0 || epicRemaining !== 0 || rareRemaining !== 0)) ||
        (powerRemaining !== undefined && powerRemaining !== 0)
      ) {
        return false;
      }
      const dragonIds = new Set(
        selected.flatMap((index) => candidates[index]!.dragonIds),
      );
      if ([...requiredDragonIds].some((dragonId) => !dragonIds.has(dragonId))) return false;
      if ([...forbiddenDragonIds].some((dragonId) => dragonIds.has(dragonId))) return false;
      if (
        target.cutoff &&
        [...tiedDragonIds].filter((dragonId) => dragonIds.has(dragonId)).length !==
          target.cutoff.requiredCutoffTieCount
      ) {
        return false;
      }
      return onMatch(selected, usedMask);
    }

    for (let index = start; index <= candidates.length - slots; index += 1) {
      const candidate = candidates[index]!;
      const candidateMask = candidateMasks[index]!;
      if ((candidateMask & (usedMask | excludedMask)) !== 0n) continue;
      if (candidate.dragonIds.some((dragonId) => forbiddenDragonIds.has(dragonId))) continue;
      const ratingCount = ratingsRemaining.get(candidate.rating) ?? 0;
      if (ratingCount === 0) continue;
      const rarity = rarityCounts[index]!;
      if (
        target.requireRarity &&
        (rarity.legendary > legendaryRemaining ||
          rarity.epic > epicRemaining ||
          rarity.rare > rareRemaining)
      ) {
        continue;
      }
      const candidatePower = candidate.estimatedPowerUnits ?? 0;
      if (powerRemaining !== undefined && candidatePower > powerRemaining) continue;
      if (candidate.adjustedRelationshipValueUnits > relationshipRemaining) continue;
      if (candidate.activeRelationshipCount > relationshipCountRemaining) continue;

      const nextRatings = new Map(ratingsRemaining);
      nextRatings.set(candidate.rating, ratingCount - 1);
      selected.push(index);
      if (
        visit(
          index + 1,
          usedMask | candidateMask,
          nextRatings,
          legendaryRemaining - rarity.legendary,
          epicRemaining - rarity.epic,
          rareRemaining - rarity.rare,
          powerRemaining === undefined ? undefined : powerRemaining - candidatePower,
          relationshipRemaining - candidate.adjustedRelationshipValueUnits,
          relationshipCountRemaining - candidate.activeRelationshipCount,
        )
      ) {
        return true;
      }
      selected.pop();
    }
    return false;
  };

  return visit(
    0,
    0n,
    ratingCounts,
    target.objective.rarityPriority.legendaryCount,
    target.objective.rarityPriority.epicCount,
    target.objective.rarityPriority.rareCount,
    target.totalPowerUnits,
    target.objective.totalRelationshipValueUnits,
    target.objective.totalActiveRelationships,
  );
}

interface RarityCounts {
  legendary: number;
  epic: number;
  rare: number;
}

function candidateRarityCounts(
  candidate: OptimizerFormationCandidate,
  rarityByDragonId: ReadonlyMap<string, DragonRarity>,
): RarityCounts {
  const result: RarityCounts = { legendary: 0, epic: 0, rare: 0 };
  candidate.dragonIds.forEach((dragonId) => {
    const rarity = rarityByDragonId.get(dragonId);
    if (rarity === 'Legendary') result.legendary += 1;
    if (rarity === 'Epic') result.epic += 1;
    if (rarity === 'Rare') result.rare += 1;
  });
  return result;
}

function countValues(values: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
}
