import { describe, expect, it, vi } from 'vitest';
import { dragons } from '../data/dragons';
import { RosterOptimizerClient } from '../optimizer/rosterOptimizerClient';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  RosterOptimizerCancelledError,
  type OptimizerAllocationMode,
} from '../optimizer/rosterOptimizerTypes';
import type { RosterOptimizerWorkerResponse } from '../optimizer/rosterOptimizerWorker';
import { createEmptyRoster } from '../services/rosterStorage';

describe('RosterOptimizerClient contract-v6 Worker boundary', () => {
  it('sends mode, count, complete progression snapshot, and v6 scoring identities', async () => {
    const worker = new FakeWorker();
    const client = new RosterOptimizerClient(() => worker as unknown as Worker);
    const onProgress = vi.fn();
    const promise = client.run(
      createEmptyRoster(dragons),
      'strongest-first',
      1,
      onProgress,
    );
    const request = worker.posted[0] as {
      contractVersion: number;
      ratingContract: string;
      requestId: number;
      allocationMode: string;
      formationCount: number;
      rosterSnapshot: unknown[];
      estimatedPowerModelVersion: string;
    };
    expect(request).toMatchObject({
      contractVersion: 6,
      ratingContract: 'formation-rating-v3',
      allocationMode: 'strongest-first',
      formationCount: 1,
      estimatedPowerModelVersion: 'estimated-power-v2',
      bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
      bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
      bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
      bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
    });
    expect(request.rosterSnapshot).toEqual([]);
    worker.respond({
      type: 'progress',
      requestId: request.requestId,
      progress: {
        stage: 'candidate-generation',
        allocationMode: 'strongest-first',
        formationCount: 1,
      },
    });
    expect(onProgress).toHaveBeenCalledOnce();
    worker.respond({
      type: 'result',
      requestId: request.requestId,
      result: {
        contractVersion: 6,
        ratingContract: 'formation-rating-v3',
        allocationMode: 'strongest-first',
        requestedFormationCount: 1,
        optimal: false,
        status: 'unavailable',
        reason: 'insufficient-eligible-dragons',
        eligibleDragonCount: 0,
        requiredDragonCount: 3,
        additionalDragonsNeeded: 3,
        rosterFingerprint: 'test',
        requestFingerprint: 'request-test',
      },
    });
    await expect(promise).resolves.toMatchObject({ optimal: false });
    expect(worker.terminated).toBe(true);
  });

  it.each([
    'best-overall-first',
    'strongest-first',
    'balanced',
  ] satisfies OptimizerAllocationMode[])(
    'terminates %s cancellation and never returns a partial result',
    async (allocationMode) => {
      const worker = new FakeWorker();
      const client = new RosterOptimizerClient(() => worker as unknown as Worker);
      const promise = client.run(createEmptyRoster(dragons), allocationMode, 1);
      client.cancel();
      await expect(promise).rejects.toBeInstanceOf(RosterOptimizerCancelledError);
      expect(worker.terminated).toBe(true);
    },
  );

  it.each([4, 5])('rejects a stale contract-v%i response', async (contractVersion) => {
    const worker = new FakeWorker();
    const client = new RosterOptimizerClient(() => worker as unknown as Worker);
    const promise = client.run(createEmptyRoster(dragons), 'balanced', 1);
    const request = worker.posted[0] as { requestId: number };
    worker.respond({
      type: 'result',
      requestId: request.requestId,
      result: {
        contractVersion,
        ratingContract: 'formation-rating-v3',
        strategy: 'best-ten-overall',
        optimal: true,
      } as never,
    });
    await expect(promise).rejects.toThrow('response contract is stale');
  });

  it('rejects a contract-v6 result carrying a stale Best Overall profile', async () => {
    const worker = new FakeWorker();
    const client = new RosterOptimizerClient(() => worker as unknown as Worker);
    const promise = client.run(createEmptyRoster(dragons), 'best-overall-first', 1);
    const request = worker.posted[0] as { requestId: number };
    worker.respond({
      type: 'result',
      requestId: request.requestId,
      result: {
        contractVersion: 6,
        ratingContract: 'formation-rating-v3',
        allocationMode: 'best-overall-first',
        requestedFormationCount: 1,
        optimal: true,
        estimatedPowerModelVersion: 'estimated-power-v2',
        estimatedPowerModelHash: 'fnv1a64:efa6081babb4e520',
        estimatedPowerObservationHash: 'fnv1a64:26bfe615f0d9bdd5',
        bestOverallScoringVersion: 'best-overall-v1',
        bestOverallPowerWeight: 59,
        bestOverallFormationRatingWeight: 41,
        bestOverallNormalizationScale: 10_000,
      } as never,
    });
    await expect(promise).rejects.toThrow('response contract is stale');
  });
});

class FakeWorker extends EventTarget {
  posted: unknown[] = [];
  terminated = false;

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  respond(data: RosterOptimizerWorkerResponse) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}
