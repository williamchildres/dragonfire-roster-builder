import { defineDragonReliabilityRegistry } from '../registryTypes';

export const syraxReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'syrax',
  components: [
    {
      id: 'syrax-blazing-fury:fire-and-first-strike',
      sourceAbilityId: 'syrax-blazing-fury',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
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
        evidenceIds: [
          'syrax-blazing-fury-details-2026-06-24',
          'syrax-blazing-fury-summary-2026-06-24',
        ],
        unresolvedQuestions: [
          'Battle length and temporal independence are unresolved.',
          'Fire Damage support and First-Strike share one activation and must not be double-discounted.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'syrax-blazing-fury:syrax-blazing-fury-tactical',
      sourceAbilityId: 'syrax-blazing-fury',
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
          'syrax-blazing-fury-details-2026-06-24',
          'syrax-blazing-fury-summary-2026-06-24',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'syrax-flight-mastery:syrax-flight-mastery-initiative',
      sourceAbilityId: 'syrax-flight-mastery',
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
        evidenceIds: ['syrax-flight-mastery-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'syrax-mindful-synergy:syrax-mindful-synergy-stats',
      sourceAbilityId: 'syrax-mindful-synergy',
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
        evidenceIds: ['syrax-mindful-synergy-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'syrax-sentinels-wit:syrax-sentinels-wit-left-stats',
      sourceAbilityId: 'syrax-sentinels-wit',
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
        evidenceIds: ['syrax-sentinels-wit-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'syrax-strategic-revival:resistance',
      sourceAbilityId: 'syrax-strategic-revival',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'syrax-strategic-revival',
        byLevel: {
          '1': 0.4,
          '2': 0.52,
          '3': 0.64,
          '4': 0.8,
          '5': 1,
        },
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
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['syrax-strategic-revival-2026-06-24'],
        unresolvedQuestions: ['Whether Resistance checks across scheduled rounds are independent.'],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'syrax-strategic-revival:syrax-strategic-revival-recovery',
      sourceAbilityId: 'syrax-strategic-revival',
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
        evidenceIds: ['syrax-strategic-revival-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'syrax-strategic-revival:syrax-strategic-revival-slow-payoff',
      sourceAbilityId: 'syrax-strategic-revival',
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
        evidenceIds: ['syrax-strategic-revival-2026-06-24'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'syrax-tactical-inferno:syrax-tactical-inferno-damage-support',
      sourceAbilityId: 'syrax-tactical-inferno',
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
        evidenceIds: ['syrax-tactical-inferno-2026-06-24'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'syrax-blazing-fury-fire-support',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-blazing-fury:fire-and-first-strike',
              componentReferences: [
                {
                  componentId: 'syrax-blazing-fury:fire-and-first-strike',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-blazing-fury-first-strike',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-blazing-fury:fire-and-first-strike',
              componentReferences: [
                {
                  componentId: 'syrax-blazing-fury:fire-and-first-strike',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-blazing-fury-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-blazing-fury:syrax-blazing-fury-tactical',
              componentReferences: [
                {
                  componentId: 'syrax-blazing-fury:syrax-blazing-fury-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-flight-mastery-initiative',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-flight-mastery:syrax-flight-mastery-initiative',
              componentReferences: [
                {
                  componentId: 'syrax-flight-mastery:syrax-flight-mastery-initiative',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-mindful-synergy-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-mindful-synergy:syrax-mindful-synergy-stats',
              componentReferences: [
                {
                  componentId: 'syrax-mindful-synergy:syrax-mindful-synergy-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-sentinels-wit-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-sentinels-wit:syrax-sentinels-wit-left-stats',
              componentReferences: [
                {
                  componentId: 'syrax-sentinels-wit:syrax-sentinels-wit-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-strategic-revival-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-strategic-revival:syrax-strategic-revival-recovery',
              componentReferences: [
                {
                  componentId: 'syrax-strategic-revival:syrax-strategic-revival-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-strategic-revival-resistance',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-strategic-revival:resistance',
              componentReferences: [
                {
                  componentId: 'syrax-strategic-revival:resistance',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-strategic-revival-slow-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-strategic-revival:syrax-strategic-revival-slow-payoff',
              componentReferences: [
                {
                  componentId: 'syrax-strategic-revival:syrax-strategic-revival-slow-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'syrax-tactical-inferno-damage-support',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'syrax-tactical-inferno:syrax-tactical-inferno-damage-support',
              componentReferences: [
                {
                  componentId: 'syrax-tactical-inferno:syrax-tactical-inferno-damage-support',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
