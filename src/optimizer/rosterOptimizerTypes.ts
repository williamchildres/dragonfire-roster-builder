import type { DragonRarity } from '../models/dragon';
import type { FormationFinding } from '../services/formationFindings';
import type { FormationArrangement } from '../services/formationPlacementComparison';
import type { FormationRatingTier } from '../services/formationRating';
import type { SemanticRelationship } from '../synergy/semanticRelationships';

export const ROSTER_OPTIMIZER_CONTRACT_VERSION = 1 as const;
export const ROSTER_OPTIMIZER_RATING_CONTRACT = 'formation-rating-v2' as const;
export const OPTIMIZER_FORMATION_COUNT = 10;
export const OPTIMIZER_DRAGON_COUNT = 30;

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
}

export interface OptimizedFormation extends Omit<OptimizerFormationCandidate, 'dragonMask'> {
  rank: number;
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
}

export type RarityCountRecord = Record<DragonRarity, number>;

export interface RosterOptimizationResult {
  contractVersion: 1;
  optimal: true;
  rosterFingerprint: string;
  formations: OptimizedFormation[];
  usedDragonIds: string[];
  unusedDragonIds: string[];
  usedRarityCounts: RarityCountRecord;
  unusedRarityCounts: RarityCountRecord;
  objective: RosterOptimizerObjective;
  averageRating: number;
  minimumRating: number;
  tierDistribution: Record<FormationRatingTier, number>;
  diagnostics: OptimizerSearchDiagnostics;
  optimizerResultHash: string;
}

export interface RosterOptimizationUnavailable {
  contractVersion: 1;
  optimal: false;
  status: 'unavailable';
  reason: 'insufficient-eligible-dragons';
  eligibleDragonCount: number;
  requiredDragonCount: number;
  additionalDragonsNeeded: number;
  rosterFingerprint: string;
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

export class RosterOptimizerCancelledError extends Error {
  constructor() {
    super('Roster optimization was cancelled.');
    this.name = 'RosterOptimizerCancelledError';
  }
}
