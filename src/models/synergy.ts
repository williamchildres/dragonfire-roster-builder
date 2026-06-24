import type { Dragon, EffectTag, FormationPosition, TroopType, VerificationStatus } from './dragon';

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
