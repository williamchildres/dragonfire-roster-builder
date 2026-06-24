import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { dragonObservationSnapshots } from '../data/observations';
import { troopMatchupRules } from '../data/troopMatchups';
import { analyzeFormation } from '../services/synergyEngine';
import { defaultSynergyRules } from '../data/synergyRules';

const seasmoke = dragons.find((dragon) => dragon.id === 'seasmoke')!;
const sheepstealer = dragons.find((dragon) => dragon.id === 'sheepstealer')!;
const vermax = dragons.find((dragon) => dragon.id === 'vermax')!;

describe('Phase 3 combat data', () => {
  it('models Seasmoke Cleansing Wrath as independent cleanse attempts plus scheduled Fire Damage', () => {
    const cleanse = seasmoke.command!.schedules.find(
      (schedule) => schedule.id === 'cleansing-wrath-cleanse-positive',
    )!;
    const fire = seasmoke.command!.schedules.find((schedule) => schedule.id === 'cleansing-wrath-fire-damage')!;
    const infectious = seasmoke.command!.augmentations[0]!;

    expect(cleanse.attempts).toMatchObject({
      attemptCount: 3,
      chanceFixed: 20,
      independentlyRolled: true,
      independentlyTargeted: true,
    });
    expect(fire.rounds).toEqual([3, 6, 9]);
    expect(fire.effects[0]!.magnitude).toBe(190);
    expect(fire.effects[0]!.scaling).toContain('attacker Intelligence');
    expect(fire.effects[0]!.notes).toContain('Mitigated by target Initiative');
    expect(infectious.minimumDragonStarRank).toBe(6);
    expect(infectious.effectsAdded[0]!.conditionalMultipliers![0]).toMatchObject({
      multiplier: 2,
      calculatedFromVerifiedMultiplier: true,
    });
  });

  it('stores Seasmoke Habits including thresholded Loyal Bond and unknown power where applicable', () => {
    const loyalBond = seasmoke.habits.find((habit) => habit.id === 'seasmoke-loyal-bond')!;

    expect(seasmoke.habits).toHaveLength(5);
    expect(loyalBond.schedules).toHaveLength(2);
    expect(loyalBond.schedules.map((schedule) => schedule.conditions?.[0]?.comparison)).toEqual([
      'above',
      'below',
    ]);
    expect(loyalBond.schedules[0]!.effects[0]!.type).toBe('Advantage');
    expect(loyalBond.schedules[1]!.effects[0]!.type).toBe('Resistance');
  });

  it('models Sheepstealer Wild Hunt, Prey, Stolen Flock, and Savage Claim without official profile data', () => {
    const preySchedule = sheepstealer.command!.schedules.find((schedule) => schedule.id === 'wild-hunt-apply-prey')!;
    const fireSchedule = sheepstealer.command!.schedules.find((schedule) => schedule.id === 'wild-hunt-fire-damage')!;
    const stolenFlock = sheepstealer.habits.find((habit) => habit.id === 'sheepstealer-stolen-flock')!;
    const savageClaim = sheepstealer.habits.find((habit) => habit.id === 'sheepstealer-savage-claim')!;

    expect(sheepstealer.officialProfileUrl).toBeNull();
    expect(sheepstealer.rosterSourceStatus).toBe('in-game-verified-pending-official-site');
    expect(preySchedule.triggerChanceFixed).toBe(40);
    expect(preySchedule.conditions?.[0]?.kind).toBe('no-enemy-has-mark');
    expect(preySchedule.targetPriority).toBe('prefer-received-recovery-last-round');
    expect(preySchedule.effects[0]).toMatchObject({
      type: 'Prey',
      magnitude: 30,
      durationRounds: 3,
    });
    expect(fireSchedule.rounds).toEqual([1, 4, 7, 10]);
    expect(fireSchedule.effects[0]!.conditionalMultipliers![0]!.multiplier).toBe(2);
    expect(stolenFlock.schedules).toHaveLength(3);
    expect(stolenFlock.schedules[0]!.battleContext).toBe('non-player-food-tile');
    expect(stolenFlock.schedules[1]!.effects[0]!.stack?.maximumStacks).toBe(10);
    expect(stolenFlock.schedules[2]!.timing).toBe('when-marked-target-receives-recovery');
    expect(savageClaim.schedules[0]!.effects[0]!.conditionalMultipliers![0]).toMatchObject({
      multiplier: 3,
      calculatedFromVerifiedMultiplier: true,
    });
    expect(savageClaim.schedules[0]!.effects[0]!.conditionalMultipliers![0]!.directlyVerifiedValues).toEqual([
      { level: 1, value: 72, unit: 'percent' },
    ]);
  });

  it('models Vermax after-Basic-Attack command, thresholds, repeat modes, and distinct powers', () => {
    const commandSchedule = vermax.command!.schedules[0]!;
    const traitPhysical = vermax.trait!.schedules[0]!.effects.find(
      (effect) => effect.id === 'warriors-zeal-physical',
    )!;
    const trial = vermax.habits.find((habit) => habit.id === 'vermax-trial-by-flame')!;
    const rallyingFlame = vermax.habits.find((habit) => habit.id === 'vermax-rallying-flame')!;
    const unyielding = vermax.habits.find((habit) => habit.id === 'vermax-unyielding-resolve')!;

    expect(vermax.officialProfileUrl).toBeNull();
    expect(commandSchedule.timing).toBe('after-basic-attack');
    expect(commandSchedule.repeat?.mode).toBe('once-if-any-match');
    expect(commandSchedule.effects[1]!.stack?.maximumStacks).toBe(10);
    expect(traitPhysical.sourceScope).toBe('all-sources');
    expect(traitPhysical.notes.join(' ')).toContain('Basic Attack');
    expect(trial.schedules.map((schedule) => schedule.conditions?.[0]?.thresholdPercent)).toEqual([
      75,
      50,
      25,
    ]);
    expect(trial.schedules.every((schedule) => schedule.conditions?.[0]?.comparison === 'below')).toBe(true);
    expect(trial.powerByHabitLevel).toEqual([]);
    expect(rallyingFlame.schedules[0]!.repeat?.mode).toBe('once-per-match');
    expect(unyielding.powerByHabitLevel.map((value) => value.value)).toEqual([340, 790, 1400, 2100, 3100]);
    expect(unyielding.schedules[0]!.effects[0]!.conditionalMultipliers![0]).toMatchObject({
      multiplier: 1.5,
      directlyVerifiedValues: [{ level: 1, value: 30, unit: 'percent' }],
    });
    expect(unyielding.schedules[0]!.effects[1]!.conditions?.[0]?.statusId).toBe('weakened');
  });

  it('keeps observations dynamic and troop matchups separate from affinities', () => {
    const seasmokeObservation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === 'seasmoke')!;
    const sheepstealerObservation = dragonObservationSnapshots.find((snapshot) => snapshot.dragonId === 'sheepstealer')!;

    expect(seasmokeObservation.collection).toEqual({
      state: 'not-hatched',
      shardsCurrent: 10,
      shardsRequired: 15,
    });
    expect(seasmokeObservation.staminaCurrent).toBe(250);
    expect(seasmokeObservation.staminaMaximum).toBe(100);
    expect(sheepstealerObservation.starProgressCurrent).toBe(5);
    expect(sheepstealerObservation.canonical).toBe(false);
    expect(Object.values(sheepstealer.stats).every((value) => value === null)).toBe(true);
    expect(sheepstealer.affinities).toMatchObject({
      Cavalry: 'positive',
      Archers: 'positive',
      Shieldbearers: 'unknown',
    });
    expect(troopMatchupRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attacker: 'Shieldbearers', defender: 'Archers', damageModifierPercent: 7 }),
      ]),
    );
  });

  it('explains Phase 3 formation interactions without producing an unsupported score', () => {
    const result = analyzeFormation(
      { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
      dragons,
      defaultSynergyRules,
    );

    expect(result.score).toBeNull();
    expect(result.positives.map((item) => item.ruleId)).toContain('sheepstealer-right-physical-verified');
    expect(result.conflicts.map((item) => item.ruleId)).toContain('verified-vanguard-position-conflict');
    expect(result.unresolvedAssumptions.join(' ')).toContain('Target selection for multiple Spreading Blaze attempts');
  });
});
