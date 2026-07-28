import { defineDragonReliabilityRegistry } from '../registryTypes';

export const bevlorinReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'bevlorin',
  components: [
    {
      id: 'bevlorin-bountiful-gifts:initiative',
      sourceAbilityId: 'bevlorin-bountiful-gifts',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'separate-stat-checks',
      targetFacts: {
        count: 1,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['bevlorin-bountiful-gifts-2026-07-16'],
        unresolvedQuestions: [
          'Each stat-target pair has its own check, but statistical independence is not stated.',
          'Tied highest-stat targets produce no current relationship and tie resolution is intentionally unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'bevlorin-bountiful-gifts:instinct',
      sourceAbilityId: 'bevlorin-bountiful-gifts',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'separate-stat-checks',
      targetFacts: {
        count: 1,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['bevlorin-bountiful-gifts-2026-07-16'],
        unresolvedQuestions: [
          'Each stat-target pair has its own check, but statistical independence is not stated.',
          'Tied highest-stat targets produce no current relationship and tie resolution is intentionally unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'bevlorin-bountiful-gifts:intelligence',
      sourceAbilityId: 'bevlorin-bountiful-gifts',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'separate-stat-checks',
      targetFacts: {
        count: 1,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['bevlorin-bountiful-gifts-2026-07-16'],
        unresolvedQuestions: [
          'Each stat-target pair has its own check, but statistical independence is not stated.',
          'Tied highest-stat targets produce no current relationship and tie resolution is intentionally unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'bevlorin-bountiful-gifts:strength',
      sourceAbilityId: 'bevlorin-bountiful-gifts',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'separate-stat-checks',
      targetFacts: {
        count: 1,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['bevlorin-bountiful-gifts-2026-07-16'],
        unresolvedQuestions: [
          'Each stat-target pair has its own check, but statistical independence is not stated.',
          'Tied highest-stat targets produce no current relationship and tie resolution is intentionally unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'bevlorin-champions-vigor:bevlorin-champions-vigor-right-damage',
      sourceAbilityId: 'bevlorin-champions-vigor',
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
        evidenceIds: ['bevlorin-champions-vigor-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-fire',
      sourceAbilityId: 'bevlorin-natures-reckoning',
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
        evidenceIds: ['bevlorin-natures-reckoning-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-intelligence-payoff',
      sourceAbilityId: 'bevlorin-natures-reckoning',
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
        evidenceIds: ['bevlorin-natures-reckoning-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-physical',
      sourceAbilityId: 'bevlorin-natures-reckoning',
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
        evidenceIds: ['bevlorin-natures-reckoning-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-strength-payoff',
      sourceAbilityId: 'bevlorin-natures-reckoning',
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
        evidenceIds: ['bevlorin-natures-reckoning-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'bevlorin-renewal:bevlorin-renewal-recovery',
      sourceAbilityId: 'bevlorin-renewal',
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
        evidenceIds: ['bevlorin-renewal-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'bevlorin-bountiful-gifts-initiative',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-bountiful-gifts:initiative',
              componentReferences: [
                {
                  componentId: 'bevlorin-bountiful-gifts:initiative',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-bountiful-gifts-instinct',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-bountiful-gifts:instinct',
              componentReferences: [
                {
                  componentId: 'bevlorin-bountiful-gifts:instinct',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-bountiful-gifts-intelligence',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-bountiful-gifts:intelligence',
              componentReferences: [
                {
                  componentId: 'bevlorin-bountiful-gifts:intelligence',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-bountiful-gifts-strength',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-bountiful-gifts:strength',
              componentReferences: [
                {
                  componentId: 'bevlorin-bountiful-gifts:strength',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-champions-vigor-right-damage',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-champions-vigor:bevlorin-champions-vigor-right-damage',
              componentReferences: [
                {
                  componentId: 'bevlorin-champions-vigor:bevlorin-champions-vigor-right-damage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-natures-reckoning-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-fire',
              componentReferences: [
                {
                  componentId: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-natures-reckoning-intelligence-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-intelligence-payoff',
              componentReferences: [
                {
                  componentId:
                    'bevlorin-natures-reckoning:bevlorin-natures-reckoning-intelligence-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-natures-reckoning-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-physical',
              componentReferences: [
                {
                  componentId: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-natures-reckoning-strength-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-natures-reckoning:bevlorin-natures-reckoning-strength-payoff',
              componentReferences: [
                {
                  componentId:
                    'bevlorin-natures-reckoning:bevlorin-natures-reckoning-strength-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'bevlorin-renewal-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'bevlorin-renewal:bevlorin-renewal-recovery',
              componentReferences: [
                {
                  componentId: 'bevlorin-renewal:bevlorin-renewal-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
