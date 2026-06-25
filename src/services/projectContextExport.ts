import { databaseMetadata, repository } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { manualReviewRecords } from '../data/manualReviews';
import { dragonObservationSnapshots } from '../data/observations';
import { dragonStatDefinitions } from '../data/statDefinitions';
import { statusGlossary } from '../data/statusGlossary';
import { defaultSynergyRules } from '../data/synergyRules';
import { FORMATION_POSITIONS, type AbilityDefinition, type Dragon, type FormationPosition } from '../models/dragon';
import type { FormationAnalysisInput, ModifierCapability, OutputCapability, SynergyTrace } from '../models/synergy';
import {
  deriveDragonEffectProfiles,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
  sourceScopesCompatible,
} from './effectCapabilities';
import { FORMATION_ADJACENCY, validateFormationAdjacencySymmetry } from './formationRules';
import { analyzeFormation } from './synergyEngine';
import { analyzeFormationTraces, phase381ReviewFormations } from './synergyTrace';

export const projectContextFormat = 'dragonfire-lab-project-context' as const;
export const contextVersion = 1;
export const populatedDragonIds = ['syrax', 'vhagar', 'caraxes', 'seasmoke', 'crimson', 'kalspire', 'malachite', 'venator', 'sheepstealer', 'vermax'] as const;

export interface ProjectContextBuildOptions {
  generatedAt: string;
  branch: string;
  commit: string;
  testTotals?: ProjectStateTestTotals;
}

export interface ProjectStateTestTotals {
  runner: string;
  testFileCount: number | null;
  testCaseCount: number | null;
  lastRunStatus: 'not-run-by-exporter' | 'passed' | 'failed' | 'unknown';
  countingMethod?: string;
}

export interface ProjectContextFileSet {
  files: Record<string, string>;
  summary: {
    dragonFileCount: number;
    populatedDragonCount: number;
    metadataOnlyDragonCount: number;
    formationReviewCaseCount: number;
    unresolvedMechanicsCount: number;
  };
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  summary: ProjectContextFileSet['summary'] & {
    schemaValidatedFiles: number;
  };
}

type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type TraceSummary = ReturnType<typeof traceSummary>;

interface SchemaValidationError {
  path: string;
  message: string;
}

interface FormationReviewCaseExport {
  caseId: string;
  label: string;
  formation: {
    leftFlank: string | null;
    vanguard: string | null;
    rightFlank: string | null;
  };
  formationDragonIds: FormationAnalysisInput;
  currentModeExpectedInteractions: TraceSummary[];
  previewModeExpectedInteractions: TraceSummary[];
  expectedInactiveTraits: TraceSummary[];
  expectedExclusions: string[];
  importantFalsePositivesToPrevent: string[];
  relevantEvidenceIds: string[];
  reviewStatus: 'pending' | 'confirmed' | 'contradicted' | 'needs-correction';
  reviewerNotes: string[];
}

const sourceBase = (options: ProjectContextBuildOptions) => ({
  repository: repository.url,
  branch: options.branch,
  commit: options.commit,
  databaseVersion: databaseMetadata.databaseVersion,
  dataSchemaVersion: databaseMetadata.schemaVersion,
  localRosterSchemaVersion: 3,
  gameBuild: databaseMetadata.currentDocumentedGameBuild,
});

export function buildProjectContextFiles(options: ProjectContextBuildOptions): ProjectContextFileSet {
  const source = sourceBase(options);
  const outputs = deriveOutputCapabilities(dragons);
  const modifiers = deriveModifierCapabilities(dragons);
  const statusOutputs = deriveStatusOutputCapabilities(dragons);
  const periodicDamage = derivePeriodicDamageDefinitions(dragons);
  const profiles = buildDragonProfiles(options, outputs, modifiers, statusOutputs, periodicDamage);
  const formationRules = buildFormationRules();
  const capabilityFramework = buildCapabilityFramework(outputs, modifiers, statusOutputs, periodicDamage);
  const formationReviewCases = buildFormationReviewCases();
  const expectedInteractions: unknown[] = [];
  for (const reviewCase of formationReviewCases) {
    for (const interaction of reviewCase.previewModeExpectedInteractions) {
      expectedInteractions.push(interaction);
    }
  }
  const unresolvedMechanics = buildUnresolvedMechanics();
  const projectState = buildProjectState(options, profiles, unresolvedMechanics);
  const evidenceSummary = evidenceSources;
  const manualReviews = manualReviewRecords;
  const projectContext = {
    format: projectContextFormat,
    contextVersion,
    generatedAt: options.generatedAt,
    source,
    projectRules: buildProjectRules(),
    rosterSummary: buildRosterSummary(profiles),
    dragons: profiles,
    statusGlossary,
    statDefinitions: dragonStatDefinitions,
    formationRules,
    capabilityFramework,
    expectedInteractions,
    manualReviews,
    evidenceSummary,
    formationReviewCases,
    unresolvedMechanics,
  };

  const schemas = buildSchemas();
  const files: Record<string, string> = {
    'project-context/README.md': buildReadme(),
    'project-context/PROJECT_CONTEXT.md': buildProjectContextMarkdown(projectState, unresolvedMechanics),
    'project-context/dragonfire-project-context.json': stringifyJson(projectContext),
    'project-context/project-state.json': stringifyJson(projectState),
    'project-context/formation-review-cases.json': stringifyJson(formationReviewCases),
    'project-context/unresolved-mechanics.json': stringifyJson(unresolvedMechanics),
    'project-context/dragons/index.json': stringifyJson(buildDragonIndex(profiles)),
    'project-context/synergy/capability-framework.json': stringifyJson(capabilityFramework),
    'project-context/synergy/formation-rules.json': stringifyJson(formationRules),
    'project-context/synergy/expected-interactions.json': stringifyJson(projectContext.expectedInteractions),
    'project-context/glossary/statuses.json': stringifyJson(statusGlossary),
    'project-context/glossary/stats.json': stringifyJson(dragonStatDefinitions),
    'project-context/reviews/manual-reviews.json': stringifyJson(manualReviews),
    'project-context/reviews/evidence-summary.json': stringifyJson(evidenceSummary),
    'project-context/schemas/dragon-profile.schema.json': stringifyJson(schemas.dragonProfile),
    'project-context/schemas/project-context.schema.json': stringifyJson(schemas.projectContext),
    'project-context/schemas/synergy-capability.schema.json': stringifyJson(schemas.synergyCapability),
    'project-context/schemas/formation-review-case.schema.json': stringifyJson(schemas.formationReviewCase),
  };

  for (const profile of profiles) {
    files[`project-context/dragons/${profile.slug}.json`] = stringifyJson(profile);
  }

  return {
    files,
    summary: {
      dragonFileCount: profiles.length,
      populatedDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'detailed-combat-data').length,
      metadataOnlyDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'metadata-only').length,
      formationReviewCaseCount: formationReviewCases.length,
      unresolvedMechanicsCount: unresolvedMechanics.length,
    },
  };
}

export function validateProjectContextFiles(serializedFiles: Record<string, string>, options: ProjectContextBuildOptions): ValidationResult {
  const expected = buildProjectContextFiles(options);
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = new Map<string, JsonValue>();

  for (const [filePath, content] of Object.entries(serializedFiles).filter(([filePath]) => filePath.endsWith('.json'))) {
    try {
      parsed.set(filePath, JSON.parse(content) as JsonValue);
    } catch (error) {
      errors.push(`${filePath}: invalid JSON (${String(error)})`);
    }
  }

  for (const filePath of Object.keys(expected.files)) {
    if (!Object.hasOwn(serializedFiles, filePath)) {
      errors.push(`Missing generated file: ${filePath}`);
    }
  }

  const schemas = buildSchemas();
  let schemaValidatedFiles = 0;
  schemaValidatedFiles += validateWithSchema(parsed, 'project-context/dragonfire-project-context.json', schemas.projectContext, errors);
  schemaValidatedFiles += validateWithSchema(parsed, 'project-context/formation-review-cases.json', {
    type: 'array',
    items: schemas.formationReviewCase,
  }, errors);
  for (const dragon of dragons) {
    schemaValidatedFiles += validateWithSchema(parsed, `project-context/dragons/${dragon.slug}.json`, schemas.dragonProfile, errors);
  }
  schemaValidatedFiles += validateWithSchema(parsed, 'project-context/synergy/capability-framework.json', schemas.synergyCapability, errors);

  const dragonFiles = [...parsed.keys()].filter((filePath) => /^project-context\/dragons\/(?!index\.json$)[^/]+\.json$/.test(filePath));
  if (dragonFiles.length !== dragons.length) {
    errors.push(`Expected exactly ${dragons.length} dragon profile files, found ${dragonFiles.length}.`);
  }

  validateNoLocalPathsOrSecrets(serializedFiles, errors);
  validateVersions(parsed, errors);
  validateDragonExports(parsed, errors);
  validateFormationNormalizationExports(parsed, errors);
  validateReferences(parsed, errors);
  validateConsolidatedAgreement(parsed, errors);
  validateDeterministicFiles(serializedFiles, expected.files, errors);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    summary: {
      ...expected.summary,
      schemaValidatedFiles,
    },
  };
}

function validateFormationNormalizationExports(parsed: Map<string, JsonValue>, errors: string[]) {
  const framework = parsed.get('project-context/synergy/capability-framework.json');
  if (!isJsonObject(framework) || !isJsonObject(framework.derivedCapabilities)) {
    return;
  }
  for (const collectionName of ['allySupport', 'selfAmplification', 'recipientSideAmplification'] as const) {
    const collection = framework.derivedCapabilities[collectionName];
    if (!Array.isArray(collection)) {
      continue;
    }
    for (const item of collection) {
      if (!isJsonObject(item) || item.abilityId !== 'vermax-trial-by-flame' || !isJsonObject(item.targetSelector)) {
        continue;
      }
      if ([75, 50, 25].includes(Number(item.targetSelector.count))) {
        errors.push('Trial by Flame exported a troop threshold as targetSelector.count.');
      }
    }
  }
}

function buildDragonProfiles(
  options: ProjectContextBuildOptions,
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  statusOutputs: ReturnType<typeof deriveStatusOutputCapabilities>,
  periodicDamage: ReturnType<typeof derivePeriodicDamageDefinitions>,
) {
  const source = sourceBase(options);
  return dragons.map((dragon) => {
    const abilities = allAbilities(dragon);
    const evidenceIds = uniqueSorted([
      ...abilities.flatMap((ability) => ability.evidenceIds),
      ...Object.values(dragon.fieldVerification).map((verification) => verification?.source ?? ''),
      ...dragonObservationSnapshots.filter((snapshot) => snapshot.dragonId === dragon.id).flatMap((snapshot) => snapshot.evidenceIds),
      ...manualReviewRecords.filter((review) => review.dragonId === dragon.id).flatMap((review) => review.evidenceIds),
    ].filter(Boolean));
    return {
      format: 'dragonfire-dragon-profile',
      contextVersion,
      generatedAt: options.generatedAt,
      source,
      id: dragon.id,
      slug: dragon.slug,
      name: dragon.name,
      rarity: dragon.rarity,
      breed: dragon.breed,
      officialProfileUrl: dragon.officialProfileUrl,
      rosterSourceStatus: dragon.rosterSourceStatus,
      firstObservedInGame: dragon.firstObservedInGame,
      gameVersion: dragon.gameVersion,
      isNew: dragon.isNew,
      dataStatus: dragon.dataStatus,
      lastVerified: dragon.lastVerified,
      notes: dragon.notes,
      verificationBySection: dragon.fieldVerification,
      affinities: dragon.affinities,
      stats: dragon.stats,
      tags: dragon.tags,
      command: dragon.command,
      trait: dragon.trait,
      habits: dragon.habits,
      abilities,
      rawDescriptions: abilities.map((ability) => ({
        abilityId: ability.id,
        abilityName: ability.name,
        kind: ability.kind,
        rawDescription: ability.rawDescription,
      })),
      rankedValues: abilities.flatMap((ability) => collectRankedValues(ability)),
      abilitySchedules: abilities.flatMap((ability) => ability.schedules.map((schedule) => ({
        abilityId: ability.id,
        abilityName: ability.name,
        schedule,
      }))),
      effects: abilities.flatMap((ability) => ability.schedules.flatMap((schedule) =>
        schedule.effects.map((effect) => ({
          abilityId: ability.id,
          scheduleId: schedule.id,
          effect,
        })),
      )),
      attempts: abilities.flatMap((ability) => ability.schedules.filter((schedule) => schedule.attempts).map((schedule) => ({
        abilityId: ability.id,
        scheduleId: schedule.id,
        attempts: schedule.attempts,
      }))),
      repetitions: abilities.flatMap((ability) => ability.schedules.filter((schedule) => schedule.repeat).map((schedule) => ({
        abilityId: ability.id,
        scheduleId: schedule.id,
        repeat: schedule.repeat,
      }))),
      statusOutputs: statusOutputs.filter((capability) => capability.dragonId === dragon.id),
      periodicDamage: periodicDamage.filter((definition) => definition.dragonId === dragon.id),
      dependencies: outputs.filter((capability) => capability.dragonId === dragon.id).flatMap((capability) => capability.dependencies.map((dependency) => ({
        outputCapabilityId: capability.id,
        dependency,
      }))),
      outputCapabilities: outputs.filter((capability) => capability.dragonId === dragon.id),
      modifierCapabilities: modifiers.filter((capability) => capability.dragonId === dragon.id),
      modifierRoles: uniqueSorted(modifiers.filter((capability) => capability.dragonId === dragon.id).map((capability) => capability.role)),
      availabilityRequirements: abilities.flatMap((ability) => availabilityRequirementsForAbility(ability)),
      observationSnapshots: dragonObservationSnapshots.filter((snapshot) => snapshot.dragonId === dragon.id).map((snapshot) => ({
        ...snapshot,
        sourceScope: 'noncanonical-account-observation',
      })),
      evidenceReferences: evidenceSources.filter((sourceRecord) => evidenceIds.includes(sourceRecord.id)),
      manualReviewReferences: manualReviewRecords.filter((review) => review.dragonId === dragon.id),
      unresolvedQuestions: uniqueSorted([
        ...dragon.unresolvedQuestions,
        ...abilities.flatMap((ability) => ability.unresolvedQuestions),
      ]),
      profileCompleteness: isPopulatedDragon(dragon) ? 'detailed-combat-data' : 'metadata-only',
    };
  });
}

function buildFormationRules() {
  return {
    positions: FORMATION_POSITIONS.map((position) => ({
      id: position,
      label: formatPosition(position),
    })),
    adjacency: FORMATION_ADJACENCY,
    adjacencySymmetric: validateFormationAdjacencySymmetry(),
    targetingLanguageRules: [
      {
        id: 'plain-ally-caster-eligible',
        wording: 'Ally / Allies',
        casterEligibility: 'eligible-if-targeting-allows',
        notes: ['Plain Ally/Allies may include the caster when targeting permits.'],
      },
      {
        id: 'other-ally-caster-excluded',
        wording: 'Other Ally / Other Allies',
        casterEligibility: 'excluded',
        notes: ['Other Ally/Other Allies excludes the caster.'],
      },
      {
        id: 'spatial-self-adjacency-exclusion',
        wording: 'within adjacency',
        casterEligibility: 'excluded-by-spatial-rule',
        notes: ['A caster is not adjacent to itself.'],
      },
    ],
    thresholdRules: [
      {
        id: 'strict-threshold-language',
        description: 'Above and below threshold wording is interpreted strictly until combat logs prove otherwise.',
      },
    ],
  };
}

function buildProjectRules() {
  return {
    combatDataPolicy: 'Typed source records are authoritative. Metadata-only dragons must not gain invented combat data.',
    scoringPolicy: 'No arbitrary numerical synergy score is generated.',
    selfAmplificationPolicy: 'Self-amplification is visible in capability review but does not create teammate synergy.',
    enemyDebuffPolicy: 'Enemy debuffs are separate from ally support.',
    sourceDataPolicy: 'Capabilities derive from structured AbilityEffect data, except the reviewed Vermax Basic Attack capability.',
  };
}

function buildRosterSummary(profiles: ReturnType<typeof buildDragonProfiles>) {
  return {
    knownRosterCount: dragons.length,
    detailedCombatDataDragonIds: profiles.filter((profile) => profile.profileCompleteness === 'detailed-combat-data').map((profile) => profile.id),
    detailedCombatDataCount: profiles.filter((profile) => profile.profileCompleteness === 'detailed-combat-data').length,
    metadataOnlyCount: profiles.filter((profile) => profile.profileCompleteness === 'metadata-only').length,
    dataStatuses: countBy(profiles.map((profile) => profile.dataStatus)),
    rarities: countBy(profiles.map((profile) => profile.rarity)),
    breeds: countBy(profiles.map((profile) => profile.breed)),
  };
}

function buildCapabilityFramework(
  outputs: OutputCapability[],
  modifiers: ModifierCapability[],
  statusOutputs: ReturnType<typeof deriveStatusOutputCapabilities>,
  periodicDamage: ReturnType<typeof derivePeriodicDamageDefinitions>,
) {
  const reviewedOutputs = outputs.filter((capability) => isReviewedDragonId(capability.dragonId));
  const reviewedModifiers = modifiers.filter((capability) => isReviewedDragonId(capability.dragonId));
  return {
    effectChannels: ['physical-damage', 'tactical-damage', 'fire-damage', 'recovery', 'stat', 'damage-received', 'status', 'control'],
    outputCapabilityStructure: [
      'dragonId',
      'abilityId',
      'channel',
      'sourceKind',
      'sourceScope',
      'targetSide',
      'targetScope',
      'unlockStarRank',
      'minimumDragonLevel',
      'requiredHabitLevel',
      'conditions',
      'dependencies',
      'availability',
      'evidenceIds',
    ],
    modifierCapabilityStructure: [
      'dragonId',
      'abilityId',
      'channel',
      'direction',
      'role',
      'operation',
      'damageScope',
      'targetSelector',
      'providerRequirements',
      'recipientRequirements',
      'sourceScope',
      'rankedValues',
      'conditions',
      'availability',
      'evidenceIds',
    ],
    defensiveDamageScopes: ['all', 'physical', 'tactical', 'fire'],
    targetSelectionModes: ['self', 'specific-position', 'any', 'adjacent', 'eligible', 'highest-stat', 'one-eligible-adjacent', 'all-matching-condition', 'opposing-position', 'shared-target-group', 'prior-target-reference', 'unknown'],
    interactionScopes: ['cross-dragon', 'internal', 'enemy-side', 'targeting-fact'],
    modifierRoles: ['self-amplification', 'ally-support', 'recipient-side-amplification', 'enemy-debuff'],
    availabilityModel: {
      contexts: ['canonical', 'observedAccount', 'userRoster'],
      currentMode: 'Locked abilities do not create active matches.',
      previewMode: 'Future abilities may generate potential matches.',
    },
    matchKinds: [
      'outgoing-effect-amplification',
      'incoming-effect-amplification',
      'status-condition-enablement',
      'stat-scaling-support',
      'enemy-mitigation-reduction',
      'periodic-damage-amplification',
      'status-removal',
      'defensive-ally-support',
    ],
    sourceScopeCompatibilityRules: [
      { modifierScope: 'all-qualifying-sources', outputScope: 'any same-channel source', compatible: true },
      { modifierScope: 'non-basic-attacks', outputScope: 'commands-or-habits', compatible: true },
      { modifierScope: 'commands-and-habits', outputScope: 'commands-or-habits', compatible: true },
      { modifierScope: 'unknown', outputScope: 'any', compatible: false },
      {
        id: 'computed-matrix',
        matrix: buildSourceScopeMatrix(),
      },
    ],
    positionCompatibilityRules: buildFormationRules(),
    targetingLanguageRules: buildFormationRules().targetingLanguageRules,
    traceStatuses: ['active', 'potential', 'inactive', 'blocked', 'unknown', 'not-applicable'],
    confidenceLevels: ['confirmed', 'high', 'medium', 'low', 'unresolved'],
    normalViewAggregationBehavior: 'One support modifier can match multiple recipient outputs and aggregate into one normal Formation Builder card. Sibling stat effects from the same ability aggregate into one direct stat support card while preserving per-stat values when sibling values differ. Single-target and highest-stat effects with multiple eligible recipients are grouped as target-selection interactions, Trial by Flame is grouped by selected recipients and threshold tiers, and periodic damage is annotated under its damage channel rather than duplicated as a second normal buff. Global normal unmet requirements are a pure current-formation summary: hard selected Trait placement failures first, concrete unowned-card progression blockers only when placement and targeting pass, semantic deduplication, and no blockers already owned by visible normal cards.',
    debugViewBehavior: 'Debug traces retain child modifier capability IDs, child capability matches, source-scope checks, requirements, assumptions, interaction scope, damage scope, target-selection candidates, and evidence IDs.',
    numericalScorePolicy: 'Synergy score remains null; exact formulas are not invented.',
    derivedCapabilities: {
      outputs: reviewedOutputs,
      allySupport: reviewedModifiers.filter((capability) => capability.role === 'ally-support'),
      selfAmplification: reviewedModifiers.filter((capability) => capability.role === 'self-amplification'),
      recipientSideAmplification: reviewedModifiers.filter((capability) => capability.role === 'recipient-side-amplification'),
      enemyDebuffs: reviewedModifiers.filter((capability) => capability.role === 'enemy-debuff'),
      statusOutputs: statusOutputs.filter((capability) => isReviewedDragonId(capability.dragonId)),
      periodicDamage: periodicDamage.filter((definition) => isReviewedDragonId(definition.dragonId)),
      abilityDependencies: reviewedOutputs.flatMap((capability) => capability.dependencies.map((dependency) => ({
        outputCapabilityId: capability.id,
        dragonId: capability.dragonId,
        abilityId: capability.abilityId,
        dependency,
      }))),
    },
    dragonEffectProfiles: deriveDragonEffectProfiles(dragons, reviewedOutputs, reviewedModifiers),
  };
}

function buildFormationReviewCases(): FormationReviewCaseExport[] {
  const phase381Cases = Object.entries(phase381ReviewFormations).map(([letter, formation]) =>
    formationCase({
      caseId: `phase-3-8-1-${letter.toLowerCase()}`,
      label: `Phase 3.8.1 Formation ${letter}`,
      formation,
      reviewStatus: 'confirmed',
      reviewerNotes: ['Completed Phase 3.8.1 Syrax/Caraxes formation review case.'],
    }),
  );
  const batch1Specs: Array<{ caseId: string; label: string; formation: FormationAnalysisInput; reviewerNotes: string[] }> = [
    {
      caseId: 'batch-1-formation-1',
      label: 'Batch 1 Formation 1: Left Malachite / Vanguard Sheepstealer / Right Vermax',
      formation: { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
      reviewerNotes: ['Pending manual retest after formation analysis normalization. Previous defects included duplicate Recovery traces, duplicate blockers, flank-to-flank Lightning Strike leakage, and a normal PvE Stolen Flock warning. Remaining normalization defects repaired in 0.5.3 included defensive subtype loss, Trial by Flame threshold counts, Reactive Instincts target fan-out, internal interaction leakage, and Spreading Blaze/Rallying Flame identity collapse. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting.'],
    },
    {
      caseId: 'batch-1-formation-2',
      label: 'Batch 1 Formation 2: Left Seasmoke / Vanguard Malachite / Right Sheepstealer',
      formation: { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
      reviewerNotes: ['Pending manual retest after formation analysis normalization. Previous defects included false Fire support to Right Flank Sheepstealer and contradictory Fire-output wording. Remaining normalization defects repaired in 0.5.3 included Lightning Strike one-target grouping, Clever Maneuver sibling aggregation, defensive subtype labels, and provider/recipient blocker attribution. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting.'],
    },
    {
      caseId: 'batch-1-formation-3',
      label: 'Batch 1 Formation 3: Left Malachite / Vanguard Vermax / Right Seasmoke',
      formation: { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
      reviewerNotes: ["Pending manual retest after formation analysis normalization. Previous defects included repeated Warden's Rally names and imprecise preview blockers. Remaining normalization defects repaired in 0.5.3 included Warrior's Zeal sibling aggregation, Reactive Instincts highest-Instinct selection, defensive subtype labels, and source-ability distinction. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting."],
    },
    {
      caseId: 'batch-1-formation-4',
      label: 'Batch 1 Formation 4: Left Malachite / Vanguard Seasmoke / Right Sheepstealer',
      formation: { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
      reviewerNotes: ["Pending manual retest after formation analysis normalization. Previous defects included missing Champion's Brilliance defensive support and unwanted normal PvE warnings. Remaining normalization defects repaired in 0.5.3 included visible Champion's Brilliance Level 16 failure, inactive support at Seasmoke Level 1, defensive subtype labels, and requirement ownership. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting."],
    },
  ];
  const batch2Specs: Array<{ caseId: string; label: string; formation: FormationAnalysisInput; reviewerNotes: string[] }> = [
    {
      caseId: 'batch-2-formation-5',
      label: 'Batch 2 Formation 5: Left Caraxes / Vanguard Seasmoke / Right Sheepstealer',
      formation: { 'left-flank': 'caraxes', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
      reviewerNotes: ["Pending manual retest after formation analysis normalization. Previous defects included missing Champion's Brilliance support, impossible Caraxes/Sheepstealer Vanguard effects, Recovery Received leakage, and duplicate Burn support. Remaining normalization defects repaired in 0.5.3 included visible Champion's Brilliance Level 16 failure, Clever Maneuver sibling aggregation, Cunning Ferocity attribution, and provider/recipient blocker ownership. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting."],
    },
    {
      caseId: 'batch-2-formation-6',
      label: 'Batch 2 Formation 6: Left Malachite / Vanguard Syrax / Right Sheepstealer',
      formation: { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
      reviewerNotes: ["Pending manual retest after formation analysis normalization. Previous defects included Hunter's Cunning leakage, repeated Warden's Rally names, and duplicate Recovery traces. Remaining normalization defects repaired in 0.5.3 included Sentinel's Wit sibling aggregation, Lightning Strike one-target adjacency, tactical defensive subtype labels, and internal interaction exclusion. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting."],
    },
    {
      caseId: 'batch-2-formation-7',
      label: 'Batch 2 Formation 7: Left Syrax / Vanguard Vermax / Right Caraxes',
      formation: { 'left-flank': 'syrax', vanguard: 'vermax', 'right-flank': 'caraxes' },
      reviewerNotes: ['Pending manual retest after formation analysis normalization. Previous defects included unselected Sheepstealer traces, duplicate Reactive Instincts/Spreading Blaze traces, and duplicate Burn support. Remaining normalization defects repaired in 0.5.3 included Warrior\'s Zeal and Reactive Instincts sibling aggregation, Reactive Instincts highest-Instinct one-target selection, Trial by Flame threshold conditions, and Rallying Flame source identity. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting.'],
    },
    {
      caseId: 'batch-2-formation-8',
      label: 'Batch 2 Formation 8: Left Sheepstealer / Vanguard Caraxes / Right Syrax',
      formation: { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
      reviewerNotes: ["Pending manual retest after formation analysis normalization. Previous defects included Sentinel's Wit/Hunter's Cunning leakage, Blazing Fury simultaneous-recipient presentation, and duplicate Burn support. Remaining normalization defects repaired in 0.5.3 included Hunter's Wrath sibling aggregation, canonical Syrax display names, internal interaction exclusion, and one-target competition wording. Version 0.5.4 repairs normal unmet-requirement contamination, preview/formation state isolation, visible-card blocker ownership, Trial by Flame normal grouping, and multi-effect value formatting."],
    },
  ];
  const nextBatch = [...batch1Specs, ...batch2Specs].map((spec) => formationCase({
    ...spec,
    reviewStatus: 'pending',
  }));
  const legendaryRegressionSpecs: Array<{ caseId: string; label: string; formation: FormationAnalysisInput; reviewerNotes: string[] }> = [
    {
      caseId: 'df-lg-01',
      label: 'DF-LG-01: Left Kalspire / Vanguard Vhagar / Right Venator',
      formation: { 'left-flank': 'kalspire', vanguard: 'vhagar', 'right-flank': 'venator' },
      reviewerNotes: ['Legendary regression case for Tactical Strike output role compatibility, Vhagar Warrior\'s Resilience Tactical Damage support, inactive off-Vanguard Legendary traits, self Damage Received isolation, and locked-habit current-mode filtering.'],
    },
    {
      caseId: 'df-lg-03',
      label: 'DF-LG-03: Left Crimson / Vanguard Vhagar / Right Caraxes',
      formation: { 'left-flank': 'crimson', vanguard: 'vhagar', 'right-flank': 'caraxes' },
      reviewerNotes: ['Legendary regression case for preview-only Burn/Taunt/Weakened status enablement, Blood Wyrm self-Recovery targeting isolation, and typed Crimson Vermin\'s Bane mitigation channels.'],
    },
    {
      caseId: 'df-lg-05',
      label: 'DF-LG-05: Left Kalspire / Vanguard Syrax / Right Vhagar',
      formation: { 'left-flank': 'kalspire', vanguard: 'syrax', 'right-flank': 'vhagar' },
      reviewerNotes: ['Legendary regression case for Mother\'s Mercy potential Control cleanse classification, retained timing/selection uncertainty, and Tactical Strike not acting as outgoing support.'],
    },
  ];
  const legendaryRegressionCases = legendaryRegressionSpecs.map((spec) => formationCase({
    ...spec,
    reviewStatus: 'confirmed',
  }));

  return [...phase381Cases, ...nextBatch, ...legendaryRegressionCases];
}

function formationCase({
  caseId,
  label,
  formation,
  reviewStatus,
  reviewerNotes,
}: {
  caseId: string;
  label: string;
  formation: FormationAnalysisInput;
  reviewStatus: 'pending' | 'confirmed' | 'contradicted' | 'needs-correction';
  reviewerNotes: string[];
}): FormationReviewCaseExport {
  const currentTraces = analyzeFormationTraces(formation, dragons, {});
  const previewTraces = analyzeFormationTraces(formation, dragons, { previewMaxRankInteractions: true });
  const allEvidenceIds = uniqueSorted([...currentTraces, ...previewTraces].flatMap((trace) => [
    ...trace.sourceEvidenceIds,
    ...trace.recipientEvidenceIds,
    ...trace.requirements.flatMap((requirement) => requirement.evidenceIds),
  ]));
  return {
    caseId,
    label,
    formation: formationLabels(formation),
    formationDragonIds: formation,
    currentModeExpectedInteractions: currentTraces.filter(isExpectedInteractionTrace).map(traceSummary),
    previewModeExpectedInteractions: previewTraces.filter(isExpectedInteractionTrace).map(traceSummary),
    expectedInactiveTraits: previewTraces.filter((trace) =>
      trace.ruleId === 'vanguard-trait-requirement' && trace.status === 'inactive',
    ).map(traceSummary),
    expectedExclusions: expectedExclusionsForFormation(formation, previewTraces),
    importantFalsePositivesToPrevent: falsePositivesForFormation(formation),
    relevantEvidenceIds: allEvidenceIds,
    reviewStatus,
    reviewerNotes: [
      ...reviewerNotes,
      normalUnmetSummaryNote('current', formation),
      normalUnmetSummaryNote('preview', formation),
      'Normal UI-only unmet summaries are not inserted into raw debug traces; full trace requirements remain exported for audit.',
      'Version 0.5.5 adds card-level presentation for Receives, Provides, Trait status, affinity chips, target candidates, preview labels, and overflow without changing trace mechanics.',
      'Version 0.5.6 keeps that mapping intact while polishing equal-height desktop cards, inline state badges, purpose-built summaries, per-item Details, same-ability presentation aggregation, redundant blocked-Trait suppression, bounded Receives/Provides regions, and accessible overflow behavior.',
    ],
  };
}

function normalUnmetSummaryNote(mode: 'current' | 'preview', formation: FormationAnalysisInput): string {
  const options = mode === 'preview' ? { previewMaxRankInteractions: true } : {};
  const requirements = analyzeFormation(formation, dragons, defaultSynergyRules, options).unmetRequirements.map((item) => `${item.title}: ${item.description}`);
  return `Expected normal unmet requirements (${mode}): ${requirements.length ? requirements.join(' | ') : 'None identified'}.`;
}

function buildProjectState(
  options: ProjectContextBuildOptions,
  profiles: ReturnType<typeof buildDragonProfiles>,
  unresolvedMechanics: ReturnType<typeof buildUnresolvedMechanics>,
) {
  return {
    format: 'dragonfire-project-state',
    contextVersion,
    generatedAt: options.generatedAt,
    source: sourceBase(options),
    versions: {
      databaseVersion: databaseMetadata.databaseVersion,
      dataSchemaVersion: databaseMetadata.schemaVersion,
      localRosterSchemaVersion: 3,
      gameBuild: databaseMetadata.currentDocumentedGameBuild,
      contextVersion,
    },
    rosterCounts: {
      knownRosterCount: dragons.length,
      detailedDataDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'detailed-combat-data').length,
      metadataOnlyDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'metadata-only').length,
    },
    testTotals: options.testTotals ?? {
      runner: 'vitest',
      testFileCount: null,
      testCaseCount: null,
      lastRunStatus: 'not-run-by-exporter',
    },
    currentArchitectureSummary: [
      'Typed dragon records are stored in src/data/dragons.ts.',
      'Evidence, manual reviews, observations, statuses, and stat definitions are separate source modules.',
      'Capability derivation is computed from structured AbilityEffect records in effectCapabilities.ts.',
      'Formation analysis uses structured SynergyTrace records and does not produce an arbitrary numerical score.',
      'Formation normalization preserves defensive scope, target-selection groups, visible-card requirement ownership, source ability identity, interaction scope, pure normal unmet summaries, and debug/export trace retention.',
      'Formation card presentation maps existing normal traces into per-dragon Receives, Provides, Trait status, affinity, candidate, and preview summaries without changing mechanics; layout polish keeps desktop cards equal-height with bounded interaction regions, inline badges, readable summaries, per-item Details, and presentation-only aggregation.',
    ],
    completedPhases: [
      'Phase 3.6 combat confirmations',
      'Phase 3.7 capability framework',
      'Phase 3.7.1 capability scope review',
      'Phase 3.8 Syrax and Caraxes combat data with dependency tracing',
      'Phase 3.8.1 formation trace reconciliation',
      'Phase 3.8.2 formation analysis normalization',
      'Version 0.5.4 normal unmet requirement summary repair',
      'Version 0.5.5 formation card analysis presentation redesign',
      'Version 0.5.6 formation card layout polish',
      'Version 0.6.0 legendary dragon schema hardening',
    ],
    currentReviewPhase: 'Legendary dragon schema hardening validation and project-context regeneration.',
    plannedNextPhase: [
      'full formation-output review',
      'additional visual QA',
      'then non-Legendary dragon batches',
    ],
    unresolvedMechanicsCount: unresolvedMechanics.length,
  };
}

function buildUnresolvedMechanics() {
  const records: Array<{
    stableId: string;
    scope: string;
    dragonId: string | null;
    abilityId: string | null;
    abilityName: string | null;
    description: string;
    whyUnresolved: string;
    currentConservativeBehavior: string;
    suggestedValidationMethod: string;
    gameBuild: string;
    status: 'pending' | 'provisional' | 'needs-follow-up';
  }> = [];

  for (const dragon of dragons) {
    for (const question of dragon.unresolvedQuestions) {
      records.push(unresolvedRecord({
        scope: `dragon:${dragon.id}`,
        dragonId: dragon.id,
        ability: null,
        description: question,
      }));
    }
    for (const ability of allAbilities(dragon)) {
      for (const question of ability.unresolvedQuestions) {
        records.push(unresolvedRecord({
          scope: `dragon:${dragon.id}`,
          dragonId: dragon.id,
          ability,
          description: question,
        }));
      }
    }
  }

  for (const status of statusGlossary) {
    for (const question of status.unresolvedQuestions) {
      records.push({
        stableId: `status-${status.id}-${slugify(question)}`,
        scope: `status:${status.id}`,
        dragonId: null,
        abilityId: null,
        abilityName: null,
        description: question,
        whyUnresolved: 'Status glossary notes unresolved semantics that are not fully combat-log verified.',
        currentConservativeBehavior: 'Preserve the status wording and avoid deriving extra combat behavior.',
        suggestedValidationMethod: 'Capture controlled combat-log examples where the status is applied, refreshed, stacked, or cleansed.',
        gameBuild: databaseMetadata.currentDocumentedGameBuild,
        status: 'pending',
      });
    }
  }

  const globalMechanics = [
    ['global-exact-damage-recovery-formulas', 'Exact damage, Recovery, and stacking formulas remain unknown.'],
    ['global-stack-refresh-expiration', 'Stack refresh and expiration behavior remains unresolved.'],
    ['global-enemy-formation-adjacency', 'Enemy-formation adjacency is not confirmed.'],
    ['global-threshold-boundaries', 'Exact threshold boundary behavior such as exactly 50% remains unconfirmed.'],
    ['global-extra-basic-attack-trigger-chaining', 'Double-Strike and other extra-Basic-Attack trigger chaining remain unresolved.'],
    ['global-periodic-status-timing-refresh-overlap', 'Periodic status first-tick, refresh, stacking, and overlapping-source behavior remain unresolved.'],
    ['global-enhanced-by-stat-formulas', 'Exact enhanced-by-stat formulas remain unresolved.'],
    ['global-dynamic-selector-tie-breaking', 'Tie-breaking for dynamic stat and troop selectors remains unresolved.'],
    ['global-numerical-score-policy', 'No numerical synergy score is generated until formulas are verified.'],
  ] as const;
  for (const [stableId, description] of globalMechanics) {
    records.push({
      stableId,
      scope: 'global',
      dragonId: null,
      abilityId: null,
      abilityName: null,
      description,
      whyUnresolved: 'The repository does not yet contain repeatable combat-log evidence for this mechanic.',
      currentConservativeBehavior: 'Keep the mechanic explanatory or unknown; do not calculate a final amount.',
      suggestedValidationMethod: 'Run controlled formation tests and record combat-log lines against the documented game build.',
      gameBuild: databaseMetadata.currentDocumentedGameBuild,
      status: 'pending',
    });
  }

  return uniqueBy(records, (record) => record.stableId).sort((a, b) => a.stableId.localeCompare(b.stableId));
}

function buildDragonIndex(profiles: ReturnType<typeof buildDragonProfiles>) {
  return {
    format: 'dragonfire-dragon-profile-index',
    contextVersion,
    count: profiles.length,
    dragons: profiles.map((profile) => ({
      id: profile.id,
      slug: profile.slug,
      name: profile.name,
      rarity: profile.rarity,
      breed: profile.breed,
      dataStatus: profile.dataStatus,
      profileCompleteness: profile.profileCompleteness,
      file: `dragons/${profile.slug}.json`,
    })),
  };
}

function buildSchemas() {
  const stringOrNull = { anyOf: [{ type: 'string' }, { type: 'null' }] };
  const numberOrNull = { anyOf: [{ type: 'number' }, { type: 'null' }] };
  const abilityOrNull = { anyOf: [{ type: 'object' }, { type: 'null' }] };
  const sourceSchema = {
    type: 'object',
    required: ['repository', 'branch', 'commit', 'databaseVersion', 'dataSchemaVersion', 'localRosterSchemaVersion', 'gameBuild'],
    properties: {
      repository: { type: 'string' },
      branch: { type: 'string' },
      commit: { type: 'string' },
      databaseVersion: { const: databaseMetadata.databaseVersion },
      dataSchemaVersion: { const: databaseMetadata.schemaVersion },
      localRosterSchemaVersion: { const: 3 },
      gameBuild: { const: databaseMetadata.currentDocumentedGameBuild },
    },
  };
  const dragonProfile = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'dragon-profile.schema.json',
    type: 'object',
    required: [
      'format',
      'contextVersion',
      'generatedAt',
      'source',
      'id',
      'slug',
      'name',
      'rarity',
      'breed',
      'officialProfileUrl',
      'rosterSourceStatus',
      'dataStatus',
      'verificationBySection',
      'affinities',
      'command',
      'trait',
      'habits',
      'abilities',
      'outputCapabilities',
      'modifierCapabilities',
      'statusOutputs',
      'periodicDamage',
      'observationSnapshots',
      'evidenceReferences',
      'manualReviewReferences',
      'unresolvedQuestions',
      'profileCompleteness',
    ],
    properties: {
      format: { const: 'dragonfire-dragon-profile' },
      contextVersion: { const: contextVersion },
      generatedAt: { type: 'string' },
      source: sourceSchema,
      id: { type: 'string' },
      slug: { type: 'string' },
      name: { type: 'string' },
      rarity: { enum: ['Legendary', 'Epic', 'Rare'] },
      breed: { enum: ['Champion', 'Hunter', 'Sentinel', 'Warrior'] },
      officialProfileUrl: stringOrNull,
      rosterSourceStatus: { type: 'string' },
      firstObservedInGame: stringOrNull,
      gameVersion: stringOrNull,
      isNew: { type: 'boolean' },
      dataStatus: { type: 'string' },
      lastVerified: { type: 'string' },
      notes: stringOrNull,
      command: abilityOrNull,
      trait: abilityOrNull,
      habits: { type: 'array', items: { type: 'object' } },
      abilities: { type: 'array', items: { type: 'object' } },
      outputCapabilities: { type: 'array', items: { type: 'object' } },
      modifierCapabilities: { type: 'array', items: { type: 'object' } },
      statusOutputs: { type: 'array', items: { type: 'object' } },
      periodicDamage: { type: 'array', items: { type: 'object' } },
      observationSnapshots: { type: 'array', items: { type: 'object' } },
      unresolvedQuestions: { type: 'array', items: { type: 'string' } },
      profileCompleteness: { enum: ['detailed-combat-data', 'metadata-only'] },
    },
  };
  const formationReviewCase = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'formation-review-case.schema.json',
    type: 'object',
    required: [
      'caseId',
      'label',
      'formation',
      'formationDragonIds',
      'currentModeExpectedInteractions',
      'previewModeExpectedInteractions',
      'expectedInactiveTraits',
      'expectedExclusions',
      'importantFalsePositivesToPrevent',
      'relevantEvidenceIds',
      'reviewStatus',
      'reviewerNotes',
    ],
    properties: {
      caseId: { type: 'string' },
      label: { type: 'string' },
      formation: { type: 'object' },
      formationDragonIds: { type: 'object' },
      currentModeExpectedInteractions: { type: 'array', items: { type: 'object' } },
      previewModeExpectedInteractions: { type: 'array', items: { type: 'object' } },
      expectedInactiveTraits: { type: 'array', items: { type: 'object' } },
      expectedExclusions: { type: 'array', items: { type: 'string' } },
      importantFalsePositivesToPrevent: { type: 'array', items: { type: 'string' } },
      relevantEvidenceIds: { type: 'array', items: { type: 'string' } },
      reviewStatus: { enum: ['pending', 'confirmed', 'contradicted', 'needs-correction'] },
      reviewerNotes: { type: 'array', items: { type: 'string' } },
    },
  };
  const synergyCapability = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'synergy-capability.schema.json',
    type: 'object',
    required: [
      'effectChannels',
      'outputCapabilityStructure',
      'modifierCapabilityStructure',
      'modifierRoles',
      'availabilityModel',
      'matchKinds',
      'sourceScopeCompatibilityRules',
      'positionCompatibilityRules',
      'targetingLanguageRules',
      'traceStatuses',
      'confidenceLevels',
      'normalViewAggregationBehavior',
      'debugViewBehavior',
      'numericalScorePolicy',
      'derivedCapabilities',
      'dragonEffectProfiles',
    ],
    properties: {
    effectChannels: { type: 'array', items: { enum: ['physical-damage', 'tactical-damage', 'fire-damage', 'recovery', 'stat', 'damage-received', 'status', 'control'] } },
      modifierRoles: { type: 'array', items: { enum: ['self-amplification', 'ally-support', 'recipient-side-amplification', 'enemy-debuff'] } },
      matchKinds: { type: 'array', items: { type: 'string' } },
      derivedCapabilities: {
        type: 'object',
        required: ['outputs', 'allySupport', 'selfAmplification', 'recipientSideAmplification', 'enemyDebuffs', 'statusOutputs', 'periodicDamage', 'abilityDependencies'],
        properties: {
          outputs: { type: 'array', items: { type: 'object' } },
          allySupport: { type: 'array', items: { type: 'object' } },
          selfAmplification: { type: 'array', items: { type: 'object' } },
          recipientSideAmplification: { type: 'array', items: { type: 'object' } },
          enemyDebuffs: { type: 'array', items: { type: 'object' } },
          statusOutputs: { type: 'array', items: { type: 'object' } },
          periodicDamage: { type: 'array', items: { type: 'object' } },
          abilityDependencies: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  };
  const projectContext = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'project-context.schema.json',
    type: 'object',
    required: [
      'format',
      'contextVersion',
      'generatedAt',
      'source',
      'projectRules',
      'rosterSummary',
      'dragons',
      'statusGlossary',
      'statDefinitions',
      'formationRules',
      'capabilityFramework',
      'expectedInteractions',
      'manualReviews',
      'evidenceSummary',
      'formationReviewCases',
      'unresolvedMechanics',
    ],
    properties: {
      format: { const: projectContextFormat },
      contextVersion: { const: contextVersion },
      generatedAt: { type: 'string' },
      source: sourceSchema,
      projectRules: { type: 'object' },
      rosterSummary: { type: 'object' },
      dragons: { type: 'array', items: dragonProfile },
      statusGlossary: { type: 'array', items: { type: 'object' } },
      statDefinitions: { type: 'array', items: { type: 'object' } },
      formationRules: { type: 'object' },
      capabilityFramework: synergyCapability,
      expectedInteractions: { type: 'array', items: { type: 'object' } },
      manualReviews: { type: 'array', items: { type: 'object' } },
      evidenceSummary: { type: 'array', items: { type: 'object' } },
      formationReviewCases: { type: 'array', items: formationReviewCase },
      unresolvedMechanics: { type: 'array', items: { type: 'object' } },
    },
  };
  void numberOrNull;
  return {
    dragonProfile,
    projectContext,
    synergyCapability,
    formationReviewCase,
  };
}

function buildReadme(): string {
  return `# Dragonfire Project Context Export

This directory is generated from the current typed repository source. Do not manually edit the JSON files; change the TypeScript source data and regenerate instead.

## Files

- \`dragonfire-project-context.json\`: consolidated machine-readable context with source metadata, roster summary, all dragon profiles, formation rules, capability framework, reviews, evidence, review cases, and unresolved mechanics.
- \`project-state.json\`: current versions, branch/commit, counts, architecture summary, phases, and next-phase plan.
- \`formation-review-cases.json\`: completed Phase 3.8.1 cases plus pending Batch 1 and Batch 2 formation repair review cases.
- \`unresolved-mechanics.json\`: stable unresolved mechanic records.
- \`dragons/index.json\` and \`dragons/*.json\`: one profile per known dragon.
- \`synergy/*.json\`: capability framework, formation rules, and expected interaction traces.
- \`glossary/*.json\`: status and stat glossary exports.
- \`reviews/*.json\`: manual-review and evidence summaries.
- \`schemas/*.schema.json\`: JSON Schema Draft 2020-12 schemas for the main export shapes.

## Upload Guidance

The smallest useful external knowledge-project upload set is:

1. \`dragonfire-project-context.json\`
2. \`schemas/project-context.schema.json\`
3. \`README.md\`

Upload the modular files too when the target system benefits from smaller files or per-dragon retrieval.

## Regeneration

Run \`npm run export:context\`. For reproducible test output, pass \`-- --generated-at <ISO timestamp>\`.

## Validation

Run \`npm run validate:context\` after generation. The validator checks schema conformance, dragon counts, source references, version agreement, metadata-only dragon constraints, modular/consolidated agreement, Trial by Flame threshold targeting, and private-path or token leakage.

## Formation Normalization

Data schema 10 exports defensive damage scope, threshold conditions separate from target count, generalized round selectors, activation roll scopes, augmentation schedule overrides, target references, repeated independently targeted instances, stack transition triggers, highest-stat/troop candidate groups, opposing-position targeting, grouped modifier capability IDs, requirement ownership, source-ability identity, and interaction scope. Normal unmet requirements are presentation summaries only: they are pure per-formation/per-preview results, hide blockers owned by visible cards, dedupe by semantic identity, and apply hard-failure precedence. Internal same-dragon traces and suppressed normal blockers remain exported for audit even when normal Formation Analysis excludes them from cross-dragon synergy sections.

## Formation Card Presentation

Version 0.5.6 keeps the UI-only card presentation layer and adds a layout contract: desktop cards align as equal-height planner columns, controls stay in normal top-to-bottom flow, Receives and Provides collapse to three compact items, expanded sections use bounded scrollable bodies, state badges stay inline, compact summaries are generated from structured trace data, per-item Details reveal full explanations and requirements, and same-ability aggregation remains presentation-only. Raw/debug traces, requirements, evidence IDs, internal interactions, and expected formation-review cases remain exported for audit.

## Authority

The authoritative source remains the typed source data under \`src/data\`, \`src/models\`, and \`src/services\`. Generated JSON exists so external systems can understand the project without reading TypeScript.
`;
}

function buildProjectContextMarkdown(
  projectState: ReturnType<typeof buildProjectState>,
  unresolvedMechanics: ReturnType<typeof buildUnresolvedMechanics>,
): string {
  return `# Dragonfire Lab Project Context

## Goal

Dragonfire Roster Lab records verified dragon roster data, combat mechanics, synergy capabilities, evidence state, and manual reviews without inventing unavailable data.

## Architecture

${projectState.currentArchitectureSummary.map((item) => `- ${item}`).join('\n')}

## Versions

- Database: ${databaseMetadata.databaseVersion}
- Data schema: ${databaseMetadata.schemaVersion}
- Local roster schema: 3
- Game build: ${databaseMetadata.currentDocumentedGameBuild}
- Context export: ${contextVersion}

## Normal Requirement Summary

Normal Formation Analysis unmet requirements are concise UI summaries rather than raw trace dumps. Visible interaction cards own their own blockers, global unmet requirements show selected Trait placement failures and concrete unowned-card progression blockers, preview and formation switches do not reuse prior results, and debug/export data keeps the suppressed raw requirements.

## Formation Card Presentation

Formation Builder cards are the primary normal UI for dragon-specific benefits. Receives and Provides derive from normal traces, target-selection groups use candidate wording, per-dragon affinities use existing affinity data, and raw effect tags are hidden from the normal Formation Summary. Desktop cards use equal-height outer columns with bounded interaction regions; mobile cards stack in natural height. Compact items use inline state badges, readable summaries, Details disclosure, same-ability presentation aggregation, and redundant blocked-Trait suppression when Trait status and Formation Blockers already carry the failure. Technical analysis preserves the full trace set.

## Populated Dragons

${populatedDragonIds.map((dragonId) => `- ${dragonById(dragonId)?.name ?? dragonId}`).join('\n')}

All other known dragons remain metadata-only unless their typed source records contain verified combat data.

## Confirmed Rules

- Formation is Left Flank - Vanguard - Right Flank.
- Plain Ally/Allies may include the caster when targeting permits.
- Other Ally/Other Allies excludes the caster.
- Spatial rules prevent a caster from being adjacent to itself.
- Self-amplification does not create teammate synergy.
- Ally support may create outgoing amplification.
- Recipient-side amplification may create incoming amplification.
- Enemy debuffs are separate from ally support.
- No arbitrary numerical synergy score is generated.
- Defensive damage scope preserves all, physical, tactical, and fire Damage Received subtypes.
- Troop thresholds are structured conditions, not target counts.
- Highest-stat and one-adjacent effects target one recipient or one grouped candidate set.
- Internal same-dragon traces are preserved for debug/export but are not cross-dragon normal synergy.
- Max-rank preview does not override a known failed Dragon Level requirement.

## Synergy Framework

The framework derives output capabilities, modifier capabilities, status outputs, periodic damage, and dependencies from structured ability effects. Current trace families are outgoing-effect-amplification, incoming-effect-amplification, status-condition-enablement, stat-scaling-support, enemy-mitigation-reduction, periodic-damage-amplification, and defensive-ally-support.

## Unresolved Mechanics

${unresolvedMechanics.slice(0, 20).map((item) => `- ${item.stableId}: ${item.description}`).join('\n')}

## Review Plan

Current review phase: ${projectState.currentReviewPhase}

Planned next phase:

${projectState.plannedNextPhase.map((item) => `- ${item}`).join('\n')}

Additional dragon-data work should happen after the formation-output review and UI/tag redesign.
`;
}

function validateWithSchema(parsed: Map<string, JsonValue>, filePath: string, schema: unknown, errors: string[]): number {
  const value = parsed.get(filePath);
  if (value === undefined) {
    errors.push(`${filePath}: missing for schema validation.`);
    return 0;
  }
  const schemaErrors = validateSchema(value, schema as JsonObject, '$');
  errors.push(...schemaErrors.map((error) => `${filePath}${error.path.slice(1)}: ${error.message}`));
  return schemaErrors.length === 0 ? 1 : 0;
}

function validateSchema(value: JsonValue, schema: JsonObject, path: string): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  if (Object.hasOwn(schema, 'const') && !deepEqual(value, schema.const)) {
    errors.push({ path, message: `expected const ${JSON.stringify(schema.const)}` });
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => deepEqual(item, value))) {
    errors.push({ path, message: `expected one of ${JSON.stringify(schema.enum)}` });
  }
  if (Array.isArray(schema.anyOf)) {
    const anyValid = schema.anyOf.some((option) => validateSchema(value, option as JsonObject, path).length === 0);
    if (!anyValid) {
      errors.push({ path, message: 'did not match any allowed schema' });
    }
    return errors;
  }
  if (typeof schema.type === 'string' && !matchesType(value, schema.type)) {
    errors.push({ path, message: `expected type ${schema.type}` });
    return errors;
  }
  if (schema.type === 'object' && isJsonObject(value)) {
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : [];
    for (const key of required) {
      if (!Object.hasOwn(value, key)) {
        errors.push({ path: `${path}.${key}`, message: 'missing required property' });
      }
    }
    if (isJsonObject(schema.properties)) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (Object.hasOwn(value, key)) {
          errors.push(...validateSchema(value[key]!, childSchema as JsonObject, `${path}.${key}`));
        }
      }
    }
  }
  if (schema.type === 'array' && Array.isArray(value) && isJsonObject(schema.items)) {
    value.forEach((item, index) => {
      errors.push(...validateSchema(item, schema.items as JsonObject, `${path}[${index}]`));
    });
  }
  return errors;
}

function validateNoLocalPathsOrSecrets(serializedFiles: Record<string, string>, errors: string[]) {
  const forbidden = [
    /[A-Za-z]:\\Users\\/,
    /[A-Za-z]:\\\\Users\\\\/,
    /\/Users\//,
    /localStorage/i,
    /github_pat_/i,
    /ghp_[A-Za-z0-9]/,
    /password/i,
    /secret/i,
  ];
  for (const [filePath, content] of Object.entries(serializedFiles)) {
    for (const pattern of forbidden) {
      if (pattern.test(content)) {
        errors.push(`${filePath}: forbidden local path, browser storage, or secret-like token matched ${String(pattern)}.`);
      }
    }
  }
}

function validateVersions(parsed: Map<string, JsonValue>, errors: string[]) {
  const context = parsed.get('project-context/dragonfire-project-context.json');
  if (!isJsonObject(context) || !isJsonObject(context.source)) {
    errors.push('Consolidated context source is missing.');
    return;
  }
  if (context.source.databaseVersion !== databaseMetadata.databaseVersion) {
    errors.push('Database version does not match databaseMetadata.');
  }
  if (context.source.dataSchemaVersion !== databaseMetadata.schemaVersion) {
    errors.push('Data schema version does not match databaseMetadata.');
  }
  if (context.source.gameBuild !== databaseMetadata.currentDocumentedGameBuild) {
    errors.push('Game build does not match databaseMetadata.');
  }
}

function validateDragonExports(parsed: Map<string, JsonValue>, errors: string[]) {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  for (const dragon of dragons) {
    const profile = parsed.get(`project-context/dragons/${dragon.slug}.json`);
    if (!isJsonObject(profile)) {
      errors.push(`Missing or invalid dragon profile for ${dragon.slug}.`);
      continue;
    }
    if (typeof profile.id === 'string') {
      if (seenIds.has(profile.id)) {
        errors.push(`Duplicate dragon id: ${profile.id}.`);
      }
      seenIds.add(profile.id);
    }
    if (typeof profile.slug === 'string') {
      if (seenSlugs.has(profile.slug)) {
        errors.push(`Duplicate dragon slug: ${profile.slug}.`);
      }
      seenSlugs.add(profile.slug);
    }
    if (!isPopulatedDragon(dragon)) {
      if (profile.command !== null || profile.trait !== null || (Array.isArray(profile.habits) && profile.habits.length > 0)) {
        errors.push(`${dragon.slug}: metadata-only dragon gained combat abilities.`);
      }
      if ((arrayLength(profile.outputCapabilities) + arrayLength(profile.modifierCapabilities) + arrayLength(profile.statusOutputs) + arrayLength(profile.periodicDamage)) > 0) {
        errors.push(`${dragon.slug}: metadata-only dragon gained derived capabilities.`);
      }
    }
    const sourceAbilityCount = allAbilities(dragon).length;
    if (isPopulatedDragon(dragon) && arrayLength(profile.abilities) !== sourceAbilityCount) {
      errors.push(`${dragon.slug}: expected ${sourceAbilityCount} exported abilities, found ${arrayLength(profile.abilities)}.`);
    }
  }
}

function validateReferences(parsed: Map<string, JsonValue>, errors: string[]) {
  const dragonIds = new Set(dragons.map((dragon) => dragon.id));
  const abilityIds = new Set(dragons.flatMap((dragon) => allAbilities(dragon).map((ability) => ability.id)));
  const evidenceIds = new Set(evidenceSources.map((evidence) => evidence.id));
  const manualReviewIds = new Set(manualReviewRecords.map((review) => review.id));
  for (const dragon of dragons) {
    const profile = parsed.get(`project-context/dragons/${dragon.slug}.json`);
    if (!isJsonObject(profile)) {
      continue;
    }
    validateReferenceArray(profile.evidenceReferences, 'id', evidenceIds, `${dragon.slug} evidence reference`, errors);
    validateReferenceArray(profile.manualReviewReferences, 'id', manualReviewIds, `${dragon.slug} manual-review reference`, errors);
  }
  const context = parsed.get('project-context/dragonfire-project-context.json');
  if (isJsonObject(context)) {
    validateReferenceArray(context.manualReviews, 'dragonId', dragonIds, 'manual review dragon', errors);
  }
  const framework = parsed.get('project-context/synergy/capability-framework.json');
  if (isJsonObject(framework) && isJsonObject(framework.derivedCapabilities)) {
    for (const collectionName of ['outputs', 'allySupport', 'selfAmplification', 'recipientSideAmplification', 'enemyDebuffs', 'statusOutputs'] as const) {
      const collection = framework.derivedCapabilities[collectionName];
      if (!Array.isArray(collection)) {
        continue;
      }
      for (const item of collection) {
        if (!isJsonObject(item)) {
          continue;
        }
        if (typeof item.dragonId === 'string' && !dragonIds.has(item.dragonId)) {
          errors.push(`${collectionName}: dangling dragon reference ${item.dragonId}.`);
        }
        if (typeof item.abilityId === 'string' && !abilityIds.has(item.abilityId)) {
          errors.push(`${collectionName}: dangling ability reference ${item.abilityId}.`);
        }
        if (Array.isArray(item.evidenceIds)) {
          for (const evidenceId of item.evidenceIds) {
            if (typeof evidenceId === 'string' && !evidenceIds.has(evidenceId)) {
              errors.push(`${collectionName}: dangling evidence reference ${evidenceId}.`);
            }
          }
        }
      }
    }
  }
  const cases = parsed.get('project-context/formation-review-cases.json');
  if (Array.isArray(cases)) {
    for (const reviewCase of cases) {
      if (!isJsonObject(reviewCase) || !isJsonObject(reviewCase.formationDragonIds)) {
        continue;
      }
      const caseId = typeof reviewCase.caseId === 'string' ? reviewCase.caseId : 'unknown-case';
      for (const position of FORMATION_POSITIONS) {
        const dragonId = reviewCase.formationDragonIds[position];
        if (typeof dragonId === 'string' && !dragonIds.has(dragonId)) {
          errors.push(`${caseId}: dangling formation dragon ${dragonId}.`);
        }
      }
      if (Array.isArray(reviewCase.relevantEvidenceIds)) {
        for (const evidenceId of reviewCase.relevantEvidenceIds) {
          if (typeof evidenceId === 'string' && !evidenceIds.has(evidenceId)) {
            errors.push(`${caseId}: dangling evidence reference ${evidenceId}.`);
          }
        }
      }
    }
  }
}

function validateConsolidatedAgreement(parsed: Map<string, JsonValue>, errors: string[]) {
  const context = parsed.get('project-context/dragonfire-project-context.json');
  const cases = parsed.get('project-context/formation-review-cases.json');
  const unresolved = parsed.get('project-context/unresolved-mechanics.json');
  const framework = parsed.get('project-context/synergy/capability-framework.json');
  if (!isJsonObject(context)) {
    return;
  }
  if (Array.isArray(context.dragons) && context.dragons.length !== dragons.length) {
    errors.push('Consolidated dragon count does not match known roster count.');
  }
  if (Array.isArray(cases) && Array.isArray(context.formationReviewCases) && cases.length !== context.formationReviewCases.length) {
    errors.push('Consolidated formation cases do not match modular formation-review-cases.json.');
  }
  if (Array.isArray(unresolved) && Array.isArray(context.unresolvedMechanics) && unresolved.length !== context.unresolvedMechanics.length) {
    errors.push('Consolidated unresolved mechanics do not match modular unresolved-mechanics.json.');
  }
  if (isJsonObject(framework) && isJsonObject(context.capabilityFramework) && !deepEqual(framework, context.capabilityFramework)) {
    errors.push('Consolidated capability framework differs from modular synergy/capability-framework.json.');
  }
}

function validateDeterministicFiles(serializedFiles: Record<string, string>, expectedFiles: Record<string, string>, errors: string[]) {
  for (const [filePath, expectedContent] of Object.entries(expectedFiles)) {
    if (serializedFiles[filePath] !== undefined && serializedFiles[filePath] !== expectedContent) {
      errors.push(`${filePath}: content differs from deterministic export for the supplied generatedAt/commit/branch options.`);
    }
  }
}

function allAbilities(dragon: Dragon): AbilityDefinition[] {
  return [dragon.command, dragon.trait, ...dragon.habits].filter((ability): ability is AbilityDefinition => Boolean(ability));
}

function isPopulatedDragon(dragon: Dragon): boolean {
  return allAbilities(dragon).length > 0;
}

function isReviewedDragonId(dragonId: string): boolean {
  return (populatedDragonIds as readonly string[]).includes(dragonId);
}

function collectRankedValues(ability: AbilityDefinition) {
  return [
    ...ability.powerByHabitLevel.map((rankedValue) => ({
      abilityId: ability.id,
      source: 'powerByHabitLevel',
      rankedValue,
    })),
    ...ability.schedules.flatMap((schedule) => schedule.effects.flatMap((effect) => [
      ...effect.rankedValues.map((rankedValue) => ({
        abilityId: ability.id,
        scheduleId: schedule.id,
        effectId: effect.id,
        source: 'effect.rankedValues',
        rankedValue,
      })),
      ...(effect.conditionalMultipliers ?? []).flatMap((multiplier) => multiplier.directlyVerifiedValues.map((rankedValue) => ({
        abilityId: ability.id,
        scheduleId: schedule.id,
        effectId: effect.id,
        multiplierId: multiplier.id,
        source: 'conditionalMultiplier.directlyVerifiedValues',
        rankedValue,
      }))),
    ])),
  ];
}

function availabilityRequirementsForAbility(ability: AbilityDefinition): Array<{ abilityId: string; type: string; value: string | number }> {
  const requirements: Array<{ abilityId: string; type: string; value: string | number }> = [];
  if (ability.unlockStarRank !== null) {
    requirements.push({
      abilityId: ability.id,
      type: ability.kind === 'habit' ? 'habit-unlock-star-rank' : 'star-rank',
      value: ability.unlockStarRank,
    });
  }
  if (ability.minimumDragonLevel !== null) {
    requirements.push({
      abilityId: ability.id,
      type: 'minimum-dragon-level',
      value: ability.minimumDragonLevel,
    });
  }
  if (ability.positionRequirement !== null) {
    requirements.push({
      abilityId: ability.id,
      type: 'position-requirement',
      value: ability.positionRequirement,
    });
  }
  return requirements;
}

function buildSourceScopeMatrix() {
  const scopes = ['basic-attacks', 'commands', 'habits', 'commands-and-habits', 'non-basic-attacks', 'all-qualifying-sources', 'unknown'] as const;
  return scopes.flatMap((modifierScope) => scopes.map((outputScope) => ({
    modifierScope,
    outputScope,
    compatible: sourceScopesCompatible(modifierScope, outputScope),
  })));
}

function traceSummary(trace: SynergyTrace) {
  return {
    id: trace.id,
    ruleId: trace.ruleId,
    status: trace.status,
    confidence: trace.confidence,
    matchKind: trace.matchKind ?? null,
    channel: trace.channel ?? null,
    sourceDragonId: trace.sourceDragonId,
    sourceAbilityId: trace.sourceAbilityId,
    recipientDragonId: trace.recipientDragonId,
    recipientAbilityId: trace.recipientAbilityId,
    title: trace.title,
    explanation: trace.explanation,
    effects: trace.effects,
    conflicts: trace.conflicts,
    assumptions: trace.assumptions,
    unresolvedQuestions: trace.unresolvedQuestions,
    sourceEvidenceIds: trace.sourceEvidenceIds,
    recipientEvidenceIds: trace.recipientEvidenceIds,
    requirements: trace.requirements,
    matchedOutputCapabilityIds: trace.matchedOutputCapabilityIds ?? [],
    modifierCapabilityId: trace.modifierCapabilityId ?? null,
    modifierCapabilityIds: trace.modifierCapabilityIds ?? [],
    interactionScope: trace.interactionScope ?? null,
    damageScope: trace.damageScope ?? null,
    targetSelectionGroup: trace.targetSelectionGroup ?? null,
    exactResultKnown: trace.exactResultKnown ?? null,
    exactResultUnknownReason: trace.exactResultUnknownReason ?? null,
  };
}

function isExpectedInteractionTrace(trace: SynergyTrace): boolean {
  return Boolean(trace.matchKind) || trace.ruleId === 'direct-stat-support' || trace.ruleId === 'malachite-lightning-strike-vermax-basic-trigger';
}

function expectedExclusionsForFormation(formation: FormationAnalysisInput, traces: SynergyTrace[]): string[] {
  const exclusions = traces
    .filter((trace) => trace.status === 'inactive' || trace.status === 'blocked' || trace.status === 'not-applicable')
    .map((trace) => `${trace.title}: ${trace.conflicts.join('; ') || trace.explanation}`);
  if (formation['left-flank'] && formation['right-flank']) {
    exclusions.push('Left Flank and Right Flank are not adjacent to one another.');
  }
  return uniqueSorted(exclusions);
}

function falsePositivesForFormation(formation: FormationAnalysisInput): string[] {
  const items = [
    'Do not treat self-amplification as teammate support.',
    'Do not turn enemy debuffs into direct ally support.',
    'Do not generate a numerical synergy score.',
    'Do not treat Warden\'s Rally self-inclusion as a standalone normal synergy card.',
  ];
  if (formation['left-flank'] && formation['right-flank']) {
    items.push('Do not treat flank-to-flank effects as adjacent.');
  }
  return items;
}

function formationLabels(formation: FormationAnalysisInput) {
  return {
    leftFlank: dragonById(formation['left-flank'])?.name ?? null,
    vanguard: dragonById(formation.vanguard)?.name ?? null,
    rightFlank: dragonById(formation['right-flank'])?.name ?? null,
  };
}

function unresolvedRecord({
  scope,
  dragonId,
  ability,
  description,
}: {
  scope: string;
  dragonId: string | null;
  ability: AbilityDefinition | null;
  description: string;
}) {
  return {
    stableId: `${ability?.id ?? dragonId ?? 'global'}-${slugify(description)}`,
    scope,
    dragonId,
    abilityId: ability?.id ?? null,
    abilityName: ability?.name ?? null,
    description,
    whyUnresolved: 'The typed source marks this mechanic as unresolved or provisional.',
    currentConservativeBehavior: 'Preserve the raw wording, expose the assumption, and avoid final formula or guaranteed activation claims.',
    suggestedValidationMethod: 'Validate with controlled combat-log review in a formation that isolates this ability or condition.',
    gameBuild: databaseMetadata.currentDocumentedGameBuild,
    status: 'pending' as const,
  };
}

function dragonById(dragonId: string | null): Dragon | null {
  return dragonId ? dragons.find((dragon) => dragon.id === dragonId) ?? null : null;
}

function formatPosition(position: FormationPosition): string {
  return position.split('-').map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const itemKey = key(value);
    if (!seen.has(itemKey)) {
      seen.add(itemKey);
      result.push(value);
    }
  }
  return result;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value as JsonValue), null, 2)}\n`;
}

function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (isJsonObject(value)) {
    return Object.fromEntries(Object.keys(value).sort((a, b) => a.localeCompare(b)).map((key) => [key, sortJson(value[key]!)]));
  }
  return value;
}

function matchesType(value: JsonValue, type: string): boolean {
  if (type === 'array') {
    return Array.isArray(value);
  }
  if (type === 'object') {
    return isJsonObject(value);
  }
  if (type === 'null') {
    return value === null;
  }
  return typeof value === type;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortJson(left as JsonValue)) === JSON.stringify(sortJson(right as JsonValue));
}

function arrayLength(value: JsonValue | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

function validateReferenceArray(
  value: JsonValue | undefined,
  key: string,
  validIds: Set<string>,
  label: string,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    return;
  }
  for (const item of value) {
    if (isJsonObject(item) && typeof item[key] === 'string' && !validIds.has(item[key])) {
      errors.push(`${label}: dangling ${key} reference ${item[key]}.`);
    }
  }
}
