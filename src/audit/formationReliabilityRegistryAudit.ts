import { createHash } from 'node:crypto';

import {
  runFormationReliabilityAudit,
  type FormationReliabilityAuditSignal,
} from './formationReliabilityAudit';
import {
  FORMATION_RELIABILITY_CONTRACT_VERSION,
  collectReliabilityProbabilityHabitAbilityIds,
  formationReliabilityAbilityCatalog,
  formationReliabilityBindings,
  formationReliabilityComponents,
  formationReliabilityContractInput,
  formationReliabilityNonScoringSignalIds,
  formationReliabilityPositionClaimIds,
  formationReliabilityScoringSignalIds,
  reliabilityBindingPathVisits,
  validateReliabilityContract,
  type AbilityReliabilityComponent,
  type ReliabilityProbability,
  type SignalReliabilityBinding,
} from '../synergy/reliability';

export const FORMATION_RELIABILITY_REGISTRY_AUDIT_VERSION =
  'formation-reliability-registry-audit-v1' as const;

export interface FormationReliabilityRegistryParityDifference {
  kind: string;
  signalIds: readonly string[];
  explanation: string;
}

export interface FormationReliabilityRegistryAuditReport {
  auditVersion: typeof FORMATION_RELIABILITY_REGISTRY_AUDIT_VERSION;
  contractVersion: number;
  counts: {
    dragonsCovered: number;
    currentScoringSignals: number;
    currentNonScoringSignals: number;
    positionClaimsExcluded: number;
    components: number;
    bindings: number;
    guaranteedBindings: number;
    conditionalDeterministicBindings: number;
    chanceBindings: number;
    resolvedMixedBindings: number;
    componentsWithFixedProbability: number;
    componentsWithDirectHabitProbability: number;
    componentsWithHabitOverride: number;
    componentsWithRoundSpecificProbability: number;
    componentsWithVariantProbability: number;
    bindingsWithFixedProbability: number;
    bindingsWithDirectHabitProbability: number;
    bindingsWithHabitOverride: number;
    bindingsWithRoundSpecificProbability: number;
    bindingsWithVariantProbability: number;
    guaranteedOpportunityPresence: number;
    conditionalOpportunityPresence: number;
    unknownOpportunityPresence: number;
    unresolvedOpportunityCounts: number;
    unresolvedIndependence: number;
    missingBindings: number;
    staleBindings: number;
    duplicateBindings: number;
    unreferencedComponents: number;
    unresolvedMixedBindings: number;
    researchParityDifferences: number;
    researchParityIssues: number;
  };
  missingBindingIds: readonly string[];
  staleBindingIds: readonly string[];
  unreferencedComponentIds: readonly string[];
  unresolvedMixedBindingIds: readonly string[];
  researchParityDifferences: readonly FormationReliabilityRegistryParityDifference[];
  researchParityIssues: readonly string[];
  deterministicRegistryHash: string;
}

const allowedComponentIdMigrationSignalIds = new Set([
  'arulix-hypnotic-helix-overwhelm',
  'arulix-hypnotic-helix-stagger',
  'bevlorin-bountiful-gifts-initiative',
  'bevlorin-bountiful-gifts-instinct',
  'bevlorin-bountiful-gifts-intelligence',
  'bevlorin-bountiful-gifts-strength',
  'caraxes-crippling-inferno-burn',
  'caraxes-crippling-inferno-fire',
  'caraxes-crippling-inferno-slow',
  'shadowsong-panic-payoff',
  'shimmer-unbreakable-loyalty-instinct-payoff',
  'vaeldra-tempting-distraction-vulnerability',
  'velar-gales-of-power-first-strike',
  'velar-gales-of-power-slow',
  'zivern-battle-mastery-intelligence-payoff',
  'zivern-battle-mastery-physical',
]);

export function runFormationReliabilityRegistryAudit(): FormationReliabilityRegistryAuditReport {
  const historical = runFormationReliabilityAudit();
  const validationIssues = validateReliabilityContract(
    formationReliabilityContractInput,
    'full-migration',
  );
  const componentsById = new Map(
    formationReliabilityComponents.map((component) => [component.id, component]),
  );
  const bindingsBySignalId = new Map(
    formationReliabilityBindings.map((binding) => [binding.signalId, binding]),
  );
  const referencedComponentIds = new Set(formationReliabilityBindings.flatMap(bindingComponentIds));
  const scoringSignalIds = new Set(formationReliabilityScoringSignalIds);
  const missingBindingIds = formationReliabilityScoringSignalIds.filter(
    (signalId) => !bindingsBySignalId.has(signalId),
  );
  const staleBindingIds = formationReliabilityBindings
    .filter((binding) => !scoringSignalIds.has(binding.signalId))
    .map((binding) => binding.signalId)
    .sort();
  const unreferencedComponentIds = formationReliabilityComponents
    .filter((component) => !referencedComponentIds.has(component.id))
    .map((component) => component.id)
    .sort();
  const unresolvedMixedBindingIds = formationReliabilityBindings
    .filter((binding) => binding.status === 'unresolved-mixed')
    .map((binding) => binding.signalId)
    .sort();
  const { differences, issues } = reconcileResearch(
    historical.signals.filter(
      (signal) => signal.classification !== 'not-applicable-to-activation-reliability',
    ),
    bindingsBySignalId,
    componentsById,
  );

  const componentProbabilityKinds = new Map(
    formationReliabilityComponents.map((component) => [
      component.id,
      probabilityKinds(component.probability),
    ]),
  );
  const bindingComponentsBySignalId = new Map(
    formationReliabilityBindings.map((binding) => [
      binding.signalId,
      bindingComponents(binding, componentsById),
    ]),
  );
  const bindingProbabilityKinds = new Map(
    formationReliabilityBindings.map((binding) => [
      binding.signalId,
      bindingTopLevelProbabilityKinds(binding, bindingComponentsBySignalId.get(binding.signalId)!),
    ]),
  );
  const abilityById = new Map(
    formationReliabilityAbilityCatalog.map((ability) => [ability.abilityId, ability]),
  );
  const dragonsCovered = new Set(
    formationReliabilityComponents.map(
      (component) => abilityById.get(component.sourceAbilityId)?.dragonId,
    ),
  );
  dragonsCovered.delete(undefined);

  const reportWithoutHash = {
    auditVersion: FORMATION_RELIABILITY_REGISTRY_AUDIT_VERSION,
    contractVersion: FORMATION_RELIABILITY_CONTRACT_VERSION,
    counts: {
      dragonsCovered: dragonsCovered.size,
      currentScoringSignals: formationReliabilityScoringSignalIds.length,
      currentNonScoringSignals: formationReliabilityNonScoringSignalIds.length,
      positionClaimsExcluded: formationReliabilityPositionClaimIds.length,
      components: formationReliabilityComponents.length,
      bindings: formationReliabilityBindings.length,
      guaranteedBindings: countBindingClass('guaranteed'),
      conditionalDeterministicBindings: countBindingClass('conditional-deterministic'),
      chanceBindings: countBindingClass('chance'),
      resolvedMixedBindings: countBindingClass('resolved-mixed'),
      componentsWithFixedProbability: countProbabilityKind('fixed'),
      componentsWithDirectHabitProbability: countProbabilityKind('habit-level'),
      componentsWithHabitOverride: countProbabilityKind('habit-override'),
      componentsWithRoundSpecificProbability: countProbabilityKind('round-specific'),
      componentsWithVariantProbability: countProbabilityKind('variants'),
      bindingsWithFixedProbability: countBindingProbabilityKind('fixed'),
      bindingsWithDirectHabitProbability: countBindingProbabilityKind('habit-level'),
      bindingsWithHabitOverride: formationReliabilityBindings.filter(
        (binding) =>
          binding.status === 'resolved' &&
          binding.bindingClass === 'chance' &&
          bindingComponentsBySignalId
            .get(binding.signalId)!
            .some((component) => probabilityKinds(component.probability).has('habit-override')),
      ).length,
      bindingsWithRoundSpecificProbability: countBindingProbabilityKind('round-specific'),
      bindingsWithVariantProbability: countBindingProbabilityKind('variants'),
      guaranteedOpportunityPresence: countBindingOpportunityPresence('guaranteed-at-least-one'),
      conditionalOpportunityPresence: countBindingOpportunityPresence('conditional'),
      unknownOpportunityPresence: countBindingOpportunityPresence('unknown'),
      unresolvedOpportunityCounts: formationReliabilityBindings.filter(
        (binding) =>
          binding.status === 'resolved' &&
          binding.bindingClass === 'chance' &&
          bindingComponentsBySignalId
            .get(binding.signalId)!
            .some(
              (component) =>
                (component.reliabilityClass === 'chance' ||
                  component.reliabilityClass === 'unknown') &&
                component.opportunityCount.kind !== 'exact' &&
                component.opportunityCount.kind !== 'not-applicable',
            ),
      ).length,
      unresolvedIndependence: formationReliabilityBindings.filter(
        (binding) =>
          binding.status === 'resolved' &&
          binding.bindingClass === 'chance' &&
          bindingComponentsBySignalId
            .get(binding.signalId)!
            .some(
              (component) =>
                (component.reliabilityClass === 'chance' ||
                  component.reliabilityClass === 'unknown') &&
                component.independence === 'unknown',
            ),
      ).length,
      missingBindings: missingBindingIds.length,
      staleBindings: staleBindingIds.length,
      duplicateBindings: validationIssues.filter(
        (issue) => issue.code === 'binding.duplicate-signal',
      ).length,
      unreferencedComponents: unreferencedComponentIds.length,
      unresolvedMixedBindings: unresolvedMixedBindingIds.length,
      researchParityDifferences: differences.length,
      researchParityIssues: issues.length,
    },
    missingBindingIds,
    staleBindingIds,
    unreferencedComponentIds,
    unresolvedMixedBindingIds,
    researchParityDifferences: differences,
    researchParityIssues: issues,
  };
  const deterministicRegistryHash = createHash('sha256')
    .update(
      JSON.stringify({
        contractVersion: FORMATION_RELIABILITY_CONTRACT_VERSION,
        abilityCatalog: formationReliabilityAbilityCatalog,
        scoringSignalIds: formationReliabilityScoringSignalIds,
        components: formationReliabilityComponents,
        bindings: formationReliabilityBindings,
        parity: { differences, issues },
      }),
    )
    .digest('hex');

  return { ...reportWithoutHash, deterministicRegistryHash };

  function countBindingClass(bindingClass: string): number {
    return formationReliabilityBindings.filter(
      (binding) => binding.status === 'resolved' && binding.bindingClass === bindingClass,
    ).length;
  }

  function countProbabilityKind(kind: string): number {
    return [...componentProbabilityKinds.values()].filter((kinds) => kinds.has(kind)).length;
  }

  function countBindingProbabilityKind(kind: string): number {
    return [...bindingProbabilityKinds.values()].filter((kinds) => kinds.has(kind)).length;
  }

  function countBindingOpportunityPresence(
    presence: 'guaranteed-at-least-one' | 'conditional' | 'unknown',
  ): number {
    return formationReliabilityBindings.filter(
      (binding) =>
        binding.status === 'resolved' &&
        bindingOpportunityPresence(binding, bindingComponentsBySignalId.get(binding.signalId)!) ===
          presence,
    ).length;
  }
}

function reconcileResearch(
  researchSignals: readonly FormationReliabilityAuditSignal[],
  bindingsBySignalId: ReadonlyMap<string, SignalReliabilityBinding>,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
): {
  differences: FormationReliabilityRegistryParityDifference[];
  issues: string[];
} {
  const issues: string[] = [];
  const componentIdDifferences: FormationReliabilityRegistryParityDifference[] = [];

  for (const signal of [...researchSignals].sort((left, right) =>
    left.signalId.localeCompare(right.signalId),
  )) {
    const binding = bindingsBySignalId.get(signal.signalId);
    if (!binding) {
      issues.push(`${signal.signalId}: missing production binding.`);
      continue;
    }
    const expectedClass = expectedBindingClass(signal);
    if (binding.status !== 'resolved' || binding.bindingClass !== expectedClass) {
      issues.push(
        `${signal.signalId}: expected ${expectedClass} binding, received ${
          binding.status === 'resolved' ? (binding.bindingClass ?? 'unclassified') : binding.status
        }.`,
      );
      continue;
    }

    const productionComponentIds = [...new Set(bindingComponentIds(binding))].sort();
    const researchComponentIds = [...signal.reliabilityComponentIds].sort();
    if (JSON.stringify(productionComponentIds) !== JSON.stringify(researchComponentIds)) {
      if (!allowedComponentIdMigrationSignalIds.has(signal.signalId)) {
        issues.push(
          `${signal.signalId}: undocumented component migration ${researchComponentIds.join(
            ', ',
          )} -> ${productionComponentIds.join(', ')}.`,
        );
      } else {
        componentIdDifferences.push({
          kind: 'component-id-migration',
          signalIds: [signal.signalId],
          explanation: `${researchComponentIds.join(', ')} -> ${productionComponentIds.join(
            ', ',
          )}; separate rolls, resolved mixed uses, or explicit event-graph ownership required a semantic production ID.`,
        });
      }
    }

    if (
      signal.classification === 'mixed-guaranteed-and-chance-based-ability' ||
      signal.signalId === 'vaeldra-tempting-distraction-vulnerability'
    ) {
      continue;
    }
    const primaryComponent = componentsById.get(productionComponentIds[0] ?? '');
    if (!primaryComponent) {
      issues.push(`${signal.signalId}: production component is missing.`);
      continue;
    }
    compareEvidenceFacts(signal, primaryComponent, issues);
  }

  const habitSourceSignalIds = researchSignals
    .filter((signal) => researchHasHabitProgression(signal))
    .map((signal) => signal.signalId)
    .sort();
  const variantSignalIds = researchSignals
    .filter((signal) => (signal.probability.variants?.length ?? 0) > 0)
    .map((signal) => signal.signalId)
    .sort();
  const roundOverrideSignalIds = researchSignals
    .filter((signal) => signal.probability.kind === 'round-and-habit')
    .map((signal) => signal.signalId)
    .sort();
  const resolvedMixedSignalIds = researchSignals
    .filter((signal) => signal.classification === 'mixed-guaranteed-and-chance-based-ability')
    .map((signal) => signal.signalId)
    .sort();

  const differences = [
    ...componentIdDifferences,
    {
      kind: 'explicit-habit-probability-source',
      signalIds: habitSourceSignalIds,
      explanation:
        'Production names each probability-source Habit explicitly; the research shape carried only level values.',
    },
    {
      kind: 'binding-selected-probability-variants',
      signalIds: variantSignalIds,
      explanation:
        'Research variant labels are normalized to stable IDs and selected by typed binding path references.',
    },
    {
      kind: 'round-specific-habit-override',
      signalIds: roundOverrideSignalIds,
      explanation:
        'Research round-and-habit summaries are represented by explicit per-round Habit override expressions.',
    },
    {
      kind: 'resolved-mixed-signal-uses',
      signalIds: resolvedMixedSignalIds,
      explanation:
        'Each formerly mixed signal now has simultaneous semantic uses; paths remain alternatives only within each use.',
    },
    {
      kind: 'composite-taunt-event-graph',
      signalIds: ['vaeldra-tempting-distraction-vulnerability'],
      explanation:
        'The unresolved composite probability is replaced by explicit Lure and Siren’s Call setup paths joined to the deterministic follow-on.',
    },
  ].sort((left, right) => {
    const kindOrder = left.kind.localeCompare(right.kind);
    return kindOrder || left.signalIds.join(',').localeCompare(right.signalIds.join(','));
  });

  return { differences, issues: issues.sort() };
}

function compareEvidenceFacts(
  research: FormationReliabilityAuditSignal,
  component: AbilityReliabilityComponent,
  issues: string[],
): void {
  if (component.opportunityPresence !== research.opportunityPresence) {
    issues.push(
      `${research.signalId}: opportunity presence ${component.opportunityPresence} differs from ${research.opportunityPresence}.`,
    );
  }
  if (component.opportunityCount.kind !== research.opportunityCount.kind) {
    issues.push(
      `${research.signalId}: opportunity count ${component.opportunityCount.kind} differs from ${research.opportunityCount.kind}.`,
    );
  }
  const expectedRollScope = {
    'single-shared-roll': 'shared',
    'separate-per-target': 'per-target',
    'separate-per-effect': 'per-effect',
    'separate-per-target-and-effect': 'per-target-and-effect',
    'separate-stat-checks': 'separate-stat-checks',
    unresolved: 'unresolved',
    'not-applicable': 'not-applicable',
  }[research.rollScope];
  if (component.rollScope !== expectedRollScope) {
    issues.push(
      `${research.signalId}: roll scope ${component.rollScope} differs from ${research.rollScope}.`,
    );
  }
  if (component.independence !== research.independence) {
    issues.push(
      `${research.signalId}: independence ${component.independence} differs from ${research.independence}.`,
    );
  }
  const evidenceIds = new Set(component.evidence.evidenceIds);
  for (const evidenceId of research.canonicalEvidence.evidenceIds) {
    if (!evidenceIds.has(evidenceId)) {
      issues.push(`${research.signalId}: missing evidence ID ${evidenceId}.`);
    }
  }
  const questions = new Set(component.evidence.unresolvedQuestions);
  for (const question of research.unresolvedQuestions) {
    if (!questions.has(question)) {
      issues.push(`${research.signalId}: missing unresolved question "${question}".`);
    }
  }
  const expectedProbabilityKind = {
    none: undefined,
    fixed: 'fixed',
    'habit-level': 'habit-level',
    'round-and-habit': 'round-specific',
    multiple: 'variants',
    unknown: 'unknown',
  }[research.probability.kind];
  if (component.probability?.kind !== expectedProbabilityKind) {
    issues.push(
      `${research.signalId}: probability ${component.probability?.kind ?? 'none'} differs from expected ${expectedProbabilityKind ?? 'none'}.`,
    );
  }
  const researchValues = researchProbabilityValues(research);
  const productionValues = productionProbabilityValues(component.probability);
  if (JSON.stringify(productionValues) !== JSON.stringify(researchValues)) {
    issues.push(
      `${research.signalId}: probability values ${productionValues.join(', ')} differ from ${researchValues.join(', ')}.`,
    );
  }
  if (researchHasHabitProgression(research)) {
    const expectedHabitAbilityId =
      {
        'crimson-bloodscale-terror-stun': 'crimson-vermins-bane',
        'tairax-burning-ward-stagger': 'tairax-gleamstrike',
      }[research.signalId] ?? research.sourceAbilityId;
    if (!collectReliabilityProbabilityHabitAbilityIds(component.probability).has(
      expectedHabitAbilityId,
    )) {
      issues.push(
        `${research.signalId}: missing explicit probability-source Habit ${expectedHabitAbilityId}.`,
      );
    }
  }
}

function expectedBindingClass(
  signal: FormationReliabilityAuditSignal,
): 'guaranteed' | 'conditional-deterministic' | 'chance' | 'resolved-mixed' {
  if (signal.classification === 'guaranteed') return 'guaranteed';
  if (signal.classification === 'conditional-deterministic') {
    return 'conditional-deterministic';
  }
  if (signal.classification === 'mixed-guaranteed-and-chance-based-ability') {
    return 'resolved-mixed';
  }
  return 'chance';
}

function bindingComponentIds(binding: SignalReliabilityBinding): string[] {
  return reliabilityBindingPathVisits(binding).flatMap(({ path }) =>
    path.events.flatMap((event) =>
      event.componentReferences.map((reference) => reference.componentId),
    ),
  );
}

function bindingComponents(
  binding: SignalReliabilityBinding,
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
): AbilityReliabilityComponent[] {
  return [...new Set(bindingComponentIds(binding))]
    .map((componentId) => componentsById.get(componentId))
    .filter((component): component is AbilityReliabilityComponent => Boolean(component));
}

function bindingOpportunityPresence(
  binding: Extract<SignalReliabilityBinding, { status: 'resolved' }>,
  components: readonly AbilityReliabilityComponent[],
): 'guaranteed-at-least-one' | 'conditional' | 'unknown' | 'not-applicable' {
  if (binding.bindingClass === 'resolved-mixed') return 'unknown';
  if (binding.bindingClass !== 'chance') return 'not-applicable';
  const chancePresence = components
    .filter(
      (component) =>
        component.reliabilityClass === 'chance' || component.reliabilityClass === 'unknown',
    )
    .map((component) => component.opportunityPresence);
  if (chancePresence.includes('unknown')) return 'unknown';
  if (chancePresence.includes('conditional')) return 'conditional';
  if (
    chancePresence.length > 0 &&
    chancePresence.every((presence) => presence === 'guaranteed-at-least-one')
  ) {
    return 'guaranteed-at-least-one';
  }
  return 'unknown';
}

function bindingTopLevelProbabilityKinds(
  binding: SignalReliabilityBinding,
  components: readonly AbilityReliabilityComponent[],
): Set<string> {
  if (binding.status !== 'resolved' || binding.bindingClass !== 'chance') return new Set();
  const kinds = new Set(
    components
      .filter(
        (component) =>
          component.reliabilityClass === 'chance' || component.reliabilityClass === 'unknown',
      )
      .map((component) => component.probability?.kind)
      .filter((kind): kind is NonNullable<typeof kind> => Boolean(kind)),
  );
  return kinds.size === 1 ? kinds : new Set();
}

function probabilityKinds(probability: ReliabilityProbability | undefined): Set<string> {
  const kinds = new Set<string>();
  visit(probability);
  return kinds;

  function visit(candidate: ReliabilityProbability | undefined): void {
    if (!candidate) return;
    kinds.add(candidate.kind);
    if (candidate.kind === 'round-specific') {
      for (const roundProbability of Object.values(candidate.byRound)) {
        visit(roundProbability);
      }
    }
    if (candidate.kind === 'variants') {
      for (const variant of candidate.variants) visit(variant.probability);
    }
  }
}

function researchHasHabitProgression(signal: FormationReliabilityAuditSignal): boolean {
  if (signal.probability.byHabitLevel) return true;
  return signal.probability.variants?.some((variant) => variant.byHabitLevel) ?? false;
}

function researchProbabilityValues(signal: FormationReliabilityAuditSignal): number[] {
  const values = [
    ...(signal.probability.fixed === undefined ? [] : [signal.probability.fixed]),
    ...(signal.probability.byHabitLevel ?? []),
    ...(signal.probability.variants?.flatMap((variant) => [
      ...(variant.fixed === undefined ? [] : [variant.fixed]),
      ...(variant.byHabitLevel ?? []),
    ]) ?? []),
  ];
  return [...new Set(values)].sort((left, right) => left - right);
}

function productionProbabilityValues(probability: ReliabilityProbability | undefined): number[] {
  const values: number[] = [];
  visit(probability);
  return [...new Set(values)].sort((left, right) => left - right);

  function visit(candidate: ReliabilityProbability | undefined): void {
    if (!candidate || candidate.kind === 'unknown') return;
    if (candidate.kind === 'fixed') {
      values.push(candidate.value);
      return;
    }
    if (candidate.kind === 'habit-level') {
      values.push(...Object.values(candidate.byLevel));
      return;
    }
    if (candidate.kind === 'habit-override') {
      values.push(candidate.base, ...Object.values(candidate.byLevel));
      return;
    }
    if (candidate.kind === 'round-specific') {
      for (const roundProbability of Object.values(candidate.byRound)) {
        visit(roundProbability);
      }
      return;
    }
    for (const variant of candidate.variants) visit(variant.probability);
  }
}
