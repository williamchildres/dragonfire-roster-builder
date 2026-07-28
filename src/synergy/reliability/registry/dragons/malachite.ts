import { defineDragonReliabilityRegistry } from '../registryTypes';

export const malachiteReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'malachite',
  components: [
    {
      id: 'malachite-collective-might:malachite-collective-might-strength',
      sourceAbilityId: 'malachite-collective-might',
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
        evidenceIds: ['malachite-collective-might-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'malachite-forests-instinct:physical-support',
      sourceAbilityId: 'malachite-forests-instinct',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.35,
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
        count: 2,
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
        evidenceIds: ['malachite-forests-instinct-2026-06-23'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'malachite-lightning-strike:shared-first-strike-double-strike-strength',
      sourceAbilityId: 'malachite-lightning-strike',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'malachite-lightning-strike',
        byLevel: {
          '1': 0.4,
          '2': 0.52,
          '3': 0.64,
          '4': 0.8,
          '5': 1,
        },
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'start-of-combat',
      },
      opportunityCount: {
        kind: 'exact',
        value: 1,
      },
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'not-applicable',
      durationRounds: 3,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['malachite-lightning-strike-2026-06-23'],
        unresolvedQuestions: [
          'First-Strike, Double-Strike, and Strength share one roll and must not receive duplicate relationship credit.',
        ],
      },
    },
    {
      id: 'malachite-sentinels-presence:malachite-sentinels-presence-left-fire',
      sourceAbilityId: 'malachite-sentinels-presence',
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
        evidenceIds: ['malachite-sentinels-presence-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'malachite-thunderous-roar:advantage',
      sourceAbilityId: 'malachite-thunderous-roar',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'malachite-thunderous-roar',
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
        count: 2,
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
        evidenceIds: ['malachite-thunderous-roar-2026-06-23'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'malachite-wardens-rally:malachite-wardens-rally-recovery',
      sourceAbilityId: 'malachite-wardens-rally',
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
          'malachite-wardens-rally-glossary-2026-06-23',
          'malachite-wardens-rally-summary-2026-06-23',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'malachite-wardens-rally:malachite-wardens-rally-tactical',
      sourceAbilityId: 'malachite-wardens-rally',
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
          'malachite-wardens-rally-glossary-2026-06-23',
          'malachite-wardens-rally-summary-2026-06-23',
        ],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'malachite-collective-might-strength',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-collective-might:malachite-collective-might-strength',
              componentReferences: [
                {
                  componentId: 'malachite-collective-might:malachite-collective-might-strength',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-forests-instinct-physical',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-forests-instinct:physical-support',
              componentReferences: [
                {
                  componentId: 'malachite-forests-instinct:physical-support',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-lightning-strike-first-strike',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-lightning-strike:shared-first-strike-double-strike-strength',
              componentReferences: [
                {
                  componentId:
                    'malachite-lightning-strike:shared-first-strike-double-strike-strength',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-lightning-strike-strength',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-lightning-strike:shared-first-strike-double-strike-strength',
              componentReferences: [
                {
                  componentId:
                    'malachite-lightning-strike:shared-first-strike-double-strike-strength',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-sentinels-presence-left-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-sentinels-presence:malachite-sentinels-presence-left-fire',
              componentReferences: [
                {
                  componentId:
                    'malachite-sentinels-presence:malachite-sentinels-presence-left-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-thunderous-roar-damage',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-thunderous-roar:advantage',
              componentReferences: [
                {
                  componentId: 'malachite-thunderous-roar:advantage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-wardens-rally-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-wardens-rally:malachite-wardens-rally-recovery',
              componentReferences: [
                {
                  componentId: 'malachite-wardens-rally:malachite-wardens-rally-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'malachite-wardens-rally-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'malachite-wardens-rally:malachite-wardens-rally-tactical',
              componentReferences: [
                {
                  componentId: 'malachite-wardens-rally:malachite-wardens-rally-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
