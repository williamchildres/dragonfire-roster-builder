import type { AbilityKind, HabitLevel } from '../../models/dragon';

export const FORMATION_RELIABILITY_CONTRACT_VERSION = 1 as const;

export type ReliabilityClass = 'guaranteed' | 'conditional-deterministic' | 'chance' | 'unknown';

export type ReliabilityComponentId = `${string}:${string}`;

export type FixedReliabilityProbability = {
  kind: 'fixed';
  value: number;
};

export type HabitLevelReliabilityProbability = {
  kind: 'habit-level';
  habitAbilityId: string;
  byLevel: Record<HabitLevel, number>;
};

export type HabitOverrideReliabilityProbability = {
  kind: 'habit-override';
  habitAbilityId: string;
  base: number;
  byLevel: Record<HabitLevel, number>;
};

export type RoundReliabilityProbability =
  | FixedReliabilityProbability
  | HabitLevelReliabilityProbability
  | HabitOverrideReliabilityProbability
  | UnknownReliabilityProbability;

export type RoundSpecificReliabilityProbability = {
  kind: 'round-specific';
  byRound: Readonly<Record<number, RoundReliabilityProbability>>;
};

export type ConcreteReliabilityProbability =
  | FixedReliabilityProbability
  | HabitLevelReliabilityProbability
  | HabitOverrideReliabilityProbability
  | RoundSpecificReliabilityProbability
  | UnknownReliabilityProbability;

export type MultipleReliabilityProbability = {
  kind: 'variants';
  variants: ReadonlyArray<{
    id: string;
    probability: ConcreteReliabilityProbability;
  }>;
};

export type UnknownReliabilityProbability = {
  kind: 'unknown';
  reason: string;
};

export type ReliabilityProbability =
  ConcreteReliabilityProbability | MultipleReliabilityProbability;

export type OpportunityPresence =
  'guaranteed-at-least-one' | 'conditional' | 'unknown' | 'not-applicable';

export type OpportunityCount =
  | { kind: 'exact'; value: number }
  | { kind: 'scheduled-maximum'; maximum: number }
  | { kind: 'battle-length-dependent' }
  | { kind: 'ability-activation-dependent'; sourceEvent: string }
  | { kind: 'condition-count-dependent'; condition: string }
  | { kind: 'unresolved'; reason: string }
  | { kind: 'not-applicable' };

export type ReliabilityTiming =
  | { kind: 'start-of-combat' }
  | { kind: 'scheduled-rounds'; rounds: readonly number[] }
  | { kind: 'each-round' }
  | { kind: 'after-event'; sourceEvent: string }
  | { kind: 'conditional-event'; condition: string }
  | { kind: 'unresolved'; reason: string };

export type ReliabilityRollScope =
  | 'shared'
  | 'per-target'
  | 'per-effect'
  | 'per-target-and-effect'
  | 'separate-stat-checks'
  | 'unresolved'
  | 'not-applicable';

export type ReliabilityIndependence =
  'confirmed' | 'reasonable-model-assumption' | 'unknown' | 'contradicted' | 'not-applicable';

export type ReliabilityVerificationStatus = 'verified' | 'provisional' | 'unverified';

export interface ReliabilityEvidence {
  verificationStatus: ReliabilityVerificationStatus;
  evidenceIds: readonly string[];
  unresolvedQuestions: readonly string[];
  reviewNote?: string;
}

export interface ReliabilityUnlockRequirement {
  minimumStarRank?: number;
  minimumDragonLevel?: number;
}

export interface ReliabilityTargetFacts {
  count?: number;
  separatePerTarget?: boolean;
  separatePerEffect?: boolean;
}

/**
 * Production-owned facts about one semantic activation component.
 * Duration and target facts are evidence for future explanations only.
 */
export interface AbilityReliabilityComponent {
  id: ReliabilityComponentId;
  sourceAbilityId: string;
  sourceAbilityKind: AbilityKind;
  reliabilityClass: ReliabilityClass;
  probability?: ReliabilityProbability;
  opportunityPresence: OpportunityPresence;
  timing: ReliabilityTiming;
  opportunityCount: OpportunityCount;
  rollScope: ReliabilityRollScope;
  targetFacts?: ReliabilityTargetFacts;
  independence: ReliabilityIndependence;
  durationRounds?: number;
  unlock?: ReliabilityUnlockRequirement;
  evidence: ReliabilityEvidence;
}

/**
 * Components grouped in one event share activation identity and must not
 * receive duplicate activation credit merely because they provide many tags.
 */
export interface ReliabilityEventRequirement {
  eventId: string;
  componentReferences: readonly ReliabilityComponentReference[];
}

export interface ReliabilityComponentReference {
  componentId: ReliabilityComponentId;
  probabilityVariantId?: string;
}

/**
 * Events inside one path are jointly required. Multiple paths on a binding
 * are alternatives.
 */
export interface SignalReliabilityPath {
  pathId: string;
  appliesWhen?: ReliabilityPathApplicability;
  events: readonly ReliabilityEventRequirement[];
}

export interface ReliabilityPathApplicability {
  kind: 'probability-context';
  id: string;
}

export type ReliabilityBindingClass =
  'guaranteed' | 'conditional-deterministic' | 'chance' | 'resolved-mixed';

/**
 * Uses on a resolved mixed binding are simultaneous semantic uses of the
 * matched relationship. Paths inside one use remain alternatives.
 */
export interface SignalReliabilityUse {
  useId: string;
  paths: readonly SignalReliabilityPath[];
}

export type SignalReliabilityBinding =
  | {
      status: 'resolved';
      signalId: string;
      bindingClass?: Exclude<ReliabilityBindingClass, 'resolved-mixed'>;
      paths: readonly SignalReliabilityPath[];
    }
  | {
      status: 'resolved';
      signalId: string;
      bindingClass: 'resolved-mixed';
      uses: readonly SignalReliabilityUse[];
    }
  | {
      status: 'unresolved-mixed';
      signalId: string;
      candidatePaths: readonly SignalReliabilityPath[];
      unresolvedReason: string;
    };

export type ReliabilityValidationMode = 'contract' | 'full-migration';

export interface ReliabilityAbilityReference {
  abilityId: string;
  kind: AbilityKind;
  dragonId: string;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  evidenceIds: readonly string[];
}

export interface ReliabilityContractInput {
  components: readonly AbilityReliabilityComponent[];
  bindings: readonly SignalReliabilityBinding[];
  scoringSignalIds: readonly string[];
  /**
   * Optional canonical ability facts let pure validation confirm that a
   * probability source exists and is a Habit.
   */
  abilityCatalog?: readonly ReliabilityAbilityReference[];
}

export interface ReliabilityValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ReliabilityProgression {
  starRank: number | null;
  dragonLevel: number | null;
  /**
   * Only unlocked Habits are present. A null level is explicit missing data;
   * it never defaults to Habit Level 1 in this adapter.
   */
  activeHabitLevels: Readonly<Record<string, HabitLevel | null>>;
}

export interface ProbabilityResolutionContext {
  round?: number | null;
}
