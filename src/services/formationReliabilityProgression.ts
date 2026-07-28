import type { Dragon, HabitLevel, OwnedDragon } from '../models/dragon';
import {
  reliabilityProgressionFromOwnedDragon,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability';
import type { SimpleFormation, SimpleProgressionByDragonId } from '../synergy/types';

export function reliabilityProgressionForFormation({
  formation,
  dragons,
  roster,
  simpleProgression,
  planningHabitLevel,
}: {
  formation: SimpleFormation;
  dragons: readonly Dragon[];
  roster: Readonly<Record<string, OwnedDragon | undefined>>;
  simpleProgression: SimpleProgressionByDragonId;
  planningHabitLevel?: HabitLevel;
}): ReliabilityProgressionByDragonId {
  const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));
  return Object.fromEntries(
    Object.values(formation).flatMap((dragonId) => {
      if (!dragonId) return [];
      const dragon = dragonsById.get(dragonId);
      if (!dragon) return [];
      const entry = planningHabitLevel
        ? planningEntry(dragon, simpleProgression[dragonId], planningHabitLevel)
        : roster[dragonId];
      return [[dragonId, reliabilityProgressionFromOwnedDragon(dragon, entry)]];
    }),
  );
}

function planningEntry(
  dragon: Dragon,
  progression: SimpleProgressionByDragonId[string],
  habitLevel: HabitLevel,
): OwnedDragon {
  return {
    dragonId: dragon.id,
    owned: true,
    starRank: progression?.starRank ?? null,
    reignLevel: progression?.dragonLevel ?? null,
    notes: '',
    habitLevels: Object.fromEntries(
      dragon.habits.map((habit) => [habit.id, habitLevel]),
    ),
  };
}
