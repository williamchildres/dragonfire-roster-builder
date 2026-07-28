import type { SemanticRelationshipClass } from '../../semanticRelationships';
import type { SynergyTag } from '../../tags';
import type {
  EnrichedRelationshipCandidate,
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../../types';
import type {
  OpportunityCount,
  OpportunityPresence,
  ReliabilityIndependence,
  ReliabilityProgression,
  ReliabilityRollScope,
} from '../types';

export const FORMATION_RATING_V3_CONTRACT = 'formation-rating-v3' as const;

export type ReliabilityCalculationMethod =
  | 'guaranteed'
  | 'condition-proven'
  | 'one-supported-opportunity'
  | 'confirmed-cumulative'
  | 'shared-event'
  | 'best-supported-alternative'
  | 'mixed-use-lower-bound';

export type ReliabilityUnquantifiedReason =
  | 'conditional-opportunity'
  | 'unknown-opportunity'
  | 'probability-unknown'
  | 'missing-habit-level'
  | 'round-context-unresolved'
  | 'probability-context-unresolved'
  | 'conditional-deterministic-unproven'
  | 'joint-chance-behavior-unresolved'
  | 'conflicting-shared-event-probabilities'
  | 'no-supported-path';

export type ReliabilityQuantification =
  | {
      status: 'quantified';
      reliability: number;
      method: ReliabilityCalculationMethod;
      explanation: string;
    }
  | {
      status: 'unquantified';
      reason: ReliabilityUnquantifiedReason;
      conditionalProbabilities?: readonly number[];
      explanation: string;
    };

export interface ComponentReliabilityTrace {
  componentId: string;
  eventId?: string;
  probabilityVariantId?: string;
  opportunityPresence: OpportunityPresence;
  opportunityCount: OpportunityCount;
  rollScope: ReliabilityRollScope;
  independence: ReliabilityIndependence;
  scheduledRounds: readonly number[];
  resolvedProbabilities: readonly number[];
  quantification: ReliabilityQuantification;
}

export interface BindingReliabilityTrace {
  signalId: string;
  bindingClass?: string;
  selectedPathId?: string;
  selectedUseId?: string;
  pathIds: readonly string[];
  useIds: readonly string[];
  componentIds: readonly string[];
  eventIds: readonly string[];
  probabilityVariantIds: readonly string[];
  componentTraces: readonly ComponentReliabilityTrace[];
  alternativeQuantifications: readonly ReliabilityQuantification[];
  quantification: ReliabilityQuantification;
}

export interface RelationshipCandidateTrace {
  candidate: EnrichedRelationshipCandidate;
  provider: BindingReliabilityTrace;
  beneficiary: BindingReliabilityTrace;
  componentIds: readonly string[];
  eventIds: readonly string[];
  probabilityVariantIds: readonly string[];
  quantification: ReliabilityQuantification;
  selectionReason?: string;
}

export interface FormationRelationshipV3 {
  id: string;
  relationshipClass: SemanticRelationshipClass;
  providerDragonId: string;
  beneficiaryDragonId: string;
  semanticTag: SynergyTag;
  selectedProviderSignalId: string;
  selectedBeneficiarySignalId: string;
  selectedCandidateId: string;
  candidateTraces: readonly RelationshipCandidateTrace[];
  baseValue: number;
  v2ComparableBaseMarginalValue: number;
  quantification: ReliabilityQuantification;
  adjustedBaseValue: number;
  adjustedMarginalValue: number;
  redundancyRank: number;
  unquantifiedBasePotential: number;
  componentIds: readonly string[];
  eventIds: readonly string[];
  probabilityVariantIds: readonly string[];
  explanation: string;
}

export type ReliabilityCoverage = 'all-quantified' | 'partially-quantified' | 'none-quantified';

export type ReliabilityProgressionByDragonId = Readonly<
  Record<string, ReliabilityProgression | undefined>
>;

export interface EvaluateFormationV3Input {
  formation: SimpleFormation;
  progression: SimpleProgressionByDragonId;
  reliabilityProgression: ReliabilityProgressionByDragonId;
}
