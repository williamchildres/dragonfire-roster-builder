import { describe, expect, it } from 'vitest';
import {
  buildSemanticRelationships,
  canonicalSemanticTag,
  semanticRelationshipId,
} from '../synergy/semanticRelationships';
import type { SimpleSynergyResult } from '../synergy/types';
import type { SynergyTag } from '../synergy/tags';

function result(
  id: string,
  kind: SimpleSynergyResult['kind'],
  tag: SynergyTag,
  provider: string,
  beneficiary: string,
  abilityIds = [`${provider}-ability`, `${beneficiary}-ability`],
): SimpleSynergyResult {
  return {
    id,
    kind,
    tag,
    dragonIds: [provider, beneficiary],
    abilityIds,
    explanation: `${provider} supports ${beneficiary} through ${tag}.`,
  };
}

describe('canonical semantic relationships', () => {
  it('classifies setup, output amplification, and stat support with fixed base values', () => {
    const relationships = buildSemanticRelationships([
      result('setup', 'setup-payoff', 'status:burn', 'a', 'b'),
      result('amplifier', 'amplifier-output', 'damage:fire', 'a', 'c'),
      result('stat', 'amplifier-output', 'stat:strength', 'b', 'c'),
    ]);

    expect(relationships.map(({ relationshipClass, baseValue }) => [relationshipClass, baseValue])).toEqual([
      ['output-amplification', 6],
      ['conditional-payoff', 10],
      ['stat-support', 5],
    ]);
  });

  it('uses only provider, canonical tag, and beneficiary as semantic identity', () => {
    const relationships = buildSemanticRelationships([
      result('setup-one', 'setup-payoff', 'status:burn', 'a', 'b', ['a-one', 'b-one']),
      result('setup-two', 'setup-payoff', 'status:burn', 'a', 'b', ['a-two', 'b-two']),
    ]);

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      id: semanticRelationshipId('a', 'status:burn', 'b'),
      abilityIds: ['a-one', 'a-two', 'b-one', 'b-two'],
      sourceResultIds: ['setup-one', 'setup-two'],
    });
  });

  it('canonicalizes Control aliases and keeps the highest-value class once', () => {
    expect(canonicalSemanticTag('status:stagger')).toBe('status:control');
    expect(canonicalSemanticTag('status:stun')).toBe('status:control');
    const [relationship] = buildSemanticRelationships([
      result('amp', 'amplifier-output', 'status:stagger', 'a', 'b'),
      result('setup', 'setup-payoff', 'status:control', 'a', 'b'),
    ]);

    expect(relationship).toMatchObject({
      id: 'relationship:a:status:control:b',
      relationshipClass: 'conditional-payoff',
      baseValue: 10,
      sourceResultIds: ['amp', 'setup'],
    });
  });

  it('keeps generic and specific damage tags distinct without expanding damage:any', () => {
    const relationships = buildSemanticRelationships([
      result('any', 'amplifier-output', 'damage:any', 'a', 'b'),
      result('fire', 'amplifier-output', 'damage:fire', 'a', 'b'),
      result('tactical', 'amplifier-output', 'damage:tactical', 'a', 'b'),
    ]);

    expect(relationships.map((relationship) => relationship.semanticTag)).toEqual([
      'damage:any',
      'damage:fire',
      'damage:tactical',
    ]);
  });

  it('creates distinct edges when one provider supports multiple beneficiaries', () => {
    const relationships = buildSemanticRelationships([
      result('a-b', 'amplifier-output', 'damage:fire', 'a', 'b'),
      result('a-c', 'amplifier-output', 'damage:fire', 'a', 'c'),
    ]);

    expect(relationships.map((relationship) => relationship.id)).toEqual([
      'relationship:a:damage:fire:b',
      'relationship:a:damage:fire:c',
    ]);
  });

  it('values redundant providers at 100%, 50%, and 0% in stable provider order', () => {
    const input = [
      result('z', 'amplifier-output', 'damage:fire', 'z-provider', 'target'),
      result('a', 'amplifier-output', 'damage:fire', 'a-provider', 'target'),
      result('m', 'amplifier-output', 'damage:fire', 'm-provider', 'target'),
    ];
    const forward = buildSemanticRelationships(input);
    const reversed = buildSemanticRelationships([...input].reverse());

    expect(forward).toEqual(reversed);
    expect(forward.map(({ providerDragonId, redundancyRank, marginalValue }) => ({
      providerDragonId,
      redundancyRank,
      marginalValue,
    }))).toEqual([
      { providerDragonId: 'a-provider', redundancyRank: 1, marginalValue: 6 },
      { providerDragonId: 'm-provider', redundancyRank: 2, marginalValue: 3 },
      { providerDragonId: 'z-provider', redundancyRank: 3, marginalValue: 0 },
    ]);
  });

  it('excludes locked, blocked, missing, and compatibility conflict evidence from active edges', () => {
    const excludedKinds: SimpleSynergyResult['kind'][] = [
      'progression-locked',
      'position-blocked',
      'missing-enabler',
      'position-conflict',
    ];
    const relationships = buildSemanticRelationships(
      excludedKinds.map((kind) => result(kind, kind, 'status:burn', 'a', 'b')),
    );

    expect(relationships).toEqual([]);
  });
});
