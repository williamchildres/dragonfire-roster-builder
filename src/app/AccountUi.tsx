import { CircleAlert, CircleCheck, CloudOff, HardDrive, LoaderCircle, LogIn, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { AccountSession, SignUpResult } from '../cloud/types';
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
  onGoogle,
  onPasswordSignIn,
  onSignUp,
  onPasswordReset,
  onRequestLink,
  returnFocus,
}: {
  onClose: () => void;
  onGoogle: () => Promise<void>;
  onPasswordSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<SignUpResult>;
  onPasswordReset: (email: string) => Promise<void>;
  onRequestLink: (email: string) => Promise<void>;
  returnFocus?: HTMLElement | null;
}) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'reset' | 'magic-link'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'error' | 'success'>('error');
  const [operation, setOperation] = useState<string | null>(null);

  const showError = (text: string) => {
    setMessageKind('error');
    setMessage(text);
  };

  const showSuccess = (text: string) => {
    setMessageKind('success');
    setMessage(text);
  };

  const normalizedEmail = () => {
    const value = email.trim().toLowerCase();
    if (!isValidEmail(value)) {
      showError('Enter a valid email address.');
      return null;
    }
    return value;
  };

  const run = async (name: string, action: () => Promise<void>) => {
    if (operation) return;
    setOperation(name);
    setMessage(null);
    try {
      await action();
    } finally {
      setOperation(null);
    }
  };

  const submit = async () => {
    const normalized = normalizedEmail();
    if (!normalized) return;
    if ((mode === 'sign-in' || mode === 'sign-up') && !password) return showError('Enter your password.');
    if (mode === 'sign-up' && password.length < 8) return showError('Use a password with at least 8 characters.');
    if (mode === 'sign-up' && password !== confirmPassword) return showError('The password confirmation does not match.');
    await run(mode, async () => {
      try {
        if (mode === 'sign-in') {
          await onPasswordSignIn(normalized, password);
          setPassword('');
          onClose();
        } else if (mode === 'sign-up') {
          const result = await onSignUp(normalized, password);
          setPassword('');
          setConfirmPassword('');
          showSuccess(result.session ? 'Account created and signed in.' : 'Check your email to confirm your Dragonfire Lab account.');
        } else if (mode === 'reset') {
          await onPasswordReset(normalized);
          showSuccess('If an account can receive a reset email, check that inbox for the next step.');
        } else {
          await onRequestLink(normalized);
          showSuccess('Check your email for a Dragonfire Lab sign-in link.');
        }
      } catch (error) {
        showError(authErrorMessage(mode, error));
      }
    });
  };

  const changeMode = (nextMode: typeof mode) => {
    if (operation) return;
    setPassword('');
    setConfirmPassword('');
    setMessage(null);
    setMode(nextMode);
  };
  const title = mode === 'sign-up' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : mode === 'magic-link' ? 'Email sign-in link' : 'Sign in to Dragonfire Lab';

  return (
    <DialogFrame title={title} titleId="sign-in-title" onClose={onClose} returnFocus={returnFocus}>
      {mode === 'sign-in' ? <><button type="button" className="primary-button auth-google-button" disabled={operation === 'google'} onClick={() => void run('google', async () => { try { await onGoogle(); } catch (error) { showError(authErrorMessage('google', error)); } })}>{operation === 'google' ? 'Opening Google…' : 'Continue with Google'}</button><div className="auth-separator" aria-hidden="true"><span>or</span></div></> : null}
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {mode === 'magic-link' ? <p>We will send a one-time sign-in link. Password sign-in and Google are also available.</p> : null}
        {mode === 'reset' ? <p>Enter your email and we will send the next step if that account can receive reset email.</p> : null}
        <label className="dialog-field">Email<input type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {mode === 'sign-in' || mode === 'sign-up' ? <label className="dialog-field">Password<input type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label> : null}
        {mode === 'sign-up' ? <label className="dialog-field">Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label> : null}
        {message ? <div className={`status-message ${messageKind}`} role={messageKind === 'error' ? 'alert' : 'status'}>{message}</div> : null}
        <div className="dialog-actions"><button type="submit" className="primary-button" disabled={operation === mode}>{operation === mode ? 'Working…' : mode === 'sign-up' ? 'Create account' : mode === 'reset' ? 'Send password reset' : mode === 'magic-link' ? 'Email me a sign-in link' : 'Sign in'}</button>{mode !== 'sign-in' ? <button type="button" className="secondary-button" onClick={() => changeMode('sign-in')}>Back to sign in</button> : null}<button type="button" className="secondary-button" onClick={onClose}>Cancel</button></div>
      </form>
      {mode === 'sign-in' ? <div className="auth-secondary-actions"><button type="button" className="text-button" onClick={() => changeMode('reset')}>Forgot password?</button><button type="button" className="text-button" onClick={() => changeMode('sign-up')}>Create account</button><button type="button" className="text-button" onClick={() => changeMode('magic-link')}>Email me a sign-in link</button></div> : null}
    </DialogFrame>
  );
}

export function SetPasswordDialog({
  recovery,
  onClose,
  onSave,
  onCompleted,
  returnFocus,
}: {
  recovery: boolean;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
  onCompleted: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (saving) return;
    if (password.length < 8) { setMessage('Use a password with at least 8 characters.'); return; }
    if (password !== confirmation) { setMessage('The password confirmation does not match.'); return; }
    setSaving(true);
    setMessage(null);
    try {
      await onSave(password);
      setPassword('');
      setConfirmation('');
      onCompleted();
      setMessage('Your password was saved. You remain signed in.');
    } catch {
      setMessage('We could not save your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <DialogFrame title={recovery ? 'Set New Password' : 'Set or change password'} titleId="set-password-title" onClose={onClose} returnFocus={returnFocus}>
      {recovery ? <p>Choose a new password to finish password recovery.</p> : <p>Add or replace an email/password sign-in method for this account.</p>}
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="dialog-field">New password<input type="password" autoComplete="new-password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="dialog-field">Confirm new password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        {message ? <div className={`status-message ${message.startsWith('Your password') ? 'success' : 'error'}`} role={message.startsWith('Your password') ? 'status' : 'alert'}>{message}</div> : null}
        <div className="dialog-actions"><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save password'}</button><button type="button" className="secondary-button" onClick={onClose}>Cancel</button></div>
      </form>
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
  onSetPassword,
  onSignOut,
  onSyncNow,
  returnFocus,
}: {
  session: AccountSession;
  status: RosterSyncStatus;
  errorMessage: string | null;
  onClose: () => void;
  onResolve: () => void;
  onRetry: () => void;
  onSetPassword: () => void;
  onSignOut: () => Promise<void>;
  onSyncNow: () => void;
  returnFocus?: HTMLElement | null;
}) {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <DialogFrame title="Your account" titleId="account-title" onClose={onClose} returnFocus={returnFocus}>
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
        <button type="button" className="secondary-button" onClick={onSetPassword}>Set or change password</button>
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
  const attention = ['migration-required', 'conflict', 'paused', 'offline', 'error'].includes(status);
  const statusText = session && status === 'synced' ? 'Synced to your account' : syncStatusLabel(status);
  const StatusIcon = status === 'local-only'
    ? HardDrive
    : status === 'auth-loading' || status === 'loading-cloud' || status === 'syncing'
      ? LoaderCircle
      : status === 'synced'
        ? CircleCheck
        : status === 'offline'
          ? CloudOff
          : CircleAlert;

  return (
    <div
      className={`roster-sync-panel ${attention ? 'is-attention' : 'is-compact'}`}
      data-presentation={attention ? 'attention' : 'compact'}
    >
      <div className="roster-sync-summary">
        <StatusIcon
          className={status === 'auth-loading' || status === 'loading-cloud' || status === 'syncing' ? 'is-spinning' : undefined}
          size={attention ? 20 : 18}
          aria-hidden="true"
        />
        <div>
          <strong role="status" aria-live="polite" aria-atomic="true">{statusText}</strong>
          {session ? <span className="sync-email" title={session.email}>{shortEmail(session.email)}</span> : status === 'local-only' ? <span>Sign in to sync across devices.</span> : null}
        </div>
      </div>
      <div className="roster-sync-actions">
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
    ['Unlocked Habit Levels', comparison.local.habitLevels, comparison.cloud.habitLevels],
    ['Last updated', formatTime(comparison.localUpdatedAt), formatTime(comparison.cloudUpdatedAt)],
  ];
  return (
    <div className="comparison-wrap">
      <table className="roster-comparison">
        <caption className="sr-only">This browser and account roster comparison</caption>
        <thead><tr><th scope="col">Summary</th><th scope="col">This browser</th><th scope="col">Account</th></tr></thead>
        <tbody>{rows.map(([label, local, cloud]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td data-column-label="This browser"><span className="comparison-value-label" aria-hidden="true">This browser</span><span>{local}</span></td>
            <td data-column-label="Account"><span className="comparison-value-label" aria-hidden="true">Account</span><span>{cloud}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DialogFrame({
  children,
  onClose,
  returnFocus,
  title,
  titleId,
}: {
  children: ReactNode;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
  title: string;
  titleId: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const initialReturnFocusRef = useRef(returnFocus);
  useEffect(() => {
    previousFocusRef.current = initialReturnFocusRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
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
        <header className="details-header account-dialog-header">
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

function authErrorMessage(operation: string, error: unknown): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : '';
  if (operation === 'reset' && (detail.includes('rate limit') || detail.includes('too many'))) {
    return 'Too many authentication emails were requested. Wait a few minutes and try again.';
  }
  if (operation === 'sign-in') return 'The email or password was not accepted.';
  if (operation === 'google') return 'We could not start Google sign-in. Please try again.';
  if (operation === 'sign-up') return 'We could not create the account. Please try again.';
  if (operation === 'reset') return 'We could not send a password reset email. Please try again.';
  return 'We could not send a sign-in link. Please try again.';
}

function formatTime(value: string | null): string {
  if (!value) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
