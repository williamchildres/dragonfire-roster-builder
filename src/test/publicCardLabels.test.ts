import { describe, expect, it } from 'vitest';
import { getPublicVerificationLabel, getPublicVerificationTone } from '../app/publicCardLabels';

describe('public card verification labels', () => {
  it('maps detailed dragon verification statuses to simplified public labels', () => {
    expect(getPublicVerificationLabel('community-verified')).toBe('Verified');
    expect(getPublicVerificationTone('community-verified')).toBe('verified');

    expect(getPublicVerificationLabel('officially-confirmed')).toBe('Verified');
    expect(getPublicVerificationTone('officially-confirmed')).toBe('verified');
  });

  it('maps metadata-only records to the public metadata label', () => {
    expect(getPublicVerificationLabel('official-metadata-only')).toBe('Metadata Only');
    expect(getPublicVerificationTone('official-metadata-only')).toBe('metadata-only');
  });
});

