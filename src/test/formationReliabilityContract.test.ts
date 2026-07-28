import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import {
  assertValidReliabilityContract,
  createReliabilityComponentId,
  cumulativeIndependentActivationProbability,
  reliabilityProgressionFromOwnedDragon,
  resolveComponentProbability,
  resolveReliabilityProbability,
  validateReliabilityContract,
  type AbilityReliabilityComponent,
  type HabitOverrideReliabilityProbability,
  type HabitLevelReliabilityProbability,
  type ReliabilityComponentId,
  type ReliabilityComponentReference,
  type ReliabilityContractInput,
  type SignalReliabilityBinding,
} from '../synergy/reliability';

const habitProbability = (
  habitAbilityId: string,
  values: [number, number, number, number, number],
): HabitLevelReliabilityProbability => ({
  kind: 'habit-level',
  habitAbilityId,
  byLevel: {
    1: values[0],
    2: values[1],
    3: values[2],
    4: values[3],
    5: values[4],
  },
});

const habitOverride = (
  habitAbilityId: string,
  base: number,
  values: [number, number, number, number, number],
): HabitOverrideReliabilityProbability => ({
  kind: 'habit-override',
  habitAbilityId,
  base,
  byLevel: {
    1: values[0],
    2: values[1],
    3: values[2],
    4: values[3],
    5: values[4],
  },
});

const verifiedEvidence = {
  verificationStatus: 'verified' as const,
  evidenceIds: ['game-text'],
  unresolvedQuestions: [] as string[],
};

const unresolvedEvidence = (...questions: string[]) => ({
  verificationStatus: 'provisional' as const,
  evidenceIds: ['game-text'],
  unresolvedQuestions: questions,
});

const velarFirstStrikeProbability = habitProbability(
  'velar-gales-of-power',
  [0.12, 0.144, 0.168, 0.204, 0.24],
);

const velarFirstStrike = chanceComponent({
  id: 'velar-gales-of-power:first-strike',
  sourceAbilityId: 'velar-gales-of-power',
  probability: velarFirstStrikeProbability,
  opportunityPresence: 'conditional',
  timing: { kind: 'scheduled-rounds', rounds: [2, 4, 6, 8] },
  opportunityCount: { kind: 'scheduled-maximum', maximum: 4 },
  rollScope: 'per-target-and-effect',
  targetFacts: { count: 3, separatePerTarget: true, separatePerEffect: true },
  independence: 'unknown',
  durationRounds: 2,
  evidence: unresolvedEvidence('Whether scheduled target/effect checks are independent.'),
});

const velarSlow = {
  ...velarFirstStrike,
  id: 'velar-gales-of-power:slow' as ReliabilityComponentId,
};

const velarRecovery: AbilityReliabilityComponent = {
  id: 'velar-breath-of-renewal:recovery',
  sourceAbilityId: 'velar-breath-of-renewal',
  sourceAbilityKind: 'habit',
  reliabilityClass: 'guaranteed',
  opportunityPresence: 'not-applicable',
  timing: { kind: 'scheduled-rounds', rounds: [2, 4, 6, 8] },
  opportunityCount: { kind: 'not-applicable' },
  rollScope: 'not-applicable',
  independence: 'not-applicable',
  evidence: verifiedEvidence,
};

const velarCleanse = chanceComponent({
  id: 'velar-breath-of-renewal:cleanse',
  sourceAbilityId: 'velar-breath-of-renewal',
  probability: habitProbability('velar-breath-of-renewal', [0.12, 0.16, 0.19, 0.24, 0.3]),
  opportunityPresence: 'guaranteed-at-least-one',
  timing: { kind: 'each-round' },
  opportunityCount: { kind: 'battle-length-dependent' },
  rollScope: 'per-target',
  targetFacts: { count: 3, separatePerTarget: true, separatePerEffect: false },
  independence: 'unknown',
  evidence: unresolvedEvidence('Battle length and target/round independence are unresolved.'),
});

const malachiteLightning = chanceComponent({
  id: 'malachite-lightning-strike:first-strike',
  sourceAbilityId: 'malachite-lightning-strike',
  probability: habitProbability('malachite-lightning-strike', [0.4, 0.55, 0.7, 0.85, 1]),
  opportunityPresence: 'guaranteed-at-least-one',
  timing: { kind: 'start-of-combat' },
  opportunityCount: { kind: 'exact', value: 1 },
  rollScope: 'shared',
  independence: 'not-applicable',
  evidence: verifiedEvidence,
});

const tairaxGift = chanceComponent({
  id: 'tairax-gift-of-fire:resistance',
  sourceAbilityId: 'tairax-gift-of-fire',
  probability: habitProbability('tairax-gift-of-fire', [0.175, 0.21, 0.245, 0.2975, 0.35]),
  opportunityPresence: 'conditional',
  timing: { kind: 'conditional-event', condition: 'An Enemy is afflicted with Burn.' },
  opportunityCount: {
    kind: 'condition-count-dependent',
    condition: 'Once for each Burned Enemy at the start of each round.',
  },
  rollScope: 'unresolved',
  independence: 'unknown',
  durationRounds: 2,
  evidence: unresolvedEvidence('Burned-Enemy count and independence are unresolved.'),
});

const shimmerChanceBuff = chanceComponent({
  id: 'shimmer-unbreakable-loyalty:command-buffs',
  sourceAbilityId: 'shimmer-unbreakable-loyalty',
  probability: { kind: 'fixed', value: 0.2 },
  opportunityPresence: 'guaranteed-at-least-one',
  timing: { kind: 'each-round' },
  opportunityCount: { kind: 'battle-length-dependent' },
  rollScope: 'shared',
  independence: 'unknown',
  evidence: unresolvedEvidence('Battle length and temporal independence are unresolved.'),
});

const shimmerTactical = deterministicComponent(
  'shimmer-unbreakable-loyalty:tactical-damage',
  'shimmer-unbreakable-loyalty',
);
const shimmerRecovery = deterministicComponent(
  'shimmer-unbreakable-loyalty:recovery',
  'shimmer-unbreakable-loyalty',
);

const tairaxBurn = chanceComponent({
  id: 'tairax-burning-ward:burn',
  sourceAbilityId: 'tairax-burning-ward',
  probability: { kind: 'fixed', value: 0.5 },
  opportunityPresence: 'conditional',
  timing: { kind: 'scheduled-rounds', rounds: [2, 5, 8] },
  opportunityCount: { kind: 'scheduled-maximum', maximum: 3 },
  rollScope: 'shared',
  independence: 'unknown',
  evidence: unresolvedEvidence('Battle reach and temporal independence are unresolved.'),
});

const tairaxStagger = chanceComponent({
  id: 'tairax-burning-ward:stagger',
  sourceAbilityId: 'tairax-burning-ward',
  probability: {
    kind: 'round-specific',
    byRound: Object.fromEntries(
      [1, 3, 5, 7, 9].map((round) => [
        round,
        habitOverride('tairax-gleamstrike', 0.25, [0.375, 0.4, 0.425, 0.4625, 0.5]),
      ]),
    ),
  },
  opportunityPresence: 'guaranteed-at-least-one',
  timing: { kind: 'scheduled-rounds', rounds: [1, 3, 5, 7, 9] },
  opportunityCount: { kind: 'scheduled-maximum', maximum: 5 },
  rollScope: 'shared',
  independence: 'unknown',
  durationRounds: 2,
  evidence: unresolvedEvidence('Battle reach and temporal independence are unresolved.'),
});

const crimsonStun = chanceComponent({
  id: 'crimson-bloodscale-terror:stun',
  sourceAbilityId: 'crimson-bloodscale-terror',
  probability: {
    kind: 'round-specific',
    byRound: {
      1: habitOverride('crimson-vermins-bane', 0.2, [0.4, 0.52, 0.64, 0.8, 1]),
      3: { kind: 'fixed', value: 0.2 },
      5: { kind: 'fixed', value: 0.2 },
      7: { kind: 'fixed', value: 0.2 },
      9: { kind: 'fixed', value: 0.2 },
    },
  },
  opportunityPresence: 'guaranteed-at-least-one',
  timing: { kind: 'scheduled-rounds', rounds: [1, 3, 5, 7, 9] },
  opportunityCount: { kind: 'scheduled-maximum', maximum: 5 },
  rollScope: 'shared',
  independence: 'unknown',
  durationRounds: 2,
  evidence: unresolvedEvidence('Battle reach and temporal independence are unresolved.'),
});

const venatorDoubleStrike = chanceComponent({
  id: 'venator-feral-strike:double-strike',
  sourceAbilityId: 'venator-feral-strike',
  probability: {
    kind: 'round-specific',
    byRound: Object.fromEntries(
      [4, 6, 8].map((round) => [
        round,
        habitOverride('venator-feral-precision', 0.3, [0.4, 0.42, 0.44, 0.47, 0.5]),
      ]),
    ),
  },
  opportunityPresence: 'conditional',
  timing: { kind: 'scheduled-rounds', rounds: [4, 6, 8] },
  opportunityCount: { kind: 'scheduled-maximum', maximum: 3 },
  rollScope: 'shared',
  independence: 'unknown',
  durationRounds: 2,
  evidence: unresolvedEvidence('Battle reach and temporal independence are unresolved.'),
});

const variantChance = chanceComponent({
  ...shimmerChanceBuff,
  id: 'shimmer-unbreakable-loyalty:targeted-command-buffs',
  probability: {
    kind: 'variants',
    variants: [
      { id: 'highest-strength', probability: { kind: 'fixed', value: 0.2 } },
      { id: 'highest-instinct', probability: { kind: 'fixed', value: 0.35 } },
    ],
  },
});

const representativeComponents = [
  velarFirstStrike,
  velarSlow,
  velarRecovery,
  velarCleanse,
  malachiteLightning,
  tairaxGift,
  shimmerChanceBuff,
  shimmerTactical,
  shimmerRecovery,
  tairaxBurn,
  tairaxStagger,
  crimsonStun,
  variantChance,
] as const;

const representativeBindings: SignalReliabilityBinding[] = [
  resolvedBinding('alternative-reliability-paths', [
    path('guaranteed-recovery-path', [['recovery', [velarRecovery.id]]]),
    path('chance-first-strike-path', [['first-strike', [malachiteLightning.id]]]),
  ]),
  resolvedBinding('velar-gales-first-strike', [
    path('first-strike', [['gales-first-strike', [velarFirstStrike.id]]]),
  ]),
  resolvedBinding('velar-gales-shared-tags', [
    path('shared-gales-roll', [['gales-shared-event', [velarFirstStrike.id, velarSlow.id]]]),
  ]),
  resolvedBinding('velar-recovery', [path('recovery', [['recovery-event', [velarRecovery.id]]])]),
  resolvedBinding('velar-cleanse', [path('cleanse', [['cleanse-event', [velarCleanse.id]]])]),
  resolvedBinding('malachite-first-strike', [
    path('lightning-strike', [['lightning-event', [malachiteLightning.id]]]),
  ]),
  resolvedBinding('tairax-gift-resistance', [
    path('burn-setup-and-gift-payoff', [
      ['burn-setup', [tairaxBurn.id]],
      ['gift-payoff', [tairaxGift.id]],
    ]),
  ]),
  resolvedBinding('tairax-burning-ward-stagger', [
    path('stagger', [['stagger-roll', [tairaxStagger.id]]]),
  ]),
  resolvedBinding('crimson-bloodscale-terror-stun', [
    path('stun', [['stun-roll', [crimsonStun.id]]]),
  ]),
  resolvedBinding('shimmer-strength-variant', [
    path('strength-target', [
      ['command-buff', [componentReference(variantChance.id, 'highest-strength')]],
    ]),
  ]),
  resolvedBinding('shimmer-instinct-variant', [
    path('instinct-target', [
      ['command-buff', [componentReference(variantChance.id, 'highest-instinct')]],
    ]),
  ]),
  {
    status: 'unresolved-mixed',
    signalId: 'shimmer-instinct-payoff',
    unresolvedReason: 'The current signal spans chance buffs and guaranteed scheduled effects.',
    candidatePaths: [
      path('chance-command-buff', [['command-buff', [shimmerChanceBuff.id]]]),
      path('guaranteed-tactical', [['tactical-damage', [shimmerTactical.id]]]),
      path('guaranteed-recovery', [['recovery', [shimmerRecovery.id]]]),
    ],
  },
];

const representativeInput: ReliabilityContractInput = {
  components: representativeComponents,
  bindings: representativeBindings,
  scoringSignalIds: representativeBindings.map((binding) => binding.signalId),
  abilityCatalog: dragons.flatMap((dragon) => [
    {
      abilityId: dragon.command.id,
      kind: dragon.command.kind,
      dragonId: dragon.id,
      unlockStarRank: dragon.command.unlockStarRank,
      minimumDragonLevel: dragon.command.minimumDragonLevel,
      evidenceIds: dragon.command.evidenceIds,
    },
    {
      abilityId: dragon.trait.id,
      kind: dragon.trait.kind,
      dragonId: dragon.id,
      unlockStarRank: dragon.trait.unlockStarRank,
      minimumDragonLevel: dragon.trait.minimumDragonLevel,
      evidenceIds: dragon.trait.evidenceIds,
    },
    ...dragon.habits.map((habit) => ({
      abilityId: habit.id,
      kind: habit.kind,
      dragonId: dragon.id,
      unlockStarRank: habit.unlockStarRank,
      minimumDragonLevel: habit.minimumDragonLevel,
      evidenceIds: habit.evidenceIds,
    })),
  ]),
};

describe('production Formation Reliability contract', () => {
  it('validates representative approved components and binding paths in contract mode', () => {
    expect(validateReliabilityContract(representativeInput, 'contract')).toEqual([]);
    expect(() => assertValidReliabilityContract(representativeInput, 'contract')).not.toThrow();
  });

  it('types and validates semantic ability-id:component-slug identifiers', () => {
    expect(createReliabilityComponentId('velar-gales-of-power', 'first-strike')).toBe(
      'velar-gales-of-power:first-strike',
    );
    expect(() => createReliabilityComponentId('velar-gales-of-power', '')).toThrow(
      'ability-id:component-slug',
    );

    const malformed = { ...velarRecovery, id: 'velar-gales-of-power:' as ReliabilityComponentId };
    const mismatch = {
      ...velarRecovery,
      id: 'velar-gales-of-power:recovery' as ReliabilityComponentId,
    };
    expect(issueCodes({ ...representativeInput, components: [malformed] })).toContain(
      'component.malformed-id',
    );
    expect(issueCodes({ ...representativeInput, components: [mismatch] })).toContain(
      'component.source-mismatch',
    );
  });

  it('rejects duplicate component IDs and returns every issue deterministically', () => {
    const duplicated = {
      ...representativeInput,
      components: [velarRecovery, velarRecovery],
      bindings: [],
      scoringSignalIds: [],
    };
    const first = validateReliabilityContract(duplicated, 'contract');
    const second = validateReliabilityContract(
      { ...duplicated, components: [...duplicated.components].reverse() },
      'contract',
    );
    expect(first.map((issue) => issue.code)).toContain('component.duplicate-id');
    expect(second).toEqual(first);
  });

  it('validates fixed and complete Habit-Level probability data', () => {
    const invalidFixed = {
      ...shimmerChanceBuff,
      probability: { kind: 'fixed' as const, value: 1.01 },
    };
    const missingLevel = {
      ...velarFirstStrike,
      probability: {
        kind: 'habit-level' as const,
        habitAbilityId: 'velar-gales-of-power',
        byLevel: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4 },
      } as HabitLevelReliabilityProbability,
    };
    const unsupportedLevel = {
      ...velarFirstStrike,
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'velar-gales-of-power',
        byLevel: { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.9 },
      } as HabitLevelReliabilityProbability,
    };
    expect(issueCodes(componentOnly(invalidFixed))).toContain('probability.value-out-of-range');
    expect(issueCodes(componentOnly(missingLevel))).toContain('probability.habit-level-missing');
    expect(issueCodes(componentOnly(unsupportedLevel))).toContain(
      'probability.habit-level-unsupported',
    );
    expect(issueCodes(componentOnly(velarFirstStrike))).not.toContain(
      'probability.habit-level-missing',
    );
  });

  it('validates explicit Habit probability sources against canonical ability facts', () => {
    const malformed = {
      ...velarFirstStrike,
      probability: {
        ...velarFirstStrike.probability!,
        habitAbilityId: '',
      } as HabitLevelReliabilityProbability,
    };
    const commandSource = {
      ...velarFirstStrike,
      probability: {
        ...velarFirstStrike.probability!,
        habitAbilityId: 'tairax-burning-ward',
      } as HabitLevelReliabilityProbability,
    };
    const missingSource = {
      ...velarFirstStrike,
      probability: {
        ...velarFirstStrike.probability!,
        habitAbilityId: 'missing-habit',
      } as HabitLevelReliabilityProbability,
    };
    expect(issueCodes(componentOnly(malformed, representativeInput.abilityCatalog))).toContain(
      'probability.habit-ability-id-malformed',
    );
    expect(issueCodes(componentOnly(commandSource, representativeInput.abilityCatalog))).toContain(
      'probability.habit-ability-kind',
    );
    expect(issueCodes(componentOnly(missingSource, representativeInput.abilityCatalog))).toContain(
      'probability.habit-ability-missing',
    );
  });

  it('rejects invalid opportunity presence, counts, independence, and schedules', () => {
    const overstatedPresence = {
      ...velarFirstStrike,
      opportunityPresence: 'guaranteed-at-least-one' as const,
    };
    const invalidCount = {
      ...malachiteLightning,
      opportunityCount: { kind: 'exact' as const, value: 0 },
    };
    const invalidSingleIndependence = {
      ...malachiteLightning,
      independence: 'confirmed' as const,
    };
    const invalidRepeatedIndependence = {
      ...malachiteLightning,
      opportunityCount: { kind: 'exact' as const, value: 2 },
      independence: 'not-applicable' as const,
    };
    const invalidUnresolvedIndependence = {
      ...velarFirstStrike,
      independence: 'not-applicable' as const,
    };
    const invalidSchedule = {
      ...velarFirstStrike,
      timing: { kind: 'scheduled-rounds' as const, rounds: [4, 4, 2] },
    };

    expect(issueCodes(componentOnly(overstatedPresence))).toContain(
      'component.opportunity-presence-overstated',
    );
    expect(issueCodes(componentOnly(invalidCount))).toContain('opportunity.count-invalid');
    expect(issueCodes(componentOnly(invalidSingleIndependence))).toContain(
      'component.single-opportunity-independence',
    );
    expect(issueCodes(componentOnly(invalidRepeatedIndependence))).toContain(
      'component.repeated-opportunity-independence',
    );
    expect(issueCodes(componentOnly(invalidUnresolvedIndependence))).toContain(
      'component.independence-not-applicable',
    );
    expect(issueCodes(componentOnly(invalidSchedule))).toContain('timing.schedule-invalid');
  });

  it('rejects chance/deterministic metadata contradictions and missing evidence explanations', () => {
    const chanceWithoutProbability = { ...velarFirstStrike, probability: undefined };
    const guaranteedWithChance = {
      ...velarRecovery,
      probability: { kind: 'fixed' as const, value: 0.5 },
    };
    const unexplained = {
      ...velarFirstStrike,
      evidence: { ...velarFirstStrike.evidence, unresolvedQuestions: [] },
    };
    expect(issueCodes(componentOnly(chanceWithoutProbability))).toContain(
      'component.chance-probability-missing',
    );
    expect(issueCodes(componentOnly(guaranteedWithChance))).toContain(
      'component.deterministic-probability',
    );
    expect(issueCodes(componentOnly(unexplained))).toContain(
      'evidence.unresolved-question-missing',
    );
  });

  it('models alternatives, jointly required events, shared-event identity, and mixed behavior', () => {
    const alternatives = representativeBindings.find(
      (binding) => binding.signalId === 'alternative-reliability-paths',
    );
    const shared = representativeBindings.find(
      (binding) => binding.signalId === 'velar-gales-shared-tags',
    );
    const joint = representativeBindings.find(
      (binding) => binding.signalId === 'tairax-gift-resistance',
    );
    const mixed = representativeBindings.find(
      (binding) => binding.signalId === 'shimmer-instinct-payoff',
    );

    expect(alternatives?.status).toBe('resolved');
    if (alternatives?.status === 'resolved') {
      expect(alternatives.paths.map((candidate) => candidate.pathId)).toEqual([
        'guaranteed-recovery-path',
        'chance-first-strike-path',
      ]);
    }
    expect(shared?.status).toBe('resolved');
    if (shared?.status === 'resolved') {
      expect(shared.paths[0]?.events[0]?.componentReferences).toEqual([
        { componentId: velarFirstStrike.id },
        { componentId: velarSlow.id },
      ]);
    }
    expect(joint?.status).toBe('resolved');
    if (joint?.status === 'resolved') {
      expect(joint.paths[0]?.events.map((event) => event.eventId)).toEqual([
        'burn-setup',
        'gift-payoff',
      ]);
    }
    expect(mixed?.status).toBe('unresolved-mixed');
    if (mixed?.status === 'unresolved-mixed') {
      expect(mixed.candidatePaths).toHaveLength(3);
    }
  });

  it('rejects stale, duplicate, and missing component references', () => {
    const missingComponent = resolvedBinding('valid-signal', [
      path('missing', [['event', ['missing-ability:missing-component']]]),
    ]);
    const issues = validateReliabilityContract(
      {
        components: [velarRecovery],
        bindings: [missingComponent, missingComponent],
        scoringSignalIds: ['different-signal'],
      },
      'contract',
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'binding.component-missing',
        'binding.duplicate-signal',
        'binding.stale-signal',
      ]),
    );
  });

  it('allows partial contract mode and makes full migration mode reject incomplete coverage', () => {
    const partial: ReliabilityContractInput = {
      components: [velarRecovery, malachiteLightning],
      bindings: [
        {
          ...resolvedBinding('bound-signal', [
            path('recovery', [['recovery', [velarRecovery.id]]]),
          ]),
          bindingClass: 'guaranteed',
        },
      ],
      scoringSignalIds: ['bound-signal', 'missing-signal'],
    };

    expect(validateReliabilityContract(partial, 'contract')).toEqual([]);
    const fullIssues = validateReliabilityContract(partial, 'full-migration');
    expect(fullIssues.map((issue) => issue.code)).toEqual([
      'coverage.missing-binding',
      'coverage.unreferenced-component',
    ]);
    expect(fullIssues[0]?.message).toContain('missing-signal');
  });

  it('requires unresolved mixed bindings to be split before full migration', () => {
    expect(
      validateReliabilityContract(representativeInput, 'full-migration').map((issue) => issue.code),
    ).toContain('binding.mixed-unresolved');
  });

  it('adapts unlocked Habit progression without changing storage or defaulting missing levels', () => {
    const velar = dragons.find((dragon) => dragon.id === 'velar')!;
    const entry: OwnedDragon = {
      dragonId: velar.id,
      owned: false,
      starRank: 10,
      reignLevel: 16,
      notes: '',
      habitLevels: { 'velar-gales-of-power': 4 },
    };
    const active = reliabilityProgressionFromOwnedDragon(velar, entry);
    expect(active.activeHabitLevels['velar-gales-of-power']).toBe(4);
    expect(
      resolveComponentProbability(
        velarFirstStrike,
        componentReference(velarFirstStrike.id),
        active,
      ),
    ).toBe(0.204);

    const missing = reliabilityProgressionFromOwnedDragon(velar, {
      ...entry,
      habitLevels: {},
    });
    expect(missing.activeHabitLevels['velar-gales-of-power']).toBeNull();
    expect(
      resolveComponentProbability(
        velarFirstStrike,
        componentReference(velarFirstStrike.id),
        missing,
      ),
    ).toBeNull();

    const locked = reliabilityProgressionFromOwnedDragon(velar, {
      ...entry,
      starRank: 1,
      reignLevel: 1,
    });
    expect(locked.activeHabitLevels['velar-gales-of-power']).toBeUndefined();
  });

  it('resolves fixed and Habit-Level probability without inventing missing context', () => {
    expect(resolveReliabilityProbability({ kind: 'fixed', value: 0.2 })).toBe(0.2);
    expect(
      resolveReliabilityProbability(velarFirstStrikeProbability, {
        activeHabitLevels: { 'velar-gales-of-power': 5 },
      }),
    ).toBe(0.24);
    expect(resolveReliabilityProbability(velarFirstStrikeProbability)).toBeNull();
    expect(
      resolveReliabilityProbability({ kind: 'unknown', reason: 'Not documented.' }),
    ).toBeNull();
  });

  it('resolves Tairax Burning Ward from its separate Gleamstrike probability source', () => {
    const tairax = dragons.find((dragon) => dragon.id === 'tairax')!;
    const reference = componentReference(tairaxStagger.id);
    const beforeUnlock = reliabilityProgressionFromOwnedDragon(
      tairax,
      ownedDragon(tairax.id, 5, {}),
    );
    expect(tairaxStagger.sourceAbilityId).toBe('tairax-burning-ward');
    if (tairaxStagger.probability?.kind !== 'round-specific') {
      throw new Error('Expected Tairax round-specific probability.');
    }
    expect(tairaxStagger.probability.byRound[1]).toMatchObject({
      kind: 'habit-override',
      habitAbilityId: 'tairax-gleamstrike',
      base: 0.25,
    });
    expect(resolveComponentProbability(tairaxStagger, reference, beforeUnlock, { round: 1 })).toBe(
      0.25,
    );

    const replacements = [0.375, 0.4, 0.425, 0.4625, 0.5];
    replacements.forEach((expected, index) => {
      const progression = reliabilityProgressionFromOwnedDragon(
        tairax,
        ownedDragon(tairax.id, 6, { 'tairax-gleamstrike': (index + 1) as 1 | 2 | 3 | 4 | 5 }),
      );
      expect(resolveComponentProbability(tairaxStagger, reference, progression, { round: 3 })).toBe(
        expected,
      );
    });

    const missingLevel = reliabilityProgressionFromOwnedDragon(
      tairax,
      ownedDragon(tairax.id, 6, {}),
    );
    expect(
      resolveComponentProbability(tairaxStagger, reference, missingLevel, { round: 1 }),
    ).toBeNull();
    expect(
      resolveComponentProbability(tairaxStagger, reference, missingLevel, { round: 2 }),
    ).toBeNull();
  });

  it('replaces only Crimson Round 1 and preserves later odd-round base probability', () => {
    const crimson = dragons.find((dragon) => dragon.id === 'crimson')!;
    const reference = componentReference(crimsonStun.id);
    const beforeUnlock = reliabilityProgressionFromOwnedDragon(
      crimson,
      ownedDragon(crimson.id, 9, {}),
    );
    expect(resolveComponentProbability(crimsonStun, reference, beforeUnlock, { round: 1 })).toBe(
      0.2,
    );

    const replacements = [0.4, 0.52, 0.64, 0.8, 1];
    replacements.forEach((expected, index) => {
      const progression = reliabilityProgressionFromOwnedDragon(
        crimson,
        ownedDragon(crimson.id, 10, {
          'crimson-vermins-bane': (index + 1) as 1 | 2 | 3 | 4 | 5,
        }),
      );
      expect(resolveComponentProbability(crimsonStun, reference, progression, { round: 1 })).toBe(
        expected,
      );
      expect(resolveComponentProbability(crimsonStun, reference, progression, { round: 3 })).toBe(
        0.2,
      );
    });

    const missingLevel = reliabilityProgressionFromOwnedDragon(
      crimson,
      ownedDragon(crimson.id, 10, {}),
    );
    expect(
      resolveComponentProbability(crimsonStun, reference, missingLevel, { round: 1 }),
    ).toBeNull();
    expect(resolveComponentProbability(crimsonStun, reference, missingLevel, { round: 5 })).toBe(
      0.2,
    );
    expect(
      resolveComponentProbability(crimsonStun, reference, missingLevel, { round: 2 }),
    ).toBeNull();
  });

  it('represents Venator Feral Precision as the same explicit round replacement pattern', () => {
    expect(
      issueCodes(componentOnly(venatorDoubleStrike, representativeInput.abilityCatalog)),
    ).toEqual([]);
    const venator = dragons.find((dragon) => dragon.id === 'venator')!;
    const reference = componentReference(venatorDoubleStrike.id);
    const locked = reliabilityProgressionFromOwnedDragon(venator, ownedDragon(venator.id, 5, {}));
    const active = reliabilityProgressionFromOwnedDragon(
      venator,
      ownedDragon(venator.id, 6, { 'venator-feral-precision': 3 }),
    );
    expect(resolveComponentProbability(venatorDoubleStrike, reference, locked, { round: 4 })).toBe(
      0.3,
    );
    expect(resolveComponentProbability(venatorDoubleStrike, reference, active, { round: 8 })).toBe(
      0.44,
    );
    expect(
      resolveComponentProbability(venatorDoubleStrike, reference, active, { round: 5 }),
    ).toBeNull();
  });

  it('carries and validates probability variant selection in binding references', () => {
    const strengthReference = componentReference(variantChance.id, 'highest-strength');
    const instinctReference = componentReference(variantChance.id, 'highest-instinct');
    const progression = { starRank: null, dragonLevel: null, activeHabitLevels: {} };
    expect(resolveComponentProbability(variantChance, strengthReference, progression)).toBe(0.2);
    expect(resolveComponentProbability(variantChance, instinctReference, progression)).toBe(0.35);

    const strengthBinding = representativeBindings.find(
      (binding) => binding.signalId === 'shimmer-strength-variant',
    );
    const instinctBinding = representativeBindings.find(
      (binding) => binding.signalId === 'shimmer-instinct-variant',
    );
    if (strengthBinding?.status !== 'resolved' || instinctBinding?.status !== 'resolved') {
      throw new Error('Expected resolved variant bindings.');
    }
    expect(strengthBinding.paths[0]?.events[0]?.componentReferences[0]).toEqual(strengthReference);
    expect(instinctBinding.paths[0]?.events[0]?.componentReferences[0]).toEqual(instinctReference);

    const missingVariant = resolvedBinding('variant-signal', [
      path('variant', [['event', [componentReference(variantChance.id)]]]),
    ]);
    const staleVariant = resolvedBinding('variant-signal', [
      path('variant', [['event', [componentReference(variantChance.id, 'removed-branch')]]]),
    ]);
    const unexpectedVariant = resolvedBinding('fixed-signal', [
      path('fixed', [['event', [componentReference(shimmerChanceBuff.id, 'highest-strength')]]]),
    ]);
    expect(bindingIssueCodes(variantChance, missingVariant)).toContain(
      'binding.probability-variant-missing',
    );
    expect(bindingIssueCodes(variantChance, staleVariant)).toContain(
      'binding.probability-variant-unknown',
    );
    expect(bindingIssueCodes(shimmerChanceBuff, unexpectedVariant)).toContain(
      'binding.probability-variant-unexpected',
    );

    const duplicateBranches = {
      ...variantChance,
      probability: {
        kind: 'variants' as const,
        variants: [
          { id: 'same', probability: { kind: 'fixed' as const, value: 0.2 } },
          { id: 'same', probability: { kind: 'fixed' as const, value: 0.3 } },
        ],
      },
    };
    expect(issueCodes(componentOnly(duplicateBranches))).toContain('probability.variant-duplicate');
  });

  it('calculates cumulative independent activation without deciding evidence eligibility', () => {
    expect(cumulativeIndependentActivationProbability(0.2, 1)).toBeCloseTo(0.2);
    expect(cumulativeIndependentActivationProbability(0.2, 2)).toBeCloseTo(0.36);
    expect(cumulativeIndependentActivationProbability(0.2, 4)).toBeCloseTo(0.5904);
    expect(cumulativeIndependentActivationProbability(1, 4)).toBe(1);
    expect(cumulativeIndependentActivationProbability(0, 4)).toBe(0);
    expect(() => cumulativeIndependentActivationProbability(-0.1, 1)).toThrow(RangeError);
    expect(() => cumulativeIndependentActivationProbability(1.1, 1)).toThrow(RangeError);
    expect(() => cumulativeIndependentActivationProbability(0.2, 0)).toThrow(RangeError);
    expect(() => cumulativeIndependentActivationProbability(0.2, 1.5)).toThrow(RangeError);
  });

  it('orders collected validation issues deterministically by path, code, and message', () => {
    const invalid = {
      ...representativeInput,
      components: [
        { ...shimmerChanceBuff, probability: { kind: 'fixed' as const, value: 2 } },
        {
          ...velarFirstStrike,
          timing: { kind: 'scheduled-rounds' as const, rounds: [4, 2] },
        },
      ],
      bindings: [],
      scoringSignalIds: [],
    };
    const first = validateReliabilityContract(invalid, 'contract');
    const second = validateReliabilityContract(
      { ...invalid, components: [...invalid.components].reverse() },
      'contract',
    );
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(1);
  });
});

function chanceComponent(
  component: Omit<AbilityReliabilityComponent, 'reliabilityClass' | 'sourceAbilityKind'> & {
    sourceAbilityKind?: AbilityReliabilityComponent['sourceAbilityKind'];
  },
): AbilityReliabilityComponent {
  return {
    ...component,
    sourceAbilityKind: component.sourceAbilityKind ?? abilityKindFor(component.sourceAbilityId),
    reliabilityClass: 'chance',
  };
}

function deterministicComponent(
  id: ReliabilityComponentId,
  sourceAbilityId: string,
): AbilityReliabilityComponent {
  return {
    id,
    sourceAbilityId,
    sourceAbilityKind: abilityKindFor(sourceAbilityId),
    reliabilityClass: 'guaranteed',
    opportunityPresence: 'not-applicable',
    timing: { kind: 'scheduled-rounds', rounds: [2, 4, 6, 8] },
    opportunityCount: { kind: 'not-applicable' },
    rollScope: 'not-applicable',
    independence: 'not-applicable',
    evidence: verifiedEvidence,
  };
}

function abilityKindFor(sourceAbilityId: string) {
  const ability = dragons
    .flatMap((dragon) => [dragon.command, dragon.trait, ...dragon.habits])
    .find((candidate) => candidate.id === sourceAbilityId);
  if (!ability) throw new Error(`Missing fixture ability ${sourceAbilityId}.`);
  return ability.kind;
}

function resolvedBinding(
  signalId: string,
  paths: ReturnType<typeof path>[],
): Extract<SignalReliabilityBinding, { status: 'resolved' }> {
  return { status: 'resolved', signalId, paths };
}

function path(
  pathId: string,
  events: Array<
    [
      eventId: string,
      componentReferences: Array<ReliabilityComponentId | ReliabilityComponentReference>,
    ]
  >,
) {
  return {
    pathId,
    events: events.map(([eventId, references]) => ({
      eventId,
      componentReferences: references.map((reference) =>
        typeof reference === 'string' ? componentReference(reference) : reference,
      ),
    })),
  };
}

function componentReference(
  componentId: ReliabilityComponentId,
  probabilityVariantId?: string,
): ReliabilityComponentReference {
  return probabilityVariantId ? { componentId, probabilityVariantId } : { componentId };
}

function componentOnly(
  component: AbilityReliabilityComponent,
  abilityCatalog?: ReliabilityContractInput['abilityCatalog'],
): ReliabilityContractInput {
  return { components: [component], bindings: [], scoringSignalIds: [], abilityCatalog };
}

function issueCodes(input: ReliabilityContractInput): string[] {
  return validateReliabilityContract(input, 'contract').map((issue) => issue.code);
}

function bindingIssueCodes(
  component: AbilityReliabilityComponent,
  binding: SignalReliabilityBinding,
): string[] {
  return issueCodes({
    components: [component],
    bindings: [binding],
    scoringSignalIds: [binding.signalId],
  });
}

function ownedDragon(
  dragonId: string,
  starRank: number,
  habitLevels: OwnedDragon['habitLevels'],
): OwnedDragon {
  return {
    dragonId,
    owned: false,
    starRank,
    reignLevel: 1,
    notes: '',
    habitLevels,
  };
}
