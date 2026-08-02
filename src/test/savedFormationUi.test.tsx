import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { SavedFormationsWorkspace } from '../app/SavedFormationsWorkspace';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { applyOwnedDragonPatch } from '../services/habitLevels';
import { createEmptyRoster, FORMATION_STORAGE_KEY, saveRosterSnapshot } from '../services/rosterStorage';
import { createEmptySavedFormationLibrary } from '../savedFormations/contract';
import { createSavedFormation } from '../savedFormations/crud';
import { setFormationReserved } from '../savedFormations/reservations';
import { loadSavedFormationLibrary } from '../savedFormations/storage';
import type { SavedFormationLibrary } from '../savedFormations/types';

const arrangement = { 'left-flank': dragons[0]!.id, vanguard: dragons[1]!.id, 'right-flank': dragons[2]!.id };

beforeEach(() => window.localStorage.clear());

describe('Saved Formations workspace UI', () => {
  it('shows the empty state, count, storage status, and both creation paths', () => {
    renderWorkspace(createEmptySavedFormationLibrary(), createEmptyRoster(dragons));
    expect(screen.getByText('0 of 50 saved')).toBeInTheDocument();
    expect(screen.getByText('Saved in this browser.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Formation Builder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Roster Optimizer' })).toBeInTheDocument();
  });

  it('renders recalculated cards, exact positions, unavailable state, and progression details', () => {
    const savedRoster = progressedRoster(8, 30, 2);
    const currentRoster = progressedRoster(9, 32, 3);
    currentRoster[dragons[2]!.id] = { ...currentRoster[dragons[2]!.id]!, owned: false };
    renderWorkspace(libraryFixture(savedRoster), currentRoster);
    expect(screen.getByRole('heading', { name: 'Alpha formation' })).toBeInTheDocument();
    expect(screen.getByText(/Formation Rating/)).toBeInTheDocument();
    expect(screen.getByText('Progression unavailable')).toBeInTheDocument();
    expect(screen.getByText('Estimated Power').nextSibling).toHaveTextContent('Unavailable');
    expect(screen.getByText(dragons[0]!.name)).toBeInTheDocument();
    expect(screen.getByText(dragons[1]!.name)).toBeInTheDocument();
    expect(screen.getByText(dragons[2]!.name)).toBeInTheDocument();
    expect(screen.getByText(/no longer marked owned/)).toBeInTheDocument();
    expect(screen.getByText('Progression changed since saved')).toBeInTheDocument();
  });

  it('renames, duplicates, reorders, and confirms deletion with the name', async () => {
    const user = userEvent.setup();
    const roster = progressedRoster();
    const first = libraryFixture(roster);
    const second = createSavedFormation(first, { name: 'Second formation', arrangement: {
      'left-flank': dragons[3]!.id, vanguard: dragons[4]!.id, 'right-flank': dragons[5]!.id,
    }, evaluationMode: 'planning', source: 'optimizer', roster, id: '00000000-0000-4000-8000-000000000002' });
    const { changes } = renderWorkspace(second, roster);
    await user.click(screen.getByRole('button', { name: 'Rename Alpha formation' }));
    const dialog = screen.getByRole('dialog', { name: 'Rename Alpha formation' });
    await user.clear(within(dialog).getByLabelText('Formation name'));
    await user.type(within(dialog).getByLabelText('Formation name'), 'Renamed formation');
    await user.click(within(dialog).getByRole('button', { name: 'Save name' }));
    expect(changes.at(-1)?.formations[0]!.name).toBe('Renamed formation');
    await user.click(screen.getByRole('button', { name: 'Duplicate Alpha formation' }));
    expect(changes.at(-1)?.formations).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Move Second formation up' }));
    expect(changes.at(-1)?.formations[0]!.name).toBe('Second formation');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Delete Alpha formation' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Alpha formation'));
    confirm.mockRestore();
  });

  it('exposes accessible reservation controls, badges, ownership, and conflict actions', async () => {
    const roster = progressedRoster();
    let library = setFormationReserved(libraryFixture(roster), '00000000-0000-4000-8000-000000000001', true);
    library = createSavedFormation(library, { name: 'Overlap', arrangement: {
      'left-flank': arrangement['left-flank'], vanguard: dragons[3]!.id, 'right-flank': dragons[4]!.id,
    }, evaluationMode: 'current-roster', source: 'formation-builder', roster, id: '00000000-0000-4000-8000-000000000003' });
    const { changes } = renderWorkspace(library, roster);
    expect(screen.getByText('Reserved')).toBeInTheDocument();
    expect(screen.getByText(/1 reserved formation/)).toBeInTheDocument();
    expect(screen.getByText(/3 reserved dragons/)).toBeInTheDocument();
    expect(screen.getAllByText('Currently owned')).toHaveLength(3);
    const toggles = screen.getAllByRole('checkbox', { name: /Reserve these dragons/i });
    expect(toggles[0]).toBeChecked();
    await userEvent.setup().click(toggles[1]!);
    expect(changes).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent(/already reserved by “Alpha formation”/i);
    expect(screen.getByRole('button', { name: 'Open “Alpha formation”' })).toBeInTheDocument();
  });

  it('explains that planning formations cannot reserve roster dragons', () => {
    const roster = progressedRoster();
    const planning = createSavedFormation(createEmptySavedFormationLibrary(), { name: 'Plan', arrangement, evaluationMode: 'planning', source: 'formation-builder', roster, id: '00000000-0000-4000-8000-000000000004' });
    renderWorkspace(planning, roster);
    expect(screen.getByText('Planning formations cannot reserve roster dragons.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Reserve these dragons/i })).not.toBeInTheDocument();
  });
});

describe('Formation Builder Saved Formation integration', () => {
  it('saves planning mode, persists across the workspace, and reopens exact placement with edit actions', async () => {
    window.localStorage.setItem(FORMATION_STORAGE_KEY, JSON.stringify(arrangement));
    const user = userEvent.setup();
    render(<App accountServices={null} />);
    await user.click(screen.getByRole('link', { name: 'Formations' }));
    await user.click(screen.getByRole('button', { name: 'Save Formation' }));
    const dialog = screen.getByRole('dialog', { name: 'Save Formation' });
    expect(within(dialog).getByText(/Planning — Star 10/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save Formation' }));
    await waitFor(() => expect(loadSavedFormationLibrary(window.localStorage).library.formations).toHaveLength(1));
    expect(loadSavedFormationLibrary(window.localStorage).library.formations[0]!.evaluationMode).toBe('planning');
    await user.click(screen.getByRole('button', { name: 'Open Saved Formations' }));
    await user.click(screen.getByRole('button', { name: /Open in Formation Builder/ }));
    expect(screen.getByRole('button', { name: 'Update Saved Formation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as New' })).toBeInTheDocument();
    for (const dragon of dragons.slice(0, 3)) expect(screen.getByRole('heading', { name: dragon.name })).toBeInTheDocument();
  });

  it('saves current-roster mode with normalized live progression', async () => {
    const roster = progressedRoster();
    saveRosterSnapshot(window.localStorage, roster, '2026-08-01T00:00:00.000Z');
    window.localStorage.setItem(FORMATION_STORAGE_KEY, JSON.stringify(arrangement));
    const user = userEvent.setup();
    render(<App accountServices={null} />);
    await user.click(screen.getByRole('link', { name: 'Formations' }));
    await user.click(screen.getByLabelText('My Roster'));
    await user.click(screen.getByRole('button', { name: 'Save Formation' }));
    const dialog = screen.getByRole('dialog', { name: 'Save Formation' });
    expect(within(dialog).getByText(/Current roster progression/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save Formation' }));
    await waitFor(() => expect(loadSavedFormationLibrary(window.localStorage).library.formations[0]?.evaluationMode).toBe('current-roster'));
  });
});

function renderWorkspace(initial: SavedFormationLibrary, roster: Record<string, OwnedDragon>) {
  const changes: SavedFormationLibrary[] = [];
  const result = render(<SavedFormationsWorkspace
    library={initial} roster={roster} session={null} syncStatus="browser-only" syncComparison={null} syncError={null}
    onLibraryChange={(library) => changes.push(library)} onOpen={vi.fn()} onNavigate={vi.fn()} onOpenSignIn={vi.fn()}
    onSaveBrowserToAccount={vi.fn()} onUseAccount={vi.fn()} onPauseSync={vi.fn()} onReopenSync={vi.fn()} onRetrySync={vi.fn()}
  />);
  return { ...result, changes };
}

function libraryFixture(roster = progressedRoster()) {
  return createSavedFormation(createEmptySavedFormationLibrary('2026-08-01T00:00:00.000Z'), {
    name: 'Alpha formation', arrangement, evaluationMode: 'current-roster', source: 'formation-builder', roster,
    id: '00000000-0000-4000-8000-000000000001', now: '2026-08-01T00:01:00.000Z',
  });
}

function progressedRoster(starRank = 8, dragonLevel = 30, habitLevel: 1 | 2 | 3 | 4 | 5 = 2) {
  const roster = createEmptyRoster(dragons);
  for (const dragon of dragons.slice(0, 6)) {
    const entry = applyOwnedDragonPatch(dragon, roster[dragon.id]!, { owned: true, starRank, reignLevel: dragonLevel });
    for (const habit of dragon.habits) entry.habitLevels[habit.id] = habitLevel;
    roster[dragon.id] = entry;
  }
  return roster;
}
