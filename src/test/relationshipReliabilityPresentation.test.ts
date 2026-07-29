import { describe, expect, it } from 'vitest';

import {
  candidateAbilityLabels,
  mixedUseLabels,
  semanticTagLabel,
  signalLabel,
} from '../app/relationshipReliabilityPresentation';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { rateFormationV3 } from '../services/formationRatingV3';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  reliabilityProgressionFromOwnedDragon,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability';
import type {
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';

const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));

describe('relationship reliability presentation', () => {
  it('uses canonical ability and semantic labels instead of signal IDs', () => {
    const relationship = shadowsongRelationship();
    const trace = relationship.candidateTraces.find(
      (candidate) => candidate.candidate.id === relationship.selectedCandidateId,
    )!;
    const provider = signalLabel(trace, 'provider', dragonsById);
    const beneficiary = signalLabel(trace, 'beneficiary', dragonsById);
    expect(provider).toContain(
      candidateAbilityLabels(trace, 'provider', dragonsById)[0],
    );
    expect(beneficiary).toContain(
      candidateAbilityLabels(trace, 'beneficiary', dragonsById)[0],
    );
    expect(`${provider} ${beneficiary}`).not.toContain(trace.provider.signalId);
    expect(`${provider} ${beneficiary}`).not.toContain(trace.beneficiary.signalId);
    expect(semanticTagLabel(relationship)).toBe('Panic');
  });

  it('labels simultaneous Shadowsong uses with canonical ability names', () => {
    const relationship = shadowsongRelationship();
    const trace = relationship.candidateTraces.find(
      (candidate) => candidate.candidate.id === relationship.selectedCandidateId,
    )!;
    const uses = mixedUseLabels(trace.beneficiary, dragonsById);
    expect(uses.map((use) => use.label)).toEqual([
      'Shadowsong — Breath of Fire',
      'Shadowsong — Scorched Earth',
    ]);
    expect(uses.filter((use) => use.selected)).toHaveLength(1);
  });
});

function shadowsongRelationship() {
  const formation: SimpleFormation = {
    'left-flank': 'daemoros',
    vanguard: 'shadowsong',
    'right-flank': 'caraxes',
  };
  const dragonIds = ['daemoros', 'shadowsong', 'caraxes'] as const;
  const progression: SimpleProgressionByDragonId = Object.fromEntries(
    dragonIds.map((dragonId) => [
      dragonId,
      { starRank: 10, dragonLevel: 16 },
    ]),
  );
  const reliabilityProgression: ReliabilityProgressionByDragonId = Object.fromEntries(
    dragonIds.map((dragonId) => {
      const dragon = dragonsById.get(dragonId)!;
      const owned: OwnedDragon = {
        dragonId,
        owned: true,
        starRank: 10,
        reignLevel: 16,
        notes: '',
        habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 5])),
      };
      return [dragonId, reliabilityProgressionFromOwnedDragon(dragon, owned)];
    }),
  );
  return rateFormationV3({
    formation,
    dragons,
    profiles: simpleSynergyProfiles,
    progression,
    reliabilityProgression,
  }).relationships.find(
    (relationship) =>
      relationship.providerDragonId === 'daemoros' &&
      relationship.beneficiaryDragonId === 'shadowsong' &&
      relationship.semanticTag === 'status:panic',
  )!;
}
