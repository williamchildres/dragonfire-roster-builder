import { defineDragonReliabilityRegistry } from '../registryTypes';

export const thunderstrikeReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'thunderstrike',
  components: [
    {
      id: 'thunderstrike-armor-break:thunderstrike-armor-break-physical',
      sourceAbilityId: 'thunderstrike-armor-break',
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
        evidenceIds: ['thunderstrike-armor-break-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'thunderstrike-barbed-lash:bleed',
      sourceAbilityId: 'thunderstrike-barbed-lash',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'thunderstrike-barbed-lash',
        byLevel: {
          '1': 0.25,
          '2': 0.3,
          '3': 0.35,
          '4': 0.425,
          '5': 0.5,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 4, 6, 8, 10],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 5,
      },
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['thunderstrike-barbed-lash-2026-07-16'],
        unresolvedQuestions: [
          'Whether Bleed checks on separate even-numbered rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'thunderstrike-barbed-lash:thunderstrike-barbed-lash-physical',
      sourceAbilityId: 'thunderstrike-barbed-lash',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Documented condition or trigger.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['thunderstrike-barbed-lash-2026-07-16'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'thunderstrike-staggering-assault:stagger',
      sourceAbilityId: 'thunderstrike-staggering-assault',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'thunderstrike-staggering-assault',
        byLevel: {
          '1': 0.1,
          '2': 0.13,
          '3': 0.16,
          '4': 0.2,
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
        count: 1,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 1,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['thunderstrike-staggering-assault-2026-07-16'],
        unresolvedQuestions: [
          'Advantage changes duration to two rounds but does not change activation chance.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'thunderstrike-tail-whip:thunderstrike-strength-payoff',
      sourceAbilityId: 'thunderstrike-tail-whip',
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
        evidenceIds: ['thunderstrike-tail-whip-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'thunderstrike-tail-whip:thunderstrike-tail-whip-physical',
      sourceAbilityId: 'thunderstrike-tail-whip',
      sourceAbilityKind: 'command',
      reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Documented condition or trigger.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['thunderstrike-tail-whip-2026-07-16'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'thunderstrike-warriors-zeal:thunderstrike-warriors-zeal-left-stats',
      sourceAbilityId: 'thunderstrike-warriors-zeal',
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
        evidenceIds: ['thunderstrike-warriors-zeal-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'thunderstrike-armor-break-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-armor-break:thunderstrike-armor-break-physical',
              componentReferences: [
                {
                  componentId: 'thunderstrike-armor-break:thunderstrike-armor-break-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-barbed-lash-bleed',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-barbed-lash:bleed',
              componentReferences: [
                {
                  componentId: 'thunderstrike-barbed-lash:bleed',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-barbed-lash-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-barbed-lash:thunderstrike-barbed-lash-physical',
              componentReferences: [
                {
                  componentId: 'thunderstrike-barbed-lash:thunderstrike-barbed-lash-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-staggering-assault-advantage-payoff',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-staggering-assault:stagger',
              componentReferences: [
                {
                  componentId: 'thunderstrike-staggering-assault:stagger',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-staggering-assault-stagger',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-staggering-assault:stagger',
              componentReferences: [
                {
                  componentId: 'thunderstrike-staggering-assault:stagger',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-strength-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-tail-whip:thunderstrike-strength-payoff',
              componentReferences: [
                {
                  componentId: 'thunderstrike-tail-whip:thunderstrike-strength-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-tail-whip-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-tail-whip:thunderstrike-tail-whip-physical',
              componentReferences: [
                {
                  componentId: 'thunderstrike-tail-whip:thunderstrike-tail-whip-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'thunderstrike-warriors-zeal-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'thunderstrike-warriors-zeal:thunderstrike-warriors-zeal-left-stats',
              componentReferences: [
                {
                  componentId: 'thunderstrike-warriors-zeal:thunderstrike-warriors-zeal-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
