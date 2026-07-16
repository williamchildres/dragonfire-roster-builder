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
    expect(index).toContain('<link rel="canonical" href="https://dragonfirelab.com" />');
    expect(index).toContain('<meta property="og:site_name" content="Dragonfire Lab" />');
    expect(index).toContain('<meta property="og:url" content="https://dragonfirelab.com" />');
    expect(index).toContain('local-first unofficial Dragonfire roster and formation planning tool');
  });

  async function openAddDragon(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    await user.click(screen.getAllByRole('button', { name: /\+ add dragon/i })[0]!);
  }

  it('renders unowned dragons through the add dragon modal and supports search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    expect(screen.getByText(/showing 31 of 31 dragons/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    expect(screen.getByText(/showing 1 of 31 dragons/i)).toBeInTheDocument();
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

    await user.selectOptions(screen.getByLabelText(/^rarity$/i), 'Rare');
    expect(screen.getByRole('heading', { name: 'Solstryker' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Syrax' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^breed$/i), 'Champion');
    expect(screen.getByRole('heading', { name: 'Solstryker' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shimmer' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^verification$/i), 'official-metadata-only');
    expect(screen.getByRole('heading', { name: 'Nyrena' })).toBeInTheDocument();
    const nyrenaRow = screen.getByRole('heading', { name: 'Nyrena' }).closest('article');
    expect(nyrenaRow).not.toBeNull();
    expect(within(nyrenaRow as HTMLElement).getByText(/ability details not verified/i)).toBeInTheDocument();
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
    expect(within(screen.getByRole('dialog', { name: /add dragons to your roster/i })).queryByRole('heading', { name: 'Syrax' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close add dragon/i }));

    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    expect(within(syraxCard as HTMLElement).getByLabelText(/star rank/i)).toHaveValue('5');
    expect(within(syraxCard as HTMLElement).getByLabelText(/reign level/i)).toHaveValue(12);
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));
    expect(screen.getByLabelText(/personal notes/i)).toHaveValue('Keep with fire support.');
  });

  it('auto-dismisses and refreshes the roster success banner for the latest dragon', () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: /^my roster$/i }));
      fireEvent.click(screen.getAllByRole('button', { name: /\+ add dragon/i })[0]!);
      fireEvent.change(screen.getByLabelText(/search by dragon name/i), { target: { value: 'Feskar' } });
      fireEvent.click(screen.getByRole('button', { name: /add to roster/i }));

      expect(screen.getByText('Added Feskar to roster.')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close add dragon/i }));
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

    await user.click(screen.getByRole('button', { name: /overview/i }));
    expect(screen.queryByText(/Added Feskar to roster\./i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('navigation', { name: /primary sections/i }).querySelectorAll('button')[2]!);
    expect(screen.queryByText(/Added Feskar to roster\./i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.queryByText(/Added Feskar to roster\./i)).not.toBeInTheDocument();
  });

  it('renders the polished Overview landing content and About copy', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /dragonfire lab dragon emblem/i })).toBeInTheDocument();
    expect(screen.queryByText(/local-first formation planning/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: /plan stronger dragonfire formations from verified dragon data/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /build my roster/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open formation builder/i })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Track Your Roster' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Build Formations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Understand Formation Ratings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /track your roster/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /build formations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /understand formation ratings/i })).toBeInTheDocument();
    expect(screen.getByText(/compare explainable ratings/i)).toBeInTheDocument();
    expect(screen.getByText(/realized synergy, support usefulness, Kit Utilization/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Compare Verified Dragons' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /compare verified dragons/i })).not.toBeInTheDocument();

    expect(screen.getByText(/28 \/ 31 dragons mapped/i)).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Profile coverage' })).toBeInTheDocument();
    expect(screen.getByLabelText('Coverage by rarity')).toBeInTheDocument();
    expect(screen.getByLabelText('Coverage by rarity counts')).toBeInTheDocument();
    expect(screen.getByText('Legendary')).toBeInTheDocument();
    expect(screen.getByText('Epic')).toBeInTheDocument();
    expect(screen.getByText('Rare')).toBeInTheDocument();
    expect(screen.getByText('9 / 9 mapped')).toBeInTheDocument();
    expect(screen.getByText('10 / 10 mapped')).toBeInTheDocument();
    expect(screen.getByText('9 / 12 mapped')).toBeInTheDocument();
    expect(document.querySelectorAll('.coverage-marker')).toHaveLength(3);
    expect(document.querySelector('.coverage-marker.rarity-legendary')).toBeInTheDocument();
    expect(document.querySelector('.coverage-marker.rarity-epic')).toBeInTheDocument();
    expect(document.querySelector('.coverage-marker.rarity-rare')).toBeInTheDocument();
    expect(screen.getByText('Legendary and Epic profiles are fully mapped. Rare mapping is underway.')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Detailed profile coverage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Legendary coverage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Epic coverage' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rare coverage' })).not.toBeInTheDocument();

    const latestUpdate = screen.getByRole('heading', { name: /latest release — v0\.6\.7/i }).closest('.latest-update-panel');
    expect(latestUpdate).not.toBeNull();
    expect(latestUpdate).toHaveTextContent('Bevlorin, Shadowrend, and Thunderstrike added with verified ability data and curated profiles.');

    expect(screen.getByText(/No login is required\./i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Private by design' })).toBeInTheDocument();
    expect(screen.getByText(/Your roster stays in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/does not use private game APIs/i)).toBeInTheDocument();
    expect(screen.getByText(/Dragonfire Lab is an unofficial community tool/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.queryByText('Dragonfire Roster Lab')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What Dragonfire Lab does' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Privacy and local storage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Community data and contributions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unofficial and open source' })).toBeInTheDocument();
    expect(screen.getByText(/Compare explainable Formation Ratings/i)).toBeInTheDocument();
    expect(screen.getByText(/active synergy, Kit Utilization, and placement risks/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Ability and profile updates require sourced community evidence/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/No login is required\./i)).toBeInTheDocument();
    expect(screen.getByText(/does not use private game APIs/i)).toBeInTheDocument();
    expect(screen.getByText(/Your roster and notes stay in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/Issues and contributions can be used for sourced corrections/i)).toBeInTheDocument();
    expect(screen.getByText(/Never submit credentials/i)).toBeInTheDocument();
  });

  it('navigates from the Overview feature cards to the matching public pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /track your roster/i }));
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /overview/i }));
    await user.click(screen.getByRole('button', { name: /build formations/i }));
    expect(screen.getByRole('heading', { name: 'Formation Builder' })).toBeInTheDocument();
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
    expect(within(detailsHeader as HTMLElement).getByLabelText(/reign level/i)).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Owned / Hatched');
    expect(dialog).not.toHaveTextContent('Collection State');
    expect(dialog).not.toHaveTextContent('Shards');
    expect(dialog).not.toHaveTextContent('Shards Required');
    expect(dialog).toHaveTextContent('Star Rank');
    expect(dialog).toHaveTextContent('Reign Level');
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
    expect(verifiedWording.closest('details')).toHaveTextContent('reduce exactly one of Physical, Tactical, or Fire Damage Received');

    expect(within(dialog).getByText('Structured tags').closest('details')).not.toHaveAttribute('open');
    expect(within(dialog).queryByRole('heading', { name: 'Evidence & technical details' })).not.toBeInTheDocument();
  });

  it('renders metadata-only dragon details without broken ability cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Nyrena');
    const dragonCard = screen.getByRole('heading', { name: 'Nyrena' }).closest('article');
    expect(dragonCard).not.toBeNull();
    expect(dragonCard).toHaveTextContent('Rare');
    expect(dragonCard).toHaveTextContent('Champion');
    expect(dragonCard).toHaveTextContent('Metadata Only');
    expect(dragonCard).not.toHaveTextContent('Official Metadata Only');
    expect(dragonCard).toHaveTextContent('Ability details not verified');
    expect(dragonCard).toHaveTextContent('View details');
    expect(dragonCard).toHaveTextContent('Add to roster');
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /nyrena/i });
    expect(dialog).toHaveTextContent('Metadata-only record. Ability details not verified.');
    expect(dialog).toHaveTextContent('At a glance');
    expect(dialog).toHaveTextContent('No formation-wide output profile recorded.');
    expect(dialog).toHaveTextContent('No mapped incoming synergy yet.');
    expect(dialog).not.toHaveTextContent('Placement notes');
    expect(dialog).not.toHaveTextContent('No special placement requirement recorded.');
    expect(within(dialog).queryByText('Plain summary')).toBeNull();
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
    expect(caraxesProvides).toHaveTextContent('Control');
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

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /syrax/i });
    expect(within(dialog).getByRole('checkbox', { name: /owned \/ hatched/i })).toBeChecked();
    expect(within(dialog).queryByLabelText(/collection state/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/^shards$/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/shards required/i)).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/star rank/i)).toHaveValue('3');
    expect(within(dialog).getByLabelText(/reign level/i)).toBeInTheDocument();
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
    expect(rawSummary.closest('details')).toHaveTextContent('reduce exactly one of Physical, Tactical, or Fire Damage Received');
    expect(rawSummary.closest('details')).toHaveTextContent('Selection method is not stated');
    expect(phantomCard).not.toHaveTextContent('Current selected value:');
    expect(phantomCard).not.toHaveTextContent('Mutually exclusive alternatives');
  });

  it("persists Phantom's Veil Habit Level separately from Star Rank locking", async () => {
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
    await user.selectOptions(within(phantomCard as HTMLElement).getByLabelText(/habit level/i), '');
    phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).toHaveTextContent('Locked preview');
    expect(phantomCard).toHaveTextContent('Physical, Tactical, or Fire Damage Received');

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      roster?: Array<{ dragonId: string; habitLevels?: Record<string, unknown> }>;
    };
    expect(
      stored.roster?.find((entry) => entry.dragonId === 'daemoros')?.habitLevels?.['daemoros-phantoms-veil'],
    ).toBeNull();

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

    expect(sirensCallCard).toHaveTextContent('apply Taunt to each non-Taunted enemy');
    expect(sirensCallCard).toHaveTextContent('Stagger to each already Taunted enemy');
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
    expect(rawContent?.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(rawContent).toHaveTextContent('Each Round: 20% chance');
    expect(rawContent).toHaveTextContent('Rounds 2, 4, 7, and 9');
    expect(rawContent).toHaveTextContent('At 6+ Stars:');
    expect(rawContent).toHaveTextContent('This damage is increased by 1.5x against targets afflicted with Burn, increasing the Damage Rate to 60%.');
    expect(rawContent).toHaveTextContent('Deal Fire Damage to all enemies that deal Physical Damage, excluding Basic Attacks, at a 40% Damage Rate.');

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
    expect(commandRaw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(commandRaw).toHaveTextContent('Rounds 1, 4, and 7');
    expect(commandRaw).toHaveTextContent('Rounds 2, 5, and 8');
    expect(commandRaw).toHaveTextContent('Stun, Stagger, Overwhelm, and Confusion');
    expect(commandRaw).toHaveTextContent('At 6+ Stars:');
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
    expect(commandRaw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(commandRaw).toHaveTextContent('Rounds 2, 5, and 8');
    expect(commandRaw).toHaveTextContent('100% Damage Rate');
    expect(commandRaw).toHaveTextContent('150%');
    expect(commandRaw).toHaveTextContent('At 10 Stars:');
    expect(commandRaw).toHaveTextContent('60% Damage Rate');
    expect(commandRaw).toHaveTextContent('40% chance');
    expect(commandRaw).toHaveTextContent('different enemy');
    expect(commandRaw).toHaveTextContent('20% chance');
    expect(commandRaw).toHaveTextContent('Burn deals Fire Damage to the target each round.');
    expect(commandRaw).toHaveTextContent('2 rounds');

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
    expect(commandRaw).toHaveTextContent('Rounds 1, 4, 6, and 9: deal Tactical Damage to one enemy within adjacency at a 110% Damage Rate.');
    expect(commandRaw).toHaveTextContent('At 6+ Stars:');
    expect(commandRaw).toHaveTextContent('Rounds 2, 5, and 8: apply Recovery to the Ally with the least current troops at a 50% Recovery Rate, enhanced by Intelligence.');
    expect(commandRaw).toHaveTextContent('Resistance applies to the same selected Ally.');
    expect(commandRaw).toHaveTextContent('Resistance has a 40% activation chance at effective Habit Level 1 and lasts 2 rounds.');

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
    expect(raw).toHaveTextContent('Round 1: 40% chance to Stun one enemy in any lane for 2 rounds.');
    expect(raw).toHaveTextContent('Other odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds.');
    expect(raw).toHaveTextContent('one shared 50% activation roll');
    expect(raw).toHaveTextContent('highest-Instinct enemy');
    expect(raw).toHaveTextContent('12% for 2 rounds');

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
    expect(raw?.querySelectorAll('p').length).toBeGreaterThanOrEqual(3);
    expect(raw).toHaveTextContent('Each Round: if no enemy is currently marked as Prey, 40% chance to apply Prey.');
    expect(raw).toHaveTextContent('At 10 Stars:');
    expect(raw).toHaveTextContent('current Prey');
    expect(raw).toHaveTextContent('24% rate');
    expect(raw).toHaveTextContent('10% rate');
    expect(raw).toHaveTextContent('72% Fire Damage');
    expect(raw).toHaveTextContent('30% Recovery');

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
    expect(raw).toHaveTextContent('After each Basic Attack: deal Tactical Damage to the original Basic Attack target at a 50% Damage Rate');
    expect(raw).toHaveTextContent('Then independently attempt Bleed at a 30% chance');
    expect(raw).toHaveTextContent('At 6+ Stars:');
    expect(raw).toHaveTextContent('deal Physical Damage at a 25% rate');
    expect(raw).toHaveTextContent('Then independently attempt Panic at a 15% chance');
  });

  it('persists ownership and star rank after reload', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await openAddDragon(user);
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /add to roster/i }));
    await user.click(screen.getByRole('button', { name: /close add dragon/i }));
    const rosterSyraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(rosterSyraxCard).not.toBeNull();
    await user.click(within(rosterSyraxCard as HTMLElement).getByRole('button', { name: /view details/i }));
    const syraxDialog = screen.getByRole('dialog', { name: /syrax/i });
    await user.selectOptions(within(syraxDialog).getByLabelText(/star rank/i), '3');
    await user.click(screen.getByRole('button', { name: /close details/i }));

    firstRender.unmount();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /my roster/i })[0]!);
    expect(screen.getByRole('heading', { name: 'Syrax' })).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
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
    expect(within(screen.getByRole('dialog', { name: /add dragons to your roster/i })).queryByRole('heading', { name: 'Daemoros' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close add dragon/i }));

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    expect(screen.getByRole('heading', { name: 'Daemoros' })).toBeInTheDocument();
  });

  it('renders compact My Roster cards without collection or shard controls', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 4;
    roster.syrax!.reignLevel = 9;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    expect(syraxCard).toHaveTextContent('Verified');
    expect(syraxCard).not.toHaveTextContent('Community Verified');
    expect(syraxCard).not.toHaveTextContent('In-game verified, pending official site');
    expect(syraxCard).toHaveTextContent('Owned / Hatched');
    expect(syraxCard).toHaveTextContent('View details');
    expect(within(syraxCard as HTMLElement).getByRole('checkbox', { name: /owned \/ hatched/i })).toBeChecked();
    expect(within(syraxCard as HTMLElement).queryByRole('checkbox', { name: /my roster/i })).not.toBeInTheDocument();
    expect(within(syraxCard as HTMLElement).getByLabelText(/star rank/i)).toHaveValue('4');
    expect(within(syraxCard as HTMLElement).getByLabelText(/reign level/i)).toHaveValue(9);
    expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument();
    expect(screen.getByText(/import json/i)).toBeInTheDocument();
  });

  it('shows the empty roster state with a visible add action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));

    expect(screen.getByText(/No dragons in your roster yet/i)).toBeInTheDocument();
    expect(screen.getByText(/start tracking Star Rank, Reign Level, and formation options/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /\+ add dragon/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows metadata-only public labels on My Roster cards and keeps the roster controls visible', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.nyrena!.owned = true;
    roster.nyrena!.starRank = 2;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const nyrenaCard = screen.getByRole('heading', { name: 'Nyrena' }).closest('article');
    expect(nyrenaCard).not.toBeNull();
    expect(nyrenaCard).toHaveTextContent('Metadata Only');
    expect(nyrenaCard).not.toHaveTextContent('Official Metadata Only');
    expect(nyrenaCard).toHaveTextContent('Ability details not verified');
    expect(nyrenaCard).toHaveTextContent('Owned / Hatched');
    expect(nyrenaCard).toHaveTextContent('View details');
    expect(within(nyrenaCard as HTMLElement).getByRole('checkbox', { name: /owned \/ hatched/i })).toBeChecked();
    expect(within(nyrenaCard as HTMLElement).getByLabelText(/star rank/i)).toHaveValue('2');
    expect(within(nyrenaCard as HTMLElement).getByLabelText(/reign level/i)).toBeInTheDocument();
    await user.click(within(nyrenaCard as HTMLElement).getByRole('button', { name: /view details/i }));
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
    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const nyrenaCard = screen.getByRole('heading', { name: 'Nyrena' }).closest('article');
    expect(nyrenaCard).not.toBeNull();
    expect(nyrenaCard).toHaveTextContent('Metadata Only');
    expect(nyrenaCard).not.toHaveTextContent('Community Verified');
    expect(nyrenaCard).not.toHaveTextContent('Official Metadata Only');
    expect(nyrenaCard).not.toHaveTextContent('In-game verified, pending official site');
    expect(nyrenaCard).not.toHaveTextContent('Collection State');
    expect(nyrenaCard).not.toHaveTextContent('Not hatched');
    expect(nyrenaCard).not.toHaveTextContent('Not collected');
    expect(nyrenaCard).not.toHaveTextContent('Shards');
    expect(nyrenaCard).not.toHaveTextContent('Shards Required');
    expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument();
    expect(screen.getByText(/import json/i)).toBeInTheDocument();
  });

  it('imports a simplified roster export and shows a success message', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.starRank = 4;

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const importInput = screen.getByLabelText(/import json/i);
    await user.upload(importInput, new File([serializeRosterExport(roster)], 'roster.json', { type: 'application/json' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Roster imported successfully.');
    expect(screen.getByRole('heading', { name: 'Syrax' })).toBeInTheDocument();
  });

  it('keeps retired roster ownership wording out of rendered public roster UI', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openAddDragon(user);
    await user.type(screen.getByLabelText(/search by dragon name/i), 'Syrax');
    await user.click(screen.getByRole('button', { name: /view details/i }));
    await user.click(screen.getByRole('button', { name: /close details/i }));
    await user.click(screen.getByRole('button', { name: /^my roster$/i }));

    expect(screen.queryByText('Collection State')).not.toBeInTheDocument();
    expect(screen.queryByText('Not hatched')).not.toBeInTheDocument();
    expect(screen.queryByText('Not collected')).not.toBeInTheDocument();
    expect(screen.queryByText('Shards Required')).not.toBeInTheDocument();
  });

  it('keeps retired public navigation and roster copy out of the rendered app UI', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /primary sections/i });
    expect(within(nav).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Overview',
      'My Roster',
      'Formation Builder',
      'About',
    ]);
    expect(within(nav).queryByRole('button', { name: /dragon database/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /data status/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Collection State')).not.toBeInTheDocument();
    expect(screen.queryByText('Shards')).not.toBeInTheDocument();
    expect(screen.queryByText('Shards Required')).not.toBeInTheDocument();
    expect(screen.queryByText('Not hatched')).not.toBeInTheDocument();
    expect(screen.queryByText('Not collected')).not.toBeInTheDocument();
  });

  it('renders the three named formation positions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);

    expect(screen.getByText('Left Flank')).toBeInTheDocument();
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Right Flank')).toBeInTheDocument();
  });

  it('shows About support without duplicating the footer support action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /about/i }));

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
