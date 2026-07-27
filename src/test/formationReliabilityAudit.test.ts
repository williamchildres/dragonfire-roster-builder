import { describe, expect, it } from 'vitest';

import {
  FORMATION_RELIABILITY_AUDIT_CONTRACT,
  runFormationReliabilityAudit,
} from '../audit/formationReliabilityAudit';

describe('Formation Reliability research audit', () => {
  it('covers all 33 profiles and every current scoring signal deterministically', () => {
    const first = runFormationReliabilityAudit();
    const second = runFormationReliabilityAudit();

    expect(first.auditContract).toBe(FORMATION_RELIABILITY_AUDIT_CONTRACT);
    expect(first.totals).toMatchObject({
      dragons: 33,
      curatedSignals: 239,
      scoringSignals: 234,
      explicitlyNonScoringSignals: 5,
      positionClaims: 33,
      signalsMissingProposedReliabilityCoverage: 0,
    });
    expect(first.signals).toHaveLength(239);
    expect(new Set(first.signals.map((signal) => signal.signalId)).size).toBe(239);
    expect(first.deterministicHash).toBe(second.deterministicHash);
    expect(first).toEqual(second);
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
    const complete = report.signals.filter(
      (signal) =>
        signal.probability.kind !== 'none' &&
        signal.opportunityCount.kind === 'exact' &&
        signal.rollScope !== 'unresolved' &&
        signal.independence === 'not-applicable',
    );

    expect(complete.map((signal) => signal.signalId)).toEqual([
      'malachite-lightning-strike-first-strike',
      'malachite-lightning-strike-strength',
    ]);
    expect(
      report.totals.signalsWithCompleteSupportedProbabilityOpportunityScopeAndIndependence,
    ).toBe(2);
  });
});
