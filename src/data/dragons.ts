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
  ActivationRoll,
  TargetSelectionDetails,
  RoundSelector,
  StackTransitionTrigger,
  EffectOptionConfiguration,
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

const screenshotVerificationAt = (source: string, capturedAt: string): FieldVerification => ({
  status: 'screenshot-verified',
  source,
  capturedAt,
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
  statusCategoryId: options.statusCategoryId ?? null,
  qualifyingOutput: options.qualifyingOutput ?? null,
  thresholdPercent: options.thresholdPercent ?? null,
  comparison: options.comparison ?? null,
  battleContext: options.battleContext ?? null,
  sourceEffectId: options.sourceEffectId ?? null,
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
}: Partial<StackConfiguration> & Pick<StackConfiguration, 'statusId'>): StackConfiguration => ({
  statusId,
  maximumStacks: maximumStacks ?? null,
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
  casterEligibility = undefined,
  perTargetEffectCheck = null,
  activationRoll = null,
  targetSelection = null,
  stackTransitionTrigger = null,
  effectOptions = null,
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
  activationRoll?: ActivationRoll | null;
  targetSelection?: TargetSelectionDetails | null;
  stackTransitionTrigger?: StackTransitionTrigger | null;
  effectOptions?: EffectOptionConfiguration | null;
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
  activationRoll,
  targetSelection,
  stackTransitionTrigger,
  effectOptions,
});

const schedule = ({
  id,
  timing,
  rounds = [],
  roundSelector = null,
  triggerChanceFixed = null,
  triggerChanceByHabitLevel = [],
  activationRoll = null,
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
  roundSelector?: RoundSelector | null;
  triggerChanceFixed?: number | null;
  triggerChanceByHabitLevel?: RankedValue[];
  activationRoll?: ActivationRoll | null;
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
  roundSelector,
  triggerChanceFixed,
  triggerChanceByHabitLevel,
  effects,
  triggerEvent: timing,
  activationRoll,
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
    targetCount: 1,
    includesCaster: true,
    casterEligibility: 'eligible-if-targeting-allows',
    targetSelection: targetSelection({ comparisonStat: 'current-troops', comparisonDirection: 'lowest', comparisonPool: 'ally-side', tieBehavior: 'candidate-group', sharedSelectionGroupId: 'strategic-revival-least-troops-ally' }),
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
    targetCount: 1,
    includesCaster: true,
    casterEligibility: 'eligible-if-targeting-allows',
    activationRoll: roll({ scope: 'effect', chanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]), description: 'Resistance chance applies to the same least-current-troops Ally selected for Recovery.' }),
    targetSelection: targetSelection({ comparisonStat: 'current-troops', comparisonDirection: 'lowest', comparisonPool: 'ally-side', tieBehavior: 'candidate-group', sharedSelectionGroupId: 'strategic-revival-least-troops-ally' }),
    notes: ['Resistance reduces Damage Received.'],
  });
  const strategicRevivalSchedule = schedule({
    id: 'strategic-revival-recovery-rounds',
    timing: 'specific-rounds',
    rounds: [2, 5, 8],
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
    rawDescription: `Each Round: 20% chance to increase Fire Damage Dealt by 10% and grant First-Strike to one Ally in any lane for 2 rounds, prioritizing Allies that deal Fire Damage.

Rounds 1, 4, 6, and 9: deal Tactical Damage to one enemy within adjacency at a 110% Damage Rate.

At 6+ Stars:

Rounds 2, 5, and 8: apply Recovery to the Ally with the least current troops at a 50% Recovery Rate, enhanced by Intelligence. Resistance applies to the same selected Ally. Resistance has a 40% activation chance at effective Habit Level 1 and lasts 2 rounds.`,
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
        schedule({ id: 'loyal-bond-resistance', timing: 'each-round', triggerChanceByHabitLevel: rankedPercents([10, 13, 16, 20, 25]), conditions: [belowHalfTroopCapacity], effects: [fixedEffect({ id: 'loyal-bond-resistance-effect', type: 'Resistance', target: '2 other Allies', targetScope: 'any-lane', magnitude: 20, unit: 'percent', durationRounds: 2, conditions: [belowHalfTroopCapacity], notes: ['Resistance reduces Damage Received. Exact stacking and refresh behavior remain unresolved.'], casterEligibility: 'excluded' })] }),
      ],
      powerByHabitLevel: finalLegendaryPower,
      tags: ['ADVANTAGE', 'RESISTANCE', 'OTHER_ALLIES_TARGET'],
      verification: screenshotVerification('Seasmoke Loyal Bond screenshot'),
      evidenceIds: ['seasmoke-loyal-bond-2026-06-23'],
      unresolvedQuestions: ['Exactly 50% Troop Capacity boundary.', 'Resistance stacking, refresh, and multiple-source combination.'],
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
    unresolvedQuestions: ['Resistance stacking, refresh, and final mitigation formula.', 'Panic exact status definition.', 'Infectious Wrath augmentation presentation requires follow-up review.'],
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
    rawDescription: `Each Round: if no enemy is currently marked as Prey, 40% chance to apply Prey. Rounds 1, 4, 7, and 10: deal Fire Damage to one enemy, prioritizing Prey. Damage is doubled against Prey.

At 10 Stars:

Each round while Sheepstealer has a current Prey: deal Fire Damage to Prey at a 24% rate and apply Recovery to Sheepstealer at a 10% rate, enhanced by Dragon Level and Intelligence.

If the current Prey received Recovery during the previous round, both rates are tripled to 72% Fire Damage and 30% Recovery.`,
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
        schedule({ id: 'trial-by-flame-below-75', timing: 'start-of-each-round', conditions: [below75], effects: [fixedEffect({ id: 'trial-below-75-fire-reduction', type: 'Fire Damage Received Down', target: 'All allies below 75% Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5, 6, 7, 8.5, 10]), duration: 'Until end of current round', conditions: [below75], targetPriority: 'all-allies-matching-threshold', casterEligibility: 'excluded', includesCaster: false })] }),
        schedule({ id: 'trial-by-flame-below-50', timing: 'start-of-each-round', conditions: [below50], effects: [fixedEffect({ id: 'trial-below-50-fire-reduction', type: 'Fire Damage Received Down', target: 'All allies below 50% Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of current round', conditions: [below50], targetPriority: 'all-allies-matching-threshold', casterEligibility: 'excluded', includesCaster: false })] }),
        schedule({ id: 'trial-by-flame-below-25', timing: 'start-of-each-round', conditions: [below25], effects: [fixedEffect({ id: 'trial-below-25-fire-reduction', type: 'Fire Damage Received Down', target: 'All allies below 25% Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 18, 21, 25.5, 30]), duration: 'Until end of current round', conditions: [below25], targetPriority: 'all-allies-matching-threshold', casterEligibility: 'excluded', includesCaster: false })] }),
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

const combat20260625 = '2026-06-25';
const standardLegendaryPower20260625 = rankedPowers([420, 920, 1500, 2200, 3100]);

const roll = ({
  scope,
  chanceFixed = null,
  chanceByHabitLevel = [],
  description,
  unresolved = false,
  targetStatusConditionalChances = [],
}: Pick<ActivationRoll, 'scope' | 'description'> & Partial<Omit<ActivationRoll, 'scope' | 'description'>>): ActivationRoll => ({
  scope,
  chanceFixed,
  chanceByHabitLevel,
  targetStatusConditionalChances: targetStatusConditionalChances.map((chance) => ({
    ...chance,
    statusId: chance.statusId ?? null,
    statusCategoryId: chance.statusCategoryId ?? null,
  })),
  description,
  unresolved,
});

const targetSelection = (details: Partial<TargetSelectionDetails>): TargetSelectionDetails => ({
  preference: details.preference ?? null,
  fallback: details.fallback ?? null,
  comparisonStat: details.comparisonStat ?? null,
  comparisonDirection: details.comparisonDirection ?? null,
  comparisonPool: details.comparisonPool ?? null,
  tieBehavior: details.tieBehavior ?? null,
  distinctness: details.distinctness ?? 'unknown',
  references: details.references ?? [],
  sharedSelectionGroupId: details.sharedSelectionGroupId ?? null,
  repeatedInstances: details.repeatedInstances ?? null,
});

const createCrimson = (): Dragon => {
  const tauntedTarget = condition('target-has-taunt', 'target-has-status', 'Target has Taunt.', { statusId: 'taunt' });
  const above75 = condition('enemy-strictly-above-75-troops', 'target-above-troop-capacity-threshold', 'Enemy is strictly above 75% maximum Troop Capacity.', { subject: 'enemy', thresholdPercent: 75, comparison: 'above' });
  const below25 = condition('enemy-strictly-below-25-troops', 'target-below-troop-capacity-threshold', 'Enemy is strictly below 25% maximum Troop Capacity.', { subject: 'enemy', thresholdPercent: 25, comparison: 'below' });

  const roundOneReplacement = schedule({
    id: 'bloodscale-terror-round-one-stun-vermins-bane',
    timing: 'start-of-round',
    rounds: [1],
    roundSelector: { kind: 'start-of-round', round: 1 },
    triggerChanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]),
    activationRoll: roll({ scope: 'schedule-shared', chanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]), description: "Vermin's Bane replaces Bloodscale Terror's Round 1 Stun chance." }),
    effects: [fixedEffect({ id: 'bloodscale-terror-stun-round-one', type: 'Stun', target: '1 Enemy', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 2 })],
  });
  const verminsBaneEvenRoundSchedule = schedule({
    id: 'vermins-bane-even-rounds',
    timing: 'specific-rounds',
    roundSelector: { kind: 'even' },
    triggerChanceFixed: 50,
    activationRoll: roll({ scope: 'schedule-shared', chanceFixed: 50, description: 'One fixed activation roll for the even-round stat reductions.' }),
    targetPriority: 'highest-stat-enemy',
    effects: [
      fixedEffect({ id: 'vermins-bane-instinct-down', type: 'Instinct Down', target: 'Enemy with highest Instinct', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 15.6, 19.2, 24, 30]), durationRounds: 2, scaling: ['enhanced by Crimson Intelligence'], targetPriority: 'highest-stat-enemy', targetSelection: targetSelection({ comparisonStat: 'instinct', comparisonDirection: 'highest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group' }) }),
      fixedEffect({ id: 'vermins-bane-initiative-down', type: 'Initiative Down', target: 'Enemy with highest Instinct', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 15.6, 19.2, 24, 30]), durationRounds: 2, scaling: ['enhanced by Crimson Intelligence'], targetPriority: 'highest-stat-enemy', targetSelection: targetSelection({ comparisonStat: 'instinct', comparisonDirection: 'highest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group', sharedSelectionGroupId: 'vermins-bane-highest-instinct-enemy' }) }),
    ],
  });

  const command = ability({
    dragonId: 'crimson',
    id: 'crimson-bloodscale-terror',
    kind: 'command',
    name: 'Bloodscale Terror',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription: `Odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds. Rounds 2, 5, and 8: deal Fire Damage to one enemy in any lane at a 140% Damage Rate, scaling with Crimson's Intelligence and mitigated by target Initiative.

At 10 Stars:

Round 1: 40% chance to Stun one enemy in any lane for 2 rounds. This replaces the ordinary Round 1 Stun chance.

Other odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds.

Even-numbered rounds: one shared 50% activation roll to reduce Instinct and Initiative of the highest-Instinct enemy by 12% for 2 rounds, enhanced by Crimson's Intelligence.`,
    schedules: [
      schedule({
        id: 'bloodscale-terror-stun-odd',
        timing: 'specific-rounds',
        roundSelector: { kind: 'odd' },
        triggerChanceFixed: 20,
        activationRoll: roll({ scope: 'schedule-shared', chanceFixed: 20, description: 'One fixed Stun chance on odd-numbered rounds.' }),
        effects: [fixedEffect({ id: 'bloodscale-terror-stun', type: 'Stun', target: '1 Enemy', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 2 })],
      }),
      schedule({
        id: 'bloodscale-terror-fire-rounds',
        timing: 'specific-rounds',
        rounds: [2, 5, 8],
        roundSelector: { kind: 'explicit', rounds: [2, 5, 8] },
        effects: [fixedEffect({ id: 'bloodscale-terror-fire-damage', type: 'Fire Damage', target: '1 Enemy', targetScope: 'any-lane', magnitude: 140, unit: 'rate', scaling: ['attacker Intelligence'], notes: ['Mitigated by target Initiative.'] })],
      }),
    ],
    powerByHabitLevel: [],
    glossaryEntries: [{ term: 'Stun', definition: 'Prevents Commands, Habits, and Basic Attacks.' }],
    tags: ['STUN', 'FIRE_DAMAGE', 'ANY_LANE_TARGET', 'SPECIFIC_ROUNDS'],
    verification: screenshotVerificationAt('Crimson Bloodscale Terror screenshots', combat20260625),
    evidenceIds: ['crimson-bloodscale-terror-summary-2026-06-25'],
  });

  command.augmentations.push({
    id: 'crimson-vermins-bane-augmentation',
    sourceAbilityId: 'crimson-vermins-bane',
    modifiesAbilityId: 'crimson-bloodscale-terror',
    minimumDragonStarRank: 10,
    schedulesAdded: [verminsBaneEvenRoundSchedule],
    effectsAdded: [],
    scheduleOverrides: [{
      id: 'vermins-bane-round-one-stun-override',
      targetScheduleId: 'bloodscale-terror-stun-odd',
      targetEffectId: 'bloodscale-terror-stun',
      operation: 'replace-effect-roll',
      replacementSchedule: roundOneReplacement,
      replacementEffect: roundOneReplacement.effects[0]!,
      evidenceIds: ['crimson-vermins-bane-2026-06-25'],
      description: 'At 10 Stars, this replaces the ordinary Round 1 Stun chance.',
    }],
    rawDescription: "Vermin's Bane augments Bloodscale Terror with a Round 1 replacement and even-numbered round Instinct and Initiative reductions.",
    evidenceIds: ['crimson-vermins-bane-2026-06-25'],
  });

  const trait = ability({
    dragonId: 'crimson',
    id: 'crimson-hunters-cunning',
    kind: 'trait',
    name: "Hunter's Cunning",
    abilityClass: 'passive',
    unlockStarRank: 1,
    minimumDragonLevel: 16,
    positionRequirement: 'vanguard',
    rawDescription: 'At Level 16+ and deployed in Vanguard, Crimson Recovery Received +20%, Crimson Intelligence +25, and Right Flank ally Physical Damage Dealt +10%.',
    schedules: [schedule({ id: 'hunters-cunning-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [
      fixedEffect({ id: 'hunters-cunning-recovery', type: 'Recovery Received Up', target: 'Self', targetScope: 'self', magnitude: 20, unit: 'percent' }),
      fixedEffect({ id: 'hunters-cunning-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: 25, unit: 'flat' }),
      fixedEffect({ id: 'hunters-cunning-right-physical', type: 'Physical Damage Dealt Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 10, unit: 'percent' }),
    ] })],
    tags: ['RECOVERY_RECEIVED_UP', 'BUFF_INTELLIGENCE', 'PHYSICAL_DAMAGE_UP', 'RIGHT_FLANK_TARGET', 'VANGUARD_REQUIRED'],
    verification: screenshotVerificationAt("Crimson Hunter's Cunning screenshot", combat20260625),
    evidenceIds: ['crimson-hunters-cunning-2026-06-25'],
  });

  const habits = [
    ability({ dragonId: 'crimson', id: 'crimson-enervate', kind: 'habit', name: 'Enervate', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Start of Combat: select one enemy that deals Tactical Damage. Reduce its Tactical Damage Dealt until end of combat. Prose rounds L1 to -13%; table shows -13.5%.', schedules: [schedule({ id: 'enervate-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'enervate-tactical-down', type: 'Tactical Damage Dealt Down', target: '1 enemy that deals Tactical Damage', targetScope: 'unknown', magnitude: null, unit: 'percent', rankedValues: rankedPercents([13.5, 16.2, 18.9, 22.95, 27]), duration: 'Until end of combat', conditions: [condition('enemy-deals-tactical-damage', 'ally-deals-tactical-damage', 'Enemy deals Tactical Damage.', { subject: 'enemy' })] })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['TACTICAL_DAMAGE'], verification: screenshotVerificationAt('Crimson Enervate screenshot', combat20260625), evidenceIds: ['crimson-enervate-2026-06-25'], unresolvedQuestions: ['Enervate prose/table discrepancy.', 'Enervate target lane scope is not stated.'] }),
    ability({ dragonId: 'crimson', id: 'crimson-dragons-intellect', kind: 'habit', name: "Dragon's Intellect", abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat until end of combat: reduce Damage Received and increase Intelligence.', schedules: [schedule({ id: 'dragons-intellect-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [
      fixedEffect({ id: 'dragons-intellect-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6, 7.2, 8.4, 10.2, 12]), duration: 'Until end of combat' }),
      fixedEffect({ id: 'dragons-intellect-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), duration: 'Until end of combat' }),
    ] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['DAMAGE_RECEIVED_DOWN', 'BUFF_INTELLIGENCE'], verification: screenshotVerificationAt("Crimson Dragon's Intellect screenshot", combat20260625), evidenceIds: ['crimson-dragons-intellect-2026-06-25'] }),
    ability({ dragonId: 'crimson', id: 'crimson-bloodscale-fury', kind: 'habit', name: 'Bloodscale Fury', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Each Round: afflict Weakened on one enemy in any lane, preferring a target not already Stunned. Chance is doubled against a target with Taunt. Prose rounds L1 to 18%; table shows 17.5%.', schedules: [schedule({ id: 'bloodscale-fury-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceByHabitLevel: rankedPercents([17.5, 21, 24.5, 29.75, 35]), activationRoll: roll({ scope: 'effect', chanceByHabitLevel: rankedPercents([17.5, 21, 24.5, 29.75, 35]), description: 'Effect-level Weakened chance.', targetStatusConditionalChances: [{ statusId: 'taunt', chanceFixed: null, chanceByHabitLevel: rankedPercents([35, 42, 49, 59.5, 70]), multiplier: 2, description: 'Chance is doubled against a Taunted target.' }] }), effects: [fixedEffect({ id: 'bloodscale-fury-weakened', type: 'Weakened', target: '1 Enemy, preferring a target not already Stunned', targetScope: 'any-lane', magnitude: 20, unit: 'percent', durationRounds: 2, targetPriority: 'prefer-not-stunned', conditionalMultipliers: [multiplier('bloodscale-fury-taunt-double', 2, tauntedTarget, 'Chance is doubled against a Taunted target.', rankedPercents([35, 42, 49, 59.5, 70]))], targetSelection: targetSelection({ preference: 'target not already Stunned', fallback: 'another eligible enemy', distinctness: 'no-distinctness-requirement' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['WEAKENED', 'ANY_LANE_TARGET'], verification: screenshotVerificationAt('Crimson Bloodscale Fury screenshot', combat20260625), evidenceIds: ['crimson-bloodscale-fury-2026-06-25'], unresolvedQuestions: ['Bloodscale Fury rounded prose/table discrepancy.', 'Bloodscale Fury target preference behavior when all targets are Stunned.'] }),
    ability({ dragonId: 'crimson', id: 'crimson-unlikely-hero', kind: 'habit', name: 'Unlikely Hero', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of each round: enemies strictly above 75% max Troop Capacity receive increased non-Basic Physical Damage and Fire Damage until end of round; enemies strictly below 25% receive reduced Recovery. Table visually says Damage Dealt, text says Damage Received.', schedules: [schedule({ id: 'unlikely-hero-start-round', timing: 'start-of-each-round', roundSelector: { kind: 'each-round' }, effects: [
      fixedEffect({ id: 'unlikely-hero-physical-received', type: 'Physical Damage Received Up', target: 'All enemies strictly above 75% maximum Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of current round', excludes: ['Basic Attacks'], sourceScope: 'non-basic-attacks', conditions: [above75], targetPriority: 'all-allies-matching-threshold' }),
      fixedEffect({ id: 'unlikely-hero-fire-received', type: 'Fire Damage Received Up', target: 'All enemies strictly above 75% maximum Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of current round', conditions: [above75], targetPriority: 'all-allies-matching-threshold' }),
      fixedEffect({ id: 'unlikely-hero-recovery-received-down', type: 'Recovery Received Down', target: 'All enemies strictly below 25% maximum Troop Capacity', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([20, 24, 28, 34, 40]), duration: 'Until end of current round', conditions: [below25], targetPriority: 'all-allies-matching-threshold' }),
    ] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['PHYSICAL_DAMAGE_UP', 'FIRE_DAMAGE', 'RECOVERY_RECEIVED_DOWN'], verification: screenshotVerificationAt('Crimson Unlikely Hero screenshot', combat20260625), evidenceIds: ['crimson-unlikely-hero-2026-06-25'], unresolvedQuestions: ['Unlikely Hero table says Damage Dealt while full text says Damage Received.', 'Exact 25% and 75% threshold equality behavior.'] }),
    ability({ dragonId: 'crimson', id: 'crimson-vermins-bane', kind: 'habit', name: "Vermin's Bane", abilityClass: 'passive', unlockStarRank: 10, rawDescription: "Augments Bloodscale Terror: replace Round 1 Stun chance and on even-numbered rounds has 50% chance to reduce Instinct and Initiative of the enemy with highest Instinct for two rounds, enhanced by Crimson's Intelligence.", schedules: [verminsBaneEvenRoundSchedule], powerByHabitLevel: finalLegendaryPowerEarly, tags: ['COMMAND_AUGMENTATION', 'DEBUFF_INSTINCTS', 'DEBUFF_INITIATIVE'], verification: screenshotVerificationAt("Crimson Vermin's Bane screenshot", combat20260625), evidenceIds: ['crimson-vermins-bane-2026-06-25'], unresolvedQuestions: ["Exact Intelligence enhancement for Vermin's Bane."] }),
  ];

  return {
    ...createDragon('Crimson', 'Legendary', 'Hunter'),
    dataStatus: 'community-verified',
    lastVerified: combat20260625,
    command,
    trait,
    habits,
    affinities: { Cavalry: 'unknown', Shieldbearers: 'unknown', Archers: 'positive', Spearmen: 'positive', Siege: 'positive' },
    tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])],
    fieldVerification: { identity: officialMetadataVerification, rarity: officialMetadataVerification, breed: officialMetadataVerification, command: screenshotVerificationAt('Crimson Bloodscale Terror screenshots', combat20260625), trait: screenshotVerificationAt("Crimson Hunter's Cunning screenshot", combat20260625), habits: screenshotVerificationAt('Crimson Habit screenshots', combat20260625), affinities: partialScreenshotVerification('Crimson main screen screenshot') },
    unresolvedQuestions: ['Observed preview stats are account-specific, not canonical base stats.'],
  };
};

const createKalspire = (): Dragon => {
  const tacticalAssaultSchedule = schedule({ id: 'tactical-assault-after-basic', timing: 'after-basic-attack', roundSelector: { kind: 'after-basic-attack' }, effects: [
    fixedEffect({ id: 'tactical-assault-physical-damage', type: 'Physical Damage', target: 'One enemy within adjacency that was not the original Basic Attack target', targetScope: 'within-adjacency', magnitude: null, unit: 'rate', rankedValues: rankedPercents([25, 30, 35, 42.5, 50]), scaling: ['attacker Strength'], targetSelection: targetSelection({ references: [{ id: 'not-original-basic-attack-target', kind: 'distinct-from-effect-target', referencedEffectId: 'tactical-strike-tactical-damage', description: 'Physical Damage target is distinct from the original Basic Attack target.' }], distinctness: 'must-be-distinct' }) }),
    fixedEffect({ id: 'tactical-assault-panic', type: 'Panic', target: 'Physical Damage target and one other distinct enemy within adjacency', targetScope: 'within-adjacency', magnitude: 20, unit: 'rate', durationRounds: 2, rankedValues: rankedPercents([20, 20, 20, 20, 20]), activationRoll: roll({ scope: 'independent-per-target', chanceByHabitLevel: rankedPercents([15, 18, 21, 25.5, 30]), description: 'Panic checks are separate for each target.' }), targetSelection: targetSelection({ references: [{ id: 'panic-first-target', kind: 'same-target-as-effect', referencedEffectId: 'tactical-assault-physical-damage', description: 'First Panic check uses the Physical Damage target.' }, { id: 'panic-second-target', kind: 'distinct-from-effect-target', referencedEffectId: 'tactical-assault-physical-damage', description: 'Second Panic check uses another distinct adjacent enemy.' }], distinctness: 'explicitly-another-target' }), notes: ['Panic is periodic Tactical Damage, +20% each round.'] }),
  ] });
  const command = ability({ dragonId: 'kalspire', id: 'kalspire-tactical-strike', kind: 'command', name: 'Tactical Strike', abilityClass: 'active', unlockStarRank: null, rawDescription: `After each Basic Attack: deal Tactical Damage to the original Basic Attack target at a 50% Damage Rate, scaling with Kalspire's Instinct and mitigated by target Intelligence.

Then independently attempt Bleed at a 30% chance on the original Basic Attack target and one other enemy within adjacency. Bleed deals periodic Physical Damage at a 20% rate each round for 2 rounds, scaling with Strength and mitigated by target Instinct.

At 6+ Stars:

After each Basic Attack: deal Physical Damage at a 25% rate to one enemy within adjacency that is distinct from the original Basic Attack target, scaling with Strength.

Then independently attempt Panic at a 15% chance on the Physical Damage target and one other distinct enemy within adjacency. Panic deals periodic Tactical Damage at a 20% rate each round for 2 rounds.`, schedules: [schedule({ id: 'tactical-strike-after-basic', timing: 'after-basic-attack', roundSelector: { kind: 'after-basic-attack' }, effects: [
    fixedEffect({ id: 'tactical-strike-tactical-damage', type: 'Tactical Damage', target: 'Original Basic Attack target', targetScope: 'any-lane', magnitude: 50, unit: 'rate', scaling: ['attacker Instinct'], notes: ['Mitigated by target Intelligence.'], targetPriority: 'original-basic-attack-target', targetSelection: targetSelection({ references: [{ id: 'original-basic-attack-target', kind: 'original-basic-attack-target', referencedEffectId: null, description: 'Use the target of the Basic Attack that triggered Tactical Strike.' }], distinctness: 'same-target-required' }) }),
    fixedEffect({ id: 'tactical-strike-bleed', type: 'Bleed', target: 'Original Basic Attack target and one other enemy within adjacency', targetScope: 'within-adjacency', magnitude: 20, unit: 'rate', durationRounds: 2, perTargetEffectCheck: { targetCount: 2, effects: [{ effectId: 'tactical-strike-bleed', independentlyChecked: true }], targetsCheckedIndependently: true, sharedChanceByHabitLevel: [] }, activationRoll: roll({ scope: 'independent-per-target', chanceFixed: 30, description: 'Bleed checks are separate for each target.' }), targetSelection: targetSelection({ references: [{ id: 'original-basic-attack-target', kind: 'original-basic-attack-target', referencedEffectId: null, description: 'First checked target is the original Basic Attack target.' }, { id: 'other-adjacent-enemy', kind: 'distinct-from-effect-target', referencedEffectId: 'tactical-strike-tactical-damage', description: 'Second checked target is another enemy within adjacency.' }], distinctness: 'explicitly-another-target' }), notes: ['Bleed is periodic Physical Damage, +20% each round.'] }),
  ] })], augmentations: [{ id: 'kalspire-tactical-assault-augmentation', sourceAbilityId: 'kalspire-tactical-assault', modifiesAbilityId: 'kalspire-tactical-strike', minimumDragonStarRank: 6, schedulesAdded: [tacticalAssaultSchedule], effectsAdded: [], scheduleOverrides: [], rawDescription: 'At 6+ Stars, Tactical Assault augments Tactical Strike with Physical Damage and independent Panic checks.', evidenceIds: ['kalspire-tactical-assault-2026-06-25'] }], tags: ['TACTICAL_DAMAGE', 'BLEED', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Kalspire Tactical Strike screenshots', combat20260625), evidenceIds: ['kalspire-tactical-strike-summary-2026-06-25'], unresolvedQuestions: ['Enemy adjacency reference point.', 'Bleed refresh and first-tick timing.'] });

  const trait = ability({ dragonId: 'kalspire', id: 'kalspire-champions-brilliance', kind: 'trait', name: "Champion's Brilliance", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Kalspire Strength, Intelligence, and Instinct +15; Right Flank ally Damage Received -8%.', schedules: [schedule({ id: 'champions-brilliance-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [
    fixedEffect({ id: 'champions-brilliance-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }),
    fixedEffect({ id: 'champions-brilliance-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }),
    fixedEffect({ id: 'champions-brilliance-instinct', type: 'Instinct Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }),
    fixedEffect({ id: 'champions-brilliance-right-damage-received', type: 'Damage Received Down', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 8, unit: 'percent', sourceScope: 'all-sources' }),
  ] })], tags: ['STRENGTH_UP', 'BUFF_INTELLIGENCE', 'INSTINCT_UP', 'DAMAGE_RECEIVED_DOWN', 'RIGHT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Kalspire Champion's Brilliance screenshot", combat20260625), evidenceIds: ['kalspire-champions-brilliance-2026-06-25'] });

  const habits = [
    ability({ dragonId: 'kalspire', id: 'kalspire-robust-insight', kind: 'habit', name: 'Robust Insight', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Start of Combat until end of combat: increase Kalspire Strength and Instinct.', schedules: [schedule({ id: 'robust-insight-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'robust-insight-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([20, 24, 28, 34, 40]), duration: 'Until end of combat' }), fixedEffect({ id: 'robust-insight-instinct', type: 'Instinct Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([20, 24, 28, 34, 40]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['STRENGTH_UP', 'INSTINCT_UP'], verification: screenshotVerificationAt('Kalspire Robust Insight screenshot', combat20260625), evidenceIds: ['kalspire-robust-insight-2026-06-25'] }),
    ability({ dragonId: 'kalspire', id: 'kalspire-battle-cunning', kind: 'habit', name: 'Battle Cunning', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat until end of combat: target three enemies in any lane. Reduce Strength and Intelligence, enhanced by Instinct. Prose rounds L1 to -6%; table shows -6.5%.', schedules: [schedule({ id: 'battle-cunning-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'battle-cunning-strength-down', type: 'Strength Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6.5, 7.8, 9.1, 11.05, 13]), duration: 'Until end of combat', scaling: ['enhanced by Kalspire Instinct'], targetCount: 3 }), fixedEffect({ id: 'battle-cunning-intelligence-down', type: 'Intelligence Down', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6.5, 7.8, 9.1, 11.05, 13]), duration: 'Until end of combat', scaling: ['enhanced by Kalspire Instinct'], targetCount: 3 })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['DEBUFF_STRENGTH', 'DEBUFF_INTELLIGENCE'], verification: screenshotVerificationAt('Kalspire Battle Cunning screenshot', combat20260625), evidenceIds: ['kalspire-battle-cunning-2026-06-25'], unresolvedQuestions: ['Battle Cunning Instinct enhancement formula.', 'Highest-stat tie-breaking.'] }),
    ability({ dragonId: 'kalspire', id: 'kalspire-tactical-assault', kind: 'habit', name: 'Tactical Assault', abilityClass: 'passive', unlockStarRank: 6, rawDescription: `At 6+ Stars, Tactical Assault augments Tactical Strike: after each Basic Attack, deal Physical Damage to one enemy within adjacency that is not the original Basic Attack target. Then independently attempt Panic on that target and one other distinct adjacent enemy.`, schedules: [tacticalAssaultSchedule], powerByHabitLevel: standardLegendaryPower20260625, tags: ['COMMAND_AUGMENTATION', 'PHYSICAL_DAMAGE', 'PANIC', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Kalspire Tactical Assault screenshot', combat20260625), evidenceIds: ['kalspire-tactical-assault-2026-06-25'], unresolvedQuestions: ['Enemy adjacency reference point.', 'Panic refresh and first-tick timing.'] }),
    ability({ dragonId: 'kalspire', id: 'kalspire-dragons-insight', kind: 'habit', name: "Dragon's Insight", abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of Combat until end of combat: reduce Damage Received and increase Instinct.', schedules: [schedule({ id: 'dragons-insight-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'dragons-insight-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6, 7.2, 8.4, 10.2, 12]), duration: 'Until end of combat' }), fixedEffect({ id: 'dragons-insight-instinct', type: 'Instinct Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['DAMAGE_RECEIVED_DOWN', 'INSTINCT_UP'], verification: screenshotVerificationAt("Kalspire Dragon's Insight screenshot", combat20260625), evidenceIds: ['kalspire-dragons-insight-2026-06-25'] }),
    ability({ dragonId: 'kalspire', id: 'kalspire-radiant-conqueror', kind: 'habit', name: 'Radiant Conqueror', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Start of Round 1 for one round: Kalspire Damage Received -50% and Kalspire is afflicted with Stun. Start of Round 2 for five rounds: reduce non-Basic Physical Damage Dealt of enemy with highest Strength and Fire Damage Dealt of enemy with highest Intelligence. The selected enemies may be same or different.', schedules: [
      schedule({ id: 'radiant-conqueror-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'radiant-conqueror-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: 50, unit: 'percent', durationRounds: 1 }), fixedEffect({ id: 'radiant-conqueror-self-stun', type: 'Stun', target: 'Self', targetScope: 'self', magnitude: null, unit: 'unknown', durationRounds: 1, notes: ['Real self-inflicted Control status.'] })] }),
      schedule({ id: 'radiant-conqueror-round-two', timing: 'start-of-round', rounds: [2], roundSelector: { kind: 'start-of-round', round: 2 }, effects: [fixedEffect({ id: 'radiant-conqueror-physical-down', type: 'Physical Damage Dealt Down', target: 'Enemy with highest Strength', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 13, 16, 20, 25]), durationRounds: 5, excludes: ['Basic Attacks'], sourceScope: 'non-basic-attacks', targetPriority: 'highest-stat-enemy', targetSelection: targetSelection({ comparisonStat: 'strength', comparisonDirection: 'highest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group' }) }), fixedEffect({ id: 'radiant-conqueror-fire-down', type: 'Fire Damage Dealt Down', target: 'Enemy with highest Intelligence', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 13, 16, 20, 25]), durationRounds: 5, targetPriority: 'highest-stat-enemy', targetSelection: targetSelection({ comparisonStat: 'intelligence', comparisonDirection: 'highest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group', distinctness: 'no-distinctness-requirement' }) })] }),
    ], powerByHabitLevel: finalLegendaryPowerEarly, tags: ['STUN', 'CONTROL', 'PHYSICAL_DAMAGE_UP', 'FIRE_DAMAGE'], verification: screenshotVerificationAt('Kalspire Radiant Conqueror screenshot', combat20260625), evidenceIds: ['kalspire-radiant-conqueror-2026-06-25'], unresolvedQuestions: ['Whether a legal allied cleanse can remove Radiant Conqueror Stun before Kalspire acts.', 'Highest-stat tie-breaking.'] }),
  ];
  return { ...createDragon('Kalspire', 'Legendary', 'Champion'), dataStatus: 'community-verified', lastVerified: combat20260625, command, trait, habits, affinities: { Cavalry: 'positive', Shieldbearers: 'positive', Siege: 'positive', Archers: 'unknown', Spearmen: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: officialMetadataVerification, rarity: officialMetadataVerification, breed: officialMetadataVerification, command: screenshotVerificationAt('Kalspire Tactical Strike screenshots', combat20260625), trait: screenshotVerificationAt("Kalspire Champion's Brilliance screenshot", combat20260625), habits: screenshotVerificationAt('Kalspire Habit screenshots', combat20260625), affinities: partialScreenshotVerification('Kalspire main screen screenshot') }, unresolvedQuestions: ['Observed preview stats are account-specific, not canonical base stats.', 'Enemy-formation adjacency semantics.'] };
};

const createVhagar = (): Dragon => {
  const burnedTarget = condition('target-has-burn', 'target-has-status', 'Target has Burn.', { statusId: 'burn' });
  const command = ability({ dragonId: 'vhagar', id: 'vhagar-fiery-bonds', kind: 'command', name: 'Fiery Bonds', abilityClass: 'active', unlockStarRank: null, rawDescription: 'Each round: 25% chance to afflict Taunt on three enemies in any lane for two rounds, doubled to 50% against Burned targets. Even-numbered rounds: deal Physical Damage to one enemy within adjacency, Damage Rate +120%. Taunt roll scope is not stated.', schedules: [
    schedule({ id: 'fiery-bonds-taunt', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceFixed: 25, activationRoll: roll({ scope: 'unknown', chanceFixed: 25, description: 'Taunt chance applies to three targets, but shared versus per-target roll scope is not stated.', unresolved: true, targetStatusConditionalChances: [{ statusId: 'burn', chanceFixed: 50, chanceByHabitLevel: [], multiplier: 2, description: 'Chance is doubled against a Burned target.' }] }), effects: [fixedEffect({ id: 'fiery-bonds-taunt', type: 'Taunt', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 2, targetCount: 3, conditionalMultipliers: [multiplier('fiery-bonds-burn-double', 2, burnedTarget, 'Chance is doubled against a Burned target.', [{ level: 0, value: 50, unit: 'percent' }])], activationRoll: roll({ scope: 'unknown', chanceFixed: 25, description: 'Shared versus per-target Taunt roll is unresolved.', unresolved: true }) })] }),
    schedule({ id: 'fiery-bonds-even-physical', timing: 'specific-rounds', roundSelector: { kind: 'even' }, effects: [fixedEffect({ id: 'fiery-bonds-physical-damage', type: 'Physical Damage', target: '1 Enemy within adjacency', targetScope: 'within-adjacency', magnitude: 120, unit: 'rate', scaling: ['attacker Strength'], notes: ['Mitigated by target Instinct.', 'Enemy adjacency semantics remain unresolved.'] })] }),
  ], glossaryEntries: [{ term: 'Taunt', definition: 'Forces the target to launch its Basic Attack against the dragon that applied Taunt.' }], tags: ['TAUNT', 'PHYSICAL_DAMAGE', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Vhagar Fiery Bonds screenshots', combat20260625), evidenceIds: ['vhagar-fiery-bonds-summary-2026-06-25'], unresolvedQuestions: ['Fiery Bonds shared-roll versus per-target Taunt checks.', 'Enemy adjacency.'] });
  const trait = ability({ dragonId: 'vhagar', id: 'vhagar-warriors-resilience', kind: 'trait', name: "Warrior's Resilience", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Vhagar Damage Received -8%; Left Flank ally Tactical Damage Dealt +16%.', schedules: [schedule({ id: 'warriors-resilience-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [fixedEffect({ id: 'warriors-resilience-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: 8, unit: 'percent', sourceScope: 'all-sources' }), fixedEffect({ id: 'warriors-resilience-left-tactical', type: 'Tactical Damage Dealt Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 16, unit: 'percent' })] })], tags: ['DAMAGE_RECEIVED_DOWN', 'TACTICAL_DAMAGE', 'LEFT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Vhagar Warrior's Resilience screenshot", combat20260625), evidenceIds: ['vhagar-warriors-resilience-2026-06-25'] });
  const habits = [
    ability({ dragonId: 'vhagar', id: 'vhagar-ancestral-shield', kind: 'habit', name: 'Ancestral Shield', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Start of Round 1 for three rounds: reduce Physical and Tactical Damage Received. Start of Round 4 until end of combat: increase Recovery Received.', schedules: [schedule({ id: 'ancestral-shield-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'ancestral-shield-physical-received', type: 'Physical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), durationRounds: 3 }), fixedEffect({ id: 'ancestral-shield-tactical-received', type: 'Tactical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), durationRounds: 3 })] }), schedule({ id: 'ancestral-shield-round-four', timing: 'start-of-round', rounds: [4], roundSelector: { kind: 'start-of-round', round: 4 }, effects: [fixedEffect({ id: 'ancestral-shield-recovery-received', type: 'Recovery Received Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 18, 21, 25.5, 30]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['DAMAGE_RECEIVED_DOWN', 'RECOVERY_RECEIVED_UP'], verification: screenshotVerificationAt('Vhagar Ancestral Shield screenshot', combat20260625), evidenceIds: ['vhagar-ancestral-shield-2026-06-25'] }),
    ability({ dragonId: 'vhagar', id: 'vhagar-battle-leader', kind: 'habit', name: 'Battle Leader', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat until end of combat: select one ally in any lane, preferring Right Flank with fallback, and increase Physical Damage Dealt excluding Basic Attacks.', schedules: [schedule({ id: 'battle-leader-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'battle-leader-physical', type: 'Physical Damage Dealt Up', target: '1 Ally, prioritizing Right Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12.5, 15, 17.5, 21.25, 25]), duration: 'Until end of combat', excludes: ['Basic Attacks'], sourceScope: 'non-basic-attacks', targetPriority: 'prefer-right-flank', targetSelection: targetSelection({ preference: 'Right Flank', fallback: 'another eligible ally', distinctness: 'no-distinctness-requirement' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['PHYSICAL_DAMAGE_UP'], verification: screenshotVerificationAt('Vhagar Battle Leader screenshot', combat20260625), evidenceIds: ['vhagar-battle-leader-2026-06-25'], unresolvedQuestions: ['Target selection when a preferred flank is absent.'] }),
    ability({ dragonId: 'vhagar', id: 'vhagar-eclipse-cover', kind: 'habit', name: 'Eclipse Cover', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Rounds 3 through 7 inclusive: one shared ranked activation roll. On success, grant Advantage to the ally with most current troops and Weakened to the enemy with most current troops for two rounds. Prose rounds L1 to 18%; table shows 17.5%.', schedules: [schedule({ id: 'eclipse-cover-rounds-3-7', timing: 'specific-rounds', roundSelector: { kind: 'range', startRound: 3, endRound: 7 }, triggerChanceByHabitLevel: rankedPercents([17.5, 21, 24.5, 29.8, 35]), activationRoll: roll({ scope: 'schedule-shared', chanceByHabitLevel: rankedPercents([17.5, 21, 24.5, 29.8, 35]), description: 'One shared activation roll applies both effects.' }), effects: [fixedEffect({ id: 'eclipse-cover-advantage', type: 'Advantage', target: 'Ally with most current troops', targetScope: 'any-lane', magnitude: 20, unit: 'percent', durationRounds: 2, targetPriority: 'highest-current-troops-ally', casterEligibility: 'eligible-if-targeting-allows', targetSelection: targetSelection({ comparisonStat: 'current-troops', comparisonDirection: 'highest', comparisonPool: 'ally-side', tieBehavior: 'candidate-group', sharedSelectionGroupId: 'eclipse-cover-shared-roll' }) }), fixedEffect({ id: 'eclipse-cover-weakened', type: 'Weakened', target: 'Enemy with most current troops', targetScope: 'any-lane', magnitude: 20, unit: 'percent', durationRounds: 2, targetPriority: 'highest-current-troops-enemy', targetSelection: targetSelection({ comparisonStat: 'current-troops', comparisonDirection: 'highest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group', sharedSelectionGroupId: 'eclipse-cover-shared-roll' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['ADVANTAGE', 'WEAKENED'], verification: screenshotVerificationAt('Vhagar Eclipse Cover screenshot', combat20260625), evidenceIds: ['vhagar-eclipse-cover-2026-06-25'], unresolvedQuestions: ['Most-troops tie-breaking.'] }),
    ability({ dragonId: 'vhagar', id: 'vhagar-blazing-onslaught', kind: 'habit', name: 'Blazing Onslaught', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of Round 1 for three rounds: increase Fire Damage Received on one enemy preferring Left Flank, and Physical Damage Received excluding Basic Attacks on one enemy preferring Right Flank. Effects select independently; distinct targets are not required.', schedules: [schedule({ id: 'blazing-onslaught-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'blazing-onslaught-fire-received', type: 'Fire Damage Received Up', target: '1 Enemy, prioritizing Left Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), durationRounds: 3, targetPriority: 'prefer-left-flank', targetSelection: targetSelection({ preference: 'Left Flank', fallback: 'another eligible enemy', distinctness: 'no-distinctness-requirement' }) }), fixedEffect({ id: 'blazing-onslaught-physical-received', type: 'Physical Damage Received Up', target: '1 Enemy, prioritizing Right Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), durationRounds: 3, excludes: ['Basic Attacks'], sourceScope: 'non-basic-attacks', targetPriority: 'prefer-right-flank', targetSelection: targetSelection({ preference: 'Right Flank', fallback: 'another eligible enemy', distinctness: 'no-distinctness-requirement' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['FIRE_DAMAGE', 'PHYSICAL_DAMAGE_UP'], verification: screenshotVerificationAt('Vhagar Blazing Onslaught screenshot', combat20260625), evidenceIds: ['vhagar-blazing-onslaught-2026-06-25'], unresolvedQuestions: ['Target selection when a preferred flank is absent.'] }),
    ability({ dragonId: 'vhagar', id: 'vhagar-skyward-titan', kind: 'habit', name: 'Skyward Titan', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Each round: 30% chance to gain one Bulwark stack, max five, until end of combat. Each stack increases Strength and reduces Physical/Tactical Damage Received. When Vhagar gains the third Bulwark stack, deal Physical Damage to one enemy in the same lane.', schedules: [schedule({ id: 'skyward-titan-bulwark', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceFixed: 30, activationRoll: roll({ scope: 'schedule-shared', chanceFixed: 30, description: 'One chance to gain a Bulwark stack each round.' }), effects: [fixedEffect({ id: 'skyward-titan-bulwark-stack', type: 'Bulwark', target: 'Self', targetScope: 'self', magnitude: 1, unit: 'flat', stack: stack({ statusId: 'bulwark', maximumStacks: 5, untilEndOfCombat: true, valuePerStackByHabitLevel: rankedPercents([5, 6.5, 8, 10, 12.5]) }), notes: ['Each stack increases Strength and reduces Physical/Tactical Damage Received; defense L1 table value is -2.5%.'] })] }), schedule({ id: 'skyward-titan-third-stack', timing: 'on-stack-count-gained', roundSelector: { kind: 'each-round' }, effects: [fixedEffect({ id: 'skyward-titan-third-stack-damage', type: 'Physical Damage', target: '1 Enemy in the same lane', targetScope: 'same-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([100, 130, 160, 200, 250]), scaling: ['attacker Strength'], stackTransitionTrigger: { statusId: 'bulwark', stackCount: 3, transition: 'gaining-nth-stack', oncePerTransition: true, description: 'Triggers when Vhagar gains the third Bulwark stack, not continuously while at three or more stacks.' } })] })], powerByHabitLevel: finalLegendaryPowerEarly, tags: ['BULWARK', 'STRENGTH_UP', 'DAMAGE_RECEIVED_DOWN', 'PHYSICAL_DAMAGE'], verification: screenshotVerificationAt('Vhagar Skyward Titan screenshot', combat20260625), evidenceIds: ['vhagar-skyward-titan-2026-06-25'], unresolvedQuestions: ['Bulwark stack acquisition and exact trigger ordering.'] }),
  ];
  return { ...createDragon('Vhagar', 'Legendary', 'Warrior'), dataStatus: 'community-verified', lastVerified: combat20260625, command, trait, habits, affinities: { Shieldbearers: 'positive', Archers: 'positive', Siege: 'positive', Cavalry: 'unknown', Spearmen: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: officialMetadataVerification, rarity: officialMetadataVerification, breed: officialMetadataVerification, command: screenshotVerificationAt('Vhagar Fiery Bonds screenshots', combat20260625), trait: screenshotVerificationAt("Vhagar Warrior's Resilience screenshot", combat20260625), habits: screenshotVerificationAt('Vhagar Habit screenshots', combat20260625), affinities: partialScreenshotVerification('Vhagar main screen screenshot') }, unresolvedQuestions: ['Observed preview stats are account-specific, not canonical base stats.', 'Enemy adjacency.'] };
};

const createVenator = (): Dragon => {
  const doubleStrikeReplacement = schedule({ id: 'feral-strike-double-strike-feral-precision', timing: 'specific-rounds', rounds: [4, 6, 8], roundSelector: { kind: 'explicit', rounds: [4, 6, 8] }, triggerChanceByHabitLevel: rankedPercents([40, 42, 44, 47, 50]), activationRoll: roll({ scope: 'schedule-shared', chanceByHabitLevel: rankedPercents([40, 42, 44, 47, 50]), description: 'Feral Precision replaces the base Double-Strike chance on rounds 4, 6, and 8.' }), effects: [fixedEffect({ id: 'feral-strike-double-strike', type: 'Double-Strike', target: 'Self', targetScope: 'self', magnitude: null, unit: 'unknown', durationRounds: 2 })] });
  const command = ability({ dragonId: 'venator', id: 'venator-feral-strike', kind: 'command', name: 'Feral Strike', abilityClass: 'active', unlockStarRank: null, rawDescription: 'After each Basic Attack: deal two independently targeted Physical Damage instances. Rounds 4, 6, and 8: 30% chance to gain Double-Strike for two rounds. Classified as Command while preserving Attack Modifier presentation.', schedules: [
    schedule({ id: 'feral-strike-after-basic', timing: 'after-basic-attack', roundSelector: { kind: 'after-basic-attack' }, effects: [fixedEffect({ id: 'feral-strike-physical-instances', type: 'Physical Damage', target: '1 Enemy per damage instance', targetScope: 'any-lane', magnitude: 20, unit: 'rate', scaling: ['attacker Strength'], targetCount: 1, targetSelection: targetSelection({ repeatedInstances: { count: 2, eachInstanceSelectsSeparately: true, sameTargetAllowed: true }, distinctness: 'no-distinctness-requirement' }), notes: ['Two Physical Damage instances select independently; the same enemy may receive both.'] })] }),
    schedule({ id: 'feral-strike-double-strike-rounds', timing: 'specific-rounds', rounds: [4, 6, 8], roundSelector: { kind: 'explicit', rounds: [4, 6, 8] }, triggerChanceFixed: 30, activationRoll: roll({ scope: 'schedule-shared', chanceFixed: 30, description: 'One base Double-Strike chance on rounds 4, 6, and 8.' }), effects: [fixedEffect({ id: 'feral-strike-double-strike', type: 'Double-Strike', target: 'Self', targetScope: 'self', magnitude: null, unit: 'unknown', durationRounds: 2 })] }),
  ], glossaryEntries: [{ term: 'Double-Strike', definition: 'Grants a second Basic Attack each round.' }], tags: ['PHYSICAL_DAMAGE', 'DOUBLE_STRIKE'], verification: screenshotVerificationAt('Venator Feral Strike screenshots', combat20260625), evidenceIds: ['venator-feral-strike-summary-2026-06-25'], unresolvedQuestions: ['Same-round Double-Strike timing.', 'Ordering between the fixed-round check and the Basic Attack.', 'Exact Double-Strike duration counting.'] });
  command.augmentations.push({ id: 'venator-feral-precision-augmentation', sourceAbilityId: 'venator-feral-precision', modifiesAbilityId: 'venator-feral-strike', minimumDragonStarRank: 6, schedulesAdded: [], effectsAdded: [], scheduleOverrides: [{ id: 'feral-precision-double-strike-override', targetScheduleId: 'feral-strike-double-strike-rounds', targetEffectId: 'feral-strike-double-strike', operation: 'replace-effect-roll', replacementSchedule: doubleStrikeReplacement, replacementEffect: doubleStrikeReplacement.effects[0]!, evidenceIds: ['venator-feral-precision-2026-06-25'], description: 'Feral Precision replaces the base Double-Strike chance; it does not add a second roll.' }], rawDescription: 'Feral Precision augments Feral Strike damage and Double-Strike chance.', evidenceIds: ['venator-feral-precision-2026-06-25'] });
  const trait = ability({ dragonId: 'venator', id: 'venator-warriors-zeal', kind: 'trait', name: "Warrior's Zeal", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: increase Venator Physical Damage from Commands and Habits by 16%; Left Flank ally Instinct and Initiative +20.', schedules: [schedule({ id: 'warriors-zeal-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [fixedEffect({ id: 'warriors-zeal-command-habit-physical', type: 'Physical Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: 16, unit: 'percent', sourceScope: 'commands-and-habits', notes: ['Does not amplify raw Basic Attacks.'] }), fixedEffect({ id: 'warriors-zeal-left-instinct', type: 'Instinct Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }), fixedEffect({ id: 'warriors-zeal-left-initiative', type: 'Initiative Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' })] })], tags: ['PHYSICAL_DAMAGE_UP', 'INSTINCT_UP', 'BUFF_INITIATIVE', 'LEFT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Venator Warrior's Zeal screenshot", combat20260625), evidenceIds: ['venator-warriors-zeal-2026-06-25'] });
  const below50Self = condition('self-strictly-below-50-troops', 'target-below-troop-capacity-threshold', 'Venator is strictly below 50% Troop Capacity.', { subject: 'self', thresholdPercent: 50, comparison: 'below' });
  const habits = [
    ability({ dragonId: 'venator', id: 'venator-hunters-bane', kind: 'habit', name: "Hunter's Bane", abilityClass: 'passive', unlockStarRank: 2, rawDescription: "Start of Combat: reduce Intelligence of one enemy in any lane, preferring Hunter breed with fallback, enhanced by Venator's Strength. Screenshot states no duration.", schedules: [schedule({ id: 'hunters-bane-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'hunters-bane-intelligence-down', type: 'Intelligence Down', target: '1 Enemy, prioritizing Hunter breed', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([30, 36, 42, 51, 60]), scaling: ['enhanced by Venator Strength'], targetPriority: 'prefer-hunter', targetSelection: targetSelection({ preference: 'Hunter breed', fallback: 'another eligible enemy' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['DEBUFF_INTELLIGENCE'], verification: screenshotVerificationAt("Venator Hunter's Bane screenshot", combat20260625), evidenceIds: ['venator-hunters-bane-2026-06-25'], unresolvedQuestions: ["Hunter's Bane duration.", "Hunter's Bane Strength enhancement formula."] }),
    ability({ dragonId: 'venator', id: 'venator-dragons-might', kind: 'habit', name: "Dragon's Might", abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat until end of combat: increase Venator Physical Damage Dealt excluding Basic Attacks.', schedules: [schedule({ id: 'dragons-might-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'dragons-might-physical', type: 'Physical Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12.5, 15, 17.5, 21.25, 25]), duration: 'Until end of combat', excludes: ['Basic Attacks'], sourceScope: 'non-basic-attacks' })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['PHYSICAL_DAMAGE_UP'], verification: screenshotVerificationAt("Venator Dragon's Might screenshot", combat20260625), evidenceIds: ['venator-dragons-might-2026-06-25'] }),
    ability({ dragonId: 'venator', id: 'venator-feral-precision', kind: 'habit', name: 'Feral Precision', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Augments Feral Strike: add one Physical Damage instance targeting the enemy with least current troops and replace Double-Strike chance on rounds 4, 6, and 8.', schedules: [schedule({ id: 'feral-precision-after-basic', timing: 'after-basic-attack', roundSelector: { kind: 'after-basic-attack' }, effects: [fixedEffect({ id: 'feral-precision-additional-physical', type: 'Physical Damage', target: 'Enemy with least current troops', targetScope: 'any-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([20, 24, 28, 34, 40]), scaling: ['attacker Strength'], targetPriority: 'least-current-troops-enemy', targetSelection: targetSelection({ comparisonStat: 'current-troops', comparisonDirection: 'lowest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['COMMAND_AUGMENTATION', 'PHYSICAL_DAMAGE'], verification: screenshotVerificationAt('Venator Feral Precision screenshot', combat20260625), evidenceIds: ['venator-feral-precision-2026-06-25'] }),
    ability({ dragonId: 'venator', id: 'venator-armor-break', kind: 'habit', name: 'Armor Break', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of Combat until end of combat: increase Physical Damage Received by one opposing enemy. Opposing-position is provisionally normalized to same-lane enemy for formation compatibility.', schedules: [schedule({ id: 'armor-break-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'armor-break-physical-received', type: 'Physical Damage Received Up', target: '1 opposing enemy', targetScope: 'opposing-position', magnitude: null, unit: 'percent', rankedValues: rankedPercents([8, 9.6, 11.2, 13.6, 16]), duration: 'Until end of combat', targetPriority: 'opposing-position', targetSelection: targetSelection({ references: [{ id: 'opposing-position-enemy', kind: 'opposing-position-enemy', referencedEffectId: null, description: "Enemy occupying Venator's lane, retained as provisional interpretation." }], distinctness: 'no-distinctness-requirement' }) })] })], powerByHabitLevel: standardLegendaryPower20260625, tags: ['PHYSICAL_DAMAGE_UP'], verification: screenshotVerificationAt('Venator Armor Break screenshot', combat20260625), evidenceIds: ['venator-armor-break-2026-06-25'], unresolvedQuestions: ['Opposing-position interpretation retained as provisional.'] }),
    ability({ dragonId: 'venator', id: 'venator-desperate-ambush', kind: 'habit', name: 'Desperate Ambush', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Each round, when Venator is strictly below 50% Troop Capacity: select one enemy, preferring Hunter breed, deal Physical Damage, then attempt Overwhelm on that same selected target for two rounds.', schedules: [schedule({ id: 'desperate-ambush-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, conditions: [below50Self], effects: [fixedEffect({ id: 'desperate-ambush-physical', type: 'Physical Damage', target: '1 Enemy, prioritizing Hunter breed', targetScope: 'any-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([60, 78, 96, 120, 150]), scaling: ['attacker Strength'], conditions: [below50Self], targetPriority: 'prefer-hunter', targetSelection: targetSelection({ preference: 'Hunter breed', fallback: 'another eligible enemy', sharedSelectionGroupId: 'desperate-ambush-target' }) }), fixedEffect({ id: 'desperate-ambush-overwhelm', type: 'Overwhelm', target: 'Same selected target damaged by Desperate Ambush', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 2, rankedValues: rankedPercents([12, 15.6, 19.2, 24, 30]), conditions: [below50Self], activationRoll: roll({ scope: 'effect', chanceByHabitLevel: rankedPercents([12, 15.6, 19.2, 24, 30]), description: 'Overwhelm chance applies to the same target damaged by this activation.' }), targetSelection: targetSelection({ references: [{ id: 'desperate-ambush-damage-target', kind: 'same-target-as-effect', referencedEffectId: 'desperate-ambush-physical', description: 'Overwhelm uses the damage target.' }], sharedSelectionGroupId: 'desperate-ambush-target', distinctness: 'same-target-required' }) })] })], powerByHabitLevel: finalLegendaryPowerEarly, glossaryEntries: [{ term: 'Overwhelm', definition: 'Prevents Active Commands and Habits, but does not prevent Basic Attacks.' }], tags: ['PHYSICAL_DAMAGE', 'OVERWHELM', 'CONTROL'], verification: screenshotVerificationAt('Venator Desperate Ambush screenshot', combat20260625), evidenceIds: ['venator-desperate-ambush-2026-06-25'], unresolvedQuestions: ['Exactly 50% Troop Capacity behavior.'] }),
  ];
  return { ...createDragon('Venator', 'Legendary', 'Warrior'), dataStatus: 'community-verified', lastVerified: combat20260625, command, trait, habits, affinities: { Spearmen: 'positive', Shieldbearers: 'positive', Cavalry: 'unknown', Archers: 'unknown', Siege: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: officialMetadataVerification, rarity: officialMetadataVerification, breed: officialMetadataVerification, command: screenshotVerificationAt('Venator Feral Strike screenshots', combat20260625), trait: screenshotVerificationAt("Venator Warrior's Zeal screenshot", combat20260625), habits: screenshotVerificationAt('Venator Habit screenshots', combat20260625), affinities: partialScreenshotVerification('Venator main screen screenshot') }, unresolvedQuestions: ['Observed values include Troop Capacity and Dragon Power only; combat stats, March Speed, and Stamina remain unknown.'] };
};

const createDaemoros = (): Dragon => {
  const fearEffects = (id: string, preference: TargetPriority) => [
    fixedEffect({ id: `${id}-intelligence`, type: 'Intelligence Down', target: `1 Enemy, prioritizing ${preference === 'prefer-right-flank' ? 'Right Flank' : 'Left Flank'}`, targetScope: 'any-lane', magnitude: 25, unit: 'percent', durationRounds: 2, scaling: ['enhanced by Daemoros Strength'], targetPriority: preference, targetSelection: targetSelection({ preference: preference === 'prefer-right-flank' ? 'Right Flank' : 'Left Flank', fallback: 'another eligible enemy', sharedSelectionGroupId: `${id}-target`, distinctness: 'same-target-required' }) }),
    fixedEffect({ id: `${id}-instinct`, type: 'Instinct Down', target: `Same selected enemy`, targetScope: 'any-lane', magnitude: 25, unit: 'percent', durationRounds: 2, scaling: ['enhanced by Daemoros Strength'], targetSelection: targetSelection({ references: [{ id: `${id}-same-target`, kind: 'same-target-as-effect', referencedEffectId: `${id}-intelligence`, description: 'Uses the enemy selected for the Intelligence reduction.' }], sharedSelectionGroupId: `${id}-target`, distinctness: 'same-target-required' }) }),
    fixedEffect({ id: `${id}-panic`, type: 'Panic', target: 'Same selected enemy', targetScope: 'any-lane', magnitude: 20, unit: 'rate', durationRounds: 2, targetSelection: targetSelection({ references: [{ id: `${id}-same-target`, kind: 'same-target-as-effect', referencedEffectId: `${id}-intelligence`, description: 'Uses the enemy selected for the stat reductions.' }], sharedSelectionGroupId: `${id}-target`, distinctness: 'same-target-required' }), notes: ['Panic is periodic Tactical Damage each round.'] }),
  ];
  const command = ability({ dragonId: 'daemoros', id: 'daemoros-shadowflame', kind: 'command', name: 'Shadowflame', abilityClass: 'active', unlockStarRank: null, rawDescription: 'Odd-numbered rounds: deal Physical Damage to one adjacent enemy, Damage Rate +125%; 20% chance to afflict the same target with Burn for two rounds.', schedules: [schedule({ id: 'shadowflame-odd-rounds', timing: 'specific-rounds', roundSelector: { kind: 'odd' }, effects: [
    fixedEffect({ id: 'shadowflame-physical', type: 'Physical Damage', target: '1 Enemy within adjacency', targetScope: 'within-adjacency', magnitude: 125, unit: 'rate', scaling: ['attacker Strength'], notes: ['Mitigated by target Instinct.'] }),
    fixedEffect({ id: 'shadowflame-burn', type: 'Burn', target: 'Same Physical Damage target', targetScope: 'within-adjacency', magnitude: 20, unit: 'rate', durationRounds: 2, activationRoll: roll({ scope: 'effect', chanceFixed: 20, description: 'Burn application chance after Shadowflame selects its Physical Damage target.' }), targetSelection: targetSelection({ references: [{ id: 'shadowflame-damage-target', kind: 'same-target-as-effect', referencedEffectId: 'shadowflame-physical', description: 'Burn uses the Physical Damage target.' }], distinctness: 'same-target-required' }), notes: ['Burn is periodic Fire Damage each round.'] }),
  ] })], glossaryEntries: [{ term: 'Burn', definition: 'Deals periodic Fire Damage each round.' }], tags: ['PHYSICAL_DAMAGE', 'BURN', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Daemoros Shadowflame screenshots', combat20260625), evidenceIds: ['daemoros-shadowflame-2026-06-26'], unresolvedQuestions: ['Enemy adjacency.', 'Burn first-tick and refresh behavior.', 'Exact final damage formula.'] });
  const trait = ability({ dragonId: 'daemoros', id: 'daemoros-warriors-zeal', kind: 'trait', name: "Warrior's Zeal", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Daemoros Physical Damage Dealt +16%; Left Flank ally Instinct and Initiative +20.', schedules: [schedule({ id: 'warriors-zeal-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [
    fixedEffect({ id: 'warriors-zeal-physical', type: 'Physical Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: 16, unit: 'percent', sourceScope: 'all-sources', notes: ["Uses the established Warrior's Zeal all-qualifying Physical source semantic inherited from Vermax."] }),
    fixedEffect({ id: 'warriors-zeal-left-instinct', type: 'Instinct Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }),
    fixedEffect({ id: 'warriors-zeal-left-initiative', type: 'Initiative Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 20, unit: 'flat' }),
  ] })], tags: ['PHYSICAL_DAMAGE_UP', 'INSTINCT_UP', 'BUFF_INITIATIVE', 'LEFT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Daemoros Warrior's Zeal screenshot", combat20260625), evidenceIds: ['daemoros-warriors-zeal-2026-06-26'] });
  const habits = [
    ability({ dragonId: 'daemoros', id: 'daemoros-instill-fear', kind: 'habit', name: 'Instill Fear', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Each round: one 25%-50% activation roll targets one enemy in any lane, preferring Right Flank; reduce Intelligence and Instinct by 25% enhanced by Strength and apply Panic for two rounds.', schedules: [schedule({ id: 'instill-fear-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceByHabitLevel: rankedPercents([25, 30, 35, 42.5, 50]), activationRoll: roll({ scope: 'schedule-shared', chanceByHabitLevel: rankedPercents([25, 30, 35, 42.5, 50]), description: 'One successful activation applies all Instill Fear effects to one selected enemy.' }), effects: fearEffects('instill-fear', 'prefer-right-flank') })], powerByHabitLevel: standardEpicPower, glossaryEntries: [{ term: 'Panic', definition: 'Deals periodic Tactical Damage to the target each round.' }], tags: ['DEBUFF_INTELLIGENCE', 'DEBUFF_INSTINCTS', 'PANIC'], verification: screenshotVerificationAt('Daemoros Instill Fear screenshot', combat20260625), evidenceIds: ['daemoros-instill-fear-2026-06-26'], unresolvedQuestions: ['Exact Strength enhancement formula.', 'Panic first-tick and refresh behavior.', 'Preferred-flank fallback and tie details.'] }),
    ability({ dragonId: 'daemoros', id: 'daemoros-powerful-reflexes', kind: 'habit', name: 'Powerful Reflexes', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Combat until end of combat: increase Daemoros Strength and Initiative.', schedules: [schedule({ id: 'powerful-reflexes-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'powerful-reflexes-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' }), fixedEffect({ id: 'powerful-reflexes-initiative', type: 'Initiative Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardEpicPower, tags: ['STRENGTH_UP', 'BUFF_INITIATIVE'], verification: screenshotVerificationAt('Daemoros Powerful Reflexes screenshot', combat20260625), evidenceIds: ['daemoros-powerful-reflexes-2026-06-26'] }),
    ability({ dragonId: 'daemoros', id: 'daemoros-shroud-of-shadows', kind: 'habit', name: 'Shroud of Shadows', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Odd-numbered rounds: 15%-30% chance to afflict one adjacent enemy with Confusion for two rounds.', schedules: [schedule({ id: 'shroud-of-shadows-odd-rounds', timing: 'specific-rounds', roundSelector: { kind: 'odd' }, triggerChanceByHabitLevel: rankedPercents([15, 18, 21, 25.5, 30]), activationRoll: roll({ scope: 'effect', chanceByHabitLevel: rankedPercents([15, 18, 21, 25.5, 30]), description: 'Confusion application chance.' }), effects: [fixedEffect({ id: 'shroud-of-shadows-confusion', type: 'Confusion', target: '1 Enemy within adjacency', targetScope: 'within-adjacency', magnitude: null, unit: 'unknown', durationRounds: 2, notes: ['On each affected Command, Habit, or Basic Attack action, Confusion has a separate 50% mistaken-side check; redirected target resolution is not simulated.'] })] })], powerByHabitLevel: standardEpicPower, glossaryEntries: [{ term: 'Confusion', definition: 'Control status: affected Command, Habit, and Basic Attack actions have a 50% chance to mistake allies and enemies.' }], tags: ['CONFUSION', 'CONTROL', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Daemoros Shroud of Shadows screenshot', combat20260625), evidenceIds: ['daemoros-shroud-of-shadows-2026-06-26'], unresolvedQuestions: ['Enemy adjacency.', 'Confusion redirected-action resolution.', 'Confusion refresh behavior.'] }),
    ability({ dragonId: 'daemoros', id: 'daemoros-darkening-fear', kind: 'habit', name: 'Darkening Fear', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Each round: independently roll Instill Fear-like effects on one enemy in any lane, preferring Left Flank.', schedules: [schedule({ id: 'darkening-fear-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceByHabitLevel: rankedPercents([25, 30, 35, 42.5, 50]), activationRoll: roll({ scope: 'schedule-shared', chanceByHabitLevel: rankedPercents([25, 30, 35, 42.5, 50]), description: 'Darkening Fear has its own activation roll and target selection.' }), effects: fearEffects('darkening-fear', 'prefer-left-flank') })], powerByHabitLevel: standardEpicPower, tags: ['DEBUFF_INTELLIGENCE', 'DEBUFF_INSTINCTS', 'PANIC'], verification: screenshotVerificationAt('Daemoros Darkening Fear screenshot', combat20260625), evidenceIds: ['daemoros-darkening-fear-2026-06-26'], unresolvedQuestions: ['Exact Strength enhancement formula.', 'Mutual stacking and refresh behavior with Instill Fear.', 'Preferred-flank fallback and tie details.'] }),
    ability({ dragonId: 'daemoros', id: 'daemoros-phantoms-veil', kind: 'habit', name: "Phantom's Veil", abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Start of each round until end of that round: reduce exactly one of Physical, Tactical, or Fire Damage Received. Selection method is not stated.', schedules: [schedule({ id: 'phantoms-veil-start-round', timing: 'start-of-each-round', roundSelector: { kind: 'each-round' }, effects: [fixedEffect({ id: 'phantoms-veil-exclusive-defense', type: 'Exclusive Damage Received Reduction', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', duration: 'Until end of current round', effectOptions: { mode: 'one-of', selectionTiming: 'start of each round', selectorMethod: 'unknown', description: 'Exactly one defensive scope is selected; the selection method is unknown.', options: [
      { id: 'physical', label: 'Physical Damage Received', condition: null, effect: fixedEffect({ id: 'phantoms-veil-physical', type: 'Physical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 19.5, 24, 30, 37.5]), duration: 'Until end of current round' }) },
      { id: 'tactical', label: 'Tactical Damage Received', condition: null, effect: fixedEffect({ id: 'phantoms-veil-tactical', type: 'Tactical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 19.5, 24, 30, 37.5]), duration: 'Until end of current round' }) },
      { id: 'fire', label: 'Fire Damage Received', condition: null, effect: fixedEffect({ id: 'phantoms-veil-fire', type: 'Fire Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 19.5, 24, 30, 37.5]), duration: 'Until end of current round' }) },
    ] } })] })], powerByHabitLevel: rankedPowers([340, 790, 1400, 2100, 3100]), tags: ['DAMAGE_RECEIVED_DOWN'], verification: screenshotVerificationAt("Daemoros Phantom's Veil screenshot", combat20260625), evidenceIds: ['daemoros-phantoms-veil-2026-06-26'], unresolvedQuestions: ["Phantom's Veil selection method.", 'Exclusive damage-scope choice.'] }),
  ];
  return { ...createPendingDragon('Daemoros', 'Epic', 'Warrior'), dataStatus: 'community-verified', lastVerified: combat20260625, command, trait, habits, affinities: { Archers: 'positive', Cavalry: 'unknown', Shieldbearers: 'unknown', Spearmen: 'unknown', Siege: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: screenshotVerificationAt('Daemoros main screen screenshot', combat20260625), command: screenshotVerificationAt('Daemoros Shadowflame screenshots', combat20260625), trait: screenshotVerificationAt("Daemoros Warrior's Zeal screenshot", combat20260625), habits: screenshotVerificationAt('Daemoros Habit screenshots', combat20260625), affinities: partialScreenshotVerification('Daemoros main screen screenshot') }, unresolvedQuestions: ['Observed account values are not canonical base stats.', 'Enemy adjacency.'] };
};

const createVaeldra = (): Dragon => {
  const successfulTaunt = condition('successful-taunt-application', 'successful-status-application', 'A Taunt was successfully applied to this target.', { subject: 'target', statusId: 'taunt' });
  const command = ability({ dragonId: 'vaeldra', id: 'vaeldra-lure', kind: 'command', name: 'Lure', abilityClass: 'active', unlockStarRank: null, rawDescription: 'Each round: 25% chance to afflict Taunt on three enemies for two rounds; odd-numbered rounds: deal Physical Damage to two adjacent enemies, Damage Rate +45%. Taunt roll scope is not stated.', schedules: [
    schedule({ id: 'lure-taunt-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceFixed: 25, activationRoll: roll({ scope: 'unknown', chanceFixed: 25, description: 'Taunt chance applies to three targets, but shared versus per-target roll scope is not stated.', unresolved: true }), effects: [fixedEffect({ id: 'lure-taunt', type: 'Taunt', target: '3 Enemies', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 2, targetCount: 3, activationRoll: roll({ scope: 'unknown', chanceFixed: 25, description: 'Shared versus per-target Taunt roll is unresolved.', unresolved: true }) })] }),
    schedule({ id: 'lure-physical-odd-rounds', timing: 'specific-rounds', roundSelector: { kind: 'odd' }, effects: [fixedEffect({ id: 'lure-physical', type: 'Physical Damage', target: '2 Enemies within adjacency', targetScope: 'within-adjacency', magnitude: 45, unit: 'rate', targetCount: 2, scaling: ['attacker Strength'], notes: ['Mitigated by each target Instinct.', 'Two distinct eligible targets; repeated same-target selection is not modeled.'] })] }),
  ], glossaryEntries: [{ term: 'Taunt', definition: 'Forces the target to launch its Basic Attack against the dragon that applied Taunt.' }], tags: ['TAUNT', 'PHYSICAL_DAMAGE', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Vaeldra Lure screenshots', combat20260625), evidenceIds: ['vaeldra-lure-2026-06-26'], unresolvedQuestions: ['Lure multi-target Taunt roll scope.', 'Enemy adjacency.'] });
  const trait = ability({ dragonId: 'vaeldra', id: 'vaeldra-warriors-resilience', kind: 'trait', name: "Warrior's Resilience", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Vaeldra Damage Received -8%; Left Flank ally Tactical Damage Dealt +16%.', schedules: [schedule({ id: 'warriors-resilience-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [fixedEffect({ id: 'warriors-resilience-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: 8, unit: 'percent', sourceScope: 'all-sources' }), fixedEffect({ id: 'warriors-resilience-left-tactical', type: 'Tactical Damage Dealt Up', target: 'Left Flank ally', targetScope: 'left-flank', magnitude: 16, unit: 'percent' })] })], tags: ['DAMAGE_RECEIVED_DOWN', 'TACTICAL_DAMAGE', 'LEFT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Vaeldra Warrior's Resilience screenshot", combat20260625), evidenceIds: ['vaeldra-warriors-resilience-2026-06-26'] });
  const habits = [
    ability({ dragonId: 'vaeldra', id: 'vaeldra-dragons-valor', kind: 'habit', name: "Dragon's Valor", abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Start of Combat until end of combat: reduce Vaeldra Damage Received and increase Strength.', schedules: [schedule({ id: 'dragons-valor-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'dragons-valor-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5, 6, 7, 8.5, 10]), duration: 'Until end of combat', sourceScope: 'all-sources' }), fixedEffect({ id: 'dragons-valor-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([8.5, 10.2, 11.9, 14.45, 17]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardEpicPower, tags: ['DAMAGE_RECEIVED_DOWN', 'STRENGTH_UP'], verification: screenshotVerificationAt("Vaeldra Dragon's Valor screenshot", combat20260625), evidenceIds: ['vaeldra-dragons-valor-2026-06-26'] }),
    ability({ dragonId: 'vaeldra', id: 'vaeldra-ensnare', kind: 'habit', name: 'Ensnare', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Round 1 for three rounds: reduce Instinct and Initiative of two adjacent enemies, enhanced by Vaeldra Intelligence.', schedules: [schedule({ id: 'ensnare-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'ensnare-instinct', type: 'Instinct Down', target: '2 Enemies within adjacency', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), durationRounds: 3, scaling: ['enhanced by Vaeldra Intelligence'], targetCount: 2, targetSelection: targetSelection({ sharedSelectionGroupId: 'ensnare-targets', distinctness: 'same-target-required' }) }), fixedEffect({ id: 'ensnare-initiative', type: 'Initiative Down', target: 'Same two selected enemies', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([18, 21.6, 25.2, 30.6, 36]), durationRounds: 3, scaling: ['enhanced by Vaeldra Intelligence'], targetCount: 2, targetSelection: targetSelection({ references: [{ id: 'ensnare-same-targets', kind: 'same-target-as-effect', referencedEffectId: 'ensnare-instinct', description: 'Initiative reduction uses the enemies selected for Instinct reduction.' }], sharedSelectionGroupId: 'ensnare-targets', distinctness: 'same-target-required' }) })] })], powerByHabitLevel: standardEpicPower, tags: ['DEBUFF_INSTINCTS', 'DEBUFF_INITIATIVE', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Vaeldra Ensnare screenshot', combat20260625), evidenceIds: ['vaeldra-ensnare-2026-06-26'], unresolvedQuestions: ['Exact Intelligence enhancement formula.', 'Enemy adjacency.', 'Stacking and refresh behavior.'] }),
    ability({ dragonId: 'vaeldra', id: 'vaeldra-tempting-distraction', kind: 'habit', name: 'Tempting Distraction', abilityClass: 'passive', unlockStarRank: 6, rawDescription: "When Vaeldra successfully afflicts an enemy with Taunt: increase that same target's non-Basic Physical Damage Received and Fire Damage Received for two rounds.", schedules: [schedule({ id: 'tempting-distraction-taunt-trigger', timing: 'when-successful-status-application', conditions: [successfulTaunt], effects: [fixedEffect({ id: 'tempting-distraction-physical', type: 'Physical Damage Received Up', target: 'Same enemy successfully Taunted by Vaeldra', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6, 7.2, 8.4, 10.2, 12]), durationRounds: 2, sourceScope: 'non-basic-attacks', conditions: [successfulTaunt], targetSelection: targetSelection({ references: [{ id: 'tempting-distraction-taunt-target', kind: 'same-target-as-effect', referencedEffectId: 'taunt-status-application', description: 'Uses the target of the successful Taunt application.' }], distinctness: 'same-target-required' }) }), fixedEffect({ id: 'tempting-distraction-fire', type: 'Fire Damage Received Up', target: 'Same enemy successfully Taunted by Vaeldra', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([6, 7.2, 8.4, 10.2, 12]), durationRounds: 2, sourceScope: 'all-sources', conditions: [successfulTaunt], targetSelection: targetSelection({ references: [{ id: 'tempting-distraction-taunt-target', kind: 'same-target-as-effect', referencedEffectId: 'taunt-status-application', description: 'Uses the target of the successful Taunt application.' }], distinctness: 'same-target-required' }) })] })], powerByHabitLevel: standardEpicPower, tags: ['PHYSICAL_DAMAGE_UP', 'FIRE_DAMAGE'], verification: screenshotVerificationAt('Vaeldra Tempting Distraction screenshot', combat20260625), evidenceIds: ['vaeldra-tempting-distraction-2026-06-26'], unresolvedQuestions: ['Whether Taunt refresh counts as a new affliction.', 'Vulnerability stacking and refresh behavior.', 'Start-of-round ordering.'] }),
    ability({ dragonId: 'vaeldra', id: 'vaeldra-infernal-force', kind: 'habit', name: 'Infernal Force', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of Round 1 for three rounds: increase Fire Damage Dealt of one ally preferring Left Flank and non-Basic Physical Damage Dealt of one ally preferring Right Flank. Groups select independently.', schedules: [schedule({ id: 'infernal-force-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'infernal-force-fire', type: 'Fire Damage Dealt Up', target: '1 Ally, prioritizing Left Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), durationRounds: 3, targetPriority: 'prefer-left-flank', casterEligibility: 'eligible-if-targeting-allows', targetSelection: targetSelection({ preference: 'Left Flank', fallback: 'another eligible ally', sharedSelectionGroupId: 'infernal-force-fire', distinctness: 'no-distinctness-requirement' }) }), fixedEffect({ id: 'infernal-force-physical', type: 'Physical Damage Dealt Up', target: '1 Ally, prioritizing Right Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([12, 14.4, 16.8, 20.4, 24]), durationRounds: 3, sourceScope: 'non-basic-attacks', excludes: ['Basic Attacks'], targetPriority: 'prefer-right-flank', casterEligibility: 'eligible-if-targeting-allows', targetSelection: targetSelection({ preference: 'Right Flank', fallback: 'another eligible ally', sharedSelectionGroupId: 'infernal-force-physical', distinctness: 'no-distinctness-requirement' }) })] })], powerByHabitLevel: standardEpicPower, tags: ['FIRE_DAMAGE_UP', 'PHYSICAL_DAMAGE_UP'], verification: screenshotVerificationAt('Vaeldra Infernal Force screenshot', combat20260625), evidenceIds: ['vaeldra-infernal-force-2026-06-26'], unresolvedQuestions: ['Fallback behavior and possible recipient convergence.'] }),
    ability({ dragonId: 'vaeldra', id: 'vaeldra-sirens-call', kind: 'habit', name: "Siren's Call", abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Start of Round 1: reduce self Physical Damage Received for three rounds. Start of Rounds 1-3: 40%-100% chance to apply Taunt to each non-Taunted enemy or Stagger to each already Taunted enemy until end of round; roll scope is not stated.', schedules: [
      schedule({ id: 'sirens-call-self-defense', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'sirens-call-physical-defense', type: 'Physical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 13, 16, 20, 25]), durationRounds: 3 })] }),
      schedule({ id: 'sirens-call-status-branch', timing: 'specific-rounds', rounds: [1, 2, 3], roundSelector: { kind: 'explicit', rounds: [1, 2, 3] }, triggerChanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]), activationRoll: roll({ scope: 'unknown', chanceByHabitLevel: rankedPercents([40, 52, 64, 80, 100]), description: 'Shared schedule versus independent per-target activation roll is not stated.', unresolved: true }), effects: [fixedEffect({ id: 'sirens-call-taunt-or-stagger', type: 'Conditional Control Status', target: 'All Enemies', targetScope: 'any-lane', magnitude: null, unit: 'unknown', duration: 'Until end of current round', targetCount: 3, effectOptions: { mode: 'conditional-branch', selectionTiming: 'start of Rounds 1, 2, and 3', selectorMethod: 'condition-per-target', description: 'For each affected target, apply exactly one branch based on whether Taunt is already present.', options: [
        { id: 'stagger-existing-taunt', label: 'Stagger if already Taunted', condition: condition('sirens-call-target-has-taunt', 'target-has-status', 'Target is already Taunted.', { statusId: 'taunt' }), effect: fixedEffect({ id: 'sirens-call-stagger', type: 'Stagger', target: 'Enemy already Taunted', targetScope: 'any-lane', magnitude: null, unit: 'unknown', duration: 'Until end of current round', conditions: [condition('sirens-call-target-has-taunt', 'target-has-status', 'Target is already Taunted.', { statusId: 'taunt' })], targetCount: 3 }) },
        { id: 'taunt-default', label: 'Taunt if not already Taunted', condition: condition('sirens-call-target-lacks-taunt', 'target-lacks-status', 'Target is not already Taunted.', { statusId: 'taunt' }), effect: fixedEffect({ id: 'sirens-call-taunt', type: 'Taunt', target: 'Enemy not already Taunted', targetScope: 'any-lane', magnitude: null, unit: 'unknown', duration: 'Until end of current round', conditions: [condition('sirens-call-target-lacks-taunt', 'target-lacks-status', 'Target is not already Taunted.', { statusId: 'taunt' })], targetCount: 3 }) },
      ] } })] }),
    ], powerByHabitLevel: rankedPowers([340, 790, 1400, 2100, 3100]), glossaryEntries: [{ term: 'Stagger', definition: "Control status that prevents Attack Modifier Commands and Basic Attacks on the target's turn." }], tags: ['TAUNT', 'STAGGER', 'CONTROL', 'DAMAGE_RECEIVED_DOWN'], verification: screenshotVerificationAt("Vaeldra Siren's Call screenshot", combat20260625), evidenceIds: ['vaeldra-sirens-call-2026-06-26'], unresolvedQuestions: ["Siren's Call all-enemy activation-roll scope.", 'Start-of-round ordering.', 'Stagger action-denial ordering.'] }),
  ];
  return { ...createPendingDragon('Vaeldra', 'Epic', 'Warrior'), dataStatus: 'community-verified', lastVerified: combat20260625, command, trait, habits, affinities: { Spearmen: 'positive', Cavalry: 'unknown', Shieldbearers: 'unknown', Archers: 'unknown', Siege: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: screenshotVerificationAt('Vaeldra main screen screenshot', combat20260625), command: screenshotVerificationAt('Vaeldra Lure screenshots', combat20260625), trait: screenshotVerificationAt("Vaeldra Warrior's Resilience screenshot", combat20260625), habits: screenshotVerificationAt('Vaeldra Habit screenshots', combat20260625), affinities: partialScreenshotVerification('Vaeldra main screen screenshot') }, unresolvedQuestions: ['Observed account values are not canonical base stats.', 'Enemy adjacency.'] };
};

const epicBatch20260626 = '2026-06-26';

const createFeskar = (): Dragon => {
  const burnCondition = condition('target-has-burn', 'target-has-status', 'Per target, the target is afflicted with Burn.', { statusId: 'burn' });
  const enemyHasNonBasicPhysical = condition('enemy-has-non-basic-physical-output', 'target-has-output-capability', 'Target eligibility requires the enemy to possess a non-Basic Physical Damage output capability.', {
    subject: 'enemy',
    qualifyingOutput: { channel: 'physical-damage', sourceScope: 'non-basic-attacks', description: 'Enemy deals Physical Damage excluding Basic Attacks.' },
    unresolved: true,
  });
  const trackedAllyRetreated = condition('tracked-adjacent-ally-retreated-previous-round', 'previous-round-event', 'The same adjacent ally selected at start of combat retreated in the previous round.', {
    subject: 'ally',
    sourceEffectId: 'resilient-bond-adjacent-stack',
    unresolved: true,
  });
  const emeraldFire = fixedEffect({
    id: 'emerald-inferno-fire',
    type: 'Fire Damage',
    target: 'All enemies that deal Physical Damage excluding Basic Attacks',
    targetScope: 'any-lane',
    magnitude: null,
    unit: 'rate',
    rankedValues: rankedPercents([40, 48, 56, 68, 80]),
    scaling: ['attacker Intelligence'],
    targetCount: 3,
    conditions: [enemyHasNonBasicPhysical],
    conditionalMultipliers: [multiplier('burned-target-1-5x', 1.5, burnCondition, 'Per target, Burn increases Emerald Inferno damage by 1.5x.', rankedPercents([60, 72, 84, 102, 120]))],
    targetSelection: targetSelection({ preference: 'Enemies with non-Basic Physical Damage output capability', fallback: null, distinctness: 'no-distinctness-requirement' }),
    notes: ['Mitigated by target Initiative.', 'Enemy formation membership and qualifying output overlap are not invented.'],
  });
  const command = ability({
    dragonId: 'feskar',
    id: 'feskar-calculated-assault',
    kind: 'command',
    name: 'Calculated Assault',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription: `Each Round: 20% chance to reduce Physical Damage Dealt, excluding Basic Attacks, by 12% for the enemy with the highest Strength for 2 rounds.

Rounds 2, 4, 7, and 9: Deal Tactical Damage to the enemy with the least troops at a 100% Damage Rate.

At 6+ Stars:

Rounds 3, 5, 8, and 10: Deal Fire Damage to all enemies that deal Physical Damage, excluding Basic Attacks, at a 40% Damage Rate. This damage is increased by 1.5x against targets afflicted with Burn, increasing the Damage Rate to 60%.`,
    schedules: [
      schedule({ id: 'calculated-assault-physical-reduction', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceFixed: 20, activationRoll: roll({ scope: 'effect', chanceFixed: 20, description: 'One chance each round to reduce the highest-Strength enemy non-Basic Physical Damage Dealt.' }), effects: [fixedEffect({ id: 'calculated-assault-physical-dealt-down', type: 'Physical Damage Dealt Down', target: '1 enemy in any lane with the highest Strength', targetScope: 'any-lane', magnitude: 12, unit: 'percent', durationRounds: 2, sourceScope: 'non-basic-attacks', excludes: ['Physical Basic Attacks'], targetPriority: 'highest-stat-enemy', targetSelection: targetSelection({ comparisonStat: 'strength', comparisonDirection: 'highest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group' }) })] }),
      schedule({ id: 'calculated-assault-tactical-rounds', timing: 'specific-rounds', rounds: [2, 4, 7, 9], roundSelector: { kind: 'explicit', rounds: [2, 4, 7, 9] }, effects: [fixedEffect({ id: 'calculated-assault-tactical', type: 'Tactical Damage', target: 'Enemy with least troops', targetScope: 'any-lane', magnitude: 100, unit: 'rate', scaling: ['attacker Instinct'], targetPriority: 'least-current-troops-enemy', targetSelection: targetSelection({ comparisonStat: 'current-troops', comparisonDirection: 'lowest', comparisonPool: 'enemy-side', tieBehavior: 'candidate-group' }), notes: ['Mitigated by target Intelligence.', 'Exact resource-state timing is unresolved.'] })] }),
    ],
    augmentations: [{ id: 'feskar-emerald-inferno-augmentation', sourceAbilityId: 'feskar-emerald-inferno', modifiesAbilityId: 'feskar-calculated-assault', minimumDragonStarRank: 6, schedulesAdded: [schedule({ id: 'emerald-inferno-rounds', timing: 'specific-rounds', rounds: [3, 5, 8, 10], roundSelector: { kind: 'explicit', rounds: [3, 5, 8, 10] }, effects: [emeraldFire] })], effectsAdded: [], scheduleOverrides: [], rawDescription: 'Emerald Inferno adds Fire Damage on Rounds 3, 5, 8, and 10.', evidenceIds: ['feskar-emerald-inferno-2026-06-26'] }],
    tags: ['PHYSICAL_DAMAGE', 'TACTICAL_DAMAGE', 'FIRE_DAMAGE', 'EXCLUDES_BASIC_ATTACKS', 'MULTI_SCHEDULE_COMMAND'],
    verification: screenshotVerificationAt('Feskar Calculated Assault screenshots', epicBatch20260626),
    evidenceIds: ['feskar-calculated-assault-2026-06-26'],
    unresolvedQuestions: ['Highest-Strength ties.', 'Least-troops ties and resource-state timing.', 'Enemy output-capability qualification against unknown enemy formation members.'],
  });
  const trait = ability({ dragonId: 'feskar', id: 'feskar-champions-brilliance', kind: 'trait', name: "Champion's Brilliance", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Strength, Intelligence, and Instinct +15 for Feskar; Right Flank ally Damage Received -8%.', schedules: [schedule({ id: 'champions-brilliance-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [fixedEffect({ id: 'champions-brilliance-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }), fixedEffect({ id: 'champions-brilliance-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }), fixedEffect({ id: 'champions-brilliance-instinct', type: 'Instinct Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'flat' }), fixedEffect({ id: 'champions-brilliance-right-damage-received', type: 'Damage Received Down', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 8, unit: 'percent', sourceScope: 'all-sources' })] })], tags: ['STRENGTH_UP', 'BUFF_INTELLIGENCE', 'INSTINCT_UP', 'DAMAGE_RECEIVED_DOWN', 'RIGHT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Feskar Champion's Brilliance screenshot", epicBatch20260626), evidenceIds: ['feskar-champions-brilliance-2026-06-26'] });
  const resilientValues = rankedPercents([6.5, 7.8, 9.1, 11.05, 13]);
  const habits = [
    ability({ dragonId: 'feskar', id: 'feskar-resilient-bond', kind: 'habit', name: 'Resilient Bond', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Start of combat: grant Feskar and one other adjacent ally one Resilient Bond stack. Later rounds: if that tracked ally retreated in the previous round, grant Feskar one additional stack. Each stack reduces Physical Damage Received from non-Basic Attacks until end of combat.', schedules: [
      schedule({ id: 'resilient-bond-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'resilient-bond-self-stack', type: 'Physical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: resilientValues, sourceScope: 'non-basic-attacks', duration: 'Until end of combat', stack: stack({ statusId: 'resilient-bond', untilEndOfCombat: true, valuePerStackByHabitLevel: resilientValues }) }), fixedEffect({ id: 'resilient-bond-adjacent-stack', type: 'Physical Damage Received Down', target: '1 other adjacent ally', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: resilientValues, sourceScope: 'non-basic-attacks', duration: 'Until end of combat', casterEligibility: 'excluded', targetPriority: 'within-adjacency', targetSelection: targetSelection({ preference: 'Other adjacent ally', distinctness: 'explicitly-another-target', sharedSelectionGroupId: 'resilient-bond-tracked-ally', references: [{ id: 'resilient-bond-persistent-ally', kind: 'persistent-selected-target', referencedEffectId: null, description: 'The adjacent ally selected at start of combat is referenced by later-round retreat checks.' }] }), stack: stack({ statusId: 'resilient-bond', untilEndOfCombat: true, valuePerStackByHabitLevel: resilientValues }) })] }),
      schedule({ id: 'resilient-bond-retreat-trigger', timing: 'start-of-each-round', roundSelector: { kind: 'each-round' }, conditions: [trackedAllyRetreated], effects: [fixedEffect({ id: 'resilient-bond-self-retreat-stack', type: 'Physical Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: resilientValues, sourceScope: 'non-basic-attacks', duration: 'Until end of combat', conditions: [trackedAllyRetreated], targetSelection: targetSelection({ references: [{ id: 'resilient-bond-retreat-reference', kind: 'persistent-selected-target', referencedEffectId: 'resilient-bond-adjacent-stack', description: 'Checks whether the originally selected adjacent ally retreated in the previous round.' }] }), stack: stack({ statusId: 'resilient-bond', untilEndOfCombat: true, valuePerStackByHabitLevel: resilientValues }) })] }),
    ], powerByHabitLevel: standardEpicPower, tags: ['DAMAGE_RECEIVED_DOWN', 'EXCLUDES_BASIC_ATTACKS'], verification: screenshotVerificationAt('Feskar Resilient Bond screenshot', epicBatch20260626), evidenceIds: ['feskar-resilient-bond-2026-06-26'], unresolvedQuestions: ['Progression prose says 6% at Level 1 while table says 6.5%; table value is stored.', 'Maximum stack count is not verified.', 'Retreat occurrence, stack uptime, and final mitigation are not simulated.'] }),
    ability({ dragonId: 'feskar', id: 'feskar-insightful-allies', kind: 'habit', name: 'Insightful Allies', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of combat: increase Instinct of 3 Allies in any lane until end of combat, enhanced by Feskar Instinct. Plain Allies includes Feskar.', schedules: [schedule({ id: 'insightful-allies-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'insightful-allies-instinct', type: 'Instinct Up', target: '3 Allies in any lane', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([10, 12, 14, 17, 20]), duration: 'Until end of combat', scaling: ['enhanced by Feskar Instinct'], targetCount: 3, casterEligibility: 'included', includesCaster: true })] })], powerByHabitLevel: standardEpicPower, tags: ['INSTINCT_UP', 'BUFF_ALLIES'], verification: screenshotVerificationAt('Feskar Insightful Allies screenshot', epicBatch20260626), evidenceIds: ['feskar-insightful-allies-2026-06-26'], unresolvedQuestions: ['Exact Instinct enhancement formula.'] }),
    ability({ dragonId: 'feskar', id: 'feskar-emerald-inferno', kind: 'habit', name: 'Emerald Inferno', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Command augmentation for Calculated Assault: Rounds 3, 5, 8, and 10 deal Fire Damage to all enemies that deal Physical Damage excluding Basic Attacks; Burn increases damage by 1.5x per target.', schedules: [schedule({ id: 'emerald-inferno-rounds', timing: 'specific-rounds', rounds: [3, 5, 8, 10], roundSelector: { kind: 'explicit', rounds: [3, 5, 8, 10] }, effects: [emeraldFire] })], powerByHabitLevel: standardEpicPower, tags: ['COMMAND_AUGMENTATION', 'FIRE_DAMAGE'], verification: screenshotVerificationAt('Feskar Emerald Inferno screenshot', epicBatch20260626), evidenceIds: ['feskar-emerald-inferno-2026-06-26'], unresolvedQuestions: ['Enemy output-capability qualification and Burn overlap are conditional.', 'Burn-conditioned values are derived from the selected ranked value times 1.5.'] }),
    ability({ dragonId: 'feskar', id: 'feskar-quick-witted', kind: 'habit', name: 'Quick-Witted', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of combat until end of combat: increase Feskar Intelligence and Initiative.', schedules: [schedule({ id: 'quick-witted-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'quick-witted-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' }), fixedEffect({ id: 'quick-witted-initiative', type: 'Initiative Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardEpicPower, tags: ['BUFF_INTELLIGENCE', 'BUFF_INITIATIVE'], verification: screenshotVerificationAt('Feskar Quick-Witted screenshot', epicBatch20260626), evidenceIds: ['feskar-quick-witted-2026-06-26'] }),
    ability({ dragonId: 'feskar', id: 'feskar-unyielding-grasp', kind: 'habit', name: 'Unyielding Grasp', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Each round: one activation chance to Stagger 1 enemy in any lane, prioritizing Warrior role, for 3 rounds.', schedules: [schedule({ id: 'unyielding-grasp-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceByHabitLevel: rankedPercents([10, 13, 16, 20, 25]), activationRoll: roll({ scope: 'effect', chanceByHabitLevel: rankedPercents([10, 13, 16, 20, 25]), description: 'One chance each round to Stagger one selected enemy.' }), effects: [fixedEffect({ id: 'unyielding-grasp-stagger', type: 'Stagger', target: '1 enemy in any lane, prioritizing Warrior role', targetScope: 'any-lane', magnitude: null, unit: 'unknown', durationRounds: 3, targetPriority: 'prefer-warrior', targetSelection: targetSelection({ preference: 'Warrior role', fallback: 'another eligible enemy', tieBehavior: 'unknown' }) })] })], powerByHabitLevel: rankedPowers([340, 790, 1400, 2100, 3100]), glossaryEntries: [{ term: 'Stagger', definition: "Control status that prevents Attack Modifier Commands and Basic Attacks on the target's turn; it does not imply every Command or Habit is blocked." }], tags: ['STAGGER', 'CONTROL'], verification: screenshotVerificationAt('Feskar Unyielding Grasp screenshot', epicBatch20260626), evidenceIds: ['feskar-unyielding-grasp-2026-06-26'], unresolvedQuestions: ['Role-priority fallback, ties, activation timing, and target ordering.'] }),
  ];
  return { ...createPendingDragon('Feskar', 'Epic', 'Champion'), dataStatus: 'community-verified', lastVerified: epicBatch20260626, command, trait, habits, affinities: { Cavalry: 'positive', Siege: 'negative', Shieldbearers: 'unknown', Archers: 'unknown', Spearmen: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: screenshotVerificationAt('Feskar main screen screenshot', epicBatch20260626), command: screenshotVerificationAt('Feskar Calculated Assault screenshots', epicBatch20260626), trait: screenshotVerificationAt("Feskar Champion's Brilliance screenshot", epicBatch20260626), habits: screenshotVerificationAt('Feskar Habit screenshots', epicBatch20260626), affinities: partialScreenshotVerification('Feskar main screen screenshot') }, unresolvedQuestions: ['Observed account values are not canonical base stats.', 'Enemy formation membership, target overlap, activation uptime, stacking, refresh, and final formulas remain unresolved.'] };
};

const createRhysarion = (): Dragon => {
  const controlCondition = condition('target-has-control-status', 'target-has-status-category', 'Per target, the target is afflicted with a verified Control status.', { statusCategoryId: 'control' });
  const recoverySchedule = schedule({ id: 'echoing-melody-recovery-rounds', timing: 'specific-rounds', rounds: [2, 5, 8], roundSelector: { kind: 'explicit', rounds: [2, 5, 8] }, effects: [fixedEffect({ id: 'echoing-melody-recovery', type: 'Recovery', target: '2 other Allies in any lane', targetScope: 'any-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([60, 72, 84, 102, 120]), scaling: ['enhanced by Rhysarion Intelligence', 'scales with Dragon Level'], targetCount: 2, casterEligibility: 'excluded', includesCaster: false, targetPriority: 'other-allies-excluding-self' })] });
  const command = ability({
    dragonId: 'rhysarion',
    id: 'rhysarion-dawnsong',
    kind: 'command',
    name: 'Dawnsong',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription: `Rounds 1, 4, and 7: Deal Physical Damage to 2 enemies within adjacency at a 70% Damage Rate.

Rounds 2, 5, and 8: Deal Fire Damage to 3 enemies in any lane at a 20% Damage Rate. This damage is increased by 1.5x if the target is afflicted with a Control effect, increasing the Damage Rate to 30%. Control effects include Stun, Stagger, Overwhelm, and Confusion.

At 6+ Stars:

Rounds 2, 5, and 8: Apply Recovery to 2 other Allies in any lane at a 60% Recovery Rate, enhanced by Intelligence.`,
    schedules: [
      schedule({ id: 'dawnsong-physical-rounds', timing: 'specific-rounds', rounds: [1, 4, 7], roundSelector: { kind: 'explicit', rounds: [1, 4, 7] }, effects: [fixedEffect({ id: 'dawnsong-physical', type: 'Physical Damage', target: '2 enemies within adjacency', targetScope: 'within-adjacency', magnitude: 70, unit: 'rate', scaling: ['attacker Strength'], targetCount: 2, targetSelection: targetSelection({ repeatedInstances: { count: 2, eachInstanceSelectsSeparately: true, sameTargetAllowed: false }, distinctness: 'must-be-distinct' }), notes: ['Mitigated by target Instinct.', 'Enemy adjacency remains unresolved.'] })] }),
      schedule({ id: 'dawnsong-fire-rounds', timing: 'specific-rounds', rounds: [2, 5, 8], roundSelector: { kind: 'explicit', rounds: [2, 5, 8] }, effects: [fixedEffect({ id: 'dawnsong-fire', type: 'Fire Damage', target: '3 enemies in any lane', targetScope: 'any-lane', magnitude: 20, unit: 'rate', scaling: ['attacker Intelligence'], targetCount: 3, conditionalMultipliers: [multiplier('control-target-1-5x', 1.5, controlCondition, 'Per target, Control affliction increases Dawnsong Fire Damage by 1.5x.', [{ level: 1, value: 30, unit: 'percent' }])], notes: ['Mitigated by target Initiative.', 'Control category includes Stun, Stagger, Overwhelm, and Confusion only.'] })] }),
    ],
    augmentations: [{ id: 'rhysarion-echoing-melody-augmentation', sourceAbilityId: 'rhysarion-echoing-melody', modifiesAbilityId: 'rhysarion-dawnsong', minimumDragonStarRank: 6, schedulesAdded: [recoverySchedule], effectsAdded: [], scheduleOverrides: [], rawDescription: 'Echoing Melody adds Recovery to Dawnsong on Rounds 2, 5, and 8.', evidenceIds: ['rhysarion-echoing-melody-2026-06-26'] }],
    tags: ['PHYSICAL_DAMAGE', 'FIRE_DAMAGE', 'RECOVERY', 'CONTROL', 'MULTI_SCHEDULE_COMMAND'],
    verification: screenshotVerificationAt('Rhysarion Dawnsong screenshots', epicBatch20260626),
    evidenceIds: ['rhysarion-dawnsong-2026-06-26'],
    unresolvedQuestions: ['Enemy adjacency.', 'Control target overlap and uptime.', 'Recovery final formula and Level scaling.'],
  });
  const trait = ability({ dragonId: 'rhysarion', id: 'rhysarion-champions-vigor', kind: 'trait', name: "Champion's Vigor", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Rhysarion Recovery Dealt +15% and Initiative +25; Right Flank ally Damage Dealt +8%.', schedules: [schedule({ id: 'champions-vigor-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [fixedEffect({ id: 'champions-vigor-recovery-dealt', type: 'Recovery Dealt Up', target: 'Self', targetScope: 'self', magnitude: 15, unit: 'percent' }), fixedEffect({ id: 'champions-vigor-initiative', type: 'Initiative Up', target: 'Self', targetScope: 'self', magnitude: 25, unit: 'flat' }), fixedEffect({ id: 'champions-vigor-right-damage-dealt', type: 'Damage Dealt Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 8, unit: 'percent' })] })], tags: ['RECOVERY_DEALT_UP', 'BUFF_INITIATIVE', 'DAMAGE_DEALT_UP', 'RIGHT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Rhysarion Champion's Vigor screenshot", epicBatch20260626), evidenceIds: ['rhysarion-champions-vigor-2026-06-26'] });
  const ebbingDamageValues = rankedPercents([27.5, 33, 38.5, 46.75, 55]);
  const inspiringGroup = 'inspiring-melody-selected-ally';
  const habits = [
    ability({ dragonId: 'rhysarion', id: 'rhysarion-ebbing-fury', kind: 'habit', name: 'Ebbing Fury', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Start of Round 1 for 3 rounds: reduce Damage Dealt of all enemies and all allies, including Rhysarion. Start of Round 4: apply Recovery to 3 Allies, including Rhysarion.', schedules: [
      schedule({ id: 'ebbing-fury-round-one-debuffs', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'ebbing-fury-enemy-damage-dealt-down', type: 'Damage Dealt Down', target: 'All enemies', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: ebbingDamageValues, durationRounds: 3, targetCount: 3 }), fixedEffect({ id: 'ebbing-fury-ally-damage-dealt-down', type: 'Damage Dealt Down', target: 'All allies including Rhysarion', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: ebbingDamageValues, durationRounds: 3, targetCount: 3, casterEligibility: 'included', includesCaster: true, notes: ['This is a harmful friendly impairment, not support.'] })] }),
      schedule({ id: 'ebbing-fury-round-four-recovery', timing: 'start-of-round', rounds: [4], roundSelector: { kind: 'start-of-round', round: 4 }, effects: [fixedEffect({ id: 'ebbing-fury-recovery', type: 'Recovery', target: '3 Allies in any lane', targetScope: 'any-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([25, 30, 35, 42.5, 50]), scaling: ['enhanced by Rhysarion Strength'], targetCount: 3, casterEligibility: 'included', includesCaster: true })] }),
    ], powerByHabitLevel: standardEpicPower, tags: ['DAMAGE_DEALT_UP', 'RECOVERY'], verification: screenshotVerificationAt('Rhysarion Ebbing Fury screenshot', epicBatch20260626), evidenceIds: ['rhysarion-ebbing-fury-2026-06-26'], unresolvedQuestions: ['Progression prose says 27% at Level 1 while table says 27.5%; table value is stored.', 'Damage reduction stacking and refresh behavior.', 'Recovery final formula.'] }),
    ability({ dragonId: 'rhysarion', id: 'rhysarion-sharp-resolve', kind: 'habit', name: 'Sharp Resolve', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of combat until end of combat: increase Rhysarion Strength and Intelligence.', schedules: [schedule({ id: 'sharp-resolve-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'sharp-resolve-strength', type: 'Strength Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' }), fixedEffect({ id: 'sharp-resolve-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([16, 19.2, 22.4, 27.2, 32]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardEpicPower, tags: ['STRENGTH_UP', 'BUFF_INTELLIGENCE'], verification: screenshotVerificationAt('Rhysarion Sharp Resolve screenshot', epicBatch20260626), evidenceIds: ['rhysarion-sharp-resolve-2026-06-26'] }),
    ability({ dragonId: 'rhysarion', id: 'rhysarion-echoing-melody', kind: 'habit', name: 'Echoing Melody', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Command augmentation for Dawnsong: Rounds 2, 5, and 8 apply Recovery to 2 other Allies in any lane, excluding Rhysarion, enhanced by Intelligence.', schedules: [recoverySchedule], powerByHabitLevel: standardEpicPower, tags: ['COMMAND_AUGMENTATION', 'RECOVERY', 'OTHER_ALLIES_TARGET'], verification: screenshotVerificationAt('Rhysarion Echoing Melody screenshot', epicBatch20260626), evidenceIds: ['rhysarion-echoing-melody-2026-06-26'], unresolvedQuestions: ['Exact Intelligence enhancement and Dragon Level formula.'] }),
    ability({ dragonId: 'rhysarion', id: 'rhysarion-unbroken-devotion', kind: 'habit', name: 'Unbroken Devotion', abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of combat: increase Recovery Received of 2 other Allies in any lane until end of combat, excluding Rhysarion.', schedules: [schedule({ id: 'unbroken-devotion-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'unbroken-devotion-recovery-received', type: 'Recovery Received Up', target: '2 other Allies in any lane', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([20, 24, 28, 34, 40]), duration: 'Until end of combat', targetCount: 2, casterEligibility: 'excluded', includesCaster: false, targetPriority: 'other-allies-excluding-self' })] })], powerByHabitLevel: standardEpicPower, tags: ['RECOVERY_RECEIVED_UP', 'OTHER_ALLIES_TARGET'], verification: screenshotVerificationAt('Rhysarion Unbroken Devotion screenshot', epicBatch20260626), evidenceIds: ['rhysarion-unbroken-devotion-2026-06-26'] }),
    ability({ dragonId: 'rhysarion', id: 'rhysarion-inspiring-melody', kind: 'habit', name: 'Inspiring Melody', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Each round: one activation chance. On success, select 1 other adjacent Ally and apply Initiative +20% enhanced by Rhysarion Intelligence plus Resistance Damage Received -15% for 3 rounds.', schedules: [schedule({ id: 'inspiring-melody-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceByHabitLevel: rankedPercents([20, 26, 32, 40, 50]), activationRoll: roll({ scope: 'schedule-shared', chanceByHabitLevel: rankedPercents([20, 26, 32, 40, 50]), description: 'One shared activation and one shared selected adjacent ally receive both effects.' }), effects: [fixedEffect({ id: 'inspiring-melody-initiative', type: 'Initiative Up', target: '1 other adjacent Ally', targetScope: 'within-adjacency', magnitude: 20, unit: 'percent', durationRounds: 3, scaling: ['enhanced by Rhysarion Intelligence'], casterEligibility: 'excluded', targetPriority: 'within-adjacency', targetSelection: targetSelection({ preference: 'Other adjacent ally', sharedSelectionGroupId: inspiringGroup, distinctness: 'explicitly-another-target' }) }), fixedEffect({ id: 'inspiring-melody-resistance', type: 'Resistance', target: 'Same selected adjacent Ally', targetScope: 'within-adjacency', magnitude: 15, unit: 'percent', durationRounds: 3, casterEligibility: 'excluded', targetSelection: targetSelection({ references: [{ id: 'inspiring-melody-same-recipient', kind: 'same-target-as-effect', referencedEffectId: 'inspiring-melody-initiative', description: 'Resistance applies to the same ally selected for Initiative.' }], sharedSelectionGroupId: inspiringGroup, distinctness: 'same-target-required' }) })] })], powerByHabitLevel: rankedPowers([340, 790, 1400, 2100, 3100]), glossaryEntries: [{ term: 'Resistance', definition: 'Reduces Damage Received. Magnitude and duration are supplied by the source ability.' }], tags: ['BUFF_INITIATIVE', 'RESISTANCE', 'DAMAGE_RECEIVED_DOWN', 'OTHER_ALLIES_TARGET'], verification: screenshotVerificationAt('Rhysarion Inspiring Melody screenshot', epicBatch20260626), evidenceIds: ['rhysarion-inspiring-melody-2026-06-26'], unresolvedQuestions: ['Resistance refresh and stacking.', 'Exact Intelligence enhancement formula.', 'Adjacent-candidate ordering.'] }),
  ];
  return { ...createPendingDragon('Rhysarion', 'Epic', 'Champion'), dataStatus: 'community-verified', lastVerified: epicBatch20260626, command, trait, habits, affinities: { Spearmen: 'positive', Shieldbearers: 'positive', Siege: 'positive', Cavalry: 'unknown', Archers: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: screenshotVerificationAt('Rhysarion main screen screenshot', epicBatch20260626), command: screenshotVerificationAt('Rhysarion Dawnsong screenshots', epicBatch20260626), trait: screenshotVerificationAt("Rhysarion Champion's Vigor screenshot", epicBatch20260626), habits: screenshotVerificationAt('Rhysarion Habit screenshots', epicBatch20260626), affinities: partialScreenshotVerification('Rhysarion main screen screenshot') }, unresolvedQuestions: ['Observed account values are not canonical base stats.', 'Enemy adjacency, Control uptime, target overlap, roll scope, and final formulas remain unresolved.'] };
};

const createShadowsong = (): Dragon => {
  const panicCondition = condition('target-has-panic', 'target-has-status', 'Per target, the target is afflicted with Panic.', { statusId: 'panic' });
  const burnStatusEffect = (id: string, target: string, chanceValues: number[], referenceEffectId: string) => fixedEffect({
    id,
    type: 'Burn',
    target,
    targetScope: 'any-lane',
    magnitude: 20,
    unit: 'rate',
    durationRounds: 2,
    activationRoll: roll({ scope: 'effect', chanceByHabitLevel: rankedPercents(chanceValues), description: 'Burn application is independently rolled for this added target.' }),
    targetSelection: targetSelection({ references: [{ id: `${id}-target-reference`, kind: 'same-target-as-effect', referencedEffectId: referenceEffectId, description: 'Burn is attempted on the same added target as the direct Fire Damage.' }], distinctness: 'same-target-required' }),
    notes: ['Burn is periodic Fire Damage each round, scales with Intelligence, and is mitigated by target Initiative.'],
  });
  const blazingConductorEffects = [
    fixedEffect({ id: 'blazing-conductor-first-fire', type: 'Fire Damage', target: 'First added enemy in any lane', targetScope: 'any-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([60, 78, 96, 120, 150]), scaling: ['attacker Intelligence'], targetSelection: targetSelection({ sharedSelectionGroupId: 'blazing-conductor-first-target', distinctness: 'no-distinctness-requirement' }), notes: ['Mitigated by target Initiative.'] }),
    burnStatusEffect('blazing-conductor-first-burn', 'First added enemy', [40, 52, 64, 80, 100], 'blazing-conductor-first-fire'),
    fixedEffect({ id: 'blazing-conductor-second-fire', type: 'Fire Damage', target: 'Second added enemy in any lane, different from the first added target', targetScope: 'any-lane', magnitude: null, unit: 'rate', rankedValues: rankedPercents([30, 39, 48, 60, 75]), scaling: ['attacker Intelligence'], targetSelection: targetSelection({ references: [{ id: 'blazing-conductor-distinct-first-target', kind: 'distinct-from-effect-target', referencedEffectId: 'blazing-conductor-first-fire', description: 'Second added target must differ from the first added target.' }], sharedSelectionGroupId: 'blazing-conductor-second-target', distinctness: 'must-be-distinct' }), notes: ['Mitigated by target Initiative.', 'No requirement is invented that either added target differs from the two base adjacency targets.'] }),
    burnStatusEffect('blazing-conductor-second-burn', 'Second added enemy', [20, 26, 32, 40, 50], 'blazing-conductor-second-fire'),
  ];
  const command = ability({
    dragonId: 'shadowsong',
    id: 'shadowsong-breath-of-fire',
    kind: 'command',
    name: 'Breath of Fire',
    abilityClass: 'active',
    unlockStarRank: null,
    rawDescription: `Rounds 2, 5, and 8: Deal Fire Damage to 2 enemies within adjacency at a 100% Damage Rate. This damage is increased by 1.5x if the target is afflicted with Panic, increasing the Damage Rate to 150%.

At 10 Stars:

Rounds 2, 5, and 8: Deal Fire Damage to 1 enemy in any lane at a 60% Damage Rate, with a 40% chance to afflict that target with Burn for 2 rounds.

Then deal Fire Damage to a different enemy in any lane at a 30% Damage Rate, with a 20% chance to afflict that target with Burn for 2 rounds.

Burn deals Fire Damage to the target each round.`,
    schedules: [schedule({ id: 'breath-of-fire-base-rounds', timing: 'specific-rounds', rounds: [2, 5, 8], roundSelector: { kind: 'explicit', rounds: [2, 5, 8] }, effects: [fixedEffect({ id: 'breath-of-fire-base-fire', type: 'Fire Damage', target: '2 enemies within adjacency', targetScope: 'within-adjacency', magnitude: 100, unit: 'rate', scaling: ['attacker Intelligence'], targetCount: 2, conditionalMultipliers: [multiplier('panic-target-1-5x', 1.5, panicCondition, 'Per target, Panic increases Breath of Fire damage by 1.5x.', [{ level: 1, value: 150, unit: 'percent' }])], targetSelection: targetSelection({ repeatedInstances: { count: 2, eachInstanceSelectsSeparately: true, sameTargetAllowed: false }, distinctness: 'must-be-distinct' }), notes: ['Mitigated by target Initiative.', 'Panic condition is evaluated independently for each target.'] })] })],
    augmentations: [{ id: 'shadowsong-blazing-conductor-augmentation', sourceAbilityId: 'shadowsong-blazing-conductor', modifiesAbilityId: 'shadowsong-breath-of-fire', minimumDragonStarRank: 10, schedulesAdded: [schedule({ id: 'blazing-conductor-added-rounds', timing: 'specific-rounds', rounds: [2, 5, 8], roundSelector: { kind: 'explicit', rounds: [2, 5, 8] }, effects: blazingConductorEffects })], effectsAdded: [], scheduleOverrides: [], rawDescription: 'Blazing Conductor adds two ordered Fire attacks and Burn attempts to Breath of Fire on Rounds 2, 5, and 8.', evidenceIds: ['shadowsong-blazing-conductor-2026-06-26'] }],
    tags: ['FIRE_DAMAGE', 'BURN', 'PANIC', 'ADJACENT_TARGET'],
    verification: screenshotVerificationAt('Shadowsong Breath of Fire screenshots', epicBatch20260626),
    evidenceIds: ['shadowsong-breath-of-fire-2026-06-26'],
    unresolvedQuestions: ['Enemy adjacency.', 'Panic overlap and uptime.', 'Blazing Conductor added-target ordering relative to base targets.'],
  });
  const trait = ability({ dragonId: 'shadowsong', id: 'shadowsong-hunters-wrath', kind: 'trait', name: "Hunter's Wrath", abilityClass: 'passive', unlockStarRank: 1, minimumDragonLevel: 16, positionRequirement: 'vanguard', rawDescription: 'At Level 16+ and deployed in Vanguard: Shadowsong Fire Damage Dealt +16%; Right Flank ally Strength and Initiative +20.', schedules: [schedule({ id: 'hunters-wrath-passive', timing: 'passive', roundSelector: { kind: 'passive' }, effects: [fixedEffect({ id: 'hunters-wrath-fire', type: 'Fire Damage Dealt Up', target: 'Self', targetScope: 'self', magnitude: 16, unit: 'percent' }), fixedEffect({ id: 'hunters-wrath-right-strength', type: 'Strength Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 20, unit: 'flat' }), fixedEffect({ id: 'hunters-wrath-right-initiative', type: 'Initiative Up', target: 'Right Flank ally', targetScope: 'right-flank', magnitude: 20, unit: 'flat' })] })], tags: ['FIRE_DAMAGE_UP', 'STRENGTH_UP', 'BUFF_INITIATIVE', 'RIGHT_FLANK_TARGET', 'VANGUARD_REQUIRED'], verification: screenshotVerificationAt("Shadowsong Hunter's Wrath screenshot", epicBatch20260626), evidenceIds: ['shadowsong-hunters-wrath-2026-06-26'] });
  const panicDoublesChance = (base: number[]) => base.map((value) => value * 2);
  const scorchedBase = [10, 12, 14, 17, 20];
  const habits = [
    ability({ dragonId: 'shadowsong', id: 'shadowsong-ensnare', kind: 'habit', name: 'Ensnare', abilityClass: 'passive', unlockStarRank: 2, rawDescription: 'Round 1 for three rounds: reduce Instinct and Initiative of two adjacent enemies, enhanced by Shadowsong Intelligence.', schedules: [schedule({ id: 'ensnare-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'ensnare-instinct', type: 'Instinct Down', target: '2 Enemies within adjacency', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([-18, -21.6, -25.2, -30.6, -36]), durationRounds: 3, scaling: ['enhanced by Shadowsong Intelligence'], targetCount: 2, targetSelection: targetSelection({ sharedSelectionGroupId: 'shadowsong-ensnare-targets', distinctness: 'same-target-required' }) }), fixedEffect({ id: 'ensnare-initiative', type: 'Initiative Down', target: 'Same two selected enemies', targetScope: 'within-adjacency', magnitude: null, unit: 'percent', rankedValues: rankedPercents([-18, -21.6, -25.2, -30.6, -36]), durationRounds: 3, scaling: ['enhanced by Shadowsong Intelligence'], targetCount: 2, targetSelection: targetSelection({ references: [{ id: 'shadowsong-ensnare-same-targets', kind: 'same-target-as-effect', referencedEffectId: 'ensnare-instinct', description: 'Initiative reduction uses the enemies selected for Instinct reduction.' }], sharedSelectionGroupId: 'shadowsong-ensnare-targets', distinctness: 'same-target-required' }) })] })], powerByHabitLevel: standardEpicPower, tags: ['DEBUFF_INSTINCTS', 'DEBUFF_INITIATIVE', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Shadowsong Ensnare screenshot', epicBatch20260626), evidenceIds: ['shadowsong-ensnare-2026-06-26'], unresolvedQuestions: ['Exact Intelligence enhancement formula.', 'Enemy adjacency.', 'Stacking and refresh behavior.'] }),
    ability({ dragonId: 'shadowsong', id: 'shadowsong-blazing-onslaught', kind: 'habit', name: 'Blazing Onslaught', abilityClass: 'passive', unlockStarRank: 4, rawDescription: 'Start of Round 1: independently select one enemy preferring Left Flank for Fire vulnerability and one enemy preferring Right Flank for non-Basic Physical vulnerability; both last 3 rounds.', schedules: [schedule({ id: 'blazing-onslaught-round-one', timing: 'start-of-round', rounds: [1], roundSelector: { kind: 'start-of-round', round: 1 }, effects: [fixedEffect({ id: 'blazing-onslaught-fire', type: 'Fire Damage Received Up', target: '1 enemy in any lane, preferring Left Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 18, 21, 25.5, 30]), durationRounds: 3, sourceScope: 'all-sources', targetPriority: 'prefer-left-flank', targetSelection: targetSelection({ preference: 'Left Flank', fallback: 'another eligible enemy', sharedSelectionGroupId: 'blazing-onslaught-fire-target', distinctness: 'no-distinctness-requirement' }) }), fixedEffect({ id: 'blazing-onslaught-physical', type: 'Physical Damage Received Up', target: '1 enemy in any lane, preferring Right Flank', targetScope: 'any-lane', magnitude: null, unit: 'percent', rankedValues: rankedPercents([15, 18, 21, 25.5, 30]), durationRounds: 3, sourceScope: 'non-basic-attacks', excludes: ['Basic Attacks'], targetPriority: 'prefer-right-flank', targetSelection: targetSelection({ preference: 'Right Flank', fallback: 'another eligible enemy', sharedSelectionGroupId: 'blazing-onslaught-physical-target', distinctness: 'no-distinctness-requirement' }) })] })], powerByHabitLevel: standardEpicPower, tags: ['FIRE_DAMAGE_UP', 'PHYSICAL_DAMAGE_UP', 'EXCLUDES_BASIC_ATTACKS'], verification: screenshotVerificationAt('Shadowsong Blazing Onslaught screenshot', epicBatch20260626), evidenceIds: ['shadowsong-blazing-onslaught-2026-06-26'], unresolvedQuestions: ['Separate target groups may converge or diverge; convergence is not guaranteed.', 'Vulnerability stacking and refresh behavior.'] }),
    ability({ dragonId: 'shadowsong', id: 'shadowsong-scorched-earth', kind: 'habit', name: 'Scorched Earth', abilityClass: 'passive', unlockStarRank: 6, rawDescription: 'Each round: consider 2 adjacent enemies and attempt to apply Vulnerable for 2 rounds. Per target, Panic doubles the applicable chance.', schedules: [schedule({ id: 'scorched-earth-each-round', timing: 'each-round', roundSelector: { kind: 'each-round' }, triggerChanceByHabitLevel: rankedPercents(scorchedBase), activationRoll: roll({ scope: 'unknown', chanceByHabitLevel: rankedPercents(scorchedBase), description: 'Roll scope across the two checked targets is unresolved.', unresolved: true, targetStatusConditionalChances: [{ statusId: 'panic', statusCategoryId: null, chanceFixed: null, chanceByHabitLevel: rankedPercents(panicDoublesChance(scorchedBase)), multiplier: 2, description: 'Per target, Panic doubles the applicable Vulnerable chance.' }] }), effects: [fixedEffect({ id: 'scorched-earth-vulnerable', type: 'Vulnerable', target: '2 enemies within adjacency', targetScope: 'within-adjacency', magnitude: 15, unit: 'percent', durationRounds: 2, targetCount: 2, activationRoll: roll({ scope: 'unknown', chanceByHabitLevel: rankedPercents(scorchedBase), description: 'Exact roll scope, roll sharing, target ordering, and Panic check timing remain unresolved.', unresolved: true, targetStatusConditionalChances: [{ statusId: 'panic', statusCategoryId: null, chanceFixed: null, chanceByHabitLevel: rankedPercents(panicDoublesChance(scorchedBase)), multiplier: 2, description: 'Per target, Panic doubles the applicable Vulnerable chance.' }] }), conditionalMultipliers: [], conditions: [], notes: ['Vulnerable increases generic Damage Received by 15%.', 'Daemoros or another Panic supplier may conditionally improve chance on overlapping enemy targets.'] })] })], powerByHabitLevel: standardEpicPower, glossaryEntries: [{ term: 'Vulnerable', definition: 'Increases generic Damage Received.' }], tags: ['VULNERABLE', 'DAMAGE_RECEIVED_UP', 'ADJACENT_TARGET'], verification: screenshotVerificationAt('Shadowsong Scorched Earth screenshot', epicBatch20260626), evidenceIds: ['shadowsong-scorched-earth-2026-06-26'], unresolvedQuestions: ['Exact roll scope, roll sharing, target ordering, Panic check timing, and target overlap are unresolved.'] }),
    ability({ dragonId: 'shadowsong', id: 'shadowsong-dragons-intellect', kind: 'habit', name: "Dragon's Intellect", abilityClass: 'passive', unlockStarRank: 8, rawDescription: 'Start of combat until end of combat: reduce Shadowsong Damage Received and increase Intelligence.', schedules: [schedule({ id: 'dragons-intellect-start', timing: 'start-of-combat', roundSelector: { kind: 'start-of-combat' }, effects: [fixedEffect({ id: 'dragons-intellect-damage-received', type: 'Damage Received Down', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([5, 6, 7, 8.5, 10]), duration: 'Until end of combat', sourceScope: 'all-sources' }), fixedEffect({ id: 'dragons-intellect-intelligence', type: 'Intelligence Up', target: 'Self', targetScope: 'self', magnitude: null, unit: 'percent', rankedValues: rankedPercents([8.5, 10.2, 11.9, 14.45, 17]), duration: 'Until end of combat' })] })], powerByHabitLevel: standardEpicPower, tags: ['DAMAGE_RECEIVED_DOWN', 'BUFF_INTELLIGENCE'], verification: screenshotVerificationAt("Shadowsong Dragon's Intellect screenshot", epicBatch20260626), evidenceIds: ['shadowsong-dragons-intellect-2026-06-26'] }),
    ability({ dragonId: 'shadowsong', id: 'shadowsong-blazing-conductor', kind: 'habit', name: 'Blazing Conductor', abilityClass: 'passive', unlockStarRank: 10, rawDescription: 'Command augmentation for Breath of Fire: on Rounds 2, 5, and 8 add two ordered any-lane Fire attacks with separate damage progressions and separate Burn chances. Second added target must differ from first added target.', schedules: [schedule({ id: 'blazing-conductor-added-rounds', timing: 'specific-rounds', rounds: [2, 5, 8], roundSelector: { kind: 'explicit', rounds: [2, 5, 8] }, effects: blazingConductorEffects })], powerByHabitLevel: rankedPowers([340, 790, 1400, 2100, 3100]), tags: ['COMMAND_AUGMENTATION', 'FIRE_DAMAGE', 'BURN'], verification: screenshotVerificationAt('Shadowsong Blazing Conductor screenshot', epicBatch20260626), evidenceIds: ['shadowsong-blazing-conductor-2026-06-26'], unresolvedQuestions: ['Burn first tick, refresh, and stacking.', 'Ordering relative to base adjacency targets.'] }),
  ];
  return { ...createPendingDragon('Shadowsong', 'Epic', 'Hunter'), dataStatus: 'community-verified', lastVerified: epicBatch20260626, command, trait, habits, affinities: { Cavalry: 'positive', Shieldbearers: 'unknown', Archers: 'unknown', Spearmen: 'unknown', Siege: 'unknown' }, tags: [...new Set<EffectTag>([...command.tags, ...trait.tags, ...habits.flatMap((habit) => habit.tags)])], fieldVerification: { identity: screenshotVerificationAt('Shadowsong main screen screenshot', epicBatch20260626), command: screenshotVerificationAt('Shadowsong Breath of Fire screenshots', epicBatch20260626), trait: screenshotVerificationAt("Shadowsong Hunter's Wrath screenshot", epicBatch20260626), habits: screenshotVerificationAt('Shadowsong Habit screenshots', epicBatch20260626), affinities: partialScreenshotVerification('Shadowsong main screen screenshot') }, unresolvedQuestions: ['Observed account values are not canonical base stats.', 'Enemy adjacency, Panic uptime, target overlap, activation uptime, stacking, refresh, and final formulas remain unresolved.'] };
};

export const dragons: Dragon[] = [
  createSyrax(),
  createVhagar(),
  createCaraxes(),
  createSeasmoke(),
  createDragon('Solstryker', 'Rare', 'Champion'),
  createCrimson(),
  createKalspire(),
  createMalachite(),
  createVenator(),
  createDaemoros(),
  createFeskar(),
  createRhysarion(),
  createShadowsong(),
  createDragon('Tashix', 'Epic', 'Hunter'),
  createVaeldra(),
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
