import { describe, expect, it } from 'vitest';
import { buildFormationSignalChips } from '../app/formationCardPresentation';
import { dragons } from '../data/dragons';
import { evaluateFormation } from '../synergy/evaluateFormation';
import { buildSimpleFormationPresentation } from '../synergy/formationPresentation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { rateFormation, type FormationRatingResult } from '../services/formationRating';
import type { Formation } from '../services/teamShare';
import type { SimpleProgressionByDragonId } from '../synergy/types';

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
    expect(support.explanation).toContain('2 Provides signals used');
    expect(rating.weaknesses.join(' ')).toContain("Malachite's Physical Damage support is available but not used");
    expect(rating.weaknesses.join(' ')).toContain("Malachite's Tactical Damage support is available but not used");
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

  it('shows Syrax, Vhagar, and Crimson missing Slow and Burn once each', () => {
    const rating = ratingFor(formation('syrax', 'vhagar', 'crimson'));
    const weaknesses = rating.weaknesses.join(' ');

    expect(weaknesses).toContain('Syrax benefits from Slow');
    expect(weaknesses).toContain('Vhagar benefits from Burn');
    expect(rating.weaknesses.filter((weakness) => weakness.includes('Vhagar') && weakness.includes('Burn'))).toHaveLength(1);
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

    expect(rating.weaknesses.join(' ')).toContain('alternate placement or progression opportunity');
    expect(breakdown(rating, 'Placement / conflict risk').score).toBeGreaterThan(0);
  });
});
