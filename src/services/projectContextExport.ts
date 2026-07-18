import { databaseMetadata, repository } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { manualReviewRecords } from '../data/manualReviews';
import { dragonStatDefinitions } from '../data/statDefinitions';
import { statusGlossary } from '../data/statusGlossary';
import type { AbilityDefinition, Dragon } from '../models/dragon';
import { SIMPLE_FORMATION_POSITIONS } from '../synergy/positionRules';
import { metadataOnlyDragonIds, simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { CONTROL_ALIAS_TAGS, SYNERGY_TAGS } from '../synergy/tags';

export const projectContextFormat = 'dragonfire-lab-project-context' as const;
export const contextVersion = 2;
export const projectContextSizeLimitBytes = 2_000_000;
export const populatedDragonIds = [
  'syrax',
  'vhagar',
  'caraxes',
  'seasmoke',
  'solstryker',
  'crimson',
  'kalspire',
  'malachite',
  'venator',
  'daemoros',
  'vaeldra',
  'sheepstealer',
  'vermax',
  'feskar',
  'rhysarion',
  'shadowsong',
  'tashix',
  'velar',
  'zivern',
  'antares',
  'shimmer',
  'jagadrix',
  'bevlorin',
  'shadowrend',
  'thunderstrike',
  'vesper',
  'arulix',
  'nyrena',
  'dawnseeker',
  'arrax',
  'tessarion',
] as const;

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
    detailedDragonCount: number;
    metadataOnlyDragonCount: number;
    simpleProfileCount: number;
    profileAuditReviewCount: number;
    totalBytes: number;
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

interface DragonProfileExport {
  id: string;
  slug: string;
  name: string;
  rarity: Dragon['rarity'];
  breed: Dragon['breed'];
  rosterSourceStatus: Dragon['rosterSourceStatus'];
  dataStatus: Dragon['dataStatus'];
  lastVerified: string;
  profileCompleteness: 'detailed-abilities' | 'metadata-only';
  officialProfileUrl: string | null;
  abilities: AbilityExport[];
  affinities: Dragon['affinities'];
  verification: Dragon['fieldVerification'];
  evidenceIds: string[];
  simpleProfileId: string | null;
  simpleProfileStatus: 'curated' | 'metadata-only-unmapped' | 'needs-profile-review';
}

interface AbilityExport {
  id: string;
  kind: AbilityDefinition['kind'];
  name: string;
  abilityClass?: AbilityDefinition['abilityClass'];
  unlockStarRank: number | null;
  minimumDragonLevel: number | null;
  positionRequirement: AbilityDefinition['positionRequirement'];
  verification: AbilityDefinition['verification'];
  evidenceIds: string[];
  tags: string[];
  rawDescription: string | null;
}

const metadataOnlySet = new Set<string>(metadataOnlyDragonIds);

const sourceBase = (options: ProjectContextBuildOptions) => ({
  repository: repository.url,
  branch: options.branch,
  commit: options.commit,
  databaseVersion: databaseMetadata.databaseVersion,
  dataSchemaVersion: databaseMetadata.schemaVersion,
  localRosterSchemaVersion: 5,
  gameBuild: databaseMetadata.currentDocumentedGameBuild,
});

export function buildProjectContextFiles(options: ProjectContextBuildOptions): ProjectContextFileSet {
  const source = sourceBase(options);
  const profiles = dragons.map(buildDragonProfile);
  const profileAudit = buildProfileAuditSummary();
  const formationRules = buildFormationRules();
  const projectState = buildProjectState(options, profiles, profileAudit);
  const simpleProfiles = simpleSynergyProfiles;
  const projectContext = {
    format: projectContextFormat,
    contextVersion,
    generatedAt: options.generatedAt,
    source,
    projectRules: buildProjectRules(),
    rosterSummary: buildRosterSummary(profiles),
    dragons: profiles,
    simpleSynergy: {
      tags: SYNERGY_TAGS,
      controlAliases: CONTROL_ALIAS_TAGS,
      profiles: simpleProfiles,
      profileAudit,
    },
    formationRules,
    statusGlossary,
    statDefinitions: dragonStatDefinitions,
    evidenceSummary: evidenceSources,
    manualReviews: manualReviewRecords,
  };
  const schemas = buildSchemas();
  const files: Record<string, string> = {
    'project-context/README.md': buildReadme(),
    'project-context/PROJECT_CONTEXT.md': buildProjectContextMarkdown(projectState),
    'project-context/dragonfire-project-context.json': stringifyJson(projectContext),
    'project-context/project-state.json': stringifyJson(projectState),
    'project-context/dragons/index.json': stringifyJson(buildDragonIndex(profiles)),
    'project-context/synergy/simple-profiles.json': stringifyJson(simpleProfiles),
    'project-context/synergy/profile-audit.json': stringifyJson(profileAudit),
    'project-context/synergy/formation-rules.json': stringifyJson(formationRules),
    'project-context/glossary/statuses.json': stringifyJson(statusGlossary),
    'project-context/glossary/stats.json': stringifyJson(dragonStatDefinitions),
    'project-context/reviews/manual-reviews.json': stringifyJson(manualReviewRecords),
    'project-context/reviews/evidence-summary.json': stringifyJson(evidenceSources),
    'project-context/schemas/dragon-profile.schema.json': stringifyJson(schemas.dragonProfile),
    'project-context/schemas/project-context.schema.json': stringifyJson(schemas.projectContext),
  };

  for (const profile of profiles) {
    files[`project-context/dragons/${profile.slug}.json`] = stringifyJson(profile);
  }

  const totalBytes = byteSize(files);
  return {
    files,
    summary: {
      dragonFileCount: profiles.length,
      detailedDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'detailed-abilities').length,
      metadataOnlyDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'metadata-only').length,
      simpleProfileCount: simpleProfiles.length,
      profileAuditReviewCount: simpleSynergyAbilityReviews.length,
      totalBytes,
    },
  };
}

export function validateProjectContextFiles(
  serializedFiles: Record<string, string>,
  options: ProjectContextBuildOptions,
): ValidationResult {
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
  for (const filePath of Object.keys(serializedFiles)) {
    if (!Object.hasOwn(expected.files, filePath)) {
      errors.push(`Unexpected generated file: ${filePath}`);
    }
  }

  const schemas = buildSchemas();
  let schemaValidatedFiles = 0;
  schemaValidatedFiles += validateObjectShape(parsed, 'project-context/dragonfire-project-context.json', schemas.projectContext.required, errors);
  for (const dragon of dragons) {
    schemaValidatedFiles += validateObjectShape(parsed, `project-context/dragons/${dragon.slug}.json`, schemas.dragonProfile.required, errors);
  }

  validateDragonExports(parsed, errors);
  validateSimpleProfileReferences(errors);
  validateSourceMetadata(parsed, errors);
  validateNoLocalPathsOrSecrets(serializedFiles, errors);
  validateDeterministicFiles(serializedFiles, expected.files, errors);
  validateSizeLimit(serializedFiles, errors);

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

function buildDragonProfile(dragon: Dragon): DragonProfileExport {
  const abilities = [dragon.command, dragon.trait, ...dragon.habits].filter((ability): ability is AbilityDefinition => Boolean(ability));
  const simpleProfile = simpleSynergyProfiles.find((profile) => profile.dragonId === dragon.id) ?? null;
  return {
    id: dragon.id,
    slug: dragon.slug,
    name: dragon.name,
    rarity: dragon.rarity,
    breed: dragon.breed,
    rosterSourceStatus: dragon.rosterSourceStatus,
    dataStatus: dragon.dataStatus,
    lastVerified: dragon.lastVerified,
    profileCompleteness: abilities.length > 0 ? 'detailed-abilities' : 'metadata-only',
    officialProfileUrl: dragon.officialProfileUrl,
    abilities: abilities.map(exportAbility),
    affinities: dragon.affinities,
    verification: dragon.fieldVerification,
    evidenceIds: uniqueSorted(abilities.flatMap((ability) => ability.evidenceIds)),
    simpleProfileId: simpleProfile?.dragonId ?? null,
    simpleProfileStatus: simpleProfile ? 'curated' : metadataOnlySet.has(dragon.id) ? 'metadata-only-unmapped' : 'needs-profile-review',
  };
}

function exportAbility(ability: AbilityDefinition): AbilityExport {
  return {
    id: ability.id,
    kind: ability.kind,
    name: ability.name,
    abilityClass: ability.abilityClass,
    unlockStarRank: ability.unlockStarRank,
    minimumDragonLevel: ability.minimumDragonLevel,
    positionRequirement: ability.positionRequirement,
    verification: ability.verification,
    evidenceIds: ability.evidenceIds,
    tags: ability.tags,
    rawDescription: ability.rawDescription,
  };
}

function buildDragonIndex(profiles: DragonProfileExport[]) {
  return {
    count: profiles.length,
    detailedDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'detailed-abilities').length,
    metadataOnlyDragonCount: profiles.filter((profile) => profile.profileCompleteness === 'metadata-only').length,
    dragons: profiles.map(({ id, slug, name, rarity, breed, profileCompleteness, simpleProfileStatus }) => ({
      id,
      slug,
      name,
      rarity,
      breed,
      profileCompleteness,
      simpleProfileStatus,
    })),
  };
}

function buildProfileAuditSummary() {
  const dispositions = simpleSynergyAbilityReviews.reduce<Record<string, number>>((counts, review) => {
    counts[review.disposition.kind] = (counts[review.disposition.kind] ?? 0) + 1;
    return counts;
  }, {});
  return {
    reviewedAbilityCount: simpleSynergyAbilityReviews.length,
    dispositionCounts: dispositions,
    metadataOnlyDragonIds,
    reviews: simpleSynergyAbilityReviews,
  };
}

function buildFormationRules() {
  return {
    positions: SIMPLE_FORMATION_POSITIONS,
    adjacency: {
      'left-flank': ['vanguard'],
      vanguard: ['left-flank', 'right-flank'],
      'right-flank': ['vanguard'],
    },
  };
}

function buildRosterSummary(profiles: DragonProfileExport[]) {
  return {
    totalDragons: profiles.length,
    detailedDragons: profiles.filter((profile) => profile.profileCompleteness === 'detailed-abilities').length,
    metadataOnlyDragons: profiles.filter((profile) => profile.profileCompleteness === 'metadata-only').length,
    curatedSimpleProfiles: simpleSynergyProfiles.length,
    profileAuditReviews: simpleSynergyAbilityReviews.length,
    evidenceSources: evidenceSources.length,
    manualReviews: manualReviewRecords.length,
  };
}

function buildProjectRules() {
  return {
    productScope: 'Curated dragon knowledge base and transparent tag-and-position formation recommender.',
    nonGoals: [
      'Exact combat rounds are not modeled.',
      'Proc timing, rolls, target overlap, stack behavior, damage formulas, expected damage, win probability, and battle simulation are not modeled.',
      'Raw verified ability wording is preserved for player reference but does not drive a combat simulator.',
    ],
    contributionWorkflow: [
      'Add identity and evidence.',
      'Add raw Command, Trait, and Habit wording.',
      'Record unlock and hard position requirements.',
      'Add or update the curated simple synergy profile.',
      'Add an audit disposition for each ability.',
      'Run lint, tests, build, context export, and context validation.',
      'Visually confirm My Roster, the Add Dragon flow, and Formation Builder.',
    ],
  };
}

function buildProjectState(
  options: ProjectContextBuildOptions,
  profiles: DragonProfileExport[],
  profileAudit: ReturnType<typeof buildProfileAuditSummary>,
) {
  return {
    generatedAt: options.generatedAt,
    source: sourceBase(options),
    contextVersion,
    format: projectContextFormat,
    rosterSummary: buildRosterSummary(profiles),
    profileAuditSummary: {
      reviewedAbilityCount: profileAudit.reviewedAbilityCount,
      dispositionCounts: profileAudit.dispositionCounts,
    },
    testTotals: options.testTotals ?? {
      runner: 'vitest',
      testFileCount: null,
      testCaseCount: null,
      lastRunStatus: 'not-run-by-exporter' as const,
    },
    sizeLimitBytes: projectContextSizeLimitBytes,
  };
}

function buildReadme() {
  return `# Dragonfire Project Context

This directory is generated by \`npm run export:context\`.

It contains the current simple product context: dragon identity metadata, raw verified ability wording, curated simple synergy profiles, profile-audit dispositions, formation positions and adjacency, evidence, manual reviews, glossary entries, and stat definitions.

It intentionally excludes retired combat-analysis artifacts such as capability matrices, traces, expected interactions, unresolved mechanic reports, schedules, rolls, target-selection groups, and damage-simulation records.
`;
}

function buildProjectContextMarkdown(projectState: ReturnType<typeof buildProjectState>) {
  return `# Dragonfire Roster Lab Project Context

Generated: ${projectState.generatedAt}
Branch: ${projectState.source.branch}
Commit: ${projectState.source.commit}

Dragonfire Roster Lab is a curated dragon knowledge base and transparent tag-and-position formation recommender. It is not a combat simulator.

## Summary

- Total dragons: ${projectState.rosterSummary.totalDragons}
- Detailed ability records: ${projectState.rosterSummary.detailedDragons}
- Metadata-only dragons: ${projectState.rosterSummary.metadataOnlyDragons}
- Curated simple profiles: ${projectState.rosterSummary.curatedSimpleProfiles}
- Profile-audit reviews: ${projectState.rosterSummary.profileAuditReviews}
- Evidence sources: ${projectState.rosterSummary.evidenceSources}
- Manual reviews: ${projectState.rosterSummary.manualReviews}

## Validation

The validator checks source metadata, dragon counts, mapped versus metadata-only profile counts, ability/profile/audit references, deterministic output, absence of local paths or secret-like tokens, and a ${projectContextSizeLimitBytes} byte size limit.
`;
}

function buildSchemas() {
  return {
    dragonProfile: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      required: ['id', 'slug', 'name', 'profileCompleteness', 'abilities', 'simpleProfileStatus'],
    },
    projectContext: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      required: ['format', 'contextVersion', 'generatedAt', 'source', 'rosterSummary', 'dragons', 'simpleSynergy', 'formationRules'],
    },
  };
}

function validateObjectShape(
  parsed: Map<string, JsonValue>,
  filePath: string,
  required: string[],
  errors: string[],
) {
  const value = parsed.get(filePath);
  if (!isJsonObject(value)) {
    errors.push(`${filePath}: expected object.`);
    return 0;
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      errors.push(`${filePath}: missing required key ${key}.`);
    }
  }
  return 1;
}

function validateDragonExports(parsed: Map<string, JsonValue>, errors: string[]) {
  const index = parsed.get('project-context/dragons/index.json');
  if (!isJsonObject(index) || index.count !== dragons.length) {
    errors.push(`Dragon index count must be ${dragons.length}.`);
  }
  const profiles = dragons.map((dragon) => parsed.get(`project-context/dragons/${dragon.slug}.json`));
  if (profiles.some((profile) => !isJsonObject(profile))) {
    errors.push('Every dragon must have a generated profile file.');
  }
  const detailed = profiles.filter((profile) => isJsonObject(profile) && profile.profileCompleteness === 'detailed-abilities');
  const metadataOnly = profiles.filter((profile) => isJsonObject(profile) && profile.profileCompleteness === 'metadata-only');
  if (detailed.length !== populatedDragonIds.length) {
    errors.push(`Expected ${populatedDragonIds.length} detailed dragon profiles, found ${detailed.length}.`);
  }
  if (metadataOnly.length !== metadataOnlyDragonIds.length) {
    errors.push(`Expected ${metadataOnlyDragonIds.length} metadata-only dragon profiles, found ${metadataOnly.length}.`);
  }
  for (const profile of profiles.filter(isJsonObject)) {
    const profileId = typeof profile.id === 'string' ? profile.id : 'unknown-profile';
    const abilities = Array.isArray(profile.abilities) ? profile.abilities.filter(isJsonObject) : [];
    if (profile.profileCompleteness === 'detailed-abilities') {
      const kinds = abilities.map((ability) => ability.kind);
      if (!kinds.includes('command') || !kinds.includes('trait') || !kinds.includes('habit')) {
        errors.push(`${profileId}: detailed profile must include Command, Trait, and Habit records.`);
      }
      for (const ability of abilities) {
        const abilityId = typeof ability.id === 'string' ? ability.id : 'unknown-ability';
        if (abilityId === 'unknown-ability' || abilityId.length === 0) {
          errors.push(`${profileId}: ability is missing stable id.`);
        }
        if (typeof ability.rawDescription !== 'string' || ability.rawDescription.trim().length === 0) {
          errors.push(`${profileId}: ${abilityId} is missing raw wording.`);
        }
      }
    }
    if (profile.profileCompleteness === 'metadata-only' && abilities.length !== 0) {
      errors.push(`${profileId}: metadata-only profile must not include ability records.`);
    }
  }
}

function validateSimpleProfileReferences(errors: string[]) {
  const abilityIds = new Set(dragons.flatMap((dragon) => [dragon.command, dragon.trait, ...dragon.habits].filter(Boolean).map((ability) => ability.id)));
  const profileIds = new Set<string>();
  for (const profile of simpleSynergyProfiles) {
    if (profileIds.has(profile.dragonId)) {
      errors.push(`Duplicate simple profile id: ${profile.dragonId}.`);
    }
    profileIds.add(profile.dragonId);
    for (const signal of [...profile.outputs, ...profile.supports, ...profile.benefitsFrom, ...profile.positionClaims]) {
      if (!abilityIds.has(signal.abilityId)) {
        errors.push(`Simple profile ${profile.dragonId} references missing ability ${signal.abilityId}.`);
      }
    }
  }
  for (const review of simpleSynergyAbilityReviews) {
    if (!abilityIds.has(review.abilityId)) {
      errors.push(`Profile audit references missing ability ${review.abilityId}.`);
    }
    const signalIds = review.disposition.kind === 'represented' || review.disposition.kind === 'reinforces-existing'
      ? review.disposition.signalIds
      : [];
    const allSignals = simpleSynergyProfiles.flatMap((profile) => [
      ...profile.outputs,
      ...profile.supports,
      ...profile.benefitsFrom,
      ...profile.positionClaims,
    ]);
    for (const signalId of signalIds) {
      if (!allSignals.some((signal) => signal.id === signalId)) {
        errors.push(`Profile audit references missing signal ${signalId}.`);
      }
    }
  }
  for (const id of metadataOnlyDragonIds) {
    if (profileIds.has(id)) {
      errors.push(`Metadata-only dragon ${id} must remain unmapped.`);
    }
  }
}

function validateSourceMetadata(parsed: Map<string, JsonValue>, errors: string[]) {
  const context = parsed.get('project-context/dragonfire-project-context.json');
  if (!isJsonObject(context) || !isJsonObject(context.source)) {
    errors.push('Consolidated context is missing source metadata.');
    return;
  }
  if (context.format !== projectContextFormat) {
    errors.push(`Unexpected project context format: ${JSON.stringify(context.format)}`);
  }
  if (typeof context.source.commit !== 'string' || !/^[a-f0-9]{40}$/i.test(context.source.commit)) {
    errors.push('Source commit must be a 40-character SHA.');
  }
  if (typeof context.source.branch !== 'string' || context.source.branch.length === 0) {
    errors.push('Source branch must be recorded.');
  }
}

function validateNoLocalPathsOrSecrets(serializedFiles: Record<string, string>, errors: string[]) {
  const combined = Object.values(serializedFiles).join('\n');
  const checks: Array<[RegExp, string]> = [
    [/[A-Za-z]:\\Users\\/i, 'local Windows user path'],
    [/\/Users\//, 'local Unix user path'],
    [/localStorage/i, 'browser storage dump'],
    [/(github_pat_|ghp_[A-Za-z0-9]|sk-[A-Za-z0-9]{20,})/, 'secret-like token'],
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(combined)) {
      errors.push(`Generated context contains ${label}.`);
    }
  }
}

function validateDeterministicFiles(
  serializedFiles: Record<string, string>,
  expectedFiles: Record<string, string>,
  errors: string[],
) {
  for (const [filePath, expected] of Object.entries(expectedFiles)) {
    const actual = serializedFiles[filePath];
    if (actual !== undefined && actual !== expected) {
      errors.push(`${filePath}: content is not deterministic for the supplied build options.`);
    }
  }
}

function validateSizeLimit(serializedFiles: Record<string, string>, errors: string[]) {
  const totalBytes = byteSize(serializedFiles);
  if (totalBytes > projectContextSizeLimitBytes) {
    errors.push(`Project context is ${totalBytes} bytes; limit is ${projectContextSizeLimitBytes}.`);
  }
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function byteSize(files: Record<string, string>) {
  return Object.values(files).reduce((total, content) => total + new TextEncoder().encode(content).length, 0);
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
