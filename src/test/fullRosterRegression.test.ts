import { describe, expect, it } from 'vitest';

import { buildDragonDetailPresentation } from '../app/dragonDetailPresentation';
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

let auditReport: ReturnType<typeof runFullRosterAudit> | undefined;

function report() {
  auditReport ??= runFullRosterAudit();
  return auditReport;
}

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
    const result = report();

    expect(result.reliable).toBe(true);
    expect(result.generatedFrom).toEqual({
      databaseVersion: '0.23.3',
      dataSchemaVersion: 13,
      localRosterSchemaVersion: 5,
    });
    expect(result.rarityCoverage).toEqual({ Epic: 11, Legendary: 10, Rare: 12 });
    expect(result.totals).toMatchObject({
      dragons: 33,
      abilities: 231,
      profileSignals: 239,
      positionClaims: 33,
      auditDispositions: 231,
      progressionStatesEvaluated: 16_320,
      providerPayoffPairsEvaluated: 4_563,
      orderedFormationsEvaluated: 32_736,
      passChecks: 32,
      failedChecks: 0,
    });
    expect(result.checks.find((check) => check.id === 'FRR-C030')?.status).toBe('PASS');
    expect(result.findings.map((finding) => finding.id)).toEqual(['FRR-F001', 'FRR-F002']);
    expect(result.perDragon).toHaveLength(33);
    expect(result.perDragon.every((row) => row.status === 'PASS')).toBe(true);
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
      { 'left-flank': 'syrax', vanguard: 'caraxes', 'right-flank': 'vhagar' },
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
  it('commits the intentionally changed Formation Rating v2 deterministic baseline', () => {
    const sweep = report().formationSweep;

    expect(sweep.invariantViolationCount).toBe(0);
    expect(sweep.inactiveAbilityReferenceExamples).toEqual([]);
    expect(sweep.deterministicFullResultHash).toBe(
      '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf',
    );
    expect(sweep.rating).toMatchObject({
      minimum: 0,
      maximum: 100,
      median: 50,
      percentile90: 67,
      percentile99: 80,
      byTier: {
        Developing: 13_404,
        Excellent: 421,
        Solid: 13_366,
        Strong: 3_481,
        Weak: 2_064,
      },
    });
  }, 120_000);

  it('accounts for one reachable recommendation outcome for every ordered formation', () => {
    const distribution = report().formationSweep.recommendationSuppressionReasonDistribution;

    expect(distribution).toEqual({
      'action:swap': 17_113,
      'below-meaningful-threshold': 5_175,
      'current-best': 2_790,
      'tied-best': 7_658,
    });
    expect(Object.values(distribution).reduce((total, count) => total + count, 0)).toBe(32_736);
  }, 120_000);

  it('FRR-F004: qualifies future Details signals at their Star and Dragon Level boundaries', () => {
    const dawnseeker = simpleSynergyProfiles.find((profile) => profile.dragonId === 'dawnseeker')!;
    const vesper = simpleSynergyProfiles.find((profile) => profile.dragonId === 'vesper')!;
    const dawnAtNine = buildDragonDetailPresentation(dawnseeker, {
      starRank: 9,
      dragonLevel: 15,
    });
    const vesperAtNine = buildDragonDetailPresentation(vesper, {
      starRank: 9,
      dragonLevel: 16,
    });

    expect(dawnAtNine.lockedProvides.join(' ')).toMatch(/First-Strike.*10★/);
    expect(dawnAtNine.lockedProvides.join(' ')).toMatch(/Fire Damage support.*Dragon Level 16/);
    expect(vesperAtNine.lockedProvides.join(' ')).toMatch(/Confusion.*10★/);
    expect(vesperAtNine.lockedProvides.join(' ')).toMatch(/Control.*10★/);
  });

  it('FRR-F005: keeps the reusable scoped Details wrapping regression active', async () => {
    const css = await import('../styles/global.css?raw').then((module) => module.default);
    expect(css).toContain('.details-dialog :where(');
    expect(css).toContain('overflow-wrap: anywhere;');
    expect(css).toContain('word-break: break-word;');
  });

  it('FRR-F006: records complete About coverage copy', async () => {
    const source = await import('../app/App.tsx?raw').then((module) => module.default);
    expect(source).toContain('productMetrics.detailedDragonCount');
    expect(source).toContain('dragons with detailed coverage');
    expect(source).not.toContain('All 31 known dragons');
  });
});
