export type DragonRarity = 'Legendary' | 'Epic' | 'Rare';

export type DragonBreed = 'Champion' | 'Hunter' | 'Sentinel' | 'Warrior';

export type VerificationStatus =
  | 'official-metadata-only'
  | 'community-unverified'
  | 'community-verified'
  | 'officially-confirmed';

export type TroopType = 'Cavalry' | 'Shieldbearers' | 'Archers' | 'Spearmen' | 'Siege';

export type AffinityLevel = 'positive' | 'neutral' | 'negative' | 'unknown';

export type DragonRosterSourceStatus =
  | 'official-website'
  | 'in-game-verified-pending-official-site'
  | 'community-unverified';

export type DragonCollectionState = 'not-collected' | 'not-hatched' | 'hatched';

export type BattleContext = 'unspecified' | 'pvp' | 'non-player-food-tile' | 'beast-encounter';

export type EffectTag =
  | 'BURN'
  | 'BLEED'
  | 'STUN'
  | 'SILENCE'
  | 'HEAL'
  | 'SHIELD'
  | 'AREA_DAMAGE'
  | 'SINGLE_TARGET_DAMAGE'
  | 'BUFF_STRENGTH'
  | 'BUFF_INTELLIGENCE'
  | 'BUFF_INSTINCTS'
  | 'BUFF_INITIATIVE'
  | 'DEBUFF_STRENGTH'
  | 'DEBUFF_INTELLIGENCE'
  | 'DEBUFF_INSTINCTS'
  | 'DEBUFF_INITIATIVE'
  | 'LOW_HEALTH'
  | 'ON_CRITICAL'
  | 'ON_COMMAND_TRIGGER'
  | 'VANGUARD'
  | 'REARGUARD'
  | 'TACTICAL_DAMAGE'
  | 'RECOVERY'
  | 'RECOVERY_RECEIVED_UP'
  | 'SAME_LANE_TARGET'
  | 'ANY_LANE_TARGET'
  | 'ADJACENT_TARGET'
  | 'ENHANCED_BY_INSTINCT'
  | 'ENHANCED_BY_STRENGTH'
  | 'SCALES_WITH_LEVEL'
  | 'SPECIFIC_ROUNDS'
  | 'MULTI_SCHEDULE_COMMAND'
  | 'RECOVERY_DEALT_UP'
  | 'INSTINCT_UP'
  | 'FIRE_DAMAGE_UP'
  | 'VANGUARD_REQUIRED'
  | 'LEFT_FLANK_TARGET'
  | 'RIGHT_FLANK_TARGET'
  | 'BUFF_SELF'
  | 'BUFF_ALLIES'
  | 'PHYSICAL_DAMAGE_UP'
  | 'TACTICAL_DAMAGE_RECEIVED_DOWN'
  | 'EXCLUDES_BASIC_ATTACKS'
  | 'OTHER_ALLIES_TARGET'
  | 'DAMAGE_DEALT_UP'
  | 'STRENGTH_UP'
  | 'FIRST_STRIKE'
  | 'DOUBLE_STRIKE'
  | 'CLEANSE_POSITIVE'
  | 'FIRE_DAMAGE'
  | 'PHYSICAL_DAMAGE'
  | 'RECOVERY_RECEIVED_DOWN'
  | 'DAMAGE_RECEIVED_DOWN'
  | 'DAMAGE_RECEIVED_UP'
  | 'FIRE_DAMAGE_RECEIVED_DOWN'
  | 'SPREADING_BLAZE'
  | 'INFECTIOUS_WRATH'
  | 'STOLEN_FLOCK'
  | 'RALLYING_FLAME'
  | 'PREY'
  | 'VULNERABLE'
  | 'EVADE'
  | 'RESISTANCE'
  | 'PANIC'
  | 'WEAKENED'
  | 'ADVANTAGE'
  | 'TAUNT'
  | 'STAGGER'
  | 'CONFUSION'
  | 'OVERWHELM'
  | 'BULWARK'
  | 'COMMAND_AUGMENTATION'
  | 'SLOW'
  | 'CONTROL'
  | 'CLEANSE_NEGATIVE';

export type AbilityKind = 'command' | 'trait' | 'habit';

export type TriggerTiming =
  | 'passive'
  | 'start-of-combat'
  | 'each-round'
  | 'start-of-each-round'
  | 'start-of-round'
  | 'specific-rounds'
  | 'after-basic-attack'
  | 'on-stack-count-gained'
  | 'on-successful-cleanse'
  | 'when-successful-status-application'
  | 'when-marked-target-receives-recovery'
  | 'when-enemy-retreated-previous-round';

export type FormationPosition = 'left-flank' | 'vanguard' | 'right-flank';

export type TargetScope =
  | 'self'
  | 'same-lane'
  | 'any-lane'
  | 'within-adjacency'
  | 'left-flank'
  | 'right-flank'
  | 'opposing-position'
  | 'unknown';

export type EffectSourceScope =
  | 'basic-attacks'
  | 'non-basic-attacks'
  | 'commands'
  | 'habits'
  | 'commands-and-habits'
  | 'all-sources'
  | 'unknown';

export type CasterEligibility =
  | 'included'
  | 'excluded'
  | 'eligible-if-targeting-allows'
  | 'unknown';

export type TargetPriority =
  | 'any-eligible'
  | 'same-lane'
  | 'highest-stat-ally'
  | 'least-current-troops-ally'
  | 'prefer-fire-damage-ally'
  | 'prefer-control-afflicted-ally'
  | 'prefer-left-flank'
  | 'prefer-right-flank'
  | 'prefer-hunter'
  | 'prefer-warrior'
  | 'prefer-not-stunned'
  | 'current-marked-target'
  | 'original-basic-attack-target'
  | 'same-as-referenced-effect'
  | 'distinct-from-referenced-target'
  | 'highest-stat-enemy'
  | 'highest-current-troops-ally'
  | 'highest-current-troops-enemy'
  | 'least-current-troops-enemy'
  | 'opposing-position'
  | 'prefer-received-recovery-last-round'
  | 'prefer-prey'
  | 'within-adjacency'
  | 'all-allies-matching-threshold'
  | 'other-allies-excluding-self';

export type QualifyingOutputChannel =
  | 'physical-damage'
  | 'tactical-damage'
  | 'fire-damage'
  | 'damage-dealt'
  | 'recovery';

export interface QualifyingOutputCapabilityCondition {
  channel: QualifyingOutputChannel;
  sourceScope: EffectSourceScope;
  description: string;
}

export type ConditionKind =
  | 'target-has-status'
  | 'target-has-status-category'
  | 'target-lacks-status'
  | 'no-enemy-has-mark'
  | 'target-received-recovery-previous-round'
  | 'any-enemy-has-status'
  | 'previous-round-event'
  | 'target-above-troop-capacity-threshold'
  | 'target-below-troop-capacity-threshold'
  | 'battle-context'
  | 'enemy-deals-fire-damage'
  | 'ally-deals-tactical-damage'
  | 'self-has-status'
  | 'successful-cleanse-occurred'
  | 'successful-status-application'
  | 'effect-applied-by-enemy'
  | 'target-has-output-capability'
  | 'negative-effect-reduces-damage-dealt';

export type RepeatMode = 'none' | 'once-if-any-match' | 'once-per-match';

export type RoundSelector =
  | { kind: 'explicit'; rounds: number[] }
  | { kind: 'odd' }
  | { kind: 'even' }
  | { kind: 'range'; startRound: number; endRound: number }
  | { kind: 'each-round' }
  | { kind: 'start-of-round'; round: number }
  | { kind: 'start-of-combat' }
  | { kind: 'passive' }
  | { kind: 'after-basic-attack' };

export type RollScope =
  | 'schedule-shared'
  | 'effect'
  | 'independent-per-target'
  | 'unknown';

export interface ActivationRoll {
  scope: RollScope;
  chanceFixed: number | null;
  chanceByHabitLevel: RankedValue[];
  targetStatusConditionalChances: Array<{
    statusId?: string | null;
    statusCategoryId?: string | null;
    chanceFixed: number | null;
    chanceByHabitLevel: RankedValue[];
    multiplier: number | null;
    description: string;
  }>;
  description: string;
  unresolved: boolean;
}

export interface TargetReference {
  id: string;
  kind:
    | 'original-basic-attack-target'
    | 'effect-target'
    | 'same-target-as-effect'
    | 'persistent-selected-target'
    | 'distinct-from-effect-target'
    | 'another-target'
    | 'opposing-position-enemy';
  referencedEffectId: string | null;
  description: string;
}

export interface TargetSelectionDetails {
  preference: string | null;
  fallback: string | null;
  comparisonStat: 'strength' | 'instinct' | 'intelligence' | 'initiative' | 'current-troops' | null;
  comparisonDirection: 'highest' | 'lowest' | null;
  comparisonPool: 'ally-side' | 'enemy-side' | null;
  tieBehavior: 'candidate-group' | 'unknown' | null;
  distinctness: 'must-be-distinct' | 'same-target-required' | 'no-distinctness-requirement' | 'explicitly-another-target' | 'unknown';
  references: TargetReference[];
  sharedSelectionGroupId: string | null;
  repeatedInstances: {
    count: number;
    eachInstanceSelectsSeparately: boolean;
    sameTargetAllowed: boolean;
  } | null;
}

export interface StackTransitionTrigger {
  statusId: string;
  stackCount: number;
  transition: 'gaining-nth-stack';
  oncePerTransition: boolean;
  description: string;
}

export interface AbilityScheduleOverride {
  id: string;
  targetScheduleId: string;
  targetEffectId: string | null;
  operation: 'replace-schedule' | 'replace-effect-roll' | 'replace-effect' | 'patch-schedule';
  replacementSchedule: AbilitySchedule | null;
  replacementEffect: AbilityEffect | null;
  evidenceIds: string[];
  description: string;
}

export interface AbilityCondition {
  id: string;
  kind: ConditionKind;
  subject: 'self' | 'ally' | 'enemy' | 'target' | 'battle';
  statusId: string | null;
  statusCategoryId: string | null;
  qualifyingOutput: QualifyingOutputCapabilityCondition | null;
  thresholdPercent: number | null;
  comparison: 'above' | 'below' | 'at-or-above' | 'at-or-below' | 'unknown' | null;
  battleContext: BattleContext | null;
  sourceEffectId: string | null;
  description: string;
  unresolved: boolean;
}

export interface AttemptConfiguration {
  attemptCount: number | null;
  chanceFixed: number | null;
  chanceByHabitLevel: RankedValue[];
  independentlyRolled: boolean;
  independentlyTargeted: boolean;
}

export interface RepeatConfiguration {
  mode: RepeatMode;
  condition: AbilityCondition | null;
  description: string;
}

export interface StackConfiguration {
  statusId: string;
  maximumStacks: number | null;
  durationRounds: number | null;
  untilEndOfCombat: boolean;
  valuePerStackFixed: number | null;
  valuePerStackByHabitLevel: RankedValue[];
  refreshBehavior: 'unknown' | 'refresh-all' | 'refresh-stack' | 'independent-duration';
}

export interface PerTargetEffectCheck {
  targetCount: number;
  effects: Array<{
    effectId: string;
    independentlyChecked: boolean;
  }>;
  targetsCheckedIndependently: boolean;
  sharedChanceByHabitLevel: RankedValue[];
}

export interface ConditionalMultiplier {
  id: string;
  multiplier: number;
  condition: AbilityCondition;
  directlyVerifiedValues: RankedValue[];
  calculatedFromVerifiedMultiplier: boolean;
  description: string;
}

export interface EffectOptionConfiguration {
  mode: 'one-of' | 'conditional-branch';
  selectionTiming: string;
  selectorMethod: 'unknown' | 'condition-per-target';
  description: string;
  options: Array<{
    id: string;
    label: string;
    condition: AbilityCondition | null;
    effect: AbilityEffect;
  }>;
}

export type FieldVerificationStatus =
  | 'unknown'
  | 'officially-confirmed'
  | 'screenshot-verified'
  | 'partially-screenshot-verified'
  | 'community-unverified'
  | 'community-verified';

export interface FieldVerification {
  status: FieldVerificationStatus;
  source: string;
  capturedAt: string | null;
  gameVersion: string | null;
  reviewedManually: boolean;
}

export interface RankedValue {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  value: number;
  unit: 'percent' | 'flat' | 'power';
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface AbilityEffect {
  id: string;
  type: string;
  target: string;
  targetScope: TargetScope;
  magnitude: number | null;
  unit: 'percent' | 'flat' | 'rate' | 'rounds' | 'unknown';
  durationRounds: number | null;
  duration: string | null;
  scaling: string[];
  excludes: string[];
  notes: string[];
  rankedValues: RankedValue[];
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
}

export interface AbilitySchedule {
  id: string;
  timing: TriggerTiming;
  rounds: number[];
  roundSelector?: RoundSelector | null;
  triggerChanceFixed: number | null;
  triggerChanceByHabitLevel: RankedValue[];
  effects: AbilityEffect[];
  triggerEvent?: TriggerTiming;
  activationRoll?: ActivationRoll | null;
  attempts?: AttemptConfiguration | null;
  repeat?: RepeatConfiguration | null;
  conditions?: AbilityCondition[];
  targetPriority?: TargetPriority;
  battleContext?: BattleContext;
}

export interface AbilityAugmentation {
  id: string;
  sourceAbilityId: string;
  modifiesAbilityId: string;
  minimumDragonStarRank: number;
  schedulesAdded: AbilitySchedule[];
  effectsAdded: AbilityEffect[];
  scheduleOverrides?: AbilityScheduleOverride[];
  rawDescription: string;
  evidenceIds: string[];
}

export interface AbilityDefinition {
  id: string;
  dragonId: string;
  kind: AbilityKind;
  name: string;
  abilityClass: 'active' | 'passive' | 'unknown';
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  rawDescription: string | null;
  schedules: AbilitySchedule[];
  powerByHabitLevel: RankedValue[];
  glossaryEntries: GlossaryEntry[];
  tags: EffectTag[];
  verification: FieldVerification;
  evidenceIds: string[];
  unresolvedQuestions: string[];
  positionRequirement: FormationPosition | null;
  augmentations: AbilityAugmentation[];
}

export interface DragonStats {
  strength: number | null;
  intelligence: number | null;
  instinct: number | null;
  initiative: number | null;
}

export interface Dragon {
  id: string;
  slug: string;
  name: string;
  rarity: DragonRarity;
  breed: DragonBreed;
  officialProfileUrl: string | null;
  rosterSourceStatus: DragonRosterSourceStatus;
  firstObservedInGame: string | null;
  gameVersion: string | null;
  isNew: boolean;
  dataStatus: VerificationStatus;
  lastVerified: string;
  notes: string | null;
  command: AbilityDefinition | null;
  trait: AbilityDefinition | null;
  habits: AbilityDefinition[];
  affinities: Record<TroopType, AffinityLevel>;
  stats: DragonStats;
  tags: EffectTag[];
  fieldVerification: Partial<Record<string, FieldVerification>>;
  unresolvedQuestions: string[];
}

export interface OwnedDragon {
  dragonId: string;
  owned: boolean;
  collection: DragonCollectionProgress;
  starRank: number | null;
  reignLevel: number | null;
  notes: string;
  habitLevels: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | null>;
}

export interface DragonCollectionProgress {
  state: DragonCollectionState;
  shardsCurrent: number | null;
  shardsRequired: number | null;
}

export interface EvidenceSource {
  id: string;
  type:
    | 'official-page'
    | 'official-patch-note'
    | 'in-game-screenshot'
    | 'community-test'
    | 'manual-combat-log-observation';
  title: string;
  description?: string;
  url: string | null;
  capturedAt: string | null;
  language?: 'English';
  gameVersion: string | null;
  submittedBy: string | null;
  reviewedManually?: boolean;
  verificationStatus: VerificationStatus;
}

export interface ManualReviewRecord {
  id: string;
  dragonId: string;
  scope:
    | 'identity'
    | 'command'
    | 'trait'
    | 'habits'
    | 'affinities'
    | 'synergy-normalization'
    | 'combat-log-behavior';
  status: 'confirmed' | 'provisional' | 'needs-follow-up' | 'unreviewed';
  reviewedAt: string;
  reviewedAgainstGameBuild: string;
  reviewer: 'repository-owner';
  notes: string[];
  evidenceIds: string[];
}

export const RARITIES: DragonRarity[] = ['Legendary', 'Epic', 'Rare'];
export const BREEDS: DragonBreed[] = ['Champion', 'Hunter', 'Sentinel', 'Warrior'];
export const TROOP_TYPES: TroopType[] = [
  'Cavalry',
  'Shieldbearers',
  'Archers',
  'Spearmen',
  'Siege',
];
export const VERIFICATION_STATUSES: VerificationStatus[] = [
  'official-metadata-only',
  'community-unverified',
  'community-verified',
  'officially-confirmed',
];

export const FORMATION_POSITIONS: FormationPosition[] = [
  'left-flank',
  'vanguard',
  'right-flank',
];
