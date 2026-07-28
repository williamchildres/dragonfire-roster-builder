import type { ReliabilityContractInput } from '../types';
import {
  formationReliabilityAbilityCatalog,
  formationReliabilityNonScoringSignalIds,
  formationReliabilityPositionClaimIds,
  formationReliabilityScoringSignalIds,
} from './catalog';
import { dragonReliabilityRegistries } from './dragons';

export const formationReliabilityComponents = dragonReliabilityRegistries
  .flatMap((registry) => registry.components)
  .sort((left, right) => left.id.localeCompare(right.id));

export const formationReliabilityBindings = dragonReliabilityRegistries
  .flatMap((registry) => registry.bindings)
  .sort((left, right) => left.signalId.localeCompare(right.signalId));

export {
  formationReliabilityAbilityCatalog,
  formationReliabilityNonScoringSignalIds,
  formationReliabilityPositionClaimIds,
  formationReliabilityScoringSignalIds,
};

export const formationReliabilityContractInput: ReliabilityContractInput = {
  components: formationReliabilityComponents,
  bindings: formationReliabilityBindings,
  scoringSignalIds: formationReliabilityScoringSignalIds,
  abilityCatalog: formationReliabilityAbilityCatalog,
};
