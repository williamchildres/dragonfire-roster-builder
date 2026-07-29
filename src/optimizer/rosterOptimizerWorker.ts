import type { OwnedDragon } from '../models/dragon';
import { optimizeCurrentRoster } from './rosterOptimizer';
import {
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  type RosterOptimizerStrategy,
} from './rosterOptimizerTypes';

export type RosterOptimizerWorkerRequest = {
  type: 'optimize';
  contractVersion: typeof ROSTER_OPTIMIZER_CONTRACT_VERSION;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
  requestId: number;
  strategy: RosterOptimizerStrategy;
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
  const { contractVersion, ratingContract, requestId, roster, strategy } = event.data;
  if (
    contractVersion !== ROSTER_OPTIMIZER_CONTRACT_VERSION ||
    ratingContract !== ROSTER_OPTIMIZER_RATING_CONTRACT
  ) {
    workerScope.postMessage({
      type: 'error',
      requestId,
      message: 'The optimizer request contract is stale. Refresh and try again.',
    });
    return;
  }
  void optimizeCurrentRoster(roster, strategy)
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
