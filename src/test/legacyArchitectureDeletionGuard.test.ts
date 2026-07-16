/// <reference types="node" />

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { AbilityDefinition } from '../models/dragon';
import { createEmptyRoster } from '../services/rosterStorage';
import { metadataOnlyDragonIds, simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';

const repoRoot = join(__dirname, '..', '..');

const retiredFiles = [
  'src/services/effectCapabilities.ts',
  'src/services/formationCardAnalysis.ts',
  'src/services/normalUnmetRequirements.ts',
  'src/services/synergyEngine.ts',
  'src/services/synergyTrace.ts',
  'src/models/synergy.ts',
  'src/data/synergyRules.ts',
  'scripts/report-synergy-framework.mjs',
];

const retiredModuleSpecifiers = [
  'effectCapabilities',
  'formationCardAnalysis',
  'normalUnmetRequirements',
  'synergyEngine',
  'synergyTrace',
  '../models/synergy',
  './synergyRules',
  'report-synergy-framework',
];

const executionOnlyAbilityFields = [
  'schedules',
  'triggerChanceFixed',
  'triggerChanceByHabitLevel',
  'activationRoll',
  'attempts',
  'repeat',
  'targetPriority',
  'targetScope',
  'targetSelection',
  'targetSelectionGroup',
  'candidateGroups',
  'targetReference',
  'battleContext',
  'durationRounds',
  'effectOptions',
  'stackTransitionTrigger',
  'scheduleOverrides',
  'effectsAdded',
  'schedulesAdded',
  'rankedValues',
  'powerByHabitLevel',
  'augmentations',
  'unresolvedQuestions',
];

describe('legacy combat-analysis architecture deletion guard', () => {
  it('keeps retired production files deleted', () => {
    for (const file of retiredFiles) {
      expect(existsSync(join(repoRoot, file)), `${file} should not exist`).toBe(false);
    }
  });

  it('prevents imports of retired modules in current TypeScript', () => {
    const files = collectFiles(join(repoRoot, 'src')).filter(
      (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('legacyArchitectureDeletionGuard.test.ts'),
    );
    const importPattern = /\b(?:import|export)\b[\s\S]*?\bfrom\s+['"]([^'"]+)['"]/g;

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(importPattern)) {
        const specifier = match[1]!;
        for (const retired of retiredModuleSpecifiers) {
          expect(specifier.includes(retired), `${file} imports retired module ${specifier}`).toBe(false);
        }
      }
    }
  });

  it('keeps canonical ability objects free of execution-only fields', () => {
    for (const ability of allAbilities()) {
      for (const field of executionOnlyAbilityFields) {
        expect(Object.hasOwn(ability, field), `${ability.id} still has ${field}`).toBe(false);
      }
    }
  });

  it('preserves detailed ability wording and simple profile references', () => {
    const detailed = dragons.filter((dragon) => dragon.command && dragon.trait && dragon.habits.length > 0);
    const abilityIds = new Set(allAbilities().map((ability) => ability.id));
    const signalIds = new Set(
      simpleSynergyProfiles.flatMap((profile) => [
        ...profile.outputs,
        ...profile.supports,
        ...profile.benefitsFrom,
        ...profile.positionClaims,
      ]).map((signal) => signal.id),
    );

    expect(dragons).toHaveLength(31);
    expect(detailed).toHaveLength(25);
    expect(simpleSynergyProfiles).toHaveLength(25);
    expect(metadataOnlyDragonIds).toHaveLength(6);

    for (const dragon of detailed) {
      expect(dragon.command?.rawDescription?.trim()).toBeTruthy();
      expect(dragon.trait?.rawDescription?.trim()).toBeTruthy();
      expect(dragon.habits.length).toBeGreaterThan(0);
      expect(dragon.habits.every((habit) => habit.rawDescription?.trim())).toBe(true);
    }

    for (const profile of simpleSynergyProfiles) {
      for (const signal of [...profile.outputs, ...profile.supports, ...profile.benefitsFrom, ...profile.positionClaims]) {
        expect(abilityIds.has(signal.abilityId), `${profile.dragonId} references ${signal.abilityId}`).toBe(true);
      }
    }

    for (const review of simpleSynergyAbilityReviews) {
      expect(abilityIds.has(review.abilityId), `audit references ${review.abilityId}`).toBe(true);
      if (review.disposition.kind === 'represented' || review.disposition.kind === 'reinforces-existing') {
        for (const signalId of review.disposition.signalIds) {
          expect(signalIds.has(signalId), `audit references ${signalId}`).toBe(true);
        }
      }
    }
  });

  it('keeps saved Habit Level keys compatible with real Habit IDs', () => {
    const roster = createEmptyRoster(dragons);

    for (const dragon of dragons) {
      const habitIds = new Set(dragon.habits.map((habit) => habit.id));
      expect(Object.keys(roster[dragon.id]!.habitLevels).sort()).toEqual([...habitIds].sort());
    }
  });
});

function allAbilities(): AbilityDefinition[] {
  return dragons.flatMap((dragon) =>
    ([dragon.command, dragon.trait, ...dragon.habits] as Array<AbilityDefinition | null>).filter(
      (ability): ability is AbilityDefinition => ability !== null,
    ),
  );
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}
