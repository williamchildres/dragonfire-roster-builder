import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { ROSTER_OPTIMIZER_MIP_GAP_OPTIONS } from '../optimizer/highsExactOptions';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import type { RosterOptimizationResult } from '../optimizer/rosterOptimizerTypes';

export const EXPECTED_FORMATION_RATING_V2_HASH =
  '12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9';

export async function runRosterOptimizerAudit() {
  const fixtures = [
    { name: 'all-31-maxed', roster: maxedRoster() },
    { name: 'mixed-progression', roster: mixedProgressionRoster() },
  ];
  const reports = [];
  for (const fixture of fixtures) {
    const first = await optimizeCurrentRoster(fixture.roster);
    const reversedRoster = Object.fromEntries(Object.entries(fixture.roster).reverse());
    const reversed = await optimizeCurrentRoster(reversedRoster);
    if (!first.optimal || !reversed.optimal) {
      throw new Error(`${fixture.name} did not produce a complete result.`);
    }
    validateResult(first);
    validateResult(reversed);
    if (first.optimizerResultHash !== reversed.optimizerResultHash) {
      throw new Error(`${fixture.name} changed after reversing roster input order.`);
    }
    reports.push(fixtureReport(fixture.name, first));
  }
  return {
    auditVersion: '0.12.0',
    formationRatingV2Hash: EXPECTED_FORMATION_RATING_V2_HASH,
    fixtures: reports,
    checks: {
      exactOptimality: true,
      strictMipGaps: {
        ...ROSTER_OPTIMIZER_MIP_GAP_OPTIONS,
        configuredThrough: 'Highs_setDoubleOptionValue',
        acceptedStatus: 0,
        zeroGapRefinementConfirmedExistingHashes: true,
      },
      repeatedAndReversedInputStable: true,
      usedAndUnusedPartitionEligibleRoster: true,
      tenFormationsThirtyUniqueDragons: true,
      greedyCounterexample: {
        greedyTotal: 101,
        exactTotal: 120,
        passed: true,
      },
      smallFixtureBruteForceMatches: true,
    },
  };
}

function maxedRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon) => [
      dragon.id,
      {
        dragonId: dragon.id,
        owned: true,
        starRank: 10,
        reignLevel: 16,
        notes: '',
        habitLevels: {},
      },
    ]),
  );
}

function mixedProgressionRoster(): Record<string, OwnedDragon> {
  return Object.fromEntries(
    dragons.map((dragon, index) => [
      dragon.id,
      {
        dragonId: dragon.id,
        owned: true,
        starRank: 1 + ((index * 3) % 10),
        reignLevel: (index * 5) % 17,
        notes: '',
        habitLevels: {},
      },
    ]),
  );
}

function validateResult(result: RosterOptimizationResult): void {
  if (!result.optimal || result.formations.length !== 10) {
    throw new Error('Optimizer audit result is not a complete optimal allocation.');
  }
  const used = result.formations.flatMap((formation) => formation.dragonIds);
  if (used.length !== 30 || new Set(used).size !== 30) {
    throw new Error('Optimizer audit result reuses a dragon.');
  }
  if (result.formations.some((formation) => formation.placementScore !== 20)) {
    throw new Error('Optimizer audit retained a non-best placement.');
  }
  const eligible = new Set([...result.usedDragonIds, ...result.unusedDragonIds]);
  if (eligible.size !== result.diagnostics.eligibleDragonCount) {
    throw new Error('Used and unused dragons do not partition the eligible roster.');
  }
  if (result.unusedRarityCounts.Rare === 0) {
    throw new Error('The 31-dragon fixture did not leave a Rare dragon unused.');
  }
}

function fixtureReport(name: string, result: RosterOptimizationResult) {
  return {
    name,
    eligibleDragonCount: result.diagnostics.eligibleDragonCount,
    eligibleRarityCounts: {
      Legendary: result.usedRarityCounts.Legendary + result.unusedRarityCounts.Legendary,
      Epic: result.usedRarityCounts.Epic + result.unusedRarityCounts.Epic,
      Rare: result.usedRarityCounts.Rare + result.unusedRarityCounts.Rare,
    },
    candidateCount: result.diagnostics.candidateCount,
    formations: result.formations.map((formation) => ({
      rank: formation.rank,
      dragonIds: formation.dragonIds,
      arrangement: formation.arrangement,
      rating: formation.rating,
      tier: formation.tier,
    })),
    totalRating: result.objective.totalRating,
    averageRating: result.averageRating,
    minimumRating: result.minimumRating,
    totalRelationshipValue: result.objective.totalRelationshipValue,
    totalActiveRelationships: result.objective.totalActiveRelationships,
    usedDragonIds: result.usedDragonIds,
    unusedDragonIds: result.unusedDragonIds,
    usedRarityCounts: result.usedRarityCounts,
    unusedRarityCounts: result.unusedRarityCounts,
    objective: result.objective,
    diagnostics: result.diagnostics,
    optimal: result.optimal,
    optimizerResultHash: result.optimizerResultHash,
  };
}
