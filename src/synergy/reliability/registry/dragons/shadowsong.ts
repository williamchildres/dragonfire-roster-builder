import { defineDragonReliabilityRegistry } from '../registryTypes';

export const shadowsongReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'shadowsong',
  components: [
    {
      id: 'shadowsong-blazing-conductor:two-burn-attempts',
      sourceAbilityId: 'shadowsong-blazing-conductor',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'first-added-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'shadowsong-blazing-conductor',
              byLevel: {
                '1': 0.4,
                '2': 0.52,
                '3': 0.64,
                '4': 0.8,
                '5': 1,
              },
            },
          },
          {
            id: 'second-distinct-added-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'shadowsong-blazing-conductor',
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
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 5, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 3,
      },
      rollScope: 'per-target',
      targetFacts: {
        count: 2,
        separatePerTarget: true,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shadowsong-blazing-conductor-2026-06-26'],
        unresolvedQuestions: [
          'Attacks are explicitly independent within one round; independence across scheduled rounds is not stated.',
          'The current single signal spans two probability components and should reference both or be split.',
        ],
        reviewNote:
          'Three scheduled activations contain two explicitly independent Burn attempts each.',
      },
    },
    {
      id: 'shadowsong-blazing-onslaught:shadowsong-blazing-onslaught-vulnerability',
      sourceAbilityId: 'shadowsong-blazing-onslaught',
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
        evidenceIds: ['shadowsong-blazing-onslaught-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowsong-breath-of-fire:panic-damage-payoff',
      sourceAbilityId: 'shadowsong-breath-of-fire',
      sourceAbilityKind: 'command',
      reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Target is afflicted with Panic.',
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shadowsong-breath-of-fire-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowsong-breath-of-fire:shadowsong-breath-of-fire-fire',
      sourceAbilityId: 'shadowsong-breath-of-fire',
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
        evidenceIds: ['shadowsong-breath-of-fire-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowsong-hunters-wrath:shadowsong-hunters-wrath-right-stats',
      sourceAbilityId: 'shadowsong-hunters-wrath',
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
        evidenceIds: ['shadowsong-hunters-wrath-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shadowsong-scorched-earth:vulnerable',
      sourceAbilityId: 'shadowsong-scorched-earth',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'ordinary-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'shadowsong-scorched-earth',
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
            id: 'panic-afflicted-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'shadowsong-scorched-earth',
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
      rollScope: 'unresolved',
      targetFacts: {
        count: 2,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shadowsong-scorched-earth-2026-06-26'],
        unresolvedQuestions: [
          'Whether Vulnerable uses one shared group roll or separate target rolls.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'shadowsong-blazing-conductor-burn',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'first-added-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'first-added-target',
          },
          events: [
            {
              eventId: 'shadowsong-blazing-conductor:two-burn-attempts',
              componentReferences: [
                {
                  componentId: 'shadowsong-blazing-conductor:two-burn-attempts',
                  probabilityVariantId: 'first-added-target',
                },
              ],
            },
          ],
        },
        {
          pathId: 'second-distinct-added-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'second-distinct-added-target',
          },
          events: [
            {
              eventId: 'shadowsong-blazing-conductor:two-burn-attempts',
              componentReferences: [
                {
                  componentId: 'shadowsong-blazing-conductor:two-burn-attempts',
                  probabilityVariantId: 'second-distinct-added-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowsong-blazing-onslaught-vulnerability',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowsong-blazing-onslaught:shadowsong-blazing-onslaught-vulnerability',
              componentReferences: [
                {
                  componentId:
                    'shadowsong-blazing-onslaught:shadowsong-blazing-onslaught-vulnerability',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowsong-breath-of-fire-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowsong-breath-of-fire:shadowsong-breath-of-fire-fire',
              componentReferences: [
                {
                  componentId: 'shadowsong-breath-of-fire:shadowsong-breath-of-fire-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowsong-hunters-wrath-right-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shadowsong-hunters-wrath:shadowsong-hunters-wrath-right-stats',
              componentReferences: [
                {
                  componentId: 'shadowsong-hunters-wrath:shadowsong-hunters-wrath-right-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowsong-panic-payoff',
      bindingClass: 'resolved-mixed',
      paths: [
        {
          pathId: 'breath-of-fire-damage',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'breath-of-fire-damage',
          },
          events: [
            {
              eventId: 'shadowsong-breath-of-fire:panic-damage-payoff',
              componentReferences: [
                {
                  componentId: 'shadowsong-breath-of-fire:panic-damage-payoff',
                },
              ],
            },
          ],
        },
        {
          pathId: 'scorched-earth-application',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'scorched-earth-application',
          },
          events: [
            {
              eventId: 'shadowsong-scorched-earth:vulnerable',
              componentReferences: [
                {
                  componentId: 'shadowsong-scorched-earth:vulnerable',
                  probabilityVariantId: 'panic-afflicted-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowsong-scorched-earth-vulnerable',
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
              eventId: 'shadowsong-scorched-earth:vulnerable',
              componentReferences: [
                {
                  componentId: 'shadowsong-scorched-earth:vulnerable',
                  probabilityVariantId: 'ordinary-target',
                },
              ],
            },
          ],
        },
        {
          pathId: 'panic-afflicted-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'panic-afflicted-target',
          },
          events: [
            {
              eventId: 'shadowsong-scorched-earth:vulnerable',
              componentReferences: [
                {
                  componentId: 'shadowsong-scorched-earth:vulnerable',
                  probabilityVariantId: 'panic-afflicted-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shadowsong-scorched-earth-vulnerable-status',
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
              eventId: 'shadowsong-scorched-earth:vulnerable',
              componentReferences: [
                {
                  componentId: 'shadowsong-scorched-earth:vulnerable',
                  probabilityVariantId: 'ordinary-target',
                },
              ],
            },
          ],
        },
        {
          pathId: 'panic-afflicted-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'panic-afflicted-target',
          },
          events: [
            {
              eventId: 'shadowsong-scorched-earth:vulnerable',
              componentReferences: [
                {
                  componentId: 'shadowsong-scorched-earth:vulnerable',
                  probabilityVariantId: 'panic-afflicted-target',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
