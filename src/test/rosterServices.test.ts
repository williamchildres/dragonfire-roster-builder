import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { defaultFilters, filterDragons, sortDragons } from '../services/rosterFilters';
import {
  createEmptyRoster,
  isValidHabitLevel,
  isValidStarRank,
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
    expect(filterDragons(dragons, roster, { ...defaultFilters, rarity: 'Legendary' })).toHaveLength(9);
    expect(filterDragons(dragons, roster, { ...defaultFilters, breed: 'Champion' })).toHaveLength(8);
    expect(filterDragons(dragons, roster, { ...defaultFilters, owned: 'owned' })).toHaveLength(1);
    expect(filterDragons(dragons, roster, { ...defaultFilters, owned: 'unowned' })).toHaveLength(29);
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
    expect(exported.roster).toHaveLength(30);
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
            starRank: 10,
            reignLevel: 0,
            notes: 'Ready',
            habitLevels: {
              'syrax-mindful-synergy': 1,
              'syrax-flight-mastery': 2,
              'syrax-strategic-revival': 3,
              'syrax-tactical-inferno': 4,
              'syrax-mothers-mercy': 5,
            },
          },
          {
            dragonId: 'malachite',
            owned: true,
            starRank: 1,
            reignLevel: null,
            notes: 'Partial',
            habitLevels: {
              'malachite-forests-instinct': 0,
              'malachite-wise-vigor': 1,
              'malachite-thunderous-roar': 2,
              'malachite-collective-might': 3,
              'malachite-lightning-strike': 5,
            },
          },
        ],
      }),
      dragons,
    );
    const invalid = validateRosterImport(
      JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion: ROSTER_SCHEMA_VERSION,
        roster: [
          {
            dragonId: 'malachite',
            owned: true,
            starRank: 11,
            reignLevel: -1,
            notes: 12,
            habitLevels: {
              'malachite-forests-instinct': 6,
              'malachite-wise-vigor': null,
              'malachite-thunderous-roar': null,
              'malachite-collective-might': null,
              'malachite-lightning-strike': null,
            },
          },
        ],
      }),
      dragons,
    );

    expect(valid.ok).toBe(true);
    expect(valid.roster?.syrax!.owned).toBe(true);
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('accepts Star Rank 10 and rejects Star Rank 11', () => {
    expect(isValidStarRank(10)).toBe(true);
    expect(isValidStarRank(11)).toBe(false);
  });

  it('accepts Habit Level 0 through 5 and rejects 6', () => {
    expect([0, 1, 2, 3, 4, 5, null].every((level) => isValidHabitLevel(level))).toBe(true);
    expect(isValidHabitLevel(6)).toBe(false);
  });

  it('migrates existing schema 1 localStorage data without clearing owned fields', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: 'dragonfire-roster-lab-local',
        schemaVersion: 1,
        updatedAt: '2026-06-23T00:00:00.000Z',
        roster: [
          {
            dragonId: 'malachite',
            owned: true,
            starRank: 1,
            reignLevel: 2,
            notes: 'Existing user note',
          },
        ],
      }),
    );

    const migrated = loadRoster(window.localStorage, dragons);

    expect(migrated.malachite!.owned).toBe(true);
    expect(migrated.malachite!.starRank).toBe(1);
    expect(migrated.malachite!.reignLevel).toBe(2);
    expect(migrated.malachite!.notes).toBe('Existing user note');
    expect(migrated.malachite!.collection.state).toBe('hatched');
    expect(Object.keys(migrated.malachite!.habitLevels)).toHaveLength(5);
    expect(Object.values(migrated.malachite!.habitLevels).every((level) => level === null)).toBe(true);
  });

  it('migrates schema 2 data to schema 3 collection defaults without clearing values', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: 'dragonfire-roster-lab-local',
        schemaVersion: 2,
        updatedAt: '2026-06-23T00:00:00.000Z',
        roster: [
          {
            dragonId: 'seasmoke',
            owned: false,
            starRank: null,
            reignLevel: 4,
            notes: 'Ten shards in screenshot',
            habitLevels: {},
          },
        ],
      }),
    );

    const migrated = loadRoster(window.localStorage, dragons);

    expect(migrated.seasmoke!.owned).toBe(false);
    expect(migrated.seasmoke!.collection).toEqual({
      state: 'not-collected',
      shardsCurrent: null,
      shardsRequired: null,
    });
    expect(migrated.seasmoke!.reignLevel).toBe(4);
    expect(migrated.seasmoke!.notes).toBe('Ten shards in screenshot');
  });

  it('validates collection state and shard progress during imports', () => {
    const valid = validateRosterImport(
      JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion: ROSTER_SCHEMA_VERSION,
        roster: [
          {
            dragonId: 'seasmoke',
            owned: false,
            collection: { state: 'not-hatched', shardsCurrent: 10, shardsRequired: 15 },
            starRank: null,
            reignLevel: null,
            notes: '',
            habitLevels: {
              'seasmoke-clever-maneuver': null,
              'seasmoke-winds-favor': null,
              'seasmoke-infectious-wrath': null,
              'seasmoke-cunning-ferocity': null,
              'seasmoke-loyal-bond': null,
            },
          },
        ],
      }),
      dragons,
    );
    const invalid = validateRosterImport(
      JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion: ROSTER_SCHEMA_VERSION,
        roster: [
          {
            dragonId: 'seasmoke',
            owned: false,
            collection: { state: 'not-hatched', shardsCurrent: -1, shardsRequired: 15 },
            starRank: null,
            reignLevel: null,
            notes: '',
            habitLevels: {},
          },
        ],
      }),
      dragons,
    );

    expect(valid.ok).toBe(true);
    expect(valid.roster?.seasmoke!.collection).toEqual({
      state: 'not-hatched',
      shardsCurrent: 10,
      shardsRequired: 15,
    });
    expect(invalid.ok).toBe(false);
  });
});
