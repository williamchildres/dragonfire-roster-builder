import { describe, expect, it } from 'vitest';

import { runFormationReliabilityAudit } from '../audit/formationReliabilityAudit';
import { runFormationReliabilityRegistryAudit } from '../audit/formationReliabilityRegistryAudit';
import { runFullRosterAudit } from '../audit/fullRosterAudit';
import { dragons } from '../data/dragons';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  formationReliabilityAbilityCatalog,
  formationReliabilityBindings,
  formationReliabilityComponents,
  formationReliabilityContractInput,
  formationReliabilityNonScoringSignalIds,
  formationReliabilityPositionClaimIds,
  formationReliabilityScoringSignalIds,
  validateReliabilityContract,
  type AbilityReliabilityComponent,
  type ReliabilityComponentId,
  type ReliabilityContractInput,
  type SignalReliabilityBinding,
} from '../synergy/reliability';

const registryAudit = runFormationReliabilityRegistryAudit();

describe('production Formation Reliability registry', () => {
  it('covers every canonical ability and all 33 dragons', () => {
    const canonicalAbilities = dragons
      .flatMap((dragon) => [dragon.command, dragon.trait, ...dragon.habits])
      .map((ability) => ability.id)
      .sort();
    expect(new Set(dragons.map((dragon) => dragon.id)).size).toBe(33);
    expect(formationReliabilityAbilityCatalog.map((ability) => ability.abilityId)).toEqual(
      canonicalAbilities,
    );
    expect(formationReliabilityAbilityCatalog).toHaveLength(231);
    expect(registryAudit.counts.dragonsCovered).toBe(33);
  });

  it('derives exactly the current 234 scoring signals and excludes non-scoring rows and claims', () => {
    const currentScoringSignalIds = simpleSynergyProfiles
      .flatMap((profile) => [...profile.outputs, ...profile.supports, ...profile.benefitsFrom])
      .filter((signal) => signal.nonScoring !== true)
      .map((signal) => signal.id)
      .sort();
    expect(formationReliabilityScoringSignalIds).toEqual(currentScoringSignalIds);
    expect(formationReliabilityScoringSignalIds).toHaveLength(234);
    expect(formationReliabilityNonScoringSignalIds).toHaveLength(5);
    expect(formationReliabilityPositionClaimIds).toHaveLength(33);
  });

  it('binds every scoring signal exactly once with no stale or unresolved entries', () => {
    const bindingCounts = new Map<string, number>();
    for (const binding of formationReliabilityBindings) {
      bindingCounts.set(binding.signalId, (bindingCounts.get(binding.signalId) ?? 0) + 1);
    }
    expect(formationReliabilityBindings).toHaveLength(234);
    expect([...bindingCounts.values()].every((count) => count === 1)).toBe(true);
    expect([...bindingCounts.keys()].sort()).toEqual(formationReliabilityScoringSignalIds);
    expect(formationReliabilityBindings.every((binding) => binding.status === 'resolved')).toBe(
      true,
    );
    expect(
      validateReliabilityContract(formationReliabilityContractInput, 'full-migration'),
    ).toEqual([]);
  });

  it('reports exact binding, probability, opportunity, and unresolved-evidence boundaries', () => {
    expect(registryAudit.counts).toMatchObject({
      components: 221,
      bindings: 234,
      guaranteedBindings: 133,
      conditionalDeterministicBindings: 28,
      chanceBindings: 70,
      resolvedMixedBindings: 3,
      bindingsWithFixedProbability: 22,
      bindingsWithDirectHabitProbability: 34,
      bindingsWithHabitOverride: 2,
      bindingsWithRoundSpecificProbability: 2,
      bindingsWithVariantProbability: 11,
      guaranteedOpportunityPresence: 43,
      conditionalOpportunityPresence: 27,
      unknownOpportunityPresence: 3,
      unresolvedOpportunityCounts: 68,
      unresolvedIndependence: 68,
      missingBindings: 0,
      staleBindings: 0,
      duplicateBindings: 0,
      unreferencedComponents: 0,
      unresolvedMixedBindings: 0,
      researchParityIssues: 0,
    });
  });

  it('keeps shared activations shared and separate checks split for representative dragons', () => {
    expect(componentIds('syrax-blazing-fury-fire-support')).toEqual([
      'syrax-blazing-fury:fire-and-first-strike',
    ]);
    expect(componentIds('syrax-blazing-fury-first-strike')).toEqual([
      'syrax-blazing-fury:fire-and-first-strike',
    ]);
    expect(componentIds('malachite-lightning-strike-first-strike')).toEqual([
      'malachite-lightning-strike:shared-first-strike-double-strike-strength',
    ]);
    expect(componentIds('malachite-lightning-strike-strength')).toEqual([
      'malachite-lightning-strike:shared-first-strike-double-strike-strength',
    ]);

    expect(componentIds('velar-gales-of-power-first-strike')).toEqual([
      'velar-gales-of-power:first-strike',
    ]);
    expect(componentIds('velar-gales-of-power-slow')).toEqual(['velar-gales-of-power:slow']);
    expect(componentIds('caraxes-crippling-inferno-burn')).toEqual([
      'caraxes-crippling-inferno:burn',
    ]);
    expect(componentIds('caraxes-crippling-inferno-slow')).toEqual([
      'caraxes-crippling-inferno:slow',
    ]);

    expect(
      [
        'bevlorin-bountiful-gifts-initiative',
        'bevlorin-bountiful-gifts-instinct',
        'bevlorin-bountiful-gifts-intelligence',
        'bevlorin-bountiful-gifts-strength',
      ].flatMap(componentIds),
    ).toEqual([
      'bevlorin-bountiful-gifts:initiative',
      'bevlorin-bountiful-gifts:instinct',
      'bevlorin-bountiful-gifts:intelligence',
      'bevlorin-bountiful-gifts:strength',
    ]);
  });

  it('preserves Tairax and Crimson round-specific augmenting-Habit ownership', () => {
    const tairax = component('tairax-burning-ward:stagger');
    const crimson = component('crimson-bloodscale-terror:stun');
    expect(tairax.sourceAbilityId).toBe('tairax-burning-ward');
    expect(tairax.probability?.kind).toBe('round-specific');
    if (tairax.probability?.kind !== 'round-specific') throw new Error('Expected round data.');
    expect(tairax.probability.byRound[1]).toMatchObject({
      kind: 'habit-override',
      habitAbilityId: 'tairax-gleamstrike',
      base: 0.25,
    });
    expect(crimson.probability?.kind).toBe('round-specific');
    if (crimson.probability?.kind !== 'round-specific') throw new Error('Expected round data.');
    expect(crimson.probability.byRound[1]).toMatchObject({
      kind: 'habit-override',
      habitAbilityId: 'crimson-vermins-bane',
      base: 0.2,
    });
    expect(crimson.probability.byRound[3]).toEqual({ kind: 'fixed', value: 0.2 });
  });

  it('carries documented variants in binding references for Vhagar and other target states', () => {
    const vhagarTaunt = resolvedBinding('vhagar-fiery-bonds-taunt');
    expect(vhagarTaunt.paths.map((path) => path.appliesWhen?.id)).toEqual([
      'ordinary-target',
      'burn-afflicted-target',
    ]);
    expect(
      vhagarTaunt.paths.map((path) => path.events[0]?.componentReferences[0]?.probabilityVariantId),
    ).toEqual(['ordinary-target', 'burn-afflicted-target']);
    const vhagarPayoff = resolvedBinding('vhagar-fiery-bonds-burn-payoff');
    expect(vhagarPayoff.paths).toHaveLength(1);
    expect(vhagarPayoff.paths[0]?.events[0]?.componentReferences[0]?.probabilityVariantId).toBe(
      'burn-afflicted-target',
    );
  });

  it('uses an explicit joint setup/payoff event graph for Vaeldra', () => {
    const binding = resolvedBinding('vaeldra-tempting-distraction-vulnerability');
    expect(binding.bindingClass).toBe('chance');
    expect(binding.paths.map((path) => path.pathId)).toEqual(['lure-taunt', 'sirens-call-taunt']);
    expect(binding.paths.map((path) => path.events.map((event) => event.eventId))).toEqual([
      ['vaeldra-lure:taunt', 'vaeldra-tempting-distraction:successful-taunt-follow-on'],
      [
        'vaeldra-sirens-call:taunt-to-stagger',
        'vaeldra-tempting-distraction:successful-taunt-follow-on',
      ],
    ]);
  });

  it('resolves the Shadowsong mixed signal by relationship use', () => {
    expect(mixedUses('shadowsong-panic-payoff')).toEqual({
      'breath-of-fire-damage': ['shadowsong-breath-of-fire:panic-damage-payoff'],
      'scorched-earth-application': ['shadowsong-scorched-earth:vulnerable'],
    });
    const chanceReference =
      resolvedBinding('shadowsong-panic-payoff').paths[1]?.events[0]?.componentReferences[0];
    expect(chanceReference?.probabilityVariantId).toBe('panic-afflicted-target');
  });

  it('resolves the Shimmer mixed signal into command, Tactical Damage, and Recovery uses', () => {
    expect(mixedUses('shimmer-unbreakable-loyalty-instinct-payoff')).toEqual({
      'command-buffs': ['shimmer-unbreakable-loyalty:strength-and-initiative'],
      'tactical-damage': ['shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical'],
      recovery: ['shimmer-unbreakable-loyalty:scheduled-recovery'],
    });
  });

  it('resolves the Zivern mixed signal into Battle Mastery and Fearsome Reach uses', () => {
    expect(mixedUses('zivern-battle-mastery-intelligence-payoff')).toEqual({
      'battle-mastery': ['zivern-battle-mastery:deterministic-battle-mastery'],
      'fearsome-reach': ['zivern-fearsome-reach:panic'],
    });
  });

  it('keeps Venator scoring components deterministic while preserving canonical ownership', () => {
    expect(componentIds('venator-feral-strike-physical')).toEqual([
      'venator-feral-strike:venator-feral-strike-physical',
    ]);
    expect(componentIds('venator-feral-precision-physical')).toEqual([
      'venator-feral-precision:venator-feral-precision-physical',
    ]);
    expect(component('venator-feral-precision:venator-feral-precision-physical')).toMatchObject({
      sourceAbilityId: 'venator-feral-precision',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'conditional-deterministic',
    });
  });

  it('keeps registry audit ordering, research parity, and hashes deterministic', () => {
    const second = runFormationReliabilityRegistryAudit();
    expect(second).toEqual(registryAudit);
    expect(registryAudit.researchParityIssues).toEqual([]);
    expect(registryAudit.researchParityDifferences.map((difference) => difference.kind)).toEqual(
      [...registryAudit.researchParityDifferences].map((difference) => difference.kind).sort(),
    );
    expect(registryAudit.deterministicRegistryHash).toBe(
      'b876ed7e803fcf2294e955cfec5a0ffadd3bb40b5b83decba07d9c72a70de8a9',
    );
    expect(runFormationReliabilityAudit().deterministicHash).toBe(
      'f2984df99ea2d2cbc0b12866287cc3c03248048c86b9f5e3ffed490e0449918f',
    );
  });

  it('fails full migration for omitted and synthetic scoring signals', () => {
    const omitted = cloneInput();
    omitted.bindings = omitted.bindings.filter(
      (binding) => binding.signalId !== formationReliabilityScoringSignalIds[0],
    );
    expect(issueCodes(omitted)).toContain('coverage.missing-binding');

    const synthetic = cloneInput();
    synthetic.scoringSignalIds.push('synthetic-new-scoring-signal');
    expect(issueCodes(synthetic)).toContain('coverage.missing-binding');
  });

  it('fails full migration for stale and duplicate bindings', () => {
    const stale = cloneInput();
    stale.bindings[0] = { ...stale.bindings[0]!, signalId: 'removed-scoring-signal' };
    expect(issueCodes(stale)).toContain('binding.stale-signal');

    const duplicate = cloneInput();
    duplicate.bindings.push(structuredClone(duplicate.bindings[0]!));
    expect(issueCodes(duplicate)).toContain('binding.duplicate-signal');
  });

  it('fails full migration for missing and unreferenced components', () => {
    const missing = cloneInput();
    const referencedId = firstComponentId(missing.bindings[0]!);
    missing.components = missing.components.filter((component) => component.id !== referencedId);
    expect(issueCodes(missing)).toContain('binding.component-missing');

    const unreferenced = cloneInput();
    const source = structuredClone(unreferenced.components[0]!);
    source.id = `${source.sourceAbilityId}:synthetic-unreferenced` as ReliabilityComponentId;
    unreferenced.components.push(source);
    expect(issueCodes(unreferenced)).toContain('coverage.unreferenced-component');
  });

  it('fails full migration for unresolved mixed bindings and invalid Habit sources', () => {
    const unresolved = cloneInput();
    const original = unresolved.bindings.find(
      (binding) => binding.signalId === 'shadowsong-panic-payoff',
    )!;
    if (original.status !== 'resolved') throw new Error('Expected resolved binding.');
    unresolved.bindings[unresolved.bindings.indexOf(original)] = {
      status: 'unresolved-mixed',
      signalId: original.signalId,
      candidatePaths: original.paths,
      unresolvedReason: 'Synthetic unresolved mixed binding.',
    };
    expect(issueCodes(unresolved)).toContain('binding.mixed-unresolved');

    const invalidHabit = cloneInput();
    const component = invalidHabit.components.find(
      (candidate) => candidate.id === 'velar-gales-of-power:first-strike',
    )!;
    if (component.probability?.kind !== 'habit-level') {
      throw new Error('Expected Habit probability.');
    }
    component.probability.habitAbilityId = 'velar-whirlwind';
    expect(issueCodes(invalidHabit)).toContain('probability.habit-ability-kind');
  });

  it('fails full migration when a variant component reference omits its branch', () => {
    const invalid = cloneInput();
    const binding = invalid.bindings.find(
      (candidate) => candidate.signalId === 'vhagar-fiery-bonds-taunt',
    )!;
    if (binding.status !== 'resolved') throw new Error('Expected resolved binding.');
    delete binding.paths[0]?.events[0]?.componentReferences[0]?.probabilityVariantId;
    expect(issueCodes(invalid)).toContain('binding.probability-variant-missing');
  });

  it('preserves the Formation Rating v2 full-roster hash', () => {
    const report = runFullRosterAudit();
    expect(report.reliable).toBe(true);
    expect(report.formationSweep.deterministicFullResultHash).toBe(
      '5678952ad31630f7702fc2c56c6c9c5378b2445292696e39accb58f078ba9baf',
    );
  }, 120_000);
});

function resolvedBinding(
  signalId: string,
): Extract<SignalReliabilityBinding, { status: 'resolved' }> {
  const binding = formationReliabilityBindings.find((candidate) => candidate.signalId === signalId);
  if (binding?.status !== 'resolved') throw new Error(`Missing resolved binding ${signalId}.`);
  return binding;
}

function component(componentId: string): AbilityReliabilityComponent {
  const value = formationReliabilityComponents.find((candidate) => candidate.id === componentId);
  if (!value) throw new Error(`Missing component ${componentId}.`);
  return value;
}

function componentIds(signalId: string): string[] {
  return [...new Set(resolvedBinding(signalId).paths.flatMap(pathComponentIds))].sort();
}

function mixedUses(signalId: string): Record<string, string[]> {
  return Object.fromEntries(
    resolvedBinding(signalId).paths.map((path) => [
      path.appliesWhen?.id ?? path.pathId,
      [...new Set(pathComponentIds(path))].sort(),
    ]),
  );
}

function pathComponentIds(
  path: Extract<SignalReliabilityBinding, { status: 'resolved' }>['paths'][number],
): string[] {
  return path.events.flatMap((event) =>
    event.componentReferences.map((reference) => reference.componentId),
  );
}

function firstComponentId(binding: SignalReliabilityBinding): string {
  const paths = binding.status === 'resolved' ? binding.paths : binding.candidatePaths;
  const componentId = paths[0]?.events[0]?.componentReferences[0]?.componentId;
  if (!componentId) throw new Error('Binding has no component.');
  return componentId;
}

function cloneInput(): {
  components: AbilityReliabilityComponent[];
  bindings: SignalReliabilityBinding[];
  scoringSignalIds: string[];
  abilityCatalog: NonNullable<ReliabilityContractInput['abilityCatalog']>[number][];
} {
  return structuredClone({
    components: [...formationReliabilityComponents],
    bindings: [...formationReliabilityBindings],
    scoringSignalIds: [...formationReliabilityScoringSignalIds],
    abilityCatalog: [...formationReliabilityAbilityCatalog],
  });
}

function issueCodes(input: ReliabilityContractInput): string[] {
  return validateReliabilityContract(input, 'full-migration').map((issue) => issue.code);
}
