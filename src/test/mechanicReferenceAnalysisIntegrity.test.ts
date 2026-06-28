import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { createEmptyRoster } from '../services/rosterStorage';
import { analyzeFormationTraces } from '../services/synergyTrace';

const primaryFormation = {
  'left-flank': 'sheepstealer',
  vanguard: 'crimson',
  'right-flank': 'kalspire',
} as const;

function rosterAtRank10() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['sheepstealer', 'crimson', 'kalspire']) {
    const entry = roster[dragonId];
    expect(entry).toBeDefined();
    entry!.owned = true;
    entry!.collection.state = 'hatched';
    entry!.starRank = 10;
    entry!.reignLevel = 26;
  }
  return roster;
}

function currentTraces() {
  return analyzeFormationTraces(primaryFormation, dragons, {
    roster: rosterAtRank10(),
    dragonLevels: { sheepstealer: 26, crimson: 26, kalspire: 26 },
  });
}

function supportedPveTraces() {
  return analyzeFormationTraces(primaryFormation, dragons, {
    roster: rosterAtRank10(),
    dragonLevels: { sheepstealer: 26, crimson: 26, kalspire: 26 },
    battleContext: 'non-player-food-tile',
  });
}

function traceText(...sourceAbilityIds: string[]) {
  return currentTraces()
    .filter((trace) => sourceAbilityIds.includes(trace.sourceAbilityId ?? ''))
    .map((trace) => [
      trace.title,
      trace.explanation,
      ...trace.matchedFacts,
      ...trace.effects,
      ...trace.assumptions,
      ...trace.unresolvedQuestions,
    ].join(' '))
    .join(' ');
}

describe('mechanic reference analysis integrity', () => {
  it('surfaces one persistent Sheepstealer Prey identity without inventing lifecycle or enemy identity', () => {
    const text = traceText(
      'sheepstealer-wild-hunt',
      'sheepstealer-baited-kill',
      'sheepstealer-wary-beast',
      'sheepstealer-savage-claim',
      'sheepstealer-stolen-flock',
    );

    expect(text).toContain("Persistent marked target: Sheepstealer's current Prey.");
    expect(text).toContain('Wild Hunt establishes Prey only when none currently exists.');
    for (const abilityName of ['Baited Kill', 'Wary Beast', 'Savage Claim', 'Stolen Flock']) {
      expect(text).toContain(abilityName);
    }
    expect(text).toContain('refer to that same marked enemy.');
    expect(text).toContain('The actual enemy identity and unresolved lifecycle behavior are not simulated.');
    expect(text).toContain('Current Prey is above 50% Troop Capacity.');
    expect(text).not.toMatch(/Left Flank enemy|Vanguard enemy|Right Flank enemy/);
  });

  it('preserves Stolen Flock stack pool metadata and keeps its triggers non-guaranteed', () => {
    const stolenFlockModifiers = deriveModifierCapabilities(dragons).filter(
      (modifier) => modifier.abilityId === 'sheepstealer-stolen-flock' && modifier.statusId === 'stolen-flock',
    );
    expect(stolenFlockModifiers).toHaveLength(2);
    expect(stolenFlockModifiers.map((modifier) => modifier.sourceEffectId).sort()).toEqual([
      'stolen-flock-stack-recovery',
      'stolen-flock-stack-round',
    ]);
    expect(stolenFlockModifiers.every((modifier) => modifier.stackMaximum === 10)).toBe(true);
    expect(stolenFlockModifiers.every((modifier) => modifier.valuePerStack === 3)).toBe(true);
    expect(stolenFlockModifiers.every((modifier) => modifier.rankedValues.map((value) => value.value).join(',') === '3,3.6,4.2,5.1,6')).toBe(true);

    const traces = currentTraces().filter((trace) => trace.sourceAbilityId === 'sheepstealer-stolen-flock');
    const text = traceText('sheepstealer-stolen-flock');
    expect(text).toContain('Shared stack pool: stolen-flock.');
    expect(text).toContain('Maximum stacks: 10.');
    expect(text).toContain('Value per stack at effective Habit Level 1: 3% Fire Damage Dealt.');
    expect(text).toContain('Maximum theoretical modifier at effective Habit Level 1: 30% Fire Damage Dealt.');
    expect(text).toContain('Current stack count is unknown.');
    expect(text).toContain('Trigger chance: 50%.');
    expect(text).toContain('Prey-Recovery trigger is event-dependent and not guaranteed Active while the event is unresolved.');
    const stackTraces = traces.filter((trace) => trace.effects.join(' ').includes('Shared stack pool: stolen-flock.'));
    expect(stackTraces).toHaveLength(2);
    expect(stackTraces.some((trace) => trace.status === 'active')).toBe(false);
    expect(text).toContain('PvE Fire Damage bonus is contextual.');

    const pveFire = traces.find((trace) => trace.modifierCapabilityId?.includes('stolen-flock-pve-fire'));
    expect(pveFire).toBeDefined();
    expect(pveFire?.status).toBe('unknown');
    expect(pveFire?.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expected: 'non-player Food Tile or Beast encounter',
          actual: 'unspecified',
          satisfied: null,
        }),
      ]),
    );
    expect([pveFire?.explanation, ...(pveFire?.effects ?? [])].join(' ')).toContain('PvE-only bonus is contextual and is not treated as active.');

    const supportedPveFire = supportedPveTraces()
      .filter((trace) => trace.sourceAbilityId === 'sheepstealer-stolen-flock')
      .find((trace) => trace.modifierCapabilityId?.includes('stolen-flock-pve-fire'));
    expect(supportedPveFire).toBeDefined();
    expect(supportedPveFire?.status).toBe('active');
    expect(supportedPveFire?.requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expected: 'non-player Food Tile or Beast encounter',
          actual: 'non-player food tile',
          satisfied: true,
        }),
      ]),
    );
  });

  it('uses all-matching enemy semantics for Unlikely Hero and surfaces below-threshold Recovery reduction', () => {
    const traces = currentTraces().filter((trace) => trace.sourceAbilityId === 'crimson-unlikely-hero');
    const text = traceText('crimson-unlikely-hero');

    expect(text).toContain('Applies to all enemies currently above 75% maximum Troop Capacity.');
    expect(text).toContain('Applies to all enemies currently below 25% maximum Troop Capacity.');
    expect(text).toContain('All matching enemies are affected; no one enemy is selected from the qualifying set.');
    expect(text).toContain('Recovery Received decrease 20% at effective Habit Level 1.');
    expect(traces.some((trace) => trace.title.includes('Recovery Enemy Reduction'))).toBe(true);
    expect(text).not.toContain('for one enemy target');
    expect(text).not.toContain('selected enemy');
  });

  it("emits Vermin's Bane schedule replacement and shared even-round selection facts", () => {
    const text = traceText('crimson-bloodscale-terror', 'crimson-vermins-bane');

    expect(text).toContain("Vermin's Bane replaces Bloodscale Terror's Round 1 Stun roll.");
    expect(text).toContain('Effective Round 1 chance at Habit Level 1: 40%.');
    expect(text).toContain('The base 20% Round 1 roll does not also occur.');
    expect(text).toContain('Other odd-numbered rounds retain the base 20% chance.');
    expect(text).toContain('Shared activation group: vermins-bane-even-rounds-shared-activation.');
    expect(text).toContain('Shared selected-target group: vermins-bane-highest-instinct-enemy.');
    expect(text).toContain('selection stat instinct');
  });

  it('propagates Kalspire ordered target references and independent per-target checks', () => {
    const text = traceText('kalspire-tactical-strike', 'kalspire-tactical-assault');

    expect(text).toContain('Target reference original-basic-attack-target: First checked target is the original Basic Attack target.');
    expect(text).toContain('Target reference other-adjacent-enemy: Second checked target is another enemy within adjacency.');
    expect(text).toContain('Independent per-target checks: 2.');
    expect(text).toContain('Per-target check chance: 30%.');
    expect(text).toContain('Target reference not-original-basic-attack-target: Physical Damage target is distinct from the original Basic Attack target.');
    expect(text).toContain('Target reference panic-first-target: First Panic check uses the Physical Damage target.');
    expect(text).toContain('Target reference panic-second-target: Second Panic check uses another distinct adjacent enemy.');
    expect(text).toContain('Per-target check chance: 15% at effective Habit Level 1.');
    expect(text).toContain('Independent per-target checks: 2.');
    expect(text).toContain('Bleed deals periodic Physical Damage each round.');
    expect(text).toContain('Panic deals periodic Tactical Damage each round.');
    expect(text).toContain('Damage Rate 20%.');
    expect(text).toContain('Duration: 2 rounds.');
    expect(text).not.toContain('Tactical Strike effect tactical-strike-bleed must target a different enemy than tactical-strike-tactical-damage.');
    expect(text).not.toContain('Tactical Assault effect tactical-assault-panic uses the same selected target as tactical-assault-physical-damage.');
    expect(text).not.toContain('Targets one enemy.');
    expect(text).not.toContain('60% chance');
    expect(text).not.toContain('30% chance on Panic');
  });

  it('shows Radiant Conqueror self-Stun and independent highest-stat selectors', () => {
    const text = traceText('kalspire-radiant-conqueror');

    expect(text).toContain('Radiant Conqueror - Self Stun');
    expect(text).toContain("Kalspire's Radiant Conqueror causes Kalspire to gain Stun.");
    expect(text).toContain('Target: Kalspire.');
    expect(text).toContain('Timing: Start of Round 1.');
    expect(text).toContain('Duration: 1 round.');
    expect(text).toContain('Real Control status: Stun.');
    expect(text).toContain('The highest-Strength and highest-Intelligence selectors are resolved independently. They may select the same enemy or different enemies.');
    expect(text).toContain('Physical Damage reduction applies to non-Basic Attacks only.');
    expect(text).not.toContain('shared group radiant-conqueror');
  });
});
