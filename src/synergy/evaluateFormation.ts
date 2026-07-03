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

interface RelationshipCandidate {
  rank: number;
  result: SimpleSynergyResult;
}

interface SynergyTagMatch {
  semanticTag: SynergyTag;
  providerTag: SynergyTag;
  beneficiaryTag: SynergyTag;
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
  const relationshipCandidates = new Map<string, RelationshipCandidate>();

  for (const beneficiary of selected) {
    for (const benefit of beneficiary.profile.benefitsFrom) {
      addSetupPayoffResults(results, relationshipCandidates, input, selected, beneficiary, benefit);
    }
  }

  for (const supporter of selected) {
    for (const support of supporter.profile.supports) {
      addAmplifierOutputResults(relationshipCandidates, input, selected, supporter, support);
    }
  }

  for (const candidate of relationshipCandidates.values()) {
    addResult(results, candidate.result);
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
  relationshipCandidates: Map<string, RelationshipCandidate>,
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
      provider.profile.outputs.some((output) => matchingTag(output, benefit) !== null && signalCanReachTeammate(output)),
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
    for (const output of provider.profile.outputs.filter((candidate) => matchingTag(candidate, benefit) !== null && signalCanReachTeammate(candidate))) {
      const tagMatch = matchingTag(output, benefit);
      if (tagMatch) {
        addRelationshipCandidate(
          relationshipCandidates,
          input,
          'setup-payoff',
          provider,
          output,
          beneficiary,
          benefit,
          tagMatch,
        );
      }
    }
  }
}

function addAmplifierOutputResults(
  relationshipCandidates: Map<string, RelationshipCandidate>,
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

    for (const output of producer.profile.outputs.filter((candidate) => matchingTag(support, candidate) !== null)) {
      const tagMatch = matchingTag(support, output);
      if (tagMatch) {
        addRelationshipCandidate(
          relationshipCandidates,
          input,
          'amplifier-output',
          supporter,
          support,
          producer,
          output,
          tagMatch,
        );
      }
    }
  }
}

function addRelationshipCandidate(
  relationshipCandidates: Map<string, RelationshipCandidate>,
  input: EvaluateFormationInput,
  activeKind: 'setup-payoff' | 'amplifier-output',
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
  tagMatch: SynergyTagMatch,
): void {
  const locked = firstLockedSignal(input, provider.profile, providerSignal, beneficiary.profile, beneficiarySignal);
  const tag = tagMatch.semanticTag;
  const semanticId =
    activeKind === 'setup-payoff'
      ? [activeKind, provider.profile.dragonId, tag, beneficiary.profile.dragonId].join(':')
      : [activeKind, provider.profile.dragonId, tag, beneficiary.profile.dragonId].join(':');

  if (locked) {
    addCandidate(relationshipCandidates, semanticId, {
      rank: 1,
      result: {
        id: `progression-locked:${semanticId}`,
        kind: 'progression-locked',
        tag,
        dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
        abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
        explanation: explainProgressionLocked(
          activeKind,
          provider.profile,
          providerSignal,
          beneficiary.profile,
          beneficiarySignal,
          tagMatch,
          locked.profile,
          locked.requirement,
        ),
        unlock: locked.requirement,
      },
    });
    return;
  }

  const positionBlockReason = getPositionBlockReason(provider, providerSignal, beneficiary, beneficiarySignal);
  if (positionBlockReason) {
    addCandidate(relationshipCandidates, semanticId, {
      rank: 2,
      result: {
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
      },
    });
    return;
  }

  addCandidate(relationshipCandidates, semanticId, {
    rank: 3,
    result: {
      id: semanticId,
      kind: activeKind,
      tag,
      dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
      abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
      explanation:
        activeKind === 'setup-payoff'
          ? explainSetupPayoff(provider.profile, providerSignal, beneficiary.profile, beneficiarySignal, tagMatch)
          : explainAmplifierOutput(provider.profile, providerSignal, beneficiary.profile, beneficiarySignal, tag),
    },
  });
}

function addCandidate(
  candidates: Map<string, RelationshipCandidate>,
  relationshipKey: string,
  candidate: RelationshipCandidate,
): void {
  const current = candidates.get(relationshipKey);
  if (!current) {
    candidates.set(relationshipKey, normalizeCandidate(candidate));
    return;
  }

  if (candidate.rank < current.rank) {
    return;
  }

  if (candidate.rank > current.rank || compareCandidate(candidate, current) < 0) {
    candidates.set(relationshipKey, mergeCandidateAbilityIds(candidate, current));
    return;
  }

  current.result.abilityIds = uniqueSorted([...current.result.abilityIds, ...candidate.result.abilityIds]);
}

function normalizeCandidate(candidate: RelationshipCandidate): RelationshipCandidate {
  return {
    ...candidate,
    result: {
      ...candidate.result,
      abilityIds: uniqueSorted(candidate.result.abilityIds),
    },
  };
}

function mergeCandidateAbilityIds(
  preferred: RelationshipCandidate,
  other: RelationshipCandidate,
): RelationshipCandidate {
  return {
    ...preferred,
    result: {
      ...preferred.result,
      abilityIds: uniqueSorted([...preferred.result.abilityIds, ...other.result.abilityIds]),
    },
  };
}

function compareCandidate(left: RelationshipCandidate, right: RelationshipCandidate): number {
  return (
    compareUnlocks(left.result.unlock, right.result.unlock) ||
    left.result.abilityIds.join(':').localeCompare(right.result.abilityIds.join(':')) ||
    left.result.explanation.localeCompare(right.result.explanation)
  );
}

function compareUnlocks(
  left: ProgressionRequirement | undefined,
  right: ProgressionRequirement | undefined,
): number {
  return requirementSortValue(left) - requirementSortValue(right);
}

function requirementSortValue(requirement: ProgressionRequirement | undefined): number {
  if (!requirement) {
    return 0;
  }

  if (requirement.minimumStarRank !== undefined) {
    return requirement.minimumStarRank;
  }

  if (requirement.minimumDragonLevel !== undefined) {
    return 100 + requirement.minimumDragonLevel;
  }

  return 0;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
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

function matchingTag(provider: SynergySignal, beneficiary: SynergySignal): SynergyTagMatch | null {
  for (const providerTag of signalTags(provider)) {
    for (const beneficiaryTag of signalTags(beneficiary)) {
      if (tagsAreCompatible(providerTag, beneficiaryTag)) {
        return {
          semanticTag: beneficiaryTag === 'status:control' ? 'status:control' : providerTag,
          providerTag,
          beneficiaryTag,
        };
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
