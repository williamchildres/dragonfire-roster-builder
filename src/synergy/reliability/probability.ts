import type {
  ConcreteReliabilityProbability,
  ProbabilityResolutionContext,
  ReliabilityProgression,
  RoundReliabilityProbability,
} from './types';

export function isReliabilityProbabilityValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function assertReliabilityProbabilityValue(
  value: unknown,
  label = 'Probability',
): asserts value is number {
  if (!isReliabilityProbabilityValue(value)) {
    throw new RangeError(`${label} must be a finite number from 0 through 1.`);
  }
}

export function resolveReliabilityProbability(
  probability: ConcreteReliabilityProbability,
  progression: Pick<ReliabilityProgression, 'activeHabitLevels'> = { activeHabitLevels: {} },
  context: ProbabilityResolutionContext = {},
): number | null {
  if (probability.kind === 'unknown') return null;
  if (probability.kind === 'fixed') return probability.value;
  if (probability.kind === 'habit-level') {
    return resolveHabitLevelProbability(probability, progression);
  }
  if (probability.kind === 'habit-override') {
    if (!hasActiveHabit(progression, probability.habitAbilityId)) return probability.base;
    return resolveHabitLevelProbability(probability, progression);
  }
  if (!context.round) return null;
  const roundProbability = probability.byRound[context.round];
  return roundProbability
    ? resolveRoundReliabilityProbability(roundProbability, progression)
    : null;
}

export function cumulativeIndependentActivationProbability(
  probability: number,
  opportunityCount: number,
): number {
  assertReliabilityProbabilityValue(probability);
  if (!Number.isInteger(opportunityCount) || opportunityCount < 1) {
    throw new RangeError('Opportunity count must be an integer of at least 1.');
  }
  return 1 - (1 - probability) ** opportunityCount;
}

function resolveHabitLevelProbability(
  probability: {
    habitAbilityId: string;
    byLevel: Record<1 | 2 | 3 | 4 | 5, number>;
  },
  progression: Pick<ReliabilityProgression, 'activeHabitLevels'>,
): number | null {
  const level = progression.activeHabitLevels[probability.habitAbilityId];
  return level ? probability.byLevel[level] : null;
}

function resolveRoundReliabilityProbability(
  probability: RoundReliabilityProbability,
  progression: Pick<ReliabilityProgression, 'activeHabitLevels'>,
): number | null {
  if (probability.kind === 'unknown') return null;
  if (probability.kind === 'fixed') return probability.value;
  if (probability.kind === 'habit-level') {
    return resolveHabitLevelProbability(probability, progression);
  }
  if (!hasActiveHabit(progression, probability.habitAbilityId)) return probability.base;
  return resolveHabitLevelProbability(probability, progression);
}

function hasActiveHabit(
  progression: Pick<ReliabilityProgression, 'activeHabitLevels'>,
  habitAbilityId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(progression.activeHabitLevels, habitAbilityId);
}
