import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AccountSession, CloudSavedFormationRecord, CloudSavedFormationRepository } from '../cloud/types';
import { dragons } from '../data/dragons';
import { createEmptyRoster } from '../services/rosterStorage';
import { createEmptySavedFormationLibrary } from '../savedFormations/contract';
import { createSavedFormation, renameSavedFormation } from '../savedFormations/crud';
import type { SavedFormationLibrary } from '../savedFormations/types';
import { useSavedFormationSync } from '../hooks/useSavedFormationSync';

const sessionA: AccountSession = { userId: 'user-a', email: 'a@example.com' };

describe('Saved Formation synchronization', () => {
  it('stays browser-only without a repository', () => {
    const { result } = renderHook(() => useSavedFormationSync({ repository: null, session: null, sessionLoading: false, library: empty(), onApplyAccount: vi.fn() }));
    expect(result.current.status).toBe('browser-only');
  });

  it('initializes empty browser and absent account as synchronized without writing', async () => {
    const repository = new FakeRepository(null);
    const { result } = renderSync(repository, empty());
    await waitFor(() => expect(result.current.status).toBe('synced'));
    expect(repository.upserts).toHaveLength(0);
  });

  it('requires a local-to-account decision and can pause or choose browser', async () => {
    const repository = new FakeRepository(null);
    const { result } = renderSync(repository, library('Browser'));
    await waitFor(() => expect(result.current.status).toBe('migration-required'));
    act(() => result.current.pause());
    expect(result.current.status).toBe('paused');
    act(() => result.current.reopenDecision());
    expect(result.current.status).toBe('migration-required');
    act(() => result.current.saveBrowserToAccount());
    await waitFor(() => expect(repository.upserts).toHaveLength(1));
    await waitFor(() => expect(result.current.status).toBe('synced'));
  });

  it('applies account-only data locally and detects equal documents', async () => {
    const account = library('Account');
    const apply = vi.fn();
    const repository = new FakeRepository(record(account));
    const first = renderHook(() => useSavedFormationSync({ repository, session: sessionA, sessionLoading: false, library: empty(), onApplyAccount: apply }));
    await waitFor(() => expect(apply).toHaveBeenCalledWith(account));
    expect(first.result.current.status).toBe('synced');
    first.unmount();
    const equal = renderSync(new FakeRepository(record(account)), account);
    await waitFor(() => expect(equal.result.current.status).toBe('synced'));
  });

  it('exposes an independent conflict and can choose account', async () => {
    const browser = library('Browser');
    const account = library('Account');
    const apply = vi.fn();
    const { result } = renderHook(() => useSavedFormationSync({ repository: new FakeRepository(record(account)), session: sessionA, sessionLoading: false, library: browser, onApplyAccount: apply }));
    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(result.current.comparison).toMatchObject({ browser: { count: 1, names: ['Browser'] }, account: { count: 1, names: ['Account'] } });
    act(() => result.current.useAccountFormations());
    expect(apply).toHaveBeenCalledWith(account);
    expect(result.current.status).toBe('synced');
  });

  it('debounces edits, serializes in-flight writes, and ignores signed-out changes', async () => {
    const base = library('Base');
    const repository = new FakeRepository(record(base));
    const initialProps: { currentLibrary: SavedFormationLibrary; session: AccountSession | null } = { currentLibrary: base, session: sessionA };
    const view = renderHook(({ currentLibrary, session }: { currentLibrary: SavedFormationLibrary; session: AccountSession | null }) => useSavedFormationSync({ repository, session, sessionLoading: false, library: currentLibrary, onApplyAccount: vi.fn() }), {
      initialProps,
    });
    await waitFor(() => expect(view.result.current.status).toBe('synced'));
    const renamed = renameSavedFormation(base, base.formations[0]!.id, 'Rapid edit', '2026-08-01T05:00:00.000Z');
    view.rerender({ currentLibrary: renamed, session: sessionA });
    await waitFor(() => expect(repository.upserts).toHaveLength(1), { timeout: 2500 });
    expect(repository.upserts[0]!.library.formations[0]!.name).toBe('Rapid edit');
    view.rerender({ currentLibrary: renameSavedFormation(renamed, renamed.formations[0]!.id, 'Signed out edit'), session: null });
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    expect(repository.upserts).toHaveLength(1);
  });

  it('retries offline writes on reconnect and ignores a stale prior-account fetch', async () => {
    const base = library('Base');
    const repository = new FakeRepository(record(base));
    repository.failWrite = true;
    const view = renderHook(({ currentLibrary, session }: { currentLibrary: SavedFormationLibrary; session: AccountSession }) => useSavedFormationSync({ repository, session, sessionLoading: false, library: currentLibrary, onApplyAccount: vi.fn() }), { initialProps: { currentLibrary: base, session: sessionA } });
    await waitFor(() => expect(view.result.current.status).toBe('synced'));
    view.rerender({ currentLibrary: renameSavedFormation(base, base.formations[0]!.id, 'Offline'), session: sessionA });
    await waitFor(() => expect(view.result.current.status).toBe('error'), { timeout: 2500 });
    repository.failWrite = false;
    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(repository.upserts).toHaveLength(2));
    await waitFor(() => expect(view.result.current.status).toBe('synced'));

    let resolveA: ((record: CloudSavedFormationRecord | null) => void) | undefined;
    const delayed: CloudSavedFormationRepository = {
      fetchLibrary: (userId) => userId === 'user-a' ? new Promise((resolve) => { resolveA = resolve; }) : Promise.resolve(record(library('User B'), 'user-b')),
      upsertLibrary: vi.fn(),
    };
    const apply = vi.fn();
    const switched = renderHook(({ session }: { session: AccountSession }) => useSavedFormationSync({ repository: delayed, session, sessionLoading: false, library: empty(), onApplyAccount: apply }), { initialProps: { session: sessionA } });
    switched.rerender({ session: { userId: 'user-b', email: 'b@example.com' } });
    await waitFor(() => expect(apply).toHaveBeenCalledWith(expect.objectContaining({ formations: [expect.objectContaining({ name: 'User B' })] })));
    await act(async () => {
      resolveA?.(record(library('Stale A'), 'user-a'));
      await Promise.resolve();
    });
    expect(apply).not.toHaveBeenCalledWith(expect.objectContaining({ formations: [expect.objectContaining({ name: 'Stale A' })] }));
  });
});

class FakeRepository implements CloudSavedFormationRepository {
  upserts: Array<{ userId: string; library: SavedFormationLibrary; clientUpdatedAt: string }> = [];
  failWrite = false;
  constructor(public current: CloudSavedFormationRecord | null) {}
  fetchLibrary() { return Promise.resolve(this.current); }
  upsertLibrary(userId: string, library: SavedFormationLibrary, clientUpdatedAt: string) {
    this.upserts.push({ userId, library, clientUpdatedAt });
    if (this.failWrite) return Promise.reject(new Error('offline'));
    this.current = record(library, userId);
    return Promise.resolve(this.current);
  }
}

function renderSync(repository: CloudSavedFormationRepository, currentLibrary: SavedFormationLibrary) {
  return renderHook(() => useSavedFormationSync({ repository, session: sessionA, sessionLoading: false, library: currentLibrary, onApplyAccount: vi.fn() }));
}

function empty() { return createEmptySavedFormationLibrary('2026-08-01T00:00:00.000Z'); }
function library(name: string) {
  return createSavedFormation(empty(), {
    name,
    arrangement: { 'left-flank': dragons[0]!.id, vanguard: dragons[1]!.id, 'right-flank': dragons[2]!.id },
    evaluationMode: 'planning', source: 'formation-builder', roster: createEmptyRoster(dragons),
    id: '00000000-0000-4000-8000-000000000001', now: '2026-08-01T01:00:00.000Z',
  });
}
function record(currentLibrary: SavedFormationLibrary, userId = 'user-a'): CloudSavedFormationRecord {
  return { userId, schemaVersion: 2, library: currentLibrary, clientUpdatedAt: currentLibrary.updatedAt, updatedAt: currentLibrary.updatedAt };
}
