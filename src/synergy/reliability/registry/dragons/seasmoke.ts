import { defineDragonReliabilityRegistry } from '../registryTypes';

export const seasmokeReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'seasmoke',
  components: [
    {
      id: 'seasmoke-cleansing-wrath:seasmoke-cleansing-wrath-fire',
      sourceAbilityId: 'seasmoke-cleansing-wrath',
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
          'seasmoke-cleansing-wrath-glossary-2026-06-23',
          'seasmoke-cleansing-wrath-summary-2026-06-23',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'seasmoke-clever-maneuver:seasmoke-clever-maneuver-stats',
      sourceAbilityId: 'seasmoke-clever-maneuver',
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
        evidenceIds: ['seasmoke-clever-maneuver-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'seasmoke-cunning-ferocity:seasmoke-cunning-ferocity-fire-intelligence',
      sourceAbilityId: 'seasmoke-cunning-ferocity',
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
        evidenceIds: ['seasmoke-cunning-ferocity-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'seasmoke-infectious-wrath:seasmoke-infectious-wrath-panic-payoff',
      sourceAbilityId: 'seasmoke-infectious-wrath',
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
        evidenceIds: ['seasmoke-infectious-wrath-2026-06-23'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'seasmoke-infectious-wrath:seasmoke-infectious-wrath-physical',
      sourceAbilityId: 'seasmoke-infectious-wrath',
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
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['seasmoke-infectious-wrath-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'seasmoke-loyal-bond:resistance',
      sourceAbilityId: 'seasmoke-loyal-bond',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'seasmoke-loyal-bond',
        byLevel: {
          '1': 0.1,
          '2': 0.13,
          '3': 0.16,
          '4': 0.2,
          '5': 0.25,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'unresolved',
      targetFacts: {
        count: 2,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['seasmoke-loyal-bond-2026-06-23'],
        unresolvedQuestions: [
          'Whether Resistance uses one group roll or separate rolls for the two targets.',
          'Whether the separate Advantage and Resistance clauses share a roll.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'seasmoke-winds-favor:seasmoke-winds-favor-initiative',
      sourceAbilityId: 'seasmoke-winds-favor',
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
        evidenceIds: ['seasmoke-winds-favor-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'seasmoke-cleansing-wrath-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-cleansing-wrath:seasmoke-cleansing-wrath-fire',
              componentReferences: [
                {
                  componentId: 'seasmoke-cleansing-wrath:seasmoke-cleansing-wrath-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'seasmoke-clever-maneuver-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-clever-maneuver:seasmoke-clever-maneuver-stats',
              componentReferences: [
                {
                  componentId: 'seasmoke-clever-maneuver:seasmoke-clever-maneuver-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'seasmoke-cunning-ferocity-fire-intelligence',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-cunning-ferocity:seasmoke-cunning-ferocity-fire-intelligence',
              componentReferences: [
                {
                  componentId:
                    'seasmoke-cunning-ferocity:seasmoke-cunning-ferocity-fire-intelligence',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'seasmoke-infectious-wrath-panic-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-infectious-wrath:seasmoke-infectious-wrath-panic-payoff',
              componentReferences: [
                {
                  componentId: 'seasmoke-infectious-wrath:seasmoke-infectious-wrath-panic-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'seasmoke-infectious-wrath-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-infectious-wrath:seasmoke-infectious-wrath-physical',
              componentReferences: [
                {
                  componentId: 'seasmoke-infectious-wrath:seasmoke-infectious-wrath-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'seasmoke-loyal-bond-resistance',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-loyal-bond:resistance',
              componentReferences: [
                {
                  componentId: 'seasmoke-loyal-bond:resistance',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'seasmoke-winds-favor-initiative',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'seasmoke-winds-favor:seasmoke-winds-favor-initiative',
              componentReferences: [
                {
                  componentId: 'seasmoke-winds-favor:seasmoke-winds-favor-initiative',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
