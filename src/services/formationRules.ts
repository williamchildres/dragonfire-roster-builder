import { FORMATION_POSITIONS, type Dragon, type FormationPosition } from '../models/dragon';
import type { FormationAnalysisInput } from '../models/synergy';

export const FORMATION_ADJACENCY: Record<FormationPosition, FormationPosition[]> = {
  'left-flank': ['vanguard'],
  vanguard: ['left-flank', 'right-flank'],
  'right-flank': ['vanguard'],
};

export const THRESHOLD_BOUNDARY_NOTE =
  "Exactly 50% is not covered by the displayed 'above' or 'below' wording. This is a conservative textual interpretation and has not yet been confirmed in combat logs.";

export function getAdjacentPositions(position: FormationPosition): FormationPosition[] {
  return [...FORMATION_ADJACENCY[position]];
}

export function arePositionsAdjacent(positionA: FormationPosition, positionB: FormationPosition): boolean {
  return FORMATION_ADJACENCY[positionA].includes(positionB);
}

export function getAdjacentDragons(
  formation: FormationAnalysisInput,
  position: FormationPosition,
  dragons: Dragon[],
): Dragon[] {
  return getAdjacentPositions(position)
    .map((adjacentPosition) => formation[adjacentPosition])
    .map((dragonId) => dragons.find((dragon) => dragon.id === dragonId))
    .filter((dragon): dragon is Dragon => Boolean(dragon));
}

export function validateFormationAdjacencySymmetry(): boolean {
  return FORMATION_POSITIONS.every((position) =>
    FORMATION_ADJACENCY[position].every((adjacentPosition) =>
      FORMATION_ADJACENCY[adjacentPosition].includes(position),
    ),
  );
}

export function resolveThreeAllyTargets(
  formation: FormationAnalysisInput,
): Array<{ position: FormationPosition; dragonId: string }> {
  return FORMATION_POSITIONS.map((position) => ({
    position,
    dragonId: formation[position],
  })).filter((entry): entry is { position: FormationPosition; dragonId: string } =>
    Boolean(entry.dragonId),
  );
}

export function resolveOtherAllyTargets(
  formation: FormationAnalysisInput,
  sourcePosition: FormationPosition,
): Array<{ position: FormationPosition; dragonId: string }> {
  return FORMATION_POSITIONS.filter((position) => position !== sourcePosition)
    .map((position) => ({ position, dragonId: formation[position] }))
    .filter((entry): entry is { position: FormationPosition; dragonId: string } =>
      Boolean(entry.dragonId),
    );
}

export function isAboveThreshold(valuePercent: number, thresholdPercent: number): boolean {
  return valuePercent > thresholdPercent;
}

export function isBelowThreshold(valuePercent: number, thresholdPercent: number): boolean {
  return valuePercent < thresholdPercent;
}
