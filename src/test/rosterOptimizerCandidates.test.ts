import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
  generateOptimizerFormationCandidates,
} from '../optimizer/rosterOptimizerCandidates';
import { buildPlacementComparison, compareFormationPlacements } from '../services/formationPlacementComparison';
import { rateFormation } from '../services/formationRating';
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

  it('reuses Formation Rating v2 exactly for the retained arrangement', () => {
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
    const initialComparison = compareFormationPlacements({
      formation: candidate.arrangement,
      progression,
      profiles: simpleSynergyProfiles,
    })!;
    const comparison = buildPlacementComparison(
      candidate.arrangement,
      initialComparison.candidates,
    )!;
    // Rebuild through the public candidate's canonical relationships. The score
    // and tier must be identical to Formation Builder's public rating service.
    const rating = rateFormation({
      formation: candidate.arrangement,
      dragons,
      profiles: simpleSynergyProfiles,
      relationships: candidate.relationships,
      placementComparison: comparison,
    });
    expect(progression).toEqual(candidate.progressionSnapshot);
    expect(rating.score).toBe(candidate.rating);
    expect(rating.tier).toBe(candidate.tier);
  });

  it('respects current Star Rank and Dragon Level relationship unlocks', () => {
    const lowSnapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 1, 0));
    const highSnapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 10, 16));
    const low = generateOptimizerFormationCandidates({ dragons, profiles: simpleSynergyProfiles, snapshot: lowSnapshot })[0]!;
    const high = generateOptimizerFormationCandidates({ dragons, profiles: simpleSynergyProfiles, snapshot: highSnapshot })[0]!;
    expect(high.activeRelationshipValue).toBeGreaterThanOrEqual(low.activeRelationshipValue);
    expect(high.rating).toBeGreaterThanOrEqual(low.rating);
    expect(createRosterOptimizerFingerprint(highSnapshot)).not.toBe(
      createRosterOptimizerFingerprint(lowSnapshot),
    );
  });

  it('excludes Habit Levels and notes from the ranking fingerprint', () => {
    const first = rosterFor(trioIds, 10, 16);
    const second = structuredClone(first);
    second.syrax!.notes = 'A private note';
    second.syrax!.habitLevels = { 'syrax-dragon-flame': 5 };
    const firstFingerprint = createRosterOptimizerFingerprint(
      buildOptimizerRosterSnapshot(dragons, first),
    );
    const secondFingerprint = createRosterOptimizerFingerprint(
      buildOptimizerRosterSnapshot(dragons, second),
    );
    expect(secondFingerprint).toBe(firstFingerprint);
  });

  it('includes strategy and contract metadata in the request fingerprint', () => {
    const snapshot = buildOptimizerRosterSnapshot(dragons, rosterFor(trioIds, 10, 16));
    expect(createRosterOptimizerRequestFingerprint(snapshot, 'primary-five-backup-five'))
      .not.toBe(createRosterOptimizerRequestFingerprint(snapshot, 'best-ten-overall'));
    expect(createRosterOptimizerRequestFingerprint([...snapshot].reverse(), 'best-ten-overall'))
      .toBe(createRosterOptimizerRequestFingerprint(snapshot, 'best-ten-overall'));
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
