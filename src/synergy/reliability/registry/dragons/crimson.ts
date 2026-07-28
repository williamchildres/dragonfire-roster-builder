import { defineDragonReliabilityRegistry } from '../registryTypes';

export const crimsonReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'crimson',
  components: [
    {
      id: 'crimson-bloodscale-fury:taunt-conditioned-weakened',
      sourceAbilityId: 'crimson-bloodscale-fury',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'ordinary-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'crimson-bloodscale-fury',
              byLevel: {
                '1': 0.175,
                '2': 0.21,
                '3': 0.245,
                '4': 0.2975,
                '5': 0.35,
              },
            },
          },
          {
            id: 'taunted-target',
            probability: {
              kind: 'habit-level',
              habitAbilityId: 'crimson-bloodscale-fury',
              byLevel: {
                '1': 0.35,
                '2': 0.42,
                '3': 0.49,
                '4': 0.595,
                '5': 0.7,
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
        evidenceIds: ['crimson-bloodscale-fury-2026-06-25'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'crimson-bloodscale-terror:crimson-bloodscale-terror-fire',
      sourceAbilityId: 'crimson-bloodscale-terror',
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
        evidenceIds: ['crimson-bloodscale-terror-summary-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'crimson-bloodscale-terror:stun',
      sourceAbilityId: 'crimson-bloodscale-terror',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'round-specific',
        byRound: {
          '1': {
            kind: 'habit-override',
            habitAbilityId: 'crimson-vermins-bane',
            base: 0.2,
            byLevel: {
              '1': 0.4,
              '2': 0.52,
              '3': 0.64,
              '4': 0.8,
              '5': 1,
            },
          },
          '3': {
            kind: 'fixed',
            value: 0.2,
          },
          '5': {
            kind: 'fixed',
            value: 0.2,
          },
          '7': {
            kind: 'fixed',
            value: 0.2,
          },
          '9': {
            kind: 'fixed',
            value: 0.2,
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
        evidenceIds: ['crimson-bloodscale-terror-summary-2026-06-25'],
        unresolvedQuestions: [
          'Whether Stun checks on separate odd-numbered rounds are independent.',
        ],
        reviewNote:
          'At 10 Stars Vermin’s Bane replaces only the Round 1 chance; later odd rounds remain 20%. The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'crimson-hunters-cunning:crimson-hunters-cunning-right-physical',
      sourceAbilityId: 'crimson-hunters-cunning',
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
        evidenceIds: ['crimson-hunters-cunning-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'crimson-unlikely-hero:crimson-unlikely-hero-vulnerability',
      sourceAbilityId: 'crimson-unlikely-hero',
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
        minimumStarRank: 8,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['crimson-unlikely-hero-2026-06-25'],
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
      signalId: 'crimson-bloodscale-fury-taunt-payoff',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'taunted-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'taunted-target',
          },
          events: [
            {
              eventId: 'crimson-bloodscale-fury:taunt-conditioned-weakened',
              componentReferences: [
                {
                  componentId: 'crimson-bloodscale-fury:taunt-conditioned-weakened',
                  probabilityVariantId: 'taunted-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'crimson-bloodscale-terror-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'crimson-bloodscale-terror:crimson-bloodscale-terror-fire',
              componentReferences: [
                {
                  componentId: 'crimson-bloodscale-terror:crimson-bloodscale-terror-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'crimson-bloodscale-terror-stun',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'crimson-bloodscale-terror:stun',
              componentReferences: [
                {
                  componentId: 'crimson-bloodscale-terror:stun',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'crimson-hunters-cunning-right-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'crimson-hunters-cunning:crimson-hunters-cunning-right-physical',
              componentReferences: [
                {
                  componentId: 'crimson-hunters-cunning:crimson-hunters-cunning-right-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'crimson-unlikely-hero-vulnerability',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'crimson-unlikely-hero:crimson-unlikely-hero-vulnerability',
              componentReferences: [
                {
                  componentId: 'crimson-unlikely-hero:crimson-unlikely-hero-vulnerability',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
