import { useCallback, useEffect, useRef, useState } from 'react';
import {
  savedFormationLibraryFingerprint,
  summarizeSavedFormationLibrary,
} from '../cloud/savedFormationContract';
import type {
  AccountSession,
  CloudSavedFormationRecord,
  CloudSavedFormationRepository,
} from '../cloud/types';
import type { SavedFormationLibrary } from '../savedFormations/types';
import { CLOUD_SAVE_DEBOUNCE_MS } from './useRosterSync';

export type SavedFormationSyncStatus =
  | 'browser-only'
  | 'auth-loading'
  | 'loading-account'
  | 'migration-required'
  | 'conflict'
  | 'syncing'
  | 'synced'
  | 'paused'
  | 'offline'
  | 'error';

type DecisionKind = 'migration-required' | 'conflict';
type ErrorPhase = 'read' | 'write' | null;

export interface SavedFormationComparison {
  browser: ReturnType<typeof summarizeSavedFormationLibrary>;
  account: ReturnType<typeof summarizeSavedFormationLibrary>;
  browserUpdatedAt: string;
  accountUpdatedAt: string;
}

export function useSavedFormationSync({
  repository,
  session,
  sessionLoading,
  library,
  onApplyAccount,
}: {
  repository: CloudSavedFormationRepository | null;
  session: AccountSession | null;
  sessionLoading: boolean;
  library: SavedFormationLibrary;
  onApplyAccount: (library: SavedFormationLibrary) => void;
}) {
  const [status, setStatus] = useState<SavedFormationSyncStatus>(repository ? 'auth-loading' : 'browser-only');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountRecord, setAccountRecord] = useState<CloudSavedFormationRecord | null>(null);
  const generationRef = useRef(0);
  const initializedUserRef = useRef<string | null>(null);
  const libraryRef = useRef(library);
  const sessionRef = useRef(session);
  const repositoryRef = useRef(repository);
  const applyAccountRef = useRef(onApplyAccount);
  const statusRef = useRef(status);
  const accountRecordRef = useRef<CloudSavedFormationRecord | null>(null);
  const decisionRef = useRef<DecisionKind | null>(null);
  const errorPhaseRef = useRef<ErrorPhase>(null);
  const lastFingerprintRef = useRef<string | null>(null);
  const writeTimerRef = useRef<number | null>(null);
  const writeInFlightRef = useRef(false);
  const pendingWriteRef = useRef<SavedFormationLibrary | null>(null);
  const writeRef = useRef<(target: SavedFormationLibrary) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    libraryRef.current = library;
    sessionRef.current = session;
    repositoryRef.current = repository;
    applyAccountRef.current = onApplyAccount;
  }, [library, onApplyAccount, repository, session]);

  const updateStatus = useCallback((next: SavedFormationSyncStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const initialize = useCallback(async (userId: string) => {
    const currentRepository = repositoryRef.current;
    if (!currentRepository) return;
    const generation = ++generationRef.current;
    updateStatus('loading-account');
    setErrorMessage(null);
    errorPhaseRef.current = null;
    try {
      const record = await currentRepository.fetchLibrary(userId);
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) return;
      setAccountRecord(record);
      accountRecordRef.current = record;
      const browser = libraryRef.current;
      const browserFingerprint = savedFormationLibraryFingerprint(browser);
      if (!record) {
        if (browser.formations.length > 0) {
          decisionRef.current = 'migration-required';
          updateStatus('migration-required');
        } else {
          decisionRef.current = null;
          lastFingerprintRef.current = browserFingerprint;
          updateStatus('synced');
        }
        return;
      }
      const accountFingerprint = savedFormationLibraryFingerprint(record.library);
      if (browser.formations.length === 0 && record.library.formations.length > 0) {
        lastFingerprintRef.current = accountFingerprint;
        applyAccountRef.current(record.library);
        decisionRef.current = null;
        updateStatus('synced');
      } else if (browserFingerprint === accountFingerprint) {
        lastFingerprintRef.current = browserFingerprint;
        decisionRef.current = null;
        updateStatus('synced');
      } else {
        decisionRef.current = 'conflict';
        updateStatus('conflict');
      }
    } catch (error) {
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) return;
      errorPhaseRef.current = 'read';
      setErrorMessage(safeReadError(error));
      updateStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    }
  }, [updateStatus]);

  const write = useCallback(async (target: SavedFormationLibrary) => {
    const currentSession = sessionRef.current;
    const currentRepository = repositoryRef.current;
    if (!currentSession || !currentRepository) return;
    if (writeInFlightRef.current) {
      pendingWriteRef.current = target;
      return;
    }
    const generation = generationRef.current;
    const userId = currentSession.userId;
    writeInFlightRef.current = true;
    updateStatus('syncing');
    setErrorMessage(null);
    try {
      const record = await currentRepository.upsertLibrary(userId, target, target.updatedAt);
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) return;
      setAccountRecord(record);
      accountRecordRef.current = record;
      lastFingerprintRef.current = savedFormationLibraryFingerprint(target);
      decisionRef.current = null;
      errorPhaseRef.current = null;
      updateStatus('synced');
    } catch {
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) return;
      pendingWriteRef.current = null;
      errorPhaseRef.current = 'write';
      setErrorMessage('Could not sync Saved Formations. Changes remain saved in this browser.');
      updateStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    } finally {
      writeInFlightRef.current = false;
      const pending = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (pending && generation === generationRef.current && sessionRef.current?.userId === userId && statusRef.current !== 'error' && statusRef.current !== 'offline') {
        void writeRef.current(pending);
      }
    }
  }, [updateStatus]);

  useEffect(() => { writeRef.current = write; }, [write]);

  useEffect(() => {
    if (!repository || sessionLoading) return;
    if (!session) {
      generationRef.current += 1;
      initializedUserRef.current = null;
      lastFingerprintRef.current = null;
      decisionRef.current = null;
      accountRecordRef.current = null;
      pendingWriteRef.current = null;
      if (writeTimerRef.current !== null) window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
      return;
    }
    if (initializedUserRef.current === session.userId) return;
    initializedUserRef.current = session.userId;
    void initialize(session.userId);
  }, [initialize, repository, session, sessionLoading]);

  useEffect(() => {
    if (status !== 'synced' || !session || savedFormationLibraryFingerprint(library) === lastFingerprintRef.current) return;
    if (writeTimerRef.current !== null) window.clearTimeout(writeTimerRef.current);
    writeTimerRef.current = window.setTimeout(() => {
      writeTimerRef.current = null;
      void write(libraryRef.current);
    }, CLOUD_SAVE_DEBOUNCE_MS);
    return () => {
      if (writeTimerRef.current !== null) window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    };
  }, [library, session, status, write]);

  useEffect(() => {
    const online = () => {
      if (errorPhaseRef.current === 'write' && sessionRef.current) void write(libraryRef.current);
      else if (errorPhaseRef.current === 'read' && sessionRef.current) void initialize(sessionRef.current.userId);
    };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [initialize, write]);

  useEffect(() => () => {
    generationRef.current += 1;
    if (writeTimerRef.current !== null) window.clearTimeout(writeTimerRef.current);
  }, []);

  const saveBrowserToAccount = useCallback(() => {
    decisionRef.current = null;
    void write(libraryRef.current);
  }, [write]);

  const useAccountFormations = useCallback(() => {
    const record = accountRecordRef.current;
    if (!record) return;
    lastFingerprintRef.current = savedFormationLibraryFingerprint(record.library);
    applyAccountRef.current(record.library);
    decisionRef.current = null;
    updateStatus('synced');
  }, [updateStatus]);

  const pause = useCallback(() => {
    if (statusRef.current === 'migration-required' || statusRef.current === 'conflict') decisionRef.current = statusRef.current;
    updateStatus('paused');
  }, [updateStatus]);
  const reopenDecision = useCallback(() => { if (decisionRef.current) updateStatus(decisionRef.current); }, [updateStatus]);
  const retry = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    if (errorPhaseRef.current === 'read') void initialize(current.userId);
    else void write(libraryRef.current);
  }, [initialize, write]);
  const syncNow = useCallback(() => void write(libraryRef.current), [write]);

  const comparison: SavedFormationComparison | null = accountRecord ? {
    browser: summarizeSavedFormationLibrary(library),
    account: summarizeSavedFormationLibrary(accountRecord.library),
    browserUpdatedAt: library.updatedAt,
    accountUpdatedAt: accountRecord.clientUpdatedAt ?? accountRecord.updatedAt,
  } : null;
  const visibleStatus: SavedFormationSyncStatus = !repository ? 'browser-only' : sessionLoading ? 'auth-loading' : !session ? 'browser-only' : status;
  return { status: visibleStatus, errorMessage, accountRecord, comparison, saveBrowserToAccount, useAccountFormations, pause, reopenDecision, retry, syncNow };
}

export function savedFormationSyncStatusLabel(status: SavedFormationSyncStatus): string {
  switch (status) {
    case 'browser-only': return 'Saved in this browser';
    case 'auth-loading': return 'Checking account…';
    case 'loading-account': return 'Loading account formations…';
    case 'migration-required': return 'Save browser formations to account';
    case 'conflict': return 'Choose which formations to use';
    case 'syncing': return 'Syncing formations…';
    case 'synced': return 'Saved Formations synced';
    case 'paused': return 'Formation sync paused';
    case 'offline': return 'Offline — changes remain in this browser';
    case 'error': return 'Could not sync formations — retry';
  }
}

function safeReadError(error: unknown): string {
  if (error instanceof Error && (error.message.includes('unsupported schema version') || error.message.includes('could not be read safely'))) return error.message;
  return 'Account formations could not be loaded. Browser formations remain available.';
}
