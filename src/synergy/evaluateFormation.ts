import type { FormationPosition } from '../models/dragon';
import { areAdjacent, SIMPLE_FORMATION_POSITIONS } from './positionRules';
import {
  explainAmplifierOutput,
  explainMissingEnabler,
  explainPositionBlocked,
  explainPositionConflict,
  explainProgressionLocked,
  explainSetupPayoff,
} from './explanations';
import type {
  DragonProgression,
  DragonSynergyProfile,
  EvaluateFormationInput,
  EvaluateFormationResult,
  PositionClaim,
  ProgressionRequirement,
  SimpleFriendlyScope,
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
  const selfProvidesTag = beneficiary.profile.outputs.some((output) => output.tag === benefit.tag);
  const providers = selected.filter(
    (provider) =>
      provider.profile.dragonId !== beneficiary.profile.dragonId &&
      provider.profile.outputs.some((output) => output.tag === benefit.tag),
  );

  if (providers.length === 0 && selfProvidesTag) {
    return;
  }

  if (providers.length === 0 && isUnlocked(benefit, input.progression[beneficiary.profile.dragonId])) {
    addResult(results, {
      id: `missing-enabler:${beneficiary.profile.dragonId}:${benefit.abilityId}:${benefit.tag}`,
      kind: 'missing-enabler',
      tag: benefit.tag,
      dragonIds: [beneficiary.profile.dragonId],
      abilityIds: [benefit.abilityId],
      explanation: explainMissingEnabler(beneficiary.profile, benefit),
    });
    return;
  }

  for (const provider of providers) {
    for (const output of provider.profile.outputs.filter((candidate) => candidate.tag === benefit.tag)) {
      addRelationshipResult(results, input, 'setup-payoff', provider, output, beneficiary, benefit);
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
  for (const producer of selected) {
    if (producer.profile.dragonId === supporter.profile.dragonId) {
      continue;
    }

    for (const output of producer.profile.outputs.filter((candidate) => candidate.tag === support.tag)) {
      addRelationshipResult(results, input, 'amplifier-output', supporter, support, producer, output);
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
): void {
  const locked = firstLockedSignal(input, provider.profile, providerSignal, beneficiary.profile, beneficiarySignal);
  const semanticId = [
    activeKind,
    provider.profile.dragonId,
    providerSignal.abilityId,
    providerSignal.tag,
    beneficiary.profile.dragonId,
    beneficiarySignal.abilityId,
  ].join(':');

  if (locked) {
    addResult(results, {
      id: `progression-locked:${semanticId}`,
      kind: 'progression-locked',
      tag: providerSignal.tag,
      dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
      abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
      explanation: explainProgressionLocked(locked.profile, locked.signal, locked.requirement),
      unlock: locked.requirement,
    });
    return;
  }

  if (!positionsAllowSignal(provider, providerSignal, beneficiary, beneficiarySignal)) {
    addResult(results, {
      id: `position-blocked:${semanticId}`,
      kind: 'position-blocked',
      tag: providerSignal.tag,
      dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
      abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
      explanation: explainPositionBlocked(provider.profile, beneficiary.profile),
    });
    return;
  }

  addResult(results, {
    id: semanticId,
    kind: activeKind,
    tag: providerSignal.tag,
    dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
    abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
    explanation:
      activeKind === 'setup-payoff'
        ? explainSetupPayoff(provider.profile, providerSignal, beneficiary.profile, beneficiarySignal)
        : explainAmplifierOutput(provider.profile, providerSignal, beneficiary.profile, beneficiarySignal),
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

  for (let firstIndex = 0; firstIndex < claims.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < claims.length; secondIndex += 1) {
      const first = claims[firstIndex];
      const second = claims[secondIndex];

      if (!first || !second || first.claim.requiredPosition !== second.claim.requiredPosition) {
        continue;
      }

      addResult(results, {
        id: [
          'position-conflict',
          first.claim.requiredPosition,
          first.profile.dragonId,
          first.claim.abilityId,
          second.profile.dragonId,
          second.claim.abilityId,
        ].join(':'),
        kind: 'position-conflict',
        dragonIds: [first.profile.dragonId, second.profile.dragonId],
        abilityIds: [first.claim.abilityId, second.claim.abilityId],
        explanation: explainPositionConflict(first.profile, first.claim, second.profile, second.claim),
      });
    }
  }
}

function positionsAllowSignal(
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
): boolean {
  return (
    selfPositionAllows(providerSignal, provider.position) &&
    selfPositionAllows(beneficiarySignal, beneficiary.position) &&
    friendlyScopeAllows(providerSignal.friendlyScope, provider.position, beneficiary.position)
  );
}

function selfPositionAllows(signal: SynergySignal, position: FormationPosition): boolean {
  return signal.requiredSelfPosition === undefined || signal.requiredSelfPosition === position;
}

function friendlyScopeAllows(
  scope: SimpleFriendlyScope | undefined,
  providerPosition: FormationPosition,
  beneficiaryPosition: FormationPosition,
): boolean {
  if (scope !== 'adjacent') {
    return true;
  }

  return areAdjacent(providerPosition, beneficiaryPosition);
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

  if (
    requirement.minimumHabitLevel !== undefined &&
    (progression?.habitLevel ?? 0) < requirement.minimumHabitLevel
  ) {
    return { minimumHabitLevel: requirement.minimumHabitLevel };
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
