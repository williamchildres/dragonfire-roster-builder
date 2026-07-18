import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RosterWorkspace, type RosterSelectionRequest } from '../app/RosterWorkspace';
import { lockedHabitRequirement } from '../app/rosterHabitRequirements';
import type { AccountSession } from '../cloud/types';
import { dragons } from '../data/dragons';
import type { RosterSyncStatus } from '../hooks/useRosterSync';
import type { Dragon, OwnedDragon } from '../models/dragon';
import { applyOwnedDragonPatch } from '../services/habitLevels';
import { createEmptyRoster } from '../services/rosterStorage';

const workspaceDragons = ['caraxes', 'syrax', 'vhagar'].map((id) => dragons.find((dragon) => dragon.id === id)!);

function makeRoster() {
  const roster = createEmptyRoster(dragons);
  for (const dragon of workspaceDragons) roster[dragon.id]!.owned = true;
  roster.caraxes = applyOwnedDragonPatch(workspaceDragons.find((dragon) => dragon.id === 'caraxes')!, roster.caraxes!, {
    starRank: 10,
    reignLevel: 20,
  });
  roster.syrax = applyOwnedDragonPatch(workspaceDragons.find((dragon) => dragon.id === 'syrax')!, roster.syrax!, {
    starRank: 4,
    reignLevel: 8,
    notes: 'Fire support',
  });
  roster.vhagar!.starRank = null;
  roster.vhagar!.reignLevel = null;
  return roster;
}

function WorkspaceHarness({
  initialRoster = makeRoster(),
  session = null,
  syncStatus = 'local-only',
  accountConfigured = session !== null,
  onOpenDetails = () => undefined,
  onOpenAccount = () => undefined,
  onOpenSignIn = () => undefined,
  onResolveSync = () => undefined,
  onRetrySync = () => undefined,
}: {
  initialRoster?: Record<string, OwnedDragon>;
  session?: AccountSession | null;
  syncStatus?: RosterSyncStatus;
  accountConfigured?: boolean;
  onOpenDetails?: (dragon: Dragon) => void;
  onOpenAccount?: () => void;
  onOpenSignIn?: () => void;
  onResolveSync?: () => void;
  onRetrySync?: () => void;
}) {
  const [roster, setRoster] = useState(initialRoster);
  return (
    <RosterWorkspace
      allDragons={workspaceDragons}
      roster={roster}
      successMessage={null}
      selectionRequest={null}
      onSelectionRequestConsumed={() => undefined}
      onUpdateRoster={(dragonId, patch) => setRoster((current) => {
        const dragon = workspaceDragons.find((candidate) => candidate.id === dragonId)!;
        return { ...current, [dragonId]: applyOwnedDragonPatch(dragon, current[dragonId]!, patch) };
      })}
      onOpenDetails={onOpenDetails}
      onOpenAddDragon={() => undefined}
      onExport={() => undefined}
      onImport={() => undefined}
      onClear={() => undefined}
      accountConfigured={accountConfigured}
      session={session}
      syncStatus={syncStatus}
      onOpenAccount={onOpenAccount}
      onOpenSignIn={onOpenSignIn}
      onResolveSync={onResolveSync}
      onRetrySync={onRetrySync}
    />
  );
}

describe('RosterWorkspace', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses a compact accessible workspace header without the browser-storage hero eyebrow', () => {
    render(<WorkspaceHarness />);
    expect(screen.getByRole('heading', { level: 2, name: 'My Roster' })).toBeInTheDocument();
    expect(screen.getByText('Track ownership, progression, Habit Levels, and notes.')).toBeInTheDocument();
    expect(screen.queryByText('Stored in your browser')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Roster' }).parentElement).toHaveClass('roster-workspace-header');
  });

  it('keeps Search and Sort visible while disclosing advanced filters with an active count', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    expect(screen.getByLabelText('Search owned dragons')).toBeVisible();
    expect(screen.getByLabelText('Sort')).toBeVisible();
    const toggle = screen.getByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'roster-advanced-filters');
    expect(document.querySelector('#roster-advanced-filters')).toHaveAttribute('hidden');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.selectOptions(screen.getByLabelText('Rarity'), 'Legendary');
    await user.selectOptions(screen.getByLabelText('Breed'), 'Sentinel');
    expect(screen.getByRole('button', { name: 'Filters (2)' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Sort'), 'star-rank');
    await user.click(screen.getByRole('button', { name: 'Filters (2)' }));
    expect(screen.getByRole('button', { name: 'Filters (2)' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText('Sort')).toHaveValue('star-rank');
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByText('3 owned dragons')).toBeInTheDocument();
    expect(screen.queryByText(/of 3 shown/i)).not.toBeInTheDocument();
  });

  it('uses compact full-width row summaries while retaining descriptive unknown progression names', () => {
    render(<WorkspaceHarness />);
    const rows = screen.getAllByRole('button', { name: /Star Rank/i });
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row).toHaveClass('roster-row');
    expect(screen.getByRole('button', { name: /^Caraxes,/i })).toHaveTextContent('10★');
    expect(screen.getByRole('button', { name: /^Caraxes,/i })).toHaveTextContent('Lv 20');
    expect(screen.getByRole('button', { name: /^Caraxes,/i })).toHaveTextContent('5/5 habits');
    const unknownRow = screen.getByRole('button', { name: /Vhagar.*Star Rank unknown.*Dragon Level unknown/i });
    expect(unknownRow).toHaveTextContent('?★');
    expect(unknownRow).toHaveTextContent('Lv —');
  });

  it('opens the existing internal details action with its compact label', async () => {
    const user = userEvent.setup();
    const onOpenDetails = vi.fn();
    render(<WorkspaceHarness onOpenDetails={onOpenDetails} />);
    expect(screen.queryByRole('button', { name: 'View full details' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dragon details' }));
    expect(onOpenDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 'caraxes' }));
  });

  it('renders every canonical Habit and only gives unlocked Habits Level 1–5 selectors', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    await user.click(screen.getByRole('button', { name: /^Syrax,/i }));
    const editor = screen.getByRole('complementary', { name: 'Syrax' });
    const syrax = workspaceDragons.find((dragon) => dragon.id === 'syrax')!;
    for (const habit of syrax.habits) expect(within(editor).getByText(habit.name)).toBeInTheDocument();
    expect(within(editor).getAllByRole('combobox')).toHaveLength(3);
    expect(within(editor).getAllByText('Locked')).toHaveLength(3);
    expect(within(editor).getByLabelText(`${syrax.habits[2]!.name}, locked. Unlocks at 6★`)).toBeInTheDocument();
    for (const habit of syrax.habits.slice(0, 2)) {
      const select = within(editor).getByLabelText(habit.name);
      expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5']);
    }
  });

  it('formats the currently unmet Star Rank and Dragon Level requirements accurately', () => {
    const habit = { ...workspaceDragons[0]!.habits[0]!, unlockStarRank: 6, minimumDragonLevel: 16 };
    expect(lockedHabitRequirement(habit, { starRank: 5, reignLevel: 15 })).toBe('Requires 6★ and Dragon Level 16');
    expect(lockedHabitRequirement(habit, { starRank: 6, reignLevel: 15 })).toBe('Unlocks at Dragon Level 16');
    expect(lockedHabitRequirement(habit, { starRank: 5, reignLevel: 16 })).toBe('Unlocks at 6★');
  });

  it.each(['local-only', 'auth-loading', 'loading-cloud', 'syncing', 'synced'] satisfies RosterSyncStatus[])(
    'does not render a redundant roster synchronization panel for %s',
    (syncStatus) => {
      const session = syncStatus === 'local-only' || syncStatus === 'auth-loading' ? null : { userId: 'user-1', email: 'long-account-email@example.com' };
      render(<WorkspaceHarness accountConfigured session={session} syncStatus={syncStatus} />);
      expect(document.querySelector('.roster-sync-panel')).not.toBeInTheDocument();
    },
  );

  it.each([
    ['migration-required', 'Resolve'],
    ['conflict', 'Resolve'],
    ['paused', 'Resolve'],
    ['offline', 'Retry'],
    ['error', 'Retry'],
  ] as const)('keeps %s prominent with its %s action', (syncStatus, action) => {
    render(<WorkspaceHarness accountConfigured session={{ userId: 'user-1', email: 'qa@example.com' }} syncStatus={syncStatus} />);
    expect(document.querySelector('.roster-sync-panel')).toHaveAttribute('data-presentation', 'attention');
    expect(screen.getByRole('button', { name: action })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
  });

  it('preserves Account, Resolve, and Retry callbacks for attention states', async () => {
    const user = userEvent.setup();
    const callbacks = { onOpenAccount: vi.fn(), onResolveSync: vi.fn(), onRetrySync: vi.fn() };
    const { rerender } = render(<WorkspaceHarness accountConfigured session={{ userId: 'user-1', email: 'qa@example.com' }} syncStatus="conflict" {...callbacks} />);
    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(callbacks.onResolveSync).toHaveBeenCalledOnce();
    expect(callbacks.onOpenAccount).toHaveBeenCalledOnce();
    rerender(<WorkspaceHarness accountConfigured session={{ userId: 'user-1', email: 'qa@example.com' }} syncStatus="error" {...callbacks} />);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(callbacks.onRetrySync).toHaveBeenCalledOnce();
  });

  it('selects the first visible owned dragon, updates selected semantics, and preserves selection while sorting', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /^Caraxes,/i })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('complementary', { name: 'Caraxes' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Syrax,/i }));
    expect(screen.getByRole('button', { name: /^Syrax,/i })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /^Caraxes,/i })).not.toHaveAttribute('aria-current');
    await user.selectOptions(screen.getByLabelText('Sort'), 'rarity');
    expect(screen.getByRole('complementary', { name: 'Syrax' })).toBeInTheDocument();
  });

  it('moves selection when filtering hides it, clears the editor at zero results, and restores a valid selection', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);

    await user.click(screen.getByRole('button', { name: /^Syrax,/i }));
    await user.selectOptions(screen.getByLabelText('Breed'), 'Hunter');
    expect(screen.getByRole('complementary', { name: 'Caraxes' })).toBeInTheDocument();
    expect(screen.getByText('1 of 3 shown')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search owned dragons'), 'no match');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByText(/No owned dragons match/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('complementary', { name: 'Caraxes' })).toBeInTheDocument();
  });

  it('supports case-insensitive search, every details filter, and accurate visible counts', async () => {
    const user = userEvent.setup();
    const roster = makeRoster();
    render(<WorkspaceHarness initialRoster={roster} />);

    await user.type(screen.getByLabelText('Search owned dragons'), '  sYrAx  ');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('1 of 3 shown')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear roster search' }));

    await user.selectOptions(screen.getByLabelText('Details'), 'complete');
    expect(screen.getByRole('button', { name: /^Caraxes,/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Syrax,/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Details'), 'missing');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.selectOptions(screen.getByLabelText('Details'), 'has-notes');
    expect(screen.getByRole('button', { name: /^Syrax,/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Details'), 'no-notes');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('unlocks habits at Level 1, preserves edits, clears on relock, and restarts at Level 1', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    await user.click(screen.getByRole('button', { name: /^Syrax,/i }));
    const editor = screen.getByRole('complementary', { name: 'Syrax' });
    const firstHabit = workspaceDragons.find((dragon) => dragon.id === 'syrax')!.habits[0]!;

    await user.selectOptions(within(editor).getByLabelText('Star Rank'), '1');
    expect(within(editor).queryByLabelText(firstHabit.name)).not.toBeInTheDocument();
    expect(within(editor).getByLabelText(`${firstHabit.name}, locked. Unlocks at 2★`)).toBeInTheDocument();
    expect(within(editor).getAllByText('Locked')).toHaveLength(5);
    await user.selectOptions(within(editor).getByLabelText('Star Rank'), '2');
    const habitSelect = within(editor).getByLabelText(firstHabit.name);
    expect(habitSelect).toHaveValue('1');
    expect(within(habitSelect).getAllByRole('option').map((option) => option.textContent)).toEqual(['1', '2', '3', '4', '5']);
    await user.selectOptions(within(editor).getByLabelText(firstHabit.name), '5');
    expect(within(editor).getByLabelText(firstHabit.name)).toHaveValue('5');
    await user.selectOptions(within(editor).getByLabelText('Star Rank'), '1');
    expect(within(editor).queryByLabelText(firstHabit.name)).not.toBeInTheDocument();
    await user.selectOptions(within(editor).getByLabelText('Star Rank'), '2');
    expect(within(editor).getByLabelText(firstHabit.name)).toHaveValue('1');
    await user.selectOptions(within(editor).getByLabelText('Star Rank'), '4');
    const secondHabit = workspaceDragons.find((dragon) => dragon.id === 'syrax')!.habits[1]!;
    expect(within(editor).getByLabelText(secondHabit.name)).toHaveValue('1');
    expect(within(editor).getByLabelText(firstHabit.name)).toHaveValue('1');
    expect(within(editor).getByText(/2 of 5 habits unlocked/i)).toBeInTheDocument();

    const notes = within(editor).getByLabelText('Personal notes for Syrax');
    await user.clear(notes);
    await user.type(notes, 'Line one\nLine two');
    expect(notes).toHaveValue('Line one\nLine two');
    expect(within(editor).getByLabelText('Star Rank')).toHaveValue('4');
  });

  it('uses one editor form and restores row focus from the mobile Back action', async () => {
    const user = userEvent.setup();
    render(<WorkspaceHarness />);
    const syraxRow = screen.getByRole('button', { name: /^Syrax,/i });
    await user.click(syraxRow);
    expect(document.querySelector('.roster-workspace')).toHaveAttribute('data-mobile-view', 'editor');
    expect(document.querySelectorAll('.roster-editor-form')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Back to roster' }));
    expect(document.querySelector('.roster-workspace')).toHaveAttribute('data-mobile-view', 'list');
    await waitFor(() => expect(syraxRow).toHaveFocus());
  });

  it('consumes distinct Add Dragon requests once without remounting and reveals each selection minimally', async () => {
    const user = userEvent.setup();
    const onConsumed = vi.fn();
    const initialRoster = createEmptyRoster(dragons);
    initialRoster.caraxes!.owned = true;
    const { rerender } = render(
      <SelectionRequestWorkspace roster={initialRoster} request={null} onConsumed={onConsumed} />,
    );

    await user.type(screen.getByLabelText('Search owned dragons'), 'Caraxes');
    await user.selectOptions(screen.getByLabelText('Rarity'), 'Legendary');
    await user.selectOptions(screen.getByLabelText('Sort'), 'star-rank');
    const workspace = document.querySelector('.roster-workspace');

    const firstAddedRoster: Record<string, OwnedDragon> = {
      ...initialRoster,
      syrax: { ...initialRoster.syrax!, owned: true },
    };
    const firstRequest = { dragonId: 'syrax', requestId: 1 };
    rerender(<SelectionRequestWorkspace roster={firstAddedRoster} request={firstRequest} onConsumed={onConsumed} />);

    await waitFor(() => expect(onConsumed).toHaveBeenCalledWith(1));
    expect(onConsumed).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.roster-workspace')).toBe(workspace);
    expect(screen.getByLabelText('Search owned dragons')).toHaveValue('');
    expect(screen.getByLabelText('Rarity')).toHaveValue('Legendary');
    expect(screen.getByLabelText('Sort')).toHaveValue('star-rank');
    expect(screen.getByRole('button', { name: /^Syrax,/i })).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(screen.getByRole('complementary', { name: 'Syrax' })).toHaveFocus());
    expect(workspace).toHaveAttribute('data-mobile-view', 'editor');

    rerender(<SelectionRequestWorkspace roster={firstAddedRoster} request={firstRequest} onConsumed={onConsumed} />);
    expect(onConsumed).toHaveBeenCalledTimes(1);

    const secondAddedRoster: Record<string, OwnedDragon> = {
      ...firstAddedRoster,
      vhagar: { ...firstAddedRoster.vhagar!, owned: true },
    };
    rerender(
      <SelectionRequestWorkspace
        roster={secondAddedRoster}
        request={{ dragonId: 'vhagar', requestId: 2 }}
        onConsumed={onConsumed}
      />,
    );

    await waitFor(() => expect(onConsumed).toHaveBeenCalledWith(2));
    expect(onConsumed).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.roster-workspace')).toBe(workspace);
    expect(screen.getByRole('button', { name: /^Vhagar,/i })).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(screen.getByRole('complementary', { name: 'Vhagar' })).toHaveFocus());
  });

  it('uses browser-only autosave copy while signed out', () => {
    render(<WorkspaceHarness />);
    expect(screen.getByRole('note')).toHaveTextContent('Changes save automatically in this browser.');
    expect(screen.getByRole('note')).not.toHaveTextContent('account');
  });

  it.each(['syncing', 'synced'] satisfies RosterSyncStatus[])(
    'mentions account synchronization while signed in and %s',
    (syncStatus) => {
      render(<WorkspaceHarness session={{ userId: 'user-1', email: 'qa@example.com' }} syncStatus={syncStatus} />);
      expect(screen.getByRole('note')).toHaveTextContent(
        'Changes save automatically in this browser and synchronize to your account.',
      );
    },
  );

  it.each([
    'auth-loading',
    'loading-cloud',
    'migration-required',
    'conflict',
    'paused',
    'offline',
    'error',
  ] satisfies RosterSyncStatus[])(
    'defers to the status panel instead of claiming active sync while signed in and %s',
    (syncStatus) => {
      render(<WorkspaceHarness session={{ userId: 'user-1', email: 'qa@example.com' }} syncStatus={syncStatus} />);
      expect(screen.getByRole('note')).toHaveTextContent(
        'Changes save automatically in this browser. Account synchronization follows the status shown above.',
      );
      expect(screen.getByRole('note')).not.toHaveTextContent('and synchronize to your account');
    },
  );

  it('confirms the named dragon and selects the next, previous, then empty state when removing', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<WorkspaceHarness />);

    await user.click(screen.getByRole('button', { name: /^Syrax,/i }));
    await user.click(screen.getByRole('button', { name: 'Remove from roster' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Remove Syrax from your roster?'));
    expect(screen.getByRole('complementary', { name: 'Vhagar' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove from roster' }));
    expect(screen.getByRole('complementary', { name: 'Caraxes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove from roster' }));
    expect(screen.getByText(/No dragons in your roster yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});

function SelectionRequestWorkspace({
  roster,
  request,
  onConsumed,
}: {
  roster: Record<string, OwnedDragon>;
  request: RosterSelectionRequest | null;
  onConsumed: (requestId: number) => void;
}) {
  return (
    <RosterWorkspace
      allDragons={workspaceDragons}
      roster={roster}
      successMessage={null}
      selectionRequest={request}
      onSelectionRequestConsumed={onConsumed}
      onUpdateRoster={() => undefined}
      onOpenDetails={() => undefined}
      onOpenAddDragon={() => undefined}
      onExport={() => undefined}
      onImport={() => undefined}
      onClear={() => undefined}
      accountConfigured={false}
      session={null}
      syncStatus="local-only"
      onOpenAccount={() => undefined}
      onOpenSignIn={() => undefined}
      onResolveSync={() => undefined}
      onRetrySync={() => undefined}
    />
  );
}
