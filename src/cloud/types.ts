import type { OwnedDragon } from '../models/dragon';

export interface AccountSession {
  userId: string;
  email: string;
}

export interface AuthService {
  getSession(): Promise<AccountSession | null>;
  onAuthStateChange(listener: (session: AccountSession | null) => void): () => void;
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

export interface AccountServices {
  auth: AuthService;
  rosters: CloudRosterRepository;
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
