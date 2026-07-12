import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import { metadataOnlyDragonIds } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';

describe('release readiness pages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders the Data Status page with simplified public coverage labels', async () => {
    const user = userEvent.setup();
    const detailedCount = dragons.filter((dragon) => dragon.command && dragon.trait && dragon.habits.length > 0).length;
    const metadataOnlyIds = new Set<string>(Array.from(metadataOnlyDragonIds));
    const metadataOnlyCount = dragons.filter((dragon) => metadataOnlyIds.has(dragon.id)).length;
    const officialCount = dragons.filter((dragon) => dragon.rosterSourceStatus === 'official-website').length;
    const pendingCount = dragons.filter((dragon) => dragon.rosterSourceStatus === 'in-game-verified-pending-official-site').length;

    render(<App />);
    await user.click(screen.getByRole('button', { name: /data status/i }));

    expect(screen.getByRole('heading', { name: 'Data Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What this page means' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verification labels' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coverage table' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Limitations' })).toBeInTheDocument();

    const summary = screen.getByLabelText('Coverage summary');
    expect(within(summary).getByText('Known dragons').closest('.stat-card')).toHaveTextContent(String(dragons.length));
    expect(within(summary).getByText('Detailed ability records').closest('.stat-card')).toHaveTextContent(String(detailedCount));
    expect(within(summary).getByText('Curated simple profiles').closest('.stat-card')).toHaveTextContent(String(simpleSynergyProfiles.length));
    expect(within(summary).getByText('Metadata-only dragons').closest('.stat-card')).toHaveTextContent(String(metadataOnlyCount));
    expect(within(summary).getByText('Official-site entries').closest('.stat-card')).toHaveTextContent(String(officialCount));
    expect(within(summary).getByText('Pending official site').closest('.stat-card')).toHaveTextContent(String(pendingCount));

    const labels = screen.getByRole('heading', { name: 'Verification labels' }).closest('.panel');
    expect(labels).not.toBeNull();
    expect(labels).toHaveTextContent('Verified');
    expect(labels).toHaveTextContent('Metadata Only');
    expect(labels).toHaveTextContent('Official entry');
    expect(labels).toHaveTextContent('Pending official site');

    const table = screen.getByRole('table', { name: /dragon profile coverage/i });
    expect(within(table).getByText('Dragon')).toBeInTheDocument();
    expect(within(table).getByText('Source')).toBeInTheDocument();
    expect(within(table).getByText('Ability Data')).toBeInTheDocument();
    expect(within(table).getByText('Synergy Profile')).toBeInTheDocument();
    expect(within(table).getByText('Status')).toBeInTheDocument();
    expect(within(table).getByText('Evidence')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(dragons.length + 1);
    expect(within(table).getAllByText('Verified').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Metadata Only').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Curated').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Unmapped').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Recorded').length).toBeGreaterThan(0);

    expect(screen.getByText(/Exact timing, rolls, damage formulas/i)).toBeInTheDocument();
    expect(screen.queryByText(/project-context/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/legacy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw trace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/generated context/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/source commit/i)).not.toBeInTheDocument();
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
