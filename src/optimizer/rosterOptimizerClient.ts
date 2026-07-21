import type { OwnedDragon } from '../models/dragon';
import {
  RosterOptimizerCancelledError,
  type RosterOptimizerResponse,
  type RosterOptimizerStrategy,
} from './rosterOptimizerTypes';
import type {
  RosterOptimizerWorkerRequest,
  RosterOptimizerWorkerResponse,
} from './rosterOptimizerWorker';

export interface RosterOptimizerRunner {
  run(
    roster: Record<string, OwnedDragon>,
    strategy: RosterOptimizerStrategy,
  ): Promise<RosterOptimizerResponse>;
  cancel(): void;
  dispose(): void;
}

type WorkerFactory = () => Worker;

export class RosterOptimizerClient implements RosterOptimizerRunner {
  private requestId = 0;
  private active: {
    worker: Worker;
    reject: (reason: Error) => void;
  } | null = null;

  constructor(
    private readonly createWorker: WorkerFactory = () => new Worker(
      new URL('./rosterOptimizerWorker.ts', import.meta.url),
      { type: 'module', name: 'roster-optimizer' },
    ),
  ) {}

  run(
    roster: Record<string, OwnedDragon>,
    strategy: RosterOptimizerStrategy,
  ): Promise<RosterOptimizerResponse> {
    this.cancel();
    const requestId = ++this.requestId;
    const worker = this.createWorker();
    return new Promise((resolve, reject) => {
      this.active = { worker, reject };
      worker.addEventListener('message', (event: MessageEvent<RosterOptimizerWorkerResponse>) => {
        if (event.data.requestId !== requestId || this.active?.worker !== worker) return;
        this.finish(worker);
        if (event.data.type === 'result') resolve(event.data.result);
        else reject(new Error(event.data.message));
      });
      worker.addEventListener('error', () => {
        if (this.active?.worker !== worker) return;
        this.finish(worker);
        reject(new Error('The optimizer worker stopped unexpectedly. Please try again.'));
      });
      worker.postMessage({
        type: 'optimize',
        requestId,
        strategy,
        roster: structuredClone(roster),
      } satisfies RosterOptimizerWorkerRequest);
    });
  }

  cancel(): void {
    if (!this.active) return;
    const { worker, reject } = this.active;
    this.active = null;
    worker.terminate();
    reject(new RosterOptimizerCancelledError());
  }

  dispose(): void {
    this.cancel();
  }

  private finish(worker: Worker): void {
    if (this.active?.worker === worker) this.active = null;
    worker.terminate();
  }
}
