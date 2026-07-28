import { defineDragonReliabilityRegistry } from '../registryTypes';

export const arulixReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'arulix',
  components: [
    {
      id: 'arulix-battle-cunning:arulix-battle-cunning-instinct-payoff',
      sourceAbilityId: 'arulix-battle-cunning',
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
        evidenceIds: ['arulix-battle-cunning-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'arulix-gleaming-spiral:arulix-gleaming-spiral-physical',
      sourceAbilityId: 'arulix-gleaming-spiral',
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
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['arulix-gleaming-spiral-2026-07-15'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'arulix-gleaming-spiral:arulix-gleaming-spiral-tactical',
      sourceAbilityId: 'arulix-gleaming-spiral',
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
        evidenceIds: ['arulix-gleaming-spiral-2026-07-15'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'arulix-hypnotic-helix:overwhelm',
      sourceAbilityId: 'arulix-hypnotic-helix',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'arulix-hypnotic-helix',
        byLevel: {
          '1': 0.125,
          '2': 0.15,
          '3': 0.175,
          '4': 0.213,
          '5': 0.25,
        },
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 3, 6, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'per-effect',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 2,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['arulix-hypnotic-helix-2026-07-15'],
        unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
        reviewNote:
          'Each signal has four explicit scheduled checks; the two effects use disjoint round schedules.',
      },
    },
    {
      id: 'arulix-hypnotic-helix:stagger',
      sourceAbilityId: 'arulix-hypnotic-helix',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'arulix-hypnotic-helix',
        byLevel: {
          '1': 0.125,
          '2': 0.15,
          '3': 0.175,
          '4': 0.213,
          '5': 0.25,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 3, 6, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'per-effect',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 2,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['arulix-hypnotic-helix-2026-07-15'],
        unresolvedQuestions: ['Whether checks on separate scheduled rounds are independent.'],
        reviewNote:
          'Each signal has four explicit scheduled checks; the two effects use disjoint round schedules.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'arulix-battle-cunning-instinct-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arulix-battle-cunning:arulix-battle-cunning-instinct-payoff',
              componentReferences: [
                {
                  componentId: 'arulix-battle-cunning:arulix-battle-cunning-instinct-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arulix-gleaming-spiral-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arulix-gleaming-spiral:arulix-gleaming-spiral-physical',
              componentReferences: [
                {
                  componentId: 'arulix-gleaming-spiral:arulix-gleaming-spiral-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arulix-gleaming-spiral-tactical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arulix-gleaming-spiral:arulix-gleaming-spiral-tactical',
              componentReferences: [
                {
                  componentId: 'arulix-gleaming-spiral:arulix-gleaming-spiral-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arulix-hypnotic-helix-overwhelm',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arulix-hypnotic-helix:overwhelm',
              componentReferences: [
                {
                  componentId: 'arulix-hypnotic-helix:overwhelm',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arulix-hypnotic-helix-stagger',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arulix-hypnotic-helix:stagger',
              componentReferences: [
                {
                  componentId: 'arulix-hypnotic-helix:stagger',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
