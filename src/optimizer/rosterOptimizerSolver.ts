import type { DragonRarity } from '../models/dragon';
import {
  compareRarityPriority,
  compareRosterOptimizerObjectives,
  objectiveForCandidates,
  rarityPriorityForDragonIds,
} from './rosterOptimizerObjective';
import {
  RosterOptimizerCancelledError,
  OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type RosterOptimizerObjective,
  type RosterOptimizerSolverResult,
  type RosterRarityPriority,
} from './rosterOptimizerTypes';

export interface RosterOptimizerSolverOptions {
  targetFormationCount?: number;
  useSafePruning?: boolean;
  shouldCancel?: () => boolean;
}

interface IndexedCandidate {
  candidate: OptimizerFormationCandidate;
  mask: bigint;
  indices: [number, number, number];
}

interface SearchCounters {
  nodesVisited: number;
  branchesPruned: number;
}

const rarityRank: Record<DragonRarity, number> = {
  Legendary: 2,
  Epic: 1,
  Rare: 0,
};

/**
 * Exact branch-and-bound set packing. Every leaf is a complete allocation;
 * safe optimistic bounds may discard only branches that cannot equal the
 * incumbent. Exhaustion of the remaining tree is the optimality proof.
 */
export function solveRosterOptimizerCandidates(
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  options: RosterOptimizerSolverOptions = {},
): RosterOptimizerSolverResult | null {
  const targetFormationCount = options.targetFormationCount ?? 10;
  const requiredDragonCount = targetFormationCount * 3;
  const useSafePruning = options.useSafePruning ?? true;
  const sortedDragons = [...eligibleDragons].sort((left, right) =>
    left.dragonId.localeCompare(right.dragonId),
  );
  if (targetFormationCount <= 0 || sortedDragons.length < requiredDragonCount) {
    return null;
  }

  const indexByDragonId = new Map(
    sortedDragons.map((dragon, index) => [dragon.dragonId, index]),
  );
  const rarityByDragonId = new Map(
    sortedDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
  );
  const indexedCandidates = candidates
    .flatMap((candidate): IndexedCandidate[] => {
      const indices = candidate.dragonIds.map((dragonId) => indexByDragonId.get(dragonId));
      if (indices.some((index) => index === undefined) || new Set(indices).size !== 3) {
        return [];
      }
      const typedIndices = indices as [number, number, number];
      const mask = typedIndices.reduce(
        (value, index) => value | (1n << BigInt(index)),
        0n,
      );
      return [{ candidate, mask, indices: typedIndices }];
    })
    .sort(compareIndexedCandidates);
  const candidatesByDragon = sortedDragons.map((): IndexedCandidate[] => []);
  for (const candidate of indexedCandidates) {
    forEachBit(candidate.mask, (index) => candidatesByDragon[index]!.push(candidate));
  }

  const fullMask = sortedDragons.reduce(
    (mask, _dragon, index) => mask | (1n << BigInt(index)),
    0n,
  );
  const counters: SearchCounters = { nodesVisited: 0, branchesPruned: 0 };
  const memo = new Map<string, RosterOptimizerObjective>();
  const searchState: {
    incumbent: {
      selected: OptimizerFormationCandidate[];
      objective: RosterOptimizerObjective;
    } | null;
  } = { incumbent: null };
  const selected: OptimizerFormationCandidate[] = [];

  const search = (remainingMask: bigint): void => {
    counters.nodesVisited += 1;
    if ((counters.nodesVisited & 1023) === 0 && options.shouldCancel?.()) {
      throw new RosterOptimizerCancelledError();
    }

    const formationsRemaining = targetFormationCount - selected.length;
    const remainingDragonCount = popcount(remainingMask);
    if (formationsRemaining === 0) {
      const objective = objectiveForCandidates(selected, rarityByDragonId);
      if (
        !searchState.incumbent ||
        compareRosterOptimizerObjectives(objective, searchState.incumbent.objective) > 0
      ) {
        searchState.incumbent = { selected: [...selected], objective };
      }
      return;
    }
    if (remainingDragonCount < formationsRemaining * 3) {
      counters.branchesPruned += 1;
      return;
    }

    const partialObjective = objectiveForCandidates(selected, rarityByDragonId);
    const memoKey = `${remainingMask.toString(16)}:${formationsRemaining}`;
    const memoized = memo.get(memoKey);
    if (memoized && compareRosterOptimizerObjectives(memoized, partialObjective) >= 0) {
      counters.branchesPruned += 1;
      return;
    }
    memo.set(memoKey, partialObjective);

    if (
      searchState.incumbent &&
      useSafePruning &&
      cannotBeatIncumbent({
        remainingMask,
        formationsRemaining,
        selected,
        indexedCandidates,
        sortedDragons,
        rarityByDragonId,
        incumbent: searchState.incumbent.objective,
      })
    ) {
      counters.branchesPruned += 1;
      return;
    }

    const pivot = selectPivot(remainingMask, sortedDragons);
    if (pivot === null) {
      counters.branchesPruned += 1;
      return;
    }

    const pivotBit = 1n << BigInt(pivot);
    const mayLeaveUnused = remainingDragonCount > formationsRemaining * 3;
    const pivotRarity = sortedDragons[pivot]!.rarity;
    if (mayLeaveUnused && pivotRarity === lowestSelectableRarity(remainingMask, sortedDragons)) {
      search(remainingMask & ~pivotBit);
    }

    const branches = candidatesByDragon[pivot]!.filter(
      (candidate) => (candidate.mask & remainingMask) === candidate.mask,
    );
    for (const branch of branches) {
      selected.push(branch.candidate);
      search(remainingMask & ~branch.mask);
      selected.pop();
    }

    if (mayLeaveUnused && pivotRarity !== lowestSelectableRarity(remainingMask, sortedDragons)) {
      search(remainingMask & ~pivotBit);
    }
  };

  if (options.shouldCancel?.()) {
    throw new RosterOptimizerCancelledError();
  }
  search(fullMask);
  if (!searchState.incumbent) return null;
  return {
    optimal: true,
    selectedCandidates: searchState.incumbent.selected,
    objective: searchState.incumbent.objective,
    nodesVisited: counters.nodesVisited,
    branchesPruned: counters.branchesPruned,
    cacheEntries: memo.size,
  };
}

function cannotBeatIncumbent({
  remainingMask,
  formationsRemaining,
  selected,
  indexedCandidates,
  sortedDragons,
  rarityByDragonId,
  incumbent,
}: {
  remainingMask: bigint;
  formationsRemaining: number;
  selected: OptimizerFormationCandidate[];
  indexedCandidates: IndexedCandidate[];
  sortedDragons: OptimizerRosterDragon[];
  rarityByDragonId: ReadonlyMap<string, DragonRarity>;
  incumbent: RosterOptimizerObjective;
}): boolean {
  const optimisticRarity = addRarityPriority(
    rarityPriorityForDragonIds(
      selected.flatMap((candidate) => candidate.dragonIds),
      rarityByDragonId,
    ),
    maximumRemainingRarityPriority(
      remainingMask,
      formationsRemaining * 3,
      sortedDragons,
    ),
  );
  const rarityComparison = compareRarityPriority(optimisticRarity, incumbent.rarityPriority);
  if (rarityComparison < 0) return true;
  if (rarityComparison > 0) return false;

  const topRatings: number[] = [];
  const topRelationshipValues: number[] = [];
  const topRelationshipCounts: number[] = [];
  const applicableCandidates: IndexedCandidate[] = [];
  const applicableByDragon = sortedDragons.map((): IndexedCandidate[] => []);
  const maximumRatingByDragon = sortedDragons.map(() => 0);
  const maximumRelationshipValueByDragon = sortedDragons.map(() => 0);
  const maximumRelationshipCountByDragon = sortedDragons.map(() => 0);
  for (const indexed of indexedCandidates) {
    if ((indexed.mask & remainingMask) !== indexed.mask) continue;
    applicableCandidates.push(indexed);
    indexed.indices.forEach((index) => applicableByDragon[index]!.push(indexed));
    insertTop(topRatings, indexed.candidate.rating, formationsRemaining);
    insertTop(
      topRelationshipValues,
      indexed.candidate.adjustedRelationshipValueUnits,
      formationsRemaining,
    );
    insertTop(
      topRelationshipCounts,
      indexed.candidate.activeRelationshipCount,
      formationsRemaining,
    );
    forEachBit(indexed.mask, (index) => {
      maximumRatingByDragon[index] = Math.max(
        maximumRatingByDragon[index]!,
        indexed.candidate.rating,
      );
      maximumRelationshipValueByDragon[index] = Math.max(
        maximumRelationshipValueByDragon[index]!,
        indexed.candidate.adjustedRelationshipValueUnits,
      );
      maximumRelationshipCountByDragon[index] = Math.max(
        maximumRelationshipCountByDragon[index]!,
        indexed.candidate.activeRelationshipCount,
      );
    });
  }
  if (topRatings.length < formationsRemaining) return true;

  const partial = objectiveForCandidates(selected, rarityByDragonId);
  const optimisticRatings = [
    ...partial.ascendingRatingVector,
    ...topRatings,
  ].sort((left, right) => left - right);
  const optimistic: RosterOptimizerObjective = {
    rarityPriority: optimisticRarity,
    totalRating: partial.totalRating + Math.min(
      topRatings.reduce(sum, 0),
      perDragonUpperBound(maximumRatingByDragon, remainingMask, formationsRemaining),
      dualSetPackingUpperBound(
        applicableCandidates,
        applicableByDragon,
        remainingMask,
        formationsRemaining,
        (candidate) => candidate.rating,
      ),
    ),
    minimumRating: optimisticRatings[0] ?? 0,
    ascendingRatingVector: optimisticRatings,
    totalRelationshipValue:
      partial.totalRelationshipValue + Math.min(
        topRelationshipValues.reduce(sum, 0) / OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
        perDragonUpperBound(
          maximumRelationshipValueByDragon,
          remainingMask,
          formationsRemaining,
        ) / OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
      ),
    totalRelationshipValueUnits:
      partial.totalRelationshipValueUnits + Math.min(
        topRelationshipValues.reduce(sum, 0),
        perDragonUpperBound(
          maximumRelationshipValueByDragon,
          remainingMask,
          formationsRemaining,
        ),
      ),
    totalActiveRelationships:
      partial.totalActiveRelationships + Math.min(
        topRelationshipCounts.reduce(sum, 0),
        perDragonUpperBound(
          maximumRelationshipCountByDragon,
          remainingMask,
          formationsRemaining,
        ),
      ),
    stableSolutionKey: '',
  };
  return compareRosterOptimizerObjectives(optimistic, incumbent) < 0;
}

function selectPivot(
  remainingMask: bigint,
  dragons: OptimizerRosterDragon[],
): number | null {
  let bestIndex: number | null = null;
  forEachBit(remainingMask, (index) => {
    if (
      bestIndex === null ||
      rarityRank[dragons[index]!.rarity] < rarityRank[dragons[bestIndex]!.rarity] ||
      (
        dragons[index]!.rarity === dragons[bestIndex]!.rarity &&
        dragons[index]!.dragonId.localeCompare(dragons[bestIndex]!.dragonId) < 0
      )
    ) {
      bestIndex = index;
    }
  });
  return bestIndex;
}

function perDragonUpperBound(
  maximumByDragon: number[],
  remainingMask: bigint,
  formationsRemaining: number,
): number {
  const values: number[] = [];
  forEachBit(remainingMask, (index) => values.push(maximumByDragon[index]!));
  values.sort((left, right) => right - left);
  return Math.floor(
    values.slice(0, formationsRemaining * 3).reduce(sum, 0) / 3,
  );
}

/**
 * Builds a feasible dual for the weighted three-set relaxation. Each update
 * preserves y[a] + y[b] + y[c] >= candidate weight, so the sum of potentials
 * on any 3k used dragons bounds every k-formation completion.
 */
function dualSetPackingUpperBound(
  candidates: IndexedCandidate[],
  candidatesByDragon: IndexedCandidate[][],
  remainingMask: bigint,
  formationsRemaining: number,
  weight: (candidate: OptimizerFormationCandidate) => number,
): number {
  const potentials: number[] = [];
  const remainingIndices: number[] = [];
  forEachBit(remainingMask, (index) => {
    remainingIndices.push(index);
    potentials[index] = 0;
  });
  for (const indexed of candidates) {
    const initial = weight(indexed.candidate) / 3;
    for (const index of indexed.indices) {
      potentials[index] = Math.max(potentials[index] ?? 0, initial);
    }
  }
  for (let sweep = 0; sweep < 3; sweep += 1) {
    for (const index of remainingIndices) {
      let required = 0;
      for (const indexed of candidatesByDragon[index]!) {
        const otherPotential = indexed.indices.reduce(
          (total, candidateIndex) =>
            total + (candidateIndex === index ? 0 : potentials[candidateIndex] ?? 0),
          0,
        );
        required = Math.max(required, weight(indexed.candidate) - otherPotential);
      }
      potentials[index] = Math.max(0, required);
    }
  }
  const usablePotentials = remainingIndices
    .map((index) => potentials[index] ?? 0)
    .sort((left, right) => right - left)
    .slice(0, formationsRemaining * 3);
  return Math.floor(usablePotentials.reduce(sum, 0) + 1e-7);
}

function maximumRemainingRarityPriority(
  remainingMask: bigint,
  count: number,
  dragons: OptimizerRosterDragon[],
): RosterRarityPriority {
  const rarities: DragonRarity[] = [];
  forEachBit(remainingMask, (index) => rarities.push(dragons[index]!.rarity));
  rarities.sort((left, right) => rarityRank[right] - rarityRank[left]);
  const priority: RosterRarityPriority = {
    legendaryCount: 0,
    epicCount: 0,
    rareCount: 0,
  };
  for (const rarity of rarities.slice(0, count)) {
    if (rarity === 'Legendary') priority.legendaryCount += 1;
    if (rarity === 'Epic') priority.epicCount += 1;
    if (rarity === 'Rare') priority.rareCount += 1;
  }
  return priority;
}

function lowestSelectableRarity(
  remainingMask: bigint,
  dragons: OptimizerRosterDragon[],
): DragonRarity {
  let lowest: DragonRarity = 'Legendary';
  forEachBit(remainingMask, (index) => {
    const rarity = dragons[index]!.rarity;
    if (rarityRank[rarity] < rarityRank[lowest]) lowest = rarity;
  });
  return lowest;
}

function addRarityPriority(
  left: RosterRarityPriority,
  right: RosterRarityPriority,
): RosterRarityPriority {
  return {
    legendaryCount: left.legendaryCount + right.legendaryCount,
    epicCount: left.epicCount + right.epicCount,
    rareCount: left.rareCount + right.rareCount,
  };
}

function compareIndexedCandidates(left: IndexedCandidate, right: IndexedCandidate): number {
  return (
    right.candidate.rating - left.candidate.rating ||
    right.candidate.adjustedRelationshipValueUnits -
      left.candidate.adjustedRelationshipValueUnits ||
    right.candidate.activeRelationshipCount - left.candidate.activeRelationshipCount ||
    left.candidate.stableCandidateKey.localeCompare(right.candidate.stableCandidateKey)
  );
}

function insertTop(values: number[], value: number, limit: number): void {
  const index = values.findIndex((candidate) => value > candidate);
  if (index === -1) values.push(value);
  else values.splice(index, 0, value);
  if (values.length > limit) values.pop();
}

function forEachBit(mask: bigint, callback: (index: number) => void): void {
  let value = mask;
  let index = 0;
  while (value > 0n) {
    if ((value & 1n) === 1n) callback(index);
    value >>= 1n;
    index += 1;
  }
}

function popcount(mask: bigint): number {
  let value = mask;
  let count = 0;
  while (value > 0n) {
    value &= value - 1n;
    count += 1;
  }
  return count;
}

function sum(total: number, value: number): number {
  return total + value;
}
