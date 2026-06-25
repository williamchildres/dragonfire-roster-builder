import { dragonObservationSnapshots } from '../data/observations';
import { FORMATION_POSITIONS, type Dragon, type FormationPosition } from '../models/dragon';
import type { ExplanationItem, FormationAnalysisInput, SynergyTrace } from '../models/synergy';

export interface NormalUnmetRequirementsInput {
  formation: FormationAnalysisInput;
  previewEnabled: boolean;
  normalActiveTraces: SynergyTrace[];
  normalPotentialTraces: SynergyTrace[];
  selectedInactiveTraitTraces: SynergyTrace[];
  selectedDragons: Dragon[];
  dragonLevels?: Record<string, number | null>;
}

interface NormalRequirementCandidate {
  semanticId: string;
  item: ExplanationItem;
}

export function buildNormalUnmetRequirements({
  formation,
  previewEnabled,
  normalActiveTraces,
  normalPotentialTraces,
  selectedInactiveTraitTraces,
  selectedDragons,
  dragonLevels = {},
}: NormalUnmetRequirementsInput): ExplanationItem[] {
  const selectedIds = new Set(selectedDragons.map((dragon) => dragon.id));
  const visibleTraces = [...normalActiveTraces, ...normalPotentialTraces].filter((trace) =>
    previewEnabled || !trace.requirements.some((requirement) => requirement.actual === 'preview enabled'),
  );
  const visibleAbilityIds = new Set(
    visibleTraces
      .filter((trace) => selectedIds.has(trace.sourceDragonId))
      .map((trace) => `${trace.sourceDragonId}|${trace.sourceAbilityId ?? ''}`),
  );
  const candidates: NormalRequirementCandidate[] = [];

  for (const dragon of selectedDragons) {
    const trait = dragon.trait;
    if (!trait?.positionRequirement) {
      continue;
    }

    const actualPosition = positionOf(formation, dragon.id);
    if (actualPosition !== trait.positionRequirement) {
      candidates.push({
        semanticId: [
          'provider-position',
          dragon.id,
          trait.id,
          trait.positionRequirement,
          actualPosition ?? 'missing',
        ].join('|'),
        item: {
          dragonIds: [dragon.id],
          tags: trait.tags,
          ruleId: `normal-unmet-${trait.id}-position`,
          title: `${trait.name} position requirement`,
          description: `${dragon.name} does not meet ${trait.name}'s ${formatPosition(trait.positionRequirement)} requirement.`,
          confidence: trait.verification.status === 'screenshot-verified' ? 'medium' : 'low',
        },
      });
      continue;
    }

    if (visibleAbilityIds.has(`${dragon.id}|${trait.id}`)) {
      continue;
    }

    const failedLevelRequirement = selectedInactiveTraitTraces
      .filter((trace) =>
        trace.sourceDragonId === dragon.id &&
        trace.sourceAbilityId === trait.id &&
        selectedIds.has(trace.sourceDragonId) &&
        (!trace.recipientDragonId || selectedIds.has(trace.recipientDragonId)) &&
        !trace.requirements.some((requirement) => requirement.satisfied === false && isHardRequirement(requirement)),
      )
      .flatMap((trace) => trace.requirements)
      .find((requirement) =>
        requirement.satisfied === false &&
        /Dragon Level requirement/i.test(requirement.label) &&
        requirement.actual !== 'preview enabled',
      );

    const observedLevel = Object.hasOwn(dragonLevels, dragon.id)
      ? (dragonLevels[dragon.id] ?? null)
      : (dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragon.id)?.dragonLevel ?? null);
    const requiredLevel = trait.minimumDragonLevel;
    if (!failedLevelRequirement && (requiredLevel === null || observedLevel === null || observedLevel >= requiredLevel)) {
      continue;
    }

    const actualLevel = levelNumber(failedLevelRequirement?.actual) ?? observedLevel;
    const expectedLevel = levelNumber(failedLevelRequirement?.expected) ?? requiredLevel;
    if (actualLevel === null || expectedLevel === null || actualLevel >= expectedLevel) {
      continue;
    }

    candidates.push({
      semanticId: [
        'dragon-level',
        dragon.id,
        trait.id,
        expectedLevel,
        actualLevel,
      ].join('|'),
      item: {
        dragonIds: [dragon.id],
        tags: trait.tags,
        ruleId: `normal-unmet-${trait.id}-dragon-level`,
        title: `${trait.name} Dragon Level requirement`,
        description: `${dragon.name} is Level ${actualLevel} and requires Level ${expectedLevel}.`,
        confidence: 'medium',
      },
    });
  }

  return dedupeCandidates(candidates).map((candidate) => candidate.item);
}

export function normalRequirementSemanticIds(items: ExplanationItem[]): string[] {
  return items.map((item) =>
    [
      item.ruleId,
      item.dragonIds.join(','),
      item.title,
      item.description.replace(/\s+/g, ' ').trim(),
    ].join('|'),
  );
}

function dedupeCandidates(candidates: NormalRequirementCandidate[]): NormalRequirementCandidate[] {
  const byId = new Map<string, NormalRequirementCandidate>();
  for (const candidate of candidates) {
    if (!byId.has(candidate.semanticId)) {
      byId.set(candidate.semanticId, candidate);
    }
  }
  return [...byId.values()];
}

function positionOf(formation: FormationAnalysisInput, dragonId: string): FormationPosition | null {
  return FORMATION_POSITIONS.find((position) => formation[position] === dragonId) ?? null;
}

function formatPosition(position: FormationPosition): string {
  return position
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function levelNumber(value: string | null | undefined): number | null {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isHardRequirement(requirement: SynergyTrace['requirements'][number]): boolean {
  return /selected in formation|\b[a-z0-9-]+-selected\b|provider position|required source position|required target position|position compatibility|source-scope compatibility|provider targeting|status targeting|adjacency|explicit caster|battlefield/i.test(
    `${requirement.id} ${requirement.label}`,
  );
}
