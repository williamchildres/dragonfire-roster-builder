import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseCloudSavedFormationRow,
  savedFormationLibraryFingerprint,
  serializeCloudSavedFormationLibrary,
} from '../cloud/savedFormationContract';
import { SupabaseSavedFormationRepository } from '../cloud/supabaseServices';
import { InvalidCloudSavedFormationError, UnsupportedSavedFormationSchemaError } from '../cloud/types';
import { dragons } from '../data/dragons';
import { createEmptyRoster } from '../services/rosterStorage';
import { createEmptySavedFormationLibrary } from '../savedFormations/contract';
import { createSavedFormation, moveSavedFormation } from '../savedFormations/crud';

describe('Saved Formation cloud contract', () => {
  it('parses and serializes a valid mapped cloud row', () => {
    const library = libraryFixture();
    const row = cloudRow(library);
    expect(parseCloudSavedFormationRow(row)).toEqual({
      userId: 'user-a', schemaVersion: 1, library, clientUpdatedAt: library.updatedAt, updatedAt: '2026-08-01T01:00:01.000Z',
    });
    expect(serializeCloudSavedFormationLibrary(library)).toEqual(library);
  });

  it('rejects unsupported and malformed cloud rows', () => {
    expect(() => parseCloudSavedFormationRow({ ...cloudRow(libraryFixture()), formations_schema_version: 2 })).toThrow(UnsupportedSavedFormationSchemaError);
    expect(() => parseCloudSavedFormationRow({ ...cloudRow(libraryFixture()), formations: { bad: true } })).toThrow(InvalidCloudSavedFormationError);
  });

  it('fingerprints semantic order independently from roster data and library updatedAt', () => {
    const library = libraryFixture();
    expect(savedFormationLibraryFingerprint({ ...library, updatedAt: '2026-08-02T00:00:00.000Z' })).toBe(savedFormationLibraryFingerprint(library));
    const second = createSavedFormation(library, { name: 'Second', arrangement: {
      'left-flank': dragons[3]!.id, vanguard: dragons[4]!.id, 'right-flank': dragons[5]!.id,
    }, evaluationMode: 'planning', source: 'optimizer', roster: createEmptyRoster(dragons), id: '00000000-0000-4000-8000-000000000002', now: '2026-08-01T02:00:00.000Z' });
    expect(savedFormationLibraryFingerprint(moveSavedFormation(second, second.formations[1]!.id, 'up'))).not.toBe(savedFormationLibraryFingerprint(second));
  });

  it('repository fetches and upserts the separate table', async () => {
    const library = libraryFixture();
    const query = new FakeQuery(cloudRow(library));
    const from = vi.fn(() => query);
    const client = { from } as unknown as SupabaseClient;
    const repository = new SupabaseSavedFormationRepository(client);
    expect((await repository.fetchLibrary('user-a'))?.library).toEqual(library);
    await repository.upsertLibrary('user-a', library, library.updatedAt);
    expect(from).toHaveBeenCalledWith('user_saved_formations');
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-a', formations_schema_version: 1, formations: library }), { onConflict: 'user_id' });
  });
});

describe('Saved Formation Supabase migration', () => {
  const sql = readFileSync('supabase/migrations/202608010001_create_user_saved_formations.sql', 'utf8');

  it('creates a separate private table and timestamp trigger', () => {
    expect(sql).toMatch(/create table public\.user_saved_formations/i);
    expect(sql).toMatch(/formations_schema_version integer not null/i);
    expect(sql).toMatch(/formations jsonb not null/i);
    expect(sql).toMatch(/before update on public\.user_saved_formations/i);
    expect(sql).not.toMatch(/email|service_role/i);
  });

  it('enables RLS with own-row select, insert, update, and delete policies', () => {
    expect(sql).toMatch(/enable row level security/i);
    for (const command of ['select', 'insert', 'update', 'delete']) expect(sql).toMatch(new RegExp(`for ${command}[\\s\\S]*auth\\.uid\\(\\)`, 'i'));
    expect(sql).toMatch(/grant select, insert, update, delete[\s\S]*to authenticated/i);
    expect(sql).toMatch(/revoke all privileges[\s\S]*from public, anon, authenticated/i);
  });
});

function libraryFixture() {
  return createSavedFormation(createEmptySavedFormationLibrary('2026-08-01T01:00:00.000Z'), {
    name: 'Cloud formation',
    arrangement: { 'left-flank': dragons[0]!.id, vanguard: dragons[1]!.id, 'right-flank': dragons[2]!.id },
    evaluationMode: 'planning', source: 'formation-builder', roster: createEmptyRoster(dragons),
    id: '00000000-0000-4000-8000-000000000001', now: '2026-08-01T01:00:00.000Z',
  });
}

class FakeQuery {
  constructor(private readonly row: ReturnType<typeof cloudRow>) {}
  select = vi.fn(() => this);
  eq = vi.fn(() => this);
  upsert = vi.fn(() => this);
  maybeSingle = vi.fn(() => Promise.resolve({ data: this.row, error: null }));
  single = vi.fn(() => Promise.resolve({ data: this.row, error: null }));
}

function cloudRow(library: ReturnType<typeof libraryFixture>) {
  return {
    user_id: 'user-a', formations_schema_version: 1, formations: library,
    client_updated_at: library.updatedAt, updated_at: '2026-08-01T01:00:01.000Z',
  };
}
