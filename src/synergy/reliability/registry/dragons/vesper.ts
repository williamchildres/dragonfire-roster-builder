import { defineDragonReliabilityRegistry } from '../registryTypes';

export const vesperReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'vesper',
  components: [
    {
      id: 'vesper-eventide-strike:slow',
      sourceAbilityId: 'vesper-eventide-strike',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
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
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vesper-eventide-strike-2026-07-16'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'vesper-eventide-strike:vesper-eventide-strike-tactical',
      sourceAbilityId: 'vesper-eventide-strike',
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
        evidenceIds: ['vesper-eventide-strike-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vesper-eventide-strike:vesper-instinct-payoff',
      sourceAbilityId: 'vesper-eventide-strike',
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
        evidenceIds: ['vesper-eventide-strike-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vesper-eventide-strike:vesper-tactical-payoff',
      sourceAbilityId: 'vesper-eventide-strike',
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
        evidenceIds: ['vesper-eventide-strike-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vesper-insightful-allies:vesper-insightful-allies-instinct',
      sourceAbilityId: 'vesper-insightful-allies',
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
        evidenceIds: ['vesper-insightful-allies-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vesper-midnight-onslaught:confusion',
      sourceAbilityId: 'vesper-midnight-onslaught',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'vesper-midnight-onslaught',
        byLevel: {
          '1': 0.24,
          '2': 0.312,
          '3': 0.384,
          '4': 0.48,
          '5': 0.6,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [6, 7, 8, 9, 10],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 5,
      },
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vesper-midnight-onslaught-2026-07-16'],
        unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'vesper-saviors-waltz:shared-resistance',
      sourceAbilityId: 'vesper-saviors-waltz',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'vesper-saviors-waltz',
        byLevel: {
          '1': 0.125,
          '2': 0.15,
          '3': 0.175,
          '4': 0.2125,
          '5': 0.25,
        },
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
        evidenceIds: ['vesper-saviors-waltz-2026-07-16'],
        unresolvedQuestions: [
          'Vesper and one adjacent other Ally share one activation.',
          'Battle length, temporal independence, and Vanguard recipient priority are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'vesper-sentinels-wit:vesper-sentinels-wit-left-stats',
      sourceAbilityId: 'vesper-sentinels-wit',
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
        evidenceIds: ['vesper-sentinels-wit-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vesper-strategic-leader:vesper-strategic-leader-tactical',
      sourceAbilityId: 'vesper-strategic-leader',
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
        evidenceIds: ['vesper-strategic-leader-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'vesper-eventide-strike-slow',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-eventide-strike:slow',
              componentReferences: [
                {
                  componentId: 'vesper-eventide-strike:slow',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-eventide-strike-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-eventide-strike:vesper-eventide-strike-tactical',
              componentReferences: [
                {
                  componentId: 'vesper-eventide-strike:vesper-eventide-strike-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-insightful-allies-instinct',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-insightful-allies:vesper-insightful-allies-instinct',
              componentReferences: [
                {
                  componentId: 'vesper-insightful-allies:vesper-insightful-allies-instinct',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-instinct-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-eventide-strike:vesper-instinct-payoff',
              componentReferences: [
                {
                  componentId: 'vesper-eventide-strike:vesper-instinct-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-midnight-onslaught-confusion',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-midnight-onslaught:confusion',
              componentReferences: [
                {
                  componentId: 'vesper-midnight-onslaught:confusion',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-saviors-waltz-resistance',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-saviors-waltz:shared-resistance',
              componentReferences: [
                {
                  componentId: 'vesper-saviors-waltz:shared-resistance',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-sentinels-wit-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-sentinels-wit:vesper-sentinels-wit-left-stats',
              componentReferences: [
                {
                  componentId: 'vesper-sentinels-wit:vesper-sentinels-wit-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-strategic-leader-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-strategic-leader:vesper-strategic-leader-tactical',
              componentReferences: [
                {
                  componentId: 'vesper-strategic-leader:vesper-strategic-leader-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vesper-tactical-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vesper-eventide-strike:vesper-tactical-payoff',
              componentReferences: [
                {
                  componentId: 'vesper-eventide-strike:vesper-tactical-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
