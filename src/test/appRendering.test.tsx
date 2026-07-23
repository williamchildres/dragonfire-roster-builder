import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, RawWordingDisclosure } from '../app/App';
import { dragons } from '../data/dragons';
import { createEmptyRoster, saveRoster, serializeRosterExport, STORAGE_KEY } from '../services/rosterStorage';


describe('Dragonfire Lab app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('renders Dragonfire Lab in the public header and not the old visible brand text', () => {
    render(<App />);

    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { name: 'Dragonfire Lab' })).toBeInTheDocument();
    expect(within(banner).queryByText('Dragonfire Roster Lab')).not.toBeInTheDocument();
  });

  it('ships custom-domain metadata and the GitHub Pages CNAME asset', () => {
    const index = readFileSync('index.html', 'utf8');
    const cname = readFileSync('public/CNAME', 'utf8');

    expect(cname.replace(/\r\n/g, '\n')).toBe('dragonfirelab.com\n');
    expect(index).toContain('<title>Dragonfire Lab</title>');
    expect(index).toContain('<link rel="canonical" href="https://dragonfirelab.com/overview" />');
    expect(index).toContain('<meta property="og:site_name" content="Dragonfire Lab" />');
    expect(index).toContain('<meta property="og:url" content="https://dragonfirelab.com/overview" />');
    expect(index).toContain('explainable Formation Ratings');
  });

  async function openAddDragon(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    await user.click(screen.getAllByRole('button', { name: /\+ add dragon/i })[0]!);
  }

  it('renders unowned dragons through the add dragon modal and supports search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    expect(screen.getByText(/showing 33 of 33 dragons/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    expect(screen.getByText(/showing 1 of 33 dragons/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Syrax' })).toBeInTheDocument();
  });

  it('filters the Add Dragon modal by rarity, breed, and verification status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    expect(screen.getByRole('dialog', { name: /add dragons to your roster/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/search by dragon name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^rarity$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^breed$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^verification$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^verification$/i)).not.toHaveTextContent('Metadata Only');
    expect(screen.getByRole('dialog', { name: /add dragons to your roster/i })).not.toHaveTextContent('Metadata Only');

    await user.selectOptions(screen.getByLabelText(/^rarity$/i), 'Rare');
    expect(screen.getByRole('heading', { name: 'Solstryker' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Syrax' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^breed$/i), 'Champion');
    expect(screen.getByRole('heading', { name: 'Solstryker' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shimmer' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^verification$/i), 'community-verified');
    expect(screen.getByRole('heading', { name: 'Nyrena' })).toBeInTheDocument();
    const nyrenaRow = screen.getByRole('heading', { name: 'Nyrena' }).closest('article');
    expect(nyrenaRow).not.toBeNull();
    expect(within(nyrenaRow as HTMLElement).getByText('Verified')).toBeInTheDocument();
  });

  it('shows a named success banner when Feskar is added from the modal', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Feskar');
    await user.click(screen.getByRole('button', { name: /add to roster/i }));

    expect(screen.getByText('Added Feskar to roster.')).toBeInTheDocument();
    expect(screen.queryByText(/^Added to roster\.$/i)).not.toBeInTheDocument();
  });

  it('adds a dragon from the modal, preserves saved fields, and exposes details from the modal', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.starRank = 5;
    roster.syrax!.reignLevel = 12;
    roster.syrax!.notes = 'Keep with fire support.';
    saveRoster(window.localStorage, roster);

    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    const syraxRow = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxRow).not.toBeNull();
    await user.click(within(syraxRow as HTMLElement).getByRole('button', { name: /view details/i }));
    expect(screen.getByRole('dialog', { name: /syrax/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close details/i }));

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    await user.click(screen.getByRole('button', { name: /add to roster/i }));
    expect(screen.getByText('Added Syrax to roster.')).toBeInTheDocument();
    expect(screen.queryByText(/^Added to roster\.$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /add dragons to your roster/i })).not.toBeInTheDocument();

    const syraxEditor = screen.getByRole('complementary', { name: 'Syrax' });
    expect(within(syraxEditor).getByLabelText(/star rank/i)).toHaveValue('5');
    expect(within(syraxEditor).getByLabelText(/dragon level/i)).toHaveValue(12);
    await user.click(within(syraxEditor).getByRole('button', { name: /dragon details/i }));
    expect(within(screen.getByRole('dialog', { name: /syrax/i })).getByLabelText(/personal notes/i)).toHaveValue('Keep with fire support.');
  });

  it('initializes an individually added dragon at Star 1 and Dragon Level 1', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    await user.click(screen.getByRole('button', { name: /add to roster/i }));

    const syraxEditor = screen.getByRole('complementary', { name: 'Syrax' });
    expect(within(syraxEditor).getByLabelText(/star rank/i)).toHaveValue('1');
    expect(within(syraxEditor).getByLabelText(/dragon level/i)).toHaveValue(1);
  });

  it('returns to the mobile roster list after an Add Dragon request has been consumed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    await user.click(screen.getByRole('button', { name: /add to roster/i }));
    expect(document.querySelector('.roster-workspace')).toHaveAttribute('data-mobile-view', 'editor');
    expect(screen.getByRole('complementary', { name: 'Syrax' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^overview$/i }));
    await user.click(screen.getByRole('link', { name: /^roster$/i }));

    expect(document.querySelector('.roster-workspace')).toHaveAttribute('data-mobile-view', 'list');
    expect(screen.getByRole('complementary', { name: 'Syrax' })).toBeInTheDocument();
  });

  it('auto-dismisses and refreshes the roster success banner for the latest dragon', () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      fireEvent.click(screen.getByRole('link', { name: /^roster$/i }));
      fireEvent.click(screen.getAllByRole('button', { name: /\+ add dragon/i })[0]!);
      fireEvent.change(screen.getByLabelText(/search by dragon name/i), { target: { value: 'Feskar' } });
      fireEvent.click(screen.getByRole('button', { name: /add to roster/i }));

      expect(screen.getByText('Added Feskar to roster.')).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole('button', { name: /\+ add dragon/i })[0]!);
      fireEvent.change(screen.getByLabelText(/search by dragon name/i), { target: { value: 'Tessarion' } });
      fireEvent.click(screen.getByRole('button', { name: /add to roster/i }));

      expect(screen.getByText('Added Tessarion to roster.')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3999);
      });
      expect(screen.getByText('Added Tessarion to roster.')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByText(/Added Tessarion to roster\./i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the roster success banner when navigating away from My Roster', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Feskar');
    await user.click(screen.getByRole('button', { name: /add to roster/i }));

    expect(screen.getByText('Added Feskar to roster.')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^overview$/i }));
    expect(screen.queryByText(/Added Feskar to roster\./i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('navigation', { name: /primary sections/i }).querySelectorAll('a')[2]!);
    expect(screen.queryByText(/Added Feskar to roster\./i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^about$/i }));
    expect(screen.queryByText(/Added Feskar to roster\./i)).not.toBeInTheDocument();
  });

  it('renders the polished Overview landing content and About copy', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Build stronger formations from your dragon roster.' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const workflowLinks = screen.getByLabelText('Primary workflows').querySelectorAll('a');
    expect(workflowLinks).toHaveLength(3);
    expect(screen.getByRole('link', { name: /track your roster/i })).toHaveAttribute('href', '/roster');
    expect(screen.getByRole('link', { name: /build formations/i })).toHaveAttribute('href', '/formations');
    expect(screen.getByRole('link', { name: /optimize your roster/i })).toHaveAttribute('href', '/optimizer');
    expect(screen.queryByText('Understand Formation Ratings')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose Your Optimizer Strategy')).not.toBeInTheDocument();
    expect(screen.queryByText('Private by design')).not.toBeInTheDocument();
    const datasetStatus = screen.getByLabelText('Dataset status');
    expect(datasetStatus).toHaveTextContent('33 / 33');
    expect(datasetStatus).toHaveTextContent('231');
    expect(datasetStatus).toHaveTextContent('33');
    expect(screen.getByText('Recent Update')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Version 0.20.3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view all updates/i })).toHaveAttribute('href', '/updates');

    await user.click(screen.getByRole('link', { name: /^about$/i }));
    expect(screen.getByRole('heading', { name: 'Evidence becomes structured records' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Why this is different from asking AI for formations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'An explainable 100-point planning score' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'An empirical progression estimate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ten formations without dragon reuse' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plausible is not enough' })).toBeInTheDocument();
    expect(screen.queryByText(/All 31 known dragons/i)).not.toBeInTheDocument();

    const methodologyMetrics = screen.getByLabelText('Methodology at a glance');
    expect(methodologyMetrics).toHaveTextContent('33');
    expect(methodologyMetrics).toHaveTextContent('231');
    expect(methodologyMetrics).toHaveTextContent('239');
    expect(methodologyMetrics).toHaveTextContent('32,736');
    expect(methodologyMetrics).toHaveTextContent('5,456');
    expect(methodologyMetrics).toHaveTextContent('500+');

    const aiSection = screen.getByRole('heading', { name: 'Why this is different from asking AI for formations' }).closest('section');
    expect(aiSection).toHaveTextContent('versioned source dataset');
    expect(aiSection).toHaveTextContent('does not simulate combat or guarantee the strongest possible in-game army');

    const ratingSection = screen.getByRole('heading', { name: 'An explainable 100-point planning score' }).closest('section');
    expect(ratingSection).toHaveTextContent('Formation Rating = Active Synergy, maximum 80 + Placement Effectiveness, maximum 20');
    expect(ratingSection).toHaveTextContent('all six assignments');

    const powerSection = screen.getByRole('heading', { name: 'An empirical progression estimate' }).closest('section');
    expect(powerSection).toHaveTextContent('rarity-specific Star contribution + rarity-specific Dragon Level contribution');
    expect(powerSection).toHaveTextContent('Only rarity, Star Rank, and Dragon Level are inputs');
    expect(powerSection).toHaveTextContent('Habit Levels, notes, private combat stats, and account-specific displayed stats are not inputs');

    const optimizerSection = screen.getByRole('heading', { name: 'Ten formations without dragon reuse' }).closest('section');
    expect(optimizerSection).toHaveTextContent('The exact optimizer selects ten three-dragon formations');
    expect(optimizerSection).toHaveTextContent('Every production phase requires optimal status with zero configured MIP gap');
    expect(optimizerSection).toHaveTextContent('No greedy or approximate result is labeled “Proven optimal.”');

    expect(screen.getByRole('heading', { name: 'Privacy and local storage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Community data and contributions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unofficial and open source' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Support Dragonfire Lab' })).toBeInTheDocument();
  });

  it('links the optimizer to the About methodology', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    expect(screen.getByRole('link', { name: 'How recommendations are built' })).toHaveAttribute('href', '/about');
  });

  it('navigates from the Overview feature cards to the matching public pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /track your roster/i }));
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^overview$/i }));
    await user.click(screen.getByRole('link', { name: /build formations/i }));
    expect(screen.getByRole('heading', { name: 'Formation Builder' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^overview$/i }));
    await user.click(screen.getByRole('link', { name: /optimize your roster/i }));
    expect(screen.getByRole('heading', { name: 'Roster Optimizer' })).toBeInTheDocument();
  });

  it('displays unknown combat values as Not verified yet', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /syrax/i });
    expect(within(dialog).getAllByText('Not verified yet').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the polished Daemoros details layout with at-a-glance summary and ownership controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Daemoros');
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /daemoros/i });
    expect(dialog).toHaveTextContent('Daemoros');
    expect(dialog).toHaveTextContent('Epic');
    expect(dialog).toHaveTextContent('Warrior');
    expect(dialog).toHaveTextContent('Verified');
    expect(dialog).toHaveTextContent('At a glance');
    expect(dialog).toHaveTextContent('Provides');
    expect(dialog).toHaveTextContent('Benefits from');
    expect(dialog).not.toHaveTextContent('Placement notes');
    expect(within(dialog).getByRole('heading', { name: 'Abilities' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'What it does' })).not.toBeInTheDocument();
    expect(dialog).toHaveTextContent('Panic');
    expect(dialog).toHaveTextContent('Burn');
    expect(dialog).toHaveTextContent('Physical Damage');
    expect(dialog).toHaveTextContent('Vanguard Trait');
    expect(dialog).toHaveTextContent('Initiative support');
    expect(dialog).toHaveTextContent('Shadowflame');
    expect(dialog).toHaveTextContent("Warrior's Zeal");
    expect(dialog).toHaveTextContent('Instill Fear');
    expect(dialog).toHaveTextContent('Powerful Reflexes');
    expect(dialog).toHaveTextContent('Shroud of Shadows');
    expect(dialog).toHaveTextContent('Darkening Fear');
    expect(dialog).toHaveTextContent("Phantom's Veil");
    const detailsHeader = dialog.querySelector('.details-header');
    expect(detailsHeader).not.toBeNull();
    expect(detailsHeader).toHaveTextContent('Daemoros');
    expect(detailsHeader).not.toHaveTextContent('Panic');
    expect(detailsHeader).not.toHaveTextContent('Burn');
    expect(detailsHeader).not.toHaveTextContent('Physical Damage');
    expect(detailsHeader).not.toHaveTextContent('Vanguard trait');
    expect(detailsHeader).not.toHaveTextContent('Initiative support');
    expect(within(detailsHeader as HTMLElement).getByRole('checkbox', { name: /owned \/ hatched/i })).toBeInTheDocument();
    expect(within(detailsHeader as HTMLElement).getByLabelText(/star rank/i)).toBeInTheDocument();
    expect(within(detailsHeader as HTMLElement).getByLabelText(/dragon level/i)).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Owned / Hatched');
    expect(dialog).not.toHaveTextContent('Collection State');
    expect(dialog).not.toHaveTextContent('Shards');
    expect(dialog).not.toHaveTextContent('Shards Required');
    expect(dialog).toHaveTextContent('Star Rank');
    expect(dialog).toHaveTextContent('Dragon Level');
    expect(within(dialog).queryByRole('heading', { name: 'Identity' })).not.toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('Verification status');
    expect(dialog).not.toHaveTextContent('Roster source');
    expect(dialog).not.toHaveTextContent('First observed in game');
    expect(dialog).not.toHaveTextContent('Game version');
    expect(dialog).not.toHaveTextContent('Last verified');
    const technicalPanel = within(dialog)
      .getByRole('heading', { name: 'Evidence, Technical Details & Notes' })
      .closest('section');
    expect(technicalPanel).not.toBeNull();
    expect(within(technicalPanel as HTMLElement).getByLabelText(/personal notes/i)).toBeInTheDocument();

    const phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).not.toBeNull();
    expect(phantomCard).not.toHaveTextContent('Unlock requirement');
    expect(phantomCard).not.toHaveTextContent('Position requirement');
    expect(phantomCard).not.toHaveTextContent('Evidence');
    expect(phantomCard).toHaveTextContent('Plain summary');
    expect(phantomCard).toHaveTextContent('Reduces Damage Received');
    const verifiedWording = within(phantomCard as HTMLElement).getByText('Verified wording');
    expect(verifiedWording.closest('details')).not.toHaveAttribute('open');
    await user.click(verifiedWording);
    expect(verifiedWording.closest('details')).toHaveTextContent('reduce exactly one of Physical Damage Received, Tactical Damage Received, or Fire Damage Received');

    expect(within(dialog).getByText('Structured tags').closest('details')).not.toHaveAttribute('open');
    expect(within(dialog).queryByRole('heading', { name: 'Evidence & technical details' })).not.toBeInTheDocument();
  });

  it('renders newly detailed Nyrena ability cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Nyrena');
    const dragonCard = screen.getByRole('heading', { name: 'Nyrena' }).closest('article');
    expect(dragonCard).not.toBeNull();
    expect(dragonCard).toHaveTextContent('Rare');
    expect(dragonCard).toHaveTextContent('Champion');
    expect(dragonCard).toHaveTextContent('Verified');
    expect(dragonCard).not.toHaveTextContent('Metadata Only');
    expect(dragonCard).toHaveTextContent('View details');
    expect(dragonCard).toHaveTextContent('Add to roster');
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /nyrena/i });
    expect(dialog).toHaveTextContent('Undermine');
    expect(dialog).toHaveTextContent('Fire Damage');
    expect(dialog).toHaveTextContent('Tactical Damage');
    expect(dialog).toHaveTextContent('At a glance');
    expect(within(dialog).getAllByText('Plain summary').length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole('heading', { name: 'Evidence, Technical Details & Notes' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Abilities' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'What it does' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('checkbox', { name: /owned \/ hatched/i }));
    expect(within(dialog).getByRole('checkbox', { name: /owned \/ hatched/i })).toBeChecked();
  });

  it('renders Tessarion details with the new player-facing summary', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Tessarion');
    const dragonCard = screen.getByRole('heading', { name: 'Tessarion' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /tessarion/i });
    expect(dialog).toHaveTextContent('Cobalt Flame');
    expect(dialog).toHaveTextContent("Champion's Brilliance");
    expect(dialog).toHaveTextContent('At a glance');
    expect(dialog).toHaveTextContent('Fire Damage');
    expect(dialog).toHaveTextContent('Physical Damage');
    expect(dialog).toHaveTextContent('Fire Damage support');
    expect(dialog).toHaveTextContent('Intelligence support');
    expect(dialog).toHaveTextContent('Initiative support');
    expect(dialog).toHaveTextContent('Boosts Intelligence');
    expect(dialog).toHaveTextContent('Vanguard Trait');
  });

  it('renders Dragon Details ability cards with public labels and compact requirement badges', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Feskar');
    const dragonCard = screen.getByRole('heading', { name: 'Feskar' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /feskar/i });
    expect(within(dialog).getByRole('heading', { name: 'Abilities' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'What it does' })).not.toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('Placement notes');

    const calculatedAssault = within(dialog).getByRole('heading', { name: 'Calculated Assault' }).closest('article');
    expect(calculatedAssault).not.toBeNull();
    expect(calculatedAssault).toHaveTextContent('Command');
    expect(calculatedAssault).not.toHaveTextContent('Unlock requirement');
    expect(calculatedAssault).not.toHaveTextContent('Position requirement');
    expect(calculatedAssault).not.toHaveTextContent('Evidence');
    expect(calculatedAssault).not.toHaveTextContent('Unlocked or available');
    expect(calculatedAssault).not.toHaveTextContent('Level 16+');
    expect(calculatedAssault).not.toHaveTextContent('★');

    const championsBrilliance = within(dialog).getByRole('heading', { name: "Champion's Brilliance" }).closest('article');
    expect(championsBrilliance).not.toBeNull();
    expect(championsBrilliance).toHaveTextContent('Vanguard Trait');
    expect(championsBrilliance).not.toHaveTextContent(/^Trait$/);
    expect(championsBrilliance).toHaveTextContent('Level 16+');
    expect(championsBrilliance).not.toHaveTextContent('Position requirement');
    expect(championsBrilliance).not.toHaveTextContent('Unlock requirement');
    expect(championsBrilliance).not.toHaveTextContent('Evidence');
    const championsBrillianceWording = within(championsBrilliance as HTMLElement).getByText('Verified wording');
    await user.click(championsBrillianceWording);
    expect(championsBrilliance as HTMLElement).toHaveTextContent('At Level 16+ and deployed in Vanguard');

    const resilientBond = within(dialog).getByRole('heading', { name: 'Resilient Bond' }).closest('article');
    const insightfulAllies = within(dialog).getByRole('heading', { name: 'Insightful Allies' }).closest('article');
    const emeraldInferno = within(dialog).getByRole('heading', { name: 'Emerald Inferno' }).closest('article');
    const quickWitted = within(dialog).getByRole('heading', { name: 'Quick-Witted' }).closest('article');
    const unyieldingGrasp = within(dialog).getByRole('heading', { name: 'Unyielding Grasp' }).closest('article');
    expect(resilientBond).not.toBeNull();
    expect(insightfulAllies).not.toBeNull();
    expect(emeraldInferno).not.toBeNull();
    expect(quickWitted).not.toBeNull();
    expect(unyieldingGrasp).not.toBeNull();
    expect(resilientBond).toHaveTextContent('Habit');
    expect(resilientBond).toHaveTextContent('★ 2');
    expect(insightfulAllies).toHaveTextContent('Habit');
    expect(insightfulAllies).toHaveTextContent('★ 4');
    expect(emeraldInferno).toHaveTextContent('★ 6');
    expect(quickWitted).toHaveTextContent('★ 8');
    expect(unyieldingGrasp).toHaveTextContent('★ 10');
    expect(unyieldingGrasp).not.toHaveTextContent('Unlock requirement');
    expect(unyieldingGrasp).not.toHaveTextContent('Evidence');
    expect(unyieldingGrasp).toHaveTextContent('Applies Stagger.');
    expect(within(unyieldingGrasp as HTMLElement).getByText('Control')).toBeInTheDocument();
  });

  it('renders Dragon Details incoming and specific status synergy signals', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Vhagar');
    let dragonCard = screen.getByRole('heading', { name: 'Vhagar' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    let dialog = screen.getByRole('dialog', { name: /vhagar/i });
    const benefitsCard = within(dialog).getByRole('heading', { name: 'Benefits from' }).closest('article');
    expect(benefitsCard).not.toBeNull();
    expect(benefitsCard).toHaveTextContent('Burn');
    expect(benefitsCard).not.toHaveTextContent('No mapped incoming synergy yet.');
    expect(dialog).not.toHaveTextContent('Placement notes');

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Feskar');
    dragonCard = screen.getByRole('heading', { name: 'Feskar' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    dialog = screen.getByRole('dialog', { name: /feskar/i });
    const unyieldingGrasp = within(dialog).getByRole('heading', { name: 'Unyielding Grasp' }).closest('article');
    expect(unyieldingGrasp).not.toBeNull();
    expect(unyieldingGrasp).toHaveTextContent('Applies Stagger.');
    expect(unyieldingGrasp).not.toHaveTextContent('Applies Control.');
    expect(within(unyieldingGrasp as HTMLElement).getByText('Control')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Caraxes');
    dragonCard = screen.getByRole('heading', { name: 'Caraxes' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    dialog = screen.getByRole('dialog', { name: /caraxes/i });
    const caraxesProvides = within(dialog).getByRole('heading', { name: 'Provides' }).closest('article');
    const caraxesBenefits = within(dialog).getByRole('heading', { name: 'Benefits from' }).closest('article');
    expect(caraxesProvides).not.toBeNull();
    expect(caraxesBenefits).not.toBeNull();
    expect(caraxesProvides).toHaveTextContent('Slow');
    expect(caraxesProvides).not.toHaveTextContent('Control');
    expect(caraxesBenefits).toHaveTextContent('First-Strike');

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Shadowsong');
    dragonCard = screen.getByRole('heading', { name: 'Shadowsong' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    dialog = screen.getByRole('dialog', { name: /shadowsong/i });
    expect(dialog).toHaveTextContent('Burn');
    expect(dialog).toHaveTextContent('Vulnerable');
    expect(dialog).toHaveTextContent('Panic');
  });

  it('opens dragon details from My Roster and keeps ownership controls interactive', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 3;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    const syraxEditor = screen.getByRole('complementary', { name: 'Syrax' });
    await user.click(within(syraxEditor).getByRole('button', { name: /dragon details/i }));

    const dialog = screen.getByRole('dialog', { name: /syrax/i });
    expect(within(dialog).getByRole('checkbox', { name: /owned \/ hatched/i })).toBeChecked();
    expect(within(dialog).queryByLabelText(/collection state/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/^shards$/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/shards required/i)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/star rank/i)).toHaveValue('3');
    expect(within(dialog).getByLabelText(/dragon level/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/personal notes/i)).toBeInTheDocument();
  });

  it("renders Phantom's Veil as descriptive raw wording with saved Habit Level controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Daemoros');
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /daemoros/i });
    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '10');
    const phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).not.toBeNull();

    expect(phantomCard).not.toHaveTextContent('Unlocked or available');
    expect(phantomCard).not.toHaveTextContent('Saved Habit Level');
    expect(phantomCard).toHaveTextContent('Plain summary');
    expect(phantomCard).toHaveTextContent('Reduces Damage Received');
    const rawSummary = within(phantomCard as HTMLElement).getByText('Verified wording');
    await user.click(rawSummary);
    expect(rawSummary.closest('details')).toHaveTextContent('reduce exactly one of Physical Damage Received, Tactical Damage Received, or Fire Damage Received');
    expect(rawSummary.closest('details')).toHaveTextContent('does not state how the damage type is selected');
    expect(phantomCard).not.toHaveTextContent('Current selected value:');
    expect(phantomCard).not.toHaveTextContent('Mutually exclusive alternatives');
  });

  it("clears Phantom's Veil when it relocks and restarts it at Level 1", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Daemoros');
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /view details/i }));

    let dialog = screen.getByRole('dialog', { name: /daemoros/i });
    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '10');
    let phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).not.toBeNull();
    await user.selectOptions(within(phantomCard as HTMLElement).getByLabelText(/habit level/i), '3');

    expect(within(phantomCard as HTMLElement).getByLabelText(/habit level/i)).toHaveValue('3');
    expect(phantomCard).not.toHaveTextContent('Saved Habit Level');
    expect(phantomCard).not.toHaveTextContent('Current selected value:');

    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '1');
    phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).toHaveTextContent('Locked preview');
    expect(phantomCard).toHaveTextContent('Physical Damage Received, Tactical Damage Received, or Fire Damage Received');
    expect(within(phantomCard as HTMLElement).queryByLabelText(/habit level/i)).not.toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      roster?: Array<{ dragonId: string; habitLevels?: Record<string, unknown> }>;
    };
    expect(
      stored.roster?.find((entry) => entry.dragonId === 'daemoros')?.habitLevels?.['daemoros-phantoms-veil'],
    ).toBeUndefined();

    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '10');
    phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(within(phantomCard as HTMLElement).getByLabelText(/habit level/i)).toHaveValue('1');

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Vaeldra');
    const vaeldraCard = screen.getByRole('heading', { name: 'Vaeldra' }).closest('article');
    expect(vaeldraCard).not.toBeNull();
    await user.click(within(vaeldraCard as HTMLElement).getByRole('button', { name: /view details/i }));
    dialog = screen.getByRole('dialog', { name: /vaeldra/i });
    const sirensCallCard = within(dialog).getByRole('heading', { name: "Siren's Call" }).closest('article');
    expect(sirensCallCard).not.toBeNull();

    expect(sirensCallCard).toHaveTextContent('afflict Taunt on all Enemies');
    expect(sirensCallCard).toHaveTextContent('Enemies already afflicted with Taunt receive Stagger instead');
    expect(sirensCallCard).not.toHaveTextContent('Conditional branches');
  });

  it('shows raw verified command wording with preserved paragraphs and a safe fallback', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Feskar');
    const feskarCard = screen.getByRole('heading', { name: 'Feskar' }).closest('article');
    expect(feskarCard).not.toBeNull();
    await user.click(within(feskarCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /feskar/i });
    const commandCard = within(dialog).getByRole('heading', { name: 'Calculated Assault' }).closest('article');
    expect(commandCard).not.toBeNull();
    const rawSummary = within(commandCard as HTMLElement).getByText('Verified wording');
    expect(rawSummary.closest('details')).not.toHaveAttribute('open');
    await user.click(rawSummary);

    const rawContent = rawSummary.closest('details');
    expect(rawContent).not.toBeNull();
    expect(rawContent?.querySelectorAll('p').length).toBeGreaterThanOrEqual(1);
    expect(rawContent).toHaveTextContent('Each Round: 20% chance to reduce non-Basic Physical Damage Dealt');
    expect(rawContent).toHaveTextContent('Rounds 2, 4, 7, and 9');
    expect(rawContent).toHaveTextContent('At 6+ Stars, rounds 3, 5, 8, and 10');
    expect(rawContent).toHaveTextContent('multiply damage by 1.5 against each target afflicted with Burn');
    expect(rawContent).toHaveTextContent('all Enemies that deal non-Basic Physical Damage');

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Rhysarion');
    const rhysarionCard = screen.getByRole('heading', { name: 'Rhysarion' }).closest('article');
    expect(rhysarionCard).not.toBeNull();
    await user.click(within(rhysarionCard as HTMLElement).getByRole('button', { name: /view details/i }));
    let dragonDialog = screen.getByRole('dialog', { name: /rhysarion/i });
    let commandSection = within(dragonDialog).getByRole('heading', { name: 'Dawnsong' }).closest('article');
    expect(commandSection).not.toBeNull();
    const rhysarionSummary = within(commandSection as HTMLElement).getByText('Verified wording');
    await user.click(rhysarionSummary);
    let commandRaw = rhysarionSummary.closest('details');
    expect(commandRaw).not.toBeNull();
    expect(commandRaw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(1);
    expect(commandRaw).toHaveTextContent('Rounds 1, 4, and 7');
    expect(commandRaw).toHaveTextContent('Rounds 2, 5, and 8');
    expect(commandRaw).toHaveTextContent('Stun, Stagger, Overwhelm, or Confusion');
    expect(commandRaw).toHaveTextContent('At 6+ Stars on rounds 2, 5, and 8');
    expect(commandRaw).toHaveTextContent('60% Recovery Rate');

    await user.click(within(dragonDialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Shadowsong');
    const shadowsongCard = screen.getByRole('heading', { name: 'Shadowsong' }).closest('article');
    expect(shadowsongCard).not.toBeNull();
    await user.click(within(shadowsongCard as HTMLElement).getByRole('button', { name: /view details/i }));
    dragonDialog = screen.getByRole('dialog', { name: /shadowsong/i });
    commandSection = within(dragonDialog).getByRole('heading', { name: 'Breath of Fire' }).closest('article');
    expect(commandSection).not.toBeNull();
    const shadowsongSummary = within(commandSection as HTMLElement).getByText('Verified wording');
    await user.click(shadowsongSummary);
    commandRaw = shadowsongSummary.closest('details');
    expect(commandRaw).not.toBeNull();
    expect(commandRaw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(1);
    expect(commandRaw).toHaveTextContent('Rounds 2, 5, and 8');
    expect(commandRaw).toHaveTextContent('100% base Damage Rate');
    expect(commandRaw).toHaveTextContent('150%');
    expect(commandRaw).toHaveTextContent('At 10 Stars on rounds 2, 5, and 8');
    expect(commandRaw).toHaveTextContent("Blazing Conductor's first-target Damage Rate and Burn chance");
    expect(commandRaw).toHaveTextContent('different Enemy');
    expect(commandRaw).toHaveTextContent('Burn lasts two rounds and deals Fire Damage each round at a 20% Damage Rate');

    await user.click(within(dragonDialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));
    dragonDialog = screen.getByRole('dialog', { name: /syrax/i });
    commandSection = within(dragonDialog).getByRole('heading', { name: 'Blazing Fury' }).closest('article');
    expect(commandSection).not.toBeNull();
    const syraxSummary = within(commandSection as HTMLElement).getByText('Verified wording');
    await user.click(syraxSummary);
    commandRaw = syraxSummary.closest('details');
    expect(commandRaw).not.toBeNull();
    expect(commandRaw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(4);
    expect(commandRaw).toHaveTextContent('Each Round: 20% chance to increase Fire Damage Dealt by 10% and grant First-Strike to one Ally in any lane for 2 rounds, prioritizing Allies that deal Fire Damage.');
    expect(commandRaw).toHaveTextContent('Rounds 1, 4, 6, and 9: deal Tactical Damage to one Enemy within adjacency at a 110% Damage Rate.');
    expect(commandRaw).toHaveTextContent('Recovery is enhanced by Initiative, not Intelligence, and scales with Dragon Level.');
    expect(commandRaw).toHaveTextContent('Resistance reduces Damage Received by 20%.');

    const rendered = render(<RawWordingDisclosure rawText={null} />);
    expect(rendered.container).toBeEmptyDOMElement();
  });

  it('renders the complete command wording for Crimson, Sheepstealer, and Kalspire', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);

    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Crimson');
    let dragonCard = screen.getByRole('heading', { name: 'Crimson' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));
    let dialog = screen.getByRole('dialog', { name: /crimson/i });
    let commandCard = within(dialog).getByRole('heading', { name: 'Bloodscale Terror' }).closest('article');
    expect(commandCard).not.toBeNull();
    let rawToggle = within(commandCard as HTMLElement).getByText('Verified wording');
    await user.click(rawToggle);
    let raw = rawToggle.closest('details');
    expect(raw).not.toBeNull();
    expect(raw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(raw).toHaveTextContent('Round 1 Stun chance is increased to 40%');
    expect(raw).toHaveTextContent('other odd-numbered rounds retain the ordinary 20% chance');
    expect(raw).toHaveTextContent('one shared 50% activation chance');
    expect(raw).toHaveTextContent('Enemy with the highest Instinct');
    expect(raw).toHaveTextContent("Vermin's Bane's current Habit Level value");

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Sheepstealer');
    dragonCard = screen.getByRole('heading', { name: 'Sheepstealer' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));
    dialog = screen.getByRole('dialog', { name: /sheepstealer/i });
    commandCard = within(dialog).getByRole('heading', { name: 'Wild Hunt' }).closest('article');
    expect(commandCard).not.toBeNull();
    rawToggle = within(commandCard as HTMLElement).getByText('Verified wording');
    await user.click(rawToggle);
    raw = rawToggle.closest('details');
    expect(raw).not.toBeNull();
    expect(raw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(2);
    expect(raw).toHaveTextContent("when no Enemy is currently marked as Sheepstealer's Prey");
    expect(raw).toHaveTextContent('At 10 Stars, Each Round while Sheepstealer has a current Prey');
    expect(raw).toHaveTextContent('current Prey');
    expect(raw).toHaveTextContent('current Savage Claim Damage Rate');
    expect(raw).toHaveTextContent('current Savage Claim Recovery Rate');
    expect(raw).toHaveTextContent('Fire Damage 24%, tripled to 72%');
    expect(raw).toHaveTextContent('Recovery 10%, tripled to 30%');

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    await openAddDragon(user);
    await user.clear(screen.getByLabelText(/search by dragon name/i));
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Kalspire');
    dragonCard = screen.getByRole('heading', { name: 'Kalspire' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));
    dialog = screen.getByRole('dialog', { name: /kalspire/i });
    commandCard = within(dialog).getByRole('heading', { name: 'Tactical Strike' }).closest('article');
    expect(commandCard).not.toBeNull();
    rawToggle = within(commandCard as HTMLElement).getByText('Verified wording');
    await user.click(rawToggle);
    raw = rawToggle.closest('details');
    expect(raw).not.toBeNull();
    expect(raw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(raw).toHaveTextContent('After each Basic Attack, deal Tactical Damage to the original Basic Attack target at a 50% Damage Rate');
    expect(raw).toHaveTextContent('independently check a 30% Bleed chance');
    expect(raw).toHaveTextContent('At 6+ Stars');
    expect(raw).toHaveTextContent('deal Physical Damage to one Enemy within adjacency that was not the Basic Attack target at a 25% Damage Rate');
    expect(raw).toHaveTextContent('independently check a 15% Panic chance');
  });

  it('persists ownership and star rank after reload', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await openAddDragon(user);
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /add to roster/i }));
    const syraxEditor = screen.getByRole('complementary', { name: 'Syrax' });
    await user.selectOptions(within(syraxEditor).getByLabelText(/star rank/i), '3');

    firstRender.unmount();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    const reloadedEditor = screen.getByRole('complementary', { name: 'Syrax' });
    expect(within(reloadedEditor).getByLabelText(/Star Rank/i)).toHaveValue('3');
  });

  it('shows simplified ownership in the Add Dragon modal and keeps Add to roster wired to owned state', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    expect(daemorosCard).toHaveTextContent('Verified');
    expect(daemorosCard).not.toHaveTextContent('Community Verified');
    expect(daemorosCard).not.toHaveTextContent('In-game verified, pending official site');
    expect(daemorosCard).toHaveTextContent('View details');
    expect(daemorosCard).toHaveTextContent('Add to roster');
    expect(daemorosCard).not.toHaveTextContent('Collection:');
    expect(daemorosCard).not.toHaveTextContent('Hatched');
    expect(daemorosCard).not.toHaveTextContent('Not collected');
    expect(daemorosCard).not.toHaveTextContent('Not hatched');
    expect(daemorosCard).not.toHaveTextContent('Shards');

    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /add to roster/i }));
    expect(screen.queryByRole('dialog', { name: /add dragons to your roster/i })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Daemoros' })).toBeInTheDocument();
  });

  it('renders compact My Roster rows with one dedicated editor', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 4;
    roster.syrax!.reignLevel = 9;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    const syraxRow = screen.getByRole('button', { name: /^Syrax,/i });
    expect(syraxRow).toHaveAttribute('aria-current', 'true');
    expect(syraxRow).toHaveAccessibleName(/Star Rank 4/);
    expect(syraxRow).toHaveTextContent('Lv 9');
    expect(screen.getByRole('list', { name: /owned dragons/i }).querySelector('select, input, textarea')).not.toBeInTheDocument();
    const editor = screen.getByRole('complementary', { name: 'Syrax' });
    expect(within(editor).getByLabelText(/star rank/i)).toHaveValue('4');
    expect(within(editor).getByLabelText(/dragon level/i)).toHaveValue(9);
    expect(document.querySelectorAll('.roster-editor-form')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /export roster/i })).toBeInTheDocument();
    expect(screen.getByText(/import roster/i)).toBeInTheDocument();
  });

  it('shows the empty roster state with a visible add action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /^roster$/i }));

    expect(screen.getByText(/No dragons in your roster yet/i)).toBeInTheDocument();
    expect(screen.getByText(/start tracking Star Rank, Dragon Level, Habit Levels, notes, and formation options/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /\+ add dragon/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows verified public labels on newly detailed My Roster cards and keeps the roster controls visible', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.nyrena!.owned = true;
    roster.nyrena!.starRank = 2;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    const nyrenaRow = screen.getByRole('button', { name: /^Nyrena,/i });
    expect(nyrenaRow).toHaveAttribute('aria-current', 'true');
    const nyrenaEditor = screen.getByRole('complementary', { name: 'Nyrena' });
    expect(within(nyrenaEditor).getByLabelText(/star rank/i)).toHaveValue('2');
    expect(within(nyrenaEditor).getByLabelText(/dragon level/i)).toBeInTheDocument();
    await user.click(within(nyrenaEditor).getByRole('button', { name: /dragon details/i }));
    expect(screen.getByRole('dialog', { name: /nyrena/i })).toBeInTheDocument();
  });

  it('keeps public card verification labels simplified on Add Dragon and My Roster surfaces', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.nyrena!.owned = true;
    roster.nyrena!.starRank = 1;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await openAddDragon(user);
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    expect(daemorosCard).toHaveTextContent('Verified');
    expect(daemorosCard).not.toHaveTextContent('Community Verified');
    expect(daemorosCard).not.toHaveTextContent('Official Metadata Only');
    expect(daemorosCard).not.toHaveTextContent('In-game verified, pending official site');
    expect(daemorosCard).not.toHaveTextContent('Collection State');
    expect(daemorosCard).not.toHaveTextContent('Not hatched');
    expect(daemorosCard).not.toHaveTextContent('Not collected');
    expect(daemorosCard).not.toHaveTextContent('Shards');
    expect(daemorosCard).not.toHaveTextContent('Shards Required');

    await user.click(screen.getByRole('button', { name: /close add dragon/i }));
    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    const nyrenaRow = screen.getByRole('button', { name: /^Nyrena,/i });
    expect(nyrenaRow).not.toHaveTextContent('Metadata Only');
    expect(nyrenaRow).not.toHaveTextContent('Community Verified');
    expect(nyrenaRow).not.toHaveTextContent('Official Metadata Only');
    expect(nyrenaRow).not.toHaveTextContent('In-game verified, pending official site');
    expect(screen.getByRole('button', { name: /export roster/i })).toBeInTheDocument();
    expect(screen.getByText(/import roster/i)).toBeInTheDocument();
  });

  it('imports a simplified roster export and shows a success message', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 4;

    render(<App />);

    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    const importInput = screen.getByLabelText(/import roster/i);
    await user.upload(importInput, new File([serializeRosterExport(roster)], 'roster.json', { type: 'application/json' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Roster imported successfully.');
    expect(screen.getByRole('complementary', { name: 'Syrax' })).toBeInTheDocument();
  });

  it('keeps retired roster ownership wording out of rendered public roster UI', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    await user.click(screen.getByRole('button', { name: /view details/i }));
    await user.click(screen.getByRole('button', { name: /close details/i }));
    await user.click(screen.getByRole('link', { name: /^roster$/i }));

    expect(screen.queryByText('Collection State')).not.toBeInTheDocument();
    expect(screen.queryByText('Not hatched')).not.toBeInTheDocument();
    expect(screen.queryByText('Not collected')).not.toBeInTheDocument();
    expect(screen.queryByText('Shards Required')).not.toBeInTheDocument();
  });

  it('keeps retired public navigation and roster copy out of the rendered app UI', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /primary sections/i });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Overview',
      'Roster',
      'Formations',
      'Optimizer',
      'About',
    ]);
    expect(within(nav).queryByRole('link', { name: /dragon database/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: /data status/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Collection State')).not.toBeInTheDocument();
    expect(screen.queryByText('Shards')).not.toBeInTheDocument();
    expect(screen.queryByText('Shards Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Not hatched')).not.toBeInTheDocument();
    expect(screen.queryByText('Not collected')).not.toBeInTheDocument();
  });

  it('renders the three named formation positions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /^formations$/i }));

    expect(screen.getByText('Left Flank')).toBeInTheDocument();
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Right Flank')).toBeInTheDocument();
  });

  it('shows About support without duplicating the footer support action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /^about$/i }));

    const aboutSupportLink = screen.getByRole('link', { name: /buy me a dragon/i });
    expect(aboutSupportLink).toHaveAttribute('href', 'https://buymeacoffee.com/williamchildres');
    expect(aboutSupportLink).toHaveAttribute('target', '_blank');
    expect(aboutSupportLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(aboutSupportLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    expect(aboutSupportLink).not.toHaveTextContent(/\?\?|�/);
    expect(within(screen.getByRole('contentinfo')).queryByRole('link', { name: /support the project/i })).not.toBeInTheDocument();
  });

  it('keeps Dragon Details at-a-glance chips on compact wrapping classes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Vhagar');
    const dragonCard = screen.getByRole('heading', { name: 'Vhagar' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /vhagar/i });
    const benefitsCard = within(dialog).getByRole('heading', { name: 'Benefits from' }).closest('article');
    expect(benefitsCard?.querySelector('ul')).toHaveClass('chip-list');
    expect(benefitsCard?.querySelector('li')).toHaveClass('chip');

    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toContain('.at-a-glance-grid');
    expect(css).toContain('align-items: start');
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('width: fit-content');
    expect(css).toContain('.requirement-badge');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toContain('z-index: 5');
    expect(css).toContain('var(--panel-strong)');
  });


});
