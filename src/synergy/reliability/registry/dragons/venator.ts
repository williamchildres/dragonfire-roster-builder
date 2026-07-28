import { defineDragonReliabilityRegistry } from '../registryTypes';

export const venatorReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'venator',
  components: [
    {
      id: 'venator-armor-break:venator-armor-break-physical',
      sourceAbilityId: 'venator-armor-break',
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
        evidenceIds: ['venator-armor-break-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'venator-desperate-ambush:overwhelm',
      sourceAbilityId: 'venator-desperate-ambush',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'venator-desperate-ambush',
        byLevel: {
          '1': 0.12,
          '2': 0.156,
          '3': 0.192,
          '4': 0.24,
          '5': 0.3,
        },
      },
      opportunityPresence: 'conditional',
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
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 2,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['venator-desperate-ambush-2026-06-25'],
        unresolvedQuestions: [
          'Battle length, condition duration, and temporal independence are unresolved.',
        ],
        reviewNote: 'Opportunities also depend on the below-50% condition.',
      },
    },
    {
      id: 'venator-feral-precision:venator-feral-precision-physical',
      sourceAbilityId: 'venator-feral-precision',
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
        evidenceIds: ['venator-feral-precision-2026-06-25'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'venator-feral-strike:venator-feral-strike-physical',
      sourceAbilityId: 'venator-feral-strike',
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
        evidenceIds: ['venator-feral-strike-summary-2026-06-25'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'venator-warriors-zeal:venator-warriors-zeal-left-stats',
      sourceAbilityId: 'venator-warriors-zeal',
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
        evidenceIds: ['venator-warriors-zeal-2026-06-25'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'venator-armor-break-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'venator-armor-break:venator-armor-break-physical',
              componentReferences: [
                {
                  componentId: 'venator-armor-break:venator-armor-break-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'venator-desperate-ambush-overwhelm',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'venator-desperate-ambush:overwhelm',
              componentReferences: [
                {
                  componentId: 'venator-desperate-ambush:overwhelm',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'venator-feral-precision-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'venator-feral-precision:venator-feral-precision-physical',
              componentReferences: [
                {
                  componentId: 'venator-feral-precision:venator-feral-precision-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'venator-feral-strike-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'venator-feral-strike:venator-feral-strike-physical',
              componentReferences: [
                {
                  componentId: 'venator-feral-strike:venator-feral-strike-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'venator-warriors-zeal-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'venator-warriors-zeal:venator-warriors-zeal-left-stats',
              componentReferences: [
                {
                  componentId: 'venator-warriors-zeal:venator-warriors-zeal-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
