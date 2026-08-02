import type { EffectTag, FormationPosition } from '../models/dragon';
import type { SynergyTag } from './tags';

export type SimpleFriendlyScope = 'formation' | 'adjacent' | 'self';
export type SignalConfidence = 'verified' | 'provisional';
export type DamageScope = 'non-basic-attack';
export type TargetingStat = 'strength' | 'intelligence' | 'instinct' | 'initiative';

export type FriendlyRecipientSelector =
  | {
      kind: 'highest-stat';
      stat: TargetingStat;
      excludeSelf: boolean;
    }
  | {
      kind: 'position-priority';
      preferredPosition: FormationPosition;
      allowSelf: boolean;
    }
  | {
      kind: 'unresolved-group';
      recipientCount: number;
      includeSelf: boolean;
    }
  | {
      kind: 'adjacent-group';
      recipientCount: number;
      includeSelf: boolean;
    }
  | {
      kind: 'capability-priority-one';
      priorityTag: SynergyTag;
      recipientCount: 1;
      includeSelf: boolean;
      selectionGroupId: string;
    };

export type TargetingResolutionStatus = 'resolved' | 'unresolved';
export type TargetingUnresolvedReason =
  | 'multiple-priority-candidates'
  | 'multiple-fallback-candidates'
  | 'missing-capability-data';

export interface TargetingResolution {
  selectorKind: FriendlyRecipientSelector['kind'];
  selectionGroupId: string;
  status: TargetingResolutionStatus;
  selectedRecipientId?: string;
  eligibleRecipientIds: string[];
  priorityRecipientIds: string[];
  fallbackRecipientIds: string[];
  recipientCount: number;
  unresolvedReason?: TargetingUnresolvedReason;
  abilityIds: string[];
  signalIds: string[];
}

export interface ProgressionRequirement {
  minimumStarRank?: number;
  minimumDragonLevel?: number;
}

export interface DragonProgression {
  starRank?: number | null;
  dragonLevel?: number | null;
  combatStats?: Partial<Record<TargetingStat, number | null>>;
}

export interface SynergySignal {
  id: string;
  tag: SynergyTag;
  tags?: SynergyTag[];
  scalesWith?: SynergyTag[];
  damageScope?: DamageScope;
  abilityId: string;
  abilityName: string;
  description: string;
  publicLabel?: string;
  unlock?: ProgressionRequirement;
  requiredSelfPosition?: FormationPosition;
  requiredRecipientPosition?: FormationPosition;
  recipientSelector?: FriendlyRecipientSelector;
  nonScoring?: boolean;
  supportOnly?: boolean;
  friendlyScope?: SimpleFriendlyScope;
  summaryAbilityId?: string;
  summaryUnlockLabel?: string;
  summaryHiddenEffectTags?: EffectTag[];
  confidence: SignalConfidence;
}

export interface PositionClaim {
  id: string;
  abilityId: string;
  abilityName: string;
  requiredPosition: FormationPosition;
  unlock?: ProgressionRequirement;
  description: string;
  confidence: SignalConfidence;
}

export interface DragonSynergyProfile {
  dragonId: string;
  dragonName: string;
  outputs: SynergySignal[];
  supports: SynergySignal[];
  benefitsFrom: SynergySignal[];
  positionClaims: PositionClaim[];
}

export type SimpleFormation = Record<FormationPosition, string | null>;
export type SimpleProgressionByDragonId = Record<string, DragonProgression | undefined>;

export type SimpleSynergyResultKind =
  | 'setup-payoff'
  | 'amplifier-output'
  | 'missing-enabler'
  | 'position-blocked'
  | 'position-conflict'
  | 'progression-locked';

export interface SimpleSynergyResult {
  id: string;
  kind: SimpleSynergyResultKind;
  tag?: SynergyTag;
  dragonIds: string[];
  abilityIds: string[];
  explanation: string;
  unlock?: ProgressionRequirement;
}

export interface EvaluateFormationInput {
  formation: SimpleFormation;
  progression: SimpleProgressionByDragonId;
  profiles: DragonSynergyProfile[];
}

export interface EvaluateFormationResult {
  results: SimpleSynergyResult[];
  targetingResolutions: TargetingResolution[];
}

export type SynergySignalCategory = 'output' | 'support' | 'benefits-from';

export interface EnrichedRelationshipCandidate {
  id: string;
  resultKind: 'setup-payoff' | 'amplifier-output';
  providerDragonId: string;
  providerSignalId: string;
  providerSignalCategory: SynergySignalCategory;
  providerAbilityId: string;
  beneficiaryDragonId: string;
  beneficiarySignalId: string;
  beneficiarySignalCategory: SynergySignalCategory;
  beneficiaryAbilityId: string;
  semanticTag: SynergyTag;
  abilityIds: string[];
  explanation: string;
}

export interface EvaluateFormationCandidatesResult {
  candidates: EnrichedRelationshipCandidate[];
  targetingResolutions: TargetingResolution[];
}
