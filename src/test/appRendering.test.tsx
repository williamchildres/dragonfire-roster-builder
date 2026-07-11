import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, RawWordingDisclosure } from '../app/App';
import { dragons } from '../data/dragons';
import { createEmptyRoster, saveRoster, STORAGE_KEY } from '../services/rosterStorage';


describe('Dragonfire Roster Lab app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders all dragons through the database and supports search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    expect(screen.getByText(/showing 31 of 31 dragons/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search by name/i), 'Syrax');
    expect(screen.getByText(/showing 1 of 31 dragons/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Syrax' })).toBeInTheDocument();
  });

  it('renders the polished Overview landing content and About copy', async () => {
    const user = userEvent.setup();
    const detailedAbilityCount = dragons.filter((dragon) => dragon.command && dragon.trait && dragon.habits.length > 0).length;
    const rarityCounts = dragons.reduce<Record<string, number>>((counts, dragon) => {
      counts[dragon.rarity] = (counts[dragon.rarity] ?? 0) + 1;
      return counts;
    }, {});
    const breedCounts = dragons.reduce<Record<string, number>>((counts, dragon) => {
      counts[dragon.breed] = (counts[dragon.breed] ?? 0) + 1;
      return counts;
    }, {});

    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /plan stronger dragonfire formations from verified dragon data/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /dragonfire roster lab dragon emblem/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse dragons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open formation builder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update my roster/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Track Your Roster' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compare Verified Dragons' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Build Formations' })).toBeInTheDocument();

    expect(screen.getByText('Detailed profile coverage')).toBeInTheDocument();
    expect(screen.getByText(/19 \/ 31 dragons mapped/i)).toBeInTheDocument();
    expect(screen.getByText('61%')).toBeInTheDocument();

    const databaseCoverage = screen.getByRole('heading', { name: 'Database Coverage' }).closest('.overview-stat-group');
    expect(databaseCoverage).not.toBeNull();
    expect(within(databaseCoverage as HTMLElement).getByText('Known dragons').closest('.stat-card')).toHaveTextContent('31');
    expect(within(databaseCoverage as HTMLElement).getByText('Detailed ability records').closest('.stat-card')).toHaveTextContent(String(detailedAbilityCount));
    expect(within(databaseCoverage as HTMLElement).getByText('Curated simple profiles').closest('.stat-card')).toHaveTextContent('19');
    expect(within(databaseCoverage as HTMLElement).getByText('Metadata-only dragons').closest('.stat-card')).toHaveTextContent('12');

    const rosterBreakdown = screen.getByRole('heading', { name: 'Roster Breakdown' }).closest('.overview-stat-group');
    expect(rosterBreakdown).not.toBeNull();
    expect(within(rosterBreakdown as HTMLElement).getByText('Legendary').closest('.stat-card')).toHaveTextContent(String(rarityCounts.Legendary));
    expect(within(rosterBreakdown as HTMLElement).getByText('Epic').closest('.stat-card')).toHaveTextContent(String(rarityCounts.Epic));
    expect(within(rosterBreakdown as HTMLElement).getByText('Rare').closest('.stat-card')).toHaveTextContent(String(rarityCounts.Rare));

    const roleBreakdown = screen.getByRole('heading', { name: 'Role Breakdown' }).closest('.overview-stat-group');
    expect(roleBreakdown).not.toBeNull();
    expect(within(roleBreakdown as HTMLElement).getByText('Champion').closest('.stat-card')).toHaveTextContent(String(breedCounts.Champion));
    expect(within(roleBreakdown as HTMLElement).getByText('Hunter').closest('.stat-card')).toHaveTextContent(String(breedCounts.Hunter));
    expect(within(roleBreakdown as HTMLElement).getByText('Sentinel').closest('.stat-card')).toHaveTextContent(String(breedCounts.Sentinel));
    expect(within(roleBreakdown as HTMLElement).getByText('Warrior').closest('.stat-card')).toHaveTextContent(String(breedCounts.Warrior));

    const latestUpdate = screen.getByRole('heading', { name: /latest update - v0\.6\.4/i }).closest('.latest-update-panel');
    expect(latestUpdate).not.toBeNull();
    expect(latestUpdate).toHaveTextContent('Tessarion added with verified ability wording and a curated synergy profile.');

    expect(screen.getByText(/No login required\./i)).toBeInTheDocument();
    expect(screen.getByText(/stored locally in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/does not use private game APIs/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(
      screen.getByText(/Ability evidence and curated profile updates require sourced community submissions/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Combat data will require sourced community submissions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/should never submit account credentials/i)).toBeInTheDocument();
  });

  it('displays unknown combat values as Not yet verified', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /syrax/i });
    expect(within(dialog).getAllByText('Not yet verified').length).toBeGreaterThan(4);
  });

  it('renders the polished Daemoros details layout with at-a-glance summary and ownership controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Daemoros');
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /daemoros/i });
    expect(dialog).toHaveTextContent('Daemoros');
    expect(dialog).toHaveTextContent('Epic');
    expect(dialog).toHaveTextContent('Warrior');
    expect(dialog).toHaveTextContent('Community Verified');
    expect(dialog).toHaveTextContent('At a glance');
    expect(dialog).toHaveTextContent('Provides');
    expect(dialog).toHaveTextContent('Benefits from');
    expect(dialog).toHaveTextContent('Placement notes');
    expect(dialog).toHaveTextContent('Panic');
    expect(dialog).toHaveTextContent('Burn');
    expect(dialog).toHaveTextContent('Physical Damage');
    expect(dialog).toHaveTextContent('Vanguard trait');
    expect(dialog).toHaveTextContent('Shadowflame');
    expect(dialog).toHaveTextContent("Warrior's Zeal");
    expect(dialog).toHaveTextContent('Instill Fear');
    expect(dialog).toHaveTextContent('Powerful Reflexes');
    expect(dialog).toHaveTextContent('Shroud of Shadows');
    expect(dialog).toHaveTextContent('Darkening Fear');
    expect(dialog).toHaveTextContent("Phantom's Veil");
    expect(dialog).toHaveTextContent('Owned');
    expect(dialog).toHaveTextContent('Collection State');
    expect(dialog).toHaveTextContent('Star Rank');
    expect(dialog).toHaveTextContent('Reign Level');
    expect(dialog).toHaveTextContent('Personal notes');

    const phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).not.toBeNull();
    expect(phantomCard).toHaveTextContent('Plain summary');
    expect(phantomCard).toHaveTextContent('Reduces Damage Received');
    const verifiedWording = within(phantomCard as HTMLElement).getByText('Verified wording');
    expect(verifiedWording.closest('details')).not.toHaveAttribute('open');
    await user.click(verifiedWording);
    expect(verifiedWording.closest('details')).toHaveTextContent('reduce exactly one of Physical, Tactical, or Fire Damage Received');

    expect(within(dialog).getByText('Structured tags').closest('details')).not.toHaveAttribute('open');
    expect(within(dialog).getByRole('heading', { name: 'Evidence & technical details' })).toBeInTheDocument();
  });

  it('renders metadata-only dragon details without broken ability cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Solstryker');
    const dragonCard = screen.getByRole('heading', { name: 'Solstryker' }).closest('article');
    expect(dragonCard).not.toBeNull();
    await user.click(within(dragonCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /solstryker/i });
    expect(dialog).toHaveTextContent('Metadata-only record. Ability details not yet verified.');
    expect(dialog).toHaveTextContent('At a glance');
    expect(dialog).toHaveTextContent('No formation-wide output profile recorded.');
    expect(dialog).toHaveTextContent('No specific benefit profile recorded.');
    expect(dialog).toHaveTextContent('No special placement requirement recorded.');
    expect(within(dialog).queryByText('Plain summary')).toBeNull();
    expect(within(dialog).queryByRole('heading', { name: 'Evidence & technical details' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'What it does' })).toBeInTheDocument();
  });

  it('renders Tessarion details with the new player-facing summary', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Tessarion');
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
    expect(dialog).toHaveTextContent('Boosts Intelligence');
    expect(dialog).toHaveTextContent('Vanguard trait');
  });

  it('opens dragon details from My Roster and keeps ownership controls interactive', async () => {
    const user = userEvent.setup();
    const roster = createEmptyRoster(dragons);
    roster.syrax!.owned = true;
    roster.syrax!.collection.state = 'hatched';
    roster.syrax!.starRank = 3;
    saveRoster(window.localStorage, roster);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /syrax/i });
    expect(within(dialog).getByRole('checkbox', { name: /owned/i })).toBeChecked();
    expect(within(dialog).getByLabelText(/collection state/i)).toHaveValue('hatched');
    expect(within(dialog).getByLabelText(/star rank/i)).toHaveValue('3');
    expect(within(dialog).getByLabelText(/reign level/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/personal notes/i)).toBeInTheDocument();
  });

  it("renders Phantom's Veil as descriptive raw wording with saved Habit Level controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Daemoros');
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /view details/i }));

    const dialog = screen.getByRole('dialog', { name: /daemoros/i });
    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '10');
    const phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).not.toBeNull();

    expect(phantomCard).toHaveTextContent('Unlocked or available');
    expect(phantomCard).toHaveTextContent('Saved Habit LevelNot recorded');
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

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Daemoros');
    const daemorosCard = screen.getByRole('heading', { name: 'Daemoros' }).closest('article');
    expect(daemorosCard).not.toBeNull();
    await user.click(within(daemorosCard as HTMLElement).getByRole('button', { name: /view details/i }));

    let dialog = screen.getByRole('dialog', { name: /daemoros/i });
    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '10');
    let phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).not.toBeNull();
    await user.selectOptions(within(phantomCard as HTMLElement).getByLabelText(/habit level/i), '3');

    expect(phantomCard).toHaveTextContent('Saved Habit Level3');
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
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Vaeldra');
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

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Feskar');
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
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Rhysarion');
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
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Shadowsong');
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
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Syrax');
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

    await user.click(screen.getByRole('button', { name: /dragon database/i }));

    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Crimson');
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
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Sheepstealer');
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
    await user.clear(screen.getByLabelText(/search by name/i));
    await user.type(screen.getByLabelText(/search by name/i), 'Kalspire');
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

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    const syraxCard = screen.getByRole('heading', { name: 'Syrax' }).closest('article');
    expect(syraxCard).not.toBeNull();
    await user.click(within(syraxCard as HTMLElement).getByLabelText(/my roster/i));
    await user.click(within(syraxCard as HTMLElement).getByRole('button', { name: /view details/i }));
    await user.selectOptions(screen.getByLabelText(/star rank/i), '3');
    await user.click(screen.getByRole('button', { name: /close details/i }));

    firstRender.unmount();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /my roster/i })[0]!);
    expect(screen.getByRole('heading', { name: 'Syrax' })).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('renders the three named formation positions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);

    expect(screen.getByText('Left Flank')).toBeInTheDocument();
    expect(screen.getByText('Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Right Flank')).toBeInTheDocument();
  });


});
