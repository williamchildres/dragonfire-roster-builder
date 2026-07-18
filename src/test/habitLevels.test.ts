import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition, Dragon, OwnedDragon } from '../models/dragon';
import {
  applyOwnedDragonPatch,
  isHabitUnlocked,
  reconcileHabitLevels,
} from '../services/habitLevels';
import { createEmptyRoster } from '../services/rosterStorage';

const syrax = dragons.find((dragon) => dragon.id === 'syrax')!;
const baseHabit = syrax.habits[0]!;

function habit(requirements: Pick<AbilityDefinition, 'unlockStarRank' | 'minimumDragonLevel'>): AbilityDefinition {
  return { ...baseHabit, ...requirements };
}

describe('Habit Level unlock requirements', () => {
  it('requires every defined canonical progression threshold', () => {
    expect(isHabitUnlocked(habit({ unlockStarRank: null, minimumDragonLevel: null }), { starRank: null, reignLevel: null })).toBe(true);
    expect(isHabitUnlocked(habit({ unlockStarRank: 2, minimumDragonLevel: null }), { starRank: 1, reignLevel: null })).toBe(false);
    expect(isHabitUnlocked(habit({ unlockStarRank: 2, minimumDragonLevel: null }), { starRank: 2, reignLevel: null })).toBe(true);
    expect(isHabitUnlocked(habit({ unlockStarRank: null, minimumDragonLevel: 10 }), { starRank: null, reignLevel: 9 })).toBe(false);
    expect(isHabitUnlocked(habit({ unlockStarRank: null, minimumDragonLevel: 10 }), { starRank: null, reignLevel: 10 })).toBe(true);
    expect(isHabitUnlocked(habit({ unlockStarRank: 2, minimumDragonLevel: 10 }), { starRank: 2, reignLevel: 9 })).toBe(false);
    expect(isHabitUnlocked(habit({ unlockStarRank: 2, minimumDragonLevel: 10 }), { starRank: 1, reignLevel: 10 })).toBe(false);
    expect(isHabitUnlocked(habit({ unlockStarRank: 2, minimumDragonLevel: 10 }), { starRank: 2, reignLevel: 10 })).toBe(true);
    expect(isHabitUnlocked(habit({ unlockStarRank: 1, minimumDragonLevel: 1 }), { starRank: null, reignLevel: null })).toBe(false);
  });
});

describe('Habit Level reconciliation', () => {
  it('defaults missing, null, and zero unlocked legacy values to 1 while preserving levels 1-5', () => {
    const current = createEmptyRoster(dragons).syrax!;
    const missing = reconcileHabitLevels(syrax, { ...current, starRank: 2, habitLevels: {} });
    const legacyNull = reconcileHabitLevels(syrax, { ...current, starRank: 2, habitLevels: { [baseHabit.id]: null } });
    const legacyZero = reconcileHabitLevels(syrax, { ...current, starRank: 2, habitLevels: { [baseHabit.id]: 0 } });
    expect(missing.habitLevels[baseHabit.id]).toBe(1);
    expect(legacyNull.habitLevels[baseHabit.id]).toBe(1);
    expect(legacyZero.habitLevels[baseHabit.id]).toBe(1);
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(reconcileHabitLevels(syrax, {
        ...current,
        starRank: 2,
        habitLevels: { [baseHabit.id]: level },
      }).habitLevels[baseHabit.id]).toBe(level);
    }
  });

  it('clears relocked and unknown values, restarts at 1, and preserves an earlier habit when another unlocks', () => {
    const initial = createEmptyRoster(dragons).syrax!;
    const starTwo = applyOwnedDragonPatch(syrax, initial, { starRank: 2 });
    const upgraded = applyOwnedDragonPatch(syrax, starTwo, { habitLevels: { [baseHabit.id]: 5 } });
    const starOne = applyOwnedDragonPatch(syrax, upgraded, {
      starRank: 1,
      habitLevels: { 'unknown-habit': 4 } as never,
    });
    const reunlocked = applyOwnedDragonPatch(syrax, starOne, { starRank: 2 });
    const starFour = applyOwnedDragonPatch(syrax, reunlocked, { starRank: 4 });
    expect(upgraded.habitLevels[baseHabit.id]).toBe(5);
    expect(starOne.habitLevels).toEqual({});
    expect(reunlocked.habitLevels[baseHabit.id]).toBe(1);
    expect(starFour.habitLevels).toEqual({
      [baseHabit.id]: 1,
      [syrax.habits[1]!.id]: 1,
    });
  });

  it('reconciles combined Star Rank and Dragon Level changes and ignores locked direct assignments', () => {
    const levelHabit = habit({ unlockStarRank: 2, minimumDragonLevel: 10 });
    const dragon: Dragon = { ...syrax, habits: [levelHabit] };
    const initial: OwnedDragon = { ...createEmptyRoster([dragon])[dragon.id]!, dragonId: dragon.id };
    const unlocked = applyOwnedDragonPatch(dragon, initial, { starRank: 2, reignLevel: 10 });
    const loweredLevel = applyOwnedDragonPatch(dragon, unlocked, { reignLevel: 9 });
    const lockedAssignment = applyOwnedDragonPatch(dragon, loweredLevel, { habitLevels: { [levelHabit.id]: 5 } });
    const reunlocked = applyOwnedDragonPatch(dragon, lockedAssignment, { reignLevel: 10 });
    expect(unlocked.habitLevels[levelHabit.id]).toBe(1);
    expect(loweredLevel.habitLevels).toEqual({});
    expect(lockedAssignment.habitLevels).toEqual({});
    expect(reunlocked.habitLevels[levelHabit.id]).toBe(1);
  });
});
