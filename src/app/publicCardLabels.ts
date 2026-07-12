import type { VerificationStatus } from '../models/dragon';

export type PublicVerificationTone = 'verified' | 'metadata-only';

export function getPublicVerificationLabel(status: VerificationStatus): string | null {
  switch (status) {
    case 'official-metadata-only':
      return 'Metadata Only';
    case 'community-verified':
    case 'officially-confirmed':
      return 'Verified';
    default:
      return null;
  }
}

export function getPublicVerificationTone(status: VerificationStatus): PublicVerificationTone | null {
  switch (status) {
    case 'official-metadata-only':
      return 'metadata-only';
    case 'community-verified':
    case 'officially-confirmed':
      return 'verified';
    default:
      return null;
  }
}

