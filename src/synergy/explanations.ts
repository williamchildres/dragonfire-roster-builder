import type { DragonSynergyProfile, PositionClaim, ProgressionRequirement, SynergySignal } from './types';

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
  if (benefit.tag === 'status:panic') {
    return `${beneficiary.dragonName} benefits from Panic, but this formation has no Panic provider.`;
  }

  return `${beneficiary.dragonName} benefits from ${benefit.description}, but this formation has no provider.`;
}

export function explainPositionBlocked(
  provider: DragonSynergyProfile,
  beneficiary: DragonSynergyProfile,
): string {
  return `${provider.dragonName} and ${beneficiary.dragonName} are not adjacent in this formation.`;
}

export function explainPositionConflict(
  first: DragonSynergyProfile,
  firstClaim: PositionClaim,
  second: DragonSynergyProfile,
  secondClaim: PositionClaim,
): string {
  return `${first.dragonName} and ${second.dragonName} both require Vanguard for their Level 16 Traits; only one can receive the full positional benefit from ${firstClaim.abilityName} and ${secondClaim.abilityName}.`;
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

  if (requirement.minimumHabitLevel !== undefined) {
    return `This relationship unlocks when ${provider.dragonName}'s ${signal.abilityName} reaches Habit Level ${requirement.minimumHabitLevel}.`;
  }

  return `This relationship is locked by ${provider.dragonName}'s saved progression.`;
}
