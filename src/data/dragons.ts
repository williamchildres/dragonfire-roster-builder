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
  AbilityCondition,
  ConditionalMultiplier,
  EffectSourceScope,
  StackConfiguration,
  TargetPriority,
  CasterEligibility,
  PerTargetEffectCheck,
} from '../models/dragon';
import { databaseMetadata } from './databaseMetadata';

const verifiedAt = '2026-06-23';
const verifiedGameBuild = databaseMetadata.currentDocumentedGameBuild;
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
  gameVersion: verifiedGameBuild,
  reviewedManually: true,
});

const partialScreenshotVerification = (source: string): FieldVerification => ({
  status: 'partially-screenshot-verified',
  source,
  capturedAt: verifiedAt,
  gameVersion: verifiedGameBuild,
  reviewedManually: true,
});

const createDragon = (
  name: string,
  rarity: DragonRarity,
  breed: DragonBreed,
  isNew = false,
  options: Partial<Pick<Dragon, 'officialProfileUrl' | 'rosterSourceStatus' | 'firstObservedInGame' | 'gameVersion'>> = {},
): Dragon => {
  const slug = name.toLowerCase().replaceAll(' ', '-');

  return {
    id: slug,
    slug,
    name,
    rarity,
    breed,
    officialProfileUrl: Object.hasOwn(options, 'officialProfileUrl')
      ? (options.officialProfileUrl ?? null)
      : `https://gotdragonfire.com/dragons/${slug}/`,
    rosterSourceStatus: options.rosterSourceStatus ?? 'official-website',
    firstObservedInGame: options.firstObservedInGame ?? null,
    gameVersion: options.gameVersion ?? null,
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

const condition = (
  id: string,
  kind: AbilityCondition['kind'],
  description: string,
  options: Partial<AbilityCondition> = {},
): AbilityCondition => ({
  id,
  kind,
  subject: options.subject ?? 'target',
  statusId: options.statusId ?? null,
  thresholdPercent: options.thresholdPercent ?? null,
  comparison: options.comparison ?? null,
  battleContext: options.battleContext ?? null,
  description,
  unresolved: options.unresolved ?? false,
});

const stack = ({
  statusId,
  maximumStacks,
  durationRounds = null,
  untilEndOfCombat = false,
  valuePerStackFixed = null,
  valuePerStackByHabitLevel = [],
  refreshBehavior = 'unknown',
}: Partial<StackConfiguration> & Pick<StackConfiguration, 'statusId' | 'maximumStacks'>): StackConfiguration => ({
  statusId,
  maximumStacks,
  durationRounds,
  untilEndOfCombat,
  valuePerStackFixed,
  valuePerStackByHabitLevel,
  refreshBehavior,
});

const multiplier = (
  id: string,
  value: number,
  abilityCondition: AbilityCondition,
  description: string,
  directlyVerifiedValues: RankedValue[] = [],
): ConditionalMultiplier => ({
  id,
  multiplier: value,
  condition: abilityCondition,
  directlyVerifiedValues,
  calculatedFromVerifiedMultiplier: true,
  description,
});

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
  sourceScope = 'unknown',
  targetPriority = 'any-eligible',
  conditions = [],
  stack = null,
  conditionalMultipliers = [],
  directlyVerified = true,
  calculated = false,
  targetCount = null,
  includesCaster = null,
  casterEligibility = 'unknown',
  perTargetEffectCheck = null,
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
  sourceScope?: EffectSourceScope;
  targetPriority?: TargetPriority;
  conditions?: AbilityCondition[];
  stack?: StackConfiguration | null;
  conditionalMultipliers?: ConditionalMultiplier[];
  directlyVerified?: boolean;
  calculated?: boolean;
  targetCount?: number | null;
  includesCaster?: boolean | null;
  casterEligibility?: CasterEligibility;
  perTargetEffectCheck?: PerTargetEffectCheck | null;
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
  sourceScope,
  targetPriority,
  conditions,
  stack,
  conditionalMultipliers,
  directlyVerified,
  calculated,
  targetCount,
  includesCaster,
  casterEligibility,
  perTargetEffectCheck,
});

const schedule = ({
  id,
  timing,
  rounds = [],
  triggerChanceFixed = null,
  triggerChanceByHabitLevel = [],
  effects,
  attempts = null,
  repeat = null,
  conditions = [],
  targetPriority = 'any-eligible',
  battleContext = 'unspecified',
}: {
  id: string;
  timing: TriggerTiming;
  rounds?: number[];
  triggerChanceFixed?: number | null;
  triggerChanceByHabitLevel?: RankedValue[];
  effects: AbilityEffect[];
  attempts?: AbilitySchedule['attempts'];
  repeat?: AbilitySchedule['repeat'];
  conditions?: AbilityCondition[];
  targetPriority?: TargetPriority;
  battleContext?: AbilitySchedule['battleContext'];
}): AbilitySchedule => ({
  id,
  timing,
  rounds,
  triggerChanceFixed,
  triggerChanceByHabitLevel,
  effects,
  triggerEvent: timing,
  attempts,
  repeat,
  conditions,
  targetPriority,
  battleContext,
});

const ability = ({
  dragonId = 'malachite',
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
  augmentations = [],
}: Omit<
  AbilityDefinition,
  | 'dragonId'
  | 'minimumDragonLevel'
  | 'powerByHabitLevel'
  | 'glossaryEntries'
  | 'unresolvedQuestions'
  | 'positionRequirement'
  | 'augmentations'
> &
  Partial<
    Pick<
      AbilityDefinition,
      | 'dragonId'
      | 'minimumDragonLevel'
      | 'powerByHabitLevel'
      | 'glossaryEntries'
      | 'unresolvedQuestions'
      | 'positionRequirement'
      | 'augmentations'
    >
  >): AbilityDefinition => ({
  id,
  dragonId,
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
  augmentations,
});

const standardHabitPower = rankedPowers([420, 920, 1500, 2200, 3100]);
const finalLegendaryPowerEarly = rankedPowers([430, 1000, 1700, 2700, 4000]);

const selfFirstStrikeCondition = condition(
  'self-has-first-strike',
  'self-has-status',
  'Self has First-Strike.',
  { subject: 'self', statusId: 'first-strike' },
);

const anyEnemySlowCondition = condition(
  'any-enemy-has-slow',
  'any-enemy-has-status',
  'Any enemy is afflicted with Slow.',
  { subject: 'enemy', statusId: 'slow' },
);

const enemyBelowHalfMaximumTroops = condition(
  'enemy-below-50-maximum-troops',
  'target-below-troop-capacity-threshold',
  'Enemy is below 50% maximum Troop Capacity.',
  { subject: 'enemy', thresholdPercent: 50, comparison: 'below' },
);

const enemyRetreatedPreviousRound = condition(
  'enemy-retreated-previous-round',
  'previous-round-event',
  'Enemy retreated during the previous round.',
  { subject: 'enemy' },
);

const createSyrax = (): Dragon => {
  const strategicRevivalRecovery = fixedEffect({
    id: 'strategic-revival-recovery',
    type: 'Recovery',
    target: 'Ally with least current troops',
    targetScope: 'any-lane',
    magnitude: null,
    unit: 'rate',
    rankedValues: rankedPercents([50, 60, 70, 85, 100]),
    scaling: ['Initiative', 'dragon Level'],
    targetPriority: 'least-current-troops-ally',
    conditionalMultipliers: [
      multiplier('strategic-revival-slow-1-5x', 1.5, anyEnemySlowCondition, 'Recovery is multiplied by 1.5 if any enemy has Slow.', [
        { level: 1, value: 75, unit: 'percent' },
      ]),
    ],
    notes: ['Higher conditional Recovery values are calculated from the verified 1.5x multiplier.'],
  });
  const strategicRevivalResistance = fixedEffect({
    id: 'strategic-revival-resistance',
    type: 'Resistance',
    target: 'Ally with least current troops',
    targetScope: 'any-lane',
    magnitude: 20,
    unit: 'percent',
    durationRounds: 2,
    targetPriority: 'least-current-troops-ally',
    notes: ['Resistance reduces Damage Received.'],
  });
  const strategicRevivalSchedule = schedule({
    id: 'strategic-revival-recovery-rounds',
    timing: 'specific-rounds',
    rounds: [2, 5, 8],
    triggerChanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]),
    targetPriority: 'least-current-troops-ally',
    effects: [strategicRevivalRecovery, strategicRevivalResistance],
  });

  const command = ability({
    dragonId: 'syrax',
    id: 'syrax-blazing-fury',
    kind: 'command',
    name: 'Blazing Fury',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription:
      'Each Round: 20% chance to increase Fire Damage Dealt by 10% and grant First-Strike to one Ally in any lane for 2 rounds, prioritizing allies that deal Fire Damage. Rounds 1, 4, 6, 9: deal Tactical Damage to one enemy within adjacency.',
    schedules: [
      schedule({
        id: 'blazing-fury-fire-support',
        timing: 'each-round',
        triggerChanceFixed: 20,
        targetPriority: 'prefer-fire-damage-ally',
        effects: [
          fixedEffect({
            id: 'blazing-fury-fire-damage-up',
            type: 'Fire Damage Dealt Up',
            target: '1 Ally',
            targetScope: 'any-lane',
            magnitude: 10,
            unit: 'percent',
            durationRounds: 2,
            targetPriority: 'prefer-fire-damage-ally',
            casterEligibility: 'eligible-if-targeting-allows',
            notes: ['Selection prioritizes allies with verified Fire Damage output.'],
          }),
          fixedEffect({
            id: 'blazing-fury-first-strike',
            type: 'First-Strike',
            target: '1 Ally',
            targetScope: 'any-lane',
            magnitude: null,
            unit: 'unknown',
            durationRounds: 2,
            targetPriority: 'prefer-fire-damage-ally',
            casterEligibility: 'eligible-if-targeting-allows',
          }),
        ],
      }),
      schedule({
        id: 'blazing-fury-tactical-damage',
        timing: 'specific-rounds',
        rounds: [1, 4, 6, 9],
        effects: [
          fixedEffect({
            id: 'blazing-fury-tactical-rate',
            type: 'Tactical Damage',
            target: '1 Enemy',
            targetScope: 'within-adjacency',
            magnitude: 110,
            unit: 'rate',
            scaling: ['attacker Instinct'],
            notes: ['Mitigated by target Intelligence.', 'Enemy adjacency semantics are not yet verified.'],
          }),
        ],
      }),
    ],
    tags: ['TACTICAL_DAMAGE', 'FIRE_DAMAGE_UP', 'FIRST_STRIKE', 'ANY_LANE_TARGET'],
    verification: screenshotVerification('Syrax Blazing Fury screenshots'),
    evidenceIds: ['syrax-blazing-fury-summary-2026-06-24', 'syrax-blazing-fury-details-2026-06-24'],
    unresolvedQuestions: ['Enemy adjacency semantics for Tactical Damage target.'],
  });
  command.augmentations.push({
    id: 'syrax-strategic-revival-augmentation',
    sourceAbilityId: 'syrax-strategic-revival',
    modifiesAbilityId: 'syrax-blazing-fury',
    minimumDragonStarRank: 6,
    schedulesAdded: [strategicRevivalSchedule],
    effectsAdded: strategicRevivalSchedule.effects,
    rawDescription: 'At 6 Stars, Strategic Revival augments Blazing Fury with Recovery and Resistance on rounds 2, 5, and 8.',
    evidenceIds: ['syrax-strategic-revival-2026-06-24'],
  });

  const trait = ability({
    dragonId: 'syrax',
    id: 'syrax-sentinels-wit',
    kind: 'trait',
    name: "Sentinel's Wit",
    abilityClass: 'passive',
    unlockStarRank: 1,
    minimumDragonLevel: 16,
    positionRequirement: 'vanguard',
    rawDescription: 'At Level 16+ and deployed in Vanguard, increase Syrax Tactical Damage Dealt by 16%. Increase Instinct and Initiative of Left Flank ally by +20.',
    schedules: [
      schedule({
        id: 'sentinels-wit-passive',
        timing: 'passive',
        effects: [
          fixedEffect({ id: 'sentinels-wit-tactical', type: 'Tactical Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: 16, unit: 'percent', sourceScope: 'all-sources' }),
          fixedEffect({ id: 'sentinels-wit-left-instinct', type: 'Instinct Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }),
          fixedEffect({ id: 'sentinels-wit-left-initiative', type: 'Initiative Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }),
        ],
      }),
    ],
    tags: ['TACTICAL_DAMAGE', 'INSTINCT_UP', 'BUFF_INITIATIVE', 'VANGUARD_REQUIRED', 'LEFT_FLANK_TARGET'],
    verification: screenshotVerification("Syrax Sentinel's Wit screenshot"),
    evidenceIds: ['syrax-sentinels-wit-2026-06-24'],
  });

  const habits = [
    ability({
      dragonId: 'syrax', id: 'syrax-mindful-synergy', kind: 'habit', name: 'Mindful Synergy', abilityClass: 'passive', unlockStarRank: 2,
      rawDescription: 'Start of Combat: increase Intelligence and Instinct of 3 Allies in any lane until end of combat, enhanced by Syrax Initiative.',
      schedules: [schedule({ id: 'mindful-synergy-start', timing: 'start-of-combat', effects: [
        fixedEffect({ id: 'mindful-synergy-intelligence', type: 'Intelligence Up', target: '3 Allies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6.5, 7.8, 9.1, 11.05, 13]), scaling: ['Initiative'], duration: 'Until end of combat', targetCount: 3, includesCaster: true, casterEligibility: 'included' }),
        fixedEffect({ id: 'mindful-synergy-instinct', type: 'Instinct Up', target: '3 Allies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6.5, 7.8, 9.1, 11.05, 13]), scaling: ['Initiative'], duration: 'Until end of combat', targetCount: 3, includesCaster: true, casterEligibility: 'included' }),
      ] })],
      powerByHabitLevel: standardHabitPower, tags: ['BUFF_INTELLIGENCE', 'BUFF_INSTINCTS', 'BUFF_ALLIES'], verification: screenshotVerification('Syrax Mindful Synergy screenshot'), evidenceIds: ['syrax-mindful-synergy-2026-06-24'], unresolvedQuestions: ['Exact enhanced-by-Initiative formula.'],
    }),
    ability({
      dragonId: 'syrax', id: 'syrax-flight-mastery', kind: 'habit', name: 'Flight Mastery', abilityClass: 'passive', unlockStarRank: 4,
      rawDescription: 'Start of Combat: increase Initiative of 3 Allies and reduce Initiative of 3 Enemies in any lane until end of combat, enhanced by Syrax Instinct.',
      schedules: [schedule({ id: 'flight-mastery-start', timing: 'start-of-combat', effects: [
        fixedEffect({ id: 'flight-mastery-initiative-up', type: 'Initiative Up', target: '3 Allies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6, 7.2, 8.4, 10.2, 12]), scaling: ['Instinct'], duration: 'Until end of combat', targetCount: 3, includesCaster: true, casterEligibility: 'included' }),
        fixedEffect({ id: 'flight-mastery-initiative-down', type: 'Initiative Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6, 7.2, 8.4, 10.2, 12]), scaling: ['Instinct'], duration: 'Until end of combat', targetCount: 3 }),
      ] })],
      powerByHabitLevel: standardHabitPower, tags: ['BUFF_INITIATIVE', 'DEBUFF_INITIATIVE'], verification: screenshotVerification('Syrax Flight Mastery screenshot'), evidenceIds: ['syrax-flight-mastery-2026-06-24'], unresolvedQuestions: ['Exact enhanced-by-Instinct formula.'],
    }),
    ability({
      dragonId: 'syrax', id: 'syrax-strategic-revival', kind: 'habit', name: 'Strategic Revival', abilityClass: 'passive', unlockStarRank: 6,
      rawDescription: 'Augments Blazing Fury: Rounds 2, 5, 8 recover the Ally with least current troops. Recovery is multiplied by 1.5 if any enemy has Slow. Chance to grant Resistance (-20%) for 2 rounds.',
      schedules: [strategicRevivalSchedule], powerByHabitLevel: standardHabitPower, tags: ['COMMAND_AUGMENTATION', 'RECOVERY', 'RESISTANCE'], verification: screenshotVerification('Syrax Strategic Revival screenshot'), evidenceIds: ['syrax-strategic-revival-2026-06-24'], unresolvedQuestions: ['Exact Recovery formula.', 'Higher conditional Recovery values are calculated.'],
    }),
    ability({
      dragonId: 'syrax', id: 'syrax-tactical-inferno', kind: 'habit', name: 'Tactical Inferno', abilityClass: 'passive', unlockStarRank: 8,
      rawDescription: 'Start of Round 1: increase Tactical Damage Dealt of one Ally, prioritizing Left Flank, and Fire Damage Dealt of one Ally, prioritizing Right Flank, for 3 rounds.',
      schedules: [schedule({ id: 'tactical-inferno-round-one', timing: 'start-of-round', rounds: [1], effects: [
        fixedEffect({ id: 'tactical-inferno-tactical', type: 'Tactical Damage Dealt Up', target: '1 Ally, prioritizing Left Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', durationRounds: 3, rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), targetPriority: 'prefer-left-flank', notes: ['Preferred position is not an absolute requirement.'] }),
        fixedEffect({ id: 'tactical-inferno-fire', type: 'Fire Damage Dealt Up', target: '1 Ally, prioritizing Right Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', durationRounds: 3, rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), targetPriority: 'prefer-right-flank', notes: ['Preferred position is not an absolute requirement.'] }),
      ] })],
      powerByHabitLevel: standardHabitPower, tags: ['TACTICAL_DAMAGE', 'FIRE_DAMAGE_UP', 'BUFF_ALLIES'], verification: screenshotVerification('Syrax Tactical Inferno screenshot'), evidenceIds: ['syrax-tactical-inferno-2026-06-24'], unresolvedQuestions: ['Whether one mixed-damage Ally may receive both modifiers.', 'Fallback selection when preferred flank lacks matching output.'],
    }),
    ability({
      dragonId: 'syrax', id: 'syrax-mothers-mercy', kind: 'habit', name: "Mother's Mercy", abilityClass: 'passive', unlockStarRank: 10,
      rawDescription: 'Each Round: chance to cleanse two Negative effects and one Control effect from one Ally in any lane, prioritizing Allies afflicted with Control.',
      schedules: [schedule({ id: 'mothers-mercy-each-round', timing: 'each-round', triggerChanceByHabitLevel: rankedPercents([14, 18.2, 22.4, 28, 35]), targetPriority: 'prefer-control-afflicted-ally', effects: [
        fixedEffect({ id: 'mothers-mercy-cleanse-negative', type: 'Cleanse Negative', target: '1 Ally', targetScope: 'any-lane', magnitude: 2, unit: 'flat', targetPriority: 'prefer-control-afflicted-ally' }),
        fixedEffect({ id: 'mothers-mercy-cleanse-control', type: 'Cleanse Control', target: '1 Ally', targetScope: 'any-lane', magnitude: 1, unit: 'flat', targetPriority: 'prefer-control-afflicted-ally', notes: ['Control includes Stun, Stagger, Overwhelm, and Confusion.'] }),
      ] })],
      powerByHabitLevel: finalLegendaryPowerEarly, tags: ['CLEANSE_NEGATIVE', 'CONTROL'], verification: screenshotVerification("Syrax Mother's Mercy screenshot"), evidenceIds: ['syrax-mothers-mercy-2026-06-24'], unresolvedQuestions: ['Whether removing one Control also consumes one Negative-effect removal.', 'Selection order when multiple Control effects exist.'],
    }),
  ];

  return {
    ...createDragon('Syrax', 'Legendary', 'Sentinel'),
    dataStatus: 'community-verified',
    command,
    trait,
    habits,
    affinities: { Cavalry: 'unknown', Shieldbearers: 'unknown', Archers: 'positive', Spearmen: 'positive', Siege: 'negative' },
    tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])],
    fieldVerification: { identity: screenshotVerification('Syrax main screen screenshot'), command: screenshotVerification('Syrax Blazing Fury screenshots'), trait: screenshotVerification("Syrax Sentinel's Wit screenshot"), habits: screenshotVerification('Syrax Habit screenshots'), affinities: partialScreenshotVerification('Syrax main screen screenshot') },
    unresolvedQuestions: ['Enemy adjacency semantics for Blazing Fury Tactical Damage.', 'Exact stat-scaling formulas.'],
  };
};

const createCaraxes = (): Dragon => {
  const command = ability({
    dragonId: 'caraxes',
    id: 'caraxes-infernal-burst',
    kind: 'command',
    name: 'Infernal Burst',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription: 'Rounds 3, 6, 9: deal Fire Damage to 3 Enemies in any lane (Damage Rate +100%). If Caraxes has First-Strike, damage is multiplied by 1.5 and displayed as +150%.',
    schedules: [schedule({ id: 'infernal-burst-fire', timing: 'specific-rounds', rounds: [3, 6, 9], effects: [
      fixedEffect({ id: 'infernal-burst-fire-rate', type: 'Fire Damage', target: '3 Enemies', targetScope: 'any-lane', magnitude: 100, unit: 'rate', scaling: ['attacker Intelligence'], targetCount: 3, notes: ['Mitigated by target Initiative.'], conditionalMultipliers: [multiplier('infernal-burst-first-strike-1-5x', 1.5, selfFirstStrikeCondition, 'If Caraxes has First-Strike, damage is multiplied by 1.5.', [{ level: 1, value: 150, unit: 'percent' }])] }),
    ] })],
    tags: ['FIRE_DAMAGE', 'ANY_LANE_TARGET'], verification: screenshotVerification('Caraxes Infernal Burst screenshot'), evidenceIds: ['caraxes-infernal-burst-2026-06-24'],
  });

  const trait = ability({
    dragonId: 'caraxes', id: 'caraxes-hunters-wrath', kind: 'trait', name: "Hunter's Wrath", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard',
    rawDescription: 'At Level 16+ and deployed in Vanguard, increase Caraxes Fire Damage Dealt by 16%. Increase Strength and Initiative of Right Flank ally by +20.',
    schedules: [schedule({ id: 'hunters-wrath-passive', timing: 'passive', effects: [
      fixedEffect({ id: 'hunters-wrath-fire', type: 'Fire Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: 16, unit: 'percent', sourceScope: 'all-sources' }),
      fixedEffect({ id: 'hunters-wrath-right-strength', type: 'Strength Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 20, unit: 'flat' }),
      fixedEffect({ id: 'hunters-wrath-right-initiative', type: 'Initiative Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 20, unit: 'flat' }),
    ] })],
    tags: ['FIRE_DAMAGE_UP', 'STRENGTH_UP', 'BUFF_INITIATIVE', 'VANGUARD_REQUIRED', 'RIGHT_FLANK_TARGET'], verification: screenshotVerification("Caraxes Hunter's Wrath screenshot"), evidenceIds: ['caraxes-hunters-wrath-2026-06-24'],
  });

  const cripplingChance = rankedPercents([10, 12, 14, 17, 20]);
  const perTargetChecks: PerTargetEffectCheck = {
    targetCount: 3,
    effects: [
      { effectId: 'crippling-inferno-slow', independentlyChecked: true },
      { effectId: 'crippling-inferno-burn', independentlyChecked: true },
    ],
    targetsCheckedIndependently: true,
    sharedChanceByHabitLevel: cripplingChance,
  };

  const habits = [
    ability({ dragonId: 'caraxes', id: 'caraxes-battle-dread', kind: 'habit', name: 'Battle Dread', abilityClass: 'passive', unlockStarRank: 2,
      rawDescription: 'Start of Combat: reduce Strength and Initiative of 3 Enemies in any lane by -6%, enhanced by Caraxes Intelligence. Progression table shows -6.5% at Level 1.',
      schedules: [schedule({ id: 'battle-dread-start', timing: 'start-of-combat', effects: [
        fixedEffect({ id: 'battle-dread-strength-down', type: 'Strength Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6.5, 7.8, 9.1, 11.05, 13]), scaling: ['Intelligence'], targetCount: 3, duration: 'Until end of combat', notes: ['Raw description appears to state -6%; ranked table displays -6.5% at Level 1. Structured values use the ranked table.'] }),
        fixedEffect({ id: 'battle-dread-initiative-down', type: 'Initiative Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6.5, 7.8, 9.1, 11.05, 13]), scaling: ['Intelligence'], targetCount: 3, duration: 'Until end of combat', notes: ['Raw description appears to state -6%; ranked table displays -6.5% at Level 1. Structured values use the ranked table.'] }),
      ] })], powerByHabitLevel: standardHabitPower, tags: ['DEBUFF_STRENGTH', 'DEBUFF_INITIATIVE'], verification: screenshotVerification('Caraxes Battle Dread screenshot'), evidenceIds: ['caraxes-battle-dread-2026-06-24'], unresolvedQuestions: ['Raw text/table discrepancy retained.'] }),
    ability({ dragonId: 'caraxes', id: 'caraxes-dragons-flair', kind: 'habit', name: "Dragon's Flair", abilityClass: 'passive', unlockStarRank: 4,
      rawDescription: 'Start of Combat: increase Caraxes Fire Damage Dealt until end of combat.',
      schedules: [schedule({ id: 'dragons-flair-start', timing: 'start-of-combat', effects: [fixedEffect({ id: 'dragons-flair-fire', type: 'Fire Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12.5, 15, 17.5, 21.25, 25]), duration: 'Until end of combat', sourceScope: 'all-sources' })] })], powerByHabitLevel: standardHabitPower, tags: ['FIRE_DAMAGE_UP', 'BUFF_SELF'], verification: screenshotVerification("Caraxes Dragon's Flair screenshot"), evidenceIds: ['caraxes-dragons-flair-2026-06-24'] }),
    ability({ dragonId: 'caraxes', id: 'caraxes-crippling-inferno', kind: 'habit', name: 'Crippling Inferno', abilityClass: 'passive', unlockStarRank: 6,
      rawDescription: 'Each Round: chance to apply Slow and Burn to 3 Enemies in any lane. Each effect is checked separately for each target and lasts 2 rounds.',
      schedules: [schedule({ id: 'crippling-inferno-each-round', timing: 'each-round', triggerChanceByHabitLevel: cripplingChance, effects: [
        fixedEffect({ id: 'crippling-inferno-slow', type: 'Slow', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 2, targetCount: 3, perTargetEffectCheck: perTargetChecks, notes: ['Slow causes the target to attack after all other combatants each round.'] }),
        fixedEffect({ id: 'crippling-inferno-burn', type: 'Burn', target: '3 Enemies', targetScope: 'any-lane', magnitude: 20, unit: 'rate', durationRounds: 2, targetCount: 3, scaling: ['attacker Intelligence'], perTargetEffectCheck: perTargetChecks, notes: ['Burn deals Fire Damage each round and is mitigated by target Initiative.'] }),
      ] })], powerByHabitLevel: standardHabitPower, tags: ['SLOW', 'BURN', 'FIRE_DAMAGE'], verification: screenshotVerification('Caraxes Crippling Inferno screenshot'), evidenceIds: ['caraxes-crippling-inferno-2026-06-24'] }),
    ability({ dragonId: 'caraxes', id: 'caraxes-mass-enfeeble', kind: 'habit', name: 'Mass Enfeeble', abilityClass: 'passive', unlockStarRank: 8,
      rawDescription: 'Start of Combat: reduce Physical Damage Dealt, excluding Basic Attacks, of 3 Enemies in any lane by -5%. Progression table shows -5.5% at Level 1.',
      schedules: [schedule({ id: 'mass-enfeeble-start', timing: 'start-of-combat', effects: [fixedEffect({ id: 'mass-enfeeble-physical-down', type: 'Physical Damage Dealt Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5.5, 6.6, 7.7, 9.35, 11]), excludes: ['Basic Attacks'], sourceScope: 'non-basic-attacks', targetCount: 3, duration: 'Until end of combat', notes: ['Raw description appears to state -5%; ranked table displays -5.5% at Level 1. Structured values use the ranked table.'] })] })], powerByHabitLevel: standardHabitPower, tags: ['PHYSICAL_DAMAGE_UP', 'EXCLUDES_BASIC_ATTACKS'], verification: screenshotVerification('Caraxes Mass Enfeeble screenshot'), evidenceIds: ['caraxes-mass-enfeeble-2026-06-24'], unresolvedQuestions: ['Raw text/table discrepancy retained.'] }),
    ability({ dragonId: 'caraxes', id: 'caraxes-blood-wyrm', kind: 'habit', name: 'Blood Wyrm', abilityClass: 'passive', unlockStarRank: 10,
      rawDescription: 'Start of Each Round: for each Enemy below 50% maximum Troop Capacity, increase Caraxes Fire Damage Dealt. For each Enemy that retreated during the previous round, apply Recovery to Caraxes, enhanced by Initiative.',
      schedules: [
        schedule({ id: 'blood-wyrm-low-troops', timing: 'start-of-each-round', conditions: [enemyBelowHalfMaximumTroops], repeat: { mode: 'once-per-match', condition: enemyBelowHalfMaximumTroops, description: 'Repeat once for each enemy below 50% maximum Troop Capacity. Number of repetitions is battlefield-dependent.' }, effects: [fixedEffect({ id: 'blood-wyrm-fire-up', type: 'Fire Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([8, 10.4, 12.8, 16, 20]), conditions: [enemyBelowHalfMaximumTroops], notes: ['Duration and accumulation semantics are not stated.'], sourceScope: 'all-sources' })] }),
        schedule({ id: 'blood-wyrm-retreat-recovery', timing: 'when-enemy-retreated-previous-round', conditions: [enemyRetreatedPreviousRound], repeat: { mode: 'once-per-match', condition: enemyRetreatedPreviousRound, description: 'Repeat once for each enemy that retreated during the previous round. Number of repetitions is battlefield-dependent.' }, effects: [fixedEffect({ id: 'blood-wyrm-recovery', type: 'Recovery', target: 'Self', targetScope: 'self', magnitude: null, unit: 'rate', rankedValues: rankedPercents([40, 52, 64, 80, 100]), scaling: ['Initiative'], conditions: [enemyRetreatedPreviousRound], notes: ['Enhanced by Caraxes Initiative.'] })] }),
      ], powerByHabitLevel: finalLegendaryPowerEarly, tags: ['FIRE_DAMAGE_UP', 'RECOVERY', 'LOW_HEALTH'], verification: screenshotVerification('Caraxes Blood Wyrm screenshot'), evidenceIds: ['caraxes-blood-wyrm-2026-06-24'], unresolvedQuestions: ['Fire Damage increase duration and accumulation semantics are not stated.', 'Exact below 50% equality behavior remains unconfirmed.'] }),
  ];

  return {
    ...createDragon('Caraxes', 'Legendary', 'Hunter'),
    dataStatus: 'community-verified',
    command,
    trait,
    habits,
    affinities: { Cavalry: 'positive', Shieldbearers: 'unknown', Archers: 'unknown', Spearmen: 'positive', Siege: 'unknown' },
    tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])],
    fieldVerification: { identity: screenshotVerification('Caraxes main screen screenshot'), command: screenshotVerification('Caraxes Infernal Burst screenshot'), trait: screenshotVerification("Caraxes Hunter's Wrath screenshot"), habits: screenshotVerification('Caraxes Habit screenshots'), affinities: partialScreenshotVerification('Caraxes main screen screenshot') },
    unresolvedQuestions: ['Battle Dread and Mass Enfeeble raw text/table discrepancies retained.', 'Blood Wyrm duration and accumulation semantics.'],
  };
};

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
          notes: [
            'Manual combat-log observation confirms that 3 Allies includes Malachite as the caster in the three-dragon formation.',
          ],
          targetCount: 3,
          includesCaster: true,
          casterEligibility: 'included',
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
            sourceScope: 'non-basic-attacks',
            casterEligibility: 'excluded',
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
            casterEligibility: 'excluded',
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
            casterEligibility: 'excluded',
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
            notes: ['Exact 3 Allies targeting is normalized to all three friendly dragons and includes the caster.'],
            targetCount: 3,
            includesCaster: true,
            casterEligibility: 'included',
          }),
        ],
      }),
    ],
    powerByHabitLevel: standardHabitPower,
    tags: ['STRENGTH_UP', 'ENHANCED_BY_STRENGTH', 'ANY_LANE_TARGET', 'BUFF_ALLIES'],
    verification: screenshotVerification('Collective Might screenshot'),
    evidenceIds: ['malachite-collective-might-2026-06-23'],
    unresolvedQuestions: [
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
            casterEligibility: 'excluded',
          }),
          fixedEffect({
            id: 'lightning-strike-double-strike',
            type: 'Double-Strike',
            target: '1 other Ally',
            targetScope: 'within-adjacency',
            magnitude: null,
            unit: 'unknown',
            durationRounds: 3,
            casterEligibility: 'excluded',
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
            casterEligibility: 'excluded',
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
    unresolvedQuestions: ['Exact enhanced-by-Instinct formula.'],
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
    'Exact enhanced-by-Strength formula.',
    'Exact enhanced-by-Instinct formula.',
    'Canonical base stats remain unknown.',
  ],
});

const standardLegendaryPower = rankedPowers([420, 920, 1500, 2200, 3100]);
const finalLegendaryPower = rankedPowers([430, 1000, 1700, 2700, 4000]);
const standardEpicPower = rankedPowers([340, 740, 1200, 1800, 2500]);

const panicCondition = condition('target-has-panic', 'target-has-status', 'Target has Panic.', {
  statusId: 'panic',
});
const preyCondition = condition('target-is-prey', 'target-has-status', 'Target is Sheepstealer Prey.', {
  statusId: 'prey',
});
const preyRecoveryPreviousRound = condition(
  'prey-received-recovery-previous-round',
  'target-received-recovery-previous-round',
  'Prey received Recovery during the previous round.',
  { statusId: 'prey' },
);
const aboveHalfTroopCapacity = condition(
  'target-above-50-troop-capacity',
  'target-above-troop-capacity-threshold',
  'Target is above 50% Troop Capacity.',
  { thresholdPercent: 50, comparison: 'above' },
);
const belowHalfTroopCapacity = condition(
  'target-below-50-troop-capacity',
  'target-below-troop-capacity-threshold',
  'Target is below 50% Troop Capacity.',
  { thresholdPercent: 50, comparison: 'below' },
);
const enemyDealsFire = condition(
  'enemy-deals-fire-damage',
  'enemy-deals-fire-damage',
  'Enemy deals Fire Damage.',
  { subject: 'enemy' },
);
const anyEnemyDealsFire = condition(
  'any-enemy-deals-fire-damage',
  'enemy-deals-fire-damage',
  'At least one enemy deals Fire Damage.',
  { subject: 'enemy' },
);
const allyDealsTactical = condition(
  'ally-deals-tactical-damage',
  'ally-deals-tactical-damage',
  'Ally deals Tactical Damage.',
  { subject: 'ally' },
);
const hasWeakened = condition('self-has-weakened', 'self-has-status', 'Self is afflicted with Weakened.', {
  subject: 'self',
  statusId: 'weakened',
});

const createSeasmoke = (): Dragon => {
  const command = ability({
    dragonId: 'seasmoke',
    id: 'seasmoke-cleansing-wrath',
    kind: 'command',
    name: 'Cleansing Wrath',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription:
      'Each Round: up to three independent 20% Cleanse attempts. Rounds 3, 6, 9: Fire Damage to one enemy in the same lane (Damage Rate: +190%).',
    schedules: [
      schedule({
        id: 'cleansing-wrath-cleanse-positive',
        timing: 'each-round',
        attempts: {
          attemptCount: 3,
          chanceFixed: 20,
          chanceByHabitLevel: [],
          independentlyRolled: true,
          independentlyTargeted: true,
        },
        effects: [
          fixedEffect({
            id: 'cleansing-wrath-cleanse-positive-effect',
            type: 'Cleanse Positive',
            target: '1 Enemy',
            targetScope: 'any-lane',
            magnitude: 1,
            unit: 'flat',
            targetPriority: 'any-eligible',
          }),
        ],
      }),
      schedule({
        id: 'cleansing-wrath-fire-damage',
        timing: 'specific-rounds',
        rounds: [3, 6, 9],
        effects: [
          fixedEffect({
            id: 'cleansing-wrath-fire-damage-rate',
            type: 'Fire Damage',
            target: '1 Enemy',
            targetScope: 'same-lane',
            magnitude: 190,
            unit: 'rate',
            scaling: ['attacker Intelligence'],
            notes: ['Mitigated by target Initiative'],
          }),
        ],
      }),
    ],
    glossaryEntries: [
      {
        term: 'Fire Damage',
        definition: 'Fire Damage is increased by attacker Intelligence and mitigated by target Initiative.',
      },
      {
        term: 'Physical Damage',
        definition: 'Physical Damage is increased by attacker Strength and mitigated by target Instinct.',
      },
    ],
    tags: ['CLEANSE_POSITIVE', 'FIRE_DAMAGE', 'SAME_LANE_TARGET'],
    verification: screenshotVerification('Seasmoke Cleansing Wrath summary/glossary screenshots'),
    evidenceIds: ['seasmoke-cleansing-wrath-summary-2026-06-23', 'seasmoke-cleansing-wrath-glossary-2026-06-23'],
  });
  const infectiousSchedule = schedule({
    id: 'infectious-wrath-physical-damage',
    timing: 'specific-rounds',
    rounds: [3, 6, 9],
    effects: [
      fixedEffect({
        id: 'infectious-wrath-physical-damage-rate',
        type: 'Physical Damage',
        target: '2 Enemies',
        targetScope: 'within-adjacency',
        magnitude: null,
        unit: 'rate',
        rankedValues: rankedPercents([30, 36, 42, 51, 60]),
        conditionalMultipliers: [multiplier('panic-double-damage', 2, panicCondition, 'Damage is doubled when target has Panic.')],
      }),
    ],
  });
  command.augmentations.push({
    id: 'seasmoke-infectious-wrath-augmentation',
    sourceAbilityId: 'seasmoke-infectious-wrath',
    modifiesAbilityId: 'seasmoke-cleansing-wrath',
    minimumDragonStarRank: 6,
    schedulesAdded: [
      schedule({
        id: 'infectious-wrath-on-cleanse',
        timing: 'on-successful-cleanse',
        effects: [
          fixedEffect({
            id: 'infectious-wrath-stack',
            type: 'Infectious Wrath',
            target: 'Cleansed enemy',
            targetScope: 'any-lane',
            magnitude: 1,
            unit: 'flat',
            stack: stack({
              statusId: 'infectious-wrath',
              maximumStacks: 3,
              durationRounds: 3,
              valuePerStackByHabitLevel: rankedPercents([15, 18, 21, 25.5, 30]),
            }),
          }),
        ],
      }),
      infectiousSchedule,
    ],
    effectsAdded: infectiousSchedule.effects,
    rawDescription: 'At 6+ Stars, successful Cleanse applies Infectious Wrath and adds scheduled Physical Damage.',
    evidenceIds: ['seasmoke-infectious-wrath-2026-06-23'],
  });

  const trait = ability({
    dragonId: 'seasmoke',
    id: 'seasmoke-champions-brilliance',
    kind: 'trait',
    name: "Champion's Brilliance",
    abilityClass: 'passive',
    unlockStarRank: 1,
    minimumDragonLevel: 16,
    rawDescription:
      'At Level 16+ and deployed in the Vanguard, increase self Strength, Intelligence, and Instinct by +15. Reduce Damage Received of the Right Flank ally by 8%.',
    positionRequirement: 'vanguard',
    schedules: [
      schedule({
        id: 'champions-brilliance-passive',
        timing: 'passive',
        effects: [
          fixedEffect({ id: 'seasmoke-strength-flat', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }),
          fixedEffect({ id: 'seasmoke-intelligence-flat', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }),
          fixedEffect({ id: 'seasmoke-instinct-flat', type: 'Instinct Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }),
          fixedEffect({ id: 'seasmoke-right-flank-dr-down', type: 'Damage Received Down', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 8, unit: 'percent' }),
        ],
      }),
    ],
    tags: ['VANGUARD_REQUIRED', 'STRENGTH_UP', 'INSTINCT_UP', 'DAMAGE_RECEIVED_DOWN'],
    verification: screenshotVerification("Seasmoke Champion's Brilliance screenshot"),
    evidenceIds: ['seasmoke-champions-brilliance-2026-06-23'],
  });

  const habits = [
    ability({
      dragonId: 'seasmoke',
      id: 'seasmoke-clever-maneuver',
      kind: 'habit',
      name: 'Clever Maneuver',
      abilityClass: 'passive',
      unlockStarRank: 2,
      rawDescription: 'Start of Combat: Increase Intelligence and Initiative of the ally with highest Intelligence until end of combat.',
      schedules: [
        schedule({
          id: 'clever-maneuver-start-combat',
          timing: 'start-of-combat',
          targetPriority: 'highest-stat-ally',
          effects: [
            fixedEffect({ id: 'clever-maneuver-intelligence', type: 'Intelligence Up', target: 'Ally with highest Intelligence', targetScope: 'any-lane', magnitude: null, unit: 'flat', rankedValues: rankedPercents([22, 26.4, 30.8, 37.4, 44]), duration: 'Until end of combat', targetPriority: 'highest-stat-ally', casterEligibility: 'eligible-if-targeting-allows' }),
            fixedEffect({ id: 'clever-maneuver-initiative', type: 'Initiative Up', target: 'Ally with highest Intelligence', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12.5, 15, 17.5, 21.25, 25]), duration: 'Until end of combat', targetPriority: 'highest-stat-ally', casterEligibility: 'eligible-if-targeting-allows' }),
          ],
        }),
      ],
      powerByHabitLevel: standardLegendaryPower,
      tags: ['BUFF_ALLIES', 'BUFF_INTELLIGENCE', 'BUFF_INITIATIVE'],
      verification: screenshotVerification('Seasmoke Clever Maneuver screenshot'),
      evidenceIds: ['seasmoke-clever-maneuver-2026-06-23'],
    }),
    ability({
      dragonId: 'seasmoke',
      id: 'seasmoke-winds-favor',
      kind: 'habit',
      name: "Wind's Favor",
      abilityClass: 'passive',
      unlockStarRank: 4,
      rawDescription: 'Start of Combat: Increase Initiative of three Allies in any lane until end of combat, enhanced by Initiative.',
      schedules: [
        schedule({ id: 'winds-favor-start-combat', timing: 'start-of-combat', effects: [fixedEffect({ id: 'winds-favor-initiative', type: 'Initiative Up', target: '3 Allies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12.5, 15, 17.5, 21.25, 25]), duration: 'Until end of combat', scaling: ['Initiative'], notes: ['Exact 3 Allies targeting is normalized to all three friendly dragons and includes the caster.'], targetCount: 3, includesCaster: true, casterEligibility: 'included' })] }),
      ],
      powerByHabitLevel: standardLegendaryPower,
      tags: ['BUFF_ALLIES', 'BUFF_INITIATIVE'],
      verification: screenshotVerification("Seasmoke Wind's Favor screenshot"),
      evidenceIds: ['seasmoke-winds-favor-2026-06-23'],
      unresolvedQuestions: ['Exact enhanced-by-Initiative formula.'],
    }),
    ability({
      dragonId: 'seasmoke',
      id: 'seasmoke-infectious-wrath',
      kind: 'habit',
      name: 'Infectious Wrath',
      abilityClass: 'passive',
      unlockStarRank: 6,
      rawDescription: 'Augments Cleansing Wrath with Infectious Wrath stacks and Panic-conditional Physical Damage.',
      schedules: [infectiousSchedule],
      powerByHabitLevel: standardLegendaryPower,
      tags: ['COMMAND_AUGMENTATION', 'INFECTIOUS_WRATH', 'PHYSICAL_DAMAGE', 'PANIC'],
      verification: screenshotVerification('Seasmoke Infectious Wrath screenshot'),
      evidenceIds: ['seasmoke-infectious-wrath-2026-06-23'],
    }),
    ability({
      dragonId: 'seasmoke',
      id: 'seasmoke-cunning-ferocity',
      kind: 'habit',
      name: 'Cunning Ferocity',
      abilityClass: 'passive',
      unlockStarRank: 8,
      rawDescription: 'Start of Combat: Increase Intelligence and Fire Damage Dealt of two Allies within adjacency until end of combat.',
      schedules: [
        schedule({ id: 'cunning-ferocity-start-combat', timing: 'start-of-combat', effects: [
          fixedEffect({ id: 'cunning-ferocity-intelligence', type: 'Intelligence Up', target: '2 Allies', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([7.5, 9, 10.5, 12.75, 15]), scaling: ['Instinct'], duration: 'Until end of combat', casterEligibility: 'eligible-if-targeting-allows' }),
          fixedEffect({ id: 'cunning-ferocity-fire', type: 'Fire Damage Dealt Up', target: '2 Allies', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5, 6, 7, 8.5, 10]), duration: 'Until end of combat', casterEligibility: 'eligible-if-targeting-allows' }),
        ] }),
      ],
      powerByHabitLevel: standardLegendaryPower,
      tags: ['FIRE_DAMAGE_UP', 'BUFF_ALLIES', 'ADJACENT_TARGET'],
      verification: screenshotVerification('Seasmoke Cunning Ferocity screenshot'),
      evidenceIds: ['seasmoke-cunning-ferocity-2026-06-23'],
    }),
    ability({
      dragonId: 'seasmoke',
      id: 'seasmoke-loyal-bond',
      kind: 'habit',
      name: 'Loyal Bond',
      abilityClass: 'passive',
      unlockStarRank: 10,
      rawDescription: 'Each Round: grant Advantage above 50% Troop Capacity or Resistance below 50% Troop Capacity to 2 other Allies.',
      schedules: [
        schedule({ id: 'loyal-bond-advantage', timing: 'each-round', triggerChanceByHabitLevel: rankedPercents([10, 13, 16, 20, 25]), conditions: [aboveHalfTroopCapacity], effects: [fixedEffect({ id: 'loyal-bond-advantage-effect', type: 'Advantage', target: '2 other Allies', targetScope: 'any-lane', magnitude: 20, unit: 'percent', durationRounds: 2, conditions: [aboveHalfTroopCapacity], casterEligibility: 'excluded' })] }),
        schedule({ id: 'loyal-bond-resistance', timing: 'each-round', triggerChanceByHabitLevel: rankedPercents([10, 13, 16, 20, 25]), conditions: [belowHalfTroopCapacity], effects: [fixedEffect({ id: 'loyal-bond-resistance-effect', type: 'Resistance', target: '2 other Allies', targetScope: 'any-lane', magnitude: 20, unit: 'percent', durationRounds: 2, conditions: [belowHalfTroopCapacity], notes: ['Exact Resistance semantics unresolved.'], casterEligibility: 'excluded' })] }),
      ],
      powerByHabitLevel: finalLegendaryPower,
      tags: ['ADVANTAGE', 'RESISTANCE', 'OTHER_ALLIES_TARGET'],
      verification: screenshotVerification('Seasmoke Loyal Bond screenshot'),
      evidenceIds: ['seasmoke-loyal-bond-2026-06-23'],
      unresolvedQuestions: ['Exactly 50% Troop Capacity boundary.', 'Resistance detailed meaning.'],
    }),
  ];

  return {
    ...createDragon('Seasmoke', 'Legendary', 'Champion'),
    dataStatus: 'community-verified',
    command,
    trait,
    habits,
    affinities: { Cavalry: 'positive', Archers: 'positive', Siege: 'negative', Shieldbearers: 'unknown', Spearmen: 'unknown' },
    tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])],
    fieldVerification: {
      identity: officialMetadataVerification,
      rarity: officialMetadataVerification,
      breed: officialMetadataVerification,
      affinities: partialScreenshotVerification('Seasmoke main screen screenshot'),
      command: screenshotVerification('Seasmoke Cleansing Wrath screenshots'),
      trait: screenshotVerification("Seasmoke Champion's Brilliance screenshot"),
      habits: screenshotVerification('Seasmoke Habit screenshots'),
    },
    unresolvedQuestions: ['Resistance detailed meaning.', 'Panic exact status definition.', 'Infectious Wrath augmentation presentation requires follow-up review.'],
  };
};

const createPendingDragon = (name: string, rarity: DragonRarity, breed: DragonBreed): Dragon =>
  createDragon(name, rarity, breed, true, {
    officialProfileUrl: null,
    rosterSourceStatus: 'in-game-verified-pending-official-site',
    firstObservedInGame: '2026-06-22',
    gameVersion: null,
  });

const createSheepstealer = (): Dragon => {
  const savageClaimSchedule = schedule({
    id: 'savage-claim-each-round',
    timing: 'each-round',
    conditions: [preyCondition],
    effects: [
      fixedEffect({
        id: 'savage-claim-fire-damage',
        type: 'Fire Damage',
        target: 'Prey',
        targetScope: 'any-lane',
        magnitude: null,
        unit: 'rate',
        rankedValues: rankedPercents([24, 31.2, 38.4, 48, 60]),
        conditionalMultipliers: [
          multiplier(
            'savage-claim-recovery-triple-fire',
            3,
            preyRecoveryPreviousRound,
            'Triple Fire Damage if Prey received Recovery during the previous round.',
            [{ level: 1, value: 72, unit: 'percent' }],
          ),
        ],
      }),
      fixedEffect({
        id: 'savage-claim-recovery',
        type: 'Recovery',
        target: 'Self',
        targetScope: 'self',
        magnitude: null,
        unit: 'rate',
        rankedValues: rankedPercents([10, 13, 16, 20, 25]),
        scaling: ['dragon Level', 'Intelligence'],
        conditionalMultipliers: [
          multiplier(
            'savage-claim-recovery-triple',
            3,
            preyRecoveryPreviousRound,
            'Triple Recovery if Prey received Recovery during the previous round.',
            [{ level: 1, value: 30, unit: 'percent' }],
          ),
        ],
      }),
    ],
  });

  const command = ability({
    dragonId: 'sheepstealer',
    id: 'sheepstealer-wild-hunt',
    kind: 'command',
    name: 'Wild Hunt',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription: 'Each Round: if no enemy is currently marked as Prey, 40% chance to apply Prey. Rounds 1, 4, 7, 10: Fire Damage to one enemy, prioritizing Prey. Damage is doubled against Prey.',
    schedules: [
      schedule({
        id: 'wild-hunt-apply-prey',
        timing: 'each-round',
        triggerChanceFixed: 40,
        conditions: [
          condition('no-enemy-currently-prey', 'no-enemy-has-mark', 'No enemy is currently marked as Sheepstealer Prey.', { subject: 'enemy' }),
        ],
        targetPriority: 'prefer-received-recovery-last-round',
        effects: [
          fixedEffect({
            id: 'wild-hunt-prey',
            type: 'Prey',
            target: '1 Enemy',
            targetScope: 'any-lane',
            magnitude: 30,
            unit: 'percent',
            durationRounds: 3,
            stack: stack({ statusId: 'prey', maximumStacks: 1, durationRounds: 3 }),
            targetPriority: 'prefer-received-recovery-last-round',
            notes: [
              'Combat-log observation confirms that new Prey selection prioritizes an eligible enemy that received Recovery during the previous round.',
              'Priority applies only when no enemy is currently marked as Prey.',
            ],
          }),
        ],
      }),
      schedule({
        id: 'wild-hunt-fire-damage',
        timing: 'specific-rounds',
        rounds: [1, 4, 7, 10],
        targetPriority: 'prefer-prey',
        effects: [
          fixedEffect({
            id: 'wild-hunt-fire-damage-rate',
            type: 'Fire Damage',
            target: '1 Enemy',
            targetScope: 'any-lane',
            magnitude: 100,
            unit: 'rate',
            scaling: ['attacker Intelligence'],
            notes: ['Mitigated by target Initiative'],
            conditionalMultipliers: [multiplier('wild-hunt-prey-double', 2, preyCondition, 'Damage is doubled against Prey.')],
          }),
        ],
      }),
    ],
    tags: ['FIRE_DAMAGE', 'PREY', 'RECOVERY_RECEIVED_DOWN'],
    verification: screenshotVerification('Sheepstealer Wild Hunt summary/glossary screenshots'),
    evidenceIds: [
      'sheepstealer-wild-hunt-summary-2026-06-23',
      'sheepstealer-wild-hunt-glossary-2026-06-23',
      'sheepstealer-wild-hunt-recovery-priority-combat-log-2026-06-24',
    ],
  });
  command.augmentations.push({
    id: 'sheepstealer-savage-claim-augmentation',
    sourceAbilityId: 'sheepstealer-savage-claim',
    modifiesAbilityId: 'sheepstealer-wild-hunt',
    minimumDragonStarRank: 10,
    schedulesAdded: [savageClaimSchedule],
    effectsAdded: savageClaimSchedule.effects,
    rawDescription: 'At 10 Stars, Savage Claim augments Wild Hunt while Sheepstealer has a Prey.',
    evidenceIds: ['sheepstealer-savage-claim-2026-06-23'],
  });

  const trait = ability({
    dragonId: 'sheepstealer',
    id: 'sheepstealer-hunters-cunning',
    kind: 'trait',
    name: "Hunter's Cunning",
    abilityClass: 'passive',
    unlockStarRank: 1,
    minimumDragonLevel: 16,
    positionRequirement: 'vanguard',
    rawDescription: 'At Level 16+ and deployed in Vanguard, increase self Recovery Received +20%, self Intelligence +25, and Right Flank ally Physical Damage Dealt +10%.',
    schedules: [
      schedule({ id: 'hunters-cunning-passive', timing: 'passive', effects: [
        fixedEffect({ id: 'hunters-cunning-recovery-received', type: 'Recovery Received Up', target: 'Self', targetScope: 'self', magnitude: 20, unit: 'percent' }),
        fixedEffect({ id: 'hunters-cunning-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: 25, unit: 'flat' }),
        fixedEffect({ id: 'hunters-cunning-right-physical', type: 'Physical Damage Dealt Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 10, unit: 'percent' }),
      ] }),
    ],
    tags: ['VANGUARD_REQUIRED', 'RECOVERY_RECEIVED_UP', 'FIRE_DAMAGE_UP', 'PHYSICAL_DAMAGE_UP'],
    verification: screenshotVerification("Sheepstealer Hunter's Cunning screenshot"),
    evidenceIds: ['sheepstealer-hunters-cunning-2026-06-23'],
  });

  const habits = [
    ability({
      dragonId: 'sheepstealer', id: 'sheepstealer-stolen-flock', kind: 'habit', name: 'Stolen Flock', abilityClass: 'passive', unlockStarRank: 2,
      rawDescription: 'PvE Fire Damage bonus and Stolen Flock stacks from each round or when Prey receives Recovery.',
      schedules: [
        schedule({ id: 'stolen-flock-pve', timing: 'start-of-combat', battleContext: 'non-player-food-tile', conditions: [condition('pve-food-or-beast', 'battle-context', 'Battle is a non-player Food Tile or Beast encounter.', { subject: 'battle', battleContext: 'non-player-food-tile' })], effects: [fixedEffect({ id: 'stolen-flock-pve-fire', type: 'Fire Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of combat' })] }),
        schedule({ id: 'stolen-flock-each-round-stack', timing: 'each-round', triggerChanceFixed: 50, effects: [fixedEffect({ id: 'stolen-flock-stack-round', type: 'Stolen Flock', target: 'Self', targetScope: 'self', magnitude: 1, unit: 'flat', stack: stack({ statusId: 'stolen-flock', maximumStacks: 10, untilEndOfCombat: true, valuePerStackByHabitLevel: rankedPercents([3, 3.6, 4.2, 5.1, 6]) }) })] }),
        schedule({ id: 'stolen-flock-prey-recovery-stack', timing: 'when-marked-target-receives-recovery', conditions: [preyRecoveryPreviousRound], effects: [fixedEffect({ id: 'stolen-flock-stack-recovery', type: 'Stolen Flock', target: 'Self', targetScope: 'self', magnitude: 1, unit: 'flat', stack: stack({ statusId: 'stolen-flock', maximumStacks: 10, untilEndOfCombat: true, valuePerStackByHabitLevel: rankedPercents([3, 3.6, 4.2, 5.1, 6]) }) })] }),
      ],
      powerByHabitLevel: standardLegendaryPower, tags: ['STOLEN_FLOCK', 'FIRE_DAMAGE_UP'], verification: screenshotVerification('Sheepstealer Stolen Flock screenshot'), evidenceIds: ['sheepstealer-stolen-flock-2026-06-23'],
    }),
    ability({ dragonId: 'sheepstealer', id: 'sheepstealer-dragons-cunning', kind: 'habit', name: "Dragon's Cunning", abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat: increase self Intelligence and reduce Instinct of two enemies within adjacency, enhanced by Initiative.', schedules: [schedule({ id: 'dragons-cunning-start', timing: 'start-of-combat', effects: [fixedEffect({ id: 'dragons-cunning-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' }), fixedEffect({ id: 'dragons-cunning-instinct-down', type: 'Instinct Down', target: '2 Enemies', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), scaling: ['Initiative'], duration: 'Until end of combat' })] })], powerByHabitLevel: standardLegendaryPower, tags: ['DEBUFF_INSTINCTS', 'ADJACENT_TARGET'], verification: screenshotVerification("Sheepstealer Dragon's Cunning screenshot"), evidenceIds: ['sheepstealer-dragons-cunning-2026-06-23'], unresolvedQuestions: ['Grammar around enhanced by Initiative could apply ambiguously.'] }),
    ability({ dragonId: 'sheepstealer', id: 'sheepstealer-baited-kill', kind: 'habit', name: 'Baited Kill', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Each Round: apply Vulnerable to Prey, doubled chance if Prey received Recovery last round; cleanse Sheepstealer if Prey is above 50% Troop Capacity.', schedules: [schedule({ id: 'baited-kill-vulnerable', timing: 'each-round', triggerChanceByHabitLevel: rankedPercents([25, 30, 35, 42.5, 50]), conditions: [preyCondition], effects: [fixedEffect({ id: 'baited-kill-vulnerable-effect', type: 'Vulnerable', target: 'Prey', targetScope: 'any-lane', magnitude: 20, unit: 'percent', conditionalMultipliers: [multiplier('baited-kill-recovery-double', 2, preyRecoveryPreviousRound, 'Chance is doubled if Prey received Recovery previous round.')] })] }), schedule({ id: 'baited-kill-cleanse', timing: 'each-round', triggerChanceByHabitLevel: rankedPercents([50, 60, 70, 85, 100]), conditions: [aboveHalfTroopCapacity, condition('enemy-negative-damage-dealt', 'negative-effect-reduces-damage-dealt', 'Negative effect was applied by an enemy and reduces Sheepstealer Damage Dealt.', { subject: 'self' })], effects: [fixedEffect({ id: 'baited-kill-cleanse-effect', type: 'Cleanse Negative', target: 'Self', targetScope: 'self', magnitude: 1, unit: 'flat' })] })], powerByHabitLevel: standardLegendaryPower, tags: ['VULNERABLE', 'CLEANSE_POSITIVE'], verification: screenshotVerification('Sheepstealer Baited Kill screenshot'), evidenceIds: ['sheepstealer-baited-kill-2026-06-23'] }),
    ability({ dragonId: 'sheepstealer', id: 'sheepstealer-wary-beast', kind: 'habit', name: 'Wary Beast', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of Each Round: if Prey is above 50% Troop Capacity gain Evade. Start of Combat reduce Recovery Received of three enemies.', schedules: [schedule({ id: 'wary-beast-evade', timing: 'start-of-each-round', conditions: [aboveHalfTroopCapacity], effects: [fixedEffect({ id: 'wary-beast-evade-effect', type: 'Evade', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of current round' })] }), schedule({ id: 'wary-beast-recovery-down', timing: 'start-of-combat', effects: [fixedEffect({ id: 'wary-beast-recovery-received-down', type: 'Recovery Received Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardLegendaryPower, tags: ['EVADE', 'RECOVERY_RECEIVED_DOWN'], verification: screenshotVerification('Sheepstealer Wary Beast screenshot'), evidenceIds: ['sheepstealer-wary-beast-2026-06-23'] }),
    ability({ dragonId: 'sheepstealer', id: 'sheepstealer-savage-claim', kind: 'habit', name: 'Savage Claim', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Augments Wild Hunt: each round while Sheepstealer has Prey, deal Fire Damage to Prey and apply Recovery to Sheepstealer; triple both if Prey received Recovery previous round.', schedules: [savageClaimSchedule], powerByHabitLevel: finalLegendaryPower, tags: ['COMMAND_AUGMENTATION', 'FIRE_DAMAGE', 'RECOVERY'], verification: screenshotVerification('Sheepstealer Savage Claim screenshot'), evidenceIds: ['sheepstealer-savage-claim-2026-06-23'] }),
  ];

  return {
    ...createPendingDragon('Sheepstealer', 'Legendary', 'Hunter'),
    dataStatus: 'community-verified',
    command,
    trait,
    habits,
    affinities: { Cavalry: 'positive', Archers: 'positive', Shieldbearers: 'unknown', Spearmen: 'unknown', Siege: 'unknown' },
    tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])],
    fieldVerification: { identity: screenshotVerification('Sheepstealer main screen screenshot'), command: screenshotVerification('Sheepstealer Wild Hunt screenshots'), trait: screenshotVerification("Sheepstealer Hunter's Cunning screenshot"), habits: screenshotVerification('Sheepstealer Habit screenshots'), affinities: partialScreenshotVerification('Sheepstealer main screen screenshot') },
    unresolvedQuestions: ['Higher-rank tripled Savage Claim values are calculated from verified multiplier, not directly screenshot verified.', "Dragon's Cunning scaling scope remains provisional."],
  };
};

const createVermax = (): Dragon => {
  const command = ability({
    dragonId: 'vermax',
    id: 'vermax-spreading-blaze',
    kind: 'command',
    name: 'Spreading Blaze',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription:
      'After each Basic Attack: deal Physical Damage to one enemy in the same lane (Damage Rate +50%). Additionally, 20% chance to grant one Spreading Blaze stack to one ally that deals Tactical Damage. Repeat this chance once if any enemy deals Fire Damage.',
    schedules: [
      schedule({
        id: 'spreading-blaze-after-basic-attack',
        timing: 'after-basic-attack',
        repeat: {
          mode: 'once-if-any-match',
          condition: anyEnemyDealsFire,
          description: 'Repeat the Spreading Blaze stack chance once if any enemy deals Fire Damage.',
        },
        effects: [
          fixedEffect({
            id: 'spreading-blaze-physical-damage',
            type: 'Physical Damage',
            target: '1 Enemy',
            targetScope: 'same-lane',
            magnitude: 50,
            unit: 'rate',
            scaling: ['attacker Strength'],
            notes: ['Mitigated by target Instinct', 'Double-Strike can potentially create another after-Basic-Attack trigger.'],
            sourceScope: 'basic-attacks',
          }),
          fixedEffect({
            id: 'spreading-blaze-stack',
            type: 'Spreading Blaze',
            target: '1 ally that deals Tactical Damage',
            targetScope: 'any-lane',
            magnitude: 1,
            unit: 'flat',
            conditions: [allyDealsTactical],
            targetPriority: 'any-eligible',
            stack: stack({
              statusId: 'spreading-blaze',
              maximumStacks: 10,
              untilEndOfCombat: true,
              valuePerStackFixed: 2.5,
            }),
          }),
        ],
      }),
    ],
    tags: ['PHYSICAL_DAMAGE', 'SPREADING_BLAZE', 'TACTICAL_DAMAGE'],
    verification: screenshotVerification('Vermax Spreading Blaze summary/glossary screenshots'),
    evidenceIds: ['vermax-spreading-blaze-summary-2026-06-23', 'vermax-spreading-blaze-glossary-2026-06-23'],
  });

  const trait = ability({
    dragonId: 'vermax',
    id: 'vermax-warriors-zeal',
    kind: 'trait',
    name: "Warrior's Zeal",
    abilityClass: 'passive',
    unlockStarRank: 1,
    minimumDragonLevel: 16,
    positionRequirement: 'vanguard',
    rawDescription:
      'At Level 16+ and deployed in Vanguard, increase Vermax Physical Damage Dealt by 16%. Increase Instinct and Initiative of Left Flank ally by +20.',
    schedules: [
      schedule({
        id: 'warriors-zeal-passive',
        timing: 'passive',
        effects: [
          fixedEffect({
            id: 'warriors-zeal-physical',
            type: 'Physical Damage Dealt Up',
            target: 'Self',
            targetScope: 'self',
            magnitude: 16,
            unit: 'percent',
            sourceScope: 'all-sources',
            notes: [
              'Combat-log observation confirms this applies to Vermax Basic Attack Physical Damage.',
              'Unqualified Physical Damage Dealt modifiers apply to all qualifying Physical Damage sources unless explicitly restricted.',
            ],
          }),
          fixedEffect({ id: 'warriors-zeal-left-instinct', type: 'Instinct Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }),
          fixedEffect({ id: 'warriors-zeal-left-initiative', type: 'Initiative Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }),
        ],
      }),
    ],
    tags: ['VANGUARD_REQUIRED', 'PHYSICAL_DAMAGE_UP', 'INSTINCT_UP', 'BUFF_INITIATIVE'],
    verification: screenshotVerification("Vermax Warrior's Zeal screenshot"),
    evidenceIds: ['vermax-warriors-zeal-2026-06-23', 'vermax-warriors-zeal-basic-attack-combat-log-2026-06-24'],
  });

  const below75 = condition('below-75-troop-capacity', 'target-below-troop-capacity-threshold', 'Below 75% Troop Capacity.', { thresholdPercent: 75, comparison: 'below' });
  const below50 = condition('below-50-troop-capacity', 'target-below-troop-capacity-threshold', 'Below 50% Troop Capacity.', { thresholdPercent: 50, comparison: 'below' });
  const below25 = condition('below-25-troop-capacity', 'target-below-troop-capacity-threshold', 'Below 25% Troop Capacity.', { thresholdPercent: 25, comparison: 'below' });

  const habits = [
    ability({
      dragonId: 'vermax', id: 'vermax-trial-by-flame', kind: 'habit', name: 'Trial by Flame', abilityClass: 'passive', unlockStarRank: 2,
      rawDescription: 'Start of Each Round: reduce Fire Damage Received for allies below strict Troop Capacity thresholds until end of current round.',
      schedules: [
        schedule({ id: 'trial-by-flame-below-75', timing: 'start-of-each-round', conditions: [below75], effects: [fixedEffect({ id: 'trial-below-75-fire-reduction', type: 'Fire Damage Received Down', target: 'All allies below 75% Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5, 6, 7, 8.5, 10]), duration: 'Until end of current round', conditions: [below75], targetPriority: 'all-allies-matching-threshold' })] }),
        schedule({ id: 'trial-by-flame-below-50', timing: 'start-of-each-round', conditions: [below50], effects: [fixedEffect({ id: 'trial-below-50-fire-reduction', type: 'Fire Damage Received Down', target: 'All allies below 50% Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of current round', conditions: [below50], targetPriority: 'all-allies-matching-threshold' })] }),
        schedule({ id: 'trial-by-flame-below-25', timing: 'start-of-each-round', conditions: [below25], effects: [fixedEffect({ id: 'trial-below-25-fire-reduction', type: 'Fire Damage Received Down', target: 'All allies below 25% Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 18, 21, 25.5, 30]), duration: 'Until end of current round', conditions: [below25], targetPriority: 'all-allies-matching-threshold' })] }),
      ],
      powerByHabitLevel: [],
      tags: ['FIRE_DAMAGE_RECEIVED_DOWN'],
      verification: screenshotVerification('Vermax Trial by Flame screenshot'),
      evidenceIds: ['vermax-trial-by-flame-2026-06-23'],
      unresolvedQuestions: ['Power progression unknown.', 'Threshold semantics are strict below, not equal.'],
    }),
    ability({ dragonId: 'vermax', id: 'vermax-reactive-instincts', kind: 'habit', name: 'Reactive Instincts', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat: increase Instinct and Initiative of ally with highest Instinct, enhanced by Strength.', schedules: [schedule({ id: 'reactive-instincts-start', timing: 'start-of-combat', targetPriority: 'highest-stat-ally', effects: [fixedEffect({ id: 'reactive-instincts-instinct', type: 'Instinct Up', target: 'Ally with highest Instinct', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), scaling: ['Strength'], duration: 'Until end of combat', targetPriority: 'highest-stat-ally' }), fixedEffect({ id: 'reactive-instincts-initiative', type: 'Initiative Up', target: 'Ally with highest Instinct', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([9, 10.8, 12.6, 15.3, 18]), scaling: ['Strength'], duration: 'Until end of combat', targetPriority: 'highest-stat-ally' })] })], powerByHabitLevel: standardEpicPower, tags: ['INSTINCT_UP', 'BUFF_INITIATIVE'], verification: screenshotVerification('Vermax Reactive Instincts screenshot'), evidenceIds: ['vermax-reactive-instincts-2026-06-23'], unresolvedQuestions: ['Exact enhanced-by-Strength formula.'] }),
    ability({ dragonId: 'vermax', id: 'vermax-rallying-flame', kind: 'habit', name: 'Rallying Flame', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Start of Combat: gain Rallying Flame and grant Spreading Blaze, repeating once for each enemy that deals Fire Damage.', schedules: [schedule({ id: 'rallying-flame-start', timing: 'start-of-combat', triggerChanceByHabitLevel: rankedPercents([50, 60, 70, 85, 100]), repeat: { mode: 'once-per-match', condition: enemyDealsFire, description: 'Repeat once for each enemy that deals Fire Damage.' }, effects: [fixedEffect({ id: 'rallying-flame-stack', type: 'Rallying Flame', target: 'Self', targetScope: 'self', magnitude: 1, unit: 'flat', stack: stack({ statusId: 'rallying-flame', maximumStacks: 4, untilEndOfCombat: true, valuePerStackFixed: 5 }) }), fixedEffect({ id: 'rallying-flame-spreading-blaze-stack', type: 'Spreading Blaze', target: '1 ally that deals Tactical Damage', targetScope: 'any-lane', magnitude: 1, unit: 'flat', conditions: [allyDealsTactical], stack: stack({ statusId: 'spreading-blaze', maximumStacks: 10, untilEndOfCombat: true, valuePerStackFixed: 2.5 }) })] })], powerByHabitLevel: standardEpicPower, tags: ['RALLYING_FLAME', 'SPREADING_BLAZE'], verification: screenshotVerification('Vermax Rallying Flame screenshot'), evidenceIds: ['vermax-rallying-flame-2026-06-23'], unresolvedQuestions: ['Target selection for multiple successful Spreading Blaze attempts.'] }),
    ability({ dragonId: 'vermax', id: 'vermax-dragons-valor', kind: 'habit', name: "Dragon's Valor", abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of Combat: reduce self Damage Received and increase Strength until end of combat.', schedules: [schedule({ id: 'dragons-valor-start', timing: 'start-of-combat', effects: [fixedEffect({ id: 'dragons-valor-dr-down', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5, 6, 7, 8.5, 10]), duration: 'Until end of combat' }), fixedEffect({ id: 'dragons-valor-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([8.5, 10.2, 11.9, 14.45, 17]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardEpicPower, tags: ['DAMAGE_RECEIVED_DOWN', 'STRENGTH_UP'], verification: screenshotVerification("Vermax Dragon's Valor screenshot"), evidenceIds: ['vermax-dragons-valor-2026-06-23'] }),
    ability({ dragonId: 'vermax', id: 'vermax-unyielding-resolve', kind: 'habit', name: 'Unyielding Resolve', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Start of Each Round: chance to grant Advantage +15% for two rounds. If afflicted with Weakend, chance is multiplied by 1.5 and successful activation removes Weakened.', schedules: [schedule({ id: 'unyielding-resolve-start-round', timing: 'start-of-each-round', triggerChanceByHabitLevel: rankedPercents([20, 26, 32, 40, 50]), conditions: [], effects: [fixedEffect({ id: 'unyielding-resolve-advantage', type: 'Advantage', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'percent', durationRounds: 2, conditionalMultipliers: [multiplier('weakened-advantage-1-5x', 1.5, hasWeakened, 'If Vermax is afflicted with Weakened, multiply trigger chance by 1.5.', [{ level: 1, value: 30, unit: 'percent' }])] }), fixedEffect({ id: 'unyielding-resolve-remove-weakened', type: 'Cleanse Negative', target: 'Self', targetScope: 'self', magnitude: 1, unit: 'flat', conditions: [hasWeakened], notes: ['Successful conditional activation removes Weakened.'] })] })], powerByHabitLevel: rankedPowers([340, 790, 1400, 2100, 3100]), tags: ['ADVANTAGE', 'WEAKENED'], verification: screenshotVerification('Vermax Unyielding Resolve screenshot'), evidenceIds: ['vermax-unyielding-resolve-2026-06-23'] }),
  ];

  return {
    ...createPendingDragon('Vermax', 'Epic', 'Warrior'),
    dataStatus: 'community-verified',
    command,
    trait,
    habits,
    affinities: { Cavalry: 'positive', Shieldbearers: 'positive', Archers: 'unknown', Spearmen: 'unknown', Siege: 'unknown' },
    tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])],
    fieldVerification: { identity: screenshotVerification('Vermax main screen screenshot'), command: screenshotVerification('Vermax Spreading Blaze screenshots'), trait: screenshotVerification("Vermax Warrior's Zeal screenshot"), habits: screenshotVerification('Vermax Habit screenshots'), affinities: partialScreenshotVerification('Vermax main screen screenshot') },
    unresolvedQuestions: ['Target selection for multiple Spreading Blaze attempts.'],
  };
};

export const dragons: Dragon[] = [
  createSyrax(),
  createDragon('Vhagar', 'Legendary', 'Warrior'),
  createCaraxes(),
  createSeasmoke(),
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
  createSheepstealer(),
  createVermax(),
];

export const dragonById = new Map(dragons.map((dragon) => [dragon.id, dragon]));
