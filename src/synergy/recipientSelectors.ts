import { dragons } from '../data/dragons';
import type { FormationPosition } from '../models/dragon';
import { areAdjacent } from './positionRules';
import type {
  DragonProgression,
  DragonSynergyProfile,
  FriendlyRecipientSelector,
  SynergySignal,
  TargetingStat,
  TargetingResolution,
} from './types';

export interface RecipientCandidate {
  dragonId: string;
  position: FormationPosition;
}

export type GroupedSelector = Extract<
  FriendlyRecipientSelector,
  { kind: 'capability-priority-one' | 'breed-one' }
> | (Extract<FriendlyRecipientSelector, { kind: 'highest-stat' }> & { selectionGroupId: string });

export interface GroupedSelectorSignal {
  provider: RecipientCandidate;
  signal: SynergySignal;
  selector: GroupedSelector;
}

export function isGroupedSelector(
  selector: FriendlyRecipientSelector | undefined,
): selector is GroupedSelector {
  return selector?.kind === 'capability-priority-one' ||
    selector?.kind === 'breed-one' ||
    (selector?.kind === 'highest-stat' && Boolean(selector.selectionGroupId));
}

export function resolveTargetingRecipientGroups({
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
    const group = grouped.get(entry.selector.selectionGroupId) ?? [];
    group.push(entry);
    grouped.set(entry.selector.selectionGroupId, group);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([selectionGroupId, group]) => {
      const first = group[0]!;
      for (const entry of group.slice(1)) {
        if (JSON.stringify(entry.selector) !== JSON.stringify(first.selector)) {
          throw new Error(`Target-selection group "${selectionGroupId}" has incompatible selectors.`);
        }
        if (entry.provider.dragonId !== first.provider.dragonId) {
          throw new Error(`Target-selection group "${selectionGroupId}" has multiple providers.`);
        }
      }
      return resolveGroupedRecipient({
        provider: first.provider,
        selector: first.selector,
        selected,
        profiles,
        progression,
        abilityIds: uniqueSorted(group.map(({ signal }) => signal.abilityId)),
        signalIds: uniqueSorted(group.map(({ signal }) => signal.id)),
      });
    });
}

/** Backward-compatible name retained for existing Syrax tests and callers. */
export const resolveCapabilityPriorityRecipientGroups = resolveTargetingRecipientGroups;

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
  return resolveGroupedRecipient({ provider, selector, selected, profiles, progression, abilityIds, signalIds });
}

function resolveGroupedRecipient({
  provider,
  selector,
  selected,
  profiles,
  progression,
  abilityIds,
  signalIds,
}: {
  provider: RecipientCandidate;
  selector: GroupedSelector;
  selected: RecipientCandidate[];
  profiles: DragonSynergyProfile[];
  progression: Record<string, DragonProgression | undefined>;
  abilityIds: string[];
  signalIds: string[];
}): TargetingResolution {
  const includeSelf = selector.kind === 'highest-stat' ? !selector.excludeSelf : selector.includeSelf;
  const eligible = selected.filter((candidate) => includeSelf || candidate.dragonId !== provider.dragonId);
  const common = (priority: RecipientCandidate[], fallback: RecipientCandidate[] = []) => ({
    selectorKind: selector.kind,
    selectionGroupId: selector.selectionGroupId,
    eligibleRecipientIds: sortedIds(eligible),
    priorityRecipientIds: sortedIds(priority),
    fallbackRecipientIds: sortedIds(fallback),
    recipientCount: 1,
    abilityIds: uniqueSorted(abilityIds),
    signalIds: uniqueSorted(signalIds),
  } as const);

  if (selector.kind === 'breed-one') {
    const breedById = new Map(dragons.map((dragon) => [dragon.id, dragon.breed]));
    const qualifying = eligible.filter((candidate) => breedById.get(candidate.dragonId) === selector.breed);
    const base = common(qualifying);
    if (qualifying.length === 1) return { ...base, status: 'resolved', selectedRecipientId: qualifying[0]!.dragonId };
    return {
      ...base,
      status: 'unresolved',
      unresolvedReason: qualifying.length === 0
        ? 'no-eligible-breed-candidates'
        : 'multiple-eligible-breed-candidates',
    };
  }

  if (selector.kind === 'highest-stat') {
    const ranked = eligible.map((candidate) => ({
      candidate,
      value: progression[candidate.dragonId]?.combatStats?.[selector.stat],
    }));
    if (ranked.some(({ value }) => value === null || value === undefined)) {
      return { ...common([]), status: 'unresolved', unresolvedReason: 'missing-stat-data' };
    }
    const maximum = Math.max(...ranked.map(({ value }) => value as number));
    const leaders = ranked.filter(({ value }) => value === maximum).map(({ candidate }) => candidate);
    const base = common(leaders);
    if (leaders.length === 1) return { ...base, status: 'resolved', selectedRecipientId: leaders[0]!.dragonId };
    return { ...base, status: 'unresolved', unresolvedReason: 'highest-stat-tie' };
  }

  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  const missingCapabilityData = eligible.some((candidate) => !profilesById.has(candidate.dragonId));
  const priority = eligible.filter((candidate) => {
    const profile = profilesById.get(candidate.dragonId);
    return profile?.outputs.some(
      (output) => providedTags(output).includes(selector.priorityTag) &&
        isSignalActive(output, candidate.position, progression[candidate.dragonId]),
    ) ?? false;
  });
  const fallback = priority.length === 0 ? eligible : [];
  const base = common(priority, fallback);
  if (missingCapabilityData && priority.length < 2) {
    return { ...base, status: 'unresolved', unresolvedReason: 'missing-capability-data' };
  }
  if (priority.length === 1) return { ...base, status: 'resolved', selectedRecipientId: priority[0]!.dragonId };
  if (priority.length > 1) return { ...base, status: 'unresolved', unresolvedReason: 'multiple-priority-candidates' };
  if (eligible.length === 1) return { ...base, status: 'resolved', selectedRecipientId: eligible[0]!.dragonId };
  return { ...base, status: 'unresolved', unresolvedReason: 'multiple-fallback-candidates' };
}

export function signalTargetsRecipient({
  provider,
  signal,
  recipient,
  selected,
  progression,
  profiles = [],
  targetingResolutions = [],
  selectorOverride,
}: {
  provider: RecipientCandidate;
  signal: SynergySignal;
  recipient: RecipientCandidate;
  selected: RecipientCandidate[];
  progression: Record<string, DragonProgression | undefined>;
  profiles?: DragonSynergyProfile[];
  targetingResolutions?: TargetingResolution[];
  selectorOverride?: FriendlyRecipientSelector;
}): boolean {
  const selector = selectorOverride ?? signal.recipientSelector;
  if (!selector) return true;

  const groupId = 'selectionGroupId' in selector ? selector.selectionGroupId : undefined;
  if (groupId) {
    const resolution = targetingResolutions.find((candidate) => candidate.selectionGroupId === groupId) ??
      resolveGroupedRecipient({
        provider,
        selector: selector as GroupedSelector,
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
    return Boolean(preferred && (selector.allowSelf || preferred.dragonId !== provider.dragonId) && preferred.dragonId === recipient.dragonId);
  }
  if (selector.kind === 'unresolved-group') return false;
  if (selector.kind === 'adjacent-group') {
    const eligible = selected.filter((candidate) =>
      (selector.includeSelf && candidate.dragonId === provider.dragonId) ||
      (candidate.dragonId !== provider.dragonId && areAdjacent(provider.position, candidate.position)),
    );
    return eligible.length <= selector.recipientCount && eligible.some((candidate) => candidate.dragonId === recipient.dragonId);
  }
  if (selector.kind !== 'highest-stat') return false;

  const eligible = selected.filter((candidate) => !selector.excludeSelf || candidate.dragonId !== provider.dragonId);
  const ranked = eligible.map((candidate) => ({
    candidate,
    value: combatStatValue(progression, candidate.dragonId, selector.stat),
  }));
  if (ranked.length === 0 || ranked.some(({ value }) => value === null || value === undefined)) return false;
  const maximum = Math.max(...ranked.map(({ value }) => value as number));
  const leaders = ranked.filter(({ value }) => value === maximum);
  return leaders.length === 1 && leaders[0]?.candidate.dragonId === recipient.dragonId;
}

function combatStatValue(
  progression: Record<string, DragonProgression | undefined>,
  dragonId: string,
  stat: TargetingStat,
): number | null | undefined {
  return progression[dragonId]?.combatStats?.[stat];
}

function isSignalActive(signal: SynergySignal, position: FormationPosition, progression: DragonProgression | undefined): boolean {
  if (signal.requiredSelfPosition !== undefined && signal.requiredSelfPosition !== position) return false;
  const requirement = signal.unlock;
  if (!requirement) return true;
  if (requirement.minimumStarRank !== undefined && (progression?.starRank ?? 0) < requirement.minimumStarRank) return false;
  return !(requirement.minimumDragonLevel !== undefined && (progression?.dragonLevel ?? 0) < requirement.minimumDragonLevel);
}

function providedTags(signal: SynergySignal): readonly string[] { return signal.tags ?? [signal.tag]; }
function sortedIds(candidates: RecipientCandidate[]): string[] { return candidates.map(({ dragonId }) => dragonId).sort(); }
function uniqueSorted(values: string[]): string[] { return [...new Set(values)].sort(); }
