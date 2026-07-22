import type { DragonRarity } from '../models/dragon';
import {
  deduplicateDragonPowerObservations,
  observationTupleKey,
} from './dragonPowerObservations';
import {
  ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
  ESTIMATED_POWER_LEVEL_CURVES,
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
  ESTIMATED_POWER_STAR_CURVES,
  ESTIMATED_POWER_SUPPORT_COMPONENTS,
  type EstimatedPowerCurvePoint,
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
export { ESTIMATED_POWER_OBSERVED_ENVELOPES } from './dragonPowerObservations';

const uniqueObservations = deduplicateDragonPowerObservations();
const exactPowerByTuple = new Map(uniqueObservations.map((observation) => [
  observationTupleKey(observation),
  observation.displayedPower,
]));

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
  const projectedPower = input.rarity === 'Legendary'
    ? legendaryPower
    : input.rarity === 'Epic'
      ? epicPower
      : rarePower;
  const exactPower = exactPowerByTuple.get(observationTupleKey(input));
  const support = classifyEstimatedPowerSupport(input, exactPower != null);
  return {
    power: exactPower ?? projectedPower,
    confidence: support.confidence,
    modelVersion: ESTIMATED_POWER_MODEL_VERSION,
    modelHash: ESTIMATED_POWER_MODEL_HASH,
    observationHash: ESTIMATED_POWER_OBSERVATION_HASH,
    basis: support.basis,
  };
}

export function classifyEstimatedPowerSupport(
  input: EstimateDragonPowerInput,
  exact = exactPowerByTuple.has(observationTupleKey(input)),
): Pick<EstimatedDragonPower, 'confidence' | 'basis'> {
  if (exact) return { confidence: 'observed', basis: 'exact-observation' };
  const insideConnectedComponent = ESTIMATED_POWER_SUPPORT_COMPONENTS[input.rarity].some((component) =>
    input.starRank >= component.starRankMinimum
      && input.starRank <= component.starRankMaximum
      && input.dragonLevel >= component.dragonLevelMinimum
      && input.dragonLevel <= component.dragonLevelMaximum,
  );
  return insideConnectedComponent
    ? { confidence: 'modeled', basis: 'interpolation' }
    : { confidence: 'low', basis: 'extrapolation' };
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
  const starValue = interpolateCurve(
    ESTIMATED_POWER_STAR_CURVES[rarity],
    starRank,
    ESTIMATED_POWER_EXTRAPOLATION_SLOPES[rarity].starRank,
  );
  const minimumLevel = ESTIMATED_POWER_LEVEL_CURVES[rarity][0]!.input;
  if (dragonLevel < minimumLevel) {
    const atMinimumLevel = starValue + ESTIMATED_POWER_LEVEL_CURVES[rarity][0]!.value;
    return roundPower(Math.max(10, atMinimumLevel * Math.max(1, dragonLevel) / minimumLevel));
  }
  const levelValue = interpolateCurve(
    ESTIMATED_POWER_LEVEL_CURVES[rarity],
    dragonLevel,
    ESTIMATED_POWER_EXTRAPOLATION_SLOPES[rarity].dragonLevel,
  );
  return roundPower(Math.max(10, starValue + levelValue));
}

function interpolateCurve(
  points: readonly EstimatedPowerCurvePoint[],
  input: number,
  extrapolationSlope: number,
): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (input <= first.input) return first.value - (first.input - input) * extrapolationSlope;
  if (input >= last.input) return last.value + (input - last.input) * extrapolationSlope;
  const upperIndex = points.findIndex((point) => point.input >= input);
  const upper = points[upperIndex]!;
  const lower = points[upperIndex - 1]!;
  const share = (input - lower.input) / (upper.input - lower.input);
  return lower.value + (upper.value - lower.value) * share;
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
