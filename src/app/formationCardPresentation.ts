import type { FormationPosition } from '../models/dragon';
import { positionLabels, type Formation } from '../services/teamShare';
import { areAdjacent } from '../synergy/positionRules';
import { CONTROL_ALIAS_TAGS, displayTagsFrom, tagSatisfies, type SynergyTag } from '../synergy/tags';
import type {
  DragonProgression,
  DragonSynergyProfile,
  ProgressionRequirement,
  SynergySignal,
} from '../synergy/types';
import {
  BENEFIT_SIGNAL_LABELS,
  labelPriority,
  labelForSignalTag,
  OUTPUT_SIGNAL_LABELS,
  SUPPORT_SIGNAL_LABELS,
} from './dragonDetailPresentation';

export type FormationSignalState = 'supported' | 'used' | 'satisfied' | 'available' | 'missing' | 'inactive';

export interface FormationSignalChip {
  label: string;
  state: FormationSignalState;
  reason: string;
}

interface SelectedProfile {
  profile: DragonSynergyProfile;
  position: FormationPosition;
}

interface ProvideSource {
  profile: DragonSynergyProfile;
  position: FormationPosition;
  signal: SynergySignal;
  tags: SynergyTag[];
}

interface SignalUse {
  used: boolean;
  reason: string;
}

export function buildFormationSignalChips({
  profile,
  position,
  formation,
  profiles,
  progression,
}: {
  profile: DragonSynergyProfile | undefined;
  position: FormationPosition;
  formation: Formation;
  profiles: DragonSynergyProfile[];
  progression: Record<string, DragonProgression | undefined>;
}): { damageProfile: FormationSignalChip[]; provides: FormationSignalChip[]; benefitsFrom: FormationSignalChip[] } {
  if (!profile) {
    return { damageProfile: [], provides: [], benefitsFrom: [] };
  }

  const selected = selectedProfiles(formation, profiles);
  const selectedProfile = selected.find((entry) => entry.profile.dragonId === profile.dragonId) ?? { profile, position };
  const activeProvideSources = selected.flatMap((entry) => activeProvideSourcesFor(entry, progression));

  return {
    damageProfile: buildDamageProfileChips(selectedProfile, selected, progression),
    provides: buildProvidesChips(selectedProfile, selected, progression),
    benefitsFrom: buildBenefitsChips(selectedProfile, activeProvideSources, progression[profile.dragonId]),
  };
}

export function buildFormationFilterOptions(
  profiles: DragonSynergyProfile[],
): { damageProfile: string[]; provides: string[]; benefitsFrom: string[] } {
  return {
    damageProfile: uniqueSortedLabels(
      profiles.flatMap((profile) => labelsForSignals(damageOutputs(profile), OUTPUT_SIGNAL_LABELS)),
    ),
    provides: uniqueSortedLabels(
      profiles.flatMap((profile) => [
        ...labelsForSignals(nonDamageOutputs(profile), OUTPUT_SIGNAL_LABELS),
        ...labelsForSignals(profile.supports, SUPPORT_SIGNAL_LABELS),
      ]),
    ),
    benefitsFrom: uniqueSortedLabels(
      profiles.flatMap((profile) => labelsForSignals(profile.benefitsFrom, BENEFIT_SIGNAL_LABELS)),
    ),
  };
}

export function profileDamageProfileLabel(profile: DragonSynergyProfile | undefined, label: string): boolean {
  if (!profile) {
    return false;
  }
  return labelsForSignals(damageOutputs(profile), OUTPUT_SIGNAL_LABELS).includes(label);
}

export function profileProvidesLabel(profile: DragonSynergyProfile | undefined, label: string): boolean {
  if (!profile) {
    return false;
  }
  return [
    ...labelsForSignals(nonDamageOutputs(profile), OUTPUT_SIGNAL_LABELS),
    ...labelsForSignals(profile.supports, SUPPORT_SIGNAL_LABELS),
  ].includes(label);
}

export function profileBenefitsFromLabel(profile: DragonSynergyProfile | undefined, label: string): boolean {
  if (!profile) {
    return false;
  }
  return labelsForSignals(profile.benefitsFrom, BENEFIT_SIGNAL_LABELS).includes(label);
}

function buildDamageProfileChips(
  dragon: SelectedProfile,
  selected: SelectedProfile[],
  progression: Record<string, DragonProgression | undefined>,
): FormationSignalChip[] {
  const chips = new Map<string, FormationSignalChip>();

  for (const output of damageOutputs(dragon.profile)) {
    const active = isSignalActive(output, dragon.position, progression[dragon.profile.dragonId]);
    const support = active ? matchingActiveSupportForOutput(dragon, output, selected, progression) : null;
    const state: FormationSignalState = active ? (support ? 'supported' : 'available') : 'inactive';
    const reason = active
      ? support
        ? `Supported by ${support.profile.dragonName}.`
        : 'Available damage output; no selected ally currently boosts it.'
      : signalStateReason(output, dragon.position, progression[dragon.profile.dragonId], 'Damage output');

    for (const label of labelsForSignal(output, OUTPUT_SIGNAL_LABELS)) {
      mergeChip(chips, { label, state, reason });
    }
  }

  return [...chips.values()].sort((left, right) => labelPriority(left.label, right.label));
}

function buildProvidesChips(
  provider: SelectedProfile,
  selected: SelectedProfile[],
  progression: Record<string, DragonProgression | undefined>,
): FormationSignalChip[] {
  const chips = new Map<string, FormationSignalChip>();

  for (const source of [
    ...nonDamageOutputs(provider.profile).map((signal) => ({ signal, labels: OUTPUT_SIGNAL_LABELS })),
    ...provider.profile.supports.map((signal) => ({ signal, labels: SUPPORT_SIGNAL_LABELS })),
  ]) {
    const active = isSignalActive(source.signal, provider.position, progression[provider.profile.dragonId]);
    const inactiveReason = signalStateReason(source.signal, provider.position, progression[provider.profile.dragonId], 'Provides');

    for (const { label, tag } of labelledDisplayTagsForSignal(source.signal, source.labels)) {
      const use = active ? selectedUseForProviderSignal(provider, source.signal, tag, selected, progression) : null;
      const state: FormationSignalState = active ? (use?.used ? 'used' : 'available') : 'inactive';
      const reason = active ? (use?.reason ?? 'Available but not used by this formation.') : inactiveReason;
      mergeChip(chips, { label, state, reason });
    }
  }

  return [...chips.values()].sort((left, right) => labelPriority(left.label, right.label));
}

function buildBenefitsChips(
  beneficiary: SelectedProfile,
  activeProvideSources: ProvideSource[],
  progression: DragonProgression | undefined,
): FormationSignalChip[] {
  const chips = new Map<string, FormationSignalChip>();

  for (const benefit of beneficiary.profile.benefitsFrom) {
    if (!isSignalActive(benefit, beneficiary.position, progression)) {
      for (const label of labelsForSignal(benefit, BENEFIT_SIGNAL_LABELS)) {
        mergeChip(chips, {
          label,
          state: 'inactive',
          reason: signalStateReason(benefit, beneficiary.position, progression, 'Synergy needs'),
        });
      }
      continue;
    }

    const benefitTags = providedTags(benefit);
    const matchingProvider = activeProvideSources.find(
      (source) =>
        source.profile.dragonId !== beneficiary.profile.dragonId &&
        source.tags.some((providerTag) => benefitTags.some((benefitTag) => tagSatisfies(providerTag, benefitTag))),
    );
    const state: FormationSignalState = matchingProvider ? 'satisfied' : 'missing';
    const reason = matchingProvider
      ? `Satisfied by ${matchingProvider.profile.dragonName}.`
      : 'No selected dragon actively provides this signal.';

    for (const label of labelsForSignal(benefit, BENEFIT_SIGNAL_LABELS)) {
      mergeChip(chips, { label, state, reason });
    }
  }

  return [...chips.values()].sort((left, right) => labelPriority(left.label, right.label));
}

function activeProvideSourcesFor(
  entry: SelectedProfile,
  progression: Record<string, DragonProgression | undefined>,
): ProvideSource[] {
  return provideSourcesFor(entry).filter(
    (source) =>
      signalCanReachTeammate(source.signal) &&
      isSignalActive(source.signal, source.position, progression[source.profile.dragonId]),
  );
}

function selectedProfiles(formation: Formation, profiles: DragonSynergyProfile[]): SelectedProfile[] {
  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  return Object.entries(formation).flatMap(([position, dragonId]) => {
    const profile = dragonId ? profilesById.get(dragonId) : undefined;
    return profile ? [{ profile, position: position as FormationPosition }] : [];
  });
}

function provideSourcesFor(entry: SelectedProfile): ProvideSource[] {
  return [...entry.profile.outputs, ...entry.profile.supports].map((signal) => ({
    profile: entry.profile,
    position: entry.position,
    signal,
    tags: providedTags(signal),
  }));
}

function selectedUseForProviderSignal(
  provider: SelectedProfile,
  signal: SynergySignal,
  displayedTag: SynergyTag,
  selected: SelectedProfile[],
  progression: Record<string, DragonProgression | undefined>,
): SignalUse {
  if (!signalCanReachTeammate(signal)) {
    return { used: false, reason: 'Available but not used by this formation.' };
  }

  const recipients = selected.filter((candidate) => candidate.profile.dragonId !== provider.profile.dragonId);
  for (const recipient of recipients) {
    if (isSupportSignal(provider.profile, signal)) {
      const matchingOutput = recipient.profile.outputs.find(
        (output) =>
          matchingSupportTagForDisplayedTag(signal, displayedTag, output) &&
          relationshipIsCurrentlyActive(provider, signal, recipient, output, progression),
      );
      if (matchingOutput) {
        return { used: true, reason: `Used by ${recipient.profile.dragonName}.` };
      }

      const matchingBenefit = recipient.profile.benefitsFrom.find(
        (benefit) =>
          benefit.tag.startsWith('stat:') &&
          matchingSupportTagForDisplayedTag(signal, displayedTag, benefit) &&
          relationshipIsCurrentlyActive(provider, signal, recipient, benefit, progression),
      );
      if (matchingBenefit) {
        return { used: true, reason: `Used by ${recipient.profile.dragonName}.` };
      }
      continue;
    }

    const matchingBenefit = recipient.profile.benefitsFrom.find(
      (benefit) =>
        matchingSetupTagForDisplayedTag(displayedTag, benefit) &&
        relationshipIsCurrentlyActive(provider, signal, recipient, benefit, progression),
    );
    if (matchingBenefit) {
      return { used: true, reason: `Used by ${recipient.profile.dragonName}.` };
    }
  }

  return { used: false, reason: 'Available but not used by this formation.' };
}

function matchingActiveSupportForOutput(
  producer: SelectedProfile,
  output: SynergySignal,
  selected: SelectedProfile[],
  progression: Record<string, DragonProgression | undefined>,
): SelectedProfile | null {
  for (const supporter of selected) {
    if (supporter.profile.dragonId === producer.profile.dragonId) {
      continue;
    }
    if (
      supporter.profile.supports.some(
        (support) =>
          matchingSupportTag(support, output) &&
          relationshipIsCurrentlyActive(supporter, support, producer, output, progression),
      )
    ) {
      return supporter;
    }
  }

  return null;
}

function relationshipIsCurrentlyActive(
  provider: SelectedProfile,
  providerSignal: SynergySignal,
  beneficiary: SelectedProfile,
  beneficiarySignal: SynergySignal,
  progression: Record<string, DragonProgression | undefined>,
): boolean {
  return (
    provider.profile.dragonId !== beneficiary.profile.dragonId &&
    signalCanReachTeammate(providerSignal) &&
    isSignalActive(providerSignal, provider.position, progression[provider.profile.dragonId]) &&
    isSignalActive(beneficiarySignal, beneficiary.position, progression[beneficiary.profile.dragonId]) &&
    (providerSignal.requiredRecipientPosition === undefined || providerSignal.requiredRecipientPosition === beneficiary.position) &&
    (providerSignal.friendlyScope !== 'adjacent' || areAdjacent(provider.position, beneficiary.position))
  );
}

function isSignalActive(
  signal: SynergySignal,
  position: FormationPosition,
  progression: DragonProgression | undefined,
): boolean {
  return signal.requiredSelfPosition !== position && signal.requiredSelfPosition !== undefined
    ? false
    : unmetRequirement(signal, progression) === null;
}

function signalStateReason(
  signal: SynergySignal,
  position: FormationPosition,
  progression: DragonProgression | undefined,
  prefix: 'Damage output' | 'Provides' | 'Synergy needs',
): string {
  if (signal.requiredSelfPosition !== undefined && signal.requiredSelfPosition !== position) {
    return `${prefix} inactive: requires ${positionLabels[signal.requiredSelfPosition]}.`;
  }

  const locked = unmetRequirement(signal, progression);
  if (locked?.minimumStarRank !== undefined) {
    return `${prefix} inactive: unlocks at Star Rank ${locked.minimumStarRank}.`;
  }
  if (locked?.minimumDragonLevel !== undefined) {
    return `${prefix} inactive: unlocks at Dragon Level ${locked.minimumDragonLevel}.`;
  }

  return `${prefix} active in this placement.`;
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

function damageOutputs(profile: DragonSynergyProfile): SynergySignal[] {
  return profile.outputs.filter((signal) => providedTags(signal).some(isDamageTag));
}

function nonDamageOutputs(profile: DragonSynergyProfile): SynergySignal[] {
  return profile.outputs.filter((signal) => !providedTags(signal).some(isDamageTag));
}

function isDamageTag(tag: SynergyTag): boolean {
  return tag.startsWith('damage:');
}

function isSupportSignal(profile: DragonSynergyProfile, signal: SynergySignal): boolean {
  return profile.supports.some((support) => support.id === signal.id);
}

function signalCanReachTeammate(signal: SynergySignal): boolean {
  return signal.friendlyScope !== 'self';
}

function supportableTags(signal: SynergySignal): SynergyTag[] {
  return [...new Set([...providedTags(signal), ...(signal.scalesWith ?? [])])];
}

function matchingSupportTag(provider: SynergySignal, beneficiary: SynergySignal): boolean {
  if (!damageScopesAreCompatible(provider, beneficiary)) {
    return false;
  }

  return matchingTagFromLists(providedTags(provider), supportableTags(beneficiary));
}

function matchingSetupTagForDisplayedTag(providerTag: SynergyTag, beneficiary: SynergySignal): boolean {
  return matchingTagFromLists(providerTagsForDisplayedTag(providerTag, beneficiary), providedTags(beneficiary));
}

function matchingSupportTagForDisplayedTag(
  provider: SynergySignal,
  providerTag: SynergyTag,
  beneficiary: SynergySignal,
): boolean {
  return (
    damageScopesAreCompatible(provider, beneficiary) &&
    matchingTagFromLists(providerTagsForDisplayedTag(providerTag, beneficiary), supportableTags(beneficiary))
  );
}

function damageScopesAreCompatible(provider: SynergySignal, beneficiary: SynergySignal): boolean {
  return provider.damageScope === undefined || provider.damageScope === beneficiary.damageScope;
}

function matchingTagFromLists(providerTags: SynergyTag[], beneficiaryTags: SynergyTag[]): boolean {
  return providerTags.some((providerTag) =>
    beneficiaryTags.some((beneficiaryTag) => tagSatisfies(providerTag, beneficiaryTag)),
  );
}

function providerTagsForDisplayedTag(displayedTag: SynergyTag, beneficiary: SynergySignal): SynergyTag[] {
  if (
    displayedTag === 'status:control' &&
    providedTags(beneficiary).some((tag) => CONTROL_ALIAS_TAGS.includes(tag as (typeof CONTROL_ALIAS_TAGS)[number]))
  ) {
    return [...CONTROL_ALIAS_TAGS];
  }

  return [displayedTag];
}

function labelsForSignals(
  signals: SynergySignal[],
  labels: Partial<Record<SynergyTag, string>>,
): string[] {
  return signals.flatMap((signal) => labelsForSignal(signal, labels));
}

function labelsForSignal(
  signal: SynergySignal,
  labels: Partial<Record<SynergyTag, string>>,
): string[] {
  return labelledDisplayTagsForSignal(signal, labels).map(({ label }) => label);
}

function labelledDisplayTagsForSignal(
  signal: SynergySignal,
  labels: Partial<Record<SynergyTag, string>>,
): Array<{ label: string; tag: SynergyTag }> {
  return displayTagsFrom(providedTags(signal))
    .map((tag) => {
      const label = labelForSignalTag(signal, tag, labels);
      return label ? { label, tag } : null;
    })
    .filter((entry): entry is { label: string; tag: SynergyTag } => entry !== null);
}

function providedTags(signal: SynergySignal): SynergyTag[] {
  return signal.tags ?? [signal.tag];
}

function mergeChip(chips: Map<string, FormationSignalChip>, next: FormationSignalChip) {
  const current = chips.get(next.label);
  if (!current || statePriority(next.state) > statePriority(current.state)) {
    chips.set(next.label, next);
  }
}

function statePriority(state: FormationSignalState): number {
  switch (state) {
    case 'supported':
    case 'used':
    case 'satisfied':
      return 3;
    case 'available':
    case 'missing':
      return 2;
    case 'inactive':
      return 1;
  }
}

function uniqueSortedLabels(labels: string[]): string[] {
  return [...new Set(labels)].sort(labelPriority);
}
