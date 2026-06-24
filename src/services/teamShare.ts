import type { Dragon } from '../models/dragon';

export const TEAM_SIZE = 3;

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
