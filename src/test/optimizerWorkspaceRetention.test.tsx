import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
  createRosterOptimizerRequestFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import type { RosterOptimizerRunner } from '../optimizer/rosterOptimizerClient';
import type {
  RosterOptimizationResult,
  RosterOptimizerResponse,
} from '../optimizer/rosterOptimizerTypes';
import { createEmptyRoster, saveRoster } from '../services/rosterStorage';

describe('Optimizer workspace retention', () => {
  it('defaults to Power-Aware, keeps the other strategies selectable, and renders a mocked Power-Aware result', async () => {
    const user = userEvent.setup();
    renderApp(resolvedRunner(powerAwareResult(700)));

    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    expect(screen.getByRole('radio', { name: /Power-Aware 5 \+ Backup 5/i })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i }));
    expect(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Best 10 Overall/i }));
    expect(screen.getByRole('radio', { name: /Best 10 Overall/i })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Power-Aware 5 \+ Backup 5/i }));
    await user.click(screen.getByRole('button', { name: /Find My Primary/i }));

    expect(await screen.findByRole('heading', { name: 'Exact optimal result' })).toBeInTheDocument();
    expect(screen.getAllByText('Power-Aware 5 + Backup 5')).toHaveLength(2);
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);
  });

  it('retains one completed result through Overview, Roster, and Formation Builder navigation without rerunning', async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockResolvedValue(powerAwareResult(700));
    renderApp({ run, cancel: vi.fn(), dispose: vi.fn() });
    await runOptimizer(user);

    await user.click(screen.getByRole('button', { name: /^overview$/i }));
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);
    expect(screen.queryByText(/progression or optimization strategy changed/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^roster$/i }));
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: /open in formation builder/i })[0]!);
    expect(screen.getByRole('heading', { name: /formation builder/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retains selected strategy and marks the retained result stale after strategy or roster progression changes', async () => {
    const user = userEvent.setup();
    renderApp(resolvedRunner(powerAwareResult(700)));
    await runOptimizer(user);

    await user.click(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i }));
    expect(screen.getByText(/progression or optimization strategy changed/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^overview$/i }));
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    expect(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i })).toBeChecked();
    expect(screen.getByText(/progression or optimization strategy changed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Power-Aware 5 \+ Backup 5/i }));
    await user.click(screen.getByRole('button', { name: /^roster$/i }));
    const firstDragon = dragons[0]!;
    await user.click(screen.getByRole('button', { name: new RegExp(`^${firstDragon.name},`, 'i') }));
    const editor = screen.getByRole('complementary', { name: firstDragon.name });
    await user.clear(within(editor).getByLabelText(/dragon level/i));
    await user.type(within(editor).getByLabelText(/dragon level/i), '9');
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);
    expect(screen.getByText(/progression or optimization strategy changed/i)).toBeInTheDocument();
  });

  it('replaces only with successful optimal reruns and preserves the completed result after unavailable, cancelled, or failed runs', async () => {
    const user = userEvent.setup();
    const first = powerAwareResult(700);
    const replacement = powerAwareResult(900);
    const pending = new Promise<RosterOptimizationResult>(() => undefined);
    const unavailable = { ...first, optimal: false } as unknown as RosterOptimizerResponse;
    const runner: RosterOptimizerRunner = {
      run: vi.fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(replacement)
        .mockResolvedValueOnce(unavailable)
        .mockReturnValueOnce(pending)
        .mockRejectedValueOnce(new Error('Runner failed.')),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    renderApp(runner);
    await runOptimizer(user);
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Find My Primary/i }));
    await waitFor(() => expect(screen.getAllByText('900').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /Find My Primary/i }));
    expect(screen.getAllByText('900').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Find My Primary/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.getAllByText('900').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Find My Primary/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Runner failed.');
    expect(screen.getAllByText('900').length).toBeGreaterThan(0);
  });

  it('cancels an active run on navigation, ignores its late response, does not auto-run on return, and adds no optimizer browser storage', async () => {
    const user = userEvent.setup();
    let resolveLate: ((result: RosterOptimizationResult) => void) | undefined;
    const late = new Promise<RosterOptimizationResult>((resolve) => { resolveLate = resolve; });
    const run = vi.fn().mockReturnValue(late);
    const cancel = vi.fn();
    const runner: RosterOptimizerRunner = {
      run,
      cancel,
      dispose: vi.fn(),
    };
    renderApp(runner);
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    await user.click(screen.getByRole('button', { name: /Find My Primary/i }));
    await user.click(screen.getByRole('button', { name: /^overview$/i }));
    expect(cancel).toHaveBeenCalled();
    resolveLate!(powerAwareResult(900));
    await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Exact optimal result' })).not.toBeInTheDocument());
    expect(run).toHaveBeenCalledTimes(1);
    expect(Object.keys(window.localStorage)).not.toContain('dragonfire-roster-optimizer-workspace');
  });
});

function renderApp(runner: RosterOptimizerRunner) {
  const roster = createEmptyRoster(dragons);
  dragons.forEach((dragon) => {
    roster[dragon.id] = { ...roster[dragon.id]!, owned: true, starRank: 10, reignLevel: 16 };
  });
  saveRoster(window.localStorage, roster);
  return render(<App accountServices={null} optimizerRunner={runner} />);
}

async function runOptimizer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^optimizer$/i }));
  await user.click(screen.getByRole('button', { name: /Find My Primary/i }));
  await screen.findByRole('heading', { name: 'Exact optimal result' });
}

function resolvedRunner(result: RosterOptimizationResult): RosterOptimizerRunner {
  return { run: vi.fn().mockResolvedValue(result), cancel: vi.fn(), dispose: vi.fn() };
}

function powerAwareResult(totalPower: number): RosterOptimizationResult {
  const roster = createEmptyRoster(dragons);
  dragons.forEach((dragon) => {
    roster[dragon.id] = { ...roster[dragon.id]!, owned: true, starRank: 10, reignLevel: 16 };
  });
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const selected = snapshot.slice(0, 30);
  const formations = Array.from({ length: 10 }, (_, index) => {
    const trio = selected.slice(index * 3, index * 3 + 3);
    const dragonIds = trio.map((dragon) => dragon.dragonId) as [string, string, string];
    const arrangement = { 'left-flank': dragonIds[0], vanguard: dragonIds[1], 'right-flank': dragonIds[2] };
    return {
      rank: index + 1,
      wave: index < 5 ? 'primary' : 'backup',
      waveRank: (index % 5) + 1,
      stableCandidateKey: dragonIds.join('+'),
      dragonIds,
      arrangement,
      tiedBestArrangements: [arrangement],
      rating: 80 - index,
      tier: 'Strong',
      activeSynergyScore: 60 - index,
      placementScore: 20,
      activeRelationshipValue: 20 - index,
      activeRelationshipCount: 3,
      participatingDragonCount: 3,
      relationships: [], strengths: [], gaps: [],
      progressionSnapshot: Object.fromEntries(trio.map((dragon) => [dragon.dragonId, { starRank: 10, dragonLevel: 16 }])),
      estimatedPower: Math.round(totalPower / 10),
      powerConfidenceCounts: { observed: 3, modeled: 0, low: 0 },
    };
  });
  const wave = (kind: 'primary' | 'backup') => {
    const waveFormations = formations.filter((formation) => formation.wave === kind);
    const usedDragonIds = waveFormations.flatMap((formation) => formation.dragonIds).sort();
    return {
      kind,
      label: kind === 'primary' ? 'Primary' : 'Backup',
      formations: waveFormations,
      usedDragonIds,
      rarityCounts: { Legendary: 0, Epic: 0, Rare: 15 },
      totalRating: waveFormations.reduce((sum, formation) => sum + formation.rating, 0),
      averageRating: 78,
      minimumRating: waveFormations[4]!.rating,
      totalRelationshipValue: 90,
      totalActiveRelationships: 15,
      tierDistribution: { Excellent: 0, Strong: 5, Solid: 0, Developing: 0, Weak: 0, Incomplete: 0 },
      objective: { totalRating: 390, minimumRating: 76, ascendingRatingVector: [76, 77, 78, 79, 80], totalRelationshipValue: 90, totalActiveRelationships: 15, stableSolutionKey: kind },
      totalEstimatedPower: totalPower,
      averageEstimatedPowerPerDragon: Math.round(totalPower / 15),
      minimumFormationEstimatedPower: Math.round(totalPower / 5),
      maximumFormationEstimatedPower: Math.round(totalPower / 5),
      powerConfidenceCounts: { observed: 15, modeled: 0, low: 0 },
    };
  };
  const primary = wave('primary');
  const backup = wave('backup');
  return {
    contractVersion: 3,
    strategy: 'power-aware-primary-five-backup-five',
    optimal: true,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    requestFingerprint: createRosterOptimizerRequestFingerprint(snapshot, 'power-aware-primary-five-backup-five'),
    primary,
    backup,
    formations,
    usedDragonIds: selected.map((dragon) => dragon.dragonId).sort(),
    unusedDragonIds: [snapshot[30]!.dragonId],
    unusedRarityCounts: { Legendary: 0, Epic: 0, Rare: 1 },
    combined: { totalRating: 755, averageRating: 75.5, minimumRating: 71, rarityCounts: { Legendary: 0, Epic: 0, Rare: 30 }, tierDistribution: { Excellent: 0, Strong: 10, Solid: 0, Developing: 0, Weak: 0, Incomplete: 0 }, totalRelationshipValue: 180, totalActiveRelationships: 30, totalEstimatedPower: totalPower * 2, averageEstimatedPowerPerDragon: Math.round(totalPower * 2 / 30), minimumFormationEstimatedPower: Math.round(totalPower / 5), maximumFormationEstimatedPower: Math.round(totalPower / 5), powerConfidenceCounts: { observed: 30, modeled: 0, low: 0 } },
    objective: { strategy: 'power-aware-primary-five-backup-five', primary: primary.objective, backup: backup.objective, combinedTotalRating: 755, combinedRelationshipValue: 180, combinedActiveRelationships: 30, stableSolutionKey: `power-${totalPower}` },
    diagnostics: { optimal: true, eligibleDragonCount: 31, candidateCount: 4495, selectedFormationCount: 10, nodesVisited: 1, branchesPruned: 0, cacheEntries: 0, solverPasses: 1, candidateGenerationMs: 1, solverMs: 1, totalMs: 2 },
    optimizerSolutionHash: `fnv1a64:test-${totalPower}`,
    optimizerResultHash: `fnv1a64:test-result-${totalPower}`,
    estimatedPowerModelVersion: 'estimated-power-v2',
    estimatedPowerModelHash: 'fnv1a64:efa6081babb4e520',
    estimatedPowerObservationHash: 'fnv1a64:26bfe615f0d9bdd5',
  } as unknown as RosterOptimizationResult;
}
