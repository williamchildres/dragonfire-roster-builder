import { defineDragonReliabilityRegistry } from '../registryTypes';

export const daemorosReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'daemoros',
  components: [
    {
      id: 'daemoros-instill-fear:panic',
      sourceAbilityId: 'daemoros-instill-fear',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'daemoros-instill-fear',
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
        minimumStarRank: 2,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['daemoros-instill-fear-2026-06-26'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'daemoros-shadowflame:burn',
      sourceAbilityId: 'daemoros-shadowflame',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
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
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['daemoros-shadowflame-2026-06-26'],
        unresolvedQuestions: [
          'Whether Burn checks on separate odd-numbered rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'daemoros-shadowflame:daemoros-shadowflame-physical',
      sourceAbilityId: 'daemoros-shadowflame',
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
        evidenceIds: ['daemoros-shadowflame-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'daemoros-shroud-of-shadows:confusion',
      sourceAbilityId: 'daemoros-shroud-of-shadows',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'daemoros-shroud-of-shadows',
        byLevel: {
          '1': 0.15,
          '2': 0.18,
          '3': 0.21,
          '4': 0.255,
          '5': 0.3,
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
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['daemoros-shroud-of-shadows-2026-06-26'],
        unresolvedQuestions: [
          'Whether Confusion checks on separate odd-numbered rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'daemoros-warriors-zeal:daemoros-warriors-zeal-left-stats',
      sourceAbilityId: 'daemoros-warriors-zeal',
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
        evidenceIds: ['daemoros-warriors-zeal-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'daemoros-instill-fear-panic',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'daemoros-instill-fear:panic',
              componentReferences: [
                {
                  componentId: 'daemoros-instill-fear:panic',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'daemoros-shadowflame-burn',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'daemoros-shadowflame:burn',
              componentReferences: [
                {
                  componentId: 'daemoros-shadowflame:burn',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'daemoros-shadowflame-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'daemoros-shadowflame:daemoros-shadowflame-physical',
              componentReferences: [
                {
                  componentId: 'daemoros-shadowflame:daemoros-shadowflame-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'daemoros-shroud-of-shadows-confusion',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'daemoros-shroud-of-shadows:confusion',
              componentReferences: [
                {
                  componentId: 'daemoros-shroud-of-shadows:confusion',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'daemoros-warriors-zeal-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'daemoros-warriors-zeal:daemoros-warriors-zeal-left-stats',
              componentReferences: [
                {
                  componentId: 'daemoros-warriors-zeal:daemoros-warriors-zeal-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
