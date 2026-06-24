import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';

describe('Dragonfire Roster Lab app', () => {
  it('renders all dragons through the database and supports search', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /dragon database/i }));
    expect(screen.getByText(/showing 28 of 28 dragons/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search by name/i), 'Syrax');
    expect(screen.getByText(/showing 1 of 28 dragons/i)).toBeInTheDocument();
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
});
