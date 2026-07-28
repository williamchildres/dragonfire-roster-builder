import type {
  ConcreteReliabilityProbability,
  ProbabilityResolutionContext,
  ReliabilityProbability,
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
  probability: ReliabilityProbability,
  context: ProbabilityResolutionContext = {},
): number | null {
  if (probability.kind === 'unknown') return null;
  if (probability.kind === 'variants') {
    if (!context.variantId) return null;
    const variant = probability.variants.find((candidate) => candidate.id === context.variantId);
    return variant ? resolveConcreteReliabilityProbability(variant.probability, context) : null;
  }
  return resolveConcreteReliabilityProbability(probability, context);
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

function resolveConcreteReliabilityProbability(
  probability: ConcreteReliabilityProbability,
  context: ProbabilityResolutionContext,
): number | null {
  if (probability.kind === 'fixed') return probability.value;
  if (probability.kind === 'habit-level') {
    return context.habitLevel ? probability.byLevel[context.habitLevel] : null;
  }
  if (!context.round) return null;
  return probability.byRound[context.round] ?? null;
}
