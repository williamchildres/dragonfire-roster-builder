import { describe, expect, it } from 'vitest';
import { evidenceSources } from '../data/evidence';
import { dragons } from '../data/dragons';
import {
  analyzeCapabilityAmplifications,
  buildCapabilityMatrix,
  capabilityIntegrityReport,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
} from '../services/effectCapabilities';
import type { ModifierCapability } from '../models/synergy';

const outputs = deriveOutputCapabilities(dragons);
const modifiers = deriveModifierCapabilities(dragons);

function modifierByAbility(dragonId: string, abilityName: string, channel?: string) {
  return modifiers.filter(
    (capability) =>
      capability.dragonId === dragonId &&
      capability.abilityName === abilityName &&
      (!channel || capability.channel === channel),
  );
}

function namedModifier(dragonId: string, abilityName: string, channel: string, role?: ModifierCapability['role']) {
  return modifiers.find(
    (capability) =>
      capability.dragonId === dragonId &&
      capability.abilityName === abilityName &&
      capability.channel === channel &&
      (!role || capability.role === role),
  );
}

describe('Phase 3.7.1 modifier role classification', () => {
  it('separates self amplification, ally support, recipient-side amplification, and enemy debuffs', () => {
    expect(namedModifier('sheepstealer', 'Stolen Flock', 'fire-damage', 'self-amplification')).toBeDefined();
    expect(namedModifier('vermax', "Warrior's Zeal", 'physical-damage', 'self-amplification')).toBeDefined();
    expect(namedModifier('vermax', 'Rallying Flame', 'physical-damage', 'self-amplification')).toBeDefined();
    expect(namedModifier('sheepstealer', "Hunter's Cunning", 'physical-damage', 'ally-support')).toBeDefined();
    expect(namedModifier('sheepstealer', "Hunter's Cunning", 'recovery', 'recipient-side-amplification')).toBeDefined();
    expect(namedModifier('malachite', "Sentinel's Presence", 'fire-damage', 'ally-support')).toBeDefined();
    expect(namedModifier('seasmoke', 'Cunning Ferocity', 'fire-damage', 'ally-support')).toBeDefined();
    expect(namedModifier('vermax', 'Spreading Blaze', 'tactical-damage', 'ally-support')).toBeDefined();
    expect(namedModifier('sheepstealer', "Dragon's Cunning", 'stat', 'enemy-debuff')).toBeDefined();
  });

  it('keeps stat support visible without treating it as direct damage-channel support', () => {
    expect(modifierByAbility('seasmoke', 'Clever Maneuver')).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ally-support', channel: 'stat' })]),
    );
    expect(modifierByAbility('seasmoke', "Wind's Favor")).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'ally-support', channel: 'stat' })]),
    );
  });
});

describe('Phase 3.7.1 cross-dragon protection', () => {
  it('never generates outgoing cross-dragon support from self-amplification or enemy-debuff modifiers', () => {
    const traces = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'sheepstealer' },
      dragons,
      { previewMaxRankInteractions: true },
    );

    expect(traces.some((trace) => trace.modifierRole === 'self-amplification' && trace.recipientDragonId !== trace.sourceDragonId)).toBe(false);
    expect(traces.some((trace) => trace.modifierRole === 'enemy-debuff')).toBe(false);
    expect(traces.some((trace) => trace.sourceAbilityId === 'sheepstealer-stolen-flock')).toBe(false);
    expect(traces.some((trace) => trace.sourceAbilityId === 'vermax-warriors-zeal' && trace.matchKind === 'outgoing-effect-amplification')).toBe(false);
    expect(traces.some((trace) => trace.sourceAbilityId === 'vermax-rallying-flame' && trace.channel === 'physical-damage')).toBe(false);
  });
});

describe('Phase 3.7.1 required generic synergies', () => {
  it('preserves required cross-dragon matches', () => {
    const formationA = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
      dragons,
    );
    const sheepToVermax = formationA.find(
      (trace) => trace.sourceDragonId === 'sheepstealer' && trace.recipientDragonId === 'vermax' && trace.channel === 'physical-damage',
    );
    const malToSheepRecovery = formationA.find(
      (trace) => trace.sourceDragonId === 'malachite' && trace.recipientDragonId === 'sheepstealer' && trace.channel === 'recovery',
    );

    expect(sheepToVermax?.matchedOutputCapabilityIds).toEqual(
      expect.arrayContaining(['vermax-basic-attack-physical', expect.stringContaining('spreading-blaze-physical-damage')]),
    );
    expect(malToSheepRecovery).toMatchObject({ matchKind: 'incoming-effect-amplification', status: 'active' });

    const malToSeasmoke = analyzeCapabilityAmplifications(
      { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'vermax' },
      dragons,
    ).find((trace) => trace.sourceDragonId === 'malachite' && trace.recipientDragonId === 'seasmoke' && trace.channel === 'fire-damage');
    const malToSheep = analyzeCapabilityAmplifications(
      { 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' },
      dragons,
    ).find((trace) => trace.sourceDragonId === 'malachite' && trace.recipientDragonId === 'sheepstealer' && trace.channel === 'fire-damage');
    const vermaxToMal = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
      dragons,
    ).find((trace) => trace.sourceDragonId === 'vermax' && trace.recipientDragonId === 'malachite' && trace.channel === 'tactical-damage');

    expect(malToSeasmoke).toMatchObject({ modifierRole: 'ally-support' });
    expect(malToSheep).toMatchObject({ modifierRole: 'ally-support' });
    expect(vermaxToMal).toMatchObject({ modifierRole: 'ally-support' });
  });
});

describe('Phase 3.7.1 availability and integrity', () => {
  it('labels canonical, observed-account, and user-roster availability separately', () => {
    const seasmokeCommand = outputs.find(
      (capability) => capability.dragonId === 'seasmoke' && capability.abilityName === 'Cleansing Wrath',
    );

    expect(seasmokeCommand?.availability.canonical).toBe('canonical-base');
    expect(seasmokeCommand?.availability.observedAccount).toBe('observed-unavailable');
    expect(seasmokeCommand?.availability.userRoster).toBe('unknown');
    expect(seasmokeCommand?.availability.reportLabel).toContain('not hatched in observed account');
    expect(seasmokeCommand?.availability.reportLabel).not.toContain('Current');
  });

  it('uses revised matrix sections instead of broad buff columns', () => {
    const matrix = buildCapabilityMatrix(dragons);
    const columns = Object.keys(matrix[0] ?? {});

    expect(columns).toContain('Amplifies Ally Physical Damage');
    expect(columns).toContain('Amplifies Own Physical Damage');
    expect(columns).not.toContain('Buffs Physical Damage Dealt');
    expect(matrix.find((row) => row.Dragon === 'Vermax')?.['Amplifies Own Physical Damage']).toContain("Warrior's Zeal");
    expect(matrix.find((row) => row.Dragon === 'Vermax')?.['Amplifies Ally Physical Damage']).toBe('No verified capability');
  });

  it('passes capability integrity checks and does not derive authoritative capabilities from tags alone', () => {
    const report = capabilityIntegrityReport(dragons);
    const evidenceIds = new Set(evidenceSources.map((source) => source.id));

    expect(report).toMatchObject({
      passed: true,
      duplicateIds: [],
      missingDragonReferences: [],
      missingAbilityReferences: [],
      missingEvidenceReferences: [],
      incompatibleRoles: [],
      tagOnlyCapabilities: [],
    });
    expect(modifiers.flatMap((capability) => capability.evidenceIds).every((id) => evidenceIds.has(id))).toBe(true);
  });
});
