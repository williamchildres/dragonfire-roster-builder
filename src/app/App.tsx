import {
  Download,
  ExternalLink,
  Flame,
  Home,
  Info,
  Link,
  ChevronRight,
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
import {
  buildFormationFilterOptions,
  buildFormationSignalChips,
  profileBenefitsFromLabel,
  profileDamageProfileLabel,
  profileProvidesLabel,
} from './formationCardPresentation';
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
import { rateFormation } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { buildSimpleFormationPresentation } from '../synergy/formationPresentation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { SimpleProgressionByDragonId } from '../synergy/types';
export { RawWordingDisclosure } from './DragonDetailModal';

const buyMeACoffeeUrl = 'https://buymeacoffee.com/williamchildres';

type Section = 'home' | 'roster' | 'team' | 'about';
type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string };
type RosterSuccessMessage = { text: string };
type FormationDragonPoolMode = 'all-star-10' | 'roster';
type FormationSelectorFilters = {
  search: string;
  rarity: DragonRarity | 'all';
  breed: DragonBreed | 'all';
  status: VerificationStatus | 'all';
  damageProfile: string;
  provides: string;
  benefitsFrom: string;
};

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

const verificationStatusOptions = [...new Set(dragons.map((dragon) => dragon.dataStatus))] as VerificationStatus[];

const defaultFormationSelectorFilters: FormationSelectorFilters = {
  search: '',
  rarity: 'all',
  breed: 'all',
  status: 'all',
  damageProfile: 'all',
  provides: 'all',
  benefitsFrom: 'all',
};

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
  const [formationDragonPoolMode, setFormationDragonPoolMode] = useState<FormationDragonPoolMode>('all-star-10');
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
    const confirmed = window.confirm('Clear your local Dragonfire Lab data? This cannot be undone.');
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

  const changeFormationDragonPoolMode = (mode: FormationDragonPoolMode) => {
    setFormationDragonPoolMode(mode);

    if (mode !== 'roster') {
      return;
    }

    const unavailablePositions = FORMATION_POSITIONS.filter((position) => {
      const dragonId = formation[position];
      return dragonId ? roster[dragonId]?.owned !== true : false;
    });

    if (unavailablePositions.length === 0) {
      return;
    }

    const nextFormation = { ...formation };
    for (const position of unavailablePositions) {
      nextFormation[position] = null;
    }
    setFormation(nextFormation);
    setMessage({
      kind: 'info',
      text: `Roster Dragons mode cleared unavailable slot${unavailablePositions.length === 1 ? '' : 's'}: ${unavailablePositions
        .map(formatFormationPosition)
        .join(', ')}.`,
    });
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
          <HomeSection
            detailedAbilityCount={detailedAbilityCount}
            onRoster={() => selectSection('roster')}
            onTeam={() => selectSection('team')}
          />
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
            dragonPoolMode={formationDragonPoolMode}
            roster={roster}
            formation={formation}
            onDragonPoolModeChange={changeFormationDragonPoolMode}
            onFormationChange={setFormation}
            onOpenDetails={setSelectedDragon}
            onShare={() => void shareFormation()}

          />
        ) : null}

        {activeSection === 'about' ? <AboutSection /> : null}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p className="site-footer-copy">
            Dragonfire Lab is an unofficial community tool. It is not affiliated with or
            endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones:
            Dragonfire.
          </p>
          <p className="site-footer-copy">
            Roster data stays in your browser. Public verification wording is summarized from official
            roster pages, screenshot evidence, and curated community review.
          </p>
          {activeSection !== 'about' ? (
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
          ) : null}
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
  onRoster,
  onTeam,
}: {
  detailedAbilityCount: number;
  onRoster: () => void;
  onTeam: () => void;
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
    <section className="overview-section" aria-label="Overview">
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
          <div className="hero-feature-stack" aria-label="Overview highlights">
            <FeatureCard
              icon={Users}
              title="Track Your Roster"
              description="Save ownership, Star Rank, Dragon Level, Habit Levels, and notes locally in your browser."
              onClick={onRoster}
            />
            <FeatureCard
              icon={Swords}
              title="Build Formations"
              description="Build three-dragon formations, compare explainable ratings, and review active synergy and placement risks."
              onClick={onTeam}
            />
            <FeatureCard
              icon={Flame}
              title="Understand Formation Ratings"
              description="Compare realized synergy, support usefulness, Kit Utilization, and conflict risk."
              onClick={onTeam}
            />
          </div>
        </div>
      </div>

      <div className="coverage-panel combined-coverage-panel" aria-labelledby="coverage-title">
        <div className="coverage-copy">
          <p className="eyebrow">Coverage</p>
          <h3 id="coverage-title">Profile coverage</h3>
          <p>
            <strong>{detailedAbilityCount} / {dragons.length} dragons mapped</strong>
          </p>
          <p>{coveragePercent}%</p>
        </div>
        <div className="combined-coverage-bar" aria-label="Coverage by rarity">
          {rarityCoverage.map((coverage) => {
            const width = (coverage.total / dragons.length) * 100;
            const fill = coverage.total === 0 ? 0 : (coverage.mapped / coverage.total) * 100;
            return (
              <div
                key={coverage.rarity}
                className={`combined-coverage-segment rarity-${coverage.rarity.toLowerCase()}`}
                style={{ flexBasis: `${width}%` }}
              >
                <div className="combined-coverage-fill" style={{ width: `${fill}%` }} />
              </div>
            );
          })}
        </div>
        <div className="coverage-counts" aria-label="Coverage by rarity counts">
          {rarityCoverage.map((coverage) => (
            <div className="coverage-count" key={coverage.rarity}>
              <span className="coverage-count-label">
                <span
                  aria-hidden="true"
                  className={`coverage-marker rarity-${coverage.rarity.toLowerCase()}`}
                />
                {coverage.rarity}
              </span>
              <span className="coverage-count-value">
                {coverage.mapped} / {coverage.total} mapped
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="rarity-note">
        Legendary, Epic, and Rare profiles are fully mapped.
      </p>

      <div className="overview-footer-grid">
        <div className="latest-update-panel panel readable">
          <p className="eyebrow">Current data</p>
          <h3>Latest release — {versionLabel}</h3>
          <p>Vesper, Nyrena, and Dawnseeker complete verified ability data and curated profiles for all 31 dragons.</p>
        </div>
        <div className="notice-panel trust-note readable">
          <p className="eyebrow">Local first</p>
          <h3>Private by design</h3>
          <p>
            No login is required. Your roster stays in your browser, and Dragonfire Lab does not
            use private game APIs.
          </p>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  const classes = onClick ? 'feature-card feature-card-button' : 'feature-card';
  const content = (
    <>
      <div className="feature-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div className="feature-card-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {onClick ? (
        <span className="feature-card-action" aria-hidden="true">
          Open <ChevronRight size={14} />
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className={classes}>{content}</article>;
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
              Search the catalog and add dragons you own. All ability details are marked as Verified.
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

function formationRosterEntryForDragon(
  dragon: Dragon,
  roster: Record<string, OwnedDragon>,
  mode: FormationDragonPoolMode,
): OwnedDragon | undefined {
  if (mode === 'roster') {
    return roster[dragon.id];
  }

  const saved = roster[dragon.id];
  return {
    dragonId: dragon.id,
    owned: true,
    starRank: 10,
    reignLevel: saved?.reignLevel ?? null,
    notes: saved?.notes ?? '',
    habitLevels: saved?.habitLevels ?? Object.fromEntries(dragon.habits.map((habit) => [habit.id, null])),
  };
}

function formationProgressionForDragon(
  dragonId: string,
  roster: Record<string, OwnedDragon>,
  mode: FormationDragonPoolMode,
) {
  const entry = roster[dragonId];
  return {
    starRank: mode === 'all-star-10' ? 10 : entry?.starRank ?? null,
    dragonLevel: entry?.reignLevel ?? null,
  };
}

function FormationBuilderSection({
  dragonPoolMode,
  roster,
  formation,
  onDragonPoolModeChange,
  onFormationChange,
  onOpenDetails,
  onShare,
}: {
  dragonPoolMode: FormationDragonPoolMode;
  roster: Record<string, OwnedDragon>;
  formation: Formation;
  onDragonPoolModeChange: (mode: FormationDragonPoolMode) => void;
  onFormationChange: (formation: Formation) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onShare: () => void;
}) {
  const [selectorPosition, setSelectorPosition] = useState<FormationPosition | null>(null);
  const [selectorFilters, setSelectorFilters] = useState<FormationSelectorFilters>(defaultFormationSelectorFilters);
  const selectableDragons = dragons.filter((dragon) => dragonPoolMode === 'all-star-10' || roster[dragon.id]?.owned);
  const profilesById = useMemo(
    () => new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile])),
    [],
  );
  const progression = useMemo<SimpleProgressionByDragonId>(
    () =>
      Object.fromEntries(
        FORMATION_POSITIONS.flatMap((position) => {
          const dragonId = formation[position];
          if (!dragonId) {
            return [];
          }
          return [
            [
              dragonId,
              formationProgressionForDragon(dragonId, roster, dragonPoolMode),
            ],
          ];
        }),
      ),
    [dragonPoolMode, formation, roster],
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
  const signalChipsByPosition = useMemo(
    () =>
      Object.fromEntries(
        FORMATION_POSITIONS.map((position) => {
          const dragonId = formation[position];
          return [
            position,
            buildFormationSignalChips({
              profile: dragonId ? profilesById.get(dragonId) : undefined,
              position,
              formation,
              profiles: simpleSynergyProfiles,
              progression,
            }),
          ];
        }),
      ) as Record<FormationPosition, ReturnType<typeof buildFormationSignalChips>>,
    [formation, profilesById, progression],
  );
  const signalChipsByDragonId = useMemo(
    () =>
      Object.fromEntries(
        FORMATION_POSITIONS.flatMap((position) => {
          const dragonId = formation[position];
          return dragonId ? [[dragonId, signalChipsByPosition[position]]] : [];
        }),
      ),
    [formation, signalChipsByPosition],
  );
  const rating = rateFormation({
    formation,
    dragons,
    profiles: simpleSynergyProfiles,
    presentation,
    signalChipsByDragonId,
  });

  const updatePosition = (position: FormationPosition, nextId: string | null) => {
    onFormationChange(preventDuplicateFormationPlacement(formation, position, nextId));
  };
  const openSelector = (position: FormationPosition) => {
    setSelectorFilters(defaultFormationSelectorFilters);
    setSelectorPosition(position);
  };
  const chooseDragon = (dragonId: string) => {
    if (!selectorPosition) {
      return;
    }
    updatePosition(selectorPosition, dragonId);
    setSelectorPosition(null);
  };

  return (
    <section aria-labelledby="team-title">
      <SectionHeading
        eyebrow="Three-position planner"
        title="Formation Builder"
        description="Assign one unique dragon to each position and review curated profile relationships."
      />
      <div className="toolbar">
        <fieldset className="formation-mode-toggle" aria-label="Formation dragon pool">
          <legend className="sr-only">Formation dragon pool</legend>
          <label className={dragonPoolMode === 'all-star-10' ? 'formation-mode-option is-active' : 'formation-mode-option'}>
            <input
              type="radio"
              name="formation-dragon-pool"
              checked={dragonPoolMode === 'all-star-10'}
              onChange={() => onDragonPoolModeChange('all-star-10')}
            />
            <span>All 10 Star Dragons</span>
          </label>
          <label className={dragonPoolMode === 'roster' ? 'formation-mode-option is-active' : 'formation-mode-option'}>
            <input
              type="radio"
              name="formation-dragon-pool"
              checked={dragonPoolMode === 'roster'}
              onChange={() => onDragonPoolModeChange('roster')}
            />
            <span>Roster Dragons</span>
          </label>
        </fieldset>
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
      <p className="formation-chip-legend" role="note">
        Green = active or satisfied · Red = missing or inactive · Neutral = available
      </p>
      <div className="formation-board" aria-label="Formation positions">
        {FORMATION_POSITIONS.map((position) => {
          const dragon = dragons.find((candidate) => candidate.id === formation[position]) ?? null;
          return (
            <SimpleFormationCard
              key={position}
              position={position}
              dragon={dragon}
              rosterEntry={dragon ? formationRosterEntryForDragon(dragon, roster, dragonPoolMode) : undefined}
              profile={dragon ? profilesById.get(dragon.id) : undefined}
              signalChips={signalChipsByPosition[position]}
              onChooseDragon={() => openSelector(position)}
              onOpenDetails={onOpenDetails}
              onMove={(target) => onFormationChange(moveFormationDragon(formation, position, target))}
              onClear={() => updatePosition(position, null)}
            />
          );
        })}
      </div>
      <SimpleFormationAnalysis presentation={presentation} dragons={dragons} formation={formation} rating={rating} />
      {selectorPosition ? (
        <FormationDragonSelectorDialog
          filters={selectorFilters}
          formation={formation}
          dragonPoolMode={dragonPoolMode}
          position={selectorPosition}
          profilesById={profilesById}
          roster={roster}
          selectableDragons={selectableDragons}
          onClose={() => setSelectorPosition(null)}
          onFiltersChange={setSelectorFilters}
          onOpenDetails={(dragon) => {
            setSelectorPosition(null);
            onOpenDetails(dragon);
          }}
          onSelect={chooseDragon}
        />
      ) : null}
    </section>
  );
}

function FormationDragonSelectorDialog({
  filters,
  formation,
  dragonPoolMode,
  position,
  profilesById,
  roster,
  selectableDragons,
  onClose,
  onFiltersChange,
  onOpenDetails,
  onSelect,
}: {
  filters: FormationSelectorFilters;
  formation: Formation;
  dragonPoolMode: FormationDragonPoolMode;
  position: FormationPosition;
  profilesById: Map<string, (typeof simpleSynergyProfiles)[number]>;
  roster: Record<string, OwnedDragon>;
  selectableDragons: Dragon[];
  onClose: () => void;
  onFiltersChange: (filters: FormationSelectorFilters) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onSelect: (dragonId: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const filterOptions = useMemo(() => buildFormationFilterOptions(simpleSynergyProfiles), []);
  const selectedDragonIds = new Set(Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId)));
  const filteredDragons = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return selectableDragons
      .filter((dragon) => (search ? dragon.name.toLowerCase().includes(search) : true))
      .filter((dragon) => (filters.rarity === 'all' ? true : dragon.rarity === filters.rarity))
      .filter((dragon) => (filters.breed === 'all' ? true : dragon.breed === filters.breed))
      .filter((dragon) => (filters.status === 'all' ? true : dragon.dataStatus === filters.status))
      .filter((dragon) =>
        filters.damageProfile === 'all'
          ? true
          : profileDamageProfileLabel(profilesById.get(dragon.id), filters.damageProfile),
      )
      .filter((dragon) =>
        filters.provides === 'all' ? true : profileProvidesLabel(profilesById.get(dragon.id), filters.provides),
      )
      .filter((dragon) =>
        filters.benefitsFrom === 'all'
          ? true
          : profileBenefitsFromLabel(profilesById.get(dragon.id), filters.benefitsFrom),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [filters, profilesById, selectableDragons]);
  const update = (patch: Partial<FormationSelectorFilters>) => onFiltersChange({ ...filters, ...patch });
  const positionLabel = formatFormationPosition(position);

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
        aria-labelledby="formation-dragon-selector-title"
        aria-modal="true"
        className="details-dialog add-dragon-dialog formation-selector-dialog"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="details-header">
          <div className="details-heading-copy">
            <p className="eyebrow">Formation slot</p>
            <h2 id="formation-dragon-selector-title">Choose a dragon for {positionLabel}</h2>
            <p className="details-summary-line">
              {dragonPoolMode === 'all-star-10'
                ? 'Planning with every mapped dragon at Star 10.'
                : 'Showing only dragons saved to your roster.'}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dragon selector">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="add-dragon-filters formation-selector-filters" aria-label="Formation dragon filters">
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
          <label>
            Damage profile
            <select value={filters.damageProfile} onChange={(event) => update({ damageProfile: event.target.value })}>
              <option value="all">All Damage profiles</option>
              {filterOptions.damageProfile.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Provides tag
            <select value={filters.provides} onChange={(event) => update({ provides: event.target.value })}>
              <option value="all">All Provides tags</option>
              {filterOptions.provides.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Synergy needs tag
            <select value={filters.benefitsFrom} onChange={(event) => update({ benefitsFrom: event.target.value })}>
              <option value="all">All Synergy needs tags</option>
              {filterOptions.benefitsFrom.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="result-count" role="status">
          Showing {filteredDragons.length} of {selectableDragons.length} dragons.
        </p>
        {filteredDragons.length > 0 ? (
          <div className="add-dragon-list formation-selector-list" aria-label="Formation dragon choices">
            {filteredDragons.map((dragon) => (
              <FormationDragonSelectorRow
                dragon={dragon}
                dragonPoolMode={dragonPoolMode}
                isAlreadySelected={selectedDragonIds.has(dragon.id)}
                key={dragon.id}
                profile={profilesById.get(dragon.id)}
                rosterEntry={roster[dragon.id]}
                roster={roster}
                onOpenDetails={onOpenDetails}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No dragons match those filters.</h3>
            <p>Clear search or filters to broaden the formation selector.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FormationDragonSelectorRow({
  dragon,
  dragonPoolMode,
  isAlreadySelected,
  profile,
  roster,
  rosterEntry,
  onOpenDetails,
  onSelect,
}: {
  dragon: Dragon;
  dragonPoolMode: FormationDragonPoolMode;
  isAlreadySelected: boolean;
  profile: (typeof simpleSynergyProfiles)[number] | undefined;
  roster: Record<string, OwnedDragon>;
  rosterEntry?: OwnedDragon;
  onOpenDetails: (dragon: Dragon) => void;
  onSelect: (dragonId: string) => void;
}) {
  const starSummary =
    dragonPoolMode === 'all-star-10'
      ? 'Star 10'
      : rosterEntry?.starRank !== null && rosterEntry?.starRank !== undefined
        ? `Star ${rosterEntry.starRank}`
        : 'Star unknown';
  const signalPreview = buildFormationSignalChips({
    profile,
    position: 'vanguard',
    formation: emptyFormation(),
    profiles: simpleSynergyProfiles,
    progression: {
      [dragon.id]: formationProgressionForDragon(dragon.id, roster, dragonPoolMode),
    },
  });

  return (
    <article className="add-dragon-row formation-selector-row">
      <div className="card-topline">
        <DragonEmblem dragon={dragon} />
        <div className="dragon-card-title">
          <h3>{dragon.name}</h3>
          <div className="dragon-card-chips" aria-label={`${dragon.name} metadata`}>
            <span className="badge">{dragon.rarity}</span>
            <span className="badge">{dragon.breed}</span>
            <span className="badge">{starSummary}</span>
            {isAlreadySelected ? <span className="badge">Already selected</span> : null}
          </div>
          <div className="formation-selector-signals">
            <CompactSignalPreview title="Damage profile" labels={signalPreview.damageProfile.map((chip) => chip.label)} />
            <CompactSignalPreview title="Provides" labels={signalPreview.provides.map((chip) => chip.label)} />
            <CompactSignalPreview title="Synergy needs" labels={signalPreview.benefitsFrom.map((chip) => chip.label)} />
          </div>
        </div>
      </div>
      <div className="add-dragon-actions">
        <button type="button" className="secondary-button" onClick={() => onOpenDetails(dragon)}>
          View details
        </button>
        <button
          type="button"
          className={isAlreadySelected ? 'secondary-button' : 'primary-button'}
          disabled={isAlreadySelected}
          onClick={() => onSelect(dragon.id)}
        >
          {isAlreadySelected ? 'Already selected' : 'Select'}
        </button>
      </div>
    </article>
  );
}

function CompactSignalPreview({ title, labels }: { title: 'Damage profile' | 'Provides' | 'Synergy needs'; labels: string[] }) {
  return (
    <div className="compact-signal-preview" aria-label={title}>
      <span className="compact-signal-title">{title}</span>
      {labels.length > 0 ? (
        <ul className="chip-list formation-chip-list">
          {labels.slice(0, 6).map((label) => (
            <li key={label} className="chip">
              {label}
            </li>
          ))}
        </ul>
      ) : (
        <span className="muted-inline">None mapped</span>
      )}
    </div>
  );
}

function hasDetailedAbilities(dragon: Dragon) {
  return Boolean(dragon.command && dragon.trait && dragon.habits.length > 0);
}

function AboutSection() {
  return (
    <section className="about-section" aria-labelledby="about-title">
      <SectionHeading
        eyebrow="Open source fan project"
        title="About"
        description="A local-first roster and formation planning tool for Dragonfire."
      />
      <div className="about-grid">
        <div className="panel readable">
          <h3>What Dragonfire Lab does</h3>
          <p>
            All 31 known dragons have detailed coverage: Legendary 9/9, Epic 10/10, and Rare
            12/12.
          </p>
          <ul className="plain-list">
            <li>Track owned dragons and saved progression.</li>
            <li>Review verified ability and profile information.</li>
            <li>Build three-dragon formations.</li>
            <li>Compare explainable Formation Ratings.</li>
            <li>Review active synergy, Kit Utilization, and placement risks.</li>
          </ul>
        </div>

        <div className="panel readable">
          <h3>Privacy and local storage</h3>
          <p>
            No login is required. Dragonfire Lab does not use private game APIs or collect
            credentials. Your roster and notes stay in your browser.
          </p>
        </div>

        <div className="panel readable">
          <h3>Community data and contributions</h3>
          <p>
            Ability and profile updates require sourced community evidence. Never submit
            credentials, private profile information, or confidential material.
          </p>
        </div>

        <div className="panel readable">
          <h3>Unofficial and open source</h3>
          <p>
            Dragonfire Lab is an unofficial community tool and is not affiliated with or
            endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones:
            Dragonfire.
          </p>
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
        <h3>Support Dragonfire Lab</h3>
        <p>
          Dragonfire Lab is free to use. Optional support helps cover hosting, ongoing dragon
          research, and continued development.
        </p>
        <p>
          <a
            className="primary-button support-link"
            href={buyMeACoffeeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Flame size={16} aria-hidden="true" /> Buy me a dragon{' '}
            <ExternalLink size={16} aria-hidden="true" />
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

function formatFormationPosition(position: FormationPosition) {
  switch (position) {
    case 'left-flank':
      return 'Left Flank';
    case 'vanguard':
      return 'Vanguard';
    case 'right-flank':
      return 'Right Flank';
  }
}
