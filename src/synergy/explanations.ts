import type { FormationPosition } from '../models/dragon';
import { formatPosition } from './positionRules';
import { SYNERGY_TAG_LABELS, type SynergyTag } from './tags';
import type { DragonSynergyProfile, PositionClaim, ProgressionRequirement, SynergySignal } from './types';

interface SynergyTagMatch {
  semanticTag: SynergyTag;
  providerTag: SynergyTag;
  beneficiaryTag: SynergyTag;
}

export type HardPositionBlockKind = 'provider-position' | 'beneficiary-position' | 'recipient-position';

export interface HardPositionBlockReason {
  kind: HardPositionBlockKind;
  requiredPosition: FormationPosition;
}

export type PositionBlockReason =
  | {
      kind: 'hard-position';
      requirements: HardPositionBlockReason[];
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
    if (/double/i.test(benefit.description)) {
      return `${provider.dragonName} applies Panic, which lets ${beneficiary.dragonName} deal double damage to eligible enemies with ${benefit.abilityName}.`;
    }
    return `${provider.dragonName} applies Panic, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:resistance') {
    return `${provider.dragonName} grants Resistance, which doubles ${beneficiary.dragonName}'s Recovery through ${benefit.abilityName}.`;
  }

  if (tag === 'status:first-strike') {
    return `${provider.dragonName} can grant First-Strike, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:slow') {
    const recoverySuffix = /Recovery/i.test(benefit.description) ? ' Recovery' : '';
    return `${provider.dragonName} can apply Slow, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}${recoverySuffix}.`;
  }

  if (tag === 'status:burn') {
    return `${provider.dragonName} can apply Burn, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:taunt') {
    return `${provider.dragonName} can apply Taunt, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:vulnerable') {
    if (/double/i.test(benefit.description)) {
      return `${provider.dragonName} can apply Vulnerable, which lets ${beneficiary.dragonName} deal double Tactical Damage to afflicted targets with ${benefit.abilityName}.`;
    }
    return `${provider.dragonName} can apply Vulnerable, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag === 'status:control') {
    if (tagMatch.providerTag !== 'status:control') {
      const providerLabel = SYNERGY_TAG_LABELS[tagMatch.providerTag];
      return `${provider.dragonName}'s ${output.abilityName} can apply ${providerLabel}, which counts as Control and improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
    }

    return `${provider.dragonName} can apply Control, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
  }

  if (tag.startsWith('status:')) {
    return `${provider.dragonName} can apply ${SYNERGY_TAG_LABELS[tag]}, which improves ${beneficiary.dragonName}'s ${benefit.abilityName}.`;
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
    const supportedDamage = support.damageScope === 'non-basic-attack' ? 'non-Basic Physical Damage' : 'Physical Damage';
    return `${supporter.dragonName} improves ${supportedDamage}, and ${producer.dragonName} deals Physical Damage.`;
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
  if (reason.kind === 'hard-position') {
    if (reason.requirements.length === 1) {
      const requirement = reason.requirements[0]!;
      if (requirement.kind === 'provider-position') {
        return `${provider.dragonName} must be deployed in ${formatPosition(requirement.requiredPosition)} for ${providerSignal.abilityName}.`;
      }

      if (requirement.kind === 'beneficiary-position') {
        return `${beneficiary.dragonName} must be deployed in ${formatPosition(requirement.requiredPosition)} for ${beneficiarySignal.abilityName}.`;
      }

      return `${beneficiary.dragonName} must be deployed in ${formatPosition(requirement.requiredPosition)} to receive ${provider.dragonName}'s ${providerSignal.abilityName}.`;
    }

    const requirements = reason.requirements.map((requirement) => {
      const dragonName = requirement.kind === 'provider-position' ? provider.dragonName : beneficiary.dragonName;
      return `${dragonName} must be deployed in ${formatPosition(requirement.requiredPosition)}`;
    });

    return `${joinRequirementClauses(requirements)}, for ${providerSignal.abilityName} to support ${beneficiarySignal.abilityName}.`;
  }

  return `${provider.dragonName} and ${beneficiary.dragonName} are not adjacent in this formation.`;
}

function joinRequirementClauses(requirements: string[]): string {
  if (requirements.length === 2) {
    return `${requirements[0]}, and ${requirements[1]}`;
  }

  return `${requirements.slice(0, -1).join(', ')}, and ${requirements[requirements.length - 1]}`;
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
