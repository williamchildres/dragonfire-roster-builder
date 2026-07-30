import { describe, expect, it, vi } from 'vitest';
import { dragons } from '../data/dragons';
import { RosterOptimizerClient } from '../optimizer/rosterOptimizerClient';
import {
  RosterOptimizerCancelledError,
  type OptimizerAllocationMode,
} from '../optimizer/rosterOptimizerTypes';
import type { RosterOptimizerWorkerResponse } from '../optimizer/rosterOptimizerWorker';
import { createEmptyRoster } from '../services/rosterStorage';

describe('RosterOptimizerClient contract-v5 Worker boundary', () => {
  it('sends mode, count, complete progression snapshot, and v5 model identities', async () => {
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
      contractVersion: 5,
      ratingContract: 'formation-rating-v3',
      allocationMode: 'strongest-first',
      formationCount: 1,
      estimatedPowerModelVersion: 'estimated-power-v2',
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
        contractVersion: 5,
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

  it('rejects a stale contract-v4 response', async () => {
    const worker = new FakeWorker();
    const client = new RosterOptimizerClient(() => worker as unknown as Worker);
    const promise = client.run(createEmptyRoster(dragons), 'balanced', 1);
    const request = worker.posted[0] as { requestId: number };
    worker.respond({
      type: 'result',
      requestId: request.requestId,
      result: {
        contractVersion: 4,
        ratingContract: 'formation-rating-v3',
        strategy: 'best-ten-overall',
        optimal: true,
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
