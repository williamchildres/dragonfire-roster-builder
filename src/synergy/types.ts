import type { FormationPosition } from '../models/dragon';
import type { SynergyTag } from './tags';

export type SimpleFriendlyScope = 'formation' | 'adjacent' | 'self';
export type SignalConfidence = 'verified' | 'provisional';

export interface ProgressionRequirement {
  minimumStarRank?: number;
  minimumDragonLevel?: number;
  minimumHabitLevel?: number;
}

export interface DragonProgression {
  starRank?: number | null;
  dragonLevel?: number | null;
  habitLevel?: number | null;
}

export interface SynergySignal {
  id: string;
  tag: SynergyTag;
  abilityId: string;
  abilityName: string;
  description: string;
  unlock?: ProgressionRequirement;
  requiredSelfPosition?: FormationPosition;
  friendlyScope?: SimpleFriendlyScope;
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
}
