import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type {
  AccountServices,
  AccountSession,
  AuthService,
  CloudRosterRecord,
  CloudRosterRepository,
} from '../cloud/types';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import {
  createEmptyRoster,
  loadStoredRosterSnapshot,
  ROSTER_SCHEMA_VERSION,
  saveRosterSnapshot,
  serializeRosterExport,
} from '../services/rosterStorage';

class FakeAuth implements AuthService {
  readonly magicLinks: Array<{ email: string; redirectTo: string }> = [];
  readonly listeners = new Set<(session: AccountSession | null) => void>();
  cleanupCount = 0;
  failMagicLink = false;

  constructor(public session: AccountSession | null) {}

  getSession() {
    return Promise.resolve(this.session);
  }

  onAuthStateChange(listener: (session: AccountSession | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      this.cleanupCount += 1;
    };
  }

  sendMagicLink(email: string, redirectTo: string) {
    this.magicLinks.push({ email, redirectTo });
    if (this.failMagicLink) {
      return Promise.reject(new Error('private authentication detail'));
    }
    return Promise.resolve();
  }

  signOut() {
    this.emit(null);
    return Promise.resolve();
  }

  emit(session: AccountSession | null) {
    this.session = session;
    for (const listener of this.listeners) {
      listener(session);
    }
  }
}

class FakeRosters implements CloudRosterRepository {
  readonly fetches: string[] = [];
  readonly upserts: Array<{ userId: string; roster: Record<string, OwnedDragon>; clientUpdatedAt: string }> = [];
  failFetch = false;
  failWrite = false;

  constructor(public record: CloudRosterRecord | null) {}

  fetchRoster(userId: string) {
    this.fetches.push(userId);
    if (this.failFetch) {
      return Promise.reject(new Error('private database detail'));
    }
    return Promise.resolve(this.record);
  }

  upsertRoster(userId: string, roster: Record<string, OwnedDragon>, clientUpdatedAt: string) {
    this.upserts.push({ userId, roster, clientUpdatedAt });
    if (this.failWrite) {
      return Promise.reject(new Error('private database detail'));
    }
    const saved = makeRecord(userId, roster, clientUpdatedAt);
    this.record = saved;
    return Promise.resolve(saved);
  }
}

const signedInSession = { userId: 'user-a', email: 'PLAYER@Example.com' };

describe('optional account authentication UI', () => {
  it('renders no account action or cloud calls when unconfigured', async () => {
    const user = userEvent.setup();
    render(<App accountServices={null} />);
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/account synchronization/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roster' }));
    expect(screen.getByText('Manage ownership, Star Rank, and Dragon Level with local browser storage.')).toBeInTheDocument();
    expect(screen.queryByText(/Roster storage/i)).not.toBeInTheDocument();
  });

  it('validates and normalizes a magic-link request without password or social controls', async () => {
    const auth = new FakeAuth(null);
    const services = makeServices(auth, new FakeRosters(null));
    const user = userEvent.setup();
    render(<App accountServices={services} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    const signInDialog = screen.getByRole('dialog', { name: 'Sign in to Dragonfire Lab' });
    expect(within(signInDialog).queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(within(signInDialog).queryByRole('button', { name: /google|facebook|pro|billing/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email address'), '  PLAYER@Example.COM  ');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(await screen.findByText('Check your email for a Dragonfire Lab sign-in link.')).toBeInTheDocument();
    expect(auth.magicLinks).toHaveLength(1);
    expect(auth.magicLinks[0]!.email).toBe('player@example.com');
    expect(auth.magicLinks[0]!.redirectTo).not.toContain('#formation');
  });

  it('restores a signed-in session, exposes the account, and cleans up auth subscription', async () => {
    const auth = new FakeAuth(signedInSession);
    const user = userEvent.setup();
    const view = render(<App accountServices={makeServices(auth, new FakeRosters(null))} />);
    await user.click(await screen.findByRole('button', { name: /Account for PLAYER@Example.com/i }));
    const dialog = screen.getByRole('dialog', { name: 'Your account' });
    expect(within(dialog).getByText('PLAYER@Example.com')).toBeInTheDocument();
    expect(within(dialog).getByText('Saved formations are not yet synchronized to your account.')).toBeInTheDocument();
    view.unmount();
    expect(auth.cleanupCount).toBe(1);
  });

  it('shows a safe magic-link error without exposing provider details', async () => {
    const auth = new FakeAuth(null);
    auth.failMagicLink = true;
    const user = userEvent.setup();
    render(<App accountServices={makeServices(auth, new FakeRosters(null))} />);
    await user.click(await screen.findByRole('button', { name: /^sign in$/i }));
    await user.type(screen.getByLabelText('Email address'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(await screen.findByText('We could not send a sign-in link. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('private authentication detail')).not.toBeInTheDocument();
  });
});

describe('initial roster migration and conflict behavior', () => {
  it('prompts for meaningful local data and writes nothing before Save to account', async () => {
    const local = meaningfulRoster('Browser note', 0);
    seedLocal(local);
    const repository = new FakeRosters(null);
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);

    expect(await screen.findByRole('heading', { name: "Save this browser's roster to your account?" })).toBeInTheDocument();
    expect(repository.upserts).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Save to account' }));
    await waitFor(() => expect(repository.upserts).toHaveLength(1));
    const saved = repository.upserts[0]!.roster[dragons[0]!.id]!;
    expect(saved.notes).toBe('Browser note');
    expect(Object.values(saved.habitLevels)).toContain(0);
  });

  it('does not prompt for an empty browser with no cloud row', async () => {
    const repository = new FakeRosters(null);
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    expect(await screen.findByRole('button', { name: /Account for/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Save this browser|Choose which roster/i })).not.toBeInTheDocument();
    expect(repository.upserts).toHaveLength(0);
  });

  it('loads a meaningful cloud roster into an empty browser cache', async () => {
    const cloud = meaningfulRoster('Account note', 5);
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), new FakeRosters(makeRecord('user-a', cloud)))} />);
    await waitFor(() => {
      const stored = loadStoredRosterSnapshot(window.localStorage, dragons);
      expect(stored.roster[dragons[0]!.id]!.notes).toBe('Account note');
      expect(Object.values(stored.roster[dragons[0]!.id]!.habitLevels)).toContain(5);
    });
    expect(screen.queryByRole('heading', { name: 'Choose which roster to use' })).not.toBeInTheDocument();
  });

  it('does not prompt when normalized local and cloud rosters are equal', async () => {
    const roster = meaningfulRoster('Equal note', 3);
    seedLocal(roster);
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), new FakeRosters(makeRecord('user-a', roster)))} />);
    await screen.findByRole('button', { name: /Account for/i });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Choose which roster to use' })).not.toBeInTheDocument());
  });

  it('shows a readable differing-roster summary and can choose the account roster', async () => {
    seedLocal(meaningfulRoster('Browser note', 0));
    const cloud = meaningfulRoster('Account note', 5);
    cloud[dragons[1]!.id]!.owned = true;
    const repository = new FakeRosters(makeRecord('user-a', cloud));
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);

    const dialog = await screen.findByRole('dialog', { name: 'Choose which roster to use' });
    const comparison = within(dialog).getByRole('table', { name: 'This browser and account roster comparison' });
    expect(within(dialog).getByText('Owned dragons')).toBeInTheDocument();
    expect(within(dialog).getByText('Recorded Habit Levels')).toBeInTheDocument();
    expect(within(comparison).getByRole('columnheader', { name: 'Summary' })).toBeInTheDocument();
    expect(within(comparison).getByRole('columnheader', { name: 'This browser' })).toBeInTheDocument();
    expect(within(comparison).getByRole('columnheader', { name: 'Account' })).toBeInTheDocument();
    expect(within(comparison).getByRole('rowheader', { name: 'Last updated' })).toBeInTheDocument();
    expect(comparison.querySelectorAll('[data-column-label="This browser"]')).toHaveLength(5);
    expect(comparison.querySelectorAll('[data-column-label="Account"]')).toHaveLength(5);
    expect(comparison.querySelectorAll('.comparison-value-label[aria-hidden="true"]')).toHaveLength(10);
    expect(dialog.querySelector('.account-dialog-header')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Use this browser' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Use account roster' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    expect(repository.upserts).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Use account roster' }));
    await waitFor(() => expect(loadStoredRosterSnapshot(window.localStorage, dragons).roster[dragons[0]!.id]!.notes).toBe('Account note'));
  });

  it('closes an account dialog with Escape and restores focus to its invoking control', async () => {
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(null), new FakeRosters(null))} />);
    const open = await screen.findByRole('button', { name: 'Sign in' });
    open.focus();
    expect(open).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Sign in to Dragonfire Lab' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Sign in to Dragonfire Lab' })).not.toBeInTheDocument();
    await waitFor(() => expect(open).toHaveFocus());
  });

  it('pauses with Not now and can reopen the unresolved choice from Account', async () => {
    seedLocal(meaningfulRoster('Browser note', 1));
    const repository = new FakeRosters(makeRecord('user-a', meaningfulRoster('Account note', 2)));
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(repository.upserts).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await user.selectOptions(screen.getByLabelText('Star Rank'), '8');
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    expect(repository.upserts).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /Account for/i }));
    const accountDialog = screen.getByRole('dialog', { name: 'Your account' });
    expect(within(accountDialog).getByText('Sync paused')).toBeInTheDocument();
    await user.click(within(accountDialog).getByRole('button', { name: 'Resolve roster choice' }));
    expect(await screen.findByRole('heading', { name: 'Choose which roster to use' })).toBeInTheDocument();
  });
});

describe('ongoing synchronization safety', () => {
  it('saves locally immediately and coalesces rapid edits into one debounced cloud write', async () => {
    const repository = new FakeRosters(null);
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    await screen.findByRole('button', { name: /Account for/i });
    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await user.click(screen.getAllByRole('button', { name: /Add Dragon/i })[0]!);
    await user.click(screen.getAllByRole('button', { name: 'Add to roster' })[0]!);
    await waitFor(() => expect(Object.values(loadStoredRosterSnapshot(window.localStorage, dragons).roster).some((entry) => entry.owned)).toBe(true));
    await user.click(screen.getByRole('button', { name: 'Close add dragon' }));
    await user.selectOptions(screen.getByLabelText('Star Rank'), '7');
    await user.clear(screen.getByLabelText('Dragon Level'));
    await user.type(screen.getByLabelText('Dragon Level'), '21');
    await waitFor(() => expect(repository.upserts).toHaveLength(1), { timeout: 2500 });
    expect(Object.values(repository.upserts[0]!.roster).find((entry) => entry.owned)).toMatchObject({ owned: true, starRank: 7, reignLevel: 21 });
  });

  it('retains browser data after sign out and ignores cloud writes afterward', async () => {
    const roster = meaningfulRoster('Keep me', 4);
    seedLocal(roster);
    const auth = new FakeAuth(signedInSession);
    const repository = new FakeRosters(makeRecord('user-a', roster));
    const user = userEvent.setup();
    render(<App accountServices={makeServices(auth, repository)} />);
    await user.click(await screen.findByRole('button', { name: /Account for/i }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Signed out. Your roster remains saved in this browser.')).toBeInTheDocument();
    expect(loadStoredRosterSnapshot(window.localStorage, dragons).roster[dragons[0]!.id]!.notes).toBe('Keep me');
  });

  it('requires confirmation before import replaces a synchronized roster and can pause for local-only import', async () => {
    const roster = meaningfulRoster('Account version', 4);
    seedLocal(roster);
    const repository = new FakeRosters(makeRecord('user-a', roster));
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await screen.findByText('Synced to your account and stored in this browser');
    const imported = meaningfulRoster('Imported locally', 0);
    const file = new File([serializeRosterExport(imported)], 'roster.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Import JSON'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Replace your synchronized roster with this imported roster?' });
    expect(repository.upserts).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Import locally only' }));
    expect(loadStoredRosterSnapshot(window.localStorage, dragons).roster[dragons[0]!.id]!.notes).toBe('Imported locally');
    expect(await screen.findByText('Sync paused')).toBeInTheDocument();
    expect(repository.upserts).toHaveLength(0);
  });

  it('clears only the browser roster and pauses instead of deleting or emptying the cloud row', async () => {
    const roster = meaningfulRoster('Cloud remains', 2);
    seedLocal(roster);
    const repository = new FakeRosters(makeRecord('user-a', roster));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await screen.findByText('Synced to your account and stored in this browser');
    await user.click(screen.getByRole('button', { name: 'Clear local roster' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Your account roster will not be deleted'));
    expect(Object.values(loadStoredRosterSnapshot(window.localStorage, dragons).roster).some((entry) => entry.owned)).toBe(false);
    expect(screen.getByText('This browser roster was cleared. Account synchronization is paused.')).toBeInTheDocument();
    expect(repository.upserts).toHaveLength(0);
    confirm.mockRestore();
  });

  it('keeps local data and exposes a safe retry after a cloud read failure', async () => {
    const local = meaningfulRoster('Safe locally', 2);
    seedLocal(local);
    const repository = new FakeRosters(null);
    repository.failFetch = true;
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    await user.click(await screen.findByRole('button', { name: /Account for/i }));
    expect(await screen.findByText('The account roster could not be loaded. Your browser roster is still available.')).toBeInTheDocument();
    expect(screen.queryByText('private database detail')).not.toBeInTheDocument();
    repository.failFetch = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: "Save this browser's roster to your account?" })).toBeInTheDocument();
  });

  it('retains local edits after a cloud write failure and retries on the browser online event', async () => {
    const roster = meaningfulRoster('Original', 3);
    seedLocal(roster);
    const repository = new FakeRosters(makeRecord('user-a', roster));
    repository.failWrite = true;
    const user = userEvent.setup();
    render(<App accountServices={makeServices(new FakeAuth(signedInSession), repository)} />);
    await user.click(screen.getByRole('button', { name: 'Roster' }));
    await screen.findByText('Synced to your account and stored in this browser');
    await user.selectOptions(screen.getByLabelText('Star Rank'), '9');
    expect(loadStoredRosterSnapshot(window.localStorage, dragons).roster[dragons[0]!.id]!.starRank).toBe(9);
    expect(await screen.findByText('Could not sync — retry', {}, { timeout: 2500 })).toBeInTheDocument();
    expect(repository.upserts).toHaveLength(1);
    repository.failWrite = false;
    await act(() => {
      window.dispatchEvent(new Event('online'));
      return Promise.resolve();
    });
    await waitFor(() => expect(repository.upserts).toHaveLength(2));
    expect(await screen.findByText('Synced to your account and stored in this browser')).toBeInTheDocument();
  });

  it('ignores a delayed fetch from a prior authenticated user', async () => {
    let resolveA: ((value: CloudRosterRecord | null) => void) | undefined;
    const auth = new FakeAuth({ userId: 'user-a', email: 'a@example.com' });
    const cloudB = meaningfulRoster('User B', 5);
    const repository: CloudRosterRepository = {
      fetchRoster: vi.fn((userId: string) => userId === 'user-a'
        ? new Promise<CloudRosterRecord | null>((resolve) => { resolveA = resolve; })
        : Promise.resolve(makeRecord('user-b', cloudB))),
      upsertRoster: vi.fn(),
    };
    render(<App accountServices={makeServices(auth, repository)} />);
    await screen.findByRole('button', { name: /Account for a@example.com/i });
    act(() => auth.emit({ userId: 'user-b', email: 'b@example.com' }));
    await screen.findByRole('button', { name: /Account for b@example.com/i });
    await waitFor(() => expect(loadStoredRosterSnapshot(window.localStorage, dragons).roster[dragons[0]!.id]!.notes).toBe('User B'));
    act(() => resolveA?.(makeRecord('user-a', meaningfulRoster('Stale A', 1))));
    await waitFor(() => expect(loadStoredRosterSnapshot(window.localStorage, dragons).roster[dragons[0]!.id]!.notes).toBe('User B'));
  });
});

function makeServices(auth: AuthService, rosters: CloudRosterRepository): AccountServices {
  return { auth, rosters };
}

function meaningfulRoster(note: string, habitLevel: 0 | 1 | 2 | 3 | 4 | 5) {
  const roster = createEmptyRoster(dragons);
  const entry = roster[dragons[0]!.id]!;
  entry.owned = true;
  entry.starRank = 6;
  entry.reignLevel = 20;
  entry.notes = note;
  const habitId = Object.keys(entry.habitLevels)[0]!;
  entry.habitLevels[habitId] = habitLevel;
  return roster;
}

function seedLocal(roster: Record<string, OwnedDragon>) {
  saveRosterSnapshot(window.localStorage, roster, '2026-07-17T10:00:00.000Z');
}

function makeRecord(userId: string, roster: Record<string, OwnedDragon>, clientUpdatedAt = '2026-07-17T10:00:00.000Z'): CloudRosterRecord {
  return {
    userId,
    rosterSchemaVersion: ROSTER_SCHEMA_VERSION,
    roster,
    clientUpdatedAt,
    updatedAt: '2026-07-17T10:00:01.000Z',
  };
}
