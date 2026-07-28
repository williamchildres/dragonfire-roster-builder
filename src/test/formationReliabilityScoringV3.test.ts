import { describe, expect, it } from 'vitest';

import {
  evaluateBindingReliability,
  evaluateComponentReliability,
  evaluateReliabilityPath,
  cumulativeIndependentVaryingActivationProbability,
  formationReliabilityBindings,
  formationReliabilityComponents,
  type AbilityReliabilityComponent,
  type BindingReliabilityTrace,
  type ComponentReliabilityTrace,
  type ReliabilityProgression,
  type SignalReliabilityBinding,
  type SignalReliabilityPath,
} from '../synergy/reliability';
import {
  combineProviderBeneficiaryReliability,
  reliabilityRequirementId,
  setupPayoffConditionProofRequirementIds,
} from '../synergy/reliability/scoring';
import type { EnrichedRelationshipCandidate } from '../synergy/types';

const componentsById = new Map<string, AbilityReliabilityComponent>(
  formationReliabilityComponents.map((component) => [component.id, component]),
);
const bindingsById = new Map(
  formationReliabilityBindings.map((binding) => [binding.signalId, binding]),
);

describe('Formation Rating v3 component quantification', () => {
  it('computes constant and varying confirmed-independent activation', () => {
    expect(cumulativeIndependentVaryingActivationProbability([0.2])).toBeCloseTo(0.2);
    expect(cumulativeIndependentVaryingActivationProbability([0])).toBe(0);
    expect(cumulativeIndependentVaryingActivationProbability([1])).toBe(1);
    expect(cumulativeIndependentVaryingActivationProbability([0.2, 0.2])).toBeCloseTo(0.36);
    expect(cumulativeIndependentVaryingActivationProbability([0.2, 0.2, 0.2, 0.2])).toBeCloseTo(
      0.5904,
    );
    expect(cumulativeIndependentVaryingActivationProbability([0.4, 0.2])).toBeCloseTo(0.52);
    expect(() => cumulativeIndependentVaryingActivationProbability([])).toThrow();
    expect(() => cumulativeIndependentVaryingActivationProbability([1.1])).toThrow();
  });

  it('credits exact repeated opportunities only with confirmed independence', () => {
    const component: AbilityReliabilityComponent = {
      id: 'test-command:independent-rolls',
      sourceAbilityId: 'test-command',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: { kind: 'fixed', value: 0.2 },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: { kind: 'start-of-combat' },
      opportunityCount: { kind: 'exact', value: 2 },
      rollScope: 'per-effect',
      independence: 'confirmed',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['test'],
        unresolvedQuestions: [],
      },
    };
    const cumulative = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression(),
    });
    const conservative = evaluateComponentReliability({
      component: { ...component, independence: 'unknown' },
      reference: { componentId: component.id },
      progression: progression(),
    });
    expect(cumulative.quantification).toMatchObject({
      status: 'quantified',
      method: 'confirmed-cumulative',
    });
    expect(
      cumulative.quantification.status === 'quantified'
        ? cumulative.quantification.reliability
        : null,
    ).toBeCloseTo(0.36);
    expect(conservative.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.2,
      method: 'one-supported-opportunity',
    });
  });

  it('repeats one fixed probability across four exact confirmed-independent rolls', () => {
    const result = evaluateComponentReliability({
      component: chanceComponent('test-command:fixed-four', {
        probability: { kind: 'fixed', value: 0.2 },
        opportunityCount: { kind: 'exact', value: 4 },
        independence: 'confirmed',
      }),
      reference: { componentId: 'test-command:fixed-four' },
      progression: progression(),
    });
    expect(result.resolvedProbabilities).toEqual([0.2, 0.2, 0.2, 0.2]);
    expect(result.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.5903999999999999,
      method: 'confirmed-cumulative',
    });
  });

  it('uses every varying round probability in a complete exact schedule', () => {
    const result = evaluateComponentReliability({
      component: chanceComponent('test-command:round-varying', {
        probability: {
          kind: 'round-specific',
          byRound: {
            1: { kind: 'fixed', value: 0.4 },
            2: { kind: 'fixed', value: 0.2 },
          },
        },
        timing: { kind: 'scheduled-rounds', rounds: [1, 2] },
        opportunityCount: { kind: 'exact', value: 2 },
        independence: 'confirmed',
      }),
      reference: { componentId: 'test-command:round-varying' },
      progression: progression(),
    });
    expect(result.resolvedProbabilities).toEqual([0.4, 0.2]);
    expect(result.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.52,
      method: 'confirmed-cumulative',
    });
  });

  it('does not fill an incomplete round-specific schedule with its first probability', () => {
    const result = evaluateComponentReliability({
      component: chanceComponent('test-command:round-incomplete', {
        probability: {
          kind: 'round-specific',
          byRound: { 1: { kind: 'fixed', value: 0.4 } },
        },
        timing: { kind: 'scheduled-rounds', rounds: [1, 2] },
        opportunityCount: { kind: 'exact', value: 2 },
        independence: 'confirmed',
      }),
      reference: { componentId: 'test-command:round-incomplete' },
      progression: progression(),
    });
    expect(result.resolvedProbabilities).toEqual([0.4]);
    expect(result.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'round-context-unresolved',
      conditionalProbabilities: [0.4],
    });
  });

  it('rejects an exact count that exceeds scheduled round contexts', () => {
    const result = evaluateComponentReliability({
      component: chanceComponent('test-command:round-count-mismatch', {
        probability: {
          kind: 'round-specific',
          byRound: {
            1: { kind: 'fixed', value: 0.4 },
            3: { kind: 'fixed', value: 0.2 },
          },
        },
        timing: { kind: 'scheduled-rounds', rounds: [1, 3] },
        opportunityCount: { kind: 'exact', value: 3 },
        independence: 'confirmed',
      }),
      reference: { componentId: 'test-command:round-count-mismatch' },
      progression: progression(),
    });
    expect(result.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'round-context-unresolved',
    });
  });

  it('uses only the first supported round when independence remains unknown', () => {
    const result = evaluateComponentReliability({
      component: chanceComponent('test-command:round-unknown-independence', {
        probability: {
          kind: 'round-specific',
          byRound: {
            1: { kind: 'fixed', value: 0.4 },
            2: { kind: 'fixed', value: 0.2 },
          },
        },
        timing: { kind: 'scheduled-rounds', rounds: [1, 2] },
        opportunityCount: { kind: 'exact', value: 2 },
        independence: 'unknown',
      }),
      reference: { componentId: 'test-command:round-unknown-independence' },
      progression: progression(),
    });
    expect(result.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'one-supported-opportunity',
    });
  });

  it('resolves Malachite Lightning Strike once at Habit Levels 1 and 5', () => {
    const component = componentById(
      'malachite-lightning-strike:shared-first-strike-double-strike-strength',
    );
    const levelOne = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression({
        'malachite-lightning-strike': 1,
      }),
    });
    const levelFive = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression({
        'malachite-lightning-strike': 5,
      }),
    });
    expect(levelOne.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'one-supported-opportunity',
    });
    expect(levelFive.quantification).toMatchObject({
      status: 'quantified',
      reliability: 1,
    });
  });

  it('uses Crimson Round 1 only and makes a missing active override level explicit', () => {
    const component = componentById('crimson-bloodscale-terror:stun');
    const before = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression(),
    });
    const after = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression({ 'crimson-vermins-bane': 1 }),
    });
    const missing = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression({ 'crimson-vermins-bane': null }),
    });
    expect(before.quantification).toMatchObject({ status: 'quantified', reliability: 0.2 });
    expect(after.quantification).toMatchObject({ status: 'quantified', reliability: 0.4 });
    expect(after.resolvedProbabilities).toEqual([0.4, 0.2, 0.2, 0.2, 0.2]);
    expect(missing.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'missing-habit-level',
    });
  });

  it('uses Tairax Round 1 base or Gleamstrike replacement without later credit', () => {
    const component = componentById('tairax-burning-ward:stagger');
    const before = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression(),
    });
    const after = evaluateComponentReliability({
      component,
      reference: { componentId: component.id },
      progression: progression({ 'tairax-gleamstrike': 5 }),
    });
    expect(before.quantification).toMatchObject({ status: 'quantified', reliability: 0.25 });
    expect(after.quantification).toMatchObject({ status: 'quantified', reliability: 0.5 });
    expect(after.quantification).not.toMatchObject({ method: 'confirmed-cumulative' });
  });

  it('keeps Velar Round 2 chances unquantified while preserving p in the trace', () => {
    for (const id of ['velar-gales-of-power:first-strike', 'velar-whirlwind:advantage']) {
      const component = componentById(id);
      const result = evaluateComponentReliability({
        component,
        reference: { componentId: component.id },
        progression: progression({ 'velar-gales-of-power': 5 }),
      });
      expect(result.quantification).toMatchObject({
        status: 'unquantified',
        reason: 'conditional-opportunity',
      });
      expect(result.resolvedProbabilities[0]).toBe(id.includes('gales-of-power') ? 0.24 : 0.2);
    }
  });

  it('proves only explicitly supplied conditional deterministic conditions', () => {
    const component: AbilityReliabilityComponent = {
      id: 'test-habit:follow-on',
      sourceAbilityId: 'test-habit',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable',
      timing: { kind: 'conditional-event', condition: 'Documented condition.' },
      opportunityCount: { kind: 'not-applicable' },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['test'],
        unresolvedQuestions: [],
      },
    };
    expect(
      evaluateComponentReliability({
        component,
        reference: { componentId: component.id },
        progression: progression(),
      }).quantification,
    ).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-deterministic-unproven',
    });
    expect(
      evaluateComponentReliability({
        component,
        reference: { componentId: component.id },
        progression: progression(),
        conditionProven: true,
      }).quantification,
    ).toMatchObject({ status: 'quantified', reliability: 1, method: 'condition-proven' });
  });
});

describe('Formation Rating v3 path and mixed-use evaluation', () => {
  it('resolves each explicitly selected Vaeldra contextual alternative without union probability', () => {
    const binding = bindingById('vaeldra-tempting-distraction-vulnerability');
    const lure = evaluateBindingReliability({
      binding,
      componentsById,
      progression: maxProgression(),
      conditionProvenRequirementIds: new Set([
        proofRequirement(
          'vaeldra-tempting-distraction:successful-taunt-follow-on',
          'vaeldra-tempting-distraction:successful-taunt-follow-on',
        ),
      ]),
      probabilityContextId: 'lure-taunt',
    });
    const sirensCall = evaluateBindingReliability({
      binding,
      componentsById,
      progression: maxProgression(),
      conditionProvenRequirementIds: new Set([
        proofRequirement(
          'vaeldra-tempting-distraction:successful-taunt-follow-on',
          'vaeldra-tempting-distraction:successful-taunt-follow-on',
        ),
      ]),
      probabilityContextId: 'sirens-call-taunt',
    });
    expect(lure.quantification).toMatchObject({ status: 'quantified', reliability: 0.25 });
    expect(lure.selectedPathId).toBe('lure-taunt');
    expect(sirensCall.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-opportunity',
      conditionalProbabilities: [1],
    });
    expect(sirensCall.selectedPathId).toBe('sirens-call-taunt');
    expect(lure.pathIds).toEqual(['lure-taunt', 'sirens-call-taunt']);
  });

  it('rejects ambiguous probability branches unless a context is selected', () => {
    const binding = bindingById('shadowsong-scorched-earth-vulnerable');
    const ambiguous = evaluateBindingReliability({
      binding,
      componentsById,
      progression: maxProgression(),
    });
    const selected = evaluateBindingReliability({
      binding,
      componentsById,
      progression: maxProgression(),
      probabilityContextId: 'panic-afflicted-target',
    });
    expect(ambiguous.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'probability-context-unresolved',
    });
    expect(selected.quantification.status).toBe('quantified');
    expect(selected.selectedPathId).toBe('panic-afflicted-target');
  });

  it('treats distinct-component probability contexts as ambiguous until selected', () => {
    const low = chanceComponent('test-command:context-low', {
      probability: { kind: 'fixed', value: 0.2 },
    });
    const high = chanceComponent('test-command:context-high', {
      probability: { kind: 'fixed', value: 0.6 },
    });
    const syntheticComponents = new Map([
      [low.id, low],
      [high.id, high],
    ]);
    const binding: SignalReliabilityBinding = {
      status: 'resolved',
      signalId: 'test-contextual-signal',
      bindingClass: 'chance',
      paths: [contextualPath('low-context', low.id), contextualPath('high-context', high.id)],
    };
    const ambiguous = evaluateBindingReliability({
      binding,
      componentsById: syntheticComponents,
      progression: progression(),
    });
    const lowSelected = evaluateBindingReliability({
      binding,
      componentsById: syntheticComponents,
      progression: progression(),
      probabilityContextId: 'low-context',
    });
    const highSelected = evaluateBindingReliability({
      binding,
      componentsById: syntheticComponents,
      progression: progression(),
      probabilityContextId: 'high-context',
    });
    expect(ambiguous.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'probability-context-unresolved',
      conditionalProbabilities: [0.6, 0.2],
    });
    expect(ambiguous.selectedPathId).toBeUndefined();
    expect(ambiguous.componentTraces).toHaveLength(2);
    expect(lowSelected.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.2,
    });
    expect(lowSelected.selectedPathId).toBe('low-context');
    expect(lowSelected.selectedProbabilityContextId).toBe('low-context');
    expect(highSelected.quantification).toMatchObject({
      status: 'quantified',
      reliability: 0.6,
    });
    expect(highSelected.selectedPathId).toBe('high-context');
    expect(highSelected.selectedProbabilityContextId).toBe('high-context');
  });

  it.each([
    ['shadowsong-panic-payoff', 2],
    ['shimmer-unbreakable-loyalty-instinct-payoff', 3],
    ['zivern-battle-mastery-intelligence-payoff', 2],
  ])('%s remains full with %i simultaneous uses', (signalId, useCount) => {
    const trace = evaluateBindingReliability({
      binding: bindingById(signalId),
      componentsById,
      progression: maxProgression(),
      conditionProvenRequirementIds:
        signalId === 'shadowsong-panic-payoff'
          ? new Set([
              proofRequirement(
                'shadowsong-breath-of-fire:panic-damage-payoff',
                'shadowsong-breath-of-fire:panic-damage-payoff',
              ),
            ])
          : new Set(),
    });
    expect(trace.useIds).toHaveLength(useCount);
    expect(trace.quantification).toMatchObject({
      status: 'quantified',
      reliability: 1,
      method: 'mixed-use-lower-bound',
    });
    expect(trace.alternativeQuantifications).toHaveLength(useCount);
  });

  it('keeps Gift of Fire conditional with per-opportunity probability evidence', () => {
    const trace = evaluateBindingReliability({
      binding: bindingById('tairax-gift-of-fire-burn-payoff'),
      componentsById,
      progression: maxProgression(),
    });
    expect(trace.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-opportunity',
      conditionalProbabilities: [0.35],
    });
  });

  it('does not multiply distinct chance setup and payoff events', () => {
    const provider = traceWith([requirement('setup:chance', 'setup-event', 0.4)]);
    const beneficiary = traceWith([requirement('payoff:chance', 'payoff-event', 0.3)]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'unquantified',
      reason: 'joint-chance-behavior-unresolved',
    });
  });

  it('discounts a shared component once', () => {
    const provider = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    const beneficiary = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'shared-event',
    });
  });

  it('joins a chance prerequisite to a deterministic after-event follow-on', () => {
    const binding = bindingById('vaeldra-tempting-distraction-vulnerability');
    const path = binding.status === 'resolved' && 'paths' in binding ? binding.paths[0]! : null;
    expect(path).not.toBeNull();
    const result = evaluateReliabilityPath(
      path!,
      componentsById,
      maxProgression(),
      new Set([
        proofRequirement(
          'vaeldra-tempting-distraction:successful-taunt-follow-on',
          'vaeldra-tempting-distraction:successful-taunt-follow-on',
        ),
      ]),
    );
    expect(result.status).toBe('quantified');
  });

  it('proves an explicitly linked ordered chance follow-on without a second discount', () => {
    const chance = chanceComponent('test-command:sequence-chance', {
      probability: { kind: 'fixed', value: 0.4 },
    });
    const followOn = conditionalComponent('test-habit:sequence-follow-on', {
      kind: 'after-event',
      sourceEvent: 'chance-event',
    });
    const result = evaluateReliabilityPath(
      jointPath([
        ['chance-event', chance.id],
        ['follow-on-event', followOn.id],
      ]),
      new Map([
        [chance.id, chance],
        [followOn.id, followOn],
      ]),
      progression(),
    );
    expect(result).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'one-supported-opportunity',
    });
  });

  it('does not prove a conditional event that occurs before its chance source', () => {
    const chance = chanceComponent('test-command:late-chance', {
      probability: { kind: 'fixed', value: 0.4 },
    });
    const conditional = conditionalComponent('test-habit:early-conditional', {
      kind: 'after-event',
      sourceEvent: 'chance-event',
    });
    const result = evaluateReliabilityPath(
      jointPath([
        ['conditional-event', conditional.id],
        ['chance-event', chance.id],
      ]),
      new Map([
        [chance.id, chance],
        [conditional.id, conditional],
      ]),
      progression(),
    );
    expect(result).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-deterministic-unproven',
    });
  });

  it('does not prove an unrelated conditional event merely because chance occurs first', () => {
    const chance = chanceComponent('test-command:unrelated-chance', {
      probability: { kind: 'fixed', value: 0.4 },
    });
    const conditional = conditionalComponent('test-habit:unrelated-conditional', {
      kind: 'conditional-event',
      condition: 'A separate dynamic battle state.',
    });
    const result = evaluateReliabilityPath(
      jointPath([
        ['chance-event', chance.id],
        ['conditional-event', conditional.id],
      ]),
      new Map([
        [chance.id, chance],
        [conditional.id, conditional],
      ]),
      progression(),
    );
    expect(result).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-deterministic-unproven',
    });
  });

  it('grants setup-payoff proof only to one explicit benefits-from condition', () => {
    const conditional = conditionalComponent('test-habit:benefits-condition', {
      kind: 'conditional-event',
      condition: 'Exact canonical setup.',
    });
    const binding = singleComponentBinding(conditional.id);
    const proofIds = setupPayoffConditionProofRequirementIds(
      candidate({ beneficiarySignalCategory: 'benefits-from' }),
      binding,
      new Map([[conditional.id, conditional]]),
    );
    const result = evaluateBindingReliability({
      binding,
      componentsById: new Map([[conditional.id, conditional]]),
      progression: progression(),
      conditionProvenRequirementIds: proofIds,
    });
    expect([...proofIds]).toEqual([proofRequirement('test-event', conditional.id)]);
    expect(result.quantification).toMatchObject({
      status: 'quantified',
      reliability: 1,
    });
    expect(result.selectedComponentTraces[0]).toMatchObject({
      conditionProven: true,
      quantification: { method: 'condition-proven' },
    });
    expect(
      combineProviderBeneficiaryReliability(
        traceWith([requirement('provider:guaranteed', 'provider-event', 1)]),
        result,
      ),
    ).toMatchObject({ status: 'quantified', reliability: 1 });
  });

  it('keeps an unrelated conditional branch unproven when one exact branch is selected', () => {
    const selected = conditionalComponent('test-habit:selected-condition', {
      kind: 'conditional-event',
      condition: 'Selected condition.',
    });
    const unrelated = conditionalComponent('test-habit:unrelated-condition', {
      kind: 'conditional-event',
      condition: 'Unrelated condition.',
    });
    const binding: SignalReliabilityBinding = {
      status: 'resolved',
      signalId: 'test-two-conditions',
      bindingClass: 'conditional-deterministic',
      paths: [
        jointPath([['selected-event', selected.id]], 'selected-path'),
        jointPath([['unrelated-event', unrelated.id]], 'unrelated-path'),
      ],
    };
    const components = new Map([
      [selected.id, selected],
      [unrelated.id, unrelated],
    ]);
    const preliminary = evaluateBindingReliability({
      binding,
      componentsById: components,
      progression: progression(),
    });
    const proofIds = setupPayoffConditionProofRequirementIds(
      candidate({ beneficiarySignalCategory: 'benefits-from' }),
      binding,
      components,
      preliminary,
    );
    expect(preliminary.selectedPathId).toBe('selected-path');
    expect(proofIds).toEqual(new Set([proofRequirement('selected-event', selected.id)]));
    const result = evaluateBindingReliability({
      binding,
      componentsById: components,
      progression: progression(),
      conditionProvenRequirementIds: proofIds,
    });
    expect(result.quantification).toMatchObject({
      status: 'quantified',
      reliability: 1,
    });
    expect(result.componentTraces.find((trace) => trace.componentId === selected.id)).toMatchObject(
      { conditionProven: true },
    );
    expect(
      result.componentTraces.find((trace) => trace.componentId === unrelated.id),
    ).toMatchObject({
      conditionProven: false,
      quantification: {
        status: 'unquantified',
        reason: 'conditional-deterministic-unproven',
      },
    });
  });

  it('keeps a dynamic conditional provider unquantified in a valid relationship', () => {
    const providerComponent = conditionalComponent('test-command:dynamic-provider', {
      kind: 'conditional-event',
      condition: 'Dynamic provider state.',
    });
    const provider = evaluateBindingReliability({
      binding: singleComponentBinding(providerComponent.id),
      componentsById: new Map([[providerComponent.id, providerComponent]]),
      progression: progression(),
    });
    const beneficiary = traceWith([requirement('beneficiary:guaranteed', 'beneficiary-event', 1)]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-deterministic-unproven',
    });
  });

  it('does not grant setup-payoff proof to a same-tag non-benefits-from signal', () => {
    const conditional = conditionalComponent('test-habit:same-tag-support', {
      kind: 'conditional-event',
      condition: 'Dynamic support state.',
    });
    expect(
      setupPayoffConditionProofRequirementIds(
        candidate({ beneficiarySignalCategory: 'support' }),
        singleComponentBinding(conditional.id),
        new Map([[conditional.id, conditional]]),
      ),
    ).toEqual(new Set());
  });

  it('deduplicates a complete shared chance activation exactly once', () => {
    const provider = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    const beneficiary = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'shared-event',
    });
  });

  it('retains an unresolved beneficiary requirement beside a shared activation', () => {
    const provider = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    const beneficiary = traceWith([
      requirement('shared:chance', 'shared-event', 0.4),
      unresolvedRequirement('beneficiary:dynamic', 'dynamic-event'),
    ]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-deterministic-unproven',
    });
  });

  it('retains a second chance requirement beside a shared activation', () => {
    const provider = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    const beneficiary = traceWith([
      requirement('shared:chance', 'shared-event', 0.4),
      requirement('beneficiary:chance', 'second-event', 0.3),
    ]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'unquantified',
      reason: 'joint-chance-behavior-unresolved',
      conditionalProbabilities: [0.3, 0.4],
    });
  });

  it('preserves one shared chance when the additional requirement is deterministic', () => {
    const provider = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    const beneficiary = traceWith([
      requirement('shared:chance', 'shared-event', 0.4),
      requirement('beneficiary:guaranteed', 'guaranteed-event', 1),
    ]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'shared-event',
    });
  });

  it('rejects conflicting probabilities for a claimed exact shared activation', () => {
    const provider = traceWith([requirement('shared:chance', 'shared-event', 0.4)]);
    const beneficiary = traceWith([requirement('shared:chance', 'shared-event', 0.3)]);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'unquantified',
      reason: 'conflicting-shared-event-probabilities',
      conditionalProbabilities: [0.4, 0.3],
    });
  });
});

function componentById(id: string): AbilityReliabilityComponent {
  const component = componentsById.get(id);
  if (!component) throw new Error(`Missing component ${id}`);
  return component;
}

function bindingById(id: string): SignalReliabilityBinding {
  const binding = bindingsById.get(id);
  if (!binding) throw new Error(`Missing binding ${id}`);
  return binding;
}

function progression(
  activeHabitLevels: ReliabilityProgression['activeHabitLevels'] = {},
): ReliabilityProgression {
  return { starRank: 10, dragonLevel: 16, activeHabitLevels };
}

function maxProgression(): ReliabilityProgression {
  const habits = new Set<string>();
  for (const component of formationReliabilityComponents) {
    const probability = component.probability;
    collect(probability);
  }
  return progression(Object.fromEntries([...habits].map((habitId) => [habitId, 5])));

  function collect(probability: AbilityReliabilityComponent['probability']): void {
    if (!probability) return;
    if (probability.kind === 'habit-level' || probability.kind === 'habit-override') {
      habits.add(probability.habitAbilityId);
      return;
    }
    if (probability.kind === 'round-specific') {
      Object.values(probability.byRound).forEach(collect);
      return;
    }
    if (probability.kind === 'variants') {
      probability.variants.forEach((variant) => collect(variant.probability));
    }
  }
}

function chanceComponent(
  id: `${string}:${string}`,
  overrides: Partial<AbilityReliabilityComponent> = {},
): AbilityReliabilityComponent {
  return {
    id,
    sourceAbilityId: id.split(':')[0]!,
    sourceAbilityKind: 'command',
    reliabilityClass: 'chance',
    probability: { kind: 'fixed', value: 0.5 },
    opportunityPresence: 'guaranteed-at-least-one',
    timing: { kind: 'start-of-combat' },
    opportunityCount: { kind: 'exact', value: 1 },
    rollScope: 'per-effect',
    independence: 'unknown',
    evidence: {
      verificationStatus: 'verified',
      evidenceIds: ['test'],
      unresolvedQuestions: [],
    },
    ...overrides,
  };
}

function conditionalComponent(
  id: `${string}:${string}`,
  timing: AbilityReliabilityComponent['timing'],
): AbilityReliabilityComponent {
  return {
    id,
    sourceAbilityId: id.split(':')[0]!,
    sourceAbilityKind: 'habit',
    reliabilityClass: 'conditional-deterministic',
    opportunityPresence: 'not-applicable',
    timing,
    opportunityCount: { kind: 'not-applicable' },
    rollScope: 'not-applicable',
    independence: 'not-applicable',
    evidence: {
      verificationStatus: 'verified',
      evidenceIds: ['test'],
      unresolvedQuestions: [],
    },
  };
}

function contextualPath(
  contextId: string,
  componentId: `${string}:${string}`,
): SignalReliabilityPath {
  return {
    pathId: contextId,
    appliesWhen: { kind: 'probability-context', id: contextId },
    events: [
      {
        eventId: `${contextId}-event`,
        componentReferences: [{ componentId }],
      },
    ],
  };
}

function jointPath(
  events: readonly [eventId: string, componentId: `${string}:${string}`][],
  pathId = 'joint-path',
): SignalReliabilityPath {
  return {
    pathId,
    events: events.map(([eventId, componentId]) => ({
      eventId,
      componentReferences: [{ componentId }],
    })),
  };
}

function singleComponentBinding(componentId: `${string}:${string}`): SignalReliabilityBinding {
  return {
    status: 'resolved',
    signalId: 'test-signal',
    bindingClass: 'conditional-deterministic',
    paths: [jointPath([['test-event', componentId]])],
  };
}

function proofRequirement(eventId: string, componentId: `${string}:${string}`): string {
  return reliabilityRequirementId({ eventId }, { componentId });
}

function candidate(
  overrides: Partial<EnrichedRelationshipCandidate> = {},
): EnrichedRelationshipCandidate {
  return {
    id: 'test-candidate',
    resultKind: 'setup-payoff',
    providerDragonId: 'provider',
    providerSignalId: 'provider-signal',
    providerSignalCategory: 'output',
    providerAbilityId: 'provider-ability',
    beneficiaryDragonId: 'beneficiary',
    beneficiarySignalId: 'beneficiary-signal',
    beneficiarySignalCategory: 'benefits-from',
    beneficiaryAbilityId: 'beneficiary-ability',
    semanticTag: 'status:control',
    abilityIds: ['provider-ability', 'beneficiary-ability'],
    explanation: 'Synthetic exact semantic match.',
    ...overrides,
  };
}

function requirement(
  componentId: `${string}:${string}`,
  eventId: string,
  reliability: number,
): ComponentReliabilityTrace {
  return {
    componentId,
    eventId,
    conditionProven: false,
    opportunityPresence: 'guaranteed-at-least-one',
    opportunityCount: { kind: 'exact', value: 1 },
    rollScope: 'per-effect',
    independence: 'unknown',
    scheduledRounds: [],
    resolvedProbabilities: reliability < 1 ? [reliability] : [],
    quantification: {
      status: 'quantified',
      reliability,
      method: reliability === 1 ? 'guaranteed' : 'one-supported-opportunity',
      explanation: 'Synthetic requirement.',
    },
  };
}

function unresolvedRequirement(
  componentId: `${string}:${string}`,
  eventId: string,
): ComponentReliabilityTrace {
  return {
    ...requirement(componentId, eventId, 1),
    quantification: {
      status: 'unquantified',
      reason: 'conditional-deterministic-unproven',
      explanation: 'Synthetic unresolved requirement.',
    },
  };
}

function traceWith(requirements: ComponentReliabilityTrace[]): BindingReliabilityTrace {
  const unresolved = requirements.find((trace) => trace.quantification.status === 'unquantified');
  const chance = requirements.filter(
    (trace) => trace.quantification.status === 'quantified' && trace.quantification.reliability < 1,
  );
  const quantification =
    unresolved?.quantification ??
    (chance.length === 1
      ? chance[0]!.quantification
      : chance.length > 1
        ? {
            status: 'unquantified' as const,
            reason: 'joint-chance-behavior-unresolved' as const,
            conditionalProbabilities: chance.map(
              (trace) =>
                (
                  trace.quantification as Extract<
                    ComponentReliabilityTrace['quantification'],
                    { status: 'quantified' }
                  >
                ).reliability,
            ),
            explanation: 'Synthetic joint chance requirements.',
          }
        : {
            status: 'quantified' as const,
            reliability: 1,
            method: 'guaranteed' as const,
            explanation: 'Synthetic deterministic requirements.',
          });
  return {
    signalId: 'test',
    pathIds: ['test'],
    useIds: [],
    componentIds: requirements.map((trace) => trace.componentId).sort(),
    eventIds: requirements.flatMap((trace) => (trace.eventId ? [trace.eventId] : [])).sort(),
    probabilityVariantIds: [],
    componentTraces: requirements,
    selectedComponentTraces: requirements,
    alternativeQuantifications: [],
    quantification,
  };
}
