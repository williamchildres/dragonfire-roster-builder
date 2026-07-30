import {
  OPTIMIZER_DEFAULT_FORMATION_COUNT,
  OPTIMIZER_MAX_FORMATION_COUNT,
  OPTIMIZER_MIN_FORMATION_COUNT,
} from './rosterOptimizerTypes';

export function maximumOptimizerFormationCount(eligibleDragonCount: number): number {
  if (!Number.isInteger(eligibleDragonCount) || eligibleDragonCount < 0) {
    throw new RangeError('Eligible dragon count must be a nonnegative integer.');
  }
  return Math.min(
    OPTIMIZER_MAX_FORMATION_COUNT,
    Math.floor(eligibleDragonCount / 3),
  );
}

export function defaultOptimizerFormationCount(eligibleDragonCount: number): number {
  const maximum = maximumOptimizerFormationCount(eligibleDragonCount);
  return maximum >= OPTIMIZER_DEFAULT_FORMATION_COUNT
    ? OPTIMIZER_DEFAULT_FORMATION_COUNT
    : maximum;
}

export function clampOptimizerFormationCount(
  formationCount: number,
  eligibleDragonCount: number,
): number {
  const maximum = maximumOptimizerFormationCount(eligibleDragonCount);
  if (maximum < OPTIMIZER_MIN_FORMATION_COUNT) return 0;
  return Math.min(
    maximum,
    Math.max(OPTIMIZER_MIN_FORMATION_COUNT, Math.trunc(formationCount)),
  );
}

export function validateOptimizerFormationCount(
  formationCount: number,
  eligibleDragonCount: number,
): void {
  const maximum = maximumOptimizerFormationCount(eligibleDragonCount);
  if (
    !Number.isInteger(formationCount) ||
    formationCount < OPTIMIZER_MIN_FORMATION_COUNT ||
    formationCount > maximum
  ) {
    throw new RangeError(
      `Formation count must be an integer from ${OPTIMIZER_MIN_FORMATION_COUNT} through ${maximum}.`,
    );
  }
}
