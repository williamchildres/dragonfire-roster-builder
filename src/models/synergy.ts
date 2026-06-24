import type { BattleContext, Dragon, EffectTag, FormationPosition, TroopType, VerificationStatus } from './dragon';

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
