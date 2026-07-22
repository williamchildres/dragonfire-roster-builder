import { render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ROSTER_OPTIMIZER_STRATEGY,
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
  BestTenOverallOptimizationResult,
  OptimizedFormation,
  OptimizerWaveResult,
  PrimaryBackupOptimizationResult,
  RarityCountRecord,
  RosterOptimizerObjective,
  RosterOptimizerResponse,
  RosterOptimizationResult,
  RosterOptimizerStrategy,
} from '../optimizer/rosterOptimizerTypes';
import type { FormationArrangement } from '../services/formationPlacementComparison';
import { createEmptyRoster } from '../services/rosterStorage';

describe('Roster Optimizer workspace', () => {
  it('defaults to Power-Aware 5 + Backup 5 and exposes all public strategy choices', () => {
    renderOptimizer({ roster: ownedRoster(30) });
    expect(screen.getByRole('radio', { name: /Power-Aware 5 \+ Backup 5/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Best 10 Overall/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Find My Primary & Backup Formations/i })).toBeInTheDocument();
  });

  it('includes the selected strategy in the run and disables strategy controls while active', async () => {
    const run = vi.fn(() => new Promise<RosterOptimizerResponse>(() => undefined));
    const cancel = vi.fn();
    const runner: RosterOptimizerRunner = {
      run,
      cancel,
      dispose: vi.fn(),
    };
    renderOptimizer({ roster: ownedRoster(30), runner });
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Primary/i }));
    expect(run).toHaveBeenCalledWith(expect.any(Object), 'power-aware-primary-five-backup-five');
    expect(screen.getByRole('radio', { name: /Best 10 Overall/i })).toBeDisabled();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('changes strategy before running and marks an existing result stale after strategy changes', async () => {
    const roster = ownedRoster(31);
    const result = makeBestTenResult(roster, 'arulix');
    const run = vi.fn().mockResolvedValue(result);
    const runner: RosterOptimizerRunner = { run, cancel: vi.fn(), dispose: vi.fn() };
    renderOptimizer({ roster, runner });
    await userEvent.setup().click(screen.getByRole('radio', { name: /Best 10 Overall/i }));
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Best 10 Overall/i }));
    await screen.findByRole('heading', { name: 'Exact optimal result' });
    expect(run).toHaveBeenCalledWith(roster, 'best-ten-overall');
    await userEvent.setup().click(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i }));
    expect(screen.getByText(/progression or optimization strategy changed/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open in Formation Builder/i })[0]).toBeDisabled();
  });

  it('renders five Primary and five Backup cards with separate and combined summaries', async () => {
    const roster = ownedRoster(31);
    const result = makePrimaryBackupResult(roster, 'arulix');
    renderOptimizer({ roster, runner: resolvedRunner(result) });
    await userEvent.setup().click(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i }));
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Primary/i }));
    expect(await screen.findByRole('heading', { name: 'Primary Formations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backup Formations' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.getAllByText('Primary')).toHaveLength(5);
    expect(screen.getAllByText('Backup')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: 'Combined result' })).toBeInTheDocument();
    const primaryCards = result.primary.formations.flatMap((formation) => formation.dragonIds);
    const backupCards = result.backup.formations.flatMap((formation) => formation.dragonIds);
    expect(new Set([...primaryCards, ...backupCards]).size).toBe(30);
  });

  it('retains one ten-card collection for Best 10 Overall and opens the exact arrangement', async () => {
    const roster = ownedRoster(30);
    const result = makeBestTenResult(roster);
    const onOpenFormation = vi.fn();
    renderOptimizer({ roster, runner: resolvedRunner(result), onOpenFormation });
    await userEvent.setup().click(screen.getByRole('radio', { name: /Best 10 Overall/i }));
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Best 10 Overall/i }));
    expect(await screen.findByText(/equally weighted non-overlapping collection/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Primary Formations' })).not.toBeInTheDocument();
    const firstCard = screen.getAllByRole('article')[0]!;
    await userEvent.setup().click(within(firstCard).getByRole('button', { name: /open in formation builder/i }));
    expect(onOpenFormation).toHaveBeenCalledWith(result.formations[0]!.arrangement);
  });

  it('explains the shortfall and routes back to My Roster below 30 eligible dragons', async () => {
    const onOpenRoster = vi.fn();
    renderOptimizer({ roster: ownedRoster(29), onOpenRoster });
    expect(screen.getByText(/more eligible dragons to build 10 complete formations/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Find My Primary/i })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /go to my roster/i }));
    expect(onOpenRoster).toHaveBeenCalledOnce();
  });

  it('ignores Habit Level changes but marks ranking-relevant progression stale', async () => {
    const roster = ownedRoster(30);
    const result = makePrimaryBackupResult(roster);
    const view = renderOptimizer({ roster, runner: resolvedRunner(result) });
    await userEvent.setup().click(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i }));
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Primary/i }));
    await screen.findByRole('heading', { name: 'Exact optimal result' });
    const firstId = result.usedDragonIds[0]!;
    const habitOnly = structuredClone(roster);
    habitOnly[firstId]!.habitLevels = { arbitrary: 5 };
    view.rerender(component(habitOnly, resolvedRunner(result)));
    expect(screen.queryByText(/progression or optimization strategy changed/i)).not.toBeInTheDocument();
    const changedStar = structuredClone(habitOnly);
    changedStar[firstId]!.starRank = 9;
    view.rerender(component(changedStar, resolvedRunner(result)));
    expect(screen.getByText(/progression or optimization strategy changed/i)).toBeInTheDocument();
  });

  it('announces worker failures and allows a rerun', async () => {
    const runner: RosterOptimizerRunner = {
      run: vi.fn()
        .mockRejectedValueOnce(new Error('Worker failed.'))
        .mockResolvedValueOnce(makePrimaryBackupResult(ownedRoster(30))),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    renderOptimizer({ roster: ownedRoster(30), runner });
    await userEvent.setup().click(screen.getByRole('radio', { name: /Rarity-Priority 5 \+ Backup 5/i }));
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Primary/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Worker failed.');
    await userEvent.setup().click(screen.getByRole('button', { name: /Find My Primary/i }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(10));
  });
});

function renderOptimizer({
  roster,
  runner = resolvedRunner(makePrimaryBackupResult(roster)),
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
  return <OptimizerTestHarness
    roster={roster}
    runner={runner}
    onOpenFormation={onOpenFormation}
    onOpenRoster={onOpenRoster}
  />;
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
  const [strategy, setStrategy] = useState<RosterOptimizerStrategy>(DEFAULT_ROSTER_OPTIMIZER_STRATEGY);
  const [result, setResult] = useState<RosterOptimizationResult | null>(null);
  return <RosterOptimizer
    allDragons={dragons}
    roster={roster}
    strategy={strategy}
    onStrategyChange={setStrategy}
    result={result}
    onResultChange={setResult}
    runner={runner}
    onOpenFormation={onOpenFormation}
    onOpenRoster={onOpenRoster}
  />;
}

function ownedRoster(count: number) {
  const roster = createEmptyRoster(dragons);
  dragons.slice(0, count).forEach((dragon) => {
    roster[dragon.id] = { ...roster[dragon.id]!, owned: true, starRank: 10, reignLevel: 16 };
  });
  return roster;
}

function resolvedRunner(result: BestTenOverallOptimizationResult | PrimaryBackupOptimizationResult): RosterOptimizerRunner {
  return { run: vi.fn().mockResolvedValue(result), cancel: vi.fn(), dispose: vi.fn() };
}

function makeBestTenResult(
  roster: ReturnType<typeof ownedRoster>,
  unusedDragonId?: string,
): BestTenOverallOptimizationResult {
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const selected = snapshot.filter((dragon) => dragon.dragonId !== unusedDragonId).slice(0, 30);
  const formations = makeFormations(selected);
  const objective = objectiveFor(formations, selected);
  const usedDragonIds = selected.map((dragon) => dragon.dragonId).sort();
  const unusedDragonIds = snapshot.map((dragon) => dragon.dragonId).filter((id) => !usedDragonIds.includes(id));
  const usedRarityCounts = countRarities(selected.map((dragon) => dragon.rarity));
  const unusedRarityCounts = countRarities(snapshot.filter((dragon) => unusedDragonIds.includes(dragon.dragonId)).map((dragon) => dragon.rarity));
  const tierDistribution = { Excellent: 0, Strong: 10, Solid: 0, Developing: 0, Weak: 0, Incomplete: 0 };
  return {
    contractVersion: 3,
    strategy: 'best-ten-overall',
    optimal: true,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    requestFingerprint: createRosterOptimizerRequestFingerprint(snapshot, 'best-ten-overall'),
    formations,
    collection: {
      totalRating: objective.totalRating,
      averageRating: objective.totalRating / 10,
      minimumRating: objective.minimumRating,
      rarityCounts: usedRarityCounts,
      tierDistribution,
      totalRelationshipValue: objective.totalRelationshipValue,
      totalActiveRelationships: objective.totalActiveRelationships,
    },
    usedDragonIds,
    unusedDragonIds,
    usedRarityCounts,
    unusedRarityCounts,
    objective,
    averageRating: objective.totalRating / 10,
    minimumRating: objective.minimumRating,
    tierDistribution,
    diagnostics: diagnostics(snapshot.length),
    optimizerSolutionHash: 'fnv1a64:test-solution',
    optimizerResultHash: 'fnv1a64:test-result',
  };
}

function makePrimaryBackupResult(
  roster: ReturnType<typeof ownedRoster>,
  unusedDragonId?: string,
): PrimaryBackupOptimizationResult {
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const selected = snapshot.filter((dragon) => dragon.dragonId !== unusedDragonId).slice(0, 30);
  const allFormations = makeFormations(selected);
  const primaryFormations = allFormations.slice(0, 5).map((formation, index) => ({ ...formation, wave: 'primary' as const, waveRank: index + 1 }));
  const backupFormations = allFormations.slice(5).map((formation, index) => ({ ...formation, rank: index + 1, wave: 'backup' as const, waveRank: index + 1 }));
  const primary = makeWave('primary', primaryFormations, selected.slice(0, 15));
  const backup = makeWave('backup', backupFormations, selected.slice(15));
  const usedDragonIds = selected.map((dragon) => dragon.dragonId).sort();
  const unusedDragonIds = snapshot.map((dragon) => dragon.dragonId).filter((id) => !usedDragonIds.includes(id));
  const objective = {
    strategy: 'primary-five-backup-five' as const,
    primary: primary.objective,
    backup: backup.objective,
    combinedTotalRating: primary.totalRating + backup.totalRating,
    combinedRelationshipValue: primary.totalRelationshipValue + backup.totalRelationshipValue,
    combinedActiveRelationships: primary.totalActiveRelationships + backup.totalActiveRelationships,
    stableSolutionKey: `primary:${primary.objective.stableSolutionKey}||backup:${backup.objective.stableSolutionKey}`,
  };
  return {
    contractVersion: 3,
    strategy: 'primary-five-backup-five',
    optimal: true,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    requestFingerprint: createRosterOptimizerRequestFingerprint(snapshot, 'primary-five-backup-five'),
    primary,
    backup,
    formations: [...primaryFormations, ...backupFormations],
    usedDragonIds,
    unusedDragonIds,
    unusedRarityCounts: countRarities(snapshot.filter((dragon) => unusedDragonIds.includes(dragon.dragonId)).map((dragon) => dragon.rarity)),
    combined: {
      totalRating: objective.combinedTotalRating,
      averageRating: objective.combinedTotalRating / 10,
      minimumRating: Math.min(primary.minimumRating, backup.minimumRating),
      rarityCounts: countRarities(selected.map((dragon) => dragon.rarity)),
      tierDistribution: { Excellent: 0, Strong: 10, Solid: 0, Developing: 0, Weak: 0, Incomplete: 0 },
      totalRelationshipValue: objective.combinedRelationshipValue,
      totalActiveRelationships: objective.combinedActiveRelationships,
    },
    objective,
    diagnostics: diagnostics(snapshot.length),
    optimizerSolutionHash: 'fnv1a64:test-primary-backup-solution',
    optimizerResultHash: 'fnv1a64:test-primary-backup-result',
  };
}

function makeWave(
  kind: 'primary' | 'backup',
  formations: OptimizedFormation[],
  selected: ReturnType<typeof buildOptimizerRosterSnapshot>,
): OptimizerWaveResult {
  const objective = objectiveFor(formations, selected);
  return {
    kind,
    label: kind === 'primary' ? 'Primary' : 'Backup',
    formations,
    usedDragonIds: selected.map((dragon) => dragon.dragonId).sort(),
    rarityCounts: countRarities(selected.map((dragon) => dragon.rarity)),
    totalRating: objective.totalRating,
    averageRating: objective.totalRating / 5,
    minimumRating: objective.minimumRating,
    totalRelationshipValue: objective.totalRelationshipValue,
    totalActiveRelationships: objective.totalActiveRelationships,
    tierDistribution: { Excellent: 0, Strong: 5, Solid: 0, Developing: 0, Weak: 0, Incomplete: 0 },
    objective,
  };
}

function makeFormations(selected: ReturnType<typeof buildOptimizerRosterSnapshot>): OptimizedFormation[] {
  return Array.from({ length: 10 }, (_, index) => {
    const trio = selected.slice(index * 3, index * 3 + 3);
    const dragonIds = trio.map((dragon) => dragon.dragonId) as [string, string, string];
    const arrangement = { 'left-flank': dragonIds[0], vanguard: dragonIds[1], 'right-flank': dragonIds[2] };
    return {
      rank: index + 1,
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
      progressionSnapshot: Object.fromEntries(trio.map((dragon) => [dragon.dragonId, { starRank: dragon.starRank, dragonLevel: dragon.dragonLevel }])),
    };
  });
}

function objectiveFor(
  formations: OptimizedFormation[],
  selected: ReturnType<typeof buildOptimizerRosterSnapshot>,
): RosterOptimizerObjective {
  const rarities = countRarities(selected.map((dragon) => dragon.rarity));
  const ratings = formations.map((formation) => formation.rating).sort((a, b) => a - b);
  return {
    rarityPriority: { legendaryCount: rarities.Legendary, epicCount: rarities.Epic, rareCount: rarities.Rare },
    totalRating: ratings.reduce((total, rating) => total + rating, 0),
    minimumRating: ratings[0]!,
    ascendingRatingVector: ratings,
    totalRelationshipValue: formations.reduce((total, formation) => total + formation.activeRelationshipValue, 0),
    totalActiveRelationships: formations.reduce((total, formation) => total + formation.activeRelationshipCount, 0),
    stableSolutionKey: formations.map((formation) => formation.stableCandidateKey).sort().join('||'),
  };
}

function diagnostics(eligibleDragonCount: number) {
  return {
    optimal: true,
    eligibleDragonCount,
    candidateCount: eligibleDragonCount === 31 ? 4495 : 4060,
    selectedFormationCount: 10,
    nodesVisited: 13,
    branchesPruned: 0,
    cacheEntries: 0,
    solverPasses: 17,
    candidateGenerationMs: 2500,
    solverMs: 4500,
    totalMs: 7000,
  };
}

function countRarities(rarities: string[]): RarityCountRecord {
  const counts: RarityCountRecord = { Legendary: 0, Epic: 0, Rare: 0 };
  rarities.forEach((rarity) => { counts[rarity as keyof RarityCountRecord] += 1; });
  return counts;
}
