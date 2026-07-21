import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { applyOwnedDragonPatch } from '../services/habitLevels';
import { addMissingDragonsToRoster, markDragonOwned } from '../services/rosterOwnership';
import { createEmptyRoster } from '../services/rosterStorage';

const syrax = dragons.find((dragon) => dragon.id === 'syrax')!;

describe('roster ownership transitions', () => {
  it('initializes a new dragon at Star 1 and Dragon Level 1 without mutating its input', () => {
    const input = { ...createEmptyRoster([syrax]).syrax! };
    const result = markDragonOwned(syrax, input);

    expect(result).toMatchObject({ owned: true, starRank: 1, reignLevel: 1 });
    expect(input).toMatchObject({ owned: false, starRank: null, reignLevel: null });
    for (const habit of syrax.habits.filter((habit) => (habit.unlockStarRank ?? 0) > 1 || (habit.minimumDragonLevel ?? 0) > 1)) {
      expect(result.habitLevels[habit.id]).toBeUndefined();
    }
  });

  it('restores valid progression, notes, and normalized unlocked Habit Levels when re-adding', () => {
    const seeded = applyOwnedDragonPatch(syrax, createEmptyRoster([syrax]).syrax!, {
      owned: false,
      starRank: 7,
      reignLevel: 12,
      notes: 'Keep this formation plan',
      habitLevels: Object.fromEntries(syrax.habits.map((habit) => [habit.id, 4])),
    });
    const result = markDragonOwned(syrax, seeded);

    expect(result.owned).toBe(true);
    expect(result.starRank).toBe(7);
    expect(result.reignLevel).toBe(12);
    expect(result.notes).toBe('Keep this formation plan');
    expect(result.habitLevels).toEqual(seeded.habitLevels);
  });

  it('adds only missing canonical dragons in one derived roster while preserving existing entries', () => {
    const roster = createEmptyRoster(dragons);
    roster.syrax = applyOwnedDragonPatch(syrax, roster.syrax!, {
      owned: true,
      starRank: 7,
      reignLevel: 12,
      notes: 'Existing progress',
    });
    roster.caraxes = applyOwnedDragonPatch(dragons.find((dragon) => dragon.id === 'caraxes')!, roster.caraxes!, {
      owned: false,
      starRank: 5,
      reignLevel: 9,
      notes: 'Restore me',
    });

    const result = addMissingDragonsToRoster(dragons, roster);

    expect(result.addedDragonIds).toHaveLength(dragons.length - 1);
    expect(result.roster.syrax).toEqual(roster.syrax);
    expect(result.roster.caraxes).toMatchObject({ owned: true, starRank: 5, reignLevel: 9, notes: 'Restore me' });
    expect(Object.values(result.roster).every((entry) => entry.owned)).toBe(true);
    expect(addMissingDragonsToRoster(dragons, result.roster).addedDragonIds).toEqual([]);
  });
});
