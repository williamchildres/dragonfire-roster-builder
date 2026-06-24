import { TROOP_TYPES, type Dragon } from '../models/dragon';
import type {
  AffinityCoverage,
  BreedDistribution,
  DataConfidence,
  ExplanationItem,
  MissingDataItem,
  SynergyResult,
  SynergyRule,
} from '../models/synergy';

export function analyzeTeam(
  dragonIds: Array<string | null>,
  dragons: Dragon[],
  rules: SynergyRule[],
): SynergyResult {
  const team = dragonIds
    .map((id) => (id ? dragons.find((dragon) => dragon.id === id) : undefined))
    .filter((dragon): dragon is Dragon => Boolean(dragon));
  const missingData = findMissingData(team);
  const positives = findEffectInteractions(team, rules);
  const conflicts = findTeamConflicts(team, rules);
  const confidence = calculateDataConfidence(team);
  const warnings: string[] = [];

  if (team.length < 2) {
    warnings.push('Select at least two dragons before reviewing team interactions.');
  }

  if (missingData.length > 0) {
    warnings.push(
      'Synergy analysis is unavailable because one or more selected dragons do not yet have verified Command, Habit, affinity, or effect-tag data.',
    );
  }

  const score = confidence === 'none' || missingData.length > 0 ? null : Math.max(0, positives.length * 20 - conflicts.length * 15);

  return {
    score,
    confidence,
    positives,
    conflicts,
    warnings,
    missingData,
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
