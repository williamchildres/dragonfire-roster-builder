import { describe, expect, it } from 'vitest';

import {
  formationRequirementSatisfied,
  isValidFormationRequirement,
} from '../synergy/formationRequirements';
import type { FormationRequirement, SimpleFormation } from '../synergy/types';

const sentinelRequirement: FormationRequirement = {
  kind: 'other-ally-breed-present',
  breed: 'Sentinel',
};

function formation(left: string, vanguard: string, right: string): SimpleFormation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

describe('formation requirements', () => {
  it('validates the reusable other-ally breed contract', () => {
    expect(isValidFormationRequirement(sentinelRequirement)).toBe(true);
    expect(isValidFormationRequirement({
      kind: 'other-ally-breed-present',
      breed: 'Dragon',
    } as unknown as FormationRequirement)).toBe(false);
  });

  it('requires another allied dragon of the requested breed and never counts the owner', () => {
    expect(formationRequirementSatisfied({
      requirement: sentinelRequirement,
      ownerDragonId: 'vesper',
      formation: formation('vesper', 'caraxes', 'vhagar'),
    })).toBe(false);
    expect(formationRequirementSatisfied({
      requirement: sentinelRequirement,
      ownerDragonId: 'moondancer',
      formation: formation('vesper', 'caraxes', 'moondancer'),
    })).toBe(true);
    expect(formationRequirementSatisfied({
      requirement: sentinelRequirement,
      ownerDragonId: 'moondancer',
      formation: formation('vesper', 'dawnseeker', 'moondancer'),
    })).toBe(true);
  });

  it('leaves signals without a formation requirement unchanged', () => {
    expect(formationRequirementSatisfied({
      requirement: undefined,
      ownerDragonId: 'moondancer',
      formation: formation('vhagar', 'caraxes', 'moondancer'),
    })).toBe(true);
  });
});
