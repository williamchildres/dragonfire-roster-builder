import { defineDragonReliabilityRegistry } from '../registryTypes';

export const sunfyreReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'sunfyre',
  components: [
    {
      id: 'sunfyre-adaptive-glory:sunfyre-adaptive-glory-damage',
      sourceAbilityId: 'sunfyre-adaptive-glory',
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
        evidenceIds: ['sunfyre-adaptive-glory-2026-07-22'],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'sunfyre-golden-wrath:burn',
      sourceAbilityId: 'sunfyre-golden-wrath',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.5,
      },
      opportunityPresence: 'conditional',
      opportunityCondition: 'Sunfyre being below 50% Troop Capacity.',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 4, 7, 10],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 4,
      },
      rollScope: 'per-target',
      targetFacts: {
        count: 2,
        separatePerTarget: true,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: [
          'sunfyre-golden-wrath-1-2026-07-22',
          'sunfyre-golden-wrath-2-2026-07-22',
          'sunfyre-golden-wrath-3-2026-07-22',
        ],
        unresolvedQuestions: [
          'Whether checks for different targets or different scheduled rounds are statistically independent.',
          'Whether the second target is valid on every below-50% activation.',
        ],
        reviewNote:
          'Burn is available only below 50% Troop Capacity. The schedule is explicit, but later opportunities also depend on battle length.',
      },
    },
    {
      id: 'sunfyre-golden-wrath:sunfyre-golden-wrath-fire',
      sourceAbilityId: 'sunfyre-golden-wrath',
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
        evidenceIds: [
          'sunfyre-golden-wrath-1-2026-07-22',
          'sunfyre-golden-wrath-2-2026-07-22',
          'sunfyre-golden-wrath-3-2026-07-22',
        ],
        unresolvedQuestions: [
          'Activation is deterministic once the documented battle-state or action condition is satisfied.',
          'The first reliability layer should preserve the condition explicitly rather than fabricate a probability.',
        ],
      },
    },
    {
      id: 'sunfyre-golden-wrath:sunfyre-golden-wrath-tactical',
      sourceAbilityId: 'sunfyre-golden-wrath',
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
          'sunfyre-golden-wrath-1-2026-07-22',
          'sunfyre-golden-wrath-2-2026-07-22',
          'sunfyre-golden-wrath-3-2026-07-22',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'sunfyre-radiant-majesty:sunfyre-radiant-majesty-damage',
      sourceAbilityId: 'sunfyre-radiant-majesty',
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
        evidenceIds: ['sunfyre-radiant-majesty-2026-07-22'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'sunfyre-sentinels-wit:sunfyre-sentinels-wit-left-stats',
      sourceAbilityId: 'sunfyre-sentinels-wit',
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
        evidenceIds: ['sunfyre-sentinels-wit-2026-07-22'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'sunfyre-adaptive-glory-damage',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sunfyre-adaptive-glory:sunfyre-adaptive-glory-damage',
              componentReferences: [
                {
                  componentId: 'sunfyre-adaptive-glory:sunfyre-adaptive-glory-damage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sunfyre-golden-wrath-burn',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sunfyre-golden-wrath:burn',
              componentReferences: [
                {
                  componentId: 'sunfyre-golden-wrath:burn',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sunfyre-golden-wrath-fire',
      bindingClass: 'conditional-deterministic',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sunfyre-golden-wrath:sunfyre-golden-wrath-fire',
              componentReferences: [
                {
                  componentId: 'sunfyre-golden-wrath:sunfyre-golden-wrath-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sunfyre-golden-wrath-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sunfyre-golden-wrath:sunfyre-golden-wrath-tactical',
              componentReferences: [
                {
                  componentId: 'sunfyre-golden-wrath:sunfyre-golden-wrath-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sunfyre-radiant-majesty-damage',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sunfyre-radiant-majesty:sunfyre-radiant-majesty-damage',
              componentReferences: [
                {
                  componentId: 'sunfyre-radiant-majesty:sunfyre-radiant-majesty-damage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'sunfyre-sentinels-wit-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'sunfyre-sentinels-wit:sunfyre-sentinels-wit-left-stats',
              componentReferences: [
                {
                  componentId: 'sunfyre-sentinels-wit:sunfyre-sentinels-wit-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
