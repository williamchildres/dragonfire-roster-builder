import { HiGHS, Model, Solution, sum, type LinExpr, type Var } from '@bubblyworld/highs-ts';
import type { DragonRarity } from '../models/dragon';
import { applyRosterOptimizerExactGapOptions } from './highsExactOptions';
import { objectiveForCandidates } from './rosterOptimizerObjective';
import {
  evaluateExactOptimumCertification,
  OPTIMIZER_MATERIAL_OBJECTIVE_DELTA,
  reconstructExactIntegerObjective,
} from './rosterOptimizerPrimaryBackupMipSolver';
import type {
  OptimizerFormationCandidate,
  OptimizerPerformanceProfile,
  OptimizerRosterDragon,
  RosterOptimizerSolverResult,
} from './rosterOptimizerTypes';

interface ModelContext {
  model: Model;
  variables: Var[];
  totalRating: LinExpr;
  totalRelationshipValueUnits: LinExpr;
  totalActiveRelationships: LinExpr;
}

interface SolverTelemetry {
  passes: number;
  nodesVisited: number;
  branchesPruned: number;
  logLines: string[];
  performanceProfile: OptimizerPerformanceProfile;
}

interface SolverSession {
  highs: HiGHS;
  telemetry: SolverTelemetry;
}

interface BestTenFixedObjectives {
  totalRating: number;
  histogramFixes: Array<{
    levels: number[];
    weights: readonly number[];
    value: number;
  }>;
  relationshipValueUnits: number;
  relationshipCount: number;
  stableFixes: Array<{
    indices: number[];
    weights: readonly number[];
    maximumSelections: number;
    value: number;
  }>;
}

const histogramChunkSize = 8;
const stableChunkSize = 49;

/**
 * Browser-compatible exact MILP solver. HiGHS must return `optimal` for every
 * lexicographic phase; time/iteration/solution limits are rejected.
 */
export async function solveRosterOptimizerMip(
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  targetFormationCount = 10,
): Promise<RosterOptimizerSolverResult & {
  solverPasses: number;
  performanceProfile: OptimizerPerformanceProfile;
}> {
  candidates = [...candidates].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  const telemetry: SolverTelemetry = {
    passes: 0,
    nodesVisited: 0,
    branchesPruned: 0,
    logLines: [],
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
  };
  applyRosterOptimizerExactGapOptions(session.highs);
  try {
    const rarityByDragonId = new Map(
      eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
    );
    let context = measuredBuildModel(
      candidates,
      eligibleDragons,
      targetFormationCount,
      telemetry,
    );

    context.model.maximize(context.totalRating);
    const ratingSolution = await solveOptimal(context.model, session, 'total Formation Rating');
    const optimalTotalRating = roundedInteger(ratingSolution.objective);
    context.model.addConstraint(context.totalRating.eq(optimalTotalRating), 'fix_total_rating');

    const ratingLevels = integerRange(
      Math.min(...candidates.map((candidate) => candidate.rating)),
      Math.max(...candidates.map((candidate) => candidate.rating)),
    );
    const histogramFixes: BestTenFixedObjectives['histogramFixes'] = [];
    for (let ratingStart = 0; ratingStart < ratingLevels.length; ratingStart += histogramChunkSize) {
      const levels = ratingLevels.slice(ratingStart, ratingStart + histogramChunkSize);
      const weights = levels.map(
        (_rating, index) => 11 ** (levels.length - index - 1),
      );
      const expression = histogramExpression(
        candidates,
        context.variables,
        levels,
        weights,
      );
      context.model.minimize(expression);
      const solution = await solveOptimal(context.model, session, 'rating-vector refinement');
      const value = roundedInteger(solution.objective);
      context.model.addConstraint(
        expression.eq(value),
        `fix_rating_histogram_${ratingStart}`,
      );
      histogramFixes.push({ levels, weights, value });
    }

    context.model.maximize(context.totalRelationshipValueUnits);
    const relationshipSolution = await solveOptimal(
      context.model,
      session,
      'active relationship value',
    );
    const optimalRelationshipValueUnits = roundedInteger(relationshipSolution.objective);
    context.model.addConstraint(
      context.totalRelationshipValueUnits.eq(optimalRelationshipValueUnits),
      'fix_relationship_value',
    );

    context.model.maximize(context.totalActiveRelationships);
    const relationshipCountSolution = await solveOptimal(
      context.model,
      session,
      'active relationship count',
    );
    const optimalRelationshipCount = roundedInteger(relationshipCountSolution.objective);
    context.model.addConstraint(
      context.totalActiveRelationships.eq(optimalRelationshipCount),
      'fix_relationship_count',
    );

    let selectedIndices = selectedVariableIndices(relationshipCountSolution, context.variables);
    context.model.addConstraint(
      sum(...selectedIndices.map((index) => context.variables[index]!)).leq(
        targetFormationCount - 1,
      ),
      'exclude_first_optimum',
    );
    context.model.minimize(sum(0));
    const alternate = await solveAllowInfeasible(context.model, session);

    if (alternate.status !== 'infeasible') {
      context = measuredBuildModel(
        candidates,
        eligibleDragons,
        targetFormationCount,
        telemetry,
      );
      context.model.addConstraint(context.totalRating.eq(optimalTotalRating), 'fix_total_rating');
      histogramFixes.forEach((fix, index) => {
        context.model.addConstraint(
          histogramExpression(
            candidates,
            context.variables,
            fix.levels,
            fix.weights,
          ).eq(fix.value),
          `fix_rating_histogram_${index}`,
        );
      });
      context.model.addConstraint(
        context.totalRelationshipValueUnits.eq(optimalRelationshipValueUnits),
        'fix_relationship_value',
      );
      context.model.addConstraint(
        context.totalActiveRelationships.eq(optimalRelationshipCount),
        'fix_relationship_count',
      );
      selectedIndices = await refineStableSolutionKey({
        context,
        session,
        candidates,
        eligibleDragons,
        targetFormationCount,
        fixed: {
          totalRating: optimalTotalRating,
          histogramFixes,
          relationshipValueUnits: optimalRelationshipValueUnits,
          relationshipCount: optimalRelationshipCount,
          stableFixes: [],
        },
      });
    }

    const selectedCandidates = selectedIndices.map((index) => candidates[index]!);
    const objective = objectiveForCandidates(selectedCandidates, rarityByDragonId);
    if (
      selectedCandidates.length !== targetFormationCount ||
      new Set(selectedCandidates.flatMap((candidate) => candidate.dragonIds)).size !==
        targetFormationCount * 3
    ) {
      throw new Error('Exact optimizer returned an invalid formation allocation.');
    }
    return {
      optimal: true,
      selectedCandidates,
      objective,
      nodesVisited: telemetry.nodesVisited,
      branchesPruned: telemetry.branchesPruned,
      cacheEntries: 0,
      solverPasses: telemetry.passes,
      performanceProfile: telemetry.performanceProfile,
    };
  } finally {
    session.highs.free();
  }
}

function buildModel(
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  targetFormationCount: number,
): ModelContext {
  const model = new Model();
  const variables = candidates.map((_candidate, index) =>
    model.boolVar(`formation_${String(index).padStart(4, '0')}`),
  );
  model.addConstraint(sum(...variables).eq(targetFormationCount), 'formation_count');
  for (const dragon of eligibleDragons) {
    const containing = candidates.flatMap((candidate, index) =>
      candidate.dragonIds.includes(dragon.dragonId) ? [variables[index]!] : [],
    );
    model.addConstraint(sum(...containing).leq(1), `dragon_${dragon.dragonId}`);
  }

  const requiredRarity = maximumRarityCounts(eligibleDragons, targetFormationCount * 3);
  for (const rarity of ['Legendary', 'Epic'] as const) {
    const matching = candidates.flatMap((candidate, index) => {
      const count = candidate.dragonIds.filter(
        (dragonId) =>
          eligibleDragons.find((dragon) => dragon.dragonId === dragonId)?.rarity === rarity,
      ).length;
      return count > 0 ? [variables[index]!.times(count)] : [];
    });
    model.addConstraint(
      sum(...matching).eq(requiredRarity[rarity]),
      `rarity_${rarity.toLowerCase()}`,
    );
  }

  return {
    model,
    variables,
    totalRating: sum(
      ...variables.map((variable, index) => variable.times(candidates[index]!.rating)),
    ),
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

async function refineStableSolutionKey({
  context,
  session,
  candidates,
  eligibleDragons,
  targetFormationCount,
  fixed,
}: {
  context: ModelContext;
  session: SolverSession;
  candidates: OptimizerFormationCandidate[];
  eligibleDragons: OptimizerRosterDragon[];
  targetFormationCount: number;
  fixed: BestTenFixedObjectives;
}): Promise<number[]> {
  const fixedSelected = new Set<number>();
  let latestSelected: number[] = [];
  for (let start = 0; start < context.variables.length; start += stableChunkSize) {
    const maximumSelections = targetFormationCount - fixedSelected.size;
    const chunkLength = Math.min(stableChunkSize, context.variables.length - start);
    const weights = Array.from(
      { length: chunkLength },
      (_unused, offset) => 2 ** (chunkLength - offset - 1),
    );
    const indices = integerRange(
      start,
      start + weights.length - 1,
    );
    const expression = sum(
      ...indices.map((index, offset) =>
        context.variables[index]!.times(weights[offset]!),
      ),
    );
    context.model.maximize(expression);
    const solution = await solveOptimal(context.model, session, 'stable solution key');
    const reconstruction = reconstructExactIntegerObjective({
      solution,
      expression,
      integerVariables: context.variables,
      stage: 'Best Ten stable solution key',
    });
    if (reconstruction.rawObjectiveDelta > OPTIMIZER_MATERIAL_OBJECTIVE_DELTA) {
      await certifyBestTenStableOptimum({
        session,
        candidates,
        eligibleDragons,
        targetFormationCount,
        fixed,
        indices,
        weights,
        reconstructedValue: reconstruction.value,
        start,
      });
    }
    const value = reconstruction.value;
    addStableVariableFixes(
      context.model,
      context.variables,
      indices,
      weights,
      value,
      `fix_stable_${start}`,
    );
    fixed.stableFixes.push({
      indices,
      weights,
      maximumSelections,
      value,
    });
    latestSelected = selectedVariableIndices(solution, context.variables);
    latestSelected
      .filter((index) => index <= indices.at(-1)!)
      .forEach((index) => fixedSelected.add(index));
    if (fixedSelected.size === targetFormationCount) break;
  }
  return latestSelected;
}

async function certifyBestTenStableOptimum({
  session,
  candidates,
  eligibleDragons,
  targetFormationCount,
  fixed,
  indices,
  weights,
  reconstructedValue,
  start,
}: {
  session: SolverSession;
  candidates: OptimizerFormationCandidate[];
  eligibleDragons: OptimizerRosterDragon[];
  targetFormationCount: number;
  fixed: BestTenFixedObjectives;
  indices: number[];
  weights: readonly number[];
  reconstructedValue: number;
  start: number;
}): Promise<void> {
  const probe = measuredBuildModel(
    candidates,
    eligibleDragons,
    targetFormationCount,
    session.telemetry,
  );
  applyBestTenFixedObjectives(probe, candidates, fixed);
  const expression = sum(
    ...indices.map((index, offset) =>
      probe.variables[index]!.times(weights[offset]!),
    ),
  );
  probe.model.addConstraint(
    expression.geq(reconstructedValue + 1),
    `certify_stable_${start}`,
  );
  probe.model.minimize(sum(0));
  const solution = await solveAllowInfeasible(
    probe.model,
    session,
    'Best Ten stable-key certification',
    'certification',
    true,
  );
  evaluateExactOptimumCertification({
    solution,
    expression,
    integerVariables: probe.variables,
    direction: 'maximize',
    reconstructedValue,
    stage: 'Best Ten stable solution key',
    solverPass: session.telemetry.passes,
  });
}

function applyBestTenFixedObjectives(
  context: ModelContext,
  candidates: OptimizerFormationCandidate[],
  fixed: BestTenFixedObjectives,
): void {
  context.model.addConstraint(
    context.totalRating.eq(fixed.totalRating),
    'probe_fix_total_rating',
  );
  fixed.histogramFixes.forEach((fix, index) => {
    context.model.addConstraint(
      histogramExpression(
        candidates,
        context.variables,
        fix.levels,
        fix.weights,
      ).eq(fix.value),
      `probe_fix_rating_histogram_${index}`,
    );
  });
  context.model.addConstraint(
    context.totalRelationshipValueUnits.eq(fixed.relationshipValueUnits),
    'probe_fix_relationship_value',
  );
  context.model.addConstraint(
    context.totalActiveRelationships.eq(fixed.relationshipCount),
    'probe_fix_relationship_count',
  );
  fixed.stableFixes.forEach((fix, index) => {
    addStableVariableFixes(
      context.model,
      context.variables,
      fix.indices,
      fix.weights,
      fix.value,
      `probe_fix_stable_${index}`,
    );
  });
}

function addStableVariableFixes(
  model: Model,
  variables: Var[],
  indices: number[],
  weights: readonly number[],
  value: number,
  name: string,
): void {
  model.addConstraint(
    sum(...indices.map((index, offset) =>
      variables[index]!.times(weights[offset]!),
    )).eq(value),
    name,
  );
}

function histogramExpression(
  candidates: OptimizerFormationCandidate[],
  variables: Var[],
  levels: number[],
  weights: readonly number[] = levels.map(
    (_rating, index) => 11 ** (levels.length - index - 1),
  ),
): LinExpr {
  const coefficientByRating = new Map(
    levels.map((rating, index) => [rating, weights[index]!]),
  );
  return sum(
    ...candidates.flatMap((candidate, index) => {
      const coefficient = coefficientByRating.get(candidate.rating);
      return coefficient ? [variables[index]!.times(coefficient)] : [];
    }),
  );
}

async function solveOptimal(model: Model, session: SolverSession, stage: string) {
  const solution = await solveAllowInfeasible(
    model,
    session,
    stage,
    bestTenProfileCategory(stage),
  );
  if (solution.status !== 'optimal') {
    throw new Error(`Exact optimizer ${stage} stage ended with ${solution.status}.`);
  }
  return solution;
}

async function solveAllowInfeasible(
  model: Model,
  session: SolverSession,
  stage = 'Best Ten alternate-selection probe',
  category: OptimizerPerformanceProfile['phases'][number]['category'] = 'stable-key',
  certification = false,
) {
  session.telemetry.passes += 1;
  const startedAt = performance.now();
  await session.highs.parse(model.print('lp'), 'lp');
  const solution = new Solution(await session.highs.solve());
  if (certification) session.telemetry.performanceProfile.certificationPasses += 1;
  session.telemetry.performanceProfile.phases.push({
    stage,
    category,
    solverPass: session.telemetry.passes,
    elapsedMs: performance.now() - startedAt,
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

function measuredBuildModel(
  candidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  targetFormationCount: number,
  telemetry: SolverTelemetry,
): ModelContext {
  const startedAt = performance.now();
  telemetry.performanceProfile.modelBuilds += 1;
  const context = buildModel(candidates, eligibleDragons, targetFormationCount);
  telemetry.performanceProfile.modelConstructionMs += performance.now() - startedAt;
  return context;
}

function bestTenProfileCategory(
  stage: string,
): OptimizerPerformanceProfile['phases'][number]['category'] {
  if (stage.includes('total Formation Rating')) return 'total-rating';
  if (stage.includes('rating-vector')) return 'rating-vector';
  if (stage.includes('relationship value')) return 'relationship-value';
  if (stage.includes('relationship count')) return 'relationship-count';
  return 'stable-key';
}

function recordSolverLog(line: string, telemetry: SolverTelemetry): void {
  telemetry.logLines.push(line);
  const match = line.match(/Nodes\s+(\d+)/i) ?? line.match(/(\d+)\s+nodes/i);
  if (match) telemetry.nodesVisited += Number(match[1]);
  const pruned =
    line.match(/Pruned\s+(\d+)/i) ?? line.match(/(\d+)\s+(?:branches|nodes)\s+pruned/i);
  if (pruned) telemetry.branchesPruned += Number(pruned[1]);
}

function selectedVariableIndices(
  solution: Awaited<ReturnType<Model['solve']>>,
  variables: Var[],
): number[] {
  return variables.flatMap((variable, index) =>
    (solution.getValue(variable) ?? 0) > 0.5 ? [index] : [],
  );
}

function maximumRarityCounts(
  dragons: OptimizerRosterDragon[],
  selectedCount: number,
): Record<DragonRarity, number> {
  const rank: Record<DragonRarity, number> = { Legendary: 2, Epic: 1, Rare: 0 };
  const selected = [...dragons]
    .sort(
      (left, right) =>
        rank[right.rarity] - rank[left.rarity] || left.dragonId.localeCompare(right.dragonId),
    )
    .slice(0, selectedCount);
  return {
    Legendary: selected.filter((dragon) => dragon.rarity === 'Legendary').length,
    Epic: selected.filter((dragon) => dragon.rarity === 'Epic').length,
    Rare: selected.filter((dragon) => dragon.rarity === 'Rare').length,
  };
}

function roundedInteger(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error('Exact optimizer did not return a finite objective.');
  }
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) > 1e-3) {
    throw new Error(`Exact optimizer returned non-integral objective ${value}.`);
  }
  return rounded;
}

function integerRange(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}
