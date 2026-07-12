import type { FormationPosition } from '../models/dragon';
import { positionLabels, type Formation } from '../services/teamShare';
import { displayTagsFrom, tagSatisfies, type SynergyTag } from '../synergy/tags';
import type {
  DragonProgression,
  DragonSynergyProfile,
  ProgressionRequirement,
  SynergySignal,
} from '../synergy/types';
import {
  BENEFIT_SIGNAL_LABELS,
  labelPriority,
  OUTPUT_SIGNAL_LABELS,
  SUPPORT_SIGNAL_LABELS,
} from './dragonDetailPresentation';

export type FormationSignalState = 'active' | 'inactive';

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
}): { provides: FormationSignalChip[]; benefitsFrom: FormationSignalChip[] } {
  if (!profile) {
    return { provides: [], benefitsFrom: [] };
  }

  const selected = selectedProfiles(formation, profiles);
  const activeProvideSources = selected.flatMap((entry) =>
    provideSourcesFor(entry).filter((source) =>
      isSignalActive(source.signal, source.position, progression[source.profile.dragonId]),
    ),
  );

  return {
    provides: buildProvidesChips(profile, position, progression[profile.dragonId]),
    benefitsFrom: buildBenefitsChips(profile, activeProvideSources),
  };
}

export function buildFormationFilterOptions(
  profiles: DragonSynergyProfile[],
): { provides: string[]; benefitsFrom: string[] } {
  return {
    provides: uniqueSortedLabels(
      profiles.flatMap((profile) => [
        ...labelsForSignals(profile.outputs, OUTPUT_SIGNAL_LABELS),
        ...labelsForSignals(profile.supports, SUPPORT_SIGNAL_LABELS),
      ]),
    ),
    benefitsFrom: uniqueSortedLabels(
      profiles.flatMap((profile) => labelsForSignals(profile.benefitsFrom, BENEFIT_SIGNAL_LABELS)),
    ),
  };
}

export function profileProvidesLabel(profile: DragonSynergyProfile | undefined, label: string): boolean {
  if (!profile) {
    return false;
  }
  return [
    ...labelsForSignals(profile.outputs, OUTPUT_SIGNAL_LABELS),
    ...labelsForSignals(profile.supports, SUPPORT_SIGNAL_LABELS),
  ].includes(label);
}

export function profileBenefitsFromLabel(profile: DragonSynergyProfile | undefined, label: string): boolean {
  if (!profile) {
    return false;
  }
  return labelsForSignals(profile.benefitsFrom, BENEFIT_SIGNAL_LABELS).includes(label);
}

function buildProvidesChips(
  profile: DragonSynergyProfile,
  position: FormationPosition,
  progression: DragonProgression | undefined,
): FormationSignalChip[] {
  const chips = new Map<string, FormationSignalChip>();

  for (const source of [
    ...profile.outputs.map((signal) => ({ signal, labels: OUTPUT_SIGNAL_LABELS })),
    ...profile.supports.map((signal) => ({ signal, labels: SUPPORT_SIGNAL_LABELS })),
  ]) {
    const state = isSignalActive(source.signal, position, progression) ? 'active' : 'inactive';
    const reason = signalStateReason(source.signal, position, progression, 'Provides');

    for (const label of labelsForSignal(source.signal, source.labels)) {
      mergeChip(chips, { label, state, reason });
    }
  }

  return [...chips.values()].sort((left, right) => labelPriority(left.label, right.label));
}

function buildBenefitsChips(
  profile: DragonSynergyProfile,
  activeProvideSources: ProvideSource[],
): FormationSignalChip[] {
  const chips = new Map<string, FormationSignalChip>();

  for (const benefit of profile.benefitsFrom) {
    const benefitTags = providedTags(benefit);
    const matchingProvider = activeProvideSources.find(
      (source) =>
        source.profile.dragonId !== profile.dragonId &&
        source.tags.some((providerTag) => benefitTags.some((benefitTag) => tagSatisfies(providerTag, benefitTag))),
    );
    const state: FormationSignalState = matchingProvider ? 'active' : 'inactive';
    const reason = matchingProvider
      ? `Satisfied by ${matchingProvider.profile.dragonName}.`
      : 'No selected dragon actively provides this signal.';

    for (const label of labelsForSignal(benefit, BENEFIT_SIGNAL_LABELS)) {
      mergeChip(chips, { label, state, reason });
    }
  }

  return [...chips.values()].sort((left, right) => labelPriority(left.label, right.label));
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
  prefix: 'Provides',
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
  return displayTagsFrom(providedTags(signal))
    .map((tag) => labels[tag] ?? null)
    .filter((label): label is string => Boolean(label));
}

function providedTags(signal: SynergySignal): SynergyTag[] {
  return signal.tags ?? [signal.tag];
}

function mergeChip(chips: Map<string, FormationSignalChip>, next: FormationSignalChip) {
  const current = chips.get(next.label);
  if (!current || (current.state === 'inactive' && next.state === 'active')) {
    chips.set(next.label, next);
  }
}

function uniqueSortedLabels(labels: string[]): string[] {
  return [...new Set(labels)].sort(labelPriority);
}
