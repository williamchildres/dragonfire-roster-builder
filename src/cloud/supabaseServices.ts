import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { ROSTER_SCHEMA_VERSION } from '../services/rosterStorage';
import { readCloudConfig, type CloudConfig } from './cloudConfig';
import { parseCloudRosterRow, serializeCloudRoster } from './rosterContract';
import type {
  AccountServices,
  AccountSession,
  AuthService,
  CloudRosterRepository,
} from './types';

let productionServices: AccountServices | null | undefined;

export function getProductionAccountServices(): AccountServices | null {
  if (productionServices !== undefined) {
    return productionServices;
  }

  const config = readCloudConfig(import.meta.env);
  productionServices = config.state === 'configured' ? createSupabaseServices(config) : null;
  return productionServices;
}

export function createSupabaseServices(
  config: Extract<CloudConfig, { state: 'configured' }>,
): AccountServices {
  const client = createClient(config.url, config.publishableKey, {
    auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
  return {
    auth: new SupabaseAuthService(client),
    rosters: new SupabaseRosterRepository(client),
  };
}

class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<AccountSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw error;
    }
    return mapSession(data.session);
  }

  onAuthStateChange(listener: Parameters<AuthService['onAuthStateChange']>[0]): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => listener({
      event: event === 'PASSWORD_RECOVERY' ? 'password-recovery' : session ? 'session' : 'signed-out',
      session: mapSession(session),
    }));
    return () => data.subscription.unsubscribe();
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithPassword(email: string, password: string, redirectTo: string) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    return { session: mapSession(data.session) };
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }

  async sendMagicLink(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw error;
    }
  }
}

class SupabaseRosterRepository implements CloudRosterRepository {
  constructor(private readonly client: SupabaseClient) {}

  async fetchRoster(userId: string) {
    const { data, error } = await this.client
      .from('user_rosters')
      .select('user_id, roster_schema_version, roster, client_updated_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data === null ? null : parseCloudRosterRow(data);
  }

  async upsertRoster(userId: string, roster: Parameters<CloudRosterRepository['upsertRoster']>[1], clientUpdatedAt: string) {
    const { data, error } = await this.client
      .from('user_rosters')
      .upsert(
        {
          user_id: userId,
          roster_schema_version: ROSTER_SCHEMA_VERSION,
          roster: serializeCloudRoster(roster),
          client_updated_at: clientUpdatedAt,
        },
        { onConflict: 'user_id' },
      )
      .select('user_id, roster_schema_version, roster, client_updated_at, updated_at')
      .single();
    if (error) {
      throw error;
    }
    return parseCloudRosterRow(data);
  }
}

function mapSession(session: Session | null): AccountSession | null {
  if (!session?.user.email) {
    return null;
  }
  return { userId: session.user.id, email: session.user.email };
}

export function buildAuthRedirectUrl(location: Pick<Location, 'origin' | 'pathname'>): string {
  const baseUrl = new URL(import.meta.env.BASE_URL, `${location.origin}${location.pathname}`);
  baseUrl.hash = '';
  baseUrl.search = '';
  return baseUrl.href;
}
