import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { dragons } from '../data/dragons';
import { buildFormationFindings } from '../services/formationFindings';
import { compareFormationPlacements } from '../services/formationPlacementComparison';
import { rateFormation } from '../services/formationRating';
import { buildFormationRecommendation } from '../services/formationRecommendation';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { buildSemanticRelationships } from '../synergy/semanticRelationships';
import type { SimpleFormation } from '../synergy/types';

describe('typed Formation Analysis findings', () => {
  it('prioritizes the Antares and Feskar missing enablers and keeps Vanguard alternatives neutral', () => {
    const formation: SimpleFormation = {
      'left-flank': 'antares',
      vanguard: 'rhysarion',
      'right-flank': 'feskar',
    };
    const progression = {
      antares: { starRank: 10, dragonLevel: 16 },
      rhysarion: { starRank: 10, dragonLevel: 16 },
      feskar: { starRank: 10, dragonLevel: 16 },
    };
    const results = evaluateFormation({ formation, progression, profiles: simpleSynergyProfiles }).results;
    const relationships = buildSemanticRelationships(results, simpleSynergyProfiles);
    const comparison = compareFormationPlacements({ formation, progression, profiles: simpleSynergyProfiles });
    const rating = rateFormation({
      formation,
      dragons,
      profiles: simpleSynergyProfiles,
      relationships,
      placementComparison: comparison,
    });
    const recommendation = buildFormationRecommendation({
      comparison,
      progression,
      dragonNamesById: new Map(dragons.map((dragon) => [dragon.id, dragon.name])),
    });
    const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));
    const signalChipsByDragonId = Object.fromEntries(
      Object.entries(formation).map(([position, dragonId]) => [
        dragonId!,
        buildFormationSignalChips({
          profile: profilesById.get(dragonId!),
          position: position as keyof SimpleFormation,
          formation,
          profiles: simpleSynergyProfiles,
          progression,
        }),
      ]),
    );
    const findings = buildFormationFindings({
      formation,
      progression,
      profiles: simpleSynergyProfiles,
      results,
      relationships,
      signalChipsByDragonId,
      recommendation,
      rating,
    });

    expect(rating).toMatchObject({ score: 56, tier: 'Solid' });
    expect(findings.keyStrengths).toHaveLength(3);
    expect(findings.keyGaps.map((finding) => finding.summary)).toEqual([
      'Antares benefits from Slow, but this formation has no Slow provider.',
      'Feskar benefits from Burn, but this formation has no Burn provider.',
    ]);
    expect(findings.findings.filter((finding) => finding.type === 'alternative-vanguard')).toEqual([
      expect.objectContaining({
        tone: 'neutral',
        visibility: 'secondary',
        summary: "Rhysarion's Vanguard Trait is active. Antares and Feskar have alternative Vanguard-only benefits.",
      }),
    ]);
    expect(findings.findings.some((finding) => finding.type === 'better-placement')).toBe(false);
    expect(results.some((result) => result.kind === 'position-conflict')).toBe(false);
    expect(recommendation).toMatchObject({ action: null, suppressionReason: 'current-best' });
    expect(recommendation.netSummary).toBe(
      'Keep Rhysarion in Vanguard and Feskar on Right Flank. This is the best of all six arrangements for these dragons at current progression; no swap produces a net gain.',
    );
  });

  it('limits primary strengths to three and primary gaps to two', () => {
    const formation: SimpleFormation = {
      'left-flank': 'syrax',
      vanguard: 'caraxes',
      'right-flank': 'velar',
    };
    const progression = Object.fromEntries(
      simpleSynergyProfiles.map((profile) => [profile.dragonId, { starRank: 10, dragonLevel: 16 }]),
    );
    const results = evaluateFormation({ formation, progression, profiles: simpleSynergyProfiles }).results;
    const relationships = buildSemanticRelationships(results, simpleSynergyProfiles);
    const comparison = compareFormationPlacements({ formation, progression, profiles: simpleSynergyProfiles });
    const rating = rateFormation({ formation, dragons, profiles: simpleSynergyProfiles, relationships, placementComparison: comparison });
    const recommendation = buildFormationRecommendation({ comparison, progression, dragonNamesById: new Map() });
    const findings = buildFormationFindings({
      formation,
      progression,
      profiles: simpleSynergyProfiles,
      results,
      relationships,
      signalChipsByDragonId: {},
      recommendation,
      rating,
    });

    expect(findings.keyStrengths.length).toBeLessThanOrEqual(3);
    expect(findings.keyGaps.length).toBeLessThanOrEqual(2);
  });
});
