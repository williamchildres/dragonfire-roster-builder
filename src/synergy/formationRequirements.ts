import { dragons } from '../data/dragons';
import type { DragonBreed } from '../models/dragon';
import type { FormationRequirement, SimpleFormation } from './types';

const VALID_BREEDS = new Set<DragonBreed>([
  'Champion',
  'Hunter',
  'Sentinel',
  'Warrior',
]);

export function isValidFormationRequirement(
  requirement: FormationRequirement,
): boolean {
  return requirement.kind === 'other-ally-breed-present' &&
    VALID_BREEDS.has(requirement.breed);
}

export function formationRequirementSatisfied({
  requirement,
  ownerDragonId,
  formation,
}: {
  requirement: FormationRequirement | undefined;
  ownerDragonId: string;
  formation: SimpleFormation;
}): boolean {
  if (!requirement) return true;

  switch (requirement.kind) {
    case 'other-ally-breed-present': {
      const breedByDragonId = new Map(dragons.map((dragon) => [dragon.id, dragon.breed]));
      return Object.values(formation).some(
        (dragonId) =>
          dragonId !== null &&
          dragonId !== ownerDragonId &&
          breedByDragonId.get(dragonId) === requirement.breed,
      );
    }
  }
}
