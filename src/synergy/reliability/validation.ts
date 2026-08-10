import {
  collectReliabilityProbabilityHabitAbilityIds,
  isReliabilityProbabilityValue,
} from './probability';
import { reliabilityBindingPathVisits } from './traversal';
import type {
  AbilityReliabilityComponent,
  ConcreteReliabilityProbability,
  FixedOrHabitLevelEvidenceValue,
  ReliabilityAbilityReference,
  ReliabilityComponentId,
  ReliabilityComponentReference,
  ReliabilityContractInput,
  ReliabilityProbability,
  ReliabilityValidationIssue,
  ReliabilityValidationMode,
  SignalReliabilityBinding,
  SignalReliabilityPath,
  SignalReliabilityUse,
} from './types';

const COMPONENT_ID_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const ABILITY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HABIT_LEVELS = ['1', '2', '3', '4', '5'] as const;

export function createReliabilityComponentId(
  sourceAbilityId: string,
  componentSlug: string,
): ReliabilityComponentId {
  const candidate = `${sourceAbilityId}:${componentSlug}`;
  if (!COMPONENT_ID_PATTERN.test(candidate)) {
    throw new Error(
      `Reliability component ID "${candidate}" must use ability-id:component-slug kebab-case.`,
    );
  }
  return candidate as ReliabilityComponentId;
}

export function validateReliabilityContract(
  input: ReliabilityContractInput,
  mode: ReliabilityValidationMode,
): ReliabilityValidationIssue[] {
  const issues: ReliabilityValidationIssue[] = [];
  const componentsById = new Map(input.components.map((component) => [component.id, component]));
  const abilitiesById = input.abilityCatalog
    ? new Map(input.abilityCatalog.map((ability) => [ability.abilityId, ability]))
    : undefined;
  const scoringSignalIds = new Set(input.scoringSignalIds);
  const referencedComponentIds = new Set<ReliabilityComponentId>();

  addDuplicateIssues(
    input.components.map((component) => component.id),
    'component.duplicate-id',
    'components',
    'Duplicate reliability component ID',
    issues,
  );
  addDuplicateIssues(
    input.bindings.map((binding) => binding.signalId),
    'binding.duplicate-signal',
    'bindings',
    'Duplicate reliability binding for signal',
    issues,
  );
  addDuplicateIssues(
    input.scoringSignalIds,
    'coverage.duplicate-scoring-signal',
    'scoringSignalIds',
    'Duplicate scoring signal ID',
    issues,
  );
  if (input.abilityCatalog) {
    addDuplicateIssues(
      input.abilityCatalog.map((ability) => ability.abilityId),
      'ability-catalog.duplicate-id',
      'abilityCatalog',
      'Duplicate canonical ability ID',
      issues,
    );
    for (const ability of input.abilityCatalog) validateAbilityReference(ability, issues);
  }

  for (const component of input.components) {
    validateComponent(component, abilitiesById, mode, issues);
  }
  validateConditionalUplifts(input.components, componentsById, abilitiesById, issues);
  for (const binding of input.bindings) {
    validateBinding(
      binding,
      componentsById,
      scoringSignalIds,
      referencedComponentIds,
      mode,
      issues,
    );
  }

  if (mode === 'full-migration') {
    const boundSignalIds = new Set(input.bindings.map((binding) => binding.signalId));
    for (const signalId of scoringSignalIds) {
      if (!boundSignalIds.has(signalId)) {
        addIssue(
          issues,
          'coverage.missing-binding',
          `bindings[${signalId}]`,
          `Scoring signal "${signalId}" has no reliability binding.`,
        );
      }
    }
    for (const [componentId, component] of componentsById) {
      if (!referencedComponentIds.has(componentId) && !component.researchOnly) {
        addIssue(
          issues,
          'coverage.unreferenced-component',
          `components[${componentId}]`,
          `Reliability component "${componentId}" is not referenced by any signal binding.`,
        );
      }
    }
  }

  return issues.sort(compareIssues);
}

function validateConditionalUplifts(
  components: readonly AbilityReliabilityComponent[],
  componentsById: ReadonlyMap<string, AbilityReliabilityComponent>,
  abilitiesById: ReadonlyMap<string, ReliabilityAbilityReference> | undefined,
  issues: ReliabilityValidationIssue[],
): void {
  for (const component of components) {
    for (const [referenceIndex, componentId] of (
      component.additionalConditionalUpliftComponentIds ?? []
    ).entries()) {
      const path = `components[${component.id}].additionalConditionalUpliftComponentIds[${referenceIndex}]`;
      const referenced = componentsById.get(componentId);
      if (!referenced) {
        addIssue(
          issues,
          'conditional-uplift.additional-component-missing',
          path,
          `Additional conditional-uplift component "${componentId}" does not exist.`,
        );
      } else if (!referenced.conditionalUplift && !referenced.conditionalUplifts?.length) {
        addIssue(
          issues,
          'conditional-uplift.additional-component-empty',
          path,
          `Additional component "${componentId}" owns no conditional uplift evidence.`,
        );
      }
    }
    const uplifts = [
      ...(component.conditionalUplift ? [component.conditionalUplift] : []),
      ...(component.conditionalUplifts ?? []),
    ];
    for (const [upliftIndex, uplift] of uplifts.entries()) {
    const path = component.conditionalUplift === uplift
      ? `components[${component.id}].conditionalUplift`
      : `components[${component.id}].conditionalUplifts[${upliftIndex - (component.conditionalUplift ? 1 : 0)}]`;
    if (component.reliabilityClass !== 'conditional-deterministic') {
      addIssue(
        issues,
        'conditional-uplift.component-class',
        path,
        'A conditional uplift must be owned by a conditional-deterministic component.',
      );
    }
    if (!uplift.conditionLabel.trim()) {
      addIssue(
        issues,
        'conditional-uplift.condition-label-missing',
        `${path}.conditionLabel`,
        'A conditional uplift requires a readable condition label.',
      );
    }
    if (!uplift.affectedMetricLabel.trim()) {
      addIssue(
        issues,
        'conditional-uplift.metric-label-missing',
        `${path}.affectedMetricLabel`,
        'A conditional uplift requires a readable affected metric label.',
      );
    }
    validateEvidenceValue(uplift.baseline, `${path}.baseline`, issues);
    validateEvidenceValue(uplift.conditioned, `${path}.conditioned`, issues);
    validateEvidenceValue(uplift.absoluteDelta, `${path}.absoluteDelta`, issues);
    const baselineValues = evidenceValues(uplift.baseline);
    const conditionedValues = evidenceValues(uplift.conditioned);
    const deltaValues = evidenceValues(uplift.absoluteDelta);
    if (baselineValues.length !== conditionedValues.length || conditionedValues.some((value, index) => value <= baselineValues[index]!)) {
      addIssue(
        issues,
        'conditional-uplift.not-positive',
        `${path}.conditioned`,
        'The conditioned probability must be greater than the baseline probability.',
      );
    }
    if (deltaValues.length !== baselineValues.length || deltaValues.some((value, index) => Math.abs(value - (conditionedValues[index]! - baselineValues[index]!)) > 1e-12)) {
      addIssue(
        issues,
        'conditional-uplift.absolute-delta-mismatch',
        `${path}.absoluteDelta`,
        'absoluteDelta must equal conditioned minus baseline.',
      );
    }
    if (
      baselineValues.some((value) => value <= 0) ||
      conditionedValues.some((value, index) => Math.abs(uplift.relativeMultiplier - value / baselineValues[index]!) > 1e-12)
    ) {
      addIssue(
        issues,
        'conditional-uplift.relative-multiplier-mismatch',
        `${path}.relativeMultiplier`,
        'relativeMultiplier must equal conditioned divided by baseline.',
      );
    }
    const affected = componentsById.get(uplift.affectedComponentId);
    if (!affected) {
      addIssue(
        issues,
        'conditional-uplift.affected-component-missing',
        `${path}.affectedComponentId`,
        `Affected component "${uplift.affectedComponentId}" does not exist.`,
      );
      continue;
    }
    const ownerAbility = abilitiesById?.get(component.sourceAbilityId);
    const affectedAbility = abilitiesById?.get(affected.sourceAbilityId);
    if (
      affected.sourceAbilityId !== component.sourceAbilityId &&
      (!ownerAbility || !affectedAbility || ownerAbility.dragonId !== affectedAbility.dragonId)
    ) {
      addIssue(
        issues,
        'conditional-uplift.ability-mismatch',
        `${path}.affectedComponentId`,
        'The uplift and affected output must belong to the same dragon.',
      );
    }
    const probability = affected.probability;
    if (probability?.kind !== 'variants') {
      addIssue(
        issues,
        'conditional-uplift.affected-variants-missing',
        `${path}.affectedComponentId`,
        'The affected component must expose explicit probability variants.',
      );
      continue;
    }
    const baseline = probability.variants.find(
      (variant) => variant.id === uplift.baselineVariantId,
    )?.probability;
    const conditioned = probability.variants.find(
      (variant) => variant.id === uplift.conditionedVariantId,
    )?.probability;
    if (!probabilityEvidenceMatches(baseline, uplift.baseline)) {
      addIssue(
        issues,
        'conditional-uplift.baseline-variant-mismatch',
        `${path}.baselineVariantId`,
        'The baseline variant must exist as a matching fixed probability.',
      );
    }
    if (!probabilityEvidenceMatches(conditioned, uplift.conditioned)) {
      addIssue(
        issues,
        'conditional-uplift.conditioned-variant-mismatch',
        `${path}.conditionedVariantId`,
        'The conditioned variant must exist as a matching fixed probability.',
      );
    }
    }
  }
}

function validateEvidenceValue(
  value: FixedOrHabitLevelEvidenceValue,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  if (typeof value === 'number') validateProbabilityValue(value, path, issues);
  else {
    if (value.kind !== 'habit-level') {
      addIssue(issues, 'conditional-uplift.value-kind', path, 'Progression evidence must use habit-level values.');
      return;
    }
    validateHabitLevels(value.byLevel, path, issues);
  }
}

function evidenceValues(value: FixedOrHabitLevelEvidenceValue): number[] {
  return typeof value === 'number'
    ? [value]
    : [1, 2, 3, 4, 5].map((level) => value.byLevel[level as 1 | 2 | 3 | 4 | 5]);
}

function probabilityEvidenceMatches(
  probability: ConcreteReliabilityProbability | undefined,
  evidence: FixedOrHabitLevelEvidenceValue,
): boolean {
  if (typeof evidence === 'number') return probability?.kind === 'fixed' && probability.value === evidence;
  return probability?.kind === 'habit-level' &&
    probability.habitAbilityId === evidence.habitAbilityId &&
    [1, 2, 3, 4, 5].every((level) => probability.byLevel[level as 1 | 2 | 3 | 4 | 5] === evidence.byLevel[level as 1 | 2 | 3 | 4 | 5]);
}

export function assertValidReliabilityContract(
  input: ReliabilityContractInput,
  mode: ReliabilityValidationMode,
): void {
  const issues = validateReliabilityContract(input, mode);
  if (issues.length === 0) return;
  throw new Error(
    `Invalid Formation Reliability contract:\n${issues
      .map((issue) => `- [${issue.code}] ${issue.path}: ${issue.message}`)
      .join('\n')}`,
  );
}

function validateComponent(
  component: AbilityReliabilityComponent,
  abilitiesById: ReadonlyMap<string, ReliabilityAbilityReference> | undefined,
  mode: ReliabilityValidationMode,
  issues: ReliabilityValidationIssue[],
): void {
  const path = `components[${component.id || '<empty>'}]`;
  const match = COMPONENT_ID_PATTERN.exec(component.id);
  if (!match) {
    addIssue(
      issues,
      'component.malformed-id',
      `${path}.id`,
      `Component ID "${component.id}" must use ability-id:component-slug kebab-case.`,
    );
  } else if (match[1] !== component.sourceAbilityId) {
    addIssue(
      issues,
      'component.source-mismatch',
      `${path}.sourceAbilityId`,
      `Component ID identifies "${match[1]}" but sourceAbilityId is "${component.sourceAbilityId}".`,
    );
  }
  validateComponentAbility(component, path, abilitiesById, mode, issues);

  validateClassAndOpportunitySemantics(component, path, issues);
  if (component.opportunityCondition !== undefined) {
    if (component.opportunityPresence !== 'conditional') {
      addIssue(
        issues,
        'component.opportunity-condition-without-conditional-presence',
        `${path}.opportunityCondition`,
        'An opportunity condition is valid only for conditional opportunity presence.',
      );
    }
    if (!component.opportunityCondition.trim()) {
      addIssue(
        issues,
        'component.opportunity-condition-empty',
        `${path}.opportunityCondition`,
        'A documented opportunity condition must not be empty.',
      );
    }
  }
  if (component.probability) {
    validateProbability(
      component.probability,
      `${path}.probability`,
      component,
      abilitiesById,
      issues,
    );
  }
  validateTiming(component, path, issues);
  validateOpportunityCount(component, path, issues);
  validateNumericEvidenceFacts(component, path, issues);
  validateBattleStateComparisonEvidence(component, path, issues);
  validateEvidence(component, path, issues);
}

function validateBattleStateComparisonEvidence(
  component: AbilityReliabilityComponent,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  const comparison = component.battleStateComparisonEvidence;
  if (!comparison) return;
  if (
    comparison.subject !== 'self' ||
    comparison.metric !== 'troops' ||
    comparison.comparison !== 'minimum' ||
    comparison.population !== 'all-combatants' ||
    comparison.tieHandling !== 'unresolved'
  ) {
    addIssue(
      issues,
      'component.battle-state-comparison-invalid',
      `${path}.battleStateComparisonEvidence`,
      'Battle-state comparison evidence must describe self having minimum troops among all combatants with unresolved ties.',
    );
  }
}

function validateComponentAbility(
  component: AbilityReliabilityComponent,
  path: string,
  abilitiesById: ReadonlyMap<string, ReliabilityAbilityReference> | undefined,
  mode: ReliabilityValidationMode,
  issues: ReliabilityValidationIssue[],
): void {
  if (!abilitiesById) return;
  const ability = abilitiesById.get(component.sourceAbilityId);
  if (!ability) {
    addIssue(
      issues,
      'component.source-ability-missing',
      `${path}.sourceAbilityId`,
      `Component source ability "${component.sourceAbilityId}" is absent from the canonical ability catalog.`,
    );
    return;
  }
  if (component.sourceAbilityKind !== ability.kind) {
    addIssue(
      issues,
      'component.source-ability-kind',
      `${path}.sourceAbilityKind`,
      `Component identifies a ${component.sourceAbilityKind}, but "${ability.abilityId}" is a ${ability.kind}.`,
    );
  }
  if (mode !== 'full-migration') return;
  validateUnlockFloor(
    component.unlock?.minimumStarRank,
    ability.unlockStarRank,
    `${path}.unlock.minimumStarRank`,
    'Star Rank',
    issues,
  );
  validateUnlockFloor(
    component.unlock?.minimumDragonLevel,
    ability.minimumDragonLevel,
    `${path}.unlock.minimumDragonLevel`,
    'Dragon Level',
    issues,
  );
  const componentEvidenceIds = new Set(component.evidence.evidenceIds);
  const allowedEvidenceIds = new Set(ability.evidenceIds);
  if (
    ability.evidenceIds.length > 0 &&
    !ability.evidenceIds.some((evidenceId) => componentEvidenceIds.has(evidenceId))
  ) {
    addIssue(
      issues,
      'component.source-evidence-missing',
      `${path}.evidence.evidenceIds`,
      `Component requires canonical evidence from source ability "${ability.abilityId}".`,
    );
  }
  for (const habitAbilityId of collectReliabilityProbabilityHabitAbilityIds(
    component.probability,
  )) {
    if (habitAbilityId === ability.abilityId) continue;
    const habitAbility = abilitiesById.get(habitAbilityId);
    if (
      !habitAbility ||
      habitAbility.kind !== 'habit' ||
      habitAbility.dragonId !== ability.dragonId
    ) {
      continue;
    }
    for (const evidenceId of habitAbility.evidenceIds) allowedEvidenceIds.add(evidenceId);
    if (
      habitAbility.evidenceIds.length > 0 &&
      !habitAbility.evidenceIds.some((evidenceId) => componentEvidenceIds.has(evidenceId))
    ) {
      addIssue(
        issues,
        'component.probability-source-evidence-missing',
        `${path}.evidence.evidenceIds`,
        `Component requires canonical evidence from external probability-source Habit "${habitAbilityId}".`,
      );
    }
  }
  for (const evidenceId of component.evidence.evidenceIds) {
    if (!allowedEvidenceIds.has(evidenceId)) {
      addIssue(
        issues,
        'component.evidence-id-stale',
        `${path}.evidence.evidenceIds[${evidenceId}]`,
        `Evidence ID "${evidenceId}" does not belong to the source ability or a valid external probability-source Habit.`,
      );
    }
  }
}

function validateUnlockFloor(
  componentValue: number | undefined,
  canonicalValue: number | null,
  path: string,
  label: string,
  issues: ReliabilityValidationIssue[],
): void {
  if (canonicalValue === null) return;
  if (componentValue === undefined || componentValue < canonicalValue) {
    addIssue(
      issues,
      'component.unlock-understated',
      path,
      `${label} unlock must be at least the canonical value ${canonicalValue}.`,
    );
  }
}

function validateClassAndOpportunitySemantics(
  component: AbilityReliabilityComponent,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  const deterministic =
    component.reliabilityClass === 'guaranteed' ||
    component.reliabilityClass === 'conditional-deterministic';
  const chanceLike =
    component.reliabilityClass === 'chance' || component.reliabilityClass === 'unknown';

  if (deterministic && component.probability) {
    addIssue(
      issues,
      'component.deterministic-probability',
      `${path}.probability`,
      'Deterministic components must not carry chance probability metadata.',
    );
  }
  if (component.reliabilityClass === 'chance' && !component.probability) {
    addIssue(
      issues,
      'component.chance-probability-missing',
      `${path}.probability`,
      'Chance components require documented probability data or an explicit unknown probability.',
    );
  }
  if (component.reliabilityClass === 'unknown' && component.probability?.kind !== 'unknown') {
    addIssue(
      issues,
      'component.unknown-probability-required',
      `${path}.probability`,
      'Unknown reliability requires an explicit unknown probability reason.',
    );
  }

  if (deterministic) {
    const activeFields = [
      component.opportunityPresence !== 'not-applicable' && 'opportunityPresence',
      component.opportunityCount.kind !== 'not-applicable' && 'opportunityCount',
      component.rollScope !== 'not-applicable' && 'rollScope',
      component.independence !== 'not-applicable' && 'independence',
    ].filter(Boolean);
    if (activeFields.length > 0) {
      addIssue(
        issues,
        'component.deterministic-chance-metadata',
        path,
        `Deterministic components require not-applicable chance fields; active fields: ${activeFields.join(', ')}.`,
      );
    }
  }

  if (chanceLike) {
    const notApplicableFields = [
      component.opportunityPresence === 'not-applicable' && 'opportunityPresence',
      component.opportunityCount.kind === 'not-applicable' && 'opportunityCount',
      component.rollScope === 'not-applicable' && 'rollScope',
    ].filter(Boolean);
    if (notApplicableFields.length > 0) {
      addIssue(
        issues,
        'component.chance-not-applicable',
        path,
        `Chance or unknown components cannot use not-applicable for: ${notApplicableFields.join(', ')}.`,
      );
    }
  }

  if (
    component.opportunityPresence === 'guaranteed-at-least-one' &&
    !timingSupportsGuaranteedOpportunity(component)
  ) {
    addIssue(
      issues,
      'component.opportunity-presence-overstated',
      `${path}.opportunityPresence`,
      'Timing or opportunity facts do not support an unconditional first opportunity.',
    );
  }

  if (
    component.opportunityCount.kind === 'exact' &&
    component.opportunityCount.value === 1 &&
    component.independence !== 'not-applicable'
  ) {
    addIssue(
      issues,
      'component.single-opportunity-independence',
      `${path}.independence`,
      'One exact opportunity requires independence to be not-applicable.',
    );
  }
  if (
    component.opportunityCount.kind === 'exact' &&
    component.opportunityCount.value > 1 &&
    component.independence === 'not-applicable'
  ) {
    addIssue(
      issues,
      'component.repeated-opportunity-independence',
      `${path}.independence`,
      'More than one exact opportunity requires an explicit independence state.',
    );
  }
  if (
    chanceLike &&
    component.independence === 'not-applicable' &&
    !(component.opportunityCount.kind === 'exact' && component.opportunityCount.value === 1)
  ) {
    addIssue(
      issues,
      'component.independence-not-applicable',
      `${path}.independence`,
      'Chance components may use not-applicable independence only for one exact opportunity.',
    );
  }
}

function timingSupportsGuaranteedOpportunity(component: AbilityReliabilityComponent): boolean {
  if (component.timing.kind === 'start-of-combat' || component.timing.kind === 'each-round') {
    return true;
  }
  if (component.timing.kind === 'scheduled-rounds') {
    return component.timing.rounds[0] === 1;
  }
  return false;
}

function validateProbability(
  probability: ReliabilityProbability,
  path: string,
  component: AbilityReliabilityComponent,
  abilitiesById: ReadonlyMap<string, ReliabilityAbilityReference> | undefined,
  issues: ReliabilityValidationIssue[],
): void {
  if (probability.kind === 'unknown') {
    if (!probability.reason.trim()) {
      addIssue(
        issues,
        'probability.unknown-reason-missing',
        `${path}.reason`,
        'Unknown probability requires a reason.',
      );
    }
    return;
  }
  if (probability.kind === 'variants') {
    if (probability.variants.length === 0) {
      addIssue(
        issues,
        'probability.variants-empty',
        `${path}.variants`,
        'Multiple probability variants require at least one documented branch.',
      );
    }
    addDuplicateIssues(
      probability.variants.map((variant) => variant.id),
      'probability.variant-duplicate',
      `${path}.variants`,
      'Duplicate probability variant',
      issues,
    );
    for (const variant of probability.variants) {
      if (!variant.id.trim()) {
        addIssue(
          issues,
          'probability.variant-id-empty',
          `${path}.variants[<empty>]`,
          'Probability variant IDs must not be empty.',
        );
      }
      validateConcreteProbability(
        variant.probability,
        `${path}.variants[${variant.id || '<empty>'}].probability`,
        component,
        abilitiesById,
        issues,
      );
    }
    return;
  }
  validateConcreteProbability(probability, path, component, abilitiesById, issues);
}

function validateConcreteProbability(
  probability: ConcreteReliabilityProbability,
  path: string,
  component: AbilityReliabilityComponent,
  abilitiesById: ReadonlyMap<string, ReliabilityAbilityReference> | undefined,
  issues: ReliabilityValidationIssue[],
): void {
  if (probability.kind === 'unknown') {
    if (!probability.reason.trim()) {
      addIssue(
        issues,
        'probability.unknown-reason-missing',
        `${path}.reason`,
        'Unknown probability requires a reason.',
      );
    }
    return;
  }
  if (probability.kind === 'fixed') {
    validateProbabilityValue(probability.value, `${path}.value`, issues);
    return;
  }
  if (probability.kind === 'habit-level' || probability.kind === 'habit-override') {
    validateHabitAbilityId(probability.habitAbilityId, path, component, abilitiesById, issues);
    if (probability.kind === 'habit-override') {
      validateProbabilityValue(probability.base, `${path}.base`, issues);
    }
    validateHabitLevels(probability.byLevel, path, issues);
    return;
  }

  const entries = Object.entries(probability.byRound).sort(
    ([left], [right]) => Number(left) - Number(right),
  );
  if (entries.length === 0) {
    addIssue(
      issues,
      'probability.round-specific-empty',
      `${path}.byRound`,
      'Round-specific probability requires at least one round.',
    );
  }
  for (const [round, roundProbability] of entries) {
    if (!Number.isInteger(Number(round)) || Number(round) < 1) {
      addIssue(
        issues,
        'probability.round-invalid',
        `${path}.byRound[${round}]`,
        `Round key "${round}" must be a positive integer.`,
      );
    }
    validateConcreteProbability(
      roundProbability,
      `${path}.byRound[${round}]`,
      component,
      abilitiesById,
      issues,
    );
  }
}

function validateHabitAbilityId(
  habitAbilityId: string,
  path: string,
  component: AbilityReliabilityComponent,
  abilitiesById: ReadonlyMap<string, ReliabilityAbilityReference> | undefined,
  issues: ReliabilityValidationIssue[],
): void {
  const idPath = `${path}.habitAbilityId`;
  if (!ABILITY_ID_PATTERN.test(habitAbilityId)) {
    addIssue(
      issues,
      'probability.habit-ability-id-malformed',
      idPath,
      'Habit probability source must be a non-empty kebab-case ability ID.',
    );
    return;
  }
  if (!abilitiesById) return;
  const ability = abilitiesById.get(habitAbilityId);
  if (!ability) {
    addIssue(
      issues,
      'probability.habit-ability-missing',
      idPath,
      `Habit probability source "${habitAbilityId}" is absent from the canonical ability catalog.`,
    );
  } else if (ability.kind !== 'habit') {
    addIssue(
      issues,
      'probability.habit-ability-kind',
      idPath,
      `Probability source "${habitAbilityId}" is a ${ability.kind}, not a Habit.`,
    );
  } else {
    const sourceAbility = abilitiesById.get(component.sourceAbilityId);
    if (sourceAbility && ability.dragonId !== sourceAbility.dragonId) {
      addIssue(
        issues,
        'probability.habit-ability-dragon-mismatch',
        idPath,
        `Probability source "${habitAbilityId}" belongs to "${ability.dragonId}", not source dragon "${sourceAbility.dragonId}".`,
      );
    }
  }
}

function validateHabitLevels(
  byLevel: Record<1 | 2 | 3 | 4 | 5, number>,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  const levels = Object.keys(byLevel).sort();
  for (const level of HABIT_LEVELS) {
    if (!levels.includes(level)) {
      addIssue(
        issues,
        'probability.habit-level-missing',
        `${path}.byLevel[${level}]`,
        `Habit Level ${level} probability is missing.`,
      );
    } else {
      validateProbabilityValue(
        byLevel[Number(level) as 1 | 2 | 3 | 4 | 5],
        `${path}.byLevel[${level}]`,
        issues,
      );
    }
  }
  for (const level of levels.filter(
    (candidate) => !HABIT_LEVELS.includes(candidate as (typeof HABIT_LEVELS)[number]),
  )) {
    addIssue(
      issues,
      'probability.habit-level-unsupported',
      `${path}.byLevel[${level}]`,
      `Habit Level key "${level}" is outside levels 1 through 5.`,
    );
  }
}

function validateAbilityReference(
  ability: ReliabilityAbilityReference,
  issues: ReliabilityValidationIssue[],
): void {
  if (!ABILITY_ID_PATTERN.test(ability.abilityId)) {
    addIssue(
      issues,
      'ability-catalog.malformed-id',
      `abilityCatalog[${ability.abilityId || '<empty>'}].abilityId`,
      `Canonical ability ID "${ability.abilityId}" must use kebab-case.`,
    );
  }
  if (!ABILITY_ID_PATTERN.test(ability.dragonId)) {
    addIssue(
      issues,
      'ability-catalog.malformed-dragon-id',
      `abilityCatalog[${ability.abilityId || '<empty>'}].dragonId`,
      `Canonical dragon ID "${ability.dragonId}" must use kebab-case.`,
    );
  }
  addDuplicateIssues(
    ability.evidenceIds ?? [],
    'ability-catalog.duplicate-evidence-id',
    `abilityCatalog[${ability.abilityId || '<empty>'}].evidenceIds`,
    'Duplicate canonical evidence ID',
    issues,
  );
}

function validateProbabilityValue(
  value: unknown,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  if (!isReliabilityProbabilityValue(value)) {
    addIssue(
      issues,
      'probability.value-out-of-range',
      path,
      'Probability must be a finite number from 0 through 1.',
    );
  }
}

function validateTiming(
  component: AbilityReliabilityComponent,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  const timing = component.timing;
  if (timing.kind === 'scheduled-rounds') {
    if (timing.rounds.length === 0) {
      addIssue(
        issues,
        'timing.schedule-empty',
        `${path}.timing.rounds`,
        'Scheduled timing requires at least one round.',
      );
    }
    if (
      timing.rounds.some((round) => !Number.isInteger(round) || round < 1) ||
      timing.rounds.some((round, index) => index > 0 && round <= timing.rounds[index - 1]!)
    ) {
      addIssue(
        issues,
        'timing.schedule-invalid',
        `${path}.timing.rounds`,
        'Scheduled rounds must be positive, unique, and strictly increasing.',
      );
    }
  }
  if (
    (timing.kind === 'after-event' && !timing.sourceEvent.trim()) ||
    (timing.kind === 'conditional-event' && !timing.condition.trim()) ||
    (timing.kind === 'unresolved' && !timing.reason.trim())
  ) {
    addIssue(
      issues,
      'timing.explanation-missing',
      `${path}.timing`,
      'Event, condition, or unresolved timing requires a non-empty explanation.',
    );
  }
}

function validateOpportunityCount(
  component: AbilityReliabilityComponent,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  const count = component.opportunityCount;
  if (
    (count.kind === 'exact' && (!Number.isInteger(count.value) || count.value < 1)) ||
    (count.kind === 'scheduled-maximum' && (!Number.isInteger(count.maximum) || count.maximum < 1))
  ) {
    addIssue(
      issues,
      'opportunity.count-invalid',
      `${path}.opportunityCount`,
      'Exact and scheduled-maximum opportunity counts must be positive integers.',
    );
  }
  if (
    count.kind === 'scheduled-maximum' &&
    component.timing.kind === 'scheduled-rounds' &&
    count.maximum !== component.timing.rounds.length
  ) {
    addIssue(
      issues,
      'opportunity.schedule-count-mismatch',
      `${path}.opportunityCount.maximum`,
      'Scheduled maximum must equal the number of scheduled rounds.',
    );
  }
  if (
    (count.kind === 'ability-activation-dependent' && !count.sourceEvent.trim()) ||
    (count.kind === 'condition-count-dependent' && !count.condition.trim()) ||
    (count.kind === 'unresolved' && !count.reason.trim())
  ) {
    addIssue(
      issues,
      'opportunity.explanation-missing',
      `${path}.opportunityCount`,
      'Dependent or unresolved opportunity counts require a non-empty explanation.',
    );
  }
}

function validateNumericEvidenceFacts(
  component: AbilityReliabilityComponent,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  if (
    component.targetFacts?.count !== undefined &&
    (!Number.isInteger(component.targetFacts.count) || component.targetFacts.count < 1)
  ) {
    addIssue(
      issues,
      'component.target-count-invalid',
      `${path}.targetFacts.count`,
      'Target count must be a positive integer.',
    );
  }
  if (
    component.durationRounds !== undefined &&
    (!Number.isInteger(component.durationRounds) || component.durationRounds < 1)
  ) {
    addIssue(
      issues,
      'component.duration-invalid',
      `${path}.durationRounds`,
      'Duration evidence must be a positive integer number of rounds.',
    );
  }
  for (const [field, value] of Object.entries(component.unlock ?? {})) {
    if (!Number.isInteger(value) || Number(value) < 1) {
      addIssue(
        issues,
        'component.unlock-invalid',
        `${path}.unlock.${field}`,
        'Unlock requirements must be positive integers.',
      );
    }
  }
}

function validateEvidence(
  component: AbilityReliabilityComponent,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  if (!component.evidence) {
    addIssue(
      issues,
      'evidence.missing',
      `${path}.evidence`,
      'Every reliability component requires evidence metadata.',
    );
    return;
  }
  if (
    component.evidence.evidenceIds.length === 0 ||
    component.evidence.evidenceIds.some((id) => !id.trim())
  ) {
    addIssue(
      issues,
      'evidence.id-missing',
      `${path}.evidence.evidenceIds`,
      'Evidence IDs must contain at least one non-empty identifier.',
    );
  }
  const unresolvedFacts =
    component.reliabilityClass === 'unknown' ||
    component.probability?.kind === 'unknown' ||
    component.opportunityPresence === 'unknown' ||
    component.timing.kind === 'unresolved' ||
    component.opportunityCount.kind === 'unresolved' ||
    component.rollScope === 'unresolved' ||
    component.independence === 'unknown' ||
    component.independence === 'reasonable-model-assumption' ||
    component.independence === 'contradicted';
  if (
    unresolvedFacts &&
    (component.evidence.unresolvedQuestions.length === 0 ||
      component.evidence.unresolvedQuestions.some((question) => !question.trim()))
  ) {
    addIssue(
      issues,
      'evidence.unresolved-question-missing',
      `${path}.evidence.unresolvedQuestions`,
      'Unresolved reliability facts require at least one non-empty question.',
    );
  }
}

function validateBinding(
  binding: SignalReliabilityBinding,
  componentsById: ReadonlyMap<ReliabilityComponentId, AbilityReliabilityComponent>,
  scoringSignalIds: ReadonlySet<string>,
  referencedComponentIds: Set<ReliabilityComponentId>,
  mode: ReliabilityValidationMode,
  issues: ReliabilityValidationIssue[],
): void {
  const path = `bindings[${binding.signalId || '<empty>'}]`;
  if (!scoringSignalIds.has(binding.signalId)) {
    addIssue(
      issues,
      'binding.stale-signal',
      `${path}.signalId`,
      `Binding references non-scoring or missing signal "${binding.signalId}".`,
    );
  }

  if (binding.status === 'unresolved-mixed') {
    if (!binding.unresolvedReason.trim()) {
      addIssue(
        issues,
        'binding.mixed-reason-missing',
        `${path}.unresolvedReason`,
        'Unresolved mixed bindings require an explanation.',
      );
    }
    if (mode === 'full-migration') {
      addIssue(
        issues,
        'binding.mixed-unresolved',
        path,
        'Full migration requires component-resolved signal bindings.',
      );
    }
  }

  if (mode === 'full-migration' && binding.status === 'resolved' && !binding.bindingClass) {
    addIssue(
      issues,
      'binding.class-missing',
      `${path}.bindingClass`,
      'Full migration requires an explicit binding reliability class.',
    );
  }
  if (binding.status === 'resolved' && binding.bindingClass === 'resolved-mixed') {
    validateMixedBinding(
      binding,
      path,
      componentsById,
      referencedComponentIds,
      issues,
    );
    return;
  }

  const paths: readonly SignalReliabilityPath[] =
    binding.status === 'unresolved-mixed'
      ? binding.candidatePaths
      : binding.paths;
  if (paths.length === 0) {
    addIssue(
      issues,
      'binding.paths-empty',
      `${path}.paths`,
      'A reliability binding requires at least one component path.',
    );
  }
  addDuplicateIssues(
    paths.map((candidate) => candidate.pathId),
    'binding.path-duplicate',
    `${path}.paths`,
    'Duplicate reliability path',
    issues,
  );
  for (const candidate of paths) {
    validatePath(candidate, path, componentsById, referencedComponentIds, issues);
  }
  validatePathApplicability(paths, path, issues);
  if (binding.status === 'resolved' && binding.bindingClass) {
    validateSingleBindingClass(binding, paths, componentsById, path, issues);
  }
}

function validateMixedBinding(
  binding: Extract<SignalReliabilityBinding, { bindingClass: 'resolved-mixed' }>,
  path: string,
  componentsById: ReadonlyMap<ReliabilityComponentId, AbilityReliabilityComponent>,
  referencedComponentIds: Set<ReliabilityComponentId>,
  issues: ReliabilityValidationIssue[],
): void {
  const candidateUses: unknown = binding.uses;
  const uses: readonly SignalReliabilityUse[] = Array.isArray(candidateUses)
    ? (candidateUses as SignalReliabilityUse[])
    : [];
  if (uses.length < 2) {
    addIssue(
      issues,
      'binding.resolved-mixed-uses-invalid',
      `${path}.uses`,
      'Resolved mixed bindings require at least two simultaneous semantic uses.',
    );
  }
  addDuplicateIssues(
    uses.map((use) => use.useId),
    'binding.use-duplicate',
    `${path}.uses`,
    'Duplicate mixed-use ID',
    issues,
  );
  for (const use of uses) {
    validateMixedUse(use, path, componentsById, referencedComponentIds, issues);
  }

  const classes = new Set(
    reliabilityBindingPathVisits(binding).flatMap(({ path: candidate }) =>
      candidate.events.flatMap((event) =>
        event.componentReferences
          .map((reference) => componentsById.get(reference.componentId)?.reliabilityClass)
          .filter((value): value is AbilityReliabilityComponent['reliabilityClass'] =>
            Boolean(value),
          ),
      ),
    ),
  );
  const hasChance = classes.has('chance') || classes.has('unknown');
  const hasDeterministic =
    classes.has('guaranteed') || classes.has('conditional-deterministic');
  if (!hasChance || !hasDeterministic) {
    addIssue(
      issues,
      'binding.resolved-mixed-class-invalid',
      `${path}.uses`,
      'Resolved mixed uses must span deterministic and chance components.',
    );
  }
}

function validateMixedUse(
  use: SignalReliabilityUse,
  bindingPath: string,
  componentsById: ReadonlyMap<ReliabilityComponentId, AbilityReliabilityComponent>,
  referencedComponentIds: Set<ReliabilityComponentId>,
  issues: ReliabilityValidationIssue[],
): void {
  const usePath = `${bindingPath}.uses[${use.useId || '<empty>'}]`;
  if (!SEMANTIC_ID_PATTERN.test(use.useId)) {
    addIssue(
      issues,
      'binding.use-id-malformed',
      `${usePath}.useId`,
      'Mixed-use IDs must use non-empty kebab-case semantics.',
    );
  }
  const paths: readonly SignalReliabilityPath[] = use.paths;
  if (paths.length === 0) {
    addIssue(
      issues,
      'binding.use-paths-empty',
      `${usePath}.paths`,
      'Each simultaneous mixed use requires at least one alternative path.',
    );
  }
  addDuplicateIssues(
    paths.map((candidate) => candidate.pathId),
    'binding.path-duplicate',
    `${usePath}.paths`,
    'Duplicate reliability path',
    issues,
  );
  for (const candidate of paths) {
    validatePath(candidate, usePath, componentsById, referencedComponentIds, issues);
  }
  validatePathApplicability(paths, usePath, issues);
}

function validatePathApplicability(
  paths: readonly SignalReliabilityPath[],
  bindingPath: string,
  issues: ReliabilityValidationIssue[],
): void {
  const selectedPaths = paths.filter((path) => path.appliesWhen);
  if (selectedPaths.length > 0 && selectedPaths.length !== paths.length) {
    addIssue(
      issues,
      'binding.path-applicability-partial',
      `${bindingPath}.paths`,
      'Either every path or no path must define structured applicability.',
    );
  }
  const applicabilityKeys = selectedPaths.map(
    (path) => `${path.appliesWhen!.kind}:${path.appliesWhen!.id}`,
  );
  addDuplicateIssues(
    applicabilityKeys,
    'binding.path-applicability-duplicate',
    `${bindingPath}.paths`,
    'Duplicate path applicability',
    issues,
  );
}

function validateSingleBindingClass(
  binding: Extract<
    SignalReliabilityBinding,
    { status: 'resolved'; paths: readonly SignalReliabilityPath[] }
  >,
  paths: readonly SignalReliabilityPath[],
  componentsById: ReadonlyMap<ReliabilityComponentId, AbilityReliabilityComponent>,
  path: string,
  issues: ReliabilityValidationIssue[],
): void {
  const classesByPath = paths.map(
    (candidate) =>
      new Set(
        candidate.events.flatMap((event) =>
          event.componentReferences
            .map((reference) => componentsById.get(reference.componentId)?.reliabilityClass)
            .filter((value): value is AbilityReliabilityComponent['reliabilityClass'] =>
              Boolean(value),
            ),
        ),
      ),
  );
  const pathHasChance = (classes: ReadonlySet<string>) =>
    classes.has('chance') || classes.has('unknown');
  const pathHasConditional = (classes: ReadonlySet<string>) =>
    classes.has('conditional-deterministic');

  if (
    binding.bindingClass === 'guaranteed' &&
    classesByPath.some((classes) => pathHasChance(classes) || pathHasConditional(classes))
  ) {
    addIssue(
      issues,
      'binding.class-contradiction',
      `${path}.bindingClass`,
      'Guaranteed bindings may reference only guaranteed components.',
    );
  }
  if (
    binding.bindingClass === 'conditional-deterministic' &&
    (classesByPath.some(pathHasChance) || !classesByPath.some(pathHasConditional))
  ) {
    addIssue(
      issues,
      'binding.class-contradiction',
      `${path}.bindingClass`,
      'Conditional-deterministic bindings require conditional components and no chance components.',
    );
  }
  if (
    binding.bindingClass === 'chance' &&
    classesByPath.some((classes) => !pathHasChance(classes))
  ) {
    addIssue(
      issues,
      'binding.class-contradiction',
      `${path}.bindingClass`,
      'Every chance binding path must include a chance component.',
    );
  }
}

function validatePath(
  candidate: SignalReliabilityPath,
  bindingPath: string,
  componentsById: ReadonlyMap<ReliabilityComponentId, AbilityReliabilityComponent>,
  referencedComponentIds: Set<ReliabilityComponentId>,
  issues: ReliabilityValidationIssue[],
): void {
  const path = `${bindingPath}.paths[${candidate.pathId || '<empty>'}]`;
  if (!candidate.pathId.trim()) {
    addIssue(
      issues,
      'binding.path-id-empty',
      `${path}.pathId`,
      'Reliability path IDs must not be empty.',
    );
  }
  if (candidate.appliesWhen && !SEMANTIC_ID_PATTERN.test(candidate.appliesWhen.id)) {
    addIssue(
      issues,
      'binding.path-applicability-id-malformed',
      `${path}.appliesWhen.id`,
      'Path applicability IDs must use non-empty kebab-case semantics.',
    );
  }
  if (candidate.events.length === 0) {
    addIssue(
      issues,
      'binding.events-empty',
      `${path}.events`,
      'A reliability path requires at least one jointly required event.',
    );
  }
  addDuplicateIssues(
    candidate.events.map((event) => event.eventId),
    'binding.event-duplicate',
    `${path}.events`,
    'Duplicate event identity; shared components belong in one event',
    issues,
  );

  const pathComponentIds: ReliabilityComponentId[] = [];
  for (const event of candidate.events) {
    const eventPath = `${path}.events[${event.eventId || '<empty>'}]`;
    if (!event.eventId.trim()) {
      addIssue(
        issues,
        'binding.event-id-empty',
        `${eventPath}.eventId`,
        'Reliability event IDs must not be empty.',
      );
    }
    if (event.componentReferences.length === 0) {
      addIssue(
        issues,
        'binding.event-components-empty',
        `${eventPath}.componentReferences`,
        'A reliability event requires at least one component.',
      );
    }
    addDuplicateIssues(
      event.componentReferences.map((reference) => reference.componentId),
      'binding.event-component-duplicate',
      `${eventPath}.componentReferences`,
      'Duplicate component within shared event',
      issues,
    );
    for (const reference of event.componentReferences) {
      const componentId = reference.componentId;
      pathComponentIds.push(componentId);
      referencedComponentIds.add(componentId);
      const component = componentsById.get(componentId);
      if (!component) {
        addIssue(
          issues,
          'binding.component-missing',
          `${eventPath}.componentReferences[${componentId}]`,
          `Binding references missing component "${componentId}".`,
        );
        continue;
      }
      validateComponentReference(reference, component, eventPath, issues);
    }
  }
  addDuplicateIssues(
    pathComponentIds,
    'binding.component-repeated-across-events',
    `${path}.events`,
    'Component appears in more than one jointly required event',
    issues,
  );
}

function validateComponentReference(
  reference: ReliabilityComponentReference,
  component: AbilityReliabilityComponent,
  eventPath: string,
  issues: ReliabilityValidationIssue[],
): void {
  const path = `${eventPath}.componentReferences[${reference.componentId}]`;
  if (component.probability?.kind === 'variants') {
    if (!reference.probabilityVariantId) {
      addIssue(
        issues,
        'binding.probability-variant-missing',
        `${path}.probabilityVariantId`,
        `Component "${reference.componentId}" requires an explicit probability variant.`,
      );
      return;
    }
    if (
      !component.probability.variants.some(
        (variant) => variant.id === reference.probabilityVariantId,
      )
    ) {
      addIssue(
        issues,
        'binding.probability-variant-unknown',
        `${path}.probabilityVariantId`,
        `Component "${reference.componentId}" has no probability variant "${reference.probabilityVariantId}".`,
      );
    }
    return;
  }
  if (reference.probabilityVariantId !== undefined) {
    addIssue(
      issues,
      'binding.probability-variant-unexpected',
      `${path}.probabilityVariantId`,
      `Component "${reference.componentId}" does not define probability variants.`,
    );
  }
}

function addDuplicateIssues(
  values: readonly string[],
  code: string,
  pathPrefix: string,
  label: string,
  issues: ReliabilityValidationIssue[],
): void {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const [value, count] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
    if (count > 1) {
      addIssue(
        issues,
        code,
        `${pathPrefix}[${value || '<empty>'}]`,
        `${label} "${value}" appears ${count} times.`,
      );
    }
  }
}

function addIssue(
  issues: ReliabilityValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function compareIssues(
  left: ReliabilityValidationIssue,
  right: ReliabilityValidationIssue,
): number {
  return (
    left.path.localeCompare(right.path) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}
