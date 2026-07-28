import { defineDragonReliabilityRegistry } from '../registryTypes';

export const caraxesReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'caraxes',
  components: [
    {
      id: 'caraxes-crippling-inferno:burn',
      sourceAbilityId: 'caraxes-crippling-inferno',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'caraxes-crippling-inferno',
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
      rollScope: 'per-target-and-effect',
      targetFacts: {
        count: 3,
        separatePerTarget: true,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['caraxes-crippling-inferno-2026-06-24'],
        unresolvedQuestions: [
          'Wording confirms separate checks, but statistical independence across targets, effects, and rounds is not stated.',
          'Actual valid-target count and battle length are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'caraxes-crippling-inferno:slow',
      sourceAbilityId: 'caraxes-crippling-inferno',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'caraxes-crippling-inferno',
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
      rollScope: 'per-target-and-effect',
      targetFacts: {
        count: 3,
        separatePerTarget: true,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['caraxes-crippling-inferno-2026-06-24'],
        unresolvedQuestions: [
          'Wording confirms separate checks, but statistical independence across targets, effects, and rounds is not stated.',
          'Actual valid-target count and battle length are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'caraxes-hunters-wrath:caraxes-hunters-wrath-right-stats',
      sourceAbilityId: 'caraxes-hunters-wrath',
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
        evidenceIds: ['caraxes-hunters-wrath-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'caraxes-infernal-burst:caraxes-infernal-burst-fire',
      sourceAbilityId: 'caraxes-infernal-burst',
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
        evidenceIds: ['caraxes-infernal-burst-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'caraxes-infernal-burst:caraxes-infernal-burst-first-strike-payoff',
      sourceAbilityId: 'caraxes-infernal-burst',
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
        evidenceIds: ['caraxes-infernal-burst-2026-06-24'],
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
      signalId: 'caraxes-crippling-inferno-burn',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'caraxes-crippling-inferno:burn',
              componentReferences: [
                {
                  componentId: 'caraxes-crippling-inferno:burn',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'caraxes-crippling-inferno-fire',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'caraxes-crippling-inferno:burn',
              componentReferences: [
                {
                  componentId: 'caraxes-crippling-inferno:burn',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'caraxes-crippling-inferno-slow',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'caraxes-crippling-inferno:slow',
              componentReferences: [
                {
                  componentId: 'caraxes-crippling-inferno:slow',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'caraxes-hunters-wrath-right-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'caraxes-hunters-wrath:caraxes-hunters-wrath-right-stats',
              componentReferences: [
                {
                  componentId: 'caraxes-hunters-wrath:caraxes-hunters-wrath-right-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'caraxes-infernal-burst-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'caraxes-infernal-burst:caraxes-infernal-burst-fire',
              componentReferences: [
                {
                  componentId: 'caraxes-infernal-burst:caraxes-infernal-burst-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'caraxes-infernal-burst-first-strike-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'caraxes-infernal-burst:caraxes-infernal-burst-first-strike-payoff',
              componentReferences: [
                {
                  componentId: 'caraxes-infernal-burst:caraxes-infernal-burst-first-strike-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
