import type { Dragon, EffectTag } from '../models/dragon';

const knownAffinities = {
  Cavalry: 'positive',
  Shieldbearers: 'neutral',
  Archers: 'neutral',
  Spearmen: 'negative',
  Siege: 'positive',
} as const;

export function fictionalDragon(id: string, name: string, tags: EffectTag[]): Dragon {
  return {
    id,
    slug: id,
    name,
    rarity: 'Rare',
    breed: 'Champion',
    officialProfileUrl: `https://example.test/${id}`,
    isNew: false,
    dataStatus: 'community-verified',
    lastVerified: '2026-06-23',
    notes: null,
    command: {
      name: `${name} Command`,
      description: 'Synthetic command for test coverage.',
      triggerChance: 25,
      target: 'Enemy',
      durationRounds: 1,
      tags,
      sourceIds: ['synthetic-test-source'],
    },
    habits: [
      {
        id: `${id}-habit`,
        name: `${name} Habit`,
        description: 'Synthetic habit for test coverage.',
        unlockStarRank: 1,
        tags,
        sourceIds: ['synthetic-test-source'],
      },
    ],
    affinities: { ...knownAffinities },
    stats: {
      strength: 10,
      intelligence: 10,
      instincts: 10,
      initiative: 10,
    },
    tags,
  };
}
