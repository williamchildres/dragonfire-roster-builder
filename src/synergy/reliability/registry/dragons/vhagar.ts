import { defineDragonReliabilityRegistry } from '../registryTypes';

export const vhagarReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'vhagar',
  components: [
    {
      id: 'vhagar-battle-leader:vhagar-battle-leader-physical',
      sourceAbilityId: 'vhagar-battle-leader',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Deterministic once unlocked and position-valid.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      unlock: {
        minimumStarRank: 4,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-battle-leader-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vhagar-blazing-onslaught:vhagar-blazing-onslaught-vulnerability',
      sourceAbilityId: 'vhagar-blazing-onslaught',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Deterministic once unlocked and position-valid.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      unlock: {
        minimumStarRank: 8,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-blazing-onslaught-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vhagar-fiery-bonds:taunt',
      sourceAbilityId: 'vhagar-fiery-bonds',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'ordinary-target',
            probability: {
              kind: 'fixed',
              value: 0.25,
            },
          },
          {
            id: 'burn-afflicted-target',
            probability: {
              kind: 'fixed',
              value: 0.5,
            },
          },
        ],
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'unresolved',
      targetFacts: {
        count: 3,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-fiery-bonds-summary-2026-06-25'],
        unresolvedQuestions: [
          'Whether Taunt uses one group roll or separate rolls per target.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'vhagar-fiery-bonds:burn-taunt-probability-uplift',
      sourceAbilityId: 'vhagar-fiery-bonds',
      sourceAbilityKind: 'command',
      reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition:
          'A target is afflicted with Burn, which deterministically selects Fiery Bonds\' enhanced Taunt probability branch.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      conditionalUplift: {
        kind: 'probability-uplift',
        conditionLabel: 'Burn',
        affectedMetricLabel: "Fiery Bonds' Taunt chance",
        affectedComponentId: 'vhagar-fiery-bonds:taunt',
        baselineVariantId: 'ordinary-target',
        conditionedVariantId: 'burn-afflicted-target',
        baseline: 0.25,
        conditioned: 0.5,
        absoluteDelta: 0.25,
        relativeMultiplier: 2,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-fiery-bonds-summary-2026-06-25'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
        reviewNote:
          'Burn deterministically changes the applicable Taunt probability; the subsequent Taunt result remains probabilistic.',
      },
    },
    {
      id: 'vhagar-fiery-bonds:vhagar-fiery-bonds-physical',
      sourceAbilityId: 'vhagar-fiery-bonds',
      sourceAbilityKind: 'command',
      reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Deterministic once unlocked and position-valid.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-fiery-bonds-summary-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vhagar-skyward-titan:third-stack-physical',
      sourceAbilityId: 'vhagar-skyward-titan',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.3,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-skyward-titan-2026-06-25'],
        unresolvedQuestions: [
          'The exact probability of reaching the third stack cannot be calculated without battle length and temporal independence.',
        ],
        reviewNote:
          'Underlying per-round Bulwark-stack chance; the scoring signal activates only after the third successful stack. Actual opportunities depend on battle length and the five-stack cap.',
      },
    },
    {
      id: 'vhagar-warriors-resilience:vhagar-warriors-resilience-left-tactical',
      sourceAbilityId: 'vhagar-warriors-resilience',
      sourceAbilityKind: 'trait',
      reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Deterministic once unlocked and position-valid.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      unlock: {
        minimumStarRank: 1,
        minimumDragonLevel: 16,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vhagar-warriors-resilience-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'vhagar-battle-leader-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vhagar-battle-leader:vhagar-battle-leader-physical',
              componentReferences: [
                {
                  componentId: 'vhagar-battle-leader:vhagar-battle-leader-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vhagar-blazing-onslaught-vulnerability',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vhagar-blazing-onslaught:vhagar-blazing-onslaught-vulnerability',
              componentReferences: [
                {
                  componentId: 'vhagar-blazing-onslaught:vhagar-blazing-onslaught-vulnerability',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vhagar-fiery-bonds-burn-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'burn-taunt-probability-uplift',
          events: [
            {
              eventId: 'vhagar-fiery-bonds:burn-taunt-probability-uplift',
              componentReferences: [
                {
                  componentId: 'vhagar-fiery-bonds:burn-taunt-probability-uplift',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vhagar-fiery-bonds-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vhagar-fiery-bonds:vhagar-fiery-bonds-physical',
              componentReferences: [
                {
                  componentId: 'vhagar-fiery-bonds:vhagar-fiery-bonds-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vhagar-fiery-bonds-taunt',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'ordinary-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'ordinary-target',
          },
          events: [
            {
              eventId: 'vhagar-fiery-bonds:taunt',
              componentReferences: [
                {
                  componentId: 'vhagar-fiery-bonds:taunt',
                  probabilityVariantId: 'ordinary-target',
                },
              ],
            },
          ],
        },
        {
          pathId: 'burn-afflicted-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'burn-afflicted-target',
          },
          events: [
            {
              eventId: 'vhagar-fiery-bonds:taunt',
              componentReferences: [
                {
                  componentId: 'vhagar-fiery-bonds:taunt',
                  probabilityVariantId: 'burn-afflicted-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vhagar-skyward-titan-physical',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vhagar-skyward-titan:third-stack-physical',
              componentReferences: [
                {
                  componentId: 'vhagar-skyward-titan:third-stack-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vhagar-warriors-resilience-left-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vhagar-warriors-resilience:vhagar-warriors-resilience-left-tactical',
              componentReferences: [
                {
                  componentId:
                    'vhagar-warriors-resilience:vhagar-warriors-resilience-left-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
