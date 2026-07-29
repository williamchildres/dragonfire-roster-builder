import { describe, expect, it } from 'vitest';
import { HiGHS, Model, Solution, sum } from '@bubblyworld/highs-ts';

import { constantSelectionExpressionValue } from '../optimizer/exactPhaseSkipping';
import { applyRosterOptimizerExactGapOptions } from '../optimizer/highsExactOptions';
import { objectiveForCandidates } from '../optimizer/rosterOptimizerObjective';
import {
  candidateIndicesOverlappingDragonIds,
  exactCertificationCacheIdentity,
} from '../optimizer/rosterOptimizerPrimaryBackupMipSolver';
import { solvePrimaryBackupStableFace } from '../optimizer/rosterOptimizerStableFaceSolver';
import type {
  OptimizerFormationCandidate,
  OptimizerRosterDragon,
} from '../optimizer/rosterOptimizerTypes';

describe('exact optimizer performance contracts', () => {
  it('detects only structurally constant selection objectives', () => {
    expect(constantSelectionExpressionValue([7, 7, 7], 5)).toBe(35);
    expect(constantSelectionExpressionValue([7, 8, 7], 5)).toBeNull();
  });

  it('matches brute force and HiGHS on a bounded exact optimal face', async () => {
    const candidates = [
      candidate(['a', 'b', 'c'], 'a', 99),
      candidate(['d', 'e', 'f'], 'b'),
      candidate(['g', 'h', 'i'], 'c'),
      candidate(['j', 'k', 'l'], 'd'),
      candidate(['m', 'n', 'o'], 'e'),
    ];
    const dragons = 'abcdefghijklmno'.split('').map((dragonId) => ({
      dragonId,
      rarity: 'Rare',
    })) as OptimizerRosterDragon[];
    const rarity = new Map(dragons.map((dragon) => [dragon.dragonId, dragon.rarity]));
    const target = objectiveForCandidates([candidates[1]!], rarity);
    const exactFace = solvePrimaryBackupStableFace({
      candidates,
      eligibleDragons: dragons,
      primaryTarget: target,
      backupTarget: target,
      formationsPerWave: 1,
    });
    const bruteForce = candidates.flatMap((primaryCandidate, primary) =>
      candidates.flatMap((backupCandidate, backup) =>
        primaryCandidate.rating === target.totalRating &&
        backupCandidate.rating === target.totalRating &&
        (primaryCandidate.dragonMask & backupCandidate.dragonMask) === 0n
          ? [[primary, backup] as const]
          : [],
      ),
    )[0]!;
    expect(exactFace?.primaryIndices).toEqual([bruteForce[0]]);
    expect(exactFace?.backupIndices).toEqual([bruteForce[1]]);
    await expect(highsStablePair(candidates)).resolves.toEqual(bruteForce);
  });

  it('prunes only candidates that overlap an exactly fixed dragon set', () => {
    const candidates = [
      candidate(['a', 'b', 'c']),
      candidate(['d', 'e', 'f']),
      candidate(['a', 'e', 'g']),
    ];
    expect(candidateIndicesOverlappingDragonIds(candidates, new Set(['a', 'f'])))
      .toEqual([0, 1, 2]);
    expect(candidateIndicesOverlappingDragonIds(candidates, new Set(['z'])))
      .toEqual([]);
  });

  it('reuses certification only across identical fixed-model identities', () => {
    const base = {
      fixedConstraints: [{ field: 'rating', value: 100 }],
      objective: { field: 'relationship-value', value: 25 },
      direction: 'maximize' as const,
      reconstructedValue: 25,
    };
    expect(exactCertificationCacheIdentity(base)).toBe(
      exactCertificationCacheIdentity(structuredClone(base)),
    );
    expect(exactCertificationCacheIdentity(base)).not.toBe(
      exactCertificationCacheIdentity({
        ...base,
        fixedConstraints: [{ field: 'rating', value: 99 }],
      }),
    );
  });
});

function candidate(
  dragonIds: [string, string, string],
  stableCandidateKey = dragonIds.join('-'),
  rating = 100,
): OptimizerFormationCandidate {
  return {
    dragonIds,
    dragonMask: dragonIds.reduce(
      (mask, dragonId) => mask | (1n << BigInt(dragonId.charCodeAt(0) - 97)),
      0n,
    ),
    stableCandidateKey,
    rating,
    adjustedRelationshipValueUnits: 10,
    activeRelationshipCount: 1,
  } as OptimizerFormationCandidate;
}

async function highsStablePair(
  candidates: readonly OptimizerFormationCandidate[],
): Promise<readonly [number, number]> {
  const highs = await HiGHS.create();
  applyRosterOptimizerExactGapOptions(highs);
  try {
    const model = new Model();
    const primary = candidates.map((_candidate, index) => model.boolVar(`p${index}`));
    const backup = candidates.map((_candidate, index) => model.boolVar(`b${index}`));
    model.addConstraint(sum(...primary).eq(1));
    model.addConstraint(sum(...backup).eq(1));
    for (const dragonId of 'abcdefghijklmno') {
      model.addConstraint(sum(
        ...candidates.flatMap((candidate, index) =>
          candidate.dragonIds.includes(dragonId)
            ? [primary[index]!, backup[index]!]
            : [],
        ),
      ).leq(1));
    }
    model.addConstraint(sum(
      ...primary.map((variable, index) =>
        variable.times(candidates[index]!.rating),
      ),
    ).eq(100));
    model.addConstraint(sum(
      ...backup.map((variable, index) =>
        variable.times(candidates[index]!.rating),
      ),
    ).eq(100));
    const weights = [16, 8, 4, 2, 1];
    model.maximize(sum(
      ...primary.map((variable, index) => variable.times(weights[index]! * 32)),
      ...backup.map((variable, index) => variable.times(weights[index]!)),
    ));
    await highs.parse(model.print('lp'), 'lp');
    const solution = new Solution(await highs.solve());
    expect(solution.status).toBe('optimal');
    return [
      primary.findIndex((variable) => (solution.getValue(variable) ?? 0) > 0.5),
      backup.findIndex((variable) => (solution.getValue(variable) ?? 0) > 0.5),
    ];
  } finally {
    highs.free();
  }
}
