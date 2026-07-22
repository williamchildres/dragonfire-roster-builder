import {
  buildDragonPowerSupportGraphs,
  DRAGON_POWER_OBSERVATIONS,
  hashDragonPowerObservations,
  type DragonPowerObservation,
} from './dragonPowerObservations';
import {
  ESTIMATED_POWER_COMPLETION_RULE,
  ESTIMATED_POWER_CONFIDENCE_RULE,
  ESTIMATED_POWER_EXACT_OBSERVATION_RULE,
  ESTIMATED_POWER_EXTRAPOLATION_RULE,
  ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
  ESTIMATED_POWER_INTERPOLATION_RULE,
  ESTIMATED_POWER_LEVEL_CURVES,
  ESTIMATED_POWER_MODEL_FAMILY,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_MONOTONICITY_RULE,
  ESTIMATED_POWER_RARITY_PROJECTION,
  ESTIMATED_POWER_ROUNDING_RULE,
  ESTIMATED_POWER_STAR_CURVES,
  ESTIMATED_POWER_SUPPORT_COMPONENTS,
} from './generatedDragonPowerModel';

export function estimatedPowerModelDefinition(
  observations: readonly DragonPowerObservation[] = DRAGON_POWER_OBSERVATIONS,
) {
  const supportGraphs = buildDragonPowerSupportGraphs(observations);
  return {
    modelVersion: ESTIMATED_POWER_MODEL_VERSION,
    modelFamily: ESTIMATED_POWER_MODEL_FAMILY,
    observationHash: hashDragonPowerObservations(observations),
    starCurves: ESTIMATED_POWER_STAR_CURVES,
    levelCurves: ESTIMATED_POWER_LEVEL_CURVES,
    componentGauges: Object.fromEntries(Object.entries(supportGraphs).map(([rarity, graph]) => [
      rarity,
      graph.components.map((component) => ({
        id: component.id,
        gauge: component.gauge,
        starRanks: component.starRanks,
        dragonLevels: component.dragonLevels,
      })),
    ])),
    supportComponents: ESTIMATED_POWER_SUPPORT_COMPONENTS,
    completionRule: ESTIMATED_POWER_COMPLETION_RULE,
    interpolationRule: ESTIMATED_POWER_INTERPOLATION_RULE,
    extrapolationRule: ESTIMATED_POWER_EXTRAPOLATION_RULE,
    extrapolationSlopes: ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
    exactObservationRule: ESTIMATED_POWER_EXACT_OBSERVATION_RULE,
    roundingRule: ESTIMATED_POWER_ROUNDING_RULE,
    monotonicityGuard: ESTIMATED_POWER_MONOTONICITY_RULE,
    rarityProjection: ESTIMATED_POWER_RARITY_PROJECTION,
    confidenceSupportRule: ESTIMATED_POWER_CONFIDENCE_RULE,
  };
}

export function hashEstimatedPowerModel(
  observations: readonly DragonPowerObservation[] = DRAGON_POWER_OBSERVATIONS,
): string {
  return fnv1a64(JSON.stringify(estimatedPowerModelDefinition(observations)));
}

export function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
