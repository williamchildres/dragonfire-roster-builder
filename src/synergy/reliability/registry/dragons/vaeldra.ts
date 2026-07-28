import { defineDragonReliabilityRegistry } from '../registryTypes';

export const vaeldraReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'vaeldra',
  components: [
    {
      id: 'vaeldra-infernal-force:vaeldra-infernal-force-damage',
      sourceAbilityId: 'vaeldra-infernal-force',
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
        evidenceIds: ['vaeldra-infernal-force-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vaeldra-lure:taunt',
      sourceAbilityId: 'vaeldra-lure',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.25,
      },
      opportunityPresence: 'guaranteed-at-least-one',
      timing: {
        kind: 'each-round',
      },
      opportunityCount: {
        kind: 'battle-length-dependent',
      },
      rollScope: 'unresolved',
      targetFacts: {
        count: 3,
        separatePerEffect: false,
      },
      independence: 'unknown',
      durationRounds: 2,
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vaeldra-lure-2026-06-26'],
        unresolvedQuestions: [
          'Whether Taunt uses one group roll or separate target rolls.',
          'Battle length and temporal independence are unresolved.',
        ],
        reviewNote: 'One check is described each round; actual battle length is unresolved.',
      },
    },
    {
      id: 'vaeldra-lure:vaeldra-lure-physical',
      sourceAbilityId: 'vaeldra-lure',
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
        evidenceIds: ['vaeldra-lure-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vaeldra-sirens-call:taunt-to-stagger',
      sourceAbilityId: 'vaeldra-sirens-call',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'vaeldra-sirens-call',
        byLevel: {
          '1': 0.4,
          '2': 0.52,
          '3': 0.64,
          '4': 0.8,
          '5': 1,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'scheduled-rounds',
        rounds: [1, 2, 3],
      },
      opportunityCount: {
        kind: 'scheduled-maximum',
        maximum: 3,
      },
      rollScope: 'unresolved',
      targetFacts: {
        count: 3,
        separatePerEffect: true,
      },
      independence: 'unknown',
      durationRounds: 1,
      unlock: {
        minimumStarRank: 10,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vaeldra-sirens-call-2026-06-26'],
        unresolvedQuestions: [
          'Activation-roll scope across targets is unresolved.',
          'Whether checks on separate rounds are independent.',
        ],
        reviewNote:
          'The schedule is explicit, but actual opportunities depend on the battle reaching every listed round.',
      },
    },
    {
      id: 'vaeldra-tempting-distraction:successful-taunt-follow-on',
      sourceAbilityId: 'vaeldra-tempting-distraction',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'conditional-deterministic',
      opportunityPresence: 'not-applicable',
      timing: {
        kind: 'conditional-event',
        condition: 'Vaeldra successfully afflicts an Enemy with Taunt.',
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
        evidenceIds: ['vaeldra-tempting-distraction-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vaeldra-warriors-resilience:vaeldra-warriors-resilience-left-tactical',
      sourceAbilityId: 'vaeldra-warriors-resilience',
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
        evidenceIds: ['vaeldra-warriors-resilience-2026-06-26'],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'vaeldra-infernal-force-damage',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vaeldra-infernal-force:vaeldra-infernal-force-damage',
              componentReferences: [
                {
                  componentId: 'vaeldra-infernal-force:vaeldra-infernal-force-damage',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vaeldra-lure-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vaeldra-lure:vaeldra-lure-physical',
              componentReferences: [
                {
                  componentId: 'vaeldra-lure:vaeldra-lure-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vaeldra-lure-taunt',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vaeldra-lure:taunt',
              componentReferences: [
                {
                  componentId: 'vaeldra-lure:taunt',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vaeldra-sirens-call-stagger',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vaeldra-sirens-call:taunt-to-stagger',
              componentReferences: [
                {
                  componentId: 'vaeldra-sirens-call:taunt-to-stagger',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vaeldra-tempting-distraction-vulnerability',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'lure-taunt',
          appliesWhen: {
            kind: 'probability-context',
            id: 'lure-taunt',
          },
          events: [
            {
              eventId: 'vaeldra-lure:taunt',
              componentReferences: [
                {
                  componentId: 'vaeldra-lure:taunt',
                },
              ],
            },
            {
              eventId: 'vaeldra-tempting-distraction:successful-taunt-follow-on',
              componentReferences: [
                {
                  componentId: 'vaeldra-tempting-distraction:successful-taunt-follow-on',
                },
              ],
            },
          ],
        },
        {
          pathId: 'sirens-call-taunt',
          appliesWhen: {
            kind: 'probability-context',
            id: 'sirens-call-taunt',
          },
          events: [
            {
              eventId: 'vaeldra-sirens-call:taunt-to-stagger',
              componentReferences: [
                {
                  componentId: 'vaeldra-sirens-call:taunt-to-stagger',
                },
              ],
            },
            {
              eventId: 'vaeldra-tempting-distraction:successful-taunt-follow-on',
              componentReferences: [
                {
                  componentId: 'vaeldra-tempting-distraction:successful-taunt-follow-on',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vaeldra-warriors-resilience-left-tactical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vaeldra-warriors-resilience:vaeldra-warriors-resilience-left-tactical',
              componentReferences: [
                {
                  componentId:
                    'vaeldra-warriors-resilience:vaeldra-warriors-resilience-left-tactical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
