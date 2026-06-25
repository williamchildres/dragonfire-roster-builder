import { databaseMetadata } from '../data/databaseMetadata';
import { dragons as defaultDragons } from '../data/dragons';
import { manualReviewRecords } from '../data/manualReviews';
import { dragonObservationSnapshots } from '../data/observations';
import { FORMATION_POSITIONS, type AbilityDefinition, type Dragon, type FormationPosition, type OwnedDragon } from '../models/dragon';
import type {
  FormationAnalysisInput,
  FormationAuditEntry,
  RequirementTrace,
  SynergyAuditExport,
  SynergyTrace,
  TraceStatus,
} from '../models/synergy';
import {
  THRESHOLD_BOUNDARY_NOTE,
  arePositionsAdjacent,
  resolveThreeAllyTargets,
} from './formationRules';
import { analyzeCapabilityAmplifications } from './effectCapabilities';

export interface TraceOptions {
  roster?: Record<string, OwnedDragon>;
  previewMaxRankInteractions?: boolean;
  dragonLevels?: Record<string, number | null>;
}

const auditDragonIds = ['malachite', 'seasmoke', 'sheepstealer', 'vermax'] as const;

export const phase381ReviewFormations: Record<'A' | 'B' | 'C' | 'D', FormationAnalysisInput> = {
  A: { 'left-flank': 'malachite', vanguard: 'caraxes', 'right-flank': 'syrax' },
  B: { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'malachite' },
  C: { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'caraxes' },
  D: { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'malachite' },
};

export function analyzeFormationTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: TraceOptions = {},
): SynergyTrace[] {
  const traces: SynergyTrace[] = [];
  traces.push(...analyzeCapabilityAmplifications(formation, dragons, options));
  traces.push(...vermaxWarriorsZealTraces(formation, dragons, options));
  traces.push(...malachiteLightningStrikeTraces(formation, dragons, options));
  traces.push(...vanguardConflictTraces(formation, dragons));
  traces.push(...vanguardRequirementTraces(formation, dragons, options));
  traces.push(...wardenRecoverySelfInclusionTraces(formation, dragons));
  traces.push(...thresholdBoundaryTraces(formation, dragons));
  traces.push(...contextualPveTraces(formation, dragons));
  return dedupeFormationTraces(enforceSelectedFormationBoundary(formation, traces));
}

export function isNormalSynergyTrace(trace: SynergyTrace): boolean {
  return (
    trace.interactionScope !== 'internal' &&
    (
      (Boolean(trace.matchKind) && trace.matchKind !== 'periodic-damage-amplification') ||
      trace.ruleId === 'malachite-lightning-strike-vermax-basic-trigger'
    )
  );
}

export function isConditionalTrace(trace: SynergyTrace): boolean {
  return trace.status === 'potential' || trace.status === 'unknown';
}

export function dedupeTraceMessages(messages: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const message of messages) {
    const key = message.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(message);
  }
  return deduped;
}

export function assertSelectedFormationTraceInvariant(
  formation: FormationAnalysisInput,
  traces: SynergyTrace[],
): { passed: boolean; violations: string[] } {
  const selectedDragonIds = selectedFormationDragonIds(formation);
  const violations: string[] = [];
  for (const trace of traces) {
    if (!selectedDragonIds.has(trace.sourceDragonId)) {
      violations.push(`${trace.id}: source ${trace.sourceDragonId} is not selected`);
    }
    if (trace.recipientDragonId && !selectedDragonIds.has(trace.recipientDragonId)) {
      violations.push(`${trace.id}: recipient ${trace.recipientDragonId} is not selected`);
    }
  }
  return { passed: violations.length === 0, violations };
}

export function generateFormationAudit(
  dragons: Dragon[] = defaultDragons,
  options: TraceOptions = {},
): FormationAuditEntry[] {
  const entries: FormationAuditEntry[] = [];
  for (const omittedDragonId of auditDragonIds) {
    const selected = auditDragonIds.filter((dragonId) => dragonId !== omittedDragonId);
    for (const order of permutations([...selected])) {
      const formation: FormationAnalysisInput = {
        'left-flank': order[0] ?? null,
        vanguard: order[1] ?? null,
        'right-flank': order[2] ?? null,
      };
      const traces = analyzeFormationTraces(formation, dragons, options);
      entries.push({ formation, traces, countsByStatus: countTraceStatuses(traces) });
    }
  }
  return entries;
}

export function createSynergyAuditExport(
  formation: FormationAnalysisInput,
  traces: SynergyTrace[],
  userProgression: Record<string, unknown> = {},
): SynergyAuditExport {
  return {
    format: 'dragonfire-synergy-audit',
    schemaVersion: 1,
    databaseVersion: databaseMetadata.databaseVersion,
    gameBuild: databaseMetadata.currentDocumentedGameBuild,
    generatedAt: new Date().toISOString(),
    formation: {
      leftFlank: formation['left-flank'],
      vanguard: formation.vanguard,
      rightFlank: formation['right-flank'],
    },
    userProgression,
    battleContext: 'unspecified',
    traces,
  };
}

export function traceStatusReason(trace: SynergyTrace): string {
  const failed = trace.requirements.filter((requirement) => requirement.satisfied === false);
  const unknown = trace.requirements.filter((requirement) => requirement.satisfied === null);
  if (trace.status === 'active') {
    return 'All required source, target, placement, and unlock requirements are satisfied.';
  }
  if (trace.status === 'potential') {
    return failed.length > 0
      ? `Potential future interaction; currently blocked by ${failed.map((requirement) => requirement.label).join(', ')}.`
      : 'Potential or conditional interaction; trigger, target choice, or future progression is not guaranteed.';
  }
  if (trace.status === 'unknown') {
    return `Requirement state is unknown: ${unknown.map((requirement) => requirement.label).join(', ')}.`;
  }
  if (trace.status === 'blocked' || trace.status === 'inactive') {
    return `Inactive because ${failed.map((requirement) => requirement.label).join(', ')} is not satisfied.`;
  }
  return 'This trace does not apply to the current formation.';
}

export function targetPositionsForExactThreeAllies(formation: FormationAnalysisInput): FormationPosition[] {
  return resolveThreeAllyTargets(formation).map((target) => target.position);
}

export function targetPositionsForOtherAllies(
  formation: FormationAnalysisInput,
  sourcePosition: FormationPosition,
): FormationPosition[] {
  return FORMATION_POSITIONS.filter((position) => position !== sourcePosition && Boolean(formation[position]));
}

function vermaxWarriorsZealTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: TraceOptions,
): SynergyTrace[] {
  const source = findDragon('vermax', dragons);
  const recipient = findDragon(formation['left-flank'], dragons);
  if (!source?.trait || !recipient || recipient.id === 'vermax') {
    return [];
  }
  const requirements = [
    positionRequirement('vermax', formation, 'vanguard', source.trait.evidenceIds),
    targetPositionRequirement('left-flank', 'left-flank', source.trait.evidenceIds),
    ...abilityProgressionRequirements(source, source.trait, options),
  ];
  return [
    makeTrace({
      id: `vermax-warriors-zeal-left-${recipient.id}`,
      ruleId: 'vermax-vanguard-left-flank-trait',
      source,
      sourceAbility: source.trait,
      recipient,
      recipientAbility: null,
      title: "Warrior's Zeal Left Flank support",
      explanation: `${source.name} can increase Instinct and Initiative of the Left Flank ally while in Vanguard.`,
      requirements,
      matchedFacts: ['Trait target is explicitly Left Flank ally.'],
      effects: ['Left Flank ally Instinct +20 flat', 'Left Flank ally Initiative +20 flat'],
      assumptions: ['Warrior\'s Zeal Physical Damage source scope is handled by the generic capability framework.'],
      unresolvedQuestions: [...source.trait.unresolvedQuestions],
      potentialWhenLocked: options.previewMaxRankInteractions,
    }),
  ];
}

function malachiteLightningStrikeTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: TraceOptions,
): SynergyTrace[] {
  const source = findDragon('malachite', dragons);
  const recipient = findDragon('vermax', dragons);
  const sourcePosition = getDragonPosition(formation, 'malachite');
  const recipientPosition = getDragonPosition(formation, 'vermax');
  const habit = source?.habits.find((ability) => ability.id === 'malachite-lightning-strike') ?? null;
  if (!source || !recipient || !habit || !sourcePosition || !recipientPosition) {
    return [];
  }
  const requirements = [
    selectedRequirement('malachite', formation, habit.evidenceIds),
    selectedRequirement('vermax', formation, recipient.command?.evidenceIds ?? []),
    adjacencyRequirement(sourcePosition, recipientPosition, habit.evidenceIds),
    ...abilityProgressionRequirements(source, habit, options),
  ];
  return [
    makeTrace({
      id: 'malachite-lightning-strike-vermax',
      ruleId: 'malachite-lightning-strike-vermax-basic-trigger',
      source,
      sourceAbility: habit,
      recipient,
      recipientAbility: recipient.command,
      title: 'Lightning Strike may increase Vermax Basic Attack triggers',
      explanation:
        'Lightning Strike can grant Double-Strike to one adjacent ally. Vermax has an after-Basic-Attack Command, so a second Basic Attack can create another Command trigger.',
      requirements,
      matchedFacts: ['Lightning Strike grants Double-Strike.', 'Vermax Spreading Blaze triggers after Basic Attacks.'],
      effects: ['Potential extra Basic Attack', 'Potential additional Spreading Blaze trigger'],
      assumptions: ['Trigger success and target selection are not guaranteed.'],
      unresolvedQuestions: ['Exact enhanced-by-Instinct formula.'],
      forcedStatus: 'potential',
      potentialWhenLocked: true,
    }),
  ];
}

function vanguardRequirementTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  options: TraceOptions,
): SynergyTrace[] {
  return FORMATION_POSITIONS.flatMap((position) => {
    const dragon = findDragon(formation[position], dragons);
    if (!dragon?.trait || dragon.trait.positionRequirement !== 'vanguard') {
      return [];
    }
    const requirements = [
      targetPositionRequirement(position, 'vanguard', dragon.trait.evidenceIds),
      ...abilityProgressionRequirements(dragon, dragon.trait, options),
    ];
    return [
      makeTrace({
        id: `vanguard-requirement-${dragon.id}`,
        ruleId: 'vanguard-trait-requirement',
        source: dragon,
        sourceAbility: dragon.trait,
        recipient: dragon,
        recipientAbility: dragon.trait,
        title: `${dragon.trait.name} Vanguard requirement`,
        explanation: `${dragon.trait.name} requires ${dragon.name} to be deployed in Vanguard.`,
        requirements,
        matchedFacts: [],
        effects: [`${dragon.trait.name} ${position === 'vanguard' ? 'can be active' : 'is inactive due to placement'}.`],
        assumptions: [],
        unresolvedQuestions: [...dragon.trait.unresolvedQuestions],
        potentialWhenLocked: options.previewMaxRankInteractions,
      }),
    ];
  });
}

function vanguardConflictTraces(formation: FormationAnalysisInput, dragons: Dragon[]): SynergyTrace[] {
  const required = FORMATION_POSITIONS.map((position) => ({
    position,
    dragon: findDragon(formation[position], dragons),
  })).filter(
    (entry): entry is { position: FormationPosition; dragon: Dragon } =>
      Boolean(entry.dragon?.trait?.positionRequirement === 'vanguard'),
  );
  if (required.length < 2) {
    return [];
  }
  const active = required.find((entry) => entry.position === 'vanguard');
  return [
    makeTrace({
      id: 'vanguard-trait-conflict',
      ruleId: 'verified-vanguard-position-conflict',
      source: active?.dragon ?? required[0]!.dragon,
      sourceAbility: active?.dragon.trait ?? required[0]!.dragon.trait,
      recipient: null,
      recipientAbility: null,
      title: 'Multiple Vanguard Trait requirements',
      explanation:
        'Multiple selected dragons have Traits that require Vanguard. The formation is still usable, but only the dragon actually in Vanguard satisfies that placement requirement.',
      requirements: [
        {
          id: 'exclusive-vanguard-position',
          label: 'Vanguard exclusivity',
          expected: 'Only one Vanguard-required Trait can satisfy its placement at a time',
          actual: required.map((entry) => `${entry.dragon.name} in ${formatPosition(entry.position)}`).join(', '),
          satisfied: false,
          evidenceIds: required.flatMap((entry) => entry.dragon.trait?.evidenceIds ?? []),
          notes: [
            active
              ? `${active.dragon.name}'s Vanguard Trait placement is active.`
              : 'No Vanguard-required Trait is currently placed in Vanguard.',
          ],
        },
      ],
      matchedFacts: required.map((entry) => `${entry.dragon.name} has a Vanguard-required Trait.`),
      effects: active ? [`${active.dragon.name}'s Vanguard Trait is the placed active Trait.`] : [],
      assumptions: [],
      unresolvedQuestions: [],
      forcedStatus: 'blocked',
      potentialWhenLocked: false,
      extraConflicts: required
        .filter((entry) => entry.position !== 'vanguard')
        .map((entry) => `${entry.dragon.name}'s ${entry.dragon.trait?.name ?? 'Trait'} is inactive due to placement.`),
    }),
  ];
}


function wardenRecoverySelfInclusionTraces(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
): SynergyTrace[] {
  const source = findDragon('malachite', dragons);
  if (!source?.command || !FORMATION_POSITIONS.some((position) => formation[position] === 'malachite')) {
    return [];
  }
  const targets = resolveThreeAllyTargets(formation);
  const malachiteTarget = targets.find((target) => target.dragonId === 'malachite');
  return [
    makeTrace({
      id: 'malachite-wardens-rally-three-allies-self',
      ruleId: 'three-allies-includes-caster',
      source,
      sourceAbility: source.command,
      recipient: source,
      recipientAbility: source.command,
      title: "Warden's Rally Recovery includes Malachite",
      explanation:
        "Manual combat-log observation confirms that Warden's Rally Recovery can include Malachite as a recipient in a three-dragon formation.",
      requirements: [
        selectedRequirement('malachite', formation, ['malachite-wardens-rally-combat-log-self-recovery-2026-06-24']),
        {
          id: 'three-allies-targeting',
          label: 'Three-Allies target normalization',
          expected: 'All three friendly dragons, including caster',
          actual: targets.map((target) => `${target.position}:${target.dragonId}`).join(', '),
          satisfied: Boolean(malachiteTarget),
          evidenceIds: ['malachite-wardens-rally-combat-log-self-recovery-2026-06-24'],
          notes: ['Do not generalize this to singular Ally or other Allies wording.'],
        },
      ],
      matchedFacts: ["Malachite appeared as a Warden's Rally Recovery recipient in combat logs."],
      effects: ['Recovery target set includes Malachite when three friendly dragons are present.'],
      assumptions: [],
      unresolvedQuestions: [],
      forcedStatus: 'not-applicable',
      potentialWhenLocked: false,
      forcedConfidence: 'confirmed',
      combatLogConfirmed: true,
    }),
  ];
}

export function frameworkTraceReportData(
  dragons: Dragon[] = defaultDragons,
  options: TraceOptions = { previewMaxRankInteractions: true },
) {
  return {
    databaseVersion: databaseMetadata.databaseVersion,
    schemaVersion: databaseMetadata.schemaVersion,
    gameBuild: databaseMetadata.currentDocumentedGameBuild,
    formations: phase381ReviewFormations,
    traces: Object.fromEntries(
      Object.entries(phase381ReviewFormations).map(([name, formation]) => [
        name,
        analyzeFormationTraces(formation, dragons, options),
      ]),
    ),
  };
}

function thresholdBoundaryTraces(formation: FormationAnalysisInput, dragons: Dragon[]): SynergyTrace[] {
  const thresholdDragon = FORMATION_POSITIONS.map((position) => findDragon(formation[position], dragons)).find((dragon) =>
    dragon?.habits.some((habit) =>
      habit.schedules.some((schedule) =>
        schedule.conditions?.some((condition) => condition.thresholdPercent === 50),
      ),
    ),
  );
  if (!thresholdDragon) {
    return [];
  }
  return [
    makeTrace({
      id: `threshold-boundary-${thresholdDragon.id}`,
      ruleId: 'threshold-boundary-textual-interpretation',
      source: thresholdDragon,
      sourceAbility: null,
      recipient: null,
      recipientAbility: null,
      title: 'Troop Capacity threshold boundary',
      explanation: THRESHOLD_BOUNDARY_NOTE,
      requirements: [],
      matchedFacts: ['Above uses > threshold.', 'Below uses < threshold.', 'Exactly equal matches neither textual operator.'],
      effects: [],
      assumptions: ['Conservative textual interpretation only.'],
      unresolvedQuestions: ['Exact-boundary game behavior has not been combat-log confirmed.'],
      forcedStatus: 'unknown',
      potentialWhenLocked: false,
    }),
  ];
}

function contextualPveTraces(formation: FormationAnalysisInput, dragons: Dragon[]): SynergyTrace[] {
  const sheepstealer = findDragon('sheepstealer', dragons);
  if (!sheepstealer || !FORMATION_POSITIONS.some((position) => formation[position] === 'sheepstealer')) {
    return [];
  }
  const stolenFlock = sheepstealer.habits.find((habit) => habit.id === 'sheepstealer-stolen-flock');
  if (!stolenFlock) {
    return [];
  }
  return [
    makeTrace({
      id: 'sheepstealer-stolen-flock-pve-context',
      ruleId: 'pve-contextual-effect',
      source: sheepstealer,
      sourceAbility: stolenFlock,
      recipient: sheepstealer,
      recipientAbility: stolenFlock,
      title: 'Stolen Flock PvE context',
      explanation: 'Stolen Flock has a non-player food-tile schedule that remains contextual in generic formation analysis.',
      requirements: [
        {
          id: 'battle-context',
          label: 'Battle-context requirement',
          expected: 'Non-player food tile or beast encounter',
          actual: 'unspecified',
          satisfied: null,
          evidenceIds: stolenFlock.evidenceIds,
          notes: ['PvE-only effects remain contextual and are not treated as active in unspecified formation analysis.'],
        },
      ],
      matchedFacts: ['Stolen Flock contains a non-player food-tile schedule.'],
      effects: ['PvE Fire Damage bonus is contextual.'],
      assumptions: [],
      unresolvedQuestions: [],
      forcedStatus: 'unknown',
      potentialWhenLocked: false,
    }),
  ];
}

function makeTrace({
  id,
  ruleId,
  source,
  sourceAbility,
  recipient,
  recipientAbility,
  title,
  explanation,
  requirements,
  matchedFacts,
  effects,
  assumptions,
  unresolvedQuestions,
  forcedStatus,
  potentialWhenLocked,
  extraConflicts = [],
  forcedConfidence,
  combatLogConfirmed = false,
  providedEffectType = null,
  recipientModifierType = null,
  recipientModifierAbilityId = null,
  recipientModifierValue = null,
  exactResultKnown,
  exactResultUnknownReason = null,
}: {
  id: string;
  ruleId: string;
  source: Dragon;
  sourceAbility: AbilityDefinition | null;
  recipient: Dragon | null;
  recipientAbility: AbilityDefinition | null;
  title: string;
  explanation: string;
  requirements: RequirementTrace[];
  matchedFacts: string[];
  effects: string[];
  assumptions: string[];
  unresolvedQuestions: string[];
  forcedStatus?: TraceStatus;
  potentialWhenLocked: boolean | undefined;
  extraConflicts?: string[];
  forcedConfidence?: SynergyTrace['confidence'];
  combatLogConfirmed?: boolean;
  providedEffectType?: string | null;
  recipientModifierType?: string | null;
  recipientModifierAbilityId?: string | null;
  recipientModifierValue?: number | null;
  exactResultKnown?: boolean;
  exactResultUnknownReason?: string | null;
}): SynergyTrace {
  const inferredStatus = inferStatus(requirements, potentialWhenLocked === true);
  const hasHardFailure = requirements.some((requirement) => requirement.satisfied === false && isHardRequirement(requirement));
  const status = forcedStatus === 'potential' && hasHardFailure
    ? inferredStatus
    : (forcedStatus ?? inferredStatus);
  const manualReviews = manualReviewRecords.filter(
    (review) =>
      review.dragonId === source.id ||
      (recipient ? review.dragonId === recipient.id : false),
  );
  const hasFollowUp = manualReviews.some((review) => review.status === 'needs-follow-up');
  const hasProvisional = manualReviews.some((review) => review.status === 'provisional');
  return {
    id,
    ruleId,
    status,
    confidence: forcedConfidence ??
      (hasFollowUp || unresolvedQuestions.length > 0
        ? 'unresolved'
        : hasProvisional
          ? 'medium'
          : 'confirmed'),
    sourceDragonId: source.id,
    sourceAbilityId: sourceAbility?.id ?? null,
    recipientDragonId: recipient?.id ?? null,
    recipientAbilityId: recipientAbility?.id ?? null,
    title,
    explanation,
    requirements,
    matchedFacts,
    effects,
    conflicts: [
      ...requirements
      .filter((requirement) => requirement.satisfied === false)
      .map((requirement) => `${requirement.label}: expected ${requirement.expected}, actual ${requirement.actual ?? 'unknown'}`),
      ...extraConflicts,
    ],
    assumptions,
    unresolvedQuestions,
    sourceEvidenceIds: sourceAbility?.evidenceIds ?? [],
    recipientEvidenceIds: recipientAbility?.evidenceIds ?? [],
    providedEffectType,
    recipientModifierType,
    recipientModifierAbilityId,
    recipientModifierValue,
    combatLogConfirmed,
    exactResultKnown,
    exactResultUnknownReason,
    interactionScope: source.id === recipient?.id ? 'internal' : recipient ? 'cross-dragon' : 'targeting-fact',
  };
}

function inferStatus(requirements: RequirementTrace[], potentialWhenLocked: boolean): TraceStatus {
  const failed = requirements.filter((requirement) => requirement.satisfied === false);
  if (failed.some(isHardRequirement)) {
    return 'inactive';
  }
  if (requirements.some((requirement) => requirement.satisfied === null)) {
    return 'unknown';
  }
  if (failed.length === 0) {
    return 'active';
  }
  return potentialWhenLocked && failed.some((requirement) => /Star Rank|Habit Level|Dragon Level|Collection state/.test(requirement.label))
    ? 'potential'
    : 'inactive';
}

function isHardRequirement(requirement: RequirementTrace): boolean {
  return /selected in formation|\b[a-z0-9-]+-selected\b|provider position|required source position|required target position|position compatibility|source-scope compatibility|provider targeting|status targeting|adjacency|explicit caster|battlefield/i.test(
    `${requirement.id} ${requirement.label}`,
  );
}

function abilityProgressionRequirements(
  dragon: Dragon,
  ability: AbilityDefinition,
  options: TraceOptions,
): RequirementTrace[] {
  const rosterEntry = options.roster?.[dragon.id];
  const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === dragon.id);
  const starRank = rosterEntry?.starRank ?? observation?.starRank ?? null;
  const dragonLevel = Object.hasOwn(options.dragonLevels ?? {}, dragon.id)
    ? (options.dragonLevels?.[dragon.id] ?? null)
    : (rosterEntry?.reignLevel ?? observation?.dragonLevel ?? null);
  const habitLevel = rosterEntry?.habitLevels[ability.id] ?? null;
  const requirements: RequirementTrace[] = [];
  if (options.roster) {
    requirements.push({
      id: `${ability.id}-collection`,
      label: 'Collection state',
      expected: 'Hatched or previewing selected dragon',
      actual: rosterEntry?.collection.state ?? 'preview/unknown',
      satisfied: rosterEntry ? rosterEntry.collection.state === 'hatched' : null,
      evidenceIds: [],
      notes: ['A not-collected or not-hatched dragon can be previewed but is not available in owned-only play.'],
    });
  }
  if (ability.minimumDragonLevel !== null) {
    requirements.push({
      id: `${ability.id}-minimum-level`,
      label: 'Dragon Level requirement',
      expected: `Level ${ability.minimumDragonLevel}+`,
      actual: dragonLevel === null ? null : `Level ${dragonLevel}`,
      satisfied: dragonLevel === null ? null : dragonLevel >= ability.minimumDragonLevel,
      evidenceIds: ability.evidenceIds,
      notes: [],
    });
  }
  if (ability.unlockStarRank !== null) {
    requirements.push({
      id: `${ability.id}-star-rank`,
      label: ability.kind === 'habit' ? 'Habit unlock requirement' : 'Star Rank requirement',
      expected: `Star Rank ${ability.unlockStarRank}+`,
      actual: starRank === null ? null : `Star Rank ${starRank}`,
      satisfied: starRank === null ? null : starRank >= ability.unlockStarRank,
      evidenceIds: ability.evidenceIds,
      notes: [],
    });
  }
  if (ability.kind === 'habit') {
    requirements.push({
      id: `${ability.id}-habit-level`,
      label: 'Selected Habit Level',
      expected: 'Recorded Habit Level 1-5 for current active value, or preview',
      actual: habitLevel === null ? null : `Habit Level ${habitLevel}`,
      satisfied: habitLevel === null ? null : habitLevel > 0,
      evidenceIds: [],
      notes: ['Habit Level 0 means explicitly no upgrades; null means not recorded.'],
    });
  }
  return requirements;
}

function positionRequirement(
  dragonId: string,
  formation: FormationAnalysisInput,
  expectedPosition: FormationPosition,
  evidenceIds: string[],
): RequirementTrace {
  const actual = getDragonPosition(formation, dragonId);
  return {
    id: `${dragonId}-position-${expectedPosition}`,
    label: 'Required source position',
    expected: formatPosition(expectedPosition),
    actual: actual ? formatPosition(actual) : null,
    satisfied: actual === null ? false : actual === expectedPosition,
    evidenceIds,
    notes: [],
  };
}

function targetPositionRequirement(
  actualPosition: FormationPosition,
  expectedPosition: FormationPosition,
  evidenceIds: string[],
): RequirementTrace {
  return {
    id: `target-position-${expectedPosition}`,
    label: 'Required target position',
    expected: formatPosition(expectedPosition),
    actual: formatPosition(actualPosition),
    satisfied: actualPosition === expectedPosition,
    evidenceIds,
    notes: [],
  };
}

function selectedRequirement(
  dragonId: string,
  formation: FormationAnalysisInput,
  evidenceIds: string[],
): RequirementTrace {
  const actual = getDragonPosition(formation, dragonId);
  return {
    id: `${dragonId}-selected`,
    label: `${dragonId} selected`,
    expected: 'Selected in formation',
    actual: actual ? formatPosition(actual) : null,
    satisfied: actual !== null,
    evidenceIds,
    notes: [],
  };
}

function adjacencyRequirement(
  sourcePosition: FormationPosition,
  recipientPosition: FormationPosition,
  evidenceIds: string[],
): RequirementTrace {
  return {
    id: `adjacency-${sourcePosition}-${recipientPosition}`,
    label: 'Adjacency requirement',
    expected: `${formatPosition(sourcePosition)} adjacent to ${formatPosition(recipientPosition)}`,
    actual: arePositionsAdjacent(sourcePosition, recipientPosition)
      ? 'Adjacent'
      : 'Not adjacent',
    satisfied: arePositionsAdjacent(sourcePosition, recipientPosition),
    evidenceIds,
    notes: ['Friendly adjacency graph is confirmed as Left Flank - Vanguard - Right Flank.'],
  };
}

function findDragon(dragonId: string | null | undefined, dragons: Dragon[]): Dragon | null {
  return dragonId ? dragons.find((dragon) => dragon.id === dragonId) ?? null : null;
}

function getDragonPosition(formation: FormationAnalysisInput, dragonId: string): FormationPosition | null {
  return FORMATION_POSITIONS.find((position) => formation[position] === dragonId) ?? null;
}

function formatPosition(position: FormationPosition): string {
  return position
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) {
    return [values];
  }
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
      value,
      ...rest,
    ]),
  );
}

function countTraceStatuses(traces: SynergyTrace[]): Record<TraceStatus, number> {
  const counts: Record<TraceStatus, number> = {
    active: 0,
    potential: 0,
    inactive: 0,
    blocked: 0,
    unknown: 0,
    'not-applicable': 0,
  };
  for (const trace of traces) {
    counts[trace.status] += 1;
  }
  return counts;
}

function enforceSelectedFormationBoundary(
  formation: FormationAnalysisInput,
  traces: SynergyTrace[],
): SynergyTrace[] {
  const selectedDragonIds = selectedFormationDragonIds(formation);
  return traces.filter(
    (trace) =>
      selectedDragonIds.has(trace.sourceDragonId) &&
      (!trace.recipientDragonId || selectedDragonIds.has(trace.recipientDragonId)) &&
      (trace.matchedOutputCapabilityIds ?? []).every((capabilityId) => selectedDragonIds.has(capabilityId.split('-')[0] ?? '')),
  );
}

function dedupeFormationTraces(traces: SynergyTrace[]): SynergyTrace[] {
  const byKey = new Map<string, SynergyTrace>();
  for (const trace of traces.map((item) => ({
    ...item,
    requirements: dedupeRequirements(item.requirements),
  }))) {
    const key = semanticTraceKey(trace);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, trace);
      continue;
    }
    byKey.set(key, {
      ...existing,
      requirements: dedupeRequirements([...existing.requirements, ...trace.requirements]),
      matchedFacts: unique([...existing.matchedFacts, ...trace.matchedFacts]),
      effects: unique([...existing.effects, ...trace.effects]),
      conflicts: unique([...existing.conflicts, ...trace.conflicts]),
      assumptions: unique([
        ...existing.assumptions,
        ...trace.assumptions,
        'Structurally duplicate raw traces were collapsed.',
      ]),
      unresolvedQuestions: unique([...existing.unresolvedQuestions, ...trace.unresolvedQuestions]),
      sourceEvidenceIds: unique([...existing.sourceEvidenceIds, ...trace.sourceEvidenceIds]),
      recipientEvidenceIds: unique([...existing.recipientEvidenceIds, ...trace.recipientEvidenceIds]),
      matchedOutputCapabilityIds: unique([
        ...(existing.matchedOutputCapabilityIds ?? []),
        ...(trace.matchedOutputCapabilityIds ?? []),
      ]),
      sourceScopeResults: [
        ...(existing.sourceScopeResults ?? []),
        ...(trace.sourceScopeResults ?? []),
      ],
    });
  }
  return [...byKey.values()];
}

function semanticTraceKey(trace: SynergyTrace): string {
  return [
    trace.matchKind ?? trace.ruleId,
    trace.sourceDragonId,
    trace.sourceAbilityId ?? '',
    trace.recipientDragonId ?? '',
    trace.recipientAbilityId ?? '',
    trace.matchKind === 'defensive-ally-support' ? '' : (trace.modifierCapabilityId ?? ''),
    trace.channel ?? '',
    trace.targetSelectionGroup
      ? `selection:${trace.targetSelectionGroup.targetCount}:${trace.targetSelectionGroup.eligibleRecipientDragonIds.join(',')}`
      : '',
    [...(trace.matchedOutputCapabilityIds ?? [])].sort().join(','),
  ].join('|');
}

function selectedFormationDragonIds(formation: FormationAnalysisInput): Set<string> {
  return new Set(Object.values(formation).filter((dragonId): dragonId is string => Boolean(dragonId)));
}

function dedupeRequirements(requirements: RequirementTrace[]): RequirementTrace[] {
  const byKey = new Map<string, RequirementTrace>();
  for (const requirement of requirements) {
    const key = [
      requirement.id,
      requirement.label,
      requirement.expected,
      requirement.actual ?? '',
      String(requirement.satisfied),
    ].join('|');
    if (!byKey.has(key)) {
      byKey.set(key, requirement);
    }
  }
  return [...byKey.values()];
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
