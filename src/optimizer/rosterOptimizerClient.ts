import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { buildOptimizerRosterSnapshot } from './rosterOptimizerCandidates';
import {
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  RosterOptimizerCancelledError,
  type OptimizerAllocationMode,
  type OptimizerRunProgress,
  type RosterOptimizerResponse,
} from './rosterOptimizerTypes';
import type {
  RosterOptimizerWorkerRequest,
  RosterOptimizerWorkerResponse,
} from './rosterOptimizerWorker';

export interface RosterOptimizerRunner {
  run(
    roster: Record<string, OwnedDragon>,
    allocationMode: OptimizerAllocationMode,
    formationCount: number,
    onProgress?: (progress: OptimizerRunProgress) => void,
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
      { type: 'module', name: 'roster-optimizer-v6' },
    ),
  ) {}

  run(
    roster: Record<string, OwnedDragon>,
    allocationMode: OptimizerAllocationMode,
    formationCount: number,
    onProgress?: (progress: OptimizerRunProgress) => void,
  ): Promise<RosterOptimizerResponse> {
    this.cancel();
    const requestId = ++this.requestId;
    const worker = this.createWorker();
    return new Promise((resolve, reject) => {
      this.active = { worker, reject };
      worker.addEventListener('message', (event: MessageEvent<RosterOptimizerWorkerResponse>) => {
        if (event.data.requestId !== requestId || this.active?.worker !== worker) return;
        if (event.data.type === 'progress') {
          onProgress?.(event.data.progress);
          return;
        }
        this.finish(worker);
        if (event.data.type === 'result') {
          if (
            event.data.result.contractVersion !== ROSTER_OPTIMIZER_CONTRACT_VERSION ||
            event.data.result.ratingContract !== ROSTER_OPTIMIZER_RATING_CONTRACT ||
            event.data.result.allocationMode !== allocationMode ||
            event.data.result.requestedFormationCount !== formationCount ||
            (
              event.data.result.optimal &&
              (
                event.data.result.estimatedPowerModelVersion !==
                  ESTIMATED_POWER_MODEL_VERSION ||
                event.data.result.estimatedPowerModelHash !== ESTIMATED_POWER_MODEL_HASH ||
                event.data.result.estimatedPowerObservationHash !==
                  ESTIMATED_POWER_OBSERVATION_HASH ||
                event.data.result.bestOverallScoringVersion !==
                  BEST_OVERALL_SCORING_VERSION ||
                event.data.result.bestOverallPowerWeight !== BEST_OVERALL_POWER_WEIGHT ||
                event.data.result.bestOverallFormationRatingWeight !==
                  BEST_OVERALL_RATING_WEIGHT ||
                event.data.result.bestOverallNormalizationScale !==
                  BEST_OVERALL_NORMALIZATION_SCALE
              )
            )
          ) {
            reject(new Error('The optimizer response contract is stale. Refresh and try again.'));
          } else {
            resolve(event.data.result);
          }
        } else reject(new Error(event.data.message));
      });
      worker.addEventListener('error', () => {
        if (this.active?.worker !== worker) return;
        this.finish(worker);
        reject(new Error('The optimizer worker stopped unexpectedly. Please try again.'));
      });
      worker.postMessage({
        type: 'optimize',
        contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
        ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
        estimatedPowerModelVersion: ESTIMATED_POWER_MODEL_VERSION,
        estimatedPowerModelHash: ESTIMATED_POWER_MODEL_HASH,
        estimatedPowerObservationHash: ESTIMATED_POWER_OBSERVATION_HASH,
        bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
        bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
        bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
        bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
        requestId,
        allocationMode,
        formationCount,
        rosterSnapshot: buildOptimizerRosterSnapshot(dragons, roster),
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
