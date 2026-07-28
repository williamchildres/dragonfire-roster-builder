import type { Dragon, HabitLevel, OwnedDragon } from '../../models/dragon';
import { isHabitUnlocked } from '../../services/habitLevels';
import { resolveReliabilityProbability } from './probability';
import type {
  AbilityReliabilityComponent,
  ProbabilityResolutionContext,
  ReliabilityComponentReference,
  ReliabilityProgression,
} from './types';

export function reliabilityProgressionFromOwnedDragon(
  dragon: Dragon,
  entry: OwnedDragon | undefined,
): ReliabilityProgression {
  const starRank = entry?.starRank ?? null;
  const dragonLevel = entry?.reignLevel ?? null;
  const activeHabitLevels: Record<string, HabitLevel | null> = {};

  for (const habit of dragon.habits) {
    if (!isHabitUnlocked(habit, { starRank, reignLevel: dragonLevel })) continue;
    activeHabitLevels[habit.id] = entry?.habitLevels[habit.id] ?? null;
  }

  return { starRank, dragonLevel, activeHabitLevels };
}

export function resolveComponentProbability(
  component: AbilityReliabilityComponent,
  reference: ReliabilityComponentReference,
  progression: ReliabilityProgression,
  context: ProbabilityResolutionContext = {},
): number | null {
  if (!component.probability) return null;
  if (reference.componentId !== component.id) {
    throw new Error(
      `Component reference "${reference.componentId}" does not match component "${component.id}".`,
    );
  }

  const probability = component.probability;
  if (probability.kind === 'variants') {
    if (!reference.probabilityVariantId) {
      throw new Error(`Component "${component.id}" requires a probability variant selection.`);
    }
    const variant = probability.variants.find(
      (candidate) => candidate.id === reference.probabilityVariantId,
    );
    if (!variant) {
      throw new Error(
        `Component "${component.id}" has no probability variant "${reference.probabilityVariantId}".`,
      );
    }
    return resolveReliabilityProbability(variant.probability, progression, context);
  }
  if (reference.probabilityVariantId !== undefined) {
    throw new Error(`Component "${component.id}" does not define probability variants.`);
  }
  return resolveReliabilityProbability(probability, progression, context);
}
