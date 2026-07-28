import { defineDragonReliabilityRegistry } from '../registryTypes';

export const rhysarionReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'rhysarion',
  components: [
    {
      id: 'rhysarion-champions-vigor:rhysarion-champions-vigor-right-damage',
      sourceAbilityId: 'rhysarion-champions-vigor',
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
        evidenceIds: ['rhysarion-champions-vigor-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'rhysarion-dawnsong:rhysarion-dawnsong-control-payoff',
      sourceAbilityId: 'rhysarion-dawnsong',
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
        evidenceIds: ['rhysarion-dawnsong-2026-06-26'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'rhysarion-dawnsong:rhysarion-dawnsong-fire',
      sourceAbilityId: 'rhysarion-dawnsong',
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
        evidenceIds: ['rhysarion-dawnsong-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'rhysarion-dawnsong:rhysarion-dawnsong-physical',
      sourceAbilityId: 'rhysarion-dawnsong',
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
        evidenceIds: ['rhysarion-dawnsong-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'rhysarion-ebbing-fury:rhysarion-ebbing-fury-recovery',
      sourceAbilityId: 'rhysarion-ebbing-fury',
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
        evidenceIds: ['rhysarion-ebbing-fury-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'rhysarion-echoing-melody:rhysarion-echoing-melody-recovery',
      sourceAbilityId: 'rhysarion-echoing-melody',
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
        evidenceIds: ['rhysarion-echoing-melody-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'rhysarion-inspiring-melody:shared-initiative-resistance',
      sourceAbilityId: 'rhysarion-inspiring-melody',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'rhysarion-inspiring-melody',
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
      durationRounds: 3,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['rhysarion-inspiring-melody-2026-06-26'],
        unresolvedQuestions: [
          'Initiative and Resistance share one activation and must not be double-discounted.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'rhysarion-champions-vigor-right-damage',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-champions-vigor:rhysarion-champions-vigor-right-damage',
              componentReferences: [
                {
                  componentId: 'rhysarion-champions-vigor:rhysarion-champions-vigor-right-damage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-dawnsong-control-payoff',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-dawnsong:rhysarion-dawnsong-control-payoff',
              componentReferences: [
                {
                  componentId: 'rhysarion-dawnsong:rhysarion-dawnsong-control-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-dawnsong-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-dawnsong:rhysarion-dawnsong-fire',
              componentReferences: [
                {
                  componentId: 'rhysarion-dawnsong:rhysarion-dawnsong-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-dawnsong-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-dawnsong:rhysarion-dawnsong-physical',
              componentReferences: [
                {
                  componentId: 'rhysarion-dawnsong:rhysarion-dawnsong-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-ebbing-fury-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-ebbing-fury:rhysarion-ebbing-fury-recovery',
              componentReferences: [
                {
                  componentId: 'rhysarion-ebbing-fury:rhysarion-ebbing-fury-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-echoing-melody-recovery',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-echoing-melody:rhysarion-echoing-melody-recovery',
              componentReferences: [
                {
                  componentId: 'rhysarion-echoing-melody:rhysarion-echoing-melody-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-inspiring-melody-initiative',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-inspiring-melody:shared-initiative-resistance',
              componentReferences: [
                {
                  componentId: 'rhysarion-inspiring-melody:shared-initiative-resistance',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'rhysarion-inspiring-melody-resistance',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'rhysarion-inspiring-melody:shared-initiative-resistance',
              componentReferences: [
                {
                  componentId: 'rhysarion-inspiring-melody:shared-initiative-resistance',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
