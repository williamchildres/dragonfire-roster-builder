import { dragons } from '../data/dragons';
import type { HabitLevel, OwnedDragon } from '../models/dragon';
import { normalizeRoster } from '../services/rosterStorage';

interface MinimalOwnedDragon {
  dragonId: string;
  owned: true;
  starRank: number;
  reignLevel: number;
  habitLevels: Record<string, HabitLevel>;
}

export const REAL_WORLD_ROSTER_V0221: readonly MinimalOwnedDragon[] = [
  { dragonId: 'sunfyre', owned: true, starRank: 2, reignLevel: 26, habitLevels: { 'sunfyre-radiant-majesty': 1 } },
  { dragonId: 'tairax', owned: true, starRank: 2, reignLevel: 26, habitLevels: { 'tairax-whisper-of-ash': 1 } },
  { dragonId: 'syrax', owned: true, starRank: 1, reignLevel: 37, habitLevels: {} },
  { dragonId: 'vhagar', owned: true, starRank: 4, reignLevel: 38, habitLevels: { 'vhagar-ancestral-shield': 1, 'vhagar-battle-leader': 1 } },
  { dragonId: 'caraxes', owned: true, starRank: 2, reignLevel: 37, habitLevels: { 'caraxes-battle-dread': 1 } },
  { dragonId: 'seasmoke', owned: true, starRank: 1, reignLevel: 37, habitLevels: {} },
  { dragonId: 'solstryker', owned: true, starRank: 4, reignLevel: 25, habitLevels: { 'solstryker-steady-erosion': 1, 'solstryker-energy-drain': 1 } },
  { dragonId: 'crimson', owned: true, starRank: 2, reignLevel: 38, habitLevels: { 'crimson-enervate': 1 } },
  { dragonId: 'kalspire', owned: true, starRank: 3, reignLevel: 37, habitLevels: { 'kalspire-robust-insight': 1 } },
  { dragonId: 'malachite', owned: true, starRank: 1, reignLevel: 37, habitLevels: {} },
  { dragonId: 'venator', owned: true, starRank: 1, reignLevel: 37, habitLevels: {} },
  { dragonId: 'daemoros', owned: true, starRank: 2, reignLevel: 38, habitLevels: { 'daemoros-instill-fear': 1 } },
  { dragonId: 'feskar', owned: true, starRank: 2, reignLevel: 32, habitLevels: { 'feskar-resilient-bond': 1 } },
  { dragonId: 'rhysarion', owned: true, starRank: 4, reignLevel: 37, habitLevels: { 'rhysarion-ebbing-fury': 1, 'rhysarion-sharp-resolve': 1 } },
  { dragonId: 'shadowsong', owned: true, starRank: 3, reignLevel: 37, habitLevels: { 'shadowsong-ensnare': 1 } },
  { dragonId: 'tashix', owned: true, starRank: 4, reignLevel: 37, habitLevels: { 'tashix-enervate': 1, 'tashix-dragons-cunning': 1 } },
  { dragonId: 'vaeldra', owned: true, starRank: 3, reignLevel: 32, habitLevels: { 'vaeldra-dragons-valor': 1 } },
  { dragonId: 'velar', owned: true, starRank: 4, reignLevel: 37, habitLevels: { 'velar-strategic-leader': 1, 'velar-quick-reflexes': 1 } },
  { dragonId: 'zivern', owned: true, starRank: 2, reignLevel: 31, habitLevels: { 'zivern-battle-mastery': 1 } },
  { dragonId: 'antares', owned: true, starRank: 4, reignLevel: 30, habitLevels: { 'antares-blazing-onslaught': 3, 'antares-dragons-flair': 1 } },
  { dragonId: 'shimmer', owned: true, starRank: 4, reignLevel: 30, habitLevels: { 'shimmer-crushing-force': 1, 'shimmer-dragons-insight': 1 } },
  { dragonId: 'jagadrix', owned: true, starRank: 7, reignLevel: 31, habitLevels: { 'jagadrix-enervate': 1, 'jagadrix-second-wind': 1, 'jagadrix-whispering-sabotage': 1 } },
  { dragonId: 'bevlorin', owned: true, starRank: 4, reignLevel: 31, habitLevels: { 'bevlorin-fire-ward': 1, 'bevlorin-dragons-fury': 1 } },
  { dragonId: 'shadowrend', owned: true, starRank: 3, reignLevel: 31, habitLevels: { 'shadowrend-midnight-aura': 1 } },
  { dragonId: 'thunderstrike', owned: true, starRank: 4, reignLevel: 31, habitLevels: { 'thunderstrike-battle-rush': 1, 'thunderstrike-dragons-might': 1 } },
  { dragonId: 'vesper', owned: true, starRank: 4, reignLevel: 30, habitLevels: { 'vesper-strategic-leader': 1, 'vesper-dragons-insight': 1 } },
  { dragonId: 'arulix', owned: true, starRank: 4, reignLevel: 30, habitLevels: { 'arulix-hypnotic-helix': 1, 'arulix-battle-cunning': 1 } },
  { dragonId: 'nyrena', owned: true, starRank: 4, reignLevel: 30, habitLevels: { 'nyrena-battle-dread': 1, 'nyrena-mindful-synergy': 1 } },
  { dragonId: 'dawnseeker', owned: true, starRank: 4, reignLevel: 29, habitLevels: { 'dawnseeker-tactical-inferno': 1, 'dawnseeker-unbroken-devotion': 1 } },
  { dragonId: 'arrax', owned: true, starRank: 3, reignLevel: 31, habitLevels: { 'arrax-headlong-into-danger': 1 } },
  { dragonId: 'tessarion', owned: true, starRank: 6, reignLevel: 37, habitLevels: { 'tessarion-sharpened-beauty': 1, 'tessarion-blazing-leader': 1, 'tessarion-molten-armor': 1 } },
  { dragonId: 'sheepstealer', owned: true, starRank: 2, reignLevel: 37, habitLevels: { 'sheepstealer-stolen-flock': 1 } },
  { dragonId: 'vermax', owned: true, starRank: 2, reignLevel: 32, habitLevels: { 'vermax-trial-by-flame': 1 } },
] as const;

export function realWorldRosterV0221(): Record<string, OwnedDragon> {
  return normalizeRoster(
    dragons,
    REAL_WORLD_ROSTER_V0221.map((entry) => ({ ...entry, notes: '' })),
  );
}
