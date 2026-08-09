import type { Dragon } from '../models/dragon';
import type {
  BindingReliabilityTrace,
  FormationRelationshipV3,
  RelationshipCandidateTrace,
  ReliabilityCalculationMethod,
  ReliabilityUnquantifiedReason,
} from '../synergy/reliability';
import {
  formationReliabilityBindings,
  formationReliabilityComponents,
} from '../synergy/reliability/registry';
import { SYNERGY_TAG_LABELS } from '../synergy/tags';
import type {
  ConditionalProbabilityUplift,
  FixedOrHabitLevelEvidenceValue,
} from '../synergy/reliability/types';

export const reliabilityMethodLabels: Record<ReliabilityCalculationMethod, string> = {
  guaranteed: 'Guaranteed',
  'condition-proven': 'Condition proven',
  'one-supported-opportunity': 'One supported opportunity',
  'confirmed-cumulative': 'Confirmed cumulative probability',
  'shared-event': 'Shared activation counted once',
  'best-supported-alternative': 'Best supported alternative',
  'mixed-use-lower-bound': 'Simultaneous-use lower bound',
};

export const reliabilityReasonLabels: Record<ReliabilityUnquantifiedReason, string> = {
  'conditional-opportunity': 'Conditional opportunity',
  'unknown-opportunity': 'Opportunity not established',
  'probability-unknown': 'Probability not documented',
  'missing-habit-level': 'Active Habit level is missing',
  'round-context-unresolved': 'Round context is unresolved',
  'probability-context-unresolved': 'Probability context is unresolved',
  'conditional-deterministic-unproven': 'Dynamic condition is not proven',
  'joint-chance-behavior-unresolved': 'Joint chance behavior is unresolved',
  'conflicting-shared-event-probabilities': 'Shared-event probabilities conflict',
  'no-supported-path': 'No supported activation path',
};

export function semanticTagLabel(
  relationship: FormationRelationshipV3,
): string {
  return SYNERGY_TAG_LABELS[relationship.semanticTag];
}

export function relationshipClassLabel(
  relationship: FormationRelationshipV3,
): string {
  if (relationship.relationshipClass === 'conditional-payoff') {
    return 'Condition payoff';
  }
  if (relationship.relationshipClass === 'output-amplification') {
    return 'Output amplification';
  }
  return 'Stat support';
}

export function signalLabel(
  trace: RelationshipCandidateTrace,
  side: 'provider' | 'beneficiary',
  dragonsById: ReadonlyMap<string, Dragon>,
): string {
  const candidate = trace.candidate;
  const abilityId = side === 'provider'
    ? candidate.providerAbilityId
    : candidate.beneficiaryAbilityId;
  const category = side === 'provider'
    ? candidate.providerSignalCategory
    : candidate.beneficiarySignalCategory;
  const ability = abilityLabel(abilityId, dragonsById);
  if (category === 'benefits-from') return `${ability} payoff condition`;
  if (category === 'support') return `${ability} support`;
  return `${ability} effect`;
}

export function candidateAbilityLabels(
  trace: RelationshipCandidateTrace,
  side: 'provider' | 'beneficiary',
  dragonsById: ReadonlyMap<string, Dragon>,
): string[] {
  const candidate = trace.candidate;
  const primaryId = side === 'provider'
    ? candidate.providerAbilityId
    : candidate.beneficiaryAbilityId;
  const dragonId = side === 'provider'
    ? candidate.providerDragonId
    : candidate.beneficiaryDragonId;
  const dragon = dragonsById.get(dragonId);
  const ownedAbilityIds = new Set([
    dragon?.command?.id,
    dragon?.trait?.id,
    ...(dragon?.habits.map((habit) => habit.id) ?? []),
  ].filter((value): value is string => Boolean(value)));
  const ids = [primaryId, ...candidate.abilityIds.filter((id) => ownedAbilityIds.has(id))];
  return [...new Set(ids)].map((id) => abilityLabel(id, dragonsById));
}

export function mixedUseLabels(
  binding: BindingReliabilityTrace,
  dragonsById: ReadonlyMap<string, Dragon>,
): Array<{ label: string; selected: boolean }> {
  const registryBinding = formationReliabilityBindings.find(
    (candidate) =>
      candidate.status === 'resolved' &&
      candidate.bindingClass === 'resolved-mixed' &&
      candidate.signalId === binding.signalId,
  );
  if (
    !registryBinding ||
    registryBinding.status !== 'resolved' ||
    registryBinding.bindingClass !== 'resolved-mixed'
  ) {
    return [];
  }
  return registryBinding.uses.map((use) => {
    const componentIds = use.paths.flatMap((path) =>
      path.events.flatMap((event) =>
        event.componentReferences.map((reference) => reference.componentId),
      ),
    );
    const abilityNames = [...new Set(componentIds.flatMap((componentId) => {
      const component = formationReliabilityComponents.find(
        (candidate) => candidate.id === componentId,
      );
      return component ? [abilityLabel(component.sourceAbilityId, dragonsById)] : [];
    }))];
    return {
      label: abilityNames.join(' + ') || 'Documented simultaneous effect',
      selected: use.useId === binding.selectedUseId,
    };
  });
}

export function nonSharedRequirementLabels(
  trace: RelationshipCandidateTrace,
  dragonsById: ReadonlyMap<string, Dragon>,
): string[] {
  const shared = new Set(trace.sharedRequirementIds);
  const components = [
    ...trace.provider.selectedComponentTraces,
    ...trace.beneficiary.selectedComponentTraces,
  ].filter((component) => {
    const identity = [
      component.eventId ?? '',
      component.componentId,
      component.probabilityVariantId ?? '',
    ].join('|');
    return !shared.has(identity);
  });
  return [...new Set(components.flatMap((component) => {
    const registryComponent = formationReliabilityComponents.find(
      (candidate) => candidate.id === component.componentId,
    );
    return registryComponent
      ? [abilityLabel(registryComponent.sourceAbilityId, dragonsById)]
      : [];
  }))];
}

export function candidateAdjustedValue(
  relationship: FormationRelationshipV3,
  trace: RelationshipCandidateTrace,
): number {
  return trace.quantification.status === 'quantified'
    ? relationship.baseValue * trace.quantification.reliability
    : 0;
}

export function conditionalUpliftForRelationship(
  relationship: FormationRelationshipV3,
): ConditionalProbabilityUplift | null {
  for (const componentId of relationship.componentIds) {
    const component = formationReliabilityComponents.find((candidate) => candidate.id === componentId);
    const uplift = component?.conditionalUplift ?? component?.conditionalUplifts?.[0];
    if (uplift) return uplift;
  }
  return null;
}

export function conditionalUpliftsForRelationship(
  relationship: FormationRelationshipV3,
): ConditionalProbabilityUplift[] {
  return relationship.componentIds.flatMap((componentId) => {
    const component = formationReliabilityComponents.find((candidate) => candidate.id === componentId);
    return [
      ...(component?.conditionalUplift ? [component.conditionalUplift] : []),
      ...(component?.conditionalUplifts ?? []),
    ];
  });
}

export function conditionalUpliftSummary(
  relationship: FormationRelationshipV3,
  dragonsById: ReadonlyMap<string, Dragon>,
): string | null {
  const uplifts = conditionalUpliftsForRelationship(relationship);
  const uplift = uplifts[0];
  if (!uplift) return null;
  const selectedTrace = relationship.candidateTraces.find(
    (trace) => trace.candidate.id === relationship.selectedCandidateId,
  );
  const providerName =
    dragonsById.get(relationship.providerDragonId)?.name ?? relationship.providerDragonId;
  const beneficiaryName =
    dragonsById.get(relationship.beneficiaryDragonId)?.name ?? relationship.beneficiaryDragonId;
  const modifier = uplifts.map((candidate) => {
    const baselinePercent = formatEvidenceProbability(candidate.baseline);
    const conditionedPercent = formatEvidenceProbability(candidate.conditioned);
    const deltaPoints = formatEvidencePercentagePoints(candidate.absoluteDelta);
    return `${candidate.conditionLabel} deterministically changes ${candidate.affectedMetricLabel} from ${baselinePercent} to ${conditionedPercent} (+${deltaPoints} percentage points; ${formatMultiplier(candidate.relativeMultiplier)}). The resulting activation remains probabilistic.`;
  }).join(' ');
  const provider = selectedTrace?.provider;
  if (provider?.quantification.status === 'quantified') {
    return `${providerName} can provide ${uplift.conditionLabel} with a ${formatProbability(provider.quantification.reliability)} supported activation opportunity. ${modifier}`;
  }
  const providerComponent = provider?.selectedComponentTraces
    .map((trace) =>
      formationReliabilityComponents.find((component) => component.id === trace.componentId),
    )
    .find((component) => component?.opportunityCondition);
  const condition = providerComponent?.opportunityCondition;
  const unresolved = condition
    ? `its ${uplift.conditionLabel} opportunity depends on ${lowercaseSentence(condition)}`
    : 'its setup opportunity is not quantitatively established';
  return `${beneficiaryName} benefits from ${uplift.conditionLabel}: ${modifier} ${providerName} can provide ${uplift.conditionLabel}, but ${unresolved}, so this relationship is not numerically weighted.`;
}

export function abilityLabel(
  abilityId: string,
  dragonsById: ReadonlyMap<string, Dragon>,
): string {
  for (const dragon of dragonsById.values()) {
    const ability = [
      dragon.command,
      dragon.trait,
      ...dragon.habits,
    ].find((candidate) => candidate?.id === abilityId);
    if (ability) return `${dragon.name} — ${ability.name}`;
  }
  return 'Documented ability';
}

function formatProbability(value: number): string {
  return `${Math.round(value * 10_000) / 100}%`;
}

function formatEvidenceProbability(value: FixedOrHabitLevelEvidenceValue): string {
  if (typeof value === 'number') return formatProbability(value);
  return `Habit Levels 1–5 ${[1, 2, 3, 4, 5].map((level) => formatProbability(value.byLevel[level as 1 | 2 | 3 | 4 | 5])).join('/')}`;
}

function formatEvidencePercentagePoints(value: FixedOrHabitLevelEvidenceValue): string {
  if (typeof value === 'number') return formatPercentagePoints(value);
  return `Habit Levels 1–5 ${[1, 2, 3, 4, 5].map((level) => formatPercentagePoints(value.byLevel[level as 1 | 2 | 3 | 4 | 5])).join('/')}`;
}

function formatPercentagePoints(value: number): string {
  return String(Math.round(value * 10_000) / 100);
}

function formatMultiplier(value: number): string {
  return `${Math.round(value * 100) / 100}×`;
}

function lowercaseSentence(value: string): string {
  const sentence = value.replace(/[.]$/, '');
  return sentence.startsWith('The ') ? `the ${sentence.slice(4)}` : sentence;
}
