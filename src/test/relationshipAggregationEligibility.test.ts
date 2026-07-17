import { describe, expect, it } from 'vitest';
import { evaluateFormation } from '../synergy/evaluateFormation';
import type {
  DragonSynergyProfile,
  ProgressionRequirement,
  SimpleFormation,
  SynergySignal,
} from '../synergy/types';

const formation: SimpleFormation = {
  'left-flank': 'supporter',
  vanguard: 'producer',
  'right-flank': null,
};

describe('eligible relationship evidence aggregation', () => {
  it.each([
    [
      'below-Star alternative',
      { unlock: { minimumStarRank: 10 } },
      { supporter: { starRank: 9, dragonLevel: 16 }, producer: { starRank: 10, dragonLevel: 16 } },
    ],
    [
      'below-Level Trait alternative',
      { unlock: { minimumDragonLevel: 16 } },
      { supporter: { starRank: 10, dragonLevel: 15 }, producer: { starRank: 10, dragonLevel: 16 } },
    ],
    [
      'wrong-source-position alternative',
      { requiredSelfPosition: 'vanguard' },
      { supporter: { starRank: 10, dragonLevel: 16 }, producer: { starRank: 10, dragonLevel: 16 } },
    ],
    [
      'wrong-recipient-position alternative',
      { requiredRecipientPosition: 'right-flank' },
      { supporter: { starRank: 10, dragonLevel: 16 }, producer: { starRank: 10, dragonLevel: 16 } },
    ],
  ] as const)('excludes a %s that is encountered before the active path', (_name, inactive, progression) => {
    const result = activeRelationship(profilesWithAlternatives([inactive, {}]), progression);

    expect(result.abilityIds).toEqual(['producer-fire', 'supporter-path-2']);
    expect(result.explanation).toBe(
      'Supporter improves allied Fire Damage, and Producer deals Fire Damage.',
    );
  });

  it('merges two genuinely active equivalent paths into one relationship', () => {
    const results = activeRelationships(profilesWithAlternatives([{}, {}]), {
      supporter: { starRank: 10, dragonLevel: 16 },
      producer: { starRank: 10, dragonLevel: 16 },
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.abilityIds).toEqual([
      'producer-fire',
      'supporter-path-1',
      'supporter-path-2',
    ]);
  });

  it('keeps one semantic relationship for an active path plus inactive equivalents', () => {
    const results = activeRelationships(
      profilesWithAlternatives([
        { unlock: { minimumStarRank: 10 } },
        { requiredSelfPosition: 'vanguard' },
        {},
      ]),
      {
        supporter: { starRank: 9, dragonLevel: 15 },
        producer: { starRank: 10, dragonLevel: 16 },
      },
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.abilityIds).toEqual(['producer-fire', 'supporter-path-3']);
  });
});

function activeRelationship(
  profiles: DragonSynergyProfile[],
  progression: Parameters<typeof activeRelationships>[1],
) {
  const [result] = activeRelationships(profiles, progression);
  expect(result).toBeDefined();
  return result!;
}

function activeRelationships(
  profiles: DragonSynergyProfile[],
  progression: Record<string, { starRank: number; dragonLevel: number }>,
) {
  return evaluateFormation({ formation, progression, profiles }).results.filter(
    (result) => result.kind === 'amplifier-output',
  );
}

function profilesWithAlternatives(
  alternatives: Array<
    Partial<
      Pick<
        SynergySignal,
        'requiredSelfPosition' | 'requiredRecipientPosition'
      > & { unlock: ProgressionRequirement }
    >
  >,
): DragonSynergyProfile[] {
  return [
    {
      dragonId: 'supporter',
      dragonName: 'Supporter',
      outputs: [],
      supports: alternatives.map((alternative, index) => ({
        id: `supporter-path-${index + 1}`,
        tag: 'damage:fire',
        abilityId: `supporter-path-${index + 1}`,
        abilityName: alternative.unlock || alternative.requiredSelfPosition || alternative.requiredRecipientPosition
          ? `Inactive Path ${index + 1}`
          : `Active Path ${index + 1}`,
        description: alternative.unlock || alternative.requiredSelfPosition || alternative.requiredRecipientPosition
          ? `improves allied Fire Damage through inactive path ${index + 1}`
          : `improves allied Fire Damage through active path ${index + 1}`,
        confidence: 'verified',
        ...alternative,
      })),
      benefitsFrom: [],
      positionClaims: [],
    },
    {
      dragonId: 'producer',
      dragonName: 'Producer',
      outputs: [
        {
          id: 'producer-fire',
          tag: 'damage:fire',
          abilityId: 'producer-fire',
          abilityName: 'Producer Fire',
          description: 'deals Fire Damage',
          confidence: 'verified',
        },
      ],
      supports: [],
      benefitsFrom: [],
      positionClaims: [],
    },
  ];
}
