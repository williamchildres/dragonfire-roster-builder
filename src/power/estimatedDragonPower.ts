import type { DragonRarity } from '../models/dragon';
import {
  deduplicateDragonPowerObservations,
  type UniqueDragonPowerObservation,
} from './dragonPowerObservations';
import {
  ESTIMATED_POWER_MODEL_COEFFICIENTS,
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from './generatedDragonPowerModel';

export type EstimatedPowerConfidence = 'observed' | 'modeled' | 'low';

export interface EstimatedDragonPower {
  power: number;
  confidence: EstimatedPowerConfidence;
  modelVersion: string;
  modelHash: string;
  observationHash: string;
  basis: 'exact-observation' | 'interpolation' | 'extrapolation';
}

export interface EstimateDragonPowerInput {
  rarity: DragonRarity;
  starRank: number;
  dragonLevel: number;
}

export const ESTIMATED_POWER_SUPPORTED_STAR_RANK = { minimum: 1, maximum: 10 } as const;
export const ESTIMATED_POWER_OBSERVED_STAR_RANK = { minimum: 1, maximum: 7 } as const;
export const ESTIMATED_POWER_OBSERVED_DRAGON_LEVEL = { minimum: 20, maximum: 36 } as const;

const uniqueObservations = deduplicateDragonPowerObservations();
const observationsByRarity = new Map<DragonRarity, UniqueDragonPowerObservation[]>(
  (['Legendary', 'Epic', 'Rare'] as const).map((rarity) => [
    rarity,
    uniqueObservations.filter((observation) => observation.rarity === rarity),
  ]),
);

export function estimateDragonPower(input: EstimateDragonPowerInput): EstimatedDragonPower {
  assertValidProgression(input);
  const rarePower = estimateWithinRarity('Rare', input.starRank, input.dragonLevel);
  const epicPower = Math.max(
    estimateWithinRarity('Epic', input.starRank, input.dragonLevel),
    rarePower,
  );
  const legendaryPower = Math.max(
    estimateWithinRarity('Legendary', input.starRank, input.dragonLevel),
    epicPower,
  );
  const power = input.rarity === 'Legendary'
    ? legendaryPower
    : input.rarity === 'Epic'
      ? epicPower
      : rarePower;
  const exact = uniqueObservations.find((observation) =>
    observation.rarity === input.rarity
      && observation.starRank === input.starRank
      && observation.dragonLevel === input.dragonLevel,
  );
  const outsideEnvelope = input.starRank < ESTIMATED_POWER_OBSERVED_STAR_RANK.minimum
    || input.starRank > ESTIMATED_POWER_OBSERVED_STAR_RANK.maximum
    || input.dragonLevel < ESTIMATED_POWER_OBSERVED_DRAGON_LEVEL.minimum
    || input.dragonLevel > ESTIMATED_POWER_OBSERVED_DRAGON_LEVEL.maximum;
  return {
    power,
    confidence: exact ? 'observed' : outsideEnvelope ? 'low' : 'modeled',
    modelVersion: ESTIMATED_POWER_MODEL_VERSION,
    modelHash: ESTIMATED_POWER_MODEL_HASH,
    observationHash: ESTIMATED_POWER_OBSERVATION_HASH,
    basis: exact ? 'exact-observation' : outsideEnvelope ? 'extrapolation' : 'interpolation',
  };
}

export function isValidEstimatedPowerProgression(input: EstimateDragonPowerInput): boolean {
  return (
    (input.rarity === 'Legendary' || input.rarity === 'Epic' || input.rarity === 'Rare')
    && Number.isInteger(input.starRank)
    && input.starRank >= ESTIMATED_POWER_SUPPORTED_STAR_RANK.minimum
    && input.starRank <= ESTIMATED_POWER_SUPPORTED_STAR_RANK.maximum
    && Number.isInteger(input.dragonLevel)
    && input.dragonLevel >= 0
  );
}

function estimateWithinRarity(
  rarity: DragonRarity,
  starRank: number,
  dragonLevel: number,
): number {
  const observations = observationsByRarity.get(rarity) ?? [];
  const lowerObservedPower = Math.max(
    10,
    ...observations
      .filter((observation) =>
        observation.starRank <= starRank && observation.dragonLevel <= dragonLevel,
      )
      .map((observation) => observation.displayedPower),
  );
  const upperObservedPowers = observations
    .filter((observation) =>
      observation.starRank >= starRank && observation.dragonLevel >= dragonLevel,
    )
    .map((observation) => observation.displayedPower);
  const upperObservedPower = upperObservedPowers.length > 0
    ? Math.min(...upperObservedPowers)
    : Number.POSITIVE_INFINITY;
  const modeled = rawModeledPower(rarity, starRank, dragonLevel);
  return roundPower(Math.max(lowerObservedPower, Math.min(modeled, upperObservedPower)));
}

function rawModeledPower(
  rarity: DragonRarity,
  starRank: number,
  dragonLevel: number,
): number {
  const { rarityIntercept, rarityLevelSlope, sharedStarRankSlope, empiricalMinimumDragonLevel } =
    ESTIMATED_POWER_MODEL_COEFFICIENTS;
  const empiricalFloorPower = rarityIntercept[rarity]
    + rarityLevelSlope[rarity] * empiricalMinimumDragonLevel
    + sharedStarRankSlope * starRank;
  if (dragonLevel < empiricalMinimumDragonLevel) {
    return empiricalFloorPower
      * Math.max(1, dragonLevel)
      / empiricalMinimumDragonLevel;
  }
  return rarityIntercept[rarity]
    + rarityLevelSlope[rarity] * dragonLevel
    + sharedStarRankSlope * starRank;
}

function roundPower(value: number): number {
  return Math.round(value / 10) * 10;
}

function assertValidProgression(input: EstimateDragonPowerInput): void {
  if (!isValidEstimatedPowerProgression(input)) {
    throw new RangeError(
      'Estimated Power requires Legendary, Epic, or Rare rarity, Star Rank 1-10, and a nonnegative integer Dragon Level.',
    );
  }
}
