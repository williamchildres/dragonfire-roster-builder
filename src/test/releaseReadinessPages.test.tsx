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

    expect(navButtons).toEqual(['Overview', 'Roster', 'Formations', 'About']);
    expect(within(nav).getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('button', { name: /sign in|account|pro|optimizer|saved formation/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /dragon database/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /data status/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /support/i })).not.toBeInTheDocument();
  });

  it('renders About support and suppresses the duplicate footer action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /about/i }));

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Support Dragonfire Lab' })).toBeInTheDocument();
    expect(screen.getByText('Optional support')).toBeInTheDocument();
    expect(screen.getByText(/Optional support helps cover hosting/i)).toBeInTheDocument();

    const aboutSupportLink = screen.getByRole('link', { name: /buy me a dragon/i });
    expect(aboutSupportLink).toHaveAttribute('href', 'https://buymeacoffee.com/williamchildres');
    expect(aboutSupportLink).toHaveAttribute('target', '_blank');
    expect(aboutSupportLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(aboutSupportLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/Dragonfire Lab is an unofficial community tool/i)).toBeInTheDocument();
    expect(
      within(footer).getByText(/not affiliated with or endorsed by Warner Bros\. Entertainment, HBO, or the developers/i),
    ).toBeInTheDocument();
    expect(within(footer).getByText(/Roster data stays in your browser/i)).toBeInTheDocument();
    expect(within(footer).queryByText(/Support the project/i)).not.toBeInTheDocument();
  });

  it('keeps the footer support link on non-About pages', () => {
    render(<App />);

    const footerSupportLink = within(screen.getByRole('contentinfo')).getByRole('link', { name: /support the project/i });
    expect(footerSupportLink).toHaveAttribute('href', 'https://buymeacoffee.com/williamchildres');
    expect(footerSupportLink).toHaveAttribute('target', '_blank');
    expect(footerSupportLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(footerSupportLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('falls back to Overview when a stale data-status hash is present', () => {
    window.history.replaceState(null, '', '#data-status');

    render(<App />);

    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Track Your Roster' })).toBeInTheDocument();
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
    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Track Your Roster' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^roster$/i }));
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^formations$/i }));
    expect(screen.getByRole('heading', { name: 'Formation Builder' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /about/i }));
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
  });
});
