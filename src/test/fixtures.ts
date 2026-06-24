import type { AbilityDefinition, Dragon, EffectTag } from '../models/dragon';

const knownAffinities = {
  Cavalry: 'positive',
  Shieldbearers: 'neutral',
  Archers: 'neutral',
  Spearmen: 'negative',
  Siege: 'positive',
} as const;

export function fictionalDragon(id: string, name: string, tags: EffectTag[]): Dragon {
  const command = fictionalAbility(id, `${name} Command`, 'command', tags);
  const habit = fictionalAbility(`${id}-habit`, `${name} Habit`, 'habit', tags);

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
    command,
    trait: null,
    habits: [habit],
    affinities: { ...knownAffinities },
    stats: {
      strength: 10,
      intelligence: 10,
      instinct: 10,
      initiative: 10,
    },
    tags,
    fieldVerification: {},
    unresolvedQuestions: [],
  };
}

function fictionalAbility(
  id: string,
  name: string,
  kind: AbilityDefinition['kind'],
  tags: EffectTag[],
): AbilityDefinition {
  return {
    id,
    dragonId: id.replace('-habit', ''),
    kind,
    name,
    abilityClass: kind === 'command' ? 'active' : 'passive',
    unlockStarRank: kind === 'habit' ? 1 : null,
    minimumDragonLevel: null,
    rawDescription: 'Synthetic ability for test coverage.',
    schedules: [
      {
        id: `${id}-schedule`,
        timing: 'each-round',
        rounds: [],
        triggerChanceFixed: 25,
        triggerChanceByHabitLevel: [],
        effects: [
          {
            id: `${id}-effect`,
            type: tags[0] ?? 'Synthetic',
            target: 'Enemy',
            targetScope: 'unknown',
            magnitude: 10,
            unit: 'percent',
            durationRounds: 1,
            duration: null,
            scaling: [],
            excludes: [],
            notes: [],
            rankedValues: [],
          },
        ],
      },
    ],
    powerByHabitLevel: [],
    glossaryEntries: [],
    tags,
    verification: {
      status: 'community-verified',
      source: 'Synthetic test fixture',
      capturedAt: '2026-06-23',
      gameVersion: null,
      reviewedManually: true,
    },
    evidenceIds: ['synthetic-test-source'],
    unresolvedQuestions: [],
    positionRequirement: null,
  };
}
