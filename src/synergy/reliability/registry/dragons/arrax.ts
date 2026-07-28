import { defineDragonReliabilityRegistry } from '../registryTypes';

export const arraxReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'arrax',
  components: [
    {
      id: 'arrax-sudden-strike:arrax-sudden-strike-physical',
      sourceAbilityId: 'arrax-sudden-strike',
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
        evidenceIds: ['arrax-sudden-strike-2026-07-15'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'arrax-sudden-strike:weakened',
      sourceAbilityId: 'arrax-sudden-strike',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'variants',
        variants: [
          {
            id: 'ordinary-target',
            probability: {
              kind: 'fixed',
              value: 0.25,
            },
          },
          {
            id: 'bleeding-target',
            probability: {
              kind: 'fixed',
              value: 0.5,
            },
          },
        ],
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [2, 4, 6, 8],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: false,
      },
      independence: 'unknown',
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['arrax-sudden-strike-2026-07-15'],
        unresolvedQuestions: [
          'Canonical text does not state Weakened duration.',
          'Whether checks on separate scheduled rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'arrax-turn-the-line:arrax-turn-the-line-physical',
      sourceAbilityId: 'arrax-turn-the-line',
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
        evidenceIds: ['arrax-turn-the-line-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'arrax-warriors-resilience:arrax-warriors-resilience-left-tactical',
      sourceAbilityId: 'arrax-warriors-resilience',
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
        evidenceIds: ['arrax-warriors-resilience-2026-07-15'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'arrax-sudden-strike-bleed-payoff',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'bleeding-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'bleeding-target',
          },
          events: [
            {
              eventId: 'arrax-sudden-strike:weakened',
              componentReferences: [
                {
                  componentId: 'arrax-sudden-strike:weakened',
                  probabilityVariantId: 'bleeding-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arrax-sudden-strike-physical',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arrax-sudden-strike:arrax-sudden-strike-physical',
              componentReferences: [
                {
                  componentId: 'arrax-sudden-strike:arrax-sudden-strike-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arrax-sudden-strike-weakened',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'ordinary-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'ordinary-target',
          },
          events: [
            {
              eventId: 'arrax-sudden-strike:weakened',
              componentReferences: [
                {
                  componentId: 'arrax-sudden-strike:weakened',
                  probabilityVariantId: 'ordinary-target',
                },
              ],
            },
          ],
        },
        {
          pathId: 'bleeding-target',
          appliesWhen: {
            kind: 'probability-context',
            id: 'bleeding-target',
          },
          events: [
            {
              eventId: 'arrax-sudden-strike:weakened',
              componentReferences: [
                {
                  componentId: 'arrax-sudden-strike:weakened',
                  probabilityVariantId: 'bleeding-target',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arrax-turn-the-line-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arrax-turn-the-line:arrax-turn-the-line-physical',
              componentReferences: [
                {
                  componentId: 'arrax-turn-the-line:arrax-turn-the-line-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'arrax-warriors-resilience-left-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'arrax-warriors-resilience:arrax-warriors-resilience-left-tactical',
              componentReferences: [
                {
                  componentId: 'arrax-warriors-resilience:arrax-warriors-resilience-left-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
