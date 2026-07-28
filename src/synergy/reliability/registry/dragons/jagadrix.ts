import { defineDragonReliabilityRegistry } from '../registryTypes';

export const jagadrixReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'jagadrix',
  components: [
    {
      id: 'jagadrix-cunning-whispers:enemy-stat-reductions',
      sourceAbilityId: 'jagadrix-cunning-whispers',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.3,
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
        evidenceIds: ['jagadrix-cunning-whispers-2026-07-16'],
        unresolvedQuestions: [
          'The stat-support payoff applies to chance-based enemy reductions, not Jagadrix’s guaranteed Fire attack.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'jagadrix-cunning-whispers:jagadrix-cunning-whispers-fire',
      sourceAbilityId: 'jagadrix-cunning-whispers',
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
        evidenceIds: ['jagadrix-cunning-whispers-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'jagadrix-cunning-whispers:jagadrix-cunning-whispers-intelligence-payoff',
      sourceAbilityId: 'jagadrix-cunning-whispers',
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
        evidenceIds: ['jagadrix-cunning-whispers-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'jagadrix-echoes-of-deceit:jagadrix-echoes-of-deceit-fire',
      sourceAbilityId: 'jagadrix-echoes-of-deceit',
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
        evidenceIds: ['jagadrix-echoes-of-deceit-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'jagadrix-echoes-of-deceit:jagadrix-echoes-of-deceit-panic-payoff',
      sourceAbilityId: 'jagadrix-echoes-of-deceit',
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
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['jagadrix-echoes-of-deceit-2026-07-16'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'jagadrix-hunters-wrath:jagadrix-hunters-wrath-right-stats',
      sourceAbilityId: 'jagadrix-hunters-wrath',
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
        evidenceIds: ['jagadrix-hunters-wrath-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'jagadrix-whispering-sabotage:weakened',
      sourceAbilityId: 'jagadrix-whispering-sabotage',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'jagadrix-whispering-sabotage',
        byLevel: {
          '1': 0.25,
          '2': 0.3,
          '3': 0.35,
          '4': 0.425,
          '5': 0.5,
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
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['jagadrix-whispering-sabotage-2026-07-16'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'jagadrix-cunning-whispers-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-cunning-whispers:jagadrix-cunning-whispers-fire',
              componentReferences: [
                {
                  componentId: 'jagadrix-cunning-whispers:jagadrix-cunning-whispers-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'jagadrix-cunning-whispers-initiative-payoff',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-cunning-whispers:enemy-stat-reductions',
              componentReferences: [
                {
                  componentId: 'jagadrix-cunning-whispers:enemy-stat-reductions',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'jagadrix-cunning-whispers-intelligence-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-cunning-whispers:jagadrix-cunning-whispers-intelligence-payoff',
              componentReferences: [
                {
                  componentId:
                    'jagadrix-cunning-whispers:jagadrix-cunning-whispers-intelligence-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'jagadrix-echoes-of-deceit-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-echoes-of-deceit:jagadrix-echoes-of-deceit-fire',
              componentReferences: [
                {
                  componentId: 'jagadrix-echoes-of-deceit:jagadrix-echoes-of-deceit-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'jagadrix-echoes-of-deceit-panic-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-echoes-of-deceit:jagadrix-echoes-of-deceit-panic-payoff',
              componentReferences: [
                {
                  componentId: 'jagadrix-echoes-of-deceit:jagadrix-echoes-of-deceit-panic-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'jagadrix-hunters-wrath-right-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-hunters-wrath:jagadrix-hunters-wrath-right-stats',
              componentReferences: [
                {
                  componentId: 'jagadrix-hunters-wrath:jagadrix-hunters-wrath-right-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'jagadrix-whispering-sabotage-weakened',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'jagadrix-whispering-sabotage:weakened',
              componentReferences: [
                {
                  componentId: 'jagadrix-whispering-sabotage:weakened',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
