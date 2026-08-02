import type { OwnedDragon } from '../models/dragon';
import type { SavedFormationLibrary } from '../savedFormations/types';

export interface AccountSession {
  userId: string;
  email: string;
}

export type AccountAuthEvent = 'session' | 'signed-out' | 'password-recovery';

export interface AccountAuthState {
  event: AccountAuthEvent;
  session: AccountSession | null;
}

export interface SignUpResult {
  session: AccountSession | null;
}

export interface AuthService {
  getSession(): Promise<AccountSession | null>;
  onAuthStateChange(listener: (state: AccountAuthState) => void): () => void;
  signInWithGoogle(redirectTo: string): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(email: string, password: string, redirectTo: string): Promise<SignUpResult>;
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}

export interface CloudRosterRecord {
  userId: string;
  rosterSchemaVersion: number;
  roster: Record<string, OwnedDragon>;
  clientUpdatedAt: string | null;
  updatedAt: string;
}

export interface CloudRosterRepository {
  fetchRoster(userId: string): Promise<CloudRosterRecord | null>;
  upsertRoster(
    userId: string,
    roster: Record<string, OwnedDragon>,
    clientUpdatedAt: string,
  ): Promise<CloudRosterRecord>;
}

export interface CloudSavedFormationRecord {
  userId: string;
  schemaVersion: number;
  library: SavedFormationLibrary;
  clientUpdatedAt: string | null;
  updatedAt: string;
}

export interface CloudSavedFormationRepository {
  fetchLibrary(userId: string): Promise<CloudSavedFormationRecord | null>;
  upsertLibrary(
    userId: string,
    library: SavedFormationLibrary,
    clientUpdatedAt: string,
  ): Promise<CloudSavedFormationRecord>;
}

export interface AccountServices {
  auth: AuthService;
  rosters: CloudRosterRepository;
  savedFormations: CloudSavedFormationRepository;
}

export class UnsupportedRosterSchemaError extends Error {
  constructor(public readonly schemaVersion: number) {
    super('This account roster uses an unsupported schema version. Your browser roster was not changed.');
    this.name = 'UnsupportedRosterSchemaError';
  }
}

export class InvalidCloudRosterError extends Error {
  constructor() {
    super('The account roster could not be read safely. Your browser roster was not changed.');
    this.name = 'InvalidCloudRosterError';
  }
}

export class UnsupportedSavedFormationSchemaError extends Error {
  constructor(public readonly schemaVersion: number) {
    super('This account Saved Formation Library uses an unsupported schema version. Browser formations were not changed.');
    this.name = 'UnsupportedSavedFormationSchemaError';
  }
}

export class InvalidCloudSavedFormationError extends Error {
  constructor() {
    super('The account Saved Formation Library could not be read safely. Browser formations were not changed.');
    this.name = 'InvalidCloudSavedFormationError';
  }
}
