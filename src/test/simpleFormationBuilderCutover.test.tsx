import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    await clearPosition(user, 'Vanguard');
    await chooseDragonForPosition(user, 'right-flank', 'caraxes');
    expect(sectionText('Placement issues')).toContain('Malachite and Caraxes are not adjacent in this formation.');

    await clearPosition(user, 'Left Flank');
    await chooseDragonForPosition(user, 'right-flank', 'sheepstealer');
    await chooseDragonForPosition(user, 'vanguard', 'malachite');
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
    expect(within(vhagarCard).getByRole('region', { name: 'Benefits from' })).toHaveTextContent('Burn');
    expect(within(vhagarCard).getByLabelText(/Burn satisfied/i)).toHaveAttribute('data-state', 'satisfied');

    await clearPosition(user, 'Vanguard');
    const updatedVhagarCard = screen.getByRole('article', { name: 'Right Flank' });
    expect(within(updatedVhagarCard).getByLabelText(/Burn missing/i)).toHaveAttribute('data-state', 'missing');
  });

  it('renders an explainable Formation Rating panel with score, tier, breakdown, strengths, and opportunities', async () => {
    const user = userEvent.setup();
    seedRoster({ syrax: {}, vhagar: {}, caraxes: { reignLevel: 26 } });

    await openFormationBuilder(user);
    await selectFormation(user, { 'left-flank': 'syrax', vanguard: 'vhagar', 'right-flank': 'caraxes' });

    const panel = ratingPanel();
    expect(panel).toHaveTextContent(/\/ 100/);
    expect(panel).toHaveTextContent(/Strong|Solid|Developing|Weak|Excellent/);
    expect(panel).toHaveTextContent('Synergy payoff');
    expect(panel).toHaveTextContent('Support usefulness');
    expect(panel).toHaveTextContent('Strengths');
    expect(panel).toHaveTextContent('Weaknesses / opportunities');
    expect(panel).toHaveTextContent('Caraxes can apply Burn');
    expect(panel).toHaveTextContent('Syrax can grant First-Strike');
    expect(panel).toHaveTextContent('not a combat simulation');
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

    await user.click(within(vanguardCard).getByRole('button', { name: /move to right flank/i }));
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

  it('filters the Formation Builder dragon selector by name, metadata, Damage profile, Provides, and Benefits from tags', async () => {
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
    expect(within(dialog).getByLabelText(/benefits from tag/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/search by dragon name/i), 'Caraxes');
    expect(within(dialog).getByRole('heading', { name: 'Caraxes' })).toBeInTheDocument();
    const caraxesRow = within(dialog).getByRole('heading', { name: 'Caraxes' }).closest('article');
    expect(caraxesRow).not.toBeNull();
    expect(within(caraxesRow as HTMLElement).getByLabelText('Damage profile')).toHaveTextContent('Fire Damage');
    expect(within(caraxesRow as HTMLElement).getByLabelText('Provides')).toHaveTextContent('Slow');
    expect(within(caraxesRow as HTMLElement).getByLabelText('Benefits from')).toHaveTextContent('First-Strike');
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
    await user.selectOptions(within(dialog).getByLabelText(/benefits from tag/i), 'Burn');
    expect(within(dialog).getByRole('heading', { name: 'Vhagar' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Daemoros' })).not.toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/benefits from tag/i), 'all');
    await user.selectOptions(within(dialog).getByLabelText(/^rarity$/i), 'Legendary');
    await user.selectOptions(within(dialog).getByLabelText(/^breed$/i), 'Warrior');
    await user.selectOptions(within(dialog).getByLabelText(/^verification$/i), 'community-verified');
    expect(within(dialog).getByRole('heading', { name: 'Vhagar' })).toBeInTheDocument();
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
      expect(within(card).queryByLabelText('Dragon')).not.toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /change dragon/i })).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /view details/i })).toBeInTheDocument();
      expect(within(card).getByLabelText(/movement controls/i)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /clear position/i })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Command' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Damage profile' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Provides' })).toBeInTheDocument();
      expect(within(card).getByRole('region', { name: 'Benefits from' })).toBeInTheDocument();
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
    expect(within(syraxCommand).queryByRole('list')).not.toBeInTheDocument();
    expect(syraxCommand).not.toHaveTextContent('Each Round: 20% chance');
    await user.click(within(syraxCommand).getByRole('button', { name: /show full wording/i }));
    expect(syraxCommand).toHaveTextContent('Each Round: 20% chance');
    await user.click(within(syraxCommand).getByRole('button', { name: /hide full wording/i }));
    expect(syraxCommand).not.toHaveTextContent('Each Round: 20% chance');

    const caraxesTrait = within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('region', {
      name: /trait status/i,
    });
    expect(caraxesTrait).not.toHaveTextContent('At Level 16+ and deployed in Vanguard');
    await user.click(within(caraxesTrait).getByRole('button', { name: /show full wording/i }));
    expect(caraxesTrait).toHaveTextContent('At Level 16+ and deployed in Vanguard');

    expect(analysisText()).toContain('Synergy data not yet mapped: Antares.');
    expect(sectionText('Strong synergies')).toContain("Syrax can grant First-Strike, which improves Caraxes's Infernal Burst.");
    expect(sectionItems('Strong synergies').filter((item) => item === 'Syrax improves allied Fire Damage, and Caraxes deals Fire Damage.')).toHaveLength(1);
    expect(sectionText('Missing enablers')).toContain(incompleteMissingEnablerNotice);
    await user.click(within(screen.getByRole('article', { name: 'Vanguard' })).getByRole('button', { name: /change dragon/i }));
    const selector = screen.getByRole('dialog', { name: /choose a dragon for vanguard/i });
    await user.type(within(selector).getByLabelText(/search by dragon name/i), 'Syrax');
    const syraxRow = within(selector).getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxRow).not.toBeNull();
    expect(within(syraxRow as HTMLElement).getByRole('button', { name: /already selected/i })).toBeDisabled();
    await user.click(within(selector).getByRole('button', { name: /close dragon selector/i }));

    await user.click(
      within(screen.getByRole('article', { name: 'Left Flank' })).getByRole('button', { name: /move to right flank/i }),
    );
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
