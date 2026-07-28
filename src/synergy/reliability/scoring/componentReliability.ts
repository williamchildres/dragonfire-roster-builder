import {
  assertReliabilityProbabilityValue,
  cumulativeIndependentActivationProbability,
} from '../probability';
import { resolveComponentProbability } from '../progression';
import type {
  AbilityReliabilityComponent,
  ConcreteReliabilityProbability,
  ReliabilityComponentReference,
  ReliabilityProgression,
} from '../types';
import type { ComponentReliabilityTrace, ReliabilityQuantification } from './types';

export interface EvaluateComponentReliabilityInput {
  component: AbilityReliabilityComponent;
  reference: ReliabilityComponentReference;
  progression: ReliabilityProgression;
  conditionProven?: boolean;
}

export function cumulativeIndependentVaryingActivationProbability(
  probabilities: readonly number[],
): number {
  if (probabilities.length === 0) {
    throw new RangeError('At least one probability is required.');
  }
  probabilities.forEach((probability) => assertReliabilityProbabilityValue(probability));
  return 1 - probabilities.reduce((product, probability) => product * (1 - probability), 1);
}

export function evaluateComponentReliability({
  component,
  reference,
  progression,
  conditionProven = false,
}: EvaluateComponentReliabilityInput): ComponentReliabilityTrace {
  const scheduledRounds =
    component.timing.kind === 'scheduled-rounds' ? [...component.timing.rounds] : [];
  const baseTrace = {
    componentId: component.id,
    probabilityVariantId: reference.probabilityVariantId,
    conditionProven,
    opportunityPresence: component.opportunityPresence,
    opportunityCount: component.opportunityCount,
    rollScope: component.rollScope,
    independence: component.independence,
    scheduledRounds,
  };

  if (component.reliabilityClass === 'guaranteed') {
    return {
      ...baseTrace,
      resolvedProbabilities: [],
      quantification: quantified(1, 'guaranteed', 'Documented deterministic activation.'),
    };
  }
  if (component.reliabilityClass === 'conditional-deterministic') {
    return {
      ...baseTrace,
      resolvedProbabilities: [],
      quantification: conditionProven
        ? quantified(1, 'condition-proven', 'The active relationship graph proves the condition.')
        : unquantified(
            'conditional-deterministic-unproven',
            'The documented dynamic condition is not proven by the static relationship graph.',
          ),
    };
  }
  if (component.reliabilityClass === 'unknown' || !component.probability) {
    return {
      ...baseTrace,
      resolvedProbabilities: [],
      quantification: unquantified(
        'probability-unknown',
        'No supported activation probability is documented.',
      ),
    };
  }

  const selectedProbability = selectedConcreteProbability(component, reference);
  const contexts = probabilityContexts(component, selectedProbability);
  const resolvedByContext = contexts.map((round) =>
    resolveComponentProbability(component, reference, progression, round === null ? {} : { round }),
  );
  const resolvedProbabilities = resolvedByContext.filter(
    (value): value is number => value !== null,
  );
  const habitLevelMissing = contexts.some((round) =>
    probabilityHasMissingActiveHabitLevel(selectedProbability, progression, round),
  );

  if (habitLevelMissing) {
    return {
      ...baseTrace,
      resolvedProbabilities,
      quantification: unquantified(
        'missing-habit-level',
        'The probability-source Habit is active, but its level is missing.',
        resolvedProbabilities,
      ),
    };
  }
  if (selectedProbability.kind === 'unknown' || resolvedProbabilities.length === 0) {
    return {
      ...baseTrace,
      resolvedProbabilities,
      quantification: unquantified(
        selectedProbability.kind === 'round-specific'
          ? 'round-context-unresolved'
          : 'probability-unknown',
        selectedProbability.kind === 'round-specific'
          ? 'No supported probability is available for the relevant round context.'
          : 'No supported activation probability is documented.',
      ),
    };
  }

  const firstScheduledRound = scheduledRounds[0];
  const isBattleReachConditional = firstScheduledRound !== undefined && firstScheduledRound >= 2;
  if (component.opportunityPresence === 'conditional' || isBattleReachConditional) {
    return {
      ...baseTrace,
      resolvedProbabilities,
      quantification: unquantified(
        'conditional-opportunity',
        isBattleReachConditional
          ? `The first supported opportunity depends on reaching Round ${firstScheduledRound}.`
          : 'The opportunity depends on a documented battle-state condition.',
        resolvedProbabilities,
      ),
    };
  }
  if (
    component.opportunityPresence === 'unknown' ||
    component.opportunityPresence === 'not-applicable'
  ) {
    return {
      ...baseTrace,
      resolvedProbabilities,
      quantification: unquantified(
        'unknown-opportunity',
        'An unconditional opportunity is not established.',
        resolvedProbabilities,
      ),
    };
  }

  const exactCount =
    component.opportunityCount.kind === 'exact' ? component.opportunityCount.value : null;
  const firstProbability = resolvedProbabilities[0]!;
  if (
    exactCount !== null &&
    exactCount > 1 &&
    component.independence === 'confirmed' &&
    component.rollScope !== 'unresolved'
  ) {
    if (
      selectedProbability.kind === 'round-specific' &&
      (contexts.length !== exactCount ||
        resolvedByContext.length !== exactCount ||
        resolvedByContext.some((probability) => probability === null))
    ) {
      return {
        ...baseTrace,
        resolvedProbabilities,
        quantification: unquantified(
          'round-context-unresolved',
          'Every exact opportunity requires a supported round-specific probability.',
          resolvedProbabilities,
        ),
      };
    }
    const probabilities =
      selectedProbability.kind === 'round-specific'
        ? (resolvedByContext as number[])
        : Array.from({ length: exactCount }, () => firstProbability);
    const reliability = probabilities.every((probability) => probability === firstProbability)
      ? cumulativeIndependentActivationProbability(firstProbability, exactCount)
      : cumulativeIndependentVaryingActivationProbability(probabilities);
    return {
      ...baseTrace,
      resolvedProbabilities: probabilities,
      quantification: quantified(
        reliability,
        'confirmed-cumulative',
        `${exactCount} exact, confirmed-independent opportunities.`,
      ),
    };
  }

  return {
    ...baseTrace,
    resolvedProbabilities,
    quantification: quantified(
      firstProbability,
      'one-supported-opportunity',
      exactCount === 1
        ? 'One exact supported opportunity.'
        : 'One opportunity is supported; additional repetition is not credited.',
    ),
  };
}

function selectedConcreteProbability(
  component: AbilityReliabilityComponent,
  reference: ReliabilityComponentReference,
): ConcreteReliabilityProbability {
  const probability = component.probability!;
  if (probability.kind !== 'variants') return probability;
  const variant = probability.variants.find(
    (candidate) => candidate.id === reference.probabilityVariantId,
  );
  if (!variant) {
    return { kind: 'unknown', reason: 'Probability variant is unresolved.' };
  }
  return variant.probability;
}

function probabilityContexts(
  component: AbilityReliabilityComponent,
  probability: ConcreteReliabilityProbability,
): readonly (number | null)[] {
  if (probability.kind !== 'round-specific') return [null];
  if (component.timing.kind === 'scheduled-rounds') {
    return component.timing.rounds;
  }
  return Object.keys(probability.byRound)
    .map(Number)
    .filter((round) => Number.isInteger(round) && round > 0)
    .sort((left, right) => left - right);
}

function probabilityHasMissingActiveHabitLevel(
  probability: ConcreteReliabilityProbability,
  progression: ReliabilityProgression,
  round: number | null,
): boolean {
  const selected =
    probability.kind === 'round-specific'
      ? round === null
        ? undefined
        : probability.byRound[round]
      : probability;
  if (!selected || selected.kind === 'fixed' || selected.kind === 'unknown') return false;
  const hasHabit = Object.prototype.hasOwnProperty.call(
    progression.activeHabitLevels,
    selected.habitAbilityId,
  );
  if (selected.kind === 'habit-override' && !hasHabit) return false;
  return progression.activeHabitLevels[selected.habitAbilityId] == null;
}

function quantified(
  reliability: number,
  method: Extract<ReliabilityQuantification, { status: 'quantified' }>['method'],
  explanation: string,
): ReliabilityQuantification {
  return { status: 'quantified', reliability, method, explanation };
}

function unquantified(
  reason: Extract<ReliabilityQuantification, { status: 'unquantified' }>['reason'],
  explanation: string,
  conditionalProbabilities?: readonly number[],
): ReliabilityQuantification {
  return conditionalProbabilities?.length
    ? { status: 'unquantified', reason, explanation, conditionalProbabilities }
    : { status: 'unquantified', reason, explanation };
}
