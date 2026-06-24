import type { BattleContext, Dragon, EffectTag, FormationPosition, TargetScope, TroopType, VerificationStatus } from './dragon';

export type DataConfidence = 'none' | 'low' | 'medium' | 'high';

export interface ExplanationItem {
  dragonIds: string[];
  tags: EffectTag[];
  ruleId: string;
  title: string;
  description: string;
  confidence: DataConfidence;
}

export interface MissingDataItem {
  dragonId: string;
  fields: Array<'command' | 'habits' | 'affinities' | 'stats' | 'tags'>;
}

export interface SynergyRule {
  id: string;
  kind: 'positive' | 'conflict';
  title: string;
  description: string;
  requiresTags: EffectTag[];
  evidenceStatus: VerificationStatus;
  nonStacking?: boolean;
}

export interface SynergyResult {
  score: number | null;
  confidence: DataConfidence;
  positives: ExplanationItem[];
  conflicts: ExplanationItem[];
  positionRequirements: ExplanationItem[];
  unmetRequirements: ExplanationItem[];
  unresolvedAssumptions: string[];
  warnings: string[];
  missingData: MissingDataItem[];
  traces: SynergyTrace[];
}

export interface BreedDistribution {
  breed: Dragon['breed'];
  count: number;
}

export type FormationAnalysisInput = Record<FormationPosition, string | null>;

export interface AffinityCoverage {
  troopType: TroopType;
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
}

export type TraceStatus =
  | 'active'
  | 'potential'
  | 'inactive'
  | 'blocked'
  | 'unknown'
  | 'not-applicable';

export type TraceConfidence = 'confirmed' | 'high' | 'medium' | 'low' | 'unresolved';

export interface RequirementTrace {
  id: string;
  label: string;
  expected: string;
  actual: string | null;
  satisfied: boolean | null;
  evidenceIds: string[];
  notes: string[];
}

export interface SynergyTrace {
  id: string;
  ruleId: string;
  status: TraceStatus;
  confidence: TraceConfidence;
  sourceDragonId: string;
  sourceAbilityId: string | null;
  recipientDragonId: string | null;
  recipientAbilityId: string | null;
  title: string;
  explanation: string;
  requirements: RequirementTrace[];
  matchedFacts: string[];
  effects: string[];
  conflicts: string[];
  assumptions: string[];
  unresolvedQuestions: string[];
  sourceEvidenceIds: string[];
  recipientEvidenceIds: string[];
  providedEffectType?: string | null;
  recipientModifierType?: string | null;
  recipientModifierAbilityId?: string | null;
  recipientModifierValue?: number | null;
  combatLogConfirmed?: boolean;
  exactResultKnown?: boolean;
  exactResultUnknownReason?: string | null;
  matchKind?: 'outgoing-effect-amplification' | 'incoming-effect-amplification' | null;
  channel?: EffectChannel | null;
  modifierCapabilityId?: string | null;
  matchedOutputCapabilityIds?: string[];
  sourceScopeResults?: CapabilityMatch[];
}

export interface RecipientAmplificationTrace {
  providerDragonId: string;
  providerAbilityId: string;
  recipientDragonId: string;
  recipientModifierAbilityId: string;
  providedEffectType: string;
  recipientModifierType: string;
  modifierValue: number | null;
  requirements: RequirementTrace[];
  status: TraceStatus;
  confidence: TraceConfidence;
}

export type EffectChannel = 'physical-damage' | 'tactical-damage' | 'fire-damage' | 'recovery';

export type CapabilitySourceKind = 'basic-attack' | 'command' | 'trait' | 'habit';

export type CapabilitySourceScope =
  | 'basic-attacks'
  | 'commands'
  | 'habits'
  | 'commands-and-habits'
  | 'non-basic-attacks'
  | 'all-qualifying-sources'
  | 'unknown';

export type ModifierDirection = 'dealt' | 'received';

export type CapabilityTargetSide = 'ally' | 'enemy' | 'self';

export interface EffectCondition {
  id: string;
  label: string;
  description: string;
  evidenceIds: string[];
  unresolved: boolean;
}

export interface AbilityTarget {
  side: CapabilityTargetSide;
  scope: TargetScope | FormationPosition | 'any-lane' | 'eligible-ally' | 'unknown';
  position: FormationPosition | null;
  count: number | null;
  includesCaster: boolean | null;
  selection: 'self' | 'specific-position' | 'any' | 'adjacent' | 'eligible' | 'unknown';
}

export interface RequirementDefinition {
  id: string;
  label: string;
  kind:
    | 'provider-position'
    | 'recipient-position'
    | 'dragon-level'
    | 'star-rank'
    | 'habit-level'
    | 'collection'
    | 'targeting'
    | 'source-scope'
    | 'condition';
  expected: string;
  evidenceIds: string[];
}

export interface OutputCapability {
  id: string;
  dragonId: string;
  abilityId: string | null;
  abilityName: string;
  label: string;
  channel: EffectChannel;
  sourceKind: CapabilitySourceKind;
  sourceScope: CapabilitySourceScope;
  targetSide: CapabilityTargetSide;
  targetCount: number | null;
  targetScope: string | null;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  requiredHabitLevel: number | null;
  conditional: boolean;
  conditions: EffectCondition[];
  currentlyAvailable: boolean;
  futureAvailable: boolean;
  directlyVerified: boolean;
  combatLogConfirmed: boolean;
  confidence: TraceConfidence;
  evidenceIds: string[];
}

export interface ModifierCapability {
  id: string;
  dragonId: string;
  abilityId: string;
  abilityName: string;
  label: string;
  channel: EffectChannel;
  direction: ModifierDirection;
  operation: 'increase' | 'decrease';
  value: number | null;
  unit: 'percent' | 'flat' | 'stack' | 'unknown';
  sourceScope: CapabilitySourceScope;
  targetSelector: AbilityTarget;
  providerRequirements: RequirementDefinition[];
  recipientRequirements: RequirementDefinition[];
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  requiredHabitLevel: number | null;
  conditional: boolean;
  conditions: EffectCondition[];
  stackMaximum: number | null;
  valuePerStack: number | null;
  currentlyAvailable: boolean;
  futureAvailable: boolean;
  directlyVerified: boolean;
  combatLogConfirmed: boolean;
  confidence: TraceConfidence;
  evidenceIds: string[];
}

export interface CapabilityMatch {
  modifierCapabilityId: string;
  outputCapabilityId: string;
  channel: EffectChannel;
  sourceScopeCompatible: boolean;
  requirements: RequirementTrace[];
  status: TraceStatus;
  confidence: TraceConfidence;
}

export interface AmplificationSynergyTrace extends SynergyTrace {
  matchKind: 'outgoing-effect-amplification' | 'incoming-effect-amplification';
  channel: EffectChannel;
  modifierCapabilityId: string;
  matchedOutputCapabilityIds: string[];
  sourceScopeResults: CapabilityMatch[];
}

export interface DragonEffectProfile {
  dragonId: string;
  producedChannels: Array<{
    channel: EffectChannel;
    capabilityIds: string[];
    currentlyAvailable: boolean;
    futureAvailable: boolean;
    confidence: TraceConfidence;
  }>;
  outgoingBuffChannels: Array<{
    channel: EffectChannel;
    modifierCapabilityIds: string[];
  }>;
  incomingAmplifierChannels: Array<{
    channel: EffectChannel;
    modifierCapabilityIds: string[];
  }>;
  primaryDamageChannel: EffectChannel | null;
  primaryDamageChannelBasis: 'manual-review' | 'verified-basic-attack-and-kit' | 'derived' | 'unknown';
}

export interface FormationAuditEntry {
  formation: FormationAnalysisInput;
  traces: SynergyTrace[];
  countsByStatus: Record<TraceStatus, number>;
}

export interface SynergyAuditExport {
  format: 'dragonfire-synergy-audit';
  schemaVersion: 1;
  databaseVersion: string;
  gameBuild: string;
  generatedAt: string;
  formation: {
    leftFlank: string | null;
    vanguard: string | null;
    rightFlank: string | null;
  };
  userProgression: Record<string, unknown>;
  battleContext: BattleContext;
  traces: SynergyTrace[];
}
