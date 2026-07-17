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
  it('round-trips normalized ownership, progression, notes, and every Habit Level', () => {
    const roster = createEmptyRoster(dragons);
    const levels = [null, 0, 1, 2, 3, 4, 5] as const;
    let levelIndex = 0;
    for (const entry of Object.values(roster)) {
      entry.owned = levelIndex === 0;
      entry.starRank = levelIndex === 0 ? 10 : null;
      entry.reignLevel = levelIndex === 0 ? 42 : null;
      entry.notes = levelIndex === 0 ? 'Cloud note' : '';
      for (const habitId of Object.keys(entry.habitLevels)) {
        entry.habitLevels[habitId] = levels[levelIndex % levels.length] ?? null;
        levelIndex += 1;
      }
    }
    const parsed = parseCloudRosterRow({
      user_id: 'user-a',
      roster_schema_version: ROSTER_SCHEMA_VERSION,
      roster: serializeCloudRoster(roster),
      client_updated_at: '2026-07-17T12:00:00.000Z',
      updated_at: '2026-07-17T12:00:01.000Z',
    });

    expect(rosterFingerprint(parsed.roster)).toBe(rosterFingerprint(roster));
    expect(parsed.roster[dragons[0]!.id]).toMatchObject({ owned: true, starRank: 10, reignLevel: 42, notes: 'Cloud note' });
    expect(new Set(Object.values(parsed.roster).flatMap((entry) => Object.values(entry.habitLevels)))).toEqual(new Set(levels));
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

  it('detects meaningful values including Habit Level zero and summarizes conflicts', () => {
    const roster = createEmptyRoster(dragons);
    expect(hasMeaningfulRosterData(roster)).toBe(false);
    const first = roster[dragons[0]!.id]!;
    const habitId = Object.keys(first.habitLevels)[0]!;
    first.habitLevels[habitId] = 0;
    expect(hasMeaningfulRosterData(roster)).toBe(true);
    expect(summarizeRoster(roster).habitLevels).toBe(1);
  });
});
