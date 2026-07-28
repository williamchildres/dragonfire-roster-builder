import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { RosterOptimizerClient } from '../optimizer/rosterOptimizerClient';
import {
  RosterOptimizerCancelledError,
  type RosterOptimizerStrategy,
} from '../optimizer/rosterOptimizerTypes';
import type { RosterOptimizerWorkerResponse } from '../optimizer/rosterOptimizerWorker';
import { createEmptyRoster } from '../services/rosterStorage';

describe('RosterOptimizerClient worker boundary', () => {
  it('uses request IDs and terminates a successful worker', async () => {
    const worker = new FakeWorker();
    const client = new RosterOptimizerClient(() => worker as unknown as Worker);
    const promise = client.run(createEmptyRoster(dragons), 'primary-five-backup-five');
    const request = worker.posted[0] as {
      contractVersion: number;
      ratingContract: string;
      requestId: number;
      strategy: string;
    };
    expect(request.strategy).toBe('primary-five-backup-five');
    expect(request.contractVersion).toBe(4);
    expect(request.ratingContract).toBe('formation-rating-v3');
    worker.respond({
      type: 'result',
      requestId: request.requestId,
      result: {
        contractVersion: 4,
        ratingContract: 'formation-rating-v3',
        strategy: 'primary-five-backup-five',
        optimal: false,
        status: 'unavailable',
        reason: 'insufficient-eligible-dragons',
        eligibleDragonCount: 0,
        requiredDragonCount: 30,
        additionalDragonsNeeded: 30,
        rosterFingerprint: 'test',
        requestFingerprint: 'request-test',
      },
    });
    await expect(promise).resolves.toMatchObject({ optimal: false });
    expect(worker.terminated).toBe(true);
  });

  it.each([
    'best-ten-overall',
    'primary-five-backup-five',
    'power-aware-primary-five-backup-five',
  ] satisfies RosterOptimizerStrategy[])(
    'terminates %s cancellation and never returns a partial optimal result',
    async (strategy) => {
      const worker = new FakeWorker();
      const client = new RosterOptimizerClient(() => worker as unknown as Worker);
      const promise = client.run(createEmptyRoster(dragons), strategy);
      client.cancel();
      await expect(promise).rejects.toBeInstanceOf(RosterOptimizerCancelledError);
      expect(worker.terminated).toBe(true);
    },
  );
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
