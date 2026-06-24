import {
  FORMATION_POSITIONS,
  type AbilityEffect,
  type CasterEligibility,
  type Dragon,
  type EffectSourceScope,
  type FormationPosition,
} from '../models/dragon';
import type { FormationAnalysisInput } from '../models/synergy';

export const FORMATION_ADJACENCY: Record<FormationPosition, FormationPosition[]> = {
  'left-flank': ['vanguard'],
  vanguard: ['left-flank', 'right-flank'],
  'right-flank': ['vanguard'],
};

export const THRESHOLD_BOUNDARY_NOTE =
  "Exactly 50% is not covered by the displayed 'above' or 'below' wording. This is a conservative textual interpretation and has not yet been confirmed in combat logs.";

export function getAdjacentPositions(position: FormationPosition): FormationPosition[] {
  return [...FORMATION_ADJACENCY[position]];
}

export function arePositionsAdjacent(positionA: FormationPosition, positionB: FormationPosition): boolean {
  return FORMATION_ADJACENCY[positionA].includes(positionB);
}

export function getAdjacentDragons(
  formation: FormationAnalysisInput,
  position: FormationPosition,
  dragons: Dragon[],
): Dragon[] {
  return getAdjacentPositions(position)
    .map((adjacentPosition) => formation[adjacentPosition])
    .map((dragonId) => dragons.find((dragon) => dragon.id === dragonId))
    .filter((dragon): dragon is Dragon => Boolean(dragon));
}

export function validateFormationAdjacencySymmetry(): boolean {
  return FORMATION_POSITIONS.every((position) =>
    FORMATION_ADJACENCY[position].every((adjacentPosition) =>
      FORMATION_ADJACENCY[adjacentPosition].includes(position),
    ),
  );
}

export function resolveThreeAllyTargets(
  formation: FormationAnalysisInput,
): Array<{ position: FormationPosition; dragonId: string }> {
  return FORMATION_POSITIONS.map((position) => ({
    position,
    dragonId: formation[position],
  })).filter((entry): entry is { position: FormationPosition; dragonId: string } =>
    Boolean(entry.dragonId),
  );
}

export function inferCasterEligibility(targetText: string): CasterEligibility {
  const normalized = targetText.toLowerCase();
  if (/\bother\s+all(?:y|ies)\b/.test(normalized) || /\bother\s+\d*\s*all(?:y|ies)\b/.test(normalized)) {
    return 'excluded';
  }
  if (/\ball(?:y|ies)\b/.test(normalized)) {
    return 'eligible-if-targeting-allows';
  }
  return 'unknown';
}

export function canTargetCasterByLanguage(effect: AbilityEffect): boolean | null {
  const eligibility = effect.casterEligibility ?? inferCasterEligibility(effect.target);
  if (eligibility === 'included') {
    return true;
  }
  if (eligibility === 'excluded') {
    return false;
  }
  if (eligibility === 'eligible-if-targeting-allows') {
    return true;
  }
  return null;
}

export function canTargetCasterWithScope(effect: AbilityEffect): boolean | null {
  const languageAllowsCaster = canTargetCasterByLanguage(effect);
  if (languageAllowsCaster === false) {
    return false;
  }
  if (effect.targetScope === 'self') {
    return true;
  }
  if (effect.targetScope === 'within-adjacency') {
    return false;
  }
  return languageAllowsCaster;
}

export function resolveAllyTargets(
  formation: FormationAnalysisInput,
  sourcePosition: FormationPosition,
  effect: AbilityEffect,
): Array<{ position: FormationPosition; dragonId: string }> {
  if (effect.targetScope === 'self') {
    const dragonId = formation[sourcePosition];
    return dragonId ? [{ position: sourcePosition, dragonId }] : [];
  }
  if (effect.targetScope === 'within-adjacency') {
    return getAdjacentPositions(sourcePosition)
      .map((position) => ({ position, dragonId: formation[position] }))
      .filter((entry): entry is { position: FormationPosition; dragonId: string } => Boolean(entry.dragonId));
  }
  if (effect.casterEligibility === 'excluded' || inferCasterEligibility(effect.target) === 'excluded') {
    return resolveOtherAllyTargets(formation, sourcePosition);
  }
  return FORMATION_POSITIONS.map((position) => ({ position, dragonId: formation[position] }))
    .filter((entry): entry is { position: FormationPosition; dragonId: string } => Boolean(entry.dragonId));
}

export function resolveOtherAllyTargets(
  formation: FormationAnalysisInput,
  sourcePosition: FormationPosition,
): Array<{ position: FormationPosition; dragonId: string }> {
  return FORMATION_POSITIONS.filter((position) => position !== sourcePosition)
    .map((position) => ({ position, dragonId: formation[position] }))
    .filter((entry): entry is { position: FormationPosition; dragonId: string } =>
      Boolean(entry.dragonId),
    );
}

export function isAboveThreshold(valuePercent: number, thresholdPercent: number): boolean {
  return valuePercent > thresholdPercent;
}

export function isBelowThreshold(valuePercent: number, thresholdPercent: number): boolean {
  return valuePercent < thresholdPercent;
}

export function normalizeDamageSourceScope({
  effectType,
  explicitSourceScope,
  excludes = [],
}: {
  effectType: string;
  explicitSourceScope?: EffectSourceScope;
  excludes?: string[];
}): EffectSourceScope {
  if (explicitSourceScope && explicitSourceScope !== 'unknown') {
    return explicitSourceScope;
  }
  const lowerType = effectType.toLowerCase();
  const lowerExcludes = excludes.map((exclude) => exclude.toLowerCase());
  if (!lowerType.includes('damage dealt') && !lowerType.includes('damage up')) {
    return explicitSourceScope ?? 'unknown';
  }
  if (lowerExcludes.some((exclude) => exclude.includes('basic attack'))) {
    return 'non-basic-attacks';
  }
  return 'all-sources';
}

export function sourceScopeIncludesBasicAttacks(sourceScope: EffectSourceScope): boolean {
  return sourceScope === 'all-sources' || sourceScope === 'basic-attacks';
}

export function sourceScopeIncludesCommandsAndHabits(sourceScope: EffectSourceScope): boolean {
  return sourceScope === 'all-sources' || sourceScope === 'commands-and-habits' || sourceScope === 'commands' || sourceScope === 'habits';
}
