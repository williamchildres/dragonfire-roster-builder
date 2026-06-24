import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
import { troopMatchupRules } from '../data/troopMatchups';
import { analyzeFormation } from '../services/synergyEngine';
import { defaultSynergyRules } from '../data/synergyRules';

const malachite = dragons.find((dragon) => dragon.id === 'malachite')!;
const command = malachite.command!;
const trait = malachite.trait!;

describe('Malachite verified combat data', () => {
  it("models Warden's Rally as two independent schedules with shared Round 9", () => {
    expect(command.schedules).toHaveLength(2);

    const tactical = command.schedules.find((schedule) => schedule.id === 'wardens-rally-tactical-damage')!;
    const recovery = command.schedules.find((schedule) => schedule.id === 'wardens-rally-recovery')!;

    expect(tactical.rounds).toEqual([2, 4, 7, 9]);
    expect(recovery.rounds).toEqual([3, 6, 9]);
    expect(tactical.rounds).toContain(9);
    expect(recovery.rounds).toContain(9);
    expect(tactical.effects[0]!.magnitude).toBe(100);
    expect(recovery.effects[0]!.magnitude).toBe(70);
  });

  it('stores verified scaling and mitigation text without formulas', () => {
    const tactical = command.schedules[0]!.effects[0]!;
    const recovery = command.schedules[1]!.effects[0]!;

    expect(recovery.scaling).toEqual(['dragon Level', 'Instinct']);
    expect(tactical.scaling).toContain('attacker Instinct');
    expect(tactical.notes).toContain('Mitigated by target Intelligence');
  });

  it("models Sentinel's Presence as a level 16 Vanguard trait with flat Instinct 25", () => {
    const instinctEffect = trait.schedules[0]!.effects.find((effect) => effect.type === 'Instinct Up')!;

    expect(trait.minimumDragonLevel).toBe(16);
    expect(trait.positionRequirement).toBe('vanguard');
    expect(instinctEffect.magnitude).toBe(25);
    expect(instinctEffect.unit).toBe('flat');
  });

  it('stores Malachite troop affinities without inferring omitted icons', () => {
    expect(malachite.affinities).toMatchObject({
      Cavalry: 'positive',
      Shieldbearers: 'positive',
      Archers: 'negative',
      Spearmen: 'unknown',
      Siege: 'unknown',
    });
  });

  it('keeps Shieldbearer troop matchup rules separate from Malachite affinity', () => {
    expect(troopMatchupRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attacker: 'Shieldbearers', defender: 'Archers', damageModifierPercent: 7 }),
        expect.objectContaining({ attacker: 'Shieldbearers', defender: 'Siege', damageModifierPercent: 7 }),
        expect.objectContaining({ attacker: 'Shieldbearers', defender: 'Cavalry', damageModifierPercent: -7 }),
      ]),
    );
    expect(malachite.affinities.Shieldbearers).toBe('positive');
  });

  it('stores observation stats as non-canonical account-specific data', () => {
    const observation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === 'malachite')!;

    expect(observation.canonical).toBe(false);
    expect(observation.modifierContextKnown).toBe(false);
    expect(observation.combatStats.instinct).toBe(126.5);
    expect(Object.values(malachite.stats).every((value) => value === null)).toBe(true);
  });

  it('matches all five Habit ranked values and Lightning Strike distinct Power progression', () => {
    const [forest, wise, thunder, collective, lightning] = malachite.habits;

    expect(forest!.schedules[0]!.effects[0]!.rankedValues.map((value) => value.value)).toEqual([
      8, 9.6, 11.2, 13.6, 16,
    ]);
    expect(wise!.schedules[0]!.effects[0]!.rankedValues.map((value) => value.value)).toEqual([
      20, 24, 28, 34, 40,
    ]);
    expect(thunder!.schedules[0]!.triggerChanceByHabitLevel.map((value) => value.value)).toEqual([
      10, 12, 14, 17, 20,
    ]);
    expect(collective!.schedules[0]!.effects[0]!.rankedValues.map((value) => value.value)).toEqual([
      12.5, 15, 17.5, 21.25, 25,
    ]);
    expect(lightning!.schedules[0]!.triggerChanceByHabitLevel.map((value) => value.value)).toEqual([
      40, 52, 64, 80, 100,
    ]);
    expect(lightning!.powerByHabitLevel.map((value) => value.value)).toEqual([430, 1000, 1700, 2700, 4000]);
  });

  it('does not produce an unsupported formation score from partial data', () => {
    const result = analyzeFormation(
      { 'left-flank': 'syrax', vanguard: 'malachite', 'right-flank': 'vhagar' },
      dragons,
      defaultSynergyRules,
    );

    expect(result.score).toBeNull();
    expect(result.positionRequirements.length).toBeGreaterThan(0);
    expect(result.unresolvedAssumptions.join(' ')).toContain('adjacency');
  });
});
