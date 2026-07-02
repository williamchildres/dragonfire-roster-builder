import type { Dragon } from '../models/dragon';
import type { SimpleFormation, SimpleSynergyResult } from './types';

export interface SimpleFormationPresentation {
  activeSynergies: SimpleSynergyResult[];
  missingEnablers: SimpleSynergyResult[];
  placementIssues: SimpleSynergyResult[];
  positionConflicts: SimpleSynergyResult[];
  futureUnlocks: SimpleSynergyResult[];
  mappedDragonIds: string[];
  unmappedDragonIds: string[];
  selectedDragonIds: string[];
}

export function buildSimpleFormationPresentation({
  formation,
  dragons,
  mappedProfileIds,
  results,
}: {
  formation: SimpleFormation;
  dragons: Dragon[];
  mappedProfileIds: Set<string>;
  results: SimpleSynergyResult[];
}): SimpleFormationPresentation {
  const knownDragonIds = new Set(dragons.map((dragon) => dragon.id));
  const selectedDragonIds = Object.values(formation).filter(
    (dragonId): dragonId is string => typeof dragonId === 'string' && knownDragonIds.has(dragonId),
  );

  return {
    activeSynergies: results.filter((result) => result.kind === 'setup-payoff' || result.kind === 'amplifier-output'),
    missingEnablers: results.filter((result) => result.kind === 'missing-enabler'),
    placementIssues: results.filter((result) => result.kind === 'position-blocked'),
    positionConflicts: results.filter((result) => result.kind === 'position-conflict'),
    futureUnlocks: results.filter((result) => result.kind === 'progression-locked'),
    mappedDragonIds: selectedDragonIds.filter((dragonId) => mappedProfileIds.has(dragonId)),
    unmappedDragonIds: selectedDragonIds.filter((dragonId) => !mappedProfileIds.has(dragonId)),
    selectedDragonIds,
  };
}
