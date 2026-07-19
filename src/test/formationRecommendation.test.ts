import { describe, expect, it } from 'vitest';
import { buildFormationFindings } from '../services/formationFindings';
import {
  allFormationPermutations,
  buildPlacementComparison,
  compareFormationPlacements,
  type FormationArrangement,
  type FormationPlacementComparison,
  type PlacementCandidate,
} from '../services/formationPlacementComparison';
import type { FormationRatingResult } from '../services/formationRating';
import {
  buildFormationRecommendation,
  type RecommendationSuppressionReason,
} from '../services/formationRecommendation';
import { evaluateFormation } from '../synergy/evaluateFormation';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
  SynergySignal,
} from '../synergy/types';

const current: FormationArrangement = {
  'left-flank': 'a',
  vanguard: 'b',
  'right-flank': 'c',
};

describe('formation recommendation suppression contract', () => {
  it('excludes a progression-locked-only alternative from every placement value and score loss', () => {
    const formation: SimpleFormation = {
      'left-flank': 'neutral',
      vanguard: 'supporter',
      'right-flank': 'producer',
    };
    const progression = {
      neutral: { starRank: 10, dragonLevel: 1 },
      supporter: { starRank: 10, dragonLevel: 1 },
      producer: { starRank: 10, dragonLevel: 1 },
    };
    const profiles = lockedOnlyProfiles();
    const currentResults = evaluateFormation({ formation, progression, profiles }).results;
    const comparison = compareFormationPlacements({ formation, progression, profiles })!;
    const recommendation = recommend(comparison, progression);

    expect(currentResults.some((result) => result.kind === 'progression-locked')).toBe(true);
    expect(comparison.current.activeRelationshipValue).toBe(0);
    expect(comparison.best.activeRelationshipValue).toBe(0);
    expect(comparison.candidates.every((candidate) => candidate.activeRelationshipValue === 0)).toBe(true);
    expect(comparison.candidates.every((candidate) => candidate.placementScore === 20)).toBe(true);
    expect(comparison.placementScore).toBe(20);
    expect(recommendation).toMatchObject({
      action: null,
      suppressionReason: 'tied-best',
      valueDelta: 0,
    });
  });

  it('treats equivalent Vanguard-only exchanges as neutral tied alternatives', () => {
    const formation: SimpleFormation = current;
    const progression = {
      a: { starRank: 10, dragonLevel: 16 },
      b: { starRank: 10, dragonLevel: 16 },
      c: { starRank: 10, dragonLevel: 16 },
    };
    const profiles = ['a', 'b', 'c'].map(vanguardOnlyProfile);
    const results = evaluateFormation({ formation, progression, profiles }).results;
    const comparison = compareFormationPlacements({ formation, progression, profiles })!;
    const recommendation = recommend(comparison, progression);
    const findings = buildFormationFindings({
      formation,
      progression,
      profiles,
      results,
      relationships: [],
      signalChipsByDragonId: {},
      recommendation,
      rating: completeZeroRelationshipRating,
    });

    expect(recommendation).toMatchObject({ action: null, suppressionReason: 'tied-best' });
    expect(findings.findings).toContainEqual(expect.objectContaining({
      type: 'alternative-vanguard',
      tone: 'neutral',
    }));
    expect(findings.findings.some((finding) => finding.type === 'better-placement')).toBe(false);
    expect(findings.findings.some((finding) => finding.tone === 'negative')).toBe(false);
  });

  it('keeps every public suppression reason reachable through a focused scenario', () => {
    const cases: Record<RecommendationSuppressionReason, () => ReturnType<typeof buildFormationRecommendation>> = {
      'current-best': () => recommend(comparison([50, 40, 30, 20, 10, 0])),
      'tied-best': () => recommend(comparison([50, 50, 30, 20, 10, 0])),
      'below-meaningful-threshold': () => recommend(comparison([46, 50, 30, 20, 10, 0])),
      'incomplete-formation': () => recommend(null),
      'insufficient-confidence': () => recommend(null, {}, 'limited'),
    };

    for (const [reason, build] of Object.entries(cases)) {
      expect(build()).toMatchObject({ action: null, suppressionReason: reason });
    }
  });
});

const completeZeroRelationshipRating: FormationRatingResult = {
  score: 20,
  tier: 'Weak',
  summary: 'No active relationships.',
  breakdown: [],
  activeRelationshipCount: 0,
  participatingDragonCount: 0,
  confidence: { status: 'complete', issues: [] },
};

function recommend(
  comparison: FormationPlacementComparison | null,
  progression: SimpleProgressionByDragonId = {},
  confidence: 'complete' | 'limited' = 'complete',
) {
  return buildFormationRecommendation({
    comparison,
    progression,
    dragonNamesById: new Map(),
    confidence,
  });
}

function comparison(values: number[]): FormationPlacementComparison {
  const candidates = allFormationPermutations(['a', 'b', 'c']).map(
    (arrangement, index): PlacementCandidate => ({
      arrangement,
      activeRelationshipValue: values[index]!,
      placementScore: 0,
      relationships: [],
    }),
  );
  return buildPlacementComparison(current, candidates)!;
}

function lockedOnlyProfiles(): DragonSynergyProfile[] {
  return [
    emptyProfile('neutral'),
    {
      ...emptyProfile('supporter'),
      supports: [signal('locked-fire-support', 'supporter-ability', {
        unlock: { minimumDragonLevel: 16 },
        requiredSelfPosition: 'vanguard',
        requiredRecipientPosition: 'right-flank',
      })],
    },
    {
      ...emptyProfile('producer'),
      outputs: [signal('producer-fire-output', 'producer-ability')],
    },
  ];
}

function vanguardOnlyProfile(dragonId: string): DragonSynergyProfile {
  return {
    ...emptyProfile(dragonId),
    positionClaims: [{
      id: `${dragonId}-vanguard-claim`,
      abilityId: `${dragonId}-trait`,
      abilityName: `${dragonId} Trait`,
      requiredPosition: 'vanguard',
      description: 'Requires Vanguard.',
      confidence: 'verified',
    }],
  };
}

function emptyProfile(dragonId: string): DragonSynergyProfile {
  return {
    dragonId,
    dragonName: dragonId.toUpperCase(),
    outputs: [],
    supports: [],
    benefitsFrom: [],
    positionClaims: [],
  };
}

function signal(
  id: string,
  abilityId: string,
  overrides: Partial<SynergySignal> = {},
): SynergySignal {
  return {
    id,
    tag: 'damage:fire',
    abilityId,
    abilityName: abilityId,
    description: 'Fire relationship.',
    confidence: 'verified',
    friendlyScope: 'formation',
    ...overrides,
  };
}
