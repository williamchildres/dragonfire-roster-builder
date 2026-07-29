import { HiGHS, Model, Solution, sum, type LinExpr, type Var } from '@bubblyworld/highs-ts';
import { applyRosterOptimizerExactGapOptions } from './highsExactOptions';
import {
  compareStrongestFirstCandidates,
  flexiblePowerAwareObjectiveForCandidates,
} from './rosterOptimizerObjective';
import { reconstructExactIntegerObjective } from './rosterOptimizerPrimaryBackupMipSolver';
import {
  RosterOptimizerCancelledError,
  type FlexiblePowerAwareOptimizerSolverResult,
  type OptimizerFormationCandidate,
  type OptimizerPerformanceProfile,
  type OptimizerRosterDragon,
} from './rosterOptimizerTypes';

interface BalancedModel {
  model: Model;
  variables: Var[];
  totalRelationshipValueUnits: LinExpr;
  totalActiveRelationships: LinExpr;
}

interface Telemetry {
  passes: number;
  nodesVisited: number;
  branchesPruned: number;
  performanceProfile: OptimizerPerformanceProfile;
}

/**
 * Exact lexicographic max-min optimizer.
 *
 * For a fixed selection count, a sorted ascending value vector is
 * lexicographically larger exactly when its histogram has fewer selections at
 * the first (lowest) value where the two histograms differ. We therefore visit
 * distinct values from low to high and minimize their counts. Safe-integer
 * radix chunks combine several consecutive histogram digits into one exact
 * MILP phase without changing that order.
 */
export async function solveBalancedRosterOptimizer(
  candidatesInput: readonly OptimizerFormationCandidate[],
  eligibleDragons: readonly OptimizerRosterDragon[],
  formationCount: number,
  shouldCancel?: () => boolean,
): Promise<FlexiblePowerAwareOptimizerSolverResult> {
  const candidates = [...candidatesInput].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  candidates.forEach((candidate) => {
    if (!Number.isSafeInteger(candidate.estimatedPowerUnits)) {
      throw new Error(`Candidate ${candidate.stableCandidateKey} is missing Estimated Power units.`);
    }
  });
  if (formationCount === 1) {
    const selected = [...candidates].sort(compareStrongestFirstCandidates)[0];
    if (!selected) throw new Error('Balanced optimizer has no candidate for one army.');
    return {
      optimal: true,
      selectedCandidates: [selected],
      objective: flexiblePowerAwareObjectiveForCandidates([selected], 'balanced'),
      nodesVisited: candidates.length,
      branchesPruned: candidates.length - 1,
      cacheEntries: 0,
      solverPasses: 0,
      performanceProfile: {
        modelBuilds: 0,
        modelConstructionMs: 0,
        certificationPasses: 0,
        skippedPhases: 4,
        prunedVariables: candidates.length - 1,
        phases: [{
          stage: 'balanced one-army exact reduction',
          category: 'power',
          solverPass: 0,
          elapsedMs: 0,
          variableCount: 0,
          constraintCount: 0,
          certification: false,
          exactSearchNodes: candidates.length,
        }],
      },
    };
  }
  const telemetry: Telemetry = {
    passes: 0,
    nodesVisited: 0,
    branchesPruned: 0,
    performanceProfile: {
      modelBuilds: 0,
      modelConstructionMs: 0,
      certificationPasses: 0,
      skippedPhases: 0,
      prunedVariables: 0,
      phases: [],
    },
  };
  const highs = await HiGHS.create({
    console: {
      log: (line) => recordSolverLog(line, telemetry),
      error: (line) => recordSolverLog(line, telemetry),
    },
  });
  applyRosterOptimizerExactGapOptions(highs);
  try {
    const buildStartedAt = performance.now();
    const context = buildModel(candidates, eligibleDragons, formationCount);
    telemetry.performanceProfile.modelBuilds = 1;
    telemetry.performanceProfile.modelConstructionMs = performance.now() - buildStartedAt;

    await refineHistogram({
      context,
      values: candidates.map((candidate) => candidate.estimatedPowerUnits!),
      formationCount,
      label: 'balanced Estimated Power vector',
      category: 'power',
      highs,
      telemetry,
      shouldCancel,
    });
    await refineHistogram({
      context,
      values: candidates.map((candidate) => candidate.rating),
      formationCount,
      label: 'balanced Formation Rating vector',
      category: 'rating-vector',
      highs,
      telemetry,
      shouldCancel,
    });

    await maximizeAndFix(
      context,
      context.totalRelationshipValueUnits,
      'balanced relationship value',
      'relationship-value',
      highs,
      telemetry,
      shouldCancel,
    );
    const finalNumericSolution = await maximizeAndFix(
      context,
      context.totalActiveRelationships,
      'balanced relationship count',
      'relationship-count',
      highs,
      telemetry,
      shouldCancel,
    );

    const numericCandidates = selectedVariableIndices(
      finalNumericSolution,
      context.variables,
    ).map((index) => candidates[index]!);
    const numericTarget = flexiblePowerAwareObjectiveForCandidates(
      numericCandidates,
      'balanced',
    );
    const selectedIndices = await selectLexicographicallyStableFace({
      context,
      candidates,
      formationCount,
      highs,
      telemetry,
      shouldCancel,
    });

    const selectedCandidates = selectedIndices.map((index) => candidates[index]!);
    validateAllocation(selectedCandidates, formationCount);
    const stableObjective = flexiblePowerAwareObjectiveForCandidates(
      selectedCandidates,
      'balanced',
    );
    if (
      stableObjective.ascendingEstimatedPowerUnits.join(',') !==
        numericTarget.ascendingEstimatedPowerUnits.join(',') ||
      stableObjective.ascendingRatingVector.join(',') !==
        numericTarget.ascendingRatingVector.join(',') ||
      stableObjective.totalRelationshipValueUnits !==
        numericTarget.totalRelationshipValueUnits ||
      stableObjective.totalActiveRelationships !==
        numericTarget.totalActiveRelationships
    ) {
      throw new Error('Exact balanced stable-key phase changed the proven numeric objective.');
    }
    return {
      optimal: true,
      selectedCandidates,
      objective: stableObjective,
      nodesVisited: telemetry.nodesVisited,
      branchesPruned: telemetry.branchesPruned,
      cacheEntries: 0,
      solverPasses: telemetry.passes,
      performanceProfile: telemetry.performanceProfile,
    };
  } finally {
    highs.free();
  }
}

/**
 * Minimizes the sorted candidate-key sequence on the already fixed numeric
 * optimal face. Candidates are ordered by stable key, so this is equivalent to
 * lexicographically maximizing their binary selection vector. Twenty-bit radix
 * chunks stay far below the safe-integer limit. Each optimized chunk is then
 * fixed with coefficient-one binary constraints, avoiding both floating-point
 * equality on the radix value and enumeration of every tied allocation.
 */
async function selectLexicographicallyStableFace({
  context,
  candidates,
  formationCount,
  highs,
  telemetry,
  shouldCancel,
}: {
  context: BalancedModel;
  candidates: readonly OptimizerFormationCandidate[];
  formationCount: number;
  highs: HiGHS;
  telemetry: Telemetry;
  shouldCancel?: () => boolean;
}): Promise<number[]> {
  const selectedIndices: number[] = [];
  const chunkSize = 20;
  for (
    let start = 0;
    start < candidates.length && selectedIndices.length < formationCount;
    start += chunkSize
  ) {
    checkCancelled(shouldCancel);
    const end = Math.min(start + chunkSize, candidates.length);
    const chunkVariables = context.variables.slice(start, end);
    const expression = sum(...chunkVariables.map((variable, offset) =>
      variable.times(2 ** (chunkVariables.length - offset - 1)),
    ));
    context.model.maximize(expression);
    const solution = await solveOptimal(
      context,
      highs,
      telemetry,
      `balanced stable keys ${start + 1}-${end}`,
      'stable-key',
      true,
    );
    reconstructedInteger(
      solution,
      expression,
      context.variables,
      `balanced stable keys ${start + 1}-${end}`,
    );
    for (let index = start; index < end; index += 1) {
      const variable = context.variables[index]!;
      const selected = (solution.getValue(variable) ?? 0) > 0.5 ? 1 : 0;
      context.model.addConstraint(
        variable.times(1).eq(selected),
        `fix_stable_key_${index}`,
      );
      if (selected === 1) selectedIndices.push(index);
    }
  }
  if (selectedIndices.length !== formationCount) {
    throw new Error('Exact balanced optimizer could not certify its stable-key face.');
  }
  return selectedIndices;
}

async function refineHistogram({
  context,
  values,
  formationCount,
  label,
  category,
  highs,
  telemetry,
  shouldCancel,
}: {
  context: BalancedModel;
  values: number[];
  formationCount: number;
  label: string;
  category: 'power' | 'rating-vector';
  highs: HiGHS;
  telemetry: Telemetry;
  shouldCancel?: () => boolean;
}): Promise<void> {
  const levels = [...new Set(values)].sort((left, right) => left - right);
  const radix = formationCount + 1;
  const chunkSize = Math.max(
    1,
    Math.floor(Math.log(Number.MAX_SAFE_INTEGER / formationCount) / Math.log(radix)),
  );
  for (let start = 0; start < levels.length; start += chunkSize) {
    checkCancelled(shouldCancel);
    const chunk = levels.slice(start, start + chunkSize);
    const weights = chunk.map(
      (_level, index) => radix ** (chunk.length - index - 1),
    );
    const coefficientByValue = new Map(
      chunk.map((level, index) => [level, weights[index]!]),
    );
    const expression = sum(...values.flatMap((value, index) => {
      const coefficient = coefficientByValue.get(value);
      return coefficient === undefined
        ? []
        : [context.variables[index]!.times(coefficient)];
    }));
    context.model.minimize(expression);
    const solution = await solveOptimal(
      context,
      highs,
      telemetry,
      `${label} ${start + 1}-${start + chunk.length}`,
      category,
    );
    reconstructedInteger(
      solution,
      expression,
      context.variables,
      label,
    );
    const selectedCountByLevel = new Map<number, number>();
    values.forEach((value, index) => {
      if (!coefficientByValue.has(value)) return;
      if ((solution.getValue(context.variables[index]!) ?? 0) > 0.5) {
        selectedCountByLevel.set(value, (selectedCountByLevel.get(value) ?? 0) + 1);
      }
    });
    const selectedLevels = new Set(selectedCountByLevel.keys());
    const zeroVariables = values.flatMap((value, index) =>
      coefficientByValue.has(value) && !selectedLevels.has(value)
        ? [context.variables[index]!]
        : [],
    );
    if (zeroVariables.length > 0) {
      context.model.addConstraint(
        sum(...zeroVariables).eq(0),
        `fix_${category.replaceAll('-', '_')}_${start}_zeros`,
      );
    }
    selectedCountByLevel.forEach((selectedCount, level) => {
      context.model.addConstraint(
        sum(...values.flatMap((value, index) =>
          value === level ? [context.variables[index]!] : [],
        )).eq(selectedCount),
        `fix_${category.replaceAll('-', '_')}_${start}_${level}`,
      );
    });
  }
}

async function maximizeAndFix(
  context: BalancedModel,
  expression: LinExpr,
  label: string,
  category: 'relationship-value' | 'relationship-count',
  highs: HiGHS,
  telemetry: Telemetry,
  shouldCancel?: () => boolean,
): Promise<Solution> {
  checkCancelled(shouldCancel);
  context.model.maximize(expression);
  const solution = await solveOptimal(context, highs, telemetry, label, category);
  const optimum = reconstructedInteger(
    solution,
    expression,
    context.variables,
    label,
  );
  context.model.addConstraint(
    expression.eq(optimum),
    `fix_${category.replaceAll('-', '_')}`,
  );
  return solution;
}

function buildModel(
  candidates: readonly OptimizerFormationCandidate[],
  eligibleDragons: readonly OptimizerRosterDragon[],
  formationCount: number,
): BalancedModel {
  const model = new Model();
  const variables = candidates.map((_candidate, index) =>
    model.boolVar(`formation_${String(index).padStart(5, '0')}`),
  );
  model.addConstraint(sum(...variables).eq(formationCount), 'formation_count');
  for (const dragon of eligibleDragons) {
    model.addConstraint(
      sum(...candidates.flatMap((candidate, index) =>
        candidate.dragonIds.includes(dragon.dragonId) ? [variables[index]!] : [],
      )).leq(1),
      `dragon_${dragon.dragonId}`,
    );
  }
  return {
    model,
    variables,
    totalRelationshipValueUnits: sum(...variables.map((variable, index) =>
      variable.times(candidates[index]!.adjustedRelationshipValueUnits),
    )),
    totalActiveRelationships: sum(...variables.map((variable, index) =>
      variable.times(candidates[index]!.activeRelationshipCount),
    )),
  };
}

async function solveOptimal(
  context: BalancedModel,
  highs: HiGHS,
  telemetry: Telemetry,
  stage: string,
  category: OptimizerPerformanceProfile['phases'][number]['category'],
  certification = false,
): Promise<Solution> {
  telemetry.passes += 1;
  const startedAt = performance.now();
  await highs.parse(context.model.print('lp'), 'lp');
  const solution = new Solution(await highs.solve());
  const inventory = context.model as unknown as {
    variables: readonly Var[];
    constraints: readonly unknown[];
  };
  telemetry.performanceProfile.phases.push({
    stage,
    category,
    solverPass: telemetry.passes,
    elapsedMs: performance.now() - startedAt,
    variableCount: inventory.variables.length,
    constraintCount: inventory.constraints.length,
    certification,
  });
  if (certification) telemetry.performanceProfile.certificationPasses += 1;
  if (solution.status !== 'optimal') {
    throw new Error(`Exact balanced optimizer ${stage} ended with ${solution.status}.`);
  }
  return solution;
}

function selectedVariableIndices(solution: Solution, variables: Var[]): number[] {
  return variables.flatMap((variable, index) =>
    (solution.getValue(variable) ?? 0) > 0.5 ? [index] : [],
  );
}

function reconstructedInteger(
  solution: Solution,
  expression: LinExpr,
  variables: Var[],
  stage: string,
): number {
  return reconstructExactIntegerObjective({
    solution,
    expression,
    integerVariables: variables,
    stage,
  }).value;
}

function validateAllocation(
  candidates: readonly OptimizerFormationCandidate[],
  formationCount: number,
): void {
  const dragonIds = candidates.flatMap((candidate) => candidate.dragonIds);
  if (
    candidates.length !== formationCount ||
    new Set(dragonIds).size !== formationCount * 3
  ) {
    throw new Error('Exact balanced optimizer returned an invalid allocation.');
  }
}

function checkCancelled(shouldCancel?: () => boolean): void {
  if (shouldCancel?.()) throw new RosterOptimizerCancelledError();
}

function recordSolverLog(line: string, telemetry: Telemetry): void {
  const nodeMatch = line.match(/Nodes\s+(\d+)/i) ?? line.match(/(\d+)\s+nodes/i);
  if (nodeMatch) telemetry.nodesVisited += Number(nodeMatch[1]);
  const prunedMatch =
    line.match(/Pruned\s+(\d+)/i) ??
    line.match(/(\d+)\s+(?:branches|nodes)\s+pruned/i);
  if (prunedMatch) telemetry.branchesPruned += Number(prunedMatch[1]);
}
