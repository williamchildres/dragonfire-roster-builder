import {
  BookOpen,
  Database,
  Download,
  ExternalLink,
  Flame,
  Home,
  Info,
  Link,
  RotateCcw,
  Shield,
  Swords,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { databaseMetadata, repository } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { defaultSynergyRules } from '../data/synergyRules';
import {
  BREEDS,
  RARITIES,
  TROOP_TYPES,
  VERIFICATION_STATUSES,
  type Dragon,
  type DragonBreed,
  type DragonRarity,
  type OwnedDragon,
  type VerificationStatus,
} from '../models/dragon';
import { analyzeTeam, findAffinityCoverage, findBreedDistribution } from '../services/synergyEngine';
import { defaultFilters, filterDragons, sortDragons, type DragonFilters, type DragonSort } from '../services/rosterFilters';
import {
  createEmptyRoster,
  loadRoster,
  saveRoster,
  serializeRosterExport,
  STORAGE_KEY,
  TEAM_STORAGE_KEY,
  validateRosterImport,
} from '../services/rosterStorage';
import { createShareHash, parseSharedTeam, preventDuplicateSelection, sanitizeTeamIds } from '../services/teamShare';

type Section = 'home' | 'database' | 'roster' | 'team' | 'status' | 'about';
type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string };

const sectionLabels: Record<Section, string> = {
  home: 'Overview',
  database: 'Dragon Database',
  roster: 'My Roster',
  team: 'Team Builder',
  status: 'Data Status',
  about: 'About',
};

const sectionIcons = {
  home: Home,
  database: Database,
  roster: Users,
  team: Swords,
  status: BookOpen,
  about: Info,
};

const unknown = 'Not yet verified';

export function App() {
  const [activeSection, setActiveSection] = useState<Section>(() =>
    typeof window !== 'undefined' && parseSharedTeam(window.location.hash, dragons).some(Boolean)
      ? 'team'
      : 'home',
  );
  const [roster, setRoster] = useState<Record<string, OwnedDragon>>(() =>
    typeof window === 'undefined' ? createEmptyRoster(dragons) : loadRoster(window.localStorage, dragons),
  );
  const [filters, setFilters] = useState<DragonFilters>(defaultFilters);
  const [databaseSort, setDatabaseSort] = useState<DragonSort>('name');
  const [rosterSort, setRosterSort] = useState<DragonSort>('name');
  const [selectedDragon, setSelectedDragon] = useState<Dragon | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [includeUnowned, setIncludeUnowned] = useState(false);
  const [teamIds, setTeamIds] = useState<Array<string | null>>(() => getInitialTeamIds());

  useEffect(() => {
    saveRoster(window.localStorage, roster);
  }, [roster]);

  useEffect(() => {
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamIds.filter(Boolean)));
  }, [teamIds]);

  const ownedCount = Object.values(roster).filter((entry) => entry.owned).length;
  const verifiedCombatCount = dragons.filter((dragon) =>
    ['community-verified', 'officially-confirmed'].includes(dragon.dataStatus),
  ).length;

  const filteredDragons = useMemo(
    () => sortDragons(filterDragons(dragons, roster, filters), roster, databaseSort),
    [databaseSort, filters, roster],
  );

  const ownedDragons = useMemo(
    () =>
      sortDragons(
        dragons.filter((dragon) => roster[dragon.id]?.owned),
        roster,
        rosterSort,
      ),
    [roster, rosterSort],
  );

  const updateRoster = (dragonId: string, patch: Partial<OwnedDragon>) => {
    setRoster((current) => ({
      ...current,
      [dragonId]: {
        ...(current[dragonId] ?? {
          dragonId,
          owned: false,
          starRank: null,
          reignLevel: null,
          notes: '',
        }),
        ...patch,
        dragonId,
      },
    }));
  };

  const selectSection = (section: Section) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportRoster = () => {
    const blob = new Blob([serializeRosterExport(roster)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dragonfire-roster-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: 'success', text: 'Roster export downloaded.' });
  };

  const importRoster = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const text = await file.text();
    const result = validateRosterImport(text, dragons);
    if (!result.ok || !result.roster) {
      setMessage({ kind: 'error', text: result.errors.join(' ') });
      return;
    }

    setRoster(result.roster);
    setMessage({ kind: 'success', text: 'Roster imported successfully.' });
  };

  const clearRoster = () => {
    const confirmed = window.confirm('Clear your local Dragonfire Roster Lab data? This cannot be undone.');
    if (!confirmed) {
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setRoster(createEmptyRoster(dragons));
    setMessage({ kind: 'info', text: 'Local roster data was cleared.' });
  };

  const shareTeam = async () => {
    const shareHash = createShareHash(teamIds);
    const url = `${window.location.origin}${window.location.pathname}${shareHash}`;
    window.history.replaceState(null, '', shareHash);
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ kind: 'success', text: 'Team share link copied.' });
    } catch {
      setMessage({ kind: 'info', text: `Share link ready: ${url}` });
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand-lockup" aria-label="Dragonfire Roster Lab">
          <span className="brand-mark" aria-hidden="true">
            <Flame size={28} />
          </span>
          <div>
            <p className="eyebrow">Unofficial community tool</p>
            <h1>Dragonfire Roster Lab</h1>
          </div>
        </div>
        <nav aria-label="Primary sections" className="section-nav">
          {(Object.keys(sectionLabels) as Section[]).map((section) => {
            const Icon = sectionIcons[section];
            return (
              <button
                className={activeSection === section ? 'nav-button is-active' : 'nav-button'}
                key={section}
                type="button"
                onClick={() => selectSection(section)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{sectionLabels[section]}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main id="main-content">
        {message ? (
          <div className={`status-message ${message.kind}`} role="status" aria-live="polite">
            {message.text}
          </div>
        ) : null}

        {activeSection === 'home' ? (
          <HomeSection
            ownedCount={ownedCount}
            verifiedCombatCount={verifiedCombatCount}
            onBrowse={() => selectSection('database')}
            onTeam={() => selectSection('team')}
          />
        ) : null}

        {activeSection === 'database' ? (
          <DatabaseSection
            filteredDragons={filteredDragons}
            filters={filters}
            roster={roster}
            sortBy={databaseSort}
            onFiltersChange={setFilters}
            onSortChange={setDatabaseSort}
            onOpenDetails={setSelectedDragon}
            onUpdateRoster={updateRoster}
          />
        ) : null}

        {activeSection === 'roster' ? (
          <RosterSection
            ownedDragons={ownedDragons}
            roster={roster}
            sortBy={rosterSort}
            onSortChange={setRosterSort}
            onUpdateRoster={updateRoster}
            onOpenDetails={setSelectedDragon}
            onExport={exportRoster}
            onImport={(event) => void importRoster(event)}
            onClear={clearRoster}
          />
        ) : null}

        {activeSection === 'team' ? (
          <TeamBuilderSection
            includeUnowned={includeUnowned}
            roster={roster}
            teamIds={teamIds}
            onIncludeUnownedChange={setIncludeUnowned}
            onTeamChange={setTeamIds}
            onShare={() => void shareTeam()}
          />
        ) : null}

        {activeSection === 'status' ? <DataStatusSection /> : null}
        {activeSection === 'about' ? <AboutSection /> : null}
      </main>

      <footer className="site-footer">
        Dragonfire Roster Lab is an unofficial community project and is not affiliated with or
        endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones:
        Dragonfire. Game names and related trademarks belong to their respective owners.
      </footer>

      {selectedDragon ? (
        <DragonDetailsDialog
          dragon={selectedDragon}
          rosterEntry={roster[selectedDragon.id]}
          onClose={() => setSelectedDragon(null)}
          onUpdateRoster={updateRoster}
        />
      ) : null}
    </div>
  );
}

function HomeSection({
  ownedCount,
  verifiedCombatCount,
  onBrowse,
  onTeam,
}: {
  ownedCount: number;
  verifiedCombatCount: number;
  onBrowse: () => void;
  onTeam: () => void;
}) {
  const rarityCounts = countValues(dragons.map((dragon) => dragon.rarity));
  const breedCounts = countValues(dragons.map((dragon) => dragon.breed));

  return (
    <section className="hero-section" aria-labelledby="overview-title">
      <div className="hero-art" aria-hidden="true">
        <div className="dragon-silhouette" />
      </div>
      <div className="hero-copy">
        <p className="eyebrow">Roster manager and team lab</p>
        <h2 id="overview-title">Build your dragon roster without guessing the data.</h2>
        <p>
          Track ownership, plan three-dragon teams, and prepare for verified community combat data
          while keeping official identity metadata separate from player notes.
        </p>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={onBrowse}>
            Browse dragons
          </button>
          <button type="button" className="secondary-button" onClick={onTeam}>
            Open team builder
          </button>
        </div>
      </div>
      <div className="stats-grid" aria-label="Roster summary">
        <StatCard label="Dragons in database" value={dragons.length} />
        <StatCard label="Owned by you" value={ownedCount} />
        <StatCard label="Verified combat kits" value={verifiedCombatCount} />
        {RARITIES.map((rarity) => (
          <StatCard key={rarity} label={rarity} value={rarityCounts[rarity] ?? 0} />
        ))}
        {BREEDS.map((breed) => (
          <StatCard key={breed} label={breed} value={breedCounts[breed] ?? 0} />
        ))}
      </div>
      <div className="notice-panel">
        The first dataset contains official public identity metadata only. Commands, Habits,
        affinities, effect tags, and combat stats remain marked as {unknown} until they are
        verified from reliable sources.
      </div>
    </section>
  );
}

function DatabaseSection({
  filteredDragons,
  filters,
  roster,
  sortBy,
  onFiltersChange,
  onSortChange,
  onOpenDetails,
  onUpdateRoster,
}: {
  filteredDragons: Dragon[];
  filters: DragonFilters;
  roster: Record<string, OwnedDragon>;
  sortBy: DragonSort;
  onFiltersChange: (filters: DragonFilters) => void;
  onSortChange: (sort: DragonSort) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  return (
    <section aria-labelledby="database-title">
      <SectionHeading
        eyebrow="Public roster metadata"
        title="Dragon Database"
        description="Search, filter, and mark ownership for all currently seeded dragons."
      />
      <FilterPanel
        filters={filters}
        sortBy={sortBy}
        onFiltersChange={onFiltersChange}
        onSortChange={onSortChange}
      />
      <p className="result-count" role="status">
        Showing {filteredDragons.length} of {dragons.length} dragons.
      </p>
      {filteredDragons.length > 0 ? (
        <div className="dragon-grid">
          {filteredDragons.map((dragon) => (
            <DragonCard
              dragon={dragon}
              key={dragon.id}
              rosterEntry={roster[dragon.id]}
              onOpenDetails={onOpenDetails}
              onUpdateRoster={onUpdateRoster}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No dragons match those filters.</h3>
          <p>Clear filters or try a broader search term.</p>
        </div>
      )}
    </section>
  );
}

function RosterSection({
  ownedDragons,
  roster,
  sortBy,
  onSortChange,
  onUpdateRoster,
  onOpenDetails,
  onExport,
  onImport,
  onClear,
}: {
  ownedDragons: Dragon[];
  roster: Record<string, OwnedDragon>;
  sortBy: DragonSort;
  onSortChange: (sort: DragonSort) => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <section aria-labelledby="roster-title">
      <SectionHeading
        eyebrow="Stored in your browser"
        title="My Roster"
        description="Manage ownership, star rank, reign level, and personal notes with localStorage persistence."
      />
      <div className="toolbar">
        <label>
          Sort owned dragons
          <select value={sortBy} onChange={(event) => onSortChange(event.target.value as DragonSort)}>
            <option value="name">Name</option>
            <option value="starRank">Star Rank</option>
            <option value="rarity">Rarity</option>
            <option value="breed">Breed</option>
          </select>
        </label>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onExport}>
            <Download size={18} aria-hidden="true" />
            Export JSON
          </button>
          <label className="file-button">
            <Upload size={18} aria-hidden="true" />
            Import JSON
            <input type="file" accept="application/json,.json" onChange={onImport} />
          </label>
          <button type="button" className="danger-button" onClick={onClear}>
            <RotateCcw size={18} aria-hidden="true" />
            Clear local roster
          </button>
        </div>
      </div>
      {ownedDragons.length > 0 ? (
        <div className="dragon-grid">
          {ownedDragons.map((dragon) => (
            <DragonCard
              dragon={dragon}
              key={dragon.id}
              rosterEntry={roster[dragon.id]}
              onOpenDetails={onOpenDetails}
              onUpdateRoster={onUpdateRoster}
              editable
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Your roster is empty.</h3>
          <p>Mark dragons as owned from the Dragon Database to start tracking them here.</p>
        </div>
      )}
    </section>
  );
}

function TeamBuilderSection({
  includeUnowned,
  roster,
  teamIds,
  onIncludeUnownedChange,
  onTeamChange,
  onShare,
}: {
  includeUnowned: boolean;
  roster: Record<string, OwnedDragon>;
  teamIds: Array<string | null>;
  onIncludeUnownedChange: (value: boolean) => void;
  onTeamChange: (teamIds: Array<string | null>) => void;
  onShare: () => void;
}) {
  const selectableDragons = dragons.filter((dragon) => includeUnowned || roster[dragon.id]?.owned);
  const selectedDragons = teamIds
    .map((id) => dragons.find((dragon) => dragon.id === id))
    .filter((dragon): dragon is Dragon => Boolean(dragon));
  const synergy = analyzeTeam(teamIds, dragons, defaultSynergyRules);
  const breedDistribution = findBreedDistribution(selectedDragons);
  const affinityCoverage = findAffinityCoverage(selectedDragons);
  const knownTags = [...new Set(selectedDragons.flatMap((dragon) => dragon.tags))];

  const updateSlot = (slot: number, nextId: string | null) => {
    onTeamChange(preventDuplicateSelection(teamIds, slot, nextId));
  };

  return (
    <section aria-labelledby="team-title">
      <SectionHeading
        eyebrow="Three-slot planner"
        title="Team Builder"
        description="Choose up to three unique dragons and share a URL hash for the current team."
      />
      <div className="toolbar">
        <label className="check-row">
          <input
            type="checkbox"
            checked={includeUnowned}
            onChange={(event) => onIncludeUnownedChange(event.target.checked)}
          />
          Include unowned dragons
        </label>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => onTeamChange([null, null, null])}>
            Clear team
          </button>
          <button type="button" className="primary-button" onClick={onShare}>
            <Link size={18} aria-hidden="true" />
            Copy share link
          </button>
        </div>
      </div>
      <div className="team-slots" aria-label="Team slots">
        {[0, 1, 2].map((slot) => (
          <div className="team-slot" key={slot}>
            <label htmlFor={`team-slot-${slot}`}>Slot {slot + 1}</label>
            <select
              id={`team-slot-${slot}`}
              value={teamIds[slot] ?? ''}
              onChange={(event) => updateSlot(slot, event.target.value || null)}
            >
              <option value="">Choose a dragon</option>
              {selectableDragons.map((dragon) => (
                <option
                  key={dragon.id}
                  value={dragon.id}
                  disabled={teamIds.some((id, index) => index !== slot && id === dragon.id)}
                >
                  {dragon.name} ({dragon.rarity}, {dragon.breed})
                </option>
              ))}
            </select>
            <button type="button" className="text-button" onClick={() => updateSlot(slot, null)}>
              Clear slot
            </button>
          </div>
        ))}
      </div>
      <div className="summary-layout">
        <div className="panel">
          <h3>Team Summary</h3>
          {selectedDragons.length > 0 ? (
            <ul className="plain-list">
              {selectedDragons.map((dragon) => (
                <li key={dragon.id}>
                  <strong>{dragon.name}</strong> · {dragon.rarity} · {dragon.breed}
                </li>
              ))}
            </ul>
          ) : (
            <p>{unknown}</p>
          )}
          <Distribution title="Rarity distribution" values={countValues(selectedDragons.map((dragon) => dragon.rarity))} />
          <Distribution
            title="Breed distribution"
            values={Object.fromEntries(breedDistribution.map((item) => [item.breed, item.count]))}
          />
          <p>
            <strong>Known effect tags:</strong> {knownTags.length > 0 ? knownTags.join(', ') : unknown}
          </p>
          <p>
            <strong>Data confidence:</strong> {synergy.confidence}
          </p>
        </div>
        <div className="panel">
          <h3>Synergy Analysis</h3>
          <p>
            <strong>Score:</strong> {synergy.score ?? unknown}
          </p>
          {synergy.warnings.map((warning) => (
            <p className="notice-text" key={warning}>
              {warning}
            </p>
          ))}
          <h4>Affinity coverage</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Troop</th>
                  <th>Positive</th>
                  <th>Neutral</th>
                  <th>Negative</th>
                  <th>Unknown</th>
                </tr>
              </thead>
              <tbody>
                {affinityCoverage.map((row) => (
                  <tr key={row.troopType}>
                    <td>{row.troopType}</td>
                    <td>{row.positive}</td>
                    <td>{row.neutral}</td>
                    <td>{row.negative}</td>
                    <td>{row.unknown}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function DataStatusSection() {
  return (
    <section aria-labelledby="status-title">
      <SectionHeading
        eyebrow={`Database ${databaseMetadata.databaseVersion} · Schema ${databaseMetadata.schemaVersion}`}
        title="Data Status"
        description="The current release records official identity metadata and leaves combat fields blank until sourced."
      />
      <div className="panel readable">
        <p>
          Names, rarity, breed, new flags, and official profile links come from the ordinary public
          roster pages. Commands, Habits, affinities, stats, and effect tags require community
          verification before they appear in the app.
        </p>
        <p>
          Last verification date: <strong>{databaseMetadata.officialRosterLastChecked}</strong>. Unknown
          values are not guessed because invented data would make roster planning less useful.
        </p>
        <p>
          Future updates should add source evidence, mark superseded data, and preserve historical
          values in documentation before UI history tools are added.
        </p>
      </div>
      <div className="status-legend">
        {VERIFICATION_STATUSES.map((status) => (
          <div className="legend-item" key={status}>
            <span className="badge">{formatStatus(status)}</span>
            <span>{statusDescription(status)}</span>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <caption>Dragon data completeness</caption>
          <thead>
            <tr>
              <th>Dragon</th>
              <th>Identity</th>
              <th>Command</th>
              <th>Habits</th>
              <th>Affinities</th>
              <th>Stats</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {dragons.map((dragon) => (
              <tr key={dragon.id}>
                <td>{dragon.name}</td>
                <td>Complete</td>
                <td>{dragon.command ? 'Complete' : unknown}</td>
                <td>{dragon.habits.length > 0 ? 'Complete' : unknown}</td>
                <td>
                  {Object.values(dragon.affinities).every((value) => value !== 'unknown')
                    ? 'Complete'
                    : unknown}
                </td>
                <td>
                  {Object.values(dragon.stats).every((value) => value !== null) ? 'Complete' : unknown}
                </td>
                <td>{evidenceSources.length > 0 ? 'Roster source recorded' : unknown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section aria-labelledby="about-title">
      <SectionHeading
        eyebrow="Open source fan project"
        title="About"
        description="A local-first tool for organizing Dragonfire roster planning without private APIs or account access."
      />
      <div className="panel readable">
        <p>
          Dragonfire Roster Lab is an unofficial fan project. It does not use a private game API,
          does not ask for credentials, and stores roster notes only in your browser.
        </p>
        <p>
          Combat data will require sourced community submissions. Users should never submit account
          credentials, private profile information, or confidential material.
        </p>
        <p>
          The project is open source on{' '}
          <a href={repository.url} target="_blank" rel="noreferrer">
            GitHub <ExternalLink size={14} aria-hidden="true" />
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function DragonCard({
  dragon,
  rosterEntry,
  editable = false,
  onOpenDetails,
  onUpdateRoster,
}: {
  dragon: Dragon;
  rosterEntry?: OwnedDragon;
  editable?: boolean;
  onOpenDetails: (dragon: Dragon) => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  const owned = rosterEntry?.owned === true;

  return (
    <article className={`dragon-card rarity-${dragon.rarity.toLowerCase()}`}>
      <div className="card-topline">
        <DragonEmblem dragon={dragon} />
        <div>
          <h3>{dragon.name}</h3>
          <p>
            <span className="badge">{dragon.rarity}</span> <span className="badge">{dragon.breed}</span>
            {dragon.isNew ? <span className="badge new">New</span> : null}
          </p>
        </div>
      </div>
      <dl className="compact-details">
        <div>
          <dt>Owned</dt>
          <dd>{owned ? 'Owned' : 'Unowned'}</dd>
        </div>
        <div>
          <dt>Star Rank</dt>
          <dd>{rosterEntry?.starRank ?? unknown}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>{formatStatus(dragon.dataStatus)}</dd>
        </div>
      </dl>
      {editable ? (
        <RosterFields dragon={dragon} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} compact />
      ) : null}
      <div className="card-actions">
        <button type="button" className="secondary-button" onClick={() => onOpenDetails(dragon)}>
          View details
        </button>
        <label className="check-row">
          <input
            type="checkbox"
            checked={owned}
            onChange={(event) => onUpdateRoster(dragon.id, { owned: event.target.checked })}
          />
          My Roster
        </label>
      </div>
    </article>
  );
}

function DragonDetailsDialog({
  dragon,
  rosterEntry,
  onClose,
  onUpdateRoster,
}: {
  dragon: Dragon;
  rosterEntry?: OwnedDragon;
  onClose: () => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      previousFocus.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="dragon-dialog-title"
        aria-modal="true"
        className="details-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div className="card-topline">
            <DragonEmblem dragon={dragon} />
            <div>
              <p className="eyebrow">Dragon details</p>
              <h2 id="dragon-dialog-title">{dragon.name}</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close details">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="details-grid">
          <section className="panel">
            <h3>Identity</h3>
            <dl className="detail-list">
              <div>
                <dt>Rarity</dt>
                <dd>{dragon.rarity}</dd>
              </div>
              <div>
                <dt>Breed</dt>
                <dd>{dragon.breed}</dd>
              </div>
              <div>
                <dt>Verification status</dt>
                <dd>{formatStatus(dragon.dataStatus)}</dd>
              </div>
              <div>
                <dt>Last verified</dt>
                <dd>{dragon.lastVerified}</dd>
              </div>
            </dl>
            <a href={dragon.officialProfileUrl} target="_blank" rel="noreferrer" className="inline-link">
              Official profile <ExternalLink size={14} aria-hidden="true" />
            </a>
          </section>
          <section className="panel">
            <h3>Ownership</h3>
            <RosterFields dragon={dragon} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
          </section>
          <UnknownPanel title="Command" known={Boolean(dragon.command)}>
            {dragon.command?.description}
          </UnknownPanel>
          <UnknownPanel title="Habits" known={dragon.habits.length > 0}>
            {dragon.habits.map((habit) => habit.name).join(', ')}
          </UnknownPanel>
          <section className="panel">
            <h3>Affinities</h3>
            <dl className="detail-list">
              {TROOP_TYPES.map((troop) => (
                <div key={troop}>
                  <dt>{troop}</dt>
                  <dd>{dragon.affinities[troop] === 'unknown' ? unknown : dragon.affinities[troop]}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel">
            <h3>Stats</h3>
            <dl className="detail-list">
              {Object.entries(dragon.stats).map(([key, value]) => (
                <div key={key}>
                  <dt>{titleCase(key)}</dt>
                  <dd>{value ?? unknown}</dd>
                </div>
              ))}
            </dl>
          </section>
          <UnknownPanel title="Tags" known={dragon.tags.length > 0}>
            {dragon.tags.join(', ')}
          </UnknownPanel>
          <section className="panel">
            <h3>Evidence and Sources</h3>
            <ul className="plain-list">
              {evidenceSources.map((source) => (
                <li key={source.id}>
                  <a href={source.url ?? '#'} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                  <span> · {formatStatus(source.verificationStatus)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function RosterFields({
  dragon,
  rosterEntry,
  onUpdateRoster,
  compact = false,
}: {
  dragon: Dragon;
  rosterEntry?: OwnedDragon;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'roster-fields compact' : 'roster-fields'}>
      <label className="check-row">
        <input
          type="checkbox"
          checked={rosterEntry?.owned === true}
          onChange={(event) => onUpdateRoster(dragon.id, { owned: event.target.checked })}
        />
        Owned
      </label>
      <label>
        Star Rank
        <select
          value={rosterEntry?.starRank ?? ''}
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              starRank: event.target.value ? Number(event.target.value) : null,
            })
          }
        >
          <option value="">Unknown</option>
          {[1, 2, 3, 4, 5].map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reign Level
        <input
          min={0}
          step={1}
          type="number"
          value={rosterEntry?.reignLevel ?? ''}
          placeholder="Unknown"
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              reignLevel: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10)),
            })
          }
        />
      </label>
      {!compact ? (
        <label>
          Personal notes
          <textarea
            maxLength={1000}
            rows={4}
            value={rosterEntry?.notes ?? ''}
            onChange={(event) => onUpdateRoster(dragon.id, { notes: event.target.value })}
          />
        </label>
      ) : null}
    </div>
  );
}

function FilterPanel({
  filters,
  sortBy,
  onFiltersChange,
  onSortChange,
}: {
  filters: DragonFilters;
  sortBy: DragonSort;
  onFiltersChange: (filters: DragonFilters) => void;
  onSortChange: (sort: DragonSort) => void;
}) {
  const update = (patch: Partial<DragonFilters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="filter-panel" aria-label="Dragon filters">
      <label>
        Search by name
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Search dragons"
        />
      </label>
      <label>
        Rarity
        <select value={filters.rarity} onChange={(event) => update({ rarity: event.target.value as DragonRarity | 'all' })}>
          <option value="all">All rarities</option>
          {RARITIES.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </select>
      </label>
      <label>
        Breed
        <select value={filters.breed} onChange={(event) => update({ breed: event.target.value as DragonBreed | 'all' })}>
          <option value="all">All breeds</option>
          {BREEDS.map((breed) => (
            <option key={breed} value={breed}>
              {breed}
            </option>
          ))}
        </select>
      </label>
      <label>
        Owned
        <select value={filters.owned} onChange={(event) => update({ owned: event.target.value as DragonFilters['owned'] })}>
          <option value="all">All</option>
          <option value="owned">Owned</option>
          <option value="unowned">Unowned</option>
        </select>
      </label>
      <label>
        Verification
        <select
          value={filters.status}
          onChange={(event) => update({ status: event.target.value as VerificationStatus | 'all' })}
        >
          <option value="all">All statuses</option>
          {VERIFICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort by
        <select value={sortBy} onChange={(event) => onSortChange(event.target.value as DragonSort)}>
          <option value="name">Name</option>
          <option value="rarity">Rarity</option>
          <option value="breed">Breed</option>
        </select>
      </label>
      <button type="button" className="secondary-button" onClick={() => onFiltersChange(defaultFilters)}>
        Clear filters
      </button>
    </div>
  );
}

function DragonEmblem({ dragon }: { dragon: Dragon }) {
  return (
    <div className={`dragon-emblem breed-${dragon.breed.toLowerCase()}`} aria-hidden="true">
      <Shield size={34} />
      <span>{dragon.name.slice(0, 1)}</span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{value}</span>
      <p>{label}</p>
    </div>
  );
}

function Distribution({ title, values }: { title: string; values: Record<string, number> }) {
  return (
    <div>
      <h4>{title}</h4>
      {Object.keys(values).length > 0 ? (
        <ul className="plain-list">
          {Object.entries(values).map(([key, value]) => (
            <li key={key}>
              {key}: {value}
            </li>
          ))}
        </ul>
      ) : (
        <p>{unknown}</p>
      )}
    </div>
  );
}

function UnknownPanel({ title, known, children }: { title: string; known: boolean; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <p>{known ? children : unknown}</p>
    </section>
  );
}

function countValues<T extends string>(values: T[]): Record<T, number> {
  return values.reduce<Record<T, number>>(
    (counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

function getInitialTeamIds(): Array<string | null> {
  if (typeof window === 'undefined') {
    return [null, null, null];
  }

  const fromHash = parseSharedTeam(window.location.hash, dragons);
  if (fromHash.some(Boolean)) {
    return fromHash;
  }

  const stored = window.localStorage.getItem(TEAM_STORAGE_KEY);
  if (!stored) {
    return [null, null, null];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? sanitizeTeamIds(parsed.filter((id): id is string => typeof id === 'string'), dragons)
      : [null, null, null];
  } catch {
    window.localStorage.removeItem(TEAM_STORAGE_KEY);
    return [null, null, null];
  }
}

function formatStatus(status: VerificationStatus) {
  return status
    .split('-')
    .map((part) => titleCase(part))
    .join(' ');
}

function statusDescription(status: VerificationStatus) {
  switch (status) {
    case 'official-metadata-only':
      return 'Identity fields are sourced from public official roster pages; combat data is unknown.';
    case 'community-unverified':
      return 'Submitted by the community but not yet checked.';
    case 'community-verified':
      return 'Checked against community evidence.';
    case 'officially-confirmed':
      return 'Confirmed by official public material.';
  }
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
