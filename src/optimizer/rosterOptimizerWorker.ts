import type { OwnedDragon } from '../models/dragon';
import { optimizeCurrentRoster } from './rosterOptimizer';

export type RosterOptimizerWorkerRequest = {
  type: 'optimize';
  requestId: number;
  roster: Record<string, OwnedDragon>;
};

export type RosterOptimizerWorkerResponse =
  | {
      type: 'result';
      requestId: number;
      result: Awaited<ReturnType<typeof optimizeCurrentRoster>>;
    }
  | {
      type: 'error';
      requestId: number;
      message: string;
    };

const workerScope = globalThis as unknown as {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<RosterOptimizerWorkerRequest>) => void,
  ): void;
  postMessage(message: RosterOptimizerWorkerResponse): void;
};

workerScope.addEventListener('message', (event) => {
  if (event.data.type !== 'optimize') return;
  const { requestId, roster } = event.data;
  void optimizeCurrentRoster(roster)
    .then((result) => {
      workerScope.postMessage({ type: 'result', requestId, result });
    })
    .catch((error: unknown) => {
      workerScope.postMessage({
        type: 'error',
        requestId,
        message: error instanceof Error ? error.message : 'Roster optimization failed.',
      });
    });
});

export {};
