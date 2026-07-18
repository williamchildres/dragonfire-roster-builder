import type { RosterSyncStatus } from '../hooks/useRosterSync';

const ACCOUNT_DISPLAY_NAME_LIMIT = 16;

export function accountDisplayName(email: string): string {
  const value = typeof email === 'string' ? email.trim() : '';
  const localPart = value.split('@', 1)[0]?.trim() || 'Account';
  return localPart.length <= ACCOUNT_DISPLAY_NAME_LIMIT
    ? localPart
    : `${localPart.slice(0, ACCOUNT_DISPLAY_NAME_LIMIT - 1)}…`;
}

export function isRosterSyncAttention(status: RosterSyncStatus): boolean {
  return ['migration-required', 'conflict', 'paused', 'offline', 'error'].includes(status);
}
