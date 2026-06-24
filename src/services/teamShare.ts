import { FORMATION_POSITIONS, type Dragon, type FormationPosition } from '../models/dragon';

export const TEAM_SIZE = 3;
export type Formation = Record<FormationPosition, string | null>;

export const emptyFormation = (): Formation => ({
  'left-flank': null,
  vanguard: null,
  'right-flank': null,
});

export const positionLabels: Record<FormationPosition, string> = {
  'left-flank': 'Left Flank',
  vanguard: 'Vanguard',
  'right-flank': 'Right Flank',
};

export const defaultAdjacency = {
  unresolved: true,
  note: 'The exact within-adjacency graph requires confirmation. The current visual formation is linear and does not invalidate formations from unverified adjacency assumptions.',
  likelyAdjacentPairs: [
    ['left-flank', 'vanguard'],
    ['vanguard', 'right-flank'],
  ] satisfies Array<[FormationPosition, FormationPosition]>,
};

export function sanitizeTeamIds(ids: string[], dragons: Dragon[]): Array<string | null> {
  const validIds = new Set(dragons.map((dragon) => dragon.id));
  const seen = new Set<string>();
  const next: Array<string | null> = [];

  for (const id of ids.slice(0, TEAM_SIZE)) {
    if (validIds.has(id) && !seen.has(id)) {
      seen.add(id);
      next.push(id);
    } else {
      next.push(null);
    }
  }

  while (next.length < TEAM_SIZE) {
    next.push(null);
  }

  return next;
}

export function parseSharedTeam(hashOrSearch: string, dragons: Dragon[]): Array<string | null> {
  const source = hashOrSearch.startsWith('#') ? hashOrSearch.slice(1) : hashOrSearch.replace(/^\?/, '');
  const params = new URLSearchParams(source);
  const team = params.get('team');

  if (!team) {
    return [null, null, null];
  }

  return sanitizeTeamIds(team.split(',').map((id) => decodeURIComponent(id.trim())), dragons);
}

export function createShareHash(teamIds: Array<string | null>): string {
  const encoded = teamIds.map((id) => encodeURIComponent(id ?? '')).join(',');
  return `#team=${encoded}`;
}

export function preventDuplicateSelection(
  teamIds: Array<string | null>,
  slotIndex: number,
  nextId: string | null,
): Array<string | null> {
  if (nextId !== null && teamIds.some((id, index) => index !== slotIndex && id === nextId)) {
    return teamIds;
  }

  return teamIds.map((id, index) => (index === slotIndex ? nextId : id));
}

export function sanitizeFormation(value: Partial<Formation>, dragons: Dragon[]): Formation {
  const validIds = new Set(dragons.map((dragon) => dragon.id));
  const seen = new Set<string>();
  const next = emptyFormation();

  for (const position of FORMATION_POSITIONS) {
    const id = value[position];
    if (id && validIds.has(id) && !seen.has(id)) {
      next[position] = id;
      seen.add(id);
    }
  }

  return next;
}

export function parseSharedFormation(hashOrSearch: string, dragons: Dragon[]): Formation {
  const source = hashOrSearch.startsWith('#') ? hashOrSearch.slice(1) : hashOrSearch.replace(/^\?/, '');
  const params = new URLSearchParams(source);
  const formation = params.get('formation');

  if (formation) {
    const values = Object.fromEntries(
      formation.split(',').map((part) => {
        const [position, id = ''] = part.split(':');
        return [position, decodeURIComponent(id)];
      }),
    ) as Partial<Formation>;
    return sanitizeFormation(values, dragons);
  }

  const legacyTeam = parseSharedTeam(hashOrSearch, dragons);
  return sanitizeFormation(
    {
      'left-flank': legacyTeam[0],
      vanguard: legacyTeam[1],
      'right-flank': legacyTeam[2],
    },
    dragons,
  );
}

export function createFormationShareHash(formation: Formation): string {
  const encoded = FORMATION_POSITIONS.map(
    (position) => `${position}:${encodeURIComponent(formation[position] ?? '')}`,
  ).join(',');
  return `#formation=${encoded}`;
}

export function preventDuplicateFormationPlacement(
  formation: Formation,
  position: FormationPosition,
  nextId: string | null,
): Formation {
  if (
    nextId !== null &&
    FORMATION_POSITIONS.some((existingPosition) => existingPosition !== position && formation[existingPosition] === nextId)
  ) {
    return formation;
  }

  return { ...formation, [position]: nextId };
}

export function moveFormationDragon(
  formation: Formation,
  from: FormationPosition,
  to: FormationPosition,
): Formation {
  const dragonId = formation[from];
  if (!dragonId || from === to) {
    return formation;
  }

  return {
    ...formation,
    [from]: formation[to],
    [to]: dragonId,
  };
}
