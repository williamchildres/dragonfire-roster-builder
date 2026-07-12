import type { DragonRosterSourceStatus, FieldVerificationStatus, VerificationStatus } from '../models/dragon';

export type PublicVerificationTone = 'verified' | 'metadata-only';

type PublicStatus = VerificationStatus | FieldVerificationStatus;

export function getPublicVerificationLabel(status: PublicStatus): string | null {
  switch (status) {
    case 'official-metadata-only':
      return 'Metadata Only';
    case 'community-verified':
    case 'officially-confirmed':
    case 'screenshot-verified':
    case 'partially-screenshot-verified':
      return 'Verified';
    case 'community-unverified':
    case 'unknown':
      return 'Not verified';
    default:
      return null;
  }
}

export function getPublicVerificationTone(status: PublicStatus): PublicVerificationTone | null {
  switch (status) {
    case 'official-metadata-only':
      return 'metadata-only';
    case 'community-verified':
    case 'officially-confirmed':
    case 'screenshot-verified':
    case 'partially-screenshot-verified':
      return 'verified';
    case 'community-unverified':
    case 'unknown':
      return 'metadata-only';
    default:
      return null;
  }
}

export function getPublicRosterSourceLabel(status: DragonRosterSourceStatus): string {
  switch (status) {
    case 'official-website':
      return 'Official entry';
    case 'in-game-verified-pending-official-site':
      return 'Pending official site';
    case 'community-unverified':
      return 'Metadata Only';
  }
}

