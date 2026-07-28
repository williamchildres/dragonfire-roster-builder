import { dragons } from '../../../data/dragons';
import { simpleSynergyProfiles } from '../../profiles';
import type { ReliabilityAbilityReference } from '../types';

export const formationReliabilityAbilityCatalog: readonly ReliabilityAbilityReference[] = dragons
  .flatMap((dragon) =>
    [dragon.command, dragon.trait, ...dragon.habits].map((ability) => ({
      abilityId: ability.id,
      kind: ability.kind,
      dragonId: dragon.id,
      unlockStarRank: ability.unlockStarRank,
      minimumDragonLevel: ability.minimumDragonLevel,
      evidenceIds: [...ability.evidenceIds].sort(),
    })),
  )
  .sort((left, right) => left.abilityId.localeCompare(right.abilityId));

const profileSignals = simpleSynergyProfiles.flatMap((profile) => [
  ...profile.outputs,
  ...profile.supports,
  ...profile.benefitsFrom,
]);

export const formationReliabilityScoringSignalIds: readonly string[] = profileSignals
  .filter((signal) => signal.nonScoring !== true)
  .map((signal) => signal.id)
  .sort();

export const formationReliabilityNonScoringSignalIds: readonly string[] = profileSignals
  .filter((signal) => signal.nonScoring === true)
  .map((signal) => signal.id)
  .sort();

export const formationReliabilityPositionClaimIds: readonly string[] = simpleSynergyProfiles
  .flatMap((profile) => profile.positionClaims.map((claim) => claim.id))
  .sort();
