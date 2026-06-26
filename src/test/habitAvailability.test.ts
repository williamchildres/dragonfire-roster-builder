import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition, OwnedDragon } from '../models/dragon';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { deriveModifierCapabilities } from '../services/effectCapabilities';
import { rankedValueForHabitLevel, resolveEffectiveHabitLevelForAbility } from '../services/habitLevels';
import { createEmptyRoster, serializeRosterExport, validateRosterImport } from '../services/rosterStorage';
import { analyzeFormationTraces, isNormalSynergyTrace } from '../services/synergyTrace';

const ep01Formation: FormationAnalysisInput = {
  'left-flank': 'daemoros',
  vanguard: 'arrax',
  'right-flank': 'vesper',
};

const infernalFormation: FormationAnalysisInput = {
  'left-flank': 'vaeldra',
  vanguard: 'syrax',
  'right-flank': 'caraxes',
};

function ability(dragonId: string, abilityId: string): AbilityDefinition {
  const dragon = dragons.find((item) => item.id === dragonId);
  const found = [dragon?.command, dragon?.trait, ...(dragon?.habits ?? [])].find((item) => item?.id === abilityId);
  if (!found) {
    throw new Error(`Missing test ability ${abilityId}`);
  }
  return found;
}

function selectedRoster(dragonIds: string[], starRank: number, habitLevels: Record<string, OwnedDragon['habitLevels'][string]> = {}) {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of dragonIds) {
    const entry = roster[dragonId];
    if (!entry) {
      throw new Error(`Missing test dragon ${dragonId}`);
    }
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.reignLevel = 30;
    entry.starRank = starRank;
    for (const [habitId, level] of Object.entries(habitLevels)) {
      if (Object.hasOwn(entry.habitLevels, habitId)) {
        entry.habitLevels[habitId] = level;
      }
    }
  }
  return roster;
}

function normalTraces(formation: FormationAnalysisInput, roster: Record<string, OwnedDragon>, previewMaxRankInteractions = false): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, {
    roster,
    previewMaxRankInteractions,
    dragonLevels: Object.fromEntries(Object.keys(roster).map((dragonId) => [dragonId, roster[dragonId]?.reignLevel ?? null])),
  }).filter(isNormalSynergyTrace);
}

function infernalTraces(roster: Record<string, OwnedDragon>, previewMaxRankInteractions = false): SynergyTrace[] {
  return normalTraces(infernalFormation, roster, previewMaxRankInteractions)
    .filter((trace) => trace.sourceAbilityId === 'vaeldra-infernal-force');
}

describe('unlocked Habit effective level defaults', () => {
  const phantomsVeil = ability('daemoros', 'daemoros-phantoms-veil');
  const infernalForce = ability('vaeldra', 'vaeldra-infernal-force');

  it('keeps a locked Habit inactive when no explicit Habit Level is saved', () => {
    const roster = selectedRoster(['daemoros', 'arrax', 'vesper'], 1);

    expect(resolveEffectiveHabitLevelForAbility(phantomsVeil, roster.daemoros)).toBeNull();
    expect(normalTraces(ep01Formation, roster).some((trace) => trace.sourceAbilityId === phantomsVeil.id)).toBe(false);
  });

  it("unlocks Daemoros Phantom's Veil at Star Rank 10 as effective Habit Level 1 without teammate cards", () => {
    const roster = selectedRoster(['daemoros', 'arrax', 'vesper'], 10);
    const phantomsVeilModifier = deriveModifierCapabilities(dragons).find((modifier) => modifier.abilityId === phantomsVeil.id);
    const traces = normalTraces(ep01Formation, roster);
    const presentation = buildFormationCardPresentation(ep01Formation, dragons, traces, { previewEnabled: false });

    expect(resolveEffectiveHabitLevelForAbility(phantomsVeil, roster.daemoros)).toBe(1);
    expect(phantomsVeilModifier?.role).toBe('self-amplification');
    expect(phantomsVeilModifier?.channel).toBe('damage-received');
    expect(phantomsVeilModifier?.targetSelector.selection).toBe('self');
    expect(phantomsVeilModifier?.rankedValues).toContainEqual(expect.objectContaining({ level: 1, value: 15 }));
    expect(rankedValueForHabitLevel(phantomsVeilModifier!.rankedValues, 1)?.value).toBe(15);
    expect(
      presentation.cards.flatMap((card) => [...card.receives, ...card.provides]).some((item) => item.abilityName === "Phantom's Veil"),
    ).toBe(false);
    expect(roster.daemoros!.habitLevels[phantomsVeil.id]).toBeNull();
  });

  it('uses derived Level 1 ranked values and no selected-level blocker for an unlocked Habit with no saved level', () => {
    const roster = selectedRoster(['vaeldra', 'syrax', 'caraxes'], 8);
    const traces = infernalTraces(roster);

    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBe(1);
    expect(traces.length).toBeGreaterThan(0);
    expect(traces.every((trace) => trace.status !== 'inactive' && trace.status !== 'blocked')).toBe(true);
    expect(traces.flatMap((trace) => trace.effects).join(' ')).toContain('12%');
    expect(traces.flatMap((trace) => trace.requirements).filter((requirement) => requirement.label.includes('Selected Habit Level'))).toEqual(
      expect.arrayContaining([expect.objectContaining({ actual: 'Habit Level 1', satisfied: true })]),
    );
    expect(traces.flatMap((trace) => trace.requirements).some((requirement) => requirement.label.includes('Selected Habit Level') && requirement.satisfied === false)).toBe(false);
  });

  it('uses explicit upgraded levels, preserves them while locked, and restores them when rank returns', () => {
    const roster = selectedRoster(['vaeldra', 'syrax', 'caraxes'], 8, { [infernalForce.id]: 3 });

    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBe(3);
    expect(infernalTraces(roster).flatMap((trace) => trace.effects).join(' ')).toContain('16.8%');

    roster.vaeldra!.starRank = 7;
    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBeNull();
    expect(roster.vaeldra!.habitLevels[infernalForce.id]).toBe(3);
    expect(infernalTraces(roster).some((trace) => trace.status !== 'inactive' && trace.status !== 'blocked')).toBe(false);

    roster.vaeldra!.starRank = 8;
    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBe(3);
    expect(infernalTraces(roster).flatMap((trace) => trace.effects).join(' ')).toContain('16.8%');
  });

  it('restores derived Level 1 after rank lowering when no explicit Habit Level was saved', () => {
    const roster = selectedRoster(['vaeldra', 'syrax', 'caraxes'], 8);

    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBe(1);
    roster.vaeldra!.starRank = 7;
    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBeNull();
    roster.vaeldra!.starRank = 8;
    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBe(1);
    expect(roster.vaeldra!.habitLevels[infernalForce.id]).toBeNull();
  });

  it('treats saved Level 0 as unset for unlocked Habits without mutating storage', () => {
    const roster = selectedRoster(['vaeldra', 'syrax', 'caraxes'], 8, { [infernalForce.id]: 0 });

    expect(resolveEffectiveHabitLevelForAbility(infernalForce, roster.vaeldra)).toBe(1);
    expect(infernalTraces(roster).flatMap((trace) => trace.effects).join(' ')).toContain('12%');
    expect(roster.vaeldra!.habitLevels[infernalForce.id]).toBe(0);
  });

  it('keeps preview isolated from saved roster state and current analysis', () => {
    const roster = selectedRoster(['vaeldra', 'syrax', 'caraxes'], 7);
    const before = JSON.stringify(roster.vaeldra!.habitLevels);
    const previewTraces = infernalTraces(roster, true);

    expect(previewTraces.some((trace) => trace.status === 'potential')).toBe(true);
    expect(JSON.stringify(roster.vaeldra!.habitLevels)).toBe(before);
    expect(infernalTraces(roster).some((trace) => trace.status !== 'inactive' && trace.status !== 'blocked')).toBe(false);

    roster.vaeldra!.starRank = 8;
    expect(infernalTraces(roster, true).some((trace) => trace.status !== 'inactive' && trace.status !== 'blocked')).toBe(true);
    expect(infernalTraces(roster).some((trace) => trace.status !== 'inactive' && trace.status !== 'blocked')).toBe(true);
    expect(roster.vaeldra!.habitLevels[infernalForce.id]).toBeNull();
  });

  it('keeps local roster import and export stable without writing derived defaults', () => {
    const roster = selectedRoster(['daemoros'], 10);
    const exported = serializeRosterExport(roster);
    const imported = validateRosterImport(exported, dragons);

    expect(exported).toContain(`"${phantomsVeil.id}": null`);
    expect(imported.ok).toBe(true);
    expect(imported.roster?.daemoros!.habitLevels[phantomsVeil.id]).toBeNull();
    expect(resolveEffectiveHabitLevelForAbility(phantomsVeil, imported.roster?.daemoros)).toBe(1);
  });
});
