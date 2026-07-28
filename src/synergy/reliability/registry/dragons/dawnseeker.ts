import { defineDragonReliabilityRegistry } from '../registryTypes';

export const dawnseekerReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'dawnseeker',
  components: [
    {
      id: 'dawnseeker-first-light:dawnseeker-first-light-stats',
      sourceAbilityId: 'dawnseeker-first-light',
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
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['dawnseeker-first-light-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-first-light:shared-first-strike',
      sourceAbilityId: 'dawnseeker-first-light',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'dawnseeker-first-light',
        byLevel: {
          '1': 0.2,
          '2': 0.26,
          '3': 0.32,
          '4': 0.4,
          '5': 0.5,
        },
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 2, 3],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 3,
      },
      rollScope: 'shared',
      targetFacts: {
        count: 2,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 1,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['dawnseeker-first-light-2026-07-16'],
        unresolvedQuestions: [
          'Both other Allies share one activation.',
          'Whether checks on separate scheduled rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'dawnseeker-radiant-wings:dawnseeker-initiative-payoff',
      sourceAbilityId: 'dawnseeker-radiant-wings',
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
        evidenceIds: ['dawnseeker-radiant-wings-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-radiant-wings:dawnseeker-instinct-payoff',
      sourceAbilityId: 'dawnseeker-radiant-wings',
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
        evidenceIds: ['dawnseeker-radiant-wings-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-radiant-wings:dawnseeker-radiant-wings-recovery',
      sourceAbilityId: 'dawnseeker-radiant-wings',
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
        evidenceIds: ['dawnseeker-radiant-wings-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-radiant-wings:dawnseeker-radiant-wings-tactical',
      sourceAbilityId: 'dawnseeker-radiant-wings',
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
        evidenceIds: ['dawnseeker-radiant-wings-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-radiant-wings:dawnseeker-tactical-payoff',
      sourceAbilityId: 'dawnseeker-radiant-wings',
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
        evidenceIds: ['dawnseeker-radiant-wings-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-sentinels-presence:dawnseeker-sentinels-presence-left-fire',
      sourceAbilityId: 'dawnseeker-sentinels-presence',
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
        evidenceIds: ['dawnseeker-sentinels-presence-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-tactical-inferno:dawnseeker-tactical-inferno-fire',
      sourceAbilityId: 'dawnseeker-tactical-inferno',
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
        evidenceIds: ['dawnseeker-tactical-inferno-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-tactical-inferno:dawnseeker-tactical-inferno-tactical',
      sourceAbilityId: 'dawnseeker-tactical-inferno',
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
        evidenceIds: ['dawnseeker-tactical-inferno-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'dawnseeker-winds-favor:dawnseeker-winds-favor-initiative',
      sourceAbilityId: 'dawnseeker-winds-favor',
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
        evidenceIds: ['dawnseeker-winds-favor-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'dawnseeker-first-light-first-strike',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-first-light:shared-first-strike',
              componentReferences: [
                {
                  componentId: 'dawnseeker-first-light:shared-first-strike',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-first-light-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-first-light:dawnseeker-first-light-stats',
              componentReferences: [
                {
                  componentId: 'dawnseeker-first-light:dawnseeker-first-light-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-initiative-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-radiant-wings:dawnseeker-initiative-payoff',
              componentReferences: [
                {
                  componentId: 'dawnseeker-radiant-wings:dawnseeker-initiative-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-instinct-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-radiant-wings:dawnseeker-instinct-payoff',
              componentReferences: [
                {
                  componentId: 'dawnseeker-radiant-wings:dawnseeker-instinct-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-radiant-wings-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-radiant-wings:dawnseeker-radiant-wings-recovery',
              componentReferences: [
                {
                  componentId: 'dawnseeker-radiant-wings:dawnseeker-radiant-wings-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-radiant-wings-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-radiant-wings:dawnseeker-radiant-wings-tactical',
              componentReferences: [
                {
                  componentId: 'dawnseeker-radiant-wings:dawnseeker-radiant-wings-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-sentinels-presence-left-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-sentinels-presence:dawnseeker-sentinels-presence-left-fire',
              componentReferences: [
                {
                  componentId:
                    'dawnseeker-sentinels-presence:dawnseeker-sentinels-presence-left-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-tactical-inferno-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-tactical-inferno:dawnseeker-tactical-inferno-fire',
              componentReferences: [
                {
                  componentId: 'dawnseeker-tactical-inferno:dawnseeker-tactical-inferno-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-tactical-inferno-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-tactical-inferno:dawnseeker-tactical-inferno-tactical',
              componentReferences: [
                {
                  componentId: 'dawnseeker-tactical-inferno:dawnseeker-tactical-inferno-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-tactical-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-radiant-wings:dawnseeker-tactical-payoff',
              componentReferences: [
                {
                  componentId: 'dawnseeker-radiant-wings:dawnseeker-tactical-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'dawnseeker-winds-favor-initiative',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'dawnseeker-winds-favor:dawnseeker-winds-favor-initiative',
              componentReferences: [
                {
                  componentId: 'dawnseeker-winds-favor:dawnseeker-winds-favor-initiative',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
