import { Model, Solution } from '@bubblyworld/highs-ts';
import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import {
  LIVE_33_PROGRESSION_REGRESSION,
  live33ProgressionRegressionRoster,
} from '../audit/live33ProgressionRegression';
import { estimateDragonPower } from '../power/estimatedDragonPower';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import {
  evaluateExactOptimumCertification,
  OPTIMIZER_MATERIAL_OBJECTIVE_DELTA,
  OPTIMIZER_VARIABLE_INTEGRALITY_TOLERANCE,
  reconstructExactIntegerObjective,
} from '../optimizer/rosterOptimizerPrimaryBackupMipSolver';
import { determinePrimaryPowerCutoff } from '../optimizer/rosterOptimizerPower';
import { RosterOptimizerCancelledError } from '../optimizer/rosterOptimizerTypes';

const expectedPrimary = [
  'vhagar', 'tessarion', 'kalspire', 'crimson', 'sheepstealer', 'caraxes', 'velar',
  'tashix', 'rhysarion', 'venator', 'syrax', 'seasmoke', 'malachite', 'shadowsong',
  'daemoros',
].sort();
const expectedBackup = [
  'jagadrix', 'sunfyre', 'vaeldra', 'zivern', 'vermax', 'feskar', 'tairax',
  'thunderstrike', 'bevlorin', 'vesper', 'shimmer', 'nyrena', 'arulix', 'antares',
  'dawnseeker',
].sort();
describe('Power-Aware live 33-dragon numerical regression', () => {
  it('independently reproduces the exact Power partitions without cutoff ties', () => {
    const rarityById = new Map(dragons.map((dragon) => [dragon.id, dragon.rarity]));
    const estimates = new Map(Object.entries(LIVE_33_PROGRESSION_REGRESSION).map(
      ([dragonId, progression]) => [dragonId, estimateDragonPower({
        rarity: rarityById.get(dragonId)!,
        starRank: progression.starRank,
        dragonLevel: progression.dragonLevel,
      })],
    ));
    const primaryCutoff = determinePrimaryPowerCutoff(estimates, 15);
    const primaryPool = [
      ...primaryCutoff.aboveCutoffDragonIds,
      ...primaryCutoff.cutoffTiedDragonIds,
    ].sort();
    expect(primaryPool).toEqual(expectedPrimary);
    expect(primaryCutoff).toMatchObject({
      cutoffPowerUnits: 2054,
      cutoffTiedDragonIds: ['daemoros'],
      requiredCutoffTieCount: 1,
      exactPrimaryTotalPowerUnits: 37576,
    });

    const primarySet = new Set(expectedPrimary);
    const remaining = new Map([...estimates].filter(([dragonId]) => !primarySet.has(dragonId)));
    const backupCutoff = determinePrimaryPowerCutoff(remaining, 15);
    const backupPool = [
      ...backupCutoff.aboveCutoffDragonIds,
      ...backupCutoff.cutoffTiedDragonIds,
    ].sort();
    expect(backupPool).toEqual(expectedBackup);
    expect(backupCutoff).toMatchObject({
      cutoffPowerUnits: 1300,
      cutoffTiedDragonIds: ['dawnseeker'],
      requiredCutoffTieCount: 1,
      exactPrimaryTotalPowerUnits: 22707,
    });
  });

  it('finishes contract-v5 Strongest First and remains deterministic in forward, reversed, and repeated order', async () => {
    const forwardRoster = live33ProgressionRegressionRoster();
    const reversedRoster = Object.fromEntries(Object.entries(forwardRoster).reverse());
    const forward = await optimizeCurrentRoster(
      forwardRoster,
      'strongest-first',
      10,
    );
    const reversed = await optimizeCurrentRoster(
      reversedRoster,
      'strongest-first',
      10,
    );
    const repeated = await optimizeCurrentRoster(
      forwardRoster,
      'strongest-first',
      10,
    );

    for (const result of [forward, reversed, repeated]) {
      expect(result.optimal).toBe(true);
      if (!result.optimal || !('allocationMode' in result)) continue;
      expect(result.contractVersion).toBe(5);
      expect(result.allocationMode).toBe('strongest-first');
      expect(result.requestedFormationCount).toBe(10);
      expect(result.generatedFormationCount).toBe(10);
      expect(result.formations).toHaveLength(10);
      expect(result.usedDragonIds).toHaveLength(30);
      expect(new Set(result.usedDragonIds)).toHaveProperty('size', 30);
      expect(new Set(result.formations.flatMap((formation) => formation.dragonIds)).size)
        .toBe(30);
      expect(result.unusedDragonIds).toHaveLength(3);
      expect(result.diagnostics.candidateCount).toBe(5456);
      expect(result.diagnostics.solverPasses).toBe(10);
      expect(result.diagnostics.performanceProfile?.modelBuilds).toBe(0);
      expect(result.diagnostics.performanceProfile?.certificationPasses).toBe(0);
    }
    if (!forward.optimal || !reversed.optimal || !repeated.optimal) return;
    expect(reversed.optimizerSolutionHash).toBe(forward.optimizerSolutionHash);
    expect(reversed.optimizerResultHash).toBe(forward.optimizerResultHash);
    expect(repeated.optimizerSolutionHash).toBe(forward.optimizerSolutionHash);
    expect(repeated.optimizerResultHash).toBe(forward.optimizerResultHash);
  }, 600_000);

  it('returns no partial result when cancellation is requested', async () => {
    await expect(optimizeCurrentRoster(
      live33ProgressionRegressionRoster(),
      'strongest-first',
      10,
      () => true,
    )).rejects.toBeInstanceOf(RosterOptimizerCancelledError);
  });
});

describe('exact integer phase reconstruction', () => {
  it('uses a validated integral assignment when the raw objective is contaminated', () => {
    const model = new Model();
    const first = model.boolVar('first');
    const second = model.boolVar('second');
    const expression = first.times(2).plus(second);
    const solution = new Solution({
      status: 'optimal',
      objective: 0.8403320312499968,
      solution: new Map([['first', 0], ['second', 0]]),
    });
    expect(reconstructExactIntegerObjective({
      solution,
      expression,
      integerVariables: [first, second],
      stage: 'synthetic contaminated objective',
    })).toEqual({
      value: 0,
      rawObjective: 0.8403320312499968,
      rawObjectiveDelta: 0.8403320312499968,
      maximumIntegralityResidual: 0,
    });
  });

  it('rejects a reconstructed value when a fresh probe finds an exact improvement', () => {
    const model = new Model();
    const selected = model.boolVar('selected');
    const contaminatedSolution = new Solution({
      status: 'optimal',
      objective: 0.8403320312499968,
      solution: new Map([['selected', 0]]),
    });
    const reconstruction = reconstructExactIntegerObjective({
      solution: contaminatedSolution,
      expression: selected,
      integerVariables: [selected],
      stage: 'synthetic contaminated objective',
    });
    expect(reconstruction.value).toBe(0);
    const certificationSolution = new Solution({
      status: 'optimal',
      objective: 0,
      solution: new Map([['selected', 1]]),
    });
    expect(() => evaluateExactOptimumCertification({
      solution: certificationSolution,
      expression: selected,
      integerVariables: [selected],
      direction: 'maximize',
      reconstructedValue: reconstruction.value,
      stage: 'synthetic contaminated objective',
      solverPass: 2,
    })).toThrow(/feasible exact maximize improvement 1 at bound 1; refusing to fix/);
  });

  it('rejects a fractional assignment returned by an exact-optimum probe', () => {
    const model = new Model();
    const selected = model.boolVar('selected');
    const certificationSolution = new Solution({
      status: 'optimal',
      objective: 0,
      solution: new Map([['selected', 0.25]]),
    });
    expect(() => evaluateExactOptimumCertification({
      solution: certificationSolution,
      expression: selected,
      integerVariables: [selected],
      direction: 'maximize',
      reconstructedValue: 0,
      stage: 'synthetic fractional certification',
      solverPass: 2,
    })).toThrow(/fractional binary variable selected=0\.25/);
  });

  it('rejects a genuinely fractional Boolean assignment under the strict tolerance', () => {
    const model = new Model();
    const selected = model.boolVar('selected');
    const solution = new Solution({
      status: 'optimal',
      objective: 0.25,
      solution: new Map([['selected', 0.25]]),
    });
    expect(() => reconstructExactIntegerObjective({
      solution,
      expression: selected,
      integerVariables: [selected],
      stage: 'synthetic fractional assignment',
    })).toThrow(/fractional binary variable selected=0\.25/);
    expect(OPTIMIZER_VARIABLE_INTEGRALITY_TOLERANCE).toBe(1e-7);
    expect(OPTIMIZER_MATERIAL_OBJECTIVE_DELTA).toBe(1e-3);
  });
});
