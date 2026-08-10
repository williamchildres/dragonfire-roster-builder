import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import {
  DRAGON_POWER_OBSERVATIONS,
  buildDragonPowerSupportGraphs,
  deduplicateDragonPowerObservations,
  deriveEstimatedPowerObservedEnvelopes,
  hashDragonPowerObservations,
} from '../power/dragonPowerObservations';
import { hashEstimatedPowerModel } from '../power/estimatedDragonPowerModelIdentity';
import {
  ESTIMATED_POWER_OBSERVED_ENVELOPES,
  estimateDragonPower,
} from '../power/estimatedDragonPower';
import { estimateFormationPower } from '../power/estimatedFormationPower';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { compareFormationPlacements } from '../services/formationPlacementComparison';
import { rateFormation } from '../services/formationRating';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { buildSemanticRelationships } from '../synergy/semanticRelationships';

describe('Estimated Dragon Power v2', () => {
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
    const expectedDuplicates = [
      ['Legendary', 1, 37, 23400, 4, ['Malachite', 'Seasmoke', 'Syrax', 'Venator']],
      ['Legendary', 2, 37, 25620, 2, ['Caraxes', 'Sheepstealer']],
      ['Epic', 4, 37, 23580, 3, ['Rhysarion', 'Tashix', 'Velar']],
      ['Epic', 2, 32, 16540, 2, ['Feskar', 'Vermax']],
      ['Epic', 2, 31, 16540, 3, ['Feskar', 'Vermax', 'Zivern']],
      ['Rare', 4, 30, 13400, 3, ['Antares', 'Arulix', 'Thunderstrike']],
      ['Rare', 4, 29, 13000, 2, ['Arulix', 'Dawnseeker']],
    ] as const;
    expect(DRAGON_POWER_OBSERVATIONS).toHaveLength(59);
    expect(unique).toHaveLength(42);
    for (const [rarity, starRank, dragonLevel, displayedPower, sampleCount, provenance] of expectedDuplicates) {
      expect(unique.find((observation) =>
        observation.rarity === rarity
        && observation.starRank === starRank
        && observation.dragonLevel === dragonLevel,
      )).toMatchObject({ displayedPower, sampleCount, provenance });
    }
    expect(DRAGON_POWER_OBSERVATIONS.some((row) => row.provenance === 'Sunfyre')).toBe(true);
    expect(DRAGON_POWER_OBSERVATIONS.some((row) => row.provenance === 'Sunnfyre')).toBe(false);
    expect(DRAGON_POWER_OBSERVATIONS.some((row) =>
      row.provenance === 'Dawnseeker' && row.starRank === 4 && row.dragonLevel === 30 && row.displayedPower === 13000,
    )).toBe(false);
  });

  it('derives deterministic rarity-specific observed envelopes from unique observations', () => {
    expect(ESTIMATED_POWER_OBSERVED_ENVELOPES).toEqual({
      Legendary: { starRank: { minimum: 1, maximum: 4 }, dragonLevel: { minimum: 20, maximum: 38 } },
      Epic: { starRank: { minimum: 1, maximum: 6 }, dragonLevel: { minimum: 20, maximum: 38 } },
      Rare: { starRank: { minimum: 3, maximum: 7 }, dragonLevel: { minimum: 20, maximum: 31 } },
    });
    expect(deriveEstimatedPowerObservedEnvelopes([...DRAGON_POWER_OBSERVATIONS].reverse()))
      .toEqual(ESTIMATED_POWER_OBSERVED_ENVELOPES);
  });

  it('builds exact additive support graphs and exposes Epic underidentification', () => {
    const graphs = buildDragonPowerSupportGraphs();
    expect(graphs.Legendary.components).toHaveLength(1);
    expect(graphs.Legendary.components[0]).toMatchObject({
      starRanks: [1, 2, 3, 4],
      dragonLevels: [20, 21, 25, 35, 36, 37, 38],
      maximumAbsoluteResidual: 0,
      uniquelyIdentifiableAfterGauge: true,
    });
    expect(graphs.Epic.components).toHaveLength(2);
    expect(graphs.Epic.components.map((component) => ({
      stars: component.starRanks,
      levels: component.dragonLevels,
    }))).toEqual([
      { stars: [1], levels: [20, 21] },
      { stars: [2, 3, 4, 6], levels: [25, 30, 31, 32, 35, 36, 37, 38] },
    ]);
    expect(graphs.Epic.underidentifiedRelationships).toHaveLength(1);
    expect(graphs.Rare.components).toHaveLength(1);
    expect(graphs.Rare.components[0]).toMatchObject({
      starRanks: [3, 4, 7],
      dragonLevels: [20, 21, 25, 28, 29, 30, 31],
      maximumAbsoluteResidual: 0,
      uniquelyIdentifiableAfterGauge: true,
    });
    expect(buildDragonPowerSupportGraphs([...DRAGON_POWER_OBSERVATIONS].reverse())).toEqual(graphs);
  });

  it('retains directly supported Star and Level differences including plateaus', () => {
    const power = (rarity: 'Legendary' | 'Epic' | 'Rare', starRank: number, dragonLevel: number) =>
      deduplicateDragonPowerObservations().find((row) =>
        row.rarity === rarity && row.starRank === starRank && row.dragonLevel === dragonLevel,
      )!.displayedPower;
    for (const level of [35, 36, 37]) expect(power('Legendary', 2, level) - power('Legendary', 1, level)).toBe(2220);
    for (const level of [36, 37]) expect(power('Legendary', 3, level) - power('Legendary', 2, level)).toBe(2400);
    expect(power('Legendary', 1, 36) - power('Legendary', 1, 35)).toBe(0);
    expect(power('Legendary', 2, 36) - power('Legendary', 2, 35)).toBe(0);
    for (const level of [31, 32]) expect(power('Epic', 3, level) - power('Epic', 2, level)).toBe(1600);
    expect(power('Epic', 2, 32) - power('Epic', 2, 31)).toBe(0);
    expect(power('Epic', 3, 32) - power('Epic', 3, 31)).toBe(0);
    expect(power('Epic', 6, 37) - power('Epic', 6, 36)).toBe(0);
    for (const level of [29, 30, 31]) expect(power('Rare', 4, level) - power('Rare', 3, level)).toBe(1350);
    for (const starRank of [3, 4, 7]) expect(power('Rare', starRank, 31) - power('Rare', starRank, 30)).toBe(200);
  });

  it('rejects conflicting displayed values for the same progression combination', () => {
    expect(() => deduplicateDragonPowerObservations([
      { rarity: 'Epic', starRank: 2, dragonLevel: 31, displayedPower: 16540, provenance: 'A' },
      { rarity: 'Epic', starRank: 2, dragonLevel: 31, displayedPower: 16550, provenance: 'B' },
    ])).toThrow(/conflicting estimated power observations/i);
  });

  it('returns positive integer modeled values rounded to the nearest 10', () => {
    for (const [rarity, starRank, dragonLevel] of [
      ['Legendary', 4, 35],
      ['Epic', 5, 33],
      ['Rare', 5, 29],
    ] as const) {
      const estimate = estimateDragonPower({ rarity, starRank, dragonLevel });
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
        for (let dragonLevel = 0; dragonLevel <= 1000; dragonLevel += 1) {
          const current = estimateDragonPower({ rarity, starRank, dragonLevel }).power;
          expect(current).toBeGreaterThanOrEqual(previous);
          expect(Number.isFinite(current)).toBe(true);
          previous = current;
        }
      }
      for (let dragonLevel = 0; dragonLevel <= 1000; dragonLevel += 1) {
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
      for (let dragonLevel = 0; dragonLevel <= 1000; dragonLevel += 1) {
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

  it('keeps Sunfyre and Tairax observations unchanged after adding both to the canonical database', () => {
    const canonicalNames = new Set(dragons.map((dragon) => dragon.name));
    expect(canonicalNames.has('Sunfyre')).toBe(true);
    expect(canonicalNames.has('Tairax')).toBe(true);
    expect(dragons).toHaveLength(34);
  });

  it('keeps observation and model identities deterministic and order independent', () => {
    expect(hashDragonPowerObservations()).toBe(ESTIMATED_POWER_OBSERVATION_HASH);
    expect(hashDragonPowerObservations([...DRAGON_POWER_OBSERVATIONS].reverse()))
      .toBe(ESTIMATED_POWER_OBSERVATION_HASH);
    const changed = DRAGON_POWER_OBSERVATIONS.map((observation, index) =>
      index === 0 ? { ...observation, displayedPower: observation.displayedPower + 10 } : observation,
    );
    expect(hashDragonPowerObservations(changed)).not.toBe(ESTIMATED_POWER_OBSERVATION_HASH);
    expect(hashEstimatedPowerModel()).toBe(ESTIMATED_POWER_MODEL_HASH);
    expect(hashEstimatedPowerModel([...DRAGON_POWER_OBSERVATIONS].reverse())).toBe(ESTIMATED_POWER_MODEL_HASH);
    expect(hashEstimatedPowerModel(changed)).not.toBe(ESTIMATED_POWER_MODEL_HASH);
    expect(ESTIMATED_POWER_MODEL_VERSION).toBe('estimated-power-v2');
    expect(ESTIMATED_POWER_MODEL_HASH).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
  });

  it('classifies confidence against each rarity-specific envelope', () => {
    expect(estimateDragonPower({ rarity: 'Legendary', starRank: 4, dragonLevel: 35 }))
      .toMatchObject({ power: 31040, confidence: 'modeled', basis: 'interpolation' });
    expect(estimateDragonPower({ rarity: 'Legendary', starRank: 5, dragonLevel: 35 }))
      .toMatchObject({ power: 33260, confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 6, dragonLevel: 35 }))
      .toMatchObject({ power: 29820, confidence: 'modeled', basis: 'interpolation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 7, dragonLevel: 35 }))
      .toMatchObject({ power: 31420, confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Rare', starRank: 4, dragonLevel: 29 }))
      .toMatchObject({ power: 13000, confidence: 'observed', basis: 'exact-observation' });
    expect(estimateDragonPower({ rarity: 'Rare', starRank: 2, dragonLevel: 29 }))
      .toMatchObject({ power: 10300, confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Rare', starRank: 4, dragonLevel: 30 }))
      .toMatchObject({ power: 13400, confidence: 'observed', basis: 'exact-observation' });
    expect(estimateDragonPower({ rarity: 'Rare', starRank: 4, dragonLevel: 31 }))
      .toMatchObject({ power: 13600, confidence: 'observed', basis: 'exact-observation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 3, dragonLevel: 34 }))
      .toMatchObject({ power: 19470, confidence: 'modeled', basis: 'interpolation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 1, dragonLevel: 30 }))
      .toMatchObject({ power: 13940, confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 2, dragonLevel: 21 }))
      .toMatchObject({ power: 11150, confidence: 'low', basis: 'extrapolation' });
    expect(estimateDragonPower({ rarity: 'Epic', starRank: 5, dragonLevel: 35 }))
      .toMatchObject({ power: 26200, confidence: 'modeled', basis: 'interpolation' });
    expect(estimateDragonPower({ rarity: 'Rare', starRank: 5, dragonLevel: 29 }))
      .toMatchObject({ power: 15080, confidence: 'modeled', basis: 'interpolation' });
  });

  it('keeps every numerical estimate on the audited grid unchanged by confidence classification', () => {
    const powers: number[] = [];
    for (const rarity of ['Legendary', 'Epic', 'Rare'] as const) {
      for (let starRank = 1; starRank <= 10; starRank += 1) {
        for (let dragonLevel = 0; dragonLevel <= 1000; dragonLevel += 1) {
          powers.push(estimateDragonPower({ rarity, starRank, dragonLevel }).power);
        }
      }
    }
    expect(fnv1a64(JSON.stringify(powers))).toBe(ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT);
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

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
