import { HiGHS, Model, Solution, Var, sum, type LinExpr } from '@bubblyworld/highs-ts';
import { applyRosterOptimizerExactGapOptions } from './highsExactOptions';
import { constantSelectionExpressionValue } from './exactPhaseSkipping';
import type { EstimatedDragonPower } from '../power/estimatedDragonPower';
import {
  powerAwarePrimaryBackupObjectiveForCandidates,
  primaryBackupObjectiveForCandidates,
} from './rosterOptimizerObjective';
import type { PrimaryPowerCutoff } from './rosterOptimizerPower';
import { solvePrimaryBackupStableFace } from './rosterOptimizerStableFaceSolver';
import type {
  OptimizerFormationCandidate,
  OptimizerNumericalExactnessDiagnostics,
  OptimizerPerformanceProfile,
  OptimizerPhaseObjectiveDiagnostic,
  OptimizerPhaseTimings,
  OptimizerRosterDragon,
  OptimizerWave,
  PrimaryBackupOptimizerSolverResult,
  PowerAwarePrimaryBackupOptimizerSolverResult,
} from './rosterOptimizerTypes';

type PhaseCategory = Exclude<keyof OptimizerPhaseTimings, 'modelConstructionMs'>;

interface WaveExpressions {
  variables: Var[];
  ratingUsedVariables: Var[];
  legendaryCount: LinExpr;
  epicCount: LinExpr;
  totalPowerUnits: LinExpr;
  totalRating: LinExpr;
  minimumRating: Var;
  totalRelationshipValueUnits: LinExpr;
  totalActiveRelationships: LinExpr;
}

interface ModelContext {
  model: Model;
  primary: WaveExpressions;
  backup: WaveExpressions;
}

interface SolverTelemetry {
  passes: number;
  nodesVisited: number;
  branchesPruned: number;
  phaseTimings: OptimizerPhaseTimings;
  recentSolverLog: string[];
  objectiveReconstructions: OptimizerPhaseObjectiveDiagnostic[];
  fixedPhasesValidated: boolean;
  performanceProfile: OptimizerPerformanceProfile;
}

interface SolverSession {
  highs: HiGHS;
  telemetry: SolverTelemetry;
  problem: {
    candidates: OptimizerFormationCandidate[];
    eligibleDragons: OptimizerRosterDragon[];
    formationsPerWave: number;
  };
  lastOptimalSolution: Solution | null;
  certificationCache: Map<string, CertificationResult>;
}
type CertificationResult = Pick<
  OptimizerPhaseObjectiveDiagnostic,
  | 'exactOptimumCertified'
  | 'certificationDirection'
  | 'certificationBound'
  | 'certificationStatus'
  | 'certificationSolverPass'
>;

type FixedPhase =
  | {
      kind: 'scalar';
      wave: OptimizerWave;
      field: ScalarField;
      value: number;
      implied?: boolean;
    }
  | {
      kind: 'histogram';
      wave: OptimizerWave;
      levels: number[];
      weights: readonly number[];
      value: number;
    }
  | { kind: 'dragon-inclusion'; wave: OptimizerWave; dragonId: string; value: number }
  | { kind: 'cutoff-ties'; wave: OptimizerWave; dragonIds: string[]; value: number };

type ScalarField =
  | 'legendaryCount'
  | 'epicCount'
  | 'totalPowerUnits'
  | 'totalRating'
  | 'minimumRating'
  | 'totalRelationshipValueUnits'
  | 'totalActiveRelationships';

export const OPTIMIZER_VARIABLE_INTEGRALITY_TOLERANCE = 1e-7;
export const OPTIMIZER_MATERIAL_OBJECTIVE_DELTA = 1e-3;
const histogramChunkSize = 9;

export interface PowerAwarePrimaryBackupMipOptions {
  primaryCutoff: PrimaryPowerCutoff;
  estimatesByDragonId: ReadonlyMap<string, EstimatedDragonPower>;
}

/** Exact joint two-wave MILP. Every lexicographic optimum is fixed before the
 * next phase and every HiGHS parse uses zero absolute and relative MIP gaps. */
export function solvePrimaryBackupRosterOptimizerMip(
  inputCandidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  formationsPerWave?: number,
): Promise<PrimaryBackupOptimizerSolverResult>;
export function solvePrimaryBackupRosterOptimizerMip(
  inputCandidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  formationsPerWave: number | undefined,
  powerAware: PowerAwarePrimaryBackupMipOptions,
): Promise<PowerAwarePrimaryBackupOptimizerSolverResult>;
export async function solvePrimaryBackupRosterOptimizerMip(
  inputCandidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  formationsPerWave = 5,
  powerAware?: PowerAwarePrimaryBackupMipOptions,
): Promise<PrimaryBackupOptimizerSolverResult | PowerAwarePrimaryBackupOptimizerSolverResult> {
  const candidates = [...inputCandidates].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  const telemetry: SolverTelemetry = {
    passes: 0,
    nodesVisited: 0,
    branchesPruned: 0,
    phaseTimings: {
      modelConstructionMs: 0,
      primaryPowerMs: 0,
      primaryRarityMs: 0,
      primaryQualityMs: 0,
      backupPowerMs: 0,
      backupRarityMs: 0,
      backupQualityMs: 0,
      stableKeyMs: 0,
    },
    recentSolverLog: [],
    objectiveReconstructions: [],
    fixedPhasesValidated: false,
    performanceProfile: {
      modelBuilds: 0,
      modelConstructionMs: 0,
      certificationPasses: 0,
      skippedPhases: 0,
      prunedVariables: 0,
      phases: [],
    },
  };
  const session: SolverSession = {
    highs: await HiGHS.create({
      console: {
        log: (line) => recordSolverLog(line, telemetry),
        error: (line) => recordSolverLog(line, telemetry),
      },
    }),
    telemetry,
    problem: { candidates, eligibleDragons, formationsPerWave },
    lastOptimalSolution: null,
    certificationCache: new Map(),
  };
  applyRosterOptimizerExactGapOptions(session.highs);

  try {
    const fixed: FixedPhase[] = [];
    const context = measuredBuildModel(
      candidates,
      eligibleDragons,
      formationsPerWave,
      telemetry,
    );

    if (powerAware) {
      addPrimaryPowerCutoffConstraints(
        context,
        candidates,
        powerAware.primaryCutoff,
        fixed,
        telemetry,
      );
    }

    if (!powerAware) {
      await maximizeAndFix(context, session, fixed, 'primary', 'legendaryCount',
        'Primary Legendary inclusion', 'primaryRarityMs');
      await maximizeAndFix(context, session, fixed, 'primary', 'epicCount',
        'Primary Epic inclusion', 'primaryRarityMs');
    }
    await maximizeAndFix(context, session, fixed, 'primary', 'totalRating',
      'Primary total Formation Rating', 'primaryQualityMs');
    await maximizeAndFix(context, session, fixed, 'primary', 'minimumRating',
      'Primary minimum Formation Rating', 'primaryQualityMs');
    await refineRatingVector(
      context,
      session,
      fixed,
      candidates,
      'primary',
      'primaryQualityMs',
    );
    await maximizeAndFix(context, session, fixed, 'primary', 'totalRelationshipValueUnits',
      'Primary active relationship value', 'primaryQualityMs');
    await maximizeAndFix(context, session, fixed, 'primary', 'totalActiveRelationships',
      'Primary active relationship count', 'primaryQualityMs');

    if (powerAware) {
      await maximizeAndFix(context, session, fixed, 'backup', 'totalPowerUnits',
        'Backup total Estimated Power', 'backupPowerMs');
    } else {
      await maximizeAndFix(context, session, fixed, 'backup', 'legendaryCount',
        'Backup Legendary inclusion', 'backupRarityMs');
      await maximizeAndFix(context, session, fixed, 'backup', 'epicCount',
        'Backup Epic inclusion', 'backupRarityMs');
    }
    await maximizeAndFix(context, session, fixed, 'backup', 'totalRating',
      'Backup total Formation Rating', 'backupQualityMs');
    await maximizeAndFix(context, session, fixed, 'backup', 'minimumRating',
      'Backup minimum Formation Rating', 'backupQualityMs');
    await refineRatingVector(
      context,
      session,
      fixed,
      candidates,
      'backup',
      'backupQualityMs',
    );
    await maximizeAndFix(context, session, fixed, 'backup', 'totalRelationshipValueUnits',
      'Backup active relationship value', 'backupQualityMs');
    const numericPhaseSolution = await maximizeAndFix(
      context,
      session,
      fixed,
      'backup',
      'totalActiveRelationships',
      'Backup active relationship count',
      'backupQualityMs',
    );
    const numericSolution = numericPhaseSolution ?? session.lastOptimalSolution;
    if (!numericSolution) {
      throw new Error('Exact optimizer completed numeric phases without a solution.');
    }

    const numericPrimaryIndices = selectedVariableIndices(
      numericSolution,
      context.primary.variables,
    );
    const numericBackupIndices = selectedVariableIndices(
      numericSolution,
      context.backup.variables,
    );
    validateFixedPhases(context, candidates, fixed, numericSolution);
    telemetry.fixedPhasesValidated = true;
    const rarityByDragonId = new Map(
      eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
    );
    const numericPrimaryCandidates = numericPrimaryIndices.map(
      (index) => candidates[index]!,
    );
    const numericBackupCandidates = numericBackupIndices.map(
      (index) => candidates[index]!,
    );
    const numericObjective = powerAware
      ? powerAwarePrimaryBackupObjectiveForCandidates(
          numericPrimaryCandidates,
          numericBackupCandidates,
          rarityByDragonId,
          powerAware.estimatesByDragonId,
        )
      : primaryBackupObjectiveForCandidates(
          numericPrimaryCandidates,
          numericBackupCandidates,
          rarityByDragonId,
        );
    const stableStartedAt = performance.now();
    const stableFace = solvePrimaryBackupStableFace({
      candidates,
      eligibleDragons,
      primaryTarget: numericObjective.primary,
      backupTarget: numericObjective.backup,
      formationsPerWave,
      primaryPowerUnits: powerAware
        ? numericPrimaryCandidates.reduce(
            (total, candidate) => total + (candidate.estimatedPowerUnits ?? 0),
            0,
          )
        : undefined,
      backupPowerUnits: powerAware
        ? numericBackupCandidates.reduce(
            (total, candidate) => total + (candidate.estimatedPowerUnits ?? 0),
            0,
          )
        : undefined,
      primaryCutoff: powerAware?.primaryCutoff,
    });
    if (!stableFace) {
      throw new Error('Exact optimizer could not reconstruct the numeric-optimal face.');
    }
    telemetry.performanceProfile.phases.push({
      stage: 'Primary/Backup exact optimal-face stable key',
      category: 'stable-key',
      solverPass: 0,
      elapsedMs: performance.now() - stableStartedAt,
      variableCount: 0,
      constraintCount: 0,
      certification: false,
      exactSearchNodes: stableFace.nodesVisited,
    });
    telemetry.nodesVisited += stableFace.nodesVisited;
    const primaryIndices = stableFace.primaryIndices;
    const backupIndices = stableFace.backupIndices;
    const primaryCandidates = primaryIndices.map((index) => candidates[index]!);
    const backupCandidates = backupIndices.map((index) => candidates[index]!);
    validateAllocation(primaryCandidates, backupCandidates, formationsPerWave);
    const common = {
      optimal: true,
      primaryCandidates,
      backupCandidates,
      nodesVisited: telemetry.nodesVisited,
      branchesPruned: telemetry.branchesPruned,
      cacheEntries: 0,
      solverPasses: telemetry.passes,
      phaseTimings: telemetry.phaseTimings,
      performanceProfile: telemetry.performanceProfile,
      numericalExactness: numericalExactnessDiagnostics(telemetry),
    } as const;
    if (powerAware) {
      const objective = powerAwarePrimaryBackupObjectiveForCandidates(
        primaryCandidates,
        backupCandidates,
        rarityByDragonId,
        powerAware.estimatesByDragonId,
      );
      if (objective.primary.totalEstimatedPower / 10
        !== powerAware.primaryCutoff.exactPrimaryTotalPowerUnits) {
        throw new Error('Primary cutoff constraints did not retain the exact maximum Power pool.');
      }
      return {
        ...common,
        objective,
      };
    }
    return {
      ...common,
      objective: primaryBackupObjectiveForCandidates(
        primaryCandidates,
        backupCandidates,
        rarityByDragonId,
      ),
    };
  } finally {
    session.highs.free();
  }
}

function buildModel(
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  formationsPerWave: number,
): ModelContext {
  const model = new Model();
  const primaryVariables = candidates.map((_candidate, index) =>
    model.boolVar(`primary_${String(index).padStart(4, '0')}`),
  );
  const backupVariables = candidates.map((_candidate, index) =>
    model.boolVar(`backup_${String(index).padStart(4, '0')}`),
  );
  model.addConstraint(sum(...primaryVariables).eq(formationsPerWave), 'primary_count');
  model.addConstraint(sum(...backupVariables).eq(formationsPerWave), 'backup_count');
  candidates.forEach((_candidate, index) => {
    model.addConstraint(
      primaryVariables[index]!.plus(backupVariables[index]!).leq(1),
      `candidate_wave_${index}`,
    );
  });
  for (const dragon of eligibleDragons) {
    const containing = candidates.flatMap((candidate, index) =>
      candidate.dragonIds.includes(dragon.dragonId)
        ? [primaryVariables[index]!, backupVariables[index]!]
        : [],
    );
    model.addConstraint(sum(...containing).leq(1), `dragon_${dragon.dragonId}`);
  }
  const ratings = candidates.map((candidate) => candidate.rating);
  const minimumCandidateRating = Math.min(...ratings);
  const maximumCandidateRating = Math.max(...ratings);
  return {
    model,
    primary: buildWaveExpressions(
      model,
      candidates,
      eligibleDragons,
      primaryVariables,
      'primary',
      formationsPerWave,
      minimumCandidateRating,
      maximumCandidateRating,
    ),
    backup: buildWaveExpressions(
      model,
      candidates,
      eligibleDragons,
      backupVariables,
      'backup',
      formationsPerWave,
      minimumCandidateRating,
      maximumCandidateRating,
    ),
  };
}

function buildWaveExpressions(
  model: Model,
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  variables: Var[],
  wave: OptimizerWave,
  formationsPerWave: number,
  minimumCandidateRating: number,
  maximumCandidateRating: number,
): WaveExpressions {
  const rarityByDragonId = new Map(
    eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
  );
  const rarityExpression = (rarity: 'Legendary' | 'Epic') => sum(
    ...variables.flatMap((variable, index) => {
      const count = candidates[index]!.dragonIds.filter(
        (dragonId) => rarityByDragonId.get(dragonId) === rarity,
      ).length;
      return count > 0 ? [variable.times(count)] : [];
    }),
  );
  const minimumRating = model.intVar(
    minimumCandidateRating,
    maximumCandidateRating,
    `${wave}_minimum_rating`,
  );
  const bigM = maximumCandidateRating - minimumCandidateRating;
  const ratingLevels = [...new Set(candidates.map((candidate) => candidate.rating))]
    .sort((left, right) => left - right);
  const ratingUsedVariables = ratingLevels.map((rating) =>
    model.boolVar(`${wave}_rating_${rating}_used`),
  );
  ratingLevels.forEach((rating, ratingIndex) => {
    const used = ratingUsedVariables[ratingIndex]!;
    const count = sum(...variables.flatMap((variable, candidateIndex) =>
      candidates[candidateIndex]!.rating === rating ? [variable] : [],
    ));
    model.addConstraint(
      count.minus(used.times(formationsPerWave)).leq(0),
      `${wave}_rating_${rating}_used_upper`,
    );
    model.addConstraint(
      count.minus(used).geq(0),
      `${wave}_rating_${rating}_used_lower`,
    );
    model.addConstraint(
      minimumRating.plus(used.times(bigM)).leq(rating + bigM),
      `${wave}_minimum_rating_${rating}`,
    );
  });
  return {
    variables,
    ratingUsedVariables,
    legendaryCount: rarityExpression('Legendary'),
    epicCount: rarityExpression('Epic'),
    totalPowerUnits: sum(
      ...variables.map((variable, index) =>
        variable.times(candidates[index]!.estimatedPowerUnits ?? 0),
      ),
    ),
    totalRating: sum(
      ...variables.map((variable, index) => variable.times(candidates[index]!.rating)),
    ),
    minimumRating,
    totalRelationshipValueUnits: sum(
      ...variables.map((variable, index) =>
        variable.times(candidates[index]!.adjustedRelationshipValueUnits),
      ),
    ),
    totalActiveRelationships: sum(
      ...variables.map((variable, index) =>
        variable.times(candidates[index]!.activeRelationshipCount),
      ),
    ),
  };
}

async function maximizeAndFix(
  context: ModelContext,
  session: SolverSession,
  fixed: FixedPhase[],
  wave: OptimizerWave,
  field: ScalarField,
  label: string,
  category: PhaseCategory,
) {
  const expression = context[wave][field];
  const constantValue = constantScalarPhaseValue(
    session.problem.candidates,
    session.problem.eligibleDragons,
    session.problem.formationsPerWave,
    field,
  );
  if (constantValue !== null) {
    fixed.push({
      kind: 'scalar',
      wave,
      field,
      value: constantValue,
      implied: true,
    });
    session.telemetry.performanceProfile.skippedPhases += 1;
    return session.lastOptimalSolution;
  }
  context.model.maximize(expression);
  const solution = await solveOptimal(context.model, session, label, category);
  const phase = { kind: 'scalar', wave, field, value: 0 } as const;
  const value = await reconstructCertifyAndRecord({
    context,
    session,
    fixed,
    solution,
    expression,
    phase,
    direction: 'maximize',
    category,
    stage: label,
    wave,
    kind: 'scalar',
  });
  context.model.addConstraint(expression.eq(value), `fix_${wave}_${field}`);
  fixed.push({ kind: 'scalar', wave, field, value });
  return solution;
}

async function refineRatingVector(
  context: ModelContext,
  session: SolverSession,
  fixed: FixedPhase[],
  candidates: OptimizerFormationCandidate[],
  wave: OptimizerWave,
  category: PhaseCategory,
): Promise<void> {
  const ratingLevels = [...new Set(candidates.map((candidate) => candidate.rating))]
    .sort((left, right) => left - right);
  for (let start = 0; start < ratingLevels.length; start += histogramChunkSize) {
    const levels = ratingLevels.slice(start, start + histogramChunkSize);
    const weights = levels.map(
      (_rating, index) => 6 ** (levels.length - index - 1),
    );
    const expression = histogramExpression(
      candidates,
      context[wave].variables,
      levels,
      weights,
    );
    context.model.minimize(expression);
    const solution = await solveOptimal(
      context.model,
      session,
      `${wave} ascending rating vector`,
      category,
    );
    const phase = {
      kind: 'histogram',
      wave,
      levels,
      weights,
      value: 0,
    } as const;
    const value = await reconstructCertifyAndRecord({
      context,
      session,
      fixed,
      solution,
      expression,
      phase,
      direction: 'minimize',
      category,
      stage: `${wave} ascending rating vector`,
      wave,
      kind: 'histogram',
      chunkStart: start,
      chunkEnd: start + levels.length - 1,
    });
    context.model.addConstraint(expression.eq(value), `fix_${wave}_histogram_${start}`);
    fixed.push({ kind: 'histogram', wave, levels, weights, value });
  }
}

function applyFixedPhases(
  context: ModelContext,
  candidates: OptimizerFormationCandidate[],
  fixed: FixedPhase[],
): void {
  fixed.forEach((phase, index) => {
    if (phase.kind === 'scalar' && phase.implied) return;
    const expression = fixedPhaseExpression(context, candidates, phase);
    context.model.addConstraint(expression.eq(phase.value), `replay_fix_${index}`);
  });
}

function fixedPhaseExpression(
  context: ModelContext,
  candidates: OptimizerFormationCandidate[],
  phase: FixedPhase,
): LinExpr | Var {
  return phase.kind === 'scalar'
    ? context[phase.wave][phase.field]
    : phase.kind === 'histogram'
      ? histogramExpression(
          candidates,
          context[phase.wave].variables,
          phase.levels,
          phase.weights,
        )
      : phase.kind === 'dragon-inclusion'
          ? dragonInclusionExpression(candidates, context[phase.wave].variables, phase.dragonId)
          : dragonSetInclusionExpression(candidates, context[phase.wave].variables, phase.dragonIds);
}

function addPrimaryPowerCutoffConstraints(
  context: ModelContext,
  candidates: OptimizerFormationCandidate[],
  cutoff: PrimaryPowerCutoff,
  fixed: FixedPhase[],
  telemetry: SolverTelemetry,
): void {
  for (const dragonId of cutoff.aboveCutoffDragonIds) {
    const expression = dragonInclusionExpression(candidates, context.primary.variables, dragonId);
    context.model.addConstraint(expression.eq(1), `power_above_${dragonId}`);
    fixed.push({ kind: 'dragon-inclusion', wave: 'primary', dragonId, value: 1 });
  }
  for (const dragonId of cutoff.belowCutoffDragonIds) {
    const expression = dragonInclusionExpression(candidates, context.primary.variables, dragonId);
    context.model.addConstraint(expression.eq(0), `power_below_${dragonId}`);
    fixed.push({ kind: 'dragon-inclusion', wave: 'primary', dragonId, value: 0 });
  }
  const tieExpression = dragonSetInclusionExpression(
    candidates,
    context.primary.variables,
    cutoff.cutoffTiedDragonIds,
  );
  context.model.addConstraint(
    tieExpression.eq(cutoff.requiredCutoffTieCount),
    'power_cutoff_ties',
  );
  fixed.push({
    kind: 'cutoff-ties',
    wave: 'primary',
    dragonIds: cutoff.cutoffTiedDragonIds,
    value: cutoff.requiredCutoffTieCount,
  });
  const excludedPrimaryIndices = candidateIndicesOverlappingDragonIds(
    candidates,
    new Set(cutoff.belowCutoffDragonIds),
  );
  addCandidateExclusions(
    context.model,
    context.primary.variables,
    excludedPrimaryIndices,
    'primary_power_cutoff',
  );
  telemetry.performanceProfile.prunedVariables += excludedPrimaryIndices.length;
}

export function candidateIndicesOverlappingDragonIds(
  candidates: readonly OptimizerFormationCandidate[],
  dragonIds: ReadonlySet<string>,
): number[] {
  return candidates.flatMap((candidate, index) =>
    candidate.dragonIds.some((dragonId) => dragonIds.has(dragonId))
      ? [index]
      : [],
  );
}

function addCandidateExclusions(
  model: Model,
  variables: Var[],
  indices: readonly number[],
  name: string,
): void {
  indices.forEach((index) => {
    model.addConstraint(variables[index]!.eq(0), `${name}_${index}`);
  });
}

function dragonInclusionExpression(
  candidates: OptimizerFormationCandidate[],
  variables: Var[],
  dragonId: string,
): LinExpr {
  return sum(...candidates.flatMap((candidate, index) =>
    candidate.dragonIds.includes(dragonId) ? [variables[index]!] : [],
  ));
}

function dragonSetInclusionExpression(
  candidates: OptimizerFormationCandidate[],
  variables: Var[],
  dragonIds: string[],
): LinExpr {
  const included = new Set(dragonIds);
  return sum(...candidates.flatMap((candidate, index) => {
    const count = candidate.dragonIds.filter((dragonId) => included.has(dragonId)).length;
    return count > 0 ? [variables[index]!.times(count)] : [];
  }));
}

function histogramExpression(
  candidates: OptimizerFormationCandidate[],
  variables: Var[],
  levels: number[],
  weights: readonly number[] = levels.map(
    (_rating, index) => 6 ** (levels.length - index - 1),
  ),
): LinExpr {
  const coefficientByRating = new Map(
    levels.map((rating, index) => [rating, weights[index]!]),
  );
  return sum(
    ...candidates.flatMap((candidate, index) => {
      const coefficient = coefficientByRating.get(candidate.rating);
      return coefficient === undefined ? [] : [variables[index]!.times(coefficient)];
    }),
  );
}

function measuredBuildModel(
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  formationsPerWave: number,
  telemetry: SolverTelemetry,
): ModelContext {
  const startedAt = performance.now();
  const context = buildModel(candidates, eligibleDragons, formationsPerWave);
  telemetry.phaseTimings.modelConstructionMs += performance.now() - startedAt;
  telemetry.performanceProfile.modelBuilds += 1;
  telemetry.performanceProfile.modelConstructionMs += performance.now() - startedAt;
  return context;
}

async function solveOptimal(
  model: Model,
  session: SolverSession,
  stage: string,
  category: PhaseCategory,
) {
  const solution = await solveAllowInfeasible(model, session, category, stage);
  if (solution.status !== 'optimal') {
    throw new Error(`Exact optimizer ${stage} stage ended with ${solution.status}.`);
  }
  session.lastOptimalSolution = solution;
  return solution;
}

function constantScalarPhaseValue(
  candidates: readonly OptimizerFormationCandidate[],
  eligibleDragons: readonly OptimizerRosterDragon[],
  formationsPerWave: number,
  field: ScalarField,
): number | null {
  if (field === 'minimumRating') return null;
  const rarityByDragonId = new Map(
    eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
  );
  const coefficients = candidates.map((candidate) => {
    if (field === 'legendaryCount' || field === 'epicCount') {
      const rarity = field === 'legendaryCount' ? 'Legendary' : 'Epic';
      return candidate.dragonIds.filter(
        (dragonId) => rarityByDragonId.get(dragonId) === rarity,
      ).length;
    }
    if (field === 'totalPowerUnits') return candidate.estimatedPowerUnits ?? 0;
    if (field === 'totalRating') return candidate.rating;
    if (field === 'totalRelationshipValueUnits') {
      return candidate.adjustedRelationshipValueUnits;
    }
    return candidate.activeRelationshipCount;
  });
  return constantSelectionExpressionValue(coefficients, formationsPerWave);
}

async function solveAllowInfeasible(
  model: Model,
  session: SolverSession,
  category: PhaseCategory,
  stage = 'stable-key alternate-selection probe',
  certification = false,
) {
  session.telemetry.passes += 1;
  session.telemetry.recentSolverLog = [];
  const startedAt = performance.now();
  await session.highs.parse(model.print('lp'), 'lp');
  const solution = new Solution(await session.highs.solve());
  const elapsedMs = performance.now() - startedAt;
  session.telemetry.phaseTimings[category] += elapsedMs;
  if (certification) session.telemetry.performanceProfile.certificationPasses += 1;
  session.telemetry.performanceProfile.phases.push({
    stage,
    category: primaryBackupProfileCategory(stage, category, certification),
    solverPass: session.telemetry.passes,
    elapsedMs,
    ...modelSize(model),
    certification,
  });
  return solution;
}

function modelSize(model: Model): {
  variableCount: number;
  constraintCount: number;
} {
  const inventory = model as unknown as {
    variables: readonly Var[];
    constraints: readonly unknown[];
  };
  return {
    variableCount: inventory.variables.length,
    constraintCount: inventory.constraints.length,
  };
}

function primaryBackupProfileCategory(
  stage: string,
  category: PhaseCategory,
  certification: boolean,
): OptimizerPerformanceProfile['phases'][number]['category'] {
  if (certification) return 'certification';
  if (category === 'primaryRarityMs' || category === 'backupRarityMs') return 'rarity';
  if (category === 'primaryPowerMs' || category === 'backupPowerMs') return 'power';
  if (stage.includes('total Formation Rating')) return 'total-rating';
  if (stage.includes('minimum Formation Rating')) return 'minimum-rating';
  if (stage.includes('ascending rating vector')) return 'rating-vector';
  if (stage.includes('relationship value')) return 'relationship-value';
  if (stage.includes('relationship count')) return 'relationship-count';
  return 'stable-key';
}

function selectedVariableIndices(
  solution: Awaited<ReturnType<Model['solve']>>,
  variables: Var[],
): number[] {
  return variables.flatMap((variable, index) =>
    (solution.getValue(variable) ?? 0) > 0.5 ? [index] : [],
  );
}

function validateAllocation(
  primary: OptimizerFormationCandidate[],
  backup: OptimizerFormationCandidate[],
  formationsPerWave: number,
): void {
  const primaryDragons = primary.flatMap((candidate) => candidate.dragonIds);
  const backupDragons = backup.flatMap((candidate) => candidate.dragonIds);
  const combined = [...primaryDragons, ...backupDragons];
  if (
    primary.length !== formationsPerWave ||
    backup.length !== formationsPerWave ||
    new Set(primaryDragons).size !== formationsPerWave * 3 ||
    new Set(backupDragons).size !== formationsPerWave * 3 ||
    new Set(combined).size !== formationsPerWave * 6
  ) {
    throw new Error('Exact two-wave optimizer returned an invalid allocation.');
  }
}

function recordSolverLog(line: string, telemetry: SolverTelemetry): void {
  telemetry.recentSolverLog.push(line);
  const match = line.match(/Nodes\s+(\d+)/i) ?? line.match(/(\d+)\s+nodes/i);
  if (match) telemetry.nodesVisited += Number(match[1]);
  const pruned =
    line.match(/Pruned\s+(\d+)/i) ?? line.match(/(\d+)\s+(?:branches|nodes)\s+pruned/i);
  if (pruned) telemetry.branchesPruned += Number(pruned[1]);
}

async function reconstructCertifyAndRecord({
  context,
  session,
  fixed,
  solution,
  expression,
  phase,
  direction,
  category,
  stage,
  wave,
  kind,
  chunkStart,
  chunkEnd,
}: {
  context: ModelContext;
  session: SolverSession;
  fixed: FixedPhase[];
  solution: Solution;
  expression: LinExpr | Var;
  phase: FixedPhase;
  direction: 'maximize' | 'minimize';
  category: PhaseCategory;
  stage: string;
  wave: OptimizerWave;
  kind: OptimizerPhaseObjectiveDiagnostic['kind'];
  chunkStart?: number;
  chunkEnd?: number;
}): Promise<number> {
  const reconstruction = reconstructExactIntegerObjective({
    solution,
    expression,
    integerVariables: integralModelVariables(context),
    stage,
  });
  const diagnostic: OptimizerPhaseObjectiveDiagnostic = {
    stage,
    wave,
    kind,
    solverPass: session.telemetry.passes,
    status: 'optimal',
    ...(chunkStart === undefined ? {} : { chunkStart }),
    ...(chunkEnd === undefined ? {} : { chunkEnd }),
    rawObjective: reconstruction.rawObjective,
    reconstructedObjective: reconstruction.value,
    rawObjectiveDelta: reconstruction.rawObjectiveDelta,
    maximumIntegralityResidual: reconstruction.maximumIntegralityResidual,
    maximumConstraintResidual: maximumConstraintViolation(context.model, solution),
    mipGap: mipGapFromSolverLog(session.telemetry.recentSolverLog),
    exactOptimumCertified: false,
    certificationDirection: null,
    certificationBound: null,
    certificationStatus: 'not-required',
    certificationSolverPass: null,
  };
  if (reconstruction.rawObjectiveDelta > OPTIMIZER_MATERIAL_OBJECTIVE_DELTA) {
    Object.assign(diagnostic, await certifyExactIntegerOptimum({
      session,
      fixed,
      phase: { ...phase, value: reconstruction.value },
      direction,
      reconstructedValue: reconstruction.value,
      stage,
      category,
    }));
  }
  session.telemetry.objectiveReconstructions.push(diagnostic);
  return reconstruction.value;
}

async function certifyExactIntegerOptimum({
  session,
  fixed,
  phase,
  direction,
  reconstructedValue,
  stage,
  category,
}: {
  session: SolverSession;
  fixed: FixedPhase[];
  phase: FixedPhase;
  direction: 'maximize' | 'minimize';
  reconstructedValue: number;
  stage: string;
  category: PhaseCategory;
}): Promise<Pick<OptimizerPhaseObjectiveDiagnostic,
  'exactOptimumCertified' | 'certificationDirection' | 'certificationBound'
  | 'certificationStatus' | 'certificationSolverPass'>> {
  const cacheIdentity = exactCertificationCacheIdentity({
    fixedConstraints: fixed,
    objective: phase,
    direction,
    reconstructedValue,
  });
  const cached = session.certificationCache.get(cacheIdentity);
  if (cached) return cached;
  const { candidates, eligibleDragons, formationsPerWave } = session.problem;
  const probe = measuredBuildModel(
    candidates,
    eligibleDragons,
    formationsPerWave,
    session.telemetry,
  );
  applyFixedPhases(probe, candidates, fixed);
  const expression = fixedPhaseExpression(probe, candidates, phase);
  const certificationBound = exactAdjacentInteger(reconstructedValue, direction, stage);
  probe.model.addConstraint(
    direction === 'maximize'
      ? expression.geq(certificationBound)
      : expression.leq(certificationBound),
    `certify_${phase.wave}_${phase.kind}_${session.telemetry.passes + 1}`,
  );
  probe.model.minimize(sum(0));
  const certificationSolution = await solveAllowInfeasible(
    probe.model,
    session,
    category,
    `${stage} exact-optimum certification`,
    true,
  );
  const result = evaluateExactOptimumCertification({
    solution: certificationSolution,
    expression,
    integerVariables: integralModelVariables(probe),
    direction,
    reconstructedValue,
    stage,
    solverPass: session.telemetry.passes,
  });
  session.certificationCache.set(cacheIdentity, result);
  return result;
}

export function exactCertificationCacheIdentity(input: {
  fixedConstraints: readonly unknown[];
  objective: unknown;
  direction: 'maximize' | 'minimize';
  reconstructedValue: number;
}): string {
  return JSON.stringify(input);
}

export function evaluateExactOptimumCertification({
  solution,
  expression,
  integerVariables,
  direction,
  reconstructedValue,
  stage,
  solverPass,
}: {
  solution: Pick<Solution, 'status' | 'getValue'>;
  expression: LinExpr | Var;
  integerVariables: Var[];
  direction: 'maximize' | 'minimize';
  reconstructedValue: number;
  stage: string;
  solverPass: number;
}): Pick<OptimizerPhaseObjectiveDiagnostic,
  'exactOptimumCertified' | 'certificationDirection' | 'certificationBound'
  | 'certificationStatus' | 'certificationSolverPass'> {
  const certificationBound = exactAdjacentInteger(reconstructedValue, direction, stage);
  if (solution.status === 'infeasible') {
    return {
      exactOptimumCertified: true,
      certificationDirection: direction,
      certificationBound,
      certificationStatus: 'infeasible',
      certificationSolverPass: solverPass,
    };
  }
  if (solution.status !== 'optimal') {
    throw new Error(
      `Exact optimizer ${stage} exact-optimum certification ended with ${solution.status}.`,
    );
  }
  const validation = validateIntegralVariables(
    solution,
    integerVariables,
    `${stage} exact-optimum certification`,
  );
  const exactProbeValue = exactExpressionValue(
    expression instanceof Var ? expression.times(1) : expression,
    validation.roundedValues,
    `${stage} exact-optimum certification`,
  );
  const improves = direction === 'maximize'
    ? exactProbeValue >= certificationBound
    : exactProbeValue <= certificationBound;
  if (!improves) {
    throw new Error(
      `Exact optimizer ${stage} exact-optimum certification returned an optimal assignment `
      + `with exact objective ${exactProbeValue}, outside the required ${direction} bound `
      + `${certificationBound}.`,
    );
  }
  throw new Error(
    `Exact optimizer ${stage} found a feasible exact ${direction} improvement `
    + `${exactProbeValue} at bound ${certificationBound}; refusing to fix reconstructed `
    + `objective ${reconstructedValue}.`,
  );
}

function exactAdjacentInteger(
  reconstructedValue: number,
  direction: 'maximize' | 'minimize',
  stage: string,
): number {
  if (!Number.isSafeInteger(reconstructedValue)) {
    throw new Error(
      `Exact optimizer ${stage} cannot certify non-safe integer ${reconstructedValue}.`,
    );
  }
  const bound = reconstructedValue + (direction === 'maximize' ? 1 : -1);
  if (!Number.isSafeInteger(bound)) {
    throw new Error(`Exact optimizer ${stage} exact-optimum bound is not a safe integer.`);
  }
  return bound;
}

export function reconstructExactIntegerObjective({
  solution,
  expression,
  integerVariables,
  stage,
}: {
  solution: Pick<Solution, 'objective' | 'getValue'>;
  expression: LinExpr | Var;
  integerVariables: Var[];
  stage: string;
}): {
  value: number;
  rawObjective: number;
  rawObjectiveDelta: number;
  maximumIntegralityResidual: number;
} {
  if (solution.objective === undefined || !Number.isFinite(solution.objective)) {
    throw new Error(`Exact optimizer ${stage} did not return a finite objective.`);
  }
  const validation = validateIntegralVariables(solution, integerVariables, stage);
  const value = exactExpressionValue(
    expression instanceof Var ? expression.times(1) : expression,
    validation.roundedValues,
    stage,
  );
  return {
    value,
    rawObjective: solution.objective,
    rawObjectiveDelta: Math.abs(solution.objective - value),
    maximumIntegralityResidual: validation.maximumResidual,
  };
}

function validateIntegralVariables(
  solution: Pick<Solution, 'getValue'>,
  variables: Var[],
  stage: string,
): { roundedValues: ReadonlyMap<Var, number>; maximumResidual: number } {
  const roundedValues = new Map<Var, number>();
  let maximumResidual = 0;
  for (const variable of variables) {
    const value = solution.getValue(variable);
    if (value === undefined || !Number.isFinite(value)) {
      throw new Error(`Exact optimizer ${stage} returned no finite value for ${variable.name}.`);
    }
    const rounded = Math.round(value);
    const residual = Math.abs(value - rounded);
    maximumResidual = Math.max(maximumResidual, residual);
    if (residual > OPTIMIZER_VARIABLE_INTEGRALITY_TOLERANCE) {
      throw new Error(
        `Exact optimizer ${stage} returned fractional ${variable.type} variable `
        + `${variable.name}=${value} (integrality residual ${residual}).`,
      );
    }
    if (variable.type === 'binary' && rounded !== 0 && rounded !== 1) {
      throw new Error(`Exact optimizer ${stage} returned out-of-domain binary ${variable.name}=${value}.`);
    }
    roundedValues.set(variable, rounded);
  }
  return { roundedValues, maximumResidual };
}

function exactExpressionValue(
  expression: LinExpr,
  roundedValues: ReadonlyMap<Var, number>,
  stage: string,
): number {
  if (!Number.isSafeInteger(expression.constant)) {
    throw new Error(`Exact optimizer ${stage} has a non-safe-integer objective constant.`);
  }
  let exact = BigInt(expression.constant);
  for (const term of expression.terms) {
    if (!Number.isSafeInteger(term.coeff)) {
      throw new Error(
        `Exact optimizer ${stage} has non-safe-integer coefficient ${term.coeff} for ${term.var.name}.`,
      );
    }
    const value = roundedValues.get(term.var);
    if (value === undefined || !Number.isSafeInteger(value)) {
      throw new Error(`Exact optimizer ${stage} did not validate objective variable ${term.var.name}.`);
    }
    exact += BigInt(term.coeff) * BigInt(value);
  }
  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  if (exact > maximum || exact < -maximum) {
    throw new Error(`Exact optimizer ${stage} reconstructed an unsafe integer objective ${exact}.`);
  }
  return Number(exact);
}

function integralModelVariables(context: ModelContext): Var[] {
  return [
    ...context.primary.variables,
    ...context.primary.ratingUsedVariables,
    ...context.backup.variables,
    ...context.backup.ratingUsedVariables,
    context.primary.minimumRating,
    context.backup.minimumRating,
  ];
}

function validateFixedPhases(
  context: ModelContext,
  candidates: OptimizerFormationCandidate[],
  fixed: FixedPhase[],
  solution: Solution,
): void {
  const validation = validateIntegralVariables(
    solution,
    integralModelVariables(context),
    'final fixed-phase validation',
  );
  for (const [index, phase] of fixed.entries()) {
    const expression = fixedPhaseExpression(context, candidates, phase);
    const actual = exactExpressionValue(
      expression instanceof Var ? expression.times(1) : expression,
      validation.roundedValues,
      `final fixed phase ${index}`,
    );
    if (actual !== phase.value) {
      throw new Error(
        `Exact optimizer final fixed phase ${index} (${phase.kind}/${phase.wave}) `
        + `recomputed ${actual}, expected ${phase.value}.`,
      );
    }
  }
}

function numericalExactnessDiagnostics(
  telemetry: SolverTelemetry,
): OptimizerNumericalExactnessDiagnostics {
  return {
    integralityTolerance: OPTIMIZER_VARIABLE_INTEGRALITY_TOLERANCE,
    maximumIntegralityResidual: Math.max(
      0,
      ...telemetry.objectiveReconstructions.map((entry) => entry.maximumIntegralityResidual),
    ),
    maximumConstraintResidual: Math.max(
      0,
      ...telemetry.objectiveReconstructions.map((entry) => entry.maximumConstraintResidual),
    ),
    maximumRawObjectiveDelta: Math.max(
      0,
      ...telemetry.objectiveReconstructions.map((entry) => entry.rawObjectiveDelta),
    ),
    phaseObjectives: telemetry.objectiveReconstructions,
    fixedPhasesValidated: telemetry.fixedPhasesValidated,
  };
}

function mipGapFromSolverLog(lines: string[]): number | null {
  for (const line of [...lines].reverse()) {
    const match = line.match(/^\s*Gap\s+([0-9.]+)%/i);
    if (match?.[1] !== undefined) return Number(match[1]) / 100;
  }
  return null;
}

function maximumConstraintViolation(model: Model, solution: Solution): number {
  const constraints = (model as unknown as {
    constraints: Array<{ expr: LinExpr; sense: '<=' | '>=' | '='; rhs: number }>;
  }).constraints;
  return Math.max(0, ...constraints.map((constraint) => {
    const actual = constraint.expr.constant + constraint.expr.terms.reduce(
      (total, term) => total + term.coeff * (solution.getValue(term.var) ?? 0),
      0,
    );
    return constraint.sense === '<='
      ? Math.max(0, actual - constraint.rhs)
      : constraint.sense === '>='
        ? Math.max(0, constraint.rhs - actual)
        : Math.abs(actual - constraint.rhs);
  }));
}
