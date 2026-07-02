import type { FormationPosition } from '../models/dragon';

export const SIMPLE_FORMATION_POSITIONS: FormationPosition[] = [
  'left-flank',
  'vanguard',
  'right-flank',
];

export const SIMPLE_POSITION_LABELS: Record<FormationPosition, string> = {
  'left-flank': 'Left Flank',
  vanguard: 'Vanguard',
  'right-flank': 'Right Flank',
};

const adjacentPositions: Record<FormationPosition, FormationPosition[]> = {
  'left-flank': ['vanguard'],
  vanguard: ['left-flank', 'right-flank'],
  'right-flank': ['vanguard'],
};

export function areAdjacent(left: FormationPosition, right: FormationPosition): boolean {
  return adjacentPositions[left].includes(right);
}

export function formatPosition(position: FormationPosition): string {
  return SIMPLE_POSITION_LABELS[position];
}
