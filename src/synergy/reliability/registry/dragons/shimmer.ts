import { defineDragonReliabilityRegistry } from '../registryTypes';

export const shimmerReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'shimmer',
  components: [
    {
      id: 'shimmer-crushing-force:shimmer-crushing-force-physical',
      sourceAbilityId: 'shimmer-crushing-force',
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
        evidenceIds: ['shimmer-crushing-force-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-crushing-force:shimmer-crushing-force-tactical',
      sourceAbilityId: 'shimmer-crushing-force',
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
        evidenceIds: ['shimmer-crushing-force-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-loyal-shield:shimmer-loyal-shield-recovery',
      sourceAbilityId: 'shimmer-loyal-shield',
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
        evidenceIds: ['shimmer-loyal-shield-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-loyal-shield:shimmer-loyal-shield-resistance-payoff',
      sourceAbilityId: 'shimmer-loyal-shield',
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
        evidenceIds: ['shimmer-loyal-shield-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-sentinels-presence:shimmer-sentinels-presence-left-fire',
      sourceAbilityId: 'shimmer-sentinels-presence',
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
        evidenceIds: ['shimmer-sentinels-presence-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-sneak-attack:physical-and-first-strike',
      sourceAbilityId: 'shimmer-sneak-attack',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'shimmer-sneak-attack',
        byLevel: {
          '1': 0.14,
          '2': 0.182,
          '3': 0.224,
          '4': 0.28,
          '5': 0.35,
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
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shimmer-sneak-attack-2026-07-16'],
        unresolvedQuestions: [
          'Physical support and First-Strike share one roll and target.',
          'Battle length, tie-breaking, and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'shimmer-unbreakable-loyalty:scheduled-recovery',
      sourceAbilityId: 'shimmer-unbreakable-loyalty',
      sourceAbilityKind: 'command',
      reliabilityClass: 'guaranteed',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 5, 8],
      },
      opportunityCount: {
        kind: 'not-applicable',
      },
      rollScope: 'not-applicable',
      independence: 'not-applicable',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['shimmer-unbreakable-loyalty-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical',
      sourceAbilityId: 'shimmer-unbreakable-loyalty',
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
        evidenceIds: ['shimmer-unbreakable-loyalty-2026-07-16'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'shimmer-unbreakable-loyalty:strength-and-initiative',
      sourceAbilityId: 'shimmer-unbreakable-loyalty',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.3,
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
        evidenceIds: ['shimmer-unbreakable-loyalty-2026-07-16'],
        unresolvedQuestions: [
          'Strength and Initiative share one roll and target.',
          'Battle length, tie-breaking, and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'shimmer-crushing-force-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-crushing-force:shimmer-crushing-force-physical',
              componentReferences: [
                {
                  componentId: 'shimmer-crushing-force:shimmer-crushing-force-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-crushing-force-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-crushing-force:shimmer-crushing-force-tactical',
              componentReferences: [
                {
                  componentId: 'shimmer-crushing-force:shimmer-crushing-force-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-loyal-shield-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-loyal-shield:shimmer-loyal-shield-recovery',
              componentReferences: [
                {
                  componentId: 'shimmer-loyal-shield:shimmer-loyal-shield-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-loyal-shield-resistance-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-loyal-shield:shimmer-loyal-shield-resistance-payoff',
              componentReferences: [
                {
                  componentId: 'shimmer-loyal-shield:shimmer-loyal-shield-resistance-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-sentinels-presence-left-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-sentinels-presence:shimmer-sentinels-presence-left-fire',
              componentReferences: [
                {
                  componentId: 'shimmer-sentinels-presence:shimmer-sentinels-presence-left-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-sneak-attack-first-strike',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-sneak-attack:physical-and-first-strike',
              componentReferences: [
                {
                  componentId: 'shimmer-sneak-attack:physical-and-first-strike',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-sneak-attack-physical',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-sneak-attack:physical-and-first-strike',
              componentReferences: [
                {
                  componentId: 'shimmer-sneak-attack:physical-and-first-strike',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-unbreakable-loyalty-instinct-payoff',
      bindingClass: 'resolved-mixed',
      paths: [
        {
          pathId: 'command-buffs',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'command-buffs',
          },
          events: [
            {
              eventId: 'shimmer-unbreakable-loyalty:strength-and-initiative',
              componentReferences: [
                {
                  componentId: 'shimmer-unbreakable-loyalty:strength-and-initiative',
                },
              ],
            },
          ],
        },
        {
          pathId: 'tactical-damage',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'tactical-damage',
          },
          events: [
            {
              eventId: 'shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical',
              componentReferences: [
                {
                  componentId: 'shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical',
                },
              ],
            },
          ],
        },
        {
          pathId: 'recovery',
          appliesWhen: {
            kind: 'relationship-use',
            id: 'recovery',
          },
          events: [
            {
              eventId: 'shimmer-unbreakable-loyalty:scheduled-recovery',
              componentReferences: [
                {
                  componentId: 'shimmer-unbreakable-loyalty:scheduled-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-unbreakable-loyalty-stats',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-unbreakable-loyalty:strength-and-initiative',
              componentReferences: [
                {
                  componentId: 'shimmer-unbreakable-loyalty:strength-and-initiative',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'shimmer-unbreakable-loyalty-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical',
              componentReferences: [
                {
                  componentId: 'shimmer-unbreakable-loyalty:shimmer-unbreakable-loyalty-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
