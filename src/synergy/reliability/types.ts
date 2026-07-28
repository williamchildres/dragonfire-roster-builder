import type { HabitLevel } from '../../models/dragon';

export const FORMATION_RELIABILITY_CONTRACT_VERSION = 1 as const;

export type ReliabilityClass = 'guaranteed' | 'conditional-deterministic' | 'chance' | 'unknown';

export type ReliabilityComponentId = `${string}:${string}`;

export type FixedReliabilityProbability = {
  kind: 'fixed';
  value: number;
};

export type HabitLevelReliabilityProbability = {
  kind: 'habit-level';
  byLevel: Record<HabitLevel, number>;
};

export type RoundSpecificReliabilityProbability = {
  kind: 'round-specific';
  byRound: Record<number, number>;
};

export type ConcreteReliabilityProbability =
  | FixedReliabilityProbability
  | HabitLevelReliabilityProbability
  | RoundSpecificReliabilityProbability;

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
  ConcreteReliabilityProbability | MultipleReliabilityProbability | UnknownReliabilityProbability;

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
  componentIds: readonly ReliabilityComponentId[];
}

/**
 * Events inside one path are jointly required. Multiple paths on a binding
 * are alternatives.
 */
export interface SignalReliabilityPath {
  pathId: string;
  events: readonly ReliabilityEventRequirement[];
}

export type SignalReliabilityBinding =
  | {
      status: 'resolved';
      signalId: string;
      paths: readonly SignalReliabilityPath[];
    }
  | {
      status: 'unresolved-mixed';
      signalId: string;
      candidatePaths: readonly SignalReliabilityPath[];
      unresolvedReason: string;
    };

export type ReliabilityValidationMode = 'contract' | 'full-migration';

export interface ReliabilityContractInput {
  components: readonly AbilityReliabilityComponent[];
  bindings: readonly SignalReliabilityBinding[];
  scoringSignalIds: readonly string[];
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
  habitLevel?: HabitLevel | null;
  round?: number | null;
  variantId?: string | null;
}
