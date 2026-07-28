import { defineDragonReliabilityRegistry } from '../registryTypes';

export const tessarionReliabilityRegistry = defineDragonReliabilityRegistry({
  dragonId: 'tessarion',
  components: [
    {
      id: 'tessarion-blazing-leader:tessarion-blazing-leader-fire',
      sourceAbilityId: 'tessarion-blazing-leader',
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
        evidenceIds: ['tessarion-blazing-leader-2026-07-10'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tessarion-clever-maneuver:tessarion-clever-maneuver-stats',
      sourceAbilityId: 'tessarion-clever-maneuver',
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
        evidenceIds: ['tessarion-clever-maneuver-2026-07-10'],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tessarion-cobalt-flame:tessarion-cobalt-flame-fire',
      sourceAbilityId: 'tessarion-cobalt-flame',
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
          'tessarion-cobalt-flame-fire-details-2026-07-10',
          'tessarion-cobalt-flame-page-1-2026-07-10',
          'tessarion-cobalt-flame-physical-details-2026-07-10',
        ],
        unresolvedQuestions: [],
      },
    },
    {
      id: 'tessarion-cobalt-flame:tessarion-cobalt-flame-physical',
      sourceAbilityId: 'tessarion-cobalt-flame',
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
          'tessarion-cobalt-flame-fire-details-2026-07-10',
          'tessarion-cobalt-flame-page-1-2026-07-10',
          'tessarion-cobalt-flame-physical-details-2026-07-10',
        ],
        unresolvedQuestions: [],
      },
    },
  ],
  bindings: [
    {
      status: 'resolved',
      signalId: 'tessarion-blazing-leader-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tessarion-blazing-leader:tessarion-blazing-leader-fire',
              componentReferences: [
                {
                  componentId: 'tessarion-blazing-leader:tessarion-blazing-leader-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tessarion-clever-maneuver-stats',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tessarion-clever-maneuver:tessarion-clever-maneuver-stats',
              componentReferences: [
                {
                  componentId: 'tessarion-clever-maneuver:tessarion-clever-maneuver-stats',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tessarion-cobalt-flame-fire',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tessarion-cobalt-flame:tessarion-cobalt-flame-fire',
              componentReferences: [
                {
                  componentId: 'tessarion-cobalt-flame:tessarion-cobalt-flame-fire',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      status: 'resolved',
      signalId: 'tessarion-cobalt-flame-physical',
      bindingClass: 'guaranteed',
      paths: [
        {
          pathId: 'activation',
          events: [
            {
              eventId: 'tessarion-cobalt-flame:tessarion-cobalt-flame-physical',
              componentReferences: [
                {
                  componentId: 'tessarion-cobalt-flame:tessarion-cobalt-flame-physical',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
