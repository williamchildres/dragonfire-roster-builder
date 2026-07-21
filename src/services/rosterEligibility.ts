import type { Dragon, OwnedDragon } from '../models/dragon';
import type { DragonProgression } from '../synergy/types';

/** The single eligibility rule shared by My Roster formation tools. */
export function isRosterDragonEligible(entry: OwnedDragon | undefined): boolean {
  return entry?.owned === true;
}

export function eligibleRosterDragons(
  dragons: Dragon[],
  roster: Record<string, OwnedDragon>,
): Dragon[] {
  return dragons.filter((dragon) => isRosterDragonEligible(roster[dragon.id]));
}

/** Resolve the saved progression fields exactly as Formation Builder My Roster mode does. */
export function currentRosterProgression(
  entry: OwnedDragon | undefined,
): DragonProgression {
  return {
    starRank: entry?.starRank ?? null,
    dragonLevel: entry?.reignLevel ?? null,
  };
}
