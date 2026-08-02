import { simpleSynergyProfiles } from '../synergy/profiles';
import type { DragonSynergyProfile } from '../synergy/types';

/**
 * Frozen input for the historical Formation Rating v2 artifact.
 *
 * V2 predates the Blazing Fury recipient correction and its reviewed hash must
 * remain evidence of that released contract. Current production evaluation
 * always uses `simpleSynergyProfiles` directly.
 */
export const historicalFormationRatingV2Profiles: DragonSynergyProfile[] =
  simpleSynergyProfiles.map((profile) => profile.dragonId !== 'syrax' ? profile : ({
    ...profile,
    outputs: profile.outputs.map((signal) =>
      signal.id === 'syrax-blazing-fury-first-strike'
        ? { ...signal, recipientSelector: undefined }
        : signal,
    ),
    supports: profile.supports.map((signal) =>
      signal.id === 'syrax-blazing-fury-fire-support'
        ? { ...signal, recipientSelector: undefined }
        : signal,
    ),
  }));
