import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, RawWordingDisclosure, TechnicalAnalysisTraceCards } from '../app/App';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { analyzeFormationTraces, dedupeFinalTechnicalAnalysisTraces } from '../services/synergyTrace';
import { createEmptyRoster, STORAGE_KEY } from '../services/rosterStorage';
import globalCss from '../styles/global.css?raw';

const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
const originalResizeObserver = window.ResizeObserver;

describe('Dragonfire Roster Lab app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    }
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight');
    }
    window.ResizeObserver = originalResizeObserver;
  });

  function fullRankEpicRoster() {
    const roster = createEmptyRoster(dragons);
    for (const dragonId of ['feskar', 'rhysarion', 'shadowsong']) {
      const entry = roster[dragonId]!;
      entry.owned = true;
      entry.collection.state = 'hatched';
      entry.starRank = 10;
      entry.reignLevel = 26;
      for (const habitId of Object.keys(entry.habitLevels)) {
        entry.habitLevels[habitId] = 0;
      }
    }
    return roster;
  }

  function countText(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
  }

  function incomingRecoveryAmplification(trace: SynergyTrace): boolean {
    return trace.matchKind === 'incoming-effect-amplification' &&
      trace.recipientAbilityId === 'rhysarion-unbroken-devotion' &&
      trace.channel === 'recovery';
  }

  function outgoingRecoverySupport(trace: SynergyTrace): boolean {
    return trace.matchKind === 'outgoing-effect-amplification' &&
      trace.channel === 'recovery' &&
      ['rhysarion-ebbing-fury', 'rhysarion-echoing-melody'].includes(trace.sourceAbilityId ?? '');
  }

  function blockText(block: Element | null): string {
    return block?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function blockHasSourceAbility(block: Element | null, abilityName: string): boolean {
    return new RegExp(`Source ability\\s*${abilityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(blockText(block));
  }

  it('renders all dragons through the database and supports search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    expect(screen.getByText(/showing 30 of 30 dragons/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search by name/i), 'Syrax');
    expect(screen.getByText(/showing 1 of 30 dragons/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Syrax' })).toBeInTheDocument();
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

  it("renders Phantom's Veil one-of options with derived Level 1 values", async () => {
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
    expect(phantomCard).toHaveTextContent('Current selected values: Habit Level 1 (derived from unlock)');
    expect(phantomCard).toHaveTextContent('Current selected value: 15%');
    expect(phantomCard).toHaveTextContent('Mutually exclusive alternatives: exactly one option applies');
    expect(phantomCard).toHaveTextContent('these reductions are not simultaneous');
    expect(phantomCard).toHaveTextContent('Physical Damage Received: reduce Physical Damage Received by 15%');
    expect(phantomCard).toHaveTextContent('Tactical Damage Received: reduce Tactical Damage Received by 15%');
    expect(phantomCard).toHaveTextContent('Fire Damage Received: reduce Fire Damage Received by 15%');
    expect(phantomCard).toHaveTextContent('target Self');
    expect(phantomCard).toHaveTextContent('duration Until end of current round');
    expect(phantomCard).toHaveTextContent('Selector method: unknown');
    expect(phantomCard).not.toHaveTextContent('value: Not yet verified');
  });

  it("renders Phantom's Veil explicit upgraded and locked-preview option values without mutating Habit storage", async () => {
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

    expect(phantomCard).toHaveTextContent('Current selected value: 24%');
    expect(phantomCard).not.toHaveTextContent('Current selected value: 15%');
    expect(phantomCard).toHaveTextContent('Mutually exclusive alternatives');

    await user.selectOptions(within(dialog).getByLabelText(/star rank/i), '1');
    await user.selectOptions(within(phantomCard as HTMLElement).getByLabelText(/habit level/i), '');
    phantomCard = within(dialog).getByRole('heading', { name: "Phantom's Veil" }).closest('article');
    expect(phantomCard).toHaveTextContent('Locked preview');
    expect(phantomCard).toHaveTextContent('Mutually exclusive alternatives: exactly one option applies');
    expect(phantomCard).toHaveTextContent('Physical Damage Received');
    expect(phantomCard).toHaveTextContent('Tactical Damage Received');
    expect(phantomCard).toHaveTextContent('Fire Damage Received');

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

    expect(sirensCallCard).toHaveTextContent('Conditional branches: exactly one branch applies to each target');
    expect(sirensCallCard).toHaveTextContent('Selector method: condition per target');
    expect(sirensCallCard).toHaveTextContent('Stagger if already Taunted');
    expect(sirensCallCard).toHaveTextContent('Target is already Taunted. apply Stagger instead');
    expect(sirensCallCard).toHaveTextContent('Taunt if not already Taunted');
    expect(sirensCallCard).toHaveTextContent('Target is not already Taunted. apply Taunt');
    expect(sirensCallCard).not.toHaveTextContent('apply Taunt and Stagger');
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
    const rawSummary = within(commandCard as HTMLElement).getByText('Raw verified wording');
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
    const rhysarionSummary = within(commandSection as HTMLElement).getByText('Raw verified wording');
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
    const shadowsongSummary = within(commandSection as HTMLElement).getByText('Raw verified wording');
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
    const syraxSummary = within(commandSection as HTMLElement).getByText('Raw verified wording');
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

  it('renders the complete legacy command wording for Crimson, Sheepstealer, and Kalspire', async () => {
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
    let rawToggle = within(commandCard as HTMLElement).getByText('Raw verified wording');
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
    rawToggle = within(commandCard as HTMLElement).getByText('Raw verified wording');
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
    rawToggle = within(commandCard as HTMLElement).getByText('Raw verified wording');
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

    await user.click(screen.getByRole('button', { name: /my roster/i }));
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

  it('deduplicates the live Show analysis details technical traces', async () => {
    const user = userEvent.setup();
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = fullRankEpicRoster();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      format: 'dragonfire-roster-lab-local',
      schemaVersion: 3,
      updatedAt: '2026-06-28T00:00:00.000Z',
      roster: Object.values(roster),
    }));

    const liveTraces = dedupeFinalTechnicalAnalysisTraces(analyzeFormationTraces(formation, dragons, { roster }));
    const incoming = liveTraces.filter(incomingRecoveryAmplification);
    const outgoing = liveTraces.filter(outgoingRecoverySupport);
    expect(incoming.map((trace) => `${trace.sourceAbilityId}:${trace.recipientDragonId}`).sort()).toEqual([
      'rhysarion-ebbing-fury:feskar',
      'rhysarion-ebbing-fury:shadowsong',
      'rhysarion-echoing-melody:feskar',
      'rhysarion-echoing-melody:shadowsong',
    ]);
    expect(incoming).toHaveLength(4);
    expect(outgoing.map((trace) => `${trace.sourceAbilityId}:${trace.recipientDragonId}`).sort()).toEqual([
      'rhysarion-ebbing-fury:feskar',
      'rhysarion-ebbing-fury:rhysarion',
      'rhysarion-ebbing-fury:shadowsong',
      'rhysarion-echoing-melody:feskar',
      'rhysarion-echoing-melody:shadowsong',
    ]);
    expect(outgoing).toHaveLength(5);

    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    const selectors = screen.getAllByLabelText('Dragon');
    await user.selectOptions(selectors[0]!, 'feskar');
    await user.selectOptions(selectors[1]!, 'rhysarion');
    await user.selectOptions(selectors[2]!, 'shadowsong');
    await user.click(screen.getByLabelText(/show analysis details/i));

    const details = screen.getByRole('heading', { name: 'Analysis Details' }).closest('.panel');
    expect(details).not.toBeNull();
    const liveText = details?.textContent ?? '';
    expect(countText(liveText, 'Feskar amplifies Rhysarion Recovery')).toBe(2);
    expect(countText(liveText, 'Shadowsong amplifies Rhysarion Recovery')).toBe(2);

    const feskarBlocks = within(details as HTMLElement).getAllByRole('heading', { name: 'Feskar amplifies Rhysarion Recovery' })
      .map((heading) => heading.closest('.trace-card'));
    const shadowsongBlocks = within(details as HTMLElement).getAllByRole('heading', { name: 'Shadowsong amplifies Rhysarion Recovery' })
      .map((heading) => heading.closest('.trace-card'));
    expect(feskarBlocks.filter((block) => blockHasSourceAbility(block, 'Ebbing Fury'))).toHaveLength(1);
    expect(feskarBlocks.filter((block) => blockHasSourceAbility(block, 'Echoing Melody'))).toHaveLength(1);
    expect(shadowsongBlocks.filter((block) => blockHasSourceAbility(block, 'Ebbing Fury'))).toHaveLength(1);
    expect(shadowsongBlocks.filter((block) => blockHasSourceAbility(block, 'Echoing Melody'))).toHaveLength(1);

    const duplicate = incoming.find((trace) =>
      trace.sourceAbilityId === 'rhysarion-ebbing-fury' &&
      trace.recipientDragonId === 'feskar'
    );
    expect(duplicate).toBeDefined();
    const duplicateRender = render(
      <div>
        <TechnicalAnalysisTraceCards traces={[...liveTraces, duplicate!]} />
      </div>,
    );
    expect(countText(duplicateRender.container.textContent ?? '', 'Feskar amplifies Rhysarion Recovery')).toBe(2);
    const duplicateFeskarBlocks = within(duplicateRender.container).getAllByRole('heading', { name: 'Feskar amplifies Rhysarion Recovery' })
      .map((heading) => heading.closest('.trace-card'));
    expect(duplicateFeskarBlocks.filter((block) => blockHasSourceAbility(block, 'Ebbing Fury'))).toHaveLength(1);
    expect(duplicateFeskarBlocks.filter((block) => blockHasSourceAbility(block, 'Echoing Melody'))).toHaveLength(1);
  });

  it('renders selected formation cards with normalized regions and compact interaction overflow', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    await user.click(screen.getByLabelText(/preview max-rank interactions/i));
    const selectors = screen.getAllByLabelText('Dragon');
    await user.selectOptions(selectors[0]!, 'sheepstealer');
    await user.selectOptions(selectors[1]!, 'caraxes');
    await user.selectOptions(selectors[2]!, 'syrax');

    for (const name of ['Left Flank', 'Vanguard', 'Right Flank']) {
      const positionCard = screen.getByRole('article', { name });
      expect(within(positionCard).getByLabelText(/movement controls/i)).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: 'Command' })).toBeInTheDocument();
      expect(within(positionCard).getAllByText('Command').length).toBeGreaterThanOrEqual(2);
      expect(within(positionCard).getByRole('region', { name: /trait status/i })).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: /affinities/i })).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: 'Receives' })).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: 'Provides' })).toBeInTheDocument();
    }

    const syrax = screen.getByRole('article', { name: 'Right Flank' });
    const provides = within(syrax).getByRole('region', { name: 'Provides' });
    const collapsedCount = provides.querySelectorAll('.card-interaction-item').length;
    expect(provides.querySelectorAll('.card-interaction-item').length).toBeLessThanOrEqual(3);
    const expand = within(provides).getByRole('button', { name: /show all/i });
    expect(expand).toHaveAttribute('aria-expanded', 'false');

    await user.click(expand);

    expect(within(provides).getByRole('button', { name: /show fewer/i })).toHaveAttribute('aria-expanded', 'true');
    expect(provides).toHaveClass('is-expanded');
    expect(provides.querySelectorAll('.card-interaction-item').length).toBeGreaterThan(3);
    expect(provides.querySelectorAll('.card-interaction-item').length).toBeGreaterThan(collapsedCount);

    const detailsToggle = within(provides).getAllByRole('button', { name: /details/i })[0]!;
    await user.click(detailsToggle);
    expect(within(provides).getByText('Full explanation')).toBeInTheDocument();
    await user.click(within(provides).getByRole('button', { name: /hide details/i }));

    await user.click(within(provides).getByRole('button', { name: /show fewer/i }));

    expect(within(provides).getByRole('button', { name: /show all/i })).toHaveAttribute('aria-expanded', 'false');
    expect(provides.querySelectorAll('.card-interaction-item')).toHaveLength(collapsedCount);
  });

  it('shows an expansion control when compact sections overflow by rendered height', async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        const element = this as HTMLElement;
        return element.classList.contains('interaction-section-body') ? 120 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        const element = this as HTMLElement;
        return element.classList.contains('interaction-section-body') ? 240 : 0;
      },
    });
    class MockResizeObserver implements ResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target } as ResizeObserverEntry], this);
      }
      disconnect() {}
      unobserve() {}
    }
    window.ResizeObserver = MockResizeObserver;
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    const selectors = screen.getAllByLabelText('Dragon');
    await user.selectOptions(selectors[0]!, 'feskar');
    await user.selectOptions(selectors[1]!, 'rhysarion');
    await user.selectOptions(selectors[2]!, 'shadowsong');
    const vanguard = screen.getByRole('article', { name: 'Vanguard' });
    const receives = within(vanguard).getByRole('region', { name: 'Receives' });
    const compactCount = receives.querySelectorAll('.card-interaction-item').length;
    expect(compactCount).toBeLessThanOrEqual(3);

    const expand = await within(receives).findByRole('button', { name: /show all/i });
    expect(expand).toHaveAttribute('aria-expanded', 'false');

    await user.click(expand);

    expect(receives).toHaveClass('is-expanded');
    expect(within(receives).getByRole('button', { name: /show fewer/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('allows expanded interaction sections to grow without an internal vertical scroll constraint', () => {
    const css = globalCss;
    const expandedRules = [...css.matchAll(/\.interaction-section\.is-expanded \.interaction-section-body\s*\{(?<body>[^}]+)\}/g)]
      .map((match) => match.groups?.body ?? '');
    const expandedRule = expandedRules[0] ?? '';

    expect(expandedRule).toContain('max-height: none');
    expect(expandedRule).toContain('overflow-y: visible');
    expect(expandedRules.every((body) => !/overflow-y:\s*(auto|scroll)/.test(body))).toBe(true);
    expect(expandedRules.every((body) => !/max-height:\s*(?:\d|min|max|calc|var)/.test(body))).toBe(true);
    expect(css.match(/\.interaction-section-body\s*\{(?<body>[^}]+)\}/)?.groups?.body).toContain('overflow-y: auto');
  });

  it('refreshes Formation Builder trait status after roster level changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    await user.type(screen.getByLabelText(/search by name/i), 'Seasmoke');
    const seasmokeCard = screen.getByRole('heading', { name: 'Seasmoke' }).closest('article');
    expect(seasmokeCard).not.toBeNull();
    await user.click(within(seasmokeCard as HTMLElement).getByLabelText(/my roster/i));
    await user.click(within(seasmokeCard as HTMLElement).getByRole('button', { name: /view details/i }));
    let seasmokeDialog = screen.getByRole('dialog', { name: /seasmoke/i });
    await user.clear(within(seasmokeDialog).getByLabelText(/reign level/i));
    await user.type(within(seasmokeDialog).getByLabelText(/reign level/i), '1');
    await user.click(within(seasmokeDialog).getByRole('button', { name: /close details/i }));

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    const selectors = screen.getAllByLabelText('Dragon');
    await user.selectOptions(selectors[1]!, 'seasmoke');
    await user.selectOptions(selectors[2]!, 'sheepstealer');

    const vanguard = screen.getByRole('article', { name: 'Vanguard' });
    expect(within(vanguard).getByRole('region', { name: /trait status/i })).toHaveTextContent(
      'Requires Level 16+; current Level 1',
    );

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    const updatedSeasmokeCard = screen.getByRole('heading', { name: 'Seasmoke' }).closest('article');
    expect(updatedSeasmokeCard).not.toBeNull();
    await user.click(within(updatedSeasmokeCard as HTMLElement).getByRole('button', { name: /view details/i }));
    seasmokeDialog = screen.getByRole('dialog', { name: /seasmoke/i });
    await user.clear(within(seasmokeDialog).getByLabelText(/reign level/i));
    await user.type(within(seasmokeDialog).getByLabelText(/reign level/i), '25');
    await user.click(within(seasmokeDialog).getByRole('button', { name: /close details/i }));

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);

    const updatedVanguard = screen.getByRole('article', { name: 'Vanguard' });
    expect(within(updatedVanguard).getByRole('region', { name: /trait status/i })).not.toHaveTextContent('Trait inactive');
    expect(within(updatedVanguard).getByRole('region', { name: /trait status/i })).toHaveTextContent(
      "Champion's Brilliance",
    );
  });

  it('keeps compact interaction summaries readable and exposes full details', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    const selectors = screen.getAllByLabelText('Dragon');
    await user.selectOptions(selectors[0]!, 'sheepstealer');
    await user.selectOptions(selectors[1]!, 'caraxes');
    await user.selectOptions(selectors[2]!, 'syrax');

    const caraxes = screen.getByRole('article', { name: 'Vanguard' });
    const receives = within(caraxes).getByRole('region', { name: 'Receives' });
    const blazingFuryFireItem = within(receives).getByText(/Blazing Fury - Fire Damage support/i).closest('.card-interaction-item');
    const blazingFuryFirstStrikeItem = within(receives).getByText(/Blazing Fury - First-Strike support/i).closest('.card-interaction-item');
    expect(blazingFuryFireItem).not.toBeNull();
    expect(blazingFuryFirstStrikeItem).not.toBeNull();
    expect(blazingFuryFireItem).toHaveTextContent('Conditional');
    expect(blazingFuryFireItem).toHaveTextContent('Syrax → Caraxes');
    expect(blazingFuryFireItem).toHaveTextContent('Fire Damage support; one of two eligible recipients.');
    expect(blazingFuryFireItem).toHaveTextContent('Target not guaranteed');
    expect(blazingFuryFirstStrikeItem).toHaveTextContent('May receive First-Strike; Infernal Burst deals 1.5× while active.');
    expect(blazingFuryFireItem?.querySelector('.interaction-status-bubble')).toBeNull();

    const syrax = screen.getByRole('article', { name: 'Right Flank' });
    const syraxProvides = within(syrax).getByRole('region', { name: 'Provides' });
    const providerBlazingFuryItem = within(syraxProvides).getByText(/Blazing Fury - Fire Damage support/i).closest('.card-interaction-item');
    expect(providerBlazingFuryItem).not.toBeNull();
    expect(providerBlazingFuryItem).toHaveTextContent('Eligible selected-target candidates: Caraxes or Sheepstealer.');
    expect(providerBlazingFuryItem).toHaveTextContent('One candidate is selected when the activation succeeds; the selected target is unresolved.');
    expect(providerBlazingFuryItem).toHaveTextContent('Activation chance: 20%.');
    expect(providerBlazingFuryItem).toHaveTextContent('Target not guaranteed');

    const details = within(blazingFuryFireItem as HTMLElement).getByRole('button', { name: 'Details' });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    await user.click(details);
    expect(within(blazingFuryFireItem as HTMLElement).getByRole('button', { name: 'Hide details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(blazingFuryFireItem).toHaveTextContent('Full explanation');
    expect(blazingFuryFireItem).toHaveTextContent('Confidence');

    await user.keyboard('{Enter}');
    expect(within(blazingFuryFireItem as HTMLElement).getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('renders split Ebbing Fury support and impairment cards with readable full explanations', async () => {
    const user = userEvent.setup();
    const formation: FormationAnalysisInput = { 'left-flank': 'feskar', vanguard: 'rhysarion', 'right-flank': 'shadowsong' };
    const roster = createEmptyRoster(dragons);
    for (const dragonId of ['feskar', 'rhysarion', 'shadowsong']) {
      const entry = roster[dragonId]!;
      entry.owned = true;
      entry.collection.state = 'hatched';
      entry.starRank = 10;
      entry.reignLevel = 26;
      for (const habitId of Object.keys(entry.habitLevels)) {
        entry.habitLevels[habitId] = 0;
      }
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        format: 'dragonfire-roster-lab-local',
        schemaVersion: 3,
        updatedAt: '2026-06-28T00:00:00.000Z',
        roster: Object.values(roster),
      }),
    );
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    const selectors = screen.getAllByLabelText('Dragon');
    await user.selectOptions(selectors[0]!, 'feskar');
    await user.selectOptions(selectors[1]!, 'rhysarion');
    await user.selectOptions(selectors[2]!, 'shadowsong');

    const traces = analyzeFormationTraces(formation, dragons, { roster });
    const cards = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: false, roster });
    const rhysarion = cards.cards.find((card) => card.dragonId === 'rhysarion');
    const recoveryItems = rhysarion?.provides.filter((item) => item.abilityName === 'Ebbing Fury' && /Recovery support/i.test(item.effectTitle)) ?? [];
    const impairmentItems = rhysarion?.provides.filter((item) => item.abilityName === 'Ebbing Fury' && /Allied Damage Dealt reduction/i.test(item.effectTitle)) ?? [];
    expect(recoveryItems.length).toBeGreaterThanOrEqual(1);
    expect(impairmentItems.length).toBeGreaterThanOrEqual(1);
    expect(recoveryItems.some((item) => item.targetLabel === 'Team')).toBe(true);
    expect(impairmentItems.some((item) => item.targetLabel === 'Team')).toBe(true);
    expect(recoveryItems.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ')).toContain('Timing: Start of Round 4.');
    expect(recoveryItems.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ')).toContain('Recovery Rate: 25% at effective Habit Level 1.');
    expect(recoveryItems.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ')).toContain("Feskar has Rhysarion's Unbroken Devotion Recovery Received modifier, increasing received Recovery by 20%.");
    expect(recoveryItems.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ')).toContain('Recovery Received increase 20% at effective Habit Level 1.');
    expect(impairmentItems.flatMap((item) => [...item.summaryLines, ...item.details, ...item.effects]).join(' ')).toContain('Friendly Damage Dealt decrease 27.5%');
  });

  it('renders consistent empty Receives and Provides sections for low-content cards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
    await user.click(screen.getByLabelText(/include unowned dragons/i));
    await user.selectOptions(screen.getAllByLabelText('Dragon')[0]!, 'sheepstealer');

    const sheepstealer = screen.getByRole('article', { name: 'Left Flank' });
    expect(within(sheepstealer).getByRole('region', { name: 'Receives' })).toHaveTextContent(
      'No incoming benefits identified',
    );
    expect(within(sheepstealer).getByRole('region', { name: 'Provides' })).toHaveTextContent(
      'No outgoing benefits identified',
    );
  });
});
