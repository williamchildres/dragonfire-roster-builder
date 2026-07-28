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
  type ReliabilityProgression,
  type SignalReliabilityBinding,
} from '../synergy/reliability';
import { combineProviderBeneficiaryReliability } from '../synergy/reliability/scoring';

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
    expect(
      cumulativeIndependentVaryingActivationProbability([0.2, 0.2, 0.2, 0.2]),
    ).toBeCloseTo(0.5904);
    expect(cumulativeIndependentVaryingActivationProbability([0.4, 0.2])).toBeCloseTo(
      0.52,
    );
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
      expect(result.resolvedProbabilities[0]).toBe(
        id.includes('gales-of-power') ? 0.24 : 0.2,
      );
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
  it('selects ordinary alternatives without union probability', () => {
    const binding = bindingById('vaeldra-tempting-distraction-vulnerability');
    const trace = evaluateBindingReliability({
      binding,
      componentsById,
      progression: maxProgression(),
    });
    expect(trace.quantification.status).toBe('quantified');
    expect(trace.quantification).toMatchObject({ method: 'best-supported-alternative' });
    expect(trace.pathIds).toEqual(['lure-taunt', 'sirens-call-taunt']);
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

  it.each([
    ['shadowsong-panic-payoff', 2],
    ['shimmer-unbreakable-loyalty-instinct-payoff', 3],
    ['zivern-battle-mastery-intelligence-payoff', 2],
  ])('%s remains full with %i simultaneous uses', (signalId, useCount) => {
    const trace = evaluateBindingReliability({
      binding: bindingById(signalId),
      componentsById,
      progression: maxProgression(),
      conditionProvenComponentIds:
        signalId === 'shadowsong-panic-payoff'
          ? new Set(['shadowsong-breath-of-fire:panic-damage-payoff'])
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
    const provider = traceWith(0.4, ['setup'], ['setup-event']);
    const beneficiary = traceWith(0.3, ['payoff'], ['payoff-event']);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'unquantified',
      reason: 'joint-chance-behavior-unresolved',
    });
  });

  it('discounts a shared component once', () => {
    const provider = traceWith(0.4, ['shared'], ['shared-event']);
    const beneficiary = traceWith(0.4, ['shared'], ['shared-event']);
    expect(combineProviderBeneficiaryReliability(provider, beneficiary)).toMatchObject({
      status: 'quantified',
      reliability: 0.4,
      method: 'shared-event',
    });
  });

  it('joins a chance prerequisite to a deterministic after-event follow-on', () => {
    const binding = bindingById('vaeldra-tempting-distraction-vulnerability');
    const path = binding.status === 'resolved' && 'paths' in binding
      ? binding.paths[0]!
      : null;
    expect(path).not.toBeNull();
    const result = evaluateReliabilityPath(
      path!,
      componentsById,
      maxProgression(),
    );
    expect(result.status).toBe('quantified');
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

function traceWith(
  reliability: number,
  componentIds: string[],
  eventIds: string[],
): BindingReliabilityTrace {
  return {
    signalId: 'test',
    pathIds: ['test'],
    useIds: [],
    componentIds,
    eventIds,
    probabilityVariantIds: [],
    componentTraces: [],
    alternativeQuantifications: [],
    quantification: {
      status: 'quantified',
      reliability,
      method: 'one-supported-opportunity',
      explanation: 'test',
    },
  };
}
