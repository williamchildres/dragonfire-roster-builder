import type { OwnedDragon } from '../models/dragon';

export const LIVE_33_PROGRESSION_REGRESSION = {
  sunfyre: { starRank: 2, dragonLevel: 26 },
  tairax: { starRank: 2, dragonLevel: 26 },
  syrax: { starRank: 1, dragonLevel: 37 },
  vhagar: { starRank: 4, dragonLevel: 38 },
  caraxes: { starRank: 2, dragonLevel: 37 },
  seasmoke: { starRank: 1, dragonLevel: 37 },
  solstryker: { starRank: 4, dragonLevel: 25 },
  crimson: { starRank: 2, dragonLevel: 38 },
  kalspire: { starRank: 3, dragonLevel: 37 },
  malachite: { starRank: 1, dragonLevel: 37 },
  venator: { starRank: 1, dragonLevel: 37 },
  daemoros: { starRank: 2, dragonLevel: 38 },
  feskar: { starRank: 2, dragonLevel: 32 },
  rhysarion: { starRank: 4, dragonLevel: 37 },
  shadowsong: { starRank: 3, dragonLevel: 37 },
  tashix: { starRank: 4, dragonLevel: 37 },
  vaeldra: { starRank: 3, dragonLevel: 32 },
  velar: { starRank: 4, dragonLevel: 37 },
  zivern: { starRank: 2, dragonLevel: 31 },
  antares: { starRank: 4, dragonLevel: 30 },
  shimmer: { starRank: 4, dragonLevel: 30 },
  jagadrix: { starRank: 7, dragonLevel: 31 },
  bevlorin: { starRank: 4, dragonLevel: 31 },
  shadowrend: { starRank: 3, dragonLevel: 31 },
  thunderstrike: { starRank: 4, dragonLevel: 31 },
  vesper: { starRank: 4, dragonLevel: 30 },
  arulix: { starRank: 4, dragonLevel: 30 },
  nyrena: { starRank: 4, dragonLevel: 30 },
  dawnseeker: { starRank: 4, dragonLevel: 29 },
  arrax: { starRank: 3, dragonLevel: 31 },
  tessarion: { starRank: 6, dragonLevel: 37 },
  sheepstealer: { starRank: 2, dragonLevel: 37 },
  vermax: { starRank: 2, dragonLevel: 32 },
} as const;

export function live33ProgressionRegressionRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(Object.entries(LIVE_33_PROGRESSION_REGRESSION).map(
    ([dragonId, progression]) => [dragonId, {
      dragonId,
      owned: true,
      starRank: progression.starRank,
      reignLevel: progression.dragonLevel,
      notes: '',
      habitLevels: {},
    }],
  ));
}
