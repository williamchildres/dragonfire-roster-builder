import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import { createEmptyRoster, STORAGE_KEY } from '../services/rosterStorage';

type ProgressionSeed = Record<string, { starRank?: number | null; reignLevel?: number | null; owned?: boolean }>;
const incompleteMissingEnablerNotice =
  'Missing-enabler checks are incomplete until all selected dragons have high-level synergy profiles.';

describe('Formation Builder simple synergy cutover', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  function seedRoster(seed: ProgressionSeed) {
    const roster = createEmptyRoster(dragons);
    for (const [dragonId, progression] of Object.entries(seed)) {
      const entry = roster[dragonId];
      expect(entry).toBeDefined();
      entry!.owned = progression.owned ?? true;
      entry!.collection.state = entry!.owned ? 'hatched' : 'not-collected';
      entry!.starRank = progression.starRank ?? 10;
      entry!.reignLevel = progression.reignLevel ?? 26;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: 'dragonfire-roster-lab-local',
        schemaVersion: 3,
        updatedAt: '2026-07-02T00:00:00.000Z',
        roster: Object.values(roster),
      }),
    );
  }

  async function openFormationBuilder(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
  }

  async function selectFormation(
    user: ReturnType<typeof userEvent.setup>,
    formation: Partial<Record<'left-flank' | 'vanguard' | 'right-flank', string>>,
  ) {
    const selectors = screen.getAllByLabelText('Dragon');
    const order = ['left-flank', 'vanguard', 'right-flank'] as const;
    for (const [index, position] of order.entries()) {
      const dragonId = formation[position];
      if (dragonId) {
        await user.selectOptions(selectors[index]!, dragonId);
      }
    }
  }

  function analysisText() {
    return screen.getByRole('heading', { name: 'Formation Analysis' }).closest('section')?.textContent ?? '';
  }

  function sectionText(title: string) {
    const heading = screen.queryByRole('heading', { name: title });
    return heading?.closest('section')?.textContent ?? '';
  }

  function sectionItems(title: string) {
    const heading = screen.queryByRole('heading', { name: title });
    const section = heading?.closest('section');
    return section ? within(section).queryAllByRole('listitem').map((item) => item.textContent ?? '') : [];
  }

  it('shows active Daemoros and Shadowsong synergy and hides old technical controls', async () => {
    const user = userEvent.setup();
    seedRoster({ daemoros: { starRank: 2 }, shadowsong: {}, caraxes: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'daemoros', vanguard: 'shadowsong', 'right-flank': 'caraxes' });

    expect(sectionText('Strong synergies')).toContain(
      "Daemoros applies Panic, which improves Shadowsong's Breath of Fire.",
    );
    expect(screen.queryByLabelText(/preview max-rank interactions/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/show analysis details/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Receives/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Provides/i })).not.toBeInTheDocument();
    expect(analysisText()).not.toMatch(/target candidate|trace|raw effect tags/i);
  });

  it('maps roster Star Rank to progression-locked simple relationships', async () => {
    const user = userEvent.setup();
    seedRoster({ daemoros: { starRank: 1 }, shadowsong: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'daemoros', vanguard: 'shadowsong' });

    expect(sectionText('Future unlocks')).toContain(
      "Daemoros's Instill Fear Panic setup for Shadowsong's Breath of Fire unlocks when Daemoros reaches Star Rank 2.",
    );
    expect(sectionText('Strong synergies')).not.toContain('Daemoros applies Panic');
    expect(analysisText()).not.toMatch(/potential|unknown|timing-dependent/i);
  });

  it('uses player-facing missing-enabler labels and suppresses them for one selected dragon', async () => {
    const user = userEvent.setup();
    seedRoster({ shadowsong: {}, caraxes: {}, sheepstealer: { reignLevel: 16 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'shadowsong' });
    expect(screen.queryByRole('heading', { name: 'Missing enablers' })).not.toBeInTheDocument();

    await selectFormation(user, { vanguard: 'caraxes', 'right-flank': 'sheepstealer' });

    const missing = sectionText('Missing enablers');
    expect(missing).toContain('Shadowsong benefits from Panic, but this formation has no Panic provider.');
    expect(missing).toContain('Caraxes benefits from First-Strike, but this formation has no First-Strike provider.');
    expect(missing).not.toContain('benefits from Panic-dependent abilities');
    expect(analysisText()).not.toContain(incompleteMissingEnablerNotice);
  });

  it('treats Panic missing-enabler checks as incomplete when a selected dragon is metadata-only', async () => {
    const user = userEvent.setup();
    seedRoster({ shadowsong: {}, antares: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'shadowsong', vanguard: 'antares' });

    expect(analysisText()).toContain('Synergy data not yet mapped: Antares.');
    expect(sectionText('Missing enablers')).toContain(incompleteMissingEnablerNotice);
    expect(analysisText()).not.toContain('this formation has no Panic provider');
  });

  it('treats First-Strike missing-enabler checks as incomplete when a selected dragon is metadata-only', async () => {
    const user = userEvent.setup();
    seedRoster({ caraxes: {}, antares: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'caraxes', vanguard: 'antares' });

    expect(analysisText()).toContain('Synergy data not yet mapped: Antares.');
    expect(sectionText('Missing enablers')).toContain(incompleteMissingEnablerNotice);
    expect(analysisText()).not.toContain('this formation has no First-Strike provider');
  });

  it('shows Syrax and Caraxes First-Strike and Fire Damage relationships without target-probability wording', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {}, caraxes: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'caraxes' });

    const strong = sectionText('Strong synergies');
    expect(strong).toContain("Syrax can grant First-Strike, which improves Caraxes's Infernal Burst.");
    expect(sectionItems('Strong synergies').filter((item) => item === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(new Set(sectionItems('Strong synergies')).size).toBe(sectionItems('Strong synergies').length);
    expect(analysisText()).not.toMatch(/target not guaranteed|candidate|activation chance/i);
  });

  it('names the concrete Control alias in Crimson and Rhysarion synergy wording', async () => {
    const user = userEvent.setup();
    seedRoster({ crimson: {}, rhysarion: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'crimson', vanguard: 'rhysarion' });

    expect(sectionItems('Strong synergies')).toContain(
      "Crimson's Bloodscale Terror can apply Stun, which counts as Control and improves Rhysarion's Dawnsong.",
    );
    expect(sectionItems('Strong synergies')).not.toContain(
      "Crimson can apply Control, which improves Rhysarion's Dawnsong.",
    );
  });

  it('does not show Fire future unlocks when Syrax and Caraxes have a base Fire relationship', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: { starRank: 1, reignLevel: 1 }, caraxes: { starRank: 1, reignLevel: 1 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'caraxes' });

    expect(sectionItems('Strong synergies').filter((item) => item === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(sectionText('Future unlocks')).not.toContain('Fire Damage');
    expect(sectionText('Future unlocks')).not.toContain('Tactical Inferno');
  });

  it('distinguishes adjacency placement from a Vanguard-only beneficiary requirement', async () => {
    const user = userEvent.setup();
    seedRoster({ malachite: { starRank: 10 }, caraxes: {}, sheepstealer: { reignLevel: 16 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'malachite', vanguard: 'caraxes' });
    expect(sectionText('Strong synergies')).toContain(
      "Malachite can grant First-Strike, which improves Caraxes's Infernal Burst.",
    );

    await user.selectOptions(screen.getAllByLabelText('Dragon')[1]!, '');
    await user.selectOptions(screen.getAllByLabelText('Dragon')[2]!, 'caraxes');
    expect(sectionText('Placement issues')).toContain('Malachite and Caraxes are not adjacent in this formation.');

    await user.selectOptions(screen.getAllByLabelText('Dragon')[2]!, 'sheepstealer');
    await user.selectOptions(screen.getAllByLabelText('Dragon')[1]!, 'malachite');
    expect(sectionText('Placement issues')).toContain(
      "Sheepstealer must be deployed in Vanguard for Hunter's Cunning.",
    );
    expect(sectionText('Placement issues')).not.toContain('Malachite and Sheepstealer are not adjacent');
  });

  it('maps roster Reign Level to Sheepstealer Recovery unlocks and Vanguard conflicts', async () => {
    const user = userEvent.setup();
    seedRoster({ malachite: {}, sheepstealer: { reignLevel: 15 }, caraxes: { reignLevel: 16 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'caraxes' });
    expect(sectionText('Future unlocks')).toContain(
      "Malachite's Warden's Rally Recovery setup for Sheepstealer's Hunter's Cunning unlocks when Sheepstealer reaches Dragon Level 16.",
    );

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Sheepstealer');
    const sheepstealerCard = screen.getByRole('heading', { name: 'Sheepstealer' }).closest('article');
    expect(sheepstealerCard).not.toBeNull();
    await user.click(within(sheepstealerCard as HTMLElement).getByRole('button', { name: /view details/i }));
    await user.clear(screen.getByLabelText(/reign level/i));
    await user.type(screen.getByLabelText(/reign level/i), '16');
    await user.click(screen.getByRole('button', { name: /close details/i }));

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    expect(sectionText('Strong synergies')).toContain(
      "Malachite provides Recovery, which Sheepstealer benefits from through Hunter's Cunning.",
    );
    expect(sectionText('Position conflicts')).toContain(
      "Malachite's Sentinel's Presence, Sheepstealer's Hunter's Cunning, and Caraxes's Hunter's Wrath require Vanguard; only one dragon can receive that positional benefit.",
    );
  });

  it('shows static position cards, profile coverage, movement, clearing, and share-link behavior', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    seedRoster({ syrax: {}, caraxes: {}, antares: { owned: false } });

    await openFormationBuilder(user);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'antares' });

    for (const position of ['Left Flank', 'Vanguard', 'Right Flank']) {
      const card = screen.getByRole('article', { name: position });
      expect(within(card).getByLabelText('Dragon')).toBeInTheDocument();
      expect(within(card).getByLabelText(/movement controls/i)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /clear position/i })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Command' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: /trait status/i })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: /affinities/i })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: /high-level synergy profile/i })).toBeInTheDocument();
    }

    expect(analysisText()).toContain('Synergy data not yet mapped: Antares.');
    expect(sectionText('Strong synergies')).toContain("Syrax can grant First-Strike, which improves Caraxes's Infernal Burst.");
    expect(sectionItems('Strong synergies').filter((item) => item === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(sectionText('Missing enablers')).toContain(incompleteMissingEnablerNotice);
    const vanguardSyraxOption = within(screen.getAllByLabelText('Dragon')[1]!).getByRole('option', { name: /Syrax/ });
    expect(vanguardSyraxOption).toBeDisabled();

    await user.click(
      within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /move to right flank/i }),
    );
    expect(screen.getByRole('article', { name: 'Right Flank' })).toHaveTextContent('Syrax');
    expect(screen.getByRole('article', { name: 'Left Flank' })).toHaveTextContent('Seasmoke');

    await user.click(
      within(screen.getByRole('article', { name: 'Right Flank' })).getByRole('button', { name: /clear position/i }),
    );
    expect(within(screen.getByRole('article', { name: 'Right Flank' })).getByLabelText('Dragon')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /copy share link/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#formation='));

    await user.click(screen.getByRole('button', { name: /clear formation/i }));
    expect(screen.getAllByText(/choose a dragon to see command, trait, affinity, and high-level profile coverage/i)).toHaveLength(3);
  });
});
