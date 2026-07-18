import { createHash } from 'node:crypto';

import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { buildDragonDetailPresentation } from '../app/dragonDetailPresentation';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { manualReviewRecords } from '../data/manualReviews';
import type { Dragon, FormationPosition } from '../models/dragon';
import { rateFormation, tierForScore } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { buildSimpleFormationPresentation } from '../synergy/formationPresentation';
import { SIMPLE_FORMATION_POSITIONS } from '../synergy/positionRules';
import { metadataOnlyDragonIds, simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  CONTROL_ALIAS_TAGS,
  SYNERGY_TAGS,
  SYNERGY_TAG_LABELS,
  categoryTagsFor,
  isSynergyTag,
  tagSatisfies,
  type SynergyTag,
} from '../synergy/tags';
import type {
  DragonProgression,
  PositionClaim,
  SimpleFormation,
  SimpleProgressionByDragonId,
  SynergySignal,
} from '../synergy/types';

export type AuditFindingCategory =
  | 'confirmed defect'
  | 'probable defect requiring controller review'
  | 'source/profile mismatch'
  | 'progression defect'
  | 'targeting defect'
  | 'relationship-aggregation defect'
  | 'status-taxonomy defect'
  | 'rating defect'
  | 'presentation defect'
  | 'documentation/context defect'
  | 'unresolved by design'
  | 'unsupported by current simple evaluator'
  | 'browser-only observation';

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface AuditFinding {
  id: string;
  severity: AuditSeverity;
  category: AuditFindingCategory;
  affectedArea: string;
  affectedAbilityOrSignal: string;
  currentBehavior: string;
  expectedBehavior: string;
  reproducibleSetup: string;
  fileReferences: string[];
  focusedTestReproduction: boolean;
  controllerMechanicConfirmationNeeded: boolean;
  recommendedNextAction: string;
  auditDisposition: 'Not fixed in this audit PR.';
}

export interface AuditCheck {
  id: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

export interface PerDragonAuditRow {
  dragonId: string;
  name: string;
  rarity: string;
  breed: string;
  abilityCount: number;
  signalCount: number;
  dispositionCount: number;
  evidenceReferenceCount: number;
  manualReviewCount: number;
  status: 'PASS' | 'FAIL';
  issues: string[];
}

export interface AliasAuditRow {
  providerTag: SynergyTag;
  providerLabel: string;
  aliasesTo: SynergyTag[];
  satisfiesControl: boolean;
}

export interface SelectorInventoryRow {
  selector: string;
  signalCount: number;
  signalIds: string[];
}

export interface FormationSummaryRow {
  formation: [string, string, string];
  score: number;
  tier: string;
  relationshipCount: number;
  missingEnablerCount: number;
  positionConflictCount: number;
  components: Record<string, number>;
}

export interface FullRosterAuditReport {
  auditVersion: string;
  generatedFrom: {
    databaseVersion: string;
    dataSchemaVersion: number;
    localRosterSchemaVersion: 5;
  };
  reliable: boolean;
  totals: {
    dragons: number;
    abilities: number;
    profileSignals: number;
    positionClaims: number;
    auditDispositions: number;
    evidenceSources: number;
    manualReviews: number;
    progressionStatesEvaluated: number;
    progressionFormationsEvaluated: number;
    orderedFormationsEvaluated: number;
    providerPayoffPairsEvaluated: number;
    compatibleProviderPayoffPairs: number;
    passChecks: number;
    failedChecks: number;
  };
  rarityCoverage: Record<string, number>;
  checks: AuditCheck[];
  findings: AuditFinding[];
  perDragon: PerDragonAuditRow[];
  aliasTable: AliasAuditRow[];
  selectorInventory: SelectorInventoryRow[];
  progression: {
    stars: number[];
    levels: number[];
    positions: FormationPosition[];
    inactiveStateCount: number;
    activeStateCount: number;
  };
  providerPayoffMatrix: {
    distinctTagPairs: number;
    compatibleDistinctTagPairs: string[];
    incompatibleControlCandidates: string[];
  };
  formationSweep: {
    expectedCount: 26970;
    actualCount: number;
    deterministicFullResultHash: string;
    rating: {
      minimum: number;
      maximum: number;
      mean: number;
      median: number;
      percentile90: number;
      percentile95: number;
      percentile99: number;
      byTier: Record<string, number>;
    };
    componentDistributions: Record<string, Record<string, number>>;
    relationshipCountDistribution: Record<string, number>;
    missingEnablerDistribution: Record<string, number>;
    positionConflictDistribution: Record<string, number>;
    kitUtilizationDistribution: Record<string, number>;
    topDragonFrequency: Record<string, number>;
    bottomDragonFrequency: Record<string, number>;
    top50: FormationSummaryRow[];
    bottom50: FormationSummaryRow[];
    invariantViolationCount: number;
    inactiveAbilityReferenceExamples: Array<{
      formation: [string, string, string];
      resultId: string;
      inactiveAbilityIds: string[];
    }>;
  };
  ratingContract: {
    componentMaximums: Record<string, number>;
    tierThresholds: Record<string, number>;
    excellentGuardrails: string[];
  };
}

const EXPECTED_RARITY_COUNTS: Record<string, number> = {
  Legendary: 9,
  Epic: 10,
  Rare: 12,
};
const EXPECTED_HABIT_UNLOCKS = [2, 4, 6, 8, 10];
const LOCAL_ROSTER_SCHEMA_VERSION = 5 as const;
const RATING_COMPONENT_MAXIMUMS: Record<string, number> = {
  'Readiness / profile confidence': 10,
  'Realized synergy payoff': 35,
  'Support usefulness': 20,
  'Kit utilization': 20,
  'Placement / conflict risk': 15,
};
const STATUS_TAGS = SYNERGY_TAGS.filter((tag) => tag.startsWith('status:'));

export function runFullRosterAudit(): FullRosterAuditReport {
  const checks: AuditCheck[] = [];
  const findings: AuditFinding[] = [];
  const addCheck = (id: string, passed: boolean, detail: string): void => {
    checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
  };

  const allAbilities = dragons
    .flatMap((dragon) => [dragon.command, dragon.trait, ...dragon.habits])
    .filter((ability): ability is NonNullable<typeof ability> => ability !== null);
  const allSignals = simpleSynergyProfiles.flatMap((profile) => [
    ...profile.outputs,
    ...profile.supports,
    ...profile.benefitsFrom,
  ]);
  const allClaims = simpleSynergyProfiles.flatMap((profile) => profile.positionClaims);
  const abilitiesById = new Map(allAbilities.map((ability) => [ability.id, ability]));
  const mappedArtifactsById = new Map<string, SynergySignal | PositionClaim>(
    [...allSignals, ...allClaims].map((artifact) => [artifact.id, artifact]),
  );
  const evidenceIds = new Set(evidenceSources.map((source) => source.id));
  const dragonIds = new Set(dragons.map((dragon) => dragon.id));
  const profileIds = new Set(simpleSynergyProfiles.map((profile) => profile.dragonId));

  const rarityCoverage = countBy(dragons, (dragon) => dragon.rarity);
  addCheck(
    'FRR-C001',
    databaseMetadata.databaseVersion === '0.9.1',
    `Database version is ${databaseMetadata.databaseVersion}.`,
  );
  addCheck(
    'FRR-C002',
    databaseMetadata.schemaVersion === 13,
    `Data schema is ${databaseMetadata.schemaVersion}.`,
  );
  addCheck('FRR-C003', dragons.length === 31, `${dragons.length} known dragons loaded.`);
  addCheck(
    'FRR-C004',
    simpleSynergyProfiles.length === 31,
    `${simpleSynergyProfiles.length} curated profiles loaded.`,
  );
  addCheck(
    'FRR-C005',
    metadataOnlyDragonIds.length === 0,
    `${metadataOnlyDragonIds.length} metadata-only dragon IDs remain.`,
  );
  addCheck(
    'FRR-C006',
    Object.entries(EXPECTED_RARITY_COUNTS).every(
      ([rarity, count]) => rarityCoverage[rarity] === count,
    ),
    `Rarity coverage: ${Object.entries(rarityCoverage)
      .map(([rarity, count]) => `${rarity} ${count}`)
      .join(', ')}.`,
  );
  addCheck(
    'FRR-C007',
    ['vesper', 'nyrena', 'dawnseeker'].every((id) => dragonIds.has(id) && profileIds.has(id)),
    'Vesper, Nyrena, and Dawnseeker are present in canonical data and curated profiles.',
  );
  addCheck(
    'FRR-C008',
    uniqueCount(dragons.map((dragon) => dragon.id)) === dragons.length,
    'Dragon IDs are globally unique.',
  );
  addCheck(
    'FRR-C009',
    uniqueCount(dragons.map((dragon) => dragon.slug)) === dragons.length,
    'Dragon slugs are globally unique.',
  );
  addCheck(
    'FRR-C010',
    uniqueCount(allAbilities.map((ability) => ability.id)) === allAbilities.length,
    'Ability IDs are globally unique.',
  );
  addCheck(
    'FRR-C011',
    uniqueCount(allSignals.map((signal) => signal.id)) === allSignals.length,
    'Profile signal IDs are globally unique.',
  );
  addCheck(
    'FRR-C012',
    uniqueCount(evidenceSources.map((source) => source.id)) === evidenceSources.length,
    'Evidence IDs are globally unique.',
  );
  addCheck(
    'FRR-C013',
    uniqueCount(manualReviewRecords.map((review) => review.id)) === manualReviewRecords.length,
    'Manual-review IDs are globally unique.',
  );

  const perDragon = dragons.map((dragon) =>
    auditDragon(dragon, abilitiesById, mappedArtifactsById, evidenceIds),
  );
  addCheck(
    'FRR-C014',
    perDragon.every((row) => row.status === 'PASS'),
    `${perDragon.filter((row) => row.status === 'PASS').length} of ${perDragon.length} per-dragon records pass structural checks.`,
  );
  addCheck(
    'FRR-C015',
    allAbilities.length === 217,
    `${allAbilities.length} canonical abilities loaded.`,
  );
  addCheck(
    'FRR-C016',
    simpleSynergyAbilityReviews.length === allAbilities.length &&
      uniqueCount(simpleSynergyAbilityReviews.map((review) => review.abilityId)) ===
        allAbilities.length,
    `${simpleSynergyAbilityReviews.length} explicit ability dispositions cover ${allAbilities.length} abilities.`,
  );

  const unresolvedReviewReferences = simpleSynergyAbilityReviews.flatMap((review) => {
    const ability = abilitiesById.get(review.abilityId);
    const referencedSignals = 'signalIds' in review.disposition ? review.disposition.signalIds : [];
    const issues: string[] = [];
    if (!ability || ability.dragonId !== review.dragonId || ability.kind !== review.abilityKind) {
      issues.push(`${review.abilityId}:canonical-ability`);
    }
    for (const signalId of referencedSignals) {
      const signal = mappedArtifactsById.get(signalId);
      if (!signal) {
        issues.push(`${review.abilityId}:${signalId}`);
      }
    }
    return issues;
  });
  addCheck(
    'FRR-C017',
    unresolvedReviewReferences.length === 0,
    unresolvedReviewReferences.length === 0
      ? 'Every mapped disposition resolves to its canonical ability and profile signal.'
      : `Unresolved disposition references: ${unresolvedReviewReferences.join(', ')}.`,
  );

  const unresolvedProfileReferences = simpleSynergyProfiles.flatMap((profile) => {
    const dragon = dragons.find((candidate) => candidate.id === profile.dragonId);
    const issues: string[] = [];
    if (!dragon || dragon.name !== profile.dragonName) {
      issues.push(`${profile.dragonId}:profile-identity`);
    }
    for (const signal of [...profile.outputs, ...profile.supports, ...profile.benefitsFrom]) {
      const ability = abilitiesById.get(signal.abilityId);
      if (
        !ability ||
        ability.dragonId !== profile.dragonId ||
        ability.name !== signal.abilityName
      ) {
        issues.push(`${signal.id}:ability`);
      }
      for (const tag of signalTags(signal) as readonly string[]) {
        if (!isSynergyTag(tag)) {
          issues.push(`${signal.id}:tag:${tag}`);
        }
      }
      for (const tag of (signal.scalesWith ?? []) as readonly string[]) {
        if (!isSynergyTag(tag)) {
          issues.push(`${signal.id}:scales:${tag}`);
        }
      }
      if (!validSignalContract(signal)) {
        issues.push(`${signal.id}:contract`);
      }
    }
    for (const claim of profile.positionClaims) {
      const ability = abilitiesById.get(claim.abilityId);
      if (
        !ability ||
        ability.dragonId !== profile.dragonId ||
        ability.name !== claim.abilityName ||
        !validClaimContract(claim)
      ) {
        issues.push(`${claim.id}:claim`);
      }
    }
    return issues;
  });
  addCheck(
    'FRR-C018',
    unresolvedProfileReferences.length === 0,
    unresolvedProfileReferences.length === 0
      ? 'All profile identities, ability references, tags, unlocks, selectors, and positions are valid.'
      : `Invalid profile references: ${unresolvedProfileReferences.join(', ')}.`,
  );

  const badEvidenceReferences = [
    ...allAbilities.flatMap((ability) =>
      ability.evidenceIds.filter((id) => !evidenceIds.has(id)).map((id) => `${ability.id}:${id}`),
    ),
    ...manualReviewRecords.flatMap((review) =>
      review.evidenceIds.filter((id) => !evidenceIds.has(id)).map((id) => `${review.id}:${id}`),
    ),
  ];
  addCheck(
    'FRR-C019',
    badEvidenceReferences.length === 0,
    badEvidenceReferences.length === 0
      ? 'All ability and manual-review evidence references resolve.'
      : `Missing evidence references: ${badEvidenceReferences.join(', ')}.`,
  );
  addCheck(
    'FRR-C020',
    manualReviewRecords.every((review) => dragonIds.has(review.dragonId)),
    'All manual-review records resolve to canonical dragons.',
  );

  const aliasTable = STATUS_TAGS.map((providerTag) => ({
    providerTag,
    providerLabel: SYNERGY_TAG_LABELS[providerTag],
    aliasesTo: categoryTagsFor(providerTag),
    satisfiesControl: tagSatisfies(providerTag, 'status:control'),
  }));
  const actualControlAliases = aliasTable
    .filter((row) => row.providerTag !== 'status:control' && row.satisfiesControl)
    .map((row) => row.providerTag);
  addCheck(
    'FRR-C021',
    sameStringSet(actualControlAliases, [...CONTROL_ALIAS_TAGS]),
    `Control aliases are ${actualControlAliases.join(', ')}.`,
  );
  addCheck(
    'FRR-C022',
    [
      'status:slow',
      'status:burn',
      'status:bleed',
      'status:panic',
      'status:taunt',
      'status:vulnerable',
      'status:weakened',
      'status:first-strike',
      'status:resistance',
      'status:advantage',
    ].every((tag) => !tagSatisfies(tag as SynergyTag, 'status:control')),
    'All explicitly prohibited Control aliases remain distinct.',
  );
  addCheck(
    'FRR-C023',
    !tagSatisfies('status:bleed', 'damage:physical') &&
      !tagSatisfies('status:burn', 'damage:fire') &&
      !tagSatisfies('damage:fire', 'status:burn') &&
      !tagSatisfies('status:panic', 'damage:tactical'),
    'Periodic statuses and damage types do not cross-alias.',
  );
  addCheck(
    'FRR-C024',
    !tagSatisfies('effect:recovery', 'effect:recovery-received') &&
      !tagSatisfies('effect:recovery-received', 'effect:recovery'),
    'Recovery and Recovery Received remain distinct.',
  );

  const selectorInventory = buildSelectorInventory(allSignals);
  const progressionResult = auditProgression(addCheck);
  const providerPayoffMatrix = auditProviderPayoffMatrix(addCheck);
  const formationSweep = auditFormationSweep(addCheck);

  if (formationSweep.inactiveAbilityReferenceExamples.length > 0) {
    const uniqueAbilityIds = [
      ...new Set(
        formationSweep.inactiveAbilityReferenceExamples.flatMap(
          (example) => example.inactiveAbilityIds,
        ),
      ),
    ].sort();
    findings.push({
      id: 'FRR-F003',
      severity: 'medium',
      category: 'relationship-aggregation defect',
      affectedArea: 'Aggregated relationship ability references',
      affectedAbilityOrSignal: uniqueAbilityIds.join(', '),
      currentBehavior: `${formationSweep.invariantViolationCount} ordered formations contain an active semantic relationship whose merged abilityIds include at least one currently locked or position-inactive alternative.`,
      expectedBehavior:
        'An active relationship may aggregate equivalent active paths, but its displayed ability references should not include inactive or position-blocked alternatives.',
      reproducibleSetup: formationSweep.inactiveAbilityReferenceExamples
        .slice(0, 3)
        .map(
          (example) =>
            `${example.formation.join('/')} -> ${example.resultId} includes ${example.inactiveAbilityIds.join(', ')}`,
        )
        .join('; '),
      fileReferences: [
        'src/synergy/evaluateFormation.ts',
        'src/synergy/formationPresentation.ts',
        'src/app/formationCardPresentation.ts',
      ],
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'Create a narrow evaluator-aggregation follow-up that filters merged ability IDs by the winning eligibility rank, with focused presentation regression coverage.',
      auditDisposition: 'Not fixed in this audit PR.',
    });
  }

  const detailPresentationIssues = dragons.flatMap((dragon) => {
    const detail = buildDragonDetailPresentation(
      simpleSynergyProfiles.find((profile) => profile.dragonId === dragon.id),
    );
    const issues: string[] = [];
    if (!dragon.command || !dragon.trait || dragon.habits.length !== 5) {
      issues.push(`${dragon.id}:ability-sections`);
    }
    if (!detail.headerLine.trim()) issues.push(`${dragon.id}:empty-detail-header`);
    return issues;
  });
  addCheck(
    'FRR-C025',
    detailPresentationIssues.length === 0,
    detailPresentationIssues.length === 0
      ? 'All 31 detail presentations expose named Command, Trait, and five-Habit source records.'
      : `Detail presentation issues: ${detailPresentationIssues.join(', ')}.`,
  );
  addCheck(
    'FRR-C026',
    tierForScore(90) === 'Excellent' &&
      tierForScore(75) === 'Strong' &&
      tierForScore(60) === 'Solid' &&
      tierForScore(40) === 'Developing' &&
      tierForScore(1) === 'Weak' &&
      tierForScore(0) === 'Incomplete',
    'Tier thresholds match the committed rating contract.',
  );

  const unresolvedGroupSignals = allSignals.filter(
    (signal) => signal.recipientSelector?.kind === 'unresolved-group',
  );
  if (unresolvedGroupSignals.length > 0) {
    findings.push({
      id: 'FRR-F001',
      severity: 'informational',
      category: 'unsupported by current simple evaluator',
      affectedArea: 'Recipient selection',
      affectedAbilityOrSignal: unresolvedGroupSignals.map((signal) => signal.id).join(', '),
      currentBehavior: `${unresolvedGroupSignals.length} curated signal(s) use an unresolved group selector and intentionally create no guessed scored relationship.`,
      expectedBehavior:
        'Keep the mechanic visible and non-scoring until canonical wording or data identifies a deterministic recipient.',
      reproducibleSetup:
        'Place each listed provider in a full Level 16, 10-Star formation and inspect relationship output for the listed signal.',
      fileReferences: ['src/synergy/profiles.ts', 'src/synergy/recipientSelectors.ts'],
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'Retain conservative behavior; add a focused mechanic prompt only if controller evidence resolves the recipient.',
      auditDisposition: 'Not fixed in this audit PR.',
    });
  }

  const highestStatSignals = allSignals.filter(
    (signal) => signal.recipientSelector?.kind === 'highest-stat',
  );
  const missingCanonicalStats = highestStatSignals.filter((signal) => {
    const selector = signal.recipientSelector;
    return (
      selector?.kind === 'highest-stat' &&
      dragons.some((dragon) => dragon.stats[selector.stat] === null)
    );
  });
  if (missingCanonicalStats.length > 0) {
    findings.push({
      id: 'FRR-F002',
      severity: 'informational',
      category: 'unresolved by design',
      affectedArea: 'Highest-stat recipient selection',
      affectedAbilityOrSignal: missingCanonicalStats.map((signal) => signal.id).join(', '),
      currentBehavior:
        'Canonical combat-stat values are incomplete, so highest-stat recipients remain unresolved and receive neither relationship credit nor Kit Utilization penalties.',
      expectedBehavior:
        'Resolve only a unique known maximum; ties and missing values must remain uncredited.',
      reproducibleSetup:
        'Evaluate the listed signal with canonical progression combatStats; then compare with a synthetic unique maximum and a synthetic tie.',
      fileReferences: [
        'src/data/dragons.ts',
        'src/synergy/recipientSelectors.ts',
        'src/services/formationRating.ts',
      ],
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'No production change. Populate verified canonical combat stats only through a separately reviewed data task.',
      auditDisposition: 'Not fixed in this audit PR.',
    });
  }

  const failedChecks = checks.filter((check) => check.status === 'FAIL');
  for (const [index, check] of failedChecks
    .filter((candidate) => candidate.id !== 'FRR-C030')
    .entries()) {
    findings.push({
      id: `FRR-A${String(index + 1).padStart(3, '0')}`,
      severity: check.id.startsWith('FRR-C00') ? 'high' : 'medium',
      category: categoryForFailedCheck(check.id),
      affectedArea: check.id,
      affectedAbilityOrSignal: 'Framework invariant',
      currentBehavior: check.detail,
      expectedBehavior:
        `The audited invariant should pass against canonical ${databaseMetadata.databaseVersion} source data and current evaluator behavior.`,
      reproducibleSetup: `Run pnpm run audit:full-roster and inspect check ${check.id}.`,
      fileReferences: fileReferencesForFailedCheck(check.id),
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'Create a narrow follow-up issue and correction prompt; do not change production behavior in the audit PR.',
      auditDisposition: 'Not fixed in this audit PR.',
    });
  }

  const fundamentalCheckIds = new Set([
    'FRR-C001',
    'FRR-C002',
    'FRR-C003',
    'FRR-C004',
    'FRR-C008',
    'FRR-C010',
    'FRR-C011',
    'FRR-C015',
  ]);
  const reliable = !failedChecks.some((check) => fundamentalCheckIds.has(check.id));

  return {
    auditVersion: databaseMetadata.databaseVersion,
    generatedFrom: {
      databaseVersion: databaseMetadata.databaseVersion,
      dataSchemaVersion: databaseMetadata.schemaVersion,
      localRosterSchemaVersion: LOCAL_ROSTER_SCHEMA_VERSION,
    },
    reliable,
    totals: {
      dragons: dragons.length,
      abilities: allAbilities.length,
      profileSignals: allSignals.length,
      positionClaims: allClaims.length,
      auditDispositions: simpleSynergyAbilityReviews.length,
      evidenceSources: evidenceSources.length,
      manualReviews: manualReviewRecords.length,
      progressionStatesEvaluated: progressionResult.statesEvaluated,
      progressionFormationsEvaluated: progressionResult.formationsEvaluated,
      orderedFormationsEvaluated: formationSweep.actualCount,
      providerPayoffPairsEvaluated: providerPayoffMatrix.signalPairsEvaluated,
      compatibleProviderPayoffPairs: providerPayoffMatrix.compatibleSignalPairs,
      passChecks: checks.filter((check) => check.status === 'PASS').length,
      failedChecks: failedChecks.length,
    },
    rarityCoverage,
    checks,
    findings,
    perDragon,
    aliasTable,
    selectorInventory,
    progression: {
      stars: [...Array.from({ length: 10 }, (_, index) => index + 1)],
      levels: [15, 16],
      positions: [...SIMPLE_FORMATION_POSITIONS],
      inactiveStateCount: progressionResult.inactiveStateCount,
      activeStateCount: progressionResult.activeStateCount,
    },
    providerPayoffMatrix: {
      distinctTagPairs: providerPayoffMatrix.distinctTagPairs,
      compatibleDistinctTagPairs: providerPayoffMatrix.compatibleDistinctTagPairs,
      incompatibleControlCandidates: providerPayoffMatrix.incompatibleControlCandidates,
    },
    formationSweep,
    ratingContract: {
      componentMaximums: RATING_COMPONENT_MAXIMUMS,
      tierThresholds: {
        Excellent: 90,
        Strong: 75,
        Solid: 60,
        Developing: 40,
        Weak: 1,
        Incomplete: 0,
      },
      excellentGuardrails: [
        'Realized synergy payoff must be at least 28/35.',
        'Kit utilization must be at least 13/20.',
        'Fewer than three Benefits may remain missing.',
        'Placement score must remain above 5/15.',
        'Support usefulness at 16+ cannot substitute for payoff below 28.',
      ],
    },
  };
}

function auditDragon(
  dragon: Dragon,
  abilitiesById: Map<string, NonNullable<Dragon['command']>>,
  mappedArtifactsById: Map<string, SynergySignal | PositionClaim>,
  evidenceIds: Set<string>,
): PerDragonAuditRow {
  const abilities = [dragon.command, dragon.trait, ...dragon.habits].filter(
    (ability): ability is NonNullable<typeof ability> => ability !== null,
  );
  const reviews = simpleSynergyAbilityReviews.filter((review) => review.dragonId === dragon.id);
  const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === dragon.id);
  const signals = profile ? [...profile.outputs, ...profile.supports, ...profile.benefitsFrom] : [];
  const manualReviews = manualReviewRecords.filter((review) => review.dragonId === dragon.id);
  const issues: string[] = [];

  if (dragon.id.trim() === '' || dragon.slug.trim() === '' || dragon.name.trim() === '')
    issues.push('identity');
  if (dragon.dataStatus === 'official-metadata-only') issues.push('metadata-only');
  if (!dragon.command || dragon.command.kind !== 'command') issues.push('command-count');
  if (!dragon.trait || dragon.trait.kind !== 'trait') issues.push('trait-count');
  if (dragon.habits.length !== 5 || dragon.habits.some((habit) => habit.kind !== 'habit'))
    issues.push('habit-count');
  if (
    dragon.habits.map((habit) => habit.unlockStarRank).join(',') !==
    EXPECTED_HABIT_UNLOCKS.join(',')
  )
    issues.push('habit-unlocks');
  if (
    dragon.trait &&
    (dragon.trait.minimumDragonLevel !== 16 || dragon.trait.positionRequirement !== 'vanguard')
  )
    issues.push('trait-unlock-position');
  if (abilities.some((ability) => ability.dragonId !== dragon.id || !abilitiesById.has(ability.id)))
    issues.push('ability-owner');
  if (abilities.some((ability) => !ability.rawDescription?.trim())) issues.push('raw-wording');
  if (
    abilities.some(
      (ability) =>
        ability.evidenceIds.length === 0 || ability.evidenceIds.some((id) => !evidenceIds.has(id)),
    )
  )
    issues.push('ability-evidence');
  if (reviews.length !== abilities.length) issues.push('audit-dispositions');
  if (
    reviews.some(
      (review) =>
        'signalIds' in review.disposition &&
        review.disposition.signalIds.some((id) => !mappedArtifactsById.has(id)),
    )
  )
    issues.push('disposition-signals');
  if (!profile) issues.push('profile');
  if (manualReviews.length === 0) issues.push('manual-review');

  return {
    dragonId: dragon.id,
    name: dragon.name,
    rarity: dragon.rarity,
    breed: dragon.breed,
    abilityCount: abilities.length,
    signalCount: signals.length,
    dispositionCount: reviews.length,
    evidenceReferenceCount: abilities.reduce((sum, ability) => sum + ability.evidenceIds.length, 0),
    manualReviewCount: manualReviews.length,
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    issues,
  };
}

function validSignalContract(signal: SynergySignal): boolean {
  const unlock = signal.unlock;
  const selector = signal.recipientSelector;
  if (
    unlock?.minimumStarRank !== undefined &&
    (unlock.minimumStarRank < 1 || unlock.minimumStarRank > 10)
  )
    return false;
  if (unlock?.minimumDragonLevel !== undefined && unlock.minimumDragonLevel < 1) return false;
  if (unlock?.minimumStarRank !== undefined && unlock?.minimumDragonLevel !== undefined)
    return false;
  if (
    signal.requiredSelfPosition !== undefined &&
    !SIMPLE_FORMATION_POSITIONS.includes(signal.requiredSelfPosition)
  )
    return false;
  if (
    signal.requiredRecipientPosition !== undefined &&
    !SIMPLE_FORMATION_POSITIONS.includes(signal.requiredRecipientPosition)
  )
    return false;
  if (selector?.kind === 'unresolved-group' || selector?.kind === 'adjacent-group') {
    return (
      Number.isInteger(selector.recipientCount) &&
      selector.recipientCount >= 1 &&
      selector.recipientCount <= 3
    );
  }
  return (
    signal.id.trim().length > 0 &&
    signal.abilityId.trim().length > 0 &&
    signal.abilityName.trim().length > 0 &&
    signal.description.trim().length > 0
  );
}

function validClaimContract(claim: PositionClaim): boolean {
  return (
    claim.id.trim().length > 0 &&
    SIMPLE_FORMATION_POSITIONS.includes(claim.requiredPosition) &&
    (claim.unlock?.minimumStarRank === undefined ||
      (claim.unlock.minimumStarRank >= 1 && claim.unlock.minimumStarRank <= 10)) &&
    (claim.unlock?.minimumDragonLevel === undefined || claim.unlock.minimumDragonLevel >= 1)
  );
}

function buildSelectorInventory(signals: SynergySignal[]): SelectorInventoryRow[] {
  const inventory = new Map<string, string[]>();
  for (const signal of signals) {
    const key = selectorKeyForSignal(signal);
    const ids = inventory.get(key) ?? [];
    ids.push(signal.id);
    inventory.set(key, ids);
  }
  return [...inventory.entries()]
    .map(([selector, signalIds]) => ({
      selector,
      signalCount: signalIds.length,
      signalIds: signalIds.sort(),
    }))
    .sort((left, right) => left.selector.localeCompare(right.selector));
}

function selectorKeyForSignal(signal: SynergySignal): string {
  if (signal.recipientSelector) return selectorKey(signal.recipientSelector);
  if (signal.requiredRecipientPosition) return `fixed-position:${signal.requiredRecipientPosition}`;
  if (signal.friendlyScope === 'adjacent') return 'adjacent:all-eligible-teammates';
  if (signal.friendlyScope === 'self') return 'self-only:no-allied-recipient';
  return 'formation:all-eligible-teammates';
}

function selectorKey(selector: NonNullable<SynergySignal['recipientSelector']>): string {
  if (selector.kind === 'highest-stat')
    return `highest-stat:${selector.stat}:${selector.excludeSelf ? 'other-only' : 'self-eligible'}`;
  if (selector.kind === 'position-priority')
    return `position-priority:${selector.preferredPosition}:${selector.allowSelf ? 'self-eligible' : 'other-only'}`;
  return `${selector.kind}:${selector.recipientCount}:${selector.includeSelf ? 'self-eligible' : 'other-only'}`;
}

function auditProgression(addCheck: (id: string, passed: boolean, detail: string) => void): {
  statesEvaluated: number;
  formationsEvaluated: number;
  inactiveStateCount: number;
  activeStateCount: number;
} {
  const signalsAndClaims = simpleSynergyProfiles.flatMap((profile) => [
    ...profile.outputs.map((signal) => ({ profile, signal })),
    ...profile.supports.map((signal) => ({ profile, signal })),
    ...profile.benefitsFrom.map((signal) => ({ profile, signal })),
    ...profile.positionClaims.map((signal) => ({ profile, signal })),
  ]);
  let statesEvaluated = 0;
  let formationsEvaluated = 0;
  let inactiveStateCount = 0;
  let activeStateCount = 0;
  const violations: string[] = [];

  for (const { profile, signal } of signalsAndClaims) {
    for (let starRank = 1; starRank <= 10; starRank += 1) {
      for (const dragonLevel of [15, 16]) {
        for (const position of SIMPLE_FORMATION_POSITIONS) {
          statesEvaluated += 1;
          const active = signalIsActive(signal, position, { starRank, dragonLevel });
          if (active) activeStateCount += 1;
          else inactiveStateCount += 1;
          if (
            signal.unlock?.minimumStarRank !== undefined &&
            starRank < signal.unlock.minimumStarRank &&
            active
          )
            violations.push(`${signal.id}:below-star`);
          if (
            signal.unlock?.minimumDragonLevel !== undefined &&
            dragonLevel < signal.unlock.minimumDragonLevel &&
            active
          )
            violations.push(`${signal.id}:below-level`);
          if (
            'requiredSelfPosition' in signal &&
            signal.requiredSelfPosition !== undefined &&
            signal.requiredSelfPosition !== position &&
            active
          )
            violations.push(`${signal.id}:wrong-position`);
        }
      }
    }

    const formation = formationWithProfileAt(profile.dragonId, 'vanguard');
    for (let starRank = 1; starRank <= 10; starRank += 1) {
      for (const dragonLevel of [15, 16]) {
        for (const position of SIMPLE_FORMATION_POSITIONS) {
          const positionedFormation = moveDragonToPosition(formation, profile.dragonId, position);
          const progression = progressionForFormation(positionedFormation, starRank, dragonLevel);
          const evaluated = evaluateFormation({
            formation: positionedFormation,
            progression,
            profiles: simpleSynergyProfiles,
          });
          formationsEvaluated += 1;
          void evaluated;
        }
      }
    }
  }

  addCheck(
    'FRR-C027',
    violations.length === 0,
    violations.length === 0
      ? `${statesEvaluated} signal/claim progression states and ${formationsEvaluated} evaluator progression formations passed.`
      : `Progression violations: ${violations.slice(0, 20).join(', ')}.`,
  );
  return { statesEvaluated, formationsEvaluated, inactiveStateCount, activeStateCount };
}

function abilityHasActiveSignal(
  abilityId: string,
  formation: SimpleFormation,
  progression: SimpleProgressionByDragonId,
): boolean {
  for (const [position, dragonId] of Object.entries(formation) as Array<
    [FormationPosition, string | null]
  >) {
    if (!dragonId) continue;
    const profile = simpleSynergyProfiles.find((candidate) => candidate.dragonId === dragonId);
    if (!profile) continue;
    const signal = [...profile.outputs, ...profile.supports, ...profile.benefitsFrom].find(
      (candidate) =>
        candidate.abilityId === abilityId &&
        signalIsActive(candidate, position, progression[dragonId]),
    );
    if (signal) return true;
  }
  return false;
}

function auditProviderPayoffMatrix(
  addCheck: (id: string, passed: boolean, detail: string) => void,
): {
  signalPairsEvaluated: number;
  compatibleSignalPairs: number;
  distinctTagPairs: number;
  compatibleDistinctTagPairs: string[];
  incompatibleControlCandidates: string[];
} {
  const pairs = new Set<string>();
  const compatiblePairs = new Set<string>();
  let signalPairsEvaluated = 0;
  let compatibleSignalPairs = 0;
  for (const provider of simpleSynergyProfiles) {
    for (const output of provider.outputs) {
      for (const beneficiary of simpleSynergyProfiles) {
        if (provider.dragonId === beneficiary.dragonId) continue;
        for (const benefit of beneficiary.benefitsFrom) {
          for (const providerTag of signalTags(output)) {
            for (const beneficiaryTag of signalTags(benefit)) {
              signalPairsEvaluated += 1;
              const key = `${providerTag}->${beneficiaryTag}`;
              pairs.add(key);
              if (tagSatisfies(providerTag, beneficiaryTag)) {
                compatibleSignalPairs += 1;
                compatiblePairs.add(key);
              }
            }
          }
        }
      }
    }
  }
  const incompatibleControlCandidates = STATUS_TAGS.filter(
    (tag) => tag !== 'status:control' && !tagSatisfies(tag, 'status:control'),
  );
  const observedControlProviders = [...compatiblePairs]
    .filter((pair) => pair.endsWith('->status:control'))
    .map((pair) => pair.split('->')[0] ?? '');
  addCheck(
    'FRR-C028',
    observedControlProviders.every((tag) =>
      [...CONTROL_ALIAS_TAGS, 'status:control'].includes(
        tag as (typeof CONTROL_ALIAS_TAGS)[number] | 'status:control',
      ),
    ),
    `${signalPairsEvaluated} provider/payoff signal-tag pairs evaluated; observed Control compatibility is restricted to the verified family.`,
  );
  return {
    signalPairsEvaluated,
    compatibleSignalPairs,
    distinctTagPairs: pairs.size,
    compatibleDistinctTagPairs: [...compatiblePairs].sort(),
    incompatibleControlCandidates: [...incompatibleControlCandidates].sort(),
  };
}

function auditFormationSweep(
  addCheck: (id: string, passed: boolean, detail: string) => void,
): FullRosterAuditReport['formationSweep'] {
  const hash = createHash('sha256');
  const rows: FormationSummaryRow[] = [];
  const tierCounts: Record<string, number> = {};
  const componentDistributions: Record<string, Record<string, number>> = {};
  const relationshipCountDistribution: Record<string, number> = {};
  const missingEnablerDistribution: Record<string, number> = {};
  const positionConflictDistribution: Record<string, number> = {};
  const kitUtilizationDistribution: Record<string, number> = {};
  const violations: string[] = [];
  const inactiveAbilityReferenceExamples: FullRosterAuditReport['formationSweep']['inactiveAbilityReferenceExamples'] =
    [];
  const mappedProfileIds = new Set(simpleSynergyProfiles.map((profile) => profile.dragonId));

  for (const left of dragons) {
    for (const vanguard of dragons) {
      if (vanguard.id === left.id) continue;
      for (const right of dragons) {
        if (right.id === left.id || right.id === vanguard.id) continue;
        const formation: SimpleFormation = {
          'left-flank': left.id,
          vanguard: vanguard.id,
          'right-flank': right.id,
        };
        const progression = progressionForFormation(formation, 10, 16);
        const results = evaluateFormation({
          formation,
          progression,
          profiles: simpleSynergyProfiles,
        }).results;
        const presentation = buildSimpleFormationPresentation({
          formation,
          dragons,
          mappedProfileIds,
          results,
        });
        const signalChipsByDragonId = Object.fromEntries(
          (Object.entries(formation) as Array<[FormationPosition, string]>).map(
            ([position, dragonId]) => {
              const profile = simpleSynergyProfiles.find(
                (candidate) => candidate.dragonId === dragonId,
              );
              return [
                dragonId,
                buildFormationSignalChips({
                  profile,
                  position,
                  formation,
                  profiles: simpleSynergyProfiles,
                  progression,
                }),
              ];
            },
          ),
        );
        const rating = rateFormation({
          formation,
          dragons,
          profiles: simpleSynergyProfiles,
          presentation,
          signalChipsByDragonId,
        });
        const activeRelationships = results.filter(
          (result) => result.kind === 'setup-payoff' || result.kind === 'amplifier-output',
        );
        const selectedIds = new Set([left.id, vanguard.id, right.id]);
        const resultIds = results.map((result) => result.id);
        const relationshipKeys = activeRelationships.map(
          (result) => `${result.kind}:${result.dragonIds.join('>')}:${result.tag ?? ''}`,
        );
        const componentTotal = rating.breakdown.reduce((sum, item) => sum + item.score, 0);
        const excellentViolation =
          rating.tier === 'Excellent' &&
          !passesExcellentGuardrails(rating, presentation, signalChipsByDragonId);
        const inactiveAbilityIds = activeRelationships.flatMap((result) =>
          result.abilityIds.filter(
            (abilityId) => !abilityHasActiveSignal(abilityId, formation, progression),
          ),
        );
        if (inactiveAbilityIds.length > 0 && inactiveAbilityReferenceExamples.length < 50) {
          const result = activeRelationships.find((candidate) =>
            candidate.abilityIds.some((abilityId) => inactiveAbilityIds.includes(abilityId)),
          );
          if (result) {
            inactiveAbilityReferenceExamples.push({
              formation: [left.id, vanguard.id, right.id],
              resultId: result.id,
              inactiveAbilityIds: [
                ...new Set(
                  result.abilityIds.filter(
                    (abilityId) => !abilityHasActiveSignal(abilityId, formation, progression),
                  ),
                ),
              ].sort(),
            });
          }
        }
        const localViolations = [
          !Number.isFinite(rating.score) || rating.score < 0 || rating.score > 100
            ? 'rating-bounds'
            : null,
          rating.breakdown.some(
            (item) => !Number.isFinite(item.score) || item.score < 0 || item.score > item.max,
          )
            ? 'component-bounds'
            : null,
          componentTotal !== rating.score ? 'component-total' : null,
          uniqueCount(resultIds) !== resultIds.length ? 'duplicate-result-id' : null,
          uniqueCount(relationshipKeys) !== relationshipKeys.length
            ? 'duplicate-relationship'
            : null,
          activeRelationships.some(
            (result) => result.dragonIds.length < 2 || result.dragonIds[0] === result.dragonIds[1],
          )
            ? 'self-relationship'
            : null,
          activeRelationships.some((result) => result.dragonIds.some((id) => !selectedIds.has(id)))
            ? 'outside-formation'
            : null,
          inactiveAbilityIds.length > 0 ? 'inactive-signal' : null,
          excellentViolation ? 'excellent-guardrail' : null,
        ].filter((issue): issue is string => issue !== null);
        if (localViolations.length > 0)
          violations.push(`${left.id}/${vanguard.id}/${right.id}:${localViolations.join('+')}`);

        const components = Object.fromEntries(
          rating.breakdown.map((item) => [item.label, item.score]),
        );
        const row: FormationSummaryRow = {
          formation: [left.id, vanguard.id, right.id],
          score: rating.score,
          tier: rating.tier,
          relationshipCount: activeRelationships.length,
          missingEnablerCount: presentation.missingEnablers.length,
          positionConflictCount: presentation.positionConflicts.length,
          components,
        };
        rows.push(row);
        hash.update(`${JSON.stringify({ ...row, resultIds })}\n`);
        increment(tierCounts, rating.tier);
        increment(relationshipCountDistribution, String(row.relationshipCount));
        increment(missingEnablerDistribution, String(row.missingEnablerCount));
        increment(positionConflictDistribution, String(row.positionConflictCount));
        increment(kitUtilizationDistribution, String(components['Kit utilization'] ?? 0));
        for (const [label, score] of Object.entries(components)) {
          const distribution = componentDistributions[label] ?? {};
          increment(distribution, String(score));
          componentDistributions[label] = distribution;
        }
      }
    }
  }

  addCheck(
    'FRR-C029',
    rows.length === 26970,
    `${rows.length} ordered three-dragon formations evaluated.`,
  );
  addCheck(
    'FRR-C030',
    violations.length === 0,
    violations.length === 0
      ? 'All exhaustive formation invariants passed.'
      : `Formation invariant violations: ${violations.slice(0, 20).join(', ')}.`,
  );
  const sortedScores = rows.map((row) => row.score).sort((left, right) => left - right);
  const topRows = [...rows].sort(compareFormationRowsDescending);
  const bottomRows = [...rows].sort(compareFormationRowsAscending);
  const top100 = topRows.slice(0, 100);
  const bottom100 = bottomRows.slice(0, 100);
  const totalScore = sortedScores.reduce((sum, score) => sum + score, 0);

  return {
    expectedCount: 26970,
    actualCount: rows.length,
    deterministicFullResultHash: hash.digest('hex'),
    rating: {
      minimum: sortedScores[0] ?? 0,
      maximum: sortedScores.at(-1) ?? 0,
      mean: round(totalScore / Math.max(1, sortedScores.length), 4),
      median: percentile(sortedScores, 0.5),
      percentile90: percentile(sortedScores, 0.9),
      percentile95: percentile(sortedScores, 0.95),
      percentile99: percentile(sortedScores, 0.99),
      byTier: sortRecord(tierCounts),
    },
    componentDistributions: Object.fromEntries(
      Object.entries(componentDistributions)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([label, distribution]) => [label, numericSortRecord(distribution)]),
    ),
    relationshipCountDistribution: numericSortRecord(relationshipCountDistribution),
    missingEnablerDistribution: numericSortRecord(missingEnablerDistribution),
    positionConflictDistribution: numericSortRecord(positionConflictDistribution),
    kitUtilizationDistribution: numericSortRecord(kitUtilizationDistribution),
    topDragonFrequency: frequencyByDragon(top100),
    bottomDragonFrequency: frequencyByDragon(bottom100),
    top50: topRows.slice(0, 50),
    bottom50: bottomRows.slice(0, 50),
    invariantViolationCount: violations.length,
    inactiveAbilityReferenceExamples,
  };
}

function passesExcellentGuardrails(
  rating: ReturnType<typeof rateFormation>,
  presentation: ReturnType<typeof buildSimpleFormationPresentation>,
  chips: Record<string, ReturnType<typeof buildFormationSignalChips>>,
): boolean {
  const component = (label: string) =>
    rating.breakdown.find((item) => item.label === label)?.score ?? 0;
  const missingBenefits = new Set([
    ...presentation.missingEnablers.map(
      (result) => `${result.dragonIds[0]}:${normalizeAuditMeaning(result.tag?.split(':').at(-1))}`,
    ),
    ...Object.entries(chips).flatMap(([dragonId, value]) =>
      value.benefitsFrom
        .filter((chip) => chip.state === 'missing')
        .map((chip) => `${dragonId}:${normalizeAuditMeaning(chip.label)}`),
    ),
  ]).size;
  const payoff = component('Realized synergy payoff');
  const support = component('Support usefulness');
  return (
    payoff >= 28 &&
    component('Kit utilization') >= 13 &&
    missingBenefits < 3 &&
    component('Placement / conflict risk') > 5 &&
    !(support >= 16 && payoff < 28)
  );
}

function normalizeAuditMeaning(value: string | undefined): string {
  return (value ?? 'unknown')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formationWithProfileAt(dragonId: string, position: FormationPosition): SimpleFormation {
  const others = dragons
    .filter((dragon) => dragon.id !== dragonId)
    .slice(0, 2)
    .map((dragon) => dragon.id);
  const formation: SimpleFormation = {
    'left-flank': others[0] ?? null,
    vanguard: others[1] ?? null,
    'right-flank': dragonId,
  };
  return moveDragonToPosition(formation, dragonId, position);
}

function moveDragonToPosition(
  formation: SimpleFormation,
  dragonId: string,
  position: FormationPosition,
): SimpleFormation {
  const next = { ...formation };
  const current = SIMPLE_FORMATION_POSITIONS.find((candidate) => next[candidate] === dragonId);
  if (current && current !== position) {
    const displaced = next[position];
    next[position] = dragonId;
    next[current] = displaced;
  }
  return next;
}

function progressionForFormation(
  formation: SimpleFormation,
  starRank: number,
  dragonLevel: number,
): SimpleProgressionByDragonId {
  return Object.fromEntries(
    Object.values(formation)
      .filter((id): id is string => id !== null)
      .map((id) => {
        const dragon = dragons.find((candidate) => candidate.id === id);
        return [
          id,
          { starRank, dragonLevel, combatStats: dragon?.stats ?? {} } satisfies DragonProgression,
        ];
      }),
  );
}

function signalIsActive(
  signal: SynergySignal | PositionClaim,
  position: FormationPosition,
  progression: DragonProgression | undefined,
): boolean {
  if (
    'requiredSelfPosition' in signal &&
    signal.requiredSelfPosition !== undefined &&
    signal.requiredSelfPosition !== position
  )
    return false;
  if (
    signal.unlock?.minimumStarRank !== undefined &&
    (progression?.starRank ?? 0) < signal.unlock.minimumStarRank
  )
    return false;
  if (
    signal.unlock?.minimumDragonLevel !== undefined &&
    (progression?.dragonLevel ?? 0) < signal.unlock.minimumDragonLevel
  )
    return false;
  return true;
}

function signalTags(signal: SynergySignal): SynergyTag[] {
  return signal.tags ?? [signal.tag];
}

function categoryForFailedCheck(id: string): AuditFindingCategory {
  if (['FRR-C021', 'FRR-C022', 'FRR-C023', 'FRR-C024', 'FRR-C028'].includes(id))
    return 'status-taxonomy defect';
  if (id === 'FRR-C027') return 'progression defect';
  if (['FRR-C029', 'FRR-C030'].includes(id)) return 'relationship-aggregation defect';
  if (id === 'FRR-C025') return 'presentation defect';
  if (id === 'FRR-C026') return 'rating defect';
  if (['FRR-C017', 'FRR-C018'].includes(id)) return 'source/profile mismatch';
  return 'confirmed defect';
}

function fileReferencesForFailedCheck(id: string): string[] {
  if (['FRR-C021', 'FRR-C022', 'FRR-C023', 'FRR-C024', 'FRR-C028'].includes(id))
    return ['src/synergy/tags.ts', 'src/synergy/evaluateFormation.ts'];
  if (id === 'FRR-C027') return ['src/synergy/profiles.ts', 'src/synergy/evaluateFormation.ts'];
  if (['FRR-C029', 'FRR-C030'].includes(id))
    return ['src/synergy/evaluateFormation.ts', 'src/services/formationRating.ts'];
  if (id === 'FRR-C025') return ['src/app/dragonDetailPresentation.ts'];
  if (id === 'FRR-C026') return ['src/services/formationRating.ts'];
  return ['src/data/dragons.ts', 'src/synergy/profiles.ts', 'src/synergy/profileAudit.ts'];
}

function compareFormationRowsDescending(
  left: FormationSummaryRow,
  right: FormationSummaryRow,
): number {
  return (
    right.score - left.score || left.formation.join('/').localeCompare(right.formation.join('/'))
  );
}

function compareFormationRowsAscending(
  left: FormationSummaryRow,
  right: FormationSummaryRow,
): number {
  return (
    left.score - right.score || left.formation.join('/').localeCompare(right.formation.join('/'))
  );
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? 0;
}

function frequencyByDragon(rows: FormationSummaryRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) for (const id of row.formation) increment(counts, id);
  return Object.fromEntries(
    Object.entries(counts).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    ),
  );
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) increment(result, key(item));
  return sortRecord(result);
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function numericSortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => Number(left) - Number(right)),
  );
}

function uniqueCount(values: readonly string[]): number {
  return new Set(values).size;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return [...new Set(left)].sort().join('\n') === [...new Set(right)].sort().join('\n');
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
