import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { createShareHash, parseSharedTeam, preventDuplicateSelection } from '../services/teamShare';

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
});
