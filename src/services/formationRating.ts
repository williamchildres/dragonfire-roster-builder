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

interface RatingListCandidate {
  key: string;
  text: string;
}

interface PayoffMetrics {
  activeSetupCount: number;
  activeAmplifierCount: number;
  satisfiedBenefitCount: number;
  participatingDragonCount: number;
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
  const payoffMetrics = collectPayoffMetrics(selected, presentation);
  const readiness = readinessScore(selected, presentation);
  const synergyPayoff = synergyPayoffScore(presentation, payoffMetrics);
  const supportUsefulness = supportUsefulnessScore(selected, payoffMetrics, synergyPayoff.score);
  const placement = placementScore(presentation);
  const score = clampScore(readiness.score + synergyPayoff.score + supportUsefulness.score + placement.score);
  const tier = tierForFormation({
    selected,
    selectedCount,
    score,
    synergyPayoff,
    supportUsefulness,
    placement,
    presentation,
  });
  const strengths = selectStrengths(selected, presentation);
  const weaknesses = selectWeaknesses(selected, presentation);
  const notes = [
    'Rating compares the currently selected formation using mapped active signals, current progression, placement, and conflicts. It is not a combat simulation.',
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
  const filledPoints = Math.min(selected.length, 3) * 4;
  const profilePoints = selected.length === 0 ? 0 : Math.round((presentation.mappedDragonIds.length / selected.length) * 3);
  const score = clampCategory(filledPoints + profilePoints, 15);
  const unmappedCount = presentation.unmappedDragonIds.length;
  const explanation =
    selected.length === 3 && unmappedCount === 0
      ? 'All positions are filled with curated profiles.'
      : `${selected.length} of 3 positions filled; ${presentation.mappedDragonIds.length} selected profiles are curated.`;

  return { label: 'Readiness / profile confidence', score, max: 15, explanation };
}

function collectPayoffMetrics(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): PayoffMetrics {
  const activeSetupCount = uniqueKeys(
    presentation.activeSynergies
      .filter((result) => result.kind === 'setup-payoff')
      .map((result) => relationshipKey(result.kind, result.dragonIds, result.tag)),
  ).length;
  const activeAmplifierCount = uniqueKeys(
    presentation.activeSynergies
      .filter((result) => result.kind === 'amplifier-output')
      .map((result) => relationshipKey(result.kind, result.dragonIds, result.tag)),
  ).length;
  const satisfiedBenefitCount = uniqueKeys(
    selected.flatMap((dragon) =>
      dragon.chips.benefitsFrom
        .filter((chip) => chip.state === 'satisfied')
        .map((chip) => missingBenefitKey(dragon.dragonId, chip.label)),
    ),
  ).length;
  const participatingDragonCount = new Set(presentation.activeSynergies.flatMap((result) => result.dragonIds)).size;

  return {
    activeSetupCount,
    activeAmplifierCount,
    satisfiedBenefitCount,
    participatingDragonCount,
  };
}

function synergyPayoffScore(
  presentation: SimpleFormationPresentation,
  metrics: PayoffMetrics,
): FormationRatingBreakdownItem {
  const { activeSetupCount, activeAmplifierCount, satisfiedBenefitCount, participatingDragonCount } = metrics;
  const setupPoints = Math.min(activeSetupCount * 8, 24);
  const amplifierPoints = Math.min(activeAmplifierCount * 2, 12);
  const benefitPoints = Math.min(satisfiedBenefitCount * 4, 12);
  const participationPoints = participatingDragonCount >= 3 ? 3 : participatingDragonCount >= 2 ? 1 : 0;
  const score = clampCategory(setupPoints + amplifierPoints + benefitPoints + participationPoints, 45);
  const explanation =
    presentation.activeSynergies.length > 0
      ? `${presentation.activeSynergies.length} mapped active relationship${presentation.activeSynergies.length === 1 ? '' : 's'} found.`
      : 'No active mapped payoff relationship is available yet.';

  return { label: 'Realized synergy payoff', score, max: 45, explanation };
}

function supportUsefulnessScore(
  selected: SelectedDragon[],
  payoffMetrics: PayoffMetrics,
  payoffScore: number,
): FormationRatingBreakdownItem {
  const usedProvidesCount = uniqueKeys(
    selected.flatMap((dragon) =>
      dragon.chips.provides
        .filter((chip) => chip.state === 'used' && countsAsUsedSupport(chip.label))
        .map((chip) => usedSupportKey(dragon.dragonId, chip.label, chip.reason)),
    ),
  ).length;
  const supportedDamageCount = uniqueKeys(
    selected.flatMap((dragon) =>
      dragon.chips.damageProfile
        .filter((chip) => chip.state === 'supported')
        .map((chip) => `supported:${dragon.dragonId}:${normalizeMeaning(chip.label)}:${recipientFromReason(chip.reason)}`),
    ),
  ).length;
  const usedProvidePoints = Math.min(usedProvidesCount * 3, 15);
  const supportedDamagePoints = Math.min(supportedDamageCount * 5, 10);
  const uncappedScore = clampCategory(usedProvidePoints + supportedDamagePoints, 25);
  const cap = supportUsefulnessCap(payoffMetrics, payoffScore, supportedDamageCount);
  const score = Math.min(uncappedScore, cap);
  const capExplanation = score < uncappedScore ? ` Capped at ${cap} until more payoff or satisfied Benefits are active.` : '';
  const explanation =
    usedProvidesCount + supportedDamageCount > 0
      ? `${usedProvidesCount} Provides signal${usedProvidesCount === 1 ? '' : 's'} used and ${supportedDamageCount} damage profile${supportedDamageCount === 1 ? '' : 's'} supported.${capExplanation}`
      : 'Available support has not been matched to selected allies.';

  return { label: 'Support usefulness', score, max: 25, explanation };
}

function supportUsefulnessCap(
  payoffMetrics: PayoffMetrics,
  payoffScore: number,
  supportedDamageCount: number,
): number {
  const relationshipCap =
    6 +
    Math.min(payoffMetrics.satisfiedBenefitCount, 3) * 4 +
    Math.min(payoffMetrics.activeSetupCount, 2) * 3 +
    Math.min(payoffMetrics.activeAmplifierCount, 3) * 2 +
    (supportedDamageCount > 0 ? 3 : 0);
  let cap = Math.min(25, relationshipCap);

  if (payoffScore < 15) {
    cap = Math.min(cap, supportedDamageCount > 0 ? 10 : 6);
  } else if (payoffScore < 25) {
    cap = Math.min(cap, 14);
  } else if (payoffScore < 35) {
    cap = Math.min(cap, 20);
  }

  if (payoffMetrics.satisfiedBenefitCount === 0) {
    cap = Math.min(cap, supportedDamageCount > 0 ? 10 : 6);
  }

  return clampCategory(cap, 25);
}

function placementScore(
  presentation: SimpleFormationPresentation,
): FormationRatingBreakdownItem {
  const penalty =
    Math.min(presentation.placementIssues.length * 3, 6) +
    Math.min(presentation.positionConflicts.length * 4, 5) +
    Math.min(presentation.futureUnlocks.length, 2);
  const score = clampCategory(15 - penalty, 15);
  const explanation =
    penalty === 0
      ? 'No mapped placement issue or position conflict is active.'
      : `${presentation.placementIssues.length} placement issue${presentation.placementIssues.length === 1 ? '' : 's'} and ${presentation.positionConflicts.length} position conflict${presentation.positionConflicts.length === 1 ? '' : 's'} reduce this category.`;

  return { label: 'Placement / conflict risk', score, max: 15, explanation };
}

function tierForFormation({
  selected,
  selectedCount,
  score,
  synergyPayoff,
  supportUsefulness,
  placement,
  presentation,
}: {
  selected: SelectedDragon[];
  selectedCount: number;
  score: number;
  synergyPayoff: FormationRatingBreakdownItem;
  supportUsefulness: FormationRatingBreakdownItem;
  placement: FormationRatingBreakdownItem;
  presentation: SimpleFormationPresentation;
}): FormationRatingTier {
  if (selectedCount < 3) {
    return 'Incomplete';
  }

  const scoreTier = tierForScore(score);
  if (scoreTier !== 'Excellent') {
    return scoreTier;
  }

  const missingBenefitCount = countMissingBenefits(selected, presentation);
  const hasStrongPayoff = synergyPayoff.score >= 35;
  const hasTooManyMissingBenefits = missingBenefitCount >= 3 && synergyPayoff.score < 42;
  const hasSeverePlacementCollapse = placement.score <= 5;
  const isSupportHeavyWithoutPayoff = supportUsefulness.score >= 20 && synergyPayoff.score < 35;

  if (!hasStrongPayoff || hasTooManyMissingBenefits || hasSeverePlacementCollapse || isSupportHeavyWithoutPayoff) {
    return 'Strong';
  }

  return 'Excellent';
}

function selectStrengths(
  selected: SelectedDragon[],
  presentation: SimpleFormationPresentation,
): string[] {
  const strengths = uniqueCandidates([
    ...presentation.activeSynergies.map((result) => ({
      key: relationshipKey(result.kind, result.dragonIds, result.tag),
      text: result.explanation,
    })),
    ...selected.flatMap((dragon) =>
      dragon.chips.damageProfile
        .filter((chip) => chip.state === 'supported')
        .map((chip) => ({
          key: `supported-damage:${dragon.dragonId}:${normalizeMeaning(chip.label)}:${recipientFromReason(chip.reason)}`,
          text: `${dragon.dragonName}'s ${chip.label} is supported. ${chip.reason}`,
        })),
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
    return {
      key: `unmapped:${dragonId}`,
      text: `${dragonName} has limited mapped profile data, so rating confidence is lower.`,
    };
  });
  const missingBenefitWeaknesses = selected.flatMap((dragon) =>
    dragon.chips.benefitsFrom
      .filter((chip) => chip.state === 'missing')
      .map((chip) => ({
        key: missingBenefitKey(dragon.dragonId, chip.label),
        text: `${dragon.dragonName} benefits from ${chip.label}, but no selected ally actively provides it.`,
      })),
  );
  const unusedProvidesWeaknesses = selected
    .flatMap((dragon) =>
      dragon.chips.provides
        .filter((chip) => chip.state === 'available')
        .map((chip) => ({
          key: unusedSupportKey(dragon.dragonId, chip.label, chip.reason),
          label: chip.label,
          text: `${dragon.dragonName}'s ${chip.label} is available but not used by this formation.`,
        })),
    )
    .sort((left, right) => unusedProvidePriority(left.label) - unusedProvidePriority(right.label))
    .map(({ key, text }) => ({ key, text }));
  const conflictDragonIds = new Set(presentation.positionConflicts.flatMap((result) => result.dragonIds));
  const inactiveWeaknesses = selected.flatMap((dragon) =>
    dragon.chips.provides
      .filter(
        (chip) =>
          chip.state === 'inactive' &&
          !(conflictDragonIds.has(dragon.dragonId) && isVanguardInactiveReason(chip.reason)),
      )
      .map((chip) => ({
        key: `inactive-provides:${dragon.dragonId}:${normalizeMeaning(chip.label)}:${normalizeMeaning(chip.reason)}`,
        text: inactiveSignalText(dragon.dragonName, chip),
      })),
  );
  const weaknesses = uniqueCandidates([
    ...unfilledWeakness.map((text) => ({ key: 'incomplete-formation', text })),
    ...unmappedWeaknesses,
    ...presentation.positionConflicts.map((result) => ({
      key: vanguardConflictKey(result.dragonIds),
      text: result.explanation,
    })),
    ...presentation.placementIssues.map((result) => ({
      key: placementIssueKey(result),
      text: result.explanation,
    })),
    ...presentation.missingEnablers.map((result) => ({
      key: missingBenefitKey(result.dragonIds[0] ?? 'unknown', normalizedMeaningFromTag(result.tag)),
      text: result.explanation,
    })),
    ...missingBenefitWeaknesses,
    ...presentation.futureUnlocks.map((result) => ({
      key: futureUnlockKey(result),
      text: result.explanation,
    })),
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

function uniqueCandidates(values: RatingListCandidate[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    if (seen.has(value.key)) {
      continue;
    }
    seen.add(value.key);
    results.push(value.text);
  }

  return results;
}

function uniqueKeys(values: string[]): string[] {
  return [...new Set(values)];
}

function countMissingBenefits(selected: SelectedDragon[], presentation: SimpleFormationPresentation): number {
  return uniqueKeys([
    ...presentation.missingEnablers.map((result) =>
      missingBenefitKey(result.dragonIds[0] ?? 'unknown', normalizedMeaningFromTag(result.tag)),
    ),
    ...selected.flatMap((dragon) =>
      dragon.chips.benefitsFrom
        .filter((chip) => chip.state === 'missing')
        .map((chip) => missingBenefitKey(dragon.dragonId, chip.label)),
    ),
  ]).length;
}

function unusedProvidePriority(label: string): number {
  return label.includes('support') ? 0 : 1;
}

function relationshipKey(kind: string, dragonIds: string[], tag: string | undefined): string {
  return `${kind}:${dragonIds.join('>')}:${normalizedMeaningFromTag(tag)}`;
}

function missingBenefitKey(dragonId: string, label: string | undefined): string {
  return `missing-benefit:${dragonId}:${normalizeMeaning(label ?? 'unknown')}`;
}

function usedSupportKey(dragonId: string, label: string, reason: string): string {
  return `used-support:${dragonId}:${normalizeMeaning(label)}:${recipientFromReason(reason)}`;
}

function unusedSupportKey(dragonId: string, label: string, reason: string): string {
  return `unused-support:${dragonId}:${normalizeMeaning(label)}:${recipientFromReason(reason)}`;
}

function placementIssueKey(result: { kind: string; dragonIds: string[]; abilityIds: string[]; tag?: string }): string {
  return `placement:${result.dragonIds.join('>')}:${result.abilityIds.join('>')}:${normalizedMeaningFromTag(result.tag)}`;
}

function vanguardConflictKey(dragonIds: string[]): string {
  return `vanguard-conflict:${[...dragonIds].sort().join('>')}`;
}

function futureUnlockKey(result: { kind: string; dragonIds: string[]; abilityIds: string[]; tag?: string }): string {
  return `future:${result.dragonIds.join('>')}:${result.abilityIds.join('>')}:${normalizedMeaningFromTag(result.tag)}`;
}

function countsAsUsedSupport(label: string): boolean {
  return !['fire-damage', 'physical-damage', 'tactical-damage'].includes(normalizeMeaning(label));
}

function isVanguardInactiveReason(reason: string): boolean {
  return normalizeMeaning(reason).includes('requires-vanguard');
}

function inactiveSignalText(dragonName: string, chip: FormationSignalChip): string {
  if (isVanguardInactiveReason(chip.reason)) {
    return `${dragonName}'s ${chip.label} could be activated from Vanguard as an alternate placement option. ${chip.reason}`;
  }

  return `${dragonName}'s ${chip.label} is an alternate placement or progression opportunity. ${chip.reason}`;
}

function normalizedMeaningFromTag(tag: string | undefined): string {
  if (!tag) {
    return 'unknown';
  }
  return normalizeMeaning(tag.split(':').slice(1).join(':') || tag);
}

function normalizeMeaning(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function recipientFromReason(reason: string): string {
  return normalizeMeaning(reason.replace(/^(Used|Supported) by /, '').replace(/\.$/, ''));
}
