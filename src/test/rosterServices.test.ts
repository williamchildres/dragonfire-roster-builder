import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
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
    expect(filterDragons(dragons, roster, { ...defaultFilters, rarity: 'Legendary' })).toHaveLength(10);
    expect(filterDragons(dragons, roster, { ...defaultFilters, breed: 'Champion' })).toHaveLength(9);
    expect(filterDragons(dragons, roster, { ...defaultFilters, owned: 'owned' })).toHaveLength(1);
    expect(filterDragons(dragons, roster, { ...defaultFilters, owned: 'unowned' })).toHaveLength(32);
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
      roster: Array<Record<string, unknown>>;
    };

    expect(exported.format).toBe('dragonfire-roster-lab');
    expect(exported.schemaVersion).toBe(ROSTER_SCHEMA_VERSION);
    expect(exported.roster).toHaveLength(33);
    expect(exported.roster[0]).not.toHaveProperty('collection');
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
              'malachite-forests-instinct': 1,
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

  it('accepts only Habit Levels 1 through 5', () => {
    expect([1, 2, 3, 4, 5].every((level) => isValidHabitLevel(level))).toBe(true);
    expect([null, 0, 6].every((level) => !isValidHabitLevel(level))).toBe(true);
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
    expect(migrated.malachite!.habitLevels).toEqual({});
  });

  it('normalizes legacy collection states and ignores shard values without clearing values', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: 'dragonfire-roster-lab-local',
        schemaVersion: 3,
        updatedAt: '2026-06-23T00:00:00.000Z',
        roster: [
          {
            dragonId: 'seasmoke',
            collection: { state: 'hatched', shardsCurrent: 10, shardsRequired: 15 },
            starRank: null,
            reignLevel: 4,
            notes: 'Ten shards in screenshot',
            habitLevels: {},
          },
          {
            dragonId: 'arrax',
            owned: true,
            collection: { state: 'not-collected', shardsCurrent: 0, shardsRequired: null },
            starRank: 2,
            reignLevel: 6,
            notes: 'Owned flag wins',
            habitLevels: {},
          },
          {
            dragonId: 'malachite',
            owned: false,
            collection: { state: 'not-hatched', shardsCurrent: 5, shardsRequired: 15 },
            starRank: 3,
            reignLevel: 7,
            notes: 'Not hatched yet',
            habitLevels: {
              'malachite-forests-instinct': 0,
              'malachite-wise-vigor': 1,
              'malachite-thunderous-roar': 2,
              'malachite-collective-might': 3,
              'malachite-lightning-strike': 5,
            },
          },
          {
            dragonId: 'caraxes',
            owned: false,
            collection: { state: 'not-collected', shardsCurrent: 0, shardsRequired: null },
            starRank: 4,
            reignLevel: 8,
            notes: 'Not collected',
            habitLevels: {},
          },
        ],
      }),
    );

    const migrated = loadRoster(window.localStorage, dragons);

    expect(migrated.seasmoke!.owned).toBe(true);
    expect(migrated.seasmoke!.reignLevel).toBe(4);
    expect(migrated.seasmoke!.notes).toBe('Ten shards in screenshot');
    expect(migrated.arrax!.owned).toBe(true);
    expect(migrated.arrax!.starRank).toBe(2);
    expect(migrated.arrax!.reignLevel).toBe(6);
    expect(migrated.malachite!.owned).toBe(false);
    expect(migrated.malachite!.starRank).toBe(3);
    expect(migrated.malachite!.reignLevel).toBe(7);
    expect(migrated.malachite!.notes).toBe('Not hatched yet');
    expect(migrated.malachite!.habitLevels['malachite-forests-instinct']).toBe(1);
    expect(migrated.malachite!.habitLevels['malachite-lightning-strike']).toBeUndefined();
    expect(migrated.caraxes!.owned).toBe(false);
  });

  it('imports old exported JSON with collection and shard fields as simplified ownership', () => {
    const valid = validateRosterImport(
      JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion: 3,
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
          {
            dragonId: 'syrax',
            collection: { state: 'hatched', shardsCurrent: -1, shardsRequired: 15 },
            starRank: 7,
            reignLevel: 12,
            notes: 'Legacy shard values are ignored',
            habitLevels: {
              'syrax-mindful-synergy': 1,
              'syrax-flight-mastery': 2,
              'syrax-strategic-revival': 3,
              'syrax-tactical-inferno': 4,
              'syrax-mothers-mercy': 5,
            },
          },
        ],
      }),
      dragons,
    );

    expect(valid.ok).toBe(true);
    expect(valid.roster?.seasmoke!.owned).toBe(false);
    expect(valid.roster?.syrax!.owned).toBe(true);
    expect(valid.roster?.syrax!.starRank).toBe(7);
    expect(valid.roster?.syrax!.reignLevel).toBe(12);
    expect(valid.roster?.syrax!.notes).toBe('Legacy shard values are ignored');
    expect(valid.roster?.syrax!.habitLevels['syrax-strategic-revival']).toBe(3);
    expect(valid.roster?.syrax!.habitLevels['syrax-mothers-mercy']).toBeUndefined();
  });

  it('round-trips simplified exports through import without shard or collection fields', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 5;
    roster.syrax!.reignLevel = 11;
    roster.syrax!.notes = 'Ready for vanguard testing';
    roster.syrax!.habitLevels['syrax-mindful-synergy'] = 4;

    const exported = serializeRosterExport(roster);
    expect(exported).not.toContain('shardsCurrent');
    expect(exported).not.toContain('shardsRequired');
    expect(exported).not.toContain('collection');

    const imported = validateRosterImport(exported, dragons);

    expect(imported.ok).toBe(true);
    expect(imported.roster?.syrax!.owned).toBe(true);
    expect(imported.roster?.syrax!.starRank).toBe(5);
    expect(imported.roster?.syrax!.reignLevel).toBe(11);
    expect(imported.roster?.syrax!.notes).toBe('Ready for vanguard testing');
    expect(imported.roster?.syrax!.habitLevels['syrax-mindful-synergy']).toBe(4);
  });

  it('migrates schema-4 null, zero, missing, locked, and unknown Habit Levels deterministically', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      format: 'dragonfire-roster-lab-local',
      schemaVersion: 4,
      updatedAt: '2026-07-17T00:00:00.000Z',
      roster: [{
        dragonId: 'syrax',
        owned: true,
        starRank: 6,
        reignLevel: 20,
        notes: '',
        habitLevels: {
          'syrax-mindful-synergy': 0,
          'syrax-flight-mastery': null,
          'syrax-tactical-inferno': 5,
          'unknown-habit': 4,
        },
      }],
    }));

    const migrated = loadRoster(window.localStorage, dragons);
    expect(migrated.syrax!.habitLevels).toEqual({
      'syrax-mindful-synergy': 1,
      'syrax-flight-mastery': 1,
      'syrax-strategic-revival': 1,
    });
  });

  it.each([0, null])('rejects an explicitly supplied schema-5 Habit Level %s', (level) => {
    const result = validateRosterImport(JSON.stringify({
      format: 'dragonfire-roster-lab',
      schemaVersion: 5,
      roster: [{ dragonId: 'syrax', starRank: 2, habitLevels: { 'syrax-mindful-synergy': level } }],
    }), dragons);
    expect(result.ok).toBe(false);
  });

  it('reads every supported legacy import schema and rejects future schemas', () => {
    for (const schemaVersion of [1, 2, 3, 4]) {
      expect(validateRosterImport(JSON.stringify({
        format: 'dragonfire-roster-lab',
        schemaVersion,
        roster: [{ dragonId: 'syrax', starRank: 2, habitLevels: { 'syrax-mindful-synergy': 0 } }],
      }), dragons).ok).toBe(true);
    }
    expect(validateRosterImport(JSON.stringify({
      format: 'dragonfire-roster-lab', schemaVersion: 6, roster: [],
    }), dragons).ok).toBe(false);
  });

  it('emits sparse schema-5 Habit Levels with no null, zero, locked, or unknown values', () => {
    const roster = createEmptyRoster(dragons);
    Object.assign(roster.syrax!, {
      starRank: 2,
      reignLevel: 20,
      habitLevels: {
        'syrax-mindful-synergy': 5,
        'syrax-flight-mastery': 4,
        'unknown-habit': 3,
      },
    });
    const exported = JSON.parse(serializeRosterExport(roster)) as { roster: OwnedDragon[] };
    const syrax = exported.roster.find((entry) => entry.dragonId === 'syrax')!;
    expect(syrax.habitLevels).toEqual({ 'syrax-mindful-synergy': 5 });
    expect(JSON.stringify(exported.roster.map((entry) => entry.habitLevels))).not.toMatch(/null|:0[,}]/);
  });
});
