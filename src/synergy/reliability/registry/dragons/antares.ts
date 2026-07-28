import { defineDragonReliabilityRegistry } from '../registryTypes';

export const antaresReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'antares',
  components: [
    {
      id: 'antares-blazing-onslaught:antares-blazing-onslaught-fire-vulnerability',
      sourceAbilityId: 'antares-blazing-onslaught',
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
        evidenceIds: ['antares-blazing-onslaught-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'antares-blazing-onslaught:antares-blazing-onslaught-non-basic-physical-vulnerability',
      sourceAbilityId: 'antares-blazing-onslaught',
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
        evidenceIds: ['antares-blazing-onslaught-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'antares-fiery-precision:antares-fiery-precision-slow-payoff',
      sourceAbilityId: 'antares-fiery-precision',
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
        evidenceIds: ['antares-fiery-precision-2026-07-15'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'antares-hunters-wrath:antares-hunters-wrath-right-stats',
      sourceAbilityId: 'antares-hunters-wrath',
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
        evidenceIds: ['antares-hunters-wrath-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'antares-relentless-pursuit:antares-relentless-pursuit-fire',
      sourceAbilityId: 'antares-relentless-pursuit',
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
        evidenceIds: ['antares-relentless-pursuit-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'antares-relentless-pursuit:vulnerable',
      sourceAbilityId: 'antares-relentless-pursuit',
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
        evidenceIds: ['antares-relentless-pursuit-2026-07-15'],
        unresolvedQuestions: ['Battle length and temporal independence are unresolved.'],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'antares-blazing-onslaught-fire-vulnerability',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'antares-blazing-onslaught:antares-blazing-onslaught-fire-vulnerability',
              componentReferences: [
                {
                  componentId:
                    'antares-blazing-onslaught:antares-blazing-onslaught-fire-vulnerability',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'antares-blazing-onslaught-non-basic-physical-vulnerability',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId:
                'antares-blazing-onslaught:antares-blazing-onslaught-non-basic-physical-vulnerability',
              componentReferences: [
                {
                  componentId:
                    'antares-blazing-onslaught:antares-blazing-onslaught-non-basic-physical-vulnerability',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'antares-fiery-precision-slow-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'antares-fiery-precision:antares-fiery-precision-slow-payoff',
              componentReferences: [
                {
                  componentId: 'antares-fiery-precision:antares-fiery-precision-slow-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'antares-hunters-wrath-right-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'antares-hunters-wrath:antares-hunters-wrath-right-stats',
              componentReferences: [
                {
                  componentId: 'antares-hunters-wrath:antares-hunters-wrath-right-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'antares-relentless-pursuit-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'antares-relentless-pursuit:antares-relentless-pursuit-fire',
              componentReferences: [
                {
                  componentId: 'antares-relentless-pursuit:antares-relentless-pursuit-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'antares-relentless-pursuit-vulnerable',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'antares-relentless-pursuit:vulnerable',
              componentReferences: [
                {
                  componentId: 'antares-relentless-pursuit:vulnerable',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
