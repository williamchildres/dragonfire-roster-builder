import historicalInput from './fixtures/historicalFormationRatingV2Profiles.0.23.2.json';
import type { DragonSynergyProfile } from '../synergy/types';

export const HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SCHEMA_VERSION = 1 as const;
export const HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SOURCE_COMMIT =
  '2832d64c75621ce2fcf57385d716df2f2de52aab' as const;
export const HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_IDENTITY =
  'sha256:68343cd6bfa67e10f616cf8c3ee109f0d19026058cbf6ffb53776aa6cb758719' as const;
export const HISTORICAL_FORMATION_RATING_V2_PROFILE_COUNT = 33 as const;
export const HISTORICAL_FORMATION_RATING_V2_SIGNAL_COUNT = 239 as const;

if (
  historicalInput.schemaVersion !== HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SCHEMA_VERSION ||
  historicalInput.sourceCommit !== HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SOURCE_COMMIT ||
  historicalInput.deterministicInputHash !== HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_IDENTITY ||
  historicalInput.profileCount !== HISTORICAL_FORMATION_RATING_V2_PROFILE_COUNT ||
  historicalInput.signalCount !== HISTORICAL_FORMATION_RATING_V2_SIGNAL_COUNT
) {
  throw new Error('Historical Formation Rating v2 profile-input metadata changed unexpectedly.');
}

/**
 * Immutable Formation Rating v2 profile input captured directly from the
 * reviewed 0.23.2 base commit. It deliberately has no import or object-reference
 * dependency on current production profiles.
 */
export const historicalFormationRatingV2Profiles = deepFreeze(
  historicalInput.profiles,
) as unknown as DragonSynergyProfile[];

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
