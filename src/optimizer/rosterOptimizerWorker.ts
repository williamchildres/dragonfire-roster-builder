import type { OwnedDragon } from '../models/dragon';
import type {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { optimizeCurrentRoster } from './rosterOptimizer';
import type {
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
  OptimizerAllocationMode,
  OptimizerRosterDragon,
  OptimizerRunProgress,
} from './rosterOptimizerTypes';
import { isRosterOptimizerRequestV6 } from './rosterOptimizerProtocol';

export type RosterOptimizerWorkerRequest = {
  type: 'optimize';
  contractVersion: typeof ROSTER_OPTIMIZER_CONTRACT_VERSION;
  ratingContract: typeof ROSTER_OPTIMIZER_RATING_CONTRACT;
  estimatedPowerModelVersion: typeof ESTIMATED_POWER_MODEL_VERSION;
  estimatedPowerModelHash: typeof ESTIMATED_POWER_MODEL_HASH;
  estimatedPowerObservationHash: typeof ESTIMATED_POWER_OBSERVATION_HASH;
  bestOverallScoringVersion: typeof BEST_OVERALL_SCORING_VERSION;
  bestOverallPowerWeight: typeof BEST_OVERALL_POWER_WEIGHT;
  bestOverallFormationRatingWeight: typeof BEST_OVERALL_RATING_WEIGHT;
  bestOverallNormalizationScale: typeof BEST_OVERALL_NORMALIZATION_SCALE;
  requestId: number;
  allocationMode: OptimizerAllocationMode;
  formationCount: number;
  rosterSnapshot: OptimizerRosterDragon[];
  roster: Record<string, OwnedDragon>;
};

export type RosterOptimizerWorkerResponse =
  | {
      type: 'progress';
      requestId: number;
      progress: OptimizerRunProgress;
    }
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
  const {
    allocationMode,
    bestOverallFormationRatingWeight,
    bestOverallNormalizationScale,
    bestOverallPowerWeight,
    bestOverallScoringVersion,
    contractVersion,
    estimatedPowerModelHash,
    estimatedPowerModelVersion,
    estimatedPowerObservationHash,
    formationCount,
    ratingContract,
    requestId,
    roster,
  } = event.data;
  if (!isRosterOptimizerRequestV6({
    allocationMode,
    bestOverallFormationRatingWeight,
    bestOverallNormalizationScale,
    bestOverallPowerWeight,
    bestOverallScoringVersion,
    contractVersion,
    estimatedPowerModelHash,
    estimatedPowerModelVersion,
    estimatedPowerObservationHash,
    formationCount,
    ratingContract,
  })) {
    workerScope.postMessage({
      type: 'error',
      requestId,
      message: 'The optimizer request contract is stale. Refresh and try again.',
    });
    return;
  }
  void optimizeCurrentRoster(
    roster,
    allocationMode,
    formationCount,
    undefined,
    (progress) => workerScope.postMessage({ type: 'progress', requestId, progress }),
  )
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
