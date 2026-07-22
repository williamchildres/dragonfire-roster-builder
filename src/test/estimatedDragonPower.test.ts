import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import {
  DRAGON_POWER_OBSERVATIONS,
  deduplicateDragonPowerObservations,
  hashDragonPowerObservations,
} from '../power/dragonPowerObservations';
import { estimateDragonPower } from '../power/estimatedDragonPower';
import { estimateFormationPower } from '../power/estimatedFormationPower';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { compareFormationPlacements } from '../services/formationPlacementComparison';
import { rateFormation } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { buildSemanticRelationships } from '../synergy/semanticRelationships';

describe('Estimated Dragon Power v1', () => {
  it('preserves every supplied observation and exact tuples are observed', () => {
    for (const observation of DRAGON_POWER_OBSERVATIONS) {
      expect(estimateDragonPower(observation)).toMatchObject({
        power: observation.displayedPower,
        confidence: 'observed',
        basis: 'exact-observation',
      });
    }
  });

  it('deduplicates fitting tuples without losing provenance or sample counts', () => {
    const unique = deduplicateDragonPowerObservations();
    const epicFourAt35 = unique.find((observation) =>
      observation.rarity === 'Epic'
      && observation.starRank === 4
      && observation.dragonLevel === 35,
    );
    expect(DRAGON_POWER_OBSERVATIONS).toHaveLength(31);
    expect(unique).toHaveLength(25);
    expect(epicFourAt35).toMatchObject({ displayedPower: 22580, sampleCount: 3 });
    expect(epicFourAt35?.provenance).toEqual(['Rhysarion', 'Tashix', 'Velar']);
  });

  it('rejects conflicting displayed values for the same progression combination', () => {
    expect(() => deduplicateDragonPowerObservations([
      { rarity: 'Epic', starRank: 2, dragonLevel: 31, displayedPower: 16540, provenance: 'A' },
      { rarity: 'Epic', starRank: 2, dragonLevel: 31, displayedPower: 16550, provenance: 'B' },
    ])).toThrow(/conflicting estimated power observations/i);
  });

  it('returns positive integer modeled values rounded to the nearest 10', () => {
    for (const rarity of ['Legendary', 'Epic', 'Rare'] as const) {
      const estimate = estimateDragonPower({ rarity, starRank: 5, dragonLevel: 33 });
      expect(estimate.confidence).toBe('modeled');
      expect(estimate.power).toBeGreaterThan(0);
      expect(Number.isInteger(estimate.power)).toBe(true);
      expect(estimate.power % 10).toBe(0);
    }
  });

  it('is monotone by Star Rank and Dragon Level on the supported audited grid', () => {
    for (const rarity of ['Legendary', 'Epic', 'Rare'] as const) {
      for (let starRank = 1; starRank <= 10; starRank += 1) {
        let previous = 0;
        for (let dragonLevel = 0; dragonLevel <= 100; dragonLevel += 1) {
          const current = estimateDragonPower({ rarity, starRank, dragonLevel }).power;
          expect(current).toBeGreaterThanOrEqual(previous);
          expect(Number.isFinite(current)).toBe(true);
          previous = current;
        }
      }
      for (let dragonLevel = 0; dragonLevel <= 100; dragonLevel += 1) {
        let previous = 0;
        for (let starRank = 1; starRank <= 10; starRank += 1) {
          const current = estimateDragonPower({ rarity, starRank, dragonLevel }).power;
          expect(current).toBeGreaterThanOrEqual(previous);
          previous = current;
        }
      }
    }
  });

  it('preserves Legendary >= Epic >= Rare throughout the supported audited grid', () => {
    for (let starRank = 1; starRank <= 10; starRank += 1) {
      for (let dragonLevel = 0; dragonLevel <= 100; dragonLevel += 1) {
        const legendary = estimateDragonPower({ rarity: 'Legendary', starRank, dragonLevel }).power;
        const epic = estimateDragonPower({ rarity: 'Epic', starRank, dragonLevel }).power;
        const rare = estimateDragonPower({ rarity: 'Rare', starRank, dragonLevel }).power;
        expect(legendary).toBeGreaterThanOrEqual(epic);
        expect(epic).toBeGreaterThanOrEqual(rare);
      }
    }
  });

  it('does not accept invalid progression or fabricate an estimate', () => {
    expect(() => estimateDragonPower({ rarity: 'Rare', starRank: 0, dragonLevel: 20 })).toThrow(RangeError);
    expect(() => estimateDragonPower({ rarity: 'Rare', starRank: 11, dragonLevel: 20 })).toThrow(RangeError);
    expect(() => estimateDragonPower({ rarity: 'Rare', starRank: 4, dragonLevel: -1 })).toThrow(RangeError);
    expect(() => estimateDragonPower({ rarity: 'Rare', starRank: 4, dragonLevel: 20.5 })).toThrow(RangeError);
  });

  it('uses only rarity, Star Rank, and Dragon Level', () => {
    const withUnrelatedFields = {
      rarity: 'Epic' as const,
      starRank: 5,
      dragonLevel: 34,
      dragonId: 'not-a-canonical-dragon',
      habitLevels: { anything: 5 },
      notes: 'Ignored',
    };
    expect(estimateDragonPower(withUnrelatedFields)).toEqual(estimateDragonPower({
      rarity: 'Epic',
      starRank: 5,
      dragonLevel: 34,
    }));
  });

  it('keeps observation-only provenance out of the canonical dragon database', () => {
    const canonicalNames = new Set(dragons.map((dragon) => dragon.name));
    expect(canonicalNames.has('Sunfyre')).toBe(false);
    expect(canonicalNames.has('Tairax')).toBe(false);
    expect(dragons).toHaveLength(31);
  });

  it('keeps observation and model identities deterministic and order independent', () => {
    expect(hashDragonPowerObservations()).toBe(ESTIMATED_POWER_OBSERVATION_HASH);
    expect(hashDragonPowerObservations([...DRAGON_POWER_OBSERVATIONS].reverse()))
      .toBe(ESTIMATED_POWER_OBSERVATION_HASH);
    const changed = DRAGON_POWER_OBSERVATIONS.map((observation, index) =>
      index === 0 ? { ...observation, displayedPower: observation.displayedPower + 10 } : observation,
    );
    expect(hashDragonPowerObservations(changed)).not.toBe(ESTIMATED_POWER_OBSERVATION_HASH);
    expect(ESTIMATED_POWER_MODEL_VERSION).toBe('estimated-power-v1');
    expect(ESTIMATED_POWER_MODEL_HASH).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
  });

  it('classifies out-of-envelope estimates as low-confidence extrapolation', () => {
    expect(estimateDragonPower({ rarity: 'Legendary', starRank: 8, dragonLevel: 30 }))
      .toMatchObject({ confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Rare', starRank: 4, dragonLevel: 19 }))
      .toMatchObject({ confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 3, dragonLevel: 34 }))
      .toMatchObject({ confidence: 'modeled', basis: 'interpolation' });
  });

  it('sums exactly three individual estimates and leaves Formation Rating unchanged', () => {
    const formation = { 'left-flank': 'syrax', vanguard: 'vhagar', 'right-flank': 'caraxes' } as const;
    const progression = {
      syrax: { starRank: 1, dragonLevel: 36 },
      vhagar: { starRank: 4, dragonLevel: 36 },
      caraxes: { starRank: 2, dragonLevel: 36 },
    };
    const evaluated = evaluateFormation({ formation, progression, profiles: simpleSynergyProfiles });
    const relationships = buildSemanticRelationships(evaluated.results, simpleSynergyProfiles);
    const placementComparison = compareFormationPlacements({ formation, progression, profiles: simpleSynergyProfiles });
    const ratingBefore = rateFormation({ formation, dragons, profiles: simpleSynergyProfiles, relationships, placementComparison });
    const power = estimateFormationPower({ formation, dragons, progression });
    const ratingAfter = rateFormation({ formation, dragons, profiles: simpleSynergyProfiles, relationships, placementComparison });
    expect(power?.totalPower).toBe(22400 + 31040 + 24620);
    expect(power).toMatchObject({ confidence: 'observed', observedCount: 3, modeledCount: 0, lowConfidenceCount: 0 });
    expect(ratingAfter).toEqual(ratingBefore);
  });
});
