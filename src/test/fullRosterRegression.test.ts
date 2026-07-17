import { describe, expect, it } from 'vitest';

import { runFullRosterAudit } from '../audit/fullRosterAudit';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { CONTROL_ALIAS_TAGS, SYNERGY_TAGS, tagSatisfies } from '../synergy/tags';
import type { SimpleFormation, SimpleProgressionByDragonId } from '../synergy/types';

const maxProgression: SimpleProgressionByDragonId = Object.fromEntries(
  simpleSynergyProfiles.map((profile, index) => [
    profile.dragonId,
    {
      starRank: 10,
      dragonLevel: 16,
      combatStats: {
        strength: 100 + index,
        intelligence: 200 + index,
        instinct: 300 + index,
        initiative: 400 + index,
      },
    },
  ]),
);

function resultsFor(formation: SimpleFormation) {
  return evaluateFormation({
    formation,
    progression: maxProgression,
    profiles: simpleSynergyProfiles,
  }).results;
}

function activeRelationships(formation: SimpleFormation) {
  return resultsFor(formation).filter(
    (result) => result.kind === 'setup-payoff' || result.kind === 'amplifier-output',
  );
}

describe('full-roster regression audit', () => {
  it('audits all canonical data, profiles, progression states, provider/payoff pairs, and ordered formations', () => {
    const report = runFullRosterAudit();

    expect(report.reliable).toBe(true);
    expect(report.generatedFrom).toEqual({
      databaseVersion: '0.6.8',
      dataSchemaVersion: 13,
      localRosterSchemaVersion: 4,
    });
    expect(report.rarityCoverage).toEqual({ Epic: 10, Legendary: 9, Rare: 12 });
    expect(report.totals.dragons).toBe(31);
    expect(report.totals.abilities).toBe(217);
    expect(report.totals.auditDispositions).toBe(217);
    expect(report.totals.orderedFormationsEvaluated).toBe(26_970);
    expect(report.totals.progressionStatesEvaluated).toBeGreaterThan(0);
    expect(report.totals.providerPayoffPairsEvaluated).toBeGreaterThan(0);
    expect(report.totals.failedChecks).toBe(1);
    expect(report.checks.find((check) => check.id === 'FRR-C030')?.status).toBe('FAIL');
    expect(report.findings.some((finding) => finding.id === 'FRR-F003')).toBe(true);
    expect(report.perDragon).toHaveLength(31);
    expect(report.perDragon.every((row) => row.status === 'PASS')).toBe(true);
    expect(report.formationSweep.deterministicFullResultHash).toMatch(/^[a-f0-9]{64}$/);
  }, 120_000);

  it('keeps the verified Control alias family exact and prohibits unrelated status/damage aliases', () => {
    const aliases = SYNERGY_TAGS.filter(
      (tag) => tag !== 'status:control' && tagSatisfies(tag, 'status:control'),
    );
    expect(aliases).toEqual([...CONTROL_ALIAS_TAGS]);
    expect(tagSatisfies('status:bleed', 'damage:physical')).toBe(false);
    expect(tagSatisfies('status:burn', 'damage:fire')).toBe(false);
    expect(tagSatisfies('damage:fire', 'status:burn')).toBe(false);
    expect(tagSatisfies('status:panic', 'damage:tactical')).toBe(false);
    expect(tagSatisfies('status:first-strike', 'status:control')).toBe(false);
    expect(tagSatisfies('status:slow', 'status:control')).toBe(false);
    expect(tagSatisfies('effect:recovery', 'effect:recovery-received')).toBe(false);
  });

  it.each([
    [
      'Caraxes/Syrax First-Strike',
      { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'feskar' },
      'status:first-strike',
      'setup-payoff',
      1,
    ],
    [
      'Bleed/Arrax',
      { 'left-flank': 'kalspire', vanguard: 'arrax', 'right-flank': 'feskar' },
      'status:bleed',
      'setup-payoff',
      1,
    ],
    [
      'Shadowrend/Jagadrix Panic',
      { 'left-flank': 'shadowrend', vanguard: 'jagadrix', 'right-flank': 'feskar' },
      'status:panic',
      'setup-payoff',
      1,
    ],
    [
      'Vesper/Antares Slow',
      { 'left-flank': 'vesper', vanguard: 'antares', 'right-flank': 'feskar' },
      'status:slow',
      'setup-payoff',
      1,
    ],
    [
      'Vesper/Syrax Slow',
      { 'left-flank': 'vesper', vanguard: 'syrax', 'right-flank': 'feskar' },
      'status:slow',
      'setup-payoff',
      1,
    ],
  ] as const)(
    'keeps anchor relationship %s singular and specific',
    (_name, formation, tag, kind, count) => {
      expect(
        activeRelationships(formation).filter(
          (result) => result.kind === kind && result.tag === tag,
        ),
      ).toHaveLength(count);
    },
  );

  it('keeps Vesper Confusion as one Control path and Dawnseeker First-Strike outside Control', () => {
    const control = activeRelationships({
      'left-flank': 'vesper',
      vanguard: 'rhysarion',
      'right-flank': 'feskar',
    }).filter(
      (result) =>
        result.kind === 'setup-payoff' &&
        result.tag === 'status:control' &&
        result.dragonIds[0] === 'vesper' &&
        result.dragonIds[1] === 'rhysarion',
    );
    expect(control).toHaveLength(1);
    expect(
      activeRelationships({
        'left-flank': 'dawnseeker',
        vanguard: 'rhysarion',
        'right-flank': 'feskar',
      }).filter(
        (result) => result.tag === 'status:control' && result.dragonIds[0] === 'dawnseeker',
      ),
    ).toHaveLength(0);
  });

  it('suppresses self relationships and duplicate semantic relationships across representative edge cases', () => {
    const formations: SimpleFormation[] = [
      { 'left-flank': 'nyrena', vanguard: 'antares', 'right-flank': 'caraxes' },
      { 'left-flank': 'dawnseeker', vanguard: 'shimmer', 'right-flank': 'syrax' },
      { 'left-flank': 'thunderstrike', vanguard: 'rhysarion', 'right-flank': 'arrax' },
    ];
    for (const formation of formations) {
      const relationships = activeRelationships(formation);
      expect(relationships.every((result) => result.dragonIds[0] !== result.dragonIds[1])).toBe(
        true,
      );
      expect(
        new Set(
          relationships.map(
            (result) => `${result.kind}:${result.dragonIds.join('>')}:${result.tag}`,
          ),
        ).size,
      ).toBe(relationships.length);
    }
  });

  it.todo('FRR-F001: resolve group-recipient signals only after canonical target evidence exists');
  it.todo(
    'FRR-F002: resolve highest-stat recipients only when canonical combat-stat values have a unique known maximum',
  );
  it.todo(
    'FRR-F003: exclude locked and position-inactive ability references from active aggregated relationships',
  );
  it.todo('FRR-F004: make Details At a glance progression-aware for locked future signals');
  it.todo('FRR-F005: wrap long Details headings and technical labels without descendant overflow');
  it.todo('FRR-F006: keep About coverage copy consistent with the 31/31 roster baseline');
});
