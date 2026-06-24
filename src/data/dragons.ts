import type {
  AbilityDefinition,
  AbilityEffect,
  AbilitySchedule,
  AffinityLevel,
  Dragon,
  DragonBreed,
  DragonRarity,
  EffectTag,
  FieldVerification,
  RankedValue,
  TargetScope,
  TriggerTiming,
} from '../models/dragon';

const verifiedAt = '2026-06-23';
const dataStatus = 'official-metadata-only' as const;
const unknownAffinities: Record<'Cavalry' | 'Shieldbearers' | 'Archers' | 'Spearmen' | 'Siege', AffinityLevel> = {
  Cavalry: 'unknown',
  Shieldbearers: 'unknown',
  Archers: 'unknown',
  Spearmen: 'unknown',
  Siege: 'unknown',
};

const officialMetadataVerification: FieldVerification = {
  status: 'officially-confirmed',
  source: 'Official public roster page',
  capturedAt: verifiedAt,
  gameVersion: null,
  reviewedManually: true,
};

const screenshotVerification = (source: string): FieldVerification => ({
  status: 'screenshot-verified',
  source,
  capturedAt: verifiedAt,
  gameVersion: null,
  reviewedManually: true,
});

const partialScreenshotVerification = (source: string): FieldVerification => ({
  status: 'partially-screenshot-verified',
  source,
  capturedAt: verifiedAt,
  gameVersion: null,
  reviewedManually: true,
});

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
      instinct: null,
      initiative: null,
    },
    tags: [],
    trait: null,
    fieldVerification: {
      identity: officialMetadataVerification,
      rarity: officialMetadataVerification,
      breed: officialMetadataVerification,
    },
    unresolvedQuestions: [],
  };
};

const rankedPercents = (values: number[]): RankedValue[] =>
  values.map((value, index) => ({
    level: (index + 1) as 1 | 2 | 3 | 4 | 5,
    value,
    unit: 'percent',
  }));

const rankedPowers = (values: number[]): RankedValue[] =>
  values.map((value, index) => ({
    level: (index + 1) as 1 | 2 | 3 | 4 | 5,
    value,
    unit: 'power',
  }));

const fixedEffect = ({
  id,
  type,
  target,
  targetScope,
  magnitude,
  unit,
  durationRounds = null,
  duration = null,
  scaling = [],
  excludes = [],
  notes = [],
  rankedValues = [],
}: {
  id: string;
  type: string;
  target: string;
  targetScope: TargetScope;
  magnitude: number | null;
  unit: AbilityEffect['unit'];
  durationRounds?: number | null;
  duration?: string | null;
  scaling?: string[];
  excludes?: string[];
  notes?: string[];
  rankedValues?: RankedValue[];
}): AbilityEffect => ({
  id,
  type,
  target,
  targetScope,
  magnitude,
  unit,
  durationRounds,
  duration,
  scaling,
  excludes,
  notes,
  rankedValues,
});

const schedule = ({
  id,
  timing,
  rounds = [],
  triggerChanceFixed = null,
  triggerChanceByHabitLevel = [],
  effects,
}: {
  id: string;
  timing: TriggerTiming;
  rounds?: number[];
  triggerChanceFixed?: number | null;
  triggerChanceByHabitLevel?: RankedValue[];
  effects: AbilityEffect[];
}): AbilitySchedule => ({
  id,
  timing,
  rounds,
  triggerChanceFixed,
  triggerChanceByHabitLevel,
  effects,
});

const ability = ({
  id,
  kind,
  name,
  abilityClass,
  unlockStarRank,
  minimumDragonLevel = null,
  rawDescription,
  schedules,
  powerByHabitLevel = [],
  glossaryEntries = [],
  tags,
  verification,
  evidenceIds,
  unresolvedQuestions = [],
  positionRequirement = null,
}: Omit<
  AbilityDefinition,
  | 'dragonId'
  | 'minimumDragonLevel'
  | 'powerByHabitLevel'
  | 'glossaryEntries'
  | 'unresolvedQuestions'
  | 'positionRequirement'
> &
  Partial<
    Pick<
      AbilityDefinition,
      | 'minimumDragonLevel'
      | 'powerByHabitLevel'
      | 'glossaryEntries'
      | 'unresolvedQuestions'
      | 'positionRequirement'
    >
  >): AbilityDefinition => ({
  id,
  dragonId: 'malachite',
  kind,
  name,
  abilityClass,
  unlockStarRank,
  minimumDragonLevel,
  rawDescription,
  schedules,
  powerByHabitLevel,
  glossaryEntries,
  tags,
  verification,
  evidenceIds,
  unresolvedQuestions,
  positionRequirement,
});

const standardHabitPower = rankedPowers([420, 920, 1500, 2200, 3100]);
const malachiteCommand = ability({
  id: 'malachite-wardens-rally',
  kind: 'command',
  name: "Warden's Rally",
  abilityClass: 'active',
  unlockStarRank: null,
  rawDescription:
    'Rounds 2, 4, 7, 9: Deal Tactical Damage to 1 Enemy in the same lane (Damage Rate: +100%).\n\nRounds 3, 6, 9: Apply Recovery to 3 Allies in any lane (Recovery Rate: +70%, enhanced by Instinct).',
  schedules: [
    schedule({
      id: 'wardens-rally-tactical-damage',
      timing: 'specific-rounds',
      rounds: [2, 4, 7, 9],
      effects: [
        fixedEffect({
          id: 'wardens-rally-tactical-damage-rate',
          type: 'Tactical Damage',
          target: '1 Enemy',
          targetScope: 'same-lane',
          magnitude: 100,
          unit: 'rate',
          scaling: ['attacker Instinct'],
          notes: ['Mitigated by target Intelligence'],
        }),
      ],
    }),
    schedule({
      id: 'wardens-rally-recovery',
      timing: 'specific-rounds',
      rounds: [3, 6, 9],
      effects: [
        fixedEffect({
          id: 'wardens-rally-recovery-rate',
          type: 'Recovery',
          target: '3 Allies',
          targetScope: 'any-lane',
          magnitude: 70,
          unit: 'rate',
          scaling: ['dragon Level', 'Instinct'],
          notes: ['Whether 3 Allies includes Malachite is unresolved.'],
        }),
      ],
    }),
  ],
  glossaryEntries: [
    {
      term: 'Tactical Damage',
      definition:
        "Tactical Damage is increased by the attacker's Instinct and mitigated by the target's Intelligence.",
    },
    {
      term: 'Recovery',
      definition:
        'Restores troops to the target. Recovery amount scales with dragon Level and is enhanced by Instinct.',
    },
  ],
  tags: [
    'TACTICAL_DAMAGE',
    'RECOVERY',
    'SAME_LANE_TARGET',
    'ANY_LANE_TARGET',
    'ENHANCED_BY_INSTINCT',
    'SCALES_WITH_LEVEL',
    'SPECIFIC_ROUNDS',
    'MULTI_SCHEDULE_COMMAND',
  ],
  verification: screenshotVerification("Warden's Rally summary and glossary screenshots"),
  evidenceIds: [
    'malachite-wardens-rally-summary-2026-06-23',
    'malachite-wardens-rally-glossary-2026-06-23',
  ],
  unresolvedQuestions: [
    'Whether "3 Allies" includes Malachite.',
    'Exact Level and Instinct scaling formulas.',
  ],
});

const malachiteTrait = ability({
  id: 'malachite-sentinels-presence',
  kind: 'trait',
  name: "Sentinel's Presence",
  abilityClass: 'passive',
  unlockStarRank: 1,
  minimumDragonLevel: 16,
  rawDescription:
    'At Level 16+ and deployed in the Vanguard Increase your Recovery Dealt by +15% and Instinct by +25. Increase Fire Damage Dealt by +16% of the Ally deployed in the Left Flank.',
  schedules: [
    schedule({
      id: 'sentinels-presence-passive',
      timing: 'passive',
      effects: [
        fixedEffect({
          id: 'sentinels-presence-recovery-dealt',
          type: 'Recovery Dealt Up',
          target: 'Self',
          targetScope: 'self',
          magnitude: 15,
          unit: 'percent',
        }),
        fixedEffect({
          id: 'sentinels-presence-instinct',
          type: 'Instinct Up',
          target: 'Self',
          targetScope: 'self',
          magnitude: 25,
          unit: 'flat',
        }),
        fixedEffect({
          id: 'sentinels-presence-left-flank-fire',
          type: 'Fire Damage Dealt Up',
          target: 'Ally deployed in Left Flank',
          targetScope: 'left-flank',
          magnitude: 16,
          unit: 'percent',
        }),
      ],
    }),
  ],
  tags: [
    'RECOVERY_DEALT_UP',
    'INSTINCT_UP',
    'FIRE_DAMAGE_UP',
    'VANGUARD_REQUIRED',
    'LEFT_FLANK_TARGET',
    'BUFF_SELF',
    'BUFF_ALLIES',
  ],
  verification: screenshotVerification("Sentinel's Presence screenshot"),
  evidenceIds: ['malachite-sentinels-presence-2026-06-23'],
  positionRequirement: 'vanguard',
});

const malachiteHabits = [
  ability({
    id: 'malachite-forests-instinct',
    kind: 'habit',
    name: "Forest's Instinct",
    abilityClass: 'passive',
    unlockStarRank: 2,
    rawDescription:
      'Each Round: 35% chance to increase the Physical Damage Dealt (excluding Basic Attacks) by +8% and reduce the Tactical Damage Received by -8% of 2 other Allies in any lane for 2 round(s).',
    schedules: [
      schedule({
        id: 'forests-instinct-each-round',
        timing: 'each-round',
        triggerChanceFixed: 35,
        effects: [
          fixedEffect({
            id: 'forests-instinct-physical-damage',
            type: 'Physical Damage Dealt Up',
            target: '2 other Allies',
            targetScope: 'any-lane',
            magnitude: 8,
            unit: 'percent',
            durationRounds: 2,
            excludes: ['Basic Attacks'],
            rankedValues: rankedPercents([8, 9.6, 11.2, 13.6, 16]),
          }),
          fixedEffect({
            id: 'forests-instinct-tactical-reduction',
            type: 'Tactical Damage Received Reduction',
            target: '2 other Allies',
            targetScope: 'any-lane',
            magnitude: 8,
            unit: 'percent',
            durationRounds: 2,
            rankedValues: rankedPercents([8, 9.6, 11.2, 13.6, 16]),
          }),
        ],
      }),
    ],
    powerByHabitLevel: standardHabitPower,
    tags: [
      'PHYSICAL_DAMAGE_UP',
      'TACTICAL_DAMAGE_RECEIVED_DOWN',
      'EXCLUDES_BASIC_ATTACKS',
      'OTHER_ALLIES_TARGET',
      'ANY_LANE_TARGET',
      'BUFF_ALLIES',
    ],
    verification: screenshotVerification("Forest's Instinct screenshot"),
    evidenceIds: ['malachite-forests-instinct-2026-06-23'],
  }),
  ability({
    id: 'malachite-wise-vigor',
    kind: 'habit',
    name: 'Wise Vigor',
    abilityClass: 'passive',
    unlockStarRank: 4,
    rawDescription:
      'Start of Combat: Increase your Instinct by +20% and Recovery Dealt by +20% until the end of combat.',
    schedules: [
      schedule({
        id: 'wise-vigor-start-combat',
        timing: 'start-of-combat',
        effects: [
          fixedEffect({
            id: 'wise-vigor-instinct',
            type: 'Instinct Up',
            target: 'Self',
            targetScope: 'self',
            magnitude: 20,
            unit: 'percent',
            duration: 'Until end of combat',
            rankedValues: rankedPercents([20, 24, 28, 34, 40]),
          }),
          fixedEffect({
            id: 'wise-vigor-recovery',
            type: 'Recovery Dealt Up',
            target: 'Self',
            targetScope: 'self',
            magnitude: 20,
            unit: 'percent',
            duration: 'Until end of combat',
            rankedValues: rankedPercents([20, 24, 28, 34, 40]),
          }),
        ],
      }),
    ],
    powerByHabitLevel: standardHabitPower,
    tags: ['INSTINCT_UP', 'RECOVERY_DEALT_UP', 'BUFF_SELF'],
    verification: screenshotVerification('Wise Vigor screenshot'),
    evidenceIds: ['malachite-wise-vigor-2026-06-23'],
  }),
  ability({
    id: 'malachite-thunderous-roar',
    kind: 'habit',
    name: 'Thunderous Roar',
    abilityClass: 'passive',
    unlockStarRank: 6,
    rawDescription:
      "Each Round: 10% chance to grant Advantage (+20%) to 2 other Allies in any lane for 2 round(s). Advantage increases the target's Damage Dealt.",
    schedules: [
      schedule({
        id: 'thunderous-roar-each-round',
        timing: 'each-round',
        triggerChanceByHabitLevel: rankedPercents([10, 12, 14, 17, 20]),
        effects: [
          fixedEffect({
            id: 'thunderous-roar-advantage',
            type: 'Advantage',
            target: '2 other Allies',
            targetScope: 'any-lane',
            magnitude: 20,
            unit: 'percent',
            durationRounds: 2,
            notes: ['Advantage increases the target Damage Dealt. Magnitude is fixed in supplied table.'],
          }),
        ],
      }),
    ],
    powerByHabitLevel: standardHabitPower,
    tags: ['DAMAGE_DEALT_UP', 'OTHER_ALLIES_TARGET', 'ANY_LANE_TARGET', 'BUFF_ALLIES'],
    verification: screenshotVerification('Thunderous Roar screenshot'),
    evidenceIds: ['malachite-thunderous-roar-2026-06-23'],
  }),
  ability({
    id: 'malachite-collective-might',
    kind: 'habit',
    name: 'Collective Might',
    abilityClass: 'passive',
    unlockStarRank: 8,
    rawDescription:
      'Start of Combat: Increase Strength by +12.5% (enhanced by Strength) of 3 Allies in any lane until the end of combat.',
    schedules: [
      schedule({
        id: 'collective-might-start-combat',
        timing: 'start-of-combat',
        effects: [
          fixedEffect({
            id: 'collective-might-strength',
            type: 'Strength Up',
            target: '3 Allies',
            targetScope: 'any-lane',
            magnitude: 12.5,
            unit: 'percent',
            duration: 'Until end of combat',
            scaling: ['Strength'],
            rankedValues: rankedPercents([12.5, 15, 17.5, 21.25, 25]),
          }),
        ],
      }),
    ],
    powerByHabitLevel: standardHabitPower,
    tags: ['STRENGTH_UP', 'ENHANCED_BY_STRENGTH', 'ANY_LANE_TARGET', 'BUFF_ALLIES'],
    verification: screenshotVerification('Collective Might screenshot'),
    evidenceIds: ['malachite-collective-might-2026-06-23'],
    unresolvedQuestions: [
      'Does "3 Allies" include Malachite?',
      'Exact enhanced-by-Strength formula.',
    ],
  }),
  ability({
    id: 'malachite-lightning-strike',
    kind: 'habit',
    name: 'Lightning Strike',
    abilityClass: 'passive',
    unlockStarRank: 10,
    rawDescription:
      'Start of Round 1: 40% chance to grant First-Strike, Double-Strike, and increase Strength by +25% (enhanced by Instinct) of 1 other Ally within adjacency for 3 round(s).',
    schedules: [
      schedule({
        id: 'lightning-strike-round-one',
        timing: 'start-of-round',
        rounds: [1],
        triggerChanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]),
        effects: [
          fixedEffect({
            id: 'lightning-strike-first-strike',
            type: 'First-Strike',
            target: '1 other Ally',
            targetScope: 'within-adjacency',
            magnitude: null,
            unit: 'unknown',
            durationRounds: 3,
          }),
          fixedEffect({
            id: 'lightning-strike-double-strike',
            type: 'Double-Strike',
            target: '1 other Ally',
            targetScope: 'within-adjacency',
            magnitude: null,
            unit: 'unknown',
            durationRounds: 3,
          }),
          fixedEffect({
            id: 'lightning-strike-strength',
            type: 'Strength Up',
            target: '1 other Ally',
            targetScope: 'within-adjacency',
            magnitude: 25,
            unit: 'percent',
            durationRounds: 3,
            scaling: ['Instinct'],
          }),
        ],
      }),
    ],
    powerByHabitLevel: rankedPowers([430, 1000, 1700, 2700, 4000]),
    glossaryEntries: [
      {
        term: 'First-Strike',
        definition: 'Causes the target to act before all other combatants each round.',
      },
      {
        term: 'Double-Strike',
        definition: 'Grants the target a second Basic Attack each round.',
      },
    ],
    tags: [
      'FIRST_STRIKE',
      'DOUBLE_STRIKE',
      'STRENGTH_UP',
      'ENHANCED_BY_INSTINCT',
      'ADJACENT_TARGET',
      'OTHER_ALLIES_TARGET',
      'BUFF_ALLIES',
    ],
    verification: screenshotVerification('Lightning Strike screenshot'),
    evidenceIds: ['malachite-lightning-strike-2026-06-23'],
    unresolvedQuestions: ['Exact adjacency graph.', 'Exact enhanced-by-Instinct formula.'],
  }),
] satisfies AbilityDefinition[];

const createMalachite = (): Dragon => ({
  ...createDragon('Malachite', 'Legendary', 'Sentinel'),
  dataStatus: 'community-verified',
  command: malachiteCommand,
  trait: malachiteTrait,
  habits: malachiteHabits,
  affinities: {
    Cavalry: 'positive',
    Shieldbearers: 'positive',
    Archers: 'negative',
    Spearmen: 'unknown',
    Siege: 'unknown',
  },
  tags: [
    ...new Set<EffectTag>([
      ...malachiteCommand.tags,
      ...malachiteTrait.tags,
      ...malachiteHabits.flatMap((habit) => habit.tags),
    ]),
  ],
  fieldVerification: {
    identity: officialMetadataVerification,
    rarity: officialMetadataVerification,
    breed: officialMetadataVerification,
    affinities: partialScreenshotVerification('Malachite main screen screenshot'),
    command: screenshotVerification("Warden's Rally screenshots"),
    trait: screenshotVerification("Sentinel's Presence screenshot"),
    habits: screenshotVerification('Malachite Habit screenshots'),
    canonicalBaseStats: {
      status: 'unknown',
      source: 'No canonical base-stat source verified',
      capturedAt: null,
      gameVersion: null,
      reviewedManually: true,
    },
    formationInteractions: partialScreenshotVerification('Army Builder formation screenshot'),
  },
  unresolvedQuestions: [
    'Exact adjacency graph for within adjacency effects.',
    'Whether Warden\'s Rally "3 Allies" includes Malachite.',
    'Whether Collective Might "3 Allies" includes Malachite.',
    'Exact enhanced-by-Strength formula.',
    'Exact enhanced-by-Instinct formula.',
    'Canonical base stats remain unknown.',
  ],
});

export const dragons: Dragon[] = [
  createDragon('Syrax', 'Legendary', 'Sentinel'),
  createDragon('Vhagar', 'Legendary', 'Warrior'),
  createDragon('Caraxes', 'Legendary', 'Hunter'),
  createDragon('Seasmoke', 'Legendary', 'Champion'),
  createDragon('Solstryker', 'Rare', 'Champion'),
  createDragon('Crimson', 'Legendary', 'Hunter'),
  createDragon('Kalspire', 'Legendary', 'Champion'),
  createMalachite(),
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
