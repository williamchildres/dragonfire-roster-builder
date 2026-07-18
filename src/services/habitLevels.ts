import type { AbilityDefinition, Dragon, HabitLevel, OwnedDragon } from '../models/dragon';

type Progression = Pick<OwnedDragon, 'starRank' | 'reignLevel'>;
type ReconciledEntryInput = Omit<OwnedDragon, 'habitLevels'> & { habitLevels?: unknown };

export function isHabitUnlocked(habit: AbilityDefinition, entry: Progression): boolean {
  return requirementSatisfied(habit.unlockStarRank, entry.starRank) &&
    requirementSatisfied(habit.minimumDragonLevel, entry.reignLevel);
}

export function reconcileHabitLevels(dragon: Dragon, entry: ReconciledEntryInput): OwnedDragon {
  const provided = isRecord(entry.habitLevels) ? entry.habitLevels : {};
  const habitLevels: Partial<Record<string, HabitLevel>> = {};

  for (const habit of dragon.habits) {
    if (!isHabitUnlocked(habit, entry)) continue;
    const level = provided[habit.id];
    habitLevels[habit.id] = isHabitLevel(level) ? level : 1;
  }

  return { ...entry, habitLevels };
}

export function applyOwnedDragonPatch(
  dragon: Dragon,
  currentEntry: OwnedDragon,
  patch: Partial<OwnedDragon>,
): OwnedDragon {
  return reconcileHabitLevels(dragon, {
    ...currentEntry,
    ...patch,
    dragonId: dragon.id,
    habitLevels: {
      ...currentEntry.habitLevels,
      ...(isRecord(patch.habitLevels) ? patch.habitLevels : {}),
    },
  });
}

export function isHabitLevel(value: unknown): value is HabitLevel {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

function requirementSatisfied(requirement: number | null, progression: number | null): boolean {
  if (requirement === null || requirement <= 0) return true;
  return progression !== null && progression >= requirement;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
