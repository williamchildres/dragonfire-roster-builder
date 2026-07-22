import type { DragonRarity } from '../models/dragon';
import type { FormationFinding } from '../services/formationFindings';
import type { FormationArrangement } from '../services/formationPlacementComparison';
import type { FormationRatingTier } from '../services/formationRating';
import type { SemanticRelationship } from '../synergy/semanticRelationships';
import type {
  EstimatedDragonPower,
  EstimatedPowerConfidence,
} from '../power/estimatedDragonPower';

export const ROSTER_OPTIMIZER_CONTRACT_VERSION = 3 as const;
export const ROSTER_OPTIMIZER_RATING_CONTRACT = 'formation-rating-v2' as const;
export const OPTIMIZER_FORMATION_COUNT = 10;
export const OPTIMIZER_DRAGON_COUNT = 30;
export const OPTIMIZER_WAVE_FORMATION_COUNT = 5;
export const OPTIMIZER_WAVE_DRAGON_COUNT = 15;

export type RosterOptimizerStrategy =
  | 'power-aware-primary-five-backup-five'
  | 'primary-five-backup-five'
  | 'best-ten-overall';

export type OptimizerWave = 'primary' | 'backup';

export interface OptimizerRosterDragon {
  dragonId: string;
  rarity: DragonRarity;
  starRank: number | null;
  dragonLevel: number | null;
}

export interface RosterRarityPriority {
  legendaryCount: number;
  epicCount: number;
  rareCount: number;
}

export interface RosterOptimizerObjective {
  rarityPriority: RosterRarityPriority;
  totalRating: number;
  minimumRating: number;
  ascendingRatingVector: number[];
  totalRelationshipValue: number;
  totalActiveRelationships: number;
  stableSolutionKey: string;
}

export type OptimizerWaveObjective = RosterOptimizerObjective;

export interface PrimaryBackupOptimizerObjective {
  strategy: 'primary-five-backup-five';
  primary: OptimizerWaveObjective;
  backup: OptimizerWaveObjective;
  combinedTotalRating: number;
  combinedRelationshipValue: number;
  combinedActiveRelationships: number;
  stableSolutionKey: string;
}

export interface PowerAwareWaveObjective extends RosterOptimizerObjective {
  totalEstimatedPower: number;
}

export interface PowerAwarePrimaryBackupOptimizerObjective {
  strategy: 'power-aware-primary-five-backup-five';
  primary: PowerAwareWaveObjective;
  backup: PowerAwareWaveObjective;
  combinedTotalRating: number;
  combinedEstimatedPower: number;
  combinedRelationshipValue: number;
  combinedActiveRelationships: number;
  stableSolutionKey: string;
}

export interface OptimizerFormationCandidate {
  stableCandidateKey: string;
  dragonIds: [string, string, string];
  dragonMask: bigint;
  arrangement: FormationArrangement;
  tiedBestArrangements: FormationArrangement[];
  rating: number;
  tier: FormationRatingTier;
  activeSynergyScore: number;
  placementScore: number;
  activeRelationshipValue: number;
  activeRelationshipCount: number;
  participatingDragonCount: number;
  relationships: SemanticRelationship[];
  strengths: FormationFinding[];
  gaps: FormationFinding[];
  progressionSnapshot: Record<
    string,
    { starRank?: number | null; dragonLevel?: number | null }
  >;
  /** Internal integer units (Estimated Power / 10), populated once per Power-Aware request. */
  estimatedPowerUnits?: number;
}

export interface OptimizedFormation extends Omit<OptimizerFormationCandidate, 'dragonMask'> {
  rank: number;
  wave?: OptimizerWave;
  waveRank?: number;
}

export interface OptimizerPhaseTimings {
  modelConstructionMs: number;
  primaryPowerMs: number;
  primaryRarityMs: number;
  primaryQualityMs: number;
  backupPowerMs: number;
  backupRarityMs: number;
  backupQualityMs: number;
  stableKeyMs: number;
}

export interface OptimizerPhaseObjectiveDiagnostic {
  stage: string;
  wave: OptimizerWave;
  kind: 'scalar' | 'histogram' | 'stable';
  solverPass: number;
  status: 'optimal';
  chunkStart?: number;
  chunkEnd?: number;
  rawObjective: number;
  reconstructedObjective: number;
  rawObjectiveDelta: number;
  maximumIntegralityResidual: number;
  maximumConstraintResidual: number;
  mipGap: number | null;
  exactOptimumCertified: boolean;
  certificationDirection: 'maximize' | 'minimize' | null;
  certificationBound: number | null;
  certificationStatus: 'not-required' | 'infeasible';
  certificationSolverPass: number | null;
}

export interface OptimizerNumericalExactnessDiagnostics {
  integralityTolerance: number;
  maximumIntegralityResidual: number;
  maximumConstraintResidual: number;
  maximumRawObjectiveDelta: number;
  phaseObjectives: OptimizerPhaseObjectiveDiagnostic[];
  fixedPhasesValidated: boolean;
}

export interface OptimizerSearchDiagnostics {
  optimal: boolean;
  eligibleDragonCount: number;
  candidateCount: number;
  selectedFormationCount: number;
  nodesVisited: number;
  branchesPruned: number;
  cacheEntries?: number;
  solverPasses?: number;
  candidateGenerationMs: number;
  solverMs: number;
  totalMs: number;
  phaseTimings?: OptimizerPhaseTimings;
  numericalExactness?: OptimizerNumericalExactnessDiagnostics;
}

export type RarityCountRecord = Record<DragonRarity, number>;
export type TierDistribution = Record<FormationRatingTier, number>;

export interface OptimizerCollectionSummary {
  totalRating: number;
  averageRating: number;
  minimumRating: number;
  rarityCounts: RarityCountRecord;
  tierDistribution: TierDistribution;
  totalRelationshipValue: number;
  totalActiveRelationships: number;
}

export interface BestTenOverallOptimizationResult {
  contractVersion: 3;
  strategy: 'best-ten-overall';
  optimal: true;
  rosterFingerprint: string;
  requestFingerprint: string;
  formations: OptimizedFormation[];
  collection: OptimizerCollectionSummary;
  usedDragonIds: string[];
  unusedDragonIds: string[];
  usedRarityCounts: RarityCountRecord;
  unusedRarityCounts: RarityCountRecord;
  objective: RosterOptimizerObjective;
  averageRating: number;
  minimumRating: number;
  tierDistribution: TierDistribution;
  diagnostics: OptimizerSearchDiagnostics;
  /** Stable semantic identity retained from the v0.12.0 allocation contract. */
  optimizerSolutionHash: string;
  /** Strategy-aware identity for the complete v2 result. */
  optimizerResultHash: string;
}

export interface OptimizerWaveResult {
  kind: OptimizerWave;
  label: string;
  formations: OptimizedFormation[];
  usedDragonIds: string[];
  rarityCounts: RarityCountRecord;
  totalRating: number;
  averageRating: number;
  minimumRating: number;
  totalRelationshipValue: number;
  totalActiveRelationships: number;
  tierDistribution: TierDistribution;
  objective: OptimizerWaveObjective;
}

export interface PrimaryBackupOptimizationResult {
  contractVersion: 3;
  strategy: 'primary-five-backup-five';
  optimal: true;
  rosterFingerprint: string;
  requestFingerprint: string;
  primary: OptimizerWaveResult;
  backup: OptimizerWaveResult;
  formations: OptimizedFormation[];
  usedDragonIds: string[];
  unusedDragonIds: string[];
  unusedRarityCounts: RarityCountRecord;
  combined: OptimizerCollectionSummary;
  objective: PrimaryBackupOptimizerObjective;
  diagnostics: OptimizerSearchDiagnostics;
  optimizerSolutionHash: string;
  optimizerResultHash: string;
}

export type PowerConfidenceCountRecord = Record<EstimatedPowerConfidence, number>;

export interface PowerAwareOptimizedFormation extends OptimizedFormation {
  estimatedPower: number;
  dragonPowerEstimates: Record<string, EstimatedDragonPower>;
  powerConfidenceCounts: PowerConfidenceCountRecord;
}

export interface PowerAwareOptimizerWaveResult extends Omit<OptimizerWaveResult, 'formations' | 'objective'> {
  formations: PowerAwareOptimizedFormation[];
  totalEstimatedPower: number;
  averageEstimatedPowerPerDragon: number;
  minimumFormationEstimatedPower: number;
  maximumFormationEstimatedPower: number;
  powerConfidenceCounts: PowerConfidenceCountRecord;
  objective: PowerAwareWaveObjective;
}

export interface PowerAwarePrimaryBackupOptimizationResult {
  contractVersion: 3;
  strategy: 'power-aware-primary-five-backup-five';
  optimal: true;
  rosterFingerprint: string;
  requestFingerprint: string;
  estimatedPowerModelVersion: string;
  estimatedPowerModelHash: string;
  estimatedPowerObservationHash: string;
  estimatedPowerByDragonId: Record<string, EstimatedDragonPower>;
  primary: PowerAwareOptimizerWaveResult;
  backup: PowerAwareOptimizerWaveResult;
  formations: PowerAwareOptimizedFormation[];
  usedDragonIds: string[];
  unusedDragonIds: string[];
  unusedRarityCounts: RarityCountRecord;
  combined: OptimizerCollectionSummary & {
    totalEstimatedPower: number;
    powerConfidenceCounts: PowerConfidenceCountRecord;
  };
  objective: PowerAwarePrimaryBackupOptimizerObjective;
  diagnostics: OptimizerSearchDiagnostics;
  optimizerSolutionHash: string;
  optimizerResultHash: string;
}

export type RosterOptimizationResult =
  | BestTenOverallOptimizationResult
  | PrimaryBackupOptimizationResult
  | PowerAwarePrimaryBackupOptimizationResult;

export interface RosterOptimizationUnavailable {
  contractVersion: 3;
  strategy: RosterOptimizerStrategy;
  optimal: false;
  status: 'unavailable';
  reason: 'insufficient-eligible-dragons';
  eligibleDragonCount: number;
  requiredDragonCount: number;
  additionalDragonsNeeded: number;
  rosterFingerprint: string;
  requestFingerprint: string;
}

export type RosterOptimizerResponse =
  | RosterOptimizationResult
  | RosterOptimizationUnavailable;

export interface RosterOptimizerSolverResult {
  optimal: true;
  selectedCandidates: OptimizerFormationCandidate[];
  objective: RosterOptimizerObjective;
  nodesVisited: number;
  branchesPruned: number;
  cacheEntries: number;
}

export interface PrimaryBackupOptimizerSolverResult {
  optimal: true;
  primaryCandidates: OptimizerFormationCandidate[];
  backupCandidates: OptimizerFormationCandidate[];
  objective: PrimaryBackupOptimizerObjective;
  nodesVisited: number;
  branchesPruned: number;
  cacheEntries: number;
  solverPasses: number;
  phaseTimings: OptimizerPhaseTimings;
  numericalExactness?: OptimizerNumericalExactnessDiagnostics;
}

export interface PowerAwarePrimaryBackupOptimizerSolverResult extends Omit<PrimaryBackupOptimizerSolverResult, 'objective'> {
  objective: PowerAwarePrimaryBackupOptimizerObjective;
}

export class RosterOptimizerCancelledError extends Error {
  constructor() {
    super('Roster optimization was cancelled.');
    this.name = 'RosterOptimizerCancelledError';
  }
}
