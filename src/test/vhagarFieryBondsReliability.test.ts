import { describe, expect, it } from 'vitest';

import { conditionalUpliftSummary } from '../app/relationshipReliabilityPresentation';
import releaseDeltaManifest from '../audit/fixtures/formationRatingV3ReleaseDeltas.0.23.3-to-0.23.4.json';
import { dragons } from '../data/dragons';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  evaluateBindingReliability,
  evaluateFormationRelationshipsV3,
  formationReliabilityBindings,
  formationReliabilityComponents,
  type FormationRelationshipV3,
  type ReliabilityProgression,
} from '../synergy/reliability';

const componentsById = new Map(
  formationReliabilityComponents.map((component) => [component.id, component]),
);
const bindingsById = new Map(
  formationReliabilityBindings.map((binding) => [binding.signalId, binding]),
);
const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));

describe("Vhagar Fiery Bonds' Burn payoff reliability", () => {
  it('keeps ordinary and Burn-afflicted Taunt as separate probabilistic output branches', () => {
    const binding = requiredBinding('vhagar-fiery-bonds-taunt');
    const ordinary = evaluateBindingReliability({
      binding,
      componentsById,
      progression: progression(),
      probabilityContextId: 'ordinary-target',
    });
    const burned = evaluateBindingReliability({
      binding,
      componentsById,
      progression: progression(),
      probabilityContextId: 'burn-afflicted-target',
    });

    expect(ordinary).toMatchObject({
      selectedPathId: 'ordinary-target',
      probabilityVariantIds: ['burn-afflicted-target', 'ordinary-target'],
      quantification: { status: 'quantified', reliability: 0.25 },
    });
    expect(burned).toMatchObject({
      selectedPathId: 'burn-afflicted-target',
      probabilityVariantIds: ['burn-afflicted-target', 'ordinary-target'],
      quantification: { status: 'quantified', reliability: 0.5 },
    });
    expect(componentsById.get('vhagar-fiery-bonds:taunt')).toMatchObject({
      reliabilityClass: 'chance',
      durationRounds: 2,
      targetFacts: { count: 3 },
    });
  });

  it('models Burn as a condition-proven modifier without requiring the Taunt roll', () => {
    const relationship = burnRelationship('daemoros');
    const selected = selectedTrace(relationship);

    expect(relationship).toMatchObject({
      baseValue: 10,
      adjustedBaseValue: 2,
      adjustedMarginalValue: 2,
      quantification: {
        status: 'quantified',
        reliability: 0.2,
        method: 'one-supported-opportunity',
      },
    });
    expect(selected.beneficiary).toMatchObject({
      bindingClass: 'conditional-deterministic',
      selectedPathId: 'burn-taunt-probability-uplift',
      componentIds: ['vhagar-fiery-bonds:burn-taunt-probability-uplift'],
      quantification: { status: 'quantified', reliability: 1, method: 'guaranteed' },
    });
    expect(selected.beneficiary.selectedComponentTraces[0]?.quantification).toMatchObject({
      status: 'quantified',
      reliability: 1,
      method: 'condition-proven',
    });
    expect(selected.componentIds).not.toContain('vhagar-fiery-bonds:taunt');
    expect(selected.probabilityVariantIds).toEqual([]);
  });

  it('passes through Daemoros exact supported Burn opportunity and exposes magnitude separately', () => {
    const relationship = burnRelationship('daemoros');
    const uplift = componentsById.get(
      'vhagar-fiery-bonds:burn-taunt-probability-uplift',
    )?.conditionalUplift;

    expect(selectedTrace(relationship).provider).toMatchObject({
      componentIds: ['daemoros-shadowflame:burn'],
      quantification: {
        status: 'quantified',
        reliability: 0.2,
        method: 'one-supported-opportunity',
      },
    });
    expect(uplift).toEqual({
      kind: 'probability-uplift',
      conditionLabel: 'Burn',
      affectedMetricLabel: "Fiery Bonds' Taunt chance",
      affectedComponentId: 'vhagar-fiery-bonds:taunt',
      baselineVariantId: 'ordinary-target',
      conditionedVariantId: 'burn-afflicted-target',
      baseline: 0.25,
      conditioned: 0.5,
      absoluteDelta: 0.25,
      relativeMultiplier: 2,
    });
    expect(relationship.baseValue).toBe(10);
    expect(relationship.adjustedMarginalValue).toBe(2);
    expect(conditionalUpliftSummary(relationship, dragonsById)).toBe(
      "Daemoros can provide Burn with a 20% supported activation opportunity. Burn deterministically changes Fiery Bonds' Taunt chance from 25% to 50% (+25 percentage points; 2×). The resulting activation remains probabilistic.",
    );
  });

  it('keeps Tairax unquantified because its first Burn opportunity requires Round 2', () => {
    const relationship = burnRelationship('tairax');
    expect(relationship.quantification).toEqual({
      status: 'unquantified',
      reason: 'conditional-opportunity',
      explanation: 'The first supported opportunity depends on reaching Round 2.',
      conditionalProbabilities: [0.5],
    });
    expect(relationship.adjustedMarginalValue).toBe(0);
    expect(componentsById.get('tairax-burning-ward:burn')?.opportunityCondition).toBe(
      'The battle reaching Round 2.',
    );
    expect(conditionalUpliftSummary(relationship, dragonsById)).toContain(
      'its Burn opportunity depends on the battle reaching Round 2',
    );
  });

  it('keeps Sunfyre unquantified and names the below-50% Troop Capacity condition', () => {
    const relationship = burnRelationship('sunfyre');
    expect(relationship.quantification).toMatchObject({
      status: 'unquantified',
      reason: 'conditional-opportunity',
      conditionalProbabilities: [0.5],
    });
    expect(relationship.adjustedMarginalValue).toBe(0);
    expect(componentsById.get('sunfyre-golden-wrath:burn')?.opportunityCondition).toBe(
      'Sunfyre being below 50% Troop Capacity.',
    );
    expect(conditionalUpliftSummary(relationship, dragonsById)).toContain(
      'its Burn opportunity depends on Sunfyre being below 50% Troop Capacity',
    );
  });

  it('does not activate locked Caraxes or Shadowsong Burn early', () => {
    expect(
      burnRelationshipOrNull('caraxes', {
        starRank: 5,
        activeHabitLevels: {},
      }),
    ).toBeNull();
    expect(
      burnRelationshipOrNull('shadowsong', {
        starRank: 9,
        activeHabitLevels: {},
      }),
    ).toBeNull();
  });

  it('locks the exhaustive release delta to Vhagar placements only', () => {
    expect(releaseDeltaManifest).toMatchObject({
      placementCount: 32_736,
      changedPlacementCount: 870,
      numericChangedPlacementCount: 366,
      vhagarChangedPlacementCount: 870,
      nonVhagarChangedPlacementCount: 0,
      deterministicManifestHash:
        'sha256:cb804b96d4f34037e8c9706205aab00926b45c45f699f84a228a356dd58f9efa',
    });
    expect(releaseDeltaManifest.changed.every((entry) =>
      entry.containsVhagar &&
      entry.reason === 'vhagar-burn-fiery-bonds-reliability-correction'
    )).toBe(true);
  });
});

function burnRelationship(
  providerDragonId: string,
  providerProgression?: Partial<ReliabilityProgression>,
): FormationRelationshipV3 {
  const relationship = burnRelationshipOrNull(providerDragonId, providerProgression);
  if (!relationship) throw new Error(`Expected ${providerDragonId} Burn to Vhagar relationship.`);
  return relationship;
}

function burnRelationshipOrNull(
  providerDragonId: string,
  providerProgression: Partial<ReliabilityProgression> = {},
): FormationRelationshipV3 | null {
  const selectedDragonIds = [providerDragonId, 'vhagar', 'tessarion'];
  const starRank = providerProgression.starRank ?? 10;
  const activeHabitLevels = providerProgression.activeHabitLevels ?? defaultHabits(providerDragonId);
  const simpleProgression = Object.fromEntries(
    selectedDragonIds.map((dragonId) => [
      dragonId,
      { starRank: dragonId === providerDragonId ? starRank : 10, dragonLevel: 16 },
    ]),
  );
  const reliabilityProgression = Object.fromEntries(
    selectedDragonIds.map((dragonId) => [
      dragonId,
      progression(
        dragonId === providerDragonId
          ? { starRank, activeHabitLevels }
          : { starRank: 10 },
      ),
    ]),
  );
  return evaluateFormationRelationshipsV3({
    input: {
      formation: {
        'left-flank': providerDragonId,
        vanguard: 'vhagar',
        'right-flank': 'tessarion',
      },
      progression: simpleProgression,
      reliabilityProgression,
    },
    profiles: simpleSynergyProfiles,
  }).find(
    (relationship) =>
      relationship.providerDragonId === providerDragonId &&
      relationship.beneficiaryDragonId === 'vhagar' &&
      relationship.semanticTag === 'status:burn',
  ) ?? null;
}

function progression(
  override: Partial<ReliabilityProgression> = {},
): ReliabilityProgression {
  return {
    starRank: override.starRank ?? 10,
    dragonLevel: override.dragonLevel ?? 16,
    activeHabitLevels: override.activeHabitLevels ?? {},
  };
}

function defaultHabits(dragonId: string): ReliabilityProgression['activeHabitLevels'] {
  if (dragonId === 'caraxes') return { 'caraxes-crippling-inferno': 5 };
  if (dragonId === 'shadowsong') return { 'shadowsong-blazing-conductor': 5 };
  return {};
}

function requiredBinding(signalId: string) {
  const binding = bindingsById.get(signalId);
  if (!binding) throw new Error(`Missing binding ${signalId}.`);
  return binding;
}

function selectedTrace(relationship: FormationRelationshipV3) {
  const trace = relationship.candidateTraces.find(
    (candidate) => candidate.candidate.id === relationship.selectedCandidateId,
  );
  if (!trace) throw new Error('Missing selected trace.');
  return trace;
}
