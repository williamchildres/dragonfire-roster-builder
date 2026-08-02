import { Download, ListFilter, Plus, RotateCcw, Search, SlidersHorizontal, Upload, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import type { AccountSession } from '../cloud/types';
import type { Dragon, DragonBreed, DragonRarity, OwnedDragon } from '../models/dragon';
import type { RosterSyncStatus } from '../hooks/useRosterSync';
import { ConfirmationDialog, RosterSyncPanel } from './AccountUi';
import { isRosterSyncAttention } from './accountSyncPresentation';
import { RosterEditor } from './RosterEditor';
import { RosterList } from './RosterList';
import {
  defaultRosterWorkspaceFilters,
  filterAndSortRosterDragons,
  filtersRevealingDragon,
  filtersAreActive,
  nextSelectionAfterRemoval,
  type RosterDetailsFilter,
  type RosterSelectionRequest,
  type RosterWorkspaceFilters,
  type RosterWorkspaceSort,
} from './rosterWorkspaceState';

export type { RosterSelectionRequest } from './rosterWorkspaceState';

export function RosterWorkspace({
  allDragons,
  roster,
  successMessage,
  selectionRequest,
  onSelectionRequestConsumed,
  onUpdateRoster,
  onOpenDetails,
  onOpenAddDragon,
  onAddAllDragons = () => undefined,
  onExport,
  onImport,
  onClear,
  accountConfigured,
  session,
  syncStatus,
  onOpenAccount,
  onOpenSignIn,
  onResolveSync,
  onRetrySync,
  embedded = false,
}: {
  allDragons: readonly Dragon[];
  roster: Record<string, OwnedDragon>;
  successMessage: { text: string } | null;
  selectionRequest: RosterSelectionRequest | null;
  onSelectionRequestConsumed: (requestId: number) => void;
  onUpdateRoster: (dragonId: string, patch: Partial<OwnedDragon>) => void;
  onOpenDetails: (dragon: Dragon) => void;
  onOpenAddDragon: () => void;
  onAddAllDragons?: () => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  accountConfigured: boolean;
  session: AccountSession | null;
  syncStatus: RosterSyncStatus;
  onOpenAccount: () => void;
  onOpenSignIn: () => void;
  onResolveSync: () => void;
  onRetrySync: () => void;
  embedded?: boolean;
}) {
  const [filters, setFilters] = useState<RosterWorkspaceFilters>(defaultRosterWorkspaceFilters);
  const [sortBy, setSortBy] = useState<RosterWorkspaceSort>('name');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [isAddAllOpen, setIsAddAllOpen] = useState(false);
  const [consumedSelectionRequestId, setConsumedSelectionRequestId] = useState<number | null>(null);
  const acknowledgedSelectionRequestRef = useRef<number | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const ownedCount = useMemo(
    () => allDragons.filter((dragon) => roster[dragon.id]?.owned === true).length,
    [allDragons, roster],
  );
  const missingCount = allDragons.length - ownedCount;
  const isSaving = syncStatus === 'syncing';
  const breedOptions = useMemo(
    () => [...new Set(allDragons.map((dragon) => dragon.breed))].sort((a, b) => a.localeCompare(b, 'en')),
    [allDragons],
  );
  const visibleDragons = useMemo(
    () => filterAndSortRosterDragons(allDragons, roster, filters, sortBy),
    [allDragons, filters, roster, sortBy],
  );
  const visibleIds = useMemo(() => visibleDragons.map((dragon) => dragon.id), [visibleDragons]);
  const selectedDragonId = selection && visibleIds.includes(selection) ? selection : visibleIds[0] ?? null;
  const selectedDragon = selectedDragonId
    ? allDragons.find((dragon) => dragon.id === selectedDragonId && roster[dragon.id]?.owned === true) ?? null
    : null;
  const selectedEntry = selectedDragon ? roster[selectedDragon.id] : undefined;
  const activeFilters = filtersAreActive(filters);
  const activeAdvancedFilterCount = [
    filters.rarity !== 'all',
    filters.breed !== 'all',
    filters.details !== 'all',
  ].filter(Boolean).length;

  const requestedDragon = selectionRequest
    ? allDragons.find(
      (dragon) => dragon.id === selectionRequest.dragonId && roster[dragon.id]?.owned === true,
    )
    : undefined;
  if (
    selectionRequest &&
    requestedDragon &&
    consumedSelectionRequestId !== selectionRequest.requestId
  ) {
    setConsumedSelectionRequestId(selectionRequest.requestId);
    setFilters((current) => filtersRevealingDragon(current, requestedDragon, roster[requestedDragon.id]));
    setSelection(requestedDragon.id);
    setMobileView('editor');
  }

  useEffect(() => {
    if (
      consumedSelectionRequestId === null ||
      acknowledgedSelectionRequestRef.current === consumedSelectionRequestId
    ) return;

    acknowledgedSelectionRequestRef.current = consumedSelectionRequestId;
    focusRosterEditor(editorRef);
    onSelectionRequestConsumed(consumedSelectionRequestId);
  }, [consumedSelectionRequestId, onSelectionRequestConsumed]);

  const applyFilters = (nextFilters: RosterWorkspaceFilters) => {
    setFilters(nextFilters);
    const nextVisibleIds = filterAndSortRosterDragons(allDragons, roster, nextFilters, sortBy).map((dragon) => dragon.id);
    setSelection((current) => current && nextVisibleIds.includes(current) ? current : nextVisibleIds[0] ?? null);
  };
  const updateFilters = (patch: Partial<RosterWorkspaceFilters>) => applyFilters({ ...filters, ...patch });
  const registerRow = (dragonId: string, element: HTMLButtonElement | null) => {
    if (element) rowRefs.current.set(dragonId, element);
    else rowRefs.current.delete(dragonId);
  };
  const selectDragon = (dragonId: string) => {
    setSelection(dragonId);
    setMobileView('editor');
    if (window.matchMedia?.('(max-width: 900px)').matches) {
      focusRosterEditor(editorRef);
    }
  };
  const returnToList = () => {
    setMobileView('list');
    requestAnimationFrame(() => {
      const row = selectedDragonId ? rowRefs.current.get(selectedDragonId) : null;
      row?.focus();
      row?.scrollIntoView?.({ block: 'nearest' });
    });
  };
  const removeSelected = () => {
    if (!selectedDragon) return;
    if (!window.confirm(`Remove ${selectedDragon.name} from your roster? Progression and notes will be kept if you add this dragon again.`)) return;

    const nextDragonId = nextSelectionAfterRemoval(visibleIds, selectedDragon.id);
    setSelection(nextDragonId);
    setMobileView('list');
    onUpdateRoster(selectedDragon.id, { owned: false });
    requestAnimationFrame(() => {
      const target = nextDragonId ? rowRefs.current.get(nextDragonId) : addButtonRef.current;
      target?.focus();
      target?.scrollIntoView?.({ block: 'nearest' });
    });
  };
  const clearFilters = () => applyFilters(defaultRosterWorkspaceFilters);

  return (
    <section className="roster-section" aria-labelledby="roster-title">
      <div className="roster-workspace-header">
        {embedded ? <h3 id="roster-title" tabIndex={-1}>My Dragons</h3> : <h2 id="roster-title" tabIndex={-1}>My Roster</h2>}
        <p>Track ownership, progression, Habit Levels, and notes.</p>
      </div>

      {accountConfigured && isRosterSyncAttention(syncStatus) ? (
        <RosterSyncPanel
          session={session}
          status={syncStatus}
          onOpenAccount={onOpenAccount}
          onOpenSignIn={onOpenSignIn}
          onResolve={onResolveSync}
          onRetry={onRetrySync}
        />
      ) : null}

      {successMessage ? <div className="status-message success" role="status" aria-live="polite">{successMessage.text}</div> : null}

      <div className="roster-workspace-toolbar">
        <div className="roster-count-summary" aria-live="polite">
          <strong>{ownedCount} owned {ownedCount === 1 ? 'dragon' : 'dragons'}</strong>
          {activeFilters ? <span>{visibleDragons.length} of {ownedCount} shown</span> : null}
        </div>
        <div className="roster-toolbar-actions">
          <button type="button" className="primary-button" onClick={onOpenAddDragon} ref={addButtonRef} aria-label="+ Add Dragon">
            <Plus size={18} aria-hidden="true" /> Add Dragon
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsAddAllOpen(true)}
            disabled={missingCount === 0 || isSaving}
            aria-label={missingCount === 0 ? 'All Dragons Added' : `Add all ${missingCount} missing dragons`}
          >
            <UsersRound size={18} aria-hidden="true" /> {missingCount === 0 ? 'All Dragons Added' : 'Add All Dragons'}
          </button>
          <details className="roster-utilities">
            <summary><SlidersHorizontal size={17} aria-hidden="true" /> Roster utilities</summary>
            <div className="roster-utility-actions">
              <button type="button" className="secondary-button" onClick={onExport}><Download size={17} aria-hidden="true" /> Export roster</button>
              <label className="file-button"><Upload size={17} aria-hidden="true" /> Import roster<input type="file" accept="application/json,.json" onChange={onImport} /></label>
              <button type="button" className="danger-button" onClick={onClear}><RotateCcw size={17} aria-hidden="true" /> Clear local roster</button>
            </div>
          </details>
        </div>
      </div>

      {ownedCount === 0 ? (
        <div className="empty-state roster-empty-state">
          <h3>No dragons in your roster yet.</h3>
          <p>Add a dragon to start tracking Star Rank, Dragon Level, Habit Levels, notes, and formation options.</p>
          <button type="button" className="primary-button" onClick={onOpenAddDragon} aria-label="+ Add Dragon"><Plus size={18} aria-hidden="true" /> Add Dragon</button>
        </div>
      ) : (
        <div className="roster-workspace" data-mobile-view={mobileView}>
          <div className="roster-list-pane">
            <div className="roster-filter-toolbar" aria-label="Roster filters">
              <div className="roster-filter-primary">
                <label className="roster-search-field">
                  Search owned dragons
                  <span className="roster-search-control">
                    <Search size={17} aria-hidden="true" />
                    <input type="search" value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search by name" />
                    {filters.search ? <button type="button" className="icon-button" onClick={() => updateFilters({ search: '' })} aria-label="Clear roster search"><X size={16} aria-hidden="true" /></button> : null}
                  </span>
                </label>
                <label className="roster-sort-field">Sort<select value={sortBy} onChange={(event) => setSortBy(event.target.value as RosterWorkspaceSort)}><option value="name">Name A–Z</option><option value="rarity">Rarity</option><option value="star-rank">Star Rank high to low</option><option value="dragon-level">Dragon Level high to low</option></select></label>
                <button
                  type="button"
                  className="secondary-button roster-filters-toggle"
                  aria-expanded={advancedFiltersOpen}
                  aria-controls="roster-advanced-filters"
                  onClick={() => setAdvancedFiltersOpen((open) => !open)}
                >
                  <ListFilter size={17} aria-hidden="true" />
                  Filters{activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount})` : ''}
                </button>
                {activeFilters ? <button type="button" className="text-button roster-clear-filters" onClick={clearFilters}>Clear filters</button> : null}
              </div>
              <div id="roster-advanced-filters" className="roster-advanced-filters" hidden={!advancedFiltersOpen}>
                <label>Rarity<select value={filters.rarity} onChange={(event) => updateFilters({ rarity: event.target.value as DragonRarity | 'all' })}><option value="all">All rarities</option><option value="Legendary">Legendary</option><option value="Epic">Epic</option><option value="Rare">Rare</option></select></label>
                <label>Breed<select value={filters.breed} onChange={(event) => updateFilters({ breed: event.target.value as DragonBreed | 'all' })}><option value="all">All breeds</option>{breedOptions.map((breed) => <option key={breed} value={breed}>{breed}</option>)}</select></label>
                <label>Details<select value={filters.details} onChange={(event) => updateFilters({ details: event.target.value as RosterDetailsFilter })}><option value="all">All dragons</option><option value="complete">All progression recorded</option><option value="missing">Missing progression</option><option value="has-notes">Has notes</option><option value="no-notes">No notes</option></select></label>
              </div>
            </div>

            {visibleDragons.length > 0 ? (
              <RosterList dragons={visibleDragons} roster={roster} selectedDragonId={selectedDragonId} onSelect={selectDragon} registerRow={registerRow} />
            ) : (
              <div className="empty-state roster-filtered-empty">
                <h3>No owned dragons match those filters.</h3>
                <p>Your roster is still here. Clear the filters to see every owned dragon.</p>
                <button type="button" className="secondary-button" onClick={onOpenAddDragon}>Add Dragon</button>
              </div>
            )}
          </div>

          {selectedDragon && selectedEntry ? (
            <RosterEditor
              dragon={selectedDragon}
              rosterEntry={selectedEntry}
              session={session}
              syncStatus={syncStatus}
              onBack={returnToList}
              onOpenDetails={onOpenDetails}
              onRemove={removeSelected}
              onUpdateRoster={onUpdateRoster}
              editorRef={editorRef}
            />
          ) : visibleDragons.length > 0 ? (
            <aside className="roster-editor-pane roster-editor-placeholder" aria-live="polite"><p>Select a dragon to edit its progression and notes.</p></aside>
          ) : null}
        </div>
      )}
      {isAddAllOpen ? (
        <ConfirmationDialog
          title="Add All Dragons?"
          description={missingCount === 1
            ? 'Add 1 missing dragon to My Roster? Dragons without saved progression will start at Star 1 and Dragon Level 1. Existing roster progress will not be changed.'
            : `Add ${missingCount} missing dragons to My Roster? Dragons without saved progression will start at Star 1 and Dragon Level 1. Existing roster progress will not be changed.`}
          confirmLabel={missingCount === 1 ? 'Add 1 Dragon' : `Add ${missingCount} Dragons`}
          confirmDisabled={missingCount === 0 || isSaving}
          onCancel={() => setIsAddAllOpen(false)}
          onConfirm={() => {
            onAddAllDragons();
            setIsAddAllOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function focusRosterEditor(editorRef: RefObject<HTMLElement | null>) {
  requestAnimationFrame(() => {
    const editor = editorRef.current;
    editor?.focus({ preventScroll: true });
    editor?.scrollIntoView?.({ block: 'start' });
  });
}
