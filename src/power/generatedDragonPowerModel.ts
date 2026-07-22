import type { DragonRarity } from '../models/dragon';

export interface EstimatedPowerCurvePoint {
  input: number;
  value: number;
}

export interface EstimatedPowerSupportComponent {
  id: string;
  starRankMinimum: number;
  starRankMaximum: number;
  dragonLevelMinimum: number;
  dragonLevelMaximum: number;
  directlyIdentified: boolean;
}

export const ESTIMATED_POWER_MODEL_VERSION = 'estimated-power-v2' as const;
export const ESTIMATED_POWER_MODEL_FAMILY =
  'rarity-specific-additive-star-and-level-curves' as const;

export const ESTIMATED_POWER_STAR_CURVES: Readonly<Record<DragonRarity, readonly EstimatedPowerCurvePoint[]>> = {
  Legendary: [
    { input: 1, value: 0 },
    { input: 2, value: 2220 },
    { input: 3, value: 4620 },
    { input: 4, value: 8640 },
  ],
  Epic: [
    { input: 1, value: 0 },
    { input: 2, value: 1600 },
    { input: 3, value: 3200 },
    { input: 4, value: 5640 },
    { input: 6, value: 12880 },
  ],
  Rare: [
    { input: 3, value: 0 },
    { input: 4, value: 1350 },
    { input: 7, value: 7600 },
  ],
} as const;

export const ESTIMATED_POWER_LEVEL_CURVES: Readonly<Record<DragonRarity, readonly EstimatedPowerCurvePoint[]>> = {
  Legendary: [
    { input: 20, value: 11400 },
    { input: 21, value: 12400 },
    { input: 25, value: 15400 },
    { input: 35, value: 22400 },
    { input: 36, value: 22400 },
    { input: 37, value: 23400 },
    { input: 38, value: 24400 },
  ],
  Epic: [
    { input: 20, value: 9050 },
    { input: 21, value: 9550 },
    { input: 25, value: 11940 },
    { input: 30, value: 13940 },
    { input: 31, value: 14940 },
    { input: 32, value: 14940 },
    { input: 35, value: 16940 },
    { input: 36, value: 17940 },
    { input: 37, value: 17940 },
    { input: 38, value: 18940 },
  ],
  Rare: [
    { input: 20, value: 8250 },
    { input: 21, value: 8650 },
    { input: 25, value: 10050 },
    { input: 28, value: 11250 },
    { input: 29, value: 11650 },
    { input: 30, value: 12050 },
    { input: 31, value: 12250 },
  ],
} as const;

export const ESTIMATED_POWER_EXTRAPOLATION_SLOPES: Readonly<Record<DragonRarity, {
  starRank: number;
  dragonLevel: number;
}>> = {
  Legendary: { starRank: 2220, dragonLevel: 700 },
  Epic: { starRank: 1600, dragonLevel: 400 },
  Rare: { starRank: 1350, dragonLevel: 200 },
} as const;

export const ESTIMATED_POWER_SUPPORT_COMPONENTS: Readonly<Record<DragonRarity, readonly EstimatedPowerSupportComponent[]>> = {
  Legendary: [
    { id: 'legendary-1', starRankMinimum: 1, starRankMaximum: 4, dragonLevelMinimum: 20, dragonLevelMaximum: 38, directlyIdentified: true },
  ],
  Epic: [
    { id: 'epic-1', starRankMinimum: 1, starRankMaximum: 1, dragonLevelMinimum: 20, dragonLevelMaximum: 21, directlyIdentified: true },
    { id: 'epic-2', starRankMinimum: 2, starRankMaximum: 6, dragonLevelMinimum: 25, dragonLevelMaximum: 38, directlyIdentified: true },
  ],
  Rare: [
    { id: 'rare-1', starRankMinimum: 3, starRankMaximum: 7, dragonLevelMinimum: 20, dragonLevelMaximum: 31, directlyIdentified: true },
  ],
} as const;

export const ESTIMATED_POWER_COMPLETION_RULE = {
  id: 'nearest-direct-adjacent-star-increment',
  epicBridge: {
    relationship: 'Star 1 to Star 2 absolute offset',
    inferredStarRankGain: 1600,
    anchor: 'directly identified Epic Star 2 to Star 3 gain',
    identifiedByObservations: false,
    impliedLevel21To25Gain: 2390,
    sensitivityAlternatives: [
      { inferredStarRankGain: 0, impliedLevel21To25Gain: 3990 },
      { inferredStarRankGain: 2440, impliedLevel21To25Gain: 1550 },
    ],
  },
} as const;

export const ESTIMATED_POWER_INTERPOLATION_RULE =
  'piecewise-linear-between-frozen-star-and-level-anchors' as const;
export const ESTIMATED_POWER_EXTRAPOLATION_RULE =
  'below-level-support-scale-level-20-total-by-max(1,level)/20;otherwise-use-smallest-positive-observed-per-unit-slope' as const;
export const ESTIMATED_POWER_EXACT_OBSERVATION_RULE =
  'return-deduplicated-displayed-power' as const;
export const ESTIMATED_POWER_ROUNDING_RULE = 'nearest-10' as const;
export const ESTIMATED_POWER_MONOTONICITY_RULE =
  'nonnegative-piecewise-curves-plus-rare-epic-legendary-projection' as const;
export const ESTIMATED_POWER_RARITY_PROJECTION = 'Legendary>=Epic>=Rare' as const;
export const ESTIMATED_POWER_CONFIDENCE_RULE =
  'exact-observation-observed;inside-one-support-component-modeled;bridge-or-outside-support-low' as const;

// Generated and validated by scripts/fit-dragon-power-model.mjs.
export const ESTIMATED_POWER_OBSERVATION_HASH = 'fnv1a64:26bfe615f0d9bdd5' as const;
export const ESTIMATED_POWER_MODEL_HASH = 'fnv1a64:efa6081babb4e520' as const;
export const ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT = 'fnv1a64:1acab49e4408602b' as const;
