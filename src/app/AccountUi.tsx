import { Cloud, LogIn, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { AccountSession } from '../cloud/types';
import {
  syncStatusLabel,
  type RosterComparison,
  type RosterSyncStatus,
} from '../hooks/useRosterSync';

export function HeaderAccountAction({
  session,
  sessionLoading,
  onOpenAccount,
  onOpenSignIn,
}: {
  session: AccountSession | null;
  sessionLoading: boolean;
  onOpenAccount: () => void;
  onOpenSignIn: () => void;
}) {
  if (sessionLoading) {
    return <span className="account-loading" aria-label="Loading account">Account…</span>;
  }
  if (!session) {
    return (
      <button type="button" className="secondary-button account-action" onClick={onOpenSignIn}>
        <LogIn size={17} aria-hidden="true" /> Sign in
      </button>
    );
  }
  return (
    <button
      type="button"
      className="secondary-button account-action"
      aria-label={`Account for ${session.email}`}
      onClick={onOpenAccount}
    >
      <UserRound size={17} aria-hidden="true" />
      <span>Account</span>
      <span className="account-email-short">{shortEmail(session.email)}</span>
    </button>
  );
}

export function SignInDialog({
  onClose,
  onRequestLink,
}: {
  onClose: () => void;
  onRequestLink: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      setValidationError('Enter a valid email address.');
      return;
    }
    setValidationError(null);
    setRequestError(null);
    setLoading(true);
    try {
      await onRequestLink(normalized);
      setSent(true);
    } catch {
      setRequestError('We could not send a sign-in link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogFrame title="Sign in to Dragonfire Lab" titleId="sign-in-title" onClose={onClose}>
      <p>Use an email magic link to synchronize your roster across devices. No password is required.</p>
      {sent ? (
        <div className="status-message success" role="status">
          Check your email for a Dragonfire Lab sign-in link.
        </div>
      ) : (
        <>
          <label className="dialog-field">
            Email address
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              aria-describedby={validationError ? 'sign-in-email-error' : undefined}
              aria-invalid={validationError ? 'true' : undefined}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </label>
          {validationError ? <p id="sign-in-email-error" className="field-error">{validationError}</p> : null}
          {requestError ? <div className="status-message error" role="alert">{requestError}</div> : null}
        </>
      )}
      <div className="dialog-actions">
        {!sent ? (
          <button type="button" className="primary-button" disabled={loading} onClick={() => void submit()}>
            {loading ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={onClose}>
          {sent ? 'Done' : 'Cancel'}
        </button>
      </div>
    </DialogFrame>
  );
}

export function AccountDialog({
  session,
  status,
  errorMessage,
  onClose,
  onResolve,
  onRetry,
  onSignOut,
  onSyncNow,
}: {
  session: AccountSession;
  status: RosterSyncStatus;
  errorMessage: string | null;
  onClose: () => void;
  onResolve: () => void;
  onRetry: () => void;
  onSignOut: () => Promise<void>;
  onSyncNow: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <DialogFrame title="Your account" titleId="account-title" onClose={onClose}>
      <dl className="account-details">
        <div><dt>Email</dt><dd>{session.email}</dd></div>
        <div><dt>Roster synchronization</dt><dd>{syncStatusLabel(status)}</dd></div>
      </dl>
      {errorMessage ? <div className="status-message error" role="status">{errorMessage}</div> : null}
      <p>Your roster can sync to this account while remaining stored in this browser for local use.</p>
      <p className="account-limitation">Saved formations are not yet synchronized to your account.</p>
      <div className="dialog-actions">
        {status === 'paused' ? (
          <button type="button" className="primary-button" onClick={onResolve}>Resolve roster choice</button>
        ) : null}
        {status === 'error' || status === 'offline' ? (
          <button type="button" className="primary-button" onClick={onRetry}>Retry</button>
        ) : null}
        {status === 'synced' ? (
          <button type="button" className="secondary-button" onClick={onSyncNow}>Sync now</button>
        ) : null}
        <button
          type="button"
          className="danger-button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void onSignOut().finally(() => setSigningOut(false));
          }}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </DialogFrame>
  );
}

export function RosterDecisionDialog({
  status,
  comparison,
  onSaveBrowser,
  onUseAccount,
  onPause,
}: {
  status: 'migration-required' | 'conflict';
  comparison: RosterComparison | null;
  onSaveBrowser: () => void;
  onUseAccount: () => void;
  onPause: () => void;
}) {
  const isMigration = status === 'migration-required';
  return (
    <DialogFrame
      title={isMigration ? "Save this browser's roster to your account?" : 'Choose which roster to use'}
      titleId="roster-decision-title"
      onClose={onPause}
    >
      {isMigration ? (
        <p>
          A roster was found in this browser. Saving it makes the roster available after signing in on another
          device, while local storage remains your browser copy.
        </p>
      ) : comparison ? (
        <RosterComparisonTable comparison={comparison} />
      ) : null}
      <p>No cloud data will be changed until you choose.</p>
      <div className="dialog-actions decision-actions">
        <button type="button" className="primary-button" onClick={onSaveBrowser}>
          {isMigration ? 'Save to account' : 'Use this browser'}
        </button>
        {!isMigration ? (
          <button type="button" className="secondary-button" onClick={onUseAccount}>Use account roster</button>
        ) : null}
        <button type="button" className="secondary-button" onClick={onPause}>Not now</button>
      </div>
    </DialogFrame>
  );
}

export function RosterSyncPanel({
  session,
  status,
  onOpenAccount,
  onOpenSignIn,
  onResolve,
  onRetry,
}: {
  session: AccountSession | null;
  status: RosterSyncStatus;
  onOpenAccount: () => void;
  onOpenSignIn: () => void;
  onResolve: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="roster-sync-panel">
      <div>
        <p className="eyebrow"><Cloud size={15} aria-hidden="true" /> Roster storage</p>
        <strong>{session && status === 'synced' ? 'Synced to your account and stored in this browser' : syncStatusLabel(status)}</strong>
        {session ? <span className="sync-email">{session.email}</span> : <span>Sign in to synchronize across devices.</span>}
      </div>
      <div className="button-row">
        {!session ? <button type="button" className="secondary-button" onClick={onOpenSignIn}>Sign in</button> : null}
        {status === 'migration-required' || status === 'conflict' || status === 'paused' ? (
          <button type="button" className="secondary-button" onClick={onResolve}>Resolve</button>
        ) : null}
        {status === 'error' || status === 'offline' ? (
          <button type="button" className="secondary-button" onClick={onRetry}>Retry</button>
        ) : null}
        {session ? <button type="button" className="secondary-button" onClick={onOpenAccount}>Account</button> : null}
      </div>
    </div>
  );
}

export function ImportSyncDialog({
  onCancel,
  onImportLocally,
  onReplace,
}: {
  onCancel: () => void;
  onImportLocally: () => void;
  onReplace: () => void;
}) {
  return (
    <DialogFrame title="Replace your synchronized roster with this imported roster?" titleId="import-sync-title" onClose={onCancel}>
      <p>The imported roster can replace the account roster, or remain only in this browser with synchronization paused.</p>
      <div className="dialog-actions decision-actions">
        <button type="button" className="primary-button" onClick={onReplace}>Replace synchronized roster</button>
        <button type="button" className="secondary-button" onClick={onImportLocally}>Import locally only</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </DialogFrame>
  );
}

function RosterComparisonTable({ comparison }: { comparison: RosterComparison }) {
  const rows = [
    ['Owned dragons', comparison.local.owned, comparison.cloud.owned],
    ['Recorded Star Ranks', comparison.local.starRanks, comparison.cloud.starRanks],
    ['Recorded Dragon Levels', comparison.local.dragonLevels, comparison.cloud.dragonLevels],
    ['Recorded Habit Levels', comparison.local.habitLevels, comparison.cloud.habitLevels],
    ['Last updated', formatTime(comparison.localUpdatedAt), formatTime(comparison.cloudUpdatedAt)],
  ];
  return (
    <div className="comparison-wrap">
      <table className="roster-comparison">
        <thead><tr><th>Summary</th><th>This browser</th><th>Account</th></tr></thead>
        <tbody>{rows.map(([label, local, cloud]) => <tr key={label}><th>{label}</th><td>{local}</td><td>{cloud}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function DialogFrame({
  children,
  onClose,
  title,
  titleId,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  titleId: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('modal-open');
    dialogRef.current?.focus();
    return () => {
      document.body.classList.remove('modal-open');
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="details-dialog account-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="details-header">
          <div className="details-heading-copy"><p className="eyebrow">Dragonfire Lab account</p><h2 id={titleId}>{title}</h2></div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="account-dialog-body">{children}</div>
      </div>
    </div>
  );
}

function shortEmail(email: string): string {
  return email.length <= 24 ? email : `${email.slice(0, 10)}…${email.slice(email.lastIndexOf('@'))}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatTime(value: string | null): string {
  if (!value) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
