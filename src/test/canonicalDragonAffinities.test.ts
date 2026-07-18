import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { TROOP_TYPES } from '../models/dragon';

const completedRareAffinities = {
  antares: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'negative' },
  arrax: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'positive', Spearmen: 'neutral', Siege: 'neutral' },
  arulix: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  bevlorin: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  dawnseeker: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'negative' },
  jagadrix: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'positive', Siege: 'neutral' },
  nyrena: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  shadowrend: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  shimmer: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'positive' },
  solstryker: { Cavalry: 'neutral', Shieldbearers: 'neutral', Archers: 'positive', Spearmen: 'neutral', Siege: 'neutral' },
  thunderstrike: { Cavalry: 'positive', Shieldbearers: 'neutral', Archers: 'neutral', Spearmen: 'neutral', Siege: 'neutral' },
  vesper: { Cavalry: 'neutral', Shieldbearers: 'positive', Archers: 'neutral', Spearmen: 'neutral', Siege: 'negative' },
} as const;

describe('completed Rare dragon canonical affinities', () => {
  it('stores the exact complete controller-confirmed map and leaves other dragon affinity maps unchanged', () => {
    const targetIds = new Set(Object.keys(completedRareAffinities));
    expect(targetIds.size).toBe(12);

    for (const [dragonId, expected] of Object.entries(completedRareAffinities)) {
      const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
      expect(Object.keys(dragon.affinities).sort()).toEqual([...TROOP_TYPES].sort());
      expect(dragon.affinities).toEqual(expected);
      expect(Object.values(dragon.affinities)).not.toContain('unknown');
      expect(dragon.fieldVerification.affinities).toEqual({
        status: 'community-verified',
        source: 'Controller-provided in-game affinity transcription',
        capturedAt: '2026-07-18',
        gameVersion: null,
        reviewedManually: true,
      });
    }

    const unchangedAffinityMaps = Object.fromEntries(
      dragons
        .filter((dragon) => !targetIds.has(dragon.id))
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((dragon) => [dragon.id, TROOP_TYPES.map((troopType) => dragon.affinities[troopType])]),
    );
    expect(createHash('sha256').update(JSON.stringify(unchangedAffinityMaps)).digest('hex')).toBe(
      'f70deb8d863490d8d89a31adbb244696fc2e4994d679cc2a9abf328bbe62c132',
    );
  });

  it('removes obsolete affinity caveats while preserving independent canonical note content', () => {
    const targetIds = new Set(Object.keys(completedRareAffinities));
    const obsoleteAffinityLanguage = /affinit(?:y|ies)(?: icons?)?.*(?:unknown|unverified|not text-verified|partially verified)/i;

    for (const dragon of dragons.filter((candidate) => targetIds.has(candidate.id))) {
      expect(dragon.notes ?? '').not.toMatch(obsoleteAffinityLanguage);
    }

    expect(dragons.find((dragon) => dragon.id === 'antares')?.notes).toBeNull();
    expect(dragons.find((dragon) => dragon.id === 'jagadrix')?.notes).toBe('Adult life stage was shown.');
    expect(dragons.find((dragon) => dragon.id === 'bevlorin')?.notes).toBe(
      "Nature's Reckoning's incorrect in-game Fire Damage Received heading is retained as an evidence discrepancy; the verified body and summary establish Fire Damage Dealt suppression.",
    );
    expect(dragons.find((dragon) => dragon.id === 'shadowrend')?.notes).toBe(
      'Fueled by Darkness recipient selection and the exact meaning of Advantage +10% remain unresolved.',
    );
    expect(dragons.find((dragon) => dragon.id === 'thunderstrike')?.notes).toBe(
      "Armor Break's opposing-enemy selection remains unresolved enemy-targeting language.",
    );

    const whelpNote = 'The supplied screen shows the Whelp life stage. Account progression and combat stats are not canonical.';
    for (const dragonId of ['vesper', 'nyrena', 'dawnseeker']) {
      expect(dragons.find((dragon) => dragon.id === dragonId)?.notes).toBe(whelpNote);
    }
  });
});
