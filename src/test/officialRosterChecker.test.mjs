import { describe, expect, it } from 'vitest';
import { compareRosters } from '../../scripts/check-official-roster.mjs';

describe('official roster checker pending-dragon handling', () => {
  it('ignores in-game verified pending dragons when comparing the public official roster', () => {
    const local = [
      {
        name: 'Official Dragon',
        rarity: 'Rare',
        breed: 'Hunter',
        rosterSourceStatus: 'official-website',
      },
      {
        name: 'Pending Dragon',
        rarity: 'Legendary',
        breed: 'Warrior',
        rosterSourceStatus: 'in-game-verified-pending-official-site',
      },
    ];
    const official = [{ name: 'Official Dragon', rarity: 'Rare', breed: 'Hunter' }];

    expect(compareRosters(local, official)).toMatchObject({
      additions: [],
      removals: [],
      changes: [],
      pendingNowOfficial: [],
      counts: {
        knownInGame: 2,
        officialWebsiteLocal: 1,
        pendingOfficialSite: 1,
        parsedOfficial: 1,
      },
    });
  });

  it('reports when a pending in-game dragon appears on the official roster', () => {
    const local = [
      {
        name: 'Pending Dragon',
        rarity: 'Legendary',
        breed: 'Warrior',
        rosterSourceStatus: 'in-game-verified-pending-official-site',
      },
    ];
    const official = [{ name: 'Pending Dragon', rarity: 'Legendary', breed: 'Warrior' }];

    expect(compareRosters(local, official).pendingNowOfficial).toEqual([local[0]]);
  });
});
