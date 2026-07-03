import type { FormationPosition } from '../models/dragon';
import { areAdjacent, SIMPLE_FORMATION_POSITIONS } from './positionRules';
import { CONTROL_ALIAS_TAGS, type SynergyTag } from './tags';
import {
  explainAmplifierOutput,
  explainMissingEnabler,
  explainPositionBlocked,
  explainPositionConflict,
  explainProgressionLocked,
  explainSetupPayoff,
  type PositionBlockReason,
} from './explanations';
import type {
  DragonProgression,
  DragonSynergyProfile,
  EvaluateFormationInput,
  EvaluateFormationResult,
  PositionClaim,
  ProgressionRequirement,
  SimpleSynergyResult,
  SimpleSynergyResultKind,
  SynergySignal,
} from './types';

interface SelectedProfile {
  profile: DragonSynergyProfile;
  position: FormationPosition;
}

const resultKindOrder: Record<SimpleSynergyResultKind, number> = {
  'setup-payoff': 0,
  'amplifier-output': 1,
  'missing-enabler': 2,
  'position-blocked': 3,
  'position-conflict': 4,
  'progression-locked': 5,
};

export function evaluateFormation(input: EvaluateFormationInput): EvaluateFormationResult {
  const selected = selectedProfiles(input);
  const results = new Map<string, SimpleSynergyResult>();

  for (const beneficiary of selected) {
    for (const benefit of beneficiary.profile.benefitsFrom) {
      addSetupPayoffResults(results, input, selected, beneficiary, benefit);
    }
  }

  for (const supporter of selected) {
    for (const support of supporter.profile.supports) {
      addAmplifierOutputResults(results, input, selected, supporter, support);
    }
  }

  addPositionConflictResults(results, input, selected);

  return {
    results: [...results.values()].sort(compareResults),
  };
}

function selectedProfiles(input: EvaluateFormationInput): SelectedProfile[] {
  const profilesById = new Map(input.profiles.map((profile) => [profile.dragonId, profile]));

  return SIMPLE_FORMATION_POSITIONS.flatMap((position) => {
    const dragonId = input.formation[position];
    const profile = dragonId ? profilesById.get(dragonId) : undefined;
    return profile ? [{ profile, position }] : [];
  });
}

function addSetupPayoffResults(
  results: Map<string, SimpleSynergyResult>,
  input: EvaluateFormationInput,
  selected: SelectedProfile[],
  beneficiary: SelectedProfile,
  benefit: SynergySignal,
): void {
  const benefitTags = signalTags(benefit);
  const selfOutputsTag = beneficiary.profile.outputs.some((output) =>
    signalTags(output).some((outputTag) => benefitTags.some((benefitTag) => tagsAreCompatible(outputTag, benefitTag))),
  );
  const providers = selected.filter(
    (provider) =>
      provider.profile.dragonId !== beneficiary.profile.dragonId &&
      provider.profile.outputs.some((output) => matchingTag(output, benefit) && signalCanReachTeammate(output)),
  );

  if (providers.length === 0 && selfOutputsTag) {
    return;
  }

  if (providers.length === 0 && isUnlocked(benefit, input.progression[beneficiary.profile.dragonId])) {
    addResult(results, {
      id: `missing-enabler:${beneficiary.profile.dragonId}:${benefit.tag}`,
      kind: 'missing-enabler',
      tag: benefit.tag,
      dragonIds: [beneficiary.profile.dragonId],
      abilityIds: [benefit.abilityId],
      explanation: explainMissingEnabler(beneficiary.profile, benefit),
    });
    return;
  }

  for (const provider of providers) {
    for (const output of provider.profile.outputs.filter((candidate) => matchingTag(candidate, benefit) && signalCanReachTeammate(candidate))) {
      const tag = matchingTag(output, benefit);
      if (tag) {
        addRelationshipResult(results, input, 'setup-payoff', provider, output, beneficiary, benefit, tag);
      }
    }
  }
}

function addAmplifierOutputResults(
  results: Map<string, SimpleSynergyResult>,
  input: EvaluateFormationInput,
  selected: SelectedProfile[],
  supporter: SelectedProfile,
  support: SynergySignal,
): void {
  if (!signalCanReachTeammate(support)) {
    return;
  }

  for (const producer of selected) {
    if (producer.profile.dragonId === supporter.profile.dragonId) {
      continue;
    }

    for (const output of producer.profile.outputs.filter((candidate) => matchingTag(support, candidate))) {
      const tag = matchingTag(support, output);
      if (tag) {
        addRelationshipResult(results, input, 'amplifier-output', supporter, support, producer, output, tag);
      }
    }
  }
}

function addRelationshipResult(
  results: Map<string, SimpleSynergyResult>,
  input: EvaluateFormationInput,
  activeKind: 'setup-payoff' | 'amplifier-output',
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
  tag: SynergyTag,
): void {
  const locked = firstLockedSignal(input, provider.profile, providerSignal, beneficiary.profile, beneficiarySignal);
  const semanticId =
    activeKind === 'setup-payoff'
      ? [activeKind, provider.profile.dragonId, tag, beneficiary.profile.dragonId].join(':')
      : [
          activeKind,
          provider.profile.dragonId,
          providerSignal.abilityId,
          tag,
          beneficiary.profile.dragonId,
          beneficiarySignal.abilityId,
        ].join(':');

  if (locked) {
    addResult(results, {
      id: `progression-locked:${semanticId}`,
      kind: 'progression-locked',
      tag,
      dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
      abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
      explanation: explainProgressionLocked(locked.profile, locked.signal, locked.requirement),
      unlock: locked.requirement,
    });
    return;
  }

  const positionBlockReason = getPositionBlockReason(provider, providerSignal, beneficiary, beneficiarySignal);
  if (positionBlockReason) {
    addResult(results, {
      id: `position-blocked:${semanticId}`,
      kind: 'position-blocked',
      tag,
      dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
      abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
      explanation: explainPositionBlocked(
        provider.profile,
        providerSignal,
        beneficiary.profile,
        beneficiarySignal,
        positionBlockReason,
      ),
    });
    return;
  }

  addResult(results, {
    id: semanticId,
    kind: activeKind,
    tag,
    dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
    abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
    explanation:
      activeKind === 'setup-payoff'
        ? explainSetupPayoff(provider.profile, providerSignal, beneficiary.profile, beneficiarySignal, tag)
        : explainAmplifierOutput(provider.profile, providerSignal, beneficiary.profile, beneficiarySignal, tag),
  });
}

function addPositionConflictResults(
  results: Map<string, SimpleSynergyResult>,
  input: EvaluateFormationInput,
  selected: SelectedProfile[],
): void {
  const claims = selected.flatMap((entry) =>
    entry.profile.positionClaims
      .filter((claim) => isUnlocked(claim, input.progression[entry.profile.dragonId]))
      .map((claim) => ({ ...entry, claim })),
  );

  for (const position of SIMPLE_FORMATION_POSITIONS) {
    const positionClaims = claims.filter((claim) => claim.claim.requiredPosition === position);
    if (positionClaims.length > 1) {
      addResult(results, {
        id: ['position-conflict', position, ...positionClaims.map((claim) => `${claim.profile.dragonId}:${claim.claim.abilityId}`)].join(':'),
        kind: 'position-conflict',
        dragonIds: positionClaims.map((claim) => claim.profile.dragonId),
        abilityIds: positionClaims.map((claim) => claim.claim.abilityId),
        explanation: explainPositionConflict(positionClaims),
      });
    }
  }
}

function getPositionBlockReason(
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
): PositionBlockReason | null {
  if (
    providerSignal.requiredSelfPosition !== undefined &&
    providerSignal.requiredSelfPosition !== provider.position
  ) {
    return { kind: 'provider-position', requiredPosition: providerSignal.requiredSelfPosition };
  }

  if (
    beneficiarySignal.requiredSelfPosition !== undefined &&
    beneficiarySignal.requiredSelfPosition !== beneficiary.position
  ) {
    return { kind: 'beneficiary-position', requiredPosition: beneficiarySignal.requiredSelfPosition };
  }

  if (
    providerSignal.requiredRecipientPosition !== undefined &&
    providerSignal.requiredRecipientPosition !== beneficiary.position
  ) {
    return { kind: 'recipient-position', requiredPosition: providerSignal.requiredRecipientPosition };
  }

  if (providerSignal.friendlyScope === 'adjacent' && !areAdjacent(provider.position, beneficiary.position)) {
    return { kind: 'adjacency' };
  }

  return null;
}

function signalCanReachTeammate(signal: SynergySignal): boolean {
  return signal.friendlyScope !== 'self';
}

function signalTags(signal: SynergySignal): SynergyTag[] {
  return signal.tags ?? [signal.tag];
}

function matchingTag(provider: SynergySignal, beneficiary: SynergySignal): SynergyTag | null {
  for (const providerTag of signalTags(provider)) {
    for (const beneficiaryTag of signalTags(beneficiary)) {
      if (tagsAreCompatible(providerTag, beneficiaryTag)) {
        return beneficiaryTag === 'status:control' ? 'status:control' : providerTag;
      }
    }
  }

  return null;
}

function tagsAreCompatible(providerTag: SynergyTag, beneficiaryTag: SynergyTag): boolean {
  return (
    providerTag === beneficiaryTag ||
    (beneficiaryTag === 'status:control' && CONTROL_ALIAS_TAGS.includes(providerTag as (typeof CONTROL_ALIAS_TAGS)[number]))
  );
}

function firstLockedSignal(
  input: EvaluateFormationInput,
  provider: DragonSynergyProfile,
  providerSignal: SynergySignal,
  beneficiary: DragonSynergyProfile,
  beneficiarySignal: SynergySignal,
):
  | {
      profile: DragonSynergyProfile;
      signal: SynergySignal;
      requirement: ProgressionRequirement;
    }
  | null {
  const providerRequirement = unmetRequirement(providerSignal, input.progression[provider.dragonId]);
  if (providerRequirement) {
    return { profile: provider, signal: providerSignal, requirement: providerRequirement };
  }

  const beneficiaryRequirement = unmetRequirement(beneficiarySignal, input.progression[beneficiary.dragonId]);
  if (beneficiaryRequirement) {
    return { profile: beneficiary, signal: beneficiarySignal, requirement: beneficiaryRequirement };
  }

  return null;
}

function isUnlocked(signal: SynergySignal | PositionClaim, progression: DragonProgression | undefined): boolean {
  return unmetRequirement(signal, progression) === null;
}

function unmetRequirement(
  signal: SynergySignal | PositionClaim,
  progression: DragonProgression | undefined,
): ProgressionRequirement | null {
  const requirement = signal.unlock;
  if (!requirement) {
    return null;
  }

  if (
    requirement.minimumStarRank !== undefined &&
    (progression?.starRank ?? 0) < requirement.minimumStarRank
  ) {
    return { minimumStarRank: requirement.minimumStarRank };
  }

  if (
    requirement.minimumDragonLevel !== undefined &&
    (progression?.dragonLevel ?? 0) < requirement.minimumDragonLevel
  ) {
    return { minimumDragonLevel: requirement.minimumDragonLevel };
  }

  return null;
}

function addResult(results: Map<string, SimpleSynergyResult>, result: SimpleSynergyResult): void {
  if (!results.has(result.id)) {
    results.set(result.id, result);
  }
}

function compareResults(left: SimpleSynergyResult, right: SimpleSynergyResult): number {
  return resultKindOrder[left.kind] - resultKindOrder[right.kind] || left.id.localeCompare(right.id);
}
