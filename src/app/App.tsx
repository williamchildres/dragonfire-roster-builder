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
  Sparkles,
  Swords,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { DragonDetailsDialog } from './DragonDetailModal';
import { SupportOptionsDialog } from './SupportOptionsDialog';
import {
  AccountDialog,
  HeaderAccountAction,
  ImportSyncDialog,
  RosterDecisionDialog,
  SetPasswordDialog,
  SignInDialog,
} from './AccountUi';
import { SimpleFormationAnalysis } from './SimpleFormationAnalysis';
import { SimpleFormationCard } from './SimpleFormationCard';
import { RosterWorkspace } from './RosterWorkspace';
import {
  AppLink,
  canonicalRouteFromLocation,
  routeMetadata,
  routePaths,
  type AppRoute,
  type NavigateToRoute,
} from './appRouter';
import {
  DEFAULT_OPTIMIZER_ALLOCATION_MODE,
  RosterOptimizer,
} from './RosterOptimizer';
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
import { repository } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { productMetrics } from '../data/productMetrics';
import { releaseHistory } from '../data/releaseHistory';
import { supportLinks } from '../data/supportLinks';
import { estimateFormationPower } from '../power/estimatedFormationPower';
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
import { addMissingDragonsToRoster, markDragonOwned } from '../services/rosterOwnership';
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
import { rateFormationV3 } from '../services/formationRatingV3';
import { compareFormationPlacementsV3 } from '../services/formationPlacementComparisonV3';
import { buildFormationRecommendationV3 } from '../services/formationRecommendationV3';
import { reliabilityProgressionForFormation } from '../services/formationReliabilityProgression';
import { buildFormationFindings } from '../services/formationFindings';
import { currentRosterProgression, isRosterDragonEligible } from '../services/rosterEligibility';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { buildSemanticRelationships } from '../synergy/semanticRelationships';
import type { SimpleProgressionByDragonId } from '../synergy/types';
import type { AccountServices } from '../cloud/types';
import { buildAuthRedirectUrl, getProductionAccountServices } from '../cloud/supabaseServices';
import { useAccountSession } from '../hooks/useAccountSession';
import { useRosterSync, type RosterSyncStatus } from '../hooks/useRosterSync';
import type { RosterOptimizerRunner } from '../optimizer/rosterOptimizerClient';
import type {
  FlexiblePowerAwareOptimizationResult,
  OptimizerAllocationMode,
} from '../optimizer/rosterOptimizerTypes';
export { RawWordingDisclosure } from './DragonDetailModal';

type Section = AppRoute;
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
  overview: 'Overview',
  roster: 'Roster',
  formations: 'Formations',
  optimizer: 'Optimizer',
  about: 'About',
  updates: 'Updates',
};

const primarySections: Section[] = ['overview', 'roster', 'formations', 'optimizer', 'about'];

const sectionIcons = {
  overview: Home,
  roster: Users,
  formations: Swords,
  optimizer: Sparkles,
  about: Info,
  updates: Flame,
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

export function App({
  accountServices: providedAccountServices,
  optimizerRunner,
}: {
  accountServices?: AccountServices | null;
  optimizerRunner?: RosterOptimizerRunner;
} = {}) {
  const accountServices = useMemo(
    () => providedAccountServices === undefined ? getProductionAccountServices() : providedAccountServices,
    [providedAccountServices],
  );
  const [activeSection, setActiveSection] = useState<Section>(getInitialSection);
  const [isSupportOptionsOpen, setIsSupportOptionsOpen] = useState(false);
  const [optimizerAllocationMode, setOptimizerAllocationMode] = useState<OptimizerAllocationMode>(
    DEFAULT_OPTIMIZER_ALLOCATION_MODE,
  );
  const [optimizerFormationCount, setOptimizerFormationCount] = useState(10);
  const [optimizerResult, setOptimizerResult] =
    useState<FlexiblePowerAwareOptimizationResult | null>(null);
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
  const focusHeadingAfterNavigationRef = useRef(false);

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
    const onPopState = () => setActiveSection(getInitialSection());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = routeMetadata[activeSection].title;
    const canonicalUrl = `https://dragonfirelab.com${routePaths[activeSection]}`;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);

    if (focusHeadingAfterNavigationRef.current) {
      focusHeadingAfterNavigationRef.current = false;
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('#main-content h2')?.focus();
      });
    }
  }, [activeSection]);

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
      const ownershipTransition = patch.owned === true && currentEntry.owned !== true
        ? markDragonOwned(dragon, currentEntry)
        : currentEntry;
      return {
        updatedAt: new Date().toISOString(),
        roster: {
          ...current.roster,
          [dragonId]: applyOwnedDragonPatch(dragon, ownershipTransition, patch),
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

  const addAllDragonsToRoster = () => {
    setRosterSnapshot((current) => {
      const result = addMissingDragonsToRoster(dragons, current.roster);
      if (result.addedDragonIds.length === 0) return current;
      const count = result.addedDragonIds.length;
      setRosterSuccessMessage({
        text: result.restoredProgressionCount > 0
          ? `Added ${count} ${count === 1 ? 'dragon' : 'dragons'}. New roster entries started at Star 1 and Dragon Level 1; saved progression was preserved.`
          : `Added ${count} ${count === 1 ? 'dragon' : 'dragons'} at Star 1 and Dragon Level 1.`,
      });
      return { roster: result.roster, updatedAt: new Date().toISOString() };
    });
  };

  const consumeRosterSelectionRequest = useCallback((requestId: number) => {
    setRosterSelectionRequest((current) => clearConsumedSelectionRequest(current, requestId));
  }, []);

  const openAddDragon = () => {
    setAddDragonFilters(defaultFilters);
    setShowAlreadyAdded(false);
    setIsAddDragonOpen(true);
  };

  const selectSection: NavigateToRoute = (section, options) => {
    const nextUrl = routePaths[section];
    if (options?.replace) {
      window.history.replaceState(null, '', nextUrl);
    } else if (window.location.pathname !== nextUrl || window.location.hash || window.location.search) {
      window.history.pushState(null, '', nextUrl);
    }
    setActiveSection(section);
    if (section !== 'roster') {
      setRosterSuccessMessage(null);
    }
    focusHeadingAfterNavigationRef.current = options?.keyboard === true;
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    const url = `${window.location.origin}${routePaths.formations}${shareHash}`;
    window.history.replaceState(null, '', `${routePaths.formations}${shareHash}`);
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
      return dragonId ? !isRosterDragonEligible(roster[dragonId]) : false;
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

  const openOptimizedFormation = (arrangement: Formation) => {
    setFormation(arrangement);
    setFormationDragonPoolMode('roster');
    selectSection('formations');
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <AppLink className="brand-lockup brand-link" route="overview" navigate={selectSection} ariaLabel="Dragonfire Lab Overview">
            <span className="brand-mark" aria-hidden="true">
              <Flame size={28} />
            </span>
            <div>
              <p className="eyebrow">Unofficial community tool</p>
              <h1>Dragonfire Lab</h1>
            </div>
          </AppLink>
          <nav aria-label="Primary sections" className="section-nav">
            {primarySections.map((section) => {
              const Icon = sectionIcons[section];
              return (
                <AppLink
                  className={activeSection === section ? 'nav-button is-active' : 'nav-button'}
                  key={section}
                  ariaCurrent={activeSection === section ? 'page' : undefined}
                  route={section}
                  navigate={selectSection}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{sectionLabels[section]}</span>
                </AppLink>
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

        {activeSection === 'overview' ? (
          <HomeSection navigate={selectSection} />
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
            onAddAllDragons={addAllDragonsToRoster}
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

        {activeSection === 'formations' ? (
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

        {activeSection === 'optimizer' ? (
          <RosterOptimizer
            allDragons={dragons}
            roster={roster}
            allocationMode={optimizerAllocationMode}
            onAllocationModeChange={setOptimizerAllocationMode}
            formationCount={optimizerFormationCount}
            onFormationCountChange={setOptimizerFormationCount}
            result={optimizerResult}
            onResultChange={setOptimizerResult}
            runner={optimizerRunner}
            onOpenFormation={openOptimizedFormation}
            onOpenRoster={() => selectSection('roster')}
            onNavigate={selectSection}
          />
        ) : null}

        {activeSection === 'about' ? <AboutSection accountConfigured={accountServices !== null} /> : null}
        {activeSection === 'updates' ? <UpdatesSection navigate={selectSection} /> : null}
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
          <div className="site-footer-actions" aria-label="Feedback and support">
            <a className="secondary-button support-link" href={supportLinks.emailHref}>
              Feedback &amp; support
            </a>
            {activeSection !== 'about' ? (
              <button
                aria-expanded={isSupportOptionsOpen}
                aria-haspopup="dialog"
                className="secondary-button support-link"
                onClick={() => setIsSupportOptionsOpen(true)}
                type="button"
              >
                Support options
              </button>
            ) : null}
          </div>
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

      {isSupportOptionsOpen ? <SupportOptionsDialog onClose={() => setIsSupportOptionsOpen(false)} /> : null}

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

function HomeSection({ navigate }: { navigate: NavigateToRoute }) {
  const latestRelease = releaseHistory[0]!;

  return (
    <section className="overview-section" aria-label="Overview">
      <div className="overview-introduction">
        <p className="eyebrow">Roster and formation planner</p>
        <h2 tabIndex={-1}>Build stronger formations from your dragon roster.</h2>
        <p>
          Track progression, compare explainable Formation Ratings, and generate exact non-overlapping roster plans from the dragons you own.
        </p>
      </div>

      <div className="overview-feature-grid" aria-label="Primary workflows">
        <FeatureCard
          icon={Users}
          title="Track Your Roster"
          description="Track ownership, Star Rank, Dragon Level, Habit Levels, Estimated Power, and personal notes."
          route="roster"
          navigate={navigate}
        />
        <FeatureCard
          icon={Swords}
          title="Build Formations"
          description="Build three-dragon formations, compare transparent Formation Ratings, and review all six possible placements."
          route="formations"
          navigate={navigate}
        />
        <FeatureCard
          icon={Sparkles}
          title="Optimize Your Roster"
          description="Choose 1–11 exact non-overlapping armies, then prioritize the strongest first army or balance the full collection."
          route="optimizer"
          navigate={navigate}
        />
      </div>

      <div className="dataset-status-strip" aria-label="Dataset status">
        <div className="dataset-status-introduction">
          <p className="eyebrow">Dataset breadth</p>
          <p>Curated coverage at a glance</p>
        </div>
        <div className="dataset-status-item">
          <strong>{productMetrics.detailedDragonCount} / {productMetrics.dragonCount}</strong>
          <span>dragons mapped</span>
        </div>
        <div className="dataset-status-item">
          <strong>{productMetrics.reviewedAbilityCount}</strong>
          <span>abilities reviewed</span>
        </div>
        <div className="dataset-status-item">
          <strong>{productMetrics.curatedProfileCount}</strong>
          <span>curated synergy profiles</span>
        </div>
      </div>

      <section className="latest-update-panel panel readable" aria-labelledby="recent-update-title">
        <div>
          <p className="eyebrow">Recent Update</p>
          <h3 id="recent-update-title">Version {latestRelease.version}</h3>
          <p className="release-date"><time dateTime={latestRelease.date}>{latestRelease.date}</time></p>
        </div>
        <ul className="plain-list">
          {latestRelease.items.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
        </ul>
        <AppLink className="secondary-button latest-update-link" route="updates" navigate={navigate}>
          View all updates <ChevronRight size={16} aria-hidden="true" />
        </AppLink>
      </section>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  route,
  navigate,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  route: AppRoute;
  navigate: NavigateToRoute;
}) {
  return (
    <AppLink
      ariaLabel={`${title}: open ${routePaths[route]}`}
      className="feature-card feature-card-link"
      route={route}
      navigate={navigate}
    >
      <div className="feature-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div className="feature-card-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="feature-card-action" aria-hidden="true">
        Open <ChevronRight size={14} />
      </span>
    </AppLink>
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
  const current = currentRosterProgression(entry);
  return {
    ...current,
    starRank: mode === 'all-star-10' ? 10 : current.starRank,
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
  const selectableDragons = dragons.filter(
    (dragon) => dragonPoolMode === 'all-star-10' || isRosterDragonEligible(roster[dragon.id]),
  );
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
  const reliabilityProgression = useMemo(
    () =>
      reliabilityProgressionForFormation({
        formation,
        dragons,
        roster,
        simpleProgression: progression,
        planningHabitLevel: dragonPoolMode === 'all-star-10' ? 5 : undefined,
      }),
    [dragonPoolMode, formation, progression, roster],
  );
  const simpleResults = useMemo(
    () => selectedCount >= 2
      ? evaluateFormation({
          formation,
          progression,
          profiles: simpleSynergyProfiles,
        }).results
      : [],
    [formation, progression, selectedCount],
  );
  const semanticRelationships = useMemo(
    () => buildSemanticRelationships(simpleResults, simpleSynergyProfiles),
    [simpleResults],
  );
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
  const placementComparison = useMemo(
    () => compareFormationPlacementsV3({
      formation,
      progression,
      reliabilityProgression,
      profiles: simpleSynergyProfiles,
    }),
    [formation, progression, reliabilityProgression],
  );
  const rating = useMemo(
    () => rateFormationV3({
      formation,
      dragons,
      profiles: simpleSynergyProfiles,
      progression,
      reliabilityProgression,
    }),
    [formation, progression, reliabilityProgression],
  );
  const estimatedPower = useMemo(
    () => placementComparison
      ? estimateFormationPower({
          formation: placementComparison.current.arrangement,
          dragons,
          progression,
        })
      : null,
    [placementComparison, progression],
  );
  const dragonNamesById = useMemo(
    () => new Map(dragons.map((dragon) => [dragon.id, dragon.name])),
    [],
  );
  const recommendation = useMemo(
    () => buildFormationRecommendationV3({
      comparison: placementComparison,
      progression,
      dragonNamesById,
      confidence: rating.confidence.status,
    }),
    [dragonNamesById, placementComparison, progression, rating.confidence.status],
  );
  const findings = useMemo(
    () => buildFormationFindings({
      formation,
      progression,
      profiles: simpleSynergyProfiles,
      results: simpleResults,
      relationships: semanticRelationships,
      signalChipsByDragonId,
      recommendation,
      rating,
    }),
    [formation, progression, rating, recommendation, semanticRelationships, signalChipsByDragonId, simpleResults],
  );

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
        <h2 id="team-title" tabIndex={-1}>Formation Builder</h2>
        <p>
          Assign one unique dragon to each position and review reliability-adjusted
          relationships. All Dragons planning evaluates unlocked Habits at Level 5.
        </p>
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
      <SimpleFormationAnalysis
        rating={rating}
        estimatedPower={estimatedPower}
        dragonNamesById={dragonNamesById}
        findings={findings}
        recommendation={recommendation}
        placementComparison={placementComparison}
      />
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
                ? 'Showing all dragons at Star Rank 10 with the existing Dragon Level planning convention; unlocked Habits are evaluated at Level 5.'
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

function AboutSection({ accountConfigured }: { accountConfigured: boolean }) {
  return (
    <section className="about-section" aria-labelledby="about-title">
      <SectionHeading
        eyebrow="Open source fan project"
        title="About"
        description="How Dragonfire Lab turns reviewed dragon data into reproducible formation recommendations."
      />
      <dl className="methodology-metrics" aria-label="Methodology at a glance">
        <MetricDefinition value={productMetrics.detailedDragonCount} label="dragons with detailed coverage" />
        <MetricDefinition value={productMetrics.reviewedAbilityCount} label="abilities reviewed" />
        <MetricDefinition value={productMetrics.curatedScoringSignalCount} label="curated scoring signals" />
        <MetricDefinition value={productMetrics.orderedFormationPlacementCount} label="ordered placements audited" />
        <MetricDefinition value={productMetrics.optimizerCandidateCount} label="unique trio candidates" />
        <MetricDefinition value="500+" label="automated tests" />
      </dl>

      <div className="methodology-layout">
        <section className="methodology-section panel readable">
          <p className="eyebrow">Reviewed data</p>
          <h3>Evidence becomes structured records</h3>
          <p>
            Dragon identity, affinities, Commands, Traits, Habits, unlocks, values, and targeting are reviewed from sourced evidence. Screenshot evidence and official roster material are reconciled into structured canonical records; the result is community-reviewed, not official game data.
          </p>
          <p>
            Unknown information stays unknown rather than being invented. Every ability receives an explicit synergy disposition, and only mechanics that can be represented responsibly become scoring signals. Enemy-only, self-only, unresolved, or non-pair-specific mechanics can remain descriptive instead of being forced into a relationship score.
          </p>
        </section>

        <section className="methodology-section panel readable">
          <p className="eyebrow">Reproducible recommendations</p>
          <h3>Why this is different from asking AI for formations</h3>
          <p>
            AI can help interpret or summarize game information, but a one-off prompt does not itself provide Dragonfire Lab's versioned source dataset, explicit unlock and placement rules, deterministic semantic relationships, exhaustive six-arrangement trio comparison, exact 30-dragon non-overlap constraints, reproducible solver objective hierarchy, regression tests, or deterministic audit hashes.
          </p>
          <p>
            Dragonfire Lab produces the same result from the same release, roster, progression, and strategy. That makes its recommendation inspectable and repeatable; it does not simulate combat or guarantee the strongest possible in-game army.
          </p>
        </section>

        <section className="methodology-section panel readable" id="formation-rating-methodology">
          <p className="eyebrow">Formation Rating v3</p>
          <h3>An explainable 100-point planning score</h3>
          <p className="methodology-formula">
            <strong>Formation Rating</strong> = Active Synergy, maximum 80 + Placement Effectiveness, maximum 20
          </p>
          <p>
            Active Synergy maps canonical provider-to-beneficiary relationships and weights them by documented activation reliability. Guaranteed and statically proven relationships keep full value; supported chance activation may reduce contribution. Conditional or insufficiently documented activation remains unquantified, and its potential is shown without entering the numeric score.
          </p>
          <p>
            Placement Effectiveness evaluates all six assignments using reliability-adjusted relationship value. Small or immaterial differences remain neutral; a placement recommendation appears only when the improvement is meaningful.
          </p>
          <p>Supported cumulative probability is used only for exact opportunities with confirmed independence. Reliability does not measure damage or Recovery magnitude, duration, target count, or win probability. Formation Rating is unofficial, explainable planning logic—not a combat simulator or guarantee of the best possible formation.</p>
          <details>
            <summary>Technical details</summary>
            <p>The rating uses versioned reliability bindings, structured probability traces, canonical semantic edges, and deterministic placement comparison. Full-roster audits evaluate every ordered three-dragon placement and lock numeric and full-contract output with separate hashes.</p>
          </details>
        </section>

        <section className="methodology-section panel readable" id="estimated-power-methodology">
          <p className="eyebrow">Estimated Power v2</p>
          <h3>An empirical progression estimate</h3>
          <p className="methodology-formula">
            <strong>Estimated Power</strong> = rarity-specific Star contribution + rarity-specific Dragon Level contribution
          </p>
          <p>
            Exact observed rarity, Star Rank, and Dragon Level tuples return their observed displayed Power. The current model uses 59 provenance observations representing 42 unique progression tuples. Values between supported anchors use piecewise-linear interpolation; unsupported progression uses documented conservative extrapolation, and levels below the main support region scale from the Level-20 estimate.
          </p>
          <p>
            Outputs round to the nearest 10, monotonic rarity ordering is enforced, and confidence is shown as Observed, Modeled, or Low. Only rarity, Star Rank, and Dragon Level are inputs. Habit Levels, notes, private combat stats, and account-specific displayed stats are not inputs.
          </p>
          <p>This is an empirical unofficial estimate, not the game's private formula and not a combat-power simulation.</p>
          <details>
            <summary>Technical details</summary>
            <p>Model version: estimated-power-v2. Support, interpolation, extrapolation, rounding, monotonicity, and the full numerical grid are validated deterministically before release.</p>
          </details>
        </section>

        <section className="methodology-section panel readable" id="optimizer-methodology">
          <p className="eyebrow">Exact optimizer</p>
          <h3>Ten formations without dragon reuse</h3>
          <p>
            Every eligible unique trio is generated, all six placements are evaluated, and the strongest retained placement becomes a candidate. With {productMetrics.dragonCount} eligible dragons, that is {productMetrics.optimizerCandidateCount.toLocaleString()} trio candidates. The exact optimizer selects ten three-dragon formations: 30 dragons are used once and three remain unused.
          </p>
          <p>
            HiGHS solves the defined lexicographic objectives. Every production phase requires optimal status with zero configured MIP gap, and deterministic stable ordering resolves exact ties. No greedy or approximate result is labeled “Proven optimal.”
          </p>
          <p>
            The Power-Aware optimizer can build 1–11 armies. Strongest Armies First claims the strongest remaining exact trio at each rank; Balance All Armies maximizes the weakest integer-power position first, then every next position before Formation Rating and relationship tie-breaks.
          </p>
          <details>
            <summary>Technical details</summary>
            <p>Release 0.19.1 added exact integer reconstruction and independent one-integer improvement certification for materially contaminated solver objectives while preserving zero-gap solving and objective order.</p>
          </details>
        </section>

        <section className="methodology-section panel readable">
          <p className="eyebrow">Testing and validation</p>
          <h3>Plausible is not enough</h3>
          <p>
            Validation includes 500+ automated tests, all {productMetrics.orderedFormationPlacementCount.toLocaleString()} ordered three-dragon placements, Formation Rating regression audits, Estimated Power fit/support/monotonicity/full-grid checks, exact optimizer oracle fixtures, forward and reversed input-order determinism, archived 31-dragon and current 33-dragon protections, real-roster numerical regression coverage, deterministic semantic and result hashes, and desktop/mobile QA before releases.
          </p>
          <p>A recommendation is not accepted only because it looks plausible. The same inputs must reproduce the same audited result, and algorithm changes must explain any changed hash. This is project validation, not independent third-party certification.</p>
        </section>
      </div>

      <div className="about-grid about-trust-grid">
        <section className="panel readable">
          <h3>Privacy and local storage</h3>
          <p>No game credentials are requested and no private game API is used. {accountConfigured
            ? 'Roster data remains in this browser unless you sign in and choose synchronization.'
            : 'Roster data remains in this browser.'}</p>
        </section>
        <section className="panel readable">
          <h3>Community data and contributions</h3>
          <p>Sourced corrections are welcome. Never submit credentials, private profile information, or confidential material.</p>
          <p>
            Have feedback, found a data issue, or need help using Dragonfire Lab? Email{' '}
            <a aria-label="Email Dragonfire Lab support" href={supportLinks.emailHref}>{supportLinks.email}</a>.
          </p>
        </section>
        <section className="panel readable">
          <h3>Unofficial and open source</h3>
          <p>Dragonfire Lab is an unofficial community tool and is not affiliated with or endorsed by Warner Bros. Entertainment, HBO, or the developers of Game of Thrones: Dragonfire.</p>
          <p>The project is open source on <a href={repository.url} target="_blank" rel="noreferrer">GitHub <ExternalLink size={14} aria-hidden="true" /></a>.</p>
        </section>
      </div>

      <section className="support-panel panel readable">
        <p className="eyebrow">Optional support</p>
        <h3>Support Dragonfire Lab</h3>
        <p>
          Dragonfire Lab is free to use. Optional support helps cover hosting, ongoing dragon
          research, and continued development.
        </p>
        <div className="support-actions">
          <a
            className="primary-button support-link"
            href={supportLinks.buyMeACoffee}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Flame size={16} aria-hidden="true" /> Buy me a dragon{' '}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
          <a
            className="secondary-button support-link"
            href={supportLinks.paypal}
            rel="noopener noreferrer"
            target="_blank"
          >
            Support with PayPal <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="support-disclaimer">Optional support is not a tax-deductible charitable contribution.</p>
      </section>
    </section>
  );
}

function MetricDefinition({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{typeof value === 'number' ? value.toLocaleString() : value}</dd>
    </div>
  );
}

function UpdatesSection({ navigate }: { navigate: NavigateToRoute }) {
  return (
    <section className="updates-section" aria-labelledby="updates-title">
      <SectionHeading
        eyebrow="Release history"
        title="Updates"
        description="See what changed in each Dragonfire Lab release."
      />
      <AppLink className="text-link updates-back-link" route="overview" navigate={navigate}>
        ← Back to Overview
      </AppLink>
      <div className="release-history" aria-label={`${releaseHistory.length} releases`}>
        {releaseHistory.map((release, index) => (
          <details className={index === 0 ? 'release-entry is-latest' : 'release-entry'} key={release.version} open={index === 0}>
            <summary>
              <span>
                <strong>Version {release.version}</strong>
                {index === 0 ? <span className="latest-release-badge">Latest</span> : null}
              </span>
              <time dateTime={release.date}>{release.date}</time>
            </summary>
            <ul>
              {release.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        ))}
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
      <h2 id={title === 'About' ? 'about-title' : title === 'Updates' ? 'updates-title' : undefined} tabIndex={-1}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function getInitialSection(): Section {
  if (typeof window === 'undefined') {
    return 'overview';
  }

  const sharedFormation = parseSharedFormation(window.location.hash, dragons);
  const hasSharedFormation = FORMATION_POSITIONS.some((position) => sharedFormation[position]);
  const route = hasSharedFormation ? 'formations' : canonicalRouteFromLocation(window.location);
  const isLegacyRouteHash = window.location.hash === '#data-status' || isStaleDragonDatabaseHash(window.location.hash);
  const canonicalUrl = `${routePaths[route]}${window.location.search}${isLegacyRouteHash ? '' : window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (canonicalUrl !== currentUrl) {
    window.history.replaceState(null, '', canonicalUrl);
  }
  return route;
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
