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

  it('renders the public navigation without Data Status and keeps the remaining pages reachable', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dragon Database' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Roster' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Formation Builder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /data status/i })).toBeNull();

    expect(screen.getByRole('heading', { name: /plan stronger dragonfire formations from verified dragon data/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dragon Database' }));
    expect(screen.getByRole('heading', { name: 'Dragon Database' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'My Roster' }));
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Formation Builder' }));
    expect(screen.getByRole('heading', { name: 'Formation Builder' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
  });

  it('falls back to Overview when an old Data Status hash is present', () => {
    window.history.replaceState(null, '', '/#data-status');

    render(<App />);

    expect(screen.getByRole('heading', { name: /plan stronger dragonfire formations from verified dragon data/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /data status/i })).toBeNull();
  });

  it('renders the About page with local-first and unofficial project copy', async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole('button', { name: /about/i }));

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    const whatItIs = screen.getByRole('heading', { name: 'What it is' }).closest('.panel');
    expect(whatItIs).not.toBeNull();
    expect(within(whatItIs as HTMLElement).getAllByText(/local-first roster and formation planning tool/i)).toHaveLength(1);
    expect(screen.getByText(/No login is required\./i)).toBeInTheDocument();
    expect(screen.getByText(/no private game API/i)).toBeInTheDocument();
    expect(screen.getByText(/no credential collection/i)).toBeInTheDocument();
    expect(screen.getByText(/stay in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/sourced community evidence/i)).toBeInTheDocument();
    const disclaimer = screen.getByRole('heading', { name: 'Unofficial disclaimer' }).closest('.panel');
    expect(disclaimer).not.toBeNull();
    expect(within(disclaimer as HTMLElement).getByText(/unofficial community tool/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', expect.stringContaining('github.com'));

    expect(screen.queryByText(/Community Verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Official Metadata Only/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/In-game verified, pending official site/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Collection State/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not hatched/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not collected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shards Required/i)).not.toBeInTheDocument();
  });

  it('keeps the footer disclaimer readable and visible on the public shell', () => {
    render(<App />);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/unofficial community tool/i)).toBeInTheDocument();
    expect(
      within(footer).getByText(/not affiliated with or endorsed by Warner Bros\. Entertainment, HBO, or the developers/i),
    ).toBeInTheDocument();
    expect(within(footer).getByText(/Roster data stays in your browser/i)).toBeInTheDocument();
    expect(within(footer).getByText(/Public verification wording is summarized/i)).toBeInTheDocument();
  });
});
