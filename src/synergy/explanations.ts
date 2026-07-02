import type { FormationPosition } from '../models/dragon';
import { formatPosition } from './positionRules';
import { SYNERGY_TAG_LABELS } from './tags';
import type { DragonSynergyProfile, PositionClaim, ProgressionRequirement, SynergySignal } from './types';

export type PositionBlockReason =
  | {
      kind: 'provider-position';
      requiredPosition: FormationPosition;
    }
  | {
      kind: 'beneficiary-position';
      requiredPosition: FormationPosition;
    }
  | {
      kind: 'adjacency';
    };

export function explainSetupPayoff(
  provider: DragonSynergyProfile,
  output: SynergySignal,
  beneficiary: DragonSynergyProfile,
  benefit: SynergySignal,
): string {
  if (output.tag === 'status:panic') {
    return `${provider.dragonName} applies Panic, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (output.tag === 'status:first-strike') {
    return `${provider.dragonName} can grant First-Strike, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (output.tag === 'effect:recovery') {
    return `${provider.dragonName} provides Recovery, which ${beneficiary.dragonName} benefits from through ${benefit.abilityName}.`;
  }

  return `${provider.dragonName} provides ${output.description}, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
}

export function explainAmplifierOutput(
  supporter: DragonSynergyProfile,
  support: SynergySignal,
  producer: DragonSynergyProfile,
  output: SynergySignal,
): string {
  if (support.tag === 'damage:fire') {
    return `${supporter.dragonName} improves allied Fire Damage, and ${producer.dragonName} deals Fire Damage.`;
  }

  return `${supporter.dragonName} improves ${support.description}, and ${producer.dragonName} provides ${output.description}.`;
}

export function explainMissingEnabler(beneficiary: DragonSynergyProfile, benefit: SynergySignal): string {
  const label = SYNERGY_TAG_LABELS[benefit.tag];
  return `${beneficiary.dragonName} benefits from ${label}, but this formation has no ${label} provider.`;
}

export function explainPositionBlocked(
  provider: DragonSynergyProfile,
  providerSignal: SynergySignal,
  beneficiary: DragonSynergyProfile,
  beneficiarySignal: SynergySignal,
  reason: PositionBlockReason,
): string {
  if (reason.kind === 'provider-position') {
    return `${provider.dragonName} must be deployed in ${formatPosition(reason.requiredPosition)} for ${providerSignal.abilityName}.`;
  }

  if (reason.kind === 'beneficiary-position') {
    return `${beneficiary.dragonName} must be deployed in ${formatPosition(reason.requiredPosition)} for ${beneficiarySignal.abilityName}.`;
  }

  return `${provider.dragonName} and ${beneficiary.dragonName} are not adjacent in this formation.`;
}

export function explainPositionConflict(
  first: DragonSynergyProfile,
  firstClaim: PositionClaim,
  second: DragonSynergyProfile,
  secondClaim: PositionClaim,
): string {
  return `${first.dragonName}'s ${firstClaim.abilityName} and ${second.dragonName}'s ${secondClaim.abilityName} both require ${formatPosition(firstClaim.requiredPosition)}; only one dragon can receive that positional benefit.`;
}

export function explainProgressionLocked(
  provider: DragonSynergyProfile,
  signal: SynergySignal | PositionClaim,
  requirement: ProgressionRequirement,
): string {
  if (requirement.minimumStarRank !== undefined) {
    return `This relationship unlocks when ${provider.dragonName} reaches Star Rank ${requirement.minimumStarRank}.`;
  }

  if (requirement.minimumDragonLevel !== undefined) {
    return `This relationship unlocks when ${provider.dragonName} reaches Dragon Level ${requirement.minimumDragonLevel}.`;
  }

  return `This relationship is locked by ${provider.dragonName}'s saved progression.`;
}
