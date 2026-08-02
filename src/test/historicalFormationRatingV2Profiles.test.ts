import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_FORMATION_RATING_V2_PROFILE_COUNT,
  HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_IDENTITY,
  HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SCHEMA_VERSION,
  HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SOURCE_COMMIT,
  HISTORICAL_FORMATION_RATING_V2_SIGNAL_COUNT,
  historicalFormationRatingV2Profiles,
} from '../audit/historicalFormationRatingV2Profiles';
import { runFullRosterAudit } from '../audit/fullRosterAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';
import type { DragonSynergyProfile } from '../synergy/types';

describe('immutable historical Formation Rating v2 profile input', () => {
  it('is a separately loaded, deeply frozen base-commit artifact', () => {
    const moduleSource = readFileSync(resolve(
      process.cwd(),
      'src/audit/historicalFormationRatingV2Profiles.ts',
    ), 'utf8');
    expect(moduleSource).not.toContain('simpleSynergyProfiles');
    expect(moduleSource).not.toContain("../synergy/profiles");
    expect(historicalFormationRatingV2Profiles).not.toBe(simpleSynergyProfiles);
    expect(Object.isFrozen(historicalFormationRatingV2Profiles)).toBe(true);
    for (const historical of historicalFormationRatingV2Profiles) {
      const current = simpleSynergyProfiles.find(({ dragonId }) => dragonId === historical.dragonId)!;
      expect(historical).not.toBe(current);
      expect(historical.outputs).not.toBe(current.outputs);
      expect(Object.isFrozen(historical)).toBe(true);
      expect([...historical.outputs, ...historical.supports, ...historical.benefitsFrom]
        .every(Object.isFrozen)).toBe(true);
    }
    expect(frozenInputIdentity()).toBe(HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_IDENTITY);
  });

  it('does not change when a current Syrax selector changes', () => {
    const current = simpleSynergyProfiles as DragonSynergyProfile[];
    const signal = current.find(({ dragonId }) => dragonId === 'syrax')!.outputs
      .find(({ id }) => id === 'syrax-blazing-fury-first-strike')!;
    const original = signal.recipientSelector;
    const before = frozenInputIdentity();
    try {
      signal.recipientSelector = {
        kind: 'capability-priority-one',
        priorityTag: 'damage:physical',
        recipientCount: 1,
        includeSelf: false,
        selectionGroupId: 'test-current-only-selector-change',
      };
      expect(frozenInputIdentity()).toBe(before);
    } finally {
      signal.recipientSelector = original;
    }
  });

  it('does not change when another current dragon profile changes', () => {
    const current = simpleSynergyProfiles as DragonSynergyProfile[];
    const signal = current.find(({ dragonId }) => dragonId === 'caraxes')!.outputs[0]!;
    const original = signal.description;
    const before = frozenInputIdentity();
    try {
      signal.description = 'test-only current Caraxes profile change';
      expect(frozenInputIdentity()).toBe(before);
    } finally {
      signal.description = original;
    }
  });

  it('keeps current v3 selectors separate from the historical v2 input', () => {
    const historicalSyrax = historicalFormationRatingV2Profiles
      .find(({ dragonId }) => dragonId === 'syrax')!;
    const currentSyrax = simpleSynergyProfiles.find(({ dragonId }) => dragonId === 'syrax')!;
    expect(historicalSyrax.outputs
      .find(({ id }) => id === 'syrax-blazing-fury-first-strike')?.recipientSelector)
      .toBeUndefined();
    expect(historicalSyrax.supports
      .find(({ id }) => id === 'syrax-blazing-fury-fire-support')?.recipientSelector)
      .toBeUndefined();
    expect(currentSyrax.outputs
      .find(({ id }) => id === 'syrax-blazing-fury-first-strike')?.recipientSelector)
      .toMatchObject({
        kind: 'capability-priority-one',
        selectionGroupId: 'syrax-blazing-fury-recipient',
      });
  });

  it('runs the historical full-roster audit with the immutable input metadata', () => {
    const report = runFullRosterAudit();
    expect(report.formationSweep.historicalProfileInput).toEqual({
      schemaVersion: HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SCHEMA_VERSION,
      sourceCommit: HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SOURCE_COMMIT,
      deterministicInputHash: HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_IDENTITY,
      profileCount: HISTORICAL_FORMATION_RATING_V2_PROFILE_COUNT,
      signalCount: HISTORICAL_FORMATION_RATING_V2_SIGNAL_COUNT,
    });
    expect(report.formationSweep.deterministicFullResultHash).toBe(
      '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf',
    );
  }, 120_000);
});

function frozenInputIdentity(): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({
    schemaVersion: HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SCHEMA_VERSION,
    sourceCommit: HISTORICAL_FORMATION_RATING_V2_PROFILE_INPUT_SOURCE_COMMIT,
    profiles: historicalFormationRatingV2Profiles,
  })).digest('hex')}`;
}
