import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { releaseHistory } from '../data/releaseHistory';

describe('release readiness pages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('uses five real primary links and canonicalizes the root path', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /primary sections/i });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => link.textContent?.trim())).toEqual(['Overview', 'Roster', 'Formations', 'Optimizer', 'About']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/overview', '/roster', '/formations', '/optimizer', '/about']);
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(window.location.pathname).toBe('/overview');
  });

  it.each([
    ['/overview', 'Build stronger formations from your dragon roster.', 'Dragonfire Lab'],
    ['/roster', 'My Roster', 'My Roster | Dragonfire Lab'],
    ['/formations', 'Formation Builder', 'Formation Builder | Dragonfire Lab'],
    ['/optimizer', 'Roster Optimizer', 'Roster Optimizer | Dragonfire Lab'],
    ['/about', 'About', 'About | Dragonfire Lab'],
    ['/updates', 'Updates', 'Updates | Dragonfire Lab'],
  ])('directly renders %s', (path, heading, title) => {
    window.history.replaceState(null, '', path);
    render(<App />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(window.location.pathname).toBe(path);
    expect(document.title).toBe(title);
  });

  it('updates canonical and Open Graph URLs from the active path', () => {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
    const openGraphUrl = document.createElement('meta');
    openGraphUrl.setAttribute('property', 'og:url');
    document.head.append(openGraphUrl);

    window.history.replaceState(null, '', '/optimizer');
    const view = render(<App />);
    expect(canonical.href).toBe('https://dragonfirelab.com/optimizer');
    expect(openGraphUrl.content).toBe('https://dragonfirelab.com/optimizer');

    view.unmount();
    canonical.remove();
    openGraphUrl.remove();
  });

  it('normalizes trailing and unknown paths without adding a history entry', () => {
    window.history.replaceState(null, '', '/optimizer/');
    const { unmount } = render(<App />);
    expect(screen.getByRole('heading', { name: 'Roster Optimizer' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/optimizer');
    unmount();

    window.history.replaceState(null, '', '/not-a-route');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Build stronger formations from your dragon roster.' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/overview');
  });

  it('navigates without reload and responds to Back and Forward popstate', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Roster' }));
    expect(window.location.pathname).toBe('/roster');

    window.history.replaceState(null, '', '/overview');
    await act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(screen.getByRole('heading', { name: 'Build stronger formations from your dragon roster.' })).toBeInTheDocument();

    window.history.replaceState(null, '', '/roster');
    await act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();
  });

  it('migrates legacy public hashes and preserves unknown auth-like fragments', () => {
    window.history.replaceState(null, '', '/#data-status');
    const updates = render(<App />);
    expect(screen.getByRole('heading', { name: 'Updates' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/updates');
    expect(window.location.hash).toBe('');
    updates.unmount();

    window.history.replaceState(null, '', '/#dragon-database');
    const roster = render(<App />);
    expect(screen.getByRole('heading', { name: 'My Roster' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/roster');
    roster.unmount();

    window.history.replaceState(null, '', '/#access_token=auth-token&type=recovery');
    render(<App />);
    expect(window.location.hash).toContain('access_token=auth-token');
  });

  it.each([
    ['#formation=left-flank:syrax,vanguard:malachite,right-flank:vhagar'],
    ['#team=syrax,malachite,vhagar'],
  ])('restores shared formations from %s', (hash) => {
    window.history.replaceState(null, '', `/${hash}`);
    render(<App />);
    expect(window.location.pathname).toBe('/formations');
    expect(screen.getByRole('article', { name: 'Left Flank' })).toHaveTextContent('Syrax');
    expect(screen.getByRole('article', { name: 'Vanguard' })).toHaveTextContent('Malachite');
    expect(screen.getByRole('article', { name: 'Right Flank' })).toHaveTextContent('Vhagar');
  });

  it('renders parsed updates newest-first without a false primary active tab', () => {
    window.history.replaceState(null, '', '/updates');
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /primary sections/i });
    expect(within(nav).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    expect(screen.getAllByText(`Version ${releaseHistory[0]!.version}`).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.release-entry')).toHaveLength(releaseHistory.length);
    expect(document.querySelector('.release-entry')).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: /back to overview/i })).toHaveAttribute('href', '/overview');
  });

  it('renders changelog content as text without an HTML injection path', () => {
    const appSource = readFileSync('src/app/App.tsx', 'utf8');
    expect(appSource).not.toContain('dangerouslySetInnerHTML');

    window.history.replaceState(null, '', '/updates');
    render(<App />);
    expect(document.querySelectorAll('.release-entry')).toHaveLength(releaseHistory.length);
  });

  it('keeps About support and lower-page privacy content', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'About' }));
    expect(screen.getByRole('heading', { name: 'Privacy and local storage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Support Dragonfire Lab' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /buy me a dragon/i })).toHaveAttribute('href', 'https://buymeacoffee.com/williamchildres');
    expect(within(screen.getByRole('contentinfo')).queryByRole('link', { name: /support the project/i })).not.toBeInTheDocument();
  });
});
