import {
  Check,
  Circle,
  ExternalLink,
  Flame,
  Home,
  Info,
  Link,
  LockKeyhole,
  ChevronRight,
  Shield,
  Swords,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { DragonDetailsDialog } from './DragonDetailModal';
import {
  AccountDialog,
  HeaderAccountAction,
  ImportSyncDialog,
  RosterDecisionDialog,
  SetPasswordDialog,
  SignInDialog,
} from './AccountUi';
import { CompactFormationRatingSummary, SimpleFormationAnalysis } from './SimpleFormationAnalysis';
import { SimpleFormationCard } from './SimpleFormationCard';
import { RosterWorkspace } from './RosterWorkspace';
import {
  clearConsumedSelectionRequest,
  type RosterSelectionRequest,
} from './rosterWorkspaceState';
import {
  buildFormationFilterOptions,
  buildFormationSignalChips,
  currentProgressionVisibleChips,
  profileBenefitsFromLabel,
  profileDamageProfileLabel,
  profileProvidesLabel,
  type FormationSignalChip,
} from './formationCardPresentation';
import { formationSignalStateMarker } from './formationSignalPresentation';
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
import { defaultFilters, filterDragons, sortDragons, type DragonFilters } from '../services/rosterFilters';
import { applyOwnedDragonPatch, reconcileHabitLevels } from '../services/habitLevels';
import {
  createEmptyRoster,
  FORMATION_STORAGE_KEY,
  loadStoredRosterSnapshot,
  saveRosterSnapshot,
  serializeRosterExport,
  STORAGE_KEY,
  type StoredRosterSnapshot,
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
import { simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import type { SimpleProgressionByDragonId } from '../synergy/types';
import type { AccountServices } from '../cloud/types';
import { buildAuthRedirectUrl, getProductionAccountServices } from '../cloud/supabaseServices';
import { useAccountSession } from '../hooks/useAccountSession';
import { useRosterSync, type RosterSyncStatus } from '../hooks/useRosterSync';
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
  roster: 'Roster',
  team: 'Formations',
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

export function App({ accountServices: providedAccountServices }: { accountServices?: AccountServices | null } = {}) {
  const accountServices = useMemo(
    () => providedAccountServices === undefined ? getProductionAccountServices() : providedAccountServices,
    [providedAccountServices],
  );
  const [activeSection, setActiveSection] = useState<Section>(getInitialSection);
  const [rosterSnapshot, setRosterSnapshot] = useState<StoredRosterSnapshot>(() =>
    typeof window === 'undefined'
      ? { roster: createEmptyRoster(dragons), updatedAt: null }
      : loadStoredRosterSnapshot(window.localStorage, dragons),
  );
  const roster = rosterSnapshot.roster;
  const [addDragonFilters, setAddDragonFilters] = useState<DragonFilters>(defaultFilters);
  const [selectedDragon, setSelectedDragon] = useState<Dragon | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [rosterSuccessMessage, setRosterSuccessMessage] = useState<RosterSuccessMessage | null>(null);
  const [formationDragonPoolMode, setFormationDragonPoolMode] = useState<FormationDragonPoolMode>('all-star-10');
  const [formation, setFormation] = useState<Formation>(() => getInitialFormation());
  const [isAddDragonOpen, setIsAddDragonOpen] = useState(false);
  const [showAlreadyAdded, setShowAlreadyAdded] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<'account' | 'recovery' | null>(null);
  const [pendingImportedRoster, setPendingImportedRoster] = useState<Record<string, OwnedDragon> | null>(null);
  const [rosterSelectionRequest, setRosterSelectionRequest] = useState<RosterSelectionRequest | null>(null);
  const rosterSelectionRequestIdRef = useRef(0);
  const rosterSuccessTimerRef = useRef<number | null>(null);
  const [accountDialogReturnFocus, setAccountDialogReturnFocus] = useState<HTMLElement | null>(null);

  const openSignInDialog = useCallback(() => {
    setAccountDialogReturnFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setIsSignInOpen(true);
  }, []);

  const openAccountDialog = useCallback(() => {
    setAccountDialogReturnFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setIsAccountOpen(true);
  }, []);

  const { session, loading: sessionLoading, passwordRecovery, clearPasswordRecovery } = useAccountSession(accountServices?.auth ?? null);
  const applyRosterSnapshot = useCallback((nextSnapshot: StoredRosterSnapshot) => {
    setRosterSnapshot(nextSnapshot);
  }, []);
  const rosterSync = useRosterSync({
    repository: accountServices?.rosters ?? null,
    session,
    sessionLoading,
    snapshot: rosterSnapshot,
    onApplyCloud: applyRosterSnapshot,
  });

  const activePasswordDialog = passwordDialog ?? (passwordRecovery && session ? 'recovery' : null);

  useEffect(() => {
    if (rosterSnapshot.updatedAt) {
      saveRosterSnapshot(window.localStorage, rosterSnapshot.roster, rosterSnapshot.updatedAt);
    }
  }, [rosterSnapshot]);

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

  const updateRoster = (dragonId: string, patch: Partial<OwnedDragon>) => {
    const dragon = dragons.find((candidate) => candidate.id === dragonId);
    if (!dragon) return;
    setRosterSnapshot((current) => {
      const currentEntry = current.roster[dragonId] ?? {
        dragonId,
        owned: false,
        starRank: null,
        reignLevel: null,
        notes: '',
        habitLevels: {},
      };
      return {
        updatedAt: new Date().toISOString(),
        roster: {
          ...current.roster,
          [dragonId]: applyOwnedDragonPatch(dragon, currentEntry, patch),
        },
      };
    });
  };

  const addDragonToRoster = (dragonId: string) => {
    const dragonName = dragons.find((dragon) => dragon.id === dragonId)?.name ?? 'Unknown dragon';
    updateRoster(dragonId, { owned: true });
    rosterSelectionRequestIdRef.current += 1;
    setRosterSelectionRequest({
      dragonId,
      requestId: rosterSelectionRequestIdRef.current,
    });
    setIsAddDragonOpen(false);
    setRosterSuccessMessage({ text: `Added ${dragonName} to roster.` });
  };

  const consumeRosterSelectionRequest = useCallback((requestId: number) => {
    setRosterSelectionRequest((current) => clearConsumedSelectionRequest(current, requestId));
  }, []);

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

    if (session && isActiveRosterSync(rosterSync.status)) {
      setPendingImportedRoster(result.roster);
      return;
    }
    applyLocalRoster(result.roster);
    setMessage({ kind: 'success', text: 'Roster imported successfully.' });
  };

  const clearRoster = () => {
    const syncedAccount = Boolean(session && isActiveRosterSync(rosterSync.status));
    const confirmed = window.confirm(
      syncedAccount
        ? 'Clear only this browser roster? Your account roster will not be deleted and may reload until you resolve which roster to use.'
        : 'Clear your local Dragonfire Lab data? This cannot be undone.',
    );
    if (!confirmed) {
      return;
    }
    if (syncedAccount) {
      rosterSync.pauseForLocalChange();
    }
    window.localStorage.removeItem(STORAGE_KEY);
    applyLocalRoster(createEmptyRoster(dragons));
    setMessage({
      kind: 'info',
      text: syncedAccount
        ? 'This browser roster was cleared. Account synchronization is paused.'
        : 'Local roster data was cleared.',
    });
  };

  const applyLocalRoster = (nextRoster: Record<string, OwnedDragon>) => {
    setRosterSnapshot({ roster: nextRoster, updatedAt: new Date().toISOString() });
  };

  const requestMagicLink = async (email: string) => {
    if (!accountServices) {
      return;
    }
    await accountServices.auth.sendMagicLink(email, buildAuthRedirectUrl(window.location));
  };

  const signInWithGoogle = async () => {
    if (!accountServices) return;
    await accountServices.auth.signInWithGoogle(buildAuthRedirectUrl(window.location));
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!accountServices) return;
    await accountServices.auth.signInWithPassword(email, password);
  };

  const signUpWithPassword = async (email: string, password: string) => {
    if (!accountServices) return { session: null };
    return accountServices.auth.signUpWithPassword(email, password, buildAuthRedirectUrl(window.location));
  };

  const requestPasswordReset = async (email: string) => {
    if (!accountServices) return;
    await accountServices.auth.sendPasswordReset(email, buildAuthRedirectUrl(window.location));
  };

  const updatePassword = async (password: string) => {
    if (!accountServices) return;
    await accountServices.auth.updatePassword(password);
  };

  const signOut = async () => {
    if (!accountServices) {
      return;
    }
    try {
      await accountServices.auth.signOut();
      setIsAccountOpen(false);
      setMessage({ kind: 'info', text: 'Signed out. Your roster remains saved in this browser.' });
    } catch {
      setMessage({ kind: 'error', text: 'Could not sign out. Please try again.' });
    }
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
      text: `My Roster mode cleared unavailable slot${unavailablePositions.length === 1 ? '' : 's'}: ${unavailablePositions
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
        <div className="site-header-inner">
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
                  aria-current={activeSection === section ? 'page' : undefined}
                  onClick={() => selectSection(section)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{sectionLabels[section]}</span>
                </button>
              );
            })}
          </nav>
          {accountServices ? (
            <div className="header-account-area">
              <HeaderAccountAction
                session={session}
                sessionLoading={sessionLoading}
                status={rosterSync.status}
                onOpenAccount={openAccountDialog}
                onOpenSignIn={openSignInDialog}
              />
            </div>
          ) : null}
        </div>
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
          <RosterWorkspace
            allDragons={dragons}
            roster={roster}
            successMessage={rosterSuccessMessage}
            selectionRequest={rosterSelectionRequest}
            onSelectionRequestConsumed={consumeRosterSelectionRequest}
            onUpdateRoster={updateRoster}
            onOpenDetails={setSelectedDragon}
            onOpenAddDragon={openAddDragon}
            onExport={exportRoster}
            onImport={(event) => void importRoster(event)}
            onClear={clearRoster}
            accountConfigured={accountServices !== null}
            session={session}
            syncStatus={rosterSync.status}
            onOpenAccount={openAccountDialog}
            onOpenSignIn={openSignInDialog}
            onResolveSync={rosterSync.reopenDecision}
            onRetrySync={rosterSync.retry}
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

        {activeSection === 'about' ? <AboutSection accountConfigured={accountServices !== null} /> : null}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p className="site-footer-copy">
            Dragonfire Lab is an unofficial community tool. It is not affiliated with or
            endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones:
            Dragonfire.
          </p>
          <p className="site-footer-copy">
            {accountServices
              ? 'Your roster stays stored in this browser and is only sent to your account after you sign in and choose synchronization.'
              : 'Roster data stays in your browser.'}{' '}
            Public verification wording is summarized from official roster pages, screenshot evidence, and curated community review.
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

      {isSignInOpen && accountServices ? (
        <SignInDialog
          onClose={() => setIsSignInOpen(false)}
          onGoogle={signInWithGoogle}
          onPasswordSignIn={signInWithPassword}
          onSignUp={signUpWithPassword}
          onPasswordReset={requestPasswordReset}
          onRequestLink={requestMagicLink}
          returnFocus={accountDialogReturnFocus}
        />
      ) : null}

      {isAccountOpen && session ? (
        <AccountDialog
          session={session}
          status={rosterSync.status}
          errorMessage={rosterSync.errorMessage}
          onClose={() => setIsAccountOpen(false)}
          onResolve={() => {
            setIsAccountOpen(false);
            rosterSync.reopenDecision();
          }}
          onRetry={rosterSync.retry}
          onSetPassword={() => {
            setIsAccountOpen(false);
            setPasswordDialog('account');
          }}
          onSignOut={signOut}
          onSyncNow={rosterSync.syncNow}
          returnFocus={accountDialogReturnFocus}
        />
      ) : null}

      {activePasswordDialog && session && accountServices ? (
        <SetPasswordDialog
          recovery={activePasswordDialog === 'recovery'}
          onClose={() => {
            if (activePasswordDialog === 'recovery') clearPasswordRecovery();
            setPasswordDialog(null);
          }}
          onSave={updatePassword}
          onCompleted={() => {}}
          returnFocus={accountDialogReturnFocus}
        />
      ) : null}

      {rosterSync.status === 'migration-required' || rosterSync.status === 'conflict' ? (
        <RosterDecisionDialog
          status={rosterSync.status}
          comparison={rosterSync.comparison}
          onSaveBrowser={rosterSync.saveBrowserToAccount}
          onUseAccount={rosterSync.useAccountRoster}
          onPause={rosterSync.pause}
        />
      ) : null}

      {pendingImportedRoster ? (
        <ImportSyncDialog
          onCancel={() => setPendingImportedRoster(null)}
          onReplace={() => {
            applyLocalRoster(pendingImportedRoster);
            setPendingImportedRoster(null);
            setMessage({ kind: 'success', text: 'Roster imported and queued for account synchronization.' });
          }}
          onImportLocally={() => {
            applyLocalRoster(pendingImportedRoster);
            rosterSync.pauseForLocalChange();
            setPendingImportedRoster(null);
            setMessage({ kind: 'info', text: 'Roster imported in this browser. Account synchronization is paused.' });
          }}
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
  const versionLabel = `v${databaseMetadata.databaseVersion}`;
  const reviewedAbilityCount = simpleSynergyAbilityReviews.length;
  const profileCount = simpleSynergyProfiles.length;

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
          <p className="eyebrow">Roster and formation planner</p>
          <h2>Build stronger formations from your dragon roster.</h2>
          <p>
            Track your dragons, compare explainable formation ratings, and understand which abilities work together.
          </p>
        </div>
      </div>

      <div className="overview-feature-grid" aria-label="Overview highlights">
        <FeatureCard
          icon={Users}
          title="Track Your Roster"
          description="Save ownership, Star Rank, Dragon Level, Habit Levels, and notes in this browser."
          onClick={onRoster}
        />
        <FeatureCard
          icon={Swords}
          title="Build Formations"
          description="Build three-dragon formations, compare explainable ratings, and review active synergies and placement risks."
          onClick={onTeam}
        />
        <FeatureCard
          icon={Flame}
          title="Understand Formation Ratings"
          description="Compare realized synergy, support usefulness, Kit Utilization, and conflict risk."
          onClick={onTeam}
        />
      </div>

      <div className="dataset-status-strip" aria-label="Dataset status">
        <div className="dataset-status-introduction">
          <p className="eyebrow">Dataset breadth</p>
          <p>Curated coverage at a glance</p>
        </div>
        <div className="dataset-status-item">
          <strong>{detailedAbilityCount} / {dragons.length}</strong>
          <span>dragons mapped</span>
        </div>
        <div className="dataset-status-item">
          <strong>{reviewedAbilityCount}</strong>
          <span>abilities reviewed</span>
        </div>
        <div className="dataset-status-item">
          <strong>{profileCount}</strong>
          <span>curated synergy profiles</span>
        </div>
      </div>

      <div className="overview-footer-grid">
        <div className="latest-update-panel panel readable">
          <p className="eyebrow">Current data</p>
          <h3>Latest release — {versionLabel}</h3>
          <p>This release completes the current controller-reviewed screenshot-source fidelity pass for all 31 dragons, preserving effect values, Habit Level progressions, targeting, status definitions, scaling, mitigation, and visible source uncertainty; curated synergy profiles remain unchanged.</p>
        </div>
        <div className="notice-panel trust-note readable">
          <p className="eyebrow">Local first</p>
          <h3>Private by design</h3>
          <p>
            Works without an account. Your roster is stored in this browser, and Dragonfire Lab
            does not use private game APIs.
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
  return reconcileHabitLevels(dragon, {
    dragonId: dragon.id,
    owned: true,
    starRank: 10,
    reignLevel: saved?.reignLevel ?? null,
    notes: saved?.notes ?? '',
    habitLevels: saved?.habitLevels ?? {},
  });
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
      <div className="formation-workspace-header">
        <h2 id="team-title">Formation Builder</h2>
        <p>Assign one unique dragon to each position and review curated profile relationships.</p>
      </div>
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
            <span>All Dragons — Star 10</span>
          </label>
          <label className={dragonPoolMode === 'roster' ? 'formation-mode-option is-active' : 'formation-mode-option'}>
            <input
              type="radio"
              name="formation-dragon-pool"
              checked={dragonPoolMode === 'roster'}
              onChange={() => onDragonPoolModeChange('roster')}
            />
            <span>My Roster</span>
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
      <div className="formation-chip-legend" role="note" aria-label="Signal state legend">
        <span><Check size={14} aria-hidden="true" /> Active or satisfied</span>
        <span><X size={14} aria-hidden="true" /> Missing or inactive</span>
        <span><Circle size={13} aria-hidden="true" /> Available</span>
        <span><LockKeyhole size={13} aria-hidden="true" /> Progression locked</span>
      </div>
      <CompactFormationRatingSummary presentation={presentation} rating={rating} />
      <div className="formation-board" aria-label="Formation positions">
        {FORMATION_POSITIONS.map((position) => {
          const dragon = dragons.find((candidate) => candidate.id === formation[position]) ?? null;
          return (
            <SimpleFormationCard
              key={`${position}:${dragon?.id ?? 'empty'}`}
              position={position}
              dragon={dragon}
              rosterEntry={dragon ? formationRosterEntryForDragon(dragon, roster, dragonPoolMode) : undefined}
              profile={dragon ? profilesById.get(dragon.id) : undefined}
              signalChips={signalChipsByPosition[position]}
              movementOccupancy={Object.fromEntries(
                FORMATION_POSITIONS.filter((target) => target !== position).map((target) => [target, Boolean(formation[target])]),
              )}
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
                ? 'Showing all dragons at Star Rank 10. Dragon Level and Habit Levels are not forced to maximum.'
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
                formation={formation}
                isAlreadySelected={selectedDragonIds.has(dragon.id)}
                key={dragon.id}
                profile={profilesById.get(dragon.id)}
                rosterEntry={roster[dragon.id]}
                roster={roster}
                position={position}
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
  formation,
  isAlreadySelected,
  profile,
  roster,
  rosterEntry,
  position,
  onOpenDetails,
  onSelect,
}: {
  dragon: Dragon;
  dragonPoolMode: FormationDragonPoolMode;
  formation: Formation;
  isAlreadySelected: boolean;
  profile: (typeof simpleSynergyProfiles)[number] | undefined;
  roster: Record<string, OwnedDragon>;
  rosterEntry?: OwnedDragon;
  position: FormationPosition;
  onOpenDetails: (dragon: Dragon) => void;
  onSelect: (dragonId: string) => void;
}) {
  const starSummary =
    dragonPoolMode === 'all-star-10'
      ? 'Star 10'
      : rosterEntry?.starRank !== null && rosterEntry?.starRank !== undefined
        ? `Star ${rosterEntry.starRank}`
        : 'Star unknown';
  const tentativeFormation = preventDuplicateFormationPlacement(formation, position, dragon.id);
  const tentativeProgression = Object.fromEntries(
    FORMATION_POSITIONS.flatMap((formationPosition) => {
      const dragonId = tentativeFormation[formationPosition];
      return dragonId
        ? [[dragonId, formationProgressionForDragon(dragonId, roster, dragonPoolMode)]]
        : [];
    }),
  );
  const signalPreview = buildFormationSignalChips({
    profile,
    position,
    formation: tentativeFormation,
    profiles: simpleSynergyProfiles,
    progression: tentativeProgression,
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
            <CompactSignalPreview title="Damage profile" chips={signalPreview.damageProfile} />
            <CompactSignalPreview title="Provides" chips={signalPreview.provides} />
            <CompactSignalPreview title="Synergy needs" chips={signalPreview.benefitsFrom} />
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

function CompactSignalPreview({ title, chips }: { title: 'Damage profile' | 'Provides' | 'Synergy needs'; chips: FormationSignalChip[] }) {
  const visibleChips = title === 'Damage profile' ? chips : currentProgressionVisibleChips(chips);
  const emptyMessage = title === 'Provides' ? 'No currently unlocked Provides signals.' : 'No currently unlocked synergy needs.';
  return (
    <div className="compact-signal-preview" aria-label={title}>
      <span className="compact-signal-title">{title}</span>
      {visibleChips.length > 0 ? (
        <ul className="chip-list formation-chip-list">
          {visibleChips.slice(0, 6).map((chip) => {
            const { Icon, marker } = formationSignalStateMarker(chip);
            return (
              <li
                aria-label={`${chip.label} ${chip.state}. ${chip.reason}`}
                className={`chip formation-signal-chip signal-${chip.state}`}
                data-state={chip.state}
                key={chip.label}
                title={`${chip.label}: ${chip.reason}`}
              >
                <Icon className="signal-state-icon" data-state-marker={marker} size={13} aria-hidden="true" />
                {chip.label}
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="muted-inline">{chips.length > 0 ? emptyMessage : 'None mapped'}</span>
      )}
    </div>
  );
}

function hasDetailedAbilities(dragon: Dragon) {
  return Boolean(dragon.command && dragon.trait && dragon.habits.length > 0);
}

function AboutSection({ accountConfigured }: { accountConfigured: boolean }) {
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
            game credentials. {accountConfigured
              ? 'Your roster and notes stay in your browser unless you sign in by email and choose account synchronization.'
              : 'Your roster and notes stay in your browser.'}
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

function isActiveRosterSync(status: RosterSyncStatus): boolean {
  return status === 'synced' || status === 'syncing' || status === 'offline' || status === 'error';
}
