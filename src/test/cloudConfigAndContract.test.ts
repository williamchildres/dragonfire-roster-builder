import { describe, expect, it } from 'vitest';
import { readCloudConfig } from '../cloud/cloudConfig';
import {
  hasMeaningfulRosterData,
  parseCloudRosterRow,
  rosterFingerprint,
  serializeCloudRoster,
  summarizeRoster,
} from '../cloud/rosterContract';
import { InvalidCloudRosterError, UnsupportedRosterSchemaError } from '../cloud/types';
import { dragons } from '../data/dragons';
import { applyOwnedDragonPatch } from '../services/habitLevels';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION } from '../services/rosterStorage';

describe('cloud configuration', () => {
  it('enables account services only when both trimmed variables are present', () => {
    expect(readCloudConfig({ VITE_SUPABASE_URL: ' https://example.supabase.co ', VITE_SUPABASE_PUBLISHABLE_KEY: ' key ' })).toEqual({
      state: 'configured',
      url: 'https://example.supabase.co',
      publishableKey: 'key',
    });
    expect(readCloudConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: 'key' })).toEqual({ state: 'unavailable' });
    expect(readCloudConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co' })).toEqual({ state: 'unavailable' });
    expect(readCloudConfig({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_PUBLISHABLE_KEY: 'key' })).toEqual({ state: 'unavailable' });
  });
});

describe('cloud roster contract', () => {
  it('round-trips the schema-5 sparse normalized roster', () => {
    const roster = createEmptyRoster(dragons);
    const dragon = dragons[0]!;
    roster[dragon.id] = applyOwnedDragonPatch(dragon, roster[dragon.id]!, {
      owned: true,
      starRank: 10,
      reignLevel: 42,
      notes: 'Cloud note',
      habitLevels: Object.fromEntries(dragon.habits.map((habit, index) => [habit.id, (index + 1) as 1 | 2 | 3 | 4 | 5])),
    });
    const parsed = parseCloudRosterRow({
      user_id: 'user-a',
      roster_schema_version: ROSTER_SCHEMA_VERSION,
      roster: serializeCloudRoster(roster),
      client_updated_at: '2026-07-17T12:00:00.000Z',
      updated_at: '2026-07-17T12:00:01.000Z',
    });

    expect(rosterFingerprint(parsed.roster)).toBe(rosterFingerprint(roster));
    expect(parsed.roster[dragons[0]!.id]).toMatchObject({ owned: true, starRank: 10, reignLevel: 42, notes: 'Cloud note' });
    expect(new Set(Object.values(parsed.roster[dragon.id]!.habitLevels))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('ignores unknown dragons and restores missing current dragons', () => {
    const entry = serializeCloudRoster(createEmptyRoster(dragons))[0]!;
    const parsed = parseCloudRosterRow({
      user_id: 'user-a',
      roster_schema_version: ROSTER_SCHEMA_VERSION,
      roster: [entry, { ...entry, dragonId: 'unknown-dragon' }],
      client_updated_at: null,
      updated_at: '2026-07-17T12:00:01.000Z',
    });
    expect(Object.keys(parsed.roster)).toHaveLength(dragons.length);
    expect(parsed.roster['unknown-dragon']).toBeUndefined();
  });

  it('rejects unsupported schemas and invalid roster values without normalization into state', () => {
    const roster = serializeCloudRoster(createEmptyRoster(dragons));
    const base = { user_id: 'user-a', roster, client_updated_at: null, updated_at: '2026-07-17T12:00:01.000Z' };
    expect(() => parseCloudRosterRow({ ...base, roster_schema_version: 999 })).toThrow(UnsupportedRosterSchemaError);
    expect(() => parseCloudRosterRow({ ...base, roster_schema_version: ROSTER_SCHEMA_VERSION, roster: { invalid: true } })).toThrow(InvalidCloudRosterError);
    expect(() => parseCloudRosterRow({
      ...base,
      roster_schema_version: ROSTER_SCHEMA_VERSION,
      roster: [{ ...roster[0], starRank: 11 }],
    })).toThrow(InvalidCloudRosterError);
  });

  it('parses schema 4, removes locked and unknown values, and fingerprints equivalent v4/v5 rosters equally', () => {
    const dragon = dragons[0]!;
    const legacyEntries = serializeCloudRoster(createEmptyRoster(dragons));
    legacyEntries[0] = {
      ...legacyEntries[0]!,
      starRank: 2,
      reignLevel: 20,
      habitLevels: {
        [dragon.habits[0]!.id]: 0,
        [dragon.habits[1]!.id]: 5,
        'unknown-habit': 4,
      } as never,
    };
    const parsedV4 = parseCloudRosterRow({
      user_id: 'user-a',
      roster_schema_version: 4,
      roster: legacyEntries,
      client_updated_at: null,
      updated_at: '2026-07-17T12:00:01.000Z',
    });
    const parsedV5 = parseCloudRosterRow({
      user_id: 'user-a',
      roster_schema_version: 5,
      roster: serializeCloudRoster(parsedV4.roster),
      client_updated_at: null,
      updated_at: '2026-07-17T12:00:01.000Z',
    });
    expect(parsedV4.rosterSchemaVersion).toBe(4);
    expect(parsedV4.roster[dragon.id]!.habitLevels).toEqual({ [dragon.habits[0]!.id]: 1 });
    expect(rosterFingerprint(parsedV4.roster)).toBe(rosterFingerprint(parsedV5.roster));
  });

  it('detects meaningful unlocked Habit Levels and summarizes conflicts', () => {
    const roster = createEmptyRoster(dragons);
    expect(hasMeaningfulRosterData(roster)).toBe(false);
    const dragon = dragons[0]!;
    roster[dragon.id] = applyOwnedDragonPatch(dragon, roster[dragon.id]!, { starRank: 2 });
    expect(hasMeaningfulRosterData(roster)).toBe(true);
    expect(summarizeRoster(roster).habitLevels).toBe(1);
  });
});
