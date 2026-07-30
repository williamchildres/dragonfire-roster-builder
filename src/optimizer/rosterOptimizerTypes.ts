import type { DragonRarity, HabitLevel } from '../models/dragon';
import type { FormationFinding } from '../services/formationFindings';
import type { FormationArrangement } from '../services/formationArrangement';
import type { FormationRatingTier } from '../services/formationRating';
import type {
  FormationRelationshipV3,
  ReliabilityCoverage,
} from '../synergy/reliability';
import type {
  EstimatedDragonPower,
  EstimatedPowerConfidence,
} from '../power/estimatedDragonPower';

export const ROSTER_OPTIMIZER_CONTRACT_VERSION = 6 as const;
export const ROSTER_OPTIMIZER_RATING_CONTRACT = 'formation-rating-v3' as const;
export const OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE = 1_000_000 as const;
export const BEST_OVERALL_SCORING_VERSION = 'best-overall-v1' as const;
export const BEST_OVERALL_POWER_WEIGHT = 60 as const;
export const BEST_OVERALL_RATING_WEIGHT = 40 as const;
export const BEST_OVERALL_NORMALIZATION_SCALE = 10_000 as const;
export const OPTIMIZER_MIN_FORMATION_COUNT = 1 as const;
export const OPTIMIZER_MAX_FORMATION_COUNT = 11 as const;
export const OPTIMIZER_DEFAULT_FORMATION_COUNT = 10 as const;
/** @deprecated Historical v0.21 fixed-size contract. */
export const OPTIMIZER_FORMATION_COUNT = 10;
/** @deprecated Historical v0.21 fixed-size contract. */
export const OPTIMIZER_DRAGON_COUNT = 30;
export const OPTIMIZER_WAVE_FORMATION_COUNT = 5;
export const OPTIMIZER_WAVE_DRAGON_COUNT = 15;

export type RosterOptimizerStrategy =
  | 'power-aware-primary-five-backup-five'
  | 'primary-five-backup-five'
  | 'best-ten-overall';

export type OptimizerAllocationMode =
  | 'best-overall-first'
  | 'strongest-first'
  | 'balanced';

export type OptimizerRunProgress =
  | { stage: 'candidate-generation'; allocationMode: OptimizerAllocationMode; formationCount: number }
  | { stage: 'exact-solving'; allocationMode: OptimizerAllocationMode; formationCount: number };

export type OptimizerWave = 'primary' | 'backup';

export interface OptimizerRosterDragon {
  dragonId: string;
  rarity: DragonRarity;
  starRank: number | null;
  dragonLevel: number | null;
  /** Present for production requests; omitted only by low-level synthetic solver fixtures. */
  activeHabitLevels?: Readonly<Record<string, HabitLevel | null>>;
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
  totalRelationshipValueUnits: number;
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
  combinedRelationshipValueUnits: number;
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
  combinedRelationshipValueUnits: number;
  combinedActiveRelationships: number;
  stableSolutionKey: string;
}

export interface OptimizerFormationCandidate {
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
  stableCandidateKey: string;
  dragonIds: [string, string, string];
  dragonMask: bigint;
  arrangement: FormationArrangement;
  tiedBestArrangements: FormationArrangement[];
  rating: number;
  tier: FormationRatingTier;
  activeSynergyScore: number;
  placementScore: number;
  adjustedRelationshipValue: number;
  adjustedRelationshipValueUnits: number;
  activeRelationshipCount: number;
  quantifiedRelationshipCount: number;
  unquantifiedRelationshipCount: number;
  unquantifiedBasePotential: number;
  reliabilityCoverage: ReliabilityCoverage;
  participatingDragonCount: number;
  relationships: FormationRelationshipV3[];
  strengths: FormationFinding[];
  gaps: FormationFinding[];
  progressionSnapshot: Record<
    string,
    {
      starRank?: number | null;
      dragonLevel?: number | null;
      activeHabitLevels: Readonly<Record<string, HabitLevel | null>>;
    }
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

export interface OptimizerSolvePhaseProfile {
  stage: string;
  category:
    | 'rarity'
    | 'power'
    | 'overall-score'
    | 'total-rating'
    | 'minimum-rating'
    | 'rating-vector'
    | 'relationship-value'
    | 'relationship-count'
    | 'stable-key'
    | 'certification';
  solverPass: number;
  elapsedMs: number;
  variableCount: number;
  constraintCount: number;
  certification: boolean;
  /** Nodes enumerated by an exact secondary optimal-face solver, when used. */
  exactSearchNodes?: number;
}

export interface OptimizerPerformanceProfile {
  modelBuilds: number;
  modelConstructionMs: number;
  certificationPasses: number;
  skippedPhases: number;
  prunedVariables: number;
  phases: OptimizerSolvePhaseProfile[];
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
  performanceProfile?: OptimizerPerformanceProfile;
  numericalExactness?: OptimizerNumericalExactnessDiagnostics;
  bestOverallSteps?: BestOverallStepTelemetry[];
}

export interface FlexiblePowerAwareObjective {
  allocationMode: OptimizerAllocationMode;
  bestOverallScoreUnits?: number[];
  ascendingEstimatedPowerUnits: number[];
  ascendingEstimatedPowerVector: number[];
  ascendingRatingVector: number[];
  totalRelationshipValue: number;
  totalRelationshipValueUnits: number;
  totalActiveRelationships: number;
  stableSolutionKey: string;
}

export interface BestOverallScoreBreakdown {
  scoringVersion: typeof BEST_OVERALL_SCORING_VERSION;
  powerWeight: typeof BEST_OVERALL_POWER_WEIGHT;
  formationRatingWeight: typeof BEST_OVERALL_RATING_WEIGHT;
  normalizationScale: typeof BEST_OVERALL_NORMALIZATION_SCALE;
  maxRemainingPowerUnits: number;
  estimatedPowerUnits: number;
  powerIndexBasisPoints: number;
  ratingIndexBasisPoints: number;
  powerContributionUnits: number;
  ratingContributionUnits: number;
  overallScoreUnits: number;
  overallScore: number;
}

export interface BestOverallStepTelemetry {
  armyRank: number;
  candidatesExamined: number;
  candidatesRejectedForOverlap: number;
  scoreCalculations: number;
  maxRemainingPowerUnits: number;
  elapsedMs: number;
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
  totalRelationshipValueUnits: number;
  totalActiveRelationships: number;
  quantifiedRelationshipCount: number;
  unquantifiedRelationshipCount: number;
  unquantifiedBasePotential: number;
}

export interface BestTenOverallOptimizationResult {
  contractVersion: 4;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
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
  /** Stable semantic identity for the contract-4 v3 allocation. */
  optimizerSolutionHash: string;
  /** Strategy-aware identity for the complete v3 result. */
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
  totalRelationshipValueUnits: number;
  totalActiveRelationships: number;
  quantifiedRelationshipCount: number;
  unquantifiedRelationshipCount: number;
  unquantifiedBasePotential: number;
  tierDistribution: TierDistribution;
  objective: OptimizerWaveObjective;
}

export interface PrimaryBackupOptimizationResult {
  contractVersion: 4;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
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
  bestOverallScore?: BestOverallScoreBreakdown;
}

export interface FlexiblePowerAwareCollectionSummary
  extends OptimizerCollectionSummary {
  totalEstimatedPower: number;
  averageEstimatedPower: number;
  minimumFormationEstimatedPower: number;
  maximumFormationEstimatedPower: number;
  estimatedPowerSpread: number;
  powerConfidenceCounts: PowerConfidenceCountRecord;
}

export interface FlexiblePowerAwareOptimizationResult {
  contractVersion: 6;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
  allocationMode: OptimizerAllocationMode;
  optimal: true;
  requestedFormationCount: number;
  generatedFormationCount: number;
  rosterFingerprint: string;
  requestFingerprint: string;
  estimatedPowerModelVersion: string;
  estimatedPowerModelHash: string;
  estimatedPowerObservationHash: string;
  bestOverallScoringVersion: typeof BEST_OVERALL_SCORING_VERSION;
  bestOverallPowerWeight: typeof BEST_OVERALL_POWER_WEIGHT;
  bestOverallFormationRatingWeight: typeof BEST_OVERALL_RATING_WEIGHT;
  bestOverallNormalizationScale: typeof BEST_OVERALL_NORMALIZATION_SCALE;
  estimatedPowerByDragonId: Record<string, EstimatedDragonPower>;
  formations: PowerAwareOptimizedFormation[];
  usedDragonIds: string[];
  unusedDragonIds: string[];
  collection: FlexiblePowerAwareCollectionSummary;
  objective: FlexiblePowerAwareObjective;
  diagnostics: OptimizerSearchDiagnostics;
  optimizerSolutionHash: string;
  optimizerResultHash: string;
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
  contractVersion: 4;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
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
  contractVersion: 6;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
  allocationMode: OptimizerAllocationMode;
  requestedFormationCount: number;
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
  | FlexiblePowerAwareOptimizationResult
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
  performanceProfile?: OptimizerPerformanceProfile;
  numericalExactness?: OptimizerNumericalExactnessDiagnostics;
}

export interface PowerAwarePrimaryBackupOptimizerSolverResult extends Omit<PrimaryBackupOptimizerSolverResult, 'objective'> {
  objective: PowerAwarePrimaryBackupOptimizerObjective;
}

export interface FlexiblePowerAwareOptimizerSolverResult {
  optimal: true;
  selectedCandidates: OptimizerFormationCandidate[];
  objective: FlexiblePowerAwareObjective;
  nodesVisited: number;
  branchesPruned: number;
  cacheEntries: number;
  solverPasses: number;
  performanceProfile: OptimizerPerformanceProfile;
  numericalExactness?: OptimizerNumericalExactnessDiagnostics;
  bestOverallScoreBreakdowns?: BestOverallScoreBreakdown[];
  bestOverallSteps?: BestOverallStepTelemetry[];
}

export class RosterOptimizerCancelledError extends Error {
  constructor() {
    super('Roster optimization was cancelled.');
    this.name = 'RosterOptimizerCancelledError';
  }
}
