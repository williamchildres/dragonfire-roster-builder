import type {
  AbilityReliabilityComponent,
  ReliabilityEventRequirement,
  ReliabilityProgression,
  SignalReliabilityBinding,
  SignalReliabilityPath,
} from '../types';
import { evaluateComponentReliability } from './componentReliability';
import type {
  BindingReliabilityTrace,
  ComponentReliabilityTrace,
  ReliabilityQuantification,
} from './types';

export interface EvaluateBindingReliabilityInput {
  binding: SignalReliabilityBinding;
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>;
  progression: ReliabilityProgression;
  conditionProvenRequirementIds?: ReadonlySet<string>;
  probabilityContextId?: string;
}

interface EvaluatedPath {
  path: SignalReliabilityPath;
  componentTraces: ComponentReliabilityTrace[];
  eventIds: string[];
  quantification: ReliabilityQuantification;
}

export function evaluateBindingReliability({
  binding,
  componentsById,
  progression,
  conditionProvenRequirementIds = new Set(),
  probabilityContextId,
}: EvaluateBindingReliabilityInput): BindingReliabilityTrace {
  if (binding.status === 'unresolved-mixed') {
    return bindingTrace(
      binding.signalId,
      undefined,
      [],
      binding.candidatePaths.map((path) => path.pathId),
      [],
      [],
      [],
      [],
      [],
      [],
      unquantified(
        'no-supported-path',
        binding.unresolvedReason || 'The mixed binding remains unresolved.',
      ),
      undefined,
      undefined,
      probabilityContextId,
    );
  }

  if (binding.bindingClass === 'resolved-mixed') {
    const evaluatedUses = binding.uses.map((use) => {
      const paths = use.paths.map((path) =>
        evaluatePath(path, componentsById, progression, conditionProvenRequirementIds),
      );
      return {
        useId: use.useId,
        paths,
        quantification: evaluateAlternatives(paths, probabilityContextId),
      };
    });
    const quantifiedUses = evaluatedUses.filter(
      (
        use,
      ): use is typeof use & {
        quantification: Extract<ReliabilityQuantification, { status: 'quantified' }>;
      } => use.quantification.status === 'quantified',
    );
    const bestUse = [...quantifiedUses].sort(
      (left, right) =>
        right.quantification.reliability - left.quantification.reliability ||
        left.useId.localeCompare(right.useId),
    )[0];
    const quantification: ReliabilityQuantification = bestUse
      ? quantified(
          bestUse.quantification.reliability,
          'mixed-use-lower-bound',
          bestUse.quantification.reliability === 1
            ? 'A simultaneous use is fully supported; the relationship is not discounted.'
            : 'The strongest independently supported simultaneous use supplies a lower bound.',
        )
      : firstUnquantified(
          evaluatedUses.map((use) => use.quantification),
          'No mixed use has a supported unconditional reliability.',
        );
    const paths = evaluatedUses.flatMap((use) => use.paths);
    const selectedPath = bestUse ? selectBestPath(bestUse.paths, probabilityContextId) : undefined;
    return bindingTrace(
      binding.signalId,
      binding.bindingClass,
      paths,
      paths.map((entry) => entry.path.pathId),
      evaluatedUses.map((use) => use.useId),
      componentIds(paths),
      eventIds(paths),
      probabilityVariantIds(paths),
      evaluatedUses.map((use) => use.quantification),
      selectedPath?.componentTraces ?? [],
      quantification,
      bestUse?.useId,
      selectedPath?.path.pathId,
      probabilityContextId,
    );
  }

  const paths = binding.paths.map((path) =>
    evaluatePath(path, componentsById, progression, conditionProvenRequirementIds),
  );
  const quantification = evaluateAlternatives(paths, probabilityContextId);
  const selectedPath = selectBestPath(paths, probabilityContextId);
  return bindingTrace(
    binding.signalId,
    binding.bindingClass,
    paths,
    paths.map((entry) => entry.path.pathId),
    [],
    componentIds(paths),
    eventIds(paths),
    probabilityVariantIds(paths),
    paths.map((path) => path.quantification),
    selectedPath?.componentTraces ?? [],
    quantification,
    undefined,
    selectedPath?.path.pathId,
    probabilityContextId,
  );
}

export function evaluateReliabilityPath(
  path: SignalReliabilityPath,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
  progression: ReliabilityProgression,
  conditionProvenRequirementIds: ReadonlySet<string> = new Set(),
): ReliabilityQuantification {
  return evaluatePath(path, componentsById, progression, conditionProvenRequirementIds)
    .quantification;
}

function evaluatePath(
  path: SignalReliabilityPath,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
  progression: ReliabilityProgression,
  conditionProvenRequirementIds: ReadonlySet<string>,
): EvaluatedPath {
  const precedingChanceEventIds = new Set<string>();
  const eventResults = path.events.map((event) => {
    const result = evaluateEvent(
      event,
      componentsById,
      progression,
      conditionProvenRequirementIds,
      precedingChanceEventIds,
    );
    if (
      event.componentReferences.some(
        (reference) => componentsById.get(reference.componentId)?.reliabilityClass === 'chance',
      )
    ) {
      precedingChanceEventIds.add(event.eventId);
    }
    return result;
  });
  const unquantifiedEvent = eventResults.find(
    (event) => event.quantification.status === 'unquantified',
  );
  const chanceEvents = eventResults.filter(
    (
      event,
    ): event is typeof event & {
      quantification: Extract<ReliabilityQuantification, { status: 'quantified' }>;
    } => event.quantification.status === 'quantified' && event.quantification.reliability < 1,
  );
  let quantification: ReliabilityQuantification;
  if (unquantifiedEvent) {
    quantification = unquantifiedEvent.quantification;
  } else if (chanceEvents.length > 1) {
    quantification = unquantified(
      'joint-chance-behavior-unresolved',
      'Distinct jointly required chance events have no supported joint model.',
      chanceEvents.map((event) => event.quantification.reliability),
    );
  } else if (chanceEvents.length === 1) {
    quantification = chanceEvents[0]!.quantification;
  } else {
    quantification = quantified(
      1,
      'guaranteed',
      'Every jointly required event is guaranteed or statically proven.',
    );
  }
  return {
    path,
    eventIds: eventResults.map((event) => event.eventId),
    componentTraces: eventResults.flatMap((event) => event.componentTraces),
    quantification,
  };
}

function evaluateEvent(
  event: ReliabilityEventRequirement,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
  progression: ReliabilityProgression,
  conditionProvenRequirementIds: ReadonlySet<string>,
  precedingChanceEventIds: ReadonlySet<string>,
): {
  eventId: string;
  componentTraces: ComponentReliabilityTrace[];
  quantification: ReliabilityQuantification;
} {
  const seen = new Set<string>();
  const componentTraces = event.componentReferences.flatMap((reference) => {
    const key = `${reference.componentId}:${reference.probabilityVariantId ?? ''}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const component = componentsById.get(reference.componentId);
    if (!component) return [];
    const conditionProven =
      conditionProvenRequirementIds.has(reliabilityRequirementId(event, reference)) ||
      (component.reliabilityClass === 'conditional-deterministic' &&
        component.timing.kind === 'after-event' &&
        precedingChanceEventIds.has(component.timing.sourceEvent));
    return [
      {
        ...evaluateComponentReliability({
          component,
          reference,
          progression,
          conditionProven,
        }),
        eventId: event.eventId,
      },
    ];
  });
  const unquantifiedTrace = componentTraces.find(
    (trace) => trace.quantification.status === 'unquantified',
  );
  const chanceTraces = componentTraces.filter(
    (
      trace,
    ): trace is typeof trace & {
      quantification: Extract<ReliabilityQuantification, { status: 'quantified' }>;
    } => trace.quantification.status === 'quantified' && trace.quantification.reliability < 1,
  );
  let quantification: ReliabilityQuantification;
  if (unquantifiedTrace) {
    quantification = unquantifiedTrace.quantification;
  } else if (chanceTraces.length === 0) {
    quantification = quantified(
      1,
      'guaranteed',
      'The shared activation event is guaranteed or proven.',
    );
  } else {
    const probabilities = [
      ...new Set(chanceTraces.map((trace) => trace.quantification.reliability)),
    ];
    quantification =
      chanceTraces.length === 1
        ? chanceTraces[0]!.quantification
        : probabilities.length === 1
          ? quantified(
              probabilities[0]!,
              'shared-event',
              'All effects in the event share one activation identity.',
            )
          : unquantified(
              'conflicting-shared-event-probabilities',
              'One shared event has conflicting documented activation probabilities.',
              probabilities,
            );
  }
  return { eventId: event.eventId, componentTraces, quantification };
}

export function reliabilityRequirementId(
  event: Pick<ReliabilityEventRequirement, 'eventId'>,
  reference: {
    componentId: string;
    probabilityVariantId?: string;
  },
): string {
  return [event.eventId, reference.componentId, reference.probabilityVariantId ?? ''].join('|');
}

function evaluateAlternatives(
  paths: readonly EvaluatedPath[],
  probabilityContextId?: string,
): ReliabilityQuantification {
  if (paths.length === 0) {
    return unquantified('no-supported-path', 'The binding has no evaluable path.');
  }
  const applicablePaths = applicableAlternativePaths(paths, probabilityContextId);
  const contextPaths = applicablePaths
    .filter((path) => path.path.appliesWhen?.kind === 'probability-context')
    .sort((left, right) => left.path.pathId.localeCompare(right.path.pathId));
  if (!probabilityContextId && contextPaths.length > 1) {
    return unquantified(
      'probability-context-unresolved',
      'Several documented probability contexts apply and none was selected.',
      contextPaths.flatMap((path) =>
        path.quantification.status === 'quantified'
          ? [path.quantification.reliability]
          : (path.quantification.conditionalProbabilities ?? []),
      ),
    );
  }
  const quantifiedPaths = applicablePaths.filter(
    (
      path,
    ): path is EvaluatedPath & {
      quantification: Extract<ReliabilityQuantification, { status: 'quantified' }>;
    } => path.quantification.status === 'quantified',
  );
  const best = [...quantifiedPaths].sort(
    (left, right) =>
      right.quantification.reliability - left.quantification.reliability ||
      left.path.pathId.localeCompare(right.path.pathId),
  )[0];
  if (best) {
    return applicablePaths.length === 1
      ? best.quantification
      : quantified(
          best.quantification.reliability,
          'best-supported-alternative',
          'The strongest supported alternative supplies a conservative lower bound.',
        );
  }
  return firstUnquantified(
    applicablePaths.map((path) => path.quantification),
    'No alternative path has a supported unconditional reliability.',
  );
}

function selectBestPath(
  paths: readonly EvaluatedPath[],
  probabilityContextId?: string,
): EvaluatedPath | undefined {
  const applicable = applicableAlternativePaths(paths, probabilityContextId);
  if (
    !probabilityContextId &&
    applicable.filter((path) => path.path.appliesWhen?.kind === 'probability-context').length > 1
  ) {
    return undefined;
  }
  return [...applicable].sort((left, right) => {
    const leftValue =
      left.quantification.status === 'quantified' ? left.quantification.reliability : -1;
    const rightValue =
      right.quantification.status === 'quantified' ? right.quantification.reliability : -1;
    return rightValue - leftValue || left.path.pathId.localeCompare(right.path.pathId);
  })[0];
}

function applicableAlternativePaths(
  paths: readonly EvaluatedPath[],
  probabilityContextId?: string,
): readonly EvaluatedPath[] {
  if (!probabilityContextId) return paths;
  const contextualPaths = paths.filter(
    (path) => path.path.appliesWhen?.kind === 'probability-context',
  );
  if (contextualPaths.length === 0) return paths;
  return contextualPaths.filter((path) => path.path.appliesWhen?.id === probabilityContextId);
}

function bindingTrace(
  signalId: string,
  bindingClass: string | undefined,
  paths: readonly EvaluatedPath[],
  pathIds: readonly string[],
  useIds: readonly string[],
  referencedComponentIds: readonly string[],
  referencedEventIds: readonly string[],
  referencedProbabilityVariantIds: readonly string[],
  alternativeQuantifications: readonly ReliabilityQuantification[],
  selectedComponentTraces: readonly ComponentReliabilityTrace[],
  quantification: ReliabilityQuantification,
  selectedUseId?: string,
  selectedPathId?: string,
  selectedProbabilityContextId?: string,
): BindingReliabilityTrace {
  return {
    signalId,
    bindingClass,
    selectedPathId,
    selectedUseId,
    selectedProbabilityContextId,
    pathIds: [...pathIds].sort(),
    useIds: [...useIds].sort(),
    componentIds: [...referencedComponentIds].sort(),
    eventIds: [...referencedEventIds].sort(),
    probabilityVariantIds: [...referencedProbabilityVariantIds].sort(),
    componentTraces: paths
      .flatMap((path) => path.componentTraces)
      .sort(
        (left, right) =>
          left.componentId.localeCompare(right.componentId) ||
          (left.eventId ?? '').localeCompare(right.eventId ?? ''),
      ),
    selectedComponentTraces: [...selectedComponentTraces].sort(
      (left, right) =>
        (left.eventId ?? '').localeCompare(right.eventId ?? '') ||
        left.componentId.localeCompare(right.componentId) ||
        (left.probabilityVariantId ?? '').localeCompare(right.probabilityVariantId ?? ''),
    ),
    alternativeQuantifications,
    quantification,
  };
}

function componentIds(paths: readonly EvaluatedPath[]): string[] {
  return unique(paths.flatMap((path) => path.componentTraces.map((trace) => trace.componentId)));
}

function eventIds(paths: readonly EvaluatedPath[]): string[] {
  return unique(paths.flatMap((path) => path.eventIds));
}

function probabilityVariantIds(paths: readonly EvaluatedPath[]): string[] {
  return unique(
    paths.flatMap((path) =>
      path.componentTraces.flatMap((trace) =>
        trace.probabilityVariantId ? [trace.probabilityVariantId] : [],
      ),
    ),
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function firstUnquantified(
  quantifications: readonly ReliabilityQuantification[],
  fallbackExplanation: string,
): ReliabilityQuantification {
  return (
    quantifications.find((candidate) => candidate.status === 'unquantified') ??
    unquantified('no-supported-path', fallbackExplanation)
  );
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
