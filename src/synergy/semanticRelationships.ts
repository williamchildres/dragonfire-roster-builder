import { CONTROL_ALIAS_TAGS, type SynergyTag } from './tags';
import type {
  DragonSynergyProfile,
  FriendlyRecipientSelector,
  SimpleSynergyResult,
  SimpleSynergyResultKind,
  SynergySignal,
} from './types';

export type SemanticRelationshipClass =
  | 'conditional-payoff'
  | 'output-amplification'
  | 'stat-support';

export interface SemanticRelationship {
  id: string;
  relationshipClass: SemanticRelationshipClass;
  providerDragonId: string;
  beneficiaryDragonId: string;
  semanticTag: SynergyTag;
  abilityIds: string[];
  sourceResultIds: string[];
  sourceKinds: SimpleSynergyResultKind[];
  baseValue: number;
  marginalValue: number;
  redundancyRank: number;
  summary: string;
  evidenceDetails: string[];
}

interface RelationshipAggregate {
  id: string;
  providerDragonId: string;
  beneficiaryDragonId: string;
  semanticTag: SynergyTag;
  abilityIds: Set<string>;
  sourceResultIds: Set<string>;
  sourceKinds: Set<SimpleSynergyResultKind>;
  candidates: Array<{
    relationshipClass: SemanticRelationshipClass;
    baseValue: number;
    resultId: string;
    summary: string;
  }>;
}

const baseValues: Record<SemanticRelationshipClass, number> = {
  'conditional-payoff': 10,
  'output-amplification': 6,
  'stat-support': 5,
};

export function buildSemanticRelationships(
  results: SimpleSynergyResult[],
  profiles: DragonSynergyProfile[] = [],
): SemanticRelationship[] {
  const aggregates = new Map<string, RelationshipAggregate>();

  for (const result of results) {
    if (!isActiveRelationshipResult(result) || !result.tag || result.dragonIds.length < 2) {
      continue;
    }

    const providerDragonId = result.dragonIds[0];
    const beneficiaryDragonId = result.dragonIds[1];
    if (!providerDragonId || !beneficiaryDragonId || providerDragonId === beneficiaryDragonId) {
      continue;
    }

    const semanticTag = canonicalSemanticTag(result.tag);
    const relationshipClass = classifyRelationship(result.kind, semanticTag);
    const id = semanticRelationshipId(providerDragonId, semanticTag, beneficiaryDragonId);
    const aggregate = aggregates.get(id) ?? {
      id,
      providerDragonId,
      beneficiaryDragonId,
      semanticTag,
      abilityIds: new Set<string>(),
      sourceResultIds: new Set<string>(),
      sourceKinds: new Set<SimpleSynergyResultKind>(),
      candidates: [],
    };

    result.abilityIds.forEach((abilityId) => aggregate.abilityIds.add(abilityId));
    aggregate.sourceResultIds.add(result.id);
    aggregate.sourceKinds.add(result.kind);
    aggregate.candidates.push({
      relationshipClass,
      baseValue: baseValues[relationshipClass],
      resultId: result.id,
      summary: result.explanation,
    });
    aggregates.set(id, aggregate);
  }

  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  const relationships = [...aggregates.values()].map((aggregate): SemanticRelationship => {
    const preferred = [...aggregate.candidates].sort(compareCandidates)[0]!;
    const abilityIds = [...aggregate.abilityIds].sort();
    return {
      id: aggregate.id,
      relationshipClass: preferred.relationshipClass,
      providerDragonId: aggregate.providerDragonId,
      beneficiaryDragonId: aggregate.beneficiaryDragonId,
      semanticTag: aggregate.semanticTag,
      abilityIds,
      sourceResultIds: [...aggregate.sourceResultIds].sort(),
      sourceKinds: [...aggregate.sourceKinds].sort(),
      baseValue: preferred.baseValue,
      marginalValue: preferred.baseValue,
      redundancyRank: 1,
      summary: preferred.summary,
      evidenceDetails: relationshipEvidenceDetails(
        profilesById.get(aggregate.providerDragonId),
        abilityIds,
      ),
    };
  });

  const redundancyGroups = new Map<string, SemanticRelationship[]>();
  for (const relationship of relationships) {
    const groupKey = [
      relationship.beneficiaryDragonId,
      relationship.semanticTag,
      relationship.relationshipClass,
    ].join(':');
    const group = redundancyGroups.get(groupKey) ?? [];
    group.push(relationship);
    redundancyGroups.set(groupKey, group);
  }

  for (const group of redundancyGroups.values()) {
    group.sort(compareRedundantProviders);
    group.forEach((relationship, index) => {
      relationship.redundancyRank = index + 1;
      relationship.marginalValue = index === 0
        ? relationship.baseValue
        : index === 1
          ? relationship.baseValue / 2
          : 0;
    });
  }

  return relationships.sort((left, right) => left.id.localeCompare(right.id));
}

export function semanticRelationshipId(
  providerDragonId: string,
  semanticTag: SynergyTag,
  beneficiaryDragonId: string,
): string {
  return `relationship:${providerDragonId}:${semanticTag}:${beneficiaryDragonId}`;
}

export function canonicalSemanticTag(tag: SynergyTag): SynergyTag {
  return CONTROL_ALIAS_TAGS.includes(tag as (typeof CONTROL_ALIAS_TAGS)[number])
    ? 'status:control'
    : tag;
}

export function relationshipValue(relationships: SemanticRelationship[]): number {
  return relationships.reduce(
    (total, relationship) => total + Math.max(0, relationship.marginalValue),
    0,
  );
}

function isActiveRelationshipResult(
  result: SimpleSynergyResult,
): result is SimpleSynergyResult & { kind: 'setup-payoff' | 'amplifier-output' } {
  return result.kind === 'setup-payoff' || result.kind === 'amplifier-output';
}

function classifyRelationship(
  kind: 'setup-payoff' | 'amplifier-output',
  tag: SynergyTag,
): SemanticRelationshipClass {
  if (kind === 'setup-payoff') {
    return 'conditional-payoff';
  }
  return tag.startsWith('stat:') ? 'stat-support' : 'output-amplification';
}

function compareCandidates(
  left: RelationshipAggregate['candidates'][number],
  right: RelationshipAggregate['candidates'][number],
): number {
  return right.baseValue - left.baseValue || left.resultId.localeCompare(right.resultId);
}

function compareRedundantProviders(
  left: SemanticRelationship,
  right: SemanticRelationship,
): number {
  return (
    right.baseValue - left.baseValue ||
    left.providerDragonId.localeCompare(right.providerDragonId) ||
    (left.abilityIds[0] ?? left.sourceResultIds[0] ?? '').localeCompare(
      right.abilityIds[0] ?? right.sourceResultIds[0] ?? '',
    ) ||
    left.id.localeCompare(right.id)
  );
}

function relationshipEvidenceDetails(
  provider: DragonSynergyProfile | undefined,
  abilityIds: string[],
): string[] {
  if (!provider) {
    return [];
  }

  const abilityIdSet = new Set(abilityIds);
  return [...provider.outputs, ...provider.supports]
    .filter((signal) => abilityIdSet.has(signal.abilityId))
    .map(describeSignalTargeting)
    .filter((detail, index, details) => details.indexOf(detail) === index)
    .sort();
}

function describeSignalTargeting(signal: SynergySignal): string {
  const details = [signal.abilityName];
  if (signal.requiredSelfPosition) {
    details.push(`provider requires ${signal.requiredSelfPosition}`);
  }
  if (signal.requiredRecipientPosition) {
    details.push(`recipient requires ${signal.requiredRecipientPosition}`);
  }
  if (signal.friendlyScope === 'adjacent') {
    details.push('adjacent recipient');
  } else if (signal.friendlyScope === 'formation') {
    details.push('formation-wide recipient');
  }
  if (signal.recipientSelector) {
    details.push(describeRecipientSelector(signal.recipientSelector));
  }
  return details.join(' · ');
}

function describeRecipientSelector(selector: FriendlyRecipientSelector): string {
  switch (selector.kind) {
    case 'highest-stat':
      return `highest ${selector.stat}${selector.excludeSelf ? ', other ally' : ''}`;
    case 'position-priority':
      return `prioritizes ${selector.preferredPosition}`;
    case 'unresolved-group':
      return `unresolved group of ${selector.recipientCount}`;
    case 'adjacent-group':
      return `adjacent group of ${selector.recipientCount}`;
  }
}
