import type { FormationPosition } from '../models/dragon';
import { areAdjacent } from './positionRules';
import type {
  DragonProgression,
  DragonSynergyProfile,
  FriendlyRecipientSelector,
  SynergySignal,
  TargetingResolution,
} from './types';

export interface RecipientCandidate {
  dragonId: string;
  position: FormationPosition;
}

interface GroupedSelectorSignal {
  provider: RecipientCandidate;
  signal: SynergySignal & {
    recipientSelector: Extract<FriendlyRecipientSelector, { kind: 'capability-priority-one' }>;
  };
}

export function resolveCapabilityPriorityRecipientGroups({
  signals,
  selected,
  profiles,
  progression,
}: {
  signals: GroupedSelectorSignal[];
  selected: RecipientCandidate[];
  profiles: DragonSynergyProfile[];
  progression: Record<string, DragonProgression | undefined>;
}): TargetingResolution[] {
  const grouped = new Map<string, GroupedSelectorSignal[]>();
  for (const entry of signals) {
    const groupId = entry.signal.recipientSelector.selectionGroupId;
    const group = grouped.get(groupId) ?? [];
    group.push(entry);
    grouped.set(groupId, group);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([selectionGroupId, group]) => {
      const first = group[0]!;
      for (const entry of group.slice(1)) {
        assertSharedSelector(first.signal.recipientSelector, entry.signal.recipientSelector);
        if (entry.provider.dragonId !== first.provider.dragonId) {
          throw new Error(`Target-selection group "${selectionGroupId}" has multiple providers.`);
        }
      }
      return resolveCapabilityPriorityRecipient({
        provider: first.provider,
        selector: first.signal.recipientSelector,
        selected,
        profiles,
        progression,
        abilityIds: uniqueSorted(group.map(({ signal }) => signal.abilityId)),
        signalIds: uniqueSorted(group.map(({ signal }) => signal.id)),
      });
    });
}

export function resolveCapabilityPriorityRecipient({
  provider,
  selector,
  selected,
  profiles,
  progression,
  abilityIds = [],
  signalIds = [],
}: {
  provider: RecipientCandidate;
  selector: Extract<FriendlyRecipientSelector, { kind: 'capability-priority-one' }>;
  selected: RecipientCandidate[];
  profiles: DragonSynergyProfile[];
  progression: Record<string, DragonProgression | undefined>;
  abilityIds?: string[];
  signalIds?: string[];
}): TargetingResolution {
  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  const eligible = selected.filter(
    (candidate) => selector.includeSelf || candidate.dragonId !== provider.dragonId,
  );
  const missingCapabilityData = eligible.some(
    (candidate) => !profilesById.has(candidate.dragonId),
  );
  const priority = eligible.filter((candidate) => {
    const profile = profilesById.get(candidate.dragonId);
    return profile?.outputs.some(
      (output) =>
        providedTags(output).includes(selector.priorityTag) &&
        isSignalActive(output, candidate.position, progression[candidate.dragonId]),
    ) ?? false;
  });
  const eligibleRecipientIds = sortedIds(eligible);
  const priorityRecipientIds = sortedIds(priority);
  const fallbackRecipientIds = priority.length === 0 ? eligibleRecipientIds : [];
  const common = {
    selectorKind: selector.kind,
    selectionGroupId: selector.selectionGroupId,
    eligibleRecipientIds,
    priorityRecipientIds,
    fallbackRecipientIds,
    recipientCount: selector.recipientCount,
    abilityIds: uniqueSorted(abilityIds),
    signalIds: uniqueSorted(signalIds),
  } as const;

  if (missingCapabilityData && priority.length < selector.recipientCount + 1) {
    return { ...common, status: 'unresolved', unresolvedReason: 'missing-capability-data' };
  }
  if (priority.length === 1) {
    return { ...common, status: 'resolved', selectedRecipientId: priority[0]!.dragonId };
  }
  if (priority.length > 1) {
    return { ...common, status: 'unresolved', unresolvedReason: 'multiple-priority-candidates' };
  }
  if (eligible.length === 1) {
    return { ...common, status: 'resolved', selectedRecipientId: eligible[0]!.dragonId };
  }
  return { ...common, status: 'unresolved', unresolvedReason: 'multiple-fallback-candidates' };
}

export function signalTargetsRecipient({
  provider,
  signal,
  recipient,
  selected,
  progression,
  profiles = [],
  targetingResolutions = [],
}: {
  provider: RecipientCandidate;
  signal: SynergySignal;
  recipient: RecipientCandidate;
  selected: RecipientCandidate[];
  progression: Record<string, DragonProgression | undefined>;
  profiles?: DragonSynergyProfile[];
  targetingResolutions?: TargetingResolution[];
}): boolean {
  const selector = signal.recipientSelector;
  if (!selector) {
    return true;
  }

  if (selector.kind === 'capability-priority-one') {
    const resolution = targetingResolutions.find(
      (candidate) => candidate.selectionGroupId === selector.selectionGroupId,
    ) ?? resolveCapabilityPriorityRecipient({
      provider,
      selector,
      selected,
      profiles,
      progression,
      abilityIds: [signal.abilityId],
      signalIds: [signal.id],
    });
    return resolution.status === 'resolved' && resolution.selectedRecipientId === recipient.dragonId;
  }

  if (selector.kind === 'position-priority') {
    const preferred = selected.find((candidate) => candidate.position === selector.preferredPosition);
    if (!preferred) {
      return false;
    }
    if (!selector.allowSelf && preferred.dragonId === provider.dragonId) {
      return false;
    }
    return preferred.dragonId === recipient.dragonId;
  }

  if (selector.kind === 'unresolved-group') {
    return false;
  }

  if (selector.kind === 'adjacent-group') {
    const eligible = selected.filter(
      (candidate) =>
        (selector.includeSelf && candidate.dragonId === provider.dragonId) ||
        (candidate.dragonId !== provider.dragonId && areAdjacent(provider.position, candidate.position)),
    );
    return eligible.length <= selector.recipientCount && eligible.some((candidate) => candidate.dragonId === recipient.dragonId);
  }

  const eligible = selected.filter(
    (candidate) => !selector.excludeSelf || candidate.dragonId !== provider.dragonId,
  );
  const ranked = eligible.map((candidate) => ({
    candidate,
    value: progression[candidate.dragonId]?.combatStats?.[selector.stat],
  }));
  if (ranked.length === 0 || ranked.some(({ value }) => value === null || value === undefined)) {
    return false;
  }

  const maximum = Math.max(...ranked.map(({ value }) => value as number));
  const leaders = ranked.filter(({ value }) => value === maximum);
  return leaders.length === 1 && leaders[0]?.candidate.dragonId === recipient.dragonId;
}

function assertSharedSelector(
  left: Extract<FriendlyRecipientSelector, { kind: 'capability-priority-one' }>,
  right: Extract<FriendlyRecipientSelector, { kind: 'capability-priority-one' }>,
): void {
  if (
    left.priorityTag !== right.priorityTag ||
    left.recipientCount !== right.recipientCount ||
    left.includeSelf !== right.includeSelf ||
    left.selectionGroupId !== right.selectionGroupId
  ) {
    throw new Error(`Target-selection group "${left.selectionGroupId}" has incompatible selectors.`);
  }
}

function isSignalActive(
  signal: SynergySignal,
  position: FormationPosition,
  progression: DragonProgression | undefined,
): boolean {
  if (signal.requiredSelfPosition !== undefined && signal.requiredSelfPosition !== position) {
    return false;
  }
  const requirement = signal.unlock;
  if (!requirement) return true;
  if (
    requirement.minimumStarRank !== undefined &&
    (progression?.starRank ?? 0) < requirement.minimumStarRank
  ) {
    return false;
  }
  return !(
    requirement.minimumDragonLevel !== undefined &&
    (progression?.dragonLevel ?? 0) < requirement.minimumDragonLevel
  );
}

function providedTags(signal: SynergySignal): readonly string[] {
  return signal.tags ?? [signal.tag];
}

function sortedIds(candidates: RecipientCandidate[]): string[] {
  return candidates.map(({ dragonId }) => dragonId).sort();
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
