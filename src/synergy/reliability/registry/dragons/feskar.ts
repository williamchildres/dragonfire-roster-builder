import { defineDragonReliabilityRegistry } from '../registryTypes';

export const feskarReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'feskar',
  components: [
    {
      id: 'feskar-calculated-assault:feskar-calculated-assault-tactical',
      sourceAbilityId: 'feskar-calculated-assault',
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
        evidenceIds: ['feskar-calculated-assault-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'feskar-emerald-inferno:feskar-emerald-inferno-burn-payoff',
      sourceAbilityId: 'feskar-emerald-inferno',
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
        evidenceIds: ['feskar-emerald-inferno-2026-06-26'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'feskar-emerald-inferno:feskar-emerald-inferno-fire',
      sourceAbilityId: 'feskar-emerald-inferno',
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
        evidenceIds: ['feskar-emerald-inferno-2026-06-26'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'feskar-insightful-allies:feskar-insightful-allies-instinct',
      sourceAbilityId: 'feskar-insightful-allies',
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
        evidenceIds: ['feskar-insightful-allies-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'feskar-unyielding-grasp:stagger',
      sourceAbilityId: 'feskar-unyielding-grasp',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'feskar-unyielding-grasp',
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
      durationRounds: 3,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['feskar-unyielding-grasp-2026-06-26'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'feskar-calculated-assault-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'feskar-calculated-assault:feskar-calculated-assault-tactical',
              componentReferences: [
                {
                  componentId: 'feskar-calculated-assault:feskar-calculated-assault-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'feskar-emerald-inferno-burn-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'feskar-emerald-inferno:feskar-emerald-inferno-burn-payoff',
              componentReferences: [
                {
                  componentId: 'feskar-emerald-inferno:feskar-emerald-inferno-burn-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'feskar-emerald-inferno-fire',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'feskar-emerald-inferno:feskar-emerald-inferno-fire',
              componentReferences: [
                {
                  componentId: 'feskar-emerald-inferno:feskar-emerald-inferno-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'feskar-insightful-allies-instinct',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'feskar-insightful-allies:feskar-insightful-allies-instinct',
              componentReferences: [
                {
                  componentId: 'feskar-insightful-allies:feskar-insightful-allies-instinct',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'feskar-unyielding-grasp-stagger',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'feskar-unyielding-grasp:stagger',
              componentReferences: [
                {
                  componentId: 'feskar-unyielding-grasp:stagger',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
