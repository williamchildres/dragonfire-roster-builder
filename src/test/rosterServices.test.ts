import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { defaultFilters, filterDragons, sortDragons } from '../services/rosterFilters';
import {
  createEmptyRoster,
  loadRoster,
  ROSTER_SCHEMA_VERSION,
  saveRoster,
  serializeRosterExport,
  STORAGE_KEY,
  validateRosterImport,
} from '../services/rosterStorage';

describe('roster filtering and sorting', () => {
  it('filters by search, rarity, breed, and ownership', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;

    expect(filterDragons(dragons, roster, { ...defaultFilters, search: 'syra' })).toHaveLength(1);
    expect(filterDragons(dragons, roster, { ...defaultFilters, rarity: 'Legendary' })).toHaveLength(8);
    expect(filterDragons(dragons, roster, { ...defaultFilters, breed: 'Champion' })).toHaveLength(8);
    expect(filterDragons(dragons, roster, { ...defaultFilters, owned: 'owned' })).toHaveLength(1);
    expect(filterDragons(dragons, roster, { ...defaultFilters, owned: 'unowned' })).toHaveLength(27);
  });

  it('sorts by name, rarity, breed, and star rank', () => {
    const roster = createEmptyRoster(dragons);
    roster.arrax!.starRank = 5;

    expect(sortDragons(dragons, roster, 'name')[0]?.name).toBe('Antares');
    expect(sortDragons(dragons, roster, 'rarity')[0]?.rarity).toBe('Legendary');
    expect(sortDragons(dragons, roster, 'breed')[0]?.breed).toBe('Champion');
    expect(sortDragons(dragons, roster, 'starRank')[0]?.name).toBe('Arrax');
  });
});

describe('roster storage and import/export', () => {
  it('persists ownership data with a versioned localStorage payload', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 4;

    saveRoster(window.localStorage, roster);
    const loaded = loadRoster(window.localStorage, dragons);

    expect(loaded.syrax!.owned).toBe(true);
    expect(loaded.syrax!.starRank).toBe(4);
  });

  it('falls back to defaults for malformed or unsupported localStorage data', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"format":"old"}');

    const loaded = loadRoster(window.localStorage, dragons);

    expect(Object.values(loaded).every((entry) => !entry.owned)).toBe(true);
  });

  it('serializes a safe export structure', () => {
    const exported = JSON.parse(serializeRosterExport(createEmptyRoster(dragons))) as {
      format: string;
      schemaVersion: number;
      roster: unknown[];
    };

    expect(exported.format).toBe('dragonfire-roster-lab');
    expect(exported.schemaVersion).toBe(ROSTER_SCHEMA_VERSION);
    expect(exported.roster).toHaveLength(28);
  });

  it('validates imported roster JSON', () => {
    const valid = validateRosterImport(
      JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion: ROSTER_SCHEMA_VERSION,
        roster: [
          {
            dragonId: 'syrax',
            owned: true,
            starRank: 5,
            reignLevel: 0,
            notes: 'Ready',
          },
        ],
      }),
      dragons,
    );
    const invalid = validateRosterImport(
      JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion: ROSTER_SCHEMA_VERSION,
        roster: [{ dragonId: 'not-real', owned: 'yes', starRank: 9, reignLevel: -1, notes: 12 }],
      }),
      dragons,
    );

    expect(valid.ok).toBe(true);
    expect(valid.roster?.syrax!.owned).toBe(true);
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });
});
