import type { AbilityDefinition } from '../models/dragon';
import type { DragonSynergyProfile, PositionClaim, SynergySignal } from '../synergy/types';

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

const OUTPUT_LABELS: Partial<Record<string, string>> = {
  'status:panic': 'Panic',
  'status:burn': 'Burn',
  'status:confusion': 'Confusion',
  'status:stun': 'Stun',
  'status:slow': 'Slow',
  'status:taunt': 'Taunt',
  'status:control': 'Control',
  'status:vulnerable': 'Vulnerable',
  'status:first-strike': 'First-Strike',
  'effect:recovery': 'Recovery',
  'damage:physical': 'Physical Damage',
  'damage:fire': 'Fire Damage',
  'damage:tactical': 'Tactical Damage',
};

const SUPPORT_LABELS: Partial<Record<string, string>> = {
  'damage:fire': 'Fire Damage support',
  'damage:physical': 'Physical Damage support',
  'damage:tactical': 'Tactical Damage support',
  'effect:recovery': 'Recovery support',
  'stat:strength': 'Strength support',
  'stat:instinct': 'Instinct support',
  'stat:intelligence': 'Intelligence support',
  'stat:initiative': 'Initiative support',
};

const BENEFIT_LABELS: Partial<Record<string, string>> = {
  'status:first-strike': 'First-Strike',
  'status:slow': 'Slow',
  'effect:recovery': 'Recovery',
  'stat:strength': 'Strength support',
  'stat:instinct': 'Instinct support',
  'stat:intelligence': 'Intelligence support',
  'stat:initiative': 'Initiative support',
};

const ABILITY_SUMMARY_LABELS: Partial<Record<string, string>> = {
  BURN: 'Applies Burn',
  PANIC: 'Applies Panic',
  CONFUSION: 'Applies Confusion',
  STUN: 'Applies Stun',
  SLOW: 'Applies Slow',
  OVERWHELM: 'Applies Overwhelm',
  VULNERABLE: 'Applies Vulnerable',
  CONTROL: 'Applies Control',
  FIRST_STRIKE: 'Grants First-Strike',
  RECOVERY: 'Provides Recovery',
  FIRE_DAMAGE: 'Deals Fire Damage',
  PHYSICAL_DAMAGE: 'Deals Physical Damage',
  TACTICAL_DAMAGE: 'Deals Tactical Damage',
  FIRE_DAMAGE_UP: 'Boosts Fire Damage',
  PHYSICAL_DAMAGE_UP: 'Boosts Physical Damage',
  TACTICAL_DAMAGE_UP: 'Boosts Tactical Damage',
  STRENGTH_UP: 'Boosts Strength',
  INTELLIGENCE_UP: 'Boosts Intelligence',
  INSTINCT_UP: 'Boosts Instinct',
  BUFF_INITIATIVE: 'Boosts Initiative',
  INITIATIVE_UP: 'Boosts Initiative',
  DAMAGE_RECEIVED_DOWN: 'Reduces Damage Received',
  DAMAGE_RECEIVED_UP: 'Increases Damage Received',
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
};

const HEADLINE_PRIORITY = [
  'Panic',
  'Burn',
  'Physical Damage',
  'Fire Damage',
  'Tactical Damage',
  'First-Strike',
  'Recovery',
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
  'Confusion',
];

const SUMMARY_PRIORITY = [
  'PHYSICAL_DAMAGE',
  'FIRE_DAMAGE',
  'TACTICAL_DAMAGE',
  'BURN',
  'PANIC',
  'CONFUSION',
  'FIRST_STRIKE',
  'RECOVERY',
  'STUN',
  'SLOW',
  'CONTROL',
  'VULNERABLE',
  'OVERWHELM',
  'DAMAGE_RECEIVED_DOWN',
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
        ...describeSignals(profile.outputs, OUTPUT_LABELS),
        ...describeSignals(profile.supports, SUPPORT_LABELS),
      ])
    : [];
  const benefitsFrom = profile ? collectUnique(describeSignals(profile.benefitsFrom, BENEFIT_LABELS)) : [];
  const placementNotes = profile ? collectUnique(describePlacementNotes(profile)) : [];
  const headerLine = profile ? buildHeadlineLine(profile) : 'Metadata-only record. Ability details not yet verified.';

  return {
    headerLine,
    metadataNotice: profile ? null : 'Metadata-only record. Ability details not yet verified.',
    provides,
    benefitsFrom,
    placementNotes,
  };
}

export function summarizeAbility(ability: AbilityDefinition): AbilitySummaryPresentation {
  const technicalTags = ability.tags.map((tag) => tag);
  const summaryCandidates = ability.tags
    .filter((tag) => SUMMARY_PRIORITY.includes(tag))
    .map((tag) => ABILITY_SUMMARY_LABELS[tag] ?? null)
    .filter((label): label is string => Boolean(label));
  const chips = collectUnique(summaryCandidates).slice(0, 5);
  const plainSummary = chips.length > 0 ? joinClauses(chips.slice(0, 3)) : 'Verified wording available below.';

  return {
    plainSummary,
    chips,
    technicalTags,
  };
}

function describeSignals(
  signals: SynergySignal[],
  labels: Partial<Record<string, string>> = OUTPUT_LABELS,
): string[] {
  return collectUnique(
    signals.flatMap((signal) =>
      [signal.tag, ...(signal.tags ?? [])]
        .map((tag) => labels[tag] ?? null)
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
  const label = OUTPUT_LABELS[signal.tag] ?? null;
  if (!label) {
    return [];
  }
  return [label];
}

function headlineLabelsForSupport(signal: SynergySignal): string[] {
  const label = SUPPORT_LABELS[signal.tag] ?? null;
  if (!label) {
    return [];
  }
  return [label];
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
