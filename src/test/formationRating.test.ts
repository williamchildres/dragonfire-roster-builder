import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { dragons } from '../data/dragons';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { buildSimpleFormationPresentation } from '../synergy/formationPresentation';
import type { SimpleFormationPresentation } from '../synergy/formationPresentation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { rateFormation, type FormationRatingResult } from '../services/formationRating';
import type { Formation } from '../services/teamShare';
import type { SimpleProgressionByDragonId, SimpleSynergyResult } from '../synergy/types';

const profilesById = new Map(simpleSynergyProfiles.map((profile) => [profile.dragonId, profile]));
const mappedProfileIds = new Set(simpleSynergyProfiles.map((profile) => profile.dragonId));
const unlockedProgression: SimpleProgressionByDragonId = Object.fromEntries(
  simpleSynergyProfiles.map((profile) => [profile.dragonId, { starRank: 10, dragonLevel: 26 }]),
);

function formation(left: string | null, vanguard: string | null, right: string | null): Formation {
  return {
    'left-flank': left,
    vanguard,
    'right-flank': right,
  };
}

function ratingFor(
  selectedFormation: Formation,
  progression: SimpleProgressionByDragonId = unlockedProgression,
): FormationRatingResult {
  const selectedCount = Object.values(selectedFormation).filter(Boolean).length;
  const results =
    selectedCount >= 2
      ? evaluateFormation({
          formation: selectedFormation,
          progression,
          profiles: simpleSynergyProfiles,
        }).results
      : [];
  const presentation = buildSimpleFormationPresentation({
    formation: selectedFormation,
    dragons,
    mappedProfileIds,
    results,
  });
  const signalChipsByDragonId = Object.fromEntries(
    (Object.entries(selectedFormation) as Array<[keyof Formation, string | null]>).flatMap(([position, dragonId]) => {
      if (!dragonId) {
        return [];
      }
      return [
        [
          dragonId,
          buildFormationSignalChips({
            profile: profilesById.get(dragonId),
            position,
            formation: selectedFormation,
            profiles: simpleSynergyProfiles,
            progression,
          }),
        ],
      ];
    }),
  );

  return rateFormation({
    formation: selectedFormation,
    dragons,
    profiles: simpleSynergyProfiles,
    presentation,
    signalChipsByDragonId,
  });
}

function breakdown(rating: FormationRatingResult, label: string) {
  const item = rating.breakdown.find((candidate) => candidate.label === label);
  expect(item, label).toBeDefined();
  return item!;
}

function manualRating({
  presentation,
  signalChipsByDragonId,
}: {
  presentation: Partial<SimpleFormationPresentation>;
  signalChipsByDragonId: Parameters<typeof rateFormation>[0]['signalChipsByDragonId'];
}): FormationRatingResult {
  return rateFormation({
    formation: formation('syrax', 'vhagar', 'caraxes'),
    dragons,
    profiles: simpleSynergyProfiles,
    presentation: {
      activeSynergies: [],
      missingEnablers: [],
      placementIssues: [],
      positionConflicts: [],
      futureUnlocks: [],
      mappedDragonIds: ['syrax', 'vhagar', 'caraxes'],
      unmappedDragonIds: [],
      selectedDragonIds: ['syrax', 'vhagar', 'caraxes'],
      hasCompleteProfileCoverage: true,
      ...presentation,
    },
    signalChipsByDragonId,
  });
}

function synergyResult(
  kind: SimpleSynergyResult['kind'],
  providerId: string,
  beneficiaryId: string,
  tag: SimpleSynergyResult['tag'],
  index: number,
): SimpleSynergyResult {
  return {
    id: `${kind}:${providerId}:${tag}:${beneficiaryId}:${index}`,
    kind,
    tag,
    dragonIds: [providerId, beneficiaryId],
    abilityIds: [`${providerId}-ability-${index}`, `${beneficiaryId}-ability-${index}`],
    explanation: `${providerId} ${tag} ${beneficiaryId}`,
  };
}

describe('formation rating helper', () => {
  it('returns a structured, bounded rating result', () => {
    const rating = ratingFor(formation('syrax', 'vhagar', 'caraxes'));

    expect(rating.score).toBeGreaterThanOrEqual(0);
    expect(rating.score).toBeLessThanOrEqual(100);
    expect(rating.tier).toBeTruthy();
    expect(rating.summary).toBeTruthy();
    expect(rating.breakdown.map((item) => item.label)).toEqual([
      'Readiness / profile confidence',
      'Realized synergy payoff',
      'Support usefulness',
      'Placement / conflict risk',
    ]);
    expect(rating.strengths.length).toBeGreaterThan(0);
    expect(rating.weaknesses.length).toBeGreaterThan(0);
    expect(rating.notes.join(' ')).toContain('not a combat simulation');
  });

  it('returns Incomplete guidance for partial formations', () => {
    const rating = ratingFor(formation('syrax', null, null));

    expect(rating.tier).toBe('Incomplete');
    expect(rating.summary).toContain('Assign all three positions');
    expect(rating.weaknesses.join(' ')).toContain('Assign all three positions');
  });

  it('scores three curated profiles higher than the same formation while incomplete', () => {
    const complete = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const incomplete = ratingFor(formation('syrax', 'vhagar', null));

    expect(complete.score).toBeGreaterThan(incomplete.score);
    expect(breakdown(complete, 'Readiness / profile confidence').score).toBeGreaterThan(
      breakdown(incomplete, 'Readiness / profile confidence').score,
    );
  });

  it('rewards satisfied Benefits from signals and represents missing Benefits from as opportunities', () => {
    const satisfied = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const missing = ratingFor(formation('syrax', 'vhagar', null));

    expect(breakdown(satisfied, 'Realized synergy payoff').score).toBeGreaterThan(
      breakdown(missing, 'Realized synergy payoff').score,
    );
    expect(missing.weaknesses.join(' ')).toContain('benefits from Burn');
  });

  it('rewards used Provides signals without counting available-but-unused support as used', () => {
    const rating = ratingFor(formation('malachite', 'sheepstealer', 'caraxes'));
    const support = breakdown(rating, 'Support usefulness');

    expect(support.score).toBeGreaterThan(0);
    expect(support.score).toBeLessThan(25);
    expect(support.explanation).toContain('2 Provides signals used');
    expect(rating.weaknesses.join(' ')).toContain("Malachite's Physical Damage support is available but not used");
    expect(rating.weaknesses.join(' ')).toContain("Malachite's Tactical Damage support is available but not used");
  });

  it('caps Support usefulness when realized payoff and satisfied Benefits are low', () => {
    const rating = manualRating({
      presentation: {},
      signalChipsByDragonId: {
        syrax: {
          damageProfile: [],
          provides: [
            { label: 'Fire Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Physical Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Tactical Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Strength support', state: 'used', reason: 'Used by Vhagar.' },
            { label: 'Instinct support', state: 'used', reason: 'Used by Vhagar.' },
            { label: 'Initiative support', state: 'used', reason: 'Used by Vhagar.' },
          ],
          benefitsFrom: [],
        },
      },
    });
    const support = breakdown(rating, 'Support usefulness');

    expect(breakdown(rating, 'Realized synergy payoff').score).toBe(0);
    expect(support.score).toBeLessThan(10);
    expect(support.explanation).toContain('Capped');
  });

  it('keeps raw direct damage labels out of used support scoring', () => {
    const rating = manualRating({
      presentation: {
        activeSynergies: [synergyResult('amplifier-output', 'syrax', 'caraxes', 'damage:fire', 1)],
      },
      signalChipsByDragonId: {
        syrax: {
          damageProfile: [],
          provides: [
            { label: 'Fire Damage', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Physical Damage', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Tactical Damage', state: 'used', reason: 'Used by Caraxes.' },
          ],
          benefitsFrom: [],
        },
      },
    });

    expect(breakdown(rating, 'Support usefulness').score).toBe(0);
  });

  it('allows explicit damage support labels to score when matched to an ally', () => {
    const rating = manualRating({
      presentation: {
        activeSynergies: [synergyResult('amplifier-output', 'syrax', 'caraxes', 'damage:fire', 1)],
      },
      signalChipsByDragonId: {
        syrax: {
          damageProfile: [],
          provides: [{ label: 'Fire Damage support', state: 'used', reason: 'Used by Caraxes.' }],
          benefitsFrom: [],
        },
        caraxes: {
          damageProfile: [{ label: 'Fire Damage', state: 'supported', reason: 'Supported by Syrax.' }],
          provides: [],
          benefitsFrom: [],
        },
      },
    });

    expect(breakdown(rating, 'Support usefulness').score).toBeGreaterThan(0);
  });

  it('scores used status support tied to a satisfied Benefits from signal', () => {
    const rating = manualRating({
      presentation: {
        activeSynergies: [synergyResult('setup-payoff', 'caraxes', 'vhagar', 'status:burn', 1)],
      },
      signalChipsByDragonId: {
        caraxes: {
          damageProfile: [],
          provides: [{ label: 'Burn', state: 'used', reason: 'Used by Vhagar.' }],
          benefitsFrom: [],
        },
        vhagar: {
          damageProfile: [],
          provides: [],
          benefitsFrom: [{ label: 'Burn', state: 'satisfied', reason: 'Satisfied by Caraxes.' }],
        },
      },
    });

    expect(breakdown(rating, 'Realized synergy payoff').score).toBeGreaterThan(0);
    expect(breakdown(rating, 'Support usefulness').score).toBeGreaterThan(0);
  });

  it('reduces placement and conflict score for placement issues and position conflicts', () => {
    const placementIssue = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const positionConflict = ratingFor(formation('daemoros', 'syrax', 'caraxes'));

    expect(breakdown(placementIssue, 'Placement / conflict risk').score).toBeLessThan(15);
    expect(placementIssue.weaknesses.join(' ')).toContain('must be deployed in Vanguard');
    expect(breakdown(positionConflict, 'Placement / conflict risk').score).toBeLessThan(15);
    expect(positionConflict.weaknesses.join(' ')).toContain('only one dragon can receive that positional benefit');
  });

  it('lowers readiness and confidence when a selected dragon is unmapped metadata-only', () => {
    const curated = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const unmapped = ratingFor(formation('syrax', 'vhagar', 'antares'));

    expect(breakdown(unmapped, 'Readiness / profile confidence').score).toBeLessThan(
      breakdown(curated, 'Readiness / profile confidence').score,
    );
    expect(unmapped.summary).toContain('limited profile coverage');
    expect(unmapped.weaknesses.join(' ')).toContain('Antares has limited mapped profile data');
  });

  it('explains Syrax, Vhagar, and Caraxes with Burn, First-Strike, and modeled placement limits', () => {
    const rating = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const strengths = rating.strengths.join(' ');
    const weaknesses = rating.weaknesses.join(' ');

    expect(strengths).toContain('Caraxes can apply Burn');
    expect(strengths).toContain('Vhagar');
    expect(strengths).toContain('Syrax can grant First-Strike');
    expect(strengths).toContain('Caraxes can apply Slow');
    expect(weaknesses).toContain("Caraxes's Hunter's Wrath");
  });

  it('scores Malachite, Sheepstealer, and Caraxes only where support is matched and recognizes Recovery', () => {
    const rating = ratingFor(formation('malachite', 'sheepstealer', 'caraxes'));
    const strengths = rating.strengths.join(' ');

    expect(strengths).toContain('Malachite provides Recovery');
    expect(strengths).toContain('Sheepstealer');
    expect(breakdown(rating, 'Support usefulness').explanation).toContain('2 Provides signals used');
    expect(rating.weaknesses.join(' ')).toContain('Physical Damage support is available but not used');
  });

  it('rates Syrax, Vhagar, and Caraxes at least as high as Syrax, Vhagar, and Crimson from realized payoff', () => {
    const caraxes = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const crimson = ratingFor(formation('syrax', 'vhagar', 'crimson'));

    expect(caraxes.score).toBeGreaterThanOrEqual(crimson.score);
    expect(breakdown(caraxes, 'Realized synergy payoff').score).toBeGreaterThan(
      breakdown(crimson, 'Realized synergy payoff').score,
    );
  });

  it('keeps top benchmark formations Excellent when active payoff paths justify it', () => {
    const caraxesFeskarSyrax = ratingFor(formation('caraxes', 'feskar', 'syrax'));
    const seasmokeShadowsongZivern = ratingFor(formation('seasmoke', 'shadowsong', 'zivern'));

    expect(caraxesFeskarSyrax.tier).toBe('Excellent');
    expect(seasmokeShadowsongZivern.tier).toBe('Excellent');
    expect(breakdown(caraxesFeskarSyrax, 'Realized synergy payoff').score).toBeGreaterThanOrEqual(35);
    expect(breakdown(seasmokeShadowsongZivern, 'Realized synergy payoff').score).toBeGreaterThanOrEqual(35);
  });

  it('shows Syrax, Vhagar, and Crimson missing Slow and Burn once each', () => {
    const rating = ratingFor(formation('syrax', 'vhagar', 'crimson'));
    const weaknesses = rating.weaknesses.join(' ');

    expect(weaknesses).toContain('Syrax benefits from Slow');
    expect(weaknesses).toContain('Vhagar benefits from Burn');
    expect(rating.weaknesses.filter((weakness) => weakness.includes('Vhagar') && weakness.includes('Burn'))).toHaveLength(1);
    expect(rating.weaknesses.filter((weakness) => weakness.includes('Syrax') && weakness.includes('Slow'))).toHaveLength(1);
  });

  it('does not let high support volume make a low-payoff formation Excellent', () => {
    const rating = manualRating({
      presentation: {},
      signalChipsByDragonId: {
        syrax: {
          damageProfile: [{ label: 'Tactical Damage', state: 'supported', reason: 'Supported by Vhagar.' }],
          provides: [
            { label: 'Fire Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Physical Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Tactical Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Strength support', state: 'used', reason: 'Used by Vhagar.' },
            { label: 'Instinct support', state: 'used', reason: 'Used by Vhagar.' },
          ],
          benefitsFrom: [],
        },
      },
    });

    expect(rating.tier).not.toBe('Excellent');
    expect(breakdown(rating, 'Support usefulness').score).toBeLessThan(25);
  });

  it('guards Excellent when three or more Benefits remain missing without top payoff strength', () => {
    const rating = manualRating({
      presentation: {
        activeSynergies: [
          synergyResult('setup-payoff', 'caraxes', 'vhagar', 'status:burn', 1),
          synergyResult('setup-payoff', 'caraxes', 'syrax', 'status:slow', 2),
          synergyResult('setup-payoff', 'syrax', 'caraxes', 'status:first-strike', 3),
          synergyResult('amplifier-output', 'syrax', 'caraxes', 'damage:fire', 4),
          synergyResult('amplifier-output', 'vhagar', 'syrax', 'damage:tactical', 5),
          synergyResult('amplifier-output', 'caraxes', 'vhagar', 'stat:strength', 6),
          synergyResult('amplifier-output', 'syrax', 'vhagar', 'stat:instinct', 7),
        ],
      },
      signalChipsByDragonId: {
        syrax: {
          damageProfile: [{ label: 'Tactical Damage', state: 'supported', reason: 'Supported by Vhagar.' }],
          provides: [
            { label: 'Fire Damage support', state: 'used', reason: 'Used by Caraxes.' },
            { label: 'Instinct support', state: 'used', reason: 'Used by Vhagar.' },
            { label: 'Initiative support', state: 'used', reason: 'Used by Vhagar.' },
          ],
          benefitsFrom: [
            { label: 'Slow', state: 'missing', reason: 'No selected dragon actively provides this signal.' },
            { label: 'Burn', state: 'satisfied', reason: 'Satisfied by Caraxes.' },
          ],
        },
        vhagar: {
          damageProfile: [{ label: 'Physical Damage', state: 'supported', reason: 'Supported by Syrax.' }],
          provides: [{ label: 'Strength support', state: 'used', reason: 'Used by Caraxes.' }],
          benefitsFrom: [
            { label: 'Burn', state: 'missing', reason: 'No selected dragon actively provides this signal.' },
            { label: 'Control', state: 'missing', reason: 'No selected dragon actively provides this signal.' },
          ],
        },
        caraxes: {
          damageProfile: [{ label: 'Fire Damage', state: 'supported', reason: 'Supported by Syrax.' }],
          provides: [{ label: 'First-Strike', state: 'used', reason: 'Used by Syrax.' }],
          benefitsFrom: [],
        },
      },
    });

    expect(rating.score).toBeGreaterThanOrEqual(90);
    expect(rating.tier).toBe('Strong');
  });

  it('caps placement and conflict risk so it cannot overpower active synergy paths', () => {
    const rating = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const placement = breakdown(rating, 'Placement / conflict risk');

    expect(placement.max).toBe(15);
    expect(placement.score).toBeGreaterThanOrEqual(8);
    expect(breakdown(rating, 'Realized synergy payoff').score).toBeGreaterThan(placement.max);
  });

  it('treats non-Vanguard inactive traits as opportunities instead of severe score penalties', () => {
    const rating = ratingFor(formation('syrax', 'vhagar', 'caraxes'));
    const weaknesses = rating.weaknesses.join(' ');

    expect(weaknesses).toContain('only one dragon can receive that positional benefit');
    expect(weaknesses).not.toContain('could be activated from Vanguard as an alternate placement option');
    expect(breakdown(rating, 'Placement / conflict risk').score).toBeGreaterThan(0);
  });
});
