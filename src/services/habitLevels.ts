import type { AbilityDefinition, OwnedDragon, RankedValue } from '../models/dragon';

export type SavedHabitLevel = OwnedDragon['habitLevels'][string] | undefined;
export type EffectiveHabitLevel = 1 | 2 | 3 | 4 | 5;

export function explicitHabitLevel(savedLevel: SavedHabitLevel): EffectiveHabitLevel | null {
  return savedLevel === 1 || savedLevel === 2 || savedLevel === 3 || savedLevel === 4 || savedLevel === 5
    ? savedLevel
    : null;
}

export function resolveEffectiveHabitLevel({
  unlockStarRank,
  starRank,
  savedLevel,
}: {
  unlockStarRank: number | null;
  starRank: number | null;
  savedLevel: SavedHabitLevel;
}): EffectiveHabitLevel | null {
  if (unlockStarRank !== null && (starRank === null || starRank < unlockStarRank)) {
    return null;
  }
  return explicitHabitLevel(savedLevel) ?? 1;
}

export function resolveEffectiveHabitLevelForAbility(
  ability: AbilityDefinition,
  rosterEntry: OwnedDragon | undefined,
  fallbackStarRank: number | null = null,
): EffectiveHabitLevel | null {
  if (ability.kind !== 'habit') {
    return null;
  }
  return resolveEffectiveHabitLevel({
    unlockStarRank: ability.unlockStarRank,
    starRank: rosterEntry?.starRank ?? fallbackStarRank,
    savedLevel: rosterEntry?.habitLevels[ability.id],
  });
}

export function rankedValueForHabitLevel(
  values: RankedValue[],
  habitLevel: EffectiveHabitLevel | null,
): RankedValue | undefined {
  return habitLevel === null ? undefined : values.find((value) => value.level === habitLevel);
}
