import type { Dragon, HabitLevel, OwnedDragon } from '../../models/dragon';
import { isHabitUnlocked } from '../../services/habitLevels';
import { resolveReliabilityProbability } from './probability';
import type {
  AbilityReliabilityComponent,
  ProbabilityResolutionContext,
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
  progression: ReliabilityProgression,
  context: Omit<ProbabilityResolutionContext, 'habitLevel'> = {},
): number | null {
  if (!component.probability) return null;
  return resolveReliabilityProbability(component.probability, {
    ...context,
    habitLevel: progression.activeHabitLevels[component.sourceAbilityId] ?? null,
  });
}
