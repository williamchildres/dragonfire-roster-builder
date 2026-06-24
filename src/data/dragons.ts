import type { AffinityLevel, Dragon, DragonBreed, DragonRarity } from '../models/dragon';

const verifiedAt = '2026-06-23';
const dataStatus = 'official-metadata-only' as const;
const unknownAffinities: Record<'Cavalry' | 'Shieldbearers' | 'Archers' | 'Spearmen' | 'Siege', AffinityLevel> = {
  Cavalry: 'unknown',
  Shieldbearers: 'unknown',
  Archers: 'unknown',
  Spearmen: 'unknown',
  Siege: 'unknown',
};

const createDragon = (
  name: string,
  rarity: DragonRarity,
  breed: DragonBreed,
  isNew = false,
): Dragon => {
  const slug = name.toLowerCase().replaceAll(' ', '-');

  return {
    id: slug,
    slug,
    name,
    rarity,
    breed,
    officialProfileUrl: `https://gotdragonfire.com/dragons/${slug}/`,
    isNew,
    dataStatus,
    lastVerified: verifiedAt,
    notes: null,
    command: null,
    habits: [],
    affinities: { ...unknownAffinities },
    stats: {
      strength: null,
      intelligence: null,
      instincts: null,
      initiative: null,
    },
    tags: [],
  };
};

export const dragons: Dragon[] = [
  createDragon('Syrax', 'Legendary', 'Sentinel'),
  createDragon('Vhagar', 'Legendary', 'Warrior'),
  createDragon('Caraxes', 'Legendary', 'Hunter'),
  createDragon('Seasmoke', 'Legendary', 'Champion'),
  createDragon('Solstryker', 'Rare', 'Champion'),
  createDragon('Crimson', 'Legendary', 'Hunter'),
  createDragon('Kalspire', 'Legendary', 'Champion'),
  createDragon('Malachite', 'Legendary', 'Sentinel'),
  createDragon('Venator', 'Legendary', 'Warrior'),
  createDragon('Daemoros', 'Epic', 'Warrior'),
  createDragon('Feskar', 'Epic', 'Champion'),
  createDragon('Rhysarion', 'Epic', 'Champion'),
  createDragon('Shadowsong', 'Epic', 'Hunter'),
  createDragon('Tashix', 'Epic', 'Hunter'),
  createDragon('Vaeldra', 'Epic', 'Warrior'),
  createDragon('Velar', 'Epic', 'Sentinel'),
  createDragon('Zivern', 'Epic', 'Sentinel'),
  createDragon('Antares', 'Rare', 'Hunter'),
  createDragon('Shimmer', 'Rare', 'Sentinel'),
  createDragon('Jagadrix', 'Rare', 'Hunter'),
  createDragon('Bevlorin', 'Rare', 'Champion'),
  createDragon('Shadowrend', 'Rare', 'Warrior'),
  createDragon('Thunderstrike', 'Rare', 'Warrior'),
  createDragon('Vesper', 'Rare', 'Sentinel'),
  createDragon('Arulix', 'Rare', 'Champion', true),
  createDragon('Nyrena', 'Rare', 'Champion', true),
  createDragon('Dawnseeker', 'Rare', 'Sentinel', true),
  createDragon('Arrax', 'Rare', 'Warrior', true),
];

export const dragonById = new Map(dragons.map((dragon) => [dragon.id, dragon]));
