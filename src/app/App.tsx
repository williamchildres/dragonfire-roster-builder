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
import { dragonObservationSnapshots } from '../data/observations';
import { dragonStatDefinitions } from '../data/statDefinitions';
import { statusGlossary } from '../data/statusGlossary';
import { defaultSynergyRules } from '../data/synergyRules';
import { troopMatchupRules } from '../data/troopMatchups';
import {
  BREEDS,
  FORMATION_POSITIONS,
  RARITIES,
  TROOP_TYPES,
  VERIFICATION_STATUSES,
  type AbilityDefinition,
  type Dragon,
  type DragonBreed,
  type DragonCollectionState,
  type DragonRarity,
  type FormationPosition,
  type OwnedDragon,
  type VerificationStatus,
} from '../models/dragon';
import { analyzeFormation, findAffinityCoverage, findBreedDistribution } from '../services/synergyEngine';
import { defaultFilters, filterDragons, sortDragons, type DragonFilters, type DragonSort } from '../services/rosterFilters';
import {
  createEmptyRoster,
  FORMATION_STORAGE_KEY,
  loadRoster,
  saveRoster,
  serializeRosterExport,
  STORAGE_KEY,
  validateRosterImport,
} from '../services/rosterStorage';
import {
  createFormationShareHash,
  defaultAdjacency,
  emptyFormation,
  moveFormationDragon,
  parseSharedFormation,
  positionLabels,
  preventDuplicateFormationPlacement,
  sanitizeFormation,
  type Formation,
} from '../services/teamShare';

type Section = 'home' | 'database' | 'roster' | 'team' | 'status' | 'about';
type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string };

const sectionLabels: Record<Section, string> = {
  home: 'Overview',
  database: 'Dragon Database',
  roster: 'My Roster',
  team: 'Formation Builder',
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
    typeof window !== 'undefined' &&
    FORMATION_POSITIONS.some((position) => parseSharedFormation(window.location.hash, dragons)[position])
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
  const [formation, setFormation] = useState<Formation>(() => getInitialFormation());

  useEffect(() => {
    saveRoster(window.localStorage, roster);
  }, [roster]);

  useEffect(() => {
    window.localStorage.setItem(FORMATION_STORAGE_KEY, JSON.stringify(formation));
  }, [formation]);

  const ownedCount = Object.values(roster).filter((entry) => entry.owned).length;
  const verifiedCombatCount = dragons.filter(
    (dragon) => dragon.command || dragon.trait || dragon.habits.length > 0,
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
          collection: {
            state: 'not-collected',
            shardsCurrent: null,
            shardsRequired: null,
          },
          starRank: null,
          reignLevel: null,
          notes: '',
          habitLevels: Object.fromEntries(
            (dragons.find((dragon) => dragon.id === dragonId)?.habits ?? []).map((habit) => [
              habit.id,
              null,
            ]),
          ),
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

  const shareFormation = async () => {
    const shareHash = createFormationShareHash(formation);
    const url = `${window.location.origin}${window.location.pathname}${shareHash}`;
    window.history.replaceState(null, '', shareHash);
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ kind: 'success', text: 'Formation share link copied.' });
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
          <FormationBuilderSection
            includeUnowned={includeUnowned}
            roster={roster}
            formation={formation}
            onIncludeUnownedChange={setIncludeUnowned}
            onFormationChange={setFormation}
            onShare={() => void shareFormation()}
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
        <p className="eyebrow">Roster manager and formation lab</p>
        <h2 id="overview-title">Build your dragon roster without guessing the data.</h2>
        <p>
          Track ownership, plan three-position formations, and prepare for verified community combat data
        while keeping official-site roster entries, pending in-game observations, and player notes
        separate from each other.
        </p>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={onBrowse}>
            Browse dragons
          </button>
          <button type="button" className="secondary-button" onClick={onTeam}>
            Open formation builder
          </button>
        </div>
      </div>
      <div className="stats-grid" aria-label="Roster summary">
        <StatCard label="Known in-game dragons" value={dragons.length} />
        <StatCard
          label="Official-site dragons"
          value={dragons.filter((dragon) => dragon.rosterSourceStatus === 'official-website').length}
        />
        <StatCard
          label="Pending official site"
          value={
            dragons.filter((dragon) => dragon.rosterSourceStatus === 'in-game-verified-pending-official-site')
              .length
          }
        />
        <StatCard label="Owned by you" value={ownedCount} />
        <StatCard label="Screenshot combat records" value={verifiedCombatCount} />
        {RARITIES.map((rarity) => (
          <StatCard key={rarity} label={rarity} value={rarityCounts[rarity] ?? 0} />
        ))}
        {BREEDS.map((breed) => (
          <StatCard key={breed} label={breed} value={breedCounts[breed] ?? 0} />
        ))}
      </div>
      <div className="notice-panel">
        The database now combines official public roster metadata with screenshot-verified combat
        records for Malachite, Seasmoke, Sheepstealer, and Vermax. Canonical base stats, formulas,
        and unverified mechanics remain marked as {unknown}.
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

function FormationBuilderSection({
  includeUnowned,
  roster,
  formation,
  onIncludeUnownedChange,
  onFormationChange,
  onShare,
}: {
  includeUnowned: boolean;
  roster: Record<string, OwnedDragon>;
  formation: Formation;
  onIncludeUnownedChange: (value: boolean) => void;
  onFormationChange: (formation: Formation) => void;
  onShare: () => void;
}) {
  const selectableDragons = dragons.filter((dragon) => includeUnowned || roster[dragon.id]?.owned);
  const selectedDragons = FORMATION_POSITIONS.map((position) => formation[position])
    .map((id) => dragons.find((dragon) => dragon.id === id))
    .filter((dragon): dragon is Dragon => Boolean(dragon));
  const synergy = analyzeFormation(formation, dragons, defaultSynergyRules);
  const breedDistribution = findBreedDistribution(selectedDragons);
  const affinityCoverage = findAffinityCoverage(selectedDragons);
  const knownTags = [...new Set(selectedDragons.flatMap((dragon) => dragon.tags))];

  const updatePosition = (position: FormationPosition, nextId: string | null) => {
    onFormationChange(preventDuplicateFormationPlacement(formation, position, nextId));
  };

  return (
    <section aria-labelledby="team-title">
      <SectionHeading
        eyebrow="Three-position planner"
        title="Formation Builder"
        description="Assign one unique dragon to Left Flank, Vanguard, and Right Flank, then share the exact formation."
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
          <button type="button" className="secondary-button" onClick={() => onFormationChange(emptyFormation())}>
            Clear formation
          </button>
          <button type="button" className="primary-button" onClick={onShare}>
            <Link size={18} aria-hidden="true" />
            Copy share link
          </button>
        </div>
      </div>
      <div className="formation-board" aria-label="Formation positions">
        {FORMATION_POSITIONS.map((position) => (
          <div className={`team-slot formation-position ${position}`} key={position}>
            <p className="position-label">{positionLabels[position]}</p>
            <label htmlFor={`formation-${position}`}>Dragon</label>
            <select
              id={`formation-${position}`}
              value={formation[position] ?? ''}
              onChange={(event) => updatePosition(position, event.target.value || null)}
            >
              <option value="">Choose a dragon</option>
              {selectableDragons.map((dragon) => (
                <option
                  key={dragon.id}
                  value={dragon.id}
                  disabled={FORMATION_POSITIONS.some(
                    (existingPosition) =>
                      existingPosition !== position && formation[existingPosition] === dragon.id,
                  )}
                >
                  {dragon.name} ({dragon.rarity}, {dragon.breed})
                </option>
              ))}
            </select>
            <div className="button-row">
              {FORMATION_POSITIONS.filter((target) => target !== position).map((target) => (
                <button
                  className="text-button"
                  key={target}
                  type="button"
                  onClick={() => onFormationChange(moveFormationDragon(formation, position, target))}
                >
                  Move to {positionLabels[target]}
                </button>
              ))}
              <button type="button" className="text-button" onClick={() => updatePosition(position, null)}>
                Clear position
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="summary-layout">
        <div className="panel">
          <h3>Formation Summary</h3>
          {selectedDragons.length > 0 ? (
            <ul className="plain-list">
              {FORMATION_POSITIONS.map((position) => {
                const dragon = dragons.find((candidate) => candidate.id === formation[position]);
                return (
                  <li key={position}>
                    <strong>{positionLabels[position]}:</strong>{' '}
                    {dragon ? `${dragon.name} - ${dragon.rarity} - ${dragon.breed}` : unknown}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{unknown}</p>
          )}
          <Distribution
            title="Rarity distribution"
            values={countValues(selectedDragons.map((dragon) => dragon.rarity))}
          />
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
          <p className="notice-text">{defaultAdjacency.note}</p>
        </div>
        <div className="panel">
          <h3>Formation Analysis</h3>
          <p>
            <strong>Score:</strong> {synergy.score ?? unknown}
          </p>
          {synergy.warnings.map((warning) => (
            <p className="notice-text" key={warning}>
              {warning}
            </p>
          ))}
          <AnalysisList title="Positive interactions" items={synergy.positives} />
          <AnalysisList title="Position requirements" items={synergy.positionRequirements} />
          <AnalysisList title="Unmet requirements" items={synergy.unmetRequirements} />
          <AnalysisList
            title="Unresolved assumptions"
            items={synergy.unresolvedAssumptions.map((description, index) => ({
              dragonIds: [],
              tags: [],
              ruleId: `unresolved-${index}`,
              title: 'Unresolved',
              description,
              confidence: 'low',
            }))}
          />
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

function AnalysisList({
  title,
  items,
}: {
  title: string;
  items: Array<{ ruleId: string; title: string; description: string; confidence: string }>;
}) {
  return (
    <div>
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul className="plain-list">
          {items.map((item) => (
            <li key={item.ruleId}>
              <strong>{item.title}:</strong> {item.description} Confidence: {item.confidence}
            </li>
          ))}
        </ul>
      ) : (
        <p>{unknown}</p>
      )}
    </div>
  );
}

function DataStatusSection() {
  const officialCount = dragons.filter((dragon) => dragon.rosterSourceStatus === 'official-website').length;
  const pendingCount = dragons.filter(
    (dragon) => dragon.rosterSourceStatus === 'in-game-verified-pending-official-site',
  ).length;

  return (
    <section aria-labelledby="status-title">
      <SectionHeading
        eyebrow={`Database ${databaseMetadata.databaseVersion} - Schema ${databaseMetadata.schemaVersion}`}
        title="Data Status"
        description="The current release distinguishes official roster metadata, pending in-game sightings, and screenshot-verified combat fields."
      />
      <div className="panel readable">
        <p>
          {officialCount} dragons are listed on the ordinary public roster site. {pendingCount} dragons
          are verified from in-game screenshots but are pending official public roster pages. Commands,
          Traits, Habits, affinities, status effects, and combat observations require field-level
          evidence before they appear in the app.
        </p>
        <p>
          Last verification date: <strong>{databaseMetadata.officialRosterLastChecked}</strong>. Unknown
          values, canonical formulas, exact adjacency, and ambiguous target rules are not guessed because
          invented data would make roster planning less useful.
        </p>
        <p>
          Account observation snapshots are dynamic player-specific records. They can reflect dragon
          level, Star Rank, Stronghold upgrades, faction bonuses, alliance bonuses, stamina state, and
          other modifiers, so they are not used for generic comparison or synergy scoring.
        </p>
      </div>
      <div className="stats-grid" aria-label="Data source summary">
        <StatCard label="Known in-game dragons" value={dragons.length} />
        <StatCard label="Official-site entries" value={officialCount} />
        <StatCard label="Pending official site" value={pendingCount} />
        <StatCard label="Status glossary entries" value={statusGlossary.length} />
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
              <th>Roster Source</th>
              <th>Identity</th>
              <th>Command</th>
              <th>Trait</th>
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
                <td>{formatRosterSourceStatus(dragon.rosterSourceStatus)}</td>
                <td>{dragon.officialProfileUrl ? 'Official public roster' : 'In-game screenshot'}</td>
                <td>{dragon.command ? verificationLabel(dragon.command.verification.status) : unknown}</td>
                <td>{dragon.trait ? verificationLabel(dragon.trait.verification.status) : unknown}</td>
                <td>{dragon.habits.length > 0 ? 'Screenshot verified' : unknown}</td>
                <td>
                  {Object.values(dragon.affinities).every((value) => value !== 'unknown')
                    ? 'Complete'
                    : Object.values(dragon.affinities).some((value) => value !== 'unknown')
                      ? 'Partial'
                      : unknown}
                </td>
                <td>
                  {Object.values(dragon.stats).every((value) => value !== null)
                    ? 'Canonical complete'
                    : dragonObservationSnapshots.some((snapshot) => snapshot.dragonId === dragon.id)
                      ? 'Observation only'
                      : unknown}
                </td>
                <td>
                  {evidenceSources.some(
                    (source) =>
                      source.id === 'official-roster-2026-06-23' || source.id.startsWith(dragon.id),
                  )
                    ? 'Recorded'
                    : unknown}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel readable">
        <h3>Troop Matchup Rules</h3>
        <p>
          Troop matchup rules are stored separately from dragon troop affinities. Current verified
          matchup records: {troopMatchupRules.length}.
        </p>
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
  const collectionState = rosterEntry?.collection.state ?? 'not-collected';

  return (
    <article className={`dragon-card rarity-${dragon.rarity.toLowerCase()}`}>
      <div className="card-topline">
        <DragonEmblem dragon={dragon} />
        <div>
          <h3>{dragon.name}</h3>
          <p>
            <span className="badge">{dragon.rarity}</span> <span className="badge">{dragon.breed}</span>
            {dragon.isNew ? <span className="badge new">New</span> : null}
            <span className="badge">{formatRosterSourceStatus(dragon.rosterSourceStatus)}</span>
          </p>
        </div>
      </div>
      <dl className="compact-details">
        <div>
          <dt>Collection</dt>
          <dd>{formatCollectionState(collectionState)}</dd>
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
            onChange={(event) =>
              onUpdateRoster(dragon.id, {
                owned: event.target.checked,
                collection: {
                  state: event.target.checked ? 'hatched' : 'not-collected',
                  shardsCurrent: rosterEntry?.collection.shardsCurrent ?? null,
                  shardsRequired: rosterEntry?.collection.shardsRequired ?? null,
                },
              })
            }
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
                <dt>Roster source</dt>
                <dd>{formatRosterSourceStatus(dragon.rosterSourceStatus)}</dd>
              </div>
              <div>
                <dt>First observed in game</dt>
                <dd>{dragon.firstObservedInGame ?? unknown}</dd>
              </div>
              <div>
                <dt>Game version</dt>
                <dd>{dragon.gameVersion ?? unknown}</dd>
              </div>
              <div>
                <dt>Last verified</dt>
                <dd>{dragon.lastVerified}</dd>
              </div>
            </dl>
            {dragon.officialProfileUrl ? (
              <a href={dragon.officialProfileUrl} target="_blank" rel="noreferrer" className="inline-link">
                Official profile <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : (
              <p className="notice-text">Official profile pending on the public roster site.</p>
            )}
          </section>
          <section className="panel">
            <h3>Ownership</h3>
            <RosterFields dragon={dragon} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
          </section>
          <section className="panel wide-panel">
            <h3>Command</h3>
            {dragon.command ? (
              <AbilityCard ability={dragon.command} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
            ) : (
              <p>{unknown}</p>
            )}
          </section>
          <section className="panel wide-panel">
            <h3>Star Trait</h3>
            {dragon.trait ? (
              <AbilityCard ability={dragon.trait} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
            ) : (
              <p>{unknown}</p>
            )}
          </section>
          <section className="panel wide-panel">
            <h3>Habits</h3>
            {dragon.habits.length > 0 ? (
              <div className="ability-stack">
                {dragon.habits.map((habit) => (
                  <AbilityCard
                    ability={habit}
                    key={habit.id}
                    rosterEntry={rosterEntry}
                    onUpdateRoster={onUpdateRoster}
                  />
                ))}
              </div>
            ) : (
              <p>{unknown}</p>
            )}
          </section>
          <section className="panel">
            <h3>Troop Affinities</h3>
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
            <h3>Stat Definitions</h3>
            <ul className="plain-list">
              {dragonStatDefinitions.map((definition) => (
                <li key={definition.id}>
                  <strong>{definition.name}:</strong> {definition.description}{' '}
                  {definition.canonicalFormulaKnown ? 'Formula known.' : 'Formula not yet verified.'}
                </li>
              ))}
            </ul>
          </section>
          <ObservationPanel dragon={dragon} />
          <section className="panel">
            <h3>Structured Tags</h3>
            <p>{dragon.tags.length > 0 ? dragon.tags.join(', ') : unknown}</p>
          </section>
          <section className="panel">
            <h3>Status Glossary</h3>
            {statusGlossary.some((entry) =>
              dragon.tags.some((tag) => tag.toLowerCase().replaceAll('_', '-') === entry.id),
            ) ? (
              <ul className="plain-list">
                {statusGlossary
                  .filter((entry) =>
                    dragon.tags.some((tag) => tag.toLowerCase().replaceAll('_', '-') === entry.id),
                  )
                  .map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.term}:</strong> {entry.definition}
                    </li>
                  ))}
              </ul>
            ) : (
              <p>{unknown}</p>
            )}
          </section>
          <section className="panel">
            <h3>Evidence</h3>
            <ul className="plain-list">
              {evidenceSources
                .filter(
                  (source) =>
                    source.id === 'official-roster-2026-06-23' ||
                    [dragon.command, dragon.trait, ...dragon.habits]
                      .filter(Boolean)
                      .flatMap((ability) => ability?.evidenceIds ?? [])
                      .includes(source.id) ||
                    source.id.startsWith(dragon.id),
                )
                .map((source) => (
                <li key={source.id}>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  ) : (
                    <span>{source.title}</span>
                  )}
                  <span> - {formatStatus(source.verificationStatus)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h3>Unresolved Questions</h3>
            {dragon.unresolvedQuestions.length > 0 ? (
              <ul className="plain-list">
                {dragon.unresolvedQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            ) : (
              <p>{unknown}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function AbilityCard({
  ability,
  rosterEntry,
  onUpdateRoster,
}: {
  ability: AbilityDefinition;
  rosterEntry?: OwnedDragon;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  const starRank = rosterEntry?.starRank ?? null;
  const locked =
    ability.kind === 'habit' &&
    ability.unlockStarRank !== null &&
    (starRank === null || starRank < ability.unlockStarRank);
  const habitLevel = rosterEntry?.habitLevels[ability.id] ?? null;

  return (
    <article className="ability-card">
      <div className="card-topline">
        <div>
          <h4>{ability.name}</h4>
          <p>
            <span className="badge">{titleCase(ability.kind)}</span>
            <span className="badge">{titleCase(ability.abilityClass)}</span>
            <span className="badge">{verificationLabel(ability.verification.status)}</span>
            {locked ? <span className="badge">Locked preview</span> : <span className="badge">Unlocked or available</span>}
          </p>
        </div>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Unlock Star Rank</dt>
          <dd>{ability.unlockStarRank ?? unknown}</dd>
        </div>
        <div>
          <dt>Minimum Dragon Level</dt>
          <dd>{ability.minimumDragonLevel ?? unknown}</dd>
        </div>
        <div>
          <dt>Position requirement</dt>
          <dd>{ability.positionRequirement ? positionLabels[ability.positionRequirement] : unknown}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{ability.evidenceIds.length > 0 ? ability.evidenceIds.length : unknown}</dd>
        </div>
      </dl>
      {ability.kind === 'habit' ? (
        <label>
          Habit Level
          <select
            value={habitLevel ?? ''}
            onChange={(event) =>
              onUpdateRoster(ability.dragonId, {
                habitLevels: {
                  ...(rosterEntry?.habitLevels ?? {}),
                  [ability.id]: event.target.value === '' ? null : (Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5),
                },
              })
            }
          >
            <option value="">Not recorded</option>
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="ability-stack">
        {ability.schedules.map((abilitySchedule) => (
          <section className="mini-panel" key={abilitySchedule.id}>
            <h5>{titleCase(abilitySchedule.timing.replaceAll('-', ' '))}</h5>
            <dl className="detail-list">
              <div>
                <dt>Specific rounds</dt>
                <dd>{abilitySchedule.rounds.length > 0 ? abilitySchedule.rounds.join(', ') : unknown}</dd>
              </div>
              <div>
                <dt>Target priority</dt>
                <dd>{abilitySchedule.targetPriority ? formatToken(abilitySchedule.targetPriority) : unknown}</dd>
              </div>
              <div>
                <dt>Battle context</dt>
                <dd>{abilitySchedule.battleContext ? formatToken(abilitySchedule.battleContext) : 'Any or unresolved'}</dd>
              </div>
              <div>
                <dt>Trigger chance</dt>
                <dd>
                  {abilitySchedule.triggerChanceFixed !== null
                    ? `${abilitySchedule.triggerChanceFixed}%`
                    : abilitySchedule.triggerChanceByHabitLevel.length > 0
                      ? rankedLabel(abilitySchedule.triggerChanceByHabitLevel)
                      : unknown}
                </dd>
              </div>
            </dl>
            {abilitySchedule.attempts ? (
              <p>
                <strong>Attempts:</strong> {abilitySchedule.attempts.attemptCount ?? unknown} attempt(s);
                chance {abilitySchedule.attempts.chanceFixed ?? unknown}
                {abilitySchedule.attempts.chanceFixed !== null ? '%' : ''};
                independently rolled: {abilitySchedule.attempts.independentlyRolled ? 'yes' : 'no'};
                independently targeted: {abilitySchedule.attempts.independentlyTargeted ? 'yes' : 'no'}
              </p>
            ) : null}
            {abilitySchedule.repeat ? (
              <p>
                <strong>Repeat:</strong> {formatToken(abilitySchedule.repeat.mode)} - {abilitySchedule.repeat.description}
              </p>
            ) : null}
            {abilitySchedule.conditions && abilitySchedule.conditions.length > 0 ? (
              <ul className="plain-list">
                {abilitySchedule.conditions.map((condition) => (
                  <li key={condition.id}>
                    <strong>Condition:</strong> {condition.description}
                    {condition.unresolved ? ' (unresolved)' : ''}
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="plain-list">
              {abilitySchedule.effects.map((effect) => (
                <li key={effect.id}>
                  <strong>{effect.type}</strong> - target: {effect.target}; scope:{' '}
                  {titleCase(effect.targetScope.replaceAll('-', ' '))}; duration:{' '}
                  {effect.duration ?? (effect.durationRounds ? `${effect.durationRounds} rounds` : unknown)};
                  value: {effect.magnitude !== null ? `${effect.magnitude}${effect.unit === 'percent' ? '%' : effect.unit === 'rate' ? '%' : effect.unit === 'flat' ? ' flat' : ''}` : unknown}
                  {effect.scaling.length > 0 ? `; scaling: ${effect.scaling.join(', ')}` : ''}
                  {effect.excludes.length > 0 ? `; excludes: ${effect.excludes.join(', ')}` : ''}
                  {effect.rankedValues.length > 0 ? `; progression: ${rankedLabel(effect.rankedValues)}` : ''}
                  {effect.sourceScope ? `; source scope: ${formatToken(effect.sourceScope)}` : ''}
                  {effect.targetPriority ? `; priority: ${formatToken(effect.targetPriority)}` : ''}
                  {effect.stack
                    ? `; stack: ${effect.stack.statusId}, max ${effect.stack.maximumStacks}, ${effect.stack.untilEndOfCombat ? 'until end of combat' : effect.stack.durationRounds ? `${effect.stack.durationRounds} rounds` : 'duration unknown'}${effect.stack.valuePerStackFixed !== null ? `, ${effect.stack.valuePerStackFixed} per stack` : ''}${effect.stack.valuePerStackByHabitLevel.length > 0 ? `, ${rankedLabel(effect.stack.valuePerStackByHabitLevel)} per stack` : ''}`
                    : ''}
                  {effect.conditionalMultipliers && effect.conditionalMultipliers.length > 0
                    ? `; multipliers: ${effect.conditionalMultipliers
                        .map((item) => `${item.multiplier}x when ${item.condition.description}`)
                        .join('; ')}`
                    : ''}
                  {effect.conditions && effect.conditions.length > 0
                    ? `; conditions: ${effect.conditions.map((condition) => condition.description).join('; ')}`
                    : ''}
                  {effect.calculated ? '; calculated from verified base values' : ''}
                  {effect.directlyVerified === false ? '; not directly verified' : ''}
                  {effect.notes.length > 0 ? `; notes: ${effect.notes.join('; ')}` : ''}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {ability.powerByHabitLevel.length > 0 ? (
        <p>
          <strong>Power progression:</strong> {rankedLabel(ability.powerByHabitLevel)}
        </p>
      ) : ability.kind === 'habit' ? (
        <p>
          <strong>Power progression:</strong> {unknown}
        </p>
      ) : null}
      {habitLevel !== null && habitLevel > 0 ? (
        <p>
          <strong>Current selected values:</strong> Habit Level {habitLevel}
        </p>
      ) : null}
      {ability.glossaryEntries.length > 0 ? (
        <ul className="plain-list">
          {ability.glossaryEntries.map((entry) => (
            <li key={entry.term}>
              <strong>{entry.term}:</strong> {entry.definition}
            </li>
          ))}
        </ul>
      ) : null}
      <p>
        <strong>Tags:</strong> {ability.tags.join(', ')}
      </p>
      {ability.augmentations.length > 0 ? (
        <div>
          <h5>Command Augmentations</h5>
          <ul className="plain-list">
            {ability.augmentations.map((augmentation) => (
              <li key={augmentation.id}>
                Star {augmentation.minimumDragonStarRank}: {augmentation.rawDescription}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <details>
        <summary>Raw verified wording</summary>
        <p>{ability.rawDescription ?? unknown}</p>
      </details>
      {ability.unresolvedQuestions.length > 0 ? (
        <ul className="plain-list">
          {ability.unresolvedQuestions.map((question) => (
            <li key={question}>Unresolved: {question}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ObservationPanel({ dragon }: { dragon: Dragon }) {
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragon.id);
  return (
    <section className="panel">
      <h3>Account Observation</h3>
      {observation ? (
        <>
          <p className="notice-text">Account-specific observation - not a canonical base-stat record.</p>
          <dl className="detail-list">
            <div>
              <dt>Dragon Level</dt>
              <dd>{observation.dragonLevel ?? unknown}</dd>
            </div>
            <div>
              <dt>Star Rank</dt>
              <dd>{observation.starRank ?? unknown}</dd>
            </div>
            <div>
              <dt>Star Progress</dt>
              <dd>
                {observation.starProgressCurrent !== null && observation.starProgressRequired !== null
                  ? `${observation.starProgressCurrent} / ${observation.starProgressRequired}`
                  : unknown}
              </dd>
            </div>
            <div>
              <dt>Collection</dt>
              <dd>
                {observation.collection
                  ? `${formatCollectionState(observation.collection.state)}${
                      observation.collection.shardsCurrent !== null &&
                      observation.collection.shardsRequired !== null
                        ? ` (${observation.collection.shardsCurrent} / ${observation.collection.shardsRequired} shards)`
                        : ''
                    }`
                  : unknown}
              </dd>
            </div>
            {Object.entries(observation.combatStats).map(([key, value]) => (
              <div key={key}>
                <dt>{titleCase(key)}</dt>
                <dd>{value ?? unknown}</dd>
              </div>
            ))}
            <div>
              <dt>March Speed</dt>
              <dd>{observation.marchSpeed ?? unknown}</dd>
            </div>
            <div>
              <dt>Stamina</dt>
              <dd>
                {observation.staminaCurrent !== null && observation.staminaMaximum !== null
                  ? `${observation.staminaCurrent} / ${observation.staminaMaximum}`
                  : unknown}
              </dd>
            </div>
            <div>
              <dt>Troop Capacity</dt>
              <dd>{observation.troopCapacity ?? unknown}</dd>
            </div>
            <div>
              <dt>Dragon Power</dt>
              <dd>{observation.dragonPower ?? unknown}</dd>
            </div>
            <div>
              <dt>Modifier context known</dt>
              <dd>{observation.modifierContextKnown ? 'Known' : 'Unknown'}</dd>
            </div>
            <div>
              <dt>Canonical</dt>
              <dd>No</dd>
            </div>
          </dl>
        </>
      ) : (
        <p>{unknown}</p>
      )}
    </section>
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
  const collection = rosterEntry?.collection ?? {
    state: 'not-collected' as DragonCollectionState,
    shardsCurrent: null,
    shardsRequired: null,
  };
  const updateCollection = (patch: Partial<OwnedDragon['collection']>) => {
    const nextCollection = { ...collection, ...patch };
    onUpdateRoster(dragon.id, {
      collection: nextCollection,
      owned: nextCollection.state === 'hatched',
    });
  };

  return (
    <div className={compact ? 'roster-fields compact' : 'roster-fields'}>
      <label className="check-row">
        <input
          type="checkbox"
          checked={rosterEntry?.owned === true}
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              owned: event.target.checked,
              collection: {
                ...collection,
                state: event.target.checked ? 'hatched' : 'not-collected',
              },
            })
          }
        />
        Owned
      </label>
      <label>
        Collection State
        <select
          value={collection.state}
          onChange={(event) => updateCollection({ state: event.target.value as DragonCollectionState })}
        >
          <option value="not-collected">Not collected</option>
          <option value="not-hatched">Not hatched</option>
          <option value="hatched">Hatched</option>
        </select>
      </label>
      <label>
        Shards
        <input
          min={0}
          step={1}
          type="number"
          value={collection.shardsCurrent ?? ''}
          placeholder="Current"
          onChange={(event) =>
            updateCollection({
              shardsCurrent: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10)),
            })
          }
        />
      </label>
      <label>
        Shards Required
        <input
          min={0}
          step={1}
          type="number"
          value={collection.shardsRequired ?? ''}
          placeholder="Required"
          onChange={(event) =>
            updateCollection({
              shardsRequired: event.target.value === '' ? null : Math.max(0, Number.parseInt(event.target.value, 10)),
            })
          }
        />
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
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => (
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

function countValues<T extends string>(values: T[]): Record<T, number> {
  return values.reduce<Record<T, number>>(
    (counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>,
  );
}

function getInitialFormation(): Formation {
  if (typeof window === 'undefined') {
    return emptyFormation();
  }

  const fromHash = parseSharedFormation(window.location.hash, dragons);
  if (FORMATION_POSITIONS.some((position) => fromHash[position])) {
    return fromHash;
  }

  const storedFormation = window.localStorage.getItem(FORMATION_STORAGE_KEY);
  if (storedFormation) {
    try {
      const parsed = JSON.parse(storedFormation) as Partial<Formation>;
      return sanitizeFormation(parsed, dragons);
    } catch {
      window.localStorage.removeItem(FORMATION_STORAGE_KEY);
    }
  }

  const legacyTeam = window.localStorage.getItem('dragonfire-roster-lab:last-team');
  if (!legacyTeam) {
    return emptyFormation();
  }
  try {
    const parsed = JSON.parse(legacyTeam) as unknown;
    if (!Array.isArray(parsed)) {
      return emptyFormation();
    }
    return sanitizeFormation(
      {
        'left-flank': typeof parsed[0] === 'string' ? parsed[0] : null,
        vanguard: typeof parsed[1] === 'string' ? parsed[1] : null,
        'right-flank': typeof parsed[2] === 'string' ? parsed[2] : null,
      },
      dragons,
    );
  } catch {
    window.localStorage.removeItem('dragonfire-roster-lab:last-team');
    return emptyFormation();
  }
}

function rankedLabel(values: Array<{ level: number; value: number; unit: string }>) {
  return values
    .map((value) => `L${value.level}: ${value.value}${value.unit === 'percent' ? '%' : value.unit === 'power' ? ' power' : value.unit === 'flat' ? ' flat' : ''}`)
    .join(', ');
}

function verificationLabel(status: string) {
  return status
    .split('-')
    .map((part) => titleCase(part))
    .join(' ');
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

function formatRosterSourceStatus(status: Dragon['rosterSourceStatus']) {
  switch (status) {
    case 'official-website':
      return 'Official website';
    case 'in-game-verified-pending-official-site':
      return 'In-game verified, pending official site';
    case 'community-unverified':
      return 'Community unverified';
  }
}

function formatCollectionState(state: DragonCollectionState) {
  switch (state) {
    case 'not-collected':
      return 'Not collected';
    case 'not-hatched':
      return 'Not hatched';
    case 'hatched':
      return 'Hatched';
  }
}

function formatToken(value: string) {
  return value
    .split('-')
    .map((part) => titleCase(part))
    .join(' ');
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
