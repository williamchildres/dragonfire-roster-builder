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
}

interface SolverSession {
  highs: HiGHS;
  telemetry: SolverTelemetry;
}

interface BestTenFixedObjectives {
  totalRating: number;
  histogramFixes: Array<{ levels: number[]; value: number }>;
  relationshipValueUnits: number;
  relationshipCount: number;
  stableFixes: Array<{ indices: number[]; value: number }>;
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
): Promise<RosterOptimizerSolverResult & { solverPasses: number }> {
  candidates = [...candidates].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  const telemetry: SolverTelemetry = {
    passes: 0,
    nodesVisited: 0,
    branchesPruned: 0,
    logLines: [],
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
    let context = buildModel(candidates, eligibleDragons, targetFormationCount);

    context.model.maximize(context.totalRating);
    const ratingSolution = await solveOptimal(context.model, session, 'total Formation Rating');
    const optimalTotalRating = roundedInteger(ratingSolution.objective);
    context.model.addConstraint(context.totalRating.eq(optimalTotalRating), 'fix_total_rating');

    const ratingLevels = integerRange(
      Math.min(...candidates.map((candidate) => candidate.rating)),
      Math.max(...candidates.map((candidate) => candidate.rating)),
    );
    const histogramFixes: Array<{ levels: number[]; value: number }> = [];
    for (let start = 0; start < ratingLevels.length; start += histogramChunkSize) {
      const levels = ratingLevels.slice(start, start + histogramChunkSize);
      const expression = histogramExpression(candidates, context.variables, levels);
      context.model.minimize(expression);
      const solution = await solveOptimal(context.model, session, 'rating-vector refinement');
      const value = roundedInteger(solution.objective);
      context.model.addConstraint(expression.eq(value), `fix_rating_histogram_${start}`);
      histogramFixes.push({ levels, value });
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
      context = buildModel(candidates, eligibleDragons, targetFormationCount);
      context.model.addConstraint(context.totalRating.eq(optimalTotalRating), 'fix_total_rating');
      histogramFixes.forEach((fix, index) => {
        context.model.addConstraint(
          histogramExpression(candidates, context.variables, fix.levels).eq(fix.value),
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
    const indices = integerRange(
      start,
      Math.min(context.variables.length - 1, start + stableChunkSize - 1),
    );
    const expression = sum(
      ...indices.map((index, offset) =>
        context.variables[index]!.times(2 ** (indices.length - offset - 1)),
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
        reconstructedValue: reconstruction.value,
        start,
      });
    }
    const value = reconstruction.value;
    context.model.addConstraint(expression.eq(value), `fix_stable_${start}`);
    fixed.stableFixes.push({ indices, value });
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
  reconstructedValue,
  start,
}: {
  session: SolverSession;
  candidates: OptimizerFormationCandidate[];
  eligibleDragons: OptimizerRosterDragon[];
  targetFormationCount: number;
  fixed: BestTenFixedObjectives;
  indices: number[];
  reconstructedValue: number;
  start: number;
}): Promise<void> {
  const probe = buildModel(candidates, eligibleDragons, targetFormationCount);
  applyBestTenFixedObjectives(probe, candidates, fixed);
  const expression = sum(
    ...indices.map((index, offset) =>
      probe.variables[index]!.times(2 ** (indices.length - offset - 1)),
    ),
  );
  probe.model.addConstraint(
    expression.geq(reconstructedValue + 1),
    `certify_stable_${start}`,
  );
  probe.model.minimize(sum(0));
  const solution = await solveAllowInfeasible(probe.model, session);
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
      histogramExpression(candidates, context.variables, fix.levels).eq(fix.value),
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
    const expression = sum(
      ...fix.indices.map((candidateIndex, offset) =>
        context.variables[candidateIndex]!.times(
          2 ** (fix.indices.length - offset - 1),
        ),
      ),
    );
    context.model.addConstraint(expression.eq(fix.value), `probe_fix_stable_${index}`);
  });
}

function histogramExpression(
  candidates: OptimizerFormationCandidate[],
  variables: Var[],
  levels: number[],
): LinExpr {
  const coefficientByRating = new Map(
    levels.map((rating, index) => [rating, 11 ** (levels.length - index - 1)]),
  );
  return sum(
    ...candidates.flatMap((candidate, index) => {
      const coefficient = coefficientByRating.get(candidate.rating);
      return coefficient ? [variables[index]!.times(coefficient)] : [];
    }),
  );
}

async function solveOptimal(model: Model, session: SolverSession, stage: string) {
  const solution = await solveAllowInfeasible(model, session);
  if (solution.status !== 'optimal') {
    throw new Error(`Exact optimizer ${stage} stage ended with ${solution.status}.`);
  }
  return solution;
}

async function solveAllowInfeasible(model: Model, session: SolverSession) {
  session.telemetry.passes += 1;
  await session.highs.parse(model.print('lp'), 'lp');
  return new Solution(await session.highs.solve());
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
