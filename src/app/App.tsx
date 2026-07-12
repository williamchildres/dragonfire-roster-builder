import {
  Download,
  ExternalLink,
  Flame,
  Home,
  Info,
  Link,
  Plus,
  RotateCcw,
  Shield,
  Swords,
  Upload,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { DragonDetailsDialog } from './DragonDetailModal';
import { SimpleFormationAnalysis } from './SimpleFormationAnalysis';
import { SimpleFormationCard } from './SimpleFormationCard';
import { getPublicVerificationLabel, getPublicVerificationTone } from './publicCardLabels';
import dragonfireHero from '../assets/dragonfire-hero.png';
import { databaseMetadata, repository } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import {
  BREEDS,
  FORMATION_POSITIONS,
  RARITIES,
  type Dragon,
  type DragonBreed,
  type DragonRarity,
  type FormationPosition,
  type OwnedDragon,
  type VerificationStatus,
} from '../models/dragon';
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
  emptyFormation,
  moveFormationDragon,
  parseSharedFormation,
  preventDuplicateFormationPlacement,
  sanitizeFormation,
  type Formation,
} from '../services/teamShare';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { buildSimpleFormationPresentation } from '../synergy/formationPresentation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { SimpleProgressionByDragonId } from '../synergy/types';
export { RawWordingDisclosure } from './DragonDetailModal';

const buyMeACoffeeUrl = 'https://buymeacoffee.com/williamchildres';

type Section = 'home' | 'roster' | 'team' | 'about';
type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string };
type RosterSuccessMessage = { text: string };

const rosterSuccessMessageTimeoutMs = 4000;

const sectionLabels: Record<Section, string> = {
  home: 'Overview',
  roster: 'My Roster',
  team: 'Formation Builder',
  about: 'About',
};

const sectionIcons = {
  home: Home,
  roster: Users,
  team: Swords,
  about: Info,
};

const verificationStatusOptions: VerificationStatus[] = [
  'official-metadata-only',
  'community-unverified',
  'community-verified',
  'officially-confirmed',
];

export function App() {
  const [activeSection, setActiveSection] = useState<Section>(getInitialSection);
  const [roster, setRoster] = useState<Record<string, OwnedDragon>>(() =>
    typeof window === 'undefined' ? createEmptyRoster(dragons) : loadRoster(window.localStorage, dragons),
  );
  const [addDragonFilters, setAddDragonFilters] = useState<DragonFilters>(defaultFilters);
  const [rosterSort, setRosterSort] = useState<DragonSort>('name');
  const [selectedDragon, setSelectedDragon] = useState<Dragon | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [rosterSuccessMessage, setRosterSuccessMessage] = useState<RosterSuccessMessage | null>(null);
  const [includeUnowned, setIncludeUnowned] = useState(false);
  const [formation, setFormation] = useState<Formation>(() => getInitialFormation());
  const [isAddDragonOpen, setIsAddDragonOpen] = useState(false);
  const [showAlreadyAdded, setShowAlreadyAdded] = useState(false);
  const rosterSuccessTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveRoster(window.localStorage, roster);
  }, [roster]);

  useEffect(() => {
    window.localStorage.setItem(FORMATION_STORAGE_KEY, JSON.stringify(formation));
  }, [formation]);

  useEffect(() => {
    if (!rosterSuccessMessage) {
      if (rosterSuccessTimerRef.current !== null) {
        window.clearTimeout(rosterSuccessTimerRef.current);
        rosterSuccessTimerRef.current = null;
      }
      return;
    }

    if (rosterSuccessTimerRef.current !== null) {
      window.clearTimeout(rosterSuccessTimerRef.current);
    }

    rosterSuccessTimerRef.current = window.setTimeout(() => {
      rosterSuccessTimerRef.current = null;
      setRosterSuccessMessage(null);
    }, rosterSuccessMessageTimeoutMs);

    return () => {
      if (rosterSuccessTimerRef.current !== null) {
        window.clearTimeout(rosterSuccessTimerRef.current);
        rosterSuccessTimerRef.current = null;
      }
    };
  }, [rosterSuccessMessage]);

  useEffect(() => {
    if (!isStalePublicHash(window.location.hash)) {
      return;
    }

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, []);

  const detailedAbilityCount = dragons.filter(hasDetailedAbilities).length;

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

  const addDragonToRoster = (dragonId: string) => {
    const dragonName = dragons.find((dragon) => dragon.id === dragonId)?.name ?? 'Unknown dragon';
    updateRoster(dragonId, { owned: true });
    setRosterSuccessMessage({ text: `Added ${dragonName} to roster.` });
  };

  const openAddDragon = () => {
    setAddDragonFilters(defaultFilters);
    setShowAlreadyAdded(false);
    setIsAddDragonOpen(true);
  };

  const selectSection = (section: Section) => {
    setActiveSection(section);
    if (section !== 'roster') {
      setRosterSuccessMessage(null);
    }
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
        <div className="brand-lockup" aria-label="Dragonfire Lab">
          <span className="brand-mark" aria-hidden="true">
            <Flame size={28} />
          </span>
          <div>
            <p className="eyebrow">Unofficial community tool</p>
            <h1>Dragonfire Lab</h1>
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
          <HomeSection detailedAbilityCount={detailedAbilityCount} />
        ) : null}

        {activeSection === 'roster' ? (
          <RosterSection
            ownedDragons={ownedDragons}
            roster={roster}
            successMessage={rosterSuccessMessage}
            sortBy={rosterSort}
            onSortChange={setRosterSort}
            onUpdateRoster={updateRoster}
            onOpenDetails={setSelectedDragon}
            onOpenAddDragon={openAddDragon}
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

        {activeSection === 'about' ? <AboutSection /> : null}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p className="site-footer-copy">
            Dragonfire Roster Lab is an unofficial community tool. It is not affiliated with or
            endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones:
            Dragonfire.
          </p>
          <p className="site-footer-copy">
            Roster data stays in your browser. Public verification wording is summarized from official
            roster pages, screenshot evidence, and curated community review.
          </p>
          <p className="site-footer-support">
            <a
              className="secondary-button support-link"
              href={buyMeACoffeeUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Support the project <ExternalLink size={16} aria-hidden="true" />
            </a>
          </p>
        </div>
      </footer>

      {selectedDragon ? (
        <DragonDetailsDialog
          dragon={selectedDragon}
          rosterEntry={roster[selectedDragon.id]}
          onClose={() => setSelectedDragon(null)}
          onUpdateRoster={updateRoster}
        />
      ) : null}

      {isAddDragonOpen ? (
        <AddDragonDialog
          filters={addDragonFilters}
          roster={roster}
          showAlreadyAdded={showAlreadyAdded}
          onAdd={addDragonToRoster}
          onClose={() => setIsAddDragonOpen(false)}
          onFiltersChange={setAddDragonFilters}
          onOpenDetails={(dragon) => {
            setIsAddDragonOpen(false);
            setSelectedDragon(dragon);
          }}
          onShowAlreadyAddedChange={setShowAlreadyAdded}
        />
      ) : null}
    </div>
  );
}

function HomeSection({
  detailedAbilityCount,
}: {
  detailedAbilityCount: number;
}) {
  const coveragePercent = Math.round((detailedAbilityCount / dragons.length) * 100);
  const versionLabel = `v${databaseMetadata.databaseVersion}`;
  const rarityCoverage = ['Legendary', 'Epic', 'Rare'].map((rarity) => {
    const rarityDragons = dragons.filter((dragon) => dragon.rarity === rarity);
    const mapped = rarityDragons.filter(hasDetailedAbilities).length;
    return {
      rarity,
      mapped,
      total: rarityDragons.length,
    };
  });

  return (
    <section className="overview-section" aria-labelledby="overview-title">
      <div className="hero-section">
        <div className="hero-art hero-art-panel">
          <img
            alt="Dragonfire Lab dragon emblem"
            className="hero-image"
            src={dragonfireHero}
          />
          <div className="hero-art-overlay" aria-hidden="true" />
        </div>
        <div className="hero-copy">
          <h2 id="overview-title">Overview</h2>
          <div className="hero-feature-stack" aria-label="Overview highlights">
            <FeatureCard
              icon={Users}
              title="Track Your Roster"
              description="Save Owned / Hatched status, Star Rank, Dragon Level, Habit Levels, and notes locally in your browser."
            />
            <FeatureCard
              icon={Shield}
              title="Compare Verified Dragons"
              description="Review verified ability wording, metadata-only entries, affinities, evidence, and profile coverage."
            />
            <FeatureCard
              icon={Swords}
              title="Build Formations"
              description="See synergies, missing enablers, placement issues, and Vanguard conflicts."
            />
          </div>
        </div>
      </div>

      <div className="coverage-panel" aria-labelledby="coverage-title">
        <div className="coverage-copy">
          <p className="eyebrow">Coverage</p>
          <h3 id="coverage-title">Detailed profile coverage</h3>
          <p>
            <strong>{detailedAbilityCount} / {dragons.length} dragons mapped</strong>
          </p>
          <p>{coveragePercent}%</p>
        </div>
        <progress value={detailedAbilityCount} max={dragons.length} aria-label="Detailed profile coverage" />
      </div>

      <div className="rarity-coverage-grid" aria-label="Rarity coverage">
        {rarityCoverage.map((coverage) => (
          <CoverageCard
            key={coverage.rarity}
            mapped={coverage.mapped}
            total={coverage.total}
            title={`${coverage.rarity} coverage`}
          />
        ))}
      </div>

      <div className="overview-footer-grid">
        <div className="latest-update-panel panel readable">
          <p className="eyebrow">Latest update</p>
          <h3>Latest update - {versionLabel}</h3>
          <p>Tessarion added with verified ability wording and a curated synergy profile.</p>
        </div>
        <div className="notice-panel trust-note">
          No login required. Your roster is stored locally in your browser. This is an unofficial
          community tool and does not use private game APIs.
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="feature-card">
      <div className="feature-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function RosterSection({
  ownedDragons,
  roster,
  successMessage,
  sortBy,
  onSortChange,
  onUpdateRoster,
  onOpenDetails,
  onOpenAddDragon,
  onExport,
  onImport,
  onClear,
}: {
  ownedDragons: Dragon[];
  roster: Record<string, OwnedDragon>;
  successMessage: RosterSuccessMessage | null;
  sortBy: DragonSort;
  onSortChange: (sort: DragonSort) => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onOpenAddDragon: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <section aria-labelledby="roster-title">
      <SectionHeading
        eyebrow="Stored in your browser"
        title="My Roster"
        description="Manage ownership, star rank, and reign level with local browser storage."
      />
      {successMessage ? (
        <div className="status-message success" role="status" aria-live="polite">
          {successMessage.text}
        </div>
      ) : null}
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
          <button type="button" className="primary-button" onClick={onOpenAddDragon}>
            <Plus size={18} aria-hidden="true" />
            + Add Dragon
          </button>
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
          <h3>No dragons in your roster yet.</h3>
          <p>Add a dragon to start tracking Star Rank, Reign Level, and formation options. Use the Add Dragon button to begin.</p>
          <button type="button" className="primary-button" onClick={onOpenAddDragon}>
            <Plus size={18} aria-hidden="true" />
            + Add Dragon
          </button>
        </div>
      )}
    </section>
  );
}

function AddDragonDialog({
  filters,
  roster,
  showAlreadyAdded,
  onAdd,
  onClose,
  onFiltersChange,
  onOpenDetails,
  onShowAlreadyAddedChange,
}: {
  filters: DragonFilters;
  roster: Record<string, OwnedDragon>;
  showAlreadyAdded: boolean;
  onAdd: (dragonId: string) => void;
  onClose: () => void;
  onFiltersChange: (filters: DragonFilters) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onShowAlreadyAddedChange: (value: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const modalFilters = useMemo<DragonFilters>(
    () => ({
      ...filters,
      owned: showAlreadyAdded ? 'all' : 'unowned',
    }),
    [filters, showAlreadyAdded],
  );
  const filteredDragons = useMemo(
    () => sortDragons(filterDragons(dragons, roster, modalFilters), roster, 'name'),
    [modalFilters, roster],
  );
  const update = (patch: Partial<DragonFilters>) => onFiltersChange({ ...filters, ...patch });

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
        aria-labelledby="add-dragon-title"
        aria-modal="true"
        className="details-dialog add-dragon-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="details-header">
          <div className="details-heading-copy">
            <p className="eyebrow">Catalog</p>
            <h2 id="add-dragon-title">Add dragons to your roster</h2>
            <p className="details-summary-line">
              Search the catalog and add dragons you own. Ability details remain marked as Verified or Metadata Only.
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close add dragon">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="add-dragon-filters" aria-label="Add dragon filters">
          <label>
            Search by dragon name
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
            Verification
            <select
              value={filters.status}
              onChange={(event) => update({ status: event.target.value as VerificationStatus | 'all' })}
            >
              <option value="all">All statuses</option>
              {verificationStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getPublicVerificationLabel(status) ?? titleCase(status.replaceAll('-', ' '))}
                </option>
              ))}
            </select>
          </label>
          <label className="check-row add-dragon-show-added">
            <input
              type="checkbox"
              checked={showAlreadyAdded}
              onChange={(event) => onShowAlreadyAddedChange(event.target.checked)}
            />
            Show already added
          </label>
        </div>

        <p className="result-count" role="status">
          Showing {filteredDragons.length} of {dragons.length} dragons.
        </p>
        {filteredDragons.length > 0 ? (
          <div className="add-dragon-list" aria-label="Available dragons">
            {filteredDragons.map((dragon) => (
              <AddDragonRow
                dragon={dragon}
                isOwned={roster[dragon.id]?.owned === true}
                key={dragon.id}
                onAdd={onAdd}
                onOpenDetails={onOpenDetails}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No dragons match those filters.</h3>
            <p>Clear filters or show already added dragons to broaden the catalog.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddDragonRow({
  dragon,
  isOwned,
  onAdd,
  onOpenDetails,
}: {
  dragon: Dragon;
  isOwned: boolean;
  onAdd: (dragonId: string) => void;
  onOpenDetails: (dragon: Dragon) => void;
}) {
  const verificationLabel = getPublicVerificationLabel(dragon.dataStatus);
  const verificationTone = getPublicVerificationTone(dragon.dataStatus);
  const summaryNote = verificationLabel === 'Metadata Only' ? 'Ability details not verified' : null;

  return (
    <article className="add-dragon-row">
      <div className="card-topline">
        <DragonEmblem dragon={dragon} />
        <div className="dragon-card-title">
          <h3>{dragon.name}</h3>
          <div className="dragon-card-chips" aria-label={`${dragon.name} metadata`}>
            <span className="badge">{dragon.rarity}</span>
            <span className="badge">{dragon.breed}</span>
            {verificationLabel ? (
              <span className={`badge verification-${verificationTone ?? 'verified'}`}>{verificationLabel}</span>
            ) : null}
          </div>
          {summaryNote ? <p className="add-dragon-note">{summaryNote}</p> : null}
        </div>
      </div>
      <div className="add-dragon-actions">
        <button type="button" className="secondary-button" onClick={() => onOpenDetails(dragon)}>
          View details
        </button>
        <button
          type="button"
          className={isOwned ? 'secondary-button' : 'primary-button'}
          disabled={isOwned}
          onClick={() => onAdd(dragon.id)}
        >
          {isOwned ? 'Added' : 'Add to roster'}
        </button>
      </div>
    </article>
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
  const progression = useMemo<SimpleProgressionByDragonId>(
    () =>
      Object.fromEntries(
        FORMATION_POSITIONS.flatMap((position) => {
          const dragonId = formation[position];
          if (!dragonId) {
            return [];
          }
          const entry = roster[dragonId];
          return [
            [
              dragonId,
              {
                starRank: entry?.starRank ?? null,
                dragonLevel: entry?.reignLevel ?? null,
              },
            ],
          ];
        }),
      ),
    [formation, roster],
  );
  const selectedCount = FORMATION_POSITIONS.filter((position) => formation[position]).length;
  const simpleResults =
    selectedCount >= 2
      ? evaluateFormation({
          formation,
          progression,
          profiles: simpleSynergyProfiles,
        }).results
      : [];
  const mappedProfileIds = new Set(simpleSynergyProfiles.map((profile) => profile.dragonId));
  const presentation = buildSimpleFormationPresentation({
    formation,
    dragons,
    mappedProfileIds,
    results: simpleResults,
  });

  const updatePosition = (position: FormationPosition, nextId: string | null) => {
    onFormationChange(preventDuplicateFormationPlacement(formation, position, nextId));
  };

  return (
    <section aria-labelledby="team-title">
      <SectionHeading
        eyebrow="Three-position planner"
        title="Formation Builder"
        description="Assign one unique dragon to each position and review curated profile relationships."
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
        {FORMATION_POSITIONS.map((position) => {
          const dragon = dragons.find((candidate) => candidate.id === formation[position]) ?? null;
          return (
            <SimpleFormationCard
              key={position}
              position={position}
              formation={formation}
              dragon={dragon}
              selectableDragons={selectableDragons}
              rosterEntry={dragon ? roster[dragon.id] : undefined}
              hasSimpleProfile={dragon ? mappedProfileIds.has(dragon.id) : false}
              onDragonChange={(nextId) => updatePosition(position, nextId)}
              onMove={(target) => onFormationChange(moveFormationDragon(formation, position, target))}
              onClear={() => updatePosition(position, null)}
            />
          );
        })}
      </div>
      <SimpleFormationAnalysis presentation={presentation} dragons={dragons} formation={formation} />
    </section>
  );
}

function hasDetailedAbilities(dragon: Dragon) {
  return Boolean(dragon.command && dragon.trait && dragon.habits.length > 0);
}

function AboutSection() {
  return (
    <section aria-labelledby="about-title">
      <SectionHeading
        eyebrow="Open source fan project"
        title="About"
        description="A local-first roster and formation planning tool for Dragonfire."
      />
      <div className="about-grid">
        <div className="panel readable">
          <h3>What it is</h3>
          <p>A local-first roster and formation planning tool for Dragonfire.</p>

          <h3>What it does</h3>
          <ul className="plain-list">
            <li>Track owned dragons.</li>
            <li>Review verified ability wording.</li>
            <li>Compare dragon metadata.</li>
            <li>Build three-position formations.</li>
            <li>See curated high-level synergies, missing enablers, and placement conflicts.</li>
          </ul>
        </div>

        <div className="panel readable">
          <h3>Privacy and local-first storage</h3>
          <p>No login is required. There is no private game API, no credential collection, and roster data plus notes stay in your browser.</p>
        </div>

        <div className="panel readable">
          <h3>Data policy</h3>
          <p>
            Ability and profile updates require sourced community evidence. Please do not submit
            credentials, private profile information, or confidential material.
          </p>
        </div>

        <div className="panel readable">
          <h3>Unofficial disclaimer</h3>
          <p>
            Dragonfire Roster Lab is an unofficial community tool and is not affiliated with or
            endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones:
            Dragonfire.
          </p>
          <h3>Open source</h3>
          <p>
            The project is open source on{' '}
            <a href={repository.url} target="_blank" rel="noreferrer">
              GitHub <ExternalLink size={14} aria-hidden="true" />
            </a>
            . Issues and contributions can be used for sourced corrections.
          </p>
        </div>
      </div>
      <div className="support-panel panel readable">
        <p className="eyebrow">Optional support</p>
        <h3>Keep the lab running</h3>
        <p>
          Dragonfire Roster Lab is free to use. If the tool helps you, you can optionally support
          development, hosting, and continued data entry.
        </p>
        <p>
          <a
            className="primary-button support-link"
            href={buyMeACoffeeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            ?? Buy me a dragon <ExternalLink size={16} aria-hidden="true" />
          </a>
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
  const starRank = rosterEntry?.starRank ?? null;
  const verificationLabel = getPublicVerificationLabel(dragon.dataStatus);
  const verificationTone = getPublicVerificationTone(dragon.dataStatus);
  const ownershipSummary = owned ? 'Owned / Hatched' : 'Not owned';
  const starSummary = owned ? (starRank !== null ? `Star ${starRank}` : 'Star unknown') : null;
  const summaryNote = verificationLabel === 'Metadata Only' ? 'Ability details not verified' : null;

  return (
    <article className={`dragon-card rarity-${dragon.rarity.toLowerCase()}`}>
      <div className="dragon-card-header">
        <div className="card-topline">
          <DragonEmblem dragon={dragon} />
          <div className="dragon-card-title">
            <h3>{dragon.name}</h3>
            <div className="dragon-card-chips" aria-label={`${dragon.name} metadata`}>
              <span className="badge">{dragon.rarity}</span>
              <span className="badge">{dragon.breed}</span>
              {verificationLabel ? (
                <span className={`badge verification-${verificationTone ?? 'verified'}`}>{verificationLabel}</span>
              ) : null}
              {dragon.isNew ? <span className="badge new">New</span> : null}
            </div>
          </div>
        </div>
        <div className="dragon-card-summary" aria-label={`${dragon.name} roster summary`}>
          <span className="dragon-card-summary-main">{ownershipSummary}</span>
          {starSummary ? <span className="dragon-card-summary-chip">{starSummary}</span> : null}
          {summaryNote ? <span className="dragon-card-summary-note">{summaryNote}</span> : null}
        </div>
      </div>

      {editable ? (
        <RosterEditControls dragon={dragon} rosterEntry={rosterEntry} onUpdateRoster={onUpdateRoster} />
      ) : null}

      <div className="card-actions">
        <button type="button" className="secondary-button" onClick={() => onOpenDetails(dragon)}>
          View details
        </button>
        {editable ? null : (
          <label className="check-row">
            <input
              type="checkbox"
              checked={owned}
              onChange={(event) =>
                onUpdateRoster(dragon.id, {
                  owned: event.target.checked,
                })
              }
            />
            My Roster
          </label>
        )}
      </div>
    </article>
  );
}

function RosterEditControls({
  dragon,
  rosterEntry,
  onUpdateRoster,
}: {
  dragon: Dragon;
  rosterEntry?: OwnedDragon;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
}) {
  return (
    <div className="roster-fields">
      <label className="check-row">
        <input
          type="checkbox"
          checked={rosterEntry?.owned === true}
          onChange={(event) =>
            onUpdateRoster(dragon.id, {
              owned: event.target.checked,
            })
          }
        />
        Owned / Hatched
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

function CoverageCard({
  title,
  mapped,
  total,
}: {
  title: string;
  mapped: number;
  total: number;
}) {
  const percent = total === 0 ? 0 : Math.round((mapped / total) * 100);
  const coverageId = title.toLowerCase().replaceAll(' ', '-');
  return (
    <section className="coverage-card" aria-labelledby={coverageId}>
      <div className="coverage-card-copy">
        <h3 id={coverageId}>{title}</h3>
        <p>
          <strong>
            {mapped} / {total} mapped
          </strong>
        </p>
        <p>{percent}%</p>
      </div>
      <progress value={mapped} max={total} aria-label={`${title} progress`} />
    </section>
  );
}

function getInitialSection(): Section {
  if (typeof window === 'undefined') {
    return 'home';
  }

  if (FORMATION_POSITIONS.some((position) => parseSharedFormation(window.location.hash, dragons)[position])) {
    return 'team';
  }

  return isStaleDragonDatabaseHash(window.location.hash) ? 'roster' : 'home';
}

function isStalePublicHash(hash: string): boolean {
  return hash === '#data-status' || isStaleDragonDatabaseHash(hash);
}

function isStaleDragonDatabaseHash(hash: string): boolean {
  return hash === '#database' || hash === '#dragon-database' || hash === '#dragons';
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

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
