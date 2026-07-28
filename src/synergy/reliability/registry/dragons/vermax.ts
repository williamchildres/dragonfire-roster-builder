import { defineDragonReliabilityRegistry } from '../registryTypes';

export const vermaxReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'vermax',
  components: [
    {
      id: 'vermax-rallying-flame:allied-spreading-blaze',
      sourceAbilityId: 'vermax-rallying-flame',
      sourceAbilityKind: 'habit',
      reliabilityClass: 'chance',
      probability: {
        kind: 'habit-level',
        habitAbilityId: 'vermax-rallying-flame',
        byLevel: {
          '1': 0.5,
          '2': 0.6,
          '3': 0.7,
          '4': 0.85,
          '5': 1,
        },
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'conditional-event',
        condition: 'Start of combat, repeated for each Enemy that deals Fire Damage.',
      },
      opportunityCount: {
        kind: 'condition-count-dependent',
        condition:
          'One base opportunity plus one for each qualifying Enemy; qualifying count is formation-dependent.',
      },
      rollScope: 'shared',
      targetFacts: {
        count: 1,
        separatePerTarget: false,
        separatePerEffect: true,
      },
      independence: 'unknown',
      unlock: {
        minimumStarRank: 6,
      },
      evidence: {
        verificationStatus: 'verified',
        evidenceIds: ['vermax-rallying-flame-2026-06-23'],
        unresolvedQuestions: [
          'Number of qualifying Enemies and independence among repeated checks are unresolved.',
          'The allied Spreading Blaze sequence is separate from Vermax’s self Rallying Flame sequence.',
        ],
        reviewNote:
          'One base opportunity plus one for each qualifying Enemy; qualifying count is formation-dependent.',
      },
    },
    {
      id: 'vermax-reactive-instincts:vermax-reactive-instincts-stats',
      sourceAbilityId: 'vermax-reactive-instincts',
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
        evidenceIds: ['vermax-reactive-instincts-2026-06-23'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vermax-spreading-blaze:spreading-blaze-stack',
      sourceAbilityId: 'vermax-spreading-blaze',
      sourceAbilityKind: 'command',
      reliabilityClass: 'chance',
      probability: {
        kind: 'fixed',
        value: 0.2,
      },
      opportunityPresence: 'conditional',
      timing: {
        kind: 'after-event',
        sourceEvent:
          'Opportunities depend on Basic Attacks plus a conditional repeat triggered by any Enemy Fire Damage.',
      },
      opportunityCount: {
        kind: 'ability-activation-dependent',
        sourceEvent:
          'Opportunities depend on Basic Attacks plus a conditional repeat triggered by any Enemy Fire Damage.',
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
        evidenceIds: [
          'vermax-spreading-blaze-glossary-2026-06-23',
          'vermax-spreading-blaze-summary-2026-06-23',
        ],
        unresolvedQuestions: [
          'Basic Attack count, Fire-trigger count, and temporal independence are unresolved.',
        ],
        reviewNote:
          'Opportunities depend on Basic Attacks plus a conditional repeat triggered by any Enemy Fire Damage.',
      },
    },
    {
      id: 'vermax-spreading-blaze:vermax-spreading-blaze-physical',
      sourceAbilityId: 'vermax-spreading-blaze',
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
          'vermax-spreading-blaze-glossary-2026-06-23',
          'vermax-spreading-blaze-summary-2026-06-23',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'vermax-warriors-zeal:vermax-warriors-zeal-left-stats',
      sourceAbilityId: 'vermax-warriors-zeal',
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
        evidenceIds: [
          'vermax-warriors-zeal-2026-06-23',
          'vermax-warriors-zeal-basic-attack-combat-log-2026-06-24',
        ],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'vermax-rallying-flame-tactical',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vermax-rallying-flame:allied-spreading-blaze',
              componentReferences: [
                {
                  componentId: 'vermax-rallying-flame:allied-spreading-blaze',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vermax-reactive-instincts-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vermax-reactive-instincts:vermax-reactive-instincts-stats',
              componentReferences: [
                {
                  componentId: 'vermax-reactive-instincts:vermax-reactive-instincts-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vermax-spreading-blaze-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vermax-spreading-blaze:vermax-spreading-blaze-physical',
              componentReferences: [
                {
                  componentId: 'vermax-spreading-blaze:vermax-spreading-blaze-physical',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vermax-spreading-blaze-tactical',
      bindingClass: 'chance',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vermax-spreading-blaze:spreading-blaze-stack',
              componentReferences: [
                {
                  componentId: 'vermax-spreading-blaze:spreading-blaze-stack',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'vermax-warriors-zeal-left-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'vermax-warriors-zeal:vermax-warriors-zeal-left-stats',
              componentReferences: [
                {
                  componentId: 'vermax-warriors-zeal:vermax-warriors-zeal-left-stats',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
