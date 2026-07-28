import { defineDragonReliabilityRegistry } from '../registryTypes';

export const velarReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'velar',
  components: [
    {
      id: 'velar-breath-of-renewal:velar-breath-of-renewal-recovery',
      sourceAbilityId: 'velar-breath-of-renewal',
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
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['velar-breath-of-renewal-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'velar-fierce-unity:velar-fierce-unity-initiative-payoff',
      sourceAbilityId: 'velar-fierce-unity',
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
        evidenceIds: ['velar-fierce-unity-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'velar-fierce-unity:velar-fierce-unity-stats',
      sourceAbilityId: 'velar-fierce-unity',
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
        evidenceIds: ['velar-fierce-unity-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'velar-gales-of-power:first-strike',
      sourceAbilityId: 'velar-gales-of-power',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'velar-gales-of-power',
        byLevel: {
          '1': 0.12,
          '2': 0.144,
          '3': 0.168,
          '4': 0.204,
          '5': 0.24,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 4, 6, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'per-target-and-effect',
      targetFacts: {
        count: 3,
        separatePerTarget: true,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['velar-gales-of-power-2026-07-03'],
        unresolvedQuestions: [
          'Wording confirms separate checks per target and effect, but not statistical independence.',
          'Actual valid-target count and whether battle reaches all four rounds are unresolved.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'velar-gales-of-power:slow',
      sourceAbilityId: 'velar-gales-of-power',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'velar-gales-of-power',
        byLevel: {
          '1': 0.12,
          '2': 0.144,
          '3': 0.168,
          '4': 0.204,
          '5': 0.24,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 4, 6, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'per-target-and-effect',
      targetFacts: {
        count: 3,
        separatePerTarget: true,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['velar-gales-of-power-2026-07-03'],
        unresolvedQuestions: [
          'Wording confirms separate checks per target and effect, but not statistical independence.',
          'Actual valid-target count and whether battle reaches all four rounds are unresolved.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'velar-sentinels-wit:velar-sentinels-wit-left-stats',
      sourceAbilityId: 'velar-sentinels-wit',
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
        evidenceIds: ['velar-sentinels-wit-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'velar-strategic-leader:velar-strategic-leader-tactical',
      sourceAbilityId: 'velar-strategic-leader',
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
        minimumStarRank: 2,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['velar-strategic-leader-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'velar-whirlwind:advantage',
      sourceAbilityId: 'velar-whirlwind',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 4, 6, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'shared',
      targetFacts: {
        count: 2,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['velar-whirlwind-summary-2026-07-03'],
        unresolvedQuestions: [
          'Whether checks on separate scheduled rounds are statistically independent.',
          'Which two other Allies are selected when more than two are valid is implicit in a three-dragon formation but not a general combat rule.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'velar-whirlwind:velar-whirlwind-tactical',
      sourceAbilityId: 'velar-whirlwind',
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
        evidenceIds: ['velar-whirlwind-summary-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'velar-breath-of-renewal-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-breath-of-renewal:velar-breath-of-renewal-recovery',
              componentReferences: [
                {
                  componentId: 'velar-breath-of-renewal:velar-breath-of-renewal-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-fierce-unity-initiative-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-fierce-unity:velar-fierce-unity-initiative-payoff',
              componentReferences: [
                {
                  componentId: 'velar-fierce-unity:velar-fierce-unity-initiative-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-fierce-unity-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-fierce-unity:velar-fierce-unity-stats',
              componentReferences: [
                {
                  componentId: 'velar-fierce-unity:velar-fierce-unity-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-gales-of-power-first-strike',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-gales-of-power:first-strike',
              componentReferences: [
                {
                  componentId: 'velar-gales-of-power:first-strike',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-gales-of-power-slow',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-gales-of-power:slow',
              componentReferences: [
                {
                  componentId: 'velar-gales-of-power:slow',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-sentinels-wit-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-sentinels-wit:velar-sentinels-wit-left-stats',
              componentReferences: [
                {
                  componentId: 'velar-sentinels-wit:velar-sentinels-wit-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-strategic-leader-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-strategic-leader:velar-strategic-leader-tactical',
              componentReferences: [
                {
                  componentId: 'velar-strategic-leader:velar-strategic-leader-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-whirlwind-advantage-damage',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-whirlwind:advantage',
              componentReferences: [
                {
                  componentId: 'velar-whirlwind:advantage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'velar-whirlwind-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'velar-whirlwind:velar-whirlwind-tactical',
              componentReferences: [
                {
                  componentId: 'velar-whirlwind:velar-whirlwind-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
