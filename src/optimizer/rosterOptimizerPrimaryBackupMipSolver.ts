import { HiGHS, Model, Solution, sum, type LinExpr, type Var } from '@bubblyworld/highs-ts';
import { applyRosterOptimizerExactGapOptions } from './highsExactOptions';
import { primaryBackupObjectiveForCandidates } from './rosterOptimizerObjective';
import type {
  OptimizerFormationCandidate,
  OptimizerPhaseTimings,
  OptimizerRosterDragon,
  OptimizerWave,
  PrimaryBackupOptimizerSolverResult,
} from './rosterOptimizerTypes';

type PhaseCategory = Exclude<keyof OptimizerPhaseTimings, 'modelConstructionMs'>;

interface WaveExpressions {
  variables: Var[];
  legendaryCount: LinExpr;
  epicCount: LinExpr;
  totalRating: LinExpr;
  minimumRating: Var;
  totalRelationshipValueDoubled: LinExpr;
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
}

interface SolverSession {
  highs: HiGHS;
  telemetry: SolverTelemetry;
}

type FixedPhase =
  | { kind: 'scalar'; wave: OptimizerWave; field: ScalarField; value: number }
  | { kind: 'histogram'; wave: OptimizerWave; levels: number[]; value: number }
  | { kind: 'stable'; wave: OptimizerWave; indices: number[]; value: number };

type ScalarField =
  | 'legendaryCount'
  | 'epicCount'
  | 'totalRating'
  | 'minimumRating'
  | 'totalRelationshipValueDoubled'
  | 'totalActiveRelationships';

const histogramChunkSize = 9;
const stableChunkSize = 49;

/** Exact joint two-wave MILP. Every lexicographic optimum is fixed before the
 * next phase and every HiGHS parse uses zero absolute and relative MIP gaps. */
export async function solvePrimaryBackupRosterOptimizerMip(
  inputCandidates: OptimizerFormationCandidate[],
  eligibleDragons: OptimizerRosterDragon[],
  formationsPerWave = 5,
): Promise<PrimaryBackupOptimizerSolverResult> {
  const candidates = [...inputCandidates].sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
  const telemetry: SolverTelemetry = {
    passes: 0,
    nodesVisited: 0,
    branchesPruned: 0,
    phaseTimings: {
      modelConstructionMs: 0,
      primaryRarityMs: 0,
      primaryQualityMs: 0,
      backupRarityMs: 0,
      backupQualityMs: 0,
      stableKeyMs: 0,
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
    const fixed: FixedPhase[] = [];
    const context = measuredBuildModel(
      candidates,
      eligibleDragons,
      formationsPerWave,
      telemetry,
    );

    await maximizeAndFix(context, session, fixed, 'primary', 'legendaryCount',
      'Primary Legendary inclusion', 'primaryRarityMs');
    await maximizeAndFix(context, session, fixed, 'primary', 'epicCount',
      'Primary Epic inclusion', 'primaryRarityMs');
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
    await maximizeAndFix(context, session, fixed, 'primary', 'totalRelationshipValueDoubled',
      'Primary active relationship value', 'primaryQualityMs');
    await maximizeAndFix(context, session, fixed, 'primary', 'totalActiveRelationships',
      'Primary active relationship count', 'primaryQualityMs');

    await maximizeAndFix(context, session, fixed, 'backup', 'legendaryCount',
      'Backup Legendary inclusion', 'backupRarityMs');
    await maximizeAndFix(context, session, fixed, 'backup', 'epicCount',
      'Backup Epic inclusion', 'backupRarityMs');
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
    await maximizeAndFix(context, session, fixed, 'backup', 'totalRelationshipValueDoubled',
      'Backup active relationship value', 'backupQualityMs');
    const numericSolution = await maximizeAndFix(
      context,
      session,
      fixed,
      'backup',
      'totalActiveRelationships',
      'Backup active relationship count',
      'backupQualityMs',
    );

    let primaryIndices = selectedVariableIndices(numericSolution, context.primary.variables);
    let backupIndices = selectedVariableIndices(numericSolution, context.backup.variables);
    if (await hasAlternateWaveSelection({
      candidates,
      eligibleDragons,
      formationsPerWave,
      fixed,
      wave: 'primary',
      selectedIndices: primaryIndices,
      session,
    })) {
      primaryIndices = await refineStableWaveKey(
        context,
        session,
        fixed,
        'primary',
        formationsPerWave,
      );
    }

    const afterPrimary = await solveOptimal(
      context.model,
      session,
      'Primary stable solution key',
      'stableKeyMs',
    );
    primaryIndices = selectedVariableIndices(afterPrimary, context.primary.variables);
    backupIndices = selectedVariableIndices(afterPrimary, context.backup.variables);
    if (await hasAlternateWaveSelection({
      candidates,
      eligibleDragons,
      formationsPerWave,
      fixed,
      wave: 'backup',
      selectedIndices: backupIndices,
      session,
    })) {
      backupIndices = await refineStableWaveKey(
        context,
        session,
        fixed,
        'backup',
        formationsPerWave,
      );
    }

    context.model.minimize(sum(0));
    const finalSolution = await solveOptimal(
      context.model,
      session,
      'combined stable solution key',
      'stableKeyMs',
    );
    primaryIndices = selectedVariableIndices(finalSolution, context.primary.variables);
    backupIndices = selectedVariableIndices(finalSolution, context.backup.variables);
    const primaryCandidates = primaryIndices.map((index) => candidates[index]!);
    const backupCandidates = backupIndices.map((index) => candidates[index]!);
    validateAllocation(primaryCandidates, backupCandidates, formationsPerWave);
    const rarityByDragonId = new Map(
      eligibleDragons.map((dragon) => [dragon.dragonId, dragon.rarity]),
    );
    return {
      optimal: true,
      primaryCandidates,
      backupCandidates,
      objective: primaryBackupObjectiveForCandidates(
        primaryCandidates,
        backupCandidates,
        rarityByDragonId,
      ),
      nodesVisited: telemetry.nodesVisited,
      branchesPruned: telemetry.branchesPruned,
      cacheEntries: 0,
      solverPasses: telemetry.passes,
      phaseTimings: telemetry.phaseTimings,
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
      minimumCandidateRating,
      maximumCandidateRating,
    ),
    backup: buildWaveExpressions(
      model,
      candidates,
      eligibleDragons,
      backupVariables,
      'backup',
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
  candidates.forEach((candidate, index) => {
    model.addConstraint(
      minimumRating.plus(variables[index]!.times(bigM)).leq(candidate.rating + bigM),
      `${wave}_minimum_${index}`,
    );
  });
  return {
    variables,
    legendaryCount: rarityExpression('Legendary'),
    epicCount: rarityExpression('Epic'),
    totalRating: sum(
      ...variables.map((variable, index) => variable.times(candidates[index]!.rating)),
    ),
    minimumRating,
    totalRelationshipValueDoubled: sum(
      ...variables.map((variable, index) =>
        variable.times(Math.round(candidates[index]!.activeRelationshipValue * 2)),
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
  context.model.maximize(expression);
  const solution = await solveOptimal(context.model, session, label, category);
  const value = roundedInteger(solution.objective);
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
    const expression = histogramExpression(candidates, context[wave].variables, levels);
    context.model.minimize(expression);
    const solution = await solveOptimal(
      context.model,
      session,
      `${wave} ascending rating vector`,
      category,
    );
    const value = roundedInteger(solution.objective);
    context.model.addConstraint(expression.eq(value), `fix_${wave}_histogram_${start}`);
    fixed.push({ kind: 'histogram', wave, levels, value });
  }
}

async function hasAlternateWaveSelection({
  candidates,
  eligibleDragons,
  formationsPerWave,
  fixed,
  wave,
  selectedIndices,
  session,
}: {
  candidates: OptimizerFormationCandidate[];
  eligibleDragons: OptimizerRosterDragon[];
  formationsPerWave: number;
  fixed: FixedPhase[];
  wave: OptimizerWave;
  selectedIndices: number[];
  session: SolverSession;
}): Promise<boolean> {
  const probe = measuredBuildModel(
    candidates,
    eligibleDragons,
    formationsPerWave,
    session.telemetry,
  );
  applyFixedPhases(probe, candidates, fixed);
  probe.model.addConstraint(
    sum(...selectedIndices.map((index) => probe[wave].variables[index]!)).leq(
      formationsPerWave - 1,
    ),
    `exclude_${wave}_selection`,
  );
  probe.model.minimize(sum(0));
  const solution = await solveAllowInfeasible(probe.model, session, 'stableKeyMs');
  if (solution.status === 'infeasible') return false;
  if (solution.status !== 'optimal') {
    throw new Error(`Exact optimizer ${wave} stable-key probe ended with ${solution.status}.`);
  }
  return true;
}

async function refineStableWaveKey(
  context: ModelContext,
  session: SolverSession,
  fixed: FixedPhase[],
  wave: OptimizerWave,
  formationsPerWave: number,
): Promise<number[]> {
  const fixedSelected = new Set<number>();
  let latestSelected: number[] = [];
  for (let start = 0; start < context[wave].variables.length; start += stableChunkSize) {
    const indices = integerRange(
      start,
      Math.min(context[wave].variables.length - 1, start + stableChunkSize - 1),
    );
    const expression = stableExpression(context[wave].variables, indices);
    context.model.maximize(expression);
    const solution = await solveOptimal(
      context.model,
      session,
      `${wave} stable solution key`,
      'stableKeyMs',
    );
    const value = roundedInteger(solution.objective);
    context.model.addConstraint(expression.eq(value), `fix_${wave}_stable_${start}`);
    fixed.push({ kind: 'stable', wave, indices, value });
    latestSelected = selectedVariableIndices(solution, context[wave].variables);
    latestSelected
      .filter((index) => index <= indices.at(-1)!)
      .forEach((index) => fixedSelected.add(index));
    if (fixedSelected.size === formationsPerWave) break;
  }
  return latestSelected;
}

function applyFixedPhases(
  context: ModelContext,
  candidates: OptimizerFormationCandidate[],
  fixed: FixedPhase[],
): void {
  fixed.forEach((phase, index) => {
    const expression = phase.kind === 'scalar'
      ? context[phase.wave][phase.field]
      : phase.kind === 'histogram'
        ? histogramExpression(candidates, context[phase.wave].variables, phase.levels)
        : stableExpression(context[phase.wave].variables, phase.indices);
    context.model.addConstraint(expression.eq(phase.value), `replay_fix_${index}`);
  });
}

function histogramExpression(
  candidates: OptimizerFormationCandidate[],
  variables: Var[],
  levels: number[],
): LinExpr {
  const coefficientByRating = new Map(
    levels.map((rating, index) => [rating, 6 ** (levels.length - index - 1)]),
  );
  return sum(
    ...candidates.flatMap((candidate, index) => {
      const coefficient = coefficientByRating.get(candidate.rating);
      return coefficient === undefined ? [] : [variables[index]!.times(coefficient)];
    }),
  );
}

function stableExpression(variables: Var[], indices: number[]): LinExpr {
  return sum(
    ...indices.map((index, offset) =>
      variables[index]!.times(2 ** (indices.length - offset - 1)),
    ),
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
  return context;
}

async function solveOptimal(
  model: Model,
  session: SolverSession,
  stage: string,
  category: PhaseCategory,
) {
  const solution = await solveAllowInfeasible(model, session, category);
  if (solution.status !== 'optimal') {
    throw new Error(`Exact optimizer ${stage} stage ended with ${solution.status}.`);
  }
  return solution;
}

async function solveAllowInfeasible(
  model: Model,
  session: SolverSession,
  category: PhaseCategory,
) {
  session.telemetry.passes += 1;
  const startedAt = performance.now();
  await session.highs.parse(model.print('lp'), 'lp');
  const solution = new Solution(await session.highs.solve());
  session.telemetry.phaseTimings[category] += performance.now() - startedAt;
  return solution;
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
  const match = line.match(/Nodes\s+(\d+)/i) ?? line.match(/(\d+)\s+nodes/i);
  if (match) telemetry.nodesVisited += Number(match[1]);
  const pruned =
    line.match(/Pruned\s+(\d+)/i) ?? line.match(/(\d+)\s+(?:branches|nodes)\s+pruned/i);
  if (pruned) telemetry.branchesPruned += Number(pruned[1]);
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
