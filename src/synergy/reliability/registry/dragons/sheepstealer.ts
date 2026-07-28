import { defineDragonReliabilityRegistry } from '../registryTypes';

export const sheepstealerReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'sheepstealer',
  components: [
    {
      id: 'sheepstealer-hunters-cunning:sheepstealer-hunters-cunning-recovery-payoff',
      sourceAbilityId: 'sheepstealer-hunters-cunning',
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
        evidenceIds: ['sheepstealer-hunters-cunning-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'sheepstealer-hunters-cunning:sheepstealer-hunters-cunning-right-physical',
      sourceAbilityId: 'sheepstealer-hunters-cunning',
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
        evidenceIds: ['sheepstealer-hunters-cunning-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'sheepstealer-savage-claim:sheepstealer-savage-claim-recovery',
      sourceAbilityId: 'sheepstealer-savage-claim',
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
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['sheepstealer-savage-claim-2026-06-23'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'sheepstealer-wild-hunt:sheepstealer-wild-hunt-fire',
      sourceAbilityId: 'sheepstealer-wild-hunt',
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
          'sheepstealer-wild-hunt-glossary-2026-06-23',
          'sheepstealer-wild-hunt-recovery-priority-combat-log-2026-06-24',
          'sheepstealer-wild-hunt-summary-2026-06-23',
        ],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'sheepstealer-hunters-cunning-recovery-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sheepstealer-hunters-cunning:sheepstealer-hunters-cunning-recovery-payoff',
              componentReferences: [
                {
                  componentId:
                    'sheepstealer-hunters-cunning:sheepstealer-hunters-cunning-recovery-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sheepstealer-hunters-cunning-right-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sheepstealer-hunters-cunning:sheepstealer-hunters-cunning-right-physical',
              componentReferences: [
                {
                  componentId:
                    'sheepstealer-hunters-cunning:sheepstealer-hunters-cunning-right-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sheepstealer-savage-claim-recovery',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sheepstealer-savage-claim:sheepstealer-savage-claim-recovery',
              componentReferences: [
                {
                  componentId: 'sheepstealer-savage-claim:sheepstealer-savage-claim-recovery',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sheepstealer-wild-hunt-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sheepstealer-wild-hunt:sheepstealer-wild-hunt-fire',
              componentReferences: [
                {
                  componentId: 'sheepstealer-wild-hunt:sheepstealer-wild-hunt-fire',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
