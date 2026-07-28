import { defineDragonReliabilityRegistry } from '../registryTypes';

export const nyrenaReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'nyrena',
  components: [
    {
      id: 'nyrena-deepen-the-breach:nyrena-deepen-the-breach-fire',
      sourceAbilityId: 'nyrena-deepen-the-breach',
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
        evidenceIds: ['nyrena-deepen-the-breach-2026-07-16'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'nyrena-mindful-synergy:nyrena-initiative-payoff',
      sourceAbilityId: 'nyrena-mindful-synergy',
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
        evidenceIds: ['nyrena-mindful-synergy-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-mindful-synergy:nyrena-mindful-synergy-stats',
      sourceAbilityId: 'nyrena-mindful-synergy',
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
        evidenceIds: ['nyrena-mindful-synergy-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-undermine:nyrena-fire-payoff',
      sourceAbilityId: 'nyrena-undermine',
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
        evidenceIds: ['nyrena-undermine-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-undermine:nyrena-instinct-payoff',
      sourceAbilityId: 'nyrena-undermine',
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
        evidenceIds: ['nyrena-undermine-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-undermine:nyrena-intelligence-payoff',
      sourceAbilityId: 'nyrena-undermine',
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
        evidenceIds: ['nyrena-undermine-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-undermine:nyrena-tactical-payoff',
      sourceAbilityId: 'nyrena-undermine',
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
        evidenceIds: ['nyrena-undermine-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-undermine:nyrena-undermine-fire',
      sourceAbilityId: 'nyrena-undermine',
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
        evidenceIds: ['nyrena-undermine-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'nyrena-undermine:nyrena-undermine-tactical',
      sourceAbilityId: 'nyrena-undermine',
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
        evidenceIds: ['nyrena-undermine-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'nyrena-deepen-the-breach-fire',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-deepen-the-breach:nyrena-deepen-the-breach-fire',
              componentReferences: [
                {
                  componentId: 'nyrena-deepen-the-breach:nyrena-deepen-the-breach-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-fire-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-undermine:nyrena-fire-payoff',
              componentReferences: [
                {
                  componentId: 'nyrena-undermine:nyrena-fire-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-initiative-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-mindful-synergy:nyrena-initiative-payoff',
              componentReferences: [
                {
                  componentId: 'nyrena-mindful-synergy:nyrena-initiative-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-instinct-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-undermine:nyrena-instinct-payoff',
              componentReferences: [
                {
                  componentId: 'nyrena-undermine:nyrena-instinct-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-intelligence-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-undermine:nyrena-intelligence-payoff',
              componentReferences: [
                {
                  componentId: 'nyrena-undermine:nyrena-intelligence-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-mindful-synergy-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-mindful-synergy:nyrena-mindful-synergy-stats',
              componentReferences: [
                {
                  componentId: 'nyrena-mindful-synergy:nyrena-mindful-synergy-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-tactical-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-undermine:nyrena-tactical-payoff',
              componentReferences: [
                {
                  componentId: 'nyrena-undermine:nyrena-tactical-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-undermine-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-undermine:nyrena-undermine-fire',
              componentReferences: [
                {
                  componentId: 'nyrena-undermine:nyrena-undermine-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'nyrena-undermine-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'nyrena-undermine:nyrena-undermine-tactical',
              componentReferences: [
                {
                  componentId: 'nyrena-undermine:nyrena-undermine-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
