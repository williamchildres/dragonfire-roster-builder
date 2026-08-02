import { dragons } from '../data/dragons';
import { TROOP_TYPES, type AffinityLevel, type TroopType } from '../models/dragon';
import { allFormationPermutations } from '../services/formationArrangement';
import {
  recommendTroopAffinity,
  troopAffinityTroopClassification,
  TROOP_AFFINITY_RECOMMENDATION_VERSION,
  type FormationTroopAffinityRecommendation,
  type TroopAffinityDragon,
} from '../services/troopAffinityRecommendation';

const canonicalAffinityRecords = [...dragons]
  .sort((left, right) => left.id.localeCompare(right.id, 'en'))
  .map((dragon) => ({
    dragonId: dragon.id,
    affinities: TROOP_TYPES.map((troopType) => [troopType, dragon.affinities[troopType]]),
  }));

const realFixtures = [
  fixture('real-full-positive', ['syrax', 'crimson', 'antares']),
  fixture('real-partial', ['seasmoke', 'antares', 'velar']),
  fixture('real-tie', ['caraxes', 'syrax', 'seasmoke']),
  fixture('real-siege-tie', ['vhagar', 'kalspire', 'tairax']),
];
const syntheticFixtures = [
  {
    name: 'verified-negative-tradeoff',
    dragons: [
      synthetic('negative-a', {}, 'negative'),
      synthetic('negative-b', { Cavalry: 'positive' }, 'neutral'),
      synthetic('negative-c', { Cavalry: 'positive' }, 'neutral'),
    ],
  },
  {
    name: 'unknown-incomplete',
    dragons: [
      synthetic('unknown-a', { Cavalry: 'positive' }, 'negative'),
      synthetic('unknown-b', { Cavalry: 'positive' }, 'negative'),
      synthetic('unknown-c', { Cavalry: 'unknown' }, 'negative'),
    ],
  },
];

const fixtureOutputs = [...realFixtures, ...syntheticFixtures].map((item) => ({
  name: item.name,
  dragonIds: item.dragons.map((dragon) => dragon.id).sort(),
  output: recommendTroopAffinity(item.dragons),
}));

export const TROOP_AFFINITY_RECOMMENDATION_CONTRACT_DESCRIPTOR = JSON.stringify({
  version: TROOP_AFFINITY_RECOMMENDATION_VERSION,
  canonicalTroopOrder: TROOP_TYPES,
  affinityLevels: ['positive', 'neutral', 'negative', 'unknown'],
  candidateClassification: ['positiveDragonIds', 'neutralDragonIds', 'negativeDragonIds', 'unknownDragonIds'],
  rankingHierarchy: [
    'full-positive:positive=3,negative=0,unknown=0',
    'best-nonnegative-coverage:negative=0,unknown=0,maximize-positive',
    'incomplete:negative=0,maximize-positive,minimize-unknown',
    'least-negative-tradeoff:minimize-negative,maximize-positive,minimize-unknown',
  ],
  tieBehavior: 'retain-all-in-canonical-troop-order',
  dragonInput: 'exactly-three-unique-canonical-identities-position-invariant',
  siegeClassification: troopAffinityTroopClassification('Siege'),
  emitsEstimatedPowerAdjustment: false,
  emitsFormationRatingAdjustment: false,
  canonicalAffinityRecords,
  fixtureOutputs,
});

export const TROOP_AFFINITY_RECOMMENDATION_AUDIT_IDENTITY = fnv1a64(
  TROOP_AFFINITY_RECOMMENDATION_CONTRACT_DESCRIPTOR,
);
export const EXPECTED_TROOP_AFFINITY_RECOMMENDATION_AUDIT_IDENTITY =
  'fnv1a64:141946fee6c0585f' as const;

export interface TroopAffinityAuditReport {
  version: typeof TROOP_AFFINITY_RECOMMENDATION_VERSION;
  identity: string;
  canonicalTroopOrder: readonly TroopType[];
  dragonCount: number;
  formationFixtures: number;
  fullPositiveFixtures: number;
  partialFixtures: number;
  tieFixtures: number;
  negativeTradeoffFixtures: number;
  unknownDataFixtures: number;
  siegeFixtures: number;
  positionInvarianceChecks: number;
  fixtures: Array<{
    name: string;
    dragonIds: string[];
    kind: FormationTroopAffinityRecommendation['kind'];
    recommendedTroopTypes: TroopType[];
    positiveCoverage: number;
  }>;
  failures: string[];
}

export function runTroopAffinityRecommendationAudit(): TroopAffinityAuditReport {
  const failures: string[] = [];
  for (const dragon of dragons) {
    const keys = Object.keys(dragon.affinities);
    if (keys.length !== TROOP_TYPES.length || TROOP_TYPES.some((troopType) => !(troopType in dragon.affinities))) {
      failures.push(`${dragon.id}: canonical affinity record does not contain all five troop types.`);
    }
  }
  const reports = fixtureOutputs.map((item) => {
    if (!item.output) throw new Error(`${item.name}: audit fixture did not produce a recommendation.`);
    const recommended = item.output.candidates.filter((candidate) => item.output!.recommendedTroopTypes.includes(candidate.troopType));
    return {
      name: item.name,
      dragonIds: item.dragonIds,
      kind: item.output.kind,
      recommendedTroopTypes: item.output.recommendedTroopTypes,
      positiveCoverage: Math.max(...recommended.map((candidate) => candidate.positiveCount)),
    };
  });
  assertFixture(reports, 'real-full-positive', 'full-positive', ['Archers'], failures);
  assertFixture(reports, 'real-partial', 'best-nonnegative-coverage', ['Archers'], failures);
  assertFixture(reports, 'real-tie', 'best-nonnegative-coverage', ['Cavalry', 'Archers', 'Spearmen'], failures);
  assertFixture(reports, 'verified-negative-tradeoff', 'least-negative-tradeoff', ['Cavalry'], failures);
  assertFixture(reports, 'unknown-incomplete', 'incomplete', ['Cavalry'], failures);
  const siege = reports.find((item) => item.name === 'real-siege-tie');
  if (!siege?.recommendedTroopTypes.includes('Siege') || troopAffinityTroopClassification('Siege') !== 'objective-specific-siege') {
    failures.push('Siege objective-specific fixture failed.');
  }

  const invariantFixture = realFixtures.find((item) => item.name === 'real-tie')!;
  const byId = new Map(invariantFixture.dragons.map((dragon) => [dragon.id, dragon]));
  const invariantExpected = JSON.stringify(recommendTroopAffinity(invariantFixture.dragons));
  let positionInvarianceChecks = 0;
  for (const arrangement of allFormationPermutations(invariantFixture.dragons.map((dragon) => dragon.id))) {
    positionInvarianceChecks += 1;
    const actual = JSON.stringify(recommendTroopAffinity([
      byId.get(arrangement['left-flank'])!,
      byId.get(arrangement.vanguard)!,
      byId.get(arrangement['right-flank'])!,
    ]));
    if (actual !== invariantExpected) failures.push(`Position invariance failed for ${JSON.stringify(arrangement)}.`);
  }

  return {
    version: TROOP_AFFINITY_RECOMMENDATION_VERSION,
    identity: TROOP_AFFINITY_RECOMMENDATION_AUDIT_IDENTITY,
    canonicalTroopOrder: TROOP_TYPES,
    dragonCount: dragons.length,
    formationFixtures: reports.length,
    fullPositiveFixtures: reports.filter((item) => item.kind === 'full-positive').length,
    partialFixtures: reports.filter((item) => item.kind === 'best-nonnegative-coverage').length,
    tieFixtures: reports.filter((item) => item.recommendedTroopTypes.length > 1).length,
    negativeTradeoffFixtures: reports.filter((item) => item.kind === 'least-negative-tradeoff').length,
    unknownDataFixtures: reports.filter((item) => item.kind === 'incomplete').length,
    siegeFixtures: reports.filter((item) => item.recommendedTroopTypes.includes('Siege')).length,
    positionInvarianceChecks,
    fixtures: reports,
    failures,
  };
}

function fixture(name: string, dragonIds: readonly string[]) {
  return {
    name,
    dragons: dragonIds.map((dragonId) => {
      const dragon = dragons.find((candidate) => candidate.id === dragonId);
      if (!dragon) throw new Error(`Missing canonical audit dragon: ${dragonId}`);
      return dragon;
    }),
  };
}

function synthetic(
  id: string,
  overrides: Partial<Record<TroopType, AffinityLevel>>,
  fallback: AffinityLevel,
): TroopAffinityDragon {
  return {
    id,
    affinities: Object.fromEntries(
      TROOP_TYPES.map((troopType) => [troopType, overrides[troopType] ?? fallback]),
    ) as Record<TroopType, AffinityLevel>,
  };
}

function assertFixture(
  reports: TroopAffinityAuditReport['fixtures'],
  name: string,
  kind: FormationTroopAffinityRecommendation['kind'],
  recommendedTroopTypes: TroopType[],
  failures: string[],
) {
  const report = reports.find((item) => item.name === name);
  if (report?.kind !== kind || JSON.stringify(report.recommendedTroopTypes) !== JSON.stringify(recommendedTroopTypes)) {
    failures.push(`${name}: expected ${kind} ${recommendedTroopTypes.join(', ')}.`);
  }
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
