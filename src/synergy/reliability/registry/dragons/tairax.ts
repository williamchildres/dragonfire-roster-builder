import { defineDragonReliabilityRegistry } from '../registryTypes';

export const tairaxReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'tairax',
  components: [
    {
      id: 'tairax-burning-ward:burn',
      sourceAbilityId: 'tairax-burning-ward',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.5,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 5, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 3,
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
        evidenceIds: [
          'tairax-burning-ward-1-2026-07-22',
          'tairax-burning-ward-2-2026-07-22',
          'tairax-burning-ward-3-2026-07-22',
          'tairax-burning-ward-4-2026-07-22',
        ],
        unresolvedQuestions: [
          'Whether checks on different scheduled rounds are statistically independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'tairax-burning-ward:stagger',
      sourceAbilityId: 'tairax-burning-ward',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'round-specific',
        byRound: {
          '1': {
            kind: 'habit-override',
            habitAbilityId: 'tairax-gleamstrike',
            base: 0.25,
            byLevel: {
              '1': 0.375,
              '2': 0.4,
              '3': 0.425,
              '4': 0.4625,
              '5': 0.5,
            },
          },
          '3': {
            kind: 'habit-override',
            habitAbilityId: 'tairax-gleamstrike',
            base: 0.25,
            byLevel: {
              '1': 0.375,
              '2': 0.4,
              '3': 0.425,
              '4': 0.4625,
              '5': 0.5,
            },
          },
          '5': {
            kind: 'habit-override',
            habitAbilityId: 'tairax-gleamstrike',
            base: 0.25,
            byLevel: {
              '1': 0.375,
              '2': 0.4,
              '3': 0.425,
              '4': 0.4625,
              '5': 0.5,
            },
          },
          '7': {
            kind: 'habit-override',
            habitAbilityId: 'tairax-gleamstrike',
            base: 0.25,
            byLevel: {
              '1': 0.375,
              '2': 0.4,
              '3': 0.425,
              '4': 0.4625,
              '5': 0.5,
            },
          },
          '9': {
            kind: 'habit-override',
            habitAbilityId: 'tairax-gleamstrike',
            base: 0.25,
            byLevel: {
              '1': 0.375,
              '2': 0.4,
              '3': 0.425,
              '4': 0.4625,
              '5': 0.5,
            },
          },
        },
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 3, 5, 7, 9],
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
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: [
          'tairax-burning-ward-1-2026-07-22',
          'tairax-burning-ward-2-2026-07-22',
          'tairax-burning-ward-3-2026-07-22',
          'tairax-burning-ward-4-2026-07-22',
          'tairax-gleamstrike-2026-07-22',
        ],
        unresolvedQuestions: [
          'Whether checks on different odd-numbered rounds are statistically independent.',
        ],
        reviewNote:
          'Base command is 25%; unlocked Gleamstrike replaces the odd-round chance using its active Habit Level. The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'tairax-burning-ward:tairax-burning-ward-fire',
      sourceAbilityId: 'tairax-burning-ward',
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
        evidenceIds: [
          'tairax-burning-ward-1-2026-07-22',
          'tairax-burning-ward-2-2026-07-22',
          'tairax-burning-ward-3-2026-07-22',
          'tairax-burning-ward-4-2026-07-22',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tairax-gift-of-fire:burn-conditioned-resistance',
      sourceAbilityId: 'tairax-gift-of-fire',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'tairax-gift-of-fire',
        byLevel: {
          '1': 0.175,
          '2': 0.21,
          '3': 0.245,
          '4': 0.2975,
          '5': 0.35,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'conditional-event',
        condition: 'Start of each round, once for each Enemy afflicted with Burn.',
      },
      opportunityCount: {
        kind: 'condition-count-dependent',
        condition:
          'Opportunities depend on battle length and the number of Burn-afflicted Enemies each round.',
      },
      rollScope: 'unresolved',
      targetFacts: {
        count: 1,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 8,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['tairax-gift-of-fire-2026-07-22'],
        unresolvedQuestions: [
          'Whether separate Burn-conditioned checks are independent.',
          'How target selection behaves when no Ally lacks Resistance.',
        ],
        reviewNote:
          'Opportunities depend on battle length and the number of Burn-afflicted Enemies each round.',
      },
    },
    {
      id: 'tairax-gleamstrike:tairax-gleamstrike-fire',
      sourceAbilityId: 'tairax-gleamstrike',
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
        evidenceIds: ['tairax-gleamstrike-2026-07-22'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'tairax-hunters-wrath:tairax-hunters-wrath-right-stats',
      sourceAbilityId: 'tairax-hunters-wrath',
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
        evidenceIds: ['tairax-hunters-wrath-2026-07-22'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tairax-sunder:tairax-sunder-control-payoff',
      sourceAbilityId: 'tairax-sunder',
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
        minimumStarRank: 4,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['tairax-sunder-2026-07-22'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'tairax-sunder:tairax-sunder-damage',
      sourceAbilityId: 'tairax-sunder',
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
        minimumStarRank: 4,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['tairax-sunder-2026-07-22'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'tairax-burning-ward-burn',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-burning-ward:burn',
              componentReferences: [
                {
                  componentId: 'tairax-burning-ward:burn',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-burning-ward-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-burning-ward:tairax-burning-ward-fire',
              componentReferences: [
                {
                  componentId: 'tairax-burning-ward:tairax-burning-ward-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-burning-ward-stagger',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-burning-ward:stagger',
              componentReferences: [
                {
                  componentId: 'tairax-burning-ward:stagger',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-gift-of-fire-burn-payoff',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-gift-of-fire:burn-conditioned-resistance',
              componentReferences: [
                {
                  componentId: 'tairax-gift-of-fire:burn-conditioned-resistance',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-gift-of-fire-resistance',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-gift-of-fire:burn-conditioned-resistance',
              componentReferences: [
                {
                  componentId: 'tairax-gift-of-fire:burn-conditioned-resistance',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-gleamstrike-fire',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-gleamstrike:tairax-gleamstrike-fire',
              componentReferences: [
                {
                  componentId: 'tairax-gleamstrike:tairax-gleamstrike-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-hunters-wrath-right-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-hunters-wrath:tairax-hunters-wrath-right-stats',
              componentReferences: [
                {
                  componentId: 'tairax-hunters-wrath:tairax-hunters-wrath-right-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-sunder-control-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-sunder:tairax-sunder-control-payoff',
              componentReferences: [
                {
                  componentId: 'tairax-sunder:tairax-sunder-control-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tairax-sunder-damage',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tairax-sunder:tairax-sunder-damage',
              componentReferences: [
                {
                  componentId: 'tairax-sunder:tairax-sunder-damage',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
