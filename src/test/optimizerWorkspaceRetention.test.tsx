/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
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
  PowerAwareOptimizedFormation,
} from '../optimizer/rosterOptimizerTypes';
import {
  BEST_OVERALL_NORMALIZATION_SCALE,
  BEST_OVERALL_POWER_WEIGHT,
  BEST_OVERALL_RATING_WEIGHT,
  BEST_OVERALL_SCORING_VERSION,
} from '../optimizer/rosterOptimizerTypes';
import { createEmptyRoster, saveRoster } from '../services/rosterStorage';

describe('Optimizer v6 workspace retention', () => {
  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('initializes fresh app state to Best Overall without persisting the mode', async () => {
    renderApp(resolvedRunner(result('best-overall-first', 10, 700_000)));
    await userEvent.setup().click(screen.getByRole('link', { name: /^optimizer$/i }));
    expect(screen.getByRole('radio', { name: /Best Overall First/i })).toBeChecked();
    expect(Object.keys(window.localStorage)).not.toContain(
      'dragonfire-roster-optimizer-workspace',
    );
  });

  it('retains a completed result, selected count, and mode through navigation without rerunning', async () => {
    const user = userEvent.setup();
    const run = vi.fn(async (_roster, mode, count) => result(mode, count, 700_000));
    renderApp({ run, cancel: vi.fn(), dispose: vi.fn() });

    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    await user.selectOptions(screen.getByLabelText('Number of armies'), '9');
    await user.click(
      screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }),
    );
    await user.click(screen.getByRole('button', { name: /Build 9 armies/i }));
    await screen.findByRole('heading', { name: 'Exact optimal result' });

    await user.click(screen.getByRole('link', { name: /^overview$/i }));
    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    expect(screen.getByLabelText('Number of armies')).toHaveValue('9');
    expect(screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }))
      .toBeChecked();
    expect(screen.getByRole('heading', { name: 'Exact optimal result' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^roster$/i }));
    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    expect(screen.getByRole('heading', { name: 'Exact optimal result' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Open in Formation Builder/i })[0]!);
    expect(screen.getByRole('heading', { name: /Formation Builder/i })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    expect(screen.getByRole('heading', { name: 'Exact optimal result' })).toBeInTheDocument();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('marks retained results stale after count or mode changes', async () => {
    const user = userEvent.setup();
    renderApp(resolvedRunner(result('best-overall-first', 10, 700_000)));
    await runOptimizer(user);
    await user.selectOptions(screen.getByLabelText('Number of armies'), '9');
    expect(screen.getByText(/army count, or allocation mode changed/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Number of armies'), '10');
    await user.click(
      screen.getByRole('radio', { name: /Balance Raw Power Across Armies/i }),
    );
    expect(screen.getByText(/army count, or allocation mode changed/i)).toBeInTheDocument();
  });

  it('cancels an active run on navigation, ignores late results, and does not persist count to roster storage', async () => {
    const user = userEvent.setup();
    let resolveLate: ((value: FlexiblePowerAwareOptimizationResult) => void) | undefined;
    const late = new Promise<FlexiblePowerAwareOptimizationResult>((resolve) => {
      resolveLate = resolve;
    });
    const run = vi.fn().mockReturnValue(late);
    const cancel = vi.fn();
    renderApp({ run, cancel, dispose: vi.fn() });
    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    await user.click(screen.getByRole('button', { name: /Build 10 armies/i }));
    await user.click(screen.getByRole('link', { name: /^overview$/i }));
    expect(cancel).toHaveBeenCalled();
    resolveLate!(result('strongest-first', 10, 900_000));
    await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Exact sequential result' })).not.toBeInTheDocument(),
    );
    expect(run).toHaveBeenCalledTimes(1);
    expect(Object.keys(window.localStorage)).not.toContain(
      'dragonfire-roster-optimizer-workspace',
    );
  });
});

function renderApp(runner: RosterOptimizerRunner) {
  const roster = fullRoster();
  saveRoster(window.localStorage, roster);
  return render(<App accountServices={null} optimizerRunner={runner} />);
}

async function runOptimizer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('link', { name: /^optimizer$/i }));
  await user.click(screen.getByRole('button', { name: /Build 10 armies/i }));
  await screen.findByRole('heading', { name: 'Exact sequential result' });
}

function resolvedRunner(value: FlexiblePowerAwareOptimizationResult): RosterOptimizerRunner {
  return { run: vi.fn().mockResolvedValue(value), cancel: vi.fn(), dispose: vi.fn() };
}

function fullRoster() {
  const roster = createEmptyRoster(dragons);
  dragons.forEach((dragon) => {
    roster[dragon.id] = {
      ...roster[dragon.id]!,
      owned: true,
      starRank: 10,
      reignLevel: 16,
      habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 1])),
    };
  });
  return roster;
}

function result(
  allocationMode: OptimizerAllocationMode,
  formationCount: number,
  totalPower: number,
): FlexiblePowerAwareOptimizationResult {
  const roster = fullRoster();
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const selected = snapshot.slice(0, formationCount * 3);
  const formations = Array.from({ length: formationCount }, (_unused, index) => {
    const trio = selected.slice(index * 3, index * 3 + 3);
    const dragonIds = trio.map((dragon) => dragon.dragonId) as [string, string, string];
    const arrangement = {
      'left-flank': dragonIds[0],
      vanguard: dragonIds[1],
      'right-flank': dragonIds[2],
    };
    const estimatedPower = Math.round(totalPower / formationCount) + index * 10;
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
      progressionSnapshot: {},
      estimatedPowerUnits: estimatedPower / 10,
      estimatedPower,
      dragonPowerEstimates: {},
      powerConfidenceCounts: { observed: 3, modeled: 0, low: 0 },
    } satisfies PowerAwareOptimizedFormation;
  });
  const powers = formations.map((formation) => formation.estimatedPower);
  const ratings = formations.map((formation) => formation.rating);
  const usedDragonIds = selected.map((dragon) => dragon.dragonId).sort();
  const totalRelationshipValueUnits = formationCount * 3_000_000;
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
    estimatedPowerByDragonId: {},
    formations,
    usedDragonIds,
    unusedDragonIds: snapshot.map((dragon) => dragon.dragonId)
      .filter((dragonId) => !usedDragonIds.includes(dragonId)),
    collection: {
      totalEstimatedPower: powers.reduce((sum, power) => sum + power, 0),
      averageEstimatedPower: powers.reduce((sum, power) => sum + power, 0) / formationCount,
      minimumFormationEstimatedPower: Math.min(...powers),
      maximumFormationEstimatedPower: Math.max(...powers),
      estimatedPowerSpread: Math.max(...powers) - Math.min(...powers),
      totalRating: ratings.reduce((sum, rating) => sum + rating, 0),
      averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / formationCount,
      minimumRating: Math.min(...ratings),
      totalRelationshipValue: totalRelationshipValueUnits / 1_000_000,
      totalRelationshipValueUnits,
      totalActiveRelationships: formationCount * 3,
      quantifiedRelationshipCount: formationCount * 3,
      unquantifiedRelationshipCount: 0,
      unquantifiedBasePotential: 0,
      powerConfidenceCounts: { observed: formationCount * 3, modeled: 0, low: 0 },
      rarityCounts: { Legendary: 0, Epic: 0, Rare: formationCount * 3 },
      tierDistribution: {
        Excellent: 0, Strong: formationCount, Solid: 0,
        Developing: 0, Weak: 0, Incomplete: 0,
      },
    },
    objective: {
      allocationMode,
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
      nodesVisited: 1,
      branchesPruned: 0,
      solverPasses: 1,
      candidateGenerationMs: 1,
      solverMs: 1,
      totalMs: 2,
    },
    optimizerSolutionHash: `fnv1a64:test-${allocationMode}-${formationCount}`,
    optimizerResultHash: `fnv1a64:test-result-${allocationMode}-${formationCount}`,
  };
}
