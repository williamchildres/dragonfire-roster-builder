import { describe, expect, it } from 'vitest';
import packageJsonText from '../../package.json?raw';
import reportScriptText from '../../scripts/report-synergy-framework.mjs?raw';
import { dragons } from '../data/dragons';
import { defaultSynergyRules } from '../data/synergyRules';
import {
  analyzeCapabilityAmplifications,
  buildCapabilityMatrix,
  deriveModifierCapabilities,
  deriveOutputCapabilities,
  sourceScopesCompatible,
} from '../services/effectCapabilities';
import { analyzeFormation } from '../services/synergyEngine';

const outputs = deriveOutputCapabilities(dragons);
const modifiers = deriveModifierCapabilities(dragons);

function output(dragonId: string, channel: string, label: string) {
  return outputs.find(
    (capability) =>
      capability.dragonId === dragonId &&
      capability.channel === channel &&
      capability.label.includes(label),
  );
}

function modifier(dragonId: string, channel: string, abilityName: string) {
  return modifiers.find(
    (capability) =>
      capability.dragonId === dragonId &&
      capability.channel === channel &&
      capability.abilityName === abilityName,
  );
}

describe('Phase 3.7 capability derivation', () => {
  it('derives reviewed output capabilities without reducing dragons to one damage tag', () => {
    expect(output('malachite', 'tactical-damage', "Warden's Rally")).toBeDefined();
    expect(output('malachite', 'recovery', "Warden's Rally")).toBeDefined();
    expect(output('seasmoke', 'fire-damage', 'Cleansing Wrath')).toBeDefined();
    expect(output('seasmoke', 'physical-damage', 'Infectious Wrath')?.futureAvailable).toBe(true);
    expect(output('sheepstealer', 'fire-damage', 'Wild Hunt')).toBeDefined();
    expect(output('sheepstealer', 'recovery', 'Savage Claim')?.futureAvailable).toBe(true);
    expect(output('vermax', 'physical-damage', 'Basic Attack')?.combatLogConfirmed).toBe(true);
    expect(output('vermax', 'physical-damage', 'Spreading Blaze')).toBeDefined();
  });

  it('derives modifier capabilities for outgoing and incoming amplification', () => {
    expect(modifier('malachite', 'fire-damage', "Sentinel's Presence")).toMatchObject({
      direction: 'dealt',
      value: 16,
    });
    expect(modifier('sheepstealer', 'physical-damage', "Hunter's Cunning")).toMatchObject({
      direction: 'dealt',
      value: 10,
    });
    expect(modifier('sheepstealer', 'recovery', "Hunter's Cunning")).toMatchObject({
      direction: 'received',
      value: 20,
    });
    expect(modifier('vermax', 'tactical-damage', 'Spreading Blaze')).toMatchObject({
      direction: 'dealt',
      valuePerStack: 2.5,
      stackMaximum: 10,
    });
  });
});

describe('Phase 3.7 generic matching', () => {
  it('matches Sheepstealer Vanguard Physical support to Vermax Right Flank outputs', () => {
    const traces = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
      dragons,
    );
    const trace = traces.find(
      (item) =>
        item.matchKind === 'outgoing-effect-amplification' &&
        item.sourceDragonId === 'sheepstealer' &&
        item.recipientDragonId === 'vermax' &&
        item.channel === 'physical-damage',
    );

    expect(trace).toMatchObject({ status: 'active', confidence: 'confirmed' });
    expect(trace?.matchedOutputCapabilityIds).toEqual(
      expect.arrayContaining(['vermax-basic-attack-physical', expect.stringContaining('spreading-blaze-physical-damage')]),
    );
    expect(trace?.matchedOutputCapabilityIds).toHaveLength(2);
  });

  it('does not apply Sheepstealer Right Flank Physical support to the wrong position or provider placement', () => {
    expect(
      analyzeCapabilityAmplifications(
        { 'left-flank': 'vermax', vanguard: 'sheepstealer', 'right-flank': 'malachite' },
        dragons,
      ).find((trace) => trace.sourceDragonId === 'sheepstealer' && trace.recipientDragonId === 'vermax')?.status,
    ).toBe('inactive');
    expect(
      analyzeCapabilityAmplifications(
        { 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' },
        dragons,
      ).find((trace) => trace.sourceDragonId === 'sheepstealer' && trace.recipientDragonId === 'vermax')?.status,
    ).toBe('inactive');
  });

  it('matches Malachite Vanguard Fire support only to Left Flank Fire outputs', () => {
    const sheepTrace = analyzeCapabilityAmplifications(
      { 'left-flank': 'sheepstealer', vanguard: 'malachite', 'right-flank': 'vermax' },
      dragons,
    ).find((trace) => trace.sourceDragonId === 'malachite' && trace.recipientDragonId === 'sheepstealer' && trace.channel === 'fire-damage');
    const seasmokeTrace = analyzeCapabilityAmplifications(
      { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
      dragons,
    ).find((trace) => trace.sourceDragonId === 'malachite' && trace.recipientDragonId === 'seasmoke' && trace.channel === 'fire-damage');
    const rightTrace = analyzeCapabilityAmplifications(
      { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
      dragons,
    ).find((trace) => trace.sourceDragonId === 'malachite' && trace.recipientDragonId === 'sheepstealer' && trace.channel === 'fire-damage');

    expect(sheepTrace?.status).toBe('active');
    expect(seasmokeTrace?.status).toBe('active');
    expect(rightTrace?.status).toBe('inactive');
  });

  it('matches Vermax Spreading Blaze only to verified Tactical Damage recipients', () => {
    const traces = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
      dragons,
    );
    const malachiteTrace = traces.find(
      (trace) => trace.sourceDragonId === 'vermax' && trace.recipientDragonId === 'malachite' && trace.channel === 'tactical-damage',
    );
    const seasmokeTrace = traces.find(
      (trace) => trace.sourceDragonId === 'vermax' && trace.recipientDragonId === 'seasmoke' && trace.channel === 'tactical-damage',
    );

    expect(malachiteTrace).toMatchObject({ status: 'potential' });
    expect(malachiteTrace?.matchedOutputCapabilityIds?.join(' ')).toContain('wardens-rally-tactical-damage');
    expect(seasmokeTrace).toBeUndefined();
  });

  it('matches incoming Recovery amplification and preserves unknown exact amount', () => {
    const trace = analyzeCapabilityAmplifications(
      { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
      dragons,
    ).find((item) => item.matchKind === 'incoming-effect-amplification');

    expect(trace).toMatchObject({
      status: 'active',
      channel: 'recovery',
      sourceDragonId: 'malachite',
      recipientDragonId: 'sheepstealer',
      exactResultKnown: false,
    });
    expect(trace?.exactResultUnknownReason).toMatch(/Recovery formula is unknown/);
  });

  it('honors source scopes by channel and source kind', () => {
    expect(sourceScopesCompatible('all-qualifying-sources', 'basic-attacks')).toBe(true);
    expect(sourceScopesCompatible('all-qualifying-sources', 'commands')).toBe(true);
    expect(sourceScopesCompatible('non-basic-attacks', 'basic-attacks')).toBe(false);
    expect(sourceScopesCompatible('non-basic-attacks', 'commands')).toBe(true);
    expect(sourceScopesCompatible('commands-and-habits', 'basic-attacks')).toBe(false);
  });

  it('keeps numerical synergy score null and aggregates duplicate normal interactions', () => {
    const formation = { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' };
    const result = analyzeFormation(formation, dragons, defaultSynergyRules);
    const physicalCards = result.positives.filter(
      (item) => item.ruleId === 'outgoing-effect-amplification' && item.title === 'Physical Damage Support',
    );

    expect(result.score).toBeNull();
    expect(physicalCards).toHaveLength(1);
    expect(physicalCards[0]?.description).toContain('Qualifying outputs');
  });
});

describe('Phase 3.7 report support', () => {
  it('builds a reviewed-dragon capability matrix', () => {
    const matrix = buildCapabilityMatrix(dragons);

    expect(matrix.map((row) => row.Dragon)).toEqual([
      'Syrax',
      'Caraxes',
      'Seasmoke',
      'Malachite',
      'Sheepstealer',
      'Vermax',
    ]);
    expect(matrix.find((row) => row.Dragon === 'Vermax')?.['Deals Physical Damage']).toContain('Basic Attack');
  });

  it('registers a review report command and script', () => {
    const packageJson = JSON.parse(packageJsonText) as { scripts: Record<string, string> };

    expect(packageJson.scripts['report:synergy']).toBe('node scripts/report-synergy-framework.mjs');
    expect(reportScriptText).toContain('SYNERGY FRAMEWORK REPORT');
    expect(reportScriptText).toContain('Required Trace Results');
    expect(reportScriptText).toContain('Syrax First-Strike -> Caraxes Infernal Burst');
  });
});
