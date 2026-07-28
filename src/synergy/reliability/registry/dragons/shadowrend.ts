import { defineDragonReliabilityRegistry } from '../registryTypes';

export const shadowrendReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'shadowrend',
  components: [
    {
      id: 'shadowrend-eclipse-fervor:panic-and-recurring-tactical',
      sourceAbilityId: 'shadowrend-eclipse-fervor',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.25,
      },
      opportunityPresence: 'guaranteed-at-least-one',
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
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shadowrend-eclipse-fervor-2026-07-16'],
        unresolvedQuestions: [
          'Panic and its recurring Tactical Damage are one underlying activation.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'shadowrend-eclipse-fervor:shadowrend-eclipse-fervor-physical',
      sourceAbilityId: 'shadowrend-eclipse-fervor',
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
        evidenceIds: ['shadowrend-eclipse-fervor-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-eclipse-fervor:shadowrend-strength-payoff',
      sourceAbilityId: 'shadowrend-eclipse-fervor',
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
        evidenceIds: ['shadowrend-eclipse-fervor-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-event-horizon:shadowrend-event-horizon-physical',
      sourceAbilityId: 'shadowrend-event-horizon',
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
        evidenceIds: ['shadowrend-event-horizon-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-event-horizon:shadowrend-event-horizon-tactical',
      sourceAbilityId: 'shadowrend-event-horizon',
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
        evidenceIds: ['shadowrend-event-horizon-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-event-horizon:shadowrend-instinct-payoff',
      sourceAbilityId: 'shadowrend-event-horizon',
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
        evidenceIds: ['shadowrend-event-horizon-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-fueled-by-darkness:advantage',
      sourceAbilityId: 'shadowrend-fueled-by-darkness',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'ordinary-rounds',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'shadowrend-fueled-by-darkness',
              byLevel: {
                '1': 0.1,
                '2': 0.12,
                '3': 0.14,
                '4': 0.17,
                '5': 0.2,
              },
            },
          },
          {
            id: 'midnight-aura-rounds-7-10',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'shadowrend-fueled-by-darkness',
              byLevel: {
                '1': 0.2,
                '2': 0.24,
                '3': 0.28,
                '4': 0.34,
                '5': 0.4,
              },
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
      rollScope: 'shared',
      targetFacts: {
        count: 2,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shadowrend-fueled-by-darkness-2026-07-16'],
        unresolvedQuestions: [
          'Battle length, temporal independence, and two-of-three recipient selection are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'shadowrend-midnight-aura:shadowrend-initiative-payoff',
      sourceAbilityId: 'shadowrend-midnight-aura',
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
        evidenceIds: ['shadowrend-midnight-aura-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-midnight-aura:shadowrend-midnight-aura-instinct',
      sourceAbilityId: 'shadowrend-midnight-aura',
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
        evidenceIds: ['shadowrend-midnight-aura-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-midnight-aura:shadowrend-midnight-aura-strength',
      sourceAbilityId: 'shadowrend-midnight-aura',
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
        evidenceIds: ['shadowrend-midnight-aura-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-midnight-mastery:shadowrend-midnight-mastery-physical',
      sourceAbilityId: 'shadowrend-midnight-mastery',
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
        evidenceIds: ['shadowrend-midnight-mastery-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-midnight-mastery:shadowrend-midnight-mastery-tactical',
      sourceAbilityId: 'shadowrend-midnight-mastery',
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
        evidenceIds: ['shadowrend-midnight-mastery-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowrend-warriors-zeal:shadowrend-warriors-zeal-left-stats',
      sourceAbilityId: 'shadowrend-warriors-zeal',
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
        evidenceIds: ['shadowrend-warriors-zeal-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'shadowrend-eclipse-fervor-panic',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-eclipse-fervor:panic-and-recurring-tactical',
              componentReferences: [
                {
                  componentId: 'shadowrend-eclipse-fervor:panic-and-recurring-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-eclipse-fervor-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-eclipse-fervor:shadowrend-eclipse-fervor-physical',
              componentReferences: [
                {
                  componentId: 'shadowrend-eclipse-fervor:shadowrend-eclipse-fervor-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-eclipse-fervor-tactical',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-eclipse-fervor:panic-and-recurring-tactical',
              componentReferences: [
                {
                  componentId: 'shadowrend-eclipse-fervor:panic-and-recurring-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-event-horizon-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-event-horizon:shadowrend-event-horizon-physical',
              componentReferences: [
                {
                  componentId: 'shadowrend-event-horizon:shadowrend-event-horizon-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-event-horizon-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-event-horizon:shadowrend-event-horizon-tactical',
              componentReferences: [
                {
                  componentId: 'shadowrend-event-horizon:shadowrend-event-horizon-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-fueled-by-darkness-advantage',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'ordinary-rounds',
          appliesWhen: {
            kind: 'probability-context',
            id: 'ordinary-rounds',
          },
          events: [
            {
              eventId: 'shadowrend-fueled-by-darkness:advantage',
              componentReferences: [
                {
                  componentId: 'shadowrend-fueled-by-darkness:advantage',
                  probabilityVariantId: 'ordinary-rounds',
                },
              ],
            },
          ],
        },
        {
          pathId: 'midnight-aura-rounds-7-10',
          appliesWhen: {
            kind: 'probability-context',
            id: 'midnight-aura-rounds-7-10',
          },
          events: [
            {
              eventId: 'shadowrend-fueled-by-darkness:advantage',
              componentReferences: [
                {
                  componentId: 'shadowrend-fueled-by-darkness:advantage',
                  probabilityVariantId: 'midnight-aura-rounds-7-10',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-initiative-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-midnight-aura:shadowrend-initiative-payoff',
              componentReferences: [
                {
                  componentId: 'shadowrend-midnight-aura:shadowrend-initiative-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-instinct-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-event-horizon:shadowrend-instinct-payoff',
              componentReferences: [
                {
                  componentId: 'shadowrend-event-horizon:shadowrend-instinct-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-midnight-aura-instinct',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-midnight-aura:shadowrend-midnight-aura-instinct',
              componentReferences: [
                {
                  componentId: 'shadowrend-midnight-aura:shadowrend-midnight-aura-instinct',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-midnight-aura-strength',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-midnight-aura:shadowrend-midnight-aura-strength',
              componentReferences: [
                {
                  componentId: 'shadowrend-midnight-aura:shadowrend-midnight-aura-strength',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-midnight-mastery-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-midnight-mastery:shadowrend-midnight-mastery-physical',
              componentReferences: [
                {
                  componentId: 'shadowrend-midnight-mastery:shadowrend-midnight-mastery-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-midnight-mastery-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-midnight-mastery:shadowrend-midnight-mastery-tactical',
              componentReferences: [
                {
                  componentId: 'shadowrend-midnight-mastery:shadowrend-midnight-mastery-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-strength-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-eclipse-fervor:shadowrend-strength-payoff',
              componentReferences: [
                {
                  componentId: 'shadowrend-eclipse-fervor:shadowrend-strength-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowrend-warriors-zeal-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowrend-warriors-zeal:shadowrend-warriors-zeal-left-stats',
              componentReferences: [
                {
                  componentId: 'shadowrend-warriors-zeal:shadowrend-warriors-zeal-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
