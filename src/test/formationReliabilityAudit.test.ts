import { describe, expect, it } from 'vitest';

import {
  assertExplicitReliabilityClassificationCoverage,
  FORMATION_RELIABILITY_AUDIT_CONTRACT,
  getExplicitScoringReliabilityClassifications,
  getMissingExplicitReliabilityClassificationIds,
  isCompleteSupportedReliabilityEvidence,
  runFormationReliabilityAudit,
} from '../audit/formationReliabilityAudit';

describe('Formation Reliability research audit', () => {
  it('covers all 34 profiles and every current scoring signal deterministically', () => {
    const first = runFormationReliabilityAudit();
    const second = runFormationReliabilityAudit();

    expect(first.auditContract).toBe(FORMATION_RELIABILITY_AUDIT_CONTRACT);
    expect(first.totals).toMatchObject({
      dragons: 34,
      curatedSignals: 254,
      scoringSignals: 245,
      explicitlyNonScoringSignals: 9,
      positionClaims: 34,
      signalsMissingProposedReliabilityCoverage: 0,
    });
    expect(first.signals).toHaveLength(254);
    expect(new Set(first.signals.map((signal) => signal.signalId)).size).toBe(254);
    expect(first.missingProposedReliabilitySignalIds).toEqual([]);
    expect(first.deterministicHash).toBe(second.deterministicHash);
    expect(first).toEqual(second);
  });

  it('requires an explicit classification for all 245 scoring signals', () => {
    const report = runFormationReliabilityAudit();
    const scoringSignalIds = report.signals
      .filter((signal) => signal.classification !== 'not-applicable-to-activation-reliability')
      .map((signal) => signal.signalId);
    const classifications = getExplicitScoringReliabilityClassifications();

    expect(classifications.size).toBe(245);
    expect(getMissingExplicitReliabilityClassificationIds(scoringSignalIds)).toEqual([]);

    const omittedClassification = new Map(classifications);
    omittedClassification.delete('velar-breath-of-renewal-recovery');
    expect(
      getMissingExplicitReliabilityClassificationIds(scoringSignalIds, omittedClassification),
    ).toEqual(['velar-breath-of-renewal-recovery']);
    expect(() =>
      assertExplicitReliabilityClassificationCoverage(scoringSignalIds, omittedClassification),
    ).toThrowError(
      'Scoring signals missing explicit reliability classification: velar-breath-of-renewal-recovery.',
    );
  });

  it('never treats an unregistered scoring signal as guaranteed', () => {
    expect(getMissingExplicitReliabilityClassificationIds(['synthetic-unregistered'])).toEqual([
      'synthetic-unregistered',
    ]);
    expect(() =>
      assertExplicitReliabilityClassificationCoverage(['synthetic-unregistered']),
    ).toThrowError(
      'Scoring signals missing explicit reliability classification: synthetic-unregistered.',
    );
  });

  it('keeps the five explicitly non-scoring signals separately represented', () => {
    const report = runFormationReliabilityAudit();
    const nonScoring = report.signals
      .filter((signal) => signal.classification === 'not-applicable-to-activation-reliability')
      .map((signal) => signal.signalId);

    expect(nonScoring).toEqual([
      'dawnseeker-unbroken-devotion-recovery-received',
      'moondancer-eclipsing-strike-damage-down',
      'moondancer-eclipsing-strike-initiative-down',
      'moondancer-rising-tide-self',
      'moondancer-warriors-zeal-self-physical',
      'nyrena-champions-brilliance-right-defense',
      'nyrena-the-long-siege-physical-defense',
      'rhysarion-unbroken-devotion-recovery',
      'shimmer-unbroken-devotion-recovery',
    ]);
  });

  it('keeps mixed ability components separate and does not infer independence', () => {
    const report = runFormationReliabilityAudit();
    const byId = new Map(report.signals.map((signal) => [signal.signalId, signal]));

    expect(byId.get('velar-gales-of-power-first-strike')).toMatchObject({
      classification: 'known-repeated-opportunity-chance',
      probability: { byHabitLevel: [0.12, 0.144, 0.168, 0.204, 0.24] },
      rollScope: 'separate-per-target-and-effect',
      separatePerTarget: true,
      separatePerEffect: true,
      opportunityPresence: 'conditional',
      independence: 'unknown',
    });
    expect(byId.get('velar-breath-of-renewal-recovery')).toMatchObject({
      classification: 'guaranteed',
      probability: { kind: 'none' },
    });
    expect(byId.get('shimmer-unbreakable-loyalty-instinct-payoff')).toMatchObject({
      classification: 'mixed-guaranteed-and-chance-based-ability',
      reliabilityComponentIds: [
        'shimmer-unbreakable-loyalty:chance-command-buffs',
        'shimmer-unbreakable-loyalty:scheduled-tactical-damage',
        'shimmer-unbreakable-loyalty:scheduled-recovery',
      ],
    });
  });

  it('identifies only evidence-complete single-opportunity chance components as complete', () => {
    const report = runFormationReliabilityAudit();
    const complete = report.signals.filter(isCompleteSupportedReliabilityEvidence);

    expect(complete.map((signal) => signal.signalId)).toEqual([
      'malachite-lightning-strike-first-strike',
      'malachite-lightning-strike-strength',
    ]);
    expect(
      report.totals.signalsWithCompleteSupportedProbabilityOpportunityScopeAndIndependence,
    ).toBe(2);
  });

  it('requires supported opportunity presence and count-aware independence for complete evidence', () => {
    const base = {
      probability: { kind: 'fixed' as const, fixed: 0.2 },
      opportunityPresence: 'guaranteed-at-least-one' as const,
      opportunityCount: { kind: 'exact' as const, value: 1 },
      rollScope: 'single-shared-roll' as const,
      independence: 'not-applicable' as const,
    };

    expect(isCompleteSupportedReliabilityEvidence(base)).toBe(true);
    expect(
      isCompleteSupportedReliabilityEvidence({
        ...base,
        opportunityCount: { kind: 'exact', value: 2 },
        independence: 'confirmed',
      }),
    ).toBe(true);
    expect(
      isCompleteSupportedReliabilityEvidence({
        ...base,
        opportunityCount: { kind: 'exact', value: 2 },
        independence: 'unknown',
      }),
    ).toBe(false);
    expect(
      isCompleteSupportedReliabilityEvidence({
        ...base,
        opportunityPresence: 'conditional',
      }),
    ).toBe(false);
    expect(
      isCompleteSupportedReliabilityEvidence({
        ...base,
        opportunityPresence: 'unknown',
      }),
    ).toBe(false);
  });
});
