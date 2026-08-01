import { ArrowDown, ArrowUp, Copy, Download, Edit3, ExternalLink, Save, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { AccountSession } from '../cloud/types';
import { dragons } from '../data/dragons';
import { FORMATION_POSITIONS, type OwnedDragon } from '../models/dragon';
import type { NavigateToRoute } from './appRouter';
import { positionLabels } from '../services/teamShare';
import {
  MAX_SAVED_FORMATIONS,
  type SavedFormationLibrary,
  type SavedFormationRecord,
} from '../savedFormations/types';
import {
  deleteSavedFormation,
  duplicateSavedFormation,
  moveSavedFormation,
  renameSavedFormation,
} from '../savedFormations/crud';
import { evaluateSavedFormation } from '../savedFormations/evaluation';
import {
  mergeSavedFormationImport,
  previewSavedFormationMerge,
  replaceSavedFormationImport,
  serializeSavedFormationExport,
  validateSavedFormationImport,
  type SavedFormationMergePreview,
} from '../savedFormations/importExport';
import { savedFormationSyncStatusLabel, type SavedFormationComparison, type SavedFormationSyncStatus } from '../hooks/useSavedFormationSync';

export function SavedFormationsWorkspace({
  library,
  roster,
  session,
  syncStatus,
  syncComparison,
  syncError,
  onLibraryChange,
  onOpen,
  onNavigate,
  onOpenSignIn,
  onSaveBrowserToAccount,
  onUseAccount,
  onPauseSync,
  onReopenSync,
  onRetrySync,
}: {
  library: SavedFormationLibrary;
  roster: Record<string, OwnedDragon>;
  session: AccountSession | null;
  syncStatus: SavedFormationSyncStatus;
  syncComparison: SavedFormationComparison | null;
  syncError: string | null;
  onLibraryChange: (library: SavedFormationLibrary, message: string) => void;
  onOpen: (record: SavedFormationRecord) => void;
  onNavigate: NavigateToRoute;
  onOpenSignIn: () => void;
  onSaveBrowserToAccount: () => void;
  onUseAccount: () => void;
  onPauseSync: () => void;
  onReopenSync: () => void;
  onRetrySync: () => void;
}) {
  const [renameRecord, setRenameRecord] = useState<SavedFormationRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [importState, setImportState] = useState<{ records: SavedFormationRecord[]; preview: SavedFormationMergePreview; includeDuplicates: boolean; replaceConfirm: boolean } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const evaluations = useMemo(() => library.formations.map((record) => evaluateSavedFormation({ record, roster })), [library, roster]);
  const atLimit = library.formations.length >= MAX_SAVED_FORMATIONS;
  const namesById = useMemo(() => new Map(dragons.map((dragon) => [dragon.id, dragon.name])), []);

  const apply = (action: () => SavedFormationLibrary, message: string) => {
    try { onLibraryChange(action(), message); setLocalError(null); }
    catch (error) { setLocalError(error instanceof Error ? error.message : 'Saved Formations could not be updated.'); }
  };
  const exportLibrary = () => {
    const blob = new Blob([serializeSavedFormationExport(library)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dragonfire-saved-formations-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = validateSavedFormationImport(await file.text());
    if (!result.ok || !result.formations) { setLocalError(result.errors.join(' ')); return; }
    setImportState({ records: result.formations, preview: previewSavedFormationMerge(library, result.formations), includeDuplicates: false, replaceConfirm: false });
  };

  return (
    <section className="saved-formations-workspace" aria-labelledby="saved-formations-title">
      <div className="roster-workspace-header">
        <h3 id="saved-formations-title">Saved Formations</h3>
        <p>Saved arrangements stay exact while ratings, reliability, and Estimated Power are recalculated from current application data.</p>
      </div>

      <div className="saved-formations-summary-bar">
        <div aria-live="polite"><strong>{library.formations.length} of {MAX_SAVED_FORMATIONS} saved</strong><span>{savedFormationSyncStatusLabel(syncStatus)}</span></div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={exportLibrary}><Download size={17} aria-hidden="true" /> Export library</button>
          <label className="file-button"><Upload size={17} aria-hidden="true" /> Import library<input type="file" accept="application/json,.json" onChange={(event) => void importFile(event)} /></label>
        </div>
      </div>

      {atLimit ? <p className="status-message info">The 50-formation limit is reached. Delete a formation to make room; updates, rename, reorder, export, and delete remain available.</p> : null}
      {localError || syncError ? <p className="status-message error" role="alert">{localError ?? syncError}</p> : null}
      <SyncDecisionPanel
        session={session}
        status={syncStatus}
        comparison={syncComparison}
        onExport={exportLibrary}
        onOpenSignIn={onOpenSignIn}
        onSaveBrowser={onSaveBrowserToAccount}
        onUseAccount={onUseAccount}
        onPause={onPauseSync}
        onReopen={onReopenSync}
        onRetry={onRetrySync}
      />

      {library.formations.length === 0 ? (
        <div className="empty-state saved-formations-empty">
          <h4>No saved formations yet.</h4>
          <p>Build a complete formation or save any current optimizer result. Signed-out formations remain in this browser.</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => onNavigate('formations')}>Open Formation Builder</button>
            <button type="button" className="secondary-button" onClick={() => onNavigate('optimizer')}>Open Roster Optimizer</button>
          </div>
        </div>
      ) : (
        <div className="saved-formation-grid">
          {evaluations.map((evaluation, index) => {
            const { record } = evaluation;
            return (
              <article className="saved-formation-card" key={record.id} aria-labelledby={`saved-formation-${record.id}`}>
                <header>
                  <div>
                    <p className="eyebrow">{record.source === 'optimizer' ? 'Roster Optimizer' : 'Formation Builder'} · {record.evaluationMode === 'planning' ? 'Planning' : 'Current roster'}</p>
                    <h4 id={`saved-formation-${record.id}`}>{record.name}</h4>
                  </div>
                  <span className={`saved-evaluation-status status-${evaluation.status}`}>{evaluation.status === 'unavailable' ? 'Progression unavailable' : evaluation.rating.tier}</span>
                </header>
                <div className="saved-formation-metrics">
                  <div><span>Formation Rating</span><strong>{evaluation.rating.score ?? '—'} · {evaluation.rating.tier}</strong></div>
                  <div><span>Estimated Power</span><strong>{evaluation.estimatedPower?.totalPower.toLocaleString() ?? 'Unavailable'}</strong></div>
                  <div><span>Reliability</span><strong>{evaluation.rating.reliabilityCoverage.replaceAll('-', ' ')}</strong></div>
                </div>
                <dl className="optimizer-positions saved-formation-positions">
                  {FORMATION_POSITIONS.map((position) => <div key={position}><dt>{positionLabels[position]}</dt><dd><strong>{namesById.get(record.arrangement[position]) ?? record.arrangement[position]}</strong></dd></div>)}
                </dl>
                {evaluation.progression.status === 'changed' || evaluation.progression.changes.length > 0 ? (
                  <details className="saved-progression-details">
                    <summary>Progression changed since saved</summary>
                    <ul>{evaluation.progression.changes.map((change, changeIndex) => <li key={`${change.dragonId}:${change.field}:${change.habitId ?? ''}:${changeIndex}`}>{formatProgressionChange(change, namesById)}</li>)}</ul>
                  </details>
                ) : evaluation.progression.status === 'unavailable' ? null : <p className="saved-progression-unchanged">Progression unchanged</p>}
                {evaluation.progression.status === 'unavailable' ? (
                  <div className="saved-unavailable-detail" role="status">
                    <strong>Current analysis is incomplete.</strong>
                    <ul>{evaluation.progression.unavailableDragonIds.map((dragonId) => <li key={dragonId}>{namesById.get(dragonId) ?? dragonId}: {evaluation.progression.missingDataByDragonId[dragonId]?.join(', ')}</li>)}</ul>
                  </div>
                ) : null}
                <div className="saved-formation-actions">
                  <button type="button" className="primary-button" onClick={() => onOpen(record)}>Open in Formation Builder <ExternalLink size={16} aria-hidden="true" /></button>
                  <button type="button" className="secondary-button" onClick={() => { setRenameRecord(record); setRenameValue(record.name); }} aria-label={`Rename ${record.name}`}><Edit3 size={16} aria-hidden="true" /> Rename</button>
                  <button type="button" className="secondary-button" disabled={atLimit} onClick={() => apply(() => duplicateSavedFormation(library, record.id), `Duplicated ${record.name}.`)} aria-label={`Duplicate ${record.name}`}><Copy size={16} aria-hidden="true" /> Duplicate</button>
                  <button type="button" className="secondary-button" disabled={index === 0} onClick={() => apply(() => moveSavedFormation(library, record.id, 'up'), `Moved ${record.name} up.`)} aria-label={`Move ${record.name} up`}><ArrowUp size={16} aria-hidden="true" /> Move up</button>
                  <button type="button" className="secondary-button" disabled={index === library.formations.length - 1} onClick={() => apply(() => moveSavedFormation(library, record.id, 'down'), `Moved ${record.name} down.`)} aria-label={`Move ${record.name} down`}><ArrowDown size={16} aria-hidden="true" /> Move down</button>
                  <button type="button" className="danger-button" onClick={() => { if (window.confirm(`Delete “${record.name}”? This removes only this saved formation and cannot be undone.`)) apply(() => deleteSavedFormation(library, record.id), `Deleted ${record.name}.`); }} aria-label={`Delete ${record.name}`}><Trash2 size={16} aria-hidden="true" /> Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {renameRecord ? (
        <LibraryDialog title={`Rename ${renameRecord.name}`} onClose={() => setRenameRecord(null)}>
          <label className="field-label" htmlFor="rename-saved-formation">Formation name</label>
          <input id="rename-saved-formation" value={renameValue} maxLength={80} autoFocus onChange={(event) => setRenameValue(event.target.value)} />
          <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setRenameRecord(null)}>Cancel</button><button type="button" className="primary-button" onClick={() => { apply(() => renameSavedFormation(library, renameRecord.id, renameValue), `Renamed formation to ${renameValue.trim()}.`); setRenameRecord(null); }}><Save size={16} aria-hidden="true" /> Save name</button></div>
        </LibraryDialog>
      ) : null}

      {importState ? (
        <LibraryDialog title={importState.replaceConfirm ? 'Replace Saved Formation Library?' : 'Import Saved Formation Library'} onClose={() => setImportState(null)}>
          {importState.replaceConfirm ? (
            <>
              <p>Replace all {library.formations.length} browser formations with {importState.records.length} imported formations? Export the current library first if you need a backup.</p>
              <div className="dialog-actions decision-actions"><button type="button" className="secondary-button" onClick={exportLibrary}>Export current first</button><button type="button" className="danger-button" onClick={() => { onLibraryChange(replaceSavedFormationImport(library, importState.records), `Replaced the library with ${importState.records.length} imported formations.`); setImportState(null); }}>Replace library</button><button type="button" className="secondary-button" onClick={() => setImportState(null)}>Cancel</button></div>
            </>
          ) : (
            <>
              <p><strong>{importState.records.length} valid formations found.</strong></p>
              <ul>
                <li>{importState.preview.additions.length} additions</li>
                <li>{importState.preview.unchangedIdCount} identical IDs already present</li>
                <li>{importState.preview.idCollisionCount} ID collisions will receive new IDs</li>
                <li>{importState.preview.exactDuplicates.length} exact placement duplicates need a decision</li>
              </ul>
              {importState.preview.exactDuplicates.length > 0 ? <label className="checkbox-row"><input type="checkbox" checked={importState.includeDuplicates} onChange={(event) => setImportState({ ...importState, includeDuplicates: event.target.checked })} /> Import exact duplicates as explicit copies</label> : null}
              <p>Existing order is preserved; imported additions are appended. Result: {importState.includeDuplicates ? importState.preview.totalIfDuplicatesIncluded : importState.preview.totalIfDuplicatesSkipped} of {MAX_SAVED_FORMATIONS}.</p>
              <div className="dialog-actions decision-actions"><button type="button" className="primary-button" disabled={(importState.includeDuplicates ? importState.preview.totalIfDuplicatesIncluded : importState.preview.totalIfDuplicatesSkipped) > MAX_SAVED_FORMATIONS} onClick={() => { onLibraryChange(mergeSavedFormationImport(library, importState.preview, importState.includeDuplicates), 'Imported Saved Formations by merge.'); setImportState(null); }}>Merge</button><button type="button" className="secondary-button" onClick={() => setImportState({ ...importState, replaceConfirm: true })}>Replace…</button><button type="button" className="secondary-button" onClick={() => setImportState(null)}>Cancel</button></div>
            </>
          )}
        </LibraryDialog>
      ) : null}
    </section>
  );
}

function SyncDecisionPanel({ session, status, comparison, onExport, onOpenSignIn, onSaveBrowser, onUseAccount, onPause, onReopen, onRetry }: {
  session: AccountSession | null; status: SavedFormationSyncStatus; comparison: SavedFormationComparison | null;
  onExport: () => void; onOpenSignIn: () => void; onSaveBrowser: () => void; onUseAccount: () => void; onPause: () => void; onReopen: () => void; onRetry: () => void;
}) {
  if (status === 'browser-only') return <div className="saved-sync-panel"><p><strong>Saved in this browser.</strong> {session ? 'Account formation sync is unavailable.' : 'Sign in to synchronize Saved Formations.'}</p>{!session ? <button type="button" className="secondary-button" onClick={onOpenSignIn}>Sign in</button> : null}</div>;
  if (status === 'migration-required') return <div className="saved-sync-panel is-attention"><h4>Save browser formations to account</h4><p>No account library exists. Nothing will be uploaded until you choose.</p><div className="button-row"><button type="button" className="primary-button" onClick={onSaveBrowser}>Save browser formations to account</button><button type="button" className="secondary-button" onClick={onPause}>Not now</button></div></div>;
  if (status === 'conflict' && comparison) return <div className="saved-sync-panel is-attention"><h4>Choose which Saved Formation Library to use</h4><div className="saved-sync-comparison"><div><strong>Browser: {comparison.browser.count}</strong><span>{formatTime(comparison.browserUpdatedAt)}</span><ul>{comparison.browser.names.map((name) => <li key={name}>{name}</li>)}</ul></div><div><strong>Account: {comparison.account.count}</strong><span>{formatTime(comparison.accountUpdatedAt)}</span><ul>{comparison.account.names.map((name) => <li key={name}>{name}</li>)}</ul></div></div><p>The two libraries are not merged automatically. Roster synchronization is unaffected.</p><div className="button-row"><button type="button" className="secondary-button" onClick={onExport}>Export browser backup</button><button type="button" className="primary-button" onClick={onSaveBrowser}>Use Browser Formations</button><button type="button" className="secondary-button" onClick={onUseAccount}>Use Account Formations</button><button type="button" className="secondary-button" onClick={onPause}>Not now</button></div></div>;
  if (status === 'error' || status === 'offline') return <div className="saved-sync-panel is-attention"><p><strong>{savedFormationSyncStatusLabel(status)}</strong></p><button type="button" className="secondary-button" onClick={onRetry}>Retry</button></div>;
  if (status === 'paused') return <div className="saved-sync-panel is-attention"><p><strong>Formation sync paused</strong></p><button type="button" className="secondary-button" onClick={onReopen}>Resolve</button></div>;
  return <div className="saved-sync-panel compact" role="status" aria-live="polite"><strong>{savedFormationSyncStatusLabel(status)}</strong></div>;
}

function LibraryDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-open');
    ref.current?.focus();
    return () => {
      document.body.classList.remove('modal-open');
      previousFocus.current?.focus();
    };
  }, []);
  return <div className="modal-backdrop" role="presentation"><div ref={ref} className="details-dialog account-dialog saved-formation-dialog" role="dialog" aria-modal="true" aria-labelledby="saved-library-dialog-title" tabIndex={-1} onKeyDown={(event) => trap(event, ref.current, onClose)}><header className="details-header account-dialog-header"><h2 id="saved-library-dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={22} aria-hidden="true" /></button></header><div className="account-dialog-body">{children}</div></div></div>;
}

function trap(event: KeyboardEvent<HTMLDivElement>, dialog: HTMLDivElement | null, close: () => void) {
  if (event.key === 'Escape') { close(); return; }
  if (event.key !== 'Tab' || !dialog) return;
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  const first = focusable[0]; const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function formatProgressionChange(change: { dragonId: string; field: string; habitId?: string; before: boolean | number | null; after: boolean | number | null }, names: Map<string, string>) {
  const name = names.get(change.dragonId) ?? change.dragonId;
  if (change.field === 'owned') return `${name}: ${change.after ? 'now marked owned' : 'no longer marked owned'}`;
  const label = change.field === 'starRank' ? 'Star Rank' : change.field === 'dragonLevel' ? 'Dragon Level' : dragons.find((dragon) => dragon.id === change.dragonId)?.habits.find((habit) => habit.id === change.habitId)?.name ?? change.habitId ?? 'Habit';
  return `${name}: ${label} ${change.before ?? 'unknown'} → ${change.after ?? 'unknown'}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
