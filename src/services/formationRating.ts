import type { Dragon, FormationPosition } from '../models/dragon';
import type { FormationSignalChip } from '../app/formationCardPresentation';
import type { SimpleFormationPresentation } from '../synergy/formationPresentation';
import type { DragonSynergyProfile, SimpleFormation } from '../synergy/types';

export type FormationRatingTier = 'Excellent' | 'Strong' | 'Solid' | 'Developing' | 'Weak' | 'Incomplete';

export interface FormationRatingBreakdownItem {
  label: string;
  score: number;
  max: number;
  explanation: string;
}

export interface FormationRatingResult {
  score: number;
  tier: FormationRatingTier;
  summary: string;
  breakdown: FormationRatingBreakdownItem[];
  strengths: string[];
  weaknesses: string[];
  notes: string[];
}

export interface FormationRatingSignalChips {
  damageProfile: FormationSignalChip[];
  provides: FormationSignalChip[];
  benefitsFrom: FormationSignalChip[];
}

export type FormationRatingSignalChipsByDragonId = Record<string, FormationRatingSignalChips | undefined>;

interface SelectedDragon {
  dragonId: string;
  dragonName: string;
  position: FormationPosition;
  profile?: DragonSynergyProfile;
  chips: FormationRatingSignalChips;
}

const emptyChips: FormationRatingSignalChips = {
  damageProfile: [],
  provides: [],
  benefitsFrom: [],
};

export function rateFormation({
  formation,
  dragons,
  profiles,
  presentation,
  signalChipsByDragonId,
}: {
  formation: SimpleFormation;
  dragons: Dragon[];
  profiles: DragonSynergyProfile[];
  presentation: SimpleFormationPresentation;
  signalChipsByDragonId: FormationRatingSignalChipsByDragonId;
}): FormationRatingResult {
  const selected = selectedDragons(formation, dragons, profiles, signalChipsByDragonId);
  const selectedCount = selected.length;
  const readiness = readinessScore(selected, presentation);
  const synergyPayoff = synergyPayoffScore(selected, presentation);
  const supportUsefulness = supportUsefulnessScore(selected);
  const placement = placementScore(selected, presentation);
  const score = clampScore(readiness.score + synergyPayoff.score + supportUsefulness.score + placement.score);
  const tier = selectedCount < 3 ? 'Incomplete' : tierForScore(score);
  const strengths = selectStrengths(selected, presentation);
  const weaknesses = selectWeaknesses(selected, presentation);
  const notes = [
    'Rating is based on mapped synergy signals, current progression, placement, and conflicts. It is not a combat simulation.',
  ];

  if (presentation.unmappedDragonIds.length > 0) {
    notes.push('Limited profile coverage lowers confidence for this formation.');
  }

  return {
    score,
    tier,
    summary: summaryFor(tier, selectedCount, presentation, strengths, weaknesses),
    breakdown: [readiness, synergyPayoff, supportUsefulness, placement],
    strengths,
    weaknesses,
    notes,
  };
}

export function tierForScore(score: number): FormationRatingTier {
  if (score >= 90) {
    return 'Excellent';
  }
  if (score >= 75) {
    return 'Strong';
  }
  if (score >= 60) {
    return 'Solid';
  }
  if (score >= 40) {
    return 'Developing';
  }
  if (score > 0) {
    return 'Weak';
  }
  return 'Incomplete';
}

function selectedDragons(
  formation: SimpleFormation,
  dragons: Dragon[],
  profiles: DragonSynergyProfile[],
  signalChipsByDragonId: FormationRatingSignalChipsByDragonId,
): SelectedDragon[] {
  const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));
  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  const seenDragonIds = new Set<string>();

  return (Object.entries(formation) as Array<[FormationPosition, string | null]>).flatMap(([position, dragonId]) => {
    const dragon = dragonId ? dragonsById.get(dragonId) : undefined;
    if (!dragon || seenDragonIds.has(dragon.id)) {
      return [];
    }

    seenDragonIds.add(dragon.id);
    return [
      {
        dragonId: dragon.id,
        dragonName: dragon.name,
        position,
        profile: profilesById.get(dragon.id),
        chips: signalChipsByDragonId[dragon.id] ?? emptyChips,
      },
    ];
  });
}

function readinessScore(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): FormationRatingBreakdownItem {
  const filledPoints = Math.min(selected.length, 3) * 5;
  const profilePoints = selected.length === 0 ? 0 : Math.round((presentation.mappedDragonIds.length / selected.length) * 5);
  const score = clampCategory(filledPoints + profilePoints, 20);
  const unmappedCount = presentation.unmappedDragonIds.length;
  const explanation =
    selected.length === 3 && unmappedCount === 0
      ? 'All positions are filled with curated profiles.'
      : `${selected.length} of 3 positions filled; ${presentation.mappedDragonIds.length} selected profiles are curated.`;

  return { label: 'Formation readiness', score, max: 20, explanation };
}

function synergyPayoffScore(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): FormationRatingBreakdownItem {
  const activeSetupCount = presentation.activeSynergies.filter((result) => result.kind === 'setup-payoff').length;
  const activeAmplifierCount = presentation.activeSynergies.filter((result) => result.kind === 'amplifier-output').length;
  const satisfiedBenefitCount = selected.flatMap((dragon) => dragon.chips.benefitsFrom).filter((chip) => chip.state === 'satisfied').length;
  const participatingDragonCount = new Set(presentation.activeSynergies.flatMap((result) => result.dragonIds)).size;
  const relationshipPoints = Math.min(activeSetupCount * 7 + activeAmplifierCount * 4, 25);
  const benefitPoints = Math.min(satisfiedBenefitCount * 3, 6);
  const participationPoints = participatingDragonCount >= 3 ? 4 : participatingDragonCount >= 2 ? 2 : 0;
  const score = clampCategory(relationshipPoints + benefitPoints + participationPoints, 35);
  const explanation =
    presentation.activeSynergies.length > 0
      ? `${presentation.activeSynergies.length} mapped active relationship${presentation.activeSynergies.length === 1 ? '' : 's'} found.`
      : 'No active mapped payoff relationship is available yet.';

  return { label: 'Synergy payoff', score, max: 35, explanation };
}

function supportUsefulnessScore(selected: SelectedDragon[]): FormationRatingBreakdownItem {
  const usedProvidesCount = selected.flatMap((dragon) => dragon.chips.provides).filter((chip) => chip.state === 'used').length;
  const supportedDamageCount = selected.flatMap((dragon) => dragon.chips.damageProfile).filter((chip) => chip.state === 'supported').length;
  const usedProvidePoints = Math.min(usedProvidesCount * 4, 12);
  const supportedDamagePoints = Math.min(supportedDamageCount * 4, 8);
  const score = clampCategory(usedProvidePoints + supportedDamagePoints, 20);
  const explanation =
    usedProvidesCount + supportedDamageCount > 0
      ? `${usedProvidesCount} Provides signal${usedProvidesCount === 1 ? '' : 's'} used and ${supportedDamageCount} damage profile${supportedDamageCount === 1 ? '' : 's'} supported.`
      : 'Available support has not been matched to selected allies.';

  return { label: 'Support usefulness', score, max: 20, explanation };
}

function placementScore(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): FormationRatingBreakdownItem {
  const inactivePositionSignals = selected
    .flatMap((dragon) => [...dragon.chips.provides, ...dragon.chips.benefitsFrom, ...dragon.chips.damageProfile])
    .filter((chip) => chip.state === 'inactive' && chip.reason.includes('requires ')).length;
  const penalty =
    presentation.placementIssues.length * 6 +
    presentation.positionConflicts.length * 8 +
    presentation.futureUnlocks.length * 2 +
    Math.min(inactivePositionSignals * 2, 6);
  const score = clampCategory(25 - penalty, 25);
  const explanation =
    penalty === 0
      ? 'No mapped placement issue or position conflict is active.'
      : `${presentation.placementIssues.length} placement issue${presentation.placementIssues.length === 1 ? '' : 's'} and ${presentation.positionConflicts.length} position conflict${presentation.positionConflicts.length === 1 ? '' : 's'} reduce this category.`;

  return { label: 'Placement and conflicts', score, max: 25, explanation };
}

function selectStrengths(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): string[] {
  const strengths = uniqueOrdered([
    ...presentation.activeSynergies.map((result) => result.explanation),
    ...selected.flatMap((dragon) =>
      dragon.chips.damageProfile
        .filter((chip) => chip.state === 'supported')
        .map((chip) => `${dragon.dragonName}'s ${chip.label} is supported. ${chip.reason}`),
    ),
  ]);

  return strengths.slice(0, 5);
}

function selectWeaknesses(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): string[] {
  const unfilledCount = Math.max(0, 3 - selected.length);
  const unfilledWeakness =
    unfilledCount > 0 ? [`Assign all three positions for a full rating; ${unfilledCount} position${unfilledCount === 1 ? ' is' : 's are'} empty.`] : [];
  const unmappedWeaknesses = presentation.unmappedDragonIds.map((dragonId) => {
    const dragonName = selected.find((dragon) => dragon.dragonId === dragonId)?.dragonName ?? dragonId;
    return `${dragonName} has limited mapped profile data, so rating confidence is lower.`;
  });
  const missingBenefitWeaknesses = selected.flatMap((dragon) =>
    dragon.chips.benefitsFrom
      .filter((chip) => chip.state === 'missing')
      .map((chip) => `${dragon.dragonName} benefits from ${chip.label}, but no selected ally actively provides it.`),
  );
  const unusedProvidesWeaknesses = selected
    .flatMap((dragon) =>
      dragon.chips.provides
        .filter((chip) => chip.state === 'available')
        .map((chip) => ({
          label: chip.label,
          text: `${dragon.dragonName}'s ${chip.label} is available but not used by this formation.`,
        })),
    )
    .sort((left, right) => unusedProvidePriority(left.label) - unusedProvidePriority(right.label))
    .map((entry) => entry.text);
  const inactiveWeaknesses = selected.flatMap((dragon) =>
    dragon.chips.provides
      .filter((chip) => chip.state === 'inactive')
      .map((chip) => `${dragon.dragonName}'s ${chip.label} is inactive. ${chip.reason}`),
  );
  const weaknesses = uniqueOrdered([
    ...unfilledWeakness,
    ...unmappedWeaknesses,
    ...presentation.positionConflicts.map((result) => result.explanation),
    ...presentation.placementIssues.map((result) => result.explanation),
    ...presentation.missingEnablers.map((result) => result.explanation),
    ...missingBenefitWeaknesses,
    ...presentation.futureUnlocks.map((result) => result.explanation),
    ...unusedProvidesWeaknesses.slice(0, 3),
    ...inactiveWeaknesses,
  ]);

  return weaknesses.slice(0, 6);
}

function summaryFor(
  tier: FormationRatingTier,
  selectedCount: number,
  presentation: SimpleFormationPresentation,
  strengths: string[],
  weaknesses: string[],
): string {
  if (selectedCount < 3) {
    return 'Assign all three positions to unlock a full explainable rating.';
  }

  if (!presentation.hasCompleteProfileCoverage) {
    return 'This formation has useful mapped signals, but limited profile coverage lowers confidence.';
  }

  if (tier === 'Excellent' || tier === 'Strong') {
    return 'Mapped synergy signals show a strong formation shape with clear payoff paths.';
  }

  if (tier === 'Solid') {
    return 'Mapped signals show workable synergy with some room to improve placement or support usage.';
  }

  if (strengths.length === 0 && weaknesses.length > 0) {
    return 'The selected dragons need more mapped support, placement alignment, or complete data.';
  }

  return 'The formation has a few useful signals but still has clear improvement opportunities.';
}

function clampScore(score: number): number {
  return clampCategory(score, 100);
}

function clampCategory(score: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(score)));
}

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    results.push(value);
  }

  return results;
}

function unusedProvidePriority(label: string): number {
  return label.includes('support') ? 0 : 1;
}
