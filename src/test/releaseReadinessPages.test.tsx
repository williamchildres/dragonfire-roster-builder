import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';

describe('release readiness pages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('renders the public top navigation without retired public pages', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /primary sections/i });
    const navButtons = within(nav).getAllByRole('button').map((button) => button.textContent?.trim());

    expect(navButtons).toEqual(['Overview', 'My Roster', 'Formation Builder', 'About']);
    expect(within(nav).queryByRole('button', { name: /dragon database/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /data status/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /support/i })).not.toBeInTheDocument();
  });

  it('renders the support surfaces with the Buy Me a Coffee link intact', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /about/i }));

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Keep the lab running' })).toBeInTheDocument();
    expect(screen.getByText(/Optional support/i)).toBeInTheDocument();

    const aboutSupportLink = screen.getByRole('link', { name: /buy me a dragon/i });
    expect(aboutSupportLink).toHaveAttribute('href', 'https://buymeacoffee.com/williamchildres');
    expect(aboutSupportLink).toHaveAttribute('target', '_blank');
    expect(aboutSupportLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(aboutSupportLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/unofficial community tool/i)).toBeInTheDocument();
    expect(
      within(footer).getByText(/not affiliated with or endorsed by Warner Bros\. Entertainment, HBO, or the developers/i),
    ).toBeInTheDocument();
    expect(within(footer).getByText(/Roster data stays in your browser/i)).toBeInTheDocument();
    expect(within(footer).getByText(/Support the project/i)).toBeInTheDocument();

    const footerSupportLink = within(footer).getByRole('link', { name: /support the project/i });
    expect(footerSupportLink).toHaveAttribute('href', 'https://buymeacoffee.com/williamchildres');
    expect(footerSupportLink).toHaveAttribute('target', '_blank');
    expect(footerSupportLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(footerSupportLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('falls back to Overview when a stale data-status hash is present', () => {
    window.history.replaceState(null, '', '#data-status');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  it('falls back to My Roster when a stale Dragon Database hash is present', () => {
    window.history.replaceState(null, '', '#dragon-database');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  it('renders the public pages without errors', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /overview/i }));
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^my roster$/i }));
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /formation builder/i }));
    expect(screen.getByRole('heading', { name: 'Formation Builder' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
  });
});
