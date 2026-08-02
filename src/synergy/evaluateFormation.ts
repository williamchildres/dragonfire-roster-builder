import type { FormationPosition } from '../models/dragon';
import { areAdjacent, SIMPLE_FORMATION_POSITIONS } from './positionRules';
import {
  resolveCapabilityPriorityRecipientGroups,
  signalTargetsRecipient,
  type RecipientCandidate,
} from './recipientSelectors';
import { tagSatisfies, type SynergyTag } from './tags';
import {
  explainAmplifierOutput,
  explainMissingEnabler,
  explainPositionBlocked,
  explainProgressionLocked,
  explainSetupPayoff,
  type PositionBlockReason,
} from './explanations';
import type {
  DragonProgression,
  DragonSynergyProfile,
  EnrichedRelationshipCandidate,
  EvaluateFormationInput,
  EvaluateFormationCandidatesResult,
  EvaluateFormationResult,
  ProgressionRequirement,
  SimpleSynergyResult,
  SimpleSynergyResultKind,
  SynergySignal,
  TargetingResolution,
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

interface RelationshipEligibility {
  positionBlockReason: PositionBlockReason | null;
  locked:
    | {
        profile: DragonSynergyProfile;
        signal: SynergySignal;
        requirement: ProgressionRequirement;
      }
    | null;
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
  return evaluateFormationInternal(input, false).legacy;
}

export function evaluateFormationCandidates(
  input: EvaluateFormationInput,
): EvaluateFormationCandidatesResult {
  const evaluated = evaluateFormationInternal(input, true);
  return {
    candidates: evaluated.candidates.sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    targetingResolutions: evaluated.targetingResolutions,
  };
}

function evaluateFormationInternal(input: EvaluateFormationInput, collectEnriched: boolean): {
  legacy: EvaluateFormationResult;
  candidates: EnrichedRelationshipCandidate[];
  targetingResolutions: TargetingResolution[];
} {
  const selected = selectedProfiles(input);
  const recipients = formationRecipients(input);
  const targetingResolutions = resolveCapabilityPriorityRecipientGroups({
    signals: selected.flatMap((entry) =>
      [...entry.profile.outputs, ...entry.profile.supports].flatMap((signal) =>
        signal.recipientSelector?.kind === 'capability-priority-one'
          ? [{
              provider: { dragonId: entry.profile.dragonId, position: entry.position },
              signal: signal as SynergySignal & {
                recipientSelector: Extract<NonNullable<SynergySignal['recipientSelector']>, { kind: 'capability-priority-one' }>;
              },
            }]
          : [],
      ),
    ),
    selected: recipients,
    profiles: input.profiles,
    progression: input.progression,
  });
  const results = new Map<string, SimpleSynergyResult>();
  const relationshipCandidates = new Map<string, RelationshipCandidate>();
  const enrichedCandidates: EnrichedRelationshipCandidate[] | undefined =
    collectEnriched ? [] : undefined;

  for (const beneficiary of selected) {
    for (const benefit of beneficiary.profile.benefitsFrom) {
      addSetupPayoffResults(
        results,
        relationshipCandidates,
        enrichedCandidates,
        input,
        selected,
        targetingResolutions,
        beneficiary,
        benefit,
      );
    }
  }

  for (const supporter of selected) {
    for (const support of supporter.profile.supports) {
      addAmplifierOutputResults(
        relationshipCandidates,
        enrichedCandidates,
        input,
        selected,
        targetingResolutions,
        supporter,
        support,
      );
    }
  }

  for (const candidate of relationshipCandidates.values()) {
    addResult(results, candidate.result);
  }

  return {
    legacy: {
      results: [...results.values()].sort(compareResults),
      targetingResolutions,
    },
    candidates: enrichedCandidates ?? [],
    targetingResolutions,
  };
}

function formationRecipients(input: EvaluateFormationInput): RecipientCandidate[] {
  return SIMPLE_FORMATION_POSITIONS.flatMap((position) => {
    const dragonId = input.formation[position];
    return dragonId ? [{ dragonId, position }] : [];
  });
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
  enrichedCandidates: EnrichedRelationshipCandidate[] | undefined,
  input: EvaluateFormationInput,
  selected: SelectedProfile[],
  targetingResolutions: TargetingResolution[],
  beneficiary: SelectedProfile,
  benefit: SynergySignal,
): void {
  if (benefit.supportOnly) {
    return;
  }

  const benefitTags = providedTags(benefit);
  const selfOutputsTag = beneficiary.profile.outputs.some((output) =>
    providedTags(output).some((outputTag) => benefitTags.some((benefitTag) => tagsAreCompatible(outputTag, benefitTag))),
  );
  const providers = selected.filter(
    (provider) =>
      provider.profile.dragonId !== beneficiary.profile.dragonId &&
      provider.profile.outputs.some((output) => matchingSetupTag(output, benefit) !== null && signalCanReachTeammate(output)),
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
    for (const output of provider.profile.outputs.filter(
      (candidate) =>
        matchingSetupTag(candidate, benefit) !== null &&
        signalCanReachTeammate(candidate) &&
        targetsBeneficiary(input, selected, targetingResolutions, provider, candidate, beneficiary),
    )) {
      const tagMatch = matchingSetupTag(output, benefit);
      if (tagMatch) {
        addRelationshipCandidate(
          relationshipCandidates,
          enrichedCandidates,
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
  enrichedCandidates: EnrichedRelationshipCandidate[] | undefined,
  input: EvaluateFormationInput,
  selected: SelectedProfile[],
  targetingResolutions: TargetingResolution[],
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

    for (const output of producer.profile.outputs.filter((candidate) => matchingSupportTag(support, candidate) !== null)) {
      const tagMatch = matchingSupportTag(support, output);
      if (tagMatch && targetsBeneficiary(input, selected, targetingResolutions, supporter, support, producer)) {
        addRelationshipCandidate(
          relationshipCandidates,
          enrichedCandidates,
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

    for (const benefit of producer.profile.benefitsFrom.filter((candidate) => candidate.tag.startsWith('stat:') && matchingSupportTag(support, candidate) !== null)) {
      const tagMatch = matchingSupportTag(support, benefit);
      if (tagMatch && targetsBeneficiary(input, selected, targetingResolutions, supporter, support, producer)) {
        addRelationshipCandidate(
          relationshipCandidates,
          enrichedCandidates,
          input,
          'amplifier-output',
          supporter,
          support,
          producer,
          benefit,
          tagMatch,
        );
      }
    }
  }
}

function targetsBeneficiary(
  input: EvaluateFormationInput,
  selected: SelectedProfile[],
  targetingResolutions: TargetingResolution[],
  provider: SelectedProfile,
  signal: SynergySignal,
  beneficiary: SelectedProfile,
): boolean {
  return signalTargetsRecipient({
    provider: { dragonId: provider.profile.dragonId, position: provider.position },
    signal,
    recipient: { dragonId: beneficiary.profile.dragonId, position: beneficiary.position },
    selected: selected.map((entry) => ({ dragonId: entry.profile.dragonId, position: entry.position })),
    progression: input.progression,
    profiles: input.profiles,
    targetingResolutions,
  });
}

function addRelationshipCandidate(
  relationshipCandidates: Map<string, RelationshipCandidate>,
  enrichedCandidates: EnrichedRelationshipCandidate[] | undefined,
  input: EvaluateFormationInput,
  activeKind: 'setup-payoff' | 'amplifier-output',
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
  tagMatch: SynergyTagMatch,
): void {
  if (provider.profile.dragonId === beneficiary.profile.dragonId) {
    return;
  }

  const tag = tagMatch.semanticTag;
  const semanticId =
    activeKind === 'setup-payoff'
      ? [activeKind, provider.profile.dragonId, tag, beneficiary.profile.dragonId].join(':')
      : [activeKind, provider.profile.dragonId, tag, beneficiary.profile.dragonId].join(':');
  const eligibility = getRelationshipEligibility(input, provider, providerSignal, beneficiary, beneficiarySignal);

  if (eligibility.positionBlockReason) {
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
          eligibility.positionBlockReason,
        ),
      },
    });
    return;
  }

  if (eligibility.locked) {
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
          eligibility.locked.profile,
          eligibility.locked.requirement,
        ),
        unlock: eligibility.locked.requirement,
      },
    });
    return;
  }

  const explanation =
    activeKind === 'setup-payoff'
      ? explainSetupPayoff(
          provider.profile,
          providerSignal,
          beneficiary.profile,
          beneficiarySignal,
          tagMatch,
        )
      : explainAmplifierOutput(
          provider.profile,
          providerSignal,
          beneficiary.profile,
          beneficiarySignal,
          tag,
        );
  addCandidate(relationshipCandidates, semanticId, {
    rank: 3,
    result: {
      id: semanticId,
      kind: activeKind,
      tag,
      dragonIds: [provider.profile.dragonId, beneficiary.profile.dragonId],
      abilityIds: [providerSignal.abilityId, beneficiarySignal.abilityId],
      explanation,
    },
  });
  enrichedCandidates?.push({
    id: [
      semanticId,
      providerSignal.id,
      beneficiarySignal.id,
    ].join(':'),
    resultKind: activeKind,
    providerDragonId: provider.profile.dragonId,
    providerSignalId: providerSignal.id,
    providerSignalCategory: activeKind === 'setup-payoff' ? 'output' : 'support',
    providerAbilityId: providerSignal.abilityId,
    beneficiaryDragonId: beneficiary.profile.dragonId,
    beneficiarySignalId: beneficiarySignal.id,
    beneficiarySignalCategory:
      activeKind === 'setup-payoff' || beneficiary.profile.benefitsFrom.includes(beneficiarySignal)
        ? 'benefits-from'
        : 'output',
    beneficiaryAbilityId: beneficiarySignal.abilityId,
    semanticTag: tag,
    abilityIds: uniqueSorted([providerSignal.abilityId, beneficiarySignal.abilityId]),
    explanation,
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

  if (candidate.rank > current.rank) {
    candidates.set(relationshipKey, normalizeCandidate(candidate));
    return;
  }

  if (compareCandidate(candidate, current) < 0) {
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

function getRelationshipEligibility(
  input: EvaluateFormationInput,
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
): RelationshipEligibility {
  return {
    positionBlockReason: getPositionBlockReason(provider, providerSignal, beneficiary, beneficiarySignal),
    locked: firstLockedSignal(input, provider.profile, providerSignal, beneficiary.profile, beneficiarySignal),
  };
}

function getPositionBlockReason(
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
): PositionBlockReason | null {
  const hardRequirements: Exclude<PositionBlockReason, { kind: 'adjacency' }>['requirements'] = [];
  const seenHardRequirements = new Set<string>();

  const addHardRequirement = (
    kind: (typeof hardRequirements)[number]['kind'],
    dragonId: string,
    requiredPosition: FormationPosition,
  ) => {
    const key = `${dragonId}:${requiredPosition}`;
    if (seenHardRequirements.has(key)) {
      return;
    }

    seenHardRequirements.add(key);
    hardRequirements.push({ kind, requiredPosition });
  };

  if (
    providerSignal.requiredSelfPosition !== undefined &&
    providerSignal.requiredSelfPosition !== provider.position
  ) {
    addHardRequirement('provider-position', provider.profile.dragonId, providerSignal.requiredSelfPosition);
  }

  if (
    beneficiarySignal.requiredSelfPosition !== undefined &&
    beneficiarySignal.requiredSelfPosition !== beneficiary.position
  ) {
    addHardRequirement('beneficiary-position', beneficiary.profile.dragonId, beneficiarySignal.requiredSelfPosition);
  }

  if (
    providerSignal.requiredRecipientPosition !== undefined &&
    providerSignal.requiredRecipientPosition !== beneficiary.position
  ) {
    addHardRequirement('recipient-position', beneficiary.profile.dragonId, providerSignal.requiredRecipientPosition);
  }

  if (hardRequirements.length > 0) {
    return { kind: 'hard-position', requirements: hardRequirements };
  }

  if (providerSignal.friendlyScope === 'adjacent' && !areAdjacent(provider.position, beneficiary.position)) {
    return { kind: 'adjacency' };
  }

  return null;
}

function signalCanReachTeammate(signal: SynergySignal): boolean {
  return signal.friendlyScope !== 'self';
}

function providedTags(signal: SynergySignal): SynergyTag[] {
  return signal.tags ?? [signal.tag];
}

function supportableTags(signal: SynergySignal): SynergyTag[] {
  return uniqueTags([...providedTags(signal), ...(signal.scalesWith ?? [])]);
}

function uniqueTags(tags: SynergyTag[]): SynergyTag[] {
  return [...new Set(tags)];
}

function matchingSetupTag(provider: SynergySignal, beneficiary: SynergySignal): SynergyTagMatch | null {
  return matchingTagFromLists(providedTags(provider), providedTags(beneficiary));
}

function matchingSupportTag(provider: SynergySignal, beneficiary: SynergySignal): SynergyTagMatch | null {
  if (!damageScopesAreCompatible(provider, beneficiary)) {
    return null;
  }

  if (providedTags(provider).includes('damage:any')) {
    const damagingOutput = providedTags(beneficiary).find((tag) =>
      ['damage:physical', 'damage:tactical', 'damage:fire'].includes(tag),
    );
    if (damagingOutput) {
      return {
        semanticTag: 'damage:any',
        providerTag: 'damage:any',
        beneficiaryTag: damagingOutput,
      };
    }
  }

  return matchingTagFromLists(providedTags(provider), supportableTags(beneficiary));
}

function damageScopesAreCompatible(provider: SynergySignal, beneficiary: SynergySignal): boolean {
  return provider.damageScope === undefined || provider.damageScope === beneficiary.damageScope;
}

function matchingTagFromLists(providerTags: SynergyTag[], beneficiaryTags: SynergyTag[]): SynergyTagMatch | null {
  for (const providerTag of providerTags) {
    for (const beneficiaryTag of beneficiaryTags) {
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
  return tagSatisfies(providerTag, beneficiaryTag);
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

function isUnlocked(signal: SynergySignal, progression: DragonProgression | undefined): boolean {
  return unmetRequirement(signal, progression) === null;
}

function unmetRequirement(
  signal: SynergySignal,
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
