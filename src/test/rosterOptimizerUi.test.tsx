/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_OPTIMIZER_ALLOCATION_MODE,
  RosterOptimizer,
} from '../app/RosterOptimizer';
import { dragons } from '../data/dragons';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import type { RosterOptimizerRunner } from '../optimizer/rosterOptimizerClient';
import type {
  FlexiblePowerAwareOptimizationResult,
  OptimizerAllocationMode,
  OptimizerPerformanceProfile,
  PowerAwareOptimizedFormation,
  RarityCountRecord,
  RosterOptimizerResponse,
  TierDistribution,
} from '../optimizer/rosterOptimizerTypes';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
} from '../optimizer/rosterOptimizerTypes';
import type { FormationArrangement } from '../services/formationArrangement';
import { createEmptyRoster } from '../services/rosterStorage';

describe('Roster Optimizer v6 workspace', () => {
  it('defaults to 10 Best Overall First and exposes all three precise modes', () => {
    renderOptimizer({ roster: ownedRoster(33) });
    expect(DEFAULT_OPTIMIZER_ALLOCATION_MODE).toBe('best-overall-first');
    expect(screen.getByRole('radio', { name: /Best Overall First/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Highest Raw Power First/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }))
      .not.toBeChecked();
    expect(screen.queryByText(/Primary|Backup|Best 10|Rarity-Priority/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Number of armies')).toHaveValue('10');
    expect(screen.getByText('10 armies use 30 of your 33 eligible dragons.')).toBeInTheDocument();
  });

  it('offers every count through the dynamic maximum and passes count/mode to the Worker runner', async () => {
    const runner = dynamicRunner();
    renderOptimizer({ roster: ownedRoster(33), runner });
    const select = screen.getByLabelText('Number of armies');
    expect(within(select).getAllByRole('option')).toHaveLength(11);
    await userEvent.setup().selectOptions(select, '11');
    await userEvent.setup().click(
      screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }),
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /Build 11 armies/i }));
    await screen.findByRole('heading', { name: 'Exact optimal result' });
    expect(runner.run).toHaveBeenCalledWith(
      expect.any(Object),
      'balanced',
      11,
      expect.any(Function),
    );
    expect(screen.getAllByRole('article')).toHaveLength(11);
  });

  it('clamps a now-invalid count after roster changes and explains the adjustment', async () => {
    renderOptimizer({ roster: ownedRoster(27) });
    await waitFor(() => expect(screen.getByLabelText('Number of armies')).toHaveValue('9'));
    expect(screen.getByText(/supports 9 armies.*adjusted to 9/i)).toBeInTheDocument();
    expect(screen.getByText('9 armies use 27 of your 27 eligible dragons.')).toBeInTheDocument();
  });

  it('does not start the Worker below three eligible dragons and states the exact shortfall', async () => {
    const runner = dynamicRunner();
    const onOpenRoster = vi.fn();
    renderOptimizer({ roster: ownedRoster(1), runner, onOpenRoster });
    expect(screen.getByText('You need 2 more eligible dragons to build one complete army.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Build/i })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /Go to My Roster/i }));
    expect(onOpenRoster).toHaveBeenCalledOnce();
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('shows candidate and exact-solving states, selected count/mode, exactness, and cancellation', async () => {
    let progressCallback: ((value: {
      stage: 'candidate-generation' | 'exact-solving';
      allocationMode: OptimizerAllocationMode;
      formationCount: number;
    }) => void) | undefined;
    const runner: RosterOptimizerRunner = {
      run: vi.fn((_roster, _mode, _count, onProgress) => {
        progressCallback = onProgress;
        return new Promise<RosterOptimizerResponse>(() => undefined);
      }),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    renderOptimizer({ roster: ownedRoster(33), runner });
    await userEvent.setup().click(screen.getByRole('button', { name: /Build 10 armies/i }));
    expect(screen.getByText('Generating every eligible trio…')).toBeInTheDocument();
    expect(screen.getByText(/10 armies · Best Overall First.*fully proven exact/i))
      .toBeInTheDocument();
    progressCallback?.({
      stage: 'exact-solving',
      allocationMode: 'best-overall-first',
      formationCount: 10,
    });
    expect(await screen.findByText('Proving the exact allocation…')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(runner.cancel).toHaveBeenCalledOnce();
  });

  it('invalidates results after count, mode, and active Habit Level changes', async () => {
    const roster = ownedRoster(33);
    const runner = dynamicRunner();
    const view = renderOptimizer({ roster, runner });
    await userEvent.setup().click(screen.getByRole('button', { name: /Build 10 armies/i }));
    await screen.findByRole('heading', { name: 'Exact optimal result' });
    await userEvent.setup().selectOptions(screen.getByLabelText('Number of armies'), '9');
    expect(screen.getByText(/roster progression, army count, or allocation mode changed/i)).toBeInTheDocument();
    await userEvent.setup().selectOptions(screen.getByLabelText('Number of armies'), '10');
    await userEvent.setup().click(
      screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }),
    );
    expect(screen.getByText(/roster progression, army count, or allocation mode changed/i)).toBeInTheDocument();

    const changedRoster = structuredClone(roster);
    const firstId = buildOptimizerRosterSnapshot(dragons, roster)[0]!.dragonId;
    const habitId = dragons.find((dragon) => dragon.id === firstId)!.habits[0]!.id;
    changedRoster[firstId]!.habitLevels[habitId] = 2;
    view.rerender(component(changedRoster, runner));
    expect(screen.getByText(/roster progression, army count, or allocation mode changed/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open in Formation Builder/i })[0]).toBeDisabled();
  });

  it('orders Balanced results strongest to weakest and hands the exact arrangement to Formation Builder', async () => {
    const onOpenFormation = vi.fn();
    renderOptimizer({
      roster: ownedRoster(33),
      runner: dynamicRunner(),
      onOpenFormation,
    });
    await userEvent.setup().click(
      screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }),
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /Build 10 armies/i }));
    const cards = await screen.findAllByRole('article');
    const powers = cards.map((card) =>
      Number(within(card).getByText(/Estimated Formation Power/i).nextElementSibling!.textContent!.replaceAll(',', '')),
    );
    expect(powers).toEqual([...powers].sort((left, right) => right - left));
    await userEvent.setup().click(
      within(cards[0]!).getByRole('button', { name: /Open in Formation Builder/i }),
    );
    const result = makeResult(ownedRoster(33), 'balanced', 10);
    expect(onOpenFormation).toHaveBeenCalledWith(result.formations[0]!.arrangement);
  });

  it('keeps the compact count control accessible for mobile layouts', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    renderOptimizer({ roster: ownedRoster(15) });
    expect(screen.getByLabelText('Number of armies')).toHaveValue('5');
    expect(screen.getByText('5 armies use 15 of your 15 eligible dragons.')).toBeInTheDocument();
  });

  it('shows an exact reconstructable Best Overall score explanation', async () => {
    renderOptimizer({ roster: ownedRoster(33), runner: dynamicRunner() });
    await userEvent.setup().click(screen.getByRole('button', { name: /Build 10 armies/i }));
    const cards = await screen.findAllByRole('article');
    expect(within(cards[0]!).getByText(/Overall Score/i)).toBeInTheDocument();
    await userEvent.setup().click(
      within(cards[0]!).getByText(/^Overall Score 92\.0$/i),
    );
    expect(within(cards[0]!).getByText(/Relative power: 100\.0 \/ 100/i))
      .toBeInTheDocument();
    expect(within(cards[0]!).getByText(/Weight: 60%/i)).toBeInTheDocument();
    expect(within(cards[0]!).getByText(/Weight: 40%/i)).toBeInTheDocument();
  });
});

function renderOptimizer({
  roster,
  runner = dynamicRunner(),
  onOpenFormation = vi.fn(),
  onOpenRoster = vi.fn(),
}: {
  roster: ReturnType<typeof ownedRoster>;
  runner?: RosterOptimizerRunner;
  onOpenFormation?: (arrangement: FormationArrangement) => void;
  onOpenRoster?: () => void;
}) {
  return render(component(roster, runner, onOpenFormation, onOpenRoster));
}

function component(
  roster: ReturnType<typeof ownedRoster>,
  runner: RosterOptimizerRunner,
  onOpenFormation: (arrangement: FormationArrangement) => void = vi.fn(),
  onOpenRoster: () => void = vi.fn(),
) {
  return (
    <OptimizerTestHarness
      roster={roster}
      runner={runner}
      onOpenFormation={onOpenFormation}
      onOpenRoster={onOpenRoster}
    />
  );
}

function OptimizerTestHarness({
  roster,
  runner,
  onOpenFormation,
  onOpenRoster,
}: {
  roster: ReturnType<typeof ownedRoster>;
  runner: RosterOptimizerRunner;
  onOpenFormation: (arrangement: FormationArrangement) => void;
  onOpenRoster: () => void;
}) {
  const [allocationMode, setAllocationMode] = useState<OptimizerAllocationMode>(
    DEFAULT_OPTIMIZER_ALLOCATION_MODE,
  );
  const [formationCount, setFormationCount] = useState(10);
  const [result, setResult] = useState<FlexiblePowerAwareOptimizationResult | null>(null);
  return (
    <RosterOptimizer
      allDragons={dragons}
      roster={roster}
      allocationMode={allocationMode}
      onAllocationModeChange={setAllocationMode}
      formationCount={formationCount}
      onFormationCountChange={setFormationCount}
      result={result}
      onResultChange={setResult}
      runner={runner}
      onOpenFormation={onOpenFormation}
      onOpenRoster={onOpenRoster}
    />
  );
}

function dynamicRunner(): RosterOptimizerRunner & { run: ReturnType<typeof vi.fn> } {
  return {
    run: vi.fn(async (roster, mode, count, onProgress) => {
      onProgress?.({ stage: 'candidate-generation', allocationMode: mode, formationCount: count });
      onProgress?.({ stage: 'exact-solving', allocationMode: mode, formationCount: count });
      return makeResult(roster, mode, count);
    }),
    cancel: vi.fn(),
    dispose: vi.fn(),
  };
}

function ownedRoster(count: number) {
  const roster = createEmptyRoster(dragons);
  dragons.slice(0, count).forEach((dragon) => {
    roster[dragon.id] = {
      ...roster[dragon.id]!,
      owned: true,
      starRank: 10,
      reignLevel: 16,
    };
  });
  return roster;
}

function makeResult(
  roster: ReturnType<typeof ownedRoster>,
  allocationMode: OptimizerAllocationMode,
  formationCount: number,
): FlexiblePowerAwareOptimizationResult {
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const selected = snapshot.slice(0, formationCount * 3);
  const generatedFormations = Array.from({ length: formationCount }, (_unused, index) =>
    makeFormation(selected.slice(index * 3, index * 3 + 3), index),
  );
  const rawFormations = allocationMode === 'best-overall-first'
    ? generatedFormations.map((formation) => {
        const estimatedPowerUnits = formation.estimatedPowerUnits!;
        const ratingIndexBasisPoints = formation.rating * 100;
        const powerContributionUnits = 10_000 * BEST_OVERALL_POWER_WEIGHT;
        const ratingContributionUnits =
          ratingIndexBasisPoints * BEST_OVERALL_RATING_WEIGHT;
        const overallScoreUnits = powerContributionUnits + ratingContributionUnits;
        return {
          ...formation,
          bestOverallScore: {
            scoringVersion: BEST_OVERALL_SCORING_VERSION,
            powerWeight: BEST_OVERALL_POWER_WEIGHT,
            formationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
            normalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
            maxRemainingPowerUnits: estimatedPowerUnits,
            estimatedPowerUnits,
            powerIndexBasisPoints: 10_000,
            ratingIndexBasisPoints,
            powerContributionUnits,
            ratingContributionUnits,
            overallScoreUnits,
            overallScore: overallScoreUnits / BEST_OVERALL_NORMALIZATION_SCALE,
          },
        };
      })
    : generatedFormations;
  const formations = allocationMode === 'balanced'
    ? [...rawFormations].sort((left, right) => right.estimatedPower - left.estimatedPower)
      .map((formation, index) => ({ ...formation, rank: index + 1 }))
    : rawFormations;
  const usedDragonIds = selected.map((dragon) => dragon.dragonId).sort();
  const unusedDragonIds = snapshot
    .map((dragon) => dragon.dragonId)
    .filter((dragonId) => !usedDragonIds.includes(dragonId));
  const powers = formations.map((formation) => formation.estimatedPower);
  const ratings = formations.map((formation) => formation.rating);
  const totalRelationshipValueUnits = formations.reduce(
    (total, formation) => total + formation.adjustedRelationshipValueUnits,
    0,
  );
  const rarityCounts = countRarities(selected.map((dragon) => dragon.rarity));
  const tierDistribution: TierDistribution = {
    Excellent: 0,
    Strong: formationCount,
    Solid: 0,
    Developing: 0,
    Weak: 0,
    Incomplete: 0,
  };
  const performanceProfile: OptimizerPerformanceProfile = {
    modelBuilds: allocationMode === 'balanced' ? 1 : 0,
    modelConstructionMs: 1,
    certificationPasses: 0,
    skippedPhases: 0,
    prunedVariables: 0,
    phases: [],
  };
  return {
    contractVersion: 6,
    ratingContract: 'formation-rating-v3',
    allocationMode,
    optimal: true,
    requestedFormationCount: formationCount,
    generatedFormationCount: formationCount,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    requestFingerprint: createRosterOptimizerRequestFingerprint(
      snapshot,
      allocationMode,
      formationCount,
    ),
    estimatedPowerModelVersion: 'estimated-power-v2',
    estimatedPowerModelHash: 'fnv1a64:efa6081babb4e520',
    estimatedPowerObservationHash: 'fnv1a64:26bfe615f0d9bdd5',
    bestOverallScoringVersion: BEST_OVERALL_SCORING_VERSION,
    bestOverallPowerWeight: BEST_OVERALL_POWER_WEIGHT,
    bestOverallFormationRatingWeight: BEST_OVERALL_RATING_WEIGHT,
    bestOverallNormalizationScale: BEST_OVERALL_NORMALIZATION_SCALE,
    estimatedPowerByDragonId: Object.fromEntries(
      selected.map((dragon) => [dragon.dragonId, estimate(10_000)]),
    ),
    formations,
    usedDragonIds,
    unusedDragonIds,
    collection: {
      totalEstimatedPower: powers.reduce((total, power) => total + power, 0),
      averageEstimatedPower: powers.reduce((total, power) => total + power, 0) / formationCount,
      minimumFormationEstimatedPower: Math.min(...powers),
      maximumFormationEstimatedPower: Math.max(...powers),
      estimatedPowerSpread: Math.max(...powers) - Math.min(...powers),
      totalRating: ratings.reduce((total, rating) => total + rating, 0),
      averageRating: ratings.reduce((total, rating) => total + rating, 0) / formationCount,
      minimumRating: Math.min(...ratings),
      totalRelationshipValue: totalRelationshipValueUnits / 1_000_000,
      totalRelationshipValueUnits,
      totalActiveRelationships: formationCount * 3,
      quantifiedRelationshipCount: formationCount * 3,
      unquantifiedRelationshipCount: 0,
      unquantifiedBasePotential: 0,
      powerConfidenceCounts: { observed: formationCount * 3, modeled: 0, low: 0 },
      rarityCounts,
      tierDistribution,
    },
    objective: {
      allocationMode,
      ...(allocationMode === 'best-overall-first'
        ? {
            bestOverallScoreUnits: formations.map(
              (formation) => formation.bestOverallScore!.overallScoreUnits,
            ),
          }
        : {}),
      ascendingEstimatedPowerUnits: powers.map((power) => power / 10).sort((a, b) => a - b),
      ascendingEstimatedPowerVector: [...powers].sort((a, b) => a - b),
      ascendingRatingVector: [...ratings].sort((a, b) => a - b),
      totalRelationshipValue: totalRelationshipValueUnits / 1_000_000,
      totalRelationshipValueUnits,
      totalActiveRelationships: formationCount * 3,
      stableSolutionKey: formations.map((formation) => formation.stableCandidateKey).sort().join('||'),
    },
    diagnostics: {
      optimal: true,
      eligibleDragonCount: snapshot.length,
      candidateCount: 5456,
      selectedFormationCount: formationCount,
      nodesVisited: 10,
      branchesPruned: 2,
      cacheEntries: 0,
      solverPasses: 4,
      candidateGenerationMs: 100,
      solverMs: 50,
      totalMs: 150,
      performanceProfile,
    },
    optimizerSolutionHash: `fnv1a64:solution-${allocationMode}-${formationCount}`,
    optimizerResultHash: `fnv1a64:result-${allocationMode}-${formationCount}`,
  };
}

function makeFormation(
  trio: ReturnType<typeof buildOptimizerRosterSnapshot>,
  index: number,
): PowerAwareOptimizedFormation {
  const dragonIds = trio.map((dragon) => dragon.dragonId) as [string, string, string];
  const arrangement = {
    'left-flank': dragonIds[0],
    vanguard: dragonIds[1],
    'right-flank': dragonIds[2],
  };
  const estimatedPower = 30_000 + index * 1_000;
  return {
    ratingContract: 'formation-rating-v3',
    rank: index + 1,
    stableCandidateKey: dragonIds.join('+'),
    dragonIds,
    arrangement,
    tiedBestArrangements: [arrangement],
    rating: 80 - index,
    tier: 'Strong',
    activeSynergyScore: 60 - index,
    placementScore: 20,
    adjustedRelationshipValue: 3,
    adjustedRelationshipValueUnits: 3_000_000,
    activeRelationshipCount: 3,
    quantifiedRelationshipCount: 3,
    unquantifiedRelationshipCount: 0,
    unquantifiedBasePotential: 0,
    reliabilityCoverage: 'all-quantified',
    participatingDragonCount: 3,
    relationships: [],
    strengths: [],
    gaps: [],
    progressionSnapshot: Object.fromEntries(trio.map((dragon) => [
      dragon.dragonId,
      {
        starRank: dragon.starRank,
        dragonLevel: dragon.dragonLevel,
        activeHabitLevels: dragon.activeHabitLevels ?? {},
      },
    ])),
    estimatedPowerUnits: estimatedPower / 10,
    estimatedPower,
    dragonPowerEstimates: Object.fromEntries(
      dragonIds.map((dragonId) => [dragonId, estimate(estimatedPower / 3)]),
    ),
    powerConfidenceCounts: { observed: 3, modeled: 0, low: 0 },
  };
}

function estimate(power: number) {
  return {
    power,
    confidence: 'observed' as const,
    modelVersion: 'estimated-power-v2',
    modelHash: 'fnv1a64:efa6081babb4e520',
    observationHash: 'fnv1a64:26bfe615f0d9bdd5',
    basis: 'exact-observation' as const,
  };
}

function countRarities(rarities: string[]): RarityCountRecord {
  const counts: RarityCountRecord = { Legendary: 0, Epic: 0, Rare: 0 };
  rarities.forEach((rarity) => {
    counts[rarity as keyof RarityCountRecord] += 1;
  });
  return counts;
}
