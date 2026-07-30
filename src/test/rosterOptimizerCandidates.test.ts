import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
  generateOptimizerFormationCandidates,
} from '../optimizer/rosterOptimizerCandidates';
import { rateFormationV3 } from '../services/formationRatingV3';
import { createEmptyRoster } from '../services/rosterStorage';
import { simpleSynergyProfiles } from '../synergy/profiles';

const trioIds = ['syrax', 'vhagar', 'caraxes'];

describe('optimizer candidate generation and roster progression', () => {
  it('generates all 5,456 unordered candidates for the canonical 33-dragon roster', () => {
    const roster = rosterFor(dragons.map((dragon) => dragon.id), 10, 16);
    const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
    const candidates = generateOptimizerFormationCandidates({
      dragons,
      profiles: simpleSynergyProfiles,
      snapshot,
    });
    expect(snapshot).toHaveLength(33);
    expect(candidates).toHaveLength(5456);
  });

  it('uses only eligible My Roster dragons and produces one unordered trio candidate', () => {
    const roster = rosterFor(trioIds, 10, 16);
    const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
    const candidates = generateOptimizerFormationCandidates({
      dragons,
      profiles: simpleSynergyProfiles,
      snapshot,
    });
    expect(snapshot.map((entry) => entry.dragonId).sort()).toEqual([...trioIds].sort());
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.dragonIds).toEqual([...trioIds].sort());
  });

  it('retains the deterministic best of all six arrangements and preserves tied best placements', () => {
    const snapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 10, 16));
    const candidate = generateOptimizerFormationCandidates({
      dragons,
      profiles: simpleSynergyProfiles,
      snapshot,
    })[0]!;
    expect(candidate.tiedBestArrangements.length).toBeGreaterThan(0);
    expect(candidate.placementScore).toBe(20);
    expect(candidate.tiedBestArrangements).toContainEqual(candidate.arrangement);
    expect(new Set(candidate.dragonIds).size).toBe(3);
  });

  it('reuses Formation Rating v3 exactly for the retained arrangement', () => {
    const snapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 10, 16));
    const candidate = generateOptimizerFormationCandidates({
      dragons,
      profiles: simpleSynergyProfiles,
      snapshot,
    })[0]!;
    const progression = Object.fromEntries(
      snapshot.map((entry) => [entry.dragonId, {
        starRank: entry.starRank,
        dragonLevel: entry.dragonLevel,
      }]),
    );
    const reliabilityProgression = Object.fromEntries(
      snapshot.map((entry) => [entry.dragonId, {
        starRank: entry.starRank,
        dragonLevel: entry.dragonLevel,
        activeHabitLevels: entry.activeHabitLevels ?? {},
      }]),
    );
    const rating = rateFormationV3({
      formation: candidate.arrangement,
      dragons,
      profiles: simpleSynergyProfiles,
      progression,
      reliabilityProgression,
    });
    expect(candidate.ratingContract).toBe('formation-rating-v3');
    expect(candidate.progressionSnapshot).toEqual(reliabilityProgression);
    expect(rating.score).toBe(candidate.rating);
    expect(rating.tier).toBe(candidate.tier);
    expect(rating.adjustedUncappedRelationshipValue)
      .toBe(candidate.adjustedRelationshipValue);
  }, 60_000);

  it('respects current Star Rank and Dragon Level relationship unlocks', () => {
    const lowSnapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 1, 0));
    const highSnapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 10, 16));
    const low = generateOptimizerFormationCandidates({ dragons, profiles: simpleSynergyProfiles, snapshot: lowSnapshot })[0]!;
    const high = generateOptimizerFormationCandidates({ dragons, profiles: simpleSynergyProfiles, snapshot: highSnapshot })[0]!;
    expect(high.adjustedRelationshipValue).toBeGreaterThanOrEqual(low.adjustedRelationshipValue);
    expect(high.rating).toBeGreaterThanOrEqual(low.rating);
    expect(createRosterOptimizerFingerprint(highSnapshot)).not.toBe(
      createRosterOptimizerFingerprint(lowSnapshot),
    );
  });

  it('includes Habit Levels but excludes notes from the ranking fingerprint', () => {
    const first = rosterFor(trioIds, 10, 16);
    const second = structuredClone(first);
    second.syrax!.notes = 'A private note';
    second.syrax!.habitLevels = { 'syrax-strategic-revival': 5 };
    const firstFingerprint = createRosterOptimizerFingerprint(
      buildOptimizerRosterSnapshot(dragons, first),
    );
    const secondFingerprint = createRosterOptimizerFingerprint(
      buildOptimizerRosterSnapshot(dragons, second),
    );
    expect(secondFingerprint).not.toBe(firstFingerprint);
    second.syrax!.habitLevels = {};
    expect(createRosterOptimizerFingerprint(
      buildOptimizerRosterSnapshot(dragons, second),
    )).toBe(firstFingerprint);
  });

  it('distinguishes an active missing Habit level from an explicit level', () => {
    const missing = rosterFor(trioIds, 6, 16);
    const levelOne = structuredClone(missing);
    levelOne.syrax!.habitLevels = { 'syrax-strategic-revival': 1 };
    const missingSnapshot = buildOptimizerRosterSnapshot(dragons, missing);
    expect(
      missingSnapshot.find((entry) => entry.dragonId === 'syrax')
        ?.activeHabitLevels?.['syrax-strategic-revival'],
    ).toBeNull();
    expect(createRosterOptimizerFingerprint(missingSnapshot)).not.toBe(
      createRosterOptimizerFingerprint(
        buildOptimizerRosterSnapshot(dragons, levelOne),
      ),
    );
  });

  it('includes v6 mode, count, model, and Best Overall profile in the request fingerprint', () => {
    const snapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 10, 16));
    const baseline = createRosterOptimizerRequestFingerprint(
      snapshot,
      'best-overall-first',
      1,
    );
    expect(createRosterOptimizerRequestFingerprint(
      [...snapshot].reverse(),
      'best-overall-first',
      1,
    )).toBe(baseline);
    expect(createRosterOptimizerRequestFingerprint(snapshot, 'strongest-first', 1))
      .not.toBe(baseline);
    expect(createRosterOptimizerRequestFingerprint(snapshot, 'best-overall-first', 2))
      .not.toBe(baseline);
    expect(createRosterOptimizerRequestFingerprint(
      snapshot,
      'best-overall-first',
      1,
      { version: 'test', modelHash: 'model', observationHash: 'observations' },
    )).not.toBe(baseline);
    expect(createRosterOptimizerRequestFingerprint(
      snapshot,
      'best-overall-first',
      1,
      undefined,
      {
        version: 'best-overall-v2',
        powerWeight: 50,
        formationRatingWeight: 50,
        normalizationScale: 1_000,
      },
    )).not.toBe(baseline);
  });
});

function rosterFor(dragonIds: string[], starRank: number, dragonLevel: number) {
  const roster = createEmptyRoster(dragons);
  dragonIds.forEach((dragonId) => {
    roster[dragonId] = {
      ...roster[dragonId]!,
      owned: true,
      starRank,
      reignLevel: dragonLevel,
    };
  });
  return roster;
}
