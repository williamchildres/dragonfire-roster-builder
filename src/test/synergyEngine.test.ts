import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { defaultSynergyRules } from '../data/synergyRules';
import {
  analyzeTeam,
  calculateDataConfidence,
  findAffinityCoverage,
  findTeamConflicts,
  findEffectInteractions,
} from '../services/synergyEngine';
import { fictionalDragon } from './fixtures';

describe('synergy engine', () => {
  it('returns a null score for production dragons with insufficient verified data', () => {
    const result = analyzeTeam(['syrax', 'vhagar', 'caraxes'], dragons, defaultSynergyRules);

    expect(result.score).toBeNull();
    expect(result.confidence).toBe('none');
    expect(result.missingData).toHaveLength(3);
  });

  it('finds synthetic positive synergy without exposing fictional data to production', () => {
    const ember = fictionalDragon('ember-test', 'Ember Test', ['BURN']);
    const cinder = fictionalDragon('cinder-test', 'Cinder Test', ['SINGLE_TARGET_DAMAGE']);
    const interactions = findEffectInteractions([ember, cinder], defaultSynergyRules);

    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.dragonIds).toEqual(['ember-test', 'cinder-test']);
    expect(interactions[0]?.description).toContain('Burn setup and payoff');
  });

  it('detects synthetic conflicts', () => {
    const first = fictionalDragon('first-vanguard', 'First Vanguard', ['VANGUARD']);
    const second = fictionalDragon('second-vanguard', 'Second Vanguard', ['VANGUARD']);

    expect(findTeamConflicts([first, second], defaultSynergyRules)[0]?.title).toBe(
      'Vanguard position conflict',
    );
  });

  it('calculates confidence and affinity coverage from verified synthetic data', () => {
    const first = fictionalDragon('first', 'First', ['SHIELD']);
    const second = fictionalDragon('second', 'Second', ['BUFF_STRENGTH']);

    expect(calculateDataConfidence([first, second])).toBe('high');
    expect(findAffinityCoverage([first, second])[0]).toMatchObject({
      troopType: 'Cavalry',
      positive: 2,
    });
    expect(analyzeTeam(['first', 'second'], [first, second], defaultSynergyRules).score).toBe(20);
  });
});
