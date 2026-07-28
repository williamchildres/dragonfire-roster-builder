import { defineDragonReliabilityRegistry } from '../registryTypes';

export const solstrykerReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'solstryker',
  components: [
    {
      id: 'solstryker-oppressive-onslaught:overwhelm',
      sourceAbilityId: 'solstryker-oppressive-onslaught',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'solstryker-oppressive-onslaught',
        byLevel: {
          '1': 0.1,
          '2': 0.12,
          '3': 0.14,
          '4': 0.17,
          '5': 0.2,
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
        evidenceIds: ['solstryker-oppressive-onslaught-2026-07-16'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-instinct-payoff',
      sourceAbilityId: 'solstryker-tactical-onslaught',
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
        evidenceIds: ['solstryker-tactical-onslaught-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-physical',
      sourceAbilityId: 'solstryker-tactical-onslaught',
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
        evidenceIds: ['solstryker-tactical-onslaught-2026-07-16'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-strength-payoff',
      sourceAbilityId: 'solstryker-tactical-onslaught',
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
        evidenceIds: ['solstryker-tactical-onslaught-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-tactical',
      sourceAbilityId: 'solstryker-tactical-onslaught',
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
        evidenceIds: ['solstryker-tactical-onslaught-2026-07-16'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-vulnerable-payoff',
      sourceAbilityId: 'solstryker-tactical-onslaught',
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
        evidenceIds: ['solstryker-tactical-onslaught-2026-07-16'],
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
      signalId: 'solstryker-oppressive-onslaught-overwhelm',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'solstryker-oppressive-onslaught:overwhelm',
              componentReferences: [
                {
                  componentId: 'solstryker-oppressive-onslaught:overwhelm',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'solstryker-tactical-onslaught-instinct-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId:
                'solstryker-tactical-onslaught:solstryker-tactical-onslaught-instinct-payoff',
              componentReferences: [
                {
                  componentId:
                    'solstryker-tactical-onslaught:solstryker-tactical-onslaught-instinct-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'solstryker-tactical-onslaught-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-physical',
              componentReferences: [
                {
                  componentId:
                    'solstryker-tactical-onslaught:solstryker-tactical-onslaught-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'solstryker-tactical-onslaught-strength-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId:
                'solstryker-tactical-onslaught:solstryker-tactical-onslaught-strength-payoff',
              componentReferences: [
                {
                  componentId:
                    'solstryker-tactical-onslaught:solstryker-tactical-onslaught-strength-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'solstryker-tactical-onslaught-tactical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'solstryker-tactical-onslaught:solstryker-tactical-onslaught-tactical',
              componentReferences: [
                {
                  componentId:
                    'solstryker-tactical-onslaught:solstryker-tactical-onslaught-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'solstryker-tactical-onslaught-vulnerable-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId:
                'solstryker-tactical-onslaught:solstryker-tactical-onslaught-vulnerable-payoff',
              componentReferences: [
                {
                  componentId:
                    'solstryker-tactical-onslaught:solstryker-tactical-onslaught-vulnerable-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
