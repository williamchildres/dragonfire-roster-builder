import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import {
  createFormationShareHash,
  createShareHash,
  emptyFormation,
  parseSharedFormation,
  parseSharedTeam,
  preventDuplicateFormationPlacement,
  preventDuplicateSelection,
} from '../services/teamShare';

describe('team sharing and duplicate prevention', () => {
  it('prevents duplicate selections across team slots', () => {
    const team = ['syrax', null, null];

    expect(preventDuplicateSelection(team, 1, 'syrax')).toEqual(team);
    expect(preventDuplicateSelection(team, 1, 'vhagar')).toEqual(['syrax', 'vhagar', null]);
  });

  it('parses valid shared team IDs and ignores invalid IDs gracefully', () => {
    expect(parseSharedTeam('#team=syrax,not-real,vhagar', dragons)).toEqual(['syrax', null, 'vhagar']);
  });

  it('creates a share hash', () => {
    expect(createShareHash(['syrax', 'vhagar', null])).toBe('#team=syrax,vhagar,');
  });

  it('formation sharing preserves position', () => {
    const formation = {
      'left-flank': 'syrax',
      vanguard: 'malachite',
      'right-flank': 'vhagar',
    };

    expect(createFormationShareHash(formation)).toBe(
      '#formation=left-flank:syrax,vanguard:malachite,right-flank:vhagar',
    );
    expect(parseSharedFormation(createFormationShareHash(formation), dragons)).toEqual(formation);
  });

  it('prevents duplicate dragon placement in formation positions', () => {
    const formation = { ...emptyFormation(), vanguard: 'malachite' };

    expect(preventDuplicateFormationPlacement(formation, 'left-flank', 'malachite')).toEqual(formation);
    expect(preventDuplicateFormationPlacement(formation, 'left-flank', 'syrax')).toEqual({
      'left-flank': 'syrax',
      vanguard: 'malachite',
      'right-flank': null,
    });
  });
});
