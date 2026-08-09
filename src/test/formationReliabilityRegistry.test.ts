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
  reliabilityBindingPathVisits,
  validateReliabilityContract,
  type AbilityReliabilityComponent,
  type ReliabilityComponentId,
  type ReliabilityContractInput,
  type SignalReliabilityBinding,
} from '../synergy/reliability';

const registryAudit = runFormationReliabilityRegistryAudit();

describe('production Formation Reliability registry', () => {
  it('covers every canonical ability and all 34 dragons', () => {
    const canonicalAbilities = dragons
      .flatMap((dragon) => [dragon.command, dragon.trait, ...dragon.habits])
      .map((ability) => ability.id)
      .sort();
    expect(new Set(dragons.map((dragon) => dragon.id)).size).toBe(34);
    expect(formationReliabilityAbilityCatalog.map((ability) => ability.abilityId)).toEqual(
      canonicalAbilities,
    );
    expect(formationReliabilityAbilityCatalog).toHaveLength(238);
    expect(registryAudit.counts.dragonsCovered).toBe(34);
  });

  it('derives exactly the current 247 scoring signals and excludes non-scoring rows and claims', () => {
    const currentScoringSignalIds = simpleSynergyProfiles
      .flatMap((profile) => [...profile.outputs, ...profile.supports, ...profile.benefitsFrom])
      .filter((signal) => signal.nonScoring !== true)
      .map((signal) => signal.id)
      .sort();
    expect(formationReliabilityScoringSignalIds).toEqual(currentScoringSignalIds);
    expect(formationReliabilityScoringSignalIds).toHaveLength(247);
    expect(formationReliabilityNonScoringSignalIds).toHaveLength(9);
    expect(formationReliabilityPositionClaimIds).toHaveLength(34);
  });

  it('binds every scoring signal exactly once with no stale or unresolved entries', () => {
    const bindingCounts = new Map<string, number>();
    for (const binding of formationReliabilityBindings) {
      bindingCounts.set(binding.signalId, (bindingCounts.get(binding.signalId) ?? 0) + 1);
    }
    expect(formationReliabilityBindings).toHaveLength(247);
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
      components: 240,
      bindings: 247,
      guaranteedBindings: 142,
      conditionalDeterministicBindings: 30,
      chanceBindings: 72,
      resolvedMixedBindings: 3,
      bindingsWithFixedProbability: 23,
      bindingsWithDirectHabitProbability: 34,
      bindingsWithHabitOverride: 2,
      bindingsWithRoundSpecificProbability: 2,
      bindingsWithVariantProbability: 12,
      guaranteedOpportunityPresence: 44,
      conditionalOpportunityPresence: 28,
      unknownOpportunityPresence: 3,
      unresolvedOpportunityCounts: 70,
      unresolvedIndependence: 70,
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
    const vhagarTaunt = resolvedSingleBinding('vhagar-fiery-bonds-taunt');
    expect(vhagarTaunt.paths.map((path) => path.appliesWhen?.id)).toEqual([
      'ordinary-target',
      'burn-afflicted-target',
    ]);
    expect(
      vhagarTaunt.paths.map((path) => path.events[0]?.componentReferences[0]?.probabilityVariantId),
    ).toEqual(['ordinary-target', 'burn-afflicted-target']);
    const vhagarPayoff = resolvedSingleBinding('vhagar-fiery-bonds-burn-payoff');
    expect(vhagarPayoff.bindingClass).toBe('conditional-deterministic');
    expect(vhagarPayoff.paths).toHaveLength(1);
    expect(vhagarPayoff.paths[0]?.events[0]?.componentReferences[0]).toEqual(
      {
        componentId: 'vhagar-fiery-bonds:burn-taunt-probability-uplift',
      },
    );
    expect(
      formationReliabilityComponents.find(
        (component) => component.id === 'vhagar-fiery-bonds:burn-taunt-probability-uplift',
      )?.conditionalUplift,
    ).toMatchObject({ baseline: 0.25, conditioned: 0.5, absoluteDelta: 0.25 });
  });

  it('uses an explicit joint setup/payoff event graph for Vaeldra', () => {
    const binding = resolvedSingleBinding('vaeldra-tempting-distraction-vulnerability');
    expect(binding.bindingClass).toBe('chance');
    expect('uses' in binding).toBe(false);
    expect(binding.paths.map((path) => path.pathId)).toEqual(['lure-taunt', 'sirens-call-taunt']);
    expect(binding.paths.map((path) => path.events.map((event) => event.eventId))).toEqual([
      ['vaeldra-lure:taunt', 'vaeldra-tempting-distraction:successful-taunt-follow-on'],
      [
        'vaeldra-sirens-call:taunt-to-stagger',
        'vaeldra-tempting-distraction:successful-taunt-follow-on',
      ],
    ]);
  });

  it('keeps ordinary paths alternative while mixed uses are simultaneous', () => {
    const ordinary = resolvedSingleBinding('vaeldra-tempting-distraction-vulnerability');
    expect(ordinary.paths).toHaveLength(2);
    expect('uses' in ordinary).toBe(false);

    for (const signalId of [
      'shadowsong-panic-payoff',
      'shimmer-unbreakable-loyalty-instinct-payoff',
      'zivern-battle-mastery-intelligence-payoff',
    ]) {
      const mixed = resolvedMixedBinding(signalId);
      expect('paths' in mixed).toBe(false);
      expect(
        reliabilityBindingPathVisits(mixed).every(({ useId }) => Boolean(useId)),
      ).toBe(true);
    }
  });

  it('resolves Shadowsong into exactly two simultaneous uses', () => {
    expect(resolvedMixedBinding('shadowsong-panic-payoff').uses).toHaveLength(2);
    expect(mixedUses('shadowsong-panic-payoff')).toEqual({
      'breath-of-fire-damage': ['shadowsong-breath-of-fire:panic-damage-payoff'],
      'scorched-earth-application': ['shadowsong-scorched-earth:vulnerable'],
    });
    const chanceReference =
      resolvedMixedBinding('shadowsong-panic-payoff').uses[1]?.paths[0]?.events[0]
        ?.componentReferences[0];
    expect(chanceReference?.probabilityVariantId).toBe('panic-afflicted-target');
  });

  it('resolves Shimmer into exactly three simultaneous uses', () => {
    expect(resolvedMixedBinding('shimmer-unbreakable-loyalty-instinct-payoff').uses).toHaveLength(3);
    expect(mixedUses('shimmer-unbreakable-loyalty-instinct-payoff')).toEqual({
      'command-buffs': ['shimmer-unbreakable-loyalty:strength-and-initiative'],
      'tactical-damage': ['shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical'],
      recovery: ['shimmer-unbreakable-loyalty:scheduled-recovery'],
    });
  });

  it('resolves Zivern into exactly two simultaneous uses', () => {
    expect(resolvedMixedBinding('zivern-battle-mastery-intelligence-payoff').uses).toHaveLength(2);
    expect(mixedUses('zivern-battle-mastery-intelligence-payoff')).toEqual({
      'battle-mastery': ['zivern-battle-mastery:deterministic-battle-mastery'],
      'fearsome-reach': ['zivern-fearsome-reach:panic'],
    });
  });

  it('allows each simultaneous mixed use to define its own alternative paths', () => {
    const input = cloneInput();
    const binding = structuredClone(resolvedMixedBinding('shadowsong-panic-payoff'));
    const use = binding.uses[0]!;
    use.paths = [
      ...use.paths,
      {
        ...structuredClone(use.paths[0]!),
        pathId: 'documented-alternative',
      },
    ];
    replaceBinding(input, binding);
    expect(issueCodes(input)).toEqual([]);
  });

  it('rejects duplicate, empty, and old alternative-path mixed shapes', () => {
    const duplicateInput = cloneInput();
    const duplicate = structuredClone(resolvedMixedBinding('shadowsong-panic-payoff'));
    duplicate.uses[1]!.useId = duplicate.uses[0]!.useId;
    replaceBinding(duplicateInput, duplicate);
    expect(issueCodes(duplicateInput)).toContain('binding.use-duplicate');

    const emptyInput = cloneInput();
    const empty = structuredClone(resolvedMixedBinding('shadowsong-panic-payoff'));
    empty.uses[0]!.paths = [];
    replaceBinding(emptyInput, empty);
    expect(issueCodes(emptyInput)).toContain('binding.use-paths-empty');

    const oldShapeInput = cloneInput();
    const current = resolvedMixedBinding('shadowsong-panic-payoff');
    const oldShape = {
      status: 'resolved',
      signalId: current.signalId,
      bindingClass: 'resolved-mixed',
      paths: current.uses.flatMap((use) => use.paths),
    } as unknown as SignalReliabilityBinding;
    replaceBinding(oldShapeInput, oldShape);
    expect(issueCodes(oldShapeInput)).toContain('binding.resolved-mixed-uses-invalid');
  });

  it('includes mixed uses in component traversal, missing detection, and coverage', () => {
    const binding = resolvedMixedBinding('shadowsong-panic-payoff');
    expect(
      reliabilityBindingPathVisits(binding).map(({ useId }) => useId),
    ).toEqual(['breath-of-fire-damage', 'scorched-earth-application']);
    expect(componentIds(binding.signalId)).toEqual([
      'shadowsong-breath-of-fire:panic-damage-payoff',
      'shadowsong-scorched-earth:vulnerable',
    ]);

    const missing = cloneInput();
    missing.components = missing.components.filter(
      (candidate) => candidate.id !== 'shadowsong-breath-of-fire:panic-damage-payoff',
    );
    expect(issueCodes(missing)).toContain('binding.component-missing');
    expect(registryAudit.counts.unreferencedComponents).toBe(0);
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
      '246bbef69594d91df916378e5a92755392108caff8b659b8ea977c1535480d6e',
    );
    expect(runFormationReliabilityAudit().deterministicHash).toBe(
      '332856d0d08eaf8922b589d28c8c521c2a2ba3d1e329881ee9137667bdf11ba0',
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
    if (original.status !== 'resolved' || original.bindingClass !== 'resolved-mixed') {
      throw new Error('Expected resolved mixed binding.');
    }
    unresolved.bindings[unresolved.bindings.indexOf(original)] = {
      status: 'unresolved-mixed',
      signalId: original.signalId,
      candidatePaths: original.uses.flatMap((use) => use.paths),
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

  it('validates recursive probability-source Habits against source-dragon ownership', () => {
    const valid = cloneInput();
    expect(issueCodes(valid)).not.toContain('probability.habit-ability-dragon-mismatch');

    const invalid = cloneInput();
    const tairax = invalid.components.find(
      (candidate) => candidate.id === 'tairax-burning-ward:stagger',
    )!;
    if (tairax.probability?.kind !== 'round-specific') {
      throw new Error('Expected round-specific Tairax probability.');
    }
    const roundOne = tairax.probability.byRound[1];
    if (roundOne?.kind !== 'habit-override') throw new Error('Expected Habit override.');
    roundOne.habitAbilityId = 'crimson-vermins-bane';
    expect(issueCodes(invalid)).toContain('probability.habit-ability-dragon-mismatch');
  });

  it('requires source and external Habit evidence without accepting unrelated evidence', () => {
    const valid = cloneInput();
    const tairax = valid.components.find(
      (candidate) => candidate.id === 'tairax-burning-ward:stagger',
    )!;
    const crimson = valid.components.find(
      (candidate) => candidate.id === 'crimson-bloodscale-terror:stun',
    )!;
    expect(tairax.evidence.evidenceIds).toContain('tairax-gleamstrike-2026-07-22');
    expect(crimson.evidence.evidenceIds).toContain('crimson-vermins-bane-2026-06-25');
    expect(issueCodes(valid)).toEqual([]);

    const missingExternal = cloneInput();
    const missingTairax = missingExternal.components.find(
      (candidate) => candidate.id === 'tairax-burning-ward:stagger',
    )!;
    missingTairax.evidence.evidenceIds = missingTairax.evidence.evidenceIds.filter(
      (evidenceId) => evidenceId !== 'tairax-gleamstrike-2026-07-22',
    );
    expect(issueCodes(missingExternal)).toContain(
      'component.probability-source-evidence-missing',
    );

    const unrelated = cloneInput();
    const unrelatedTairax = unrelated.components.find(
      (candidate) => candidate.id === 'tairax-burning-ward:stagger',
    )!;
    unrelatedTairax.evidence.evidenceIds = [
      ...unrelatedTairax.evidence.evidenceIds,
      'tairax-gift-of-fire-2026-07-22',
    ];
    expect(issueCodes(unrelated)).toContain('component.evidence-id-stale');

    const direct = cloneInput();
    const velar = direct.components.find(
      (candidate) => candidate.id === 'velar-gales-of-power:first-strike',
    )!;
    expect(velar.probability).toMatchObject({
      kind: 'habit-level',
      habitAbilityId: velar.sourceAbilityId,
    });
    expect(issueCodes(direct)).toEqual([]);
  });

  it('fails full migration when a variant component reference omits its branch', () => {
    const invalid = cloneInput();
    const binding = invalid.bindings.find(
      (candidate) => candidate.signalId === 'vhagar-fiery-bonds-taunt',
    )!;
    if (binding.status !== 'resolved' || binding.bindingClass === 'resolved-mixed') {
      throw new Error('Expected resolved single binding.');
    }
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

function resolvedSingleBinding(
  signalId: string,
): Extract<SignalReliabilityBinding, { paths: readonly unknown[] }> {
  const binding = formationReliabilityBindings.find((candidate) => candidate.signalId === signalId);
  if (binding?.status !== 'resolved' || binding.bindingClass === 'resolved-mixed') {
    throw new Error(`Missing resolved single binding ${signalId}.`);
  }
  return binding;
}

function resolvedMixedBinding(
  signalId: string,
): Extract<SignalReliabilityBinding, { bindingClass: 'resolved-mixed' }> {
  const binding = formationReliabilityBindings.find((candidate) => candidate.signalId === signalId);
  if (binding?.status !== 'resolved' || binding.bindingClass !== 'resolved-mixed') {
    throw new Error(`Missing resolved mixed binding ${signalId}.`);
  }
  return binding;
}

function component(componentId: string): AbilityReliabilityComponent {
  const value = formationReliabilityComponents.find((candidate) => candidate.id === componentId);
  if (!value) throw new Error(`Missing component ${componentId}.`);
  return value;
}

function componentIds(signalId: string): string[] {
  const binding = formationReliabilityBindings.find((candidate) => candidate.signalId === signalId);
  if (!binding) throw new Error(`Missing binding ${signalId}.`);
  return [
    ...new Set(reliabilityBindingPathVisits(binding).flatMap(({ path }) => pathComponentIds(path))),
  ].sort();
}

function mixedUses(signalId: string): Record<string, string[]> {
  return Object.fromEntries(
    resolvedMixedBinding(signalId).uses.map((use) => [
      use.useId,
      [...new Set(use.paths.flatMap(pathComponentIds))].sort(),
    ]),
  );
}

function pathComponentIds(
  path: Extract<SignalReliabilityBinding, { paths: readonly unknown[] }>['paths'][number],
): string[] {
  return path.events.flatMap((event) =>
    event.componentReferences.map((reference) => reference.componentId),
  );
}

function firstComponentId(binding: SignalReliabilityBinding): string {
  const componentId =
    reliabilityBindingPathVisits(binding)[0]?.path.events[0]?.componentReferences[0]?.componentId;
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

function replaceBinding(
  input: ReturnType<typeof cloneInput>,
  replacement: SignalReliabilityBinding,
): void {
  const index = input.bindings.findIndex(
    (binding) => binding.signalId === replacement.signalId,
  );
  if (index < 0) throw new Error(`Missing binding ${replacement.signalId}.`);
  input.bindings[index] = replacement;
}

function issueCodes(input: ReliabilityContractInput): string[] {
  return validateReliabilityContract(input, 'full-migration').map((issue) => issue.code);
}
