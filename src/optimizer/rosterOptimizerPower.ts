import {
  estimateDragonPower,
  type EstimatedDragonPower,
  type EstimatedPowerConfidence,
} from '../power/estimatedDragonPower';
import type {
  OptimizerFormationCandidate,
  OptimizerRosterDragon,
  PowerConfidenceCountRecord,
} from './rosterOptimizerTypes';

export interface PrimaryPowerCutoff {
  cutoffPowerUnits: number;
  aboveCutoffDragonIds: string[];
  cutoffTiedDragonIds: string[];
  belowCutoffDragonIds: string[];
  requiredCutoffTieCount: number;
  exactPrimaryTotalPowerUnits: number;
}

export function buildEstimatedPowerCache(
  snapshot: readonly OptimizerRosterDragon[],
  estimator = estimateDragonPower,
): ReadonlyMap<string, EstimatedDragonPower> {
  return new Map(snapshot.map((dragon) => {
    if (dragon.starRank == null || dragon.dragonLevel == null) {
      throw new Error(`Eligible dragon ${dragon.dragonId} is missing Power progression.`);
    }
    return [dragon.dragonId, estimator({
      rarity: dragon.rarity,
      starRank: dragon.starRank,
      dragonLevel: dragon.dragonLevel,
    })];
  }));
}

/**
 * Fixes the maximum-power 15-dragon Primary pool without a MILP objective.
 * Every 15-dragon group is partitionable into five trios, so selecting every
 * dragon above the 15th-highest cutoff plus the exact required number tied at
 * the cutoff is equivalent to maximizing total individual Estimated Power.
 */
export function determinePrimaryPowerCutoff(
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>,
  requiredDragonCount: number,
): PrimaryPowerCutoff {
  if (requiredDragonCount < 1 || estimatesByDragonId.size < requiredDragonCount) {
    throw new RangeError('Primary Power cutoff requires enough eligible dragons.');
  }
  const ranked = [...estimatesByDragonId.entries()]
    .map(([dragonId, estimate]) => ({ dragonId, powerUnits: toPowerUnits(estimate.power) }))
    .sort((left, right) =>
      right.powerUnits - left.powerUnits || left.dragonId.localeCompare(right.dragonId),
    );
  const cutoffPowerUnits = ranked[requiredDragonCount - 1]!.powerUnits;
  const aboveCutoffDragonIds = ranked
    .filter((entry) => entry.powerUnits > cutoffPowerUnits)
    .map((entry) => entry.dragonId)
    .sort();
  const cutoffTiedDragonIds = ranked
    .filter((entry) => entry.powerUnits === cutoffPowerUnits)
    .map((entry) => entry.dragonId)
    .sort();
  const belowCutoffDragonIds = ranked
    .filter((entry) => entry.powerUnits < cutoffPowerUnits)
    .map((entry) => entry.dragonId)
    .sort();
  const requiredCutoffTieCount = requiredDragonCount - aboveCutoffDragonIds.length;
  return {
    cutoffPowerUnits,
    aboveCutoffDragonIds,
    cutoffTiedDragonIds,
    belowCutoffDragonIds,
    requiredCutoffTieCount,
    exactPrimaryTotalPowerUnits:
      aboveCutoffDragonIds.reduce(
        (total, dragonId) => total + toPowerUnits(estimatesByDragonId.get(dragonId)!.power),
        0,
      ) + requiredCutoffTieCount * cutoffPowerUnits,
  };
}

export function candidatePowerUnits(
  candidate: Pick<OptimizerFormationCandidate, 'dragonIds'>,
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>,
): number {
  return candidate.dragonIds.reduce((total, dragonId) => {
    const estimate = estimatesByDragonId.get(dragonId);
    if (!estimate) throw new Error(`Missing cached Estimated Power for ${dragonId}.`);
    return total + toPowerUnits(estimate.power);
  }, 0);
}

export function powerConfidenceCounts(
  dragonIds: Iterable<string>,
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>,
): PowerConfidenceCountRecord {
  const counts: PowerConfidenceCountRecord = { observed: 0, modeled: 0, low: 0 };
  for (const dragonId of dragonIds) {
    const confidence: EstimatedPowerConfidence | undefined =
      estimatesByDragonId.get(dragonId)?.confidence;
    if (confidence) counts[confidence] += 1;
  }
  return counts;
}

export function toPowerUnits(power: number): number {
  if (!Number.isInteger(power) || power % 10 !== 0) {
    throw new Error(`Estimated Power ${power} is not rounded to the nearest 10.`);
  }
  return power / 10;
}
