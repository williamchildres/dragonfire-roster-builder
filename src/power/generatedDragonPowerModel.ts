import type { DragonRarity } from '../models/dragon';

export const ESTIMATED_POWER_MODEL_VERSION = 'estimated-power-v1' as const;

export const ESTIMATED_POWER_MODEL_FAMILY =
  'rarity-level-additive-with-shared-star-contribution-and-monotone-envelope' as const;

export const ESTIMATED_POWER_MODEL_COEFFICIENTS: Readonly<{
  rarityIntercept: Record<DragonRarity, number>;
  rarityLevelSlope: Record<DragonRarity, number>;
  sharedStarRankSlope: number;
  empiricalMinimumDragonLevel: number;
}> = {
  rarityIntercept: {
    Legendary: -5345.526402998704,
    Epic: -3518.798289613967,
    Rare: -8030.898292604834,
  },
  rarityLevelSlope: {
    Legendary: 712.604230387158,
    Epic: 491.403841476919,
    Rare: 395.629654678922,
  },
  sharedStarRankSlope: 2434.713675015537,
  empiricalMinimumDragonLevel: 20,
} as const;

// Generated and validated by scripts/fit-dragon-power-model.mjs.
export const ESTIMATED_POWER_OBSERVATION_HASH = 'fnv1a64:57268e00007bfab8' as const;
export const ESTIMATED_POWER_MODEL_HASH = 'fnv1a64:0b65e3eac0902891' as const;
