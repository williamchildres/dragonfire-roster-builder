import { defineDragonReliabilityRegistry } from '../registryTypes';

export const zivernReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'zivern',
  components: [
    {
      id: 'zivern-battle-mastery:deterministic-battle-mastery',
      sourceAbilityId: 'zivern-battle-mastery',
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
        evidenceIds: ['zivern-battle-mastery-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'zivern-cloak-of-terror:overwhelm',
      sourceAbilityId: 'zivern-cloak-of-terror',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'ordinary-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'zivern-cloak-of-terror',
              byLevel: {
                '1': 0.1,
                '2': 0.13,
                '3': 0.16,
                '4': 0.2,
                '5': 0.25,
              },
            },
          },
          {
            id: 'vulnerable-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'zivern-cloak-of-terror',
              byLevel: {
                '1': 0.2,
                '2': 0.26,
                '3': 0.32,
                '4': 0.4,
                '5': 0.5,
              },
            },
          },
        ],
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
      rollScope: 'unresolved',
      targetFacts: {
        count: 2,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['zivern-cloak-of-terror-2026-07-03'],
        unresolvedQuestions: [
          'Whether Cloak of Terror uses one group roll or separate target rolls.',
          'Whether checks on separate odd-numbered rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'zivern-fearsome-reach:panic',
      sourceAbilityId: 'zivern-fearsome-reach',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'zivern-fearsome-reach',
        byLevel: {
          '1': 0.3,
          '2': 0.36,
          '3': 0.42,
          '4': 0.51,
          '5': 0.6,
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
      rollScope: 'unresolved',
      targetFacts: {
        count: 3,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['zivern-fearsome-reach-2026-07-03'],
        unresolvedQuestions: [
          'Whether Fearsome Reach uses one group roll or separate target rolls.',
          'Whether checks on separate odd-numbered rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'zivern-sentinels-wit:zivern-sentinels-wit-left-stats',
      sourceAbilityId: 'zivern-sentinels-wit',
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
        evidenceIds: ['zivern-sentinels-wit-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'zivern-silent-shade:tactical-vulnerability',
      sourceAbilityId: 'zivern-silent-shade',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.4,
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 4, 6, 9],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
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
        evidenceIds: ['zivern-silent-shade-summary-2026-07-03'],
        unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'zivern-silent-shade:zivern-silent-shade-tactical',
      sourceAbilityId: 'zivern-silent-shade',
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
        evidenceIds: ['zivern-silent-shade-summary-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'zivern-battle-mastery-intelligence-payoff',
      bindingClass: 'resolved-mixed',
      paths: [
        {
          pathId: 'battle-mastery',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'battle-mastery',
          },
          events: [
            {
              eventId: 'zivern-battle-mastery:deterministic-battle-mastery',
              componentReferences: [
                {
                  componentId: 'zivern-battle-mastery:deterministic-battle-mastery',
                },
              ],
            },
          ],
        },
        {
          pathId: 'fearsome-reach',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'fearsome-reach',
          },
          events: [
            {
              eventId: 'zivern-fearsome-reach:panic',
              componentReferences: [
                {
                  componentId: 'zivern-fearsome-reach:panic',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-battle-mastery-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'zivern-battle-mastery:deterministic-battle-mastery',
              componentReferences: [
                {
                  componentId: 'zivern-battle-mastery:deterministic-battle-mastery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-cloak-of-terror-overwhelm',
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
              eventId: 'zivern-cloak-of-terror:overwhelm',
              componentReferences: [
                {
                  componentId: 'zivern-cloak-of-terror:overwhelm',
                  probabilityVariantId: 'ordinary-target',
                },
              ],
            },
          ],
        },
        {
          pathId: 'vulnerable-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'vulnerable-target',
          },
          events: [
            {
              eventId: 'zivern-cloak-of-terror:overwhelm',
              componentReferences: [
                {
                  componentId: 'zivern-cloak-of-terror:overwhelm',
                  probabilityVariantId: 'vulnerable-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-cloak-of-terror-vulnerable-payoff',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'vulnerable-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'vulnerable-target',
          },
          events: [
            {
              eventId: 'zivern-cloak-of-terror:overwhelm',
              componentReferences: [
                {
                  componentId: 'zivern-cloak-of-terror:overwhelm',
                  probabilityVariantId: 'vulnerable-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-fearsome-reach-panic',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'zivern-fearsome-reach:panic',
              componentReferences: [
                {
                  componentId: 'zivern-fearsome-reach:panic',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-sentinels-wit-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'zivern-sentinels-wit:zivern-sentinels-wit-left-stats',
              componentReferences: [
                {
                  componentId: 'zivern-sentinels-wit:zivern-sentinels-wit-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-silent-shade-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'zivern-silent-shade:zivern-silent-shade-tactical',
              componentReferences: [
                {
                  componentId: 'zivern-silent-shade:zivern-silent-shade-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'zivern-silent-shade-tactical-vulnerability',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'zivern-silent-shade:tactical-vulnerability',
              componentReferences: [
                {
                  componentId: 'zivern-silent-shade:tactical-vulnerability',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
