import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import {
  optimizerRelationshipValueUnits,
} from '../optimizer/rosterOptimizerCandidates';
import {
  OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  ROSTER_OPTIMIZER_RATING_CONTRACT,
} from '../optimizer/rosterOptimizerTypes';
import { reliabilityProgressionForFormation } from '../services/formationReliabilityProgression';
import { FORMATION_RATING_V3_TIER_THRESHOLDS } from '../services/formationRatingTierV3';
import { createEmptyRoster } from '../services/rosterStorage';

describe('Formation Rating v3 production adoption', () => {
  it('keeps production Builder and optimizer imports on v3', () => {
    const app = readFileSync('src/app/App.tsx', 'utf8');
    const candidates = readFileSync('src/optimizer/rosterOptimizerCandidates.ts', 'utf8');
    expect(app).toContain("from '../services/formationRatingV3'");
    expect(app).toContain("from '../services/formationPlacementComparisonV3'");
    expect(app).not.toMatch(/from '..\/services\/formationRating'/);
    expect(app).not.toMatch(/from '..\/services\/formationPlacementComparison'/);
    expect(candidates).toContain("from '../services/formationRatingV3'");
    expect(candidates).toContain("from '../services/formationPlacementComparisonV3'");
    expect(candidates).not.toMatch(/from '..\/services\/formationRating'/);
    expect(candidates).not.toMatch(/from '..\/services\/formationPlacementComparison'/);
  });

  it('uses separate strict v3 thresholds and optimizer contract 4', () => {
    expect(FORMATION_RATING_V3_TIER_THRESHOLDS).toEqual({
      Excellent: 66,
      Strong: 53,
      Solid: 34,
      Developing: 5,
    });
    expect(ROSTER_OPTIMIZER_CONTRACT_VERSION).toBe(4);
    expect(ROSTER_OPTIMIZER_RATING_CONTRACT).toBe('formation-rating-v3');
  });

  it('preserves actual Habit levels and represents an unlocked missing level as null', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax = {
      ...roster.syrax!,
      owned: true,
      starRank: 6,
      reignLevel: 16,
      habitLevels: { 'syrax-strategic-revival': 3 },
    };
    const formation = {
      'left-flank': 'syrax',
      vanguard: null,
      'right-flank': null,
    } as const;
    const actual = reliabilityProgressionForFormation({
      formation,
      dragons,
      roster,
      simpleProgression: { syrax: { starRank: 6, dragonLevel: 16 } },
    });
    expect(actual.syrax?.activeHabitLevels['syrax-strategic-revival']).toBe(3);
    expect(actual.syrax?.activeHabitLevels['syrax-mindful-synergy']).toBeNull();
  });

  it('uses explicit Habit Level 5 only for unlocked planning-mode Habits', () => {
    const formation = {
      'left-flank': 'syrax',
      vanguard: null,
      'right-flank': null,
    } as const;
    const planned = reliabilityProgressionForFormation({
      formation,
      dragons,
      roster: {},
      simpleProgression: { syrax: { starRank: 6, dragonLevel: 16 } },
      planningHabitLevel: 5,
    });
    expect(planned.syrax?.activeHabitLevels).toMatchObject({
      'syrax-mindful-synergy': 5,
      'syrax-flight-mastery': 5,
      'syrax-strategic-revival': 5,
    });
    expect(planned.syrax?.activeHabitLevels).not.toHaveProperty('syrax-tactical-inferno');
  });

  it('converts fractional objectives once at the audited safe scale', () => {
    expect(OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE).toBe(1_000_000);
    expect(optimizerRelationshipValueUnits(12.345678)).toBe(12_345_678);
    expect(() => optimizerRelationshipValueUnits(-1)).toThrow(/nonnegative/i);
    expect(() => optimizerRelationshipValueUnits(Number.NaN)).toThrow(/finite/i);
    expect(() => optimizerRelationshipValueUnits(Number.MAX_SAFE_INTEGER)).toThrow(
      /safe-integer/i,
    );
  });
});
