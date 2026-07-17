export type CloudConfig =
  | { state: 'configured'; url: string; publishableKey: string }
  | { state: 'unavailable' };

export interface CloudEnvironment {
  VITE_SUPABASE_URL?: unknown;
  VITE_SUPABASE_PUBLISHABLE_KEY?: unknown;
}

export function readCloudConfig(environment: CloudEnvironment): CloudConfig {
  const url = normalizeValue(environment.VITE_SUPABASE_URL);
  const publishableKey = normalizeValue(environment.VITE_SUPABASE_PUBLISHABLE_KEY);

  if (!url || !publishableKey) {
    return { state: 'unavailable' };
  }

  return { state: 'configured', url, publishableKey };
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
