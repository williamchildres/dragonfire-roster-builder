import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';

describe('Dragonfire Roster Lab app', () => {
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
      expect(within(positionCard).getByRole('region', { name: /trait status/i })).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: /affinities/i })).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: 'Receives' })).toBeInTheDocument();
      expect(within(positionCard).getByRole('region', { name: 'Provides' })).toBeInTheDocument();
    }

    const syrax = screen.getByRole('article', { name: 'Right Flank' });
    const provides = within(syrax).getByRole('region', { name: 'Provides' });
    expect(provides.querySelectorAll('.card-interaction-item').length).toBeLessThanOrEqual(3);
    const expand = within(provides).getByRole('button', { name: /view \d+ more/i });
    expect(expand).toHaveAttribute('aria-expanded', 'false');

    await user.click(expand);

    expect(within(provides).getByRole('button', { name: /show fewer/i })).toHaveAttribute('aria-expanded', 'true');
    expect(provides.querySelectorAll('.card-interaction-item').length).toBeGreaterThan(3);
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
