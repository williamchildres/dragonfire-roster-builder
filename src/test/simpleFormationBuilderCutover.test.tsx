import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { createFormationShareHash } from '../services/teamShare';

type ProgressionSeed = Record<string, { starRank?: number | null; reignLevel?: number | null; owned?: boolean }>;
const incompleteMissingEnablerNotice =
  'Missing-enabler checks are incomplete until all selected dragons have curated profiles.';

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
      entry!.starRank = progression.starRank ?? 10;
      entry!.reignLevel = progression.reignLevel ?? 26;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: 'dragonfire-roster-lab-local',
        schemaVersion: ROSTER_SCHEMA_VERSION,
        updatedAt: '2026-07-02T00:00:00.000Z',
        roster: Object.values(roster),
      }),
    );
  }

  async function openFormationBuilder(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
  }

  async function switchFormationMode(user: ReturnType<typeof userEvent.setup>, mode: 'All 10 Star Dragons' | 'Roster Dragons') {
    await user.click(screen.getByRole('radio', { name: mode }));
  }

  async function selectFormation(
    user: ReturnType<typeof userEvent.setup>,
    formation: Partial<Record<'left-flank' | 'vanguard' | 'right-flank', string>>,
  ) {
    const order = ['left-flank', 'vanguard', 'right-flank'] as const;
    for (const position of order) {
      const dragonId = formation[position];
      if (dragonId) {
        await chooseDragonForPosition(user, position, dragonId);
      }
    }
  }

  async function chooseDragonForPosition(
    user: ReturnType<typeof userEvent.setup>,
    position: 'left-flank' | 'vanguard' | 'right-flank',
    dragonId: string,
  ) {
    const labels = {
      'left-flank': 'Left Flank',
      vanguard: 'Vanguard',
      'right-flank': 'Right Flank',
    };
    const dragon = dragons.find((candidate) => candidate.id === dragonId);
    expect(dragon).toBeDefined();
    const card = screen.getByRole('article', { name: labels[position] });
    const chooseButton =
      within(card).queryByRole('button', { name: /\+ add dragon/i }) ??
      within(card).getByRole('button', { name: /change dragon/i });

    await user.click(chooseButton);
    const dialog = screen.getByRole('dialog', { name: new RegExp(`choose a dragon for ${labels[position]}`, 'i') });
    const search = within(dialog).getByLabelText(/search by dragon name/i);
    await user.clear(search);
    await user.type(search, dragon!.name);
    const row = within(dialog).getByRole('heading', { name: dragon!.name }).closest('article');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: /^select$/i }));
    expect(screen.queryByRole('dialog', { name: new RegExp(`choose a dragon for ${labels[position]}`, 'i') })).not.toBeInTheDocument();
  }

  async function clearPosition(user: ReturnType<typeof userEvent.setup>, label: string) {
    await user.click(within(screen.getByRole('article', { name: label })).getByRole('button', { name: /clear position/i }));
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

  function ratingPanel() {
    const heading = screen.getByRole('heading', { name: 'Formation Rating' });
    const section = heading.closest('section');
    expect(section).not.toBeNull();
    return section as HTMLElement;
  }

  async function openDetailedSignalTrace(user: ReturnType<typeof userEvent.setup>) {
    const toggle = screen.getByRole('button', { name: /detailed signal trace/i });
    if (toggle.getAttribute('aria-expanded') !== 'true') {
      await user.click(toggle);
    }
  }

  it('shows active Daemoros and Shadowsong synergy and hides old technical controls', async () => {
    const user = userEvent.setup();
    seedRoster({ daemoros: { starRank: 2 }, shadowsong: {}, caraxes: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'daemoros', vanguard: 'shadowsong', 'right-flank': 'caraxes' });
    await openDetailedSignalTrace(user);

    expect(sectionText('Strong synergies')).toContain(
      "Daemoros applies Panic, which improves Shadowsong's Breath of Fire.",
    );
    expect(screen.queryByLabelText(/preview max-rank interactions/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/show analysis details/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Receives/i })).not.toBeInTheDocument();
    expect(analysisText()).not.toMatch(/target candidate|raw effect tags/i);
  });

  it('replaces Include unowned dragons with the Formation dragon pool mode toggle', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {} });

    await openFormationBuilder(user);

    expect(screen.queryByText('Include unowned dragons')).not.toBeInTheDocument();
    const modeGroup = screen.getByRole('group', { name: /formation dragon pool/i });
    const allMode = within(modeGroup).getByRole('radio', { name: 'All 10 Star Dragons' });
    const rosterMode = within(modeGroup).getByRole('radio', { name: 'Roster Dragons' });

    expect(allMode).toBeChecked();
    expect(rosterMode).not.toBeChecked();

    await user.click(rosterMode);
    expect(rosterMode).toBeChecked();
    expect(allMode).not.toBeChecked();

    await user.click(allMode);
    expect(allMode).toBeChecked();
    expect(rosterMode).not.toBeChecked();
  });

  it('shows the chip-state legend near the Formation Builder controls', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {} });

    await openFormationBuilder(user);

    expect(screen.getByRole('note')).toHaveTextContent(
      'Green = active or satisfied · Red = missing or inactive · Neutral = available',
    );
  });

  it('maps roster Star Rank to progression-locked simple relationships', async () => {
    const user = userEvent.setup();
    seedRoster({ daemoros: { starRank: 1 }, shadowsong: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'daemoros', vanguard: 'shadowsong' });
    await openDetailedSignalTrace(user);

    expect(sectionText('Strong synergies')).toContain(
      "Daemoros applies Panic, which improves Shadowsong's Breath of Fire.",
    );
    expect(sectionText('Future unlocks')).not.toContain('Daemoros reaches Star Rank 2');

    await switchFormationMode(user, 'Roster Dragons');
    await openDetailedSignalTrace(user);

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
    await openDetailedSignalTrace(user);

    const missing = sectionText('Missing enablers');
    expect(missing).toContain('Shadowsong benefits from Panic, but this formation has no Panic provider.');
    expect(missing).toContain('Caraxes benefits from First-Strike, but this formation has no First-Strike provider.');
    expect(missing).not.toContain('benefits from Panic-dependent abilities');
    expect(analysisText()).not.toContain(incompleteMissingEnablerNotice);
  });

  it('treats Panic missing-enabler checks as incomplete when a selected dragon is metadata-only', async () => {
    const user = userEvent.setup();
    seedRoster({ shadowsong: {}, vesper: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'shadowsong', vanguard: 'vesper' });
    await openDetailedSignalTrace(user);

    expect(analysisText()).toContain('Synergy data not yet mapped: Vesper.');
    expect(sectionText('Missing enablers')).toContain(incompleteMissingEnablerNotice);
    expect(analysisText()).not.toContain('this formation has no Panic provider');
  });

  it('treats First-Strike missing-enabler checks as incomplete when a selected dragon is metadata-only', async () => {
    const user = userEvent.setup();
    seedRoster({ caraxes: {}, vesper: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'caraxes', vanguard: 'vesper' });
    await openDetailedSignalTrace(user);

    expect(analysisText()).toContain('Synergy data not yet mapped: Vesper.');
    expect(sectionText('Missing enablers')).toContain(incompleteMissingEnablerNotice);
    expect(analysisText()).not.toContain('this formation has no First-Strike provider');
  });

  it('shows Syrax and Caraxes First-Strike and Fire Damage relationships without target-probability wording', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {}, caraxes: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'caraxes' });
    await openDetailedSignalTrace(user);

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
    await openDetailedSignalTrace(user);

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
    await openDetailedSignalTrace(user);

    expect(sectionItems('Strong synergies').filter((item) => item === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(sectionText('Future unlocks')).not.toContain('Fire Damage');
    expect(sectionText('Future unlocks')).not.toContain('Tactical Inferno');
  });

  it('distinguishes adjacency placement from a Vanguard-only beneficiary requirement', async () => {
    const user = userEvent.setup();
    seedRoster({ malachite: { starRank: 10 }, caraxes: {}, sheepstealer: { reignLevel: 16 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'malachite', vanguard: 'caraxes' });
    await openDetailedSignalTrace(user);
    expect(sectionText('Strong synergies')).toContain(
      "Malachite can grant First-Strike, which improves Caraxes's Infernal Burst.",
    );

    await clearPosition(user, 'Vanguard');
    await chooseDragonForPosition(user, 'right-flank', 'caraxes');
    await openDetailedSignalTrace(user);
    expect(sectionText('Placement issues')).toContain('Malachite and Caraxes are not adjacent in this formation.');

    await clearPosition(user, 'Left Flank');
    await chooseDragonForPosition(user, 'right-flank', 'sheepstealer');
    await chooseDragonForPosition(user, 'vanguard', 'malachite');
    await openDetailedSignalTrace(user);
    expect(sectionText('Placement issues')).toContain(
      "Sheepstealer must be deployed in Vanguard for Hunter's Cunning.",
    );
    expect(sectionText('Placement issues')).not.toContain('Malachite and Sheepstealer are not adjacent');
  });

  it('renders blocked-and-locked relationships as placement issues instead of future unlocks', async () => {
    const user = userEvent.setup();
    seedRoster({
      zivern: { starRank: 10, reignLevel: 15 },
      rhysarion: { starRank: 10, reignLevel: 15 },
      shadowsong: { starRank: 6, reignLevel: 15 },
    });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'zivern', vanguard: 'rhysarion', 'right-flank': 'shadowsong' });
    await openDetailedSignalTrace(user);

    const placementIssues = sectionItems('Placement issues');
    const futureUnlocks = sectionText('Future unlocks');

    expect(placementIssues).toContain("Zivern must be deployed in Right Flank to receive Rhysarion's Champion's Vigor.");
    expect(placementIssues).toContain(
      "Shadowsong must be deployed in Vanguard, and Rhysarion must be deployed in Right Flank, for Hunter's Wrath to support Dawnsong.",
    );
    expect(
      placementIssues.filter((item) =>
        item ===
        "Shadowsong must be deployed in Vanguard, and Rhysarion must be deployed in Right Flank, for Hunter's Wrath to support Dawnsong.",
      ),
    ).toHaveLength(1);
    expect(futureUnlocks).not.toContain("Rhysarion's Champion's Vigor Tactical Damage support for Zivern's Silent Shade");
    expect(futureUnlocks).not.toContain("Shadowsong's Hunter's Wrath Strength support for Rhysarion's Dawnsong");
    expect(futureUnlocks).toContain(
      "Rhysarion's Champion's Vigor Fire Damage support for Shadowsong's Breath of Fire unlocks when Rhysarion reaches Dragon Level 16.",
    );
  });

  it('maps roster Reign Level to Sheepstealer Recovery unlocks and Vanguard conflicts', async () => {
    const user = userEvent.setup();
    seedRoster({ malachite: {}, sheepstealer: { reignLevel: 15 }, caraxes: { reignLevel: 16 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'caraxes' });
    await openDetailedSignalTrace(user);
    expect(sectionText('Future unlocks')).toContain(
      "Malachite's Warden's Rally Recovery setup for Sheepstealer's Hunter's Cunning unlocks when Sheepstealer reaches Dragon Level 16.",
    );

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const sheepstealerCard = screen.getByRole('heading', { name: 'Sheepstealer' }).closest('article');
    expect(sheepstealerCard).not.toBeNull();
    await user.click(within(sheepstealerCard as HTMLElement).getByRole('button', { name: /view details/i }));
    const detailsDialog = screen.getByRole('dialog', { name: /sheepstealer/i });
    await user.clear(within(detailsDialog).getByLabelText(/reign level/i));
    await user.type(within(detailsDialog).getByLabelText(/reign level/i), '16');
    await user.click(screen.getByRole('button', { name: /close details/i }));

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await openDetailedSignalTrace(user);
    expect(sectionText('Strong synergies')).toContain(
      "Malachite provides Recovery, which Sheepstealer benefits from through Hunter's Cunning.",
    );
    expect(sectionText('Position conflicts')).toContain(
      "Malachite's Sentinel's Presence, Sheepstealer's Hunter's Cunning, and Caraxes's Hunter's Wrath require Vanguard; only one dragon can receive that positional benefit.",
    );
  });

  it('renders selected-card signal summaries with supported, used, satisfied, and missing states', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {}, caraxes: { reignLevel: 26 }, vhagar: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'vhagar' });

    const caraxesCard = screen.getByRole('article', { name: 'Vanguard' });
    expect(within(caraxesCard).getByRole('region', { name: 'Damage profile' })).toHaveTextContent('Fire Damage');
    expect(within(caraxesCard).getByRole('region', { name: 'Provides' })).toHaveTextContent('Slow');
    expect(within(caraxesCard).getByRole('region', { name: 'Provides' })).toHaveTextContent('Control');
    expect(within(caraxesCard).getByLabelText(/Fire Damage supported/i)).toHaveAttribute('data-state', 'supported');
    expect(within(caraxesCard).getByLabelText(/First-Strike satisfied/i)).toHaveAttribute('data-state', 'satisfied');
    expect(within(caraxesCard).getByLabelText(/Slow used/i)).toHaveAttribute('data-state', 'used');

    const vhagarCard = screen.getByRole('article', { name: 'Right Flank' });
    expect(within(vhagarCard).getByRole('region', { name: 'Synergy needs' })).toHaveTextContent('Burn');
    expect(within(vhagarCard).getByLabelText(/Burn satisfied/i)).toHaveAttribute('data-state', 'satisfied');
    expect(within(vhagarCard).queryByRole('region', { name: 'Benefits from' })).not.toBeInTheDocument();

    await clearPosition(user, 'Vanguard');
    const updatedVhagarCard = screen.getByRole('article', { name: 'Right Flank' });
    expect(within(updatedVhagarCard).getByLabelText(/Burn missing/i)).toHaveAttribute('data-state', 'missing');
  });

  it('renders Vanguard Trait cards without redundant requirement or position text', async () => {
    const user = userEvent.setup();
    seedRoster({ caraxes: { starRank: 10, reignLevel: 26 } });

    await openFormationBuilder(user);
    await selectFormation(user, { vanguard: 'caraxes' });

    const vanguardCard = screen.getByRole('article', { name: 'Vanguard' });
    const traitSection = within(vanguardCard).getByRole('region', { name: /trait status/i });

    expect(traitSection).toHaveTextContent('Vanguard Trait');
    expect(traitSection).toHaveTextContent("Hunter's Wrath");
    expect(traitSection).toHaveTextContent('At Level 16+ and deployed in Vanguard');
    expect(within(traitSection).queryByRole('button', { name: /show full wording/i })).not.toBeInTheDocument();
    expect(traitSection).not.toHaveTextContent('Requirement: Star Rank 1, Dragon Level 16, Vanguard');
    expect(traitSection).not.toHaveTextContent('Position requirement met.');
  });

  it('renders an explainable Formation Rating panel with score, tier, breakdown, strengths, and opportunities', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {}, vhagar: {}, caraxes: { reignLevel: 26 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'vhagar', 'right-flank': 'caraxes' });

    const panel = ratingPanel();
    expect(panel).toHaveTextContent(/\/ 100/);
    expect(panel).toHaveTextContent(/Strong|Solid|Developing|Weak|Excellent/);
    expect(panel).toHaveTextContent('Realized synergy payoff');
    expect(panel).toHaveTextContent('Support usefulness');
    expect(panel).toHaveTextContent('Kit utilization');
    expect(panel).toHaveTextContent(/mapped opportunities realized/);
    expect(panel).toHaveTextContent('Strengths');
    expect(panel).toHaveTextContent('Weaknesses / opportunities');
    expect(panel).toHaveTextContent('Caraxes can apply Burn');
    expect(panel).toHaveTextContent('Syrax can grant First-Strike');
    expect(panel).toHaveTextContent('not a combat simulation');
    expect(screen.queryByRole('heading', { name: 'Strong synergies' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Missing enablers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Placement issues' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Position conflicts' })).not.toBeInTheDocument();

    await openDetailedSignalTrace(user);
    expect(screen.getByRole('heading', { name: 'Strong synergies' })).toBeInTheDocument();
  });

  it('updates Formation Rating when a dragon changes and when a position is cleared', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {}, vhagar: {}, caraxes: { reignLevel: 26 }, shadowsong: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'vhagar', 'right-flank': 'caraxes' });
    const initialLabel = within(ratingPanel()).getByLabelText(/Formation rating .* out of 100/i).getAttribute('aria-label');

    await clearPosition(user, 'Right Flank');
    expect(ratingPanel()).toHaveTextContent('Incomplete');
    expect(ratingPanel()).toHaveTextContent('Assign all three positions');

    await chooseDragonForPosition(user, 'right-flank', 'shadowsong');
    const updatedLabel = within(ratingPanel()).getByLabelText(/Formation rating .* out of 100/i).getAttribute('aria-label');
    expect(updatedLabel).not.toBe(initialLabel);
  });

  it('shows Incomplete guidance for partial formations', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax' });

    expect(ratingPanel()).toHaveTextContent('Incomplete');
    expect(ratingPanel()).toHaveTextContent('Assign all three positions');
  });

  it('renders Formation Rating for share-link-loaded formations', () => {
    seedRoster({ syrax: {}, vhagar: {}, caraxes: { reignLevel: 26 } });
    window.history.replaceState(
      null,
      '',
      createFormationShareHash({ 'left-flank': 'syrax', vanguard: 'vhagar', 'right-flank': 'caraxes' }),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Formation Builder' })).toBeInTheDocument();
    expect(ratingPanel()).toHaveTextContent(/\/ 100/);
    expect(ratingPanel()).toHaveTextContent('Caraxes can apply Burn');
  });

  it('shows Malachite unused Physical and Tactical support as available instead of used', async () => {
    const user = userEvent.setup();
    seedRoster({ malachite: {}, sheepstealer: { reignLevel: 16 }, caraxes: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'caraxes' });

    const malachiteCard = screen.getByRole('article', { name: 'Left Flank' });
    expect(within(malachiteCard).getByLabelText(/Physical Damage support available/i)).toHaveAttribute(
      'data-state',
      'available',
    );
    expect(within(malachiteCard).getByLabelText(/Tactical Damage support available/i)).toHaveAttribute(
      'data-state',
      'available',
    );
    expect(within(malachiteCard).getByLabelText(/Recovery used/i)).toHaveAttribute('data-state', 'used');

    const caraxesCard = screen.getByRole('article', { name: 'Right Flank' });
    expect(within(caraxesCard).getByLabelText(/Fire Damage supported/i)).toHaveAttribute('data-state', 'supported');
  });

  it('marks Provides chips inactive when progression or Vanguard placement blocks the source', async () => {
    const user = userEvent.setup();
    seedRoster({ caraxes: { reignLevel: 15 }, syrax: { reignLevel: 26 } });

    await openFormationBuilder(user);
    await selectFormation(user, { vanguard: 'caraxes', 'right-flank': 'syrax' });

    const vanguardCard = screen.getByRole('article', { name: 'Vanguard' });
    expect(within(vanguardCard).getByLabelText(/Strength support inactive/i)).toHaveAttribute('data-state', 'inactive');
    expect(within(vanguardCard).getByLabelText(/Strength support inactive/i)).toHaveAccessibleName(/Dragon Level 16/i);

    await user.click(within(vanguardCard).getByRole('button', { name: /^right flank$/i }));
    const rightCard = screen.getByRole('article', { name: 'Right Flank' });
    expect(within(rightCard).getByLabelText(/Strength support inactive/i)).toHaveAccessibleName(/requires Vanguard/i);
  });

  it('opens Dragon Details from a Formation Builder card and returns to a usable formation', async () => {
    const user = userEvent.setup();
    seedRoster({ vhagar: {} });

    await openFormationBuilder(user);
    await selectFormation(user, { vanguard: 'vhagar' });

    await user.click(within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('button', { name: /view details/i }));
    const dialog = screen.getByRole('dialog', { name: /vhagar/i });
    expect(dialog).toHaveTextContent('At a glance');
    expect(dialog).toHaveTextContent("Warrior's Resilience");

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    expect(screen.getByRole('article', { name: 'Vanguard' })).toHaveTextContent('Vhagar');
    await clearPosition(user, 'Vanguard');
    expect(within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('button', { name: /\+ add dragon/i })).toBeInTheDocument();
  });

  it('filters the Formation Builder dragon selector by name, metadata, Damage profile, Provides, and Synergy needs tags', async () => {
    const user = userEvent.setup();
    seedRoster({ caraxes: {}, syrax: {}, vhagar: {}, daemoros: {} });

    await openFormationBuilder(user);
    await user.click(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /\+ add dragon/i }));
    const dialog = screen.getByRole('dialog', { name: /choose a dragon for left flank/i });

    expect(within(dialog).getByLabelText(/search by dragon name/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^rarity$/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^breed$/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^verification$/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /damage profile/i })).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/provides tag/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/synergy needs tag/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/search by dragon name/i), 'Caraxes');
    expect(within(dialog).getByRole('heading', { name: 'Caraxes' })).toBeInTheDocument();
    const caraxesRow = within(dialog).getByRole('heading', { name: 'Caraxes' }).closest('article');
    expect(caraxesRow).not.toBeNull();
    expect(within(caraxesRow as HTMLElement).getByLabelText('Damage profile')).toHaveTextContent('Fire Damage');
    expect(within(caraxesRow as HTMLElement).getByLabelText('Provides')).toHaveTextContent('Slow');
    expect(within(caraxesRow as HTMLElement).getByLabelText('Synergy needs')).toHaveTextContent('First-Strike');
    expect(within(dialog).queryByRole('heading', { name: 'Syrax' })).not.toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/search by dragon name/i));
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /damage profile/i }), 'Fire Damage');
    expect(within(dialog).getByRole('heading', { name: 'Caraxes' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Syrax' })).not.toBeInTheDocument();

    await user.selectOptions(within(dialog).getByRole('combobox', { name: /damage profile/i }), 'all');
    await user.selectOptions(within(dialog).getByLabelText(/provides tag/i), 'Slow');
    expect(within(dialog).getByRole('heading', { name: 'Caraxes' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Syrax' })).not.toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/provides tag/i), 'all');
    await user.selectOptions(within(dialog).getByLabelText(/synergy needs tag/i), 'Burn');
    expect(within(dialog).getByRole('heading', { name: 'Vhagar' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Daemoros' })).not.toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/synergy needs tag/i), 'all');
    await user.selectOptions(within(dialog).getByLabelText(/^rarity$/i), 'Legendary');
    await user.selectOptions(within(dialog).getByLabelText(/^breed$/i), 'Warrior');
    await user.selectOptions(within(dialog).getByLabelText(/^verification$/i), 'community-verified');
    expect(within(dialog).getByRole('heading', { name: 'Vhagar' })).toBeInTheDocument();
  });

  it('keeps the Formation Builder selector on mobile-safe responsive classes', async () => {
    const user = userEvent.setup();
    seedRoster({ caraxes: {}, syrax: {}, vhagar: {} });

    await openFormationBuilder(user);
    await user.click(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /\+ add dragon/i }));

    const dialog = screen.getByRole('dialog', { name: /choose a dragon for left flank/i });
    expect(dialog).toHaveClass('formation-selector-dialog');
    expect(within(dialog).getByLabelText(/formation dragon filters/i)).toHaveClass('formation-selector-filters');
    expect(within(dialog).getByLabelText(/formation dragon choices/i)).toHaveClass('formation-selector-list');
    const firstRow = within(dialog).getAllByRole('article')[0];
    if (!firstRow) {
      throw new Error('Expected at least one dragon row in the formation selector');
    }
    expect(within(firstRow).getByRole('button', { name: /view details/i })).toBeInTheDocument();
    expect(within(firstRow).getByRole('button', { name: /^select$/i })).toBeInTheDocument();

    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toContain('.formation-selector-dialog {');
    expect(css).toContain('max-width: min(62rem, calc(100vw - 1rem));');
    expect(css).toContain('width: min(100%, calc(100vw - 1rem));');
    expect(css).toContain('.formation-selector-row .add-dragon-actions button');
    expect(css).toContain('white-space: normal');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr);');
  });

  it('opens the selector in All 10 Star Dragons mode and marks selected dragons unavailable there', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {} });

    await openFormationBuilder(user);
    await user.click(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /\+ add dragon/i }));
    let dialog = screen.getByRole('dialog', { name: /choose a dragon for left flank/i });
    await user.type(within(dialog).getByLabelText(/search by dragon name/i), 'Antares');

    const antaresRow = within(dialog).getByRole('heading', { name: 'Antares' }).closest('article');
    expect(antaresRow).not.toBeNull();
    expect(antaresRow).toHaveTextContent('Star 10');
    await user.click(within(antaresRow as HTMLElement).getByRole('button', { name: /^select$/i }));

    expect(within(screen.getByRole('article', { name: 'Left Flank' })).getByLabelText(/Antares metadata/i)).toHaveTextContent(
      'Star 10',
    );

    await user.click(screen.getByRole('radio', { name: 'Roster Dragons' }));
    expect(screen.getByRole('status')).toHaveTextContent('Roster Dragons mode cleared unavailable slot: Left Flank.');
    expect(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /\+ add dragon/i })).toBeInTheDocument();

    await user.click(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /\+ add dragon/i }));
    dialog = screen.getByRole('dialog', { name: /choose a dragon for left flank/i });
    await user.type(within(dialog).getByLabelText(/search by dragon name/i), 'Antares');
    expect(within(dialog).queryByRole('heading', { name: 'Antares' })).not.toBeInTheDocument();
  });

  it('opens the selector in Roster Dragons mode and uses saved card progression', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: { starRank: 4 }, caraxes: { starRank: 7 } });

    await openFormationBuilder(user);
    await switchFormationMode(user, 'Roster Dragons');
    await user.click(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /\+ add dragon/i }));
    const dialog = screen.getByRole('dialog', { name: /choose a dragon for left flank/i });

    await user.type(within(dialog).getByLabelText(/search by dragon name/i), 'Syrax');
    const syraxRow = within(dialog).getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxRow).not.toBeNull();
    expect(syraxRow).toHaveTextContent('Star 4');
    await user.click(within(syraxRow as HTMLElement).getByRole('button', { name: /^select$/i }));

    expect(within(screen.getByRole('article', { name: 'Left Flank' })).getByLabelText(/Syrax metadata/i)).toHaveTextContent(
      'Star 4',
    );
  });

  it('keeps Arulix command and damage-profile wording progression-aware at Star Ranks 5 and 6', async () => {
    const user = userEvent.setup();
    seedRoster({ arulix: { starRank: 5 } });

    await openFormationBuilder(user);
    await switchFormationMode(user, 'Roster Dragons');
    await chooseDragonForPosition(user, 'left-flank', 'arulix');

    let card = screen.getByRole('article', { name: 'Left Flank' });
    let damageProfile = within(card).getByRole('region', { name: 'Damage profile' });
    let command = within(card).getByRole('region', { name: 'Command' });
    expect(within(damageProfile).getByText('Tactical Damage')).toHaveAttribute('data-state', 'available');
    expect(within(damageProfile).getByText('Physical Damage')).toHaveAttribute('data-state', 'inactive');
    expect(command).not.toHaveTextContent('Deals Physical Damage');
    expect(command).toHaveTextContent('gains Physical Damage at 6★');

    await user.click(within(card).getByRole('button', { name: /view details/i }));
    const details = screen.getByRole('dialog', { name: 'Arulix' });
    const commandDetails = within(details).getByRole('heading', { name: 'Gleaming Spiral' }).closest('article');
    expect(commandDetails).not.toBeNull();
    expect(commandDetails).not.toHaveTextContent('Deals Physical Damage');
    expect(commandDetails).toHaveTextContent('gains Physical Damage at 6\u2605');
    await user.selectOptions(within(details).getByRole('combobox', { name: 'Star Rank' }), '6');
    expect(commandDetails).toHaveTextContent('Deals Physical Damage');
    expect(commandDetails).not.toHaveTextContent('gains Physical Damage at 6\u2605');
    await user.click(within(details).getByRole('button', { name: /close details/i }));

    card = screen.getByRole('article', { name: 'Left Flank' });
    damageProfile = within(card).getByRole('region', { name: 'Damage profile' });
    command = within(card).getByRole('region', { name: 'Command' });
    expect(within(damageProfile).getByText('Tactical Damage')).toHaveAttribute('data-state', 'available');
    expect(within(damageProfile).getByText('Physical Damage')).toHaveAttribute('data-state', 'available');
    expect(command).toHaveTextContent('Deals Physical Damage');
    expect(command).not.toHaveTextContent('gains Physical Damage at 6★');
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
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'antares' });

    for (const position of ['Left Flank', 'Vanguard', 'Right Flank']) {
      const card = screen.getByRole('article', { name: position });
      expect(within(card).queryByLabelText('Dragon')).not.toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /change dragon/i })).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /view details/i })).toBeInTheDocument();
      expect(within(card).getByLabelText(/movement controls/i)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /clear position/i })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Command' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Damage profile' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Provides' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Synergy needs' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: /affinities/i })).toBeInTheDocument();
      expect(within(card).queryByRole('region', { name: /curated profile/i })).not.toBeInTheDocument();
    }
    expect(within(screen.getByRole('article', { name: 'Left Flank' })).queryByRole('region', { name: /trait status/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('region', { name: /trait status/i })).toHaveTextContent('Vanguard Trait');
    expect(within(screen.getByRole('article', { name: 'Right Flank' })).queryByRole('region', { name: /trait status/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Curated profile available.')).not.toBeInTheDocument();
    expect(screen.queryByText('No recorded unlock requirement.')).not.toBeInTheDocument();

    const syrax = dragons.find((dragon) => dragon.id === 'syrax')!;
    const syraxCard = screen.getByRole('article', { name: 'Left Flank' });
    const syraxMetadata = within(syraxCard).getByLabelText(/Syrax metadata/i);
    expect(syraxMetadata).toHaveTextContent(syrax.rarity);
    expect(syraxMetadata).toHaveTextContent(syrax.breed);
    expect(syraxMetadata).toHaveTextContent('Star 10');
    expect(syraxMetadata).not.toHaveTextContent('Verified');
    expect(syraxMetadata).not.toHaveTextContent('Owned / Hatched');

    const syraxCommand = within(syraxCard).getByRole('region', { name: 'Command' });
    expect(syraxCommand).toHaveTextContent('Deals Tactical Damage');
    expect(within(syraxCommand).queryByRole('heading', { name: 'Command' })).not.toBeInTheDocument();
    expect(within(syraxCommand).getAllByText('Command')).toHaveLength(1);
    expect(syraxCommand).not.toHaveTextContent('Active');
    expect(syraxCommand).not.toHaveTextContent('Verified');
    expect(within(syraxCommand).queryByRole('list')).not.toBeInTheDocument();
    expect(syraxCommand).not.toHaveTextContent('Each Round: 20% chance');
    await user.click(within(syraxCommand).getByRole('button', { name: /show full wording/i }));
    expect(syraxCommand).toHaveTextContent('Each Round: 20% chance');
    await user.click(within(syraxCommand).getByRole('button', { name: /hide full wording/i }));
    expect(syraxCommand).not.toHaveTextContent('Each Round: 20% chance');

    const caraxesTrait = within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('region', {
      name: /trait status/i,
    });
    expect(within(caraxesTrait).queryByRole('heading', { name: 'Vanguard Trait' })).not.toBeInTheDocument();
    expect(within(caraxesTrait).getAllByText('Vanguard Trait')).toHaveLength(1);
    expect(caraxesTrait).not.toHaveTextContent('Passive');
    expect(caraxesTrait).not.toHaveTextContent('Verified');
    expect(within(caraxesTrait).queryByRole('button', { name: /show full wording/i })).not.toBeInTheDocument();
    expect(caraxesTrait).toHaveTextContent('At Level 16+ and deployed in Vanguard');

    expect(analysisText()).not.toContain('Synergy data not yet mapped: Antares.');
    await openDetailedSignalTrace(user);
    expect(sectionText('Strong synergies')).toContain("Syrax can grant First-Strike, which improves Caraxes's Infernal Burst.");
    expect(sectionItems('Strong synergies').filter((item) => item === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Missing enablers' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('button', { name: /change dragon/i }));
    const selector = screen.getByRole('dialog', { name: /choose a dragon for vanguard/i });
    await user.type(within(selector).getByLabelText(/search by dragon name/i), 'Syrax');
    const syraxRow = within(selector).getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxRow).not.toBeNull();
    expect(within(syraxRow as HTMLElement).getByRole('button', { name: /already selected/i })).toBeDisabled();
    await user.click(within(selector).getByRole('button', { name: /close dragon selector/i }));

    await user.click(within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /^right flank$/i }));
    expect(screen.getByRole('article', { name: 'Right Flank' })).toHaveTextContent('Syrax');
    expect(screen.getByRole('article', { name: 'Left Flank' })).toHaveTextContent('Antares');

    await user.click(
      within(screen.getByRole('article', { name: 'Right Flank' })).getByRole('button', { name: /clear position/i }),
    );
    expect(within(screen.getByRole('article', { name: 'Right Flank' })).getByRole('button', { name: /\+ add dragon/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copy share link/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#formation='));

    await user.click(screen.getByRole('button', { name: /clear formation/i }));
    expect(screen.getAllByText(/add a dragon to review command, vanguard trait, affinities, and synergy signals/i)).toHaveLength(3);
  });
});
