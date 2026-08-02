import { dragons } from '../data/dragons';
import { FORMATION_POSITIONS, type Dragon, type HabitLevel, type OwnedDragon } from '../models/dragon';
import { isHabitUnlocked } from '../services/habitLevels';
import type { FormationArrangement } from '../services/formationArrangement';
import type {
  SavedFormationEvaluationMode,
  SavedFormationProgressionChange,
  SavedFormationProgressionComparison,
  SavedFormationProgressionEntry,
  SavedFormationRecord,
} from './types';

export function captureSavedFormationProgression({
  arrangement,
  evaluationMode,
  roster,
  canonicalDragons = dragons,
}: {
  arrangement: FormationArrangement;
  evaluationMode: SavedFormationEvaluationMode;
  roster: Readonly<Record<string, OwnedDragon | undefined>>;
  canonicalDragons?: readonly Dragon[];
}): Record<string, SavedFormationProgressionEntry> {
  const dragonsById = new Map(canonicalDragons.map((dragon) => [dragon.id, dragon]));
  const result: Record<string, SavedFormationProgressionEntry> = Object.fromEntries(FORMATION_POSITIONS.map((position) => {
    const dragonId = arrangement[position];
    const dragon = dragonsById.get(dragonId);
    if (!dragon) throw new Error(`Unknown dragon ID: ${dragonId}`);
    return [dragonId, progressionForMode(dragon, roster[dragonId], evaluationMode)];
  }));
  return result;
}

export function compareSavedFormationProgression({
  record,
  roster,
  canonicalDragons = dragons,
}: {
  record: SavedFormationRecord;
  roster: Readonly<Record<string, OwnedDragon | undefined>>;
  canonicalDragons?: readonly Dragon[];
}): SavedFormationProgressionComparison {
  const current = captureSavedFormationProgression({
    arrangement: record.arrangement,
    evaluationMode: record.evaluationMode,
    roster,
    canonicalDragons,
  });
  const changes: SavedFormationProgressionChange[] = [];
  const missingDataByDragonId: Record<string, string[]> = {};
  const unavailableDragonIds: string[] = [];

  for (const position of FORMATION_POSITIONS) {
    const dragonId = record.arrangement[position];
    const before = record.savedProgressionByDragonId[dragonId];
    const after = current[dragonId];
    if (!before || !after) throw new Error(`Missing progression snapshot for ${dragonId}.`);
    if (record.evaluationMode === 'current-roster') {
      const missing: string[] = [];
      if (!after.owned) missing.push('not marked owned');
      if (after.starRank === null) missing.push('Star Rank');
      if (after.dragonLevel === null) missing.push('Dragon Level');
      for (const [habitId, level] of Object.entries(after.activeHabitLevels)) if (level === null) missing.push(`Habit ${habitId}`);
      if (missing.length > 0) {
        unavailableDragonIds.push(dragonId);
        missingDataByDragonId[dragonId] = missing;
      }
    }
    compareField(changes, dragonId, 'owned', before.owned, after.owned);
    compareField(changes, dragonId, 'starRank', before.starRank, after.starRank);
    compareField(changes, dragonId, 'dragonLevel', before.dragonLevel, after.dragonLevel);
    const habitIds = [...new Set([...Object.keys(before.activeHabitLevels), ...Object.keys(after.activeHabitLevels)])].sort();
    for (const habitId of habitIds) {
      compareField(changes, dragonId, 'habitLevel', before.activeHabitLevels[habitId] ?? null, after.activeHabitLevels[habitId] ?? null, habitId);
    }
  }

  return {
    status: unavailableDragonIds.length > 0 ? 'unavailable' : changes.length > 0 ? 'changed' : 'unchanged',
    changes,
    unavailableDragonIds,
    missingDataByDragonId,
  };
}

export function progressionForMode(
  dragon: Dragon,
  entry: OwnedDragon | undefined,
  evaluationMode: SavedFormationEvaluationMode,
): SavedFormationProgressionEntry {
  const starRank = evaluationMode === 'planning' ? 10 : entry?.starRank ?? null;
  const dragonLevel = entry?.reignLevel ?? null;
  const activeHabitLevels: Record<string, HabitLevel | null> = {};
  for (const habit of dragon.habits) {
    if (evaluationMode === 'planning') {
      activeHabitLevels[habit.id] = 5;
    } else if (isHabitUnlocked(habit, { starRank, reignLevel: dragonLevel })) {
      activeHabitLevels[habit.id] = entry?.habitLevels[habit.id] ?? null;
    }
  }
  return { owned: evaluationMode === 'planning' ? true : entry?.owned === true, starRank, dragonLevel, activeHabitLevels };
}

function compareField(
  changes: SavedFormationProgressionChange[],
  dragonId: string,
  field: SavedFormationProgressionChange['field'],
  before: boolean | number | null,
  after: boolean | number | null,
  habitId?: string,
) {
  if (before !== after) changes.push({ dragonId, field, habitId, before, after });
}
