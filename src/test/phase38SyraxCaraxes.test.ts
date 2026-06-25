import { describe, expect, it } from 'vitest';
import { databaseMetadata } from '../data/databaseMetadata';
import { dragons } from '../data/dragons';
import { evidenceSources } from '../data/evidence';
import { manualReviewRecords } from '../data/manualReviews';
import { dragonObservationSnapshots } from '../data/observations';
import { statusGlossary } from '../data/statusGlossary';
import {
  analyzeCapabilityAmplifications,
  buildCapabilityMatrix,
  capabilityIntegrityReport,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
  derivePeriodicDamageDefinitions,
  deriveStatusOutputCapabilities,
} from '../services/effectCapabilities';

const outputs = deriveOutputCapabilities(dragons);
const modifiers = deriveModifierCapabilities(dragons);
const statuses = deriveStatusOutputCapabilities(dragons);
const periodic = derivePeriodicDamageDefinitions(dragons);

function dragon(id: string) {
  const found = dragons.find((item) => item.id === id);
  expect(found).toBeDefined();
  return found!;
}

describe('Phase 3.8 Syrax and Caraxes data', () => {
  it('keeps roster size stable and versions the data schema', () => {
    expect(dragons).toHaveLength(30);
    expect(databaseMetadata.databaseVersion).toBe('0.6.0');
    expect(databaseMetadata.schemaVersion).toBe(10);
    expect(databaseMetadata.currentDocumentedGameBuild).toBe('26.6.53509');
  });

  it('stores Syrax verified combat data without canonical base stats', () => {
    const syrax = dragon('syrax');

    expect(syrax).toMatchObject({ name: 'Syrax', rarity: 'Legendary', breed: 'Sentinel' });
    expect(syrax.command?.name).toBe('Blazing Fury');
    expect(syrax.trait?.name).toBe("Sentinel's Wit");
    expect(syrax.habits.map((habit) => habit.name)).toEqual([
      'Mindful Synergy',
      'Flight Mastery',
      'Strategic Revival',
      'Tactical Inferno',
      "Mother's Mercy",
    ]);
    expect(syrax.affinities).toMatchObject({
      Spearmen: 'positive',
      Archers: 'positive',
      Siege: 'negative',
      Cavalry: 'unknown',
      Shieldbearers: 'unknown',
    });
    expect(Object.values(syrax.stats).every((value) => value === null)).toBe(true);
  });

  it('stores Caraxes verified combat data including independent Slow/Burn checks', () => {
    const caraxes = dragon('caraxes');
    const cripplingInferno = caraxes.habits.find((habit) => habit.id === 'caraxes-crippling-inferno')!;
    const effects = cripplingInferno.schedules[0]!.effects;

    expect(caraxes).toMatchObject({ name: 'Caraxes', rarity: 'Legendary', breed: 'Hunter' });
    expect(caraxes.command?.name).toBe('Infernal Burst');
    expect(caraxes.trait?.name).toBe("Hunter's Wrath");
    expect(caraxes.affinities).toMatchObject({
      Spearmen: 'positive',
      Cavalry: 'positive',
      Shieldbearers: 'unknown',
      Archers: 'unknown',
      Siege: 'unknown',
    });
    expect(effects.map((effect) => effect.type)).toEqual(['Slow', 'Burn']);
    expect(effects.every((effect) => effect.perTargetEffectCheck?.targetsCheckedIndependently)).toBe(true);
    expect(effects[0]!.perTargetEffectCheck?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectId: 'crippling-inferno-slow', independentlyChecked: true }),
        expect.objectContaining({ effectId: 'crippling-inferno-burn', independentlyChecked: true }),
      ]),
    );
  });

  it('records not-discovered account observations as noncanonical', () => {
    const syrax = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === 'syrax');
    const caraxes = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === 'caraxes');

    expect(syrax).toMatchObject({
      displayState: 'Not Discovered',
      canonical: false,
      collection: { state: 'not-collected' },
      combatStats: { strength: 46.3, instinct: 64.9, intelligence: 56.5, initiative: 70.4 },
      troopCapacity: 1450,
      dragonPower: 0,
    });
    expect(caraxes).toMatchObject({
      displayState: 'Not Discovered',
      canonical: false,
      collection: { state: 'not-collected' },
      combatStats: { strength: 57.6, instinct: 40.7, intelligence: 75.7, initiative: 62.7 },
      troopCapacity: 1450,
      dragonPower: 0,
    });
  });
});

describe('Phase 3.8 capability derivation', () => {
  it('derives Syrax and Caraxes outputs, status outputs, and periodic Burn', () => {
    expect(outputs.find((item) => item.dragonId === 'syrax' && item.channel === 'tactical-damage')).toBeDefined();
    expect(outputs.find((item) => item.dragonId === 'syrax' && item.channel === 'recovery')).toBeDefined();
    expect(outputs.find((item) => item.dragonId === 'caraxes' && item.channel === 'fire-damage' && item.abilityName === 'Infernal Burst')).toBeDefined();
    expect(outputs.find((item) => item.dragonId === 'caraxes' && item.channel === 'fire-damage' && item.abilityName === 'Crippling Inferno')).toBeDefined();
    expect(statuses.find((item) => item.dragonId === 'syrax' && item.statusId === 'first-strike')).toBeDefined();
    expect(statuses.find((item) => item.dragonId === 'caraxes' && item.statusId === 'slow')).toBeDefined();
    expect(statuses.find((item) => item.dragonId === 'caraxes' && item.statusId === 'burn')).toBeDefined();
    expect(periodic).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dragonId: 'caraxes',
          abilityId: 'caraxes-crippling-inferno',
          statusId: 'burn',
          channel: 'fire-damage',
          damageRateFixed: 20,
          scalingStat: 'intelligence',
          mitigationStat: 'initiative',
        }),
      ]),
    );
  });

  it('derives status, scaling, and mitigation dependencies from structured effects', () => {
    const caraxesInfernal = outputs.find((item) => item.dragonId === 'caraxes' && item.abilityName === 'Infernal Burst')!;
    const syraxRevival = outputs.find((item) => item.dragonId === 'syrax' && item.abilityName === 'Strategic Revival')!;

    expect(caraxesInfernal.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'requires-self-status', statusId: 'first-strike', multiplier: 1.5 }),
        expect.objectContaining({ type: 'scales-with-stat', statId: 'intelligence' }),
        expect.objectContaining({ type: 'mitigated-by-target-stat', statId: 'initiative' }),
      ]),
    );
    expect(syraxRevival.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'requires-any-enemy-status', statusId: 'slow', multiplier: 1.5 }),
        expect.objectContaining({ type: 'scales-with-stat', statId: 'initiative' }),
      ]),
    );
  });

  it('classifies Syrax and Caraxes modifier roles safely', () => {
    expect(modifiers.find((item) => item.dragonId === 'syrax' && item.abilityName === 'Blazing Fury' && item.channel === 'fire-damage')).toMatchObject({
      role: 'ally-support',
      direction: 'dealt',
    });
    expect(modifiers.find((item) => item.dragonId === 'syrax' && item.abilityName === "Sentinel's Wit" && item.channel === 'tactical-damage')).toMatchObject({
      role: 'self-amplification',
    });
    expect(modifiers.find((item) => item.dragonId === 'caraxes' && item.abilityName === "Hunter's Wrath" && item.channel === 'fire-damage')).toMatchObject({
      role: 'self-amplification',
    });
    expect(modifiers.find((item) => item.dragonId === 'caraxes' && item.abilityName === "Hunter's Wrath" && item.channel === 'stat')).toMatchObject({
      role: 'ally-support',
    });
    expect(modifiers.find((item) => item.dragonId === 'caraxes' && item.abilityName === 'Battle Dread' && item.channel === 'stat')).toMatchObject({
      role: 'enemy-debuff',
    });
  });
});

describe('Phase 3.8 generic trace behavior', () => {
  it('connects Syrax First-Strike support to Caraxes First-Strike conditional Fire damage', () => {
    const trace = analyzeCapabilityAmplifications(
      { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'vermax' },
      dragons,
      { previewMaxRankInteractions: true },
    ).find((item) => item.matchKind === 'status-condition-enablement' && item.sourceDragonId === 'syrax' && item.recipientDragonId === 'caraxes');

    expect(trace).toMatchObject({
      ruleId: 'status-condition-enablement',
      sourceAbilityId: 'syrax-blazing-fury',
      recipientAbilityId: 'caraxes-infernal-burst',
      channel: 'fire-damage',
    });
    expect(trace?.matchedFacts.join(' ')).toContain('First-Strike');
  });

  it('connects Caraxes Slow to Syrax Strategic Revival conditional Recovery', () => {
    const trace = analyzeCapabilityAmplifications(
      { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
      dragons,
      { previewMaxRankInteractions: true },
    ).find((item) => item.matchKind === 'status-condition-enablement' && item.sourceDragonId === 'caraxes' && item.recipientDragonId === 'syrax');

    expect(trace).toMatchObject({
      sourceAbilityId: 'caraxes-crippling-inferno',
      recipientAbilityId: 'syrax-strategic-revival',
      channel: 'recovery',
    });
    expect(trace?.effects.join(' ')).toContain('Slow');
  });

  it('connects stat scaling support and enemy mitigation reduction without hard-coded pairs', () => {
    const statTrace = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'caraxes', 'right-flank': 'syrax' },
      dragons,
      { previewMaxRankInteractions: true },
    ).find(
      (item) =>
        item.ruleId === 'stat-scaling-support' &&
        item.matchKind === 'stat-scaling-support' &&
        item.sourceDragonId === 'caraxes' &&
        item.recipientDragonId === 'syrax',
    );
    const mitigationTrace = analyzeCapabilityAmplifications(
      { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
      dragons,
      { previewMaxRankInteractions: true },
    ).find((item) => item.matchKind === 'enemy-mitigation-reduction' && item.sourceDragonId === 'syrax' && item.recipientDragonId === 'caraxes');

    expect(statTrace).toMatchObject({ title: 'Initiative Scaling Support' });
    expect(statTrace?.matchedFacts.join(' ')).toContain('Strategic Revival');
    expect(mitigationTrace).toMatchObject({ title: 'Initiative Mitigation Reduction' });
    expect(mitigationTrace?.matchedFacts.join(' ')).toContain('Infernal Burst');
  });

  it('connects Fire support to Caraxes Burn as periodic damage amplification', () => {
    const trace = analyzeCapabilityAmplifications(
      { 'left-flank': 'caraxes', vanguard: 'syrax', 'right-flank': 'vermax' },
      dragons,
      { previewMaxRankInteractions: true },
    ).find((item) => item.matchKind === 'periodic-damage-amplification' && item.sourceDragonId === 'syrax' && item.recipientDragonId === 'caraxes');

    expect(trace).toMatchObject({
      channel: 'fire-damage',
      sourceAbilityId: 'syrax-blazing-fury',
      recipientAbilityId: 'caraxes-crippling-inferno',
    });
    expect(trace?.unresolvedQuestions.join(' ')).toContain('Burn stacking');
  });

  it('keeps self amplification out of cross-dragon support and avoids numerical scores', () => {
    const traces = analyzeCapabilityAmplifications(
      { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'malachite' },
      dragons,
      { previewMaxRankInteractions: true },
    );

    expect(traces.some((trace) => trace.sourceAbilityId === 'caraxes-hunters-wrath' && trace.channel === 'fire-damage')).toBe(false);
    expect(traces.some((trace) => trace.sourceAbilityId === 'syrax-sentinels-wit' && trace.channel === 'tactical-damage')).toBe(false);
    expect(traces.every((trace) => !trace.effects.some((effect) => /score/i.test(effect)))).toBe(true);
  });
});

describe('Phase 3.8 review support', () => {
  it('updates glossary, evidence, manual review, matrix, and integrity outputs', () => {
    expect(statusGlossary.map((entry) => entry.id)).toEqual(expect.arrayContaining(['slow', 'burn', 'control', 'resistance']));
    expect(evidenceSources.filter((source) => source.id.startsWith('syrax-')).every((source) => source.gameVersion === '26.6.53509')).toBe(true);
    expect(evidenceSources.filter((source) => source.id.startsWith('caraxes-')).every((source) => source.gameVersion === '26.6.53509')).toBe(true);
    expect(manualReviewRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'syrax-combat-data-review-2026-06-24', status: 'confirmed' }),
        expect.objectContaining({ id: 'caraxes-combat-data-review-2026-06-24', status: 'confirmed' }),
      ]),
    );

    const matrix = buildCapabilityMatrix(dragons);
    expect(matrix.find((row) => row.Dragon === 'Syrax')?.['Deals Tactical Damage']).toContain('Blazing Fury');
    expect(matrix.find((row) => row.Dragon === 'Caraxes')?.['Deals Fire Damage']).toContain('Infernal Burst');
    expect(capabilityIntegrityReport(dragons).passed).toBe(true);
  });
});
