import { describe, expect, it } from 'vitest';
import type { SynergyTrace } from '../models/synergy';
import { dedupeFinalTechnicalAnalysisTraces } from '../services/synergyTrace';

function trace(overrides: Partial<SynergyTrace> = {}): SynergyTrace {
  return {
    id: 'trace-1',
    ruleId: 'incoming-effect-amplification',
    status: 'active',
    confidence: 'confirmed',
    sourceDragonId: 'source-dragon',
    sourceAbilityId: 'source-ability-a',
    recipientDragonId: 'recipient-a',
    recipientAbilityId: 'recipient-mechanic',
    title: 'Synthetic trace',
    explanation: 'Synthetic trace for structural dedupe tests.',
    requirements: [
      {
        id: 'targeting',
        label: 'Provider targeting',
        expected: 'recipient-a',
        actual: 'recipient-a',
        satisfied: true,
        evidenceIds: ['evidence-a'],
        notes: [],
      },
    ],
    matchedFacts: ['Source effect ID: source-effect-a.', 'Selected-target group: group-a.'],
    effects: ['Recovery Received +20%.'],
    conflicts: [],
    assumptions: [],
    unresolvedQuestions: [],
    sourceEvidenceIds: ['evidence-a'],
    recipientEvidenceIds: ['evidence-b'],
    providedEffectType: 'Recovery',
    recipientModifierType: 'Recovery Received Up',
    recipientModifierAbilityId: 'recipient-mechanic',
    recipientModifierValue: 20,
    combatLogConfirmed: true,
    exactResultKnown: false,
    exactResultUnknownReason: 'Exact final Recovery amount is unknown.',
    matchKind: 'incoming-effect-amplification',
    channel: 'recovery',
    modifierRole: 'ally-support',
    targetSelectorSummary: 'ally; any-lane; eligible; 2 targets',
    modifierSelfOnly: false,
    availabilityContext: 'available',
    modifierCapabilityId: 'modifier-a',
    modifierCapabilityIds: ['modifier-a'],
    matchedOutputCapabilityIds: ['output-a'],
    sourceScopeResults: [
      {
        modifierCapabilityId: 'modifier-a',
        outputCapabilityId: 'output-a',
        channel: 'recovery',
        sourceScopeCompatible: true,
        requirements: [],
        status: 'active',
        confidence: 'confirmed',
      },
    ],
    interactionScope: 'cross-dragon',
    damageScope: null,
    targetSelectionGroup: {
      targetCount: 2,
      eligibleRecipientDragonIds: ['recipient-a', 'recipient-b'],
      selectionUncertain: false,
      selection: 'eligible',
      selectionStat: null,
      selectionResource: null,
      comparisonDirection: null,
      comparisonPool: null,
    },
    ...overrides,
  };
}

describe('final Technical Analysis structural dedupe', () => {
  it('keeps the first identical trace and preserves materially distinct traces', () => {
    const base = trace();
    expect(dedupeFinalTechnicalAnalysisTraces([base, { ...base, id: 'trace-duplicate' }])).toEqual([base]);

    expect(dedupeFinalTechnicalAnalysisTraces([base, trace({ recipientDragonId: 'recipient-b', id: 'recipient-change' })])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([base, trace({ sourceAbilityId: 'source-ability-b', id: 'source-change' })])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([base, trace({ matchedOutputCapabilityIds: ['output-b'], id: 'output-change' })])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([base, trace({ channel: 'fire-damage', id: 'channel-change' })])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([base, trace({ interactionScope: 'enemy-side', recipientDragonId: null, id: 'scope-change' })])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([
      base,
      trace({
        id: 'target-group-change',
        targetSelectionGroup: {
          ...base.targetSelectionGroup!,
          eligibleRecipientDragonIds: ['recipient-a', 'recipient-c'],
        },
      }),
    ])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([base, trace({ status: 'potential', id: 'status-change' })])).toHaveLength(2);
    expect(dedupeFinalTechnicalAnalysisTraces([
      base,
      trace({
        id: 'source-scope-change',
        sourceScopeResults: [
          {
            modifierCapabilityId: 'modifier-a',
            outputCapabilityId: 'output-a',
            channel: 'recovery',
            sourceScopeCompatible: false,
            requirements: [],
            status: 'inactive',
            confidence: 'confirmed',
          },
        ],
      }),
    ])).toHaveLength(2);
  });
});
