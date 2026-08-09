import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { optimizeCurrentRoster } from '../optimizer/rosterOptimizer';
import {
  REAL_WORLD_ROSTER_V0221,
  realWorldRosterV0221,
} from '../audit/realWorldRosterV0221';

describe('optimizer v6 real-world acceptance fixture', () => {
  it('commits only the minimal deterministic progression fields', () => {
    expect(REAL_WORLD_ROSTER_V0221).toHaveLength(33);
    for (const entry of REAL_WORLD_ROSTER_V0221) {
      expect(Object.keys(entry).sort()).toEqual([
        'dragonId',
        'habitLevels',
        'owned',
        'reignLevel',
        'starRank',
      ]);
      expect(entry.owned).toBe(true);
    }
  });

  it('selects a distinct, higher-rating Best Overall allocation without duplicates', async () => {
    const roster = realWorldRosterV0221();
    const [bestOverall, highestRawPower] = await Promise.all([
      optimizeCurrentRoster(roster, 'best-overall-first', 11),
      optimizeCurrentRoster(roster, 'strongest-first', 11),
    ]);
    expect(bestOverall.optimal).toBe(true);
    expect(highestRawPower.optimal).toBe(true);
    if (!bestOverall.optimal || !highestRawPower.optimal) return;
    expect(bestOverall.objective.stableSolutionKey)
      .not.toBe(highestRawPower.objective.stableSolutionKey);
    expect(bestOverall.collection.totalRating)
      .toBeGreaterThan(highestRawPower.collection.totalRating);
    expect(bestOverall.collection.totalRating).toBe(422);
    expect(highestRawPower.collection.totalRating).toBe(366);
    expect(bestOverall.collection.totalEstimatedPower)
      .toBe(highestRawPower.collection.totalEstimatedPower);
    expect(new Set(bestOverall.usedDragonIds).size).toBe(33);
    expect(bestOverall.formations.every((formation) => formation.bestOverallScore)).toBe(true);
    expect(highestRawPower.formations.every(
      (formation) => formation.bestOverallScore === undefined,
    )).toBe(true);
  }, 30_000);

  it('records the complete three-mode comparison and Caraxes/Syrax diagnostic', () => {
    const report = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'docs/audits/roster-optimizer-v6-real-world-0.23.4.json',
    ), 'utf8')) as {
      fixtureDragonCount: number;
      candidatePoolBuilds: number;
      comparisons: Array<{
        mode: string;
        formations: Array<{ overallScore?: number }>;
        summary: { totalRating: number };
      }>;
      bestOverallDistinctFromHighestRawPower: boolean;
      bestOverallTotalRatingGain: number;
      caraxesSyrax: {
        earliestAvailableStep: number;
        thirdDragonId: string;
        formationRating: number;
        overallScoreUnits: number;
        activeRelationshipCount: number;
        unquantifiedRelationshipCount: number;
        selectedByBestOverall: boolean;
        scoreDifferenceUnits: number;
        activeRelationships: Array<{ label: string }>;
      };
    };
    expect(report.fixtureDragonCount).toBe(33);
    expect(report.candidatePoolBuilds).toBe(1);
    expect(report.comparisons.map((comparison) => comparison.mode)).toEqual([
      'best-overall-first',
      'strongest-first',
      'balanced',
    ]);
    expect(report.bestOverallDistinctFromHighestRawPower).toBe(true);
    expect(report.bestOverallTotalRatingGain).toBe(56);
    expect(report.comparisons[0]!.summary.totalRating).toBe(422);
    expect(report.comparisons[1]!.summary.totalRating).toBe(366);
    expect(report.comparisons[0]!.formations.every(
      (formation) => typeof formation.overallScore === 'number',
    )).toBe(true);
    expect(report.comparisons.slice(1).every((comparison) =>
      comparison.formations.every((formation) => formation.overallScore === undefined),
    )).toBe(true);
    expect(report.caraxesSyrax).toMatchObject({
      earliestAvailableStep: 1,
      thirdDragonId: 'vhagar',
      formationRating: 34,
      overallScoreUnits: 671_860,
      activeRelationshipCount: 3,
      unquantifiedRelationshipCount: 0,
      selectedByBestOverall: false,
      scoreDifferenceUnits: 107_160,
    });
    expect(report.caraxesSyrax.activeRelationships.some(({ label }) =>
      label.includes('First-Strike'),
    )).toBe(true);
    expect(report.caraxesSyrax.activeRelationships.some(({ label }) =>
      label.includes('Fire Damage'),
    )).toBe(true);
  });
});
