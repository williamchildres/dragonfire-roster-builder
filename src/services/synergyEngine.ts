import { FORMATION_POSITIONS, TROOP_TYPES, type Dragon, type FormationPosition } from '../models/dragon';
import type {
  AffinityCoverage,
  BreedDistribution,
  DataConfidence,
  ExplanationItem,
  FormationAnalysisInput,
  MissingDataItem,
  SynergyResult,
  SynergyRule,
} from '../models/synergy';
import { analyzeFormationTraces, dedupeTraceMessages, isNormalSynergyTrace } from './synergyTrace';
import type { TraceOptions } from './synergyTrace';

export function analyzeTeam(
  dragonIds: Array<string | null>,
  dragons: Dragon[],
  rules: SynergyRule[],
): SynergyResult {
  return analyzeFormation(
    {
      'left-flank': dragonIds[0] ?? null,
      vanguard: dragonIds[1] ?? null,
      'right-flank': dragonIds[2] ?? null,
    },
    dragons,
    rules,
  );
}

export function analyzeFormation(
  formation: FormationAnalysisInput,
  dragons: Dragon[],
  rules: SynergyRule[],
  options: TraceOptions = {},
): SynergyResult {
  const formationEntries = FORMATION_POSITIONS.map((position) => ({
    position,
    dragon: formation[position]
      ? dragons.find((dragon) => dragon.id === formation[position])
      : undefined,
  }));
  const team = formationEntries
    .map((entry) => entry.dragon)
    .filter((dragon): dragon is Dragon => Boolean(dragon));
  const missingData = findMissingData(team);
  const traces = analyzeFormationTraces(formation, dragons, options);
  const tracePositives = traces
    .filter((trace) => trace.status === 'active' && trace.effects.length > 0 && isNormalSynergyTrace(trace))
    .map((trace) => ({
      dragonIds: [trace.sourceDragonId, trace.recipientDragonId].filter((id): id is string => Boolean(id)),
      tags: [],
      ruleId: trace.ruleId,
      title: trace.title,
      description: trace.explanation,
      confidence: trace.confidence === 'confirmed' || trace.confidence === 'high' ? ('high' as const) : ('medium' as const),
    }));
  const positives = [...findEffectInteractions(team, rules), ...tracePositives];
  const conflicts = [...findTeamConflicts(team, rules), ...findFormationConflicts(formationEntries)];
  const positionRequirements = findPositionRequirements(formationEntries);
  const unmetRequirements = positionRequirements.filter((item) => item.ruleId.startsWith('unmet-'));
  const confidence = calculateDataConfidence(team);
  const warnings: string[] = [];

  if (team.length < 2) {
    warnings.push('Select at least two dragons before reviewing team interactions.');
  }

  const hasStructuredAnalysis = traces.some((trace) => isNormalSynergyTrace(trace));
  if (missingData.length > 0 && hasStructuredAnalysis) {
    warnings.push(
      'Partial analysis generated. Some interactions depend on locked abilities, chance, target selection, or unresolved formulas.',
    );
  } else if (missingData.length > 0) {
    warnings.push(
      'Synergy analysis is unavailable because one or more selected dragons do not yet have verified Command, Habit, affinity, or effect-tag data.',
    );
  }

  if (team.some((dragon) => dragon.id === 'sheepstealer')) {
    warnings.push('Sheepstealer Stolen Flock has a non-player food-tile schedule; PvP behavior remains separate.');
  }

  return {
    score: null,
    confidence,
    positives,
    conflicts,
    positionRequirements: positionRequirements.filter((item) => !item.ruleId.startsWith('unmet-')),
    unmetRequirements,
    unresolvedAssumptions: dedupeTraceMessages([
      ...team.flatMap((dragon) => dragon.unresolvedQuestions),
      ...traces.flatMap((trace) => trace.unresolvedQuestions),
    ]),
    warnings,
    missingData,
    traces,
  };
}

export function calculateDataConfidence(team: Dragon[]): DataConfidence {
  if (team.length === 0) {
    return 'none';
  }

  const complete = team.filter((dragon) => findMissingFields(dragon).length === 0).length;
  if (complete === 0) {
    return 'none';
  }

  const ratio = complete / team.length;
  if (ratio === 1) {
    return 'high';
  }
  if (ratio >= 2 / 3) {
    return 'medium';
  }
  return 'low';
}

export function findEffectInteractions(team: Dragon[], rules: SynergyRule[]): ExplanationItem[] {
  return rules
    .filter((rule) => rule.kind === 'positive')
    .flatMap((rule) => buildExplanationsForRule(team, rule));
}

export function findTeamConflicts(team: Dragon[], rules: SynergyRule[]): ExplanationItem[] {
  return rules
    .filter((rule) => rule.kind === 'conflict')
    .flatMap((rule) => buildExplanationsForRule(team, rule));
}

export function findBreedDistribution(team: Dragon[]): BreedDistribution[] {
  const counts = new Map<Dragon['breed'], number>();
  for (const dragon of team) {
    counts.set(dragon.breed, (counts.get(dragon.breed) ?? 0) + 1);
  }

  return [...counts.entries()].map(([breed, count]) => ({ breed, count }));
}

export function findAffinityCoverage(team: Dragon[]): AffinityCoverage[] {
  return TROOP_TYPES.map((troopType) => {
    const coverage = { troopType, positive: 0, neutral: 0, negative: 0, unknown: 0 };
    for (const dragon of team) {
      coverage[dragon.affinities[troopType]] += 1;
    }
    return coverage;
  });
}

export function findMissingData(team: Dragon[]): MissingDataItem[] {
  return team
    .map((dragon) => ({ dragonId: dragon.id, fields: findMissingFields(dragon) }))
    .filter((item) => item.fields.length > 0);
}

function findMissingFields(dragon: Dragon): MissingDataItem['fields'] {
  const fields: MissingDataItem['fields'] = [];
  if (!dragon.command) {
    fields.push('command');
  }
  if (dragon.habits.length === 0) {
    fields.push('habits');
  }
  if (Object.values(dragon.affinities).some((level) => level === 'unknown')) {
    fields.push('affinities');
  }
  if (Object.values(dragon.stats).some((value) => value === null)) {
    fields.push('stats');
  }
  if (dragon.tags.length === 0) {
    fields.push('tags');
  }
  return fields;
}

function findPositionRequirements(
  formationEntries: Array<{ position: FormationPosition; dragon: Dragon | undefined }>,
): ExplanationItem[] {
  const entries = formationEntries.filter(
    (entry): entry is { position: FormationPosition; dragon: Dragon } => Boolean(entry.dragon),
  );
  const items: ExplanationItem[] = [];
  const dragonByPosition = new Map(entries.map((entry) => [entry.position, entry.dragon]));

  for (const { dragon, position } of entries) {
    const abilities = [dragon.command, dragon.trait, ...dragon.habits].filter(
      (ability): ability is NonNullable<typeof ability> => Boolean(ability),
    );
    for (const ability of abilities) {
      if (!ability.positionRequirement) {
        continue;
      }
      const met = ability.positionRequirement === position;
      items.push({
        dragonIds: [dragon.id],
        tags: ability.tags,
        ruleId: `${met ? 'met' : 'unmet'}-${ability.id}-${ability.positionRequirement}`,
        title: `${ability.name} position requirement`,
        description: `${dragon.name} ${met ? 'meets' : 'does not meet'} ${ability.name}'s ${formatPosition(ability.positionRequirement)} requirement.`,
        confidence: ability.verification.status === 'screenshot-verified' ? 'medium' : 'low',
      });
    }
  }

  const malachite = entries.find((entry) => entry.dragon.id === 'malachite');
  const leftFlank = dragonByPosition.get('left-flank');
  if (malachite?.position === 'vanguard' && leftFlank) {
    items.push({
      dragonIds: ['malachite', leftFlank.id],
      tags: ['FIRE_DAMAGE_UP', 'LEFT_FLANK_TARGET'],
      ruleId: 'malachite-left-flank-fire-damage',
      title: "Sentinel's Presence Left Flank bonus",
      description:
        "Malachite in Vanguard can increase Fire Damage Dealt for the ally deployed in Left Flank. Whether that ally has verified Fire Damage usage may still be unknown.",
      confidence: 'medium',
    });
  }

  return items;
}

function findFormationConflicts(
  formationEntries: Array<{ position: FormationPosition; dragon: Dragon | undefined }>,
): ExplanationItem[] {
  const entries = formationEntries.filter(
    (entry): entry is { position: FormationPosition; dragon: Dragon } => Boolean(entry.dragon),
  );
  const vanguardRequired = entries.filter((entry) =>
    [entry.dragon.command, entry.dragon.trait, ...entry.dragon.habits]
      .filter((ability): ability is NonNullable<typeof ability> => Boolean(ability))
      .some((ability) => ability.positionRequirement === 'vanguard'),
  );

  if (vanguardRequired.length < 2) {
    return [];
  }

  return [
    {
      dragonIds: vanguardRequired.map((entry) => entry.dragon.id),
      tags: ['VANGUARD_REQUIRED'],
      ruleId: 'verified-vanguard-position-conflict',
      title: 'Multiple Vanguard requirements',
      description:
        'More than one selected dragon has verified effects that require the exclusive Vanguard position, so at least one requirement will be unmet.',
      confidence: 'medium',
    },
  ];
}

function formatPosition(position: FormationPosition): string {
  return position
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildExplanationsForRule(team: Dragon[], rule: SynergyRule): ExplanationItem[] {
  const matchedDragons = team.filter((dragon) =>
    rule.requiresTags.some((tag) => dragon.tags.includes(tag)),
  );
  const coveredTags = new Set(matchedDragons.flatMap((dragon) => dragon.tags));
  const hasAllTags = rule.requiresTags.every((tag) => coveredTags.has(tag));

  if (!hasAllTags) {
    return [];
  }

  if (rule.nonStacking && matchedDragons.length < 2) {
    return [];
  }

  return [
    {
      dragonIds: matchedDragons.map((dragon) => dragon.id),
      tags: rule.requiresTags,
      ruleId: rule.id,
      title: rule.title,
      description: `${matchedDragons.map((dragon) => dragon.name).join(', ')} triggered ${rule.title}: ${rule.description}`,
      confidence: rule.evidenceStatus === 'officially-confirmed' ? 'high' : 'medium',
    },
  ];
}
