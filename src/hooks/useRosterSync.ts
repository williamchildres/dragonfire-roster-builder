import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hasMeaningfulRosterData,
  rosterFingerprint,
  summarizeRoster,
} from '../cloud/rosterContract';
import type {
  AccountSession,
  CloudRosterRecord,
  CloudRosterRepository,
} from '../cloud/types';
import type { StoredRosterSnapshot } from '../services/rosterStorage';

export const CLOUD_SAVE_DEBOUNCE_MS = 750;

export type RosterSyncStatus =
  | 'local-only'
  | 'auth-loading'
  | 'loading-cloud'
  | 'migration-required'
  | 'conflict'
  | 'syncing'
  | 'synced'
  | 'paused'
  | 'offline'
  | 'error';

type DecisionKind = 'migration-required' | 'conflict';
type ErrorPhase = 'read' | 'write' | null;

export interface RosterComparison {
  local: ReturnType<typeof summarizeRoster>;
  cloud: ReturnType<typeof summarizeRoster>;
  localUpdatedAt: string | null;
  cloudUpdatedAt: string;
}

interface UseRosterSyncOptions {
  repository: CloudRosterRepository | null;
  session: AccountSession | null;
  sessionLoading: boolean;
  snapshot: StoredRosterSnapshot;
  onApplyCloud: (snapshot: StoredRosterSnapshot) => void;
}

export function useRosterSync({
  repository,
  session,
  sessionLoading,
  snapshot,
  onApplyCloud,
}: UseRosterSyncOptions) {
  const [status, setStatus] = useState<RosterSyncStatus>(
    repository ? 'auth-loading' : 'local-only',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cloudRecord, setCloudRecord] = useState<CloudRosterRecord | null>(null);
  const generationRef = useRef(0);
  const initializedUserRef = useRef<string | null>(null);
  const snapshotRef = useRef(snapshot);
  const sessionRef = useRef(session);
  const repositoryRef = useRef(repository);
  const applyCloudRef = useRef(onApplyCloud);
  const statusRef = useRef(status);
  const cloudRecordRef = useRef<CloudRosterRecord | null>(null);
  const decisionKindRef = useRef<DecisionKind | null>(null);
  const errorPhaseRef = useRef<ErrorPhase>(null);
  const lastSyncedFingerprintRef = useRef<string | null>(null);
  const writeTimerRef = useRef<number | null>(null);
  const writeInFlightRef = useRef(false);
  const pendingWriteRef = useRef<StoredRosterSnapshot | null>(null);
  const writeSnapshotRef = useRef<(target: StoredRosterSnapshot) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    snapshotRef.current = snapshot;
    sessionRef.current = session;
    repositoryRef.current = repository;
    applyCloudRef.current = onApplyCloud;
  }, [onApplyCloud, repository, session, snapshot]);

  const updateStatus = useCallback((nextStatus: RosterSyncStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const initializeUser = useCallback(async (userId: string) => {
    const currentRepository = repositoryRef.current;
    if (!currentRepository) {
      return;
    }

    const generation = ++generationRef.current;
    updateStatus('loading-cloud');
    setErrorMessage(null);
    errorPhaseRef.current = null;
    try {
      const nextCloudRecord = await currentRepository.fetchRoster(userId);
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) {
        return;
      }

      setCloudRecord(nextCloudRecord);
      cloudRecordRef.current = nextCloudRecord;
      const localSnapshot = snapshotRef.current;
      const localFingerprint = rosterFingerprint(localSnapshot.roster);
      const localMeaningful = hasMeaningfulRosterData(localSnapshot.roster);

      if (!nextCloudRecord) {
        if (localMeaningful) {
          decisionKindRef.current = 'migration-required';
          updateStatus('migration-required');
        } else {
          decisionKindRef.current = null;
          lastSyncedFingerprintRef.current = localFingerprint;
          updateStatus('synced');
        }
        return;
      }

      const cloudFingerprint = rosterFingerprint(nextCloudRecord.roster);
      if (!localMeaningful && hasMeaningfulRosterData(nextCloudRecord.roster)) {
        lastSyncedFingerprintRef.current = cloudFingerprint;
        applyCloudRef.current({
          roster: nextCloudRecord.roster,
          updatedAt: nextCloudRecord.clientUpdatedAt ?? nextCloudRecord.updatedAt,
        });
        decisionKindRef.current = null;
        updateStatus('synced');
        return;
      }

      if (localFingerprint === cloudFingerprint) {
        lastSyncedFingerprintRef.current = localFingerprint;
        decisionKindRef.current = null;
        updateStatus('synced');
        return;
      }

      decisionKindRef.current = 'conflict';
      updateStatus('conflict');
    } catch (error) {
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) {
        return;
      }
      errorPhaseRef.current = 'read';
      setErrorMessage(safeReadError(error));
      updateStatus('error');
    }
  }, [updateStatus]);

  const writeSnapshot = useCallback(async (targetSnapshot: StoredRosterSnapshot) => {
    const currentSession = sessionRef.current;
    const currentRepository = repositoryRef.current;
    if (!currentSession || !currentRepository || !targetSnapshot.updatedAt) {
      return;
    }
    if (writeInFlightRef.current) {
      pendingWriteRef.current = targetSnapshot;
      return;
    }

    const generation = generationRef.current;
    const userId = currentSession.userId;
    writeInFlightRef.current = true;
    updateStatus('syncing');
    setErrorMessage(null);
    try {
      const savedRecord = await currentRepository.upsertRoster(
        userId,
        targetSnapshot.roster,
        targetSnapshot.updatedAt,
      );
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) {
        return;
      }
      setCloudRecord(savedRecord);
      cloudRecordRef.current = savedRecord;
      lastSyncedFingerprintRef.current = rosterFingerprint(targetSnapshot.roster);
      errorPhaseRef.current = null;
      decisionKindRef.current = null;
      updateStatus('synced');
    } catch {
      if (generation !== generationRef.current || sessionRef.current?.userId !== userId) {
        return;
      }
      errorPhaseRef.current = 'write';
      setErrorMessage('Could not sync. Your changes remain saved in this browser.');
      updateStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      pendingWriteRef.current = null;
    } finally {
      writeInFlightRef.current = false;
      const pending = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (
        pending &&
        generation === generationRef.current &&
        sessionRef.current?.userId === userId &&
        statusRef.current !== 'error' &&
        statusRef.current !== 'offline'
      ) {
        void writeSnapshotRef.current(pending);
      }
    }
  }, [updateStatus]);

  useEffect(() => {
    writeSnapshotRef.current = writeSnapshot;
  }, [writeSnapshot]);

  useEffect(() => {
    if (!repository) {
      initializedUserRef.current = null;
      return;
    }
    if (sessionLoading) {
      return;
    }
    if (!session) {
      generationRef.current += 1;
      initializedUserRef.current = null;
      lastSyncedFingerprintRef.current = null;
      decisionKindRef.current = null;
      errorPhaseRef.current = null;
      cloudRecordRef.current = null;
      pendingWriteRef.current = null;
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      return;
    }
    if (initializedUserRef.current === session.userId) {
      return;
    }
    initializedUserRef.current = session.userId;
    void initializeUser(session.userId);
  }, [initializeUser, repository, session, sessionLoading, updateStatus]);

  useEffect(() => {
    if (status !== 'synced' || !session || !snapshot.updatedAt) {
      return;
    }
    if (rosterFingerprint(snapshot.roster) === lastSyncedFingerprintRef.current) {
      return;
    }
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
    }
    writeTimerRef.current = window.setTimeout(() => {
      writeTimerRef.current = null;
      void writeSnapshot(snapshotRef.current);
    }, CLOUD_SAVE_DEBOUNCE_MS);
    return () => {
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
    };
  }, [session, snapshot, status, writeSnapshot]);

  useEffect(() => {
    const handleOnline = () => {
      if (errorPhaseRef.current === 'write' && sessionRef.current) {
        void writeSnapshot(snapshotRef.current);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [writeSnapshot]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
      }
    },
    [],
  );

  const saveBrowserToAccount = useCallback(() => {
    decisionKindRef.current = null;
    void writeSnapshot(snapshotRef.current);
  }, [writeSnapshot]);

  const useAccountRoster = useCallback(() => {
    const record = cloudRecordRef.current;
    if (!record) {
      return;
    }
    const fingerprint = rosterFingerprint(record.roster);
    lastSyncedFingerprintRef.current = fingerprint;
    applyCloudRef.current({
      roster: record.roster,
      updatedAt: record.clientUpdatedAt ?? record.updatedAt,
    });
    decisionKindRef.current = null;
    updateStatus('synced');
  }, [updateStatus]);

  const pause = useCallback(() => {
    if (statusRef.current === 'migration-required' || statusRef.current === 'conflict') {
      decisionKindRef.current = statusRef.current;
    }
    updateStatus('paused');
  }, [updateStatus]);

  const pauseForLocalChange = useCallback(() => {
    decisionKindRef.current = cloudRecordRef.current ? 'conflict' : 'migration-required';
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
    updateStatus('paused');
  }, [updateStatus]);

  const reopenDecision = useCallback(() => {
    if (decisionKindRef.current) {
      updateStatus(decisionKindRef.current);
    }
  }, [updateStatus]);

  const retry = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return;
    }
    if (errorPhaseRef.current === 'read') {
      void initializeUser(currentSession.userId);
    } else {
      void writeSnapshot(snapshotRef.current);
    }
  }, [initializeUser, writeSnapshot]);

  const syncNow = useCallback(() => {
    void writeSnapshot(snapshotRef.current);
  }, [writeSnapshot]);

  const comparison: RosterComparison | null = cloudRecord
    ? {
        local: summarizeRoster(snapshot.roster),
        cloud: summarizeRoster(cloudRecord.roster),
        localUpdatedAt: snapshot.updatedAt,
        cloudUpdatedAt: cloudRecord.clientUpdatedAt ?? cloudRecord.updatedAt,
      }
    : null;

  const visibleStatus: RosterSyncStatus = !repository
    ? 'local-only'
    : sessionLoading
      ? 'auth-loading'
      : !session
        ? 'local-only'
        : status;

  return {
    status: visibleStatus,
    errorMessage,
    cloudRecord,
    comparison,
    saveBrowserToAccount,
    useAccountRoster,
    pause,
    pauseForLocalChange,
    reopenDecision,
    retry,
    syncNow,
  };
}

export function syncStatusLabel(status: RosterSyncStatus): string {
  switch (status) {
    case 'auth-loading':
    case 'loading-cloud':
      return 'Loading account roster…';
    case 'migration-required':
    case 'conflict':
      return 'Choose which roster to use';
    case 'syncing':
      return 'Syncing…';
    case 'synced':
      return 'Synced to your account';
    case 'paused':
      return 'Sync paused';
    case 'offline':
      return 'Offline — changes remain saved in this browser';
    case 'error':
      return 'Could not sync — retry';
    case 'local-only':
      return 'Saved in this browser';
  }
}

function safeReadError(error: unknown): string {
  return error instanceof Error && error.message.includes('unsupported schema version')
    ? error.message
    : error instanceof Error && error.message.includes('could not be read safely')
      ? error.message
      : 'The account roster could not be loaded. Your browser roster is still available.';
}
