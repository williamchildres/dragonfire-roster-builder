import { describe, expect, it } from 'vitest';
import { getPublicRosterSourceLabel, getPublicVerificationLabel, getPublicVerificationTone } from '../app/publicCardLabels';

describe('public card verification labels', () => {
  it('maps detailed dragon verification statuses to simplified public labels', () => {
    expect(getPublicVerificationLabel('community-verified')).toBe('Verified');
    expect(getPublicVerificationTone('community-verified')).toBe('verified');

    expect(getPublicVerificationLabel('officially-confirmed')).toBe('Verified');
    expect(getPublicVerificationTone('officially-confirmed')).toBe('verified');

    expect(getPublicVerificationLabel('screenshot-verified')).toBe('Verified');
    expect(getPublicVerificationLabel('community-unverified')).toBe('Not verified');
  });

  it('maps metadata-only records to the public metadata label', () => {
    expect(getPublicVerificationLabel('official-metadata-only')).toBe('Metadata Only');
    expect(getPublicVerificationTone('official-metadata-only')).toBe('metadata-only');
  });

  it('maps roster source labels to public-facing text', () => {
    expect(getPublicRosterSourceLabel('official-website')).toBe('Official entry');
    expect(getPublicRosterSourceLabel('in-game-verified-pending-official-site')).toBe('Pending official site');
    expect(getPublicRosterSourceLabel('community-unverified')).toBe('Metadata Only');
  });
});

