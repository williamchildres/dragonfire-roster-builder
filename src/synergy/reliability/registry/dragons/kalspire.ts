import { defineDragonReliabilityRegistry } from '../registryTypes';

export const kalspireReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'kalspire',
  components: [
    {
      id: 'kalspire-tactical-assault:kalspire-tactical-assault-physical',
      sourceAbilityId: 'kalspire-tactical-assault',
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
        evidenceIds: ['kalspire-tactical-assault-2026-06-25'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'kalspire-tactical-assault:panic',
      sourceAbilityId: 'kalspire-tactical-assault',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'kalspire-tactical-assault',
        byLevel: {
          '1': 0.15,
          '2': 0.18,
          '3': 0.21,
          '4': 0.255,
          '5': 0.3,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'after-event',
        sourceEvent:
          'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
      },
      opportunityCount: {
        kind: 'ability-activation-dependent',
        sourceEvent:
          'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
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
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['kalspire-tactical-assault-2026-06-25'],
        unresolvedQuestions: [
          'Basic Attack count is unresolved.',
          'Wording confirms separate checks but not statistical independence.',
        ],
        reviewNote:
          'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
      },
    },
    {
      id: 'kalspire-tactical-strike:bleed',
      sourceAbilityId: 'kalspire-tactical-strike',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.3,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'after-event',
        sourceEvent:
          'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
      },
      opportunityCount: {
        kind: 'ability-activation-dependent',
        sourceEvent:
          'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
      },
      rollScope: 'per-target',
      targetFacts: {
        count: 2,
        separatePerTarget: true,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['kalspire-tactical-strike-summary-2026-06-25'],
        unresolvedQuestions: [
          'Basic Attack count is unresolved.',
          'Wording confirms separate checks but not statistical independence.',
        ],
        reviewNote:
          'Checks follow Basic Attacks; the number of Basic Attacks in a battle is unresolved.',
      },
    },
    {
      id: 'kalspire-tactical-strike:kalspire-tactical-strike-tactical',
      sourceAbilityId: 'kalspire-tactical-strike',
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
        evidenceIds: ['kalspire-tactical-strike-summary-2026-06-25'],
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
      signalId: 'kalspire-tactical-assault-panic',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'kalspire-tactical-assault:panic',
              componentReferences: [
                {
                  componentId: 'kalspire-tactical-assault:panic',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'kalspire-tactical-assault-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'kalspire-tactical-assault:kalspire-tactical-assault-physical',
              componentReferences: [
                {
                  componentId: 'kalspire-tactical-assault:kalspire-tactical-assault-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'kalspire-tactical-strike-bleed',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'kalspire-tactical-strike:bleed',
              componentReferences: [
                {
                  componentId: 'kalspire-tactical-strike:bleed',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'kalspire-tactical-strike-tactical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'kalspire-tactical-strike:kalspire-tactical-strike-tactical',
              componentReferences: [
                {
                  componentId: 'kalspire-tactical-strike:kalspire-tactical-strike-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
