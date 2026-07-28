import { defineDragonReliabilityRegistry } from '../registryTypes';

export const tashixReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'tashix',
  components: [
    {
      id: 'tashix-battle-guile:tashix-battle-guile-fire',
      sourceAbilityId: 'tashix-battle-guile',
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
        evidenceIds: ['tashix-battle-guile-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tashix-dragons-cunning:tashix-dragons-cunning-initiative-payoff',
      sourceAbilityId: 'tashix-dragons-cunning',
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
        evidenceIds: ['tashix-dragons-cunning-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tashix-dragons-cunning:tashix-dragons-cunning-physical',
      sourceAbilityId: 'tashix-dragons-cunning',
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
        evidenceIds: ['tashix-dragons-cunning-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tashix-hunters-cunning:tashix-hunters-cunning-recovery-payoff',
      sourceAbilityId: 'tashix-hunters-cunning',
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
        evidenceIds: ['tashix-hunters-cunning-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tashix-hunters-cunning:tashix-hunters-cunning-right-physical',
      sourceAbilityId: 'tashix-hunters-cunning',
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
        evidenceIds: ['tashix-hunters-cunning-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tashix-shimmering-mirage:tashix-shimmering-mirage-fire',
      sourceAbilityId: 'tashix-shimmering-mirage',
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
        evidenceIds: ['tashix-shimmering-mirage-summary-2026-07-03'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'tashix-battle-guile-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tashix-battle-guile:tashix-battle-guile-fire',
              componentReferences: [
                {
                  componentId: 'tashix-battle-guile:tashix-battle-guile-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tashix-dragons-cunning-initiative-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tashix-dragons-cunning:tashix-dragons-cunning-initiative-payoff',
              componentReferences: [
                {
                  componentId: 'tashix-dragons-cunning:tashix-dragons-cunning-initiative-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tashix-dragons-cunning-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tashix-dragons-cunning:tashix-dragons-cunning-physical',
              componentReferences: [
                {
                  componentId: 'tashix-dragons-cunning:tashix-dragons-cunning-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tashix-hunters-cunning-recovery-payoff',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tashix-hunters-cunning:tashix-hunters-cunning-recovery-payoff',
              componentReferences: [
                {
                  componentId: 'tashix-hunters-cunning:tashix-hunters-cunning-recovery-payoff',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tashix-hunters-cunning-right-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tashix-hunters-cunning:tashix-hunters-cunning-right-physical',
              componentReferences: [
                {
                  componentId: 'tashix-hunters-cunning:tashix-hunters-cunning-right-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tashix-shimmering-mirage-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tashix-shimmering-mirage:tashix-shimmering-mirage-fire',
              componentReferences: [
                {
                  componentId: 'tashix-shimmering-mirage:tashix-shimmering-mirage-fire',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
