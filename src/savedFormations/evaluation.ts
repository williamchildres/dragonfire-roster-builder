import { dragons } from '../data/dragons';
import { FORMATION_POSITIONS, type Dragon, type HabitLevel, type OwnedDragon } from '../models/dragon';
import { estimateFormationPower, type EstimatedFormationPower } from '../power/estimatedFormationPower';
import { rateFormationV3, type FormationRatingV3Result } from '../services/formationRatingV3';
import { reliabilityProgressionForFormation } from '../services/formationReliabilityProgression';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { DragonSynergyProfile, SimpleProgressionByDragonId } from '../synergy/types';
import { compareSavedFormationProgression, progressionForMode } from './progression';
import type { SavedFormationProgressionComparison, SavedFormationProgressionEntry, SavedFormationRecord } from './types';

export interface SavedFormationEvaluation {
  record: SavedFormationRecord;
  rating: FormationRatingV3Result;
  estimatedPower: EstimatedFormationPower | null;
  progression: SavedFormationProgressionComparison;
  status: 'available' | 'incomplete' | 'unavailable';
}

export function evaluateSavedFormation({
  record,
  roster,
  canonicalDragons = dragons,
  profiles = simpleSynergyProfiles,
}: {
  record: SavedFormationRecord;
  roster: Readonly<Record<string, OwnedDragon | undefined>>;
  canonicalDragons?: readonly Dragon[];
  profiles?: DragonSynergyProfile[];
}): SavedFormationEvaluation {
  const dragonsById = new Map(canonicalDragons.map((dragon) => [dragon.id, dragon]));
  const modeProgression: Record<string, SavedFormationProgressionEntry> = Object.fromEntries(FORMATION_POSITIONS.map((position) => {
    const dragonId = record.arrangement[position];
    const dragon = dragonsById.get(dragonId);
    if (!dragon) throw new Error(`Unknown dragon ID: ${dragonId}`);
    return [dragonId, progressionForMode(dragon, roster[dragonId], record.evaluationMode)];
  }));
  const simpleProgression: SimpleProgressionByDragonId = Object.fromEntries(Object.entries(modeProgression).map(([dragonId, entry]) => [dragonId, {
    starRank: entry.starRank,
    dragonLevel: entry.dragonLevel,
  }]));
  const reliabilityRoster: Record<string, OwnedDragon> = Object.fromEntries(Object.entries(modeProgression).map(([dragonId, entry]) => [dragonId, {
    dragonId,
    owned: entry.owned,
    starRank: entry.starRank,
    reignLevel: entry.dragonLevel,
    notes: '',
    habitLevels: Object.fromEntries(Object.entries(entry.activeHabitLevels).filter((entry): entry is [string, HabitLevel] => entry[1] !== null)),
  }]));
  const reliabilityProgression = reliabilityProgressionForFormation({
    formation: record.arrangement,
    dragons: [...canonicalDragons],
    roster: reliabilityRoster,
    simpleProgression,
    planningHabitLevel: record.evaluationMode === 'planning' ? 5 : undefined,
  });
  const rating = rateFormationV3({
    formation: record.arrangement,
    dragons: [...canonicalDragons],
    profiles,
    progression: simpleProgression,
    reliabilityProgression,
  });
  const progression = compareSavedFormationProgression({ record, roster, canonicalDragons });
  const estimatedPower = progression.status === 'unavailable'
    ? null
    : estimateFormationPower({ formation: record.arrangement, dragons: canonicalDragons, progression: simpleProgression });
  return {
    record,
    rating,
    estimatedPower,
    progression,
    status: progression.status === 'unavailable' ? 'unavailable' : rating.score === null ? 'incomplete' : 'available',
  };
}
