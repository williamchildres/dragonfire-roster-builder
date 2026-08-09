import { defineDragonReliabilityRegistry } from '../registryTypes';

const baseRisingTide = { '1': 0.25, '2': 0.3, '3': 0.35, '4': 0.425, '5': 0.5 } as const;
const doubledRisingTide = { '1': 0.5, '2': 0.6, '3': 0.7, '4': 0.85, '5': 1 } as const;
const eclipsingBase = { '1': 0.2, '2': 0.26, '3': 0.32, '4': 0.4, '5': 0.5 } as const;
const eclipsingDoubled = { '1': 0.4, '2': 0.52, '3': 0.64, '4': 0.8, '5': 1 } as const;

const deterministicConditionQuestions = [
  'Activation is deterministic once the documented battle-state or action condition is satisfied.',
  'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
] as const;

export const moondancerReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'moondancer',
  components: [
    {
      id: 'moondancer-crescent-blade:sentinel-grant', sourceAbilityId: 'moondancer-crescent-blade', sourceAbilityKind: 'command', reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Round 1, provided exactly one other Ally Sentinel is selected.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable',
      targetSelectorEvidence: { population: 'friendly', qualification: '1 other Ally Sentinel in any lane', recipientCount: 1, includeSelf: false, tieHandling: 'unresolved' }, researchOnly: true,
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-crescent-blade-1-2026-08-09'], unresolvedQuestions: ['No target-selection rule is verified when both other Allies are Sentinels.'] },
    },
    {
      id: 'moondancer-crescent-blade:rising-tide-trigger', sourceAbilityId: 'moondancer-crescent-blade', sourceAbilityKind: 'command', reliabilityClass: 'chance', probability: { kind: 'fixed', value: 0.5 },
      opportunityPresence: 'conditional', opportunityCondition: 'The selected other Ally Sentinel deals Tactical Damage or applies Recovery.', timing: { kind: 'after-event', sourceEvent: 'Selected Crescent Blade recipient deals Tactical Damage or applies Recovery.' }, opportunityCount: { kind: 'ability-activation-dependent', sourceEvent: 'Qualifying selected-recipient events, capped at once per round.' }, rollScope: 'shared', independence: 'unknown',
      stackFacts: { stackLabel: 'Rising Tide', maximum: 8, perStackMetricLabel: 'Moondancer Damage Received', perStackDelta: -0.02, thresholds: [4, 6], triggerLimitPerRound: 1 },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-crescent-blade-1-2026-08-09', 'moondancer-crescent-blade-2-2026-08-09', 'moondancer-crescent-blade-3-2026-08-09', 'moondancer-crescent-blade-4-2026-08-09'], unresolvedQuestions: ['Qualifying event frequency and temporal independence are not established.'] },
    },
    {
      id: 'moondancer-crescent-blade:physical-damage', sourceAbilityId: 'moondancer-crescent-blade', sourceAbilityKind: 'command', reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable', timing: { kind: 'scheduled-rounds', rounds: [2, 4, 6, 8, 10] }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', targetFacts: { count: 2 }, independence: 'not-applicable',
      conditionalMagnitudeUplifts: [{ kind: 'magnitude-uplift', conditionLabel: '6+ Stars and Full Moon Habit Level', affectedMetricLabel: 'Crescent Blade Physical Damage Rate', baseline: 0.75, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: { '1': 0.85, '2': 0.92, '3': 0.99, '4': 1.095, '5': 1.2 } }, modifier: { kind: 'multiplier', value: 1 } }],
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-crescent-blade-1-2026-08-09', 'moondancer-crescent-blade-2-2026-08-09', 'moondancer-crescent-blade-3-2026-08-09', 'moondancer-crescent-blade-4-2026-08-09'], unresolvedQuestions: [] },
    },
    {
      id: 'moondancer-warriors-zeal:left-flank-stats', sourceAbilityId: 'moondancer-warriors-zeal', sourceAbilityKind: 'trait', reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Deterministic at Level 16+ while Moondancer is Vanguard.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 1, minimumDragonLevel: 16 },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-warriors-zeal-2026-08-09'], unresolvedQuestions: [] },
    },
    {
      id: 'moondancer-warriors-zeal:self-physical', sourceAbilityId: 'moondancer-warriors-zeal', sourceAbilityKind: 'trait', reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Deterministic at Level 16+ while Moondancer is Vanguard.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 1, minimumDragonLevel: 16 }, researchOnly: true,
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-warriors-zeal-2026-08-09'], unresolvedQuestions: [] },
    },
    {
      id: 'moondancer-new-moon:rising-tide', sourceAbilityId: 'moondancer-new-moon', sourceAbilityKind: 'habit', reliabilityClass: 'chance',
      probability: { kind: 'variants', variants: [{ id: 'ordinary', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: baseRisingTide } }, { id: 'advantage', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: doubledRisingTide } }] },
      opportunityPresence: 'guaranteed-at-least-one', timing: { kind: 'scheduled-rounds', rounds: [1, 3, 5] }, opportunityCount: { kind: 'scheduled-maximum', maximum: 3 }, rollScope: 'shared', independence: 'unknown', unlock: { minimumStarRank: 2 }, researchOnly: true,
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-new-moon-2026-08-09'], unresolvedQuestions: ['Temporal independence across rounds is not established.'] },
    },
    {
      id: 'moondancer-new-moon:advantage-uplift', sourceAbilityId: 'moondancer-new-moon', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Any Ally has Advantage.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 2 },
      conditionalUplift: { kind: 'probability-uplift', conditionLabel: 'Advantage', affectedMetricLabel: "New Moon's Rising Tide chance", affectedComponentId: 'moondancer-new-moon:rising-tide', baselineVariantId: 'ordinary', conditionedVariantId: 'advantage', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: baseRisingTide }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: doubledRisingTide }, absoluteDelta: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: baseRisingTide }, relativeMultiplier: 2, modifier: { kind: 'multiplier', value: 2 } },
      conditionalUplifts: [{ kind: 'probability-uplift', conditionLabel: 'Advantage', affectedMetricLabel: "Full Moon's Rising Tide chance", affectedComponentId: 'moondancer-full-moon:rising-tide', baselineVariantId: 'ordinary', conditionedVariantId: 'advantage', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: baseRisingTide }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: doubledRisingTide }, absoluteDelta: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: baseRisingTide }, relativeMultiplier: 2, modifier: { kind: 'multiplier', value: 2 } }],
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-new-moon-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions, reviewNote: 'Advantage selects the doubled branch; the Rising Tide result remains probabilistic.' },
    },
    {
      id: 'moondancer-new-moon:sentinel-support', sourceAbilityId: 'moondancer-new-moon', sourceAbilityKind: 'habit', reliabilityClass: 'guaranteed', opportunityPresence: 'not-applicable', timing: { kind: 'scheduled-rounds', rounds: [1, 3, 5, 7, 9] }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', targetFacts: { count: 1, separatePerEffect: false }, independence: 'not-applicable', durationRounds: 2, unlock: { minimumStarRank: 2 },
      conditionalMagnitudeUplifts: [
        { kind: 'magnitude-uplift', conditionLabel: '4+ Rising Tide stacks', affectedMetricLabel: 'New Moon Instinct support', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: { '1': 0.09, '2': 0.108, '3': 0.126, '4': 0.153, '5': 0.18 } }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: { '1': 0.135, '2': 0.162, '3': 0.189, '4': 0.2295, '5': 0.27 } }, modifier: { kind: 'multiplier', value: 1.5 } },
        { kind: 'magnitude-uplift', conditionLabel: '4+ Rising Tide stacks', affectedMetricLabel: 'New Moon Tactical Damage support', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: { '1': 0.06, '2': 0.072, '3': 0.084, '4': 0.102, '5': 0.12 } }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-new-moon', byLevel: { '1': 0.09, '2': 0.108, '3': 0.126, '4': 0.153, '5': 0.18 } }, modifier: { kind: 'multiplier', value: 1.5 } },
      ],
      targetSelectorEvidence: { population: 'friendly', qualification: '1 other Ally Sentinel', recipientCount: 1, includeSelf: false, tieHandling: 'unresolved' },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-new-moon-2026-08-09'], unresolvedQuestions: [] },
    },
    {
      id: 'moondancer-reactive-instincts:highest-instinct-support', sourceAbilityId: 'moondancer-reactive-instincts', sourceAbilityKind: 'habit', reliabilityClass: 'guaranteed', opportunityPresence: 'not-applicable', timing: { kind: 'start-of-combat' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', targetFacts: { count: 1, separatePerEffect: false }, independence: 'not-applicable', unlock: { minimumStarRank: 4 },
      targetSelectorEvidence: { population: 'friendly', stat: 'instinct', order: 'highest', recipientCount: 1, includeSelf: true, tieHandling: 'unresolved' },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-reactive-instincts-2026-08-09'], unresolvedQuestions: ['No tie rule is verified for equal highest Instinct.'] },
    },
    {
      id: 'moondancer-full-moon:rising-tide', sourceAbilityId: 'moondancer-full-moon', sourceAbilityKind: 'habit', reliabilityClass: 'chance',
      probability: { kind: 'variants', variants: [{ id: 'ordinary', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: baseRisingTide } }, { id: 'advantage', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: doubledRisingTide } }] },
      opportunityPresence: 'conditional', timing: { kind: 'scheduled-rounds', rounds: [6, 8, 10] }, opportunityCount: { kind: 'scheduled-maximum', maximum: 3 }, rollScope: 'shared', independence: 'unknown', unlock: { minimumStarRank: 6 }, researchOnly: true,
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-full-moon-2026-08-09'], unresolvedQuestions: ['A battle reaching Round 6 and temporal independence are not guaranteed.'] },
    },
    {
      id: 'moondancer-full-moon:advantage-uplift', sourceAbilityId: 'moondancer-full-moon', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Any Ally has Advantage.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 6 }, researchOnly: true,
      conditionalUplift: { kind: 'probability-uplift', conditionLabel: 'Advantage', affectedMetricLabel: "Full Moon's Rising Tide chance", affectedComponentId: 'moondancer-full-moon:rising-tide', baselineVariantId: 'ordinary', conditionedVariantId: 'advantage', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: baseRisingTide }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: doubledRisingTide }, absoluteDelta: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: baseRisingTide }, relativeMultiplier: 2, modifier: { kind: 'multiplier', value: 2 } },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-full-moon-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions, reviewNote: 'Advantage selects the doubled branch; the Rising Tide result remains probabilistic.' },
    },
    {
      id: 'moondancer-full-moon:least-troops-stack', sourceAbilityId: 'moondancer-full-moon', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'On Rounds 6, 8, and 10, Moondancer has the least troops of all combatants.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 6 }, researchOnly: true,
      targetSelectorEvidence: { population: 'friendly', stat: 'troops', order: 'lowest', recipientCount: 1, includeSelf: true, tieHandling: 'unresolved' },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-full-moon-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions, reviewNote: 'This additional stack can coexist with a successful chance-based stack; no mutual exclusion is stated.' },
    },
    {
      id: 'moondancer-full-moon:four-stack-damage-rate', sourceAbilityId: 'moondancer-full-moon', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Moondancer has 4+ Rising Tide stacks.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 6 }, researchOnly: true,
      conditionalMagnitudeUplifts: [{ kind: 'magnitude-uplift', conditionLabel: '4+ Rising Tide stacks', affectedMetricLabel: 'Crescent Blade Physical Damage Rate', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: { '1': 0.85, '2': 0.92, '3': 0.99, '4': 1.095, '5': 1.2 } }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-full-moon', byLevel: { '1': 1.7, '2': 1.84, '3': 1.98, '4': 2.19, '5': 2.4 } }, modifier: { kind: 'multiplier', value: 2 } }],
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-full-moon-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions },
    },
    {
      id: 'moondancer-blood-moon:four-stack-physical-buff', sourceAbilityId: 'moondancer-blood-moon', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Each Round when Moondancer has 4+ Rising Tide stacks.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 8 }, researchOnly: true,
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-blood-moon-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions },
    },
    {
      id: 'moondancer-blood-moon:bleed', sourceAbilityId: 'moondancer-blood-moon', sourceAbilityKind: 'habit', reliabilityClass: 'chance',
      probability: { kind: 'variants', variants: [{ id: 'below-six-stacks', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-blood-moon', byLevel: baseRisingTide } }, { id: 'six-plus-stacks', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-blood-moon', byLevel: doubledRisingTide } }] },
      opportunityPresence: 'guaranteed-at-least-one', timing: { kind: 'scheduled-rounds', rounds: [1, 3, 5, 7, 9] }, opportunityCount: { kind: 'scheduled-maximum', maximum: 5 }, rollScope: 'unresolved', targetFacts: { count: 2 }, independence: 'unknown', durationRounds: 2, unlock: { minimumStarRank: 8 },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-blood-moon-2026-08-09'], unresolvedQuestions: ['Whether one shared roll or separate per-target rolls control the two Bleed targets.', 'Temporal independence across odd rounds is not established.'] },
    },
    {
      id: 'moondancer-blood-moon:six-stack-bleed-uplift', sourceAbilityId: 'moondancer-blood-moon', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Moondancer has 6+ Rising Tide stacks.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 8 }, researchOnly: true,
      conditionalUplift: { kind: 'probability-uplift', conditionLabel: '6+ Rising Tide stacks', affectedMetricLabel: "Blood Moon's Bleed chance", affectedComponentId: 'moondancer-blood-moon:bleed', baselineVariantId: 'below-six-stacks', conditionedVariantId: 'six-plus-stacks', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-blood-moon', byLevel: baseRisingTide }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-blood-moon', byLevel: doubledRisingTide }, absoluteDelta: { kind: 'habit-level', habitAbilityId: 'moondancer-blood-moon', byLevel: baseRisingTide }, relativeMultiplier: 2, modifier: { kind: 'multiplier', value: 2 } },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-blood-moon-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions },
    },
    {
      id: 'moondancer-eclipsing-strike:shared-activation', sourceAbilityId: 'moondancer-eclipsing-strike', sourceAbilityKind: 'habit', reliabilityClass: 'chance',
      probability: { kind: 'variants', variants: [{ id: 'below-six-stacks', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-eclipsing-strike', byLevel: eclipsingBase } }, { id: 'six-plus-stacks', probability: { kind: 'habit-level', habitAbilityId: 'moondancer-eclipsing-strike', byLevel: eclipsingDoubled } }] },
      opportunityPresence: 'guaranteed-at-least-one', timing: { kind: 'each-round' }, opportunityCount: { kind: 'battle-length-dependent' }, rollScope: 'shared', targetFacts: { count: 1, separatePerEffect: false }, independence: 'unknown', durationRounds: 2, unlock: { minimumStarRank: 10 }, researchOnly: true,
      targetSelectorEvidence: { population: 'enemy', stat: 'troops', order: 'highest', recipientCount: 1, tieHandling: 'unresolved' },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-eclipsing-strike-2026-08-09'], unresolvedQuestions: ['No tie rule is verified for Enemies tied for Most Troops.', 'Temporal independence across rounds is not established.'], reviewNote: 'Damage Dealt -18% and, at 6+ stacks, Initiative -25% share this successful activation.' },
    },
    {
      id: 'moondancer-eclipsing-strike:six-stack-uplift', sourceAbilityId: 'moondancer-eclipsing-strike', sourceAbilityKind: 'habit', reliabilityClass: 'conditional-deterministic', opportunityPresence: 'not-applicable', timing: { kind: 'conditional-event', condition: 'Moondancer has 6+ Rising Tide stacks.' }, opportunityCount: { kind: 'not-applicable' }, rollScope: 'not-applicable', independence: 'not-applicable', unlock: { minimumStarRank: 10 }, researchOnly: true,
      conditionalUplift: { kind: 'probability-uplift', conditionLabel: '6+ Rising Tide stacks', affectedMetricLabel: "Eclipsing Strike's activation chance", affectedComponentId: 'moondancer-eclipsing-strike:shared-activation', baselineVariantId: 'below-six-stacks', conditionedVariantId: 'six-plus-stacks', baseline: { kind: 'habit-level', habitAbilityId: 'moondancer-eclipsing-strike', byLevel: eclipsingBase }, conditioned: { kind: 'habit-level', habitAbilityId: 'moondancer-eclipsing-strike', byLevel: eclipsingDoubled }, absoluteDelta: { kind: 'habit-level', habitAbilityId: 'moondancer-eclipsing-strike', byLevel: eclipsingBase }, relativeMultiplier: 2, modifier: { kind: 'multiplier', value: 2 } },
      evidence: { verificationStatus: 'verified', evidenceIds: ['moondancer-eclipsing-strike-2026-08-09'], unresolvedQuestions: deterministicConditionQuestions },
    },
  ],
  bindings: [
    binding('moondancer-crescent-blade-physical', 'guaranteed', 'moondancer-crescent-blade:physical-damage'),
    {
      status: 'resolved', signalId: 'moondancer-blood-moon-bleed', bindingClass: 'chance', paths: [
        path('below-six-stacks', 'moondancer-blood-moon:bleed', 'below-six-stacks'),
        path('six-plus-stacks', 'moondancer-blood-moon:bleed', 'six-plus-stacks'),
      ],
    },
    binding('moondancer-warriors-zeal-left-stats', 'guaranteed', 'moondancer-warriors-zeal:left-flank-stats'),
    binding('moondancer-new-moon-instinct', 'guaranteed', 'moondancer-new-moon:sentinel-support'),
    binding('moondancer-new-moon-tactical', 'guaranteed', 'moondancer-new-moon:sentinel-support'),
    binding('moondancer-reactive-instincts-instinct', 'guaranteed', 'moondancer-reactive-instincts:highest-instinct-support'),
    binding('moondancer-reactive-instincts-initiative', 'guaranteed', 'moondancer-reactive-instincts:highest-instinct-support'),
    {
      status: 'resolved', signalId: 'moondancer-advantage-rising-tide-payoff', bindingClass: 'conditional-deterministic', paths: [{ pathId: 'advantage-uplifts', events: [event('moondancer-new-moon:advantage-uplift')] }],
    },
    binding('moondancer-crescent-blade-trigger-payoff', 'chance', 'moondancer-crescent-blade:rising-tide-trigger'),
    binding('moondancer-strength-payoff', 'guaranteed', 'moondancer-crescent-blade:physical-damage'),
    binding('moondancer-physical-payoff', 'guaranteed', 'moondancer-crescent-blade:physical-damage'),
  ],
});

function event(componentId: `${string}:${string}`) {
  return { eventId: componentId, componentReferences: [{ componentId }] } as const;
}

function binding(signalId: string, bindingClass: 'guaranteed' | 'chance', componentId: `${string}:${string}`) {
  return { status: 'resolved' as const, signalId, bindingClass, paths: [{ pathId: 'activation', events: [event(componentId)] }] };
}

function path(pathId: string, componentId: `${string}:${string}`, probabilityVariantId: string) {
  return { pathId, appliesWhen: { kind: 'probability-context' as const, id: probabilityVariantId }, events: [{ eventId: componentId, componentReferences: [{ componentId, probabilityVariantId }] }] };
}
