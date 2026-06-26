import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { STORAGE_KEY } from '../services/rosterStorage';
import globalCss from '../styles/global.css?raw';

const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
const originalResizeObserver = window.ResizeObserver;

describe('Dragonfire Roster Lab app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    const blazingFuryItem = within(receives).getByText('Blazing Fury').closest('.card-interaction-item');
    expect(blazingFuryItem).not.toBeNull();
    expect(blazingFuryItem).toHaveTextContent('Conditional');
    expect(blazingFuryItem).toHaveTextContent('Syrax → Caraxes');
    expect(blazingFuryItem).toHaveTextContent('Fire Damage support; one of two eligible recipients.');
    expect(blazingFuryItem).toHaveTextContent('May receive First-Strike; Infernal Burst deals 1.5× while active.');
    expect(blazingFuryItem).toHaveTextContent('Target not guaranteed');
    expect(blazingFuryItem?.querySelector('.interaction-status-bubble')).toBeNull();

    const syrax = screen.getByRole('article', { name: 'Right Flank' });
    const syraxProvides = within(syrax).getByRole('region', { name: 'Provides' });
    const providerBlazingFuryItem = within(syraxProvides).getByText('Blazing Fury').closest('.card-interaction-item');
    expect(providerBlazingFuryItem).not.toBeNull();
    expect(providerBlazingFuryItem).toHaveTextContent('One Fire recipient is selected: Caraxes or Sheepstealer.');
    expect(providerBlazingFuryItem).toHaveTextContent('Caraxes may also receive First-Strike for Infernal Burst.');
    expect(providerBlazingFuryItem).toHaveTextContent('Target not guaranteed');

    const details = within(blazingFuryItem as HTMLElement).getByRole('button', { name: 'Details' });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    await user.click(details);
    expect(within(blazingFuryItem as HTMLElement).getByRole('button', { name: 'Hide details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(blazingFuryItem).toHaveTextContent('Full explanation');
    expect(blazingFuryItem).toHaveTextContent('Confidence');

    await user.keyboard('{Enter}');
    expect(within(blazingFuryItem as HTMLElement).getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
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
