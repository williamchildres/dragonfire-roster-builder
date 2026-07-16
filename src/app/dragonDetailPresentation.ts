import type { AbilityDefinition, EffectTag } from '../models/dragon';
import {
  displayTagsFrom,
  SYNERGY_TAG_LABELS,
  type SynergyTag,
} from '../synergy/tags';
import type { DragonProgression, DragonSynergyProfile, PositionClaim, SynergySignal } from '../synergy/types';

export interface DragonDetailPresentation {
  headerLine: string;
  metadataNotice: string | null;
  provides: string[];
  benefitsFrom: string[];
  placementNotes: string[];
}

export interface AbilitySummaryPresentation {
  plainSummary: string;
  chips: string[];
  technicalTags: string[];
}

export const OUTPUT_SIGNAL_LABELS: Partial<Record<SynergyTag, string>> = SYNERGY_TAG_LABELS;

export const SUPPORT_SIGNAL_LABELS: Partial<Record<SynergyTag, string>> = {
  'damage:any': 'Generic Damage Dealt support',
  'damage:fire': 'Fire Damage support',
  'damage:physical': 'Physical Damage support',
  'damage:tactical': 'Tactical Damage support',
  'effect:recovery': 'Recovery support',
  'effect:recovery-received': 'Recovery Received support',
  'defense:damage-received': 'Damage Received support',
  'defense:physical-damage-received': 'Physical Damage Received support',
  'stat:strength': 'Strength support',
  'stat:instinct': 'Instinct support',
  'stat:intelligence': 'Intelligence support',
  'stat:initiative': 'Initiative support',
};

export const BENEFIT_SIGNAL_LABELS: Partial<Record<SynergyTag, string>> = {
  ...SYNERGY_TAG_LABELS,
  'stat:strength': 'Strength support',
  'stat:instinct': 'Instinct support',
  'stat:intelligence': 'Intelligence support',
  'stat:initiative': 'Initiative support',
};

const ABILITY_SUMMARY_LABELS: Partial<Record<string, string>> = {
  BURN: 'Applies Burn',
  PANIC: 'Applies Panic',
  PANIC_PAYOFF: 'Deals double damage to enemies with Panic',
  CONFUSION: 'Applies Confusion',
  STUN: 'Applies Stun',
  SLOW: 'Applies Slow',
  TAUNT: 'Applies Taunt',
  STAGGER: 'Applies Stagger',
  OVERWHELM: 'Applies Overwhelm',
  VULNERABLE: 'Applies Vulnerable',
  VULNERABLE_PAYOFF: 'Benefits from Vulnerable',
  WEAKENED: 'Applies Weakened',
  BLEED: 'Applies Bleed',
  BLEED_PAYOFF: 'Bleed improves Weakened chance',
  FIRE_WARD: 'Grants Fire Ward',
  ADVANTAGE: 'Grants Advantage',
  RESISTANCE: 'Grants Resistance',
  RESISTANCE_PAYOFF: 'Resistance doubles Recovery',
  IMMUNITY: 'Grants status immunity',
  CONDITIONAL_STATUS_COPY: 'Copies conditional statuses',
  CONTROL: 'Applies Control',
  FIRST_STRIKE: 'Grants First-Strike',
  RECOVERY: 'Provides Recovery',
  FIRE_DAMAGE: 'Deals Fire Damage',
  PHYSICAL_DAMAGE: 'Deals Physical Damage',
  TACTICAL_DAMAGE: 'Deals Tactical Damage',
  FIRE_DAMAGE_UP: 'Boosts Fire Damage',
  FIRE_DAMAGE_DEALT_DOWN: 'Suppresses enemy Fire Damage',
  PHYSICAL_DAMAGE_UP: 'Boosts Physical Damage',
  PHYSICAL_DAMAGE_DEALT_DOWN: 'Suppresses enemy Physical Damage',
  TACTICAL_DAMAGE_UP: 'Boosts Tactical Damage',
  STRENGTH_UP: 'Boosts Strength',
  INTELLIGENCE_UP: 'Boosts Intelligence',
  INSTINCT_UP: 'Boosts Instinct',
  BUFF_INITIATIVE: 'Boosts Initiative',
  INITIATIVE_UP: 'Boosts Initiative',
  DAMAGE_RECEIVED_DOWN: 'Reduces Damage Received',
  DAMAGE_RECEIVED_UP: 'Increases Damage Received',
  FIRE_DAMAGE_RECEIVED_UP: 'Increases Fire Damage Received',
  PHYSICAL_DAMAGE_RECEIVED_UP: 'Increases Physical Damage Received',
  FIRE_DAMAGE_RECEIVED_DOWN: 'Reduces Fire Damage Received',
  TACTICAL_DAMAGE_RECEIVED_DOWN: 'Reduces Tactical Damage Received',
  PHYSICAL_DAMAGE_RECEIVED_DOWN: 'Reduces Physical Damage Received',
  DAMAGE_DEALT_DOWN: 'Reduces Damage Dealt',
  DAMAGE_DEALT_UP: 'Boosts Damage Dealt',
  RECOVERY_RECEIVED_UP: 'Boosts Recovery Received',
  RECOVERY_RECEIVED_DOWN: 'Reduces Recovery Received',
  VANGUARD_REQUIRED: 'Requires Vanguard',
  LEFT_FLANK_TARGET: 'Supports Left Flank ally',
  RIGHT_FLANK_TARGET: 'Supports Right Flank ally',
  ANY_LANE_TARGET: 'Any lane',
  SAME_LANE_TARGET: 'Same lane',
  ENHANCED_BY_INSTINCT: 'Enhanced by Instinct',
  ENHANCED_BY_STRENGTH: 'Enhanced by Strength',
  HIGHEST_INTELLIGENCE_TARGET: 'Targets the ally with highest Intelligence',
  FIRE_DAMAGE_ALLY_TARGET: 'Targets a Fire Damage ally',
  TROOP_CAPACITY_CONDITION: 'Checks troop capacity',
  COMMAND_AUGMENTATION: 'Augments a command',
  HIGHEST_STRENGTH_TARGET: 'Targets the highest-Strength other ally',
  STEADY_EROSION: 'Applies Steady Erosion',
  NULLIFY_RECOVERY: 'Applies Nullify Recovery',
};

const HEADLINE_PRIORITY = [
  'Panic',
  'Burn',
  'Physical Damage',
  'Fire Damage',
  'Tactical Damage',
  'First-Strike',
  'Recovery',
  'Slow',
  'Stun',
  'Stagger',
  'Overwhelm',
  'Vanguard trait',
  'Left Flank support',
  'Right Flank support',
  'Fire Damage support',
  'Physical Damage support',
  'Tactical Damage support',
  'Strength support',
  'Instinct support',
  'Intelligence support',
  'Initiative support',
  'Generic Damage Dealt support',
  'Confusion',
];

const SUMMARY_PRIORITY = [
  'PHYSICAL_DAMAGE',
  'FIRE_DAMAGE',
  'RECOVERY',
  'TACTICAL_DAMAGE',
  'FIRE_DAMAGE_DEALT_DOWN',
  'PHYSICAL_DAMAGE_DEALT_DOWN',
  'BURN',
  'PANIC',
  'PANIC_PAYOFF',
  'CONFUSION',
  'FIRST_STRIKE',
  'TAUNT',
  'STUN',
  'SLOW',
  'STAGGER',
  'VULNERABLE',
  'VULNERABLE_PAYOFF',
  'WEAKENED',
  'BLEED',
  'BLEED_PAYOFF',
  'RESISTANCE_PAYOFF',
  'FIRE_WARD',
  'IMMUNITY',
  'CONDITIONAL_STATUS_COPY',
  'OVERWHELM',
  'STEADY_EROSION',
  'NULLIFY_RECOVERY',
  'CONTROL',
  'DAMAGE_RECEIVED_DOWN',
  'FIRE_DAMAGE_RECEIVED_DOWN',
  'TACTICAL_DAMAGE_RECEIVED_DOWN',
  'PHYSICAL_DAMAGE_RECEIVED_DOWN',
  'FIRE_DAMAGE_RECEIVED_UP',
  'PHYSICAL_DAMAGE_RECEIVED_UP',
  'DAMAGE_DEALT_DOWN',
  'PHYSICAL_DAMAGE_UP',
  'FIRE_DAMAGE_UP',
  'TACTICAL_DAMAGE_UP',
  'STRENGTH_UP',
  'INTELLIGENCE_UP',
  'INSTINCT_UP',
  'BUFF_INITIATIVE',
  'INITIATIVE_UP',
  'LEFT_FLANK_TARGET',
  'RIGHT_FLANK_TARGET',
  'VANGUARD_REQUIRED',
];

export function buildDragonDetailPresentation(
  profile: DragonSynergyProfile | undefined,
): DragonDetailPresentation {
  const provides = profile
    ? collectUnique([
        ...describeSignals(profile.outputs, OUTPUT_SIGNAL_LABELS),
        ...describeSignals(profile.supports, SUPPORT_SIGNAL_LABELS),
      ])
    : [];
  const benefitsFrom = profile ? collectUnique(describeSignals(profile.benefitsFrom, BENEFIT_SIGNAL_LABELS)) : [];
  const placementNotes = profile ? collectUnique(describePlacementNotes(profile)) : [];
  const headerLine = profile ? buildHeadlineLine(profile) : 'Metadata-only record. Ability details not verified.';

  return {
    headerLine,
    metadataNotice: profile ? null : 'Metadata-only record. Ability details not verified.',
    provides,
    benefitsFrom,
    placementNotes,
  };
}

export function summarizeAbility(ability: AbilityDefinition): AbilitySummaryPresentation {
  const technicalTags = ability.tags.map((tag) => tag);
  const hasSpecificControlTag = ability.tags.some((tag) =>
    ['STUN', 'SLOW', 'STAGGER', 'OVERWHELM', 'CONFUSION'].includes(tag),
  );
  const summaryCandidates = ability.tags
    .filter((tag) => SUMMARY_PRIORITY.includes(tag))
    .map((tag) => ({
      tag,
      chipLabel: abilityChipLabel(tag, hasSpecificControlTag, ability.tags),
      plainLabel: abilityPlainLabel(tag, hasSpecificControlTag, ability.tags),
    }))
    .filter((candidate) => Boolean(candidate.chipLabel || candidate.plainLabel))
    .sort((left, right) => SUMMARY_PRIORITY.indexOf(left.tag) - SUMMARY_PRIORITY.indexOf(right.tag));
  const chips = collectUnique(summaryCandidates.map((candidate) => candidate.chipLabel)).slice(0, 5);
  const plainCandidates = collectUnique(summaryCandidates.map((candidate) => candidate.plainLabel));
  const plainSummary =
    plainCandidates.length > 0 ? joinClauses(plainCandidates.slice(0, 3)) : 'Verified wording available below.';

  return {
    plainSummary,
    chips,
    technicalTags,
  };
}

export function summarizeAbilityForProgression(
  ability: AbilityDefinition,
  signals: SynergySignal[],
  progression: DragonProgression | undefined,
): AbilitySummaryPresentation {
  const lockedSignals = signals.filter(
    (signal) =>
      (signal.summaryAbilityId ?? signal.abilityId) === ability.id &&
      signal.unlock?.minimumStarRank !== undefined &&
      (progression?.starRank ?? 0) < signal.unlock.minimumStarRank,
  );
  if (lockedSignals.length === 0) {
    return summarizeAbility(ability);
  }

  const associatedSignals = signals.filter(
    (signal) => (signal.summaryAbilityId ?? signal.abilityId) === ability.id,
  );
  const lockedTags = new Set(
    lockedSignals.flatMap((signal) => {
      if (signal.summaryHiddenEffectTags) {
        return signal.summaryHiddenEffectTags;
      }
      const hasActiveSignalForTag = associatedSignals.some(
        (candidate) =>
          candidate.id !== signal.id &&
          candidate.tag === signal.tag &&
          (candidate.unlock?.minimumStarRank === undefined ||
            (progression?.starRank ?? 0) >= candidate.unlock.minimumStarRank),
      );
      const effectTag = effectTagForDamageSignal(signal.tag);
      return !hasActiveSignalForTag && effectTag ? [effectTag] : [];
    }),
  );
  const activeSummary = summarizeAbility({
    ...ability,
    tags: ability.tags.filter((tag) => !lockedTags.has(tag)),
  });
  const unlocks = collectUnique(
    lockedSignals.map((signal) => {
      const label = signal.summaryUnlockLabel ?? OUTPUT_SIGNAL_LABELS[signal.tag];
      return label && signal.unlock?.minimumStarRank !== undefined
        ? `${label} at ${signal.unlock.minimumStarRank}★`
        : null;
    }),
  );
  const activeText = activeSummary.plainSummary.replace(/\.$/, '');

  return {
    ...activeSummary,
    plainSummary: `${activeText}; gains ${unlocks.join(' and ')}.`,
  };
}

export function describeSignalLabels(
  signals: SynergySignal[],
  labels: Partial<Record<SynergyTag, string>> = OUTPUT_SIGNAL_LABELS,
): string[] {
  return describeSignals(signals, labels);
}

export function labelPriority(left: string, right: string): number {
  return headlinePriority(left) - headlinePriority(right) || left.localeCompare(right);
}

function describeSignals(
  signals: SynergySignal[],
  labels: Partial<Record<SynergyTag, string>> = OUTPUT_SIGNAL_LABELS,
): string[] {
  return collectUnique(
    signals.flatMap((signal) =>
      displayTagsFrom(providedTags(signal))
        .map((tag) => labelForSignalTag(signal, tag, labels))
        .filter((label): label is string => Boolean(label)),
    ),
  ).sort((left, right) => headlinePriority(left) - headlinePriority(right));
}

function describePlacementNotes(profile: DragonSynergyProfile): string[] {
  const notes: string[] = [];

  for (const claim of profile.positionClaims) {
    if (claim.requiredPosition === 'vanguard') {
      notes.push('Requires Vanguard');
    }
  }

  for (const signal of [...profile.outputs, ...profile.supports]) {
    if (signal.requiredSelfPosition === 'vanguard' && signal.requiredRecipientPosition === 'left-flank') {
      notes.push('Supports Left Flank ally');
    } else if (signal.requiredSelfPosition === 'vanguard' && signal.requiredRecipientPosition === 'right-flank') {
      notes.push('Supports Right Flank ally');
    } else if (signal.requiredRecipientPosition === 'left-flank') {
      notes.push('Supports Left Flank ally');
    } else if (signal.requiredRecipientPosition === 'right-flank') {
      notes.push('Supports Right Flank ally');
    }
  }

  return notes.length > 0 ? notes : ['No special placement requirement recorded.'];
}

function buildHeadlineLine(profile: DragonSynergyProfile): string {
  const labels = collectUnique([
    ...profile.outputs.flatMap((signal) => headlineLabelsForOutput(signal)),
    ...profile.supports.flatMap((signal) => headlineLabelsForSupport(signal)),
    ...profile.positionClaims.flatMap((claim) => headlineLabelsForClaim(claim)),
  ]).sort((left, right) => headlinePriority(left) - headlinePriority(right));

  return labels.slice(0, 5).join(' - ');
}

function headlineLabelsForOutput(signal: SynergySignal): string[] {
  return displayTagsFrom(providedTags(signal)).flatMap((tag) => {
    const label = OUTPUT_SIGNAL_LABELS[tag] ?? null;
    return label ? [label] : [];
  });
}

function headlineLabelsForSupport(signal: SynergySignal): string[] {
  const label = labelForSignalTag(signal, signal.tag, SUPPORT_SIGNAL_LABELS);
  if (!label) {
    return [];
  }
  return [label];
}

export function labelForSignalTag(
  signal: SynergySignal,
  tag: SynergyTag,
  labels: Partial<Record<SynergyTag, string>>,
): string | null {
  if (signal.publicLabel && tag === signal.tag) {
    return signal.publicLabel;
  }

  if (signal.damageScope === 'non-basic-attack' && tag === 'damage:physical' && labels[tag] === 'Physical Damage support') {
    return 'Non-Basic Physical Damage support';
  }

  return labels[tag] ?? null;
}

function effectTagForDamageSignal(tag: SynergyTag): EffectTag | null {
  if (tag === 'damage:physical') {
    return 'PHYSICAL_DAMAGE';
  }
  if (tag === 'damage:fire') {
    return 'FIRE_DAMAGE';
  }
  if (tag === 'damage:tactical') {
    return 'TACTICAL_DAMAGE';
  }
  return null;
}

function headlineLabelsForClaim(claim: PositionClaim): string[] {
  return claim.requiredPosition === 'vanguard' ? ['Vanguard trait'] : [];
}

function headlinePriority(label: string): number {
  const index = HEADLINE_PRIORITY.indexOf(label);
  return index === -1 ? HEADLINE_PRIORITY.length + 1 : index;
}

function collectUnique(values: Array<string | null | undefined>): string[] {
  const output: string[] = [];
  for (const value of values) {
    if (!value || output.includes(value)) {
      continue;
    }
    output.push(value);
  }
  return output;
}

function providedTags(signal: SynergySignal): SynergyTag[] {
  return signal.tags ?? [signal.tag];
}

function abilityChipLabel(tag: string, hasSpecificControlTag: boolean, abilityTags: EffectTag[]): string | null {
  if (tag === 'CONTROL' && hasSpecificControlTag) {
    return 'Control';
  }

  if (tag === 'PHYSICAL_DAMAGE_RECEIVED_UP' && abilityTags.includes('EXCLUDES_BASIC_ATTACKS')) {
    return 'Increases non-Basic Physical Damage Received';
  }

  return ABILITY_SUMMARY_LABELS[tag] ?? null;
}

function abilityPlainLabel(tag: string, hasSpecificControlTag: boolean, abilityTags: EffectTag[]): string | null {
  if (tag === 'CONTROL' && hasSpecificControlTag) {
    return null;
  }

  return abilityChipLabel(tag, false, abilityTags);
}

function joinClauses(values: string[]): string {
  if (values.length === 0) {
    return 'Verified wording available below.';
  }
  if (values.length === 1) {
    return `${values[0]}.`;
  }
  if (values.length === 2) {
    return `${values[0]} and ${values[1]}.`;
  }
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}.`;
}
