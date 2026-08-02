import { evaluateFormationCandidates } from '../../evaluateFormation';
import {
  canonicalSemanticTag,
  semanticRelationshipId,
  type SemanticRelationshipClass,
} from '../../semanticRelationships';
import type {
  DragonSynergyProfile,
  EnrichedRelationshipCandidate,
  EvaluateFormationCandidatesResult,
} from '../../types';
import { formationReliabilityBindings, formationReliabilityComponents } from '../registry';
import { reliabilityBindingPathVisits } from '../traversal';
import type {
  AbilityReliabilityComponent,
  ReliabilityProgression,
  SignalReliabilityBinding,
} from '../types';
import { evaluateBindingReliability, reliabilityRequirementId } from './bindingReliability';
import type {
  BindingReliabilityTrace,
  ComponentReliabilityTrace,
  EvaluateFormationV3Input,
  FormationRelationshipV3,
  RelationshipCandidateTrace,
  ReliabilityQuantification,
} from './types';

interface EvaluatedCandidate {
  relationshipId: string;
  relationshipClass: SemanticRelationshipClass;
  baseValue: number;
  adjustedBaseValue: number;
  trace: RelationshipCandidateTrace;
}

const baseValues: Record<SemanticRelationshipClass, number> = {
  'conditional-payoff': 10,
  'output-amplification': 6,
  'stat-support': 5,
};

export function evaluateFormationRelationshipsV3({
  input,
  profiles,
  candidateEvaluation,
}: {
  input: EvaluateFormationV3Input;
  profiles: DragonSynergyProfile[];
  candidateEvaluation?: EvaluateFormationCandidatesResult;
}): FormationRelationshipV3[] {
  const candidates = (candidateEvaluation ?? evaluateFormationCandidates({
    formation: input.formation,
    progression: input.progression,
    profiles,
  })).candidates;
  const componentsById = new Map(
    formationReliabilityComponents.map((component) => [component.id, component]),
  );
  const bindingsBySignalId = new Map(
    formationReliabilityBindings.map((binding) => [binding.signalId, binding]),
  );
  const evaluated = candidates.map((candidate) =>
    evaluateRelationshipCandidate({
      candidate,
      componentsById,
      bindingsBySignalId,
      reliabilityProgression: input.reliabilityProgression,
    }),
  );
  const byRelationshipId = new Map<string, EvaluatedCandidate[]>();
  for (const candidate of evaluated) {
    const group = byRelationshipId.get(candidate.relationshipId) ?? [];
    group.push(candidate);
    byRelationshipId.set(candidate.relationshipId, group);
  }
  const relationships = [...byRelationshipId.entries()].map(([id, group]) => {
    const sortedCandidates = [...group].sort(compareRelationshipCandidates);
    const selected = sortedCandidates[0]!;
    const selectionReason = candidateSelectionReason(selected, sortedCandidates);
    const candidateTraces = sortedCandidates.map((candidate) => ({
      ...candidate.trace,
      selectionReason:
        candidate === selected
          ? selectionReason
          : 'Retained as an evaluated alternative; it did not win deterministic selection.',
    }));
    const quantification = selected.trace.quantification;
    return {
      id,
      relationshipClass: selected.relationshipClass,
      providerDragonId: selected.trace.candidate.providerDragonId,
      beneficiaryDragonId: selected.trace.candidate.beneficiaryDragonId,
      semanticTag: canonicalSemanticTag(selected.trace.candidate.semanticTag),
      selectedProviderSignalId: selected.trace.candidate.providerSignalId,
      selectedBeneficiarySignalId: selected.trace.candidate.beneficiarySignalId,
      selectedCandidateId: selected.trace.candidate.id,
      candidateTraces,
      baseValue: selected.baseValue,
      v2ComparableBaseMarginalValue: selected.baseValue,
      quantification,
      adjustedBaseValue: selected.adjustedBaseValue,
      adjustedMarginalValue: selected.adjustedBaseValue,
      redundancyRank: 1,
      unquantifiedBasePotential: quantification.status === 'unquantified' ? selected.baseValue : 0,
      componentIds: selected.trace.componentIds,
      eventIds: selected.trace.eventIds,
      probabilityVariantIds: selected.trace.probabilityVariantIds,
      explanation: selected.trace.candidate.explanation,
    } satisfies FormationRelationshipV3;
  });

  applyV2ComparableMarginals(relationships);
  applyAdjustedRedundancy(relationships);
  return relationships.sort((left, right) => left.id.localeCompare(right.id));
}

export function selectRelationshipCandidateV3(
  candidates: readonly {
    id: string;
    baseValue: number;
    quantification: ReliabilityQuantification;
  }[],
): string | null {
  const comparable = candidates.map(
    (candidate) =>
      ({
        relationshipId: candidate.id,
        relationshipClass: 'conditional-payoff' as const,
        baseValue: candidate.baseValue,
        adjustedBaseValue:
          candidate.quantification.status === 'quantified'
            ? candidate.baseValue * candidate.quantification.reliability
            : 0,
        trace: {
          candidate: {
            id: candidate.id,
            resultKind: 'setup-payoff',
            providerDragonId: '',
            providerSignalId: '',
            providerSignalCategory: 'output',
            providerAbilityId: '',
            beneficiaryDragonId: '',
            beneficiarySignalId: '',
            beneficiarySignalCategory: 'benefits-from',
            beneficiaryAbilityId: '',
            semanticTag: 'status:control',
            abilityIds: [],
            explanation: '',
          },
          provider: emptyBindingTrace(''),
          beneficiary: emptyBindingTrace(''),
          componentIds: [],
          eventIds: [],
          probabilityVariantIds: [],
          sharedRequirementIds: [],
          quantification: candidate.quantification,
        },
      }) satisfies EvaluatedCandidate,
  );
  return [...comparable].sort(compareRelationshipCandidates)[0]?.relationshipId ?? null;
}

export function applyAdjustedRedundancy(relationships: FormationRelationshipV3[]): void {
  const groups = relationshipGroups(relationships);
  for (const group of groups.values()) {
    group.sort(compareAdjustedRedundancy);
    group.forEach((relationship, index) => {
      relationship.redundancyRank = index + 1;
      relationship.adjustedMarginalValue =
        index === 0
          ? relationship.adjustedBaseValue
          : index === 1
            ? relationship.adjustedBaseValue / 2
            : 0;
    });
  }
}

function evaluateRelationshipCandidate({
  candidate,
  componentsById,
  bindingsBySignalId,
  reliabilityProgression,
}: {
  candidate: EnrichedRelationshipCandidate;
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>;
  bindingsBySignalId: ReadonlyMap<string, SignalReliabilityBinding>;
  reliabilityProgression: Readonly<Record<string, ReliabilityProgression | undefined>>;
}): EvaluatedCandidate {
  const providerBinding = bindingsBySignalId.get(candidate.providerSignalId);
  const beneficiaryBinding = bindingsBySignalId.get(candidate.beneficiarySignalId);
  const provider = providerBinding
    ? evaluateBindingReliability({
        binding: providerBinding,
        componentsById,
        progression: progressionFor(reliabilityProgression, candidate.providerDragonId),
      })
    : emptyBindingTrace(candidate.providerSignalId);
  const preliminaryBeneficiary = beneficiaryBinding
    ? evaluateBindingReliability({
        binding: beneficiaryBinding,
        componentsById,
        progression: progressionFor(reliabilityProgression, candidate.beneficiaryDragonId),
      })
    : emptyBindingTrace(candidate.beneficiarySignalId);
  const beneficiaryProofIds = beneficiaryBinding
    ? setupPayoffConditionProofRequirementIds(
        candidate,
        beneficiaryBinding,
        componentsById,
        preliminaryBeneficiary,
      )
    : new Set<string>();
  const beneficiary =
    beneficiaryBinding && beneficiaryProofIds.size > 0
      ? evaluateBindingReliability({
          binding: beneficiaryBinding,
          componentsById,
          progression: progressionFor(reliabilityProgression, candidate.beneficiaryDragonId),
          conditionProvenRequirementIds: beneficiaryProofIds,
        })
      : preliminaryBeneficiary;
  const combined = combineProviderBeneficiaryRequirements(provider, beneficiary);
  const quantification = combined.quantification;
  const relationshipClass = classifyRelationship(candidate);
  const baseValue = baseValues[relationshipClass];
  return {
    relationshipId: semanticRelationshipId(
      candidate.providerDragonId,
      canonicalSemanticTag(candidate.semanticTag),
      candidate.beneficiaryDragonId,
    ),
    relationshipClass,
    baseValue,
    adjustedBaseValue:
      quantification.status === 'quantified' ? baseValue * quantification.reliability : 0,
    trace: {
      candidate,
      provider,
      beneficiary,
      componentIds: unique([...provider.componentIds, ...beneficiary.componentIds]),
      eventIds: unique([...provider.eventIds, ...beneficiary.eventIds]),
      probabilityVariantIds: unique([
        ...provider.probabilityVariantIds,
        ...beneficiary.probabilityVariantIds,
      ]),
      sharedRequirementIds: combined.sharedRequirementIds,
      quantification,
    },
  };
}

export function combineProviderBeneficiaryReliability(
  provider: BindingReliabilityTrace,
  beneficiary: BindingReliabilityTrace,
): ReliabilityQuantification {
  return combineProviderBeneficiaryRequirements(provider, beneficiary).quantification;
}

function combineProviderBeneficiaryRequirements(
  provider: BindingReliabilityTrace,
  beneficiary: BindingReliabilityTrace,
): {
  quantification: ReliabilityQuantification;
  sharedRequirementIds: string[];
} {
  const providerRequirements = requirementMap(provider.selectedComponentTraces);
  const beneficiaryRequirements = requirementMap(beneficiary.selectedComponentTraces);
  const sharedRequirementIds = [...providerRequirements.keys()]
    .filter((id) => beneficiaryRequirements.has(id))
    .sort();
  if (sharedRequirementIds.length === 0) {
    return {
      quantification: combineDistinctBindingReliability(provider, beneficiary),
      sharedRequirementIds,
    };
  }

  const requirements = new Map(providerRequirements);
  for (const [id, beneficiaryTrace] of beneficiaryRequirements) {
    const providerTrace = requirements.get(id);
    if (!providerTrace) {
      requirements.set(id, beneficiaryTrace);
      continue;
    }
    if (
      providerTrace.quantification.status === 'quantified' &&
      beneficiaryTrace.quantification.status === 'quantified' &&
      Math.abs(
        providerTrace.quantification.reliability - beneficiaryTrace.quantification.reliability,
      ) > 1e-12
    ) {
      return {
        quantification: unquantified(
          'conflicting-shared-event-probabilities',
          'Provider and beneficiary describe one shared requirement with conflicting probabilities.',
          [providerTrace.quantification.reliability, beneficiaryTrace.quantification.reliability],
        ),
        sharedRequirementIds,
      };
    }
    if (
      providerTrace.quantification.status === 'quantified' &&
      beneficiaryTrace.quantification.status === 'unquantified'
    ) {
      requirements.set(id, beneficiaryTrace);
    }
  }

  const eventRequirements = new Map<string, ComponentReliabilityTrace[]>();
  for (const trace of requirements.values()) {
    const eventId = trace.eventId ?? `component:${trace.componentId}`;
    const group = eventRequirements.get(eventId) ?? [];
    group.push(trace);
    eventRequirements.set(eventId, group);
  }

  const eventQuantifications = [...eventRequirements.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, traces]) => evaluateJointEventRequirements(traces));
  const unresolved = eventQuantifications.find(
    (quantification) => quantification.status === 'unquantified',
  );
  if (unresolved) {
    return { quantification: unresolved, sharedRequirementIds };
  }
  const chanceEvents = eventQuantifications.filter(
    (
      quantification,
    ): quantification is Extract<ReliabilityQuantification, { status: 'quantified' }> =>
      quantification.status === 'quantified' && quantification.reliability < 1,
  );
  if (chanceEvents.length > 1) {
    return {
      quantification: unquantified(
        'joint-chance-behavior-unresolved',
        'Distinct jointly required chance events have no supported joint activation model.',
        chanceEvents.map((event) => event.reliability),
      ),
      sharedRequirementIds,
    };
  }
  if (chanceEvents.length === 1) {
    return {
      quantification: quantified(
        chanceEvents[0]!.reliability,
        'shared-event',
        'Exact shared activation requirements are discounted once; all other requirements remain supported.',
      ),
      sharedRequirementIds,
    };
  }
  return {
    quantification: quantified(
      1,
      'shared-event',
      'Exact shared activation requirements and all additional requirements are deterministic.',
    ),
    sharedRequirementIds,
  };
}

function combineDistinctBindingReliability(
  provider: BindingReliabilityTrace,
  beneficiary: BindingReliabilityTrace,
): ReliabilityQuantification {
  const left = provider.quantification;
  const right = beneficiary.quantification;
  if (left.status === 'unquantified') return left;
  if (right.status === 'unquantified') return right;
  if (left.reliability === 1) return right;
  if (right.reliability === 1) return left;
  return unquantified(
    'joint-chance-behavior-unresolved',
    'Distinct chance setup and payoff events have no supported joint activation model.',
    [left.reliability, right.reliability],
  );
}

export function setupPayoffConditionProofRequirementIds(
  candidate: EnrichedRelationshipCandidate,
  binding: SignalReliabilityBinding,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
  selectedBindingTrace?: BindingReliabilityTrace,
): Set<string> {
  if (
    candidate.resultKind !== 'setup-payoff' ||
    candidate.beneficiarySignalCategory !== 'benefits-from'
  ) {
    return new Set();
  }
  const visits = reliabilityBindingPathVisits(binding);
  const conditionalRequirementIds = conditionalRequirementIdsInVisits(visits, componentsById);
  if (conditionalRequirementIds.length === 1) {
    return new Set(conditionalRequirementIds);
  }
  if (!selectedBindingTrace?.selectedPathId) return new Set();
  const selectedVisits = visits.filter(
    ({ path, useId }) =>
      path.pathId === selectedBindingTrace.selectedPathId &&
      (selectedBindingTrace.selectedUseId === undefined ||
        useId === selectedBindingTrace.selectedUseId),
  );
  const selectedConditionalRequirementIds = conditionalRequirementIdsInVisits(
    selectedVisits,
    componentsById,
  );
  return selectedConditionalRequirementIds.length === 1
    ? new Set(selectedConditionalRequirementIds)
    : new Set();
}

function conditionalRequirementIdsInVisits(
  visits: ReturnType<typeof reliabilityBindingPathVisits>,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
): string[] {
  return unique(
    visits.flatMap(({ path }) =>
      path.events.flatMap((event) =>
        event.componentReferences.flatMap((reference) =>
          componentsById.get(reference.componentId)?.reliabilityClass ===
          'conditional-deterministic'
            ? [reliabilityRequirementId(event, reference)]
            : [],
        ),
      ),
    ),
  );
}

function requirementMap(
  traces: readonly ComponentReliabilityTrace[],
): Map<string, ComponentReliabilityTrace> {
  return new Map(
    [...traces]
      .sort((left, right) => requirementId(left).localeCompare(requirementId(right)))
      .map((trace) => [requirementId(trace), trace]),
  );
}

function requirementId(trace: ComponentReliabilityTrace): string {
  return [trace.eventId ?? '', trace.componentId, trace.probabilityVariantId ?? ''].join('|');
}

function evaluateJointEventRequirements(
  traces: readonly ComponentReliabilityTrace[],
): ReliabilityQuantification {
  const unresolved = traces.find((trace) => trace.quantification.status === 'unquantified');
  if (unresolved) return unresolved.quantification;
  const chanceProbabilities = uniqueNumbers(
    traces.flatMap((trace) =>
      trace.quantification.status === 'quantified' && trace.quantification.reliability < 1
        ? [trace.quantification.reliability]
        : [],
    ),
  );
  if (chanceProbabilities.length > 1) {
    return unquantified(
      'conflicting-shared-event-probabilities',
      'One activation event has conflicting documented probabilities.',
      chanceProbabilities,
    );
  }
  return chanceProbabilities.length === 1
    ? quantified(
        chanceProbabilities[0]!,
        'shared-event',
        'Components in the event share one activation identity.',
      )
    : quantified(
        1,
        'guaranteed',
        'Every requirement in the event is deterministic or condition-proven.',
      );
}

function compareRelationshipCandidates(
  left: EvaluatedCandidate,
  right: EvaluatedCandidate,
): number {
  const leftQuantified = left.trace.quantification.status === 'quantified';
  const rightQuantified = right.trace.quantification.status === 'quantified';
  const leftReliability =
    left.trace.quantification.status === 'quantified' ? left.trace.quantification.reliability : -1;
  const rightReliability =
    right.trace.quantification.status === 'quantified'
      ? right.trace.quantification.reliability
      : -1;
  return (
    Number(rightReliability === 1) - Number(leftReliability === 1) ||
    right.adjustedBaseValue - left.adjustedBaseValue ||
    Number(rightQuantified) - Number(leftQuantified) ||
    rightReliability - leftReliability ||
    right.baseValue - left.baseValue ||
    left.relationshipClass.localeCompare(right.relationshipClass) ||
    left.trace.candidate.providerSignalId.localeCompare(right.trace.candidate.providerSignalId) ||
    left.trace.candidate.beneficiarySignalId.localeCompare(
      right.trace.candidate.beneficiarySignalId,
    ) ||
    left.trace.componentIds.join(':').localeCompare(right.trace.componentIds.join(':')) ||
    left.trace.candidate.id.localeCompare(right.trace.candidate.id)
  );
}

function compareAdjustedRedundancy(
  left: FormationRelationshipV3,
  right: FormationRelationshipV3,
): number {
  const leftQuantified = left.quantification.status === 'quantified';
  const rightQuantified = right.quantification.status === 'quantified';
  const leftReliability =
    left.quantification.status === 'quantified' ? left.quantification.reliability : -1;
  const rightReliability =
    right.quantification.status === 'quantified' ? right.quantification.reliability : -1;
  return (
    right.adjustedBaseValue - left.adjustedBaseValue ||
    Number(rightQuantified) - Number(leftQuantified) ||
    rightReliability - leftReliability ||
    right.baseValue - left.baseValue ||
    left.providerDragonId.localeCompare(right.providerDragonId) ||
    left.selectedProviderSignalId.localeCompare(right.selectedProviderSignalId) ||
    left.selectedBeneficiarySignalId.localeCompare(right.selectedBeneficiarySignalId) ||
    left.componentIds.join(':').localeCompare(right.componentIds.join(':')) ||
    left.eventIds.join(':').localeCompare(right.eventIds.join(':')) ||
    left.id.localeCompare(right.id)
  );
}

function applyV2ComparableMarginals(relationships: FormationRelationshipV3[]): void {
  for (const group of relationshipGroups(relationships).values()) {
    [...group]
      .sort(
        (left, right) =>
          right.baseValue - left.baseValue ||
          left.providerDragonId.localeCompare(right.providerDragonId) ||
          left.selectedProviderSignalId.localeCompare(right.selectedProviderSignalId) ||
          left.id.localeCompare(right.id),
      )
      .forEach((relationship, index) => {
        relationship.v2ComparableBaseMarginalValue =
          index === 0 ? relationship.baseValue : index === 1 ? relationship.baseValue / 2 : 0;
      });
  }
}

function relationshipGroups(
  relationships: FormationRelationshipV3[],
): Map<string, FormationRelationshipV3[]> {
  const groups = new Map<string, FormationRelationshipV3[]>();
  for (const relationship of relationships) {
    const key = [
      relationship.beneficiaryDragonId,
      relationship.semanticTag,
      relationship.relationshipClass,
    ].join(':');
    const group = groups.get(key) ?? [];
    group.push(relationship);
    groups.set(key, group);
  }
  return groups;
}

function classifyRelationship(candidate: EnrichedRelationshipCandidate): SemanticRelationshipClass {
  if (candidate.resultKind === 'setup-payoff') return 'conditional-payoff';
  return candidate.semanticTag.startsWith('stat:') ? 'stat-support' : 'output-amplification';
}

function candidateSelectionReason(
  selected: EvaluatedCandidate,
  candidates: readonly EvaluatedCandidate[],
): string {
  if (candidates.length === 1) return 'Only active candidate for this semantic relationship.';
  if (
    selected.trace.quantification.status === 'quantified' &&
    selected.trace.quantification.reliability === 1
  ) {
    return 'A fully reliable candidate outranks chance and unquantified alternatives.';
  }
  if (selected.trace.quantification.status === 'quantified') {
    return 'Highest evidence-backed adjusted base value under deterministic tie-breaking.';
  }
  return 'No candidate is quantified; deterministic base and identity ordering selected the trace.';
}

function progressionFor(
  progression: Readonly<Record<string, ReliabilityProgression | undefined>>,
  dragonId: string,
): ReliabilityProgression {
  return (
    progression[dragonId] ?? {
      starRank: null,
      dragonLevel: null,
      activeHabitLevels: {},
    }
  );
}

function emptyBindingTrace(signalId: string): BindingReliabilityTrace {
  const quantification = unquantified(
    'no-supported-path',
    `No production reliability binding exists for signal "${signalId}".`,
  );
  return {
    signalId,
    pathIds: [],
    useIds: [],
    componentIds: [],
    eventIds: [],
    probabilityVariantIds: [],
    componentTraces: [],
    selectedComponentTraces: [],
    alternativeQuantifications: [],
    quantification,
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function quantified(
  reliability: number,
  method: Extract<ReliabilityQuantification, { status: 'quantified' }>['method'],
  explanation: string,
): ReliabilityQuantification {
  return { status: 'quantified', reliability, method, explanation };
}

function unquantified(
  reason: Extract<ReliabilityQuantification, { status: 'unquantified' }>['reason'],
  explanation: string,
  conditionalProbabilities?: readonly number[],
): ReliabilityQuantification {
  return conditionalProbabilities?.length
    ? { status: 'unquantified', reason, explanation, conditionalProbabilities }
    : { status: 'unquantified', reason, explanation };
}
