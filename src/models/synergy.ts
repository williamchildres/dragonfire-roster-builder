import type { BattleContext, Dragon, EffectTag, FormationPosition, RankedValue, TargetScope, TroopType, VerificationStatus } from './dragon';

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
  matchKind?: SynergyTraceMatchKind | null;
  channel?: EffectChannel | null;
  modifierRole?: ModifierRole | null;
  targetSelectorSummary?: string | null;
  modifierSelfOnly?: boolean;
  availabilityContext?: string | null;
  modifierCapabilityId?: string | null;
  modifierCapabilityIds?: string[];
  matchedOutputCapabilityIds?: string[];
  sourceScopeResults?: CapabilityMatch[];
  interactionScope?: InteractionScope;
  damageScope?: DefensiveDamageScope | null;
  targetSelectionGroup?: {
    targetCount: number;
    eligibleRecipientDragonIds: string[];
    selectionUncertain: boolean;
    selection?: AbilityTarget['selection'];
    selectionStat?: DragonStatId | null;
    candidateStats?: Array<{
      dragonId: string;
      statId: DragonStatId;
      value: number | null;
    }>;
  };
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

export type EffectChannel = 'physical-damage' | 'tactical-damage' | 'fire-damage' | 'recovery' | 'stat' | 'damage-received' | 'status' | 'control';

export type DragonStatId = 'strength' | 'instinct' | 'intelligence' | 'initiative';

export type DefensiveDamageScope = 'all' | 'physical' | 'tactical' | 'fire';

export type InteractionScope = 'cross-dragon' | 'internal' | 'enemy-side' | 'targeting-fact';

export type SynergyTraceMatchKind =
  | 'outgoing-effect-amplification'
  | 'incoming-effect-amplification'
  | 'status-condition-enablement'
  | 'stat-scaling-support'
  | 'enemy-mitigation-reduction'
  | 'periodic-damage-amplification'
  | 'status-removal'
  | 'defensive-ally-support';

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

export type ModifierRole =
  | 'self-amplification'
  | 'ally-support'
  | 'recipient-side-amplification'
  | 'enemy-debuff';

export type CapabilityAvailability =
  | 'canonical-base'
  | 'canonical-locked'
  | 'observed-available'
  | 'observed-unavailable'
  | 'user-available'
  | 'user-locked'
  | 'unknown';

export interface CapabilityAvailabilityContext {
  canonical: CapabilityAvailability;
  observedAccount: CapabilityAvailability;
  userRoster: CapabilityAvailability;
  reportLabel: string;
  notes: string[];
}

export type CapabilityTargetSide = 'ally' | 'enemy' | 'self';

export interface EffectCondition {
  id: string;
  label: string;
  description: string;
  evidenceIds: string[];
  unresolved: boolean;
  kind?: string;
  subject?: string | null;
  comparison?: string | null;
  thresholdPercent?: number | null;
}

export interface AbilityTarget {
  side: CapabilityTargetSide;
  scope: TargetScope | FormationPosition | 'any-lane' | 'eligible-ally' | 'unknown';
  position: FormationPosition | null;
  count: number | null;
  includesCaster: boolean | null;
  selection:
    | 'self'
    | 'specific-position'
    | 'any'
    | 'adjacent'
    | 'eligible'
    | 'highest-stat'
    | 'one-eligible-adjacent'
    | 'all-matching-condition'
    | 'unknown';
  selectionStat?: DragonStatId | null;
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
  dependencies: CapabilityDependency[];
  currentlyAvailable: boolean;
  futureAvailable: boolean;
  availability: CapabilityAvailabilityContext;
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
  role: ModifierRole;
  operation: 'increase' | 'decrease';
  value: number | null;
  rankedValues: RankedValue[];
  unit: 'percent' | 'flat' | 'stack' | 'unknown';
  damageScope: DefensiveDamageScope | null;
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
  availability: CapabilityAvailabilityContext;
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
  matchKind: SynergyTraceMatchKind;
  channel: EffectChannel;
  modifierCapabilityId: string;
  matchedOutputCapabilityIds: string[];
  sourceScopeResults: CapabilityMatch[];
}

export type CapabilityDependencyType =
  | 'requires-self-status'
  | 'requires-any-enemy-status'
  | 'requires-target-status'
  | 'scales-with-stat'
  | 'mitigated-by-target-stat'
  | 'target-prioritizes-channel'
  | 'target-prioritizes-status'
  | 'target-prioritizes-lowest-troops'
  | 'repeat-per-matching-enemy'
  | 'previous-round-event';

export interface CapabilityDependency {
  type: CapabilityDependencyType;
  statusId?: string;
  statId?: DragonStatId;
  channel?: EffectChannel;
  eventId?: string;
  multiplier?: number;
  notes: string[];
}

export interface StatusOutputCapability {
  id: string;
  dragonId: string;
  abilityId: string;
  abilityName: string;
  statusId: string;
  targetSide: CapabilityTargetSide;
  targetSelector: AbilityTarget;
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  requiredHabitLevel: number | null;
  chanceFixed: number | null;
  chanceByHabitLevel: RankedValue[];
  durationRounds: number | null;
  untilEndOfRound: boolean;
  untilEndOfCombat: boolean;
  conditions: EffectCondition[];
  currentlyAvailable: boolean;
  futureAvailable: boolean;
  availability: CapabilityAvailabilityContext;
  directlyVerified: boolean;
  evidenceIds: string[];
}

export interface PeriodicDamageDefinition {
  statusId: string;
  dragonId: string;
  abilityId: string;
  channel: EffectChannel;
  damageRateFixed: number | null;
  damageRateByHabitLevel: RankedValue[];
  ticksEachRound: boolean;
  durationRounds: number | null;
  scalingStat: DragonStatId | null;
  mitigationStat: DragonStatId | null;
  evidenceIds: string[];
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
