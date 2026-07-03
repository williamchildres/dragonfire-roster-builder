import type { FormationPosition } from '../models/dragon';
import { formatPosition } from './positionRules';
import { SYNERGY_TAG_LABELS, type SynergyTag } from './tags';
import type { DragonSynergyProfile, PositionClaim, ProgressionRequirement, SynergySignal } from './types';

interface SynergyTagMatch {
  semanticTag: SynergyTag;
  providerTag: SynergyTag;
  beneficiaryTag: SynergyTag;
}

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
      kind: 'recipient-position';
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
  tagMatch: SynergyTagMatch = {
    semanticTag: output.tag,
    providerTag: output.tag,
    beneficiaryTag: output.tag,
  },
): string {
  const tag = tagMatch.semanticTag;

  if (tag === 'status:panic') {
    return `${provider.dragonName} applies Panic, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:first-strike') {
    return `${provider.dragonName} can grant First-Strike, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:slow') {
    return `${provider.dragonName} can apply Slow, which improves ${beneficiary.dragonName}'s ${benefit.abilityName} Recovery.`;
  }

  if (tag === 'status:burn') {
    return `${provider.dragonName} can apply Burn, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:taunt') {
    return `${provider.dragonName} can apply Taunt, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:control') {
    if (tagMatch.providerTag !== 'status:control') {
      const providerLabel = SYNERGY_TAG_LABELS[tagMatch.providerTag];
      return `${provider.dragonName}'s ${output.abilityName} can apply ${providerLabel}, which counts as Control and improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
    }

    return `${provider.dragonName} can apply Control, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'effect:recovery') {
    return `${provider.dragonName} provides Recovery, which ${beneficiary.dragonName} benefits from through ${benefit.abilityName}.`;
  }

  return `${provider.dragonName} provides ${output.description}, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
}

export function explainAmplifierOutput(
  supporter: DragonSynergyProfile,
  support: SynergySignal,
  producer: DragonSynergyProfile,
  output: SynergySignal,
  tag: SynergyTag = support.tag,
): string {
  if (tag === 'damage:fire') {
    return `${supporter.dragonName} improves allied Fire Damage, and ${producer.dragonName} deals Fire Damage.`;
  }

  if (tag === 'damage:physical') {
    return `${supporter.dragonName} improves Physical Damage, and ${producer.dragonName} deals Physical Damage.`;
  }

  if (tag === 'damage:tactical') {
    return `${supporter.dragonName} improves Tactical Damage, and ${producer.dragonName} deals Tactical Damage.`;
  }

  if (tag === 'effect:recovery') {
    return `${supporter.dragonName} improves Recovery, and ${producer.dragonName} provides Recovery.`;
  }

  if (tag.startsWith('stat:')) {
    return `${supporter.dragonName} improves ${SYNERGY_TAG_LABELS[tag]}, which supports ${producer.dragonName}'s ${output.abilityName}.`;
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

  if (reason.kind === 'recipient-position') {
    return `${beneficiary.dragonName} must be deployed in ${formatPosition(reason.requiredPosition)} to receive ${provider.dragonName}'s ${providerSignal.abilityName}.`;
  }

  return `${provider.dragonName} and ${beneficiary.dragonName} are not adjacent in this formation.`;
}

export function explainPositionConflict(
  claims: Array<{ profile: DragonSynergyProfile; claim: PositionClaim }>,
): string {
  const requiredPosition = claims[0]?.claim.requiredPosition ?? 'vanguard';
  const names = claims.map(({ profile, claim }) => `${profile.dragonName}'s ${claim.abilityName}`);
  const joinedNames =
    names.length === 2
      ? names.join(' and ')
      : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

  return `${joinedNames} require ${formatPosition(requiredPosition)}; only one dragon can receive that positional benefit.`;
}

export function explainProgressionLocked(
  relationshipKind: 'setup-payoff' | 'amplifier-output',
  provider: DragonSynergyProfile,
  providerSignal: SynergySignal,
  beneficiary: DragonSynergyProfile,
  beneficiarySignal: SynergySignal,
  tagMatch: SynergyTagMatch,
  lockedProfile: DragonSynergyProfile,
  requirement: ProgressionRequirement,
): string {
  const relationship = describeLockedRelationship(
    relationshipKind,
    provider,
    providerSignal,
    beneficiary,
    beneficiarySignal,
    tagMatch,
  );

  if (requirement.minimumStarRank !== undefined) {
    return `${relationship} unlocks when ${lockedProfile.dragonName} reaches Star Rank ${requirement.minimumStarRank}.`;
  }

  if (requirement.minimumDragonLevel !== undefined) {
    return `${relationship} unlocks when ${lockedProfile.dragonName} reaches Dragon Level ${requirement.minimumDragonLevel}.`;
  }

  return `${relationship} is locked by ${lockedProfile.dragonName}'s saved progression.`;
}

function describeLockedRelationship(
  relationshipKind: 'setup-payoff' | 'amplifier-output',
  provider: DragonSynergyProfile,
  providerSignal: SynergySignal,
  beneficiary: DragonSynergyProfile,
  beneficiarySignal: SynergySignal,
  tagMatch: SynergyTagMatch,
): string {
  if (relationshipKind === 'setup-payoff') {
    const label = SYNERGY_TAG_LABELS[tagMatch.providerTag];
    const aliasText =
      tagMatch.semanticTag === 'status:control' && tagMatch.providerTag !== 'status:control'
        ? `${label}-as-Control`
        : label;
    return `${provider.dragonName}'s ${providerSignal.abilityName} ${aliasText} setup for ${beneficiary.dragonName}'s ${beneficiarySignal.abilityName}`;
  }

  return `${provider.dragonName}'s ${providerSignal.abilityName} ${SYNERGY_TAG_LABELS[tagMatch.semanticTag]} support for ${beneficiary.dragonName}'s ${beneficiarySignal.abilityName}`;
}
