import { describe, expect, it } from 'vitest';
import { historicalFormationRatingV2Profiles } from '../audit/historicalFormationRatingV2Profiles';
import { buildTargetingResolutionFindings } from '../services/formationFindings';
import { evaluateFormation, evaluateFormationCandidates } from '../synergy/evaluateFormation';
import { simpleSynergyProfiles } from '../synergy/profiles';
import { evaluateFormationRelationshipsV3 } from '../synergy/reliability/scoring';
import type {
  DragonSynergyProfile,
  SimpleFormation,
  SimpleProgressionByDragonId,
  SynergySignal,
} from '../synergy/types';

const selectedProfiles = (ids: string[]) =>
  simpleSynergyProfiles.filter((profile) => ids.includes(profile.dragonId));

const maxProgression: SimpleProgressionByDragonId = Object.fromEntries(
  simpleSynergyProfiles.map(({ dragonId }) => [dragonId, { starRank: 10, dragonLevel: 16 }]),
);

const reliabilityProgression = Object.fromEntries(
  simpleSynergyProfiles.map(({ dragonId }) => [
    dragonId,
    { starRank: 10, dragonLevel: 16, activeHabitLevels: {} },
  ]),
);

function formation(left: string | null, vanguard: string | null, right: string | null): SimpleFormation {
  return { 'left-flank': left, vanguard, 'right-flank': right };
}

function blazingResolution(result: ReturnType<typeof evaluateFormation>) {
  return result.targetingResolutions.find(
    ({ selectionGroupId }) => selectionGroupId === 'syrax-blazing-fury-recipient',
  )!;
}

describe('Syrax Blazing Fury capability-priority recipient targeting', () => {
  it('resolves Caraxes as the unique Fire target and retains both sibling effects at one shared 20% event', () => {
    const current = formation('syrax', 'caraxes', 'vhagar');
    const profiles = selectedProfiles(['syrax', 'caraxes', 'vhagar']);
    const evaluated = evaluateFormation({ formation: current, progression: maxProgression, profiles });
    expect(blazingResolution(evaluated)).toEqual({
      selectorKind: 'capability-priority-one',
      selectionGroupId: 'syrax-blazing-fury-recipient',
      status: 'resolved',
      selectedRecipientId: 'caraxes',
      eligibleRecipientIds: ['caraxes', 'syrax', 'vhagar'],
      priorityRecipientIds: ['caraxes'],
      fallbackRecipientIds: [],
      recipientCount: 1,
      abilityIds: ['syrax-blazing-fury'],
      signalIds: ['syrax-blazing-fury-fire-support', 'syrax-blazing-fury-first-strike'],
    });
    expect(evaluated.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'setup-payoff:syrax:status:first-strike:caraxes' }),
      expect.objectContaining({ id: 'amplifier-output:syrax:damage:fire:caraxes' }),
    ]));
    const finding = buildTargetingResolutionFindings(
      [blazingResolution(evaluated)],
      profiles,
    )[0]!;
    expect(finding).toMatchObject({
      type: 'targeting-resolution',
      tone: 'neutral',
      summary: 'Blazing Fury selects Caraxes as its shared recipient because Caraxes is the unique active Fire Damage ally.',
    });
    expect(finding.detail).toContain('status resolved');
    expect(finding.detail).toContain('selected caraxes');

    const relationships = evaluateFormationRelationshipsV3({
      input: { formation: current, progression: maxProgression, reliabilityProgression },
      profiles,
    }).filter(({ providerDragonId, beneficiaryDragonId }) =>
      providerDragonId === 'syrax' && beneficiaryDragonId === 'caraxes',
    );
    const firstStrike = relationships.find(({ semanticTag }) => semanticTag === 'status:first-strike')!;
    expect(firstStrike).toMatchObject({ adjustedBaseValue: 2 });
    expect(firstStrike.eventIds).toContain('syrax-blazing-fury:fire-and-first-strike');
    const fireTrace = relationships
      .find(({ semanticTag }) => semanticTag === 'damage:fire')!
      .candidateTraces.find(({ candidate }) =>
        candidate.providerSignalId === 'syrax-blazing-fury-fire-support',
      )!;
    expect(fireTrace.quantification).toMatchObject({ status: 'quantified', reliability: 0.2 });
    expect(fireTrace.eventIds).toContain('syrax-blazing-fury:fire-and-first-strike');
    expect(firstStrike.quantification).toMatchObject({ status: 'quantified', reliability: 0.2 });
  });

  it('resolves Seasmoke as the unique Fire target and creates only applicable relationships', () => {
    const current = formation('syrax', 'seasmoke', 'vhagar');
    const profiles = selectedProfiles(['syrax', 'seasmoke', 'vhagar']);
    const evaluated = evaluateFormation({ formation: current, progression: maxProgression, profiles });
    expect(blazingResolution(evaluated)).toMatchObject({
      status: 'resolved',
      selectedRecipientId: 'seasmoke',
      priorityRecipientIds: ['seasmoke'],
    });
    const blazing = evaluateFormationCandidates({
      formation: current,
      progression: maxProgression,
      profiles,
    }).candidates.filter(({ providerSignalId }) => providerSignalId.startsWith('syrax-blazing-fury-'));
    expect(blazing.map(({ providerSignalId, beneficiaryDragonId }) =>
      [providerSignalId, beneficiaryDragonId],
    )).toEqual([
      ['syrax-blazing-fury-fire-support', 'seasmoke'],
    ]);
  });

  it('preserves both Fire candidates as an unresolved priority tie and awards neither sibling effect', () => {
    const current = formation('syrax', 'caraxes', 'seasmoke');
    const profiles = selectedProfiles(['syrax', 'caraxes', 'seasmoke']);
    const evaluated = evaluateFormation({ formation: current, progression: maxProgression, profiles });
    const resolution = blazingResolution(evaluated);
    expect(resolution).toMatchObject({
      status: 'unresolved',
      priorityRecipientIds: ['caraxes', 'seasmoke'],
      unresolvedReason: 'multiple-priority-candidates',
    });
    expect(evaluated.results.filter(({ abilityIds }) => abilityIds.includes('syrax-blazing-fury')))
      .toHaveLength(0);
    expect(evaluated.results).toContainEqual(expect.objectContaining({
      id: 'amplifier-output:seasmoke:stat:intelligence:caraxes',
    }));
    const finding = buildTargetingResolutionFindings([resolution], profiles)[0]!;
    expect(finding.summary).toBe(
      'Blazing Fury selects one Fire-damage ally, but Caraxes and Seasmoke both qualify and the tie rule is not verified.',
    );
    expect(finding.detail).toContain('status unresolved');
    expect(finding.detail).toContain('priority caraxes, seasmoke');
  });

  it('does not invent a position tie-break when the two Fire candidates swap lanes', () => {
    const profiles = selectedProfiles(['syrax', 'caraxes', 'seasmoke']);
    const left = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'caraxes', 'seasmoke'),
      progression: maxProgression,
      profiles,
    }));
    const right = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'seasmoke', 'caraxes'),
      progression: maxProgression,
      profiles,
    }));
    expect(left).toEqual(right);
    expect(right).toMatchObject({ status: 'unresolved', unresolvedReason: 'multiple-priority-candidates' });
  });

  it('ignores progression-locked and position-invalid Fire outputs plus support-only Fire capability', () => {
    const locked = profile('locked-fire', [signal({
      id: 'locked-fire-output',
      tag: 'damage:fire',
      unlock: { minimumStarRank: 10 },
    })]);
    const profiles = [...selectedProfiles(['syrax', 'caraxes']), locked];
    const progression = { ...maxProgression, 'locked-fire': { starRank: 9, dragonLevel: 16 } };
    const resolution = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'caraxes', 'locked-fire'),
      progression,
      profiles,
    }));
    expect(resolution).toMatchObject({
      status: 'resolved',
      selectedRecipientId: 'caraxes',
      priorityRecipientIds: ['caraxes'],
    });

    const positioned = profile('positioned-fire', [signal({
      id: 'positioned-fire-output',
      tag: 'damage:fire',
      requiredSelfPosition: 'left-flank',
    })]);
    const positionedResolution = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'caraxes', 'positioned-fire'),
      progression: { ...maxProgression, 'positioned-fire': { starRank: 10, dragonLevel: 16 } },
      profiles: [...selectedProfiles(['syrax', 'caraxes']), positioned],
    }));
    expect(positionedResolution.priorityRecipientIds).toEqual(['caraxes']);

    const supportOnly = profile('fire-support-only', [], [signal({
      id: 'fire-support-only-signal',
      tag: 'damage:fire',
    })]);
    const supportResolution = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'caraxes', 'fire-support-only'),
      progression: { ...maxProgression, 'fire-support-only': { starRank: 10, dragonLevel: 16 } },
      profiles: [...selectedProfiles(['syrax', 'caraxes']), supportOnly],
    }));
    expect(supportResolution.priorityRecipientIds).toEqual(['caraxes']);
  });

  it('retains multiple fallback candidates as unresolved and resolves exactly one fallback', () => {
    const plainA = profile('plain-a');
    const plainB = profile('plain-b');
    const profiles = [...selectedProfiles(['syrax']), plainA, plainB];
    const tied = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'plain-a', 'plain-b'),
      progression: maxProgression,
      profiles,
    }));
    expect(tied).toMatchObject({
      status: 'unresolved',
      fallbackRecipientIds: ['plain-a', 'plain-b', 'syrax'],
      unresolvedReason: 'multiple-fallback-candidates',
    });
    expect(buildTargetingResolutionFindings([tied], profiles)[0]!.summary)
      .toContain('remain fallback candidates; the tie rule is not verified');
    expect(buildTargetingResolutionFindings([tied], profiles)[0]).toMatchObject({
      type: 'targeting-resolution',
      tone: 'informational',
    });

    const only = blazingResolution(evaluateFormation({
      formation: formation('syrax', null, null),
      progression: maxProgression,
      profiles: selectedProfiles(['syrax']),
    }));
    expect(only).toMatchObject({
      status: 'resolved',
      selectedRecipientId: 'syrax',
      fallbackRecipientIds: ['syrax'],
    });
    expect(evaluateFormation({
      formation: formation('syrax', null, null),
      progression: maxProgression,
      profiles: selectedProfiles(['syrax']),
    }).results.filter(({ dragonIds }) => dragonIds.length > 1)).toHaveLength(0);
  });

  it('retains a conservative unresolved trace when an eligible dragon lacks capability data', () => {
    const resolution = blazingResolution(evaluateFormation({
      formation: formation('syrax', 'caraxes', 'unknown-dragon'),
      progression: maxProgression,
      profiles: selectedProfiles(['syrax', 'caraxes']),
    }));
    expect(resolution).toMatchObject({
      status: 'unresolved',
      eligibleRecipientIds: ['caraxes', 'syrax', 'unknown-dragon'],
      priorityRecipientIds: ['caraxes'],
      unresolvedReason: 'missing-capability-data',
    });
    const finding = buildTargetingResolutionFindings(
      [resolution],
      selectedProfiles(['syrax', 'caraxes']),
    )[0]!;
    expect(finding.summary).toContain('lack active-capability data');
    expect(finding.detail).toContain('reason missing-capability-data');
  });

  it('returns one shared resolution object for both sibling signals and no duplicate recipient credit', () => {
    const current = formation('syrax', 'caraxes', 'vhagar');
    const evaluated = evaluateFormationCandidates({
      formation: current,
      progression: maxProgression,
      profiles: selectedProfiles(['syrax', 'caraxes', 'vhagar']),
    });
    expect(evaluated.targetingResolutions).toHaveLength(1);
    expect(evaluated.targetingResolutions[0]!.signalIds).toEqual([
      'syrax-blazing-fury-fire-support',
      'syrax-blazing-fury-first-strike',
    ]);
    expect(new Set(evaluated.candidates
      .filter(({ providerSignalId }) => providerSignalId.startsWith('syrax-blazing-fury-'))
      .map(({ beneficiaryDragonId }) => beneficiaryDragonId))).toEqual(new Set(['caraxes']));
  });

  it('keeps the historical Formation Rating v2 input frozen while current production changes', () => {
    const current = formation('syrax', 'caraxes', 'seasmoke');
    const historical = evaluateFormation({
      formation: current,
      progression: maxProgression,
      profiles: historicalFormationRatingV2Profiles,
    });
    const production = evaluateFormation({
      formation: current,
      progression: maxProgression,
      profiles: simpleSynergyProfiles,
    });
    expect(historical.targetingResolutions).toHaveLength(0);
    expect(historical.results.filter(({ abilityIds }) => abilityIds.includes('syrax-blazing-fury')))
      .toHaveLength(3);
    expect(blazingResolution(production)).toMatchObject({ status: 'unresolved' });
    expect(production.results.filter(({ abilityIds }) => abilityIds.includes('syrax-blazing-fury')))
      .toHaveLength(0);
  });
});

function profile(
  dragonId: string,
  outputs: SynergySignal[] = [],
  supports: SynergySignal[] = [],
): DragonSynergyProfile {
  return { dragonId, dragonName: dragonId, outputs, supports, benefitsFrom: [], positionClaims: [] };
}

function signal(overrides: Partial<SynergySignal> & Pick<SynergySignal, 'id' | 'tag'>): SynergySignal {
  return {
    abilityId: overrides.id,
    abilityName: overrides.id,
    description: overrides.id,
    confidence: 'verified',
    ...overrides,
  };
}
