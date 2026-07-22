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
const expectedUnused = ['arrax', 'shadowrend', 'solstryker'];

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

  it('finishes optimally and remains deterministic in forward, reversed, and repeated order', async () => {
    const forwardRoster = live33ProgressionRegressionRoster();
    const reversedRoster = Object.fromEntries(Object.entries(forwardRoster).reverse());
    const forward = await optimizeCurrentRoster(
      forwardRoster,
      'power-aware-primary-five-backup-five',
    );
    const reversed = await optimizeCurrentRoster(
      reversedRoster,
      'power-aware-primary-five-backup-five',
    );
    const repeated = await optimizeCurrentRoster(
      forwardRoster,
      'power-aware-primary-five-backup-five',
    );

    for (const result of [forward, reversed, repeated]) {
      expect(result.optimal).toBe(true);
      if (!result.optimal || result.strategy !== 'power-aware-primary-five-backup-five') continue;
      expect(result.primary.formations).toHaveLength(5);
      expect(result.backup.formations).toHaveLength(5);
      expect(result.usedDragonIds).toHaveLength(30);
      expect(new Set(result.usedDragonIds)).toHaveProperty('size', 30);
      expect(result.primary.usedDragonIds).toEqual(expectedPrimary);
      expect(result.backup.usedDragonIds).toEqual(expectedBackup);
      expect(result.unusedDragonIds).toEqual(expectedUnused);
      expect(result.primary.totalEstimatedPower).toBe(375760);
      expect(result.backup.totalEstimatedPower).toBe(227070);
      expect(result.diagnostics.candidateCount).toBe(5456);
      const exactness = result.diagnostics.numericalExactness!;
      expect(exactness.integralityTolerance).toBe(1e-7);
      expect(exactness.maximumIntegralityResidual).toBeLessThanOrEqual(1e-7);
      expect(exactness.fixedPhasesValidated).toBe(true);
      expect(exactness.phaseObjectives.every((phase) =>
        Number.isSafeInteger(phase.reconstructedObjective))).toBe(true);
      expect(exactness.phaseObjectives).toContainEqual(expect.objectContaining({
        stage: 'backup stable solution key',
        kind: 'stable',
        chunkStart: 0,
        chunkEnd: 48,
        reconstructedObjective: 0,
        mipGap: 0,
      }));
    }
    if (!forward.optimal || !reversed.optimal || !repeated.optimal) return;
    expect(reversed.optimizerSolutionHash).toBe(forward.optimizerSolutionHash);
    expect(reversed.optimizerResultHash).toBe(forward.optimizerResultHash);
    expect(repeated.optimizerSolutionHash).toBe(forward.optimizerSolutionHash);
    expect(repeated.optimizerResultHash).toBe(forward.optimizerResultHash);
  }, 300_000);

  it('returns no partial result when cancellation is requested', async () => {
    await expect(optimizeCurrentRoster(
      live33ProgressionRegressionRoster(),
      'power-aware-primary-five-backup-five',
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
  });
});
